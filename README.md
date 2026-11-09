# Sonora Social — JioSaavn discovery + synced listening rooms

Multi-page responsive music web app for GitHub Pages.

## Pages and files
- `index.html` — home
- `search.html` — search JioSaavn catalog and open official song pages
- `library.html` — add and play local audio files
- `room.html` — create/join a unique room and synchronize an authorized direct audio URL
- `style.css` — responsive styling
- `app.js` — page logic, audio player, search and Firebase room sync
- `firebase-config.js` — your Firebase web config

## Important playback limitation
The JioSaavn project linked by the user is an unofficial API intended to expose JioSaavn catalog/download information. This project uses it for catalog search and sends users to the official JioSaavn page to listen. It does not extract or rebroadcast unofficial download URLs. In-app and synchronized playback accept direct audio URLs that you own or are authorized to stream. Local files only play on the device where they were selected.

Background audio generally continues while a tab is in the background, but mobile operating systems and browsers may suspend playback to save power. A webpage cannot guarantee uninterrupted background playback on every device.

## Configure Firebase (required for rooms)
GitHub Pages is static hosting. Firebase Realtime Database provides the realtime shared room state.

1. Go to https://console.firebase.google.com/ and create a project.
2. Add a Web App and copy its Firebase config.
3. In **Authentication → Sign-in method**, enable **Anonymous**.
4. In **Realtime Database**, create a database.
5. Paste the config values into `firebase-config.js`.
6. In Realtime Database → Rules, use these starter rules:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

These starter rules allow any signed-in anonymous user to read/write room state. For a public production app, add stronger validation, rate limiting, room membership checks, expiration/cleanup and abuse protection. Do not store secrets in frontend files.

## Publish on GitHub Pages
1. Upload all files to the repository root.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Save and wait for GitHub Pages to publish.

## Run locally
Because `app.js` uses ES modules, do not open files via `file://`. Use a local static server, e.g. VS Code Live Server, or:

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## Room behaviour
- Create room generates a 6-character code.
- Share `room.html?room=CODE` with friends.
- Members receive shared track, play/pause and seek state.
- Every browser plays independently; small timing drift is corrected when state updates arrive.
- Browsers may require a user gesture before they allow playback.
- A shared URL must be a direct audio file URL and accessible to every listener. JioSaavn song page URLs are not direct audio URLs.
