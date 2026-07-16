/* ============================================================
   script.js — page-specific interactive logic
   (quiz feedback, proposal chase + burst, photo lightbox)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Quiz ---------- */
  const quizButtons = document.querySelectorAll(".choice");
  const quizFeedback = document.getElementById("feedback");

  if (quizButtons.length && quizFeedback) {
    quizButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const isCorrect = button.classList.contains("choice--correct");

        if (isCorrect) {
          button.classList.add("is-correct");
          quizFeedback.textContent = "Parfait. Ton cœur a trouvé la bonne émotion. ✨";
          quizFeedback.style.color = "var(--gold)";
          if (typeof SoundFX !== "undefined") SoundFX.chime();

          const nextPage = button.dataset.next;
          if (nextPage) {
            setTimeout(() => {
              document.body.classList.remove("page--enter");
              document.body.classList.add("page--leave");
              setTimeout(() => { window.location.href = nextPage; }, 420);
            }, 700);
          }
        } else {
          button.classList.add("is-wrong");
          setTimeout(() => button.classList.remove("is-wrong"), 500);
          quizFeedback.textContent = "Pas encore. Le cœur sait reconnaître la vraie lumière.";
          quizFeedback.style.color = "var(--violet)";
          if (typeof SoundFX !== "undefined") SoundFX.whoosh();
        }
      });
    });
  }

  /* ---------- Proposal page ---------- */
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const proposalMessage = document.getElementById("proposalMessage");
  const heartburst = document.getElementById("heartburst");
  const heartburstSparkles = document.getElementById("heartburstSparkles");
  const proposalStage = document.getElementById("proposalStage");
  const finale = document.getElementById("finale");
  const finaleConfetti = document.getElementById("finaleConfetti");
  const finaleGallery = document.getElementById("finaleGallery");
  const replayBtn = document.getElementById("replayBtn");

  if (yesBtn && noBtn && proposalMessage && heartburst && heartburstSparkles) {
    let noX = 74;
    let noY = 48;
    let dodges = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function setNoButtonPosition(x, y) {
      noBtn.style.left = `${x}%`;
      noBtn.style.top = `${y}%`;
    }

    const teasers = [
      "Le non cherche encore la bonne direction.",
      "Trop lent, le non s'échappe encore !",
      "Le cœur ne se laisse pas convaincre par le non.",
      "Essaie encore, le oui t'attend patiemment.",
      "Le non a peur du bonheur, semble-t-il.",
    ];

    function moveNoButton() {
      dodges += 1;
      const targetX = 15 + Math.random() * 70;
      const targetY = 15 + Math.random() * 65;
      noX = clamp(targetX, 8, 88);
      noY = clamp(targetY, 12, 82);
      setNoButtonPosition(noX, noY);
      noBtn.style.transform = `rotate(${(Math.random() - 0.5) * 24}deg)`;

      if (typeof SoundFX !== "undefined") SoundFX.whoosh();
      proposalMessage.textContent = teasers[Math.min(dodges - 1, teasers.length - 1)];

      if (dodges >= 5 && Math.random() > 0.6) {
        proposalMessage.textContent = "Le oui est déjà dans le cœur… il suffit de le dire.";
      }
    }

    setNoButtonPosition(noX, noY);
    noBtn.addEventListener("click", moveNoButton);
    noBtn.addEventListener("mouseenter", moveNoButton);
    noBtn.addEventListener("touchstart", (e) => { e.preventDefault(); moveNoButton(); }, { passive: false });

    function launchConfettiCannon() {
      finaleConfetti.innerHTML = "";
      const colors = ["#ff5da2", "#8a5cff", "#ffd27a", "#ffffff"];
      for (let i = 0; i < 70; i += 1) {
        const confetti = document.createElement("span");
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `${-10 - Math.random() * 20}%`;
        confetti.style.animationDelay = `${Math.random() * 0.6}s`;
        confetti.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
        confetti.style.background = colors[i % colors.length];
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        finaleConfetti.appendChild(confetti);
      }
    }

    /* Canvas particle-physics burst: hearts + sparks + gravity */
    function launchParticleBurst() {
      const canvas = document.createElement("canvas");
      canvas.id = "burstCanvas";
      document.body.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
      }
      resize();

      const cx = canvas.width / 2;
      const cy = canvas.height / 2.4;
      const colors = ["#ff5da2", "#ff8fc0", "#8a5cff", "#ffd27a", "#ffffff"];
      const particles = [];

      for (let i = 0; i < 90; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 7) * dpr;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2 * dpr,
          size: (Math.random() * 6 + 3) * dpr,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
          heart: Math.random() > 0.55,
          life: 1,
          decay: 0.006 + Math.random() * 0.006,
        });
      }

      const gravity = 0.08 * dpr;

      function drawHeart(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.size / 24, p.size / 24);
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(-12, -8, -24, 4, 0, 20);
        ctx.bezierCurveTo(24, 4, 12, -8, 0, 6);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.restore();
      }

      function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach((p) => {
          if (p.life <= 0) return;
          alive = true;
          p.vy += gravity;
          p.vx *= 0.992;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vrot;
          p.life -= p.decay;

          if (p.heart) {
            drawHeart(p);
          } else {
            ctx.save();
            ctx.globalAlpha = Math.max(p.life, 0);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8 * dpr;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        if (alive) {
          requestAnimationFrame(tick);
        } else {
          canvas.remove();
        }
      }
      requestAnimationFrame(tick);
    }

    yesBtn.addEventListener("click", () => {
      proposalMessage.textContent = "Oui… toujours oui, pour l'éternité.";
      heartburstSparkles.innerHTML = "";

      for (let i = 0; i < 26; i += 1) {
        const sparkle = document.createElement("span");
        const angle = (i / 26) * Math.PI * 2;
        const distance = 80 + Math.random() * 90;
        const size = 6 + Math.random() * 8;
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
        sparkle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
        sparkle.style.left = "50%";
        sparkle.style.top = "50%";
        sparkle.style.animationDelay = `${Math.random() * 0.25}s`;
        heartburstSparkles.appendChild(sparkle);
      }

      heartburst.classList.add("show");
      proposalStage.style.opacity = "0";
      proposalStage.style.pointerEvents = "none";

      document.body.classList.add("shake");
      setTimeout(() => document.body.classList.remove("shake"), 420);

      if (typeof SoundFX !== "undefined") SoundFX.fanfare();
      launchParticleBurst();

      setTimeout(() => {
        heartburst.classList.remove("show");
        finale.classList.add("show");
        launchConfettiCannon();
        launchParticleBurst();
        if (finaleGallery) finaleGallery.style.opacity = "1";
      }, 1500);
    });
  }

  if (replayBtn && finale) {
    replayBtn.addEventListener("click", () => {
      finale.classList.remove("show");
      const stage = document.getElementById("proposalStage");
      if (stage) { stage.style.opacity = "1"; stage.style.pointerEvents = "auto"; }
    });
  }

  /* ---------- Photo cards: broken image placeholder ---------- */
  document.querySelectorAll(".photo-card").forEach((card) => {
    const img = card.querySelector("img");
    if (!img) return;
    img.addEventListener("error", () => {
      card.classList.add("placeholder");
      card.innerHTML = "<span>Ajoute une photo dans le dossier photo/</span>";
    });
  });

  /* ---------- Lightbox for photo gallery ---------- */
  const galleryImgs = document.querySelectorAll(".photo-card img");
  if (galleryImgs.length) {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = `<button class="lightbox__close" aria-label="Fermer">&times;</button><img alt="" />`;
    document.body.appendChild(lightbox);
    const lightboxImg = lightbox.querySelector("img");
    const closeBtn = lightbox.querySelector(".lightbox__close");

    galleryImgs.forEach((img) => {
      img.addEventListener("click", () => {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add("show");
      });
    });

    function closeLightbox() { lightbox.classList.remove("show"); }
    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
  }
});
