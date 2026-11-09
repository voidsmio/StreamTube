// 1) Create a Firebase project -> Build -> Realtime Database (NOT Firestore).
// 2) Project settings -> Your apps -> Web app -> copy the config values below.
// 3) Set databaseURL to your Realtime Database URL.
export const firebaseConfig = {
  apiKey: "AIzaSyDxv9I8zuuGSgt6RO5UafIoJyhGj0hl1A0",
  authDomain: "tuber-a850a.firebaseapp.com",
  databaseURL: "https://tuber-a850a-default-rtdb.firebaseio.com",
  projectId: "tuber-a850a",
  appId: "1:152498424108:web:42d512b49b3c0d6e45c489"
};

// JioSaavn API (github.com/sumitkolhe/jiosaavn-api).
// Deploy your own copy (Vercel one-click) and put its URL here, ending in /api.
// The public demo may be rate limited or offline.
export const API_BASE = "https://saavn.sumit.co/api";
