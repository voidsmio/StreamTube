
const audio = document.getElementById("audio");
const fileInput = document.getElementById("fileInput");
const trackList = document.getElementById("trackList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");

let tracks = [];
let currentIndex = -1;
let isShuffle = false;
let repeatMode = 0;
let activeFilter = "all";
let objectUrls = [];

const demoTracks = [
  {
    title: "Midnight City",
    artist: "M83",
    album: "Hurry Up, We're Dreaming",
    duration: "4:03",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    uploaded: false
  },
  {
    title: "Dreaming in Colour",
    artist: "The SoundHelix",
    album: "Open Skies",
    duration: "5:02",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    uploaded: false
  },
  {
    title: "Golden Hour",
    artist: "The SoundHelix",
    album: "Soft Focus",
    duration: "5:13",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    uploaded: false
  },
  {
    title: "Afterglow",
    artist: "The SoundHelix",
    album: "Night Drive",
    duration: "5:05",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    uploaded: false
  }
];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function getFilteredTracks() {
  const query = searchInput.value.trim().toLowerCase();

  return tracks
    .map((track, index) => ({
      ...track,
      originalIndex: index
    }))
    .filter(track =>
      activeFilter === "uploaded"
        ? track.uploaded
        : activeFilter === "liked"
        ? track.liked
        : true
    )
    .filter(track =>
      !query ||
      `${track.title} ${track.artist} ${track.album}`
        .toLowerCase()
        .includes(query)
    );
}

function renderTracks() {
  const visibleTracks = getFilteredTracks();

  document.getElementById("trackCount").textContent =
    `${visibleTracks.length} tracks`;

  document.getElementById("libraryTitle").textContent =
    activeFilter === "liked"
      ? "Liked songs"
      : activeFilter === "uploaded"
      ? "Your uploads"
      : searchInput.value
      ? "Search results"
      : "Made for you";

  emptyState.style.display =
    visibleTracks.length ? "none" : "block";

  trackList.innerHTML = visibleTracks.map((track, i) => `
    <div class="track-row ${
      track.originalIndex === currentIndex ? "playing" : ""
    }">
      <span class="track-number">${i + 1}</span>

      <div class="track-title">
        <div class="cover">${track.uploaded ? "♫" : "♪"}</div>

        <div class="track-meta">
          <div class="track-name">${safeText(track.title)}</div>
          <div class="track-artist">${safeText(track.artist)}</div>
        </div>
      </div>

      <span class="track-album">
        ${safeText(track.album || "Local files")}
      </span>

      <span class="track-duration">
        ${track.duration || "—"}
      </span>

      <div class="row-actions">
        <button data-like="${track.originalIndex}">
          <i data-lucide="heart"></i>
        </button>

        <button data-play="${track.originalIndex}">
          <i data-lucide="play"></i>
        </button>
      </div>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

function updateNowPlaying() {
  const track = tracks[currentIndex];

  if (!track) return;

  document.getElementById("nowTitle").textContent = track.title;
  document.getElementById("nowArtist").textContent = track.artist;
  document.getElementById("miniCover").textContent = "♪";
  document.getElementById("likeCurrent").innerHTML =
    `<i data-lucide="heart"></i>`;

  if (window.lucide) lucide.createIcons();
}

function setPlayIcon(playing) {
  document.getElementById("playBtn").innerHTML =
    `<i data-lucide="${playing ? "pause" : "play"}"></i>`;

  if (window.lucide) lucide.createIcons();
}

async function playTrack(index) {
  if (index < 0 || index >= tracks.length) return;

  currentIndex = index;

  const track = tracks[index];

  if (audio.src !== track.src) {
    audio.src = track.src;
  }

  updateNowPlaying();
  renderTracks();

  try {
    await audio.play();
    setPlayIcon(true);
  } catch (error) {
    setPlayIcon(false);
    alert("Unable to play this track. Try uploading a local audio file.");
  }
}

function togglePlay() {
  if (currentIndex === -1) {
    if (tracks.length) playTrack(0);
    return;
  }

  if (audio.paused) {
    audio.play().then(() => setPlayIcon(true)).catch(() => {});
  } else {
    audio.pause();
    setPlayIcon(false);
  }
}

function nextTrack() {
  if (!tracks.length) return;

  let next = isShuffle
    ? Math.floor(Math.random() * tracks.length)
    : currentIndex + 1;

  if (next >= tracks.length) {
    next = repeatMode === 1 ? 0 : currentIndex;
  }

  playTrack(next);
}

function previousTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  let prev = currentIndex - 1;

  if (prev < 0) {
    prev = repeatMode === 1 ? tracks.length - 1 : 0;
  }

  playTrack(prev);
}

function addFiles(files) {
  [...files]
    .filter(file => file.type.startsWith("audio/"))
    .forEach(file => {
      const src = URL.createObjectURL(file);

      objectUrls.push(src);

      const track = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Your device",
        album: "Local files",
        duration: "",
        src,
        uploaded: true,
        liked: false
      };

      tracks.push(track);

      const temp = new Audio();
      temp.src = src;

      temp.addEventListener("loadedmetadata", () => {
        track.duration = formatTime(temp.duration);
        renderTracks();
      }, { once: true });
    });

  activeFilter = "all";
  renderTracks();

  if (files.length) {
    document.getElementById("library")
      .scrollIntoView({ behavior: "smooth" });
  }
}

// Upload music
document.getElementById("uploadTop")
  .addEventListener("click", () => fileInput.click());

document.getElementById("emptyUpload")
  .addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", e => {
  addFiles(e.target.files);
  fileInput.value = "";
});

// Player controls
document.getElementById("playBtn")
  .addEventListener("click", togglePlay);

document.getElementById("heroPlay")
  .addEventListener("click", () => {
    currentIndex < 0 ? playTrack(0) : togglePlay();
  });

document.getElementById("nextBtn")
  .addEventListener("click", nextTrack);

document.getElementById("prevBtn")
  .addEventListener("click", previousTrack);

// Shuffle
document.getElementById("shuffleBtn")
  .addEventListener("click", () => {
    isShuffle = !isShuffle;

    document.getElementById("shuffleBtn")
      .classList.toggle("enabled", isShuffle);
  });

// Repeat
document.getElementById("repeatBtn")
  .addEventListener("click", () => {
    repeatMode = (repeatMode + 1) % 3;

    const btn = document.getElementById("repeatBtn");

    btn.classList.toggle("enabled", repeatMode !== 0);

    btn.innerHTML = `
      <i data-lucide="${
        repeatMode === 2 ? "repeat-1" : "repeat"
      }"></i>
    `;

    if (window.lucide) lucide.createIcons();
  });

// Like current song
document.getElementById("likeCurrent")
  .addEventListener("click", () => {
    if (currentIndex < 0) return;

    tracks[currentIndex].liked =
      !tracks[currentIndex].liked;

    updateNowPlaying();
    renderTracks();
  });

// Seek bar
document.getElementById("seekBar")
  .addEventListener("input", e => {
    if (audio.duration) {
      audio.currentTime =
        (Number(e.target.value) / 100) * audio.duration;
    }
  });

// Volume
document.getElementById("volumeBar")
  .addEventListener("input", e => {
    audio.volume = Number(e.target.value);
  });

audio.volume = 0.8;

// Progress update
audio.addEventListener("timeupdate", () => {
  document.getElementById("currentTime").textContent =
    formatTime(audio.currentTime);

  document.getElementById("totalTime").textContent =
    formatTime(audio.duration);

  document.getElementById("seekBar").value =
    audio.duration
      ? (audio.currentTime / audio.duration) * 100
      : 0;
});

// Auto next / repeat
audio.addEventListener("ended", () => {
  if (repeatMode === 2) {
    audio.currentTime = 0;
    audio.play();
  } else if (
    currentIndex < tracks.length - 1 ||
    repeatMode === 1
  ) {
    nextTrack();
  } else {
    setPlayIcon(false);
  }
});

audio.addEventListener("play", () => {
  setPlayIcon(true);
  renderTracks();
});

audio.addEventListener("pause", () => {
  setPlayIcon(false);
  renderTracks();
});

// Search
searchInput.addEventListener("input", renderTracks);

// Track list actions
trackList.addEventListener("click", e => {
  const play = e.target.closest("[data-play]");
  const like = e.target.closest("[data-like]");

  if (play) {
    playTrack(Number(play.dataset.play));
  }

  if (like) {
    const i = Number(like.dataset.like);

    tracks[i].liked = !tracks[i].liked;

    renderTracks();

    if (i === currentIndex) updateNowPlaying();
  }
});

// Quick filters
document.getElementById("quickGrid")
  .addEventListener("click", e => {
    const card = e.target.closest("[data-filter]");

    if (!card) return;

    activeFilter = card.dataset.filter;
    searchInput.value = "";

    renderTracks();
  });

// Show all
document.getElementById("showAll")
  .addEventListener("click", () => {
    activeFilter = "all";
    searchInput.value = "";
    renderTracks();
  });

// Create playlist demo
document.getElementById("createPlaylist")
  .addEventListener("click", () => {
    alert("Playlist creation is not implemented yet.");
  });

// Keyboard shortcuts
document.addEventListener("keydown", e => {
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "k"
  ) {
    e.preventDefault();
    searchInput.focus();
  }

  if (
    e.code === "Space" &&
    !["INPUT", "TEXTAREA"].includes(
      document.activeElement.tagName
    )
  ) {
    e.preventDefault();
    togglePlay();
  }
});

// Initialize demo tracks
tracks = demoTracks.map(track => ({
  ...track,
  liked: false
}));

renderTracks();

if (window.lucide) lucide.createIcons();

// Cleanup temporary audio URLs
window.addEventListener("beforeunload", () => {
  objectUrls.forEach(url => URL.revokeObjectURL(url));
});
  
