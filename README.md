# Companion for GTA6

A static, hash-routed GTA6 walkthrough and community forum companion with an optional Express achievement API.

## Local development

```sh
npm install
npm run check
npm run start
```

Open [http://localhost:5173](http://localhost:5173). The browser app works with its local browser store while Firebase is unavailable or not configured.

To run platform achievement imports in a second terminal, copy [.env.example](./.env.example) to `.env`, add the platform credentials you need, then run:

```sh
npm run api
```

The API health check is available at [http://localhost:8787/api/health](http://localhost:8787/api/health). Platform imports are optional; the local GTA VI checklist and manual achievement list remain available without them.

## Firebase setup

1. Create or select a Firebase project and enable anonymous Authentication and Cloud Firestore.
2. Put the Web App configuration in [js/firebase-config.js](./js/firebase-config.js).
3. Seed starter users, walkthroughs, and threads with a Firebase Admin service account:

   ```sh
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json
   npm run seed
   ```

4. Deploy rules, indexes, and the static app:

   ```sh
   npm run check
   npm run deploy
   ```

The Firestore rules only allow profile writes for the signed-in owner, restrict manual achievement writes to the owner’s subcollection, and limit public mutations to likes/reply counters.

## Deploying the achievement API

Firebase Hosting serves the static app; it does not run [api/server.mjs](./api/server.mjs). Deploy that Node 22 service to a separate HTTPS host and set:

- `CLIENT_ORIGIN` to the exact Firebase Hosting origin
- `TRUST_PROXY=true` when the API is behind one trusted reverse proxy, so rate limiting sees client IPs correctly
- `STEAM_API_KEY`, `XBOX_ACCESS_TOKEN`, and/or `PSN_NPSSO` for the integrations you enable
- `API_PORT` when the host supplies a port

Before the static deploy, set `window.ACHIEVEMENT_API_URL` to the deployed API origin before [js/app.js](./js/app.js) loads. In [index.html](./index.html), place this immediately before the module script:

```html
<script>window.ACHIEVEMENT_API_URL = 'https://achievements.example.com';</script>
<script type="module" src="js/app.js?v=20260827-polish3"></script>
```

On production hosts without that value, the UI intentionally keeps platform import unavailable and directs players to the local tracker instead of attempting a localhost request.

Never commit `.env`, service-account JSON, or platform credentials. The checked-in [.env.example](./.env.example) contains placeholders only.
