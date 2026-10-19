(function () {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function hexToRgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [((h * 60) + 360) % 360, max ? d / max : 0, max];
  }
  function hsvToRgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  const hsl = (h, s, l) => rgbToHex(...hslToRgb(h, s, l));
  function luminance(hex) {
    const ch = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  const LOGO_GRAD = 'linear-gradient(180deg, #7ACC90, #57B79E, #36A3A6, #1A8FAF, #1E76A2)';
  const PRESETS = [
    { id: 'mgl', name: 'MGL', mode: 'dark', bg: '#071B2A', accent: '#5CC29C', grad: LOGO_GRAD, builtin: true },
    { id: 'magma', name: 'Magma', mode: 'dark', bg: '#0D0F0C', accent: '#4FA66B' },
    { id: 'amethyst', name: 'Аметист', mode: 'dark', bg: '#110A1C', accent: '#9E61FF' },
    { id: 'neon', name: 'Неон', mode: 'dark', bg: '#13081A', accent: '#DF00FF' },
    { id: 'ruby', name: 'Рубин', mode: 'dark', bg: '#150A0E', accent: '#FF295C' },
    { id: 'ocean', name: 'Океан', mode: 'dark', bg: '#0A0F1B', accent: '#4D80FF' },
    { id: 'aqua', name: 'Бирюза', mode: 'dark', bg: '#071312', accent: '#00E0E0' },
    { id: 'sunset', name: 'Закат', mode: 'dark', bg: '#16100C', accent: '#FFB07C' },
    { id: 'gold', name: 'Золото', mode: 'dark', bg: '#12100A', accent: '#F2B634' },
    { id: 'mgl-light', name: 'MGL', mode: 'light', bg: '#EEF4F7', accent: '#1C7DA6', grad: LOGO_GRAD },
    { id: 'lavender', name: 'Лаванда', mode: 'light', bg: '#F7F4FC', accent: '#7F00FF' },
    { id: 'lilac', name: 'Сирень', mode: 'light', bg: '#F3EDFF', accent: '#6500C1' },
    { id: 'mint', name: 'Мята', mode: 'light', bg: '#EEF6F4', accent: '#008080' },
    { id: 'sky', name: 'Небо', mode: 'light', bg: '#F0F4FC', accent: '#3A6BE8' },
    { id: 'rose', name: 'Роза', mode: 'light', bg: '#FCF2F6', accent: '#BF15AE' },
    { id: 'vanilla', name: 'Ваниль', mode: 'light', bg: '#FFF8E6', accent: '#8645C7' },
    { id: 'meadow', name: 'Луг', mode: 'light', bg: '#F2F6F1', accent: '#2F8F55' },
    { id: 'peach', name: 'Персик', mode: 'light', bg: '#FFF4EE', accent: '#E0542E' }
  ];
  const SWATCHES = ['#4FA66B', '#7F00FF', '#9F00FF', '#BF00FF', '#DF00FF', '#FF00FF', '#6D0CCD', '#9E61FF', '#993AFE',
    '#B373FD', '#8645C7', '#C37BA2', '#BF15AE', '#FF295C', '#E9053A', '#FFB07C', '#FFCB98', '#4D80FF', '#00FFFF', '#008080',
    '#240046', '#3C096C', '#5A189A', '#4B0082', '#0D0F0C', '#FCFAFF', '#E6E6FA', '#EBDBFF', '#FFF0B5'];

  const MAGMA_VARS = {
    '--bg': '#0D0F0C', '--panel': '#151A15', '--panel-raised': '#1B211B', '--border': '#262E26',
    '--text': '#E7ECE6', '--text-dim': '#8A9A8C', '--text-faint': '#5B665C', '--accent': '#4FA66B',
    '--accent-dim': '#3E8C5C', '--accent-hover': '#5bb97a', '--on-accent': '#0A0C0A', '--rail-bg': '#0A0C0A',
    '--border-hover': '#3a463c', '--hero-bg': '#0f140e'
  };
  function derive(t) {
    const dark = t.mode !== 'light';
    let v;
    if (t.id === 'magma') v = { ...MAGMA_VARS };
    else {
      const [h, s0, l] = rgbToHsl(...hexToRgb(t.bg));
      const s = Math.min(s0, dark ? 0.5 : 0.6);
      const [ah, as, al] = rgbToHsl(...hexToRgb(t.accent));
      v = dark ? {
        '--bg': rgbToHex(...hexToRgb(t.bg)),
        '--panel': hsl(h, s, l + 0.039), '--panel-raised': hsl(h, s, l + 0.065), '--border': hsl(h, s, l + 0.112),
        '--border-hover': hsl(h, s, l + 0.17), '--rail-bg': hsl(h, s, Math.max(0, l - 0.012)), '--hero-bg': hsl(h, s, l + 0.02),
        '--text': hsl(h, Math.min(s, 0.15), 0.91), '--text-dim': hsl(h, Math.min(s, 0.1), 0.58), '--text-faint': hsl(h, Math.min(s, 0.08), 0.39),
        '--accent': rgbToHex(...hexToRgb(t.accent)), '--accent-dim': hsl(ah, as, al - 0.08), '--accent-hover': hsl(ah, as, al + 0.07)
      } : {
        '--bg': rgbToHex(...hexToRgb(t.bg)),
        '--panel': hsl(h, s, Math.min(0.995, l + 0.025)), '--panel-raised': hsl(h, s, l - 0.03), '--border': hsl(h, Math.min(s, 0.35), l - 0.11),
        '--border-hover': hsl(h, Math.min(s, 0.35), l - 0.2), '--rail-bg': hsl(h, s, l - 0.035), '--hero-bg': hsl(h, s, l - 0.02),
        '--text': hsl(h, Math.min(s, 0.3), 0.13), '--text-dim': hsl(h, Math.min(s, 0.14), 0.37), '--text-faint': hsl(h, Math.min(s, 0.1), 0.55),
        '--accent': rgbToHex(...hexToRgb(t.accent)), '--accent-dim': hsl(ah, as, al - 0.08), '--accent-hover': hsl(ah, as, al - 0.06)
      };
      v['--on-accent'] = contrast(v['--accent'], '#0A0C0A') >= contrast(v['--accent'], '#FFFFFF') ? '#0A0C0A' : '#FFFFFF';
    }
    const rgb = (hex) => hexToRgb(hex).join(',');
    v['--accent-rgb'] = rgb(v['--accent']);
    v['--bg-rgb'] = rgb(v['--bg']);
    v['--panel-rgb'] = rgb(v['--panel']);
    v['--raised-rgb'] = rgb(v['--panel-raised']);
    v['--border-rgb'] = rgb(v['--border']);
    v['--rail-rgb'] = rgb(v['--rail-bg']);
    v['--faint-rgb'] = rgb(v['--text-faint']);
    return v;
  }

  const CACHE_KEY = 'mgl.themeVars';
  function applyVars(vars, mode) {
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, val]) => root.style.setProperty(k, val));
    root.dataset.theme = mode === 'light' ? 'light' : 'dark';
    root.style.colorScheme = mode === 'light' ? 'light' : 'dark';
  }
  function apply(theme) {
    const vars = derive(theme);
    applyVars(vars, theme.mode);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ vars, mode: theme.mode })); } catch (e) {}
    return vars;
  }
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.vars) applyVars(cached.vars, cached.mode);
  } catch (e) {}

  class ColorPicker {
    constructor(root, hex, { onChange, swatches } = {}) {
      this.root = root;
      this.onChange = onChange || (() => {});
      root.classList.add('cp');
      root.innerHTML = `
        <div class="cp-sv"><div class="cp-sv-white"></div><div class="cp-sv-black"></div><div class="cp-knob"></div></div>
        <div class="cp-hue"><div class="cp-hue-knob"></div></div>
        <div class="cp-swatches">${(swatches || SWATCHES).map(c => `<button type="button" class="cp-sw" style="background:${c}" data-c="${c}" title="${c}"></button>`).join('')}</div>`;
      this.sv = root.querySelector('.cp-sv');
      this.knob = root.querySelector('.cp-knob');
      this.hue = root.querySelector('.cp-hue');
      this.hueKnob = root.querySelector('.cp-hue-knob');
      const drag = (el, fn) => el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        fn(e);
        const move = (ev) => fn(ev);
        const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
      });
      drag(this.sv, (e) => {
        const r = this.sv.getBoundingClientRect();
        this.s = clamp((e.clientX - r.left) / r.width);
        this.v = 1 - clamp((e.clientY - r.top) / r.height);
        this._update(true);
      });
      drag(this.hue, (e) => {
        const r = this.hue.getBoundingClientRect();
        this.h = clamp((e.clientX - r.left) / r.width) * 359.9;
        this._update(true);
      });
      root.querySelectorAll('.cp-sw').forEach(b => b.addEventListener('click', () => { this.set(b.dataset.c); this.onChange(this.hex); }));
      this.set(hex || '#4FA66B');
    }
    set(hex) {
      [this.h, this.s, this.v] = rgbToHsv(...hexToRgb(hex));
      this._update(false);
    }
    _update(emit) {
      this.hex = rgbToHex(...hsvToRgb(this.h, this.s, this.v));
      this.sv.style.background = `hsl(${this.h},100%,50%)`;
      this.knob.style.left = (this.s * 100) + '%';
      this.knob.style.top = ((1 - this.v) * 100) + '%';
      this.knob.style.background = this.hex;
      this.hueKnob.style.left = (this.h / 360 * 100) + '%';
      this.root.querySelectorAll('.cp-sw').forEach(b => b.classList.toggle('on', b.dataset.c.toUpperCase() === this.hex));
      if (emit) this.onChange(this.hex);
    }
  }

  window.MglThemes = { PRESETS, SWATCHES, derive, apply, ColorPicker, luminance };
})();
