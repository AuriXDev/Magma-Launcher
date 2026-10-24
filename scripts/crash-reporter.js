// Локальные отчёты о сбоях: %APPDATA%/magma-launcher/crash-reports/crash-<дата>-<тип>.txt.
// Ничего никуда не отправляется - пользователь сам открывает/копирует отчёт. Пути с именем пользователя
// маскируются (%USERPROFILE%), чтобы отчётом можно было делиться.
const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_FILES = 40;          // старше - удаляются
const MAX_PER_SESSION = 30;    // защита от шторма одинаковых ошибок
const MAX_SAME = 3;
const NOTE_KEEP = 80;
const GAME_TAIL = 200;

class CrashReporter {
  constructor({ dir, context }) {
    this.dir = dir;
    this.context = context || (() => ({}));   // () => { launcherVersion, minecraftDir, enabled, ... }
    this.notes = [];
    this.gameLogs = new Map();                // key -> последние строки лога игры
    this.counts = new Map();
    this.total = 0;
    this.listeners = [];
  }
  onReport(fn) { this.listeners.push(fn); }

  // короткая запись «что делал лаунчер» - попадает в блок «События» следующего отчёта
  note(text) {
    this.notes.push(`[${new Date().toISOString().slice(11, 19)}] ${String(text).slice(0, 300)}`);
    if (this.notes.length > NOTE_KEEP) this.notes.shift();
  }
  gameLine(key, entry) {
    let a = this.gameLogs.get(key);
    if (!a) { a = []; this.gameLogs.set(key, a); }
    a.push(`${entry.stream === 'stderr' ? '! ' : ''}${entry.line}`.slice(0, 600));
    if (a.length > GAME_TAIL) a.shift();
  }
  gameTail(key) { return (this.gameLogs.get(key) || []).slice(); }
  gameReset(key) { this.gameLogs.delete(key); }

  mask(text) {
    let s = String(text == null ? '' : text);
    const home = os.homedir();
    if (home) s = s.split(home).join('%USERPROFILE%').split(home.replace(/\\/g, '/')).join('%USERPROFILE%');
    return s;
  }
  errText(err) {
    if (err == null) return '(нет данных об ошибке)';
    if (typeof err === 'string') return err;
    return err.stack || (err.name ? `${err.name}: ${err.message}` : (err.message || JSON.stringify(err)));
  }

  // kind: main | rejection | renderer | renderer-gone | unresponsive | child-gone | game | ...
  // data: { error, title, details, gameTail, gameCrashFile }
  report(kind, data = {}) {
    const ctx = this.context() || {};
    if (ctx.enabled === false) return null;
    const text = this.errText(data.error);
    const sig = kind + '|' + text.split('\n')[0].slice(0, 160);
    const n = (this.counts.get(sig) || 0) + 1;
    this.counts.set(sig, n);
    if (n > MAX_SAME || this.total >= MAX_PER_SESSION) return null;
    this.total++;
    const now = new Date();
    const pad = (x) => String(x).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const safeKind = String(kind).replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'error';
    let name = `crash-${stamp}-${safeKind}.txt`;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      let i = 2;
      while (fs.existsSync(path.join(this.dir, name))) name = `crash-${stamp}-${safeKind}-${i++}.txt`;
      const v = process.versions || {};
      const L = [];
      L.push('Magma Launcher - отчёт о сбое');
      L.push(`Тип: ${kind}${data.title ? ' · ' + data.title : ''}`);
      L.push(`Время: ${now.toISOString()} (локально ${now.toString().slice(0, 33)})`);
      L.push(`Лаунчер: ${ctx.launcherVersion || '?'} · Electron ${v.electron || '?'} · Chrome ${v.chrome || '?'} · Node ${v.node || '?'}`);
      L.push(`ОС: ${process.platform} ${os.release()} ${process.arch} · ОЗУ: ${(os.freemem() / 1073741824).toFixed(1)} / ${(os.totalmem() / 1073741824).toFixed(1)} ГБ свободно · CPU: ${(os.cpus()[0] || {}).model || '?'} ×${os.cpus().length}`);
      if (ctx.minecraftDir) L.push(`Папка игры: ${ctx.minecraftDir}`);
      if (ctx.extra) Object.entries(ctx.extra).forEach(([k, val]) => L.push(`${k}: ${val}`));
      L.push('', '=== Ошибка ===', text);
      if (data.details) {
        L.push('', '=== Подробности ===');
        L.push(typeof data.details === 'string' ? data.details : JSON.stringify(data.details, null, 2));
      }
      if (data.gameCrashFile) L.push('', `Отчёт самой игры: ${data.gameCrashFile}`);
      if (this.notes.length) L.push('', '=== Последние события лаунчера ===', ...this.notes);
      if (data.gameTail && data.gameTail.length) L.push('', `=== Лог игры (последние ${data.gameTail.length} строк, «!» - stderr) ===`, ...data.gameTail);
      fs.writeFileSync(path.join(this.dir, name), this.mask(L.join('\n')) + '\n', 'utf8');
      this.rotate();
    } catch (e) { console.warn('[MGL2] crash-report write', e.message); return null; }
    const info = this.describe(name);
    this.listeners.forEach(fn => { try { fn(info); } catch (e) {} });
    return info;
  }

  rotate() {
    try {
      const files = this.files();
      files.slice(MAX_FILES).forEach(f => { try { fs.unlinkSync(path.join(this.dir, f.name)); } catch (e) {} });
    } catch (e) {}
  }
  files() {
    let names = [];
    try { names = fs.readdirSync(this.dir).filter(n => /^crash-.*\.txt$/.test(n)); } catch (e) { return []; }
    return names.map(n => {
      let st = null;
      try { st = fs.statSync(path.join(this.dir, n)); } catch (e) {}
      return st ? { name: n, mtime: st.mtimeMs, size: st.size } : null;
    }).filter(Boolean).sort((a, b) => b.mtime - a.mtime);
  }
  describe(name) {
    const f = path.join(this.dir, name);
    let st = null, head = [];
    try { st = fs.statSync(f); head = fs.readFileSync(f, 'utf8').slice(0, 1500).split('\n'); } catch (e) {}
    const kind = (head.find(l => l.startsWith('Тип: ')) || '').slice(5).split(' · ')[0] || 'error';
    const at = head.indexOf('=== Ошибка ===');
    const summary = at >= 0 ? (head[at + 1] || '') : '';
    return { name, kind, summary: summary.slice(0, 200), mtime: st ? st.mtimeMs : 0, size: st ? st.size : 0 };
  }
  list() { return this.files().map(f => this.describe(f.name)); }
  safePath(name) {
    const base = path.basename(String(name || ''));
    if (!/^crash-.*\.txt$/.test(base)) throw new Error('Недопустимое имя отчёта');
    return path.join(this.dir, base);
  }
  read(name) { return fs.readFileSync(this.safePath(name), 'utf8'); }
  remove(name) { try { fs.unlinkSync(this.safePath(name)); return true; } catch (e) { return false; } }
  clear() { this.files().forEach(f => { try { fs.unlinkSync(path.join(this.dir, f.name)); } catch (e) {} }); }
}

module.exports = CrashReporter;
