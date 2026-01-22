import webpush from "web-push";
import { env } from "./env.js";
import { redis } from "./redis.js";
let webPushReady = false;
let webPushDisabled = false;
function initWebPush() {
    if (webPushReady || webPushDisabled)
        return;
    const pub = env.VAPID_PUBLIC_KEY;
    const priv = env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) {
        webPushDisabled = true;
        console.warn("[web-push] VAPID keys missing; push notifications disabled.");
        return;
    }
    webpush.setVapidDetails(env.VAPID_SUBJECT, pub, priv);
    webPushReady = true;
}
export async function saveSubscription(sub) {
    await redis.sadd("push:subs", JSON.stringify(sub));
}
function shouldRemoveSubscription(err) {
    const e = err;
    return e?.statusCode === 404 || e?.statusCode === 410;
}
export async function broadcastPush(title, body, data) {
    initWebPush();
    if (webPushDisabled)
        return;
    const subs = (await redis.smembers("push:subs"));
    if (!subs.length)
        return;
    const payload = JSON.stringify({ title, body, data, icon: "/icons/icon-192.png" });
    await Promise.all(subs.map(async (s) => {
        try {
            const rec = JSON.parse(s);
            const sub = {
                endpoint: rec.endpoint,
                keys: rec.keys,
            };
            await webpush.sendNotification(sub, payload);
        }
        catch (e) {
            if (shouldRemoveSubscription(e)) {
                await redis.srem("push:subs", s);
            }
            else {
                console.warn("[web-push] send failed (kept sub):", e);
            }
        }
    }));
}
