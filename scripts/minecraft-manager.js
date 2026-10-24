// Менеджер Minecraft для MGL2
// Запускает уже установленные профили по имени папки (vanilla/forge/fabric/legacy)
// поддерживает minecraftArguments (legacy) и inheritsFrom (современные модлоадеры)
// Только встроенные модули Node (fs/https/path/child_process) без доп зависимостей
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn, execSync, execFile, execFileSync } = require('child_process');
const zipExtract = require('./zip-extract');
const { AsyncLocalStorage } = require('async_hooks');

// Отмена установки: runCancellable(key, fn) кладёт токен в async-контекст, каждый _download/цикл
// проверяет его через checkCancel() - сигнатуры install*-методов менять не нужно.
const cancelCtx = new AsyncLocalStorage();
function cancelledError() { const e = new Error('Отменено пользователем'); e.code = 'CANCELLED'; return e; }
function checkCancel() { const t = cancelCtx.getStore(); if (t && t.cancelled) throw cancelledError(); }

class MinecraftManager {
  constructor(minecraftDir, net) {
    this.minecraftDir = minecraftDir;
    this.versionsDir = path.join(minecraftDir, 'versions');
    this.assetsDir = path.join(minecraftDir, 'assets');
    this.librariesDir = path.join(minecraftDir, 'libraries');
    ensureDir(this.versionsDir); ensureDir(this.assetsDir); ensureDir(this.librariesDir);
    this.processes = new Map(); // folder -> { child, startedAt }
    this._net = net || null;
  }
  _jsonFetch(url) { return this._net ? this._net.json(url) : httpsJson(url); }
  async _download(url, dest, onProgress) {
    checkCancel();
    const r = await (this._net ? this._net.download(url, dest, onProgress) : downloadFile(url, dest, onProgress));
    checkCancel();
    return r;
  }

  runCancellable(key, fn) {
    this._jobs = this._jobs || new Map();
    const token = { key, cancelled: false, children: new Set() };
    this._jobs.set(key, token);
    return cancelCtx.run(token, () => Promise.resolve().then(fn))
      .finally(() => { if (this._jobs.get(key) === token) this._jobs.delete(key); });
  }
  cancelJob(key) {
    const t = this._jobs && this._jobs.get(key);
    if (!t) return false;
    t.cancelled = true;
    t.children.forEach(c => { try { c.kill(); } catch (e) {} });
    return true;
  }
  isJobCancelled(key) { const t = this._jobs && this._jobs.get(key); return !!(t && t.cancelled); }
  activeJobs() { return this._jobs ? Array.from(this._jobs.keys()) : []; }
  static isCancelled(err) { return !!(err && err.code === 'CANCELLED'); }

  getRunning() {
    return Array.from(this.processes.entries()).map(([folder, p]) => ({
      folder, pid: p.child.pid, startedAt: p.startedAt, version: p.version || folder
    }));
  }

  stop(folder) {
    const p = this.processes.get(folder);
    if (!p) return false;
    try { p.child.kill(); } catch (e) {}
    return true;
  }

  isVersionInstalled(name) {
    const dir = path.join(this.versionsDir, name);
    return fs.existsSync(path.join(dir, `${name}.json`));
  }

  getInstalledVersions() {
    try {
      return fs.readdirSync(this.versionsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && fs.existsSync(path.join(this.versionsDir, d.name, `${d.name}.json`)))
        .map(d => d.name);
    } catch (e) { return []; }
  }

  readVersionJson(name) {
    return readJson(path.join(this.versionsDir, name, `${name}.json`));
  }

  prefixedName(mcVersion, id) {
    const mc = String(mcVersion || '').replace(/[\\/:*?"<>|\[\]]/g, '').trim();
    const base = MinecraftManager.stripVersionPrefix(id);
    return mc ? `[${mc}] ${base}` : base;
  }
  static stripVersionPrefix(name) { return String(name || '').replace(/^\[[^\]]*\]\s*/, ''); }
  static versionPrefix(name) { const m = String(name || '').match(/^\[([^\]]+)\]/); return m ? m[1].trim() : null; }

  renameVersion(oldName, newName) {
    if (oldName === newName) return;
    const src = path.join(this.versionsDir, oldName), dst = path.join(this.versionsDir, newName);
    if (!this.isVersionInstalled(oldName)) throw new Error('Сборка не найдена: ' + oldName);
    if (fs.existsSync(dst)) throw new Error('Папка уже существует: ' + newName);
    fs.renameSync(src, dst);
    const ren = (a, b) => { const pa = path.join(dst, a); if (fs.existsSync(pa)) fs.renameSync(pa, path.join(dst, b)); };
    ren(`${oldName}.json`, `${newName}.json`);
    ren(`${oldName}.jar`, `${newName}.jar`);
    ren(`${oldName}-natives`, `${newName}-natives`);
    const jf = path.join(dst, `${newName}.json`);
    const data = readJson(jf);
    data.id = newName;
    fs.writeFileSync(jf, JSON.stringify(data, null, 2));
    for (const other of this.getInstalledVersions()) {
      if (other === newName) continue;
      const of = path.join(this.versionsDir, other, `${other}.json`);
      try {
        const d = readJson(of);
        let changed = false;
        if (d.inheritsFrom === oldName) { d.inheritsFrom = newName; changed = true; }
        if (d.jar === oldName) { d.jar = newName; changed = true; }
        if (changed) fs.writeFileSync(of, JSON.stringify(d, null, 2));
      } catch (e) {}
    }
  }

  resolveVersion(name) {
    const data = this.readVersionJson(name);
    data._id = name;
    data._clientJar = this.pickClientJar(name, data);
    if (data.inheritsFrom && this.isVersionInstalled(data.inheritsFrom)) {
      const parent = this.resolveVersion(data.inheritsFrom);
      return {
        _id: name,
        id: data.id || name,
        mainClass: data.mainClass || parent.mainClass,
        assets: data.assets || parent.assets,
        assetIndex: data.assetIndex || parent.assetIndex,
        minecraftArguments: data.minecraftArguments || parent.minecraftArguments,
        arguments: mergeArguments(parent.arguments, data.arguments),
        libraries: (data.libraries || []).concat(parent.libraries || []),
        javaVersion: data.javaVersion || parent.javaVersion,
        _clientJar: data._clientJar || parent._clientJar
      };
    }
    return data;
  }

  pickClientJar(name, data) {
    const own = path.join(this.versionsDir, name, `${name}.jar`);
    if (fs.existsSync(own)) return own;
    if (data && data.jar) {
      const byJar = path.join(this.versionsDir, data.jar, `${data.jar}.jar`);
      if (fs.existsSync(byJar)) return byJar;
    }
    return null;
  }

  nativesDir(name) {
    const candidates = [
      path.join(this.versionsDir, name, 'natives'),
      path.join(this.versionsDir, name, `${name}-natives`)
    ];
    return candidates.find(fs.existsSync) || candidates[0];
  }

  resolveNativesDir(name) {
    const seen = new Set();
    let cur = name;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const dir = this.nativesDir(cur);
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f =>
            /\.(dll|so|dylib|jnilib)$/i.test(f) || /^lwjgl/i.test(f));
          if (files.length) return dir;
        }
      } catch (e) {}
      try {
        const data = this.readVersionJson(cur);
        cur = data.inheritsFrom || null;
      } catch (e) { break; }
    }
    return this.nativesDir(name);
  }

  extractNativesFromLibs(vdata, targetDir) {
    ensureDir(targetDir);
    let extracted = 0;
    for (const lib of (vdata.libraries || [])) {
      if (!libAllowed(lib)) continue;
      const key = nativeClassifier(lib);
      if (!key) continue;
      let src = null;
      if (lib.downloads && lib.downloads.classifiers && lib.downloads.classifiers[key]) {
        src = path.join(this.librariesDir, lib.downloads.classifiers[key].path);
      } else if (lib.name) {
        const parts = lib.name.split(':');
        const group = parts[0].replace(/\./g, '/');
        const art = parts[1], ver = parts[2];
        src = path.join(this.librariesDir, group, art, ver, `${art}-${ver}-${key}.jar`);
      }
      if (src && fs.existsSync(src)) {
        try {
          const buf = fs.readFileSync(src);
          const exclude = (lib.extract && lib.extract.exclude) || ['META-INF/'];
          zipExtract.extractAll(buf, targetDir, exclude);
          extracted++;
        } catch (err) { console.warn('natives extract fail', src, err.message); }
      }
    }
    return extracted;
  }

  libPathFromName(nameStr) {
    const parts = nameStr.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1], version = parts[2];
    const classifier = parts[3] ? `-${parts[3]}` : '';
    return path.join(this.librariesDir, group, artifact, version, `${artifact}-${version}${classifier}.jar`);
  }

  findMissingLibraries(vdata) {
    const missing = [];
    (vdata.libraries || []).forEach(lib => {
      if (lib.natives) return;
      if (!libAllowed(lib)) return;
      let p = null;
      if (lib.downloads && lib.downloads.artifact && lib.downloads.artifact.path) {
        p = path.join(this.librariesDir, lib.downloads.artifact.path);
      } else if (lib.name) {
        p = this.libPathFromName(lib.name);
      }
      if (p && !fs.existsSync(p) && !missing.includes(p)) missing.push(p);
    });
    return missing;
  }

  buildClassPath(vdata) {
    const cp = [];
    (vdata.libraries || []).forEach(lib => {
      if (lib.natives) return;
      if (!libAllowed(lib)) return;
      let p = null;
      if (lib.downloads && lib.downloads.artifact && lib.downloads.artifact.path) {
        p = path.join(this.librariesDir, lib.downloads.artifact.path);
      } else if (lib.name) {
        p = this.libPathFromName(lib.name);
      }
      if (p && fs.existsSync(p) && !cp.includes(p)) cp.push(p);
    });
    if (vdata._clientJar && fs.existsSync(vdata._clientJar)) cp.push(vdata._clientJar);
    return cp.join(path.delimiter);
  }

  supportsQuickPlay(vdata) {
    const g = (vdata.arguments && vdata.arguments.game) || [];
    return g.some(a => a && typeof a === 'object' && (a.rules || []).some(r => r.features &&
      Object.keys(r.features).some(k => k.startsWith('is_quick_play'))));
  }

  buildGameArgs(vdata, ctx) {
    const res = ctx.resolution || null;
    const qp = ctx.quickPlay && ctx.quickPlay.type && ctx.quickPlay.value ? ctx.quickPlay : null;
    const map = {
      auth_player_name: ctx.username, version_name: vdata.id || vdata._id,
      game_directory: ctx.gameDir || this.minecraftDir, assets_root: this.assetsDir,
      game_assets: this.assetsDir,
      assets_index_name: vdata.assets || 'legacy',
      auth_uuid: (() => { // офлайн-UUID как у сервера: md5("OfflinePlayer:<ник>"), иначе 1.21+ падает на "Invalid UUID string: 0"
        const h = require('crypto').createHash('md5').update('OfflinePlayer:' + (ctx.username || 'Player')).digest();
        h[6] = (h[6] & 0x0f) | 0x30; h[8] = (h[8] & 0x3f) | 0x80;
        return h.toString('hex');
      })(), auth_access_token: '0', auth_session: '0',
      user_properties: '{}', user_type: 'msa', version_type: vdata.type || 'release',
      resolution_width: String(res ? res.width : 854), resolution_height: String(res ? res.height : 480),
      clientid: '0', auth_xuid: '0', natives_directory: ctx.natives,
      launcher_name: 'MGL2', launcher_version: '2.0', classpath: ctx.classpath,
      quickPlayPath: path.join(ctx.gameDir || this.minecraftDir, 'quickPlay', 'log.json'),
      quickPlaySingleplayer: qp && qp.type === 'singleplayer' ? qp.value : '',
      quickPlayMultiplayer: qp && qp.type === 'multiplayer' ? qp.value : '',
      quickPlayRealms: qp && qp.type === 'realms' ? qp.value : ''
    };
    const features = {
      has_custom_resolution: !!res,
      is_demo_user: false,
      has_quick_plays_support: !!qp,
      is_quick_play_singleplayer: !!(qp && qp.type === 'singleplayer'),
      is_quick_play_multiplayer: !!(qp && qp.type === 'multiplayer'),
      is_quick_play_realms: !!(qp && qp.type === 'realms')
    };
    const sub = (s) => s.replace(/\$\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));

    let out;
    if (vdata.minecraftArguments) {
      out = vdata.minecraftArguments.split(/\s+/).filter(Boolean).map(sub);
    } else if (vdata.arguments && vdata.arguments.game) {
      out = [];
      vdata.arguments.game.forEach(a => {
        if (typeof a === 'string') { out.push(sub(a)); return; }
        if (!a || !checkRules(a.rules, features)) return;
        [].concat(a.value).forEach(v => out.push(sub(String(v))));
      });
    } else {
      out = ['--username', ctx.username, '--version', vdata.id || vdata._id,
        '--gameDir', ctx.gameDir || this.minecraftDir, '--assetsDir', this.assetsDir,
        '--assetIndex', vdata.assets || 'legacy', '--accessToken', '0', '--userType', 'msa'];
    }
    if (res && !out.includes('--width')) out.push('--width', String(res.width), '--height', String(res.height));
    if (ctx.fullscreen && !out.includes('--fullscreen')) out.push('--fullscreen');
    if (qp && !this.supportsQuickPlay(vdata)) {
      if (qp.type === 'multiplayer') {
        const m = String(qp.value).match(/^\[?([^\]]+?)\]?(?::(\d+))?$/);
        out.push('--server', m ? m[1] : qp.value, '--port', (m && m[2]) || '25565');
      } else {
        console.warn('[MGL2] Quick Play', qp.type, 'не поддерживается этой версией - пропущено');
      }
    }
    return out;
  }

  buildJvmArgs(vdata, ctx) {
    const natives = ctx.natives, cp = ctx.classpath;
    const args = [
      `-Xmx${ctx.memoryMax}M`, `-Xms${Math.max(512, Math.floor(ctx.memoryMax / 2))}M`,
      '-Dfile.encoding=UTF-8', `-Djava.library.path=${natives}`,
      `-Dminecraft.launcher.brand=MGL2`
    ];
    if (vdata.arguments && vdata.arguments.jvm) {
      const map = { natives_directory: natives, launcher_name: 'MGL2', launcher_version: '0.1', classpath: cp,
        // нужны Forge/NeoForge 1.17+: `-p ${library_directory}/...${classpath_separator}...` (модульный запуск)
        library_directory: this.librariesDir, classpath_separator: path.delimiter,
        // для ignoreList (`${version_name}.jar`) нужно имя клиентского jar (= версия MC), а не id профиля загрузчика
        version_name: vdata._clientJar ? path.basename(vdata._clientJar, '.jar') : (vdata.inheritsFrom || vdata.id || vdata._id || ''), game_directory: ctx.gameDir || this.minecraftDir };
      const sub = (s) => s.replace(/\$\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
      vdata.arguments.jvm.forEach(a => {
        if (typeof a === 'string') args.push(sub(a));
        else if (a && a.rules && a.rules.every(r => !r.os || !r.os.arch) && checkRules(a.rules)) [].concat(a.value).forEach(v => args.push(sub(String(v))));
      });
      if (!args.includes('-cp')) { args.push('-cp', cp); }
    } else {
      args.push('-cp', cp);
    }
    return args;
  }
  async launchInstalled(name, opts) {
    const { javaPath, onProgress = () => {}, onLog = () => {} } = opts;
    const launch = opts.launch || {};
    // gameDir - папка сборки (instances/<имя>), key - id процесса/логов (inst:<id>); по умолчанию общая .minecraft и имя версии
    const gameDir = opts.gameDir || this.minecraftDir, key = opts.key || name;
    const hookEnv = {
      INST_NAME: name, INST_ID: key, INST_DIR: gameDir, INST_MC_DIR: this.minecraftDir,
      INST_JAVA: javaPath || '', INST_MC_VERSION: (() => { try { const v = this.resolveVersion(name); return v.assets || v.id || ''; } catch (e) { return ''; } })()
    };
    if (launch.preLaunch && String(launch.preLaunch).trim()) {
      onProgress(15, 'Pre-launch хук…');
      onLog({ folder: key, stream: 'stdout', line: '[pre-launch] ' + launch.preLaunch });
      const r = await runHook(launch.preLaunch, { cwd: gameDir, env: hookEnv, label: 'pre-launch', onLog: (e) => onLog({ folder: key, ...e }) });
      if (r.code !== 0) throw new Error(`Pre-launch команда завершилась с кодом ${r.code}${r.error ? ': ' + r.error : ''} - запуск отменён`);
    }
    try {
      const vd = this.resolveVersion(name);
      const plan = this.assetPlan(vd);
      if (plan.need.length) {
        const crit = plan.critical.map(it => it.hash);
        let rest = plan.background.map(it => it.hash);
        if (crit.length) {
          onProgress(18, `Докачка ассетов: ${crit.length} файлов…`);
          const r = await this.fetchAssetHashes(crit, { concurrency: 8, deadlineMs: 45000, onProgress: (p, d, t) => onProgress(18 + Math.floor(p * 0.02), `Докачка ассетов ${d}/${t}`) });
          const left = r.failed.concat(r.notStarted);
          if (left.length) {
            onLog({ folder: key, stream: 'stderr', line: `[assets] ${left.length} файлов не успели - докачиваются в фоне` });
            rest = rest.concat(left);
          }
        }
        if (rest.length) {
          const started = this.startBackgroundAssets(key, rest, {
            onProgress: (p, s) => (opts.onAssetsProgress || (() => {}))({ folder: key, progress: p, status: s, total: rest.length }),
            onDone: (res) => {
              (opts.onAssetsProgress || (() => {}))({ folder: key, progress: 100, status: res.cancelled ? 'Отменено - докачается при следующем запуске' : res.failed ? `Не скачано файлов: ${res.failed}` : 'Готово', done: true, failed: res.failed, total: res.total });
              onLog({ folder: key, stream: res.failed ? 'stderr' : 'stdout', line: `[assets] фон: ${res.total - res.failed}/${res.total}` });
            }
          });
          if (started) onLog({ folder: key, stream: 'stdout', line: `[assets] ${rest.length} файлов (звуки) докачиваются в фоне` });
        }
      }
    } catch (e) { onLog({ folder: key, stream: 'stderr', line: '[assets] проверка пропущена: ' + e.message }); }
    return this._launchProcess(name, opts, hookEnv);
  }

  _launchProcess(name, opts, hookEnv) {
    const { username, memoryMax, javaPath, onProgress = () => {}, onLog = () => {}, onExit = () => {} } = opts;
    const launch = opts.launch || {};
    const gameDir = opts.gameDir || this.minecraftDir, key = opts.key || name;
    return new Promise((resolve, reject) => {
      try {
        if (this.processes.has(key)) throw new Error('Эта сборка уже запущена');
        ensureDir(gameDir);
        if (!this.isVersionInstalled(name)) throw new Error(`Версия «${name}» не установлена`);
        onProgress(20, 'Чтение профиля…');
        const vdata = this.resolveVersion(name);
        if (!vdata.mainClass) throw new Error('В профиле нет mainClass');

        onProgress(45, 'Сборка classpath…');
        const missing = this.findMissingLibraries(vdata);
        if (missing.length) {
          throw new Error(`Не хватает ${missing.length} библиотек, переустановите версию «${name}»: ` +
            missing.slice(0, 3).map(p => path.basename(p)).join(', ') + (missing.length > 3 ? ' …' : ''));
        }
        const classpath = this.buildClassPath(vdata);
        if (!classpath) throw new Error('Не найден клиентский jar / библиотеки');
        let natives = this.resolveNativesDir(name);
        ensureDir(natives);
        const hasNatives = (() => {
          try {
            return fs.readdirSync(natives).some(f => /\.(dll|so|dylib|jnilib)$/i.test(f));
          } catch (e) { return false; }
        })();
        if (!hasNatives) {
          onProgress(55, 'Распаковка нативов…');
          const own = this.nativesDir(name);
          ensureDir(own);
          const n = this.extractNativesFromLibs(vdata, own);
          if (n > 0) natives = own;
          else console.warn('[MGL2] natives: ни один классификатор не распакован для', name);
        }
        console.log('[MGL2] natives dir:', natives);

        const res = launch.resolution && +launch.resolution.width > 0 && +launch.resolution.height > 0
          ? { width: Math.round(+launch.resolution.width), height: Math.round(+launch.resolution.height) } : null;
        const ctx = {
          username: username || 'Player', memoryMax: memoryMax || 2048, natives, classpath,
          resolution: res, fullscreen: !!launch.fullscreen, quickPlay: launch.quickPlay || null, gameDir
        };
        const jvm = this.buildJvmArgs(vdata, ctx);
        const game = this.buildGameArgs(vdata, ctx);
        const extraJvm = splitArgs(launch.extraJvmArgs);
        const args = jvm.concat(extraJvm, [vdata.mainClass], game);

        let cmd = javaPath, cmdArgs = args;
        const wrapper = splitArgs(launch.wrapper);
        if (wrapper.length) { cmd = wrapper[0]; cmdArgs = wrapper.slice(1).concat([javaPath], args); }

        onProgress(80, 'Запуск Minecraft…');
        console.log('[MGL2] java:', javaPath, wrapper.length ? '(wrapper: ' + wrapper.join(' ') + ')' : '');
        console.log('[MGL2] args:', args.join(' '));

        const child = spawn(cmd, cmdArgs, {
          cwd: gameDir,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        const startedAt = Date.now();
        this.processes.set(key, { child, startedAt, version: name, gameDir });

        const pipe = (stream, label) => {
          let buf = '';
          stream.setEncoding('utf8');
          stream.on('data', chunk => {
            buf += chunk;
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, idx).replace(/\r$/, '');
              buf = buf.slice(idx + 1);
              if (line) onLog({ folder: key, stream: label, line });
            }
          });
          stream.on('end', () => { if (buf) onLog({ folder: key, stream: label, line: buf }); });
        };
        pipe(child.stdout, 'stdout');
        pipe(child.stderr, 'stderr');

        let failed = false;
        child.on('error', (err) => {
          failed = true;
          this.processes.delete(key);
          reject(new Error('Ошибка запуска: ' + err.message));
        });
        child.on('exit', (code, signal) => {
          const ms = Date.now() - startedAt;
          const seconds = Math.max(0, Math.round(ms / 1000));
          const minutes = Math.floor(seconds / 60);
          this.processes.delete(key);
          onExit({ folder: key, code, signal, seconds, minutes });
          if (launch.postExit && String(launch.postExit).trim()) {
            runHook(launch.postExit, {
              cwd: gameDir, env: { ...hookEnv, INST_EXIT_CODE: String(code) }, label: 'post-exit',
              onLog: (e) => onLog({ folder: key, ...e })
            });
          }
        });
        setTimeout(() => {
          if (failed) return;
          onProgress(100, 'Minecraft запущен!');
          resolve(true);
        }, 3500);
      } catch (e) { reject(e); }
    });
  }

  javaMajorFor(name) {
    try {
      const v = this.resolveVersion(name);
      if (v.javaVersion && v.javaVersion.majorVersion) return v.javaVersion.majorVersion;
      // эвристика по номеру версии (если в профиле нет javaVersion)
      const idm = String(v.inheritsFrom || v.id || name).match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
      if (idm) {
        const a = +idm[1], b = +idm[2], c = +idm[3] || 0;
        if (a >= 26) return 25;                       // версии нового формата 26.x
        if (a === 1) {
          if (b >= 21 || (b === 20 && c >= 5)) return 21;
          if (b >= 18) return 17;
          if (b === 17) return 16;
          return 8;
        }
      }
      const s = (v.assets || v.id || name) + '';
      if (/^1\.(1?[0-6]|[1-9])($|\.|\b)/.test(s) || s === '1.8' || s === 'legacy') return 8;
    } catch (e) {}
    return 17;
  }

  findRuntimeJavas() {
    const roots = [
      path.join(this.minecraftDir, 'runtime'),
      path.join(process.env.LOCALAPPDATA || '', 'Packages'), // на всякий
    ].filter(Boolean);
    const found = [];
    const root = path.join(this.minecraftDir, 'runtime');
    const walk = (dir, depth) => {
      if (depth > 6 || !fs.existsSync(dir)) return;
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isFile() && e.name.toLowerCase() === 'javaw.exe') found.push(full);
        else if (e.isDirectory()) walk(full, depth + 1);
      }
    };
    walk(root, 0);
    return found;
  }

  resolveJava(name, savedPath) {
    if (savedPath && fs.existsSync(savedPath)) return savedPath;
    const major = this.javaMajorFor(name);
    const sysJava = this.findSystemJava(major);
    if (sysJava) return sysJava;
    const runtimeJavas = this.findRuntimeJavas().filter(isAsciiPath);
    const wantLegacy = major <= 8;
    // предпочесть подходящий runtime
    const pick = runtimeJavas.find(p => wantLegacy
      ? /jre-legacy|java-runtime-alpha|-8|jdk8|jre1\.8/i.test(p)
      : /java-runtime-(gamma|delta|beta)|-1[7-9]|jdk1[7-9]/i.test(p));
    if (pick) return pick;
    if (runtimeJavas.length) return runtimeJavas[0];
    const sys = [
      process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, 'bin', 'javaw.exe'),
      'C:/Program Files/Java/jre1.8.0_51/bin/javaw.exe'
    ].filter(Boolean).find(p => p && fs.existsSync(p));
    if (sys) return sys;
    try { execSync('javaw -version', { stdio: 'ignore' }); return 'javaw'; } catch (e) {}
    try { execSync('java -version', { stdio: 'ignore' }); return 'java'; } catch (e) {}
    return null;
  }

  //   forge    - 1.1+
  //   fabric   - 1.14+
  //   quilt    - 1.14+
  //   neoforge - 1.20.1+
  getAvailableModLoaders(version) {
    const list = ['vanilla'];
    if (!version) return list;
    if (cmp(version, '1.1') >= 0) list.push('forge');
    if (cmp(version, '1.14') >= 0) { list.push('fabric'); list.push('quilt'); }
    if (cmp(version, '1.20.1') >= 0) list.push('neoforge');
    return list;
  }

  getAvailableVersions() {
    return this._jsonFetch('https://launchermeta.mojang.com/mc/game/version_manifest.json')
      .then(m => m.versions.filter(v => v.type === 'release').map(v => v.id).slice(0, 40))
      .catch(() => ['1.21.1', '1.20.4', '1.20.1', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9']);
  }

  getFullManifest() {
    return this._jsonFetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
      .catch(() => this._jsonFetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'))
      .catch(() => this._jsonFetch('https://launchermeta.mojang.com/mc/game/version_manifest.json'));
  }

  async downloadLibrariesList(libraries, onProgress, basePct = 0, spanPct = 50) {
    const libs = (libraries || []).filter(l => libAllowed(l));
    let i = 0;
    for (const lib of libs) {
      i++;
      const base = basePct + Math.floor((i / libs.length) * spanPct);
      onProgress(base, `Библиотеки ${i}/${libs.length}`);
      const art = lib.downloads && lib.downloads.artifact;
      if (art && art.url) {
        const dest = path.join(this.librariesDir, art.path);
        if (!okHash(dest, art.sha1)) {
          try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
          await this._download(art.url, dest);
          verifyHash(dest, art.sha1);
        }
      } else if (lib.name) {
        const p = this.libPathFromName(lib.name);
        if (!fs.existsSync(p)) {
          const url = libUrlFromName(lib.name, lib.url);
          try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch (e) {}
          try { await this._download(url, p); } catch (e) { if (MinecraftManager.isCancelled(e)) throw e; console.warn('lib fail', lib.name, e.message); }
        }
      }
    }
  }

  async getFabricLoaders(mcVersion) {
    const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`;
    const list = await this._jsonFetch(url);
    return (list || []).map(x => (x.loader && x.loader.version) || x.loader).filter(Boolean);
  }
  async installFabric(mcVersion, loaderVersion, onProgress = () => {}) {
    onProgress(1, 'Fabric: подготовка…');
    onProgress(3, 'Fabric: проверка vanilla ' + mcVersion);
    await this.installVanilla(mcVersion, (p, s) => onProgress(3 + Math.floor(p * 0.4), s));
    onProgress(45, 'Fabric: загрузка профиля…');
    if (!loaderVersion) {
      const loaders = await this.getFabricLoaders(mcVersion);
      loaderVersion = loaders[0];
      if (!loaderVersion) throw new Error('Нет доступных версий Fabric Loader');
    }
    const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`;
    const profile = await this._jsonFetch(url);
    const id = this.prefixedName(mcVersion, profile.id || `fabric-loader-${loaderVersion}-${mcVersion}`);
    profile.id = id;
    const dir = path.join(this.versionsDir, id);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(profile, null, 2));
    onProgress(50, 'Fabric: загрузка библиотек…');
    await this.downloadLibrariesList(profile.libraries, onProgress, 50, 48);
    onProgress(100, 'Готово!');
    return { ok: true, folder: id };
  }

  async getQuiltLoaders(mcVersion) {
    const url = `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`;
    const list = await this._jsonFetch(url);
    return (list || []).map(x => (x.loader && x.loader.version) || x.loader).filter(Boolean);
  }
  async installQuilt(mcVersion, loaderVersion, onProgress = () => {}) {
    onProgress(1, 'Quilt: подготовка…');
    onProgress(3, 'Quilt: проверка vanilla ' + mcVersion);
    await this.installVanilla(mcVersion, (p, s) => onProgress(3 + Math.floor(p * 0.4), s));
    onProgress(45, 'Quilt: загрузка профиля…');
    if (!loaderVersion) {
      const loaders = await this.getQuiltLoaders(mcVersion);
      loaderVersion = loaders[0];
      if (!loaderVersion) throw new Error('Нет доступных версий Quilt Loader');
    }
    const url = `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`;
    const profile = await this._jsonFetch(url);
    const id = this.prefixedName(mcVersion, profile.id || `quilt-loader-${loaderVersion}-${mcVersion}`);
    profile.id = id;
    const dir = path.join(this.versionsDir, id);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(profile, null, 2));
    onProgress(50, 'Quilt: загрузка библиотек…');
    await this.downloadLibrariesList(profile.libraries, onProgress, 50, 48);
    onProgress(100, 'Готово!');
    return { ok: true, folder: id };
  }

  // Все версии Forge для MC: recommended и latest сверху, дальше остальные по убыванию.
  // maven-metadata.json: { "1.20.1": ["1.20.1-47.0.1", …], "1.7.10": ["1.7.10-10.13.4.1614-1.7.10", …] }
  async getForgeVersions(mcVersion) {
    const BASE = 'https://files.minecraftforge.net/net/minecraftforge/forge/';
    const [promos, meta] = await Promise.all([
      this._jsonFetch(BASE + 'promotions_slim.json').catch(() => null),
      this._jsonFetch(BASE + 'maven-metadata.json').catch(() => this._jsonFetch('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json').catch(() => null))
    ]);
    const p = (promos && promos.promos) || {};
    const rec = p[`${mcVersion}-recommended`], lat = p[`${mcVersion}-latest`];
    const all = ((meta && meta[mcVersion]) || [])
      .map(full => String(full).startsWith(mcVersion + '-') ? String(full).slice(mcVersion.length + 1) : null)
      .filter(Boolean);
    const num = (v) => String(v).split(/[-]/)[0].split('.').map(x => parseInt(x, 10) || 0);
    all.sort((a, b) => { const x = num(a), y = num(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (y[i] || 0) - (x[i] || 0); if (d) return d; } return 0; });
    const list = [];
    if (rec) list.push({ version: rec, tag: 'recommended' });
    if (lat && lat !== rec) list.push({ version: lat, tag: 'latest' });
    // в promotions версия без хвоста «-1.7.10», в metadata - с ним: сравниваем по числовой части
    const promoted = new Set([rec, lat].filter(Boolean));
    const isPromoted = (v) => promoted.has(v) || promoted.has(v.split('-')[0]);
    all.forEach(v => {
      if (isPromoted(v)) {
        // у старых веток правильное имя артефакта - из metadata (с суффиксом), подменяем
        list.forEach(x => { if (x.version === v.split('-')[0] && v.includes('-')) x.version = v; });
        return;
      }
      list.push({ version: v, tag: '' });
    });
    return list;
  }
  async installForge(mcVersion, forgeVersion, javaPath, onProgress = () => {}) {
    if (!javaPath) throw new Error('Java не найдена - установите вручную в настройках или используйте авто-Java');
    onProgress(2, 'Forge: проверка vanilla ' + mcVersion);
    await this.installVanilla(mcVersion, (p, s) => onProgress(2 + Math.floor(p * 0.45), s));
    onProgress(48, 'Forge: загрузка installer…');
    if (!forgeVersion) {
      const vers = await this.getForgeVersions(mcVersion);
      forgeVersion = vers[0] && vers[0].version;
      if (!forgeVersion) throw new Error('Forge не найден для ' + mcVersion);
    }
    const fullVer = `${mcVersion}-${forgeVersion}`;
    const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVer}/forge-${fullVer}-installer.jar`;
    const installerDir = path.join(this.minecraftDir, 'mgl', 'installers');
    ensureDir(installerDir);
    const installerJar = path.join(installerDir, `forge-${fullVer}-installer.jar`);
    await this._download(url, installerJar, (d, t) => {
      if (t) onProgress(48 + Math.floor((d / t) * 10), `Forge installer ${(d / 1024 / 1024).toFixed(1)}МБ`);
    });
    onProgress(60, 'Forge: предзагрузка legacy библиотек…');
    await this.prefetchLegacyForgeLibs((done, total, name) => {
      onProgress(60 + Math.floor((done / total) * 8), `legacy libs ${done}/${total}` + (name ? ` · ${name}` : ''));
    });
    onProgress(70, 'Forge: запуск installer…');
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this._runInstaller(javaPath, installerJar, onProgress);
        break;
      } catch (err) {
        const msg = err.message || '';
        const missing = parseMissingLibs(msg);
        if (!missing.length || attempt === 3) {
          try { fs.unlinkSync(installerJar); } catch (e) {}
          throw err;
        }
        onProgress(72 + attempt * 5, `Докачиваю ${missing.length} библиотек с зеркал (попытка ${attempt + 1}/3)…`);
        await this.downloadMavenCoords(missing, (done, total, name) =>
          onProgress(72 + attempt * 5 + Math.floor((done / total) * 4), `${done}/${total}: ${name}`));
      }
    }
    try { fs.unlinkSync(installerJar); } catch (e) {}
    onProgress(100, 'Готово!');
    return { ok: true, folder: null };
  }

  async downloadMavenCoords(coords, onProgress = () => {}) {
    const MIRRORS = [
      'https://repo1.maven.org/maven2',
      'https://files.prismlauncher.org/maven',
      'https://maven.creeperhost.net',
      'https://maven.minecraftforge.net',
      'https://maven.fabricmc.net',
      'https://libraries.minecraft.net'
    ];
    let done = 0;
    for (const coord of coords) {
      const parts = coord.split(':');
      if (parts.length < 3) { done++; continue; }
      const group = parts[0].replace(/\./g, '/');
      const artifact = parts[1];
      const version = parts[2];
      const classifier = parts[3] ? `-${parts[3]}` : '';
      const rel = `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
      const dest = path.join(this.librariesDir, rel);
      let ok = false;
      try {
        const st = fs.existsSync(dest) && fs.statSync(dest);
        if (st && st.size > 1024) ok = true;
      } catch (e) {}
      if (!ok) {
        for (const base of MIRRORS) {
          try {
            try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
            await this._download(`${base}/${rel}`, dest);
            if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) { ok = true; break; }
            try { fs.unlinkSync(dest); } catch (e) {}
          } catch (e) { if (MinecraftManager.isCancelled(e)) throw e; }
        }
      }
      done++;
      onProgress(done, coords.length, `${coord}${ok ? '' : ' ✗'}`);
    }
  }

  _legacyForgeLibMirrors() {
    const PRISM = 'https://files.prismlauncher.org/maven';
    const CENTRAL = 'https://repo1.maven.org/maven2';
    const CREEPER = 'https://maven.creeperhost.net';
    const MF = 'https://maven.minecraftforge.net';
    const def = (relPath, urls) => [relPath, urls];
    return [
      def('org/ow2/asm/asm-debug-all/5.2/asm-debug-all-5.2.jar', [
        `${PRISM}/org/ow2/asm/asm-debug-all/5.2/asm-debug-all-5.2.jar`,
        `${CREEPER}/org/ow2/asm/asm-debug-all/5.2/asm-debug-all-5.2.jar`
      ]),
      def('org/ow2/asm/asm-debug-all/5.0.3/asm-debug-all-5.0.3.jar', [
        `${PRISM}/org/ow2/asm/asm-debug-all/5.0.3/asm-debug-all-5.0.3.jar`,
        `${CREEPER}/org/ow2/asm/asm-debug-all/5.0.3/asm-debug-all-5.0.3.jar`
      ]),
      def('org/scala-lang/plugins/scala-continuations-library_2.11/1.0.2_mc/scala-continuations-library_2.11-1.0.2_mc.jar', [
        `${PRISM}/org/scala-lang/plugins/scala-continuations-library_2.11/1.0.2_mc/scala-continuations-library_2.11-1.0.2_mc.jar`,
        `${MF}/org/scala-lang/plugins/scala-continuations-library_2.11/1.0.2_mc/scala-continuations-library_2.11-1.0.2_mc.jar`
      ]),
      def('org/scala-lang/plugins/scala-continuations-plugin_2.11.1/1.0.2_mc/scala-continuations-plugin_2.11.1-1.0.2_mc.jar', [
        `${PRISM}/org/scala-lang/plugins/scala-continuations-plugin_2.11.1/1.0.2_mc/scala-continuations-plugin_2.11.1-1.0.2_mc.jar`,
        `${MF}/org/scala-lang/plugins/scala-continuations-plugin_2.11.1/1.0.2_mc/scala-continuations-plugin_2.11.1-1.0.2_mc.jar`
      ]),
      def('org/jline/jline/3.5.1/jline-3.5.1.jar', [
        `${CENTRAL}/org/jline/jline/3.5.1/jline-3.5.1.jar`,
        `${PRISM}/org/jline/jline/3.5.1/jline-3.5.1.jar`
      ]),
      def('org/apache/maven/maven-artifact/3.5.3/maven-artifact-3.5.3.jar', [
        `${CENTRAL}/org/apache/maven/maven-artifact/3.5.3/maven-artifact-3.5.3.jar`,
        `${PRISM}/org/apache/maven/maven-artifact/3.5.3/maven-artifact-3.5.3.jar`
      ])
    ];
  }

  async prefetchLegacyForgeLibs(onProgress = () => {}) {
    const list = this._legacyForgeLibMirrors();
    let done = 0;
    for (const [rel, urls] of list) {
      const dest = path.join(this.librariesDir, rel);
      try {
        const st = fs.existsSync(dest) && fs.statSync(dest);
        if (st && st.size > 1024) { done++; onProgress(done, list.length, path.basename(rel)); continue; }
      } catch (e) {}
      let got = false;
      for (const url of urls) {
        try {
          try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
          await this._download(url, dest);
          const sz = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
          if (sz > 1024) { got = true; break; }
          try { fs.unlinkSync(dest); } catch (e) {}
        } catch (e) {
          if (MinecraftManager.isCancelled(e)) throw e;
          // попробуем следующее зеркало
        }
      }
      done++;
      onProgress(done, list.length, path.basename(rel) + (got ? '' : ' (не найдена ни на одном зеркале)'));
    }
  }

  // ---------- NeoForge ----------
  async getNeoForgeVersions(mcVersion) {
    try {
      const data = await this._jsonFetch('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge');
      const all = data.versions || [];
      const m = mcVersion.match(/^1\.(\d+)(?:\.(\d+))?$/);
      if (!m) return [];
      const minor = m[1], patch = m[2] || '0';
      const prefix = `${minor}.${patch}.`;
      return all.filter(v => v.startsWith(prefix)).reverse().slice(0, 10);
    } catch (e) { return []; }
  }
  async installNeoForge(mcVersion, neoVersion, javaPath, onProgress = () => {}) {
    if (!javaPath) throw new Error('Java не найдена - установите вручную в настройках или используйте авто-Java');
    onProgress(2, 'NeoForge: проверка vanilla ' + mcVersion);
    await this.installVanilla(mcVersion, (p, s) => onProgress(2 + Math.floor(p * 0.45), s));
    onProgress(50, 'NeoForge: загрузка installer…');
    if (!neoVersion) {
      const vers = await this.getNeoForgeVersions(mcVersion);
      neoVersion = vers[0];
      if (!neoVersion) throw new Error('NeoForge не найден для ' + mcVersion);
    }
    const url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVersion}/neoforge-${neoVersion}-installer.jar`;
    const installerDir = path.join(this.minecraftDir, 'mgl', 'installers');
    ensureDir(installerDir);
    const installerJar = path.join(installerDir, `neoforge-${neoVersion}-installer.jar`);
    await this._download(url, installerJar, (d, t) => {
      if (t) onProgress(50 + Math.floor((d / t) * 15), `NeoForge installer ${(d / 1024 / 1024).toFixed(1)}МБ`);
    });
    onProgress(70, 'NeoForge: запуск installer…');
    await this._runInstaller(javaPath, installerJar, onProgress);
    try { fs.unlinkSync(installerJar); } catch (e) {}
    onProgress(100, 'Готово!');
    return { ok: true, folder: null };
  }

  _runInstaller(javaPath, installerJar, onProgress) {
    return new Promise((resolve, reject) => {
      const args = ['-jar', installerJar, '--installClient', this.minecraftDir];
      checkCancel();
      const child = spawn(javaPath, args, { cwd: path.dirname(installerJar), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      const token = cancelCtx.getStore();
      if (token) token.children.add(child);
      let out = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', c => {
        out += c;
        const last = c.trim().split('\n').pop();
        if (last) onProgress(75, 'Installer: ' + last.slice(-80));
      });
      child.stderr.on('data', c => { out += c; });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (token) token.children.delete(child);
        if (token && token.cancelled) reject(cancelledError());
        else if (code === 0) { onProgress(96, 'Installer завершён'); resolve(); }
        else reject(new Error(`installer exit ${code}: ${out.slice(-1500)}`));
      });
    });
  }

  async getJavaRuntimeIndex() {
    const urls = [
      'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json',
      'https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'
    ];
    let last;
    for (const u of urls) { try { return await this._jsonFetch(u); } catch (e) { last = e; } }
    throw last;
  }
  javaOsKey() {
    if (process.platform === 'win32') return process.arch === 'x64' ? 'windows-x64' : 'windows-x86';
    if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac-os-arm64' : 'mac-os';
    return process.arch === 'arm64' ? 'linux' : 'linux';
  }
  pickJavaComponent(major) {
    if (major <= 8) return 'jre-legacy';
    if (major <= 16) return 'java-runtime-alpha';
    if (major <= 17) return 'java-runtime-gamma';
    if (major <= 21) return 'java-runtime-delta';
    return 'java-runtime-epsilon'; // 25+
  }
  javaRuntimePath(component) {
    const osKey = this.javaOsKey();
    const bin = process.platform === 'win32' ? 'javaw.exe' : 'java';
    return path.join(this.minecraftDir, 'runtime', component, osKey, component, 'bin', bin);
  }
  javaMajorOfHome(home) {
    try {
      const rel = fs.readFileSync(path.join(home, 'release'), 'utf8');
      const m = rel.match(/JAVA_VERSION="([^"]+)"/);
      if (m) { const p = m[1].split(/[._+-]/); return +(p[0] === '1' ? p[1] : p[0]) || 0; }
    } catch (e) {}
    const n = path.basename(home);
    let m = n.match(/(?:jdk|jre)-?(\d+)/i) || n.match(/(?:^|[^\d])1\.(\d+)\./) || n.match(/^(\d+)(?:\.|$)/);
    return m ? +m[1] : 0;
  }

  scanSystemJavas() {
    if (process.platform !== 'win32') return [];
    const pf = new Set([process.env.ProgramW6432, process.env.ProgramFiles, process.env['ProgramFiles(x86)'],
      'C:\\Program Files', 'C:\\Program Files (x86)'].filter(Boolean).map(p => path.normalize(p)));
    const vendors = [['Eclipse Adoptium', 'Temurin', 0], ['Eclipse Foundation', 'Temurin', 0], ['AdoptOpenJDK', 'AdoptOpenJDK', 1],
      ['Java', 'Java', 2], ['Microsoft', 'Microsoft', 2], ['Zulu', 'Zulu', 2], ['BellSoft', 'Liberica', 2],
      ['Amazon Corretto', 'Corretto', 2], ['Semeru', 'Semeru', 2]];
    const out = [], seen = new Set();
    const add = (home, vendor, rank) => {
      const javaw = path.join(home, 'bin', 'javaw.exe');
      const key = javaw.toLowerCase();
      if (seen.has(key) || !isAsciiPath(javaw) || !fs.existsSync(javaw)) return;
      const major = this.javaMajorOfHome(home);
      if (!major) return;
      seen.add(key);
      out.push({ javaw, home, major, vendor, rank });
    };
    pf.forEach(base => vendors.forEach(([dir, vendor, rank]) => {
      const root = path.join(base, dir);
      let ents = [];
      try { ents = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()); } catch (e) { return; }
      ents.forEach(d => {
        const home = path.join(root, d.name);
        add(home, vendor, rank);
        // Azul/BellSoft и т.п. иногда кладут JDK уровнем глубже: Zulu\zulu-17\…
        if (!fs.existsSync(path.join(home, 'bin'))) {
          try { fs.readdirSync(home, { withFileTypes: true }).filter(x => x.isDirectory()).forEach(x => add(path.join(home, x.name), vendor, rank)); } catch (e) {}
        }
      });
    }));
    // Реестр (установщики Temurin/Oracle/Zulu/Microsoft пишут путь сюда) + свежие JAVA_HOME/PATH:
    // process.env фиксируется при старте лаунчера, и Java, поставленная пока он открыт, иначе не находилась.
    const reg = this._registryJavaHomes();
    reg.homes.forEach(h => add(h, 'Registry', 2));
    [process.env.JAVA_HOME, ...reg.javaHome].filter(Boolean).forEach(h => add(stripSep(h), 'JAVA_HOME', 3));
    [...String(process.env.PATH || '').split(';'), ...reg.pathDirs].map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean).forEach(dir => {
      const d = stripSep(dir);
      if (/[\\/]bin$/i.test(d) && fs.existsSync(path.join(d, 'javaw.exe'))) add(path.dirname(d), 'PATH', 3);
    });
    return out;
  }

  // Первый вызов - синхронно, дальше кеш обновляется в фоне не чаще раза в 4 с
  // (UI опрашивает java:scan каждые 2 с, а reg.exe ~0.4 с - главный процесс блокировать нельзя).
  _registryJavaHomes() {
    const empty = { homes: [], javaHome: [], pathDirs: [] };
    if (process.platform !== 'win32') return empty;
    const keys = [
      ['HKLM\\SOFTWARE\\JavaSoft', true], ['HKLM\\SOFTWARE\\Eclipse Adoptium', true], ['HKLM\\SOFTWARE\\Eclipse Foundation', true],
      ['HKLM\\SOFTWARE\\AdoptOpenJDK', true], ['HKLM\\SOFTWARE\\Azul Systems', true], ['HKLM\\SOFTWARE\\Microsoft\\JDK', true],
      ['HKLM\\SOFTWARE\\BellSoft', true], ['HKLM\\SOFTWARE\\Amazon Corretto', true], ['HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft', true],
      ['HKCU\\SOFTWARE\\JavaSoft', true],
      ['HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment', false], ['HKCU\\Environment', false]];
    const expand = (s) => s.replace(/%([^%]+)%/g, (m, k) => process.env[k] || m);
    const parse = (outs) => {
      const data = { homes: [], javaHome: [], pathDirs: [] };
      outs.forEach((txt, i) => {
        const env = !keys[i][1];
        String(txt || '').split(/\r?\n/).forEach(l => {
          const m = l.match(/^\s+(\S+)\s+REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/i);
          if (!m) return;
          const name = m[1], value = expand(m[2]);
          if (!env) { if (/^(JavaHome|Path|InstallationPath)$/i.test(name)) data.homes.push(stripSep(value)); }
          else if (/^JAVA_HOME$/i.test(name)) data.javaHome.push(value);
          else if (/^Path$/i.test(name)) data.pathDirs.push(...value.split(';'));
        });
      });
      return data;
    };
    const args = (k) => ['query', k[0], ...(k[1] ? ['/s'] : [])];
    const opts = { encoding: 'utf8', timeout: 3000, windowsHide: true };
    if (!this._regCache) {
      const outs = keys.map(k => { try { return execFileSync('reg', args(k), { ...opts, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return ''; } });
      this._regCache = { ts: Date.now(), data: parse(outs) };
    } else if (!this._regBusy && Date.now() - this._regCache.ts > 4000) {
      this._regBusy = true;
      Promise.all(keys.map(k => new Promise(r => execFile('reg', args(k), opts, (err, out) => r(err ? '' : out)))))
        .then(outs => { this._regCache = { ts: Date.now(), data: parse(outs) }; })
        .finally(() => { this._regBusy = false; });
    }
    return this._regCache.data;
  }

  findSystemJava(major, list) {
    const ok = (list || this.scanSystemJavas()).filter(j => major <= 8 ? j.major === 8 : j.major >= major);
    ok.sort((a, b) => ((a.major === major ? 0 : 1) - (b.major === major ? 0 : 1)) || (a.rank - b.rank) || (a.major - b.major));
    return ok.length ? ok[0].javaw : null;
  }

  resolveLaunchJava(major, explicit) {
    if (explicit && fs.existsSync(explicit)) return explicit;
    const sys = this.findSystemJava(major);
    if (sys) return sys;
    const target = this.javaRuntimePath(this.pickJavaComponent(major));
    if (fs.existsSync(target) && isAsciiPath(target)) return target;
    return null;
  }

  async ensureJava(major, onProgress = () => {}) {
    const sys = this.findSystemJava(major);
    if (sys) return sys;
    const component = this.pickJavaComponent(major);
    const target = this.javaRuntimePath(component);
    if (!isAsciiPath(target)) {
      const err = new Error(`Не найдена Java ${major}. Установите Eclipse Temurin ${major} (Adoptium) - рантайм Mojang не работает в пути с кириллицей.`);
      err.code = 'JAVA_MISSING'; err.major = major;
      throw err;
    }
    if (fs.existsSync(target)) return target;
    onProgress(1, `Java ${major}: загрузка манифеста…`);
    const idx = await this.getJavaRuntimeIndex();
    const osKey = this.javaOsKey();
    const osBlock = idx[osKey] || idx['windows-x64'] || {};
    const comp = (osBlock[component] || [])[0];
    if (!comp || !comp.manifest || !comp.manifest.url) {
      throw new Error(`Java runtime ${component} недоступен для ${osKey}`);
    }
    onProgress(3, `Java ${major}: манифест…`);
    const manifest = await this._jsonFetch(comp.manifest.url);
    const root = path.join(this.minecraftDir, 'runtime', component, osKey, component);
    ensureDir(root);
    const files = Object.entries(manifest.files || {});
    const toDownload = files.filter(([, info]) => info.type === 'file');
    let i = 0;
    for (const [relPath, info] of files) {
      i++;
      const abs = path.join(root, relPath);
      if (info.type === 'directory') { ensureDir(abs); continue; }
      if (info.type === 'link') { /* пропускаем */ continue; }
      if (info.type !== 'file') continue;
      const dl = info.downloads && (info.downloads.raw || info.downloads.lzma);
      if (!dl || !dl.url) continue;
      const sha = (info.downloads.raw && info.downloads.raw.sha1) || null;
      if (!okHash(abs, sha)) {
        try { fs.mkdirSync(path.dirname(abs), { recursive: true }); } catch (e) {}
        await this._download(dl.url, abs);
        if (sha) {
          try { verifyHash(abs, sha); } catch (e) { /* некоторые файлы приходят через lzma - пропускаем проверку */ }
        }
      }
      if (info.executable && process.platform !== 'win32') {
        try { fs.chmodSync(abs, 0o755); } catch (e) {}
      }
      const pct2 = Math.floor((i / files.length) * 97);
      if (i % 10 === 0 || i === files.length) {
        onProgress(3 + pct2, `Java ${major}: ${i}/${files.length}`);
      }
    }
    onProgress(100, `Java ${major} установлена`);
    return target;
  }

  assetPlan(vdata, opts = {}) {
    const ai = vdata.assetIndex;
    if (!ai) return { total: 0, need: [], critical: [], background: [] };
    const indexPath = path.join(this.assetsDir, 'indexes', `${ai.id}.json`);
    if (!fs.existsSync(indexPath)) return { total: 0, need: [], critical: [], background: [], noIndex: true, ai };
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const seen = new Set(), items = [];
    Object.entries(index.objects || {}).forEach(([name, o]) => {
      if (!o || !o.hash || seen.has(o.hash)) return;
      seen.add(o.hash);
      items.push({ hash: o.hash, size: o.size || 0, name });
    });
    const destOf = (h) => path.join(this.assetsDir, 'objects', h.slice(0, 2), h);
    const need = items.filter(it => {
      const d = destOf(it.hash);
      if (opts.verify) return !okHash(d, it.hash);
      try { return fs.statSync(d).size === 0; } catch (e) { return true; }
    });
    const isSound = (it) => /^minecraft\/sounds\//.test(it.name) || /\.ogg$/i.test(it.name);
    return {
      total: items.length, need, ai,
      critical: need.filter(it => !isSound(it)),
      background: need.filter(isSound)
    };
  }

  async fetchAssetHashes(hashes, { concurrency = 6, deadlineMs = 0, onProgress = () => {} } = {}) {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const destOf = (h) => path.join(this.assetsDir, 'objects', h.slice(0, 2), h);
    const fetchOne = async (h) => {
      const dest = destOf(h), tmp = dest + '.part';
      for (let a = 0; a < 3; a++) {
        try {
          try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
          await this._download(`https://resources.download.minecraft.net/${h.slice(0, 2)}/${h}`, tmp);
          if (!fs.existsSync(tmp) || fs.statSync(tmp).size === 0) throw new Error('empty');
          if (sha1File(tmp) !== h) throw new Error('sha1 mismatch');
          fs.renameSync(tmp, dest);
          return true;
        } catch (e) {
          try { fs.unlinkSync(tmp); } catch (e2) {}
          if (MinecraftManager.isCancelled(e)) throw e;
          if (a < 2) await sleep(400 * (a + 1));
        }
      }
      return false;
    };
    const failed = [], started = Date.now();
    let i = 0, done = 0;
    const worker = async () => {
      while (i < hashes.length) {
        checkCancel();
        if (deadlineMs && Date.now() - started > deadlineMs) return;
        const h = hashes[i++];
        if (!(await fetchOne(h))) failed.push(h);
        done++;
        if (done % 10 === 0 || done === hashes.length) onProgress(Math.floor(done / hashes.length * 100), done, hashes.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, hashes.length) }, worker));
    return { failed, notStarted: hashes.slice(i), done };
  }
  async syncAssets(vdata, onProgress = () => {}, opts = {}) {
    const ai = vdata.assetIndex;
    if (!ai || !ai.url) return { total: 0, missing: 0, failed: 0 };
    const indexPath = path.join(this.assetsDir, 'indexes', `${ai.id}.json`);
    ensureDir(path.dirname(indexPath));
    if (!okHash(indexPath, ai.sha1)) await this._download(ai.url, indexPath);
    const plan = this.assetPlan(vdata, { verify: !!opts.verify });
    const hashes = plan.need.map(it => it.hash);
    if (!hashes.length) return { total: plan.total, missing: 0, failed: 0 };
    const r = await this.fetchAssetHashes(hashes, { concurrency: opts.concurrency || 8, onProgress: (p, d, t) => onProgress(p, `Ассеты ${d}/${t}`) });
    let failed = r.failed;
    if (failed.length) {
      onProgress(99, `Повторная докачка: ${failed.length}`);
      await new Promise(res => setTimeout(res, 1500));
      checkCancel();
      failed = (await this.fetchAssetHashes(failed, { concurrency: 2 })).failed;
    }
    return { total: plan.total, missing: hashes.length, failed: failed.length };
  }

  startBackgroundAssets(key, hashes, { onProgress = () => {}, onDone = () => {} } = {}) {
    this._assetJobs = this._assetJobs || new Set();
    if (!hashes.length || this._assetJobs.has(key)) return false;
    this._assetJobs.add(key);
    // ключ отмены 'assets:<папка>' совпадает с id задачи в трее загрузок
    this.runCancellable('assets:' + key, async () => {
      let failed = [], cancelled = false;
      try {
        const r = await this.fetchAssetHashes(hashes, { concurrency: 4, onProgress: (p, d, t) => onProgress(p, `Ассеты (звуки): ${d}/${t}`) });
        failed = r.failed;
        if (failed.length) {
          await new Promise(res => setTimeout(res, 3000));
          checkCancel();
          failed = (await this.fetchAssetHashes(failed, { concurrency: 2 })).failed;
        }
      } catch (e) { failed = hashes; cancelled = MinecraftManager.isCancelled(e); }
      this._assetJobs.delete(key);
      onDone({ total: hashes.length, failed: failed.length, cancelled });
    }).catch(() => {});
    return true;
  }

  async installVanilla(id, onProgress = () => {}) {
    onProgress(1, 'Получение манифеста…');
    const manifest = await this.getFullManifest();
    const meta = (manifest.versions || []).find(v => v.id === id);
    if (!meta) throw new Error('Версия не найдена: ' + id);

    const versionDir = path.join(this.versionsDir, id);
    ensureDir(versionDir);

    onProgress(3, `Загрузка профиля ${id}…`);
    const vdata = await this._jsonFetch(meta.url);
    fs.writeFileSync(path.join(versionDir, `${id}.json`), JSON.stringify(vdata, null, 2));

    const client = vdata.downloads && vdata.downloads.client;
    if (!client || !client.url) throw new Error('Нет client.jar для этой версии');
    const jarPath = path.join(versionDir, `${id}.jar`);
    if (!okHash(jarPath, client.sha1)) {
      onProgress(8, 'Скачивание client.jar…');
      await this._download(client.url, jarPath, (d, t) => onProgress(8 + pct(d, t, 10), 'client.jar'));
      verifyHash(jarPath, client.sha1);
    }

    const libs = (vdata.libraries || []).filter(l => libAllowed(l));
    const nativesDir = path.join(versionDir, 'natives');
    ensureDir(nativesDir);
    let i = 0;
    for (const lib of libs) {
      i++;
      const base = 20 + Math.floor((i / libs.length) * 40);
      onProgress(base, `Библиотеки ${i}/${libs.length}`);
      // artifact
      const art = lib.downloads && lib.downloads.artifact;
      if (art && art.url) {
        const dest = path.join(this.librariesDir, art.path);
        if (!okHash(dest, art.sha1)) {
          try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
          await this._download(art.url, dest);
          verifyHash(dest, art.sha1);
        }
      } else if (lib.name) {
        const p = this.libPathFromName(lib.name);
        if (!fs.existsSync(p)) {
          const url = libUrlFromName(lib.name, lib.url);
          try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch (e) {}
          try { await this._download(url, p); } catch (e) { if (MinecraftManager.isCancelled(e)) throw e; console.warn('lib fail', lib.name, e.message); }
        }
      }
      const key = nativeClassifier(lib);
      const classifiers = lib.downloads && lib.downloads.classifiers;
      if (key && classifiers && classifiers[key]) {
        const nn = classifiers[key];
        const dest = path.join(this.librariesDir, nn.path);
        if (!okHash(dest, nn.sha1)) {
          try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
          await this._download(nn.url, dest);
          verifyHash(dest, nn.sha1);
        }
        try {
          const buf = fs.readFileSync(dest);
          const exclude = (lib.extract && lib.extract.exclude) || ['META-INF/'];
          zipExtract.extractAll(buf, nativesDir, exclude);
        } catch (err) { console.warn('natives extract fail', dest, err.message); }
      }
    }

    onProgress(62, 'Индекс ассетов…');
    const as = await this.syncAssets(vdata, (p, st) => onProgress(65 + Math.floor(p * 0.33), st), { verify: true });
    if (as.failed) {
      throw new Error(`Не скачано ${as.failed} из ${as.total} файлов ассетов (проверьте интернет/VPN и нажмите «Переустановить»)`);
    }

    onProgress(100, 'Готово!');
    return { ok: true, folder: id };
  }
}

function parseMissingLibs(text) {
  if (!text) return [];
  const coordRe = /\b([a-zA-Z][\w.-]*(?:\.[\w.-]+)+):([\w.-]+):([\w.-]+(?:_mc)?)(?::([\w.-]+))?\b/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = coordRe.exec(text))) {
    const coord = m[0];
    if (!/^\d/.test(m[3])) continue;
    if (!seen.has(coord)) { seen.add(coord); out.push(coord); }
  }
  return out;
}

function nativeClassifier(lib) {
  const n = lib.natives;
  if (!n) return null;
  const osn = n[process.platform === 'win32' ? 'windows' : (process.platform === 'darwin' ? 'osx' : 'linux')];
  if (!osn) return null;
  // ${arch} у legacy-нативов - только 32/64; arm64 JVM всё равно 64-битная
  return osn.replace('${arch}', process.arch === 'ia32' ? '32' : '64');
}
function libUrlFromName(name, baseUrl) {
  const parts = name.split(':');
  const group = parts[0].replace(/\./g, '/');
  const artifact = parts[1], version = parts[2];
  const classifier = parts[3] ? `-${parts[3]}` : '';
  const url = (baseUrl || 'https://libraries.minecraft.net/').replace(/\/?$/, '/');
  return `${url}${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
}
function sha1File(p) {
  try { return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'); } catch (e) { return null; }
}
function okHash(p, sha1) {
  if (!fs.existsSync(p)) return false;
  if (!sha1) return true;
  return sha1File(p) === sha1;
}
function verifyHash(p, sha1) {
  if (!sha1) return;
  const h = sha1File(p);
  if (h !== sha1) throw new Error(`sha1 mismatch: ${p} (${h} ≠ ${sha1})`);
}
function pct(done, total, span) {
  if (!total) return 0;
  return Math.floor((done / total) * span);
}

function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} }
function isAsciiPath(p) { return /^[\x00-\x7F]*$/.test(String(p)); }
function stripSep(p) { return path.normalize(String(p).trim()).replace(/[\\/]+$/, ''); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function mergeArguments(parent, child) {
  if (!parent && !child) return undefined;
  const p = parent || {}, c = child || {};
  return { game: (c.game || []).concat(p.game || []), jvm: (c.jvm || []).concat(p.jvm || []) };
}
// ---- Правила по ОС / разрядности (формат Mojang: rules[].os {name, arch, version}) ----
const MOJANG_OS = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
// Mojang: arch "x86" = 32-битная JVM/ОС; для arm64 Windows/Mac - "arm64"
const MOJANG_ARCH = process.arch === 'ia32' ? 'x86' : process.arch === 'arm64' ? 'arm64' : 'x64';
let _osRelease = null;
function osVersion() {
  if (_osRelease == null) { try { _osRelease = require('os').release(); } catch (e) { _osRelease = ''; } }
  return _osRelease;
}
function osRuleMatches(o) {
  if (!o) return true;
  if (o.name && o.name !== MOJANG_OS && !(o.name === 'macos' && MOJANG_OS === 'osx')) return false;
  if (o.arch) {
    const a = String(o.arch).toLowerCase();
    const want = a === 'x86' || a === 'i386' ? 'x86' : a === 'aarch64' || a === 'arm64' ? 'arm64' : a === 'x86_64' || a === 'amd64' ? 'x64' : a;
    if (want !== MOJANG_ARCH) return false;
  }
  if (o.version) { try { if (!new RegExp(o.version).test(osVersion())) return false; } catch (e) {} }
  return true;
}
function checkRules(rules, features) {
  if (!rules || !rules.length) return true;
  let allow = false;
  for (const r of rules) {
    const featOk = !r.features || Object.keys(r.features).every(k => !!(features && features[k]) === !!r.features[k]);
    const match = osRuleMatches(r.os) && featOk;
    if (r.action === 'allow') { if (match) allow = true; }
    else if (r.action === 'disallow') { if (match) allow = false; }
  }
  return allow;
}
// Библиотека нужна на этой машине: rules + нативы новых профилей (1.19+), где ОС/разрядность
// закодированы в classifier имени: org.lwjgl:lwjgl:3.3.1:natives-windows-x86 / -arm64.
function libAllowed(lib) {
  if (!lib || !checkRules(lib.rules)) return false;
  const cls = String(lib.name || '').split(':')[3] || '';
  const m = cls.match(/^natives-(windows|macos|osx|linux)(?:-(x86|x86_64|arm64|aarch64|arm32))?$/i);
  if (!m) return true;
  const os = m[1].toLowerCase() === 'macos' ? 'osx' : m[1].toLowerCase();
  if (os !== MOJANG_OS) return false;
  const a = (m[2] || '').toLowerCase();
  const arch = !a || a === 'x86_64' ? 'x64' : a === 'x86' ? 'x86' : a === 'arm32' ? 'arm32' : 'arm64';
  return arch === MOJANG_ARCH;
}
function splitArgs(str) {
  const out = [];
  const re = /"((?:\\"|[^"])*)"|'([^']*)'|([^\s"']+)/g;
  let m, cur = null, lastEnd = -1;
  while ((m = re.exec(String(str || '')))) {
    const piece = m[1] != null ? m[1].replace(/\\"/g, '"') : m[2] != null ? m[2] : m[3];
    if (cur != null && m.index === lastEnd) cur += piece; else { if (cur != null) out.push(cur); cur = piece; }
    lastEnd = m.index + m[0].length;
  }
  if (cur != null) out.push(cur);
  return out;
}
function runHook(cmd, { cwd, env, onLog, label }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, env: { ...process.env, ...env }, shell: true, windowsHide: true });
    const pipe = (s, stream) => {
      let buf = '';
      s.setEncoding('utf8');
      s.on('data', c => {
        buf += c;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); if (line) onLog({ stream, line: `[${label}] ${line}` }); }
      });
      s.on('end', () => { if (buf) onLog({ stream, line: `[${label}] ${buf}` }); });
    };
    pipe(child.stdout, 'stdout');
    pipe(child.stderr, 'stderr');
    child.on('error', (err) => resolve({ code: -1, error: err.message }));
    child.on('exit', (code) => resolve({ code }));
  });
}
function cmp(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0); if (d) return d;
  }
  return 0;
}
const UA = 'MGL2/0.1 (+https://github.com/) Node';
const REQ_HEADERS = { 'User-Agent': UA, 'Accept': '*/*', 'Connection': 'close' };

function httpsJson(url) {
  return httpsBufferRetry(url).then(buf => JSON.parse(buf.toString('utf8')));
}

async function httpsBufferRetry(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await httpsBuffer(url); }
    catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    hostname: u.hostname,
    port: u.port || 443,
    path: u.pathname + u.search,
    protocol: u.protocol,
    headers: { ...REQ_HEADERS, Host: u.hostname }
  };
}

function httpsBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const opts = parseUrl(url);
    const req = https.request(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects > 5) return reject(new Error('too many redirects'));
        const next = new URL(res.headers.location, url).toString();
        return httpsBuffer(next, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + url));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function downloadFile(url, dest, onProgress) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try { return await downloadFileOnce(url, dest, onProgress); }
    catch (e) {
      lastErr = e;
      if (i < 2) await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

function downloadFileOnce(url, dest, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    const opts = parseUrl(url);
    const req = https.request(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects > 5) return reject(new Error('too many redirects'));
        const next = new URL(res.headers.location, url).toString();
        return downloadFileOnce(next, dest, onProgress, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + url));
      const total = parseInt(res.headers['content-length'] || '0', 10);
      try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (e) {}
      const out = fs.createWriteStream(dest);
      let done = 0;
      res.on('data', c => { done += c.length; onProgress && onProgress(done, total); });
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve()));
      out.on('error', reject);
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

module.exports = MinecraftManager;
module.exports.splitArgs = splitArgs;
