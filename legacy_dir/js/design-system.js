/* ================================================================
   MAFIA ARCADE — DESIGN SYSTEM JS
   التأثيرات التفاعلية الموحدة لجميع الصفحات
   ================================================================ */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. PIXEL AUDIO ENGINE (Web Audio API — no files needed)
     ────────────────────────────────────────────────────────── */
  const Audio = (() => {
    let ctx = null;

    function getCtx() {
      if (ctx) return ctx;
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
      return ctx;
    }

    /* Generic tone: freq, wave type, duration(s), volume, decay */
    function tone(freq, type = 'square', dur = 0.08, vol = 0.12, decay = 0.06) {
      const c = getCtx(); if (!c) return;
      try {
        const osc  = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + dur);
        gain.gain.setValueAtTime(vol, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur + decay);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + dur + decay + 0.02);
      } catch (_) {}
    }

    function seq(notes, gap = 80) {
      notes.forEach(([f, t, d, v], i) => setTimeout(() => tone(f, t, d, v), i * gap));
    }

    return {
      hover:   () => tone(900,  'square',   0.03, 0.06),
      click:   () => { tone(660, 'square', 0.05, 0.14); tone(880, 'square', 0.03, 0.08); },
      success: () => seq([[523,'square',0.1,0.12],[659,'square',0.1,0.12],[784,'square',0.12,0.13]]),
      error:   () => seq([[320,'sawtooth',0.12,0.14],[220,'sawtooth',0.15,0.14]], 100),
      coin:    () => seq([[800,'sine',0.06,0.1],[1000,'sine',0.06,0.1],[1300,'sine',0.08,0.1]], 55),
      deal:    () => tone(440, 'triangle', 0.1, 0.1),
      ready:   () => seq([[440,'square',0.08,0.1],[550,'square',0.08,0.1],[660,'square',0.1,0.12]], 70),
      vote:    () => { tone(300,'sawtooth',0.08,0.12); setTimeout(() => tone(250,'sawtooth',0.1,0.1), 90); },
      night:   () => seq([[200,'sine',0.2,0.1],[180,'sine',0.2,0.08],[160,'sine',0.25,0.08]], 200),
      day:     () => seq([[440,'sine',0.1,0.1],[550,'sine',0.1,0.1],[660,'sine',0.12,0.12]], 90),
      unlock:  () => ctx && seq([[392,'square',0.1,0.1],[494,'square',0.1,0.1],[587,'square',0.1,0.1],[784,'square',0.15,0.13]], 80),
      gameover:(win) => win ? seq([[440,'square',0.15,0.15],[554,'square',0.15,0.15],[659,'square',0.15,0.15],[880,'square',0.4,0.2]], 150) : seq([[300,'sawtooth',0.2,0.2],[250,'sawtooth',0.2,0.2],[200,'sawtooth',0.2,0.2],[150,'sawtooth',0.6,0.25]], 250),
      heartbeat:()=> seq([[120,'sine',0.1,0.3],[120,'sine',0.15,0.2]], 200),
      jester:  () => seq([[600,'triangle',0.1,0.15],[400,'triangle',0.1,0.15],[800,'triangle',0.15,0.15]], 120),
    };
  })();

  /* ──────────────────────────────────────────────────────────
     2. TOAST NOTIFICATION SYSTEM
     ────────────────────────────────────────────────────────── */
  function getToastContainer() {
    let el = document.getElementById('ds-toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ds-toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(msg, type = 'info', duration = 3200) {
    const c = getToastContainer();
    const t = document.createElement('div');
    t.className = `ds-toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);

    if (type === 'success') Audio.success();
    else if (type === 'error') Audio.error();
    else if (type === 'warn') Audio.vote();

    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 380);
    }, duration);
    return t;
  }

  /* ──────────────────────────────────────────────────────────
     3. CURSOR GLOW (desktop)
     ────────────────────────────────────────────────────────── */
  function initCursorGlow() {
    if (window.matchMedia('(hover: none)').matches) return;
    const g = document.createElement('div');
    g.id = 'ds-cursor-glow';
    document.body.appendChild(g);
    let raf, cx = -1000, cy = -1000;
    document.addEventListener('mousemove', e => {
      cx = e.clientX; cy = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        g.style.left = cx + 'px';
        g.style.top  = cy + 'px';
        raf = null;
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => { g.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { g.style.opacity = '1'; });
  }

  /* ──────────────────────────────────────────────────────────
     4. PARTICLE BURST on click
     ────────────────────────────────────────────────────────── */
  const BTN_COLORS = {
    'px-btn-red':    '#ff0055',
    'px-btn-blue':   '#00e5ff',
    'px-btn-gold':   '#ffc400',
    'px-btn-green':  '#00ff88',
    'px-btn-purple': '#bb55ff',
    'px-btn-cyan':   '#00f3ff',
    'px-btn-orange': '#ff6b00',
    'px-btn-gray':   '#7799bb',
  };

  function getBtnColor(el) {
    for (const [cls, color] of Object.entries(BTN_COLORS)) {
      if (el.classList.contains(cls)) return color;
    }
    return '#00e5ff';
  }

  function spawnParticles(x, y, color = '#00e5ff', count = 10) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      const size = 3 + Math.random() * 5;
      p.style.cssText = [
        'position:fixed', 'pointer-events:none', 'z-index:999999',
        `left:${x}px`, `top:${y}px`,
        `width:${size}px`, `height:${size}px`,
        'border-radius:50%',
        `background:${color}`,
        `box-shadow:0 0 ${size * 2}px ${color}`,
      ].join(';');
      document.body.appendChild(p);
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const dist  = 28 + Math.random() * 65;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 10;
      p.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 480 + Math.random() * 280, easing: 'cubic-bezier(0,0,0.2,1)', fill: 'forwards' }
      ).onfinish = () => p.remove();
    }
  }

  /* ──────────────────────────────────────────────────────────
     5. RIPPLE EFFECT
     ────────────────────────────────────────────────────────── */
  function addRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const r = document.createElement('span');
    const maxDim = Math.max(el.offsetWidth, el.offsetHeight);
    r.style.cssText = [
      'position:absolute', 'border-radius:50%',
      'background:rgba(255,255,255,0.3)', 'pointer-events:none', 'z-index:10',
      `left:${e.clientX - rect.left}px`, `top:${e.clientY - rect.top}px`,
      'width:8px', 'height:8px',
      'transform:translate(-50%,-50%) scale(0)',
    ].join(';');
    el.appendChild(r);
    r.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0)', opacity: 0.7 },
        { transform: `translate(-50%,-50%) scale(${maxDim / 3})`, opacity: 0 },
      ],
      { duration: 520, fill: 'forwards' }
    ).onfinish = () => r.remove();
  }

  /* ──────────────────────────────────────────────────────────
     6. BUTTON INTERACTIONS
     ────────────────────────────────────────────────────────── */
  function initButtons() {
    /* Hover sound — throttled */
    let lastHover = 0;
    document.addEventListener('mouseover', e => {
      if (!e.target.closest('.px-btn')) return;
      const now = Date.now();
      if (now - lastHover < 120) return;
      lastHover = now;
      Audio.hover();
    }, { passive: true });

    /* Click: sound + ripple + particles */
    document.addEventListener('click', e => {
      const btn = e.target.closest('.px-btn');
      if (!btn || btn.disabled || btn.hasAttribute('disabled')) return;
      Audio.click();
      addRipple(btn, e);
      spawnParticles(e.clientX, e.clientY, getBtnColor(btn), 10);
    }, { passive: true });

    /* Touch feedback (mobile) */
    document.addEventListener('touchstart', e => {
      const btn = e.target.closest('.px-btn');
      if (btn && !btn.disabled) Audio.click();
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────────────────
     7. CRT RANDOM FLICKER
     ────────────────────────────────────────────────────────── */
  function initFlicker() {
    const overlay = document.querySelector('#crt-overlay, .crt-overlay');
    if (!overlay) return;
    setInterval(() => {
      if (Math.random() > 0.96) {
        const dur = 50 + Math.random() * 100;
        overlay.style.opacity = String(0.6 + Math.random() * 0.25);
        setTimeout(() => { overlay.style.opacity = '1'; }, dur);
      }
    }, 1800);
  }

  /* ──────────────────────────────────────────────────────────
     8. FLOATING PARTICLE BACKGROUND
     ────────────────────────────────────────────────────────── */
  function initParticlesBg() {
    /* Skip if there's already a canvas or if the page opts out */
    if (document.getElementById('ds-particles-bg')) return;
    if (document.body.dataset.noParticles) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'ds-particles-bg';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx    = canvas.getContext('2d');
    const COUNT  = window.innerWidth < 768 ? 22 : 45;
    const COLORS = ['#00e5ff','#ff0055','#ffc400','#00ff88','#b000ff'];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.6 + Math.random() * 1.6,
      dx: (Math.random() - 0.5) * 0.28,
      dy: -0.08 - Math.random() * 0.28,
      a: 0.08 + Math.random() * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.globalAlpha = p.a;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.y < -5)  { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (Math.abs(p.x) > canvas.width + 5) p.dx *= -1;
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })();
  }

  /* ──────────────────────────────────────────────────────────
     9. ENTRANCE ANIMATIONS (data-ds-enter attribute)
     Usage: <div data-ds-enter data-ds-delay="100"> animates on scroll
     ────────────────────────────────────────────────────────── */
  function initEnterAnimations() {
    const els = document.querySelectorAll('[data-ds-enter]');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = +(entry.target.dataset.dsDelay || 0);
        setTimeout(() => {
          entry.target.style.opacity = '';
          entry.target.classList.add('ds-rise');
        }, delay);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    els.forEach(el => { el.style.opacity = '0'; obs.observe(el); });
  }

  /* ──────────────────────────────────────────────────────────
     10. HOVER 3D TILT on panels (subtle)
     ────────────────────────────────────────────────────────── */
  function initTilt() {
    if (window.matchMedia('(hover: none)').matches) return;
    document.querySelectorAll('[data-ds-tilt]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 10;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * -10;
        el.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) translateZ(8px)`;
      }, { passive: true });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      }, { passive: true });
    });
  }

  /* ──────────────────────────────────────────────────────────
     11. SCANLINE GLITCH (random brief distortion)
     ────────────────────────────────────────────────────────── */
  function initGlitch() {
    const overlay = document.querySelector('#crt-overlay, .crt-overlay');
    if (!overlay) return;
    setInterval(() => {
      if (Math.random() > 0.985) {
        overlay.style.backgroundPosition = `0 ${Math.random() * 100}%`;
        setTimeout(() => { overlay.style.backgroundPosition = ''; }, 80);
      }
    }, 3000);
  }

  /* ──────────────────────────────────────────────────────────
     12. PUBLIC API
     ────────────────────────────────────────────────────────── */
  window.DS = {
    toast:     showToast,
    audio:     Audio,
    particles: spawnParticles,
    ripple:    addRipple,
  };

  /* ──────────────────────────────────────────────────────────
     13. AUTO INIT
     ────────────────────────────────────────────────────────── */
  function init() {
    initCursorGlow();
    initButtons();
    initFlicker();
    initGlitch();
    initParticlesBg();
    initEnterAnimations();
    initTilt();
    /* Resume AudioContext on first interaction (browser policy) */
    document.addEventListener('pointerdown', () => {
      const a = window.AudioContext || window.webkitAudioContext;
      if (a) {
        const tmp = new a();
        if (tmp.state === 'suspended') tmp.resume();
        tmp.close();
      }
    }, { once: true, passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
