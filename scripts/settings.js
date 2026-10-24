// Настройки лаунчера хранятся в %APPDATA%/magma-launcher/settings.json
const fs = require('fs');
const path = require('path');
const os = require('os');

class LauncherSettings {
  constructor() {
    const appDataDir = process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));
    this.dir = path.join(appDataDir, 'magma-launcher');
    this.file = path.join(this.dir, 'settings.json');
    this.defaults = {
      username: 'Player_MGL',
      javaPath: '',
      memoryMax: 2048,
      lastVersion: '',
      lastModloader: 'vanilla',
      playtimeMinutes: 0,
      playtimeSeconds: 0,
      launchCounts: {},     // folderName -> count
      serverHistory: [],    // [{name, ip, ts}]
      aliases: {},          // folderName -> alias
      pinned: [],           // folderName[]
      customServers: [],    // [{id,name,ip,ts}] - внешние серверы, только по IP
      managedServers: [],   // [{id,name,mcVersion,memory,createdAt,status}] - локальные, установленные лаунчером
      backgroundAnimation: true,
      minecraftDir: null,   // null = использовать %APPDATA%/.minecraft; строка - явный путь
      instanceJava: {},     // folderName -> путь к javaw.exe (per-instance override)
      versionTypes: { release: true, snapshot: false, old_beta: false, old_alpha: false },
      userId: generateUserId(),
      pluginsEnabled: true, // плагин-система (scripts/plugin-host.js); false - выключена пользователем или после сбоя
      plugins: {},          // id -> { enabled, disabledReason, disabledAt, crashLog }
      pluginsAutoDisabled: null, // { reason, ts, log } - система отключилась сама после сбоя
      language: 'auto',     // язык интерфейса: auto (по системе) | ru | en
      windowOnLaunch: 'keep', // что делать с окном лаунчера, когда игра запущена: keep | minimize | tray
      crashReports: true,   // сохранять локальные отчёты о сбоях (%APPDATA%/magma-launcher/crash-reports)
      crashSeenTs: 0,       // время последнего просмотренного отчёта (бейдж «новые отчёты»)
      logKeepDays: 0,       // автоочистка логов/crash-reports игры старше N дней (0 - не удалять; включается вручную)
      mglAuth: null         // null = локальный режим; {uid, tgId, tgUsername} после входа по базе MGL
    };
    this.data = { ...this.defaults };
    this.load();
  }
  load() {
    const parse = (f) => ({ ...this.defaults, ...JSON.parse(fs.readFileSync(f, 'utf8')) });
    try {
      if (fs.existsSync(this.file)) this.data = parse(this.file);
    } catch (e) {
      // файл битый (оборвалась запись) - откладываем его в сторону и берём последнюю удачную копию
      console.error('settings load error', e);
      try { fs.copyFileSync(this.file, this.file + '.corrupt'); } catch (e2) {}
      this._skipBak = true; // битый файл не должен затереть .bak при ближайшем save()
      try { this.data = parse(this.file + '.bak'); } catch (e2) { this.data = { ...this.defaults }; }
    }
    if (!/^user_\d{4}_\d{4}_\d{4}_\d{4}$/.test(this.data.userId || '')) {
      this.data.userId = generateUserId();
      try { this.save(); } catch (e) {}
    }
  }
  save() {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      // пишем во временный файл и подменяем - при падении посреди записи settings.json остаётся целым
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      try { if (!this._skipBak && fs.existsSync(this.file)) fs.copyFileSync(this.file, this.file + '.bak'); } catch (e) {}
      this._skipBak = false;
      fs.renameSync(tmp, this.file);
    } catch (e) { console.error('settings save error', e); }
  }
  get(k) { return this.data[k]; }
  set(k, v) { this.data[k] = v; }
  update(o) { this.data = { ...this.data, ...o }; }
  getAll() { return { ...this.data }; }
}
function generateUserId() {
  const seg = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `user_${seg()}_${seg()}_${seg()}_${seg()}`;
}

module.exports = LauncherSettings;
