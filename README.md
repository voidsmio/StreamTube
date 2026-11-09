# Sonora Social

Listen to the same song, at the same second, with friends. Static site: runs on GitHub Pages.

- **Songs:** [jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api)
- **Sync:** Firebase Realtime Database (room state + server clock offset)

## How sync works

Each room stores `{ song, playing, position, updatedAt }`. Every listener computes
`position + (serverNow - updatedAt)` and seeks its own audio element to that time.
A 3-second check corrects drift, and late joiners land in the right spot automatically.
Anyone in the room can play, pause, seek, skip, and queue songs.

## Setup

### 1. Firebase (free Spark plan is enough)
1. Create a project at https://console.firebase.google.com
2. **Build → Realtime Database → Create database** (not Firestore).
3. **Rules** tab, paste, and publish:
   ```json
   {
     "rules": {
       "rooms": {
         "$room": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
   These rules let anyone who knows a room code control that room. Fine for friends; tighten before going public.
4. **Project settings → Your apps → Web (`</>`)**, register an app, and copy the config into `firebase-config.js`. Make sure `databaseURL` is set.

### 2. Music API
The public demo `https://saavn.dev/api` may be rate limited or offline. For reliability:
1. Deploy your own copy of [jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api) (Vercel works well).
2. Set `API_BASE` in `firebase-config.js` to `https://YOUR-DEPLOYMENT.vercel.app/api`.

### 3. GitHub Pages
1. Push this folder to a repo.
2. **Settings → Pages → Deploy from branch → main / root**.
3. Open `https://YOUR-USER.github.io/YOUR-REPO/`.

## Use
1. Home: enter your name, **Start a new room**, tap **Copy invite**, and send the link.
2. Friends open the link (or enter the code) and tap **Join the music** if the browser asks.
3. Search, then ▶ to play for everyone or ＋ to queue.

## Notes
- Browsers block autoplay until you tap once, so each listener may see a "Join the music" prompt.
- The library (♥) is stored per device in localStorage.
- Streams come from JioSaavn's CDN. Check the API's terms and use it for personal, non-commercial projects.
- Test locally with `python -m http.server` (ES modules don't load from `file://`).
