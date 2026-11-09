# Sonora — Responsive Music Player

A Spotify-inspired, responsive music player built with HTML, Tailwind CSS (CDN), custom CSS and vanilla JavaScript. It is a static website and can be published directly with GitHub Pages.

## Files
- `index.html` — page structure and Tailwind CDN setup
- `style.css` — custom theme, layout and responsive styles
- `script.js` — audio player functionality

## Run locally
Open `index.html` in a browser. An internet connection is needed for Tailwind, icons, fonts and the demo audio tracks.

## Publish with GitHub Pages
1. Create a new repository on GitHub.
2. Upload **all three files** (`index.html`, `style.css`, `script.js`) to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then press **Save**.
6. Wait for the deployment and open the Pages URL shown there.

## Features
- Responsive desktop and mobile layout
- Play, pause, previous and next
- Seek/progress bar and volume control
- Shuffle and repeat modes
- Search by track, artist or album
- Like tracks and filter liked songs
- Upload multiple local audio files (MP3, WAV, OGG, etc.)
- Demo tracks included

## Notes
- The demo tracks are sample audio hosted by SoundHelix and require internet access. Replace their URLs in `script.js` if you want different demo audio.
- Uploaded files are played locally in your browser. They are **not uploaded** to GitHub or a server, and the library resets when the page is refreshed.
- This is a front-end demo, not a Spotify account/API integration. Playlist creation and cloud sync are not implemented.
- Tailwind is loaded from its CDN, so the page needs internet access for Tailwind styling.
