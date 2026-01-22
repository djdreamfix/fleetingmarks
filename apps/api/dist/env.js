export const env = {
    PORT: process.env.PORT ? Number(process.env.PORT) : 8080,
    // Upstash (REST API)
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN, // https://your-web.onrender.com
    // Web Push
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
};
