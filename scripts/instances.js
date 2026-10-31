// Сборки (инстансы): <.minecraft>/instances/<Название>/ - своя папка игры (mods, config, saves, resourcepacks,
// shaderpacks), версия/библиотеки/ассеты общие в .minecraft. Описание - instance.json в папке сборки.
// Модпаки Modrinth (.mrpack): modrinth.index.json → версия + загрузчик, files[] качаются по sha1, overrides/ распаковываются.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const zip = require('./zip-extract');
const { ZipWriter } = require('./zip-write');

const META = 'instance.json';
const SUBDIRS = ['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves'];
const MODRINTH_API = 'https://api.modrinth.com/v2';
const LOADER_DEPS = { 'fabric-loader': 'fabric', 'quilt-loader': 'quilt', forge: 'forge', neoforge: 'neoforge' };

module.exports = function createInstances(deps) {
  const { ipcMain, shell, getManager, minecraftDir, sendRenderer, httpsJson, downloadFile,
    mlInstall, describeInstalled, detectLoaderVersion, MinecraftManager, versionDirNames, removeNewVersionDirs,
    versionDirMatcher, httpsPost, readLevelDat } = deps;

  const root = () => path.join(minecraftDir(), 'instances');
  function dirOf(id) {
    const base = path.resolve(root());
    const abs = path.resolve(base, String(id || ''));
    if (!id || !abs.startsWith(base + path.sep)) throw new Error('Недопустимая сборка');
    return abs;
  }
  function read(id) {
    try { return { ...JSON.parse(fs.readFileSync(path.join(dirOf(id), META), 'utf8')), id }; } catch (e) { return null; }
  }
  function write(id, patch) {
    const cur = read(id) || { id };
    const next = { ...cur, ...patch, id };
    const f = path.join(dirOf(id), META), tmp = f + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, f);
    return next;
  }
  function safeFolder(name) {
    let s = String(name || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 60) || 'Сборка';
    if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s += '_';
    return s;
  }
  function uniqueId(name) {
    const base = safeFolder(name);
    let id = base, i = 2;
    while (fs.existsSync(path.join(root(), id))) id = `${base} (${i++})`;
    return id;
  }
  function countFiles(dir, re) {
    try { return fs.readdirSync(dir).filter(n => re.test(n)).length; } catch (e) { return 0; }
  }
  function describe(meta) {
    const dir = dirOf(meta.id);
    const icon = fs.existsSync(path.join(dir, 'icon.png')) ? pathToFileURL(path.join(dir, 'icon.png')).href : null;
    const m = getManager();
    return {
      ...meta, dir, icon,
      ready: meta.state !== 'installing' && !!meta.version && m.isVersionInstalled(meta.version),
      mods: countFiles(path.join(dir, 'mods'), /\.jar$/i),
      modsOff: countFiles(path.join(dir, 'mods'), /\.jar\.disabled$/i),
      worlds: (() => { try { return fs.readdirSync(path.join(dir, 'saves'), { withFileTypes: true }).filter(d => d.isDirectory()).length; } catch (e) { return 0; } })()
    };
  }
  function list() {
    let names = [];
    try { names = fs.readdirSync(root(), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch (e) {}
    return names.map(read).filter(Boolean).map(describe).sort((a, b) => (b.lastPlayed || b.created || 0) - (a.lastPlayed || a.created || 0));
  }

  // ---- версия игры для сборки (общая в .minecraft/versions) ----
  const sameLoaderVer = (a, b) => !!a && !!b && (a === b || String(a).split('-')[0] === String(b).split('-')[0]);
  function findVersionFolder(mc, loader, loaderVersion) {
    const m = getManager();
    if (!loader || loader === 'vanilla') return m.isVersionInstalled(mc) ? mc : null;
    const hit = describeInstalled().find(x => x.loader === loader && x.mc === mc &&
      (!loaderVersion || sameLoaderVer(detectLoaderVersion(x.folder, loader), loaderVersion)));
    return hit ? hit.folder : null;
  }
  async function ensureVersion(mc, loader, loaderVersion, send) {
    const have = findVersionFolder(mc, loader, loaderVersion);
    if (have) { send(100, 'Версия уже установлена: ' + have); return have; }
    if (!loader || loader === 'vanilla') {
      await getManager().installVanilla(mc, send);
      return mc;
    }
    const res = await mlInstall(loader, mc, loaderVersion, send);
    const folder = (res && res.folder) || findVersionFolder(mc, loader, loaderVersion) || findVersionFolder(mc, loader, null);
    if (!folder) throw new Error('Установщик не создал версию для сборки');
    return folder;
  }

  // Общая обёртка установки: папка + instance.json(state: installing) → job → ready; при ошибке/отмене папка удаляется
  async function runCreate(id, meta, job) {
    const dir = path.join(root(), id);
    fs.mkdirSync(dir, { recursive: true });
    SUBDIRS.forEach(s => { try { fs.mkdirSync(path.join(dir, s), { recursive: true }); } catch (e) {} });
    write(id, { ...meta, state: 'installing', created: Date.now() });
    const send = (progress, status) => sendRenderer('inst:progress', { id, name: meta.name, progress, status });
    const before = versionDirNames();
    try {
      const patch = await getManager().runCancellable('inst:' + id, () => job(dir, send));
      const out = write(id, { ...(patch || {}), state: 'ready' });
      send(100, 'Готово');
      return { ok: true, instance: describe(out) };
    } catch (err) {
      const cancelled = MinecraftManager.isCancelled(err);
      if (cancelled && meta.mc) removeNewVersionDirs(before, versionDirMatcher(meta.mc));
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
      if (err && err.code === 'JAVA_MISSING') sendRenderer('java:missing', { major: err.major });
      send(0, 'Ошибка: ' + err.message);
      return { ok: false, error: err.message, cancelled };
    }
  }

  // ---- .mrpack ----
  function readMrpack(buf) {
    // некоторые архиваторы (Compress-Archive в Windows PowerShell) пишут пути с «\» - приводим к «/»
    const entries = zip.listEntries(buf).map(e => ({ ...e, name: e.name.replace(/\\/g, '/') }));
    const ie = entries.find(e => e.name === 'modrinth.index.json');
    if (!ie) throw new Error('Это не .mrpack: нет modrinth.index.json');
    const index = JSON.parse(zip.readFile(buf, ie).toString('utf8'));
    const d = index.dependencies || {};
    if (!d.minecraft) throw new Error('В модпаке не указана версия Minecraft');
    let loader = 'vanilla', loaderVersion = null;
    for (const [k, v] of Object.entries(LOADER_DEPS)) if (d[k]) { loader = v; loaderVersion = d[k]; break; }
    return { entries, index, mc: String(d.minecraft), loader, loaderVersion };
  }
  const sha1 = (p) => { try { return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'); } catch (e) { return null; } };
  function inside(dir, rel) {
    const abs = path.resolve(dir, rel);
    if (!abs.startsWith(path.resolve(dir) + path.sep)) throw new Error('Недопустимый путь в модпаке: ' + rel);
    return abs;
  }
  async function installMrpackInto(dir, pack, buf, send) {
    send(1, `Версия ${pack.mc}${pack.loader !== 'vanilla' ? ' + ' + pack.loader + ' ' + pack.loaderVersion : ''}…`);
    const version = await ensureVersion(pack.mc, pack.loader, pack.loaderVersion, (p, s) => send(1 + Math.floor(p * 0.39), s));
    const files = (pack.index.files || []).filter(f => !(f.env && f.env.client === 'unsupported'));
    const m = getManager();
    let done = 0, i = 0;
    const failed = [];
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++];
        const dest = inside(dir, f.path);
        const want = f.hashes && f.hashes.sha1;
        if (!(fs.existsSync(dest) && (!want || sha1(dest) === want))) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          let ok = false;
          for (const url of (f.downloads || [])) {
            try {
              await m._download(url, dest);          // _download проверяет отмену
              if (!want || sha1(dest) === want) { ok = true; break; }
            } catch (err) { if (MinecraftManager.isCancelled(err)) throw err; }
          }
          if (!ok) { try { fs.unlinkSync(dest); } catch (e) {} failed.push(path.basename(f.path)); }
        }
        done++;
        send(40 + Math.floor(done / Math.max(1, files.length) * 50), `Файлы модпака ${done}/${files.length}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
    if (failed.length) throw new Error(`Не скачано ${failed.length} файлов: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`);
    send(92, 'Распаковка overrides…');
    for (const e of pack.entries) {
      const pref = ['overrides/', 'client-overrides/'].find(p => e.name.startsWith(p));
      if (!pref || e.name.endsWith('/')) continue;
      const dest = inside(dir, e.name.slice(pref.length));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, zip.readFile(buf, e));
    }
    return { version };
  }
  async function saveIcon(dir, url) {
    if (!url) return;
    try { await downloadFile(url, path.join(dir, 'icon.png')); } catch (e) {}
  }

  // ---- IPC ----
  ipcMain.handle('inst:list', () => { try { return list(); } catch (e) { return []; } });
  ipcMain.handle('inst:get', (e, id) => { const m = read(id); return m ? describe(m) : null; });

  ipcMain.handle('inst:create', async (e, p = {}) => {
    const name = String(p.name || '').trim() || `${p.loader && p.loader !== 'vanilla' ? p.loader + ' ' : ''}${p.mc}`;
    if (!p.mc) return { ok: false, error: 'Не выбрана версия Minecraft' };
    const loader = p.loader || 'vanilla';
    if (loader !== 'vanilla' && !p.loaderVersion) return { ok: false, error: 'Не выбрана версия загрузчика' };
    const id = uniqueId(name);
    return runCreate(id, { name, mc: p.mc, loader, loaderVersion: p.loaderVersion || null, memory: p.memory || null },
      async (dir, send) => ({ version: await ensureVersion(p.mc, loader, p.loaderVersion, send) }));
  });

  ipcMain.handle('inst:installModpack', async (e, p = {}) => {
    let ver, proj = {};
    try {
      ver = p.versionId ? await httpsJson(`${MODRINTH_API}/version/${encodeURIComponent(p.versionId)}`)
        : ((await httpsJson(`${MODRINTH_API}/project/${encodeURIComponent(p.slug)}/version`)) || []).find(v => v.version_type === 'release');
      if (!ver) throw new Error('У модпака нет версий');
      try { proj = await httpsJson(`${MODRINTH_API}/project/${encodeURIComponent(ver.project_id)}`); } catch (err) {}
    } catch (err) { return { ok: false, error: err.message }; }
    const file = (ver.files || []).find(f => f.primary && /\.mrpack$/i.test(f.filename)) || (ver.files || []).find(f => /\.mrpack$/i.test(f.filename));
    if (!file) return { ok: false, error: 'В версии модпака нет файла .mrpack' };
    const name = String(p.name || '').trim() || proj.title || ver.name || 'Модпак';
    const id = uniqueId(name);
    const deps = (ver.loaders || []).find(l => l !== 'minecraft');
    return runCreate(id, {
      name, mc: (ver.game_versions || [])[0] || '', loader: LOADER_DEPS[deps] || deps || 'vanilla',
      source: { type: 'modrinth', projectId: ver.project_id, versionId: ver.id, versionNumber: ver.version_number, slug: proj.slug || p.slug, title: proj.title || name }
    }, async (dir, send) => {
      send(1, 'Скачивание модпака…');
      const tmp = path.join(os.tmpdir(), 'mgl-mrpack-' + Date.now() + '.mrpack');
      try {
        await getManager()._download(file.url, tmp, (d, t) => t && send(1 + Math.floor(d / t * 4), `Модпак ${(d / 1048576).toFixed(1)} / ${(t / 1048576).toFixed(1)} МБ`));
        const buf = fs.readFileSync(tmp);
        const pack = readMrpack(buf);
        await saveIcon(dir, proj.icon_url);
        const r = await installMrpackInto(dir, pack, buf, send);
        return { ...r, mc: pack.mc, loader: pack.loader, loaderVersion: pack.loaderVersion };
      } finally { try { fs.unlinkSync(tmp); } catch (err) {} }
    });
  });

  ipcMain.handle('inst:importMrpack', async (e, p = {}) => {
    let buf, pack;
    try {
      if (!p.file || !/\.mrpack$/i.test(p.file) || !fs.existsSync(p.file)) throw new Error('Выберите файл .mrpack');
      buf = fs.readFileSync(p.file);
      pack = readMrpack(buf);
    } catch (err) { return { ok: false, error: err.message }; }
    const name = String(p.name || '').trim() || pack.index.name || path.basename(p.file, '.mrpack');
    const id = uniqueId(name);
    return runCreate(id, {
      name, mc: pack.mc, loader: pack.loader, loaderVersion: pack.loaderVersion,
      source: { type: 'mrpack', file: path.basename(p.file), versionNumber: pack.index.versionId || null, summary: pack.index.summary || '' }
    }, (dir, send) => installMrpackInto(dir, pack, buf, send));
  });
  // ---- CurseForge (.zip с manifest.json) ----
  // Файлы качаются через публичную ссылку curseforge.com/api/v1/mods/<проект>/files/<файл>/download (редирект на CDN) - ключ API не нужен.
  // Моды с запретом на сторонние загрузки CurseForge не отдаёт: они пропускаются и перечисляются в итоге.
  function readCurse(buf) {
    const entries = zip.listEntries(buf).map(e => ({ ...e, name: e.name.replace(/\\/g, '/') }));
    const me = entries.find(e => e.name === 'manifest.json');
    if (!me) throw new Error('Это не модпак CurseForge: нет manifest.json');
    const man = JSON.parse(zip.readFile(buf, me).toString('utf8'));
    if (!man.minecraft || !man.minecraft.version) throw new Error('В модпаке не указана версия Minecraft');
    const ml = (man.minecraft.modLoaders || []).find(l => l.primary) || (man.minecraft.modLoaders || [])[0];
    let loader = 'vanilla', loaderVersion = null;
    if (ml && ml.id) {
      const m = /^(neoforge|forge|fabric|quilt)-(.+)$/i.exec(ml.id);
      if (m) { loader = m[1].toLowerCase(); loaderVersion = m[2]; }
    }
    return { entries, manifest: man, mc: String(man.minecraft.version), loader, loaderVersion };
  }
  const { net } = require('electron');
  function curseRedirect(pid, fid) {
    return new Promise((resolve, reject) => {
      const req = net.request({ url: `https://www.curseforge.com/api/v1/mods/${pid}/files/${fid}/download`, redirect: 'manual' });
      req.setHeader('User-Agent', 'MGL2/0.1');
      let settled = false;
      const fin = (fn, v) => { if (!settled) { settled = true; fn(v); } };
      req.on('redirect', (status, method, url) => { fin(resolve, url); try { req.abort(); } catch (err) {} });
      req.on('response', (res) => { fin(reject, new Error('HTTP ' + res.statusCode)); try { req.abort(); } catch (err) {} });
      req.on('error', (err) => fin(reject, err));
      req.end();
    });
  }
  async function installCurseInto(dir, pack, buf, send) {
    send(1, `Версия ${pack.mc}${pack.loader !== 'vanilla' ? ' + ' + pack.loader + ' ' + pack.loaderVersion : ''}…`);
    const version = await ensureVersion(pack.mc, pack.loader, pack.loaderVersion, (p, s) => send(1 + Math.floor(p * 0.39), s));
    const files = (pack.manifest.files || []).filter(f => f.projectID && f.fileID);
    const m = getManager();
    const modsDir = path.join(dir, 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    let done = 0, i = 0;
    const failed = [];
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++];
        try {
          const url = await curseRedirect(f.projectID, f.fileID);
          const name = decodeURIComponent(path.basename(new URL(url).pathname)).replace(/[\/:*?"<>|]/g, '_');
          const dest = path.join(modsDir, name);
          if (!fs.existsSync(dest)) await m._download(url, dest);
        } catch (err) {
          if (MinecraftManager.isCancelled(err)) throw err;
          failed.push(`${f.projectID}/${f.fileID}`);
        }
        done++;
        send(40 + Math.floor(done / Math.max(1, files.length) * 50), `Моды ${done}/${files.length}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
    send(92, 'Распаковка overrides…');
    const ov = String(pack.manifest.overrides || 'overrides').replace(/\/+$/, '') + '/';
    for (const e of pack.entries) {
      if (!e.name.startsWith(ov) || e.name.endsWith('/')) continue;
      const dest = inside(dir, e.name.slice(ov.length));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, zip.readFile(buf, e));
    }
    return { version, skipped: failed };
  }
  // единая точка для .mrpack и CurseForge .zip
  function sniffPack(buf) {
    const names = zip.listEntries(buf).map(e => e.name.replace(/\\/g, '/'));
    return names.includes('modrinth.index.json') ? 'mrpack' : names.includes('manifest.json') ? 'curse' : null;
  }
  ipcMain.handle('inst:peekPack', (e, file) => {
    try {
      const buf = fs.readFileSync(file);
      const kind = sniffPack(buf);
      if (kind === 'curse') {
        const p = readCurse(buf);
        return { ok: true, kind, name: p.manifest.name || '', summary: p.manifest.author ? 'Автор: ' + p.manifest.author : '', mc: p.mc, loader: p.loader, loaderVersion: p.loaderVersion, files: (p.manifest.files || []).length };
      }
      const pack = readMrpack(buf);
      return { ok: true, kind: 'mrpack', name: pack.index.name, summary: pack.index.summary || '', mc: pack.mc, loader: pack.loader, loaderVersion: pack.loaderVersion, files: (pack.index.files || []).length };
    } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('inst:importCurse', async (e, p = {}) => {
    let buf, pack;
    try {
      if (!p.file || !/\.zip$/i.test(p.file) || !fs.existsSync(p.file)) throw new Error('Выберите .zip модпака CurseForge');
      buf = fs.readFileSync(p.file);
      pack = readCurse(buf);
    } catch (err) { return { ok: false, error: err.message }; }
    const name = String(p.name || '').trim() || pack.manifest.name || path.basename(p.file, '.zip');
    const id = uniqueId(name);
    const res = await runCreate(id, {
      name, mc: pack.mc, loader: pack.loader, loaderVersion: pack.loaderVersion,
      source: { type: 'curseforge', file: path.basename(p.file), versionNumber: pack.manifest.version || null, summary: pack.manifest.author ? 'Автор: ' + pack.manifest.author : '' }
    }, (dir, send) => installCurseInto(dir, pack, buf, send));
    if (res.ok && res.instance && res.instance.skipped) res.skipped = res.instance.skipped;
    return res;
  });

  ipcMain.handle('inst:peekMrpack', (e, file) => {
    try {
      const pack = readMrpack(fs.readFileSync(file));
      return { ok: true, name: pack.index.name, summary: pack.index.summary || '', mc: pack.mc, loader: pack.loader, loaderVersion: pack.loaderVersion, files: (pack.index.files || []).length };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // версию сборки удалили из Библиотеки / установка прервалась - поставить заново, файлы сборки не трогаются
  ipcMain.handle('inst:repair', async (e, id) => {
    const cur = read(id);
    if (!cur) return { ok: false, error: 'Сборка не найдена' };
    const send = (progress, status) => sendRenderer('inst:progress', { id, name: cur.name, progress, status });
    try {
      const version = await getManager().runCancellable('inst:' + id, () => ensureVersion(cur.mc, cur.loader, cur.loaderVersion, send));
      const out = write(id, { version, state: 'ready' });
      send(100, 'Готово');
      return { ok: true, instance: describe(out) };
    } catch (err) {
      send(0, 'Ошибка: ' + err.message);
      return { ok: false, error: err.message, cancelled: MinecraftManager.isCancelled(err) };
    }
  });

  ipcMain.handle('inst:update', (e, { id, patch } = {}) => {
    try {
      const cur = read(id);
      if (!cur) throw new Error('Сборка не найдена');
      const allowed = {};
      ['name', 'memory', 'javaPath', 'notes', 'jvmArgs', 'resolution', 'fullscreen'].forEach(k => { if (patch && k in patch) allowed[k] = patch[k]; });
      if ('jvmArgs' in allowed) allowed.jvmArgs = String(allowed.jvmArgs || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 500) || null;
      if ('resolution' in allowed) {
        const r = allowed.resolution;
        const w = r && parseInt(r.width, 10), h = r && parseInt(r.height, 10);
        allowed.resolution = w >= 320 && h >= 240 && w <= 16384 && h <= 16384 ? { width: w, height: h } : null;
      }
      if ('fullscreen' in allowed) allowed.fullscreen = typeof allowed.fullscreen === 'boolean' ? allowed.fullscreen : null;
      if ('name' in allowed) allowed.name = String(allowed.name || '').trim().slice(0, 60) || cur.name;
      return { ok: true, instance: describe(write(id, allowed)) };
    } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('inst:setIcon', async (e, { id, file } = {}) => {
    try {
      const dest = path.join(dirOf(id), 'icon.png');
      if (file) fs.copyFileSync(file, dest); else if (fs.existsSync(dest)) fs.unlinkSync(dest);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('inst:delete', (e, id) => {
    try {
      const dir = dirOf(id);
      if (getManager().getRunning().some(r => r.folder === 'inst:' + id)) throw new Error('Сначала закройте игру');
      if (!fs.existsSync(path.join(dir, META))) throw new Error('Сборка не найдена');
      fs.rmSync(dir, { recursive: true, force: true });
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('inst:openFolder', (e, { id, sub } = {}) => {
    try {
      const dir = sub && SUBDIRS.includes(sub) ? path.join(dirOf(id), sub) : dirOf(id);
      fs.mkdirSync(dir, { recursive: true });
      shell.openPath(dir);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // ---- дублирование сборки ----
  const isGameRunning = (id) => getManager().getRunning().some(r => r.folder === 'inst:' + id);
  // файлы, которые не имеет смысла переносить в копию
  const COPY_SKIP_TOP = new Set(['logs', 'crash-reports', '.reinstall-bak']);
  async function copyTree(src, dst, skip, onStep, isCancelled) {
    const files = [];
    const walk = (abs, rel) => {
      let items = [];
      try { items = fs.readdirSync(abs, { withFileTypes: true }); } catch (e) { return; }
      for (const it of items) {
        const r = rel ? rel + '/' + it.name : it.name;
        if (skip(r, it.isDirectory())) continue;
        if (it.isDirectory()) { files.push({ rel: r, dir: true }); walk(path.join(abs, it.name), r); }
        else if (it.isFile()) files.push({ rel: r });
      }
    };
    walk(src, '');
    let i = 0;
    for (const f of files) {
      if (isCancelled()) throw Object.assign(new Error('Отменено пользователем'), { code: 'CANCELLED' });
      const to = path.join(dst, f.rel);
      if (f.dir) await fs.promises.mkdir(to, { recursive: true });
      else { await fs.promises.mkdir(path.dirname(to), { recursive: true }); await fs.promises.copyFile(path.join(src, f.rel), to); }
      if (++i % 25 === 0 || i === files.length) onStep(i, files.length);
    }
  }
  ipcMain.handle('inst:duplicate', async (e, { id, name, withWorlds = true } = {}) => {
    const cur = read(id);
    if (!cur) return { ok: false, error: 'Сборка не найдена' };
    if (cur.state === 'installing') return { ok: false, error: 'Сборка ещё устанавливается' };
    if (isGameRunning(id)) return { ok: false, error: 'Сначала закройте игру в этой сборке' };
    const newName = String(name || '').trim().slice(0, 60) || `${cur.name} (копия)`;
    const nid = uniqueId(newName);
    const src = dirOf(id), dst = path.join(root(), nid);
    const send = (progress, status) => sendRenderer('inst:progress', { id: nid, name: newName, progress, status });
    const m = getManager();
    try {
      fs.mkdirSync(dst, { recursive: true });
      send(1, 'Копирование файлов…');
      await m.runCancellable('inst:' + nid, () => copyTree(src, dst,
        (rel) => COPY_SKIP_TOP.has(rel.split('/')[0]) || (!withWorlds && rel.split('/')[0] === 'saves'),
        (done, total) => send(2 + Math.floor(done / Math.max(1, total) * 96), `Файлы ${done}/${total}`),
        () => m.isJobCancelled('inst:' + nid)));
      SUBDIRS.forEach(s => { try { fs.mkdirSync(path.join(dst, s), { recursive: true }); } catch (err) {} });
      const out = write(nid, { name: newName, created: Date.now(), lastPlayed: 0, playtime: 0, launches: 0, state: 'ready' });
      send(100, 'Готово');
      return { ok: true, instance: describe(out) };
    } catch (err) {
      try { fs.rmSync(dst, { recursive: true, force: true }); } catch (e2) {}
      send(0, 'Ошибка: ' + err.message);
      return { ok: false, error: err.message, cancelled: MinecraftManager.isCancelled(err) };
    }
  });

  // ---- экспорт в .mrpack ----
  // Моды/ресурспаки/шейдеры, найденные на Modrinth по sha1, попадают в files[] (ссылкой); остальное - в overrides/.
  const EXPORT_SKIP_TOP = new Set(['.mgl', 'instance.json', 'icon.png', 'logs', 'crash-reports', 'screenshots', 'backups', '.reinstall-bak',
    'natives', 'webcache', 'webcache2', '.fabric', '.cache', 'versions', 'libraries', 'assets', 'runtime', 'downloads', '.git',
    'mgl', 'customskinloader', 'usercache.json', 'usernamecache.json', 'launcher_profiles.json']);
  const CONTENT_DIRS = ['mods', 'resourcepacks', 'shaderpacks'];
  const hashFile = (p) => {
    const buf = fs.readFileSync(p);
    return { sha1: crypto.createHash('sha1').update(buf).digest('hex'), sha512: crypto.createHash('sha512').update(buf).digest('hex'), size: buf.length };
  };
  ipcMain.handle('inst:exportMrpack', async (e, { id, file, includeWorlds = false, versionNumber, summary } = {}) => {
    const cur = read(id);
    if (!cur) return { ok: false, error: 'Сборка не найдена' };
    if (!file || !/\.mrpack$/i.test(file)) return { ok: false, error: 'Укажите файл .mrpack' };
    const dir = dirOf(id);
    const send = (progress, status) => sendRenderer('inst:progress', { id: 'export-' + id, name: 'Экспорт: ' + cur.name, progress, status });
    let zw = null;
    try {
      send(1, 'Подготовка…');
      const mods = [], overrides = [];
      let disabled = 0;
      const walk = (abs, rel) => {
        let items = [];
        try { items = fs.readdirSync(abs, { withFileTypes: true }); } catch (err) { return; }
        for (const it of items) {
          const r = rel ? rel + '/' + it.name : it.name;
          if (!rel && (EXPORT_SKIP_TOP.has(it.name.toLowerCase()) || /^hs_err_pid/i.test(it.name))) continue;
          if (!rel && it.name.toLowerCase() === 'saves' && !includeWorlds) continue;
          if (it.isDirectory()) { walk(path.join(abs, it.name), r); continue; }
          if (!it.isFile() || /\.(log|lock|part|tmp)$/i.test(it.name)) continue;
          const parts = r.split('/');
          if (parts.length === 2 && CONTENT_DIRS.includes(parts[0])) {
            if (/\.disabled$/i.test(it.name)) { disabled++; continue; }
            if (/^MGLskin/i.test(it.name)) continue;
            if (/\.(jar|zip)$/i.test(it.name)) { mods.push(r); continue; }
          }
          overrides.push(r);
        }
      };
      walk(dir, '');

      send(5, `Хеширование ${mods.length} файлов…`);
      const hashed = mods.map((r, i) => { const h = hashFile(path.join(dir, r)); if (i % 10 === 0) send(5 + Math.floor(i / Math.max(1, mods.length) * 25), `Хеширование ${i + 1}/${mods.length}`); return { rel: r, ...h }; });

      send(32, 'Поиск файлов на Modrinth…');
      const found = new Map();
      for (let i = 0; i < hashed.length; i += 100) {
        const chunk = hashed.slice(i, i + 100);
        try {
          const res = await httpsPost(`${MODRINTH_API}/version_files`, { hashes: chunk.map(h => h.sha1), algorithm: 'sha1' });
          Object.entries(res || {}).forEach(([hash, ver]) => {
            const f = ((ver && ver.files) || []).find(x => x.hashes && x.hashes.sha1 === hash);
            if (f && f.url) found.set(hash, f);
          });
        } catch (err) { /* нет связи - файлы уйдут в overrides целиком */ }
        send(32 + Math.floor((i + chunk.length) / Math.max(1, hashed.length) * 18), `Modrinth: ${Math.min(i + 100, hashed.length)}/${hashed.length}`);
      }

      const files = [];
      let local = 0;
      hashed.forEach(h => {
        const f = found.get(h.sha1);
        if (f) files.push({ path: h.rel, hashes: { sha1: h.sha1, sha512: h.sha512 }, downloads: [f.url], fileSize: h.size });
        else { overrides.push(h.rel); local++; }
      });

      const deps = { minecraft: cur.mc };
      const key = Object.keys(LOADER_DEPS).find(k => LOADER_DEPS[k] === cur.loader);
      if (key && cur.loaderVersion) deps[key] = cur.loaderVersion;
      const index = {
        formatVersion: 1, game: 'minecraft',
        versionId: String(versionNumber || '1.0.0').slice(0, 40), name: cur.name,
        summary: String(summary != null ? summary : (cur.notes || '')).slice(0, 500),
        files, dependencies: deps
      };

      send(52, 'Упаковка…');
      zw = new ZipWriter(file);
      zw.add('modrinth.index.json', Buffer.from(JSON.stringify(index, null, 2), 'utf8'));
      overrides.forEach((r, i) => {
        try { zw.addFile('overrides/' + r, path.join(dir, r)); } catch (err) { /* файл занят/исчез - пропускаем */ }
        if (i % 20 === 0) send(52 + Math.floor(i / Math.max(1, overrides.length) * 46), `Упаковка ${i + 1}/${overrides.length}`);
      });
      zw.finish();
      send(100, 'Готово');
      return { ok: true, file, linked: files.length, overrides: overrides.length, local, disabled };
    } catch (err) {
      if (zw) zw.abort();
      send(0, 'Ошибка: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // ---- миры сборки ----
  function dirSize(dir, deadline) {
    let total = 0;
    const stack = [dir];
    while (stack.length) {
      if (Date.now() > deadline) return { size: total, partial: true };
      const d = stack.pop();
      let items = [];
      try { items = fs.readdirSync(d, { withFileTypes: true }); } catch (err) { continue; }
      for (const it of items) {
        const full = path.join(d, it.name);
        if (it.isDirectory()) stack.push(full);
        else { try { total += fs.statSync(full).size; } catch (err) {} }
      }
    }
    return { size: total, partial: false };
  }
  function worldPath(id, folder) {
    const saves = path.resolve(dirOf(id), 'saves');
    const abs = path.resolve(saves, String(folder || ''));
    if (!folder || !abs.startsWith(saves + path.sep)) throw new Error('Недопустимый мир');
    return abs;
  }
  ipcMain.handle('inst:worlds', (e, id) => {
    try {
      const saves = path.join(dirOf(id), 'saves');
      const deadline = Date.now() + 4000;
      let items = [];
      try { items = fs.readdirSync(saves, { withFileTypes: true }).filter(d => d.isDirectory()); } catch (err) {}
      const worlds = items.map(d => {
        const wdir = path.join(saves, d.name);
        let info = {}, mtime = 0;
        try { info = readLevelDat(fs.readFileSync(path.join(wdir, 'level.dat'))) || {}; } catch (err) {}
        try { mtime = fs.statSync(fs.existsSync(path.join(wdir, 'level.dat')) ? path.join(wdir, 'level.dat') : wdir).mtimeMs; } catch (err) {}
        const sz = dirSize(wdir, deadline);
        const icon = fs.existsSync(path.join(wdir, 'icon.png')) ? pathToFileURL(path.join(wdir, 'icon.png')).href : null;
        return { folder: d.name, name: info.name || d.name, gameType: info.gameType, lastPlayed: info.lastPlayed || mtime, size: sz.size, partial: sz.partial, icon, hasLevel: fs.existsSync(path.join(wdir, 'level.dat')) };
      }).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
      let backups = 0;
      try { backups = fs.readdirSync(path.join(dirOf(id), 'backups')).filter(n => /\.zip$/i.test(n)).length; } catch (err) {}
      return { ok: true, worlds, backups };
    } catch (err) { return { ok: false, error: err.message, worlds: [] }; }
  });
  ipcMain.handle('inst:worldAction', async (e, { id, folder, action } = {}) => {
    try {
      if (action === 'backups') {
        const b = path.join(dirOf(id), 'backups');
        fs.mkdirSync(b, { recursive: true });
        shell.openPath(b);
        return { ok: true };
      }
      const wdir = worldPath(id, folder);
      if (!fs.existsSync(wdir)) throw new Error('Мир не найден');
      if (action === 'open') { shell.openPath(wdir); return { ok: true }; }
      if (action === 'backup') {
        const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
        const out = path.join(dirOf(id), 'backups', `${safeFolder(folder)}_${stamp}.zip`);
        const zw = new ZipWriter(out);
        try { zw.add(folder + '/', Buffer.alloc(0)); zw.addDir(folder, wdir, (rel) => rel !== 'session.lock'); zw.finish(); }
        catch (err) { zw.abort(); throw err; }
        let size = 0; try { size = fs.statSync(out).size; } catch (err) {}
        return { ok: true, file: out, size, running: isGameRunning(id) };
      }
      if (action === 'delete') {
        if (isGameRunning(id)) throw new Error('Сначала закройте игру');
        fs.rmSync(wdir, { recursive: true, force: true });
        return { ok: true };
      }
      throw new Error('Неизвестное действие');
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // учёт времени/запусков - вызывает main после выхода из игры
  function recordPlay(id, seconds) {
    try { const cur = read(id); if (cur) write(id, { lastPlayed: Date.now(), playtime: (cur.playtime || 0) + (seconds || 0), launches: (cur.launches || 0) + 1 }); } catch (e) {}
  }

  return { root, dirOf, read, list, recordPlay, findVersionFolder };
};
