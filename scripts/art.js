(function () {
  'use strict';
  function mixHex(a, b, t) {
    const p = (h) => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const x = p(a), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const bg = v('--bg', '#0D0F0C'), panel = v('--panel', '#151A15'), raised = v('--panel-raised', '#1B211B');
    const accent = v('--accent', '#4FA66B'), dim = v('--accent-dim', '#3E8C5C'), ember = v('--ember', '#C9743A');
    return {
      bgA: [mixHex(bg, accent, 0.03), panel, bg, mixHex(panel, accent, 0.05)],
      bgB: [raised, mixHex(raised, accent, 0.12), mixHex(panel, accent, 0.08), mixHex(raised, accent, 0.18)],
      fills: [accent, dim, ember, mixHex(accent, '#ffffff', 0.25), mixHex(accent, bg, 0.45), mixHex(accent, '#ffffff', 0.45)]
    };
  }
  let PAL = palette();

  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h ^= h >>> 16;
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function svg(seed, size) {
    size = size || 96;
    const r = mulberry32(hash(String(seed)));
    const bgA = PAL.bgA[(r() * PAL.bgA.length) | 0];
    const bgB = PAL.bgB[(r() * PAL.bgB.length) | 0];
    const ang = (r() * 360) | 0;

    let shapes = '';
    const n = 3 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const fill = PAL.fills[(r() * PAL.fills.length) | 0];
      const op = (0.2 + r() * 0.55).toFixed(2);
      const cx = (r() * 100) | 0, cy = (r() * 100) | 0;
      const rot = (r() * 360) | 0;
      const t = r();
      if (t < 0.4) {
        const rad = 14 + ((r() * 34) | 0);
        shapes += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" opacity="${op}"/>`;
      } else if (t < 0.72) {
        const w = (20 + r() * 46).toFixed(1), h = (20 + r() * 46).toFixed(1), rx = (3 + r() * 13).toFixed(1);
        shapes += `<rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;
      } else {
        const s = 24 + r() * 40;
        const pts = `${cx},${(cy - s / 2).toFixed(1)} ${(cx - s / 2).toFixed(1)},${(cy + s / 2).toFixed(1)} ${(cx + s / 2).toFixed(1)},${(cy + s / 2).toFixed(1)}`;
        shapes += `<polygon points="${pts}" fill="${fill}" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;
      }
    }
    const hc = PAL.fills[(r() * 3) | 0];
    shapes += `<circle cx="${(r() * 100) | 0}" cy="${(r() * 100) | 0}" r="${10 + ((r() * 16) | 0)}" fill="${hc}" opacity="0.8"/>`;
    const blur = (0.9 + r() * 1.4).toFixed(1);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">` +
      `<defs><linearGradient id="g" gradientTransform="rotate(${ang} .5 .5)">` +
      `<stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient>` +
      `<filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
      `<rect width="100" height="100" fill="url(#g)"/>` +
      `<g filter="url(#b)">${shapes}</g></svg>`;
  }

  function dataUrl(seed, size) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg(seed, size));
  }
  window.MglArt = { svg, dataUrl, refreshPalette() { PAL = palette(); } };
  // Свои картинки сборок (Библиотека). В приложении лежат файлами в <.minecraft>/mgl/icons (main: icons:*),
  // в браузере-превью (без Electron) - по-прежнему в localStorage. Кэш в памяти → get/for остаются синхронными.
  const KEY = 'mgl.icons';
  const lsRead = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const lsWrite = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const ipcR = (() => { try { return window.require ? window.require('electron').ipcRenderer : null; } catch (e) { return null; } })();
  let cache = null;
  function load() {
    if (cache) return cache;
    if (!ipcR) return (cache = lsRead());
    try { cache = ipcR.sendSync('icons:loadAll') || {}; } catch (e) { cache = {}; }
    // одноразовый перенос старых картинок из localStorage на диск
    try {
      const old = lsRead();
      if (Object.keys(old).length) {
        const r = ipcR.sendSync('icons:migrate', old);
        if (r) {
          Object.assign(cache, r.urls || {});
          if (!r.failed) localStorage.removeItem(KEY);
        }
      }
    } catch (e) {}
    return cache;
  }
  window.MglIcons = {
    get(id) { return load()[id] || null; },
    set(id, url) {
      const c = load();
      if (!ipcR) { c[id] = url; lsWrite(c); return; }
      let saved = null;
      try { saved = ipcR.sendSync('icons:save', id, url); } catch (e) {}
      c[id] = saved || url;      // не удалось записать на диск - хотя бы показываем в этой сессии
    },
    clear(id) {
      const c = load();
      delete c[id];
      if (ipcR) { try { ipcR.sendSync('icons:remove', id); } catch (e) {} } else lsWrite(c);
    },
    // после смены папки .minecraft - перечитать с диска
    reload() { cache = null; load(); },
    // иконка сборки: своя картинка, иначе сгенерированная абстракция
    for(id) { return this.get(id) || dataUrl(id); }
  };
})();
