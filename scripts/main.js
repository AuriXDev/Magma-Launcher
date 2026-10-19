const { app, BrowserWindow, ipcMain, shell, dialog, net, Tray, Menu, nativeImage, session, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');
const { spawn } = require('child_process');
const MinecraftManager = require('./minecraft-manager');
const LauncherSettings = require('./settings');
const PluginHost = require('./plugin-host');

let mainWindow = null;
const settings = new LauncherSettings();

function defaultMinecraftDir() {
  const appdata = process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : os.homedir());
  return path.join(appdata, '.minecraft');
}
function minecraftDir() {
  const custom = settings.get('minecraftDir');
  if (custom && typeof custom === 'string' && custom.trim()) return custom;
  return defaultMinecraftDir();
}
let manager = new MinecraftManager(minecraftDir());

const plugins = new PluginHost({
  settings, electron: require('electron'),
  getWindow: () => mainWindow, getManager: () => manager, minecraftDir: () => minecraftDir(),
  sendRenderer: (ch, payload) => sendRenderer(ch, payload),
  launcherVersion: app.getVersion()
});

function describeInstalled() {
  return manager.getInstalledVersions().map(folder => {
    let loader = 'vanilla';
    const name = MinecraftManager.stripVersionPrefix(folder);
    const low = name.toLowerCase();
    if (low.includes('neoforge')) loader = 'neoforge';
    else if (low.includes('forge')) loader = 'forge';
    else if (low.includes('fabric')) loader = 'fabric';
    else if (low.includes('quilt')) loader = 'quilt';
    let mc = MinecraftManager.versionPrefix(folder) || '';
    let v = null;
    try { v = manager.readVersionJson(folder); } catch (e) {}
    if (!mc && v && v.inheritsFrom) mc = String(v.inheritsFrom);
    if (!mc) { const m = name.match(/\d+\.\d+(\.\d+)?/); if (m) mc = m[0]; }
    if (!mc && v) mc = (v.assets || v.id || '').match(/\d+\.\d+(\.\d+)?/)?.[0] || v.assets || '';
    if (!mc) mc = folder;
    return { folder, name, mc, loader };
  });
}

function migrateFolderKeys(map) {
  const re = (obj) => { const o = { ...(obj || {}) }; for (const [a, b] of Object.entries(map)) if (a in o) { o[b] = o[a]; delete o[a]; } return o; };
  const lv = settings.get('lastVersion');
  settings.update({
    aliases: re(settings.get('aliases')),
    launchCounts: re(settings.get('launchCounts')),
    instanceJava: re(settings.get('instanceJava')),
    pinned: (settings.get('pinned') || []).map(x => map[x] || x),
    lastVersion: (lv && map[lv]) || lv
  });
  settings.save();
}

function prefixNewFolders(before, mcVersion) {
  const map = {};
  describeInstalled()
    .filter(x => !before.includes(x.folder) && x.loader !== 'vanilla' && !MinecraftManager.versionPrefix(x.folder))
    .forEach(x => {
      const to = manager.prefixedName(mcVersion || x.mc, x.folder);
      try { manager.renameVersion(x.folder, to); map[x.folder] = to; } catch (e) { console.warn('[MGL2] prefix', x.folder, e.message); }
    });
  if (Object.keys(map).length) migrateFolderKeys(map);
  return map;
}

function fixVersionNames() {
  const running = new Set(manager.getRunning().map(r => r.folder));
  const map = {}, skipped = [];
  describeInstalled().forEach(x => {
    if (MinecraftManager.versionPrefix(x.folder)) return;
    const mc = instanceInfo(x.folder).mc || x.mc;
    if (!mc || x.folder === mc) return;
    if (running.has(x.folder)) { skipped.push({ folder: x.folder, error: 'игра запущена' }); return; }
    const to = manager.prefixedName(mc, x.folder);
    try { manager.renameVersion(x.folder, to); map[x.folder] = to; }
    catch (e) { skipped.push({ folder: x.folder, error: e.message }); }
  });
  if (Object.keys(map).length) migrateFolderKeys(map);
  return { renamed: map, skipped };
}

function parseServersDat() {
  try {
    const file = path.join(minecraftDir(), 'servers.dat');
    if (!fs.existsSync(file)) return [];
    let buf = fs.readFileSync(file);
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
    const root = readNbtRoot(buf);
    const list = (root && root.servers) || [];
    return list.map(s => ({ name: s.name || s.ip || 'Сервер', ip: s.ip || '' }));
  } catch (e) { return []; }
}

function readNbtRoot(buf) {
  const st = { b: buf, i: 0 };
  const type = u8(st);
  if (type !== 10) return null;
  readString(st); // имя корня
  return readCompound(st);
}
function u8(st) { return st.b[st.i++]; }
function i16(st) { const v = st.b.readInt16BE(st.i); st.i += 2; return v; }
function i32(st) { const v = st.b.readInt32BE(st.i); st.i += 4; return v; }
function readString(st) { const len = st.b.readUInt16BE(st.i); st.i += 2; const s = st.b.toString('utf8', st.i, st.i + len); st.i += len; return s; }
function readPayload(st, type) {
  switch (type) {
    case 1: return u8(st);
    case 2: return i16(st);
    case 3: return i32(st);
    case 4: { const v = st.b.readBigInt64BE(st.i); st.i += 8; return v; }
    case 5: { const v = st.b.readFloatBE(st.i); st.i += 4; return v; }
    case 6: { const v = st.b.readDoubleBE(st.i); st.i += 8; return v; }
    case 7: { const n = i32(st); const a = st.b.slice(st.i, st.i + n); st.i += n; return a; }
    case 8: return readString(st);
    case 9: { const it = u8(st); const n = i32(st); const arr = []; for (let k = 0; k < n; k++) arr.push(readPayload(st, it)); return arr; }
    case 10: return readCompound(st);
    case 11: { const n = i32(st); const a = []; for (let k = 0; k < n; k++) a.push(i32(st)); return a; }
    case 12: { const n = i32(st); const a = []; for (let k = 0; k < n; k++) { a.push(st.b.readBigInt64BE(st.i)); st.i += 8; } return a; }
    default: return null;
  }
}
function readCompound(st) {
  const obj = {};
  while (st.i < st.b.length) {
    const type = u8(st);
    if (type === 0) break;
    const name = readString(st);
    obj[name] = readPayload(st, type);
  }
  return obj;
}

function nbtPayload(st, t) {
  const b = st.b;
  switch (t) {
    case 1: { const v = b.readInt8(st.i); st.i += 1; return v; }
    case 2: { const v = b.readInt16BE(st.i); st.i += 2; return v; }
    case 3: { const v = b.readInt32BE(st.i); st.i += 4; return v; }
    case 4: { const v = b.readBigInt64BE(st.i); st.i += 8; return v; }
    case 5: { const v = b.readFloatBE(st.i); st.i += 4; return v; }
    case 6: { const v = b.readDoubleBE(st.i); st.i += 8; return v; }
    case 7: { const n = b.readInt32BE(st.i); st.i += 4; const v = Buffer.from(b.slice(st.i, st.i + n)); st.i += n; return v; }
    case 8: return readString(st);
    case 9: {
      const et = b.readUInt8(st.i); st.i += 1;
      const n = b.readInt32BE(st.i); st.i += 4;
      const items = [];
      for (let k = 0; k < n; k++) items.push(nbtPayload(st, et));
      return { et, items };
    }
    case 10: {
      const entries = [];
      for (;;) {
        const tt = b.readUInt8(st.i); st.i += 1;
        if (tt === 0) break;
        const name = readString(st);
        entries.push([name, { t: tt, v: nbtPayload(st, tt) }]);
      }
      return entries;
    }
    case 11: { const n = b.readInt32BE(st.i); st.i += 4; const a = []; for (let k = 0; k < n; k++) { a.push(b.readInt32BE(st.i)); st.i += 4; } return a; }
    case 12: { const n = b.readInt32BE(st.i); st.i += 4; const a = []; for (let k = 0; k < n; k++) { a.push(b.readBigInt64BE(st.i)); st.i += 8; } return a; }
    default: throw new Error('NBT: неизвестный тег ' + t);
  }
}
function nbtWriteStr(out, s) {
  const sb = Buffer.from(String(s), 'utf8');
  const h = Buffer.alloc(2); h.writeUInt16BE(sb.length);
  out.push(h, sb);
}
function nbtWrite(out, t, v) {
  const num = (size, fn) => { const x = Buffer.alloc(size); x[fn](v); out.push(x); };
  switch (t) {
    case 1: return num(1, 'writeInt8');
    case 2: return num(2, 'writeInt16BE');
    case 3: return num(4, 'writeInt32BE');
    case 4: return num(8, 'writeBigInt64BE');
    case 5: return num(4, 'writeFloatBE');
    case 6: return num(8, 'writeDoubleBE');
    case 7: { const h = Buffer.alloc(4); h.writeInt32BE(v.length); out.push(h, v); return; }
    case 8: return nbtWriteStr(out, v);
    case 9: {
      const h = Buffer.alloc(5); h.writeUInt8(v.items.length ? v.et : (v.et || 0)); h.writeInt32BE(v.items.length, 1);
      out.push(h);
      v.items.forEach(it => nbtWrite(out, v.et, it));
      return;
    }
    case 10:
      v.forEach(([name, node]) => { out.push(Buffer.from([node.t])); nbtWriteStr(out, name); nbtWrite(out, node.t, node.v); });
      out.push(Buffer.from([0]));
      return;
    case 11: { const h = Buffer.alloc(4 + v.length * 4); h.writeInt32BE(v.length); v.forEach((x, k) => h.writeInt32BE(x, 4 + k * 4)); out.push(h); return; }
    case 12: { const h = Buffer.alloc(4 + v.length * 8); h.writeInt32BE(v.length); v.forEach((x, k) => h.writeBigInt64BE(BigInt(x), 4 + k * 8)); out.push(h); return; }
  }
}
function serversDatFile() { return path.join(minecraftDir(), 'servers.dat'); }
function readServersDatTyped() {
  const file = serversDatFile();
  if (!fs.existsSync(file)) return { gz: false, rootName: '', root: [] };
  let buf = fs.readFileSync(file);
  const gz = buf[0] === 0x1f && buf[1] === 0x8b;
  if (gz) buf = zlib.gunzipSync(buf);
  if (buf[0] !== 10) throw new Error('servers.dat повреждён');
  const st = { b: buf, i: 1 };
  const rootName = readString(st);
  return { gz, rootName, root: nbtPayload(st, 10) };
}
function writeServersDatTyped(d) {
  const out = [Buffer.from([10])];
  nbtWriteStr(out, d.rootName || '');
  nbtWrite(out, 10, d.root);
  let buf = Buffer.concat(out);
  if (d.gz) buf = zlib.gzipSync(buf);
  const file = serversDatFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '_old');
  fs.writeFileSync(file + '.tmp', buf);
  fs.renameSync(file + '.tmp', file);
}
function datServersList(d) {
  let e = d.root.find(([n]) => n === 'servers');
  if (!e) { e = ['servers', { t: 9, v: { et: 10, items: [] } }]; d.root.push(e); }
  return e[1].v;
}
const datStr = (compound, key) => { const f = compound.find(([n]) => n === key); return f ? String(f[1].v) : ''; };
const normIp = (ip) => String(ip || '').trim().toLowerCase().replace(/:25565$/, '');
function datAddServer(name, ip) {
  const d = readServersDatTyped();
  const list = datServersList(d);
  if (list.items.some(c => normIp(datStr(c, 'ip')) === normIp(ip))) return false;
  list.et = 10;
  list.items.push([['name', { t: 8, v: String(name || ip) }], ['ip', { t: 8, v: String(ip) }]]);
  writeServersDatTyped(d);
  return true;
}
function datRemoveServer(ip) {
  const file = serversDatFile();
  if (!fs.existsSync(file)) return false;
  const d = readServersDatTyped();
  const list = datServersList(d);
  const before = list.items.length;
  list.items = list.items.filter(c => normIp(datStr(c, 'ip')) !== normIp(ip));
  if (list.items.length === before) return false;
  writeServersDatTyped(d);
  return true;
}
function syncCustomServersToDat() {
  try { (settings.get('customServers') || []).forEach(s => datAddServer(s.name, s.ip)); }
  catch (err) { console.warn('[MGL2] servers.dat sync', err.message); }
}

const tcp = require('net');
const dns = require('dns');
function mcVarInt(n) {
  const bytes = [];
  n >>>= 0;
  do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; bytes.push(b); } while (n);
  return Buffer.from(bytes);
}
function mcReadVarInt(buf, off) {
  let n = 0, shift = 0, b;
  do {
    if (off >= buf.length) return null;
    b = buf[off++];
    n |= (b & 0x7f) << shift;
    shift += 7;
    if (shift > 35) throw new Error('VarInt слишком длинный');
  } while (b & 0x80);
  return { value: n, off };
}
function mcPacket(id, payload) {
  const body = Buffer.concat([mcVarInt(id), payload || Buffer.alloc(0)]);
  return Buffer.concat([mcVarInt(body.length), body]);
}
function parseMcAddress(addr) {
  const s = String(addr || '').trim();
  let m = s.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (m) return { host: m[1], port: m[2] ? +m[2] : null };
  m = s.match(/^([^:]+)(?::(\d+))?$/);
  if (m) return { host: m[1], port: m[2] ? +m[2] : null };
  return { host: s, port: null };
}
async function resolveMcAddress(addr) {
  const { host, port } = parseMcAddress(addr);
  if (port) return { host, port, origHost: host };
  if (!/^[\d.]+$/.test(host) && host !== 'localhost' && !host.includes(':')) {
    try {
      const srv = await dns.promises.resolveSrv('_minecraft._tcp.' + host);
      if (srv && srv[0]) return { host: srv[0].name, port: srv[0].port, origHost: host };
    } catch (e) {}
  }
  return { host, port: 25565, origHost: host };
}
function pingModern({ host, port, origHost }, timeout) {
  return new Promise((resolve, reject) => {
    const sock = tcp.createConnection({ host, port });
    let buf = Buffer.alloc(0), status = null, t0 = 0, tConnect = Date.now(), done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); sock.destroy(); err ? reject(err) : resolve(val); };
    let timer = setTimeout(() => finish(new Error('Таймаут')), timeout);
    sock.on('connect', () => {
      tConnect = Date.now();
      const portBuf = Buffer.alloc(2); portBuf.writeUInt16BE(port);
      const hostBuf = Buffer.from(origHost, 'utf8');
      sock.write(mcPacket(0, Buffer.concat([mcVarInt(-1), mcVarInt(hostBuf.length), hostBuf, portBuf, mcVarInt(1)])));
      sock.write(mcPacket(0));
    });
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      try {
        for (;;) {
          const len = mcReadVarInt(buf, 0);
          if (!len || buf.length < len.off + len.value) return;
          const pkt = buf.slice(len.off, len.off + len.value);
          buf = buf.slice(len.off + len.value);
          const id = mcReadVarInt(pkt, 0);
          if (id.value === 0 && !status) {
            const sl = mcReadVarInt(pkt, id.off);
            const json = JSON.parse(pkt.slice(sl.off, sl.off + sl.value).toString('utf8'));
            status = { json, latency: Date.now() - tConnect };
            t0 = Date.now();
            clearTimeout(timer);
            timer = setTimeout(() => finish(null, status), 1500);
            const p = Buffer.alloc(8); p.writeBigInt64BE(BigInt(t0));
            sock.write(mcPacket(1, p));
          } else if (id.value === 1 && status) {
            finish(null, { ...status, latency: Date.now() - t0 });
          }
        }
      } catch (err) { finish(err); }
    });
    sock.on('error', finish);
    sock.on('close', () => status ? finish(null, status) : finish(new Error('Соединение закрыто')));
  });
}
function pingLegacy({ host, port }, timeout) {
  return new Promise((resolve, reject) => {
    const sock = tcp.createConnection({ host, port });
    let buf = Buffer.alloc(0), t0 = Date.now(), done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); sock.destroy(); err ? reject(err) : resolve(val); };
    const timer = setTimeout(() => finish(new Error('Таймаут')), timeout);
    sock.on('connect', () => { t0 = Date.now(); sock.write(Buffer.from([0xfe, 0x01])); });
    sock.on('data', (c) => {
      buf = Buffer.concat([buf, c]);
      if (buf.length < 3 || buf[0] !== 0xff) return;
      const n = buf.readUInt16BE(1);
      if (buf.length < 3 + n * 2) return;
      const u16 = Buffer.from(buf.slice(3, 3 + n * 2));
      u16.swap16();
      const s = u16.toString('utf16le');
      let r;
      if (s.startsWith('§1\u0000')) {
        const p = s.split('\u0000');
        r = { version: p[2], motd: p[3], online: +p[4], max: +p[5] };
      } else {
        const p = s.split('§');
        r = { version: '', motd: p.slice(0, -2).join('§'), online: +p[p.length - 2], max: +p[p.length - 1] };
      }
      finish(null, { legacy: r, latency: Date.now() - t0 });
    });
    sock.on('error', finish);
    sock.on('close', () => finish(new Error('Соединение закрыто')));
  });
}
const MC_COLORS = {
  black: '#000000', dark_blue: '#0000AA', dark_green: '#00AA00', dark_aqua: '#00AAAA', dark_red: '#AA0000',
  dark_purple: '#AA00AA', gold: '#FFAA00', gray: '#AAAAAA', dark_gray: '#555555', blue: '#5555FF', green: '#55FF55',
  aqua: '#55FFFF', red: '#FF5555', light_purple: '#FF55FF', yellow: '#FFFF55', white: '#FFFFFF'
};
const MC_CODE_COLORS = '0123456789abcdef'.split('').reduce((m, c, i) => { m[c] = Object.values(MC_COLORS)[i]; return m; }, {});
function legacyToSegments(text, base) {
  const segs = [];
  let cur = { ...base, text: '' };
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '§' && i + 1 < s.length) {
      const c = s[++i].toLowerCase();
      if (cur.text) { segs.push(cur); }
      if (MC_CODE_COLORS[c]) cur = { ...base, color: MC_CODE_COLORS[c], bold: false, italic: false, underlined: false, strikethrough: false, text: '' };
      else if (c === 'l') cur = { ...cur, bold: true, text: '' };
      else if (c === 'o') cur = { ...cur, italic: true, text: '' };
      else if (c === 'n') cur = { ...cur, underlined: true, text: '' };
      else if (c === 'm') cur = { ...cur, strikethrough: true, text: '' };
      else if (c === 'r') cur = { ...base, text: '' };
      else cur = { ...cur, text: '' };
    } else cur.text += s[i];
  }
  if (cur.text) segs.push(cur);
  return segs;
}
function componentToSegments(c, inherit) {
  inherit = inherit || {};
  if (c == null) return [];
  if (typeof c === 'string') return legacyToSegments(c, inherit);
  if (Array.isArray(c)) return c.flatMap(x => componentToSegments(x, inherit));
  const style = { ...inherit };
  if (c.color) style.color = MC_COLORS[c.color] || (/^#[0-9a-f]{6}$/i.test(c.color) ? c.color : style.color);
  ['bold', 'italic', 'underlined', 'strikethrough'].forEach(k => { if (k in c) style[k] = !!c[k]; });
  let segs = c.text != null ? legacyToSegments(String(c.text), style) : (c.translate ? [{ ...style, text: String(c.translate) }] : []);
  if (Array.isArray(c.extra)) segs = segs.concat(c.extra.flatMap(x => componentToSegments(x, style)));
  return segs;
}
async function pingServer(addr) {
  const target = await resolveMcAddress(addr);
  try {
    const r = await pingModern(target, 5000);
    const j = r.json || {};
    return {
      ok: true, latency: r.latency,
      version: String((j.version && j.version.name) || '').replace(/§./g, ''), protocol: j.version ? j.version.protocol : null,
      online: j.players ? j.players.online : 0, max: j.players ? j.players.max : 0,
      sample: ((j.players && j.players.sample) || []).map(p => String(p.name || '').replace(/§./g, '')).filter(Boolean).slice(0, 12),
      motd: componentToSegments(j.description),
      favicon: typeof j.favicon === 'string' && j.favicon.startsWith('data:image/') ? j.favicon : null
    };
  } catch (modernErr) {
    try {
      const r = await pingLegacy(target, 4000);
      return { ok: true, latency: r.latency, version: r.legacy.version, online: r.legacy.online, max: r.legacy.max, sample: [], motd: legacyToSegments(r.legacy.motd), favicon: null };
    } catch (e) { return { ok: false, error: modernErr.message }; }
  }
}
ipcMain.handle('srv:ping', (e, addr) => pingServer(addr).catch(err => ({ ok: false, error: err.message })));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1170, height: 722, minWidth: 940, minHeight: 600,
    frame: false, backgroundColor: '#0D0F0C', show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png')
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools({ mode: 'detach' });
  // Закрытие окна при фоновой работе (загрузки / свой сервер / игра) — сворачиваем в трей, а не выходим
  mainWindow.on('close', (e) => {
    if (quittingApp) return;
    const busy = busyParts();
    if (!busy.length) return;
    e.preventDefault();
    hideToTray(busy);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  // Падение/зависание окна, где работали плагины → плагин-система отключается, лог сохраняется, окно перезагружается
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    if (plugins.onRendererGone(details) && mainWindow && !mainWindow.isDestroyed()) setTimeout(() => mainWindow && mainWindow.reload(), 300);
  });
  mainWindow.on('unresponsive', () => {
    if (!plugins.onRendererUnresponsive() || !mainWindow) return;
    try { mainWindow.webContents.forcefullyCrashRenderer(); } catch (e) {}
    setTimeout(() => mainWindow && !mainWindow.isDestroyed() && mainWindow.reload(), 500);
  });
}

let tray = null, quittingApp = false, rendererBusy = 0, trayHinted = false, trayTimer = null;
function busyParts() {
  const parts = [];
  if (rendererBusy > 0) parts.push(`загрузки: ${rendererBusy}`);
  try { if (serverProcs.size) parts.push(`серверы: ${serverProcs.size}`); } catch (e) {}
  try { const g = manager.getRunning().length; if (g) parts.push(`игра: ${g}`); } catch (e) {}
  return parts;
}
function trayIcon() {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'icon.ico') : null,   // установленная версия (вне asar)
    path.join(__dirname, '..', 'assets', 'icon.ico'),
    path.join(__dirname, '..', 'assets', 'icons', 'icon.png')
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      let img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return p.endsWith('.png') ? img.resize({ width: 16, height: 16 }) : img;
    } catch (e) {}
  }
  return nativeImage.createEmpty();
}
function showFromTray() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  destroyTray();
}
function quitFully() { quittingApp = true; app.quit(); }
function updateTray() {
  if (!tray) return;
  const busy = busyParts();
  tray.setToolTip('Magma Launcher' + (busy.length ? ' — ' + busy.join(' · ') : ''));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть Magma Launcher', click: showFromTray },
    { label: busy.length ? 'В работе: ' + busy.join(', ') : 'Задач нет', enabled: false },
    { type: 'separator' },
    { label: 'Выйти полностью', click: quitFully }
  ]));
}
function ensureTray() {
  if (tray) return;
  tray = new Tray(trayIcon());
  tray.on('click', showFromTray);
  tray.on('double-click', showFromTray);
  updateTray();
  // Пока окно скрыто: обновляем статус и сами выходим, когда все задачи закончились
  trayTimer = setInterval(() => {
    if (!tray) return;
    if (busyParts().length === 0) { quitFully(); return; }
    updateTray();
  }, 4000);
}
function destroyTray() {
  if (trayTimer) { clearInterval(trayTimer); trayTimer = null; }
  if (tray) { try { tray.destroy(); } catch (e) {} tray = null; }
}
function hideToTray(busy) {
  if (!mainWindow) return;
  mainWindow.hide();
  ensureTray();
  if (!trayHinted && tray && process.platform === 'win32') {
    trayHinted = true;
    try {
      tray.displayBalloon({
        title: 'Magma Launcher работает в фоне',
        content: `${busy.join(', ')}. Значок в трее - открыть лаунчер или выйти. После завершения задач лаунчер закроется сам.`
      });
    } catch (e) {}
  }
}
ipcMain.on('app:busy', (e, n) => { rendererBusy = Math.max(0, parseInt(n, 10) || 0); });

ipcMain.handle('viz:sourceId', async () => {
  try {
    const src = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
    return src && src[0] ? src[0].id : null;
  } catch (e) { return null; }
});
function setupDisplayMedia() {
  try {
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        const src = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
        callback(src && src[0] ? { video: src[0], audio: 'loopback' } : {});
      } catch (e) { callback({}); }
    });
  } catch (e) { console.warn('[MGL2] setDisplayMediaRequestHandler', e.message); }
}

ipcMain.on('minimize-window', () => mainWindow && mainWindow.minimize());
ipcMain.on('maximize-window', () => { if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });
ipcMain.on('close-window', () => mainWindow && mainWindow.close());
ipcMain.on('focus-window', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.on('open-folder', (e, type) => {
  const base = minecraftDir();
  const map = { game: base, mods: path.join(base, 'mods'), resourcepacks: path.join(base, 'resourcepacks'), skins: path.join(base, 'mgl', 'skin') };
  const t = map[type] || base;
  try { fs.mkdirSync(t, { recursive: true }); } catch (err) {}
  shell.openPath(t);
});
ipcMain.on('open-server-folder', (e, id) => {
  const t = path.join(minecraftDir(), 'mgl', 'servers', String(id || 'default'));
  try { fs.mkdirSync(t, { recursive: true }); } catch (err) {}
  shell.openPath(t);
});
ipcMain.on('open-url', (e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });
ipcMain.handle('mc:getInstalled', () => { const r = describeInstalled(); console.log('[MGL2] mc:getInstalled ->', r.map(x => x.folder).join(', ')); return r; });
ipcMain.handle('mc:getServers', () => parseServersDat());
ipcMain.handle('srv:listCustom', () => settings.get('customServers') || []);
ipcMain.handle('srv:listManaged', () => settings.get('managedServers') || []);

ipcMain.handle('srv:addCustom', (e, { name, ip }) => {
  const list = settings.get('customServers') || [];
  const id = 'cst_' + Date.now().toString(36);
  const entry = { id, name: (name || ip || 'Сервер').trim(), ip: (ip || '').trim(), ts: Date.now() };
  if (!entry.ip) return { ok: false, error: 'IP не указан' };
  list.push(entry);
  settings.update({ customServers: list }); settings.save();
  try { datAddServer(entry.name, entry.ip); } catch (err) { console.warn('[MGL2] servers.dat write', err.message); }
  return { ok: true, entry };
});

ipcMain.handle('srv:removeCustom', (e, id) => {
  const all = settings.get('customServers') || [];
  const target = all.find(s => s.id === id);
  settings.update({ customServers: all.filter(s => s.id !== id) }); settings.save();
  if (target) { try { datRemoveServer(target.ip); } catch (err) { console.warn('[MGL2] servers.dat write', err.message); } }
  return { ok: true };
});

ipcMain.handle('srv:datAdd', (e, { name, ip }) => {
  try { if (!ip) return { ok: false, error: 'IP не указан' }; datAddServer(name || ip, ip); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('srv:datRemove', (e, ip) => {
  try { datRemoveServer(ip); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('srv:removeManaged', (e, id) => {
  if (serverProcs.has(id)) return { ok: false, error: 'Сначала остановите сервер' };
  const list = settings.get('managedServers') || [];
  const target = list.find(s => s.id === id);
  if (target) {
    try {
      const dir = path.join(minecraftDir(), 'mgl', 'servers', id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) { console.warn('[MGL2] removeManaged', err); }
  }
  settings.update({ managedServers: list.filter(s => s.id !== id) }); settings.save();
  return { ok: true };
});

ipcMain.handle('srv:createManaged', async (e, { name, mcVersion, memory }) => {
  if (!name || !mcVersion) return { ok: false, error: 'Нужны имя и версия' };
  const id = 'mgl_' + Date.now().toString(36);
  const dir = path.join(minecraftDir(), 'mgl', 'servers', id);
  try { fs.mkdirSync(dir, { recursive: true }); } catch (err) {}
  const send = (progress, status) => sendRenderer('srv:createProgress', { id, progress, status });
  try {
    send(5, 'Поиск версии…');
    const manifest = await httpsJson('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    const vmeta = (manifest.versions || []).find(v => v.id === mcVersion);
    if (!vmeta) throw new Error('Версия не найдена в манифесте Mojang');
    send(20, 'Загрузка профиля…');
    const vdata = await httpsJson(vmeta.url);
    const srv = vdata.downloads && vdata.downloads.server;
    if (!srv || !srv.url) throw new Error('У этой версии нет серверного jar');
    send(35, 'Скачивание server.jar…');
    await downloadFile(srv.url, path.join(dir, 'server.jar'), (done, total) => {
      if (total) send(35 + Math.floor((done / total) * 55), `Скачано ${(done / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} МБ`);
    });
    send(92, 'Настройка…');
    fs.writeFileSync(path.join(dir, 'eula.txt'), '# EULA accepted via MGL2\neula=true\n');
    if (!fs.existsSync(path.join(dir, 'server.properties'))) {
      fs.writeFileSync(path.join(dir, 'server.properties'),
        `motd=${name}\nserver-port=25565\nmax-players=20\nonline-mode=false\n`);
    }
    const list = settings.get('managedServers') || [];
    const javaMajor = vdata.javaVersion && vdata.javaVersion.majorVersion ? vdata.javaVersion.majorVersion : undefined;
    const entry = { id, name, mcVersion, memory: memory || 1024, createdAt: Date.now(), dir, javaMajor };
    list.push(entry);
    settings.update({ managedServers: list }); settings.save();
    send(100, 'Готово!');
    return { ok: true, entry };
  } catch (err) {
    send(0, 'Ошибка: ' + err.message);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('srv:availableVersions', async () => {
  try {
    const m = await httpsJson('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    return (m.versions || []).filter(v => v.type === 'release').map(v => v.id).slice(0, 60);
  } catch (e) { return ['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.12.2']; }
});

const serverProcs = new Map();   // id -> { child, state, startedAt, stopping, restart, killTimer }
const serverLogs = new Map();    // id -> [{t, line, stream}]
const SERVER_LOG_MAX = 1500;
function managedEntry(id) { return (settings.get('managedServers') || []).find(s => s.id === id); }
function managedDir(id) { return path.join(minecraftDir(), 'mgl', 'servers', id); }
function srvLog(id, line, stream) {
  const list = serverLogs.get(id) || [];
  const entry = { t: Date.now(), line: String(line), stream: stream || 'stdout' };
  list.push(entry);
  if (list.length > SERVER_LOG_MAX) list.splice(0, list.length - SERVER_LOG_MAX);
  serverLogs.set(id, list);
  sendRenderer('srv:log', { id, ...entry });
}
function srvState(id, state, extra) {
  const p = serverProcs.get(id);
  if (p) p.state = state;
  sendRenderer('srv:state', { id, state, pid: p && p.child ? p.child.pid : null, startedAt: p ? p.startedAt : null, ...(extra || {}) });
}
function readServerProps(id) {
  const out = {};
  try {
    fs.readFileSync(path.join(managedDir(id), 'server.properties'), 'utf8').split(/\r?\n/).forEach(l => {
      const m = l.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) out[m[1].trim()] = decodePropValue(m[2].trim());
    });
  } catch (e) {}
  return out;
}
function decodePropValue(v) {
  return v.replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (m, hex, ch) => hex ? String.fromCharCode(parseInt(hex, 16))
    : ({ t: '\t', n: '\n', r: '\r', f: '\f' }[ch] || ch));
}
function encodePropValue(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/[:=]/g, c => '\\' + c)
    .replace(/[^\x20-\x7e]/g, c => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
}
function serverJavaMajor(mc) {
  const p = String(mc || '').split('.').map(n => parseInt(n, 10) || 0);
  if (p[0] !== 1) return 21;
  const minor = p[1], patch = p[2] || 0;
  if (minor >= 21 || (minor === 20 && patch >= 5)) return 21;
  if (minor >= 18) return 17;
  if (minor === 17) return 16;
  return 8;
}
async function startManagedServer(id) {
  const entry = managedEntry(id);
  if (!entry) return { ok: false, error: 'Сервер не найден' };
  if (serverProcs.has(id)) return { ok: false, error: 'Сервер уже запущен' };
  const dir = managedDir(id);
  if (!fs.existsSync(path.join(dir, 'server.jar'))) return { ok: false, error: 'Нет server.jar — пересоздайте сервер' };
  const proc = { child: null, state: 'starting', startedAt: Date.now(), stopping: false, restart: false, killTimer: null };
  serverProcs.set(id, proc);
  srvState(id, 'starting');
  try {
    const major = entry.javaMajor || serverJavaMajor(entry.mcVersion);
    srvLog(id, `Подготовка Java ${major}…`, 'system');
    let java = entry.javaPath && fs.existsSync(entry.javaPath) ? entry.javaPath : manager.resolveLaunchJava(major, null);
    if (!java) {
      srvLog(id, `Java ${major} не найдена — загрузка…`, 'system');
      java = await manager.ensureJava(major, (p, s) => sendRenderer('java:installProgress', { major, progress: p, status: s }));
    }
    if (!java) throw new Error('Не удалось получить Java ' + major);
    const console_ = path.join(path.dirname(java), 'java.exe');
    if (/javaw\.exe$/i.test(java) && fs.existsSync(console_)) java = console_;
    const mem = entry.memory || 1024;
    const args = [`-Xmx${mem}M`, `-Xms${Math.min(mem, 512)}M`]
      .concat(MinecraftManager.splitArgs(entry.jvmArgs || ''), ['-jar', 'server.jar', 'nogui']);
    srvLog(id, `> ${path.basename(java)} ${args.join(' ')}`, 'system');
    if (!serverProcs.has(id)) return { ok: false, error: 'Запуск отменён' };
    const child = spawn(java, args, { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    proc.child = child;
    srvState(id, 'starting');
    const pipe = (stream, label) => {
      let buf = '';
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).replace(/\r$/, '');
          buf = buf.slice(i + 1);
          if (!line) continue;
          srvLog(id, line, label);
          if (proc.state === 'starting' && /Done \(\d/.test(line)) {
            const props = readServerProps(id);
            srvState(id, 'running', { port: +(props['server-port'] || 25565) });
          }
        }
      });
      stream.on('end', () => { if (buf) srvLog(id, buf, label); });
    };
    pipe(child.stdout, 'stdout');
    pipe(child.stderr, 'stderr');
    child.on('error', (err) => {
      srvLog(id, 'Ошибка запуска: ' + err.message, 'stderr');
      serverProcs.delete(id);
      srvState(id, 'stopped', { code: -1, crashed: true });
    });
    child.on('exit', (code) => {
      clearTimeout(proc.killTimer);
      serverProcs.delete(id);
      srvLog(id, `Процесс завершён (код ${code})`, 'system');
      srvState(id, 'stopped', { code, crashed: !proc.stopping && code !== 0 });
      if (proc.restart) setTimeout(() => startManagedServer(id), 600);
    });
    return { ok: true };
  } catch (err) {
    if (err && err.code === 'JAVA_MISSING') sendRenderer('java:missing', { major: err.major, server: id });
    serverProcs.delete(id);
    srvLog(id, 'Ошибка: ' + err.message, 'stderr');
    srvState(id, 'stopped', { code: -1, crashed: true });
    return { ok: false, error: err.message };
  }
}
function stopManagedServer(id, { restart = false, force = false } = {}) {
  const p = serverProcs.get(id);
  if (!p) return { ok: false, error: 'Сервер не запущен' };
  p.restart = restart;
  if (!p.child) { serverProcs.delete(id); srvState(id, 'stopped', { code: 0 }); return { ok: true }; }
  if (force) { try { p.child.kill(); } catch (e) {} return { ok: true }; }
  p.stopping = true;
  srvState(id, 'stopping');
  try { p.child.stdin.write('stop\n'); } catch (e) {}
  clearTimeout(p.killTimer);
  p.killTimer = setTimeout(() => { srvLog(id, 'Сервер не остановился за 30 с — принудительное завершение', 'system'); try { p.child.kill(); } catch (e) {} }, 30000);
  return { ok: true };
}
ipcMain.handle('srv:start', (e, id) => startManagedServer(id));
ipcMain.handle('srv:stop', (e, id, force) => stopManagedServer(id, { force: !!force }));
ipcMain.handle('srv:restart', async (e, id) => serverProcs.has(id) ? stopManagedServer(id, { restart: true }) : startManagedServer(id));
ipcMain.handle('srv:command', (e, { id, command }) => {
  const p = serverProcs.get(id);
  const cmd = String(command || '').replace(/[\r\n]+/g, ' ').trim();
  if (!cmd) return { ok: false, error: 'Пустая команда' };
  if (!p || !p.child) return { ok: false, error: 'Сервер не запущен' };
  srvLog(id, '> ' + cmd, 'cmd');
  if (/^stop$/i.test(cmd)) p.stopping = true;
  try { p.child.stdin.write(cmd + '\n'); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('srv:getLog', (e, id) => serverLogs.get(id) || []);
ipcMain.handle('srv:clearLog', (e, id) => { serverLogs.set(id, []); return { ok: true }; });
ipcMain.handle('srv:status', () => Array.from(serverProcs.entries()).map(([id, p]) => ({
  id, state: p.state, pid: p.child ? p.child.pid : null, startedAt: p.startedAt
})));
function lanAddress() {
  const VIRTUAL = /vethernet|wsl|hyper-v|docker|virtualbox|vmware|vbox|loopback|tailscale|zerotier|hamachi|radmin|xray|happ|v2ray|vpn|wintun|wireguard|tap-|tun\d|outline/i;
  const real = [], virt = [];
  Object.entries(os.networkInterfaces()).forEach(([name, list]) => (list || []).forEach(a => {
    if ((a.family === 'IPv4' || a.family === 4) && !a.internal && !a.address.startsWith('169.254.')) (VIRTUAL.test(name) ? virt : real).push(a.address);
  }));
  const rank = (ip) => /^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
  const pick = (arr) => arr.slice().sort((x, y) => rank(x) - rank(y))[0];
  return pick(real) || pick(virt) || '127.0.0.1';
}
ipcMain.handle('srv:info', (e, id) => {
  const props = readServerProps(id);
  return {
    port: +(props['server-port'] || 25565), motd: props.motd || '', maxPlayers: +(props['max-players'] || 20),
    onlineMode: props['online-mode'] !== 'false', serverIp: props['server-ip'] || '', lanIp: lanAddress()
  };
});
ipcMain.handle('srv:readProps', (e, id) => {
  const file = path.join(managedDir(id), 'server.properties');
  return { exists: fs.existsSync(file), props: readServerProps(id) };
});
ipcMain.handle('srv:writeProps', (e, { id, props }) => {
  try {
    if (!managedEntry(id)) return { ok: false, error: 'Сервер не найден' };
    const file = path.join(managedDir(id), 'server.properties');
    const clean = (v) => encodePropValue(String(v == null ? '' : v).replace(/[\r\n]+/g, ' '));
    const pending = {};
    Object.entries(props || {}).forEach(([k, v]) => {
      if (/^[A-Za-z0-9._-]+$/.test(k)) pending[k] = clean(v);
    });
    const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : ['#Minecraft server properties'];
    const out = lines.map(l => {
      const m = l.match(/^([^#=\s][^=]*)=(.*)$/);
      if (!m) return l;
      const k = m[1].trim();
      if (!(k in pending)) return l;
      const v = pending[k];
      delete pending[k];
      return `${k}=${v}`;
    });
    while (out.length && out[out.length - 1] === '') out.pop();
    Object.entries(pending).forEach(([k, v]) => out.push(`${k}=${v}`));
    fs.writeFileSync(file, out.join('\n') + '\n');
    return { ok: true, restartNeeded: serverProcs.has(id) };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('srv:updateManaged', (e, { id, patch }) => {
  const list = settings.get('managedServers') || [];
  const it = list.find(s => s.id === id);
  if (!it) return { ok: false, error: 'Сервер не найден' };
  const p = patch || {};
  if (p.memory) it.memory = Math.max(512, parseInt(p.memory, 10) || 1024);
  if (typeof p.jvmArgs === 'string') it.jvmArgs = p.jvmArgs;
  if (typeof p.name === 'string' && p.name.trim()) it.name = p.name.trim();
  settings.update({ managedServers: list }); settings.save();
  return { ok: true, entry: it };
});
let quittingWithServers = false;
app.on('before-quit', (e) => {
  quittingApp = true;
  if (quittingWithServers || !serverProcs.size) return;
  e.preventDefault();
  quittingWithServers = true;
  for (const id of Array.from(serverProcs.keys())) stopManagedServer(id);
  const deadline = setTimeout(() => { for (const p of serverProcs.values()) { try { p.child && p.child.kill(); } catch (err) {} } app.quit(); }, 20000);
  const poll = setInterval(() => { if (!serverProcs.size) { clearInterval(poll); clearTimeout(deadline); app.quit(); } }, 300);
});
function netBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, redirect: 'follow', useSessionCookies: false });
    req.setHeader('User-Agent', 'MGL2/0.1');
    req.on('response', res => {
      if (res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode + ' ' + url));
      const chunks = [];
      res.on('data', c => chunks.push(Buffer.from(c)));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}
async function httpsJson(url) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const buf = await netBuffer(url);
      return JSON.parse(buf.toString('utf8'));
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 500 * (i + 1))); }
  }
  throw lastErr;
}
function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, redirect: 'follow', useSessionCookies: false });
    req.setHeader('User-Agent', 'MGL2/0.1');
    req.on('response', res => {
      if (res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode));
      const total = parseInt(res.headers['content-length'] || '0', 10);
      try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
      const out = fs.createWriteStream(dest);
      let done = 0;
      res.on('data', c => { done += c.length; onProgress && onProgress(done, total); out.write(Buffer.from(c)); });
      res.on('end', () => { out.end(() => resolve()); });
      res.on('error', reject);
      out.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}
ipcMain.handle('fetch-json', async (e, url) => {
  try { return await httpsJson(url); } catch (err) { return null; }
});

const isPng = (b) => b && b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
ipcMain.handle('skin:fetch', async (e, { mode, value } = {}) => {
  try {
    value = String(value || '').trim();
    if (mode === 'url') {
      if (!/^https?:\/\//i.test(value)) return { ok: false, error: 'Ссылка должна начинаться с http(s)://' };
      const buf = await netBuffer(value);
      if (!isPng(buf)) return { ok: false, error: 'По ссылке не PNG-изображение' };
      const name = decodeURIComponent((value.split(/[?#]/)[0].split('/').pop() || 'skin')).replace(/\.png$/i, '') || 'skin';
      return { ok: true, data: buf.toString('base64'), name };
    }
    if (mode === 'nick') {
      if (!/^[A-Za-z0-9_]{2,16}$/.test(value)) return { ok: false, error: 'Ник: 2–16 символов, латиница, цифры, _' };
      let skinUrl = null, name = value;
      try {
        const prof = await httpsJson('https://api.mojang.com/users/profiles/minecraft/' + encodeURIComponent(value));
        if (prof && prof.id) {
          name = prof.name || value;
          const sess = await httpsJson('https://sessionserver.mojang.com/session/minecraft/profile/' + prof.id);
          const prop = sess && (sess.properties || []).find(p => p.name === 'textures');
          if (prop) {
            const tex = JSON.parse(Buffer.from(prop.value, 'base64').toString('utf8'));
            skinUrl = tex.textures && tex.textures.SKIN && tex.textures.SKIN.url;
          }
        }
      } catch (err) { /* нет такого ника / API недоступно → зеркало */ }
      const urls = skinUrl ? [skinUrl.replace(/^http:/, 'https:'), skinUrl] : [];
      urls.push('https://mc-heads.net/skin/' + encodeURIComponent(value), 'https://minotar.net/skin/' + encodeURIComponent(value));
      for (const u of urls) {
        try { const buf = await netBuffer(u); if (isPng(buf)) return { ok: true, data: buf.toString('base64'), name }; } catch (err) {}
      }
      return { ok: false, error: 'Скин игрока «' + value + '» не найден' };
    }
    return { ok: false, error: 'Неизвестный режим' };
  } catch (err) { return { ok: false, error: err.message }; }
});

// ---------- Обновление лаунчера (GitHub Releases) ----------
const UPDATE_REPO = 'AuriXDev/Magma-Launcher';
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('update:download', async (e, params) => {
  const p = params || {};
  const repo = /^[\w.-]+\/[\w.-]+$/.test(p.repo || '') ? p.repo : UPDATE_REPO;
  const send = (d) => { try { mainWindow && mainWindow.webContents.send('update:progress', d); } catch (err) {} };
  try {
    send({ progress: 0, status: 'Ищу релиз…' });
    const rel = await httpsJson(`https://api.github.com/repos/${repo}/releases/latest`);
    const assets = (rel && rel.assets) || [];
    const asset = assets.find(a => /setup.*\.exe$/i.test(a.name)) || assets.find(a => /\.exe$/i.test(a.name));
    if (!asset) return { ok: false, error: 'В последнем релизе нет .exe установщика' };
    const dir = path.join(os.tmpdir(), 'mgl-update');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, path.basename(asset.name));
    await downloadFile(asset.browser_download_url, dest, (done, total) => {
      const t = total || asset.size || 0;
      send({ progress: t ? Math.floor(done / t * 100) : 0, status: `Скачивание ${rel.tag_name || ''}` });
    });
    send({ progress: 100, status: 'Запуск установщика…' });
    spawn(dest, ['/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 800);
    return { ok: true, version: rel.tag_name };
  } catch (err) { return { ok: false, error: err.message }; }
});

const { pathToFileURL } = require('url');
function bgDir(kind) { return path.join(minecraftDir(), 'mgl', 'data', kind === 'obj' ? 'obj' : 'pictures'); }
function bgReadHistory(kind) {
  try { return JSON.parse(fs.readFileSync(path.join(bgDir(kind), 'history.json'), 'utf8')) || []; } catch (e) { return []; }
}
function bgWriteHistory(kind, list) {
  fs.mkdirSync(bgDir(kind), { recursive: true });
  fs.writeFileSync(path.join(bgDir(kind), 'history.json'), JSON.stringify(list, null, 2));
}
function bgInside(kind, abs) { return path.resolve(abs).startsWith(path.resolve(bgDir(kind)) + path.sep); }
function bgDecorate(kind, it) {
  const base = kind === 'obj' ? path.join(bgDir(kind), it.id) : bgDir(kind);
  const out = { ...it };
  if (kind === 'obj') {
    if (it.tex) out.texUrl = pathToFileURL(path.join(base, it.tex)).href;
  } else if (it.file) out.url = pathToFileURL(path.join(base, it.file)).href;
  return out;
}
function bgNewId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
// Копирует .obj (+ .mtl и текстуры из map_Kd) или распаковывает .zip в папку модели
function bgImportObj(src, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  if (/\.zip$/i.test(src)) {
    require('./zip-extract').extractAll(fs.readFileSync(src), targetDir);
  } else {
    fs.copyFileSync(src, path.join(targetDir, path.basename(src)));
    const objText = fs.readFileSync(src, 'utf8');
    const mtlLib = (objText.match(/^mtllib\s+(.+)$/m) || [])[1];
    if (mtlLib) {
      const mtlSrc = path.join(path.dirname(src), mtlLib.trim());
      if (fs.existsSync(mtlSrc)) {
        fs.copyFileSync(mtlSrc, path.join(targetDir, path.basename(mtlSrc)));
        const mtlText = fs.readFileSync(mtlSrc, 'utf8');
        (mtlText.match(/^map_Kd\s+(.+)$/gm) || []).forEach(line => {
          const tex = line.replace(/^map_Kd\s+/, '').trim();
          const texSrc = path.join(path.dirname(mtlSrc), tex);
          if (fs.existsSync(texSrc)) fs.copyFileSync(texSrc, path.join(targetDir, path.basename(tex)));
        });
      }
    }
  }
  const files = [];
  (function walk(d) { fs.readdirSync(d).forEach(n => { const a = path.join(d, n); fs.statSync(a).isDirectory() ? walk(a) : files.push(path.relative(targetDir, a)); }); })(targetDir);
  const obj = files.find(f => /\.obj$/i.test(f));
  if (!obj) throw new Error('В файле нет .obj модели');
  let tex = null;
  const mtl = files.find(f => /\.mtl$/i.test(f));
  if (mtl) {
    const m = fs.readFileSync(path.join(targetDir, mtl), 'utf8').match(/^map_Kd\s+(.+)$/m);
    if (m) tex = files.find(f => path.basename(f).toLowerCase() === path.basename(m[1].trim()).toLowerCase()) || null;
  }
  if (!tex) tex = files.find(f => /\.png$/i.test(f)) || null;
  return { obj, mtl: mtl || null, tex };
}
function bgSeedObj() {
  const zip = path.join(__dirname, '..', 'assets', 'obj', 'PumkinMinecraft.zip');
  if (!fs.existsSync(zip)) return [];
  const id = 'pumpkin';
  const files = bgImportObj(zip, path.join(bgDir('obj'), id));
  const list = [{ id, name: 'Тыква', ...files, x: 0.18, y: 0.05, scale: 0.55, rx: -20, ry: 35, rz: 0, spin: { x: false, y: true, z: false }, speed: 12, ts: Date.now() }];
  bgWriteHistory('obj', list);
  return list;
}

ipcMain.handle('bg:list', (e, kind) => {
  try {
    let list = bgReadHistory(kind);
    if (kind === 'obj' && !list.length && !fs.existsSync(path.join(bgDir('obj'), 'history.json'))) list = bgSeedObj();
    return list.map(it => bgDecorate(kind, it));
  } catch (err) { return []; }
});
ipcMain.handle('bg:save', (e, params) => {
  try {
    const { kind, entry, srcPath } = params || {};
    const list = bgReadHistory(kind);
    const item = { ...entry };
    delete item.url; delete item.texUrl;
    if (srcPath) {
      if (!fs.existsSync(srcPath)) return { ok: false, error: 'Файл не найден' };
      item.id = bgNewId();
      item.name = path.basename(srcPath).replace(/\.[^.]+$/, '');
      if (kind === 'obj') Object.assign(item, bgImportObj(srcPath, path.join(bgDir('obj'), item.id)));
      else {
        fs.mkdirSync(bgDir(kind), { recursive: true });
        item.file = item.id + path.extname(srcPath).toLowerCase();
        fs.copyFileSync(srcPath, path.join(bgDir(kind), item.file));
      }
    }
    if (!item.id) return { ok: false, error: 'Нет id' };
    item.ts = Date.now();
    const rest = list.filter(x => x.id !== item.id);
    bgWriteHistory(kind, [item, ...rest]);
    return { ok: true, entry: bgDecorate(kind, item) };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('bg:remove', (e, params) => {
  try {
    const { kind, id } = params || {};
    const list = bgReadHistory(kind);
    const it = list.find(x => x.id === id);
    if (!it) return { ok: false, error: 'Не найдено' };
    const target = kind === 'obj' ? path.join(bgDir('obj'), it.id) : path.join(bgDir(kind), it.file || '');
    if (bgInside(kind, target) && fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    bgWriteHistory(kind, list.filter(x => x.id !== id));
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('bg:loadObj', (e, id) => {
  try {
    const it = bgReadHistory('obj').find(x => x.id === id);
    if (!it) return null;
    const base = path.join(bgDir('obj'), it.id);
    const read = (f) => { const a = path.join(base, f); return f && bgInside('obj', a) && fs.existsSync(a) ? fs.readFileSync(a, 'utf8') : ''; };
    const texAbs = it.tex ? path.join(base, it.tex) : null;
    const tex = texAbs && bgInside('obj', texAbs) && fs.existsSync(texAbs)
      ? 'data:image/png;base64,' + fs.readFileSync(texAbs).toString('base64') : null;
    return { obj: read(it.obj), mtl: it.mtl ? read(it.mtl) : '', texUrl: tex };
  } catch (err) { return null; }
});
ipcMain.handle('dialog:pickFile', async (e, params) => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: (params && params.filters) || [] });
  return r.canceled ? null : r.filePaths[0];
});

const MODRINTH_API = 'https://api.modrinth.com/v2';
function contentDirFor(projectType) {
  const base = minecraftDir();
  if (projectType === 'resourcepack') return path.join(base, 'resourcepacks');
  if (projectType === 'shader') return path.join(base, 'shaderpacks');
  return path.join(base, 'mods');
}

ipcMain.handle('modrinth:search', async (e, params) => {
  try {
    const p = params || {};
    const query = String(p.query || '').trim();
    const projectType = p.projectType || 'mod';
    const facets = [[`project_type:${projectType}`]];
    if (p.gameVersion) facets.push([`versions:${p.gameVersion}`]);
    // Лоадер (forge/fabric…) — только для модов и модпаков; у шейдеров/ресурспаков другие категории
    if (p.loader && (projectType === 'mod' || projectType === 'modpack')) facets.push([`categories:${p.loader}`]);
    const limit = Math.max(1, Math.min(50, p.limit || 20));
    const offset = Math.max(0, p.offset || 0);
    const url = `${MODRINTH_API}/search?limit=${limit}&offset=${offset}` +
      (query ? `&query=${encodeURIComponent(query)}` : '') +
      `&facets=${encodeURIComponent(JSON.stringify(facets))}` +
      `&index=${encodeURIComponent(p.sort || 'relevance')}`;
    const data = await httpsJson(url);
    return { ok: true, hits: data.hits || [], total: data.total_hits || 0 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('modrinth:versions', async (e, params) => {
  try {
    const p = params || {};
    if (!p.slug) throw new Error('slug не указан');
    const parts = [];
    if (p.loader) parts.push(`loaders=${encodeURIComponent(JSON.stringify([p.loader]))}`);
    if (p.gameVersion) parts.push(`game_versions=${encodeURIComponent(JSON.stringify([p.gameVersion]))}`);
    const url = `${MODRINTH_API}/project/${encodeURIComponent(p.slug)}/version` +
      (parts.length ? '?' + parts.join('&') : '');
    const list = await httpsJson(url);
    return { ok: true, versions: list || [] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

function contentIndexFile() { return path.join(minecraftDir(), 'mgl', 'data', 'content-index.json'); }
function readContentIndex() {
  try { return JSON.parse(fs.readFileSync(contentIndexFile(), 'utf8')) || {}; } catch (e) { return {}; }
}
function writeContentIndex(idx) {
  try {
    fs.mkdirSync(path.dirname(contentIndexFile()), { recursive: true });
    fs.writeFileSync(contentIndexFile(), JSON.stringify(idx, null, 2));
  } catch (e) { console.warn('[MGL2] content-index', e.message); }
}
function findInstalledProject(idx, projectId, dir) {
  for (const [fn, m] of Object.entries(idx)) {
    if (m.project_id !== projectId) continue;
    const live = path.join(dir, fn), off = live + '.disabled';
    if (fs.existsSync(live)) return { filename: fn, path: live, disabled: false };
    if (fs.existsSync(off)) return { filename: fn, path: off, disabled: true };
  }
  return null;
}

ipcMain.handle('modrinth:install', async (e, params) => {
  const p = params || {};
  const progressSlug = p.slug;
  try {
    if (!p.slug) throw new Error('slug не указан');
    const projectType = p.projectType || 'mod';
    if (projectType === 'modpack') {
      return { ok: false, error: 'Установка .mrpack пока не поддерживается - откройте страницу проекта' };
    }
    const dir = contentDirFor(projectType);
    try { fs.mkdirSync(dir, { recursive: true }); } catch (err) {}
    const idx = readContentIndex();
    const withDeps = projectType === 'mod';
    const loaders = p.loader && projectType === 'mod' ? (p.loader === 'quilt' ? ['quilt', 'fabric'] : [p.loader]) : null;
    const result = { deps: [], skipped: [], warnings: [] };
    const visited = new Set();
    const send = (slug, progress, status) => sendRenderer('modrinth:installProgress', { slug, progress, status });

    const pickVersion = async (ref, { versionId, strictFilters = true } = {}) => {
      if (versionId) {
        try { return await httpsJson(`${MODRINTH_API}/version/${encodeURIComponent(versionId)}`); } catch (err) { /* упадём ниже на фильтры */ }
      }
      const parts = [];
      if (loaders) parts.push(`loaders=${encodeURIComponent(JSON.stringify(loaders))}`);
      if (p.gameVersion) parts.push(`game_versions=${encodeURIComponent(JSON.stringify([p.gameVersion]))}`);
      const url = `${MODRINTH_API}/project/${encodeURIComponent(ref)}/version` + (parts.length ? '?' + parts.join('&') : '');
      const list = await httpsJson(url);
      if (!list || !list.length) return null;
      return list.find(v => v.version_type === 'release') || list[0];
    };

    const installOne = async (ref, ctx) => {
      const v = await pickVersion(ref, { versionId: ctx.versionId });
      if (!v) {
        if (ctx.isRoot) throw new Error('Нет совместимых версий для выбранных фильтров');
        result.warnings.push(`Для зависимости «${ctx.title || ref}» нет версии под ${p.gameVersion || 'выбранную версию'}${p.loader ? ' / ' + p.loader : ''}`);
        return null;
      }
      const projectId = v.project_id;
      if (visited.has(projectId)) return null;
      visited.add(projectId);
      let proj = { slug: ref, title: ctx.title || ref };
      try { proj = await httpsJson(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}`); } catch (err) {}
      const slug = proj.slug || ref, title = proj.title || ref;

      const existing = findInstalledProject(idx, projectId, dir);
      if (!ctx.isRoot && existing) { result.skipped.push(title); }
      else {
        const primary = (v.files || []).find(f => f.primary) || (v.files || [])[0];
        if (!primary || !primary.url) throw new Error(`У версии «${title}» нет файла для скачивания`);
        const safeName = String(primary.filename || (slug + '.jar')).replace(/[/\\?%*:|"<>]/g, '_');
        const dest = path.join(dir, safeName);
        const label = ctx.isRoot ? slug : slug;
        send(label, 5, 'Скачивание…');
        await downloadFile(primary.url, dest, (done, total) => {
          if (total) send(label, 5 + Math.floor((done / total) * 90), `${(done / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} МБ`);
        });
        send(label, 100, 'Готово');
        if (existing && existing.filename !== safeName) {
          try { fs.unlinkSync(existing.path); } catch (err) {}
          delete idx[existing.filename];
        }
        idx[safeName] = { project_id: projectId, version_id: v.id, slug, title, type: projectType, ts: Date.now() };
        if (ctx.isRoot) { result.filename = safeName; result.file = dest; result.versionId = v.id; result.title = title; }
        else result.deps.push({ title, filename: safeName });
      }

      if (!withDeps || ctx.depth >= 6) return v;
      for (const d of (v.dependencies || [])) {
        if (d.dependency_type === 'incompatible' && d.project_id) {
          const conflict = findInstalledProject(idx, d.project_id, dir);
          if (conflict) result.warnings.push(`«${title}» несовместим с установленным ${idx[conflict.filename] ? idx[conflict.filename].title : conflict.filename}`);
          continue;
        }
        if (d.dependency_type !== 'required') continue;
        const depRef = d.project_id || (d.version_id ? null : null);
        if (!depRef && !d.version_id) continue;
        try {
          let ref = depRef;
          if (!ref && d.version_id) {
            const dv = await httpsJson(`${MODRINTH_API}/version/${encodeURIComponent(d.version_id)}`);
            ref = dv.project_id;
          }
          if (visited.has(ref)) continue;
          await installOne(ref, { depth: ctx.depth + 1, versionId: d.project_id ? null : d.version_id, title: d.file_name });
        } catch (err) {
          result.warnings.push(`Не удалось поставить зависимость: ${err.message}`);
        }
      }
      return v;
    };

    const root = await installOne(p.slug, { isRoot: true, depth: 0, versionId: p.versionId });
    writeContentIndex(idx);
    if (!root) throw new Error('Версия не найдена');
    return { ok: true, projectType, ...result };
  } catch (err) {
    sendRenderer('modrinth:installProgress', { slug: progressSlug, progress: 0, status: 'Ошибка: ' + err.message });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('modrinth:listInstalled', (e, projectType) => {
  try {
    const dir = contentDirFor(projectType || 'mod');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(n => /\.(jar|zip)(\.disabled)?$/i.test(n))
      .map(n => {
        const st = fs.statSync(path.join(dir, n));
        return { filename: n, size: st.size, mtime: st.mtimeMs, added: st.birthtimeMs || st.mtimeMs };
      });
  } catch (err) { return []; }
});

ipcMain.handle('modrinth:remove', (e, params) => {
  try {
    const p = params || {};
    const dir = contentDirFor(p.projectType || 'mod');
    const abs = path.resolve(path.join(dir, p.filename || ''));
    if (!abs.startsWith(path.resolve(dir) + path.sep)) return { ok: false, error: 'Недопустимый путь' };
    if (/^MGLskin/i.test(path.basename(abs))) return { ok: false, error: 'Моды MGL S&C управляются лаунчером — отключите «Использовать MGL S&C» в настройках' };
    if (!fs.existsSync(abs)) return { ok: false, error: 'Файл не найден' };
    fs.unlinkSync(abs);
    try {
      const idx = readContentIndex();
      const key = path.basename(abs).replace(/\.disabled$/i, '');
      if (idx[key]) { delete idx[key]; writeContentIndex(idx); }
    } catch (e2) {}
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('modrinth:importFiles', (e, params) => {
  const p = params || {};
  const dir = contentDirFor(p.projectType || 'mod');
  const added = [], skipped = [];
  try { fs.mkdirSync(dir, { recursive: true }); } catch (err) {}
  (p.paths || []).forEach(src => {
    try {
      const name = path.basename(String(src));
      const ok = p.projectType === 'mod' || !p.projectType ? /\.jar$/i.test(name) : /\.zip$/i.test(name);
      if (!ok || !fs.existsSync(src) || !fs.statSync(src).isFile()) { skipped.push(name); return; }
      let dest = path.join(dir, name), i = 1;
      const ext = path.extname(name), stem = path.basename(name, ext);
      while (fs.existsSync(dest) || fs.existsSync(dest + '.disabled')) dest = path.join(dir, `${stem} (${i++})${ext}`);
      fs.copyFileSync(src, dest);
      added.push(path.basename(dest));
    } catch (err) { skipped.push(path.basename(String(src))); }
  });
  return { ok: true, added, skipped };
});

ipcMain.handle('modrinth:toggleAll', (e, params) => {
  const p = params || {};
  const dir = contentDirFor(p.projectType || 'mod');
  let changed = 0, failed = 0;
  try {
    fs.readdirSync(dir).forEach(n => {
      if (/^MGLskin/i.test(n)) return;
      const off = /\.(jar|zip)\.disabled$/i.test(n);
      const on = /\.(jar|zip)$/i.test(n);
      if (p.enable && off) {
        try { fs.renameSync(path.join(dir, n), path.join(dir, n.replace(/\.disabled$/i, ''))); changed++; } catch (err) { failed++; }
      } else if (!p.enable && on) {
        try { fs.renameSync(path.join(dir, n), path.join(dir, n + '.disabled')); changed++; } catch (err) { failed++; }
      }
    });
    return { ok: true, changed, failed };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('modrinth:toggle', (e, params) => {
  try {
    const p = params || {};
    const dir = contentDirFor(p.projectType || 'mod');
    const filename = p.filename || '';
    const abs = path.resolve(path.join(dir, filename));
    if (!abs.startsWith(path.resolve(dir) + path.sep)) return { ok: false, error: 'Недопустимый путь' };
    if (/^MGLskin/i.test(path.basename(abs))) return { ok: false, error: 'Состоянием модов MGL S&C управляет лаунчер' };
    if (!fs.existsSync(abs)) return { ok: false, error: 'Файл не найден' };
    const isDisabled = /\.disabled$/i.test(filename);
    const newName = isDisabled ? filename.replace(/\.disabled$/i, '') : filename + '.disabled';
    const newAbs = path.resolve(path.join(dir, newName));
    if (!newAbs.startsWith(path.resolve(dir) + path.sep)) return { ok: false, error: 'Недопустимый путь' };
    fs.renameSync(abs, newAbs);
    return { ok: true, filename: newName, enabled: isDisabled };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('mc:getVersions', () => manager.getAvailableVersions());
ipcMain.handle('mc:getAllVersions', async () => {
  try {
    const m = await manager.getFullManifest();
    const list = (m.versions || []).map(v => ({ id: v.id, type: v.type, releaseTime: v.releaseTime }));
    console.log('[MGL2] mc:getAllVersions ->', list.length, 'версий');
    return list;
  } catch (e) {
    console.warn('[MGL2] mc:getAllVersions error:', e.message);
    return [];
  }
});
ipcMain.handle('mc:isInstalled', (e, id) => manager.isVersionInstalled(id));
ipcMain.handle('mc:installVersion', async (e, id) => {
  try {
    await manager.installVanilla(id, (progress, status) => sendRenderer('mc:installProgress', { id, progress, status }));
    return { ok: true };
  } catch (err) {
    sendRenderer('mc:installProgress', { id, progress: 0, status: 'Ошибка: ' + err.message });
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('mc:getModloaders', (e, v) => manager.getAvailableModLoaders(v));

function detectLoaderVersion(folder, loader) {
  let v;
  try { v = manager.readVersionJson(folder); } catch (e) { return null; }
  const libs = (v.libraries || []).map(l => String(l.name || ''));
  const byLib = (prefix) => { const l = libs.find(n => n.startsWith(prefix)); return l ? l.split(':').pop() : null; };
  if (loader === 'fabric') return byLib('net.fabricmc:fabric-loader:') || (MinecraftManager.stripVersionPrefix(v.id).match(/^fabric-loader-([\d.]+)-/) || [])[1] || null;
  if (loader === 'quilt') return byLib('org.quiltmc:quilt-loader:') || (MinecraftManager.stripVersionPrefix(v.id).match(/^quilt-loader-([\d.]+)-/) || [])[1] || null;
  if (loader === 'neoforge') return byLib('net.neoforged:neoforge:') || (MinecraftManager.stripVersionPrefix(v.id).match(/neoforge-([\w.\-]+)$/i) || [])[1] || null;
  if (loader === 'forge') {
    const l = byLib('net.minecraftforge:forge:');
    if (l) return l.replace(/^[\d.]+-/, '').replace(/-(universal|client)$/, '');
    return (MinecraftManager.stripVersionPrefix(v.id).match(/forge-?([\d.]+(?:-[\w.]+)?)$/i) || [])[1] || (String(folder).match(/(\d+\.\d+\.\d+\.\d+)/) || [])[1] || null;
  }
  return null;
}

function instanceInfo(folder) {
  const base = describeInstalled().find(x => x.folder === folder) || { folder, mc: '', loader: 'vanilla' };
  try {
    const pv = manager.readVersionJson(folder);
    const parent = pv.inheritsFrom || pv.jar;
    if (parent && (/^\d/.test(String(parent)) || manager.isVersionInstalled(parent))) base.mc = String(parent);
  } catch (e) {}
  return base;
}

const MGL_SC_DIR = path.join(__dirname, '..', 'assets', 'MGL');
const MGL_NAME_RE = /^MGLskin[_\-\s]?(neoforge|forge|fabric|quilt)[_\-\s]?(\d+(?:\.\d+)*)\.jar$/i;
function mglBundled() {
  try {
    return fs.readdirSync(MGL_SC_DIR).map(f => { const m = f.match(MGL_NAME_RE); return m ? { file: f, loader: m[1].toLowerCase(), mc: m[2], src: path.join(MGL_SC_DIR, f) } : null; }).filter(Boolean);
  } catch (e) { return []; }
}
function mglEnsureCopies() {
  const dir = contentDirFor('mod');
  let copied = 0;
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  mglBundled().forEach(a => {
    const live = path.join(dir, a.file), off = live + '.disabled';
    try {
      const size = fs.statSync(a.src).size;
      const cur = fs.existsSync(live) ? live : fs.existsSync(off) ? off : null;
      if (cur && fs.statSync(cur).size === size) return;
      fs.copyFileSync(a.src, cur || off);
      copied++;
    } catch (e) { console.warn('[MGL2] MGL S&C copy', a.file, e.message); }
  });
  return copied;
}
function mglRemoveAll() {
  const dir = contentDirFor('mod');
  let removed = 0, failed = 0;
  mglBundled().forEach(a => {
    [a.file, a.file + '.disabled'].forEach(n => {
      const p = path.join(dir, n);
      try { if (fs.existsSync(p)) { fs.unlinkSync(p); removed++; } } catch (e) { failed++; }
    });
  });
  return { removed, failed };
}
function mglApplyForLaunch(folder) {
  const info = instanceInfo(folder);
  mglEnsureCopies();
  const dir = contentDirFor('mod');
  const list = mglBundled();
  let wanted = null;
  if (info.loader !== 'vanilla') {
    wanted = list.find(a => a.loader === info.loader && a.mc === info.mc)
      || (info.loader === 'quilt' ? list.find(a => a.loader === 'fabric' && a.mc === info.mc) : null) || null;
  }
  list.forEach(a => {
    const live = path.join(dir, a.file), off = live + '.disabled';
    const want = wanted && wanted.file === a.file;
    try {
      if (want) {
        if (fs.existsSync(live)) { if (fs.existsSync(off)) fs.unlinkSync(off); }
        else if (fs.existsSync(off)) fs.renameSync(off, live);
      } else if (fs.existsSync(live)) {
        if (fs.existsSync(off)) fs.unlinkSync(live); else fs.renameSync(live, off);
      }
    } catch (e) { console.warn('[MGL2] MGL S&C toggle', a.file, e.message); }
  });
  if (wanted) return { ok: true, file: wanted.file };
  const names = { forge: 'Forge', fabric: 'Fabric', quilt: 'Quilt', neoforge: 'NeoForge', vanilla: 'Vanilla' };
  const have = list.map(a => `${names[a.loader] || a.loader} ${a.mc}`).join(', ');
  return {
    ok: false,
    message: info.loader === 'vanilla'
      ? 'MGL S&C: на Vanilla не работает — нужен Forge или Fabric. Игра запущена без мода.'
      : `MGL S&C: нет мода под ${names[info.loader] || info.loader} ${info.mc || ''}. Игра запущена без него. Доступно: ${have || 'ничего'}.`
  };
}
ipcMain.handle('mglsc:set', (e, enabled) => {
  try {
    enabled = !!enabled;
    settings.update({ useMglSc: enabled }); settings.save();
    if (enabled) {
      const bundled = mglBundled();
      if (!bundled.length) return { ok: true, warn: 'В assets/MGL нет модов', mods: [] };
      return { ok: true, copied: mglEnsureCopies(), mods: bundled.map(a => ({ file: a.file, loader: a.loader, mc: a.mc })) };
    }
    return { ok: true, ...mglRemoveAll(), mods: [] };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('mglsc:info', () => ({ enabled: !!settings.get('useMglSc'), mods: mglBundled().map(a => ({ file: a.file, loader: a.loader, mc: a.mc })) }));
ipcMain.handle('mc:reinstall', async (e, folder) => {
  const send = (progress, status) => sendRenderer('mc:reinstallProgress', { folder, progress, status });
  const base = path.resolve(path.join(minecraftDir(), 'versions'));
  const dir = path.resolve(path.join(base, String(folder || '')));
  if (!folder || !dir.startsWith(base + path.sep)) return { ok: false, error: 'Недопустимая папка' };
  if (!fs.existsSync(dir)) return { ok: false, error: 'Сборка не найдена' };
  if (manager.getRunning().some(r => r.folder === folder)) return { ok: false, error: 'Сначала закройте игру' };
  const info = instanceInfo(folder);
  if (!info || !info.mc) return { ok: false, error: 'Не удалось определить версию' };
  const loaderVersion = info.loader === 'vanilla' ? null : detectLoaderVersion(folder, info.loader);
  if (info.loader !== 'vanilla' && !loaderVersion) return { ok: false, error: 'Не удалось определить версию загрузчика — удалите сборку и установите заново' };
  const bak = dir + '.reinstall-bak';
  try {
    send(1, 'Очистка сборки…');
    if (fs.existsSync(bak)) fs.rmSync(bak, { recursive: true, force: true });
    fs.renameSync(dir, bak);
    const before = manager.getInstalledVersions();
    const sub =(a, b) => (p, s) => send(a + Math.floor(p * (b - a) / 100), s);
    if (info.loader === 'vanilla') await manager.installVanilla(info.mc || folder, sub(2, 98));
    else if (info.loader === 'fabric') await manager.installFabric(info.mc, loaderVersion, sub(2, 98));
    else if (info.loader === 'quilt') await manager.installQuilt(info.mc, loaderVersion, sub(2, 98));
    else {
      let javaPath = settings.get('javaPath');
      if (!javaPath || !fs.existsSync(javaPath)) javaPath = manager.resolveJava(null, javaPath);
      if (!javaPath) javaPath = await manager.ensureJava(17, (p, s) => send(5 + Math.floor(p * 0.2), s));
      if (info.loader === 'forge') await manager.installForge(info.mc, loaderVersion, javaPath, sub(2, 98));
      else await manager.installNeoForge(info.mc, loaderVersion, javaPath, sub(2, 98));
    }
    if (!manager.isVersionInstalled(folder)) {
      const created = describeInstalled().filter(x => !before.includes(x.folder) && x.loader === info.loader);
      if (info.loader !== 'vanilla' && created.length === 1) manager.renameVersion(created[0].folder, folder);
    }
    if (!manager.isVersionInstalled(folder)) throw new Error('Установщик создал сборку с другим именем папки — старая сохранена как «' + path.basename(bak) + '»');
    fs.rmSync(bak, { recursive: true, force: true });
    send(100, 'Готово');
    return { ok: true };
  } catch (err) {
    try {
      if (fs.existsSync(bak) && !fs.existsSync(path.join(dir, `${folder}.json`))) {
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        fs.renameSync(bak, dir);
      }
    } catch (e2) { console.warn('[MGL2] reinstall rollback', e2.message); }
    send(0, 'Ошибка: ' + err.message);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('mc:fixVersions', () => {
  try { return { ok: true, ...fixVersionNames() }; } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('ml:getLoaderVersions', async (e, { loader, mcVersion }) => {
  try {
    if (loader === 'fabric') return { ok: true, versions: await manager.getFabricLoaders(mcVersion) };
    if (loader === 'quilt') return { ok: true, versions: await manager.getQuiltLoaders(mcVersion) };
    if (loader === 'forge') return { ok: true, versions: await manager.getForgeVersions(mcVersion) };
    if (loader === 'neoforge') return { ok: true, versions: await manager.getNeoForgeVersions(mcVersion) };
    return { ok: false, error: 'Неизвестный лоадер' };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('ml:install', async (e, { loader, mcVersion, loaderVersion }) => {
  const send = (progress, status) => sendRenderer('ml:installProgress', { loader, mcVersion, progress, status });
  try {
    let res;
    if (loader === 'fabric') res = await manager.installFabric(mcVersion, loaderVersion, send);
    else if (loader === 'quilt') res = await manager.installQuilt(mcVersion, loaderVersion, send);
    else if (loader === 'forge' || loader === 'neoforge') {
      // Нужна Java - попробуем взять настройку, иначе авто-скачать 17
      let javaPath = settings.get('javaPath');
      if (!javaPath || !fs.existsSync(javaPath)) {
        send(5, 'Поиск Java…');
        javaPath = manager.resolveJava(null, javaPath);
        if (!javaPath) {
          send(10, 'Java не найдена - загрузка Java 17…');
          javaPath = await manager.ensureJava(17, (p, s) => send(10 + Math.floor(p * 0.3), s));
        }
      }
      const before = manager.getInstalledVersions();
      res = loader === 'forge'
        ? await manager.installForge(mcVersion, loaderVersion, javaPath, send)
        : await manager.installNeoForge(mcVersion, loaderVersion, javaPath, send);
      const renamed = Object.values(prefixNewFolders(before, mcVersion));
      if (renamed.length) res = { ...res, folder: renamed[0] };
    } else {
      throw new Error('Неизвестный лоадер: ' + loader);
    }
    return { ok: true, ...res };
  } catch (err) {
    if (err && err.code === 'JAVA_MISSING') sendRenderer('java:missing', { major: err.major, loader });
    send(0, 'Ошибка: ' + err.message);
    return { ok: false, error: err.message };
  }
});

// ---------- Java ----------
ipcMain.handle('java:ensure', async (e, major) => {
  try {
    const javaPath = await manager.ensureJava(major || 17, (progress, status) =>
      sendRenderer('java:installProgress', { major, progress, status }));
    return { ok: true, path: javaPath };
  } catch (err) {
    sendRenderer('java:installProgress', { major, progress: 0, status: 'Ошибка: ' + err.message });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('java:scan', () => {
  try {
    const list = manager.scanSystemJavas().map(j => ({ path: j.javaw, home: j.home, major: j.major, vendor: j.vendor }));
    const pick = {};
    [8, 17, 21, 25].forEach(m => { pick[m] = manager.findSystemJava(m); });
    return { ok: true, list, pick };
  } catch (err) { return { ok: false, error: err.message, list: [], pick: {} }; }
});

ipcMain.handle('java:installAdoptium', async (e, major) => {
  major = parseInt(major, 10) || 17;
  const send = (progress, status) => sendRenderer('java:installProgress', { major, progress, status });
  try {
    if (process.platform !== 'win32') {
      shell.openExternal(`https://adoptium.net/temurin/releases/?version=${major}`);
      return { ok: true, external: true };
    }
    const arch = process.arch === 'ia32' ? 'x86' : process.arch === 'arm64' ? 'aarch64' : 'x64';
    const url = `https://api.adoptium.net/v3/installer/latest/${major}/ga/windows/${arch}/jre/hotspot/normal/eclipse`;
    const dir = path.join(os.tmpdir(), 'mgl-java');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `temurin-${major}-jre-${arch}.msi`);
    send(1, `Temurin ${major}: скачивание установщика…`);
    await downloadFile(url, dest, (done, total) => {
      if (total) send(1 + Math.floor(done / total * 97), `Temurin ${major}: ${(done / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} МБ`);
    });
    if (fs.statSync(dest).size < 5 * 1048576) throw new Error('Скачанный установщик повреждён — повторите попытку');
    send(100, `Установщик Temurin ${major} скачан`);
    const err = await shell.openPath(dest);
    if (err) throw new Error('Не удалось открыть установщик: ' + err);
    return { ok: true, file: dest };
  } catch (err) {
    send(0, 'Ошибка: ' + err.message);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('java:detect', (e, folder) => {
  try {
    const major = folder ? manager.javaMajorFor(folder) : 17;
    const current = manager.resolveJava(folder, settings.get('javaPath'));
    const component = manager.pickJavaComponent(major);
    const runtime = manager.javaRuntimePath(component);
    return { major, current, runtime, runtimeInstalled: fs.existsSync(runtime), component };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('mc:systemRam', () => {
  const total = Math.floor(os.totalmem() / 1024 / 1024);
  return { total, recommendedMax: Math.min(Math.floor(total * 0.6), 16384), min: 1024 };
});
ipcMain.handle('sys:info', () => {
  const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
  const cpus = os.cpus() || [];
  const cpuMHz = cpus.length ? Math.max(...cpus.map(c => c.speed || 0)) : 0;
  const reasons = [];
  if (totalMb < 4096) reasons.push(`ОЗУ ${(totalMb / 1024).toFixed(1)} ГБ (< 4 ГБ)`);
  if (cpuMHz && cpuMHz < 2000) reasons.push(`CPU ${(cpuMHz / 1000).toFixed(2)} ГГц (< 2 ГГц)`);
  return {
    totalMb, freeMb: Math.floor(os.freemem() / 1024 / 1024),
    maxGameMb: Math.max(1024, Math.floor((totalMb - Math.min(2048, totalMb * 0.25)) / 512) * 512),
    recommendedMb: Math.max(1024, Math.min(8192, Math.floor(totalMb * 0.5 / 512) * 512)),
    cpuModel: cpus.length ? cpus[0].model.trim() : '', cpuMHz, cores: cpus.length,
    weak: reasons.length > 0, reasons
  };
});
ipcMain.handle('settings:reset', () => {
  const keep = { userId: settings.get('userId'), minecraftDir: settings.get('minecraftDir'), customServers: settings.get('customServers'), managedServers: settings.get('managedServers'), pluginsEnabled: settings.get('pluginsEnabled'), plugins: settings.get('plugins') };
  settings.data = { ...settings.defaults, ...keep };
  settings.save();
  return settings.getAll();
});
ipcMain.handle('settings:export', async () => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'Экспорт настроек', defaultPath: `mgl-settings-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  const data = settings.getAll();
  delete data.userId;
  fs.writeFileSync(r.filePath, JSON.stringify({ app: 'magma-launcher', version: 1, exportedAt: new Date().toISOString(), settings: data }, null, 2));
  return { ok: true, path: r.filePath };
});
ipcMain.handle('settings:import', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { title: 'Импорт настроек', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try {
    const raw = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
    const data = raw && raw.settings && typeof raw.settings === 'object' ? raw.settings : raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Неверный формат файла');
    const clean = {};
    Object.keys(settings.defaults).concat(Object.keys(data)).forEach(k => {
      if (k === 'userId' || !(k in data)) return;
      if (/^[A-Za-z0-9_]+$/.test(k)) clean[k] = data[k];
    });
    settings.update(clean);
    settings.save();
    return { ok: true, settings: settings.getAll(), count: Object.keys(clean).length };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('settings:get', () => settings.getAll());
ipcMain.handle('settings:save', (e, patch) => { settings.update(patch || {}); settings.save(); return settings.getAll(); });






function sendRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
function applyActiveSkinCape(username) {
  const base = path.join(minecraftDir(), 'mgl');
  const applied = { skin: null, cape: null };
  const safeUser = (username || 'Player').replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Player';
  for (const kind of ['skin', 'cape']) {
    try {
      const dir = path.join(base, kind);
      if (!fs.existsSync(dir)) continue;
      const meta = path.join(dir, '_active.json');
      const activeFile = fs.existsSync(meta) ? (JSON.parse(fs.readFileSync(meta, 'utf8')).active || null) : null;

      for (const stale of ['active.png', safeUser + '.png']) {
        const p = path.join(dir, stale);
        if (!fs.existsSync(p)) continue;
        if (activeFile === stale) continue;
        try { fs.unlinkSync(p); } catch (e) {}
      }

      if (!activeFile) continue;
      const src = path.join(dir, activeFile);
      if (!fs.existsSync(src)) continue;
      const buf = fs.readFileSync(src);
      const cslDir = path.join(minecraftDir(), 'CustomSkinLoader', 'LocalSkin', kind === 'cape' ? 'capes' : 'skins');
      try { fs.mkdirSync(cslDir, { recursive: true }); } catch (e) {}
      fs.writeFileSync(path.join(cslDir, safeUser + '.png'), buf);
      applied[kind] = activeFile;
    } catch (e) { console.warn('[MGL2] applyActiveSkinCape', kind, e); }
  }
  return applied;
}

function buildLaunchOptions(override) {
  const o = settings.get('launchOptions') || {};
  let quickPlay = o.quickPlayType && o.quickPlayType !== 'none' && String(o.quickPlayValue || '').trim()
    ? { type: o.quickPlayType, value: String(o.quickPlayValue).trim() } : null;
  if (override && override.quickPlay) quickPlay = override.quickPlay;
  return {
    extraJvmArgs: o.extraJvmArgs || '',
    resolution: o.customResolution ? { width: o.width || 1280, height: o.height || 720 } : null,
    fullscreen: !!o.fullscreen,
    quickPlay,
    wrapper: o.wrapper || '',
    preLaunch: o.preLaunch || '',
    postExit: o.postExit || ''
  };
}

ipcMain.handle('mc:launch', async (e, { folder, username, memoryMax, quickPlay }) => {
  const send = (progress, status) => sendRenderer('mc:progress', { progress, status });
  try {
    send(5, 'Поиск Java…');
    const major = manager.javaMajorFor(folder);
    const perInst = (settings.get('instanceJava') || {})[folder];
    const explicit = perInst || settings.get('javaPath');

    let javaPath = manager.resolveLaunchJava(major, explicit);

    if (!javaPath) {
      send(6, `Java ${major} не найдена - загрузка…`);
      javaPath = await manager.ensureJava(major, (p, s) =>
        sendRenderer('java:installProgress', { major, progress: p, status: s }));
      if (!javaPath) throw new Error('Не удалось установить Java ' + major);
    }
    console.log('[MGL2] java:', javaPath, '(требуется Java', major, ')');
    const mem = memoryMax || settings.get('memoryMax') || 2048;
    const name = username || settings.get('username');
    if (settings.get('useMglSc')) {
      send(10, 'MGL S&C…');
      try {
        const r = mglApplyForLaunch(folder);
        if (!r.ok) {
          sendRenderer('mc:notice', { level: 'error', text: r.message });
          sendRenderer('mc:log', { folder, stream: 'stderr', line: '[MGL S&C] ' + r.message });
        } else sendRenderer('mc:log', { folder, stream: 'stdout', line: '[MGL S&C] включён ' + r.file });
      } catch (err) { console.warn('[MGL2] MGL S&C', err.message); }
    }
    send(12, 'Подготовка скина/плаща…');
    const applied = applyActiveSkinCape(name);
    if (applied.skin || applied.cape) {
      console.log('[MGL2] applied', applied);
    }
    const launch = buildLaunchOptions({ quickPlay: quickPlay && quickPlay.type && quickPlay.value ? quickPlay : null });
    const ctx = { folder, username: name, memoryMax: mem, javaPath, launch, cancelled: null, cancel(reason) { this.cancelled = reason || 'Запуск отменён плагином'; } };
    await plugins.emit('launch:before', ctx);
    if (ctx.cancelled) throw new Error(ctx.cancelled);
    if (launch.quickPlay && launch.quickPlay.type === 'multiplayer') {
      const hist = (settings.get('serverHistory') || []).filter(h => h.ip !== launch.quickPlay.value);
      hist.unshift({ name: (quickPlay && quickPlay.name) || launch.quickPlay.value, ip: launch.quickPlay.value, ts: Date.now() });
      settings.update({ serverHistory: hist.slice(0, 20) });
    }
    await manager.launchInstalled(folder, {
      username: ctx.username,
      memoryMax: ctx.memoryMax,
      javaPath: ctx.javaPath,
      launch: ctx.launch,
      onAssetsProgress: (d) => sendRenderer('assets:progress', d),
      onProgress: send,
      onLog: (entry) => { sendRenderer('mc:log', entry); plugins.emitSync('game:log', entry); },
      onExit: (info) => {
        const addSec = info.seconds || 0;
        const prevSec = settings.get('playtimeSeconds') || 0;
        const totalSec = prevSec + addSec;
        settings.update({
          playtimeSeconds: totalSec,
          playtimeMinutes: Math.floor(totalSec / 60)
        });
        settings.save();
        sendRenderer('mc:exit', { ...info, playtimeSeconds: totalSec });
        plugins.emit('game:exit', { folder, ...info, playtimeSeconds: totalSec });
      }
    });

    const counts = settings.get('launchCounts') || {};
    counts[folder] = (counts[folder] || 0) + 1;
    settings.update({ launchCounts: counts, lastVersion: folder, username: name });
    settings.save();

    sendRenderer('mc:launched', { folder });
    plugins.emit('launch:after', { folder, username: ctx.username });
    return { ok: true };
  } catch (err) {
    if (err && err.code === 'JAVA_MISSING') sendRenderer('java:missing', { major: err.major, folder });
    sendRenderer('mc:error', err.message);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('mc:stop', (e, folder) => manager.stop(folder));
ipcMain.handle('mc:running', () => manager.getRunning());

ipcMain.handle('mc:deleteVersion', (e, folder) => {
  try {
    const target = path.join(minecraftDir(), 'versions', folder);
    const base = path.resolve(path.join(minecraftDir(), 'versions'));
    const abs = path.resolve(target);
    if (!abs.startsWith(base + path.sep)) return { ok: false, error: 'Недопустимый путь' };
    if (!fs.existsSync(abs)) return { ok: false, error: 'Папка не найдена' };
    fs.rmSync(abs, { recursive: true, force: true });
    // почистим связанные настройки
    const aliases = settings.get('aliases') || {};
    const pinned = (settings.get('pinned') || []).filter(x => x !== folder);
    const counts = settings.get('launchCounts') || {};
    if (folder in aliases) delete aliases[folder];
    if (folder in counts) delete counts[folder];
    settings.update({ aliases, pinned, launchCounts: counts });
    settings.save();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.on('stats:addPlaytime', (e, minutes) => {
  settings.update({ playtimeMinutes: (settings.get('playtimeMinutes') || 0) + (minutes || 0) });
  settings.save();
});

ipcMain.handle('mcdir:current', () => ({
  current: minecraftDir(),
  default: defaultMinecraftDir(),
  custom: !!settings.get('minecraftDir')
}));

ipcMain.handle('mcdir:pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку для .minecraft',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('mcdir:set', async (e, { target, migrate }) => {
  const send = (progress, status) => sendRenderer('mcdir:migrateProgress', { progress, status });
  try {
    if (!target || typeof target !== 'string') throw new Error('Пустой путь');
    const src = minecraftDir();
    const dst = path.resolve(target);
    // Если пользователь указал пустой «общий» каталог - создадим внутри него .minecraft
    const finalDst = path.basename(dst).toLowerCase() === '.minecraft' ? dst : path.join(dst, '.minecraft');
    // Безопасность: не позволяем переносить в поддиректорию самого src
    if ((finalDst + path.sep).startsWith(src + path.sep)) {
      throw new Error('Новый путь не может быть внутри старого');
    }

    if (migrate && fs.existsSync(src) && src !== finalDst) {
      send(1, 'Подсчёт файлов…');
      const files = [];
      const walk = (dir) => {
        let items = [];
        try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (err) { return; }
        for (const it of items) {
          const full = path.join(dir, it.name);
          if (it.isDirectory()) walk(full);
          else if (it.isFile() || it.isSymbolicLink()) files.push(full);
        }
      };
      walk(src);
      send(3, `Копирование ${files.length} файлов в ${finalDst}…`);
      try { fs.mkdirSync(finalDst, { recursive: true }); } catch (err) {}
      let i = 0;
      for (const file of files) {
        const rel = path.relative(src, file);
        const to = path.join(finalDst, rel);
        try {
          fs.mkdirSync(path.dirname(to), { recursive: true });
          fs.copyFileSync(file, to);
        } catch (err) { console.warn('[MGL2] copy fail', file, err.message); }
        i++;
        if (i % 50 === 0 || i === files.length) {
          send(3 + Math.floor((i / files.length) * 92), `Копирование ${i}/${files.length}`);
        }
      }
      send(96, 'Удаление старой папки…');
      try { fs.rmSync(src, { recursive: true, force: true }); } catch (err) {
        console.warn('[MGL2] rm old mc dir fail:', err.message);
      }
    } else {
      try { fs.mkdirSync(finalDst, { recursive: true }); } catch (err) {}
    }

    settings.update({ minecraftDir: finalDst });
    settings.save();
    manager = new MinecraftManager(finalDst, { json: httpsJson, download: downloadFile });
    send(100, 'Готово!');
    return { ok: true, path: finalDst };
  } catch (err) {
    send(0, 'Ошибка: ' + err.message);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('mcdir:reset', () => {
  settings.update({ minecraftDir: null });
  settings.save();
  manager = new MinecraftManager(defaultMinecraftDir(), { json: httpsJson, download: downloadFile });
  return { ok: true, path: defaultMinecraftDir() };
});

ipcMain.handle('dialog:pickJava', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите исполняемый файл Java',
    properties: ['openFile'],
    filters: process.platform === 'win32'
      ? [{ name: 'Java', extensions: ['exe'] }, { name: 'Все файлы', extensions: ['*'] }]
      : [{ name: 'Все файлы', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

app.whenReady().then(() => {
  manager = new MinecraftManager(minecraftDir(), { json: httpsJson, download: downloadFile });
  syncCustomServersToDat();
  setupDisplayMedia();
  if (settings.get('useMglSc')) { try { mglEnsureCopies(); } catch (e) {} }
  // Нужен Windows для системных уведомлений (совпадает с build.appId → ярлык NSIS)
  if (process.platform === 'win32') app.setAppUserModelId('com.magmalauncher.mgl2');
  plugins.boot();
  createWindow();
});
app.on('will-quit', () => { plugins.emitSync('app:quit', {}); plugins.unloadAll(); plugins.clearLock(); });

const pluginsOk = (fn) => async (e, arg) => {
  try { const r = await fn(arg); return { ok: true, ...(r || {}), state: plugins.describe() }; }
  catch (err) { return { ok: false, error: err.message, state: plugins.describe() }; }
};
ipcMain.handle('plugins:list', () => plugins.describe());
ipcMain.handle('plugins:setSystem', pluginsOk((on) => plugins.setSystem(!!on)));
ipcMain.handle('plugins:setEnabled', pluginsOk(({ id, enabled }) => plugins.setEnabled(id, enabled)));
ipcMain.handle('plugins:reload', pluginsOk((id) => plugins.reload(id || null)));
ipcMain.handle('plugins:remove', pluginsOk((id) => plugins.remove(id)));
ipcMain.handle('plugins:createTemplate', pluginsOk((name) => ({ id: plugins.createTemplate(name) })));
ipcMain.handle('plugins:dismissAuto', pluginsOk(() => { settings.update({ pluginsAutoDisabled: null }); settings.save(); }));
ipcMain.handle('plugins:install', pluginsOk(async (kind) => {
  const r = await dialog.showOpenDialog(mainWindow, kind === 'folder'
    ? { title: 'Папка плагина (с plugin.json)', properties: ['openDirectory'] }
    : { title: 'Архив плагина', properties: ['openFile'], filters: [{ name: 'ZIP', extensions: ['zip'] }] });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  const id = plugins.install(r.filePaths[0]);
  plugins.setEnabled(id, true);
  return { id };
}));
ipcMain.handle('plugins:readLog', (e, id) => ({
  text: plugins.tail(id ? `${id}.log` : 'plugins.log', 400),
  crashes: (() => { try { return fs.readdirSync(plugins.logsDir).filter(f => f.startsWith('crash-')).sort().reverse().slice(0, 30); } catch (err) { return []; } })()
}));
ipcMain.handle('plugins:readFile', (e, name) => {
  const f = path.join(plugins.logsDir, path.basename(String(name || '')));
  try { return fs.readFileSync(f, 'utf8'); } catch (err) { return ''; }
});
ipcMain.handle('plugins:clearLogs', pluginsOk(() => {
  for (const f of fs.readdirSync(plugins.logsDir)) { try { fs.unlinkSync(path.join(plugins.logsDir, f)); } catch (err) {} }
}));
ipcMain.on('plugins:open', (e, what) => {
  if (what && what.file) { shell.openPath(path.join(plugins.logsDir, path.basename(String(what.file)))); return; }
  const target = what === 'logs' ? plugins.logsDir
    : what && what.id ? ((plugins.find(what.id) || {}).dir || plugins.root) : plugins.root;
  try { fs.mkdirSync(target, { recursive: true }); } catch (err) {}
  shell.openPath(target);
});
ipcMain.handle('plugins:readDocs', () => {
  const cands = [app.isPackaged && process.resourcesPath ? path.join(process.resourcesPath, 'PLUGINS.md') : null, path.join(__dirname, '..', 'PLUGINS.md')].filter(Boolean);
  const f = cands.find(x => fs.existsSync(x));
  try { return f ? fs.readFileSync(f, 'utf8') : ''; } catch (e) { return ''; }
});
ipcMain.on('plugins:ready', (e, ids) => plugins.rendererReady(ids));
ipcMain.on('plugins:fail', (e, d) => {
  if (!d || !d.id) return;
  const err = new Error(d.message || 'ошибка'); err.stack = d.stack || err.message;
  plugins.fail(d.id, err, d.phase || 'renderer', !!d.fatal);
});
ipcMain.on('plugins:log', (e, d) => { if (d) plugins.log(d.id, d.level || 'info', d.text || ''); });
ipcMain.on('plugins:storage', (e, { id, op, key, value }) => {
  const file = path.join(plugins.dataRoot, String(id || '').replace(/[^a-z0-9._-]/gi, '_'), 'storage.json');
  let o = {}; try { o = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) {}
  if (op === 'set' || op === 'delete') {
    if (op === 'set') o[key] = value; else delete o[key];
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(o, null, 2)); } catch (err) {}
    e.returnValue = true;
  } else e.returnValue = op === 'all' ? o : (key in o ? o[key] : undefined);
});

app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });