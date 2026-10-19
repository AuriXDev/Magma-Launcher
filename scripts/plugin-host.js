// Плагин-система MGL2 главный процесс
// Плагины лежат в %APPDATA%/magma-launcher/plugins/<папка>/plugin.json (main.js / renderer.js / style.css)
// Доступ у плагинов полный (Node, Electron, менеджер игры, настройки) защита только от падений:
//  • ошибка activate() или необработанное исключение из кода плагина -> плагин отключается лог в plugin-logs/
//  • 3 ошибки за минуту в хуках -> плагин отключается
//  • 3 отключённых плагина за сессию падение/зависание окна с плагинами падение во время прошлой загрузки
//    плагинов (plugins.lock) -> отключается вся плагин-система (settings.pluginsAutoDisabled)
const fs = require('fs');
const path = require('path');

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const LOG_MAX = 1024 * 1024;
const ERR_WINDOW_MS = 60000, ERR_LIMIT = 3, SESSION_DISABLE_LIMIT = 3;
const READY_GRACE_MS = 15000;

class PluginHost {
  constructor({ settings, electron, getWindow, getManager, minecraftDir, sendRenderer, launcherVersion }) {
    this.settings = settings;
    this.electron = electron;
    this.getWindow = getWindow;
    this.getManager = getManager;
    this.minecraftDir = minecraftDir;
    this.sendRenderer = sendRenderer;
    this.launcherVersion = launcherVersion;
    this.root = path.join(settings.dir, 'plugins');
    this.dataRoot = path.join(settings.dir, 'plugin-data');
    this.logsDir = path.join(settings.dir, 'plugin-logs');
    this.lockFile = path.join(settings.dir, 'plugins.lock');
    this.loaded = new Map();      // id → { manifest, dir, exports, disposers[], api }
    this.errors = new Map();      // id → [ts]
    this.lastError = new Map();   // id → текст последней ошибки (для UI)
    this.hooks = new Map();       // event → [{ id, fn }]
    this.sessionDisabled = 0;
    this.rendererActive = [];
    try { fs.mkdirSync(this.root, { recursive: true }); fs.mkdirSync(this.logsDir, { recursive: true }); } catch (e) {}
  }

  systemEnabled() { return this.settings.get('pluginsEnabled') !== false; }
  states() { return { ...(this.settings.get('plugins') || {}) }; }
  setState(id, patch) {
    const all = this.states();
    all[id] = { ...(all[id] || {}), ...patch };
    this.settings.update({ plugins: all });
    this.settings.save();
  }
  isEnabled(id) { const s = this.states()[id]; return !!(s && s.enabled); }

  log(id, level, ...args) {
    const text = args.map(a => a instanceof Error ? (a.stack || a.message) : typeof a === 'string' ? a : safeJson(a)).join(' ');
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${id || 'host'}] ${text}\n`;
    (level === 'error' ? console.error : console.log)('[plugins]', line.trim());
    this.appendLog('plugins.log', line);
    if (id) this.appendLog(`${id}.log`, line);
    if (level === 'error' || level === 'warn') this.sendRenderer('plugins:logLine', { id, level, text });
  }
  appendLog(name, line) {
    try {
      const file = path.join(this.logsDir, name);
      try { if (fs.statSync(file).size > LOG_MAX) fs.renameSync(file, file + '.old'); } catch (e) {}
      fs.appendFileSync(file, line);
    } catch (e) {}
  }
  writeCrash(kind, info) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(this.logsDir, `crash-${kind}-${ts}.log`);
    const body = [
      `Magma Launcher ${this.launcherVersion} · Electron ${process.versions.electron} · ${process.platform} ${process.arch}`,
      `Время: ${new Date().toString()}`,
      `Тип: ${kind}`,
      '',
      typeof info === 'string' ? info : safeJson(info, 2),
      '',
      '--- Активные плагины ---',
      ...Array.from(this.loaded.values()).map(p => `${p.manifest.id} ${p.manifest.version || ''} (${p.dir})`),
      '--- renderer: ' + this.rendererActive.join(', '),
      '',
      '--- Хвост plugins.log ---',
      this.tail('plugins.log', 80)
    ].join('\n');
    try { fs.writeFileSync(file, body); } catch (e) {}
    return file;
  }
  tail(name, lines = 200) {
    try { return fs.readFileSync(path.join(this.logsDir, name), 'utf8').split('\n').slice(-lines).join('\n'); }
    catch (e) { return ''; }
  }

  scan() {
    let dirs = [];
    try { dirs = fs.readdirSync(this.root, { withFileTypes: true }).filter(d => d.isDirectory() && !/^[._]/.test(d.name)); }
    catch (e) { return []; }
    const seen = new Set();
    return dirs.map(d => {
      const dir = path.join(this.root, d.name);
      const out = { folder: d.name, dir, manifest: null, error: null };
      try {
        const m = JSON.parse(fs.readFileSync(path.join(dir, 'plugin.json'), 'utf8'));
        m.id = String(m.id || d.name);
        if (!ID_RE.test(m.id)) throw new Error('недопустимый id «' + m.id + '» (латиница, цифры, . _ -)');
        if (seen.has(m.id)) throw new Error('дубликат id «' + m.id + '»');
        seen.add(m.id);
        m.name = m.name || m.id;
        m.version = String(m.version || '0.0.0');
        if (!m.main && fs.existsSync(path.join(dir, 'main.js'))) m.main = 'main.js';
        if (!m.renderer && fs.existsSync(path.join(dir, 'renderer.js'))) m.renderer = 'renderer.js';
        if (!m.style && fs.existsSync(path.join(dir, 'style.css'))) m.style = 'style.css';
        for (const k of ['main', 'renderer', 'style', 'icon']) {
          if (m[k] && !insideDir(dir, path.join(dir, m[k]))) throw new Error(`поле ${k} указывает за пределы папки плагина`);
        }
        out.manifest = m;
      } catch (e) { out.error = e.code === 'ENOENT' ? 'нет plugin.json' : 'plugin.json: ' + e.message; }
      return out;
    });
  }
  find(id) { return this.scan().find(p => p.manifest && p.manifest.id === id); }

  describe() {
    const states = this.states();
    const plugins = this.scan().map(p => {
      const m = p.manifest || {};
      const id = m.id || p.folder;
      const st = states[id] || {};
      let icon = null;
      if (m.icon) { try { const f = path.join(p.dir, m.icon); icon = 'data:image/' + (path.extname(f).slice(1).replace('jpg', 'jpeg') || 'png') + ';base64,' + fs.readFileSync(f).toString('base64'); } catch (e) {} }
      return {
        id, folder: p.folder, dir: p.dir, invalid: !!p.error, error: p.error || this.lastError.get(id) || null,
        name: m.name || p.folder, version: m.version || '', author: m.author || '', description: m.description || '',
        homepage: m.homepage || '', icon,
        hasMain: !!m.main, hasRenderer: !!m.renderer, hasStyle: !!m.style,
        rendererPath: m.renderer ? path.join(p.dir, m.renderer) : null,
        stylePath: m.style ? path.join(p.dir, m.style) : null,
        dataDir: path.join(this.dataRoot, id),
        enabled: !!st.enabled, disabledReason: st.disabledReason || null, disabledAt: st.disabledAt || null,
        mainActive: this.loaded.has(id),
        minLauncher: m.minLauncher || null,
        incompatible: m.minLauncher ? cmpVer(this.launcherVersion, m.minLauncher) < 0 : false
      };
    });
    return {
      enabled: this.systemEnabled(),
      autoDisabled: this.settings.get('pluginsAutoDisabled') || null,
      root: this.root, logsDir: this.logsDir, launcherVersion: this.launcherVersion,
      plugins
    };
  }

  boot() {
    this.installCrashHandlers();
    if (fs.existsSync(this.lockFile) && this.systemEnabled()) {
      let info = '';
      try { info = fs.readFileSync(this.lockFile, 'utf8'); } catch (e) {}
      try { fs.unlinkSync(this.lockFile); } catch (e) {}
      this.autoDisableSystem('Прошлый запуск лаунчера аварийно завершился или завис во время загрузки плагинов', { lock: info });
      return;
    }
    if (!this.systemEnabled()) return;
    this.loadAll();
  }
  loadAll() {
    const list = this.scan().filter(p => p.manifest && this.isEnabled(p.manifest.id));
    if (list.length) this.writeLock('main');
    for (const p of list) this.loadMain(p);
    this.emit('app:ready', {});
  }
  writeLock(stage) {
    try { fs.writeFileSync(this.lockFile, JSON.stringify({ ts: Date.now(), stage, pid: process.pid })); } catch (e) {}
  }
  clearLock() { try { fs.unlinkSync(this.lockFile); } catch (e) {} }
  rendererReady(ids) {
    this.rendererActive = Array.isArray(ids) ? ids : [];
    clearTimeout(this._readyTimer);
    if (this.rendererActive.length || this.loaded.size) this.writeLock('renderer');
    this._readyTimer = setTimeout(() => this.clearLock(), READY_GRACE_MS);
  }

  loadMain(p) {
    const m = p.manifest;
    if (!m || this.loaded.has(m.id)) return;
    const rec = { manifest: m, dir: p.dir, exports: null, disposers: [], api: null };
    this.loaded.set(m.id, rec);
    if (!m.main) { rec.exports = {}; return; }
    try {
      const file = path.join(p.dir, m.main);
      purgeRequireCache(p.dir);
      rec.api = this.makeApi(rec);
      let ex = require(file);
      if (typeof ex === 'function') ex = { activate: ex };
      rec.exports = ex || {};
      if (typeof rec.exports.activate === 'function') {
        const r = rec.exports.activate(rec.api);
        if (r && typeof r.then === 'function') {
          withTimeout(r, 15000, 'activate() не завершился за 15 с')
            .catch(err => this.fail(m.id, err, 'main:activate', true));
        }
      }
      this.log(m.id, 'info', `main загружен (${m.version})`);
    } catch (err) {
      this.fail(m.id, err, 'main:activate', true);
    }
  }
  unloadMain(id) {
    const rec = this.loaded.get(id);
    if (!rec) return;
    this.loaded.delete(id);
    try { if (rec.exports && typeof rec.exports.deactivate === 'function') rec.exports.deactivate(); }
    catch (err) { this.log(id, 'error', 'deactivate():', err); }
    for (const d of rec.disposers.splice(0).reverse()) { try { d(); } catch (e) {} }
    for (const [ev, arr] of this.hooks) this.hooks.set(ev, arr.filter(h => h.id !== id));
    purgeRequireCache(rec.dir);
  }
  unloadAll() { for (const id of Array.from(this.loaded.keys())) this.unloadMain(id); }

  makeApi(rec) {
    const id = rec.manifest.id, host = this, { ipcMain } = this.electron;
    const dataDir = path.join(this.dataRoot, id);
    const storeFile = path.join(dataDir, 'storage.json');
    const disposable = (fn) => { rec.disposers.push(fn); return { dispose: () => { const i = rec.disposers.indexOf(fn); if (i >= 0) rec.disposers.splice(i, 1); try { fn(); } catch (e) {} } }; };
    const ch = (name) => `plugin:${id}:${name}`;
    return {
      id, manifest: rec.manifest, dir: rec.dir, dataDir,
      launcherVersion: this.launcherVersion,
      electron: this.electron, app: this.electron.app, ipcMain,
      get window() { return host.getWindow(); },
      get manager() { return host.getManager(); },
      minecraftDir: () => this.minecraftDir(),
      log: {
        info: (...a) => this.log(id, 'info', ...a),
        warn: (...a) => this.log(id, 'warn', ...a),
        error: (...a) => this.log(id, 'error', ...a)
      },
      settings: {
        get: (k) => k ? this.settings.get(k) : this.settings.getAll(),
        set: (patch) => { this.settings.update(patch || {}); this.settings.save(); this.sendRenderer('plugins:settingsChanged', patch || {}); }
      },
      storage: {
        all: () => readJson(storeFile, {}),
        get: (k, def) => { const o = readJson(storeFile, {}); return k in o ? o[k] : def; },
        set: (k, v) => { const o = readJson(storeFile, {}); o[k] = v; fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(storeFile, JSON.stringify(o, null, 2)); },
        delete: (k) => { const o = readJson(storeFile, {}); delete o[k]; fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(storeFile, JSON.stringify(o, null, 2)); }
      },
      on: (event, fn) => {
        const h = { id, fn };
        const arr = this.hooks.get(event) || [];
        arr.push(h); this.hooks.set(event, arr);
        return disposable(() => this.hooks.set(event, (this.hooks.get(event) || []).filter(x => x !== h)));
      },
      emit: (event, data) => this.emit(event, data),
      handle: (name, fn) => {
        const c = ch(name);
        try { ipcMain.removeHandler(c); } catch (e) {}
        ipcMain.handle(c, async (e, ...args) => {
          try { return await fn(...args); }
          catch (err) { this.fail(id, err, 'ipc:' + name); throw err; }
        });
        return disposable(() => { try { ipcMain.removeHandler(c); } catch (e) {} });
      },
      send: (name, data) => this.sendRenderer(ch(name), data),
      notify: (title, text) => this.sendRenderer('plugins:notify', { id, title, text }),
      onDispose: (fn) => disposable(fn),
      setInterval: (fn, ms) => { const t = setInterval(this.guard(id, 'timer', fn), ms); return disposable(() => clearInterval(t)); },
      setTimeout: (fn, ms) => { const t = setTimeout(this.guard(id, 'timer', fn), ms); return disposable(() => clearTimeout(t)); },
      plugins: {
        list: () => Array.from(this.loaded.keys()),
        get: (other) => { const r = this.loaded.get(other); return r ? r.exports : null; }
      }
    };
  }

  guard(id, phase, fn) {
    return (...args) => {
      try {
        const r = fn(...args);
        if (r && typeof r.then === 'function') r.catch(err => this.fail(id, err, phase));
        return r;
      } catch (err) { this.fail(id, err, phase); }
    };
  }

  async emit(event, data) {
    const arr = (this.hooks.get(event) || []).slice();
    const out = [];
    for (const h of arr) {
      if (!this.loaded.has(h.id)) continue;
      try { out.push(await withTimeout(Promise.resolve(h.fn(data)), 20000, `хук ${event} не ответил за 20 с`)); }
      catch (err) { this.fail(h.id, err, 'hook:' + event); }
    }
    return out;
  }
  emitSync(event, data) {
    const arr = this.hooks.get(event);
    if (!arr || !arr.length) return;
    for (const h of arr.slice()) {
      try { const r = h.fn(data); if (r && typeof r.catch === 'function') r.catch(err => this.fail(h.id, err, 'hook:' + event)); }
      catch (err) { this.fail(h.id, err, 'hook:' + event); }
    }
  }

  fail(id, err, phase, fatal) {
    const msg = (err && (err.stack || err.message)) || String(err);
    this.log(id, 'error', `[${phase}]`, msg);
    this.lastError.set(id, `${phase}: ${(err && err.message) || String(err)}`);
    const now = Date.now();
    const arr = (this.errors.get(id) || []).filter(t => now - t < ERR_WINDOW_MS);
    arr.push(now); this.errors.set(id, arr);
    if (fatal || arr.length >= ERR_LIMIT) {
      const reason = fatal ? `Сбой (${phase}): ${(err && err.message) || err}` : `${arr.length} ошибки за минуту (последняя — ${phase})`;
      const log = this.writeCrash('plugin-' + id, { plugin: id, phase, error: msg });
      this.disablePlugin(id, reason, log);
    }
  }
  disablePlugin(id, reason, logFile) {
    if (!this.isEnabled(id) && !this.loaded.has(id)) return;
    this.unloadMain(id);
    this.setState(id, { enabled: false, disabledReason: reason, disabledAt: Date.now(), crashLog: logFile || null });
    this.log(id, 'warn', 'плагин отключён автоматически: ' + reason);
    this.sendRenderer('plugins:crashed', { id, reason, log: logFile || null });
    this.sessionDisabled++;
    if (this.sessionDisabled >= SESSION_DISABLE_LIMIT && this.systemEnabled()) {
      this.autoDisableSystem(`За сессию автоматически отключено ${this.sessionDisabled} плагина`, {});
    }
  }
  autoDisableSystem(reason, info) {
    const log = this.writeCrash('system', { reason, ...info });
    this.log(null, 'error', 'плагин-система отключена: ' + reason);
    this.unloadAll();
    this.clearLock();
    this.settings.update({ pluginsEnabled: false, pluginsAutoDisabled: { reason, ts: Date.now(), log } });
    this.settings.save();
    this.sendRenderer('plugins:systemDisabled', { reason, log });
  }

  blame(err) {
    const stack = String((err && err.stack) || '');
    const norm = stack.replace(/\\/g, '/').toLowerCase();
    for (const p of this.scan()) {
      if (!p.manifest) continue;
      const d = p.dir.replace(/\\/g, '/').toLowerCase() + '/';
      if (norm.includes(d)) return p.manifest.id;
    }
    return null;
  }
  installCrashHandlers() {
    if (this._handlers) return;
    this._handlers = true;
    const onErr = (kind) => (err) => {
      const id = this.blame(err);
      if (id) { this.fail(id, err, 'main:' + kind, true); return; }
      console.error('[MGL2] ' + kind, err);
      this.appendLog('launcher-errors.log', `[${new Date().toISOString()}] ${kind}: ${(err && err.stack) || err}\n`);
    };
    process.on('uncaughtException', onErr('uncaughtException'));
    process.on('unhandledRejection', onErr('unhandledRejection'));
  }
  onRendererGone(details) {
    if (!details || details.reason === 'clean-exit') return false;
    if (!this.systemEnabled() || !this.rendererActive.length) return false;
    this.rendererActive = [];
    this.autoDisableSystem(`Окно лаунчера аварийно завершилось (${details.reason}, код ${details.exitCode})`, { details });
    return true;
  }
  onRendererUnresponsive() {
    if (!this.systemEnabled() || !this.rendererActive.length) return false;
    this.rendererActive = [];
    this.autoDisableSystem('Окно лаунчера перестало отвечать (возможно, бесконечный цикл в плагине)', {});
    return true;
  }

  setSystem(on) {
    if (on) {
      this.settings.update({ pluginsEnabled: true, pluginsAutoDisabled: null });
      this.settings.save();
      this.sessionDisabled = 0;
      this.loadAll();
    } else {
      this.unloadAll();
      this.clearLock();
      this.settings.update({ pluginsEnabled: false });
      this.settings.save();
    }
  }
  setEnabled(id, on) {
    const p = this.find(id);
    if (!p) throw new Error('плагин не найден: ' + id);
    this.errors.delete(id); this.lastError.delete(id);
    this.setState(id, { enabled: !!on, disabledReason: null, disabledAt: null });
    if (on && this.systemEnabled()) this.loadMain(p);
    if (!on) this.unloadMain(id);
  }
  reload(id) {
    const ids = id ? [id] : Array.from(this.loaded.keys());
    for (const x of ids) {
      this.unloadMain(x);
      const p = this.find(x);
      if (p && this.systemEnabled() && this.isEnabled(x)) this.loadMain(p);
    }
  }
  remove(id) {
    const p = this.find(id) || this.scan().find(x => x.folder === id);
    if (!p) throw new Error('плагин не найден');
    if (!insideDir(this.root, p.dir) || path.resolve(p.dir) === path.resolve(this.root)) throw new Error('небезопасный путь');
    this.unloadMain(id);
    fs.rmSync(p.dir, { recursive: true, force: true });
    const all = this.states(); delete all[id];
    this.settings.update({ plugins: all }); this.settings.save();
  }
  install(src) {
    const zip = require('./zip-extract');
    const tmp = path.join(this.root, '_tmp_' + Date.now());
    fs.mkdirSync(tmp, { recursive: true });
    try {
      if (fs.statSync(src).isDirectory()) copyDir(src, tmp);
      else zip.extractAll(fs.readFileSync(src), tmp);
      // plugin.json может лежать во вложенной папке архива
      let base = tmp;
      if (!fs.existsSync(path.join(base, 'plugin.json'))) {
        const sub = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());
        const hit = sub.find(d => fs.existsSync(path.join(base, d.name, 'plugin.json')));
        if (!hit) throw new Error('в архиве/папке нет plugin.json');
        base = path.join(base, hit.name);
      }
      const m = JSON.parse(fs.readFileSync(path.join(base, 'plugin.json'), 'utf8'));
      const id = String(m.id || path.basename(src).replace(/\.zip$/i, ''));
      if (!ID_RE.test(id)) throw new Error('недопустимый id плагина: ' + id);
      const dest = path.join(this.root, id);
      if (this.loaded.has(id)) this.unloadMain(id);
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
      fs.renameSync(base, dest);
      this.log(id, 'info', 'установлен из ' + src);
      return id;
    } finally {
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    }
  }
  createTemplate(name) {
    const base = String(name || 'my-plugin').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-plugin';
    let id = base, n = 2;
    while (fs.existsSync(path.join(this.root, id))) id = `${base}-${n++}`;
    const dir = path.join(this.root, id);
    fs.mkdirSync(dir, { recursive: true });
    const T = require('./plugin-template');
    for (const [f, text] of Object.entries(T.files(id, name || id))) fs.writeFileSync(path.join(dir, f), text);
    this.setState(id, { enabled: true });
    if (this.systemEnabled()) this.loadMain(this.find(id));
    return id;
  }
}

function safeJson(v, sp) { try { return JSON.stringify(v, null, sp); } catch (e) { return String(v); } }
function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return def; } }
function insideDir(dir, p) { const r = path.relative(path.resolve(dir), path.resolve(p)); return !r.startsWith('..') && !path.isAbsolute(r); }
function purgeRequireCache(dir) {
  const d = path.resolve(dir).toLowerCase() + path.sep;
  for (const k of Object.keys(require.cache)) if (k.toLowerCase().startsWith(d)) delete require.cache[k];
}
function withTimeout(p, ms, msg) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })]).finally(() => clearTimeout(t));
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}
function cmpVer(a, b) {
  const x = String(a).split('.').map(n => parseInt(n, 10) || 0), y = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}

module.exports = PluginHost;
