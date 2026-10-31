// «Сборки» (views.packs / views.pack): список сборок, создание (версия + модлоадер), импорт .mrpack,
// модпаки Modrinth, браузер модов для выбранной сборки и страница сборки с её контентом.
// Бэкенд - scripts/instances.js (IPC inst:*), контент - modrinth:* с параметром instance.
(function () {
  'use strict';
  const U = window.MGL_UI;
  if (!U) return;
  const { D, views, TITLES, I, escapeHtml: esc, toast, showModal, confirmDialog, getIpc, LOADER, artFor, modrinthCard } = U;
  const content = U.content;

  const S = {
    tab: 'my',          // my | modpacks | mods
    packId: null,       // открытая сборка (views.pack)
    packTab: 'mod',     // mod | resourcepack | shader | browse
    target: null        // сборка-цель во вкладке «Моды для сборок»
  };
  const TYPE_DIR = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' };
  const TYPE_NAME = { mod: 'Моды', resourcepack: 'Ресурспаки', shader: 'Шейдеры', modpack: 'Модпаки' };

  const DEMO = [
    { id: 'Demo Fabric', name: 'Демо: Fabric + Sodium', mc: '1.20.1', loader: 'fabric', loaderVersion: '0.16.10', ready: true, mods: 14, modsOff: 1, worlds: 2, playtime: 5400, created: Date.now() - 864e5 },
    { id: 'Demo Forge', name: 'Демо: Forge 1.12.2', mc: '1.12.2', loader: 'forge', loaderVersion: '14.23.5.2859', ready: true, mods: 48, modsOff: 0, worlds: 1, playtime: 0, created: Date.now() - 3 * 864e5, source: { type: 'modrinth', title: 'RLCraft' } },
    { id: 'Demo Vanilla', name: 'Чистая 1.21.1', mc: '1.21.1', loader: 'vanilla', ready: false, mods: 0, modsOff: 0, worlds: 0, created: Date.now() - 6 * 864e5 }
  ];

  // ---------- данные ----------
  async function loadPacks() {
    const ipc = getIpc();
    D.packs = ipc ? ((await ipc.invoke('inst:list').catch(() => [])) || []) : (D.packs && D.packs.length ? D.packs : DEMO.slice());
    return D.packs;
  }
  const packById = (id) => (D.packs || []).find(p => p.id === id) || null;
  const isRunning = (p) => U.sessions.some(s => s.folder === 'inst:' + p.id);
  const packIcon = (p) => p.icon || artFor('pack:' + p.id);
  const loaderText = (p) => p.loader && p.loader !== 'vanilla' ? `${LOADER[p.loader] || p.loader}${p.loaderVersion ? ' ' + p.loaderVersion : ''}` : 'Vanilla';
  function rerender() { if (U.currentView === 'packs' || U.currentView === 'pack') U.setView(U.currentView); }

  // ---------- версии Minecraft для мастера создания ----------
  let _mcVersions = null;
  async function mcVersions() {
    if (_mcVersions && _mcVersions.length) return _mcVersions;
    const ipc = getIpc();
    let list = [];
    if (ipc) { try { list = await ipc.invoke('mc:getAllVersions'); } catch (e) {} }
    if (!list || !list.length) list = ['1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9'].map(id => ({ id, type: 'release' }));
    _mcVersions = list;
    return list;
  }
  function versionTypes() {
    const vt = (D.settings && D.settings.versionTypes) || {};
    return Object.values(vt).some(Boolean) ? vt : { release: true };
  }
  function loadersFor(mc) {
    const out = ['vanilla'];
    if (!mc || !/^\d/.test(mc)) return out;
    if (U.cmpVer(mc, '1.1') >= 0) out.push('forge');
    if (U.cmpVer(mc, '1.14') >= 0) out.push('fabric', 'quilt');
    if (U.cmpVer(mc, '1.20.1') >= 0) out.push('neoforge');
    return out;
  }

  // ---------- views ----------
  function packCard(p) {
    const run = isRunning(p);
    const badge = p.state === 'installing' ? '<span class="pk-badge warn">устанавливается</span>'
      : !p.ready ? '<span class="pk-badge bad" title="Версия игры не установлена">нет версии</span>'
      : run ? '<span class="pk-badge run">запущена</span>' : '';
    const src = p.source && p.source.type === 'modrinth' ? `<span class="pk-src" title="Модпак Modrinth">${esc(p.source.title || 'Modrinth')}</span>` : '';
    return `
      <div class="pk-card" data-pack="${esc(p.id)}">
        <img class="pk-icon" src="${esc(packIcon(p))}" alt="" onerror="this.src='${artFor('pack:' + p.id)}'">
        <div class="pk-main">
          <div class="pk-name">${esc(p.name)} ${badge}</div>
          <div class="pk-meta"><span>${esc(p.mc || '?')}</span><span class="sep">·</span><span>${esc(loaderText(p))}</span>${src ? '<span class="sep">·</span>' + src : ''}</div>
          <div class="pk-stats"><span title="Модов">${I.box}${p.mods || 0}${p.modsOff ? ` <i>(+${p.modsOff} откл.)</i>` : ''}</span>
            <span title="Миров">${I.globe}${p.worlds || 0}</span>
            <span title="Наиграно">${I.clock}${p.playtime ? U.formatPlaytime(p.playtime) : '-'}</span></div>
        </div>
        <div class="pk-actions">
          <button class="btn-ghost" data-pk-menu="${esc(p.id)}" title="Ещё">${I.dots}</button>
          <button class="btn-play-sm ${run ? 'stop' : ''}" data-pk-play="${esc(p.id)}" title="${run ? 'Остановить' : 'Играть'}" ${p.state === 'installing' ? 'disabled' : ''}>${run ? I.stop : I.play}</button>
        </div>
      </div>`;
  }
  function emptyHtml(text, btn) {
    return `<div class="empty pk-empty">${I.box}<div>${text}</div>${btn ? `<button class="btn primary sm" data-pk-create>Создать сборку</button>` : ''}</div>`;
  }

  views.packs = function () {
    const packs = D.packs || [];
    const tabs = [['my', 'Мои сборки'], ['modpacks', 'Модпаки Modrinth'], ['mods', 'Моды для сборок']]
      .map(([k, l]) => `<button class="tab ${S.tab === k ? 'active' : ''}" data-pk-tab="${k}">${l}</button>`).join('');
    let body = '';
    if (S.tab === 'my') {
      body = packs.length ? `<div class="pk-grid">${packs.map(packCard).join('')}</div>`
        : emptyHtml('Сборок пока нет. Создайте свою - версия, модлоадер и отдельная папка с модами - или установите модпак с Modrinth.', true);
    } else if (S.tab === 'modpacks') {
      body = `<div id="pk-browser"></div>`;
    } else {
      const ready = packs.filter(p => p.ready);
      if (!ready.length) body = emptyHtml('Нет готовых сборок, куда можно ставить моды.', true);
      else {
        if (!ready.some(p => p.id === S.target)) S.target = ready[0].id;
        body = `
          <div class="pk-target"><span>Устанавливать в сборку</span>
            <select id="pk-target">${ready.map(p => `<option value="${esc(p.id)}" ${p.id === S.target ? 'selected' : ''}>${esc(p.name)} - ${esc(p.mc)} ${esc(loaderText(p))}</option>`).join('')}</select></div>
          <div id="pk-browser"></div>`;
      }
    }
    return `
      <div class="view packs-view">
        <div class="page-head page-head-row"><div><div class="page-title">Сборки</div>
          <div class="page-sub">У каждой сборки своя папка <code class="path">.minecraft/instances/&lt;название&gt;</code> - моды, конфиги, миры. Версии игры общие</div></div>
          <div class="pk-head-actions">
            <button class="btn-secondary" id="pk-import">${I.dl} Импорт модпака</button>
            <button class="btn primary sm" data-pk-create>Создать сборку</button>
          </div></div>
        <div class="tab-row">${tabs}</div>
        ${body}
      </div>`;
  };

  views.pack = function () {
    const p = packById(S.packId);
    if (!p) return `<div class="view">${emptyHtml('Сборка не найдена', false)}</div>`;
    const run = isRunning(p);
    const tabs = [['mod', 'Моды'], ['resourcepack', 'Ресурспаки'], ['shader', 'Шейдеры'], ['worlds', 'Миры'], ['shots', 'Скриншоты'], ['browse', 'Добавить контент']]
      .map(([k, l]) => `<button class="tab ${S.packTab === k ? 'active' : ''}" data-pk-ptab="${k}">${l}</button>`).join('');
    const warn = p.state === 'installing' ? `<div class="pk-warn">${I.info}<span>Сборка ещё устанавливается - прогресс в трее загрузок.</span></div>`
      : !p.ready ? `<div class="pk-warn bad">${I.warn}<span>Версия игры для сборки не установлена (${esc(p.mc)} ${esc(loaderText(p))}).</span><button class="btn-secondary" data-pk-repair="${esc(p.id)}">Восстановить версию</button></div>` : '';
    return `
      <div class="view pack-view" data-pack-view="${esc(p.id)}">
        <div class="pk-back" id="pk-back">← Все сборки</div>
        <div class="pk-hero">
          <img class="pk-hero-icon" src="${esc(packIcon(p))}" alt="" title="Сменить иконку" id="pk-icon" onerror="this.src='${artFor('pack:' + p.id)}'">
          <div class="pk-hero-main">
            <div class="pk-hero-name">${esc(p.name)}</div>
            <div class="pk-meta"><span>Minecraft ${esc(p.mc || '?')}</span><span class="sep">·</span><span>${esc(loaderText(p))}</span>
              ${p.source && p.source.title ? `<span class="sep">·</span><span>${esc(p.source.title)}${p.source.versionNumber ? ' ' + esc(p.source.versionNumber) : ''}</span>` : ''}</div>
            <div class="pk-stats"><span>${I.box}${p.mods || 0} модов</span><span>${I.globe}${p.worlds || 0} миров</span>
              <span>${I.clock}${p.playtime ? U.formatPlaytime(p.playtime) : 'ещё не запускалась'}</span>
              ${p.memory ? `<span>${I.sliders}${p.memory} МБ</span>` : ''}</div>
          </div>
          <div class="pk-hero-actions">
            <button class="btn-secondary icon-sq" data-pk-folder="${esc(p.id)}" title="Открыть папку сборки">${I.folder}</button>
            <button class="btn-secondary icon-sq" data-pk-menu="${esc(p.id)}" title="Ещё">${I.dots}</button>
            <button class="hero-play ${run ? 'stop' : ''}" data-pk-play="${esc(p.id)}" ${p.state === 'installing' ? 'disabled' : ''}>${run ? I.stop + ' Остановить' : I.play + ' Играть'}</button>
          </div>
        </div>
        ${warn}
        <div class="tab-row">${tabs}</div>
        ${S.packTab === 'browse' ? '<div id="pk-browser"></div>' : S.packTab === 'worlds' ? worldsPaneHtml() : S.packTab === 'shots' ? (window.MglExtras ? MglExtras.shotsPaneHtml() : '') : contentPaneHtml(S.packTab)}
      </div>`;
  };
  TITLES.packs = 'Сборки';
  TITLES.pack = 'Сборка';

  // ---------- контент сборки ----------
  function contentPaneHtml(type) {
    const ext = type === 'mod' ? '.jar' : '.zip';
    return `
      <div class="mc-toolbar">
        <button class="btn-secondary" data-pkc-add>${I.plus} Добавить файлы</button>
        <button class="btn-secondary" data-pkc-all="1">Включить все</button>
        <button class="btn-secondary" data-pkc-all="0">Отключить все</button>
        ${type === 'mod' ? '<button class="btn-secondary" data-pkc-updates>Обновления модов</button>' : ''}
        <button class="btn-secondary" data-pkc-folder>${I.folder} Папка ${TYPE_DIR[type]}</button>
        <input type="file" id="pkc-file" multiple hidden accept="${ext}">
      </div>
      <div class="mc-drop" id="pkc-drop">${I.dl}<div><b>Перетащите файлы сюда</b><span>${ext}-файлы копируются в ${TYPE_DIR[type]}/ этой сборки</span></div></div>
      <div class="browse-status" id="pkc-status">Загрузка…</div>
      <div class="mycontent-list" id="pkc-list"></div>`;
  }
  function fmtSize(b) { b = +b || 0; return b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ'; }

  // ---------- миры сборки (saves/) ----------
  const GAME_MODES = ['Выживание', 'Творчество', 'Приключение', 'Наблюдатель'];
  function worldsPaneHtml() {
    return `
      <div class="mc-toolbar">
        <button class="btn-secondary" data-pkw-folder>${I.folder} Папка saves</button>
        <button class="btn-secondary" data-pkw-backups>${I.folder} Папка бэкапов</button>
        <button class="btn-secondary" data-pkw-reload>${I.restart} Обновить</button>
      </div>
      <div class="browse-status" id="pkw-status">Загрузка…</div>
      <div class="mycontent-list" id="pkw-list"></div>`;
  }
  const DEMO_WORLDS = [
    { folder: 'Новый мир', name: 'Новый мир', gameType: 0, lastPlayed: Date.now() - 36e5, size: 48e6 },
    { folder: 'Креатив', name: 'Креатив', gameType: 1, lastPlayed: Date.now() - 4 * 864e5, size: 120e6 }
  ];
  async function loadWorlds(p) {
    const list = content.querySelector('#pkw-list'), st = content.querySelector('#pkw-status');
    if (!list) return;
    const ipc = getIpc();
    const r = ipc ? await ipc.invoke('inst:worlds', p.id).catch(() => null) : { ok: true, worlds: DEMO_WORLDS, backups: 0 };
    if (!list.isConnected) return;
    if (!r || !r.ok) { if (st) st.textContent = 'Не удалось прочитать миры: ' + ((r && r.error) || ''); return; }
    const worlds = r.worlds || [];
    if (st) st.textContent = worlds.length ? `Миров: ${worlds.length} · бэкапов: ${r.backups || 0}` : 'Миров пока нет - они появятся после первой игры в этой сборке';
    list.innerHTML = worlds.map(w => `
      <div class="mc-row" data-world="${esc(w.folder)}">
        ${w.icon ? `<img class="mc-icon" src="${esc(w.icon)}" alt="">` : `<img class="mc-icon" src="${artFor('world:' + w.folder)}" alt="">`}
        <div class="mc-main"><div class="mc-name">${esc(w.name)}${w.name !== w.folder ? ` <span class="pk-badge">${esc(w.folder)}</span>` : ''}${w.hasLevel === false ? ' <span class="pk-badge warn">нет level.dat</span>' : ''}</div>
          <div class="mc-meta"><span>${w.gameType != null && GAME_MODES[w.gameType] ? GAME_MODES[w.gameType] : '-'}</span><span class="sep">·</span>
            <span>${w.lastPlayed ? new Date(w.lastPlayed).toLocaleString(MGL_LOCALE) : '-'}</span><span class="sep">·</span><span>${w.partial ? '≥ ' : ''}${fmtSize(w.size)}</span></div></div>
        <div class="mc-actions">
          <button class="btn-secondary icon-sq" data-pkw-act="open" title="Открыть папку мира" aria-label="Открыть папку мира">${I.folder}</button>
          <button class="btn-secondary" data-pkw-act="backup" title="Сохранить бэкап (zip) в backups/">Бэкап</button>
          <button class="btn-ghost danger" data-pkw-act="delete" title="Удалить мир">×</button>
        </div>
      </div>`).join('');
  }
  function bindWorlds(p) {
    const ipc = getIpc();
    const need = () => { if (ipc) return true; toast('Доступно в приложении'); return false; };
    content.querySelector('[data-pkw-folder]').addEventListener('click', () => need() && ipc.invoke('inst:openFolder', { id: p.id, sub: 'saves' }));
    content.querySelector('[data-pkw-backups]').addEventListener('click', () => need() && ipc.invoke('inst:worldAction', { id: p.id, action: 'backups' }));
    content.querySelector('[data-pkw-reload]').addEventListener('click', () => loadWorlds(p));
    content.querySelector('#pkw-list').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pkw-act]');
      if (!b || !need()) return;
      const folder = b.closest('[data-world]').dataset.world, act = b.dataset.pkwAct;
      if (act === 'delete') {
        if (!await confirmDialog({ title: 'Удалить мир', message: `Удалить мир «${folder}» вместе со всеми постройками?\n\nЭто нельзя отменить - сначала можно сделать бэкап.`, okText: 'Удалить', danger: true })) return;
      }
      b.disabled = true;
      const r = await ipc.invoke('inst:worldAction', { id: p.id, folder, action: act });
      b.disabled = false;
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      if (act === 'backup') toast(`Бэкап сохранён: ${fmtSize(r.size)}${r.running ? ' (игра запущена - копия может быть неполной)' : ''}`);
      else if (act === 'delete') { toast('Мир удалён'); loadPack(p.id).then(() => loadWorlds(p)); return; }
      loadWorlds(p);
    });
    loadWorlds(p);
  }
  async function loadPackContent(p, type) {
    const list = content.querySelector('#pkc-list'), st = content.querySelector('#pkc-status');
    if (!list) return;
    const ipc = getIpc();
    let items = [];
    if (ipc) items = (await ipc.invoke('modrinth:listInstalled', { projectType: type, instance: p.id }).catch(() => [])) || [];
    else if (type === 'mod') items = [{ filename: 'sodium-fabric-0.5.11.jar', size: 1200000, title: 'Sodium' }, { filename: 'fabric-api-0.92.jar', size: 2100000, title: 'Fabric API' }, { filename: 'iris-1.7.jar.disabled', size: 900000 }];
    if (!list.isConnected) return;
    items.sort((a, b) => String(a.title || a.filename).localeCompare(String(b.title || b.filename)));
    if (st) st.textContent = items.length ? `${TYPE_NAME[type]}: ${items.length}` : `${TYPE_NAME[type]} пока нет - добавьте из вкладки «Добавить контент» или перетащите файлы`;
    list.innerHTML = items.map(it => {
      const off = /\.disabled$/i.test(it.filename);
      const name = it.title || it.filename.replace(/\.(jar|zip)(\.disabled)?$/i, '');
      const locked = /^MGLskin/i.test(it.filename);
      return `
        <div class="mc-row ${off ? 'off' : ''}" data-file="${esc(it.filename)}">
          <img class="mc-icon" src="${artFor(it.slug || it.filename)}" alt="">
          <div class="mc-main"><div class="mc-name">${esc(name)}${locked ? ' <span class="pk-badge">MGL S&amp;C</span>' : ''}</div>
            <div class="mc-meta"><span>${esc(it.filename)}</span><span class="sep">·</span><span>${fmtSize(it.size)}</span></div></div>
          <div class="mc-actions">
            ${locked ? '' : `<div class="switch ${off ? '' : 'on'}" data-pkc-toggle title="${off ? 'Включить' : 'Отключить'}"></div>
            <button class="btn-ghost danger" data-pkc-remove title="Удалить">×</button>`}
          </div>
        </div>`;
    }).join('');
  }
  function bindPackContent(p, type) {
    const ipc = getIpc();
    const reload = () => loadPack(p.id).then(() => loadPackContent(packById(p.id) || p, type));
    content.querySelectorAll('[data-pkc-toggle]').forEach(sw => sw.addEventListener('click', async () => {
      if (!ipc) { toast('Доступно в приложении'); return; }
      const row = sw.closest('[data-file]');
      const r = await ipc.invoke('modrinth:toggle', { projectType: type, instance: p.id, filename: row.dataset.file });
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      reload();
    }));
    content.querySelector('#pkc-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-pkc-remove]');
      if (!btn) return;
      if (!ipc) { toast('Доступно в приложении'); return; }
      const file = btn.closest('[data-file]').dataset.file;
      if (!await U.confirmRemoveContent({ projectType: type, instance: p.id, filename: file, where: `из сборки «${p.name}»` })) return;
      const r = await ipc.invoke('modrinth:remove', { projectType: type, instance: p.id, filename: file });
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      toast('Удалено: ' + file);
      reload();
    });
    content.querySelectorAll('[data-pkc-all]').forEach(b => b.addEventListener('click', async () => {
      if (!ipc) { toast('Доступно в приложении'); return; }
      const r = await ipc.invoke('modrinth:toggleAll', { projectType: type, instance: p.id, enable: b.dataset.pkcAll === '1' });
      toast(r && r.ok ? `Изменено: ${r.changed}` : 'Ошибка: ' + ((r && r.error) || ''));
      reload();
    }));
    const updBtn = content.querySelector('[data-pkc-updates]');
    if (updBtn) updBtn.addEventListener('click', () => window.MglExtras && MglExtras.checkUpdates({ instance: p.id, onDone: reload }));
    const folderBtn = content.querySelector('[data-pkc-folder]');
    if (folderBtn) folderBtn.addEventListener('click', () => ipc ? ipc.invoke('inst:openFolder', { id: p.id, sub: TYPE_DIR[type] }) : toast('Доступно в приложении'));
    const importPaths = async (paths) => {
      if (!ipc) { toast('Доступно в приложении'); return; }
      if (!paths.length) return;
      const r = await ipc.invoke('modrinth:importFiles', { projectType: type, instance: p.id, paths });
      if (r && r.added && r.added.length) toast('Добавлено: ' + r.added.length + (r.skipped.length ? ` · пропущено: ${r.skipped.length}` : ''));
      else toast('Подходящих файлов нет (' + (type === 'mod' ? '.jar' : '.zip') + ')');
      reload();
    };
    const file = content.querySelector('#pkc-file');
    content.querySelector('[data-pkc-add]').addEventListener('click', () => file.click());
    file.addEventListener('change', () => { const paths = Array.from(file.files || []).map(f => f.path).filter(Boolean); file.value = ''; importPaths(paths); });
    const drop = content.querySelector('#pkc-drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (e) => { e.preventDefault(); importPaths(Array.from(e.dataTransfer.files || []).map(f => f.path).filter(Boolean)); });
    loadPackContent(p, type);
  }
  async function loadPack(id) {
    const ipc = getIpc();
    if (!ipc) return packById(id);
    const fresh = await ipc.invoke('inst:get', id).catch(() => null);
    if (fresh) { const i = (D.packs || []).findIndex(x => x.id === id); if (i >= 0) D.packs[i] = fresh; else (D.packs = D.packs || []).push(fresh); }
    return fresh;
  }

  // ---------- браузер Modrinth (модпаки / контент для сборки) ----------
  const B = { key: '', projectType: 'mod', query: '', gameVersion: '', loader: '', hits: [], total: 0, offset: 0, loading: false, req: 0, installed: null, timer: null };
  const PAGE = 24;
  // opts: { mode: 'modpack' } или { mode: 'content', pack }
  function mountBrowser(opts) {
    const host = content.querySelector('#pk-browser');
    if (!host) return;
    const key = opts.mode === 'modpack' ? 'modpack' : 'pack:' + opts.pack.id;
    if (B.key !== key) {
      Object.assign(B, { key, query: '', hits: [], total: 0, offset: 0, installed: null });
      B.projectType = opts.mode === 'modpack' ? 'modpack' : 'mod';
      B.gameVersion = opts.mode === 'modpack' ? '' : opts.pack.mc;
      B.loader = opts.mode === 'modpack' ? '' : (opts.pack.loader === 'vanilla' ? '' : opts.pack.loader);
    }
    const isPack = opts.mode === 'content';
    const types = isPack ? [['mod', 'Моды'], ['resourcepack', 'Ресурспаки'], ['shader', 'Шейдеры']] : [];
    const verOpts = ['', '1.21.11', '1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9'];
    host.innerHTML = `
      <div class="browse-filters pk-filters">
        <input id="pkb-search" class="input" type="text" placeholder="${isPack ? 'Поиск модов, ресурспаков, шейдеров…' : 'Поиск модпаков на Modrinth…'}" value="${esc(B.query)}">
        ${isPack
          ? `<div class="chip-row pkb-types">${types.map(([k, l]) => `<button class="chip ${B.projectType === k ? 'on' : ''}" data-pkb-type="${k}">${l}</button>`).join('')}</div>
             <span class="pk-lock" title="Фильтр по версии и загрузчику сборки">${esc(opts.pack.mc)} · ${esc(loaderText(opts.pack))}</span>`
          : `<select id="pkb-ver">${verOpts.map(v => `<option value="${v}" ${v === B.gameVersion ? 'selected' : ''}>${v || 'Любая версия'}</option>`).join('')}</select>
             <select id="pkb-loader">${['', 'fabric', 'forge', 'neoforge', 'quilt'].map(l => `<option value="${l}" ${l === B.loader ? 'selected' : ''}>${l ? LOADER[l] : 'Любой загрузчик'}</option>`).join('')}</select>`}
      </div>
      <div class="browse-status" id="pkb-status"></div>
      <div class="browse-grid" data-grid="pk"></div>
      <div class="browse-more hidden" id="pkb-more-wrap"><button class="btn-secondary" id="pkb-more">Загрузить ещё</button></div>`;
    const search = host.querySelector('#pkb-search');
    search.addEventListener('input', () => { clearTimeout(B.timer); B.query = search.value; B.timer = setTimeout(() => runSearch(opts, false), 350); });
    host.querySelectorAll('[data-pkb-type]').forEach(c => c.addEventListener('click', () => { B.projectType = c.dataset.pkbType; mountBrowser(opts); }));
    const ver = host.querySelector('#pkb-ver'), ld = host.querySelector('#pkb-loader');
    if (ver) ver.addEventListener('change', () => { B.gameVersion = ver.value; runSearch(opts, false); });
    if (ld) ld.addEventListener('change', () => { B.loader = ld.value; runSearch(opts, false); });
    host.querySelector('#pkb-more').addEventListener('click', () => runSearch(opts, true));
    host.querySelector('[data-grid="pk"]').addEventListener('click', (e) => onBrowserClick(e, opts));
    runSearch(opts, false);
  }
  async function refreshInstalledSet(opts) {
    B.installed = opts.mode === 'content' ? await U.fetchInstalledIndex(B.projectType, opts.pack.id) : null;
  }
  // фильтр «установлено для этой версии» = версия и загрузчик сборки
  const packFilter = (opts) => opts.mode === 'content'
    ? { gameVersion: opts.pack.mc, loader: B.projectType === 'mod' && opts.pack.loader !== 'vanilla' ? opts.pack.loader : '' } : {};
  function renderResults(opts) {
    const grid = content.querySelector('[data-grid="pk"]'), st = content.querySelector('#pkb-status'), more = content.querySelector('#pkb-more-wrap');
    if (!grid) return;
    grid.innerHTML = B.hits.map(modrinthCard).join('');
    grid.querySelectorAll('[data-mr-install]').forEach(btn => {
      const h = B.hits.find(x => (x.slug || x.project_id) === btn.dataset.mrInstall);
      if (opts.mode === 'modpack') btn.textContent = 'Создать сборку';
    });
    if (opts.mode === 'content') U.decorateInstalled(grid, B.hits, B.installed, packFilter(opts));
    if (st) st.textContent = B.loading && !B.hits.length ? 'Поиск на Modrinth…' : !B.hits.length ? 'Ничего не найдено' : `Найдено ${B.total}. Показано ${B.hits.length}.`;
    if (more) more.classList.toggle('hidden', B.hits.length >= B.total);
  }
  async function runSearch(opts, append) {
    const ipc = getIpc();
    if (!ipc) {
      const key = { mod: 'mods', resourcepack: 'textures', shader: 'shaders', modpack: 'modpacks' }[B.projectType];
      const grid = content.querySelector('[data-grid="pk"]');
      if (grid) grid.innerHTML = ((D.content && D.content[key]) || []).map(m => modrinthCard({ slug: m.name, title: m.name, author: m.author, description: m.desc, downloads: 0, follows: 0 })).join('');
      const st = content.querySelector('#pkb-status'); if (st) st.textContent = 'Демо-каталог (превью). Поиск Modrinth доступен в приложении.';
      if (opts.mode === 'modpack' && grid) grid.querySelectorAll('[data-mr-install]').forEach(b => { b.textContent = 'Создать сборку'; });
      return;
    }
    if (!append) { B.hits = []; B.offset = 0; B.total = 0; await refreshInstalledSet(opts); }
    const my = ++B.req;
    B.loading = true; renderResults(opts);
    const res = await ipc.invoke('modrinth:search', {
      query: B.query, projectType: B.projectType, gameVersion: B.gameVersion,
      loader: B.projectType === 'mod' || B.projectType === 'modpack' ? B.loader : '', limit: PAGE, offset: B.offset
    }).catch(err => ({ ok: false, error: err.message }));
    if (my !== B.req) return;
    B.loading = false;
    if (!res || !res.ok) { const st = content.querySelector('#pkb-status'); if (st) st.textContent = 'Ошибка: ' + ((res && res.error) || 'нет связи с Modrinth'); return; }
    B.total = res.total || 0;
    B.hits = B.hits.concat(res.hits || []);
    B.offset = B.hits.length;
    renderResults(opts);
  }
  function onBrowserClick(e, opts) {
    const ipc = getIpc();
    const page = e.target.closest('[data-mr-page]');
    if (page) {
      e.stopPropagation();
      const url = `https://modrinth.com/${B.projectType}/${page.dataset.mrPage}`;
      if (ipc) ipc.send('open-url', url); else window.open(url, '_blank');
      return;
    }
    const btn = e.target.closest('[data-mr-install]');
    if (!btn) return;
    e.stopPropagation();
    if (!ipc) { toast('Установка доступна в приложении'); return; }
    const slug = btn.dataset.mrInstall;
    const h = B.hits.find(x => (x.slug || x.project_id) === slug) || { slug, title: slug };
    if (opts.mode === 'modpack') { modpackModal(h); return; }
    installIntoPack(opts.pack, h, btn);
  }
  async function installIntoPack(p, h, btn) {
    const ipc = getIpc();
    const slug = h.slug || h.project_id;
    U.Downloads.start('mr:' + slug, 'mr', `${h.title || slug} → ${p.name}`);
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Качаю…';
    const res = await ipc.invoke('modrinth:install', {
      slug, projectType: B.projectType, instance: p.id, gameVersion: p.mc || undefined,
      loader: B.projectType === 'mod' && p.loader !== 'vanilla' ? p.loader : undefined
    }).catch(err => ({ ok: false, error: err.message }));
    if (!res || !res.ok) {
      U.Downloads.finish('mr:' + slug, { ok: false, error: (res && res.error) || 'ошибка' });
      if (btn.isConnected) { btn.disabled = false; btn.textContent = orig; }
      toast('Не удалось установить: ' + ((res && res.error) || ''));
      return;
    }
    U.Downloads.finish('mr:' + slug, { ok: true });
    if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Установлено'; }
    B.installed = await U.fetchInstalledIndex(B.projectType, p.id);
    if (btn.isConnected) U.decorateInstalled(content.querySelector('[data-grid="pk"]'), B.hits, B.installed, packFilter({ mode: 'content', pack: p }));
    const deps = res.deps || [];
    toast(`«${res.title || slug}» → ${p.name}` + (deps.length ? ` · + зависимости: ${deps.map(d => d.title).join(', ')}` : ''));
    (res.warnings || []).forEach(w => U.showNoticePlate(w));
    loadPack(p.id);
  }

  // ---------- модалки ----------
  function createModal() {
    const vt = versionTypes();
    let mc = null;
    const wrap = showModal({
      title: 'Создать сборку',
      bodyHtml: `
        <div class="field"><label class="field-label">Название</label>
          <input type="text" id="pkn-name" maxlength="60" placeholder="Например: Fabric 1.20.1 с оптимизацией"></div>
        <div class="field"><label class="field-label">Версия Minecraft</label>
          <input type="text" id="pkn-vsearch" placeholder="Поиск версии…">
          <div class="vp-list pkn-vlist" id="pkn-vlist"><div class="vp-empty">Загрузка списка версий…</div></div></div>
        <div class="pkn-row">
          <div class="field"><label class="field-label">Модлоадер</label><select id="pkn-loader"><option value="vanilla">Vanilla</option></select></div>
          <div class="field"><label class="field-label">Версия загрузчика</label><select id="pkn-lver" disabled><option value="">-</option></select></div>
        </div>
        <div class="field-hint">Папка: <code class="path" id="pkn-path">.minecraft/instances/…</code>. Версия игры ставится в общую .minecraft/versions (если уже есть - используется она).</div>`,
      okText: 'Создать',
      onOk: (m) => {
        const loader = m.querySelector('#pkn-loader').value;
        const lver = m.querySelector('#pkn-lver').value;
        if (!mc) { toast('Выберите версию Minecraft'); return false; }
        if (loader !== 'vanilla' && !lver) { toast('Выберите версию загрузчика'); return false; }
        const name = m.querySelector('#pkn-name').value.trim() || `${loader === 'vanilla' ? 'Vanilla' : LOADER[loader]} ${mc}`;
        const ipc = getIpc();
        if (!ipc) { toast('Создание сборок доступно в приложении'); return true; }
        toast(`Создаю «${name}» - прогресс в трее загрузок`);
        ipc.invoke('inst:create', { name, mc, loader, loaderVersion: lver || null }).then(async r => {
          await loadPacks();
          if (r && r.ok) { toast(`Сборка «${r.instance.name}» готова`); S.tab = 'my'; rerender(); }
          else if (r && r.cancelled) toast('Создание сборки отменено');
          else toast('Не удалось создать сборку: ' + ((r && r.error) || ''));
        });
        setTimeout(() => loadPacks().then(rerender), 400);
        return true;
      }
    });
    const list = wrap.querySelector('#pkn-vlist'), search = wrap.querySelector('#pkn-vsearch');
    const loaderSel = wrap.querySelector('#pkn-loader'), lverSel = wrap.querySelector('#pkn-lver');
    const nameIn = wrap.querySelector('#pkn-name'), pathEl = wrap.querySelector('#pkn-path');
    const updatePath = () => { const n = nameIn.value.trim() || (mc ? `${loaderSel.value === 'vanilla' ? 'Vanilla' : LOADER[loaderSel.value]} ${mc}` : '…'); pathEl.textContent = `.minecraft/instances/${n.replace(/[\\/:*?"<>|]/g, '_')}`; };
    nameIn.addEventListener('input', updatePath);
    let lverReq = 0;
    const loadLoaderVersions = async () => {
      const loader = loaderSel.value, my = ++lverReq;
      updatePath();
      if (loader === 'vanilla' || !mc) { lverSel.innerHTML = '<option value="">-</option>'; lverSel.disabled = true; return; }
      lverSel.disabled = true; lverSel.innerHTML = '<option value="">Загрузка…</option>';
      const ipc = getIpc();
      let vers = [];
      if (ipc) { const r = await ipc.invoke('ml:getLoaderVersions', { loader, mcVersion: mc }).catch(() => null); vers = (r && r.ok && r.versions) || []; }
      else vers = ['0.16.10', '0.16.9', '0.15.11'];
      if (my !== lverReq) return;
      if (!vers.length) { lverSel.innerHTML = `<option value="">Нет версий ${LOADER[loader]} для ${mc}</option>`; return; }
      lverSel.innerHTML = vers.map(v => typeof v === 'string' ? `<option value="${esc(v)}">${esc(v)}</option>`
        : `<option value="${esc(v.version)}">${esc(v.version)}${v.tag ? ' · ' + v.tag : ''}</option>`).join('');
      lverSel.disabled = false;
    };
    loaderSel.addEventListener('change', loadLoaderVersions);
    const pickMc = (id) => {
      mc = id;
      list.querySelectorAll('.vp-row').forEach(r => r.classList.toggle('active', r.dataset.id === id));
      const prev = loaderSel.value;
      const ls = loadersFor(id);
      loaderSel.innerHTML = ls.map(l => `<option value="${l}">${LOADER[l]}</option>`).join('');
      loaderSel.value = ls.includes(prev) ? prev : 'vanilla';
      loadLoaderVersions();
    };
    mcVersions().then(all => {
      if (!list.isConnected) return;
      const installed = new Set((D.instances || []).map(i => i.mc));
      const render = () => {
        const q = search.value.trim().toLowerCase();
        const rows = all.filter(v => vt[v.type] && (!q || v.id.toLowerCase().includes(q))).slice(0, 300);
        list.innerHTML = rows.length ? rows.map(v => `<div class="vp-row ${v.id === mc ? 'active' : ''}" data-id="${esc(v.id)}"><span class="vp-id">${esc(v.id)}</span>
          <span class="vp-type vp-type-${v.type}">${v.type}</span>${installed.has(v.id) ? '<span class="vp-installed">есть</span>' : ''}</div>`).join('')
          : '<div class="vp-empty">Ничего не найдено. Типы версий - в Настройках → «Какие версии показывать».</div>';
      };
      list.addEventListener('click', (e) => { const r = e.target.closest('.vp-row'); if (r) pickMc(r.dataset.id); });
      search.addEventListener('input', render);
      render();
      const first = all.find(v => vt[v.type]);
      if (first) pickMc(first.id);
    });
    setTimeout(() => nameIn.focus(), 40);
  }

  async function modpackModal(h) {
    const ipc = getIpc();
    const slug = h.slug || h.project_id;
    const wrap = showModal({
      title: 'Установить модпак',
      bodyHtml: `
        <div class="pk-mp-head"><img src="${esc(h.icon_url || artFor(slug))}" alt=""><div><b>${esc(h.title || slug)}</b><span>${esc((h.description || '').slice(0, 140))}</span></div></div>
        <div class="field"><label class="field-label">Название сборки</label><input type="text" id="pkm-name" maxlength="60" value="${esc(h.title || slug)}"></div>
        <div class="field"><label class="field-label">Версия модпака</label><select id="pkm-ver"><option value="">Загрузка…</option></select></div>
        <div class="field-hint">Будут скачаны версия игры, загрузчик и все файлы модпака в .minecraft/instances/&lt;название&gt;.</div>`,
      okText: 'Установить',
      onOk: (m) => {
        const versionId = m.querySelector('#pkm-ver').value;
        if (!versionId) { toast('Выберите версию'); return false; }
        const name = m.querySelector('#pkm-name').value.trim();
        toast(`Устанавливаю модпак «${name || h.title}» - прогресс в трее загрузок`);
        ipc.invoke('inst:installModpack', { slug, versionId, name }).then(async r => {
          await loadPacks();
          if (r && r.ok) toast(`Модпак «${r.instance.name}» установлен`);
          else if (r && r.cancelled) toast('Установка модпака отменена');
          else toast('Не удалось установить модпак: ' + ((r && r.error) || ''));
          rerender();
        });
        return true;
      }
    });
    const sel = wrap.querySelector('#pkm-ver');
    const r = await ipc.invoke('modrinth:versions', { slug }).catch(() => null);
    if (!sel.isConnected) return;
    const vers = (r && r.ok && r.versions) || [];
    sel.innerHTML = vers.length ? vers.slice(0, 60).map(v => `<option value="${esc(v.id)}">${esc(v.version_number || v.name)} - ${esc((v.game_versions || []).slice(-1)[0] || '')} ${esc((v.loaders || []).map(l => LOADER[l] || l).join('/'))}${v.version_type !== 'release' ? ' · ' + v.version_type : ''}</option>`).join('')
      : '<option value="">Версий нет</option>';
  }

  async function importMrpack(file) {
    const ipc = getIpc();
    if (!ipc) { toast('Импорт доступен в приложении'); return; }
    if (!file) file = await ipc.invoke('dialog:pickFile', { filters: [{ name: 'Модпак (.mrpack, CurseForge .zip)', extensions: ['mrpack', 'zip'] }] });
    if (!file) return;
    const info = await ipc.invoke('inst:peekPack', file);
    if (!info || !info.ok) { toast('Не удалось прочитать модпак: ' + ((info && info.error) || '')); return; }
    showModal({
      title: info.kind === 'curse' ? 'Импорт модпака CurseForge' : 'Импорт .mrpack',
      bodyHtml: `
        <div class="field"><label class="field-label">Название сборки</label><input type="text" id="pki-name" maxlength="60" value="${esc(info.name || '')}"></div>
        <div class="field-hint">${esc(info.summary || '')}<br>Minecraft <b>${esc(info.mc)}</b> · ${esc(info.loader === 'vanilla' ? 'Vanilla' : (LOADER[info.loader] || info.loader) + ' ' + (info.loaderVersion || ''))} · файлов: ${info.files}</div>`,
      okText: 'Импортировать',
      onOk: (m) => {
        const name = m.querySelector('#pki-name').value.trim();
        toast('Импортирую модпак - прогресс в трее загрузок');
        ipc.invoke(info.kind === 'curse' ? 'inst:importCurse' : 'inst:importMrpack', { file, name }).then(async r => {
          await loadPacks();
          if (r && r.ok) {
            toast(`Сборка «${r.instance.name}» импортирована`);
            const sk = (r.instance && r.instance.skipped) || [];
            if (sk.length) U.showNoticePlate(`Не удалось скачать модов: ${sk.length} (у части CurseForge запрещает загрузку вне сайта). Добавьте их вручную.`);
          }
          else if (r && r.cancelled) toast('Импорт отменён');
          else toast('Не удалось импортировать: ' + ((r && r.error) || ''));
          rerender();
        });
        return true;
      }
    });
  }

  function duplicateModal(p) {
    const ipc = getIpc();
    if (!ipc) { toast('Дублирование доступно в приложении'); return; }
    if (isRunning(p)) { toast('Сначала закройте игру в этой сборке'); return; }
    showModal({
      title: 'Дублировать сборку',
      bodyHtml: `
        <div class="field"><label class="field-label">Название копии</label><input type="text" id="pkd-name" maxlength="60" value="${esc(p.name)} (копия)"></div>
        <div class="toggle-row"><div><div class="tl">Копировать миры</div><div class="ts">${p.worlds || 0} миров из saves/. Без этого копия начнётся с пустых миров</div></div>
          <div class="switch on" id="pkd-worlds"></div></div>
        <div class="field-hint">Копируются моды, конфиги, ресурспаки, шейдеры и настройки игры. Логи, наигранное время и счётчик запусков не переносятся. Версия игры общая.</div>`,
      okText: 'Дублировать',
      onOk: (m) => {
        const name = m.querySelector('#pkd-name').value.trim();
        const withWorlds = m.querySelector('#pkd-worlds').classList.contains('on');
        toast('Копирую сборку - прогресс в трее загрузок');
        ipc.invoke('inst:duplicate', { id: p.id, name, withWorlds }).then(async r => {
          await loadPacks();
          if (r && r.ok) toast(`Копия «${r.instance.name}» готова`);
          else if (r && r.cancelled) toast('Копирование отменено');
          else toast('Не удалось дублировать: ' + ((r && r.error) || ''));
          rerender();
        });
        return true;
      }
    });
    const m = document.getElementById('app-modal');
    const sw = m && m.querySelector('#pkd-worlds');
    if (sw) sw.addEventListener('click', () => sw.classList.toggle('on'));
  }

  async function exportModal(p) {
    const ipc = getIpc();
    if (!ipc) { toast('Экспорт доступен в приложении'); return; }
    showModal({
      title: 'Экспорт в .mrpack',
      bodyHtml: `
        <div class="field"><label class="field-label">Версия модпака</label><input type="text" id="pke-ver" maxlength="40" value="1.0.0"></div>
        <div class="field"><label class="field-label">Описание (необязательно)</label><input type="text" id="pke-sum" maxlength="200" value="${esc(p.notes || '')}"></div>
        <div class="toggle-row"><div><div class="tl">Включить миры</div><div class="ts">Папка saves/ попадёт в архив - файл может стать очень большим</div></div>
          <div class="switch" id="pke-worlds"></div></div>
        <div class="field-hint">Моды, ресурспаки и шейдеры, найденные на Modrinth по хешу, записываются ссылкой; остальное (свои файлы, конфиги, options.txt, servers.dat) кладётся в overrides/. Отключённые файлы (.disabled) и моды MGL S&amp;C не экспортируются.</div>`,
      okText: 'Выбрать файл и экспортировать',
      onOk: async (m) => {
        const versionNumber = m.querySelector('#pke-ver').value.trim() || '1.0.0';
        const summary = m.querySelector('#pke-sum').value.trim();
        const includeWorlds = m.querySelector('#pke-worlds').classList.contains('on');
        const safe = p.name.replace(/[\\/:*?"<>|]/g, '_');
        const file = await ipc.invoke('dialog:saveFile', { title: 'Экспорт сборки', defaultPath: `${safe}-${versionNumber}.mrpack`, filters: [{ name: 'Modrinth modpack', extensions: ['mrpack'] }] });
        if (!file) return false;
        toast('Экспортирую - прогресс в трее загрузок');
        ipc.invoke('inst:exportMrpack', { id: p.id, file, includeWorlds, versionNumber, summary }).then(r => {
          if (r && r.ok) toast(`Экспорт готов: ${r.linked} файлов ссылкой, ${r.overrides} в overrides${r.local ? ` (${r.local} не найдено на Modrinth)` : ''}${r.disabled ? ` · пропущено отключённых: ${r.disabled}` : ''}`);
          else toast('Не удалось экспортировать: ' + ((r && r.error) || ''));
        });
        return true;
      }
    });
    const m = document.getElementById('app-modal');
    const sw = m && m.querySelector('#pke-worlds');
    if (sw) sw.addEventListener('click', () => sw.classList.toggle('on'));
  }

  async function settingsModal(p) {
    const ipc = getIpc();
    const scan = ipc ? await ipc.invoke('java:scan').catch(() => null) : null;
    const javas = (scan && scan.list) || [];
    const cur = p.javaPath || '';
    const ram = (D.settings && D.settings.memoryMax) || 2048;
    showModal({
      title: 'Параметры сборки',
      bodyHtml: `
        <div class="field"><label class="field-label">Название</label><input type="text" id="pks-name" maxlength="60" value="${esc(p.name)}"></div>
        <div class="field"><label class="field-label">Память, МБ (пусто - как в настройках: ${ram})</label><input type="number" id="pks-mem" min="512" step="256" value="${p.memory || ''}" placeholder="${ram}"></div>
        <div class="field"><label class="field-label">Java</label><select id="pks-java">
          <option value="">Автоматически</option>
          ${javas.map(j => `<option value="${esc(j.path)}" ${j.path === cur ? 'selected' : ''}>Java ${j.major} · ${esc(j.vendor)} · ${esc(j.path)}</option>`).join('')}
          ${cur && !javas.some(j => j.path === cur) ? `<option value="${esc(cur)}" selected>${esc(cur)}</option>` : ''}
        </select></div>
        <div class="field"><label class="field-label">Доп. JVM-аргументы сборки (добавляются к общим)</label><input type="text" id="pks-jvm" value="${esc(p.jvmArgs || '')}" placeholder="-XX:+UseG1GC" spellcheck="false"></div>
        <div class="field"><label class="field-label">Разрешение окна (пусто - как в настройках)</label>
          <div class="field-row"><input type="number" id="pks-w" min="320" placeholder="ширина" value="${p.resolution ? p.resolution.width : ''}"><input type="number" id="pks-h" min="240" placeholder="высота" value="${p.resolution ? p.resolution.height : ''}"></div></div>
        <div class="field"><label class="field-label">Полный экран</label><select id="pks-fs"><option value="">Как в настройках</option><option value="1" ${p.fullscreen === true ? 'selected' : ''}>Да</option><option value="0" ${p.fullscreen === false ? 'selected' : ''}>Нет</option></select></div>
        <div class="field-hint">Папка сборки: <code class="path">${esc(p.dir || '.minecraft/instances/' + p.id)}</code> - переименование её не меняет.</div>`,
      okText: 'Сохранить',
      onOk: async (m) => {
        if (!ipc) { toast('Доступно в приложении'); return true; }
        const mem = parseInt(m.querySelector('#pks-mem').value, 10);
        const r = await ipc.invoke('inst:update', { id: p.id, patch: {
          name: m.querySelector('#pks-name').value, memory: mem >= 512 ? mem : null, javaPath: m.querySelector('#pks-java').value || null,
          jvmArgs: m.querySelector('#pks-jvm').value,
          resolution: { width: m.querySelector('#pks-w').value, height: m.querySelector('#pks-h').value },
          fullscreen: m.querySelector('#pks-fs').value === '' ? null : m.querySelector('#pks-fs').value === '1' } });
        if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return false; }
        await loadPacks(); rerender(); toast('Сохранено');
        return true;
      }
    });
  }

  // ---------- действия ----------
  async function playPack(id) {
    const p = packById(id), ipc = getIpc();
    if (!p) return;
    if (!ipc) { toast('Запуск доступен в приложении'); return; }
    if (isRunning(p)) { ipc.invoke('mc:stop', 'inst:' + p.id); toast('Останавливаю: ' + p.name); return; }
    if (!p.ready) { toast('Сначала восстановите версию сборки'); return; }
    toast('Запуск «' + p.name + '»…');
    const user = (D.settings && D.settings.username) || 'Player';
    const r = await ipc.invoke('mc:launch', { instance: p.id, username: user });
    if (r && r.ok) setTimeout(() => loadPacks().then(rerender), 800);
  }
  async function repairPack(id) {
    const ipc = getIpc();
    if (!ipc) { toast('Доступно в приложении'); return; }
    toast('Восстанавливаю версию - прогресс в трее загрузок');
    const r = await ipc.invoke('inst:repair', id);
    await loadPacks(); rerender();
    toast(r && r.ok ? 'Версия сборки установлена' : r && r.cancelled ? 'Отменено' : 'Ошибка: ' + ((r && r.error) || ''));
  }
  async function deletePack(id) {
    const p = packById(id), ipc = getIpc();
    if (!p) return;
    if (!await confirmDialog({ title: 'Удалить сборку', message: `Удалить сборку «${p.name}»?\n\nПапка instances/${p.id} со всеми модами, конфигами и мирами будет удалена с диска. Версия игры в Библиотеке останется.`, okText: 'Удалить', danger: true })) return;
    if (!ipc) { D.packs = D.packs.filter(x => x.id !== id); }
    else {
      const r = await ipc.invoke('inst:delete', id);
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      await loadPacks();
    }
    toast('Сборка удалена: ' + p.name);
    if (U.currentView === 'pack') U.setView('packs'); else rerender();
  }
  async function setIcon(id, reset) {
    const ipc = getIpc();
    if (!ipc) { toast('Доступно в приложении'); return; }
    let file = null;
    if (!reset) { file = await ipc.invoke('dialog:pickFile', { filters: [{ name: 'Картинка', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] }); if (!file) return; }
    await ipc.invoke('inst:setIcon', { id, file });
    await loadPacks(); rerender();
  }

  let _menu = null;
  function showPackMenu(id, x, y) {
    hideMenu();
    const p = packById(id);
    if (!p) return;
    const items = [
      ['open', 'Открыть сборку'], ['play', isRunning(p) ? 'Остановить' : 'Играть'], ['settings', 'Параметры (имя, память, Java)'],
      ['icon', 'Сменить иконку'], p.icon ? ['icon-reset', 'Сбросить иконку'] : null, ['folder', 'Открыть папку'],
      ['duplicate', 'Дублировать сборку'], ['export', 'Экспорт в .mrpack'],
      ['repair', 'Восстановить версию'], '-', ['delete', 'Удалить сборку']
    ].filter(Boolean);
    _menu = document.createElement('div');
    _menu.className = 'ctx-menu';
    _menu.innerHTML = items.map(it => it === '-' ? '<div class="ctx-sep"></div>'
      : `<button class="ctx-item ${it[0] === 'delete' ? 'danger' : ''}" data-pk-act="${it[0]}"><span>${it[1]}</span></button>`).join('');
    document.body.appendChild(_menu);
    const w = _menu.offsetWidth, h = _menu.offsetHeight;
    _menu.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w)) + 'px';
    _menu.style.top = Math.min(window.innerHeight - h - 8, y) + 'px';
    _menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pk-act]');
      if (!b) return;
      e.stopPropagation();
      hideMenu();
      const act = b.dataset.pkAct;
      if (act === 'open') openPack(id);
      else if (act === 'play') playPack(id);
      else if (act === 'settings') settingsModal(p);
      else if (act === 'icon') setIcon(id, false);
      else if (act === 'icon-reset') setIcon(id, true);
      else if (act === 'folder') { const ipc = getIpc(); ipc ? ipc.invoke('inst:openFolder', { id }) : toast('Доступно в приложении'); }
      else if (act === 'duplicate') duplicateModal(p);
      else if (act === 'export') exportModal(p);
      else if (act === 'repair') repairPack(id);
      else if (act === 'delete') deletePack(id);
    });
  }
  function hideMenu() { if (_menu) { _menu.remove(); _menu = null; } }
  document.addEventListener('click', hideMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });
  window.addEventListener('resize', hideMenu);

  function openPack(id) { S.packId = id; if (!S.packTab) S.packTab = 'mod'; U.setView('pack'); }

  // ---------- привязка событий после рендера ----------
  U.bus.on('view:render', ({ name }) => {
    if (name !== 'packs' && name !== 'pack') return;
    const root = content.querySelector('.view');
    if (!root) return;
    root.addEventListener('click', (e) => {
      const create = e.target.closest('[data-pk-create]');
      if (create) { createModal(); return; }
      const menuBtn = e.target.closest('[data-pk-menu]');
      if (menuBtn) { e.stopPropagation(); const r = menuBtn.getBoundingClientRect(); showPackMenu(menuBtn.dataset.pkMenu, r.right, r.bottom + 4); return; }
      const play = e.target.closest('[data-pk-play]');
      if (play) { e.stopPropagation(); playPack(play.dataset.pkPlay); return; }
      const repair = e.target.closest('[data-pk-repair]');
      if (repair) { repairPack(repair.dataset.pkRepair); return; }
      const folder = e.target.closest('[data-pk-folder]');
      if (folder) { const ipc = getIpc(); ipc ? ipc.invoke('inst:openFolder', { id: folder.dataset.pkFolder }) : toast('Доступно в приложении'); return; }
      const card = e.target.closest('.pk-card[data-pack]');
      if (card && !e.target.closest('button')) { openPack(card.dataset.pack); return; }
    });
    root.addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.pk-card[data-pack]');
      if (!card) return;
      e.preventDefault();
      showPackMenu(card.dataset.pack, e.clientX + 180, e.clientY);
    });
    if (name === 'packs') {
      root.querySelectorAll('[data-pk-tab]').forEach(t => t.addEventListener('click', () => { S.tab = t.dataset.pkTab; U.setView('packs'); }));
      const imp = root.querySelector('#pk-import');
      if (imp) imp.addEventListener('click', () => importMrpack(null));
      root.addEventListener('dragover', (e) => e.preventDefault());
      root.addEventListener('drop', (e) => {
        const f = Array.from(e.dataTransfer.files || []).find(x => /\.(mrpack|zip)$/i.test(x.name));
        if (f && f.path) { e.preventDefault(); importMrpack(f.path); }
      });
      if (S.tab === 'modpacks') mountBrowser({ mode: 'modpack' });
      if (S.tab === 'mods') {
        const sel = root.querySelector('#pk-target');
        const p = packById(S.target);
        if (sel) sel.addEventListener('change', () => { S.target = sel.value; U.setView('packs'); });
        if (p) mountBrowser({ mode: 'content', pack: p });
      }
    } else {
      // страница сборки - подсветить «Сборки» в рейле и сайдбаре
      document.querySelectorAll('.rail-item[data-view="packs"], .nav-link[data-view="packs"]').forEach(el => el.classList.add('active'));
      const p = packById(S.packId);
      if (!p) return;
      root.querySelector('#pk-back').addEventListener('click', () => U.setView('packs'));
      root.querySelector('#pk-icon').addEventListener('click', () => setIcon(p.id, false));
      root.querySelectorAll('[data-pk-ptab]').forEach(t => t.addEventListener('click', () => { S.packTab = t.dataset.pkPtab; U.setView('pack'); }));
      if (S.packTab === 'browse') mountBrowser({ mode: 'content', pack: p });
      else if (S.packTab === 'worlds') bindWorlds(p);
      else if (S.packTab === 'shots') { if (window.MglExtras) MglExtras.bindShots(content, p.id); }
      else bindPackContent(p, S.packTab);
    }
  });

  // актуализировать список после запуска/выхода/завершения установки
  U.bus.on('game:launched', () => loadPacks().then(rerender));
  U.bus.on('game:exit', () => setTimeout(() => loadPacks().then(rerender), 300));
  const ipc = getIpc();
  if (ipc) ipc.on('inst:progress', (e, d) => {
    if (d && (d.status === 'Готово' || /^Ошибка/.test(d.status || ''))) loadPacks().then(() => { if (U.currentView === 'packs' || (U.currentView === 'pack' && S.packId === d.id)) rerender(); });
  });

  window.MglPacks = { load: loadPacks, open: openPack, create: createModal, importMrpack, installModpack: modpackModal, state: S };
  loadPacks();
})();
