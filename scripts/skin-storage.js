(function () {
  'use strict';

  const hasNode = typeof window.require === 'function' || typeof require !== 'undefined';
  let fs = null, path = null, os = null, url = null, DEFAULT_MGL_DIR = null, SETTINGS_FILE = null;
  const req = (m) => (window.require ? window.require(m) : require(m));

  if (hasNode) {
    try {
      fs = req('fs'); path = req('path'); os = req('os'); url = req('url');
      const appdata = process.env.APPDATA ||
        (process.platform === 'darwin'
          ? path.join(os.homedir(), 'Library', 'Application Support')
          : os.homedir());
      DEFAULT_MGL_DIR = path.join(appdata, '.minecraft', 'mgl');
      SETTINGS_FILE = path.join(process.env.APPDATA || path.join(os.homedir(), '.config'), 'magma-launcher', 'settings.json');
    } catch (e) { console.warn('store: fs недоступен, localStorage', e); fs = null; }
  }

  // Папка mgl внутри ТЕКУЩЕЙ .minecraft (settings.minecraftDir) - та же, что использует main.js при запуске.
  // Раньше всегда бралась %APPDATA%/.minecraft: после переноса папки игры скины «пропадали» после перезапуска.
  function mglDir() {
    try {
      const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (s && typeof s.minecraftDir === 'string' && s.minecraftDir.trim()) return path.join(s.minecraftDir, 'mgl');
    } catch (e) {}
    return DEFAULT_MGL_DIR;
  }
  const fileUrl = (p) => { try { return url.pathToFileURL(p).href; } catch (e) { return 'file:///' + p.replace(/\\/g, '/'); } };

  // Прочитать File -> { dataUrl, arrayBuffer, width, height }
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const dataUrl = fr.result;
        const img = new Image();
        img.onload = () => resolve({ dataUrl, arrayBuffer: b64ToAb(dataUrl.split(',')[1]), width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
        img.src = dataUrl;
      };
      fr.onerror = () => reject(new Error('Ошибка чтения файла'));
      fr.readAsDataURL(file);
    });
  }
  function b64ToAb(b64) { const bin = atob(b64), n = bin.length, a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = bin.charCodeAt(i); return a.buffer; }
  const safe = (name) => (name || 'item').replace(/[^a-z0-9_\-а-яё ]/gi, '_').trim() || 'item';

  function makeStore(sub) {
    const LS = 'mgl.' + sub;
    const LS_ACTIVE = 'mgl.' + sub + '.active';
    const LS_PINNED = 'mgl.' + sub + '.pinned';
    let _dir = null;
    // Текущая папка; при смене .minecraft подтягиваем файлы из старого места (копией, ничего не удаляя).
    const dirNow = () => {
      const d = path.join(mglDir(), sub);
      if (d === _dir) return d;
      try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
      const legacy = path.join(DEFAULT_MGL_DIR, sub);
      if (path.resolve(legacy) !== path.resolve(d)) {
        try {
          for (const f of fs.readdirSync(legacy)) {
            if (!/\.png$/i.test(f) && f !== '_active.json') continue;
            const to = path.join(d, f);
            if (!fs.existsSync(to)) fs.copyFileSync(path.join(legacy, f), to);
          }
        } catch (e) {}
      }
      _dir = d;
      return d;
    };
    const metaFile = () => path.join(dirNow(), '_active.json');
    if (fs) dirNow();

    const node = {
      _meta() { try { return JSON.parse(fs.readFileSync(metaFile(), 'utf8')) || {}; } catch (e) { return {}; } },
      _writeMeta(patch) {
        try {
          const f = metaFile(), tmp = f + '.tmp';
          fs.writeFileSync(tmp, JSON.stringify({ ...this._meta(), ...patch }));
          fs.renameSync(tmp, f);
        } catch (e) {}
      },
      readActive() { return this._meta().active || null; },
      writeActive(f) { this._writeMeta({ active: f }); },
      readPinned() { return this._meta().pinned || []; },
      writePinned(a) { this._writeMeta({ pinned: a }); },
      readModels() { const m = this._meta(); return { models: m.models || {}, detected: m.detected || {} }; },
      writeModels(o) { this._writeMeta(o); },
      rename(f, name) {
        const DIR = dirNow();
        let file = safe(name) + '.png', i = 1;
        if (file === f) return f;
        while (fs.existsSync(path.join(DIR, file))) file = `${safe(name)}_${i++}.png`;
        fs.renameSync(path.join(DIR, f), path.join(DIR, file));
        return file;
      },
      list() {
        const DIR = dirNow();
        let files = [];
        try { files = fs.readdirSync(DIR).filter(f => /\.png$/i.test(f)); } catch (e) {}
        const active = this.readActive();
        return files.map(f => ({ name: f.replace(/\.png$/i, ''), file: f, url: fileUrl(path.join(DIR, f)), active: f === active }));
      },
      save(name, ab) {
        const DIR = dirNow();
        let file = safe(name) + '.png', i = 1;
        while (fs.existsSync(path.join(DIR, file))) file = `${safe(name)}_${i++}.png`;
        fs.writeFileSync(path.join(DIR, file), Buffer.from(ab));
        return { name: file.replace(/\.png$/i, ''), file, url: fileUrl(path.join(DIR, file)), active: false };
      },
      remove(f) { try { fs.unlinkSync(path.join(dirNow(), f)); } catch (e) {} if (this.readActive() === f) this.writeActive(null); },
      setActive(f) { this.writeActive(f); },
      folder() { return dirNow(); }
    };

    const web = {
      _r() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch (e) { return []; } },
      _w(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {} },
      list() { const a = localStorage.getItem(LS_ACTIVE); return this._r().map(s => ({ name: s.name, file: s.file, url: s.url, active: s.file === a })); },
      readActive() { return localStorage.getItem(LS_ACTIVE); },
      readPinned() { try { return JSON.parse(localStorage.getItem(LS_PINNED)) || []; } catch (e) { return []; } },
      writePinned(a) { try { localStorage.setItem(LS_PINNED, JSON.stringify(a)); } catch (e) {} },
      readModels() { try { const o = JSON.parse(localStorage.getItem(LS + '.models')) || {}; return { models: o.models || {}, detected: o.detected || {} }; } catch (e) { return { models: {}, detected: {} }; } },
      writeModels(o) { try { localStorage.setItem(LS + '.models', JSON.stringify({ ...this.readModels(), ...o })); } catch (e) {} },
      rename(f, name) {
        const arr = this._r(); let file = safe(name) + '.png', i = 1;
        if (file === f) return f;
        while (arr.some(s => s.file === file)) file = `${safe(name)}_${i++}.png`;
        arr.forEach(s => { if (s.file === f) { s.file = file; s.name = file.replace(/\.png$/i, ''); } });
        this._w(arr);
        return file;
      },
      save(name, ab, dataUrl) {
        const arr = this._r(); let file = safe(name) + '.png', i = 1;
        while (arr.some(s => s.file === file)) file = `${safe(name)}_${i++}.png`;
        const e = { name: file.replace(/\.png$/i, ''), file, url: dataUrl }; arr.push(e); this._w(arr);
        return { ...e, active: false };
      },
      remove(f) { this._w(this._r().filter(s => s.file !== f)); if (localStorage.getItem(LS_ACTIVE) === f) localStorage.removeItem(LS_ACTIVE); },
      setActive(f) { if (f) localStorage.setItem(LS_ACTIVE, f); else localStorage.removeItem(LS_ACTIVE); },
      folder() { return '(предпросмотр в браузере - файлы не сохраняются на диск)'; }
    };

    const impl = fs ? node : web;

    return {
      isReal: !!fs,
      folder: () => impl.folder(),
      list() {
        const pinned = impl.readPinned();
        const rank = (x) => x.pinned ? pinned.indexOf(x.file) : pinned.length;
        const { models } = impl.readModels();
        return impl.list().map(x => ({ ...x, pinned: pinned.includes(x.file), model: models[x.file] || 'auto' })).sort((a, b) => rank(a) - rank(b));
      },
      setActive: (f) => impl.setActive(f),
      // Модель скина: models[file] = 'classic'|'slim' (выбор пользователя), detected[file] - авто-определение превью.
      // getModel → 'auto' | 'classic' | 'slim'; effectiveModel → то, что пойдёт в игру ('classic'|'slim').
      getModel(f) { return impl.readModels().models[f] || 'auto'; },
      setModel(f, m) {
        const { models } = impl.readModels();
        const next = { ...models };
        if (m === 'classic' || m === 'slim') next[f] = m; else delete next[f];
        impl.writeModels({ models: next });
      },
      setDetected(f, m) {
        const { detected } = impl.readModels();
        if (detected[f] === m) return;
        impl.writeModels({ detected: { ...detected, [f]: m } });
      },
      effectiveModel(f) { const r = impl.readModels(); return r.models[f] || r.detected[f] || 'classic'; },
      _moveModel(f, nf) {
        const r = impl.readModels(), mv = (o) => { const x = { ...o }; if (f in x) { if (nf) x[nf] = x[f]; delete x[f]; } return x; };
        impl.writeModels({ models: mv(r.models), detected: mv(r.detected) });
      },
      remove(f) { impl.remove(f); impl.writePinned(impl.readPinned().filter(x => x !== f)); this._moveModel(f, null); },
      togglePin(f) {
        const p = impl.readPinned(), on = !p.includes(f);
        impl.writePinned(on ? [...p, f] : p.filter(x => x !== f));
        return on;
      },
      rename(f, name) {
        const wasActive = impl.readActive() === f;
        const nf = impl.rename(f, name);
        if (nf !== f) {
          if (wasActive) impl.setActive(nf);
          impl.writePinned(impl.readPinned().map(x => x === f ? nf : x));
          this._moveModel(f, nf);
        }
        return nf;
      },
      getActive() { const a = impl.list().find(x => x.active); return a || null; },
      async addFromFile(file) { return this.addFromBlob(file, file.name.replace(/\.[^.]+$/, '')); },
      async addFromBase64(b64, base) { return this.addFromBlob(new Blob([b64ToAb(b64)], { type: 'image/png' }), base); },
      async addFromBlob(file, base) {
        const { arrayBuffer, dataUrl, width, height } = await readFile(file);
        const entry = fs ? impl.save(base, arrayBuffer) : impl.save(base, arrayBuffer, dataUrl);
        return { entry, width, height };
      },
      async ensureDefault(assetUrl, asName) {
        if (impl.list().length) return;
        try {
          const ab = await (await fetch(assetUrl)).arrayBuffer();
          if (fs) impl.save(asName, ab);
          else {
            const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(new Blob([ab], { type: 'image/png' })); });
            impl.save(asName, ab, dataUrl);
          }
          const first = impl.list()[0];
          if (first) impl.setActive(first.file);
        } catch (e) { console.warn('ensureDefault', e); }
      }
    };
  }

  window.SkinStore = makeStore('skin');
  window.CapeStore = makeStore('cape');
  window.SkinStore.ensureDefaultSkin = () => window.SkinStore.ensureDefault('assets/images/player.png', 'steve');
})();
