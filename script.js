const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function currentTheme() {
  return document.documentElement.dataset.theme === 'future' ? 'future' : 'cli';
}

function savedTheme() {
  try { return localStorage.getItem('theme'); } catch (e) { return null; }
}

/* ---------------- boot gate ---------------- */

const BOOT_LINES = [
  'PORTFOLIO OS v2.0',
  'booting...',
  '',
  '[ok] kernel modules loaded',
  '[ok] mounted /home/kane',
  '[ok] network link established',
  '[ok] profile: Kane Matthews — Software Developer & Data Engineer',
  '',
  'select an interface to continue:',
  '  cli      classic terminal portfolio',
  '  future   futuristic interactive build',
  ''
];

function typeBootLog(el, lines, onDone) {
  if (reduceMotion) {
    el.textContent = lines.join('\n');
    onDone();
    return;
  }
  let i = 0;
  const tick = () => {
    el.textContent = lines.slice(0, i).join('\n');
    i++;
    if (i <= lines.length) {
      setTimeout(tick, lines[i - 1] === '' ? 160 : 90);
    } else {
      onDone();
    }
  };
  tick();
}

function appendBootLine(el, text) {
  el.textContent += '\n' + text;
}

function initBootGate() {
  const gate = document.getElementById('bootGate');
  const log = document.getElementById('bootLog');
  const input = document.getElementById('bootInput');
  const hint = document.getElementById('bootHint');
  if (!gate || !log || !input) return;

  typeBootLog(log, BOOT_LINES, () => {
    input.disabled = false;
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const raw = input.value.trim().toLowerCase();
    let theme = null;

    if (['cli', 'terminal', 'term'].includes(raw)) {
      theme = 'cli';
    } else if (['future', 'futuristic', 'fx'].includes(raw)) {
      theme = 'future';
    } else if (raw === '') {
      theme = savedTheme() === 'future' ? 'future' : 'cli';
    }

    if (theme) {
      appendBootLine(log, `kane@portfolio ~ % ${raw}`);
      appendBootLine(log, `> launching ${theme} mode...`);
      input.disabled = true;
      if (hint) hint.style.visibility = 'hidden';
      setTimeout(() => enterSite(theme), 550);
    } else {
      appendBootLine(log, `kane@portfolio ~ % ${raw}`);
      appendBootLine(log, `bash: ${raw || ''}: command not found — try "cli" or "future"`);
      input.value = '';
    }
  });
}

function enterSite(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }

  const gate = document.getElementById('bootGate');
  document.body.classList.remove('gate-active');
  if (gate) gate.classList.add('is-leaving');

  setTimeout(() => {
    if (gate) gate.style.display = 'none';
    initMainSite();
  }, reduceMotion ? 0 : 550);
}

/* ---------------- hero typing / reveal ---------------- */

function typeCommand(el, onDone) {
  const text = el.dataset.type || '';
  if (reduceMotion) {
    el.textContent = text;
    onDone();
    return;
  }
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, i);
    i++;
    if (i <= text.length) {
      setTimeout(tick, 80 + Math.random() * 60);
    } else {
      onDone();
    }
  };
  tick();
}

function revealHero() {
  const output = document.querySelector('.hero__output');
  const figure = document.querySelector('.hero__figure-wrap');
  if (output) output.classList.add('is-visible');
  if (figure) requestAnimationFrame(() => figure.classList.add('is-drawn'));
}

/* ---------------- canvases ---------------- */

function initRain(canvas) {
  const ctx = canvas.getContext('2d');
  const chars = '01{}[]()<>;:=+-*/!&|^~$#01010101ABCDEF0x';
  const step = 22;
  let columns, drops, width, height;

  function size() {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
    columns = Math.floor(width / step);
    drops = new Array(columns).fill(0).map(() => Math.random() * -height / step);
  }
  size();
  window.addEventListener('resize', size);

  function draw() {
    if (currentTheme() !== 'cli') return;
    ctx.fillStyle = 'rgba(10,15,12,0.15)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#39FF6A';
    ctx.font = '14px monospace';
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * step, y * step);
      drops[i] = y * step > height ? 0 : y + 1;
    });
  }
  setInterval(draw, 130);
}

function initStars(canvas) {
  const ctx = canvas.getContext('2d');
  let width, height, stars, comet;

  function size() {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
    const count = Math.min(140, Math.floor((width * height) / 9000));
    stars = new Array(count).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02
    }));
    comet = null;
  }
  size();
  window.addEventListener('resize', size);

  function maybeSpawnComet() {
    if (!comet && Math.random() < 0.004) {
      const fromLeft = Math.random() < 0.5;
      comet = {
        x: fromLeft ? -20 : width + 20,
        y: Math.random() * height * 0.6,
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 4),
        vy: 2 + Math.random() * 2,
        life: 0
      };
    }
  }

  function draw() {
    if (currentTheme() !== 'future') return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F2F0FF';
    stars.forEach(s => {
      s.phase += s.speed;
      const tw = 0.4 + Math.abs(Math.sin(s.phase)) * 0.6;
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    maybeSpawnComet();
    if (comet) {
      comet.x += comet.vx;
      comet.y += comet.vy;
      comet.life++;
      const grad = ctx.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * 6, comet.y - comet.vy * 6);
      grad.addColorStop(0, 'rgba(94,234,255,0.9)');
      grad.addColorStop(1, 'rgba(94,234,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(comet.x - comet.vx * 6, comet.y - comet.vy * 6);
      ctx.stroke();
      if (comet.life > 140 || comet.x < -40 || comet.x > width + 40 || comet.y > height + 40) comet = null;
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function initParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let width, height, points;

  function size() {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
    const count = Math.min(70, Math.floor((width * height) / 14000));
    points = new Array(count).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3
    }));
  }
  size();
  window.addEventListener('resize', size);

  function draw() {
    if (currentTheme() === 'future') {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(94,234,255,0.85)';
      points.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(94,234,255,0.12)';
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

/* ---------------- scroll reveals + skill bars ---------------- */

function initReveals() {
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-in'));
  } else {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealEls.forEach(el => obs.observe(el));
  }

  const skillGroups = document.querySelectorAll('.fx-skills');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    skillGroups.forEach(fillSkills);
  } else {
    const skillObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          fillSkills(entry.target);
          skillObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    skillGroups.forEach(el => skillObs.observe(el));
  }
}

function fillSkills(group) {
  group.querySelectorAll('.fx-skill').forEach(skill => {
    skill.style.setProperty('--fill', (skill.dataset.level || 0) + '%');
    skill.classList.add('is-filled');
  });
}

/* ---------------- card tilt + cursor glow ---------------- */

function initTilt() {
  document.querySelectorAll('.fx-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

function initCursorGlow() {
  const glow = document.querySelector('.fx-cursor-glow');
  if (!glow) return;
  window.addEventListener('mousemove', (e) => {
    if (currentTheme() !== 'future') return;
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
  });
}

/* ---------------- cli flourishes: code tape, scramble, glitch ---------------- */

function initCodetape() {
  const track = document.getElementById('codetapeTrack');
  if (!track) return;
  const ops = ['MOV', 'CALL', 'JMP', 'XOR', 'PUSH', 'POP', 'CMP', 'TEST', 'RET', 'ADD', 'SUB', 'LEA'];
  const parts = [];
  for (let i = 0; i < 50; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const hex = '0x' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    parts.push(`${op} ${hex}`);
  }
  const content = parts.join('   ·   ');
  track.textContent = content + '   ·   ' + content;
}

function initScramble() {
  const els = document.querySelectorAll('.scramble');
  els.forEach(el => { if (!el.dataset.text) el.dataset.text = el.textContent; });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach(el => { el.textContent = el.dataset.text; });
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        scrambleReveal(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  els.forEach(el => obs.observe(el));
}

function scrambleReveal(el) {
  const final = el.dataset.text;
  const chars = '!<>-_/[]{}=+*^?#0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const totalFrames = 16;
  let frame = 0;
  const interval = setInterval(() => {
    let out = '';
    for (let i = 0; i < final.length; i++) {
      if (final[i] === ' ') {
        out += ' ';
      } else if (i < (frame / totalFrames) * final.length) {
        out += final[i];
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = out;
    frame++;
    if (frame > totalFrames) {
      clearInterval(interval);
      el.textContent = final;
    }
  }, 35);
}

function initGlitch() {
  const el = document.querySelector('.hero__name.glitch');
  if (!el || reduceMotion) return;
  setInterval(() => {
    if (currentTheme() !== 'cli') return;
    el.classList.add('is-glitching');
    setTimeout(() => el.classList.remove('is-glitching'), 260);
  }, 6000 + Math.random() * 3000);
}

/* ---------------- future flourishes: stat counters ---------------- */

function initStats() {
  const stats = document.querySelectorAll('.fx-stat__num');
  if (!stats.length) return;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    stats.forEach(el => { el.textContent = (el.dataset.target || '0') + (el.dataset.suffix || ''); });
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countUp(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  stats.forEach(el => obs.observe(el));
}

function countUp(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const suffix = el.dataset.suffix || '';
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = Math.floor(p * target) + suffix;
    if (p < 1) requestAnimationFrame(tick); else el.textContent = target + suffix;
  }
  requestAnimationFrame(tick);
}

/* ---------------- theme toggle ---------------- */

function syncToggleLabels(theme) {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-pressed', theme === 'future' ? 'true' : 'false');
    const label = btn.querySelector('.theme-toggle__label');
    if (label) label.textContent = theme === 'cli' ? 'FUTURE MODE' : 'CLI MODE';
  });
}

function initThemeToggle() {
  const buttons = document.querySelectorAll('.theme-toggle');
  if (!buttons.length) return;
  syncToggleLabels(currentTheme());
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'future' ? 'cli' : 'future';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
      syncToggleLabels(next);
    });
  });
}

/* ---------------- main site init (runs once the gate is passed) ---------------- */

function initMainSite() {
  const cmd = document.querySelector('.prompt__cmd');
  if (cmd) {
    typeCommand(cmd, revealHero);
  } else {
    revealHero();
  }

  document.querySelectorAll('canvas.rain').forEach(initRain);
  document.querySelectorAll('canvas.fx-particles').forEach(initParticles);
  document.querySelectorAll('canvas.fx-stars').forEach(initStars);

  initThemeToggle();
  initReveals();
  initCursorGlow();
  initCodetape();
  initScramble();
  initGlitch();
  initStats();
  if (!reduceMotion) initTilt();
}

document.addEventListener('DOMContentLoaded', initBootGate);
