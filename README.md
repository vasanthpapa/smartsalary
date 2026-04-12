# SmartSalary

SmartSalary is a full-stack workforce salary and attendance management app.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas with Mongoose
- Realtime: Socket.IO

## Local Development

Install dependencies:

```bash
npm install
cd client
npm install
```

Run both frontend and backend:

```bash
npm run dev
```

## Environment Variables

Root `.env`:

```env
MONGO_URI=your_mongodb_connection_string
PORT=3001
```

Frontend env example:

See [`client/.env.example`](client/.env.example).

For production on Vercel:

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com
```

## Deploy

### Backend on Render

Use the root [`render.yaml`](render.yaml).

Manual values if needed:

- Root Directory: `.`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Required environment variable:

- `MONGO_URI`

Live save checklist:

- `MONGO_URI` on Render must be the real MongoDB Atlas URI, not a placeholder like `YOURNEWPASSWORD`.
- If `MONGO_URI` is missing or invalid, the app can only run in demo/local mode and reopened pages will not have true cloud persistence.
- After changing `MONGO_URI` on Render, redeploy the backend and confirm `/health` reports storage available.

### Frontend on Vercel

Use the `client` folder as the project root.

Settings:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

Required environment variable:

- `VITE_API_BASE_URL=https://your-render-backend-url.onrender.com`

The SPA rewrite config is in [`client/vercel.json`](client/vercel.json).
