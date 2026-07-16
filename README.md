# QuickTools.ai Backend

Express + MongoDB API for QuickTools.ai (auth, tools, payments, blogs/news/articles, cron).

## Stack

- Node.js + TypeScript + Express
- MongoDB (Mongoose)
- Google OAuth + JWT (httpOnly cookies)
- Razorpay payments
- Gemini AI tools
- Helmet, CORS allowlist, rate limits

## Setup

```bash
npm install
cp .env.example .env
# fill secrets in .env
npm run dev
```

API: `http://localhost:5000`  
Health: `http://localhost:5000/health`

## Production env (required)

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | Strong random secret (app will not start without it) |
| `FRONTEND_URL` | Exact frontend origin (CORS + OAuth redirects) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | OAuth |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments |
| `GEMINI_API_KEYS` | Comma-separated keys |
| `CRON_SECRET` | Protects cron trigger routes |

## Security notes

- JWT has **no production fallback** — missing `JWT_SECRET` crashes startup
- CORS allowlist: `quicktool.space`, `quicktools.ai`, + `FRONTEND_URL` (localhost only in development)
- `/api/auth` rate-limited
- Payment amounts are server-side (not trusted from client body)
- Auth token cookie is `httpOnly`

## Scripts

```bash
npm run dev    # ts-node-dev
npm run build  # tsc → dist/
npm start      # node dist/index.js
```
