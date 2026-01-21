import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import { env } from "./env.js";
import { redis } from "./redis.js";
import { reverseGeocode } from "./geocode.js";
import { broadcastPush, saveSubscription } from "./push.js";
import type { Mark, MarkColor, PushSubscriptionRecord } from "./types.js";

const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cors({ origin: env.PUBLIC_ORIGIN, credentials: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.PUBLIC_ORIGIN },
});

const MARK_TTL_SECONDS = 30 * 60; // 30 хв
const CLEANUP_INTERVAL_MS = 10_000;

function isValidColor(color: unknown): color is MarkColor {
  return color === "blue" || color === "green" || color === "split";
}

// Snapshot of active marks (expiresAtMs > now)
app.get("/marks", async (_req: Request, res: Response) => {
  try {
    const now = Date.now();

    // Active marks: score in (now .. +inf)
    const ids = (await redis.zrange(
        "marks_by_expiry",
        String(now),
        "+inf",
        { byScore: true, limit: { offset: 0, count: 2000 } }
      )) as string[];


    if (!ids.length) return res.json([]);

    const raw = await Promise.all(ids.map((id) => redis.get<string>(`mark:${id}`)));

    const marks: Mark[] = raw
      .filter((v): v is string => Boolean(v))
      .map((s) => JSON.parse(s) as Mark)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

    return res.json(marks);
  } catch (err) {
    console.error("GET /marks failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// Create mark
app.post("/marks", async (req: Request, res: Response) => {
  try {
    const { lat, lng, color } = req.body as { lat: number; lng: number; color: MarkColor };

    if (typeof lat !== "number" || typeof lng !== "number" || !isValidColor(color)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const id = uuid();
    const createdAt = new Date().toISOString();
    const expiresAtMs = Date.now() + MARK_TTL_SECONDS * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    const street = await reverseGeocode(lat, lng).catch(() => undefined);

    const mark: Mark = { id, lat, lng, color, street, createdAt, expiresAt };

    // store JSON + TTL
    await redis.set(`mark:${id}`, JSON.stringify(mark), { ex: MARK_TTL_SECONDS });

    // index by expiry
    await redis.zadd("marks_by_expiry", { score: expiresAtMs, member: id });

    io.emit("mark.created", mark);

    // Push notification (не валимо запит, якщо push не вдався)
    const colorName = color === "blue" ? "Синя" : color === "green" ? "Зелена" : "Синьо-зелена";
    const body = street ? `${colorName} мітка на ${street}` : `${colorName} мітка`;
    broadcastPush("Нова мітка", body, { id, lat, lng, color }).catch((e) =>
      console.warn("broadcastPush failed:", e)
    );

    return res.status(201).json(mark);
  } catch (err) {
    console.error("POST /marks failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// Save push subscription
app.post("/push/subscribe", async (req: Request, res: Response) => {
  try {
    const { endpoint, keys } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    const rec: PushSubscriptionRecord = {
      id: uuid(),
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      createdAt: new Date().toISOString(),
    };

    await saveSubscription(rec);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("POST /push/subscribe failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// Expiry worker: remove expired ids from index + delete keys + emit
setInterval(() => {
  (async () => {
    try {
      const now = Date.now();

      // Беремо пачкою, щоб не зробити великий burst
      const expiredIds = (await redis.zrange(
            "marks_by_expiry",
            "-inf",
            String(now),
            { byScore: true, limit: { offset: 0, count: 1000 } }
          )) as string[];


      if (!expiredIds.length) return;

      // Прибираємо з індексу
      const anyRedis = redis as unknown as {
        zremrangebyscore?: (key: string, min: string, max: string) => Promise<number>;
      };

      if (typeof anyRedis.zremrangebyscore === "function") {
        await anyRedis.zremrangebyscore("marks_by_expiry", "-inf", String(now));
      } else {
        await Promise.all(expiredIds.map((id) => redis.zrem("marks_by_expiry", id)));
      }

      // Видаляємо ключі (DEL безпечний навіть якщо TTL вже прибрав)
      await Promise.all(expiredIds.map((id) => redis.del(`mark:${id}`)));

      for (const id of expiredIds) io.emit("mark.expired", { id });
    } catch (err) {
      console.error("Expiry worker failed:", err);
    }
  })().catch(() => void 0);
}, CLEANUP_INTERVAL_MS);

io.on("connection", (socket) => {
  socket.on("ping", () => socket.emit("pong"));
});

httpServer.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
