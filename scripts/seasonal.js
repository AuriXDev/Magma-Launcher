/* Сезонные эффекты: canvas поверх окна (pointer-events: none), события по дате.
   ui.js вызывает MglSeasonal.apply({ enabled, override, date, density }) из applyUiPrefs(). */
(function () {
  'use strict';

  // Порядок = приоритет: первое подходящее по дате событие побеждает (зима - самая общая, в конце).
  const EVENTS = [
    { id: 'valentine', name: 'День святого Валентина', from: '02-10', to: '02-15', desc: 'Падающие сердечки' },
    { id: 'newyear', name: 'Новый год', from: '12-20', to: '01-10', desc: 'Снег и гирлянда сверху окна' },
    { id: 'march8', name: '8 Марта', from: '03-06', to: '03-09', desc: 'Лепестки цветов' },
    { id: 'cosmos', name: 'День космонавтики', from: '04-11', to: '04-13', desc: 'Мерцающие звёзды и метеоры' },
    { id: 'april1', name: '1 апреля', from: '04-01', to: '04-01', desc: 'Розыгрыш: крипер и убегающая кнопка «Играть»' },
    { id: 'birthday', name: 'День рождения лаунчера', from: '04-28', to: '04-30', desc: 'Конфетти и поздравление' },
    { id: 'halloween', name: 'Хэллоуин', from: '10-25', to: '11-01', desc: 'Осенние листья и летучие мыши' },
    { id: 'winter', name: 'Зима', from: '12-01', to: '02-29', desc: 'Падающий снег' }
  ];

  const mmdd = (d) => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function inRange(md, from, to) {
    return from <= to ? (md >= from && md <= to) : (md >= from || md <= to);
  }
  function detect(date) {
    const md = mmdd(date || new Date());
    return EVENTS.find(e => inRange(md, e.from, e.to)) || null;
  }
  function parseDate(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const isLight = () => document.documentElement.dataset.theme === 'light';

  /* ---------- виды частиц ---------- */

  const snow = {
    perArea: 9000, max: 220,
    spawn(p, w, h, initial) {
      p.r = rnd(0.8, 3.2);
      p.x = rnd(0, w); p.y = initial ? rnd(-h, h) : rnd(-40, -5);
      p.vy = 14 + p.r * 14; p.sway = rnd(8, 26); p.ph = rnd(0, 6.28); p.fr = rnd(0.4, 1.2);
      p.a = rnd(0.35, 0.9);
    },
    update(p, dt, t) { p.y += p.vy * dt; p.dx = Math.sin(t * p.fr + p.ph) * p.sway; },
    draw(ctx, p) {
      ctx.globalAlpha = p.a;
      ctx.fillStyle = isLight() ? '#9fb3c8' : '#ffffff';
      ctx.beginPath(); ctx.arc(p.x + p.dx, p.y, p.r, 0, 6.283); ctx.fill();
    }
  };

  function heartPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s * 1.05, s, -s * 0.35, 0, s * 0.35);
    ctx.closePath();
  }
  const hearts = {
    perArea: 22000, max: 70,
    spawn(p, w, h, initial) {
      p.s = rnd(5, 13);
      p.x = rnd(0, w); p.y = initial ? rnd(-h, h) : rnd(-40, -10);
      p.vy = rnd(22, 48); p.sway = rnd(10, 30); p.ph = rnd(0, 6.28); p.fr = rnd(0.5, 1.3);
      p.rot = rnd(-0.4, 0.4); p.vr = rnd(-0.6, 0.6);
      p.c = pick(['#ff4d7d', '#ff7aa2', '#e8335f', '#ffb3c8', '#ff2e63']); p.a = rnd(0.55, 0.95);
    },
    update(p, dt, t) { p.y += p.vy * dt; p.rot += p.vr * dt; p.dx = Math.sin(t * p.fr + p.ph) * p.sway; },
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x + p.dx, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c; heartPath(ctx, p.s); ctx.fill();
      ctx.restore();
    }
  };

  const petals = {
    perArea: 16000, max: 110,
    spawn(p, w, h, initial) {
      p.s = rnd(4, 9);
      p.x = rnd(-50, w); p.y = initial ? rnd(-h, h) : rnd(-40, -10);
      p.vy = rnd(25, 50); p.vx = rnd(8, 28); p.ph = rnd(0, 6.28); p.fr = rnd(1.5, 3.5);
      p.rot = rnd(0, 6.28); p.vr = rnd(-1.5, 1.5);
      p.c = pick(['#ffc2d6', '#ff9ec0', '#ffe3ec', '#f7a8c4', '#fff0f5']); p.a = rnd(0.6, 0.95);
    },
    update(p, dt, t) { p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vr * dt; p.flip = Math.cos(t * p.fr + p.ph); },
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.max(0.15, Math.abs(p.flip)), 1);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.ellipse(0, 0, p.s * 0.6, p.s, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };

  const leaves = {
    perArea: 18000, max: 90,
    spawn(p, w, h, initial) {
      p.s = rnd(5, 10);
      p.x = rnd(-50, w); p.y = initial ? rnd(-h, h) : rnd(-40, -10);
      p.vy = rnd(28, 55); p.vx = rnd(-10, 25); p.ph = rnd(0, 6.28); p.fr = rnd(1, 2.5);
      p.rot = rnd(0, 6.28); p.vr = rnd(-2, 2);
      p.c = pick(['#e8692a', '#d9481c', '#f2a03d', '#b5531c', '#c9302c', '#e7b33a']); p.a = rnd(0.65, 0.95);
    },
    update(p, dt, t) {
      p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * p.fr + p.ph) * 30) * dt; p.rot += p.vr * dt;
      p.flip = Math.cos(t * p.fr * 0.8 + p.ph);
    },
    draw(ctx, p) {
      const s = p.s;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.max(0.2, Math.abs(p.flip)), 1);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s);
      ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,30,10,.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.3); ctx.stroke();
      ctx.restore();
    }
  };

  // Конфетти: прямоугольники, кувыркаются (сжатие по Y)
  const confetti = {
    perArea: 11000, max: 150,
    spawn(p, w, h, initial) {
      p.x = rnd(0, w); p.y = initial ? rnd(-h, h) : rnd(-40, -10);
      p.ph = rnd(0, 6.28); p.fr = rnd(0.6, 1.4);
      p.w = rnd(4, 9); p.h = rnd(2, 4); p.vy = rnd(40, 75); p.sway = rnd(10, 30);
      p.rot = rnd(0, 6.28); p.vr = rnd(-5, 5);
      p.c = pick(['#5fbf3a', '#f2c94c', '#56ccf2', '#eb5757', '#bb6bd9', '#ff9f43', '#ffffff']);
      p.a = rnd(0.75, 1);
    },
    update(p, dt, t) {
      p.y += p.vy * dt; p.dx = Math.sin(t * p.fr + p.ph) * p.sway;
      p.rot += p.vr * dt; p.flip = Math.cos(t * 4 + p.ph);
    },
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x + p.dx, p.y); ctx.globalAlpha = p.a;
      ctx.rotate(p.rot); ctx.scale(1, Math.abs(p.flip));
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  };

  /* ---------- 1 апреля: розыгрыш вместо частиц ---------- */

  // Крипер подкрадывается снизу, шипит, «взрывается» (вспышка + тряска), потом «С 1 апреля!».
  // Кнопка «Играть» трижды уворачивается от курсора, потом сдаётся.
  const CREEPER = ['........', '........', '.XX..XX.', '.XX..XX.', '...XX...', '..XXXX..', '..XXXX..', '..X..X..'];
  let audio = null;
  function noise(dur, { gain = 0.2, freq = 3000, q = 0.8, attack = 0.05, type = 'bandpass' } = {}) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const ac = audio, len = Math.round(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain(), now = ac.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain, now + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
    } catch (e) {}
  }
  function creeperFace() {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const x = c.getContext('2d'), greens = ['#4fb83c', '#5cc845', '#3fa02f', '#6fd257', '#48ad36'];
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
      x.fillStyle = CREEPER[r][k] === 'X' ? (r >= 4 && r <= 6 && k >= 3 && k <= 4 ? '#0a0f0a' : '#141c12') : pick(greens);
      x.fillRect(k, r, 1, 1);
    }
    return c;
  }
  function creeperScare(done) {
    const el = document.createElement('div');
    el.className = 'apr-creeper';
    el.appendChild(creeperFace());
    el.style.left = Math.round(rnd(0.55, 0.8) * window.innerWidth) + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('peek'));
    setTimeout(() => { el.classList.add('primed'); noise(1.6, { gain: 0.25, freq: 5200, q: 0.6, attack: 1.2 }); }, 900);
    setTimeout(() => {
      noise(1.3, { gain: 0.9, freq: 160, q: 0.3, attack: 0.01, type: 'lowpass' });
      const r = el.getBoundingClientRect();
      el.remove();
      const flash = document.createElement('div'); flash.className = 'apr-flash';
      document.body.appendChild(flash);
      document.body.classList.add('apr-shake');
      setTimeout(() => { document.body.classList.remove('apr-shake'); flash.remove(); }, 900);
      blastText(r.left + r.width / 2, Math.min(r.top + r.height / 2, window.innerHeight - 10), () => {
        const UI = window.MGL_UI;
        if (UI && UI.notify) UI.notify({ kind: 'april', title: 'С 1 апреля!', text: '' });
        else if (UI && UI.toast) UI.toast('С 1 апреля!');
        if (done) done();
      });
    }, 2700);
  }

  // Взрыв текста: видимые текстовые элементы подменяются клонами в fixed-слое (чтобы не резались overflow
  // и работали inline-элементы), клоны разлетаются от (ex, ey), падают с отскоком, затем гаснут,
  // а оригиналы проявляются на своих местах.
  function textLeaves() {
    const vw = window.innerWidth, vh = window.innerHeight, out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const seen = new Set();
    for (let n = walker.nextNode(); n && out.length < 260; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (el.children.length || el.closest('script,style,noscript,textarea,select,option,#splash,.apr-creeper,.apr-debris,.apr-flash')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      if (r.width * r.height > vw * vh * 0.15) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      out.push({ el, r, cs });
    }
    return out;
  }
  function blastText(ex, ey, done) {
    const items = textLeaves();
    if (!items.length) { done(); return; }
    const layer = document.createElement('div'); layer.className = 'apr-debris';
    const vw = window.innerWidth, vh = window.innerHeight;
    const bits = items.map(({ el, r, cs }) => {
      const c = document.createElement('div');
      c.textContent = el.textContent;
      Object.assign(c.style, {
        left: r.left + 'px', top: r.top + 'px', width: Math.ceil(r.width + 1) + 'px', height: Math.ceil(r.height) + 'px',
        font: cs.font, color: cs.color, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
        textAlign: cs.textAlign, lineHeight: cs.lineHeight, textShadow: cs.textShadow,
        whiteSpace: r.height < parseFloat(cs.fontSize) * 2 ? 'nowrap' : 'normal'
      });
      // градиентный/прозрачный текст - берём цвет акцента, иначе клон невидим
      if (cs.webkitTextFillColor && /rgba\(.*,\s*0\)|transparent/.test(cs.webkitTextFillColor)) c.style.color = 'var(--accent)';
      layer.appendChild(c);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = cx - ex, dy = cy - ey;
      const dist = Math.hypot(dx, dy) || 1;
      dx /= dist; dy /= dist;
      const power = 1700 * Math.exp(-dist / 520) + rnd(120, 320);
      el.dataset.aprVis = el.style.visibility;
      el.style.visibility = 'hidden';
      return {
        el, c, w: r.width, h: r.height, x0: r.left, y0: r.top, x: 0, y: 0,
        vx: dx * power + rnd(-80, 80), vy: dy * power - rnd(150, 450),
        a: 0, va: rnd(-1, 1) * (240 + power * 0.25), rest: false
      };
    });
    document.body.appendChild(layer);

    const G = 1600, FLY_MS = 3800;
    let prev = performance.now(), start = prev, id = 0;
    const step = (now) => {
      const dt = Math.min(0.033, (now - prev) / 1000); prev = now;
      for (const b of bits) {
        if (b.rest) continue;
        b.vy += G * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
        const floor = vh - b.h - b.y0, left = -b.x0, right = vw - b.w - b.x0;
        if (b.y > floor) {
          b.y = floor; b.vy *= -0.32; b.vx *= 0.72; b.va *= 0.6;
          if (Math.abs(b.vy) < 40) { b.vy = 0; b.va *= 0.5; }
          if (Math.abs(b.vy) < 1 && Math.abs(b.vx) < 8) b.rest = true;
        }
        if (b.x < left) { b.x = left; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > right) { b.x = right; b.vx = -Math.abs(b.vx) * 0.5; }
        b.c.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) rotate(${b.a.toFixed(1)}deg)`;
      }
      if (now - start < FLY_MS) { id = requestAnimationFrame(step); return; }
      restore();
    };
    const restore = () => {
      cancelAnimationFrame(id);
      layer.classList.add('fade');
      setTimeout(() => {
        for (const b of bits) {
          b.el.style.visibility = b.el.dataset.aprVis || '';
          delete b.el.dataset.aprVis;
          try { b.el.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 700, easing: 'ease-out' }); } catch (e) {}
        }
        layer.remove();
        done();
      }, 450);
    };
    id = requestAnimationFrame(step);
  }
  const DODGE_SEL = '#launch-btn, .hero-play';
  let dodgesLeft = 0;
  function onDodge(e) {
    const btn = e.target.closest && e.target.closest(DODGE_SEL);
    if (!btn || dodgesLeft <= 0 || (e.relatedTarget && btn.contains(e.relatedTarget))) return;
    dodgesLeft--;
    if (dodgesLeft === 0) {
      btn.style.transform = '';
      btn.title = 'Ладно, ладно… жми';
      setTimeout(() => { btn.title = ''; }, 4000);
      return;
    }
    const dx = (Math.random() < 0.5 ? -1 : 1) * rnd(70, 140), dy = (Math.random() < 0.5 ? -1 : 1) * rnd(20, 50);
    btn.style.transition = 'transform .18s ease-out';
    btn.style.transform = `translate(${dx}px, ${dy}px) rotate(${rnd(-8, 8)}deg)`;
  }
  const aprilFools = {
    timer: 0, ran: false,
    arm(forced) {
      dodgesLeft = 4;   // 3 увёртки + сдаётся на 4-й
      document.addEventListener('mouseover', onDodge, true);
      clearTimeout(this.timer);
      if (forced) this.ran = false;
      if (!this.ran) this.timer = setTimeout(() => { this.ran = true; creeperScare(); }, forced ? 800 : rnd(20000, 60000));
    },
    disarm() {
      clearTimeout(this.timer);
      document.removeEventListener('mouseover', onDodge, true);
      document.querySelectorAll(DODGE_SEL).forEach(b => { b.style.transform = ''; });
    }
  };

  /* ---------- оверлеи (не частицы) ---------- */

  // Гирлянда: провод провисает между крючками, лампочки мерцают
  const garland = {
    draw(ctx, w, h, t) {
      const step = 150, sag = 16, top = 2;
      ctx.save();
      ctx.lineWidth = 1.5; ctx.strokeStyle = isLight() ? 'rgba(40,60,40,.55)' : 'rgba(20,30,20,.85)';
      ctx.beginPath();
      for (let x = 0; x < w + step; x += step) {
        if (x === 0) ctx.moveTo(0, top);
        ctx.quadraticCurveTo(x + step / 2, top + sag * 2, x + step, top);
      }
      ctx.stroke();
      const colors = ['#ff3b3b', '#ffd23b', '#3bff6e', '#3bb5ff', '#ff5ce1'];
      let i = 0;
      for (let x = 0; x < w + step; x += step) {
        for (let j = 1; j < 6; j++) {
          const u = j / 6;
          const bx = x + step * u;
          const by = top + 2 * u * (1 - u) * sag * 2;   // точка на квадратичной кривой
          const c = colors[i % colors.length];
          const on = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7));
          ctx.globalAlpha = on;
          ctx.shadowColor = c; ctx.shadowBlur = 10 * on;
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.ellipse(bx, by + 5, 2.6, 4, 0, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          ctx.fillStyle = '#2b2b2b'; ctx.fillRect(bx - 1.5, by - 0.5, 3, 2.5);
          i++;
        }
      }
      ctx.restore();
    }
  };

  // Звёзды (фиксированные) + редкие метеоры
  const sky = {
    init(st, w, h, density) {
      const n = Math.min(160, Math.round(w * h / 9000 * density));
      st.stars = Array.from({ length: n }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.5, 1.6), ph: rnd(0, 6.28), fr: rnd(0.8, 2.5) }));
      st.meteors = []; st.nextMeteor = rnd(1, 3);
    },
    draw(ctx, w, h, t, dt, st) {
      const light = isLight();
      ctx.save();
      for (const s of st.stars) {
        ctx.globalAlpha = 0.15 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.fr + s.ph));
        ctx.fillStyle = light ? '#6b7a99' : '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      st.nextMeteor -= dt;
      if (st.nextMeteor <= 0) {
        st.nextMeteor = rnd(2.5, 6);
        st.meteors.push({ x: rnd(w * 0.2, w * 1.1), y: rnd(-20, h * 0.35), v: rnd(500, 800), life: 0, max: rnd(0.7, 1.2) });
      }
      st.meteors = st.meteors.filter(m => (m.life += dt) < m.max);
      for (const m of st.meteors) {
        const k = m.life * m.v, x = m.x - k * 0.85, y = m.y + k * 0.5;
        const tail = 110, fade = 1 - m.life / m.max;
        const g = ctx.createLinearGradient(x, y, x + tail * 0.85, y - tail * 0.5);
        g.addColorStop(0, light ? 'rgba(80,100,150,' + fade + ')' : 'rgba(255,255,255,' + fade + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tail * 0.85, y - tail * 0.5); ctx.stroke();
      }
      ctx.restore();
    }
  };

  // Летучие мыши пролетают поперёк окна
  const bats = {
    init(st) { st.bats = []; st.nextBat = rnd(1, 3); },
    draw(ctx, w, h, t, dt, st) {
      st.nextBat -= dt;
      if (st.nextBat <= 0) {
        st.nextBat = rnd(3, 7);
        const ltr = Math.random() < 0.5;
        st.bats.push({ x: ltr ? -30 : w + 30, y: rnd(h * 0.08, h * 0.6), vx: (ltr ? 1 : -1) * rnd(110, 190),
          s: rnd(7, 13), ph: rnd(0, 6.28), amp: rnd(15, 40) });
      }
      st.bats = st.bats.filter(b => b.x > -60 && b.x < w + 60);
      ctx.save();
      for (const b of st.bats) {
        b.x += b.vx * dt;
        const y = b.y + Math.sin(t * 2 + b.ph) * b.amp, s = b.s;
        const flap = Math.sin(t * 16 + b.ph);
        ctx.save(); ctx.translate(b.x, y); if (b.vx < 0) ctx.scale(-1, 1);
        ctx.fillStyle = isLight() ? '#2a1a33' : '#140c1c';
        ctx.strokeStyle = 'rgba(255,140,40,.65)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-s * 0.6, -s * flap, -s * 1.6, -s * 0.6 * flap);
        ctx.quadraticCurveTo(-s * 1.1, s * 0.2, -s * 0.9, s * 0.35);
        ctx.quadraticCurveTo(-s * 0.4, s * 0.15, 0, s * 0.4);
        ctx.quadraticCurveTo(s * 0.4, s * 0.15, s * 0.9, s * 0.35);
        ctx.quadraticCurveTo(s * 1.1, s * 0.2, s * 1.6, -s * 0.6 * flap);
        ctx.quadraticCurveTo(s * 0.6, -s * flap, 0, 0);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  };

  // Поздравление в день рождения лаунчера (появился в 2025): по центру, раз в год (в дебаге - всегда)
  const BORN = 2025;
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? one : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many);
  }
  function birthdayGreet(forced, date) {
    const year = date.getFullYear(), key = 'mgl.bdayGreeted.' + year;
    try { if (!forced && localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) {}
    document.querySelectorAll('.season-greet').forEach(e => e.remove());
    const age = Math.max(1, year - BORN);
    const el = document.createElement('div');
    el.className = 'season-greet';
    el.innerHTML = `<div class="sg-card" role="dialog">
        <div class="sg-age"><b>${age}</b><span>${plural(age, 'год', 'года', 'лет')}</span></div>
        <div class="sg-title">Magma Launcher исполняется ${age} ${plural(age, 'год', 'года', 'лет')}!</div>
        <div class="sg-text">Спасибо, что вы с нами. Без вас этого лаунчера бы не было - приятной игры и до новых обновлений!</div>
        <button class="btn primary sg-ok">Спасибо!</button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); };
    el.querySelector('.sg-ok').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
  }

  // Что рисует каждое событие
  const SCENES = {
    winter: { particles: snow },
    newyear: { particles: snow, overlay: garland },
    valentine: { particles: hearts },
    march8: { particles: petals },
    cosmos: { overlay: sky },
    birthday: { particles: confetti, greet: birthdayGreet },
    april1: { prank: aprilFools },
    halloween: { particles: leaves, overlay: bats }
  };

  /* ---------- движок ---------- */

  let canvas = null, ctx = null, raf = 0, last = 0, t0 = 0;
  let active = null, density = 1, parts = [], overlayState = {};
  let W = 0, H = 0, dpr = 1;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'seasonal-fx';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', () => { if (active) { resize(); reseed(); } });
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function reseed() {
    const sc = SCENES[active];
    parts = [];
    overlayState = {};
    if (sc.particles) {
      const k = sc.particles;
      const n = Math.min(k.max * density, Math.round(W * H / k.perArea * density));
      for (let i = 0; i < n; i++) { const p = {}; k.spawn(p, W, H, true); parts.push(p); }
    }
    if (sc.overlay && sc.overlay.init) sc.overlay.init(overlayState, W, H, density);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const t = (now - t0) / 1000;
    const sc = SCENES[active];
    ctx.clearRect(0, 0, W, H);
    if (sc.particles) {
      const k = sc.particles;
      for (const p of parts) {
        k.update(p, dt, t);
        if (p.y > H + 30 || p.x > W + 60 || p.x < -80) k.spawn(p, W, H, false);
        k.draw(ctx, p);
      }
      ctx.globalAlpha = 1;
    }
    if (sc.overlay) sc.overlay.draw(ctx, W, H, t, dt, overlayState);
  }
  let prank = null;
  function stopCanvas() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; parts = [];
    if (canvas) { ctx.clearRect(0, 0, W, H); canvas.style.display = 'none'; }
  }
  function stopPrank() {
    if (prank) prank.disarm();
    prank = null;
  }
  function stop() { stopCanvas(); stopPrank(); active = null; }
  function start(id, dens) {
    ensureCanvas();
    if (raf && active === id && dens === density) return;
    if (raf) cancelAnimationFrame(raf);
    active = id; density = dens;
    canvas.style.display = '';
    resize(); reseed();
    t0 = last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  /** opts: effects (false = без частиц/розыгрышей; поздравление всё равно показывается),
      override ('' = авто по дате, 'off', или id события), date ('YYYY-MM-DD' - симуляция даты),
      density (множитель 0.2..3). */
  let lastDate = new Date(), evId = null;
  function apply(opts) {
    const o = opts || {};
    const date = parseDate(o.date) || new Date();
    let ev = null;
    if (o.override === 'off') ev = null;
    else if (o.override && SCENES[o.override]) ev = EVENTS.find(e => e.id === o.override);
    else ev = detect(date);
    if (!ev) { stop(); evId = null; return null; }
    const sc = SCENES[ev.id];
    lastDate = date;
    if (evId !== ev.id) { evId = ev.id; if (sc.greet) sc.greet(!!o.override, date); }
    if (!o.effects) { stop(); return ev; }
    if (sc.prank) {
      stopCanvas();
      if (prank !== sc.prank) { stopPrank(); prank = sc.prank; prank.arm(!!o.override); }
      active = ev.id;
      return ev;
    }
    stopPrank();
    start(ev.id, Math.max(0.2, Math.min(3, +o.density || 1)));
    return ev;
  }
  // Повторить розыгрыш / поздравление сразу (кнопка «Показать» в дебаге)
  function replay() {
    if (prank) prank.arm(true);
    else if (evId && SCENES[evId].greet && !document.querySelector('.season-greet')) SCENES[evId].greet(true, lastDate);
  }

  // В фоне вкладки rAF и так спит; при возврате не «прыгаем» на большой dt
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  window.MglSeasonal = { EVENTS, detect, apply, replay, parseDate, current: () => active };
})();
