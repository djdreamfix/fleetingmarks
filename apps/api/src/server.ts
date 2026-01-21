import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuid } from 'uuid';
import { env } from './env.js';
import { redis } from './redis.js';
import { reverseGeocode } from './geocode.js';
import { broadcastPush, saveSubscription } from './push.js';
import type { Mark, MarkColor, PushSubscriptionRecord } from './types.js';

const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cors({ origin: env.PUBLIC_ORIGIN, credentials: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.PUBLIC_ORIGIN }
});

// Snapshot of active marks
app.get('/marks', async (_req, res) => {
  const now = Date.now();
  const ids = await redis.zrangebyscore<string>('marks_by_expiry', now, '+inf');
  const pipeline = ids.map(id => redis.get<string>(`mark:${id}`));
  const raw = await Promise.all(pipeline);
  const marks = raw
    .filter(Boolean)
    .map(s => JSON.parse(s!))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  res.json(marks);
});

// Create mark
app.post('/marks', async (req, res) => {
  const { lat, lng, color } = req.body as { lat: number; lng: number; color: MarkColor };
  if (typeof lat !== 'number' || typeof lng !== 'number' || !['blue', 'green', 'split'].includes(color)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const id = uuid();
  const createdAt = new Date().toISOString();
  const expiresAtMs = Date.now() + 30 * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();

  const street = await reverseGeocode(lat, lng).catch(() => undefined);

  const mark: Mark = { id, lat, lng, color, street, createdAt, expiresAt };

  // store JSON + TTL
  await redis.set(`mark:${id}`, JSON.stringify(mark), { ex: 1800 });
  await redis.zadd('marks_by_expiry', { score: expiresAtMs, member: id });

  io.emit('mark.created', mark);

  // Push notification
  const colorName = color === 'blue' ? 'Синя' : color === 'green' ? 'Зелена' : 'Синьо‑зелена';
  const body = street ? `${colorName} мітка на ${street}` : `${colorName} мітка`;
  await broadcastPush('Нова мітка', body, { id, lat, lng, color });

  res.status(201).json(mark);
});

// Save push subscription
app.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
  const rec: PushSubscriptionRecord = { id: uuid(), endpoint, keys, createdAt: new Date().toISOString() };
  await saveSubscription(rec);
  res.status(201).json({ ok: true });
});

// Expiry worker (cleanup zset drift)
setInterval(async () => {
  const now = Date.now();
  const expiredIds = await redis.zrangebyscore<string>('marks_by_expiry', '-inf', now);
  if (expiredIds.length) {
    for (const id of expiredIds) {
      const exists = await redis.get(`mark:${id}`);
      if (!exists) {
        await redis.zrem('marks_by_expiry', id);
        io.emit('mark.expired', { id });
      }
    }
  }
}, 10_000);

io.on('connection', (socket) => {
  socket.on('ping', () => socket.emit('pong'));
});

httpServer.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
