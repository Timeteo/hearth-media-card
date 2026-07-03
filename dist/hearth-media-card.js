/* hearth-media-card
 * A cinematic now-playing sheet for dark glass dashboards.
 * Album art bleeds edge-to-edge behind a scrim; full cover shown as a tile.
 * Renders nothing when no media is playing. No dependencies, no build step.
 */

const VERSION = "0.1.0";

class HearthMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._timer = null;
    this._lastKey = "";
  }

  setConfig(config) {
    this._config = {
      entities: null,      // optional priority-ordered list; default: any media_player
      exclude: [],         // entity_ids to never show
      height: 190,
      accent: "#FFB27A",
      margin: "0",         // e.g. "0 -64px -40px" to escape view padding and bleed to edges
      ...config,
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() { this._startTimer(); }
  disconnectedCallback() { this._stopTimer(); }

  _startTimer() {
    this._stopTimer();
    this._timer = setInterval(() => this._updateProgress(), 1000);
  }
  _stopTimer() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  getCardSize() { return this._active() ? 3 : 0; }

  static getStubConfig() { return { exclude: [] }; }

  _active() {
    if (!this._hass || !this._config) return null;
    const candidates = this._config.entities
      ? this._config.entities
      : Object.keys(this._hass.states).filter((e) => e.startsWith("media_player."));
    let paused = null;
    for (const id of candidates) {
      const st = this._hass.states[id];
      if (!st || this._config.exclude.includes(id)) continue;
      if (st.state === "playing") return st;
      if (st.state === "paused" && !paused) paused = st;
    }
    return paused;
  }

  _call(service) {
    const st = this._active();
    if (!st) return;
    this._hass.callService("media_player", service, { entity_id: st.entity_id });
  }

  _progressPct(st) {
    const a = st.attributes;
    if (!a.media_duration || a.media_position == null) return null;
    let pos = a.media_position;
    if (a.media_position_updated_at && st.state === "playing") {
      pos += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
    }
    return Math.min(100, (pos / a.media_duration) * 100);
  }

  _updateProgress() {
    const st = this._active();
    if (!st) return;
    const fill = this.shadowRoot.querySelector(".prog .fill");
    const pct = this._progressPct(st);
    if (fill && pct != null) fill.style.width = pct.toFixed(2) + "%";
  }

  _esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  _render() {
    if (!this._hass || !this._config) return;
    const st = this._active();

    if (!st) {
      if (this._lastKey !== "") { this.shadowRoot.innerHTML = ""; this._lastKey = ""; }
      this.style.display = "none";
      return;
    }
    this.style.display = "block";

    const a = st.attributes;
    const art = a.entity_picture_local || a.entity_picture || "";
    const title = a.media_title || a.media_content_id || "Playing";
    const artist = [a.media_artist || a.media_series_title, a.media_album_name]
      .filter(Boolean).join(" — ");
    const source = a.friendly_name || st.entity_id;
    const accent = this._config.accent;
    const h = this._config.height;
    const paused = st.state !== "playing";

    // re-render fully only when track/entity/art changes; progress ticks separately
    const key = [st.entity_id, title, artist, art, paused].join("|");
    if (key === this._lastKey) { this._updateProgress(); return; }
    this._lastKey = key;

    const tile = Math.min(174, h - 40);
    const pct = this._progressPct(st);
    const playPath = paused ? "M8 5v14l11-7z" : "M8 5h3v14H8zm5 0h3v14h-3z";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .band { position:relative; height:${h}px; overflow:hidden; margin:${this._config.margin};
          color:rgba(255,255,255,0.97);
          font-family: var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif); }
        .bgart { position:absolute; inset:0; background:#10121a center 30%/cover no-repeat;
          ${art ? `background-image:url('${art}');` : ""}
          filter:brightness(0.5) saturate(0.9); transform:scale(1.05); }
        .scrim { position:absolute; inset:0; background:
          linear-gradient(90deg, rgba(10,11,14,0.96) 0%, rgba(10,11,14,0.72) 45%, rgba(10,11,14,0.25) 100%),
          linear-gradient(180deg, rgba(10,11,14,1) 0%, rgba(10,11,14,0) 40%); }
        .meta { position:absolute; left:64px; bottom:26px; right:${64 + tile + 40 + 240}px; }
        .src { font-size:14px; font-weight:600; letter-spacing:2.5px; color:${accent};
          text-transform:uppercase; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .title { font-size:36px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .artist { font-size:22px; color:rgba(255,255,255,0.6); margin-top:2px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .controls { position:absolute; right:${64 + tile + 40}px; bottom:${Math.round(h / 2) - 34}px;
          display:flex; align-items:center; gap:14px; }
        .btn { width:68px; height:68px; border-radius:50%; display:flex; align-items:center;
          justify-content:center; cursor:pointer; -webkit-tap-highlight-color:transparent; }
        .btn svg { width:36px; height:36px; fill:rgba(255,255,255,0.85);
          filter:drop-shadow(0 2px 8px rgba(0,0,0,0.8)); }
        .btn.play { background:rgba(10,11,14,0.5); border:1.5px solid ${accent}B3; }
        .btn.play svg { fill:${accent}; width:32px; height:32px; }
        .tile { position:absolute; right:64px; bottom:${Math.round((h - tile) / 2)}px; width:${tile}px; height:${tile}px;
          border-radius:18px; object-fit:cover; box-shadow:0 12px 40px rgba(0,0,0,0.7);
          border:1px solid rgba(255,255,255,0.14); background:#10121a; }
        .prog { position:absolute; left:0; right:0; bottom:0; height:4px; background:rgba(255,255,255,0.12); }
        .prog .fill { width:${pct != null ? pct.toFixed(2) : 0}%; height:4px; background:${accent};
          box-shadow:0 0 10px ${accent}CC; transition:width 1s linear; }
      </style>
      <div class="band">
        <div class="bgart"></div>
        <div class="scrim"></div>
        <div class="meta">
          <div class="src">${this._esc(source)}</div>
          <div class="title">${this._esc(title)}</div>
          <div class="artist">${this._esc(artist)}</div>
        </div>
        <div class="controls">
          <div class="btn" id="prev"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></div>
          <div class="btn play" id="pp"><svg viewBox="0 0 24 24"><path d="${playPath}"/></svg></div>
          <div class="btn" id="next"><svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg></div>
        </div>
        ${art ? `<img class="tile" src="${art}">` : ""}
        <div class="prog"><div class="fill"></div></div>
      </div>
    `;
    // MA's image proxy can 404 briefly during track changes; retry failed loads
    const tile = this.shadowRoot.querySelector(".tile");
    if (tile) {
      let tries = 0;
      tile.addEventListener("error", () => {
        if (tries++ < 3) setTimeout(() => {
          const bust = art + (art.includes("?") ? "&" : "?") + "r=" + Date.now();
          tile.src = bust;
          const bg = this.shadowRoot.querySelector(".bgart");
          if (bg) bg.style.backgroundImage = `url('${bust}')`;
        }, 2000 * tries);
      });
    }
    this.shadowRoot.getElementById("prev").addEventListener("click", () => this._call("media_previous_track"));
    this.shadowRoot.getElementById("pp").addEventListener("click", () => this._call("media_play_pause"));
    this.shadowRoot.getElementById("next").addEventListener("click", () => this._call("media_next_track"));
  }
}

customElements.define("hearth-media-card", HearthMediaCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "hearth-media-card",
  name: "Hearth Media Card",
  description: "Cinematic now-playing sheet: edge-to-edge album art ambience, full cover tile, title-first metadata. Hidden when idle.",
});
console.info(`%c HEARTH-MEDIA-CARD %c v${VERSION} `, "background:#FFB27A;color:#000;font-weight:700;", "background:#222;color:#FFB27A;");
