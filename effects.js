/* ============================================================
   effects.js — ambient "wow" layer shared by every page
   Starfield canvas, aurora canvas, floating hearts, cursor trail,
   panel tilt, typewriter, magnetic buttons, page transitions.
   ============================================================ */

const HEART_PATH = "M120 206c-41-26-72-49-72-89 0-23 18-42 41-42 13 0 26 6 32 17 6-11 19-17 32-17 23 0 41 19 41 42 0 40-31 63-73 89Z";

function heartSVG(colorVar) {
  return `<svg viewBox="0 0 240 240" fill="currentColor"><path d="${HEART_PATH}"/></svg>`;
}

/* ---------- Starfield (twinkling stars + shooting stars) ---------- */
function initStarfield(canvas) {
  const ctx = canvas.getContext("2d");
  let w, h, stars, dpr;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    const count = Math.min(140, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.4 + 0.3) * dpr,
      baseAlpha: Math.random() * 0.6 + 0.25,
      speed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  let shootingStar = null;
  let nextShootTime = performance.now() + Math.random() * 4000 + 2000;

  function maybeSpawnShootingStar(t) {
    if (reduceMotion || shootingStar || t < nextShootTime) return;
    shootingStar = {
      x: Math.random() * w * 0.5,
      y: Math.random() * h * 0.3,
      vx: (Math.random() * 6 + 8) * dpr,
      vy: (Math.random() * 3 + 3) * dpr,
      life: 1,
    };
    nextShootTime = t + Math.random() * 7000 + 5000;
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const alpha = reduceMotion ? s.baseAlpha : s.baseAlpha * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    maybeSpawnShootingStar(t);
    if (shootingStar) {
      const ss = shootingStar;
      ctx.save();
      const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 6, ss.y - ss.vy * 6);
      grad.addColorStop(0, `rgba(255,255,255,${ss.life})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 6, ss.y - ss.vy * 6);
      ctx.stroke();
      ctx.restore();
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= 0.02;
      if (ss.life <= 0 || ss.x > w || ss.y > h) shootingStar = null;
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

/* ---------- Parallax drift for background canvases ---------- */
function initParallax(layers) {
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isTouch) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;

  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function loop() {
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    layers.forEach((layer, i) => {
      const strength = (i + 1) * 5;
      layer.style.transform = `translate(${cx * strength}px, ${cy * strength}px) scale(1.03)`;
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ---------- Cursor spotlight glow ---------- */
function initSpotlight() {
  const isTouch = window.matchMedia("(hover: none)").matches;
  const spot = document.createElement("div");
  spot.className = "spotlight";
  document.body.appendChild(spot);
  if (isTouch) return;

  window.addEventListener("pointermove", (e) => {
    const mx = (e.clientX / window.innerWidth) * 100;
    const my = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty("--mx", `${mx}%`);
    document.documentElement.style.setProperty("--my", `${my}%`);
  });
}

/* ---------- Intro splash screen ---------- */
function initSplash() {
  if (sessionStorage.getItem("dp_splash_seen")) return;

  const splash = document.createElement("div");
  splash.className = "splash";
  splash.innerHTML = `
    <div class="splash__heart">${heartSVG()}</div>
    <div class="splash__bar"></div>
    <p class="splash__label">David & Précieuse</p>
  `;
  document.body.appendChild(splash);

  setTimeout(() => {
    splash.classList.add("hide");
    sessionStorage.setItem("dp_splash_seen", "1");
    setTimeout(() => splash.remove(), 800);
  }, 1200);
}

/* ---------- Gentle ambient sound (WebAudio, no assets needed) ---------- */
const SoundFX = (() => {
  let ctx = null;
  let enabled = false;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type = "sine", gainPeak = 0.06, delay = 0) {
    if (!enabled) return;
    const c = ensureCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain).connect(c.destination);
    const t0 = c.currentTime + delay;
    gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  return {
    setEnabled(v) { enabled = v; if (v) ensureCtx(); },
    isEnabled() { return enabled; },
    chime() { tone(880, 0.5, "sine", 0.05); tone(1318.5, 0.6, "sine", 0.04, 0.08); },
    click() { tone(520, 0.12, "triangle", 0.04); },
    whoosh() { tone(220, 0.18, "sawtooth", 0.02); },
    fanfare() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.55, "sine", 0.055, i * 0.11));
    },
  };
})();

function initSoundToggle() {
  const btn = document.createElement("button");
  btn.className = "sound-toggle";
  btn.setAttribute("aria-label", "Activer le son");
  btn.textContent = "🔇";
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    const next = !SoundFX.isEnabled();
    SoundFX.setEnabled(next);
    btn.classList.toggle("is-on", next);
    btn.textContent = next ? "🔊" : "🔇";
    if (next) SoundFX.click();
  });
}

/* ---------- Aurora (soft drifting color blobs) ---------- */
function initAurora(canvas) {
  const ctx = canvas.getContext("2d");
  let w, h, dpr;
  const blobs = [
    { color: "138,92,255", x: 0.2, y: 0.15, r: 0.5, sx: 0.00006, sy: 0.00004, t: 0 },
    { color: "255,93,162", x: 0.8, y: 0.1, r: 0.45, sx: -0.00005, sy: 0.00005, t: 100 },
    { color: "255,210,122", x: 0.5, y: 0.9, r: 0.4, sx: 0.00004, sy: -0.00003, t: 200 },
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const b of blobs) {
      const cx = (b.x + Math.sin(t * b.sx + b.t) * 0.08) * w;
      const cy = (b.y + Math.cos(t * b.sy + b.t) * 0.08) * h;
      const r = b.r * Math.max(w, h);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${b.color},0.35)`);
      grad.addColorStop(1, `rgba(${b.color},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

/* ---------- Floating hearts drifting upward ---------- */
function initFloatingHearts(container, density = 1) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  function spawn() {
    const fh = document.createElement("span");
    fh.className = "fh";
    fh.innerHTML = heartSVG();
    const size = Math.random() * 14 + 10;
    fh.style.width = `${size}px`;
    fh.style.height = `${size}px`;
    fh.style.left = `${Math.random() * 100}%`;
    fh.style.setProperty("--drift", `${(Math.random() - 0.5) * 160}px`);
    fh.style.setProperty("--spin", `${(Math.random() - 0.5) * 360}deg`);
    const duration = Math.random() * 6 + 8;
    fh.style.animationDuration = `${duration}s`;
    fh.style.color = Math.random() > 0.5 ? "var(--pink-soft)" : "var(--gold)";
    container.appendChild(fh);
    setTimeout(() => fh.remove(), duration * 1000 + 200);
  }

  const interval = Math.max(500, 1800 / density);
  spawn();
  setInterval(spawn, interval);
}

/* ---------- Cursor heart trail (desktop, non-touch) ---------- */
function initCursorTrail() {
  const isTouch = window.matchMedia("(hover: none)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isTouch || reduceMotion) return;

  let last = 0;
  window.addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (now - last < 60) return;
    last = now;
    const heart = document.createElement("div");
    heart.className = "cursor-heart";
    heart.innerHTML = heartSVG();
    heart.style.left = `${e.clientX}px`;
    heart.style.top = `${e.clientY}px`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 900);
  });
}

/* ---------- Panel 3D tilt on mouse move ---------- */
function initTilt(panel) {
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isTouch || !panel) return;

  panel.addEventListener("mousemove", (e) => {
    const rect = panel.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    panel.style.transform = `rotateY(${px * 5}deg) rotateX(${-py * 5}deg) translateZ(0)`;
  });

  panel.addEventListener("mouseleave", () => {
    panel.style.transform = "rotateY(0) rotateX(0)";
  });
}

/* ---------- Scramble-reveal effect for headings ---------- */
const SCRAMBLE_CHARS = "✦✧★☆♡♥・.:*+°˖";

function scrambleReveal(el, speed = 34) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const text = el.getAttribute("data-text") || el.textContent;
  el.setAttribute("data-text", text);
  el.classList.add("is-scrambling");

  if (reduceMotion) {
    el.textContent = text;
    el.classList.remove("is-scrambling");
    return;
  }

  const chars = text.split("");
  let revealed = 0;
  let frame = 0;

  function render() {
    let out = "";
    for (let i = 0; i < chars.length; i += 1) {
      if (i < revealed) {
        out += chars[i];
      } else if (chars[i] === " ") {
        out += " ";
      } else {
        out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
    }
    el.textContent = out;
  }

  function step() {
    frame += 1;
    render();
    if (frame % 2 === 0 && revealed < chars.length) revealed += 1;
    if (revealed < chars.length) {
      requestAnimationFrame(step);
    } else {
      el.textContent = text;
      el.classList.remove("is-scrambling");
    }
  }
  requestAnimationFrame(step);
}

/* ---------- Magnetic buttons ---------- */
function initMagneticButtons() {
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (isTouch) return;
  document.querySelectorAll(".btn--primary, .btn--ghost").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35 - 4}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
}

/* ---------- Page transitions on internal nav links ---------- */
function initPageTransitions() {
  document.body.classList.add("page--enter");
  document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (link.target === "_blank" || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      document.body.classList.remove("page--enter");
      document.body.classList.add("page--leave");
      setTimeout(() => { window.location.href = href; }, 420);
    });
  });
}

/* ---------- Shared nav + journey dots ---------- */
const JOURNEY_PAGES = [
  { href: "index.html", label: "Accueil" },
  { href: "quiz.html", label: "Épreuve" },
  { href: "declaration.html", label: "Déclaration" },
  { href: "mariage.html", label: "La demande" },
  { href: "photos.html", label: "Souvenirs" },
];

function injectNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.className = "wow-nav";
  nav.innerHTML = `<div class="wow-nav__inner">${JOURNEY_PAGES.map(
    (p) => `<a href="${p.href}" class="${p.href === current ? "active" : ""}">${p.label}</a>`
  ).join("")}</div>`;
  document.body.prepend(nav);

  const journey = document.createElement("div");
  journey.className = "journey";
  const currentIndex = JOURNEY_PAGES.findIndex((p) => p.href === current);
  journey.innerHTML = JOURNEY_PAGES.map((p, i) => {
    const cls = i === currentIndex ? "active" : i < currentIndex ? "done" : "";
    return `<span class="${cls}"></span>`;
  }).join("");
  document.body.appendChild(journey);
}

/* ---------- Bootstrap everything ---------- */
function bootstrapEffects() {
  initSplash();
  injectNav();
  initSoundToggle();

  const starfield = document.createElement("canvas");
  starfield.id = "starfield";
  document.body.prepend(starfield);
  initStarfield(starfield);

  const aurora = document.createElement("canvas");
  aurora.id = "auroraCanvas";
  document.body.prepend(aurora);
  initAurora(aurora);

  initParallax([starfield, aurora]);
  initSpotlight();

  const heartsLayer = document.createElement("div");
  heartsLayer.className = "floating-hearts";
  document.body.appendChild(heartsLayer);
  initFloatingHearts(heartsLayer, window.innerWidth < 700 ? 0.5 : 1);

  initCursorTrail();
  initMagneticButtons();
  initPageTransitions();

  document.querySelectorAll(".panel").forEach(initTilt);

  document.querySelectorAll("[data-typewrite]").forEach((el) => scrambleReveal(el, Number(el.dataset.typewrite) || 34));

  document.querySelectorAll(".choice, .btn").forEach((el) => {
    el.addEventListener("click", () => SoundFX.click());
  });
}

document.addEventListener("DOMContentLoaded", bootstrapEffects);
