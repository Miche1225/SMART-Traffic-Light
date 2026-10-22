# SMART Traffic Light — LGU Dashboard (front-end)

React 18 + TypeScript + Vite + Tailwind. Built from `smart-traffic-light-frontend-spec.md`.

```bash
npm install
npm run dev      # http://localhost:5173 — runs fully on mocks (MSW + fake WebSocket)
npm run build    # type-check + production build
npm run check    # self-check for the signal controller and peak-hour stats
```

Demo logins (mock mode): `admin`, `operator`, `viewer` — password `password`.

Real backend: set `VITE_USE_MOCKS=false`, serve the API at `/api/v1` and the WebSocket at `/ws` on the same origin
(e.g. a Vite `server.proxy`). Cameras with an empty `streamUrl` show a simulated feed.
