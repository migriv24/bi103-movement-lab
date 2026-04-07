/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CELL PLAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ORGANELLE_CONFIGS = [
  { cls: 'mito',     dx1:  9, dy1: -4, dx2: -5, dy2:  8, dx3: 12, dy3:  2, dur: 7.2 },
  { cls: 'vesicle',  dx1: -7, dy1:  6, dx2: 10, dy2: -3, dx3: -4, dy3: 10, dur: 4.8 },
  { cls: 'golgi',    dx1:  5, dy1: -8, dx2: -9, dy2:  4, dx3:  8, dy3: -6, dur: 9.1 },
  { cls: 'mito',     dx1:-10, dy1:  3, dx2:  7, dy2: -7, dx3: -3, dy3:  5, dur: 6.5 },
  { cls: 'lysosome', dx1:  6, dy1:  9, dx2: -8, dy2: -2, dx3:  4, dy3: 11, dur: 5.3 },
  { cls: 'vesicle',  dx1: -4, dy1: -6, dx2: 11, dy2:  5, dx3: -7, dy3: -4, dur: 7.8 },
  { cls: 'mito',     dx1:  8, dy1:  5, dx2: -6, dy2: -8, dx3: 10, dy3:  1, dur: 8.4 },
];

// Spread organelles across the player width and two height bands
const POSITIONS = [
  { x:  4, y: 18 }, { x: 16, y: 62 }, { x: 29, y: 22 },
  { x: 44, y: 55 }, { x: 60, y: 20 }, { x: 74, y: 65 },
  { x: 88, y: 30 },
];

const CODON_COUNT = 28; // total tick marks on the mRNA strand

class CellPlayer {
  constructor(el) {
    this.el   = el;
    this.audio = new Audio(el.dataset.src);
    this.playing = false;
    this._build();
    this._wire();
  }

  _build() {
    // Background organelles
    const bgHTML = ORGANELLE_CONFIGS.map((cfg, i) => {
      const pos = POSITIONS[i];
      return `<span class="organelle ${cfg.cls}" style="
        left:${pos.x}%; top:${pos.y}%;
        --dur:${cfg.dur}s; --delay:${(i * 0.85).toFixed(2)}s;
        --dx1:${cfg.dx1}px; --dy1:${cfg.dy1}px;
        --dx2:${cfg.dx2}px; --dy2:${cfg.dy2}px;
        --dx3:${cfg.dx3}px; --dy3:${cfg.dy3}px;
      "></span>`;
    }).join('');

    // Codon ticks (every 3rd is a "triplet" — taller)
    const codonsHTML = Array.from({ length: CODON_COUNT }, (_, i) => {
      const h   = i % 3 === 2 ? 10 : 5;
      const cls = i % 3 === 2 ? 'codon-tick triplet' : 'codon-tick';
      return `<span class="${cls}" style="--h:${h}px"><style>.codon-tick:nth-child(${i+1})::after{height:${h}px}</style></span>`;
    }).join('');

    const label = this.el.dataset.label ?? '';

    this.el.innerHTML = `
      <div class="cell-bg">${bgHTML}</div>
      <div class="cell-controls">
        <button class="nucleus-btn" aria-label="Play">
          ${ICONS.play}
        </button>
        <div class="mrna-wrap">
          ${label ? `<span class="mrna-label">${label}</span>` : ''}
          <div class="mrna-track">
            <div class="mrna-codons">${codonsHTML}</div>
            <div class="mrna-fill"></div>
            <div class="ribosome">
              <div class="rib-large"></div>
              <div class="rib-small"></div>
              <div class="rib-tunnel"></div>
            </div>
          </div>
        </div>
        <span class="cell-time">0:00 / 0:00</span>
      </div>`;

    this.btn      = this.el.querySelector('.nucleus-btn');
    this.fill     = this.el.querySelector('.mrna-fill');
    this.ribosome = this.el.querySelector('.ribosome');
    this.timeEl   = this.el.querySelector('.cell-time');
    this.track    = this.el.querySelector('.mrna-track');
  }

  _wire() {
    this.btn.addEventListener('click', () => this._toggle());

    this.audio.addEventListener('timeupdate',    () => this._update());
    this.audio.addEventListener('loadedmetadata',() => this._update());
    this.audio.addEventListener('ended',         () => this._pause());

    // Seek by clicking / dragging the track
    let seeking = false;
    const seek = e => {
      const rect  = this.track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      if (isFinite(this.audio.duration)) this.audio.currentTime = ratio * this.audio.duration;
    };
    this.track.addEventListener('mousedown',  e => { seeking = true; seek(e); });
    window.addEventListener('mousemove', e => { if (seeking) seek(e); });
    window.addEventListener('mouseup',   ()  => { seeking = false; });

    // Touch seek
    this.track.addEventListener('touchstart', e => seek(e.touches[0]), { passive: true });
    this.track.addEventListener('touchmove',  e => seek(e.touches[0]), { passive: true });
  }

  _toggle() { this.playing ? this._pause() : this._play(); }

  _play() {
    // Pause every other player first
    document.querySelectorAll('.cell-player').forEach(p => {
      if (p !== this.el && p._cp) p._cp._pause();
    });
    this.audio.play();
    this.playing = true;
    this.el.classList.add('playing');
    this.btn.innerHTML = ICONS.pause;
    this.btn.setAttribute('aria-label', 'Pause');
  }

  _pause() {
    this.audio.pause();
    this.playing = false;
    this.el.classList.remove('playing');
    this.btn.innerHTML = ICONS.play;
    this.btn.setAttribute('aria-label', 'Play');
  }

  _update() {
    const { currentTime, duration } = this.audio;
    const pct = duration ? (currentTime / duration) * 100 : 0;
    this.fill.style.width       = `${pct}%`;
    this.ribosome.style.left    = `${pct}%`;
    this.timeEl.textContent     = `${_fmt(currentTime)} / ${_fmt(duration || 0)}`;
  }
}

const ICONS = {
  play:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
};

function _fmt(s) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// Mount all players
document.querySelectorAll('.cell-player').forEach(el => {
  el._cp = new CellPlayer(el);
});


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LIGHTBOX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxCap   = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

document.querySelectorAll('figure img').forEach(img => {
  img.addEventListener('click', () => {
    lightboxImg.src         = img.src;
    lightboxImg.alt         = img.alt;
    lightboxCap.textContent = img.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });
});

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ACTIVE NAV ON SCROLL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const sections = document.querySelectorAll('main section');
const navLinks = document.querySelectorAll('#main-nav a');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`#main-nav a[href="#${entry.target.id}"]`);
      if (active) {
        active.classList.add('active');
        active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      }
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });

sections.forEach(s => observer.observe(s));
