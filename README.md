# SMART Traffic Light — LGU Dashboard (front-end)

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind. Built from `smart-traffic-light-spec.md`.

# To check the front-end do the following commands 

``` bash
git clone https://github.com/Miche1225/Smart-Traffic-Light-FrontEnd
cd Smart-Traffic-Light-FrontEnd
```

```bash
npm install
npm run dev      # http://localhost:3000 — runs fully on mocks (MSW + fake WebSocket)
npm run build    # type-check + production build (then `npm start`)
npm run check    # self-check for the signal controller and peak-hour stats
```

Demo logins (mock mode): `admin`, `operator`, `viewer` — password `password`.

Real backend: set `NEXT_PUBLIC_USE_MOCKS=false`, serve the API at `/api/v1` and the WebSocket at `/ws` on the same origin
(e.g. Next.js `rewrites`). Routes live in `src/app/`, screens in `src/views/`; `src/middleware.ts` redirects signed-out
users and enforces page roles from the `stl-role` cookie set at login. Cameras with an empty `streamUrl` show a simulated feed.

Arduino: upload `arduino/traffic_light/traffic_light.ino` (LEDs + one HC-SR04; wiring at the top of the file), plug it in over
USB, then **Settings → Connect Arduino** (Chrome/Edge). The board prints one live-event JSON per line; `src/services/arduino.ts`
feeds those into the dashboard and the simulator stops driving that intersection (`INT-004` by default).

<h1> !! THIS IS ONLY A FRONT-END PROTOTYPE !! </h1>
