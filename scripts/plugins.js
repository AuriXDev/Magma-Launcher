(function () {
  'use strict';
  const U = window.MGL_UI;
  if (!U) return;
  const ipc = U.getIpc();
  const nodeRequire = typeof window.require === 'function' ? window.require : null;
  const esc = U.escapeHtml;
  const ACTIVATE_TIMEOUT_MS = 15000;

  let state = null;                    // описание от main (plugins:list)
  const active = new Map();            // id → { info, exports, api, disposers[] }
  const pluginViews = new Map();       // ключ вью → { pid, def }
  const settingsCards = [];            // { pid, def }
  const railButtons = [];              // { pid, def, key }
  const navLinks = [];                 // { pid, key, title }
  const instItems = [];                // { pid, def }
  const localBus = new Map();          // свои события плагинов (mgl.emit / mgl.on)
  const recentLog = [];                // последние warn/error строки для вкладки

  const normPath = (p) => String(p || '').replace(/\\/g, '/').toLowerCase();
  function blame(stack) {
    const s = normPath(stack);
    if (!s) return null;
    const all = (state && state.plugins) || [];
    for (const p of all) if (p.dir && s.includes(normPath(p.dir) + '/')) return p.id;
    return null;
  }
  function errInfo(err) {
    return { message: (err && err.message) || String(err), stack: (err && err.stack) || String(err) };
  }
  function fail(id, err, phase, fatal) {
    console.error(`[plugin ${id}] ${phase}:`, err);
    if (ipc) ipc.send('plugins:fail', { id, phase, fatal: !!fatal, ...errInfo(err) });
    if (fatal) deactivate(id, { silent: true });
  }
  function guard(id, phase, fn) {
    return function (...args) {
      try {
        const r = fn.apply(this, args);
        if (r && typeof r.then === 'function') r.catch(err => fail(id, err, phase));
        return r;
      } catch (err) { fail(id, err, phase); }
    };
  }
  window.addEventListener('error', (e) => {
    const id = blame((e.error && e.error.stack) || e.filename);
    if (!id) return;
    e.preventDefault();
    fail(id, e.error || new Error(e.message), 'renderer:uncaught', true);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const id = blame(e.reason && e.reason.stack);
    if (!id) return;
    e.preventDefault();
    fail(id, e.reason, 'renderer:promise', true);
  });

  function withTimeout(p, ms, msg) {
    let t;
    return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })]).finally(() => clearTimeout(t));
  }
  function purgeCache(dir) {
    if (!nodeRequire || !nodeRequire.cache) return;
    const d = normPath(dir) + '/';
    Object.keys(nodeRequire.cache).forEach(k => { if (normPath(k).startsWith(d)) delete nodeRequire.cache[k]; });
  }

  async function activate(info) {
    if (active.has(info.id)) return;
    const rec = { info, exports: {}, api: null, disposers: [] };
    active.set(info.id, rec);
    rec.api = makeApi(rec);
    try {
      if (info.stylePath && nodeRequire) {
        const css = nodeRequire('fs').readFileSync(info.stylePath, 'utf8');
        rec.api.ui.addStyle(css);
      }
      if (info.rendererPath && nodeRequire) {
        purgeCache(info.dir);
        let ex = nodeRequire(info.rendererPath);
        if (typeof ex === 'function') ex = { activate: ex };
        rec.exports = ex || {};
        if (typeof rec.exports.activate === 'function') {
          await withTimeout(Promise.resolve(rec.exports.activate(rec.api)), ACTIVATE_TIMEOUT_MS, 'activate() не завершился за 15 с');
        }
      }
    } catch (err) {
      fail(info.id, err, 'renderer:activate', true);
    }
  }
  function deactivate(id, opts) {
    const rec = active.get(id);
    if (!rec) return;
    active.delete(id);
    try { if (rec.exports && typeof rec.exports.deactivate === 'function') rec.exports.deactivate(); }
    catch (err) { console.error(`[plugin ${id}] deactivate`, err); }
    rec.disposers.splice(0).reverse().forEach(d => { try { d(); } catch (e) {} });
    if (rec.info.dir) purgeCache(rec.info.dir);
    if (!(opts && opts.batch)) afterUiChange(id);
  }
  function afterUiChange(id) {
    renderNav();
    U.renderRail();
    updateCount();
    const cur = U.currentView;
    if (cur && cur.startsWith('plugin.') && !pluginViews.has(cur)) U.setView('home');
    else if (cur === 'settings' || cur === 'plugins') U.refresh();
  }
  async function sync() {
    const want = new Set();
    if (state && state.enabled) state.plugins.forEach(p => { if (p.enabled && !p.invalid && !p.incompatible) want.add(p.id); });
    Array.from(active.keys()).forEach(id => { if (!want.has(id)) deactivate(id, { batch: true }); });
    for (const p of state ? state.plugins : []) if (want.has(p.id) && !active.has(p.id)) await activate(p);
    // обновим info у уже активных (пути/версия могли поменяться)
    if (state) state.plugins.forEach(p => { const r = active.get(p.id); if (r) r.info = p; });
    afterUiChange();
    if (ipc) ipc.send('plugins:ready', Array.from(active.keys()));
  }
  async function reloadRenderer(id) {
    const ids = id ? [id] : Array.from(active.keys());
    ids.forEach(x => deactivate(x, { batch: true }));
    await sync();
  }
  function makeApi(rec) {
    const id = rec.info.id;
    const track = (fn) => { rec.disposers.push(fn); return { dispose() { const i = rec.disposers.indexOf(fn); if (i >= 0) rec.disposers.splice(i, 1); try { fn(); } catch (e) {} } }; };
    const log = (level) => (...a) => {
      const text = a.map(x => x instanceof Error ? (x.stack || x.message) : typeof x === 'string' ? x : safeJson(x)).join(' ');
      (console[level] || console.log)(`[plugin ${id}]`, ...a);
      if (ipc) ipc.send('plugins:log', { id, level, text });
    };
    const storage = (op, key, value) => ipc ? ipc.sendSync('plugins:storage', { id, op, key, value }) : undefined;
    const IPC_EVENTS = { 'game:launched': 'mc:launched', 'game:exit': 'mc:exit', 'game:log': 'mc:log', 'game:error': 'mc:error', 'launch:progress': 'mc:progress' };
    const BUS_EVENTS = { 'view:change': 'view:render', 'view:leave': 'view:leave', 'settings:change': 'settings:change', 'instmenu:open': 'instmenu:open', 'rail:render': 'rail:render' };

    const api = {
      id, manifest: rec.info, dir: rec.info.dir, dataDir: rec.info.dataDir,
      launcherVersion: state ? state.launcherVersion : '',
      log: { info: log('info'), warn: log('warn'), error: log('error') },
      storage: {
        get: (k, def) => { const v = storage('get', k); return v === undefined ? def : v; },
        set: (k, v) => storage('set', k, v),
        delete: (k) => storage('delete', k),
        all: () => storage('all') || {}
      },
      ui: {
        addView(key, def) {
          const vkey = `plugin.${id}.${key}`;
          pluginViews.set(vkey, { pid: id, def });
          U.TITLES[vkey] = def.title || key;
          U.views[vkey] = () => {
            let html = '';
            try { html = def.render ? (def.render() || '') : ''; } catch (err) { fail(id, err, 'view:render'); html = '<div class="empty">Ошибка плагина при отрисовке</div>'; }
            return `<div class="view plugin-view" data-plugin-view="${esc(vkey)}">${html}</div>`;
          };
          if (def.sidebar !== false) navLinks.push({ pid: id, key: vkey, title: def.title || key });
          if (def.rail) railButtons.push({ pid: id, key: 'v:' + vkey, def: { title: def.title || key, icon: def.icon, onClick: () => U.setView(vkey) }, view: vkey });
          renderNav(); U.renderRail();
          const handle = track(() => {
            pluginViews.delete(vkey); delete U.views[vkey]; delete U.TITLES[vkey];
            removeWhere(navLinks, x => x.key === vkey); removeWhere(railButtons, x => x.view === vkey);
          });
          return { key: vkey, open: () => U.setView(vkey), dispose: handle.dispose };
        },
        openView: (key) => U.setView(key.startsWith('plugin.') ? key : `plugin.${id}.${key}`),
        addSettingsCard(def) {
          const it = { pid: id, def };
          settingsCards.push(it);
          if (U.currentView === 'settings') U.refresh();
          return track(() => removeWhere(settingsCards, x => x === it));
        },
        addTopbarButton(def) {
          const bar = document.querySelector('.topbar-actions');
          if (!bar) return track(() => {});
          const b = document.createElement('div');
          b.className = 'icon-btn plugin-topbar-btn';
          b.title = def.title || '';
          b.innerHTML = def.icon || U.I.box;
          b.addEventListener('click', guard(id, 'topbar:click', (e) => def.onClick && def.onClick(e)));
          bar.insertBefore(b, bar.querySelector('.icon-btn[data-view="settings"]') || bar.firstChild);
          return track(() => b.remove());
        },
        addRailButton(def) {
          const it = { pid: id, key: 'b:' + id + ':' + Math.random().toString(36).slice(2), def };
          railButtons.push(it); U.renderRail();
          return track(() => { removeWhere(railButtons, x => x === it); U.renderRail(); });
        },
        addInstanceMenuItem(def) {
          const it = { pid: id, def };
          instItems.push(it);
          return track(() => removeWhere(instItems, x => x === it));
        },
        addStyle(css) {
          const st = document.createElement('style');
          st.dataset.plugin = id;
          st.textContent = String(css || '');
          document.head.appendChild(st);
          return track(() => st.remove());
        },
        toast: (msg) => U.toast(String(msg)),
        notify: (title, text, view) => U.notify({ kind: 'plugin', title: String(title || rec.info.name), text: text ? String(text) : '', view }),
        modal: (opts) => U.showModal(opts),
        confirm: (opts) => U.confirmDialog(opts),
        ask: (opts) => U.appConfirm(opts),
        escapeHtml: esc,
        icons: U.I,
        refresh: () => U.refresh(),
        html(str) { const t = document.createElement('template'); t.innerHTML = String(str).trim(); return t.content.firstElementChild; }
      },
      launcher: {
        get data() { return U.D; },
        settings: { get: (k) => k ? (U.D.settings || {})[k] : { ...(U.D.settings || {}) }, save: (patch) => U.saveSettings(patch || {}) },
        launch: (folder, opts) => U.doLaunch(folder, opts && opts.username, opts),
        setView: (v) => U.setView(v),
        get currentView() { return U.currentView; },
        reloadData: () => U.reloadData(),
        downloads: U.Downloads,
        ipc,
        verLabel: U.verLabel
      },
      on(event, fn) {
        const g = guard(id, 'event:' + event, fn);
        if (IPC_EVENTS[event] && ipc) {
          const ch = IPC_EVENTS[event];
          const h = (e, d) => g(d);
          ipc.on(ch, h);
          return track(() => ipc.removeListener(ch, h));
        }
        if (BUS_EVENTS[event]) return track(U.bus.on(BUS_EVENTS[event], g));
        if (!localBus.has(event)) localBus.set(event, new Set());
        localBus.get(event).add(g);
        return track(() => localBus.get(event).delete(g));
      },
      emit(event, data) { (localBus.get(event) || []).forEach(fn => fn(data)); },
      // Связь с main.js своего плагина
      invoke: (name, ...args) => ipc ? ipc.invoke(`plugin:${id}:${name}`, ...args) : Promise.reject(new Error('нет IPC (превью в браузере)')),
      onMain(name, fn) {
        if (!ipc) return track(() => {});
        const ch = `plugin:${id}:${name}`, g = guard(id, 'main:' + name, fn), h = (e, d) => g(d);
        ipc.on(ch, h);
        return track(() => ipc.removeListener(ch, h));
      },
      onDispose: (fn) => track(fn),
      setInterval: (fn, ms) => { const t = setInterval(guard(id, 'timer', fn), ms); return track(() => clearInterval(t)); },
      setTimeout: (fn, ms) => { const t = setTimeout(guard(id, 'timer', fn), ms); return track(() => clearTimeout(t)); },
      plugins: {
        list: () => Array.from(active.keys()),
        get: (other) => { const r = active.get(other); return r ? r.exports : null; }
      },
      require: nodeRequire,
      internals: U
    };
    return api;
  }

  U.bus.on('view:render', ({ name, root }) => {
    const pv = pluginViews.get(name);
    if (pv && pv.def.mount) {
      const el = root.querySelector('[data-plugin-view]');
      const rec = active.get(pv.pid);
      guard(pv.pid, 'view:mount', () => pv.def.mount(el, rec && rec.api))();
    }
    if (name === 'settings' && settingsCards.length) {
      const view = root.querySelector('.view');
      settingsCards.forEach(({ pid, def }) => {
        const card = document.createElement('div');
        card.className = 'settings-card plugin-card';
        const pinfo = (active.get(pid) || {}).info || {};
        card.innerHTML = `<h3>${esc(def.title || pinfo.name || pid)} <span class="plugin-badge" title="Добавлено плагином ${esc(pinfo.name || pid)}">плагин</span></h3><div class="plugin-card-body"></div>`;
        const body = card.querySelector('.plugin-card-body');
        guard(pid, 'settings:render', () => { body.innerHTML = def.render ? (def.render() || '') : ''; })();
        if (def.mount) guard(pid, 'settings:mount', () => def.mount(body, (active.get(pid) || {}).api))();
        // перед карточкой «Спасибо…», иначе плагинные блоки липнут к ней снизу
        const thanks = view && view.querySelector(':scope > .thanks-card');
        if (thanks) view.insertBefore(card, thanks); else if (view) view.appendChild(card);
      });
    }
    if (name === 'plugins') bindPluginsView(root);
  });
  U.bus.on('view:leave', ({ name }) => {
    const pv = pluginViews.get(name);
    if (pv && pv.def.unmount) guard(pv.pid, 'view:unmount', () => pv.def.unmount())();
  });
  U.bus.on('rail:render', ({ el }) => {
    if (!railButtons.length) return;
    const spacer = el.querySelector('.rail-spacer');
    railButtons.forEach(({ pid, def, view }) => {
      const b = document.createElement('div');
      b.className = 'rail-item plugin-rail' + (view && view === U.currentView ? ' active' : '');
      if (view) b.dataset.view = view;
      b.title = def.title || '';
      b.innerHTML = def.icon || U.I.box;
      b.addEventListener('click', guard(pid, 'rail:click', (e) => def.onClick && def.onClick(e)));
      el.insertBefore(b, spacer || null);
    });
  });
  U.bus.on('instmenu:open', ({ inst, menu }) => {
    menu.querySelectorAll('[data-plugin-item]').forEach(n => n.remove());
    const sep = menu.querySelector('.ctx-sep');
    instItems.forEach(({ pid, def }) => {
      let show = true;
      if (def.when) { try { show = !!def.when(inst); } catch (err) { fail(pid, err, 'instmenu:when'); show = false; } }
      if (!show) return;
      const b = document.createElement('button');
      b.className = 'ctx-item' + (def.danger ? ' danger' : '');
      b.dataset.pluginItem = pid;
      b.innerHTML = `${def.icon || U.I.box}<span>${esc(def.label || 'Плагин')}</span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); U.hideInstMenu(); guard(pid, 'instmenu:click', () => def.onClick && def.onClick(inst))(); });
      menu.insertBefore(b, sep || null);
    });
  });
  function renderNav() {
    let group = document.getElementById('nav-plugins');
    if (!navLinks.length) { if (group) group.remove(); return; }
    if (!group) {
      group = document.createElement('div');
      group.className = 'nav-group';
      group.id = 'nav-plugins';
      group.innerHTML = '<div class="nav-label">Из плагинов</div><div class="nav-plugins-list"></div>';
      const ov = document.getElementById('nav-overview');
      ov && ov.parentNode.insertBefore(group, ov.nextSibling);
    }
    const list = group.querySelector('.nav-plugins-list');
    list.innerHTML = navLinks.map(n => `<div class="nav-link ${n.key === U.currentView ? 'active' : ''}" data-view="${esc(n.key)}"><span>${esc(n.title)}</span></div>`).join('');
    list.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => U.setView(el.dataset.view)));
  }
  function updateCount() {
    const el = document.getElementById('sidebar-plugin-count');
    if (el) el.textContent = active.size ? String(active.size) : '';
  }

  const PIC = {
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/></svg>',
    log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h16"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'
  };
  function statusOf(p) {
    if (p.invalid) return { cls: 'err', text: 'Ошибка манифеста' };
    if (p.incompatible) return { cls: 'err', text: `Нужен лаунчер ${p.minLauncher}+` };
    if (p.disabledReason) return { cls: 'crash', text: 'Отключён после сбоя' };
    if (!state.enabled) return { cls: 'off', text: 'Система выключена' };
    if (!p.enabled) return { cls: 'off', text: 'Выключен' };
    if (active.has(p.id) || p.mainActive) return { cls: 'on', text: 'Активен' };
    return { cls: 'err', text: 'Не загрузился' };
  }
  function iconHtml(p) {
    const src = p.icon || (window.MglArt ? MglArt.dataUrl('plugin:' + p.id) : 'assets/icons/icon.png');
    return `<img class="plugin-icon" src="${src}" alt="">`;
  }
  function pluginRow(p) {
    const st = statusOf(p);
    const parts = [p.hasMain && 'main', p.hasRenderer && 'UI', p.hasStyle && 'CSS'].filter(Boolean);
    const errLine = p.disabledReason || (p.error && (p.invalid || st.cls === 'err' || st.cls === 'crash') ? p.error : '');
    return `
      <div class="plugin-row ${p.enabled && state.enabled && !p.invalid ? '' : 'off'}" data-pid="${esc(p.id)}">
        ${iconHtml(p)}
        <div class="plugin-info">
          <div class="plugin-name">${esc(p.name)} <span class="plugin-ver">${esc(p.version ? 'v' + p.version : '')}</span>
            <span class="plugin-state ${st.cls}">${st.text}</span></div>
          <div class="plugin-desc">${esc(p.description || 'Без описания')}</div>
          <div class="plugin-meta">${esc(p.id)}${p.author ? ' · ' + esc(p.author) : ''}${parts.length ? ' · ' + parts.join(' + ') : ''}${p.homepage ? ` · <a href="#" data-pl-url="${esc(p.homepage)}">сайт</a>` : ''}</div>
          ${errLine ? `<div class="plugin-err">${esc(errLine)}</div>` : ''}
        </div>
        <div class="plugin-actions">
          <button class="btn-ghost sm-ico" data-pl-reload="${esc(p.id)}" title="Перезагрузить">${U.I.restart}</button>
          <button class="btn-ghost sm-ico" data-pl-folder="${esc(p.id)}" title="Открыть папку">${U.I.folder}</button>
          <button class="btn-ghost sm-ico" data-pl-log="${esc(p.id)}" title="Лог плагина">${PIC.log}</button>
          <button class="btn-ghost sm-ico danger" data-pl-remove="${esc(p.id)}" title="Удалить">×</button>
          ${p.invalid ? '' : `<div class="switch ${p.enabled ? 'on' : ''}" data-pl-toggle="${esc(p.id)}" title="${p.enabled ? 'Выключить' : 'Включить'}"></div>`}
        </div>
      </div>`;
  }
  U.TITLES.plugins = 'Плагины';
  U.views.plugins = function () {
    if (!state) return `<div class="view"><div class="browse-status">Загрузка плагинов…</div></div>`;
    const auto = state.autoDisabled;
    const list = state.plugins;
    const nOn = list.filter(p => p.enabled && !p.invalid).length;
    return `
      <div class="view plugins-view">
        <div class="page-head page-head-row"><div><div class="page-title">Плагины</div>
          <div class="page-sub">Расширения с полным доступом к лаунчеру · ${list.length ? `${list.length} установлено, ${nOn} включено` : 'пока ни одного'}</div></div>
          <button class="btn-secondary" id="pl-docs">${PIC.book} Как писать плагины</button></div>
        ${!ipc ? `<div class="plugin-banner info">${U.I.info}<div><b>Превью в браузере.</b> Плагины загружаются только в приложении - ниже демонстрационный список.</div></div>` : ''}
        ${auto ? `
        <div class="plugin-banner crash">${U.I.warn}
          <div class="pb-text"><b>Плагин-система отключилась автоматически</b>
            <div>${esc(auto.reason)} · ${new Date(auto.ts).toLocaleString(MGL_LOCALE)}</div>
            <div class="pb-hint">Лог сбоя сохранён. Проверьте плагины, затем включите систему снова.</div></div>
          <div class="pb-actions">
            ${auto.log ? `<button class="btn-secondary" id="pl-auto-log">Лог сбоя</button>` : ''}
            <button class="btn primary" id="pl-auto-on">Включить снова</button>
            <button class="btn-ghost" id="pl-auto-hide" title="Скрыть">×</button>
          </div>
        </div>` : ''}
        <div class="settings-card">
          <div class="toggle-row"><div><div class="tl">Плагин-система</div>
            <div class="ts">При сбое плагин или система отключатся сами, лог сохранится.</div></div>
            <div class="switch ${state.enabled ? 'on' : ''}" id="pl-system"></div></div>
          <div class="plugin-toolbar">
            <button class="btn-secondary" id="pl-create">${U.I.plus}<span class="pl-lbl">Создать</span></button>
            <button class="btn-secondary" id="pl-install-zip">${PIC.zip}<span class="pl-lbl">Из .zip</span></button>
            <button class="btn-secondary" id="pl-install-dir">${U.I.folder}<span class="pl-lbl">Из папки</span></button>
            <button class="btn-secondary" id="pl-reload-all" title="Перезагрузить все плагины">${U.I.restart}<span class="pl-lbl">Обновить</span></button>
            <button class="btn-secondary" id="pl-open-root" title="Открыть папку плагинов">${U.I.folder}<span class="pl-lbl">Папка</span></button>
            <button class="btn-secondary" id="pl-log-all" title="Журнал и логи сбоев">${PIC.log}<span class="pl-lbl">Журнал</span></button>
          </div>
          <div class="field-hint">Папка: <code class="path">${esc(state.root)}</code></div>
        </div>
        <div class="plugin-list ${state.enabled ? '' : 'sys-off'}" id="pl-list">
          ${list.length ? list.map(pluginRow).join('') : `
          <div class="empty sm">${PIC.plug}<div>Плагинов пока нет</div>
            <div class="empty-sub">Нажмите «Создать плагин» - появится рабочий пример, который можно править.</div></div>`}
        </div>
        ${recentLog.length ? `<div class="section"><div class="section-head"><div class="section-title">Последние ошибки</div></div>
          <pre class="plugin-log sm">${esc(recentLog.slice(-8).join('\n'))}</pre></div>` : ''}
      </div>`;
  };

  async function call(channel, arg, okMsg) {
    if (!ipc) { U.toast('Доступно в приложении'); return null; }
    const r = await ipc.invoke(channel, arg);
    if (r && r.state) state = r.state;
    if (r && r.ok === false) U.toast('Ошибка: ' + r.error);
    else if (okMsg && !(r && r.canceled)) U.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg);
    await sync();
    return r;
  }
  function bindPluginsView(root) {
    const $ = (s) => root.querySelector(s);
    const on = (s, fn) => { const el = $(s); if (el) el.addEventListener('click', fn); };
    on('#pl-docs', openDocs);
    on('#pl-system', async () => {
      const want = !state.enabled;
      if (!want && active.size && !(await U.confirmDialog({ title: 'Выключить плагин-систему?', message: 'Все плагины будут выгружены. Включить обратно можно здесь же.', okText: 'Выключить', danger: true }))) return;
      await call('plugins:setSystem', want, want ? 'Плагин-система включена' : 'Плагин-система выключена');
    });
    on('#pl-auto-on', () => call('plugins:setSystem', true, 'Плагин-система включена'));
    on('#pl-auto-hide', () => call('plugins:dismissAuto'));
    on('#pl-auto-log', () => openLog(null, state.autoDisabled && state.autoDisabled.log));
    on('#pl-create', createDialog);
    on('#pl-install-zip', () => call('plugins:install', 'zip', r => 'Установлен: ' + r.id));
    on('#pl-install-dir', () => call('plugins:install', 'folder', r => 'Установлен: ' + r.id));
    on('#pl-reload-all', async () => { await call('plugins:reload', null); await reloadRenderer(); U.toast('Плагины перезагружены'); });
    on('#pl-open-root', () => ipc ? ipc.send('plugins:open', null) : U.toast('Доступно в приложении'));
    on('#pl-log-all', () => openLog(null));
    root.querySelectorAll('[data-pl-toggle]').forEach(sw => sw.addEventListener('click', () => {
      const id = sw.dataset.plToggle, p = state.plugins.find(x => x.id === id);
      call('plugins:setEnabled', { id, enabled: !(p && p.enabled) });
    }));
    root.querySelectorAll('[data-pl-reload]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.plReload;
      await call('plugins:reload', id); await reloadRenderer(id); U.toast('Перезагружен: ' + id);
    }));
    root.querySelectorAll('[data-pl-folder]').forEach(b => b.addEventListener('click', () => ipc ? ipc.send('plugins:open', { id: b.dataset.plFolder }) : U.toast('Доступно в приложении')));
    root.querySelectorAll('[data-pl-log]').forEach(b => b.addEventListener('click', () => openLog(b.dataset.plLog)));
    root.querySelectorAll('[data-pl-url]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); ipc && ipc.send('open-url', a.dataset.plUrl); }));
    root.querySelectorAll('[data-pl-remove]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.plRemove, p = state.plugins.find(x => x.id === id);
      if (!(await U.confirmDialog({ title: 'Удалить плагин?', message: `Папка «${p ? p.folder : id}» будет удалена с диска. Данные плагина (plugin-data) останутся.`, okText: 'Удалить', danger: true }))) return;
      deactivate(id, { batch: true });
      await call('plugins:remove', id, 'Плагин удалён');
    }));
  }
  function createDialog() {
    U.showModal({
      title: 'Новый плагин',
      okText: 'Создать',
      bodyHtml: `
        <div class="field"><label class="field-label">Название</label>
          <input type="text" id="pl-new-name" placeholder="my-plugin" value="my-plugin"></div>
        <div class="field-hint">В папке плагинов появится рабочий пример: своя вкладка, блок в настройках, кнопка в шапке,
          пункт в меню сборки, хук запуска игры и хранилище. Откройте папку и правьте код, затем нажмите ↻.</div>`,
      onOk: async (wrap) => {
        const name = (wrap.querySelector('#pl-new-name').value || '').trim() || 'my-plugin';
        const r = await call('plugins:createTemplate', name, r => 'Создан плагин ' + r.id);
        if (r && r.ok && ipc) ipc.send('plugins:open', { id: r.id });
        return true;
      }
    });
    setTimeout(() => { const i = document.getElementById('pl-new-name'); if (i) { i.focus(); i.select(); } }, 30);
  }
  async function openDocs() {
    let text = '';
    try { text = ipc ? await ipc.invoke('plugins:readDocs') : await (await fetch('https://raw.githubusercontent.com/AuriXDev/Magma-Launcher/main/docs/PLUGINS.md')).text(); } catch (e) {}
    const wrap = U.showModal({
      title: 'Как писать плагины', okText: 'Закрыть', wide: true,
      bodyHtml: `<div class="md-doc">${text ? mdToHtml(text) : '<div class="empty sm">Файл PLUGINS.md не найден</div>'}</div>`,
      onOk: () => true
    });
    wrap.querySelector('.modal').classList.add('modal-docs');
    const cancel = wrap.querySelector('.modal-cancel'); if (cancel) cancel.style.display = 'none';
    if (text) {
      const copy = document.createElement('button');
      copy.className = 'btn-secondary md-copy';
      copy.textContent = 'Скопировать';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(text); }
        catch (e) { try { require('electron').clipboard.writeText(text); } catch (e2) { U.toast('Не удалось скопировать'); return; } }
        copy.textContent = 'Скопировано ✓';
        setTimeout(() => { if (copy.isConnected) copy.textContent = 'Скопировать'; }, 1800);
      });
      const head = wrap.querySelector('.modal-head');
      head.insertBefore(copy, head.querySelector('.modal-close'));
    }
    wrap.querySelectorAll('[data-md-url]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); ipc && ipc.send('open-url', a.dataset.mdUrl); }));
  }

  function mdInline(src) {
    const codes = [];
    let t = String(src).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = esc(t)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="#" data-md-url="$2">$1</a>');
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + esc(codes[+i]) + '</code>');
  }
  function mdHighlight(code, lang) {
    if (!/^(js|javascript|json)$/i.test(lang || '')) return esc(code);
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|async|await|new|module|exports|require|try|catch|throw|for|of|in|true|false|null)\b|\b(\d+(?:\.\d+)?)\b/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n';
      out += `<span class="md-${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  function mdToHtml(md) {
    const lines = String(md).replace(/\r/g, '').split('\n');
    const out = [];
    const LI = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
    const isSep = (l) => !!l && l.includes('-') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if (/^\s*$/.test(l)) { i++; continue; }
      if ((m = l.match(/^```\s*(\w*)/))) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre class="md-code"><code>${mdHighlight(buf.join('\n'), m[1])}</code></pre>`);
        continue;
      }
      if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`); i++; continue; }
      if (/^\s*-{3,}\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^\s*\|/.test(l) && isSep(lines[i + 1])) {
        const head = cells(l); i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push('<div class="md-table-wrap"><table><thead><tr>' + head.map(c => `<th>${mdInline(c)}</th>`).join('') + '</tr></thead><tbody>'
          + rows.map(r => '<tr>' + r.map(c => `<td>${mdInline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      if (/^>\s?/.test(l)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${mdInline(buf.join(' '))}</blockquote>`);
        continue;
      }
      if ((m = l.match(LI))) {
        const ordered = /\d/.test(m[2]), items = [];
        while (i < lines.length) {
          const mm = lines[i].match(LI);
          if (mm) { items.push(mm[3]); i++; }
          else if (/^\s+\S/.test(lines[i]) && items.length) { items[items.length - 1] += ' ' + lines[i].trim(); i++; }
          else break;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map(x => `<li>${mdInline(x)}</li>`).join('')}</${tag}>`);
        continue;
      }
      const buf = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4}\s|```|>)/.test(lines[i]) && !LI.test(lines[i]) && !(/^\s*\|/.test(lines[i]) && isSep(lines[i + 1]))) buf.push(lines[i++]);
      if (!buf.length) buf.push(lines[i++]);
      out.push(`<p>${mdInline(buf.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  async function openLog(id, crashFile) {
    if (!ipc) { U.toast('Доступно в приложении'); return; }
    const r = await ipc.invoke('plugins:readLog', id || null);
    const crashes = r.crashes || [];
    const wrap = U.showModal({
      title: id ? `Лог плагина ${id}` : 'Журнал плагинов',
      wide: true,
      okText: 'Закрыть',
      bodyHtml: `
        <div class="plugin-log-tabs">
          <button class="chip on" data-log-src="">${id ? esc(id) + '.log' : 'plugins.log'}</button>
          ${crashes.map(f => `<button class="chip" data-log-src="${esc(f)}" title="${esc(f)}">${esc(f.replace(/^crash-/, '').replace(/\.log$/, ''))}</button>`).join('')}
        </div>
        <pre class="plugin-log" id="pl-log-text">${esc(r.text || 'Лог пуст')}</pre>
        <div class="field-row" style="margin-top:10px;gap:8px">
          <button class="btn-secondary" id="pl-log-folder">Открыть папку логов</button>
          <button class="btn-secondary" id="pl-log-clear">Очистить логи</button>
        </div>`,
      onOk: () => true
    });
    const pre = wrap.querySelector('#pl-log-text');
    const show = async (src) => {
      wrap.querySelectorAll('[data-log-src]').forEach(c => c.classList.toggle('on', c.dataset.logSrc === src));
      pre.textContent = src ? (await ipc.invoke('plugins:readFile', src)) || '(пусто)' : (r.text || 'Лог пуст');
      pre.scrollTop = pre.scrollHeight;
    };
    wrap.querySelectorAll('[data-log-src]').forEach(c => c.addEventListener('click', () => show(c.dataset.logSrc)));
    wrap.querySelector('#pl-log-folder').addEventListener('click', () => ipc.send('plugins:open', 'logs'));
    wrap.querySelector('#pl-log-clear').addEventListener('click', async () => {
      await ipc.invoke('plugins:clearLogs'); pre.textContent = 'Логи очищены';
      wrap.querySelectorAll('[data-log-src]:not([data-log-src=""])').forEach(c => c.remove());
    });
    const name = crashFile ? String(crashFile).split(/[\\/]/).pop() : '';
    if (name) show(name); else pre.scrollTop = pre.scrollHeight;
  }

  let booted = false;
  async function boot() {
    if (booted) return; booted = true;
    if (!ipc) { state = previewState(); return; }
    ipc.on('plugins:crashed', async (e, d) => {
      deactivate(d.id);
      state = await ipc.invoke('plugins:list');
      const p = state.plugins.find(x => x.id === d.id);
      U.notify({ kind: 'plugin', title: `Плагин «${p ? p.name : d.id}» отключён`, text: d.reason + ' · лог сохранён', view: 'plugins' });
      if (U.currentView === 'plugins') U.refresh();
    });
    ipc.on('plugins:systemDisabled', async (e, d) => {
      Array.from(active.keys()).forEach(id => deactivate(id, { batch: true }));
      state = await ipc.invoke('plugins:list');
      afterUiChange();
      U.notify({ kind: 'plugin', title: 'Плагин-система отключена', text: d.reason, view: 'plugins' });
    });
    ipc.on('plugins:notify', (e, d) => U.notify({ kind: 'plugin', title: d.title || d.id, text: d.text || '', view: 'plugins' }));
    ipc.on('plugins:settingsChanged', (e, patch) => { U.D.settings = { ...(U.D.settings || {}), ...(patch || {}) }; });
    ipc.on('plugins:logLine', (e, d) => {
      recentLog.push(`[${new Date().toLocaleTimeString(MGL_LOCALE)}] ${d.level.toUpperCase()} ${d.id || 'host'}: ${String(d.text).split('\n')[0]}`);
      if (recentLog.length > 50) recentLog.shift();
    });
    state = await ipc.invoke('plugins:list');
    if (state.autoDisabled) U.notify({ kind: 'plugin', title: 'Плагин-система отключилась после сбоя', text: state.autoDisabled.reason, view: 'plugins' });
    await sync();
  }
  function previewState() {
    return {
      enabled: true, autoDisabled: null, root: '%APPDATA%\\magma-launcher\\plugins', logsDir: '', launcherVersion: '2.0.1',
      plugins: [
        { id: 'discord-rpc', folder: 'discord-rpc', name: 'Discord Rich Presence', version: '1.2.0', author: 'MGL Team', description: 'Показывает в Discord, во что вы играете.', enabled: true, hasMain: true, hasRenderer: true, mainActive: true },
        { id: 'auto-backup', folder: 'auto-backup', name: 'Авто-бэкап миров', version: '0.4.1', author: 'someone', description: 'Копирует saves/ после выхода из игры.', enabled: false, hasMain: true },
        { id: 'broken', folder: 'broken', name: 'Сломанный плагин', version: '0.0.1', description: 'Пример плагина, отключённого после сбоя.', enabled: false, hasRenderer: true, disabledReason: 'Сбой (renderer:activate): Cannot read properties of undefined' }
      ]
    };
  }

  function removeWhere(arr, pred) { for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) arr.splice(i, 1); }
  function safeJson(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }

  window.MglPlugins = { boot, state: () => state, active: () => Array.from(active.keys()), reload: reloadRenderer };
})();
