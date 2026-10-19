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
      pluginsEnabled: true, // плагин-система (scripts/plugin-host.js); false — выключена пользователем или после сбоя
      plugins: {},          // id -> { enabled, disabledReason, disabledAt, crashLog }
      pluginsAutoDisabled: null, // { reason, ts, log } — система отключилась сама после сбоя
      mglAuth: null         // null = локальный режим; {uid, tgId, tgUsername} после входа по базе MGL
    };
    this.data = { ...this.defaults };
    this.load();
  }
  load() {
    try {
      if (fs.existsSync(this.file)) {
        this.data = { ...this.defaults, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
      }
    } catch (e) { this.data = { ...this.defaults }; }
    if (!/^user_\d{4}_\d{4}_\d{4}_\d{4}$/.test(this.data.userId || '')) {
      this.data.userId = generateUserId();
      try { this.save(); } catch (e) {}
    }
  }
  save() {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
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
