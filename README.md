# Fleeting Marks

PWA для iOS/Android: тимчасові мітки на карті (30 хв), реальний час, пуш‑повідомлення з назвою вулиці та кольором.

## Стек

- Frontend: React + Vite + Leaflet + Radix UI + Framer Motion
- Backend: Express + Socket.IO
- DB: Upstash Redis (TTL + ZSET індекс)
- Push: Web Push (VAPID)
- Reverse geocoding: Nominatim (OpenStreetMap)

## Локальний запуск

1. **Встановити залежності:**

   ```bash
   npm i
   npm --workspace apps/web i
   npm --workspace apps/api i
   ```

2. **Згенерувати VAPID ключі (один раз):**

   ```bash
   node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k)"
   ```

   Збережіть `publicKey` і `privateKey`.

3. **Створити `.env` для бекенду** (`apps/api/.env`):

   ```
   PORT=8080
   UPSTASH_REDIS_URL=...        # з Upstash
   UPSTASH_REDIS_TOKEN=...      # з Upstash
   PUBLIC_ORIGIN=http://localhost:5173
   VAPID_PUBLIC_KEY=...         # з кроку 2
   VAPID_PRIVATE_KEY=...        # з кроку 2
   VAPID_SUBJECT=mailto:you@example.com
   ```

4. **Створити `.env` для фронтенду** (`apps/web/.env`):

   ```
   VITE_API_URL=http://localhost:8080
   VITE_WS_URL=http://localhost:8080
   VITE_VAPID_PUBLIC_KEY=...    # той самий publicKey
   ```

5. **Запустити:**

   ```bash
   npm run dev:api
   npm run dev:web
   ```

   Відкрити `http://localhost:5173`.

## Використання

- Дозвольте геолокацію.
- Клікніть на карту → виберіть колір у діалозі.
- Мітка з’явиться з таймером (хвилини до закінчення).
- Через 30 хв мітка зникне автоматично у всіх клієнтів.
- Натисніть “Увімкнути пуш” у хедері, щоб отримувати нативні повідомлення.
  - На iOS пуші працюють для PWA, встановленої на Home Screen (iOS 16.4+).

## Деплой на Render.com

### API (бекенд)

1. **Створіть новий Web Service**:
   - **Environment**: Node
   - **Build Command**: `npm --workspace apps/api run build`
   - **Start Command**: `npm --workspace apps/api run start`
2. **Додайте Environment Variables**:
   - `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` (з Upstash)
   - `PUBLIC_ORIGIN` → ваш фронтенд домен (наприклад, `https://marks-web.onrender.com`)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
3. **Увімкніть WebSockets** (Render підтримує).
4. Збережіть URL сервісу (наприклад, `https://marks-api.onrender.com`).

### Web (фронтенд)

1. **Створіть Static Site**:
   - **Build Command**: `npm --workspace apps/web run build`
   - **Publish Directory**: `apps/web/dist`
2. **Додайте Environment Variables**:
   - `VITE_API_URL` → URL бекенду (наприклад, `https://marks-api.onrender.com`)
   - `VITE_WS_URL` → той самий URL
   - `VITE_VAPID_PUBLIC_KEY` → ваш VAPID public key
3. Після деплою перевірте:
   - Геолокацію, клік, діалог кольору.
   - Пуш‑підписку (на iOS — додайте на Home Screen).

## Upstash Redis

- Створіть базу, візьміть `UPSTASH_REDIS_URL` і `UPSTASH_REDIS_TOKEN`.
- TTL реалізовано через `EX=1800` на ключі `mark:{id}`.
- Індекс `marks_by_expiry` (ZSET) для прибирання дрейфу та снапшоту.

## Безпека та анти‑спам

- Додайте rate‑limit (опційно) на `/marks` за IP/сесією.
- Обмежте частоту пушів (наприклад, не частіше 1/10 s на користувача).

## Створення ZIP

У корені:

```bash
npm run zip
```

Отримаєте `fleeting-marks.zip` з усіма файлами.

## Примітки по UX і стилю

- **Uber‑стиль:** великі кнопки, високий контраст, мінімум відволікаючих деталей.
- **Анімації:** легкі (без надмірностей), швидкі переходи; маркер має чітку тінь і білу обводку.
- **Доступність:** великі таргети, текстові підказки (title зі street), зрозумілі назви кольорів.

## Що далі

- Хочеш — додам rate‑limit, аналітику (Upstash), або фільтр міток за радіусом від користувача.
- Якщо плануєш масштабування, можна винести push у окремий воркер/queue.
