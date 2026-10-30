(function () {
  "use strict";

  const root        = document.documentElement;
  const body        = document.body;
  const siteHeader  = document.querySelector(".site-header");
  const menuToggle  = document.querySelector(".menu-toggle");
  
  const themeToggle = document.getElementById("theme-toggle"); 
  const nav         = document.getElementById("primary-nav");
  const loader      = document.getElementById("page-loader");

  // SETTINGS MENU ELEMENTS
  const settingsBtn = document.getElementById("settings-btn");
  const settingsMenu = document.getElementById("settings-menu");
  const pageMain = document.getElementById("settings-page-main");
  const pageAudio = document.getElementById("settings-page-audio");
  const goToAudioBtn = document.getElementById("go-to-music-settings");
  const goBackBtn = document.getElementById("go-back-settings");

  // AUDIO SETTINGS ELEMENTS
  const musicToggle = document.getElementById("music-toggle");
  const bgMusic = document.getElementById("bg-music");
  const trackBtns = document.querySelectorAll(".track-btn");
  const volumeSlider = document.getElementById("volume-slider");
  const volumeValue = document.getElementById("volume-value");

  const STORAGE_KEY    = "portfolio-theme";
  const MUSIC_KEY      = "portfolio-music";
  const TRACK_KEY      = "portfolio-track";
  const VOLUME_KEY     = "portfolio-volume";
  
  const LOADER_MIN_MS  = 400;
  const LOADER_MAX_MS  = 8000; 

  /* =========================================================
     AUDIO ERROR CATCHING
     ========================================================= */
  if (bgMusic) {
    bgMusic.addEventListener('error', function(e) {
      console.error("Audio Load Error:", bgMusic.src);
      if (bgMusic.src && !bgMusic.src.endsWith('undefined')) {
        alert("Could not load audio file: " + bgMusic.src + "\n\nMake sure the file exists in your 'assets' folder!");
      }
    });
  }

  /* =========================================================
     THEME
     ========================================================= */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    if (themeToggle) themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#14110E" : "#FFFCF2");
  }

  applyTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }

  /* =========================================================
     MOBILE MENU
     ========================================================= */
  function setMenu(open) {
    if (!siteHeader || !menuToggle) return;
    siteHeader.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  }

  if (menuToggle && siteHeader) {
    menuToggle.addEventListener("click", () => setMenu(!siteHeader.classList.contains("is-open")));
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
  }

  /* =========================================================
     SETTINGS DROPDOWN (Two-Page Logic)
     ========================================================= */
  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation(); 
      const isOpen = settingsMenu.classList.contains("is-open");
      settingsMenu.classList.toggle("is-open", !isOpen);
      settingsBtn.classList.toggle("active", !isOpen);
      settingsBtn.setAttribute("aria-expanded", String(!isOpen));
      
      if (!isOpen) {
        pageMain.classList.add("active");
        pageAudio.classList.remove("active");
      }
    });

    document.addEventListener("click", (e) => {
      if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
        settingsMenu.classList.remove("is-open");
        settingsBtn.classList.remove("active");
        settingsBtn.setAttribute("aria-expanded", "false");
      }
    });

    if (goToAudioBtn) {
      goToAudioBtn.addEventListener("click", () => {
        pageMain.classList.remove("active");
        pageAudio.classList.add("active");
      });
    }

    if (goBackBtn) {
      goBackBtn.addEventListener("click", () => {
        pageAudio.classList.remove("active");
        pageMain.classList.add("active");
      });
    }
  }

  /* =========================================================
     PAGE LOADER
     ========================================================= */
  const loaderStart = performance.now();
  let loaderHidden  = false;
  
  let isPageLoaded = false;
  let isAvatarLoaded = !document.getElementById("avatar-canvas"); 

  function checkLoading() {
    if (isPageLoaded && isAvatarLoaded) hideLoader();
  }

  function hideLoader() {
    if (loaderHidden || !loader) return;
    loaderHidden = true;
    const wait = Math.max(0, LOADER_MIN_MS - (performance.now() - loaderStart));
    setTimeout(() => {
      loader.classList.add("is-hidden");
      setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 700);
    }, wait);
  }

  if (document.readyState === 'complete') { isPageLoaded = true; checkLoading(); }
  else { window.addEventListener('load', () => { isPageLoaded = true; checkLoading(); }); }

  window.addEventListener('avatarLoaded', () => { isAvatarLoaded = true; checkLoading(); });
  setTimeout(() => { isPageLoaded = true; isAvatarLoaded = true; hideLoader(); }, LOADER_MAX_MS);

  /* =========================================================
     CUSTOM CURSOR
     ========================================================= */
  const cursorDot = document.getElementById("cursor-dot");
  const cursorRing = document.getElementById("cursor-ring");
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!isTouch && !reducedMotion && cursorDot && cursorRing) {
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let ringX = mouseX, ringY = mouseY;

    function updateCursorState() {
      if (mouseX < 0 || mouseY < 0 || mouseX > window.innerWidth || mouseY > window.innerHeight) return;
      const hoveredEl = document.elementFromPoint(mouseX, mouseY);
      if (!hoveredEl) { cursorRing.classList.remove("spotlight", "hovering"); cursorDot.classList.remove("is-hidden"); return; }

      if (hoveredEl.closest('[data-cursor="spotlight"]')) {
        cursorRing.classList.add("spotlight"); cursorDot.classList.add("is-hidden"); cursorRing.classList.remove("hovering"); return;
      } 
      
      cursorRing.classList.remove("spotlight"); cursorDot.classList.remove("is-hidden");
      if (hoveredEl.closest("a, button, .btn, .project-card, .settings-item, input[type='range'], .track-btn")) {
        cursorRing.classList.add("hovering");
      } else {
        cursorRing.classList.remove("hovering");
      }
    }

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      cursorDot.style.opacity = "1"; cursorRing.style.opacity = "1";
      updateCursorState();
    });

    window.addEventListener("scroll", () => requestAnimationFrame(updateCursorState), { passive: true });

    function animateCursor() {
      ringX += (mouseX - ringX) * 0.15; ringY += (mouseY - ringY) * 0.15;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.addEventListener("mouseleave", () => { cursorDot.style.opacity = "0"; cursorRing.style.opacity = "0"; });
  }

  /* =========================================================
     INTERACTIVE BACKGROUND CANVAS
     ========================================================= */
  const canvas = document.getElementById("bg-canvas");
  if (canvas && !reducedMotion) {
    const ctx = canvas.getContext("2d");
    let width, height, particles = [];
    const spacing = 22, dotSize = 1.2; 
    const mouse = { x: -1000, y: -1000, radius: 180 };
    let targetIntensity = 0, currentIntensity = 0;
    let lastMoveTime = Date.now();
    const IDLE_DELAY = 1200; 
    const waves = [];

    function initCanvas() {
      width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight;
      particles = [];
      for (let x = 0; x < width; x += spacing) { for (let y = 0; y < height; y += spacing) { particles.push({ x, y, size: dotSize }); } }
    }

    function spawnWave(x, y, isClick) {
      waves.push({ x, y, radius: 0, maxRadius: isClick ? 350 : 250, opacity: isClick ? 1.0 : 0.6, speed: isClick ? 3 : 1.2, fadeSpeed: isClick ? 0.005 : 0.002 });
    }

    function scheduleNextRandomWave() {
      const delay = Math.random() * 3000 + 1000; 
      setTimeout(() => { if (!document.hidden) spawnWave(Math.random() * width, Math.random() * height, false); scheduleNextRandomWave(); }, delay);
    }
    scheduleNextRandomWave();

    function drawCanvas() {
      ctx.clearRect(0, 0, width, height);
      const isDark = root.getAttribute("data-theme") === "dark";
      const baseDot = isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(235, 229, 216, 0.6)";
      const accentDot = isDark ? "rgba(255, 127, 17, " : "rgba(254, 95, 0, "; 
      const lilacDot = isDark ? "rgba(156, 131, 212, " : "rgba(115, 83, 186, ";

      if (Date.now() - lastMoveTime > IDLE_DELAY) targetIntensity = 0;
      currentIntensity += (targetIntensity - currentIntensity) * 0.025; 

      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]; w.radius += w.speed; w.opacity -= w.fadeSpeed; 
        if (w.opacity <= 0 || w.radius > w.maxRadius) waves.splice(i, 1);
      }

      particles.forEach(p => {
        const dxMouse = mouse.x - p.x, dyMouse = mouse.y - p.y;
        const distSqMouse = (dxMouse * dxMouse) + (dyMouse * dyMouse);
        const radiusSqMouse = mouse.radius * mouse.radius;
        let mouseGlow = 0;
        if (distSqMouse < radiusSqMouse) mouseGlow = (1 - (Math.sqrt(distSqMouse) / mouse.radius)) * currentIntensity;

        let waveGlow = 0, isLilacWave = false;
        for (let j = 0; j < waves.length; j++) {
          const w = waves[j]; const distWave = Math.sqrt(Math.pow(w.x - p.x, 2) + Math.pow(w.y - p.y, 2));
          const distToRing = Math.abs(distWave - w.radius);
          if (distToRing < 25) {
            const intensity = (1 - (distToRing / 25)) * w.opacity;
            if (intensity > waveGlow) { waveGlow = intensity; isLilacWave = j % 2 === 0; }
          }
        }

        const finalIntensity = Math.max(mouseGlow, waveGlow);
        if (finalIntensity > 0.01) {
          const drawSize = p.size + (finalIntensity * 3.5); const shadowBlur = Math.pow(finalIntensity, 1.2) * 20;
          ctx.beginPath(); ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
          if (waveGlow > mouseGlow) {
            ctx.fillStyle = isLilacWave ? `${lilacDot}${finalIntensity})` : `${accentDot}${finalIntensity})`;
            ctx.shadowColor = isLilacWave ? (isDark ? "#9C83D4" : "#7353BA") : (isDark ? "#FF7F11" : "#FE5F00");
          } else {
            ctx.fillStyle = `${accentDot}${finalIntensity})`; ctx.shadowColor = isDark ? "#FF7F11" : "#FE5F00";
          }
          ctx.shadowBlur = shadowBlur > 0.5 ? shadowBlur : 0; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = baseDot; ctx.shadowBlur = 0; ctx.fill();
        }
      });
      requestAnimationFrame(drawCanvas);
    }

    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; targetIntensity = 1; lastMoveTime = Date.now(); });
    window.addEventListener("mousedown", (e) => { targetIntensity = 1; lastMoveTime = Date.now(); spawnWave(e.clientX, e.clientY, true); });
    window.addEventListener("resize", initCanvas);
    initCanvas(); drawCanvas();
  }

  /* =========================================================
     BACKGROUND MUSIC & AUDIO SETTINGS LOGIC
     ========================================================= */
  if (musicToggle && bgMusic) {
    let isMusicOn = localStorage.getItem(MUSIC_KEY) === "on";
    let savedTrack = localStorage.getItem(TRACK_KEY) || "1";
    let savedVolume = parseFloat(localStorage.getItem(VOLUME_KEY)) || 0.5;

    bgMusic.volume = savedVolume;
    if (volumeSlider) volumeSlider.value = savedVolume;
    if (volumeValue) volumeValue.textContent = `${Math.round(savedVolume * 100)}%`;
    
    const setTrack = (trackNum) => {
      bgMusic.src = `assets/bg-${trackNum}.mp3`;
      bgMusic.load();
      
      trackBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.track === trackNum);
      });
      localStorage.setItem(TRACK_KEY, trackNum);
    };

    setTrack(savedTrack);

    if (isMusicOn) body.classList.add("music-playing");

    musicToggle.addEventListener("click", () => {
      if (bgMusic.paused) {
        bgMusic.play().then(() => {
          body.classList.add("music-playing");
          localStorage.setItem(MUSIC_KEY, "on");
        }).catch(e => console.log("Audio play blocked:", e));
      } else {
        bgMusic.pause();
        body.classList.remove("music-playing");
        localStorage.setItem(MUSIC_KEY, "off");
      }
    });

    trackBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const trackNum = btn.dataset.track;
        setTrack(trackNum);
        
        bgMusic.play().then(() => {
          body.classList.add("music-playing");
          localStorage.setItem(MUSIC_KEY, "on");
        }).catch(e => console.log("Audio play blocked:", e));
      });
    });

    if (volumeSlider) {
      volumeSlider.addEventListener("input", (e) => {
        const vol = parseFloat(e.target.value);
        bgMusic.volume = vol;
        if (volumeValue) volumeValue.textContent = `${Math.round(vol * 100)}%`;
        localStorage.setItem(VOLUME_KEY, vol);
      });
    }

    if (isMusicOn && bgMusic.paused) {
      const startAudio = () => {
        bgMusic.play().catch(e => console.log("Autoplay blocked by browser."));
        document.removeEventListener("click", startAudio);
      };
      document.addEventListener("click", startAudio, { once: true });
    }
  }

  /* =========================================================
     BACK TO TOP BUTTON
     ========================================================= */
  const backToTopBtn = document.getElementById("back-to-top");
  const heroEl = document.getElementById("home");

  if (backToTopBtn) {
    const showBtn = () => backToTopBtn.classList.add("is-visible");
    const hideBtn = () => backToTopBtn.classList.remove("is-visible");

    if (heroEl && "IntersectionObserver" in window) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) hideBtn();
            else showBtn();
          });
        },
        { threshold: 0 }
      );
      heroObserver.observe(heroEl);
    } else {
      const toggleBtn = () => {
        if (window.scrollY > 300) showBtn();
        else hideBtn();
      };
      window.addEventListener("scroll", toggleBtn, { passive: true });
      toggleBtn();
    }

    backToTopBtn.addEventListener("click", () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReduced ? "auto" : "smooth"
      });
    });
  }

  /* =========================================================
     COLLAPSIBLE NAVBAR ON SCROLL
     ========================================================= */
  if (siteHeader) {
    let hoverTimer = null;

    const canCollapse = () =>
      window.matchMedia("(hover: hover)").matches && window.innerWidth >= 1024;

    function applyHeaderScrollState() {
      if (!canCollapse()) {
        siteHeader.classList.remove("is-scrolled", "is-collapsed", "is-expanded");
        clearTimeout(hoverTimer);
        return;
      }

      if (window.scrollY > 50) {
        siteHeader.classList.add("is-scrolled");
        if (!siteHeader.classList.contains("is-expanded")) {
          siteHeader.classList.add("is-collapsed");
        }
      } else {
        siteHeader.classList.remove("is-scrolled", "is-collapsed", "is-expanded");
        clearTimeout(hoverTimer);
      }
    }

    window.addEventListener("scroll", applyHeaderScrollState, { passive: true });
    window.addEventListener("resize", applyHeaderScrollState);
    applyHeaderScrollState();

    siteHeader.addEventListener("mouseenter", () => {
      if (!siteHeader.classList.contains("is-scrolled")) return;
      clearTimeout(hoverTimer);
      siteHeader.classList.remove("is-collapsed");
      siteHeader.classList.add("is-expanded");
    });

    siteHeader.addEventListener("mouseleave", () => {
      if (!siteHeader.classList.contains("is-scrolled")) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (!siteHeader.classList.contains("is-scrolled")) return;
        siteHeader.classList.remove("is-expanded");
        siteHeader.classList.add("is-collapsed");
      }, 900);
    });
  }

})();