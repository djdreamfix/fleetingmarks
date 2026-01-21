import webpush from 'web-push';
import { env } from './env.js';
import { redis } from './redis.js';
import { PushSubscriptionRecord } from './types.js';

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export async function saveSubscription(sub: PushSubscriptionRecord) {
  await redis.sadd('push:subs', JSON.stringify(sub));
}

export async function broadcastPush(title: string, body: string, data?: Record<string, unknown>) {
  const subs = await redis.smembers<string>('push:subs');
  const payload = JSON.stringify({ title, body, data, icon: '/icons/icon-192.png' });

  await Promise.all(
    subs.map(async s => {
      try {
        const rec = JSON.parse(s) as PushSubscriptionRecord;
        await webpush.sendNotification(
          {
            endpoint: rec.endpoint,
            keys: rec.keys
          } as any,
          payload
        );
      } catch (e) {
        // remove invalid subscriptions
        await redis.srem('push:subs', s);
      }
    })
  );
}
