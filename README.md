# Daily Number Draw

Production-ready public number draw app built with Next.js 15, TypeScript, Tailwind CSS, MongoDB, and Render.

## Features

- Public home page with current draw status, latest winning number, live countdown, and last 20 results.
- Result history page with date filtering, draw number search, and pagination.
- Password-protected admin panel using `ADMIN_PASSWORD`.
- Manual result publishing, automatic number generation from `0` to `10000`, delete, history, and CSV export.
- MongoDB connection pooling and permanent result storage.
- Unique draw ID protection with a MongoDB index on `drawNumber`.
- API input validation, simple IP rate limiting, JSON logging, and health checks.
- Render deployment support with `render.yaml` and `Dockerfile`.

## Draw Schedule

Four draws are generated daily in `DRAW_TIMEZONE`, defaulting to `Asia/Kolkata`:

- 10:00 AM
- 02:00 PM
- 06:00 PM
- 10:00 PM

The app generates any missed due draws when public status/results are requested. For best production reliability, also call the cron endpoint after each draw time.

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/daily_number_draw?retryWrites=true&w=majority
MONGODB_DB=daily_number_draw
ADMIN_PASSWORD=change-this-long-password
ADMIN_SESSION_SECRET=change-this-random-secret
CRON_SECRET=optional-cron-secret
DRAW_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Routes

- `GET /api/status` - current status, latest result, next draw, recent results.
- `GET /api/results?page=1&pageSize=20&date=2026-06-17&drawNumber=20260617` - public result history.
- `POST /api/admin/login` - admin password login.
- `POST /api/admin/logout` - clear admin session.
- `GET /api/admin/results` - admin result history.
- `POST /api/admin/results` - create or publish a result.
- `DELETE /api/admin/results?id=RESULT_ID` - delete an incorrect result.
- `GET /api/admin/export` - export CSV.
- `GET /api/cron/draw` - generate due draws, protected by `CRON_SECRET` when set.
- `GET /api/health` - Render health check.

Admin create payload:

```json
{
  "drawTime": "2026-06-17T04:30:00.000Z",
  "winningNumber": "123"
}
```

If `winningNumber` is blank or omitted, the server generates it automatically.

## Render Deployment

1. Create a MongoDB Atlas cluster and copy the connection string.
2. Push this repository to GitHub.
3. In Render, create a new Blueprint from `render.yaml`, or create a Web Service manually.
4. Set these environment variables in Render:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `CRON_SECRET`
   - `DRAW_TIMEZONE`
   - `NEXT_PUBLIC_APP_URL`
5. Health check path: `/api/health`.
6. Build uses the included Dockerfile.

Optional cron setup:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-render-url.onrender.com/api/cron/draw
```

Run it a few minutes after `10:00`, `14:00`, `18:00`, and `22:00` in `DRAW_TIMEZONE`.

## Production Build

```bash
npm run build
npm start
```
