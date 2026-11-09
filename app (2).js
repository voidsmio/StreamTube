import { firebaseConfig, API_BASE } from "./firebase-config.js";

/* ================= utils ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const decode = s => { const t = document.createElement("textarea"); t.innerHTML = s ?? ""; return t.value; };
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const https = u => (u || "").replace(/^http:\/\//, "https://");

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

let clientId = store.get("sonora.cid", null);
if (!clientId) { clientId = Math.random().toString(36).slice(2, 10); store.set("sonora.cid", clientId); }
const getName = () => store.get("sonora.name", "") || "Guest-" + clientId.slice(0, 3);

let toastTimer;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ================= JioSaavn API ================= */
function normalize(s) {
  const dl = s.downloadUrl || [];
  const pick = dl.find(d => d.quality === "160kbps") || dl[dl.length - 1];
  const imgs = s.image || [];
  const artists = Array.isArray(s.artists?.primary)
    ? s.artists.primary.map(a => a.name).join(", ")
    : (s.primaryArtists || "");
  return {
    id: s.id,
    name: decode(s.name),
    artist: decode(artists),
    image: https(imgs.length ? imgs[imgs.length - 1].url : ""),
    url: https(pick?.url || ""),
    duration: Number(s.duration) || 0
  };
}

async function searchSongs(q) {
  const r = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(q)}&limit=20`);
  if (!r.ok) throw new Error("Music API error " + r.status);
  const j = await r.json();
  return (j.data?.results || []).map(normalize).filter(s => s.url);
}

/* ================= library (localStorage) ================= */
const lib = {
  all: () => store.get("sonora.lib", []),
  has: id => lib.all().some(s => s.id === id),
  toggle(song) {
    const all = lib.all();
    const i = all.findIndex(s => s.id === song.id);
    if (i >= 0) { all.splice(i, 1); store.set("sonora.lib", all); return false; }
    all.unshift(song); store.set("sonora.lib", all); return true;
  }
};

/* ================= Firebase ================= */
let _fb;
async function fb() {
  if (_fb) return _fb;
  if (String(firebaseConfig.apiKey).startsWith("YOUR_")) {
    throw new Error("Firebase isn't set up yet. Edit firebase-config.js (see README).");
  }
  const V = "10.12.2";
  const app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const dbm = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const db = dbm.getDatabase(app.initializeApp(firebaseConfig));
  _fb = { db, ref: dbm.ref, set: dbm.set, update: dbm.update, onValue: dbm.onValue,
          runTransaction: dbm.runTransaction, onDisconnect: dbm.onDisconnect,
          serverTimestamp: dbm.serverTimestamp };
  return _fb;
}
const roomRef = (f, code, path = "") => f.ref(f.db, `rooms/${code}${path}`);
const newState = (f, song) => ({ song, playing: true, position: 0, updatedAt: f.serverTimestamp(), by: clientId });

async function playNow(code, song) {
  const f = await fb();
  await f.set(roomRef(f, code, "/state"), newState(f, song));
}

// Starts the song if the room is idle, otherwise adds it to the queue.
async function enqueue(code, song) {
  const f = await fb();
  await f.runTransaction(roomRef(f, code), cur => {
    cur = cur || {};
    if (!cur.state?.song) cur.state = newState(f, song);
    else cur.queue = [...Object.values(cur.queue || {}), song];
    return cur;
  });
}

// Moves to the next queued song. endedId stops duplicate advances when
// several listeners finish the same song at once.
async function advance(code, endedId) {
  const f = await fb();
  await f.runTransaction(roomRef(f, code), cur => {
    if (!cur || !cur.state) return cur;
    if (endedId && cur.state.song?.id !== endedId) return; // someone else already advanced
    const q = Object.values(cur.queue || {});
    const next = q.shift();
    if (next) {
      cur.state = newState(f, next);
      if (q.length) cur.queue = q; else delete cur.queue;
    } else {
      cur.state = { ...cur.state, playing: false, position: 0, updatedAt: f.serverTimestamp(), by: clientId };
    }
    return cur;
  });
}

async function removeFromQueue(code, index) {
  const f = await fb();
  await f.runTransaction(roomRef(f, code, "/queue"), cur => {
    const q = Object.values(cur || {});
    q.splice(index, 1);
    return q.length ? q : null;
  });
}

/* ================= shared song list UI ================= */
function renderSongs(el, songs, actions) {
  el.innerHTML = songs.length ? songs.map((s, i) => `
    <li class="song" data-i="${i}">
      <img src="${esc(s.image)}" alt="" loading="lazy">
      <div class="meta"><b>${esc(s.name)}</b><span>${esc(s.artist)}</span></div>
      <button data-a="play" aria-label="Play for the room" title="Play for the room">▶</button>
      <button data-a="queue" aria-label="Add to queue" title="Add to queue">＋</button>
      <button data-a="like" class="${lib.has(s.id) ? "on" : ""}" aria-label="Save to library" title="Save to library">♥</button>
    </li>`).join("") : `<li class="empty">Nothing here yet.</li>`;
  el.onclick = e => {
    const b = e.target.closest("button[data-a]");
    if (!b) return;
    const song = songs[+b.closest("li").dataset.i];
    actions[b.dataset.a]?.(song, b);
  };
}

const songActions = (getRoom, onLike) => ({
  async play(s) {
    const c = getRoom(); if (!c) return toast("Join a room first");
    try { await playNow(c, s); toast("Playing for the room"); } catch (e) { toast(e.message); }
  },
  async queue(s) {
    const c = getRoom(); if (!c) return toast("Join a room first");
    try { await enqueue(c, s); toast("Added to the queue"); } catch (e) { toast(e.message); }
  },
  like(s, b) {
    const on = lib.toggle(s);
    b.classList.toggle("on", on);
    toast(on ? "Saved to library" : "Removed from library");
    onLike?.();
  }
});

function wireSearch(form, results, getRoom) {
  const input = $("input", form);
  let last = [];
  const actions = songActions(getRoom);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const q = input.value.trim(); if (!q) return;
    results.innerHTML = `<li class="empty">Searching…</li>`;
    try {
      last = await searchSongs(q);
      renderSongs(results, last, actions);
      if (!last.length) results.innerHTML = `<li class="empty">No songs found for “${esc(q)}”.</li>`;
    } catch (err) {
      results.innerHTML = `<li class="empty">${esc(err.message)}. Check API_BASE in firebase-config.js.</li>`;
    }
  });
}

/* ================= pages ================= */
const pages = {
  home() {
    const name = $("#name"); name.value = store.get("sonora.name", "");
    const saveName = () => store.set("sonora.name", name.value.trim());
    const go = code => {
      saveName(); store.set("sonora.room", code);
      location.href = `room.html?code=${code}`;
    };
    $("#create").onclick = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      go(Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
    };
    $("#join").addEventListener("submit", e => {
      e.preventDefault();
      const code = $("#code").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 4) return toast("Enter the room code your friend shared");
      go(code);
    });
    const last = store.get("sonora.room", "");
    if (last) { const a = $("#resume"); a.hidden = false; a.href = `room.html?code=${last}`; a.textContent = `Back to room ${last}`; }
    if (String(firebaseConfig.apiKey).startsWith("YOUR_")) $("#setup").hidden = false;
  },

  search() {
    const room = () => store.get("sonora.room", "");
    const b = $("#roomBanner");
    b.innerHTML = room()
      ? `Songs you pick play in room <b>${esc(room())}</b>. <a href="room.html">Open room</a>`
      : `You're not in a room. <a href="index.html">Create or join one</a> to play together.`;
    wireSearch($("#searchForm"), $("#results"), room);
  },

  library() {
    const room = () => store.get("sonora.room", "");
    const list = $("#list");
    const draw = () => renderSongs(list, lib.all(), songActions(room, () => setTimeout(draw, 250)));
    draw();
  },

  async room() {
    const code = (new URLSearchParams(location.search).get("code") || store.get("sonora.room", "")).toUpperCase();
    if (!code) return location.replace("index.html");
    store.set("sonora.room", code);
    $("#roomCode").textContent = code;

    $("#copy").onclick = async () => {
      const link = `${location.origin}${location.pathname}?code=${code}`;
      try { await navigator.clipboard.writeText(link); toast("Invite link copied"); }
      catch { toast("Room code: " + code); }
    };
    $("#leave").onclick = () => { localStorage.removeItem("sonora.room"); location.href = "index.html"; };

    let f;
    try { f = await fb(); }
    catch (e) { const b = $("#err"); b.hidden = false; b.textContent = e.message; return; }

    wireSearch($("#searchForm"), $("#results"), () => code);

    /* ---- clock sync: Firebase tells us how far our clock is from the server ---- */
    let offset = 0;
    f.onValue(f.ref(f.db, ".info/serverTimeOffset"), s => { offset = s.val() || 0; });
    const now = () => Date.now() + offset;

    /* ---- presence ---- */
    const me = roomRef(f, code, `/members/${clientId}`);
    f.onValue(f.ref(f.db, ".info/connected"), s => {
      if (s.val()) { f.onDisconnect(me).remove(); f.set(me, { name: getName() }); }
    });
    f.onValue(roomRef(f, code, "/members"), s => {
      const m = Object.values(s.val() || {});
      $("#members").textContent = `${m.length} listening: ${m.map(x => x.name).join(", ")}`;
    });

    /* ---- player ---- */
    const audio = new Audio();
    audio.preload = "auto";
    let st = null, curId = null, dragging = false;

    // Where the song should be right now, in seconds.
    const target = () => {
      if (!st) return 0;
      if (!st.playing) return st.position || 0;
      return (st.position || 0) + Math.max(0, now() - (st.updatedAt || now())) / 1000;
    };

    function showSong(s) {
      $("#title").textContent = s ? s.name : "Nothing playing";
      $("#artist").textContent = s ? s.artist : "Search for a song below to start the room.";
      $("#art").src = s?.image || "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      document.title = s ? `${s.name} · Sonora` : "Room · Sonora";
    }

    function reconcile() {
      if (!st?.song || audio.readyState < 1) return;
      const t = Math.min(target(), (audio.duration || 1e9) - 0.05);
      if (Math.abs(audio.currentTime - t) > 0.7) audio.currentTime = t;
      if (st.playing && audio.paused) {
        audio.play().then(() => { $("#unlock").hidden = true; }).catch(() => { $("#unlock").hidden = false; });
      } else if (!st.playing && !audio.paused) {
        audio.pause();
      }
    }

    f.onValue(roomRef(f, code, "/state"), s => {
      st = s.val();
      if (!st?.song) { audio.pause(); curId = null; showSong(null); $("#pp").textContent = "▶"; return; }
      if (curId !== st.song.id) { curId = st.song.id; audio.src = st.song.url; showSong(st.song); }
      $("#pp").textContent = st.playing ? "❚❚" : "▶";
      $("#sonar").classList.toggle("playing", !!st.playing);
      reconcile();
    });

    audio.addEventListener("loadedmetadata", reconcile);
    audio.addEventListener("ended", () => { if (curId) advance(code, curId).catch(() => {}); });
    setInterval(reconcile, 3000); // drift correction

    // progress UI
    const seek = $("#seek");
    setInterval(() => {
      const d = audio.duration || st?.song?.duration || 0;
      seek.max = d || 1;
      if (!dragging) seek.value = audio.currentTime || 0;
      $("#cur").textContent = fmt(dragging ? seek.value : audio.currentTime);
      $("#dur").textContent = fmt(d);
    }, 250);

    // controls (anyone in the room can control playback)
    const write = patch => f.update(roomRef(f, code, "/state"), { ...patch, updatedAt: f.serverTimestamp(), by: clientId });
    $("#pp").onclick = () => {
      if (!st?.song) return toast("Search for a song first");
      write({ playing: !st.playing, position: target() });
    };
    $("#next").onclick = () => { if (!st?.song) return; advance(code, curId).catch(e => toast(e.message)); };
    seek.addEventListener("input", () => { dragging = true; $("#cur").textContent = fmt(seek.value); });
    seek.addEventListener("change", () => {
      dragging = false;
      if (st?.song) write({ position: +seek.value, playing: st.playing });
    });
    $("#unlockBtn").onclick = () => { audio.play().then(() => { $("#unlock").hidden = true; reconcile(); }).catch(() => {}); };

    /* ---- queue ---- */
    const qEl = $("#queue");
    f.onValue(roomRef(f, code, "/queue"), s => {
      const q = Object.values(s.val() || {});
      qEl.innerHTML = q.length
        ? q.map((x, i) => `<li><div style="min-width:0"><b>${esc(x.name)}</b><span>${esc(x.artist)}</span></div>
            <button data-i="${i}" aria-label="Remove from queue">✕</button></li>`).join("")
        : `<li style="display:block;color:var(--muted)">Queue is empty. Use ＋ on a song to line it up.</li>`;
    });
    qEl.onclick = e => {
      const b = e.target.closest("button[data-i]");
      if (b) removeFromQueue(code, +b.dataset.i).catch(err => toast(err.message));
    };
  }
};

pages[document.body.dataset.page]?.();
