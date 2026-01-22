import webpush, { type PushSubscription } from "web-push";
import { env } from "./env.js";
import { redis } from "./redis.js";
import type { PushSubscriptionRecord } from "./types.js";

let webPushReady = false;
let webPushDisabled = false;

function initWebPush() {
  if (webPushReady || webPushDisabled) return;

  const pub = env.VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;

  if (!pub || !priv) {
    console.warn("[push] VAPID keys missing, disabling push");
    webPushDisabled = true;
    return;
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:admin@example.com",
    pub,
    priv
  );

  webPushReady = true;
}

// ---------------- SAVE ----------------

export async function saveSubscription(sub: PushSubscriptionRecord) {
  initWebPush();
  if (webPushDisabled) return;

  // ALWAYS store as JSON string
  await redis.sadd("push:subs", JSON.stringify(sub));
}

// ---------------- SEND ----------------

export async function broadcastPush(payload: string) {
  initWebPush();
  if (webPushDisabled) return;

  const raw = await redis.smembers("push:subs");

  const subs: PushSubscriptionRecord[] = raw
    .map((x: any) => {
      if (!x) return null;

      // Upstash may already return parsed objects
      if (typeof x === "object") return x;

      if (typeof x === "string") {
        // skip garbage like "[object Object]"
        if (!x.trim().startsWith("{")) return null;

        try {
          return JSON.parse(x);
        } catch {
          return null;
        }
      }

      return null;
    })
    .filter(Boolean);

  await Promise.allSettled(
    subs.map(async (rec) => {
      try {
        const sub: PushSubscription = {
          endpoint: rec.endpoint,
          keys: rec.keys,
        };

        await webpush.sendNotification(sub, payload);
      } catch (e: any) {
        if (shouldRemoveSubscription(e)) {
          // remove broken subscription
          await redis.srem("push:subs", JSON.stringify(rec));
        } else {
          console.warn("[web-push] send failed (kept sub):", e);
        }
      }
    })
  );
}

// ---------------- HELPERS ----------------

function shouldRemoveSubscription(e: any) {
  return (
    e?.statusCode === 404 ||
    e?.statusCode === 410 ||
    e?.body === "NotRegistered"
  );
}
