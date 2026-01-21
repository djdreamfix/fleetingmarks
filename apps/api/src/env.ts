export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 8080,
  UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL!,
  UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_TOKEN!,
  PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN!, // e.g. https://your-web.onrender.com
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY!,  // generated once
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY!,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
};
