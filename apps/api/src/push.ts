import webpush, { type PushSubscription } from "web-push";
import { env } from "./env.js";
import { redis } from "./redis.js";
import type { PushSubscriptionRecord } from "./types.js";

let ready = false;
let disabled = false;

function init() {
  if (ready || disabled) return;

  const pub = env.VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;

  if (!pub || !priv) {
    console.warn("[push] VAPID keys missing; push disabled");
    disabled = true;
    return;
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:admin@example.com",
    pub,
    priv
  );

  ready = true;
}

export async function saveSubscription(sub: PushSubscriptionRecord) {
  init();
  if (disabled) return;

  // ALWAYS store as JSON string
  await redis.sadd("push:subs", JSON.stringify(sub));
}

export async function broadcastPush(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  init();
  if (disabled) return;

  const payload = JSON.stringify({
    title,
    body,
    data,
    // іконка буде братися з вашого web-домену (PWA)
    icon: "/icons/icon-192.png",
  });

  const raw = await redis.smembers("push:subs");

  // normalize: Upstash може повернути або string, або object
  const subs: PushSubscriptionRecord[] = raw
    .map((x: any) => {
      if (!x) return null;

      if (typeof x === "object") return x as PushSubscriptionRecord;

      if (typeof x === "string") {
        // відсікаємо "[object Object]" та інший сміттєвий рядок
        const s = x.trim();
        if (!s.startsWith("{")) return null;
        try {
          return JSON.parse(s) as PushSubscriptionRecord;
        } catch {
          return null;
        }
      }

      return null;
    })
    .filter(Boolean);

  // Надсилаємо паралельно, але не валимо процес
  await Promise.allSettled(
    subs.map(async (rec) => {
      try {
        const sub: PushSubscription = {
          endpoint: rec.endpoint,
          keys: rec.keys,
        };

        await webpush.sendNotification(sub, payload);
      } catch (e: any) {
        // Якщо підписка "померла" — прибираємо її
        if (shouldRemoveSubscription(e)) {
          await redis.srem("push:subs", JSON.stringify(rec));
        } else {
          console.warn("[web-push] send failed (kept sub):", e);
        }
      }
    })
  );
}

function shouldRemoveSubscription(e: any) {
  return (
    e?.statusCode === 404 ||
    e?.statusCode === 410 ||
    e?.body === "NotRegistered"
  );
}
