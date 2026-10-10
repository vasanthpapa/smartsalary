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

Root `.env` (do not commit this file):

```env
MONGO_URI=your_mongodb_connection_string
PORT=3000
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=use_a_unique_strong_password
JWT_SECRET=generate_a_random_secret_at_least_32_characters_long
```

The backend refuses login if `ADMIN_USERNAME`, `ADMIN_PASSWORD`, or a `JWT_SECRET` of at least 32 characters is missing. Never use real credentials in source control.

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

Required environment variables:

- `MONGO_URI`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET` (at least 32 characters)

Set the authentication variables as secret environment values in Render. Do not put their real values in `render.yaml` or commit them to Git.

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
