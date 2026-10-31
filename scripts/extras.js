// Дополнения главного процесса: автобэкапы миров и серверов, проверка обновлений модов, скриншоты,
// разбор крашей, игроки/расписание managed-серверов. Подключается из main.js (createExtras(deps)).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { ZipWriter } = require('./zip-write');
const zipx = require('./zip-extract');

const MODRINTH_API = 'https://api.modrinth.com/v2';
const MAX_WORLD_BYTES = 2.5 * 1024 * 1024 * 1024;   // ZIP без zip64 - до 4 ГБ, с запасом
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 60) || 'world';
const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);

module.exports = function createExtras(d) {
  const { ipcMain, shell, clipboard, nativeImage, settings, minecraftDir, instances, sendRenderer, httpsJson, httpsPost, downloadFile,
    contentRoot, contentDirFor, readContentIndex, writeContentIndex, serverProcs, managedEntry, managedDir, srvLog,
    startManagedServer, stopManagedServer, isGameRunning } = d;

  // ---------- размер папки (с потолком, чтобы не считать вечно) ----------
  function dirSizeDeep(dir, limit) {
    let total = 0;
    const walk = (p) => {
      if (total > limit) return;
      let items = [];
      try { items = fs.readdirSync(p, { withFileTypes: true }); } catch (e) { return; }
      for (const it of items) {
        const full = path.join(p, it.name);
        if (it.isDirectory()) walk(full);
        else { try { total += fs.statSync(full).size; } catch (e) {} }
      }
    };
    walk(dir);
    return total;
  }
  const keepCount = () => Math.max(1, parseInt(settings.get('backupKeep'), 10) || 5);

  function prune(dir, re, keep) {
    try {
      const files = fs.readdirSync(dir).filter(n => re.test(n)).sort().reverse();
      files.slice(keep).forEach(n => { try { fs.unlinkSync(path.join(dir, n)); } catch (e) {} });
    } catch (e) {}
  }

  // ---------- автобэкап миров игры ----------
  // Копируются только миры, изменившиеся с прошлого автобэкапа (по mtime level.dat). Имя: <мир>_auto_<дата>.zip
  const backupBusy = new Set();
  async function backupWorlds(gameDir, { force = false } = {}) {
    const key = path.resolve(gameDir);
    if (backupBusy.has(key)) return [];
    backupBusy.add(key);
    const made = [];
    try {
      const saves = path.join(gameDir, 'saves'), bdir = path.join(gameDir, 'backups');
      const stateFile = path.join(bdir, '.auto-state.json');
      let state = {};
      try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) || {}; } catch (e) {}
      let items = [];
      try { items = fs.readdirSync(saves, { withFileTypes: true }).filter(x => x.isDirectory()); } catch (e) { return made; }
      for (const it of items) {
        const wdir = path.join(saves, it.name);
        let mt;
        try { mt = fs.statSync(path.join(wdir, 'level.dat')).mtimeMs; } catch (e) { continue; }
        if (!force && state[it.name] && mt <= state[it.name]) continue;
        if (dirSizeDeep(wdir, MAX_WORLD_BYTES) > MAX_WORLD_BYTES) continue;
        await sleep(0);
        const out = path.join(bdir, `${safeName(it.name)}_auto_${stamp()}.zip`);
        const zw = new ZipWriter(out);
        try {
          zw.add(it.name + '/', Buffer.alloc(0));
          zw.addDir(it.name, wdir, (rel) => rel !== 'session.lock');
          zw.finish();
          state[it.name] = mt;
          made.push(it.name);
          prune(bdir, new RegExp('^' + safeName(it.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_auto_.*\\.zip$'), keepCount());
        } catch (e) { zw.abort(); }
      }
      if (made.length) { try { fs.writeFileSync(stateFile, JSON.stringify(state)); } catch (e) {} }
    } finally { backupBusy.delete(key); }
    return made;
  }
  const gameDirOf = (id) => id ? instances.dirOf(id) : minecraftDir();
  ipcMain.handle('bk:run', async (e, { id } = {}) => {
    try { return { ok: true, worlds: await backupWorlds(gameDirOf(id), { force: true }) }; }
    catch (err) { return { ok: false, error: err.message }; }
  });

  // ---------- «Бекапы» в настройках: общий список, открыть/удалить/восстановить ----------
  // scope: 'g' - общая .minecraft, 'i:<id>' - сборка, 's:<id>' - сервер
  function scopeDir(scope) {
    scope = String(scope || '');
    if (scope === 'g') return path.join(minecraftDir(), 'backups');
    if (scope.startsWith('i:')) return path.join(instances.dirOf(scope.slice(2)), 'backups');
    if (scope.startsWith('s:')) { const id = scope.slice(2); if (!managedEntry(id)) throw new Error('Сервер не найден'); return serverBackupDir(id); }
    throw new Error('Неизвестное хранилище');
  }
  const scopeGameDir = (scope) => scope === 'g' ? minecraftDir() : instances.dirOf(scope.slice(2));
  function listBackupsIn(dir, scope, label, kind) {
    let names = [];
    try { names = fs.readdirSync(dir).filter(n => /.zip$/i.test(n)); } catch (e) { return []; }
    return names.map(n => {
      let st; try { st = fs.statSync(path.join(dir, n)); } catch (e) { return null; }
      return { scope, label, kind, file: n, size: st.size, mtime: st.mtimeMs, auto: /_auto_/.test(n) };
    }).filter(Boolean);
  }
  ipcMain.handle('bk:list', () => {
    try {
      const out = [];
      out.push(...listBackupsIn(path.join(minecraftDir(), 'backups'), 'g', 'Общая папка .minecraft', 'world'));
      instances.list().forEach(i => out.push(...listBackupsIn(path.join(instances.dirOf(i.id), 'backups'), 'i:' + i.id, i.name, 'world')));
      (settings.get('managedServers') || []).forEach(s => out.push(...listBackupsIn(serverBackupDir(s.id), 's:' + s.id, s.name, 'server')));
      out.sort((a, b) => b.mtime - a.mtime);
      return { ok: true, list: out };
    } catch (err) { return { ok: false, error: err.message, list: [] }; }
  });
  ipcMain.handle('bk:action', async (e, { scope, file, action } = {}) => {
    try {
      const dir = scopeDir(scope);
      if (action === 'folder') { fs.mkdirSync(dir, { recursive: true }); shell.openPath(dir); return { ok: true }; }
      const f = path.resolve(dir, path.basename(String(file || '')));
      if (!f.startsWith(path.resolve(dir) + path.sep) || !fs.existsSync(f)) throw new Error('Файл не найден');
      if (action === 'reveal') { shell.showItemInFolder(f); return { ok: true }; }
      if (action === 'delete') { fs.unlinkSync(f); return { ok: true }; }
      if (action === 'restore') {
        if (scope.startsWith('s:')) throw new Error('Восстановление сервера - вручную: распакуйте архив в папку сервера');
        if (isGameRunning(scope === 'g' ? '' : scope.slice(2), scope)) throw new Error('Сначала закройте игру');
        const saves = path.join(scopeGameDir(scope), 'saves');
        const buf = fs.readFileSync(f);
        const top = Array.from(new Set(zipx.listEntries(buf).map(x => x.name.split('/')[0]).filter(Boolean)));
        if (top.length !== 1) throw new Error('В архиве должна быть одна папка мира');
        const world = path.join(saves, top[0]);
        let moved = null;
        if (fs.existsSync(world)) { moved = top[0] + '_replaced_' + stamp(); fs.renameSync(world, path.join(saves, moved)); }
        fs.mkdirSync(saves, { recursive: true });
        zipx.extractAll(buf, saves);
        return { ok: true, world: top[0], replacedAs: moved };
      }
      throw new Error('Неизвестное действие');
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // ---------- бэкап managed-сервера ----------
  const lastServerBackup = new Map();
  const serverBackupDir = (id) => path.join(minecraftDir(), 'mgl', 'server-backups', id);
  async function backupServer(id) {
    const entry = managedEntry(id);
    if (!entry) throw new Error('Сервер не найден');
    const dir = managedDir(id);
    const proc = serverProcs.get(id);
    const live = !!(proc && proc.child && proc.state === 'running');
    const cmd = (c) => { try { proc.child.stdin.write(c + '\n'); } catch (e) {} };
    if (live) { cmd('save-off'); cmd('save-all flush'); await sleep(5000); }
    const out = path.join(serverBackupDir(id), `${safeName(entry.name)}_${stamp()}.zip`);
    const zw = new ZipWriter(out);
    try {
      zw.addDir('', dir, (rel) => !/^(logs|crash-reports|cache|backups|server\.jar|session\.lock)(\/|$)/.test(rel) && !/(^|\/)session\.lock$/.test(rel));
      zw.finish();
    } catch (err) { zw.abort(); throw err; }
    finally { if (live) cmd('save-on'); }
    lastServerBackup.set(id, Date.now());
    prune(serverBackupDir(id), /\.zip$/i, keepCount());
    let size = 0; try { size = fs.statSync(out).size; } catch (e) {}
    srvLog(id, `Бэкап сервера сохранён: ${path.basename(out)} (${(size / 1048576).toFixed(1)} МБ)`, 'system');
    return { file: out, size };
  }
  ipcMain.handle('srv:backup', async (e, id) => {
    try { return { ok: true, ...(await backupServer(id)) }; } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('srv:openBackups', (e, id) => {
    try { fs.mkdirSync(serverBackupDir(id), { recursive: true }); shell.openPath(serverBackupDir(id)); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });

  // ---------- игроки сервера (по строкам лога) ----------
  const players = new Map();      // id -> Set(nick)
  function onServerLine(id, line) {
    let m = /\]: ([\w.]{1,32}) joined the game/.exec(line);
    if (m) { (players.get(id) || players.set(id, new Set()).get(id)).add(m[1]); return; }
    m = /\]: ([\w.]{1,32}) (?:left the game|lost connection)/.exec(line);
    if (m) { const s = players.get(id); if (s) s.delete(m[1]); return; }
    m = /There are \d+ of a max of \d+ players online:\s*(.*)$/.exec(line);
    if (m) players.set(id, new Set(m[1].split(',').map(x => x.trim()).filter(Boolean)));
  }
  function onServerStopped(id) { players.delete(id); }
  ipcMain.handle('srv:players', (e, id) => Array.from(players.get(id) || []));

  // ---------- расписание серверов: автозапуск, перезапуск, бэкап ----------
  function startScheduler() {
    setTimeout(() => {
      (settings.get('managedServers') || []).filter(s => s.autoStart).forEach(s => {
        if (!serverProcs.has(s.id)) startManagedServer(s.id).catch(() => {});
      });
    }, 4000);
    const boot = Date.now();
    setInterval(() => {
      const now = Date.now();
      (settings.get('managedServers') || []).forEach(s => {
        const p = serverProcs.get(s.id);
        if (!p || p.state !== 'running') return;
        const bh = +s.backupHours || 0;
        if (bh > 0 && now - (lastServerBackup.get(s.id) || Math.max(boot, p.startedAt || 0)) >= bh * 3600e3) {
          lastServerBackup.set(s.id, now);
          backupServer(s.id).catch(err => srvLog(s.id, 'Бэкап не удался: ' + err.message, 'stderr'));
        }
        const rh = +s.restartHours || 0;
        if (rh > 0 && !p.restartPlanned && now - (p.startedAt || now) >= rh * 3600e3) {
          p.restartPlanned = true;
          try { p.child.stdin.write('say Плановый перезапуск сервера через 30 секунд\n'); } catch (e) {}
          srvLog(s.id, 'Плановый перезапуск через 30 с', 'system');
          setTimeout(() => { if (serverProcs.get(s.id) === p) stopManagedServer(s.id, { restart: true }); }, 30000);
        }
      });
    }, 60000);
  }

  // ---------- обновления модов (Modrinth, по sha1 файлов) ----------
  const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
  function updateFilters(p) {
    let loader = p.loader, mc = p.gameVersion;
    if (p.instance) { const i = instances.read(p.instance); if (i) { loader = i.loader; mc = i.mc; } }
    const loaders = !loader || loader === 'vanilla' ? ['fabric', 'forge', 'neoforge', 'quilt'] : (loader === 'quilt' ? ['quilt', 'fabric'] : [loader]);
    return { loaders, gameVersions: mc ? [mc] : [] };
  }
  ipcMain.handle('modrinth:checkUpdates', async (e, params) => {
    try {
      const p = params || {};
      const root = contentRoot(p), dir = contentDirFor('mod', root);
      const { loaders, gameVersions } = updateFilters(p);
      if (!gameVersions.length) return { ok: false, error: 'Не известна версия игры - выберите версию в фильтре или откройте мод из сборки' };
      const idx = readContentIndex(root);
      let files = [];
      try { files = fs.readdirSync(dir).filter(n => /\.jar$/i.test(n) && !/^MGLskin/i.test(n)); } catch (err) {}
      if (!files.length) return { ok: true, updates: [], total: 0 };
      const byHash = {};
      files.forEach(n => { try { byHash[sha1(path.join(dir, n))] = n; } catch (err) {} });
      const res = await httpsPost(`${MODRINTH_API}/version_files/update`, { hashes: Object.keys(byHash), algorithm: 'sha1', loaders, game_versions: gameVersions });
      const updates = [];
      for (const [hash, v] of Object.entries(res || {})) {
        const filename = byHash[hash];
        const primary = (v.files || []).find(f => f.primary) || (v.files || [])[0];
        if (!filename || !primary || (primary.hashes && primary.hashes.sha1 === hash)) continue;
        const meta = idx[filename] || {};
        updates.push({ filename, title: meta.title || filename.replace(/\.jar$/i, ''), slug: meta.slug || '', current: meta.version_number || '',
          latest: v.version_number || v.name || '', versionId: v.id, projectId: v.project_id, newFilename: primary.filename, url: primary.url, size: primary.size || 0, versionType: v.version_type });
      }
      updates.sort((a, b) => a.title.localeCompare(b.title));
      return { ok: true, updates, total: files.length };
    } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('modrinth:applyUpdates', async (e, params) => {
    const p = params || {};
    const done = [], failed = [];
    try {
      const root = contentRoot(p), dir = contentDirFor('mod', root);
      const idx = readContentIndex(root);
      for (const u of (p.items || [])) {
        try {
          if (!/^https:\/\/(cdn\.modrinth\.com|cdn-raw\.modrinth\.com)\//.test(u.url || '')) throw new Error('Недопустимая ссылка');
          const newName = String(u.newFilename || '').replace(/[/\\?%*:|"<>]/g, '_');
          const oldName = path.basename(String(u.filename || ''));
          if (!/\.jar$/i.test(newName) || !/\.jar$/i.test(oldName)) throw new Error('Недопустимое имя файла');
          const dest = path.join(dir, newName), tmp = dest + '.part';
          await downloadFile(u.url, tmp);
          if (newName !== oldName && fs.existsSync(path.join(dir, oldName))) fs.unlinkSync(path.join(dir, oldName));
          fs.renameSync(tmp, dest);
          const old = idx[oldName] || {};
          delete idx[oldName];
          idx[newName] = { ...old, project_id: u.projectId, version_id: u.versionId, version_number: u.latest, title: old.title || u.title, slug: old.slug || u.slug, type: 'mod', ts: Date.now() };
          done.push(u.title);
        } catch (err) { failed.push(`${u.title}: ${err.message}`); }
      }
      writeContentIndex(idx, root);
      return { ok: true, done, failed };
    } catch (err) { return { ok: false, error: err.message, done, failed }; }
  });

  // ---------- скриншоты ----------
  const shotsDir = (id) => path.join(gameDirOf(id), 'screenshots');
  const shotPath = (id, name) => {
    const base = path.resolve(shotsDir(id));
    const abs = path.resolve(base, path.basename(String(name || '')));
    if (!abs.startsWith(base + path.sep)) throw new Error('Недопустимый файл');
    return abs;
  };
  ipcMain.handle('shots:list', (e, { id } = {}) => {
    try {
      const dir = shotsDir(id);
      const list = fs.readdirSync(dir).filter(n => /\.(png|jpe?g)$/i.test(n)).map(n => {
        const st = fs.statSync(path.join(dir, n));
        return { name: n, url: pathToFileURL(path.join(dir, n)).href, mtime: st.mtimeMs, size: st.size };
      }).sort((a, b) => b.mtime - a.mtime).slice(0, 400);
      return { ok: true, list };
    } catch (err) { return { ok: true, list: [] }; }
  });
  ipcMain.handle('shots:action', (e, { id, name, action } = {}) => {
    try {
      if (action === 'folder') { fs.mkdirSync(shotsDir(id), { recursive: true }); shell.openPath(shotsDir(id)); return { ok: true }; }
      const f = shotPath(id, name);
      if (!fs.existsSync(f)) throw new Error('Файл не найден');
      if (action === 'open') { shell.openPath(f); return { ok: true }; }
      if (action === 'reveal') { shell.showItemInFolder(f); return { ok: true }; }
      if (action === 'copy') { clipboard.writeImage(nativeImage.createFromPath(f)); return { ok: true }; }
      if (action === 'delete') { fs.unlinkSync(f); return { ok: true }; }
      throw new Error('Неизвестное действие');
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // ---------- разбор лога/краша: подсказки по частым причинам ----------
  const JAVA_BY_CLASS = { 52: 8, 53: 9, 54: 10, 55: 11, 60: 16, 61: 17, 62: 18, 63: 19, 64: 20, 65: 21, 66: 22, 67: 23, 68: 24, 69: 25 };
  function analyzeCrash(text) {
    const t = String(text || '');
    const hints = [];
    const add = (title, hint) => { if (hints.length < 7 && !hints.some(h => h.title === title)) hints.push({ title, hint }); };
    let m;
    if (/OutOfMemoryError|GC overhead limit exceeded/.test(t)) add('Не хватает памяти', 'Игре не хватило оперативной памяти. Увеличьте память в Настройках (или в параметрах сборки) и отключите лишние моды/шейдеры.');
    if ((m = /(?:Unsupported class file major version|class file version) (\d+)/.exec(t)) || /UnsupportedClassVersionError/.test(t)) {
      const need = m && JAVA_BY_CLASS[+m[1]];
      add('Не та версия Java', need ? `Мод или игра требует Java ${need} или новее. Выберите подходящую Java в параметрах сборки («Java»).` : 'Версия Java не подходит этой игре или моду. Выберите нужную Java в параметрах сборки.');
    }
    if (/Could not reserve enough space|Invalid maximum heap size|Too small initial heap/.test(t)) add('Слишком много памяти для JVM', 'Выделено больше памяти, чем доступно, либо установлена 32-битная Java. Уменьшите память или поставьте 64-битную Java.');
    if (/could not open .*jvm\.cfg/i.test(t)) add('Java в папке с кириллицей', 'Java не запускается из пути с русскими буквами. Установите Java в Program Files (Temurin) и выберите её в параметрах.');
    if (/Mixin apply failed|MixinApplyError|InvalidInjectionException|MixinTransformerError|Mixin transformation of/.test(t)) {
      const mixin = /mixins?\.([\w.-]+)\.json/i.exec(t);
      add('Конфликт модов (Mixin)', `Один из модов не совместим с другим или с версией игры${mixin ? ` (замешан «${mixin[1]}»)` : ''}. Отключите недавно добавленные моды или обновите их через «Обновления модов».`);
    }
    if (/DuplicateModsFoundException|Duplicate mods? found|Found a duplicate mod/i.test(t)) add('Дубликаты модов', 'В папке mods лежат две версии одного мода. Оставьте только одну.');
    if ((m = /Mod '([^']+)'[^\n]*?(?:requires|depends on)[^\n]*/i.exec(t)) || /Missing or unsupported mandatory dependencies|Incompatible mod set|ModResolutionException|requires .* version/i.test(t)) {
      add('Не хватает зависимости мода', m ? `${m[0].slice(0, 160)}. Установите нужный мод/версию (часто это Fabric API / Architectury / библиотека).` : 'Какому-то моду нужна другая версия игры, загрузчика или мод-библиотека. Смотрите строку «requires» в отчёте.');
    }
    if (/NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError/.test(t)) add('Не найден класс/метод', 'Обычно мод собран под другую версию игры или загрузчика, либо не установлен мод-библиотека. Проверьте версии модов.');
    if (/GLFW error|Pixel format not accelerated|WGL_ARB|OpenGL|failed to create (?:the )?window|GL_INVALID|EXCEPTION_ACCESS_VIOLATION/i.test(t)) add('Проблема с видеодрайвером', 'Обновите драйвер видеокарты. Закройте оверлеи (Discord, MSI Afterburner, NVIDIA/AMD оверлей), отключите шейдеры. На ноутбуке выберите дискретную видеокарту для Java.');
    if (/hs_err_pid|EXCEPTION_ACCESS_VIOLATION|SIGSEGV/.test(t)) add('Сбой JVM (нативный)', 'Игра упала на уровне JVM. Частые причины: драйвер видеокарты, оверлеи, нехватка памяти, мод с нативным кодом. Попробуйте другую Java (Temurin 17/21).');
    if (/UnknownHostException|Connection timed out|SSLHandshakeException|Connection reset/i.test(t)) add('Проблемы с сетью', 'Не удалось подключиться к серверу. Проверьте интернет, VPN/файрвол.');
    if (/Failed to load a world|Exception reading|ChunkLoadingException|Failed to read chunk|Corrupt/i.test(t)) add('Повреждён мир', 'Похоже, мир или чанки повреждены. Восстановите мир из бэкапа (вкладка «Миры» → папка бэкапов).');
    if (/Ticking entity|Ticking block entity/.test(t)) add('Сломана сущность или блок', 'Игра упала при обработке блока/сущности (часто из-за мода). В отчёте игры указаны координаты и тип - уберите соответствующий мод или удалите блок.');
    return hints;
  }
  ipcMain.handle('crash:analyze', (e, text) => ({ ok: true, hints: analyzeCrash(text) }));

  return { backupWorlds, onServerLine, onServerStopped, startScheduler, analyzeCrash };
};
