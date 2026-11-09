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
