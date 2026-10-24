(function () {
  'use strict';

  const D = window.MGL_DATA;
  const content = document.getElementById('content');
  const LOADER = { vanilla: 'Vanilla', forge: 'Forge', fabric: 'Fabric', neoforge: 'NeoForge', quilt: 'Quilt' };
  // «[1.20.1] fabric-loader-…» → «fabric-loader-…»; «inst:<id>» (процесс сборки) → название сборки
  const verLabel = (f) => {
    const s = String(f || '');
    if (s.startsWith('inst:')) { const p = (D.packs || []).find(x => 'inst:' + x.id === s); return p ? p.name : s.slice(5); }
    return s.replace(/^\[[^\]]*\]\s*/, '');
  };

  const I = {
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M6 11l6 6 6-6M5 21h14"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M8 7h9v9"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>'
  };

  const iconFor = (inst) => window.MglIcons ? MglIcons.for(inst.id) : artFor(inst.id || inst.name);
  const artFor = (seed) => window.MglArt ? MglArt.dataUrl(seed) : 'assets/icons/icon.png';

  const TITLES = {
    home: 'Главная', news: 'Новости', mycontent: 'Мой контент', browse: 'Браузер контента', library: 'Библиотека', packs: 'Сборки', pack: 'Сборка',
    servers: 'Серверы', sessions: 'Активные сессии', skins: 'Скины', settings: 'Настройки', plugins: 'Плагины'
  };

  const UiBus = (function () {
    const map = new Map();
    return {
      on(ev, fn) { if (!map.has(ev)) map.set(ev, new Set()); map.get(ev).add(fn); return () => map.get(ev).delete(fn); },
      emit(ev, data) { (map.get(ev) || []).forEach(fn => { try { fn(data); } catch (e) { console.error('[UiBus]', ev, e); } }); }
    };
  })();

  const NEWS_URL = 'https://gist.githubusercontent.com/AuriXDev/664e23438029adb3993d89fa2213dbfe/raw/data.json';
  const NEWS_REFRESH_MS = 20 * 60 * 1000;
  const LAUNCHER_VERSION = '2.0.1';
  let _newsItems = [];
  let _newsLoaded = false;
  let _remoteMeta = { latestVersion: null, updateRepo: null };
  let _newsInflight = null;
  async function fetchNews(force) {
    if (_newsLoaded && !force) return _newsItems;
    if (_newsInflight) return _newsInflight;
    _newsInflight = loadNewsRemote().finally(() => { _newsInflight = null; });
    return _newsInflight;
  }
  async function loadNewsRemote() {
    try {
      const ipc = getIpc();
      const url = NEWS_URL + '?t=' + Date.now();
      let data;
      if (ipc) {
        data = await ipc.invoke('fetch-json', url);
      } else {
        const r = await fetch(url, { cache: 'no-store' });
        data = await r.json();
      }
      if (!data) return _newsItems;
      _remoteMeta = {
        latestVersion: data.latest_version != null ? String(data.latest_version).trim() : null,
        updateRepo: data.update_repo || null
      };
      const raw = data.news || [];
      _newsItems = raw.map(line => {
        const str = String(line);
        const urlMatch = str.match(/(https?:\/\/\S+)/);
        const url = urlMatch ? urlMatch[1] : '';
        const withoutUrl = url ? str.replace(url, '') : str;
        const sep = withoutUrl.match(/\s[\/\\]\s/);
        const sepIdx = sep ? sep.index : -1;
        const title = sepIdx >= 0 ? withoutUrl.slice(0, sepIdx).trim() : withoutUrl.trim();
        const desc = sepIdx >= 0 ? withoutUrl.slice(sepIdx + 3).replace(/[\/\\\s]*$/, '').trim() : '';
        return { title, desc, url };
      }).reverse();
      _newsLoaded = true;
    } catch (e) { console.warn('fetchNews failed', e); }
    return _newsItems;
  }
  // '2.0.10' > '2.0.9'; префикс «v» и хвосты вроде «-beta» игнорируются
  function cmpAppVer(a, b) {
    const pa = String(a || '').replace(/^v/i, '').split(/[.\-+]/).map(x => parseInt(x, 10) || 0);
    const pb = String(b || '').replace(/^v/i, '').split(/[.\-+]/).map(x => parseInt(x, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }
  function isUpdateAvailable() {
    return !!_remoteMeta.latestVersion && cmpAppVer(_remoteMeta.latestVersion, LAUNCHER_VERSION) > 0;
  }
  // Сплеш: сверка с последним релизом GitHub; есть новее → качаем с прогрессом на сплеше и запускаем установщик.
  // true = установщик запущен (лаунчер сейчас закроется).
  async function splashAutoUpdate() {
    const ipc = getIpc();
    if (!ipc) return false;
    Splash.step(60, 'Проверка обновлений…');
    let info = null;
    try { info = await ipc.invoke('update:check', { repo: _remoteMeta.updateRepo }); } catch (e) {}
    if (!info || !info.ok || !info.hasExe) return false;
    if (cmpAppVer(info.version, LAUNCHER_VERSION) <= 0) return false;
    _remoteMeta.latestVersion = info.version;
    if (!info.packaged) { console.info('[update] dev-запуск: найдено', info.tag, '- автоустановка пропущена'); return false; }
    Splash.setUpdating(true);
    Splash.step(0, `Найдено обновление ${info.tag} - скачивание…`);
    const onProg = (e, d) => Splash.step(d.progress || 0, `Обновление ${info.tag}: ${d.status || ''} ${d.progress != null ? d.progress + '%' : ''}`.trim());
    ipc.on('update:progress', onProg);
    let r = null;
    try { r = await ipc.invoke('update:download', { repo: _remoteMeta.updateRepo }); } catch (e) { r = { ok: false, error: e.message }; }
    ipc.removeListener('update:progress', onProg);
    if (r && r.ok) { Splash.step(100, 'Запуск установщика…'); return true; }
    Splash.setUpdating(false);
    Splash.step(85, 'Не удалось обновиться - продолжаю запуск');
    setTimeout(() => toast('Ошибка обновления: ' + ((r && r.error) || 'неизвестно')), 1500);
    return false;
  }
  function startNewsAutoRefresh() {
    setInterval(async () => {
      if (uiPrefs().trafficSaver) return;
      await fetchNews(true);
      onNewsRefreshed();
    }, NEWS_REFRESH_MS);
  }

  function normalize() {
    const aliases = (D.settings && D.settings.aliases) || {};
    const pinned = (D.settings && D.settings.pinned) || [];
    (D.instances || []).forEach(it => {
      it.id = it.folder || it.name;
      it.name = aliases[it.folder] || it.name || verLabel(it.folder);
      it.ver = it.mc || it.ver || '';
      it.loaderName = LOADER[it.loader] || 'Vanilla';
      it.pinned = pinned.includes(it.folder);
    });
    (D.instances || []).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    (D.servers || []).forEach((s, i) => { s.id = s.id || ('srv' + i); s.status = s.status || 'offline'; });
    (D.sessions || []).forEach((s, i) => { s.id = s.id || ('ses' + i); });
    if (D.settings && D.settings.username) D.profile.name = D.settings.username;
  }

  function installedMap() {
    const map = {};
    (D.instances || []).forEach(it => { (map[it.mc] = map[it.mc] || {})[it.loader] = it.folder; });
    return map;
  }
  function lastPlayed() {
    const lv = D.settings && D.settings.lastVersion;
    return (D.instances || []).find(i => i.folder === lv) || (D.instances || [])[0] || null;
  }

  function modCardDemo(m) {
    const tags = m.tags.map(([t, cls]) => `<span class="tag ${cls}">${t}</span>`).join('');
    return `
      <div class="mod-card">
        <div class="mod-card-top">
          <img class="mod-icon" src="${artFor(m.name)}" alt="">
          <div class="mod-info"><div class="mod-name">${m.name}</div><div class="mod-author">${m.author}</div></div>
        </div>
        <div class="mod-desc">${m.desc}</div>
        <div class="mod-stats"><span>${I.dl}${m.dl}</span><span>${I.star}${m.rating}</span></div>
        <div class="tag-row">${tags}</div>
      </div>`;
  }
  function fmtCount(n) {
    n = +n || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function modrinthCard(h) {
    const slug = h.slug || h.project_id;
    const icon = (!uiPrefs().trafficSaver && h.icon_url) || artFor(slug);
    const loaderTags = (h.categories || [])
      .filter(c => ['forge', 'fabric', 'neoforge', 'quilt'].includes(c))
      .map(c => `<span class="tag loader">${LOADER[c] || c}</span>`).join('');
    const otherTags = (h.display_categories || h.categories || [])
      .filter(c => !['forge', 'fabric', 'neoforge', 'quilt'].includes(c))
      .slice(0, 3)
      .map(c => `<span class="tag">${escapeHtml(c)}</span>`).join('');
    const descEsc = escapeHtml(h.description || '').slice(0, 180);
    return `
      <div class="mod-card" data-mr-slug="${escapeHtml(slug)}">
        <div class="mod-card-top">
          <img class="mod-icon" src="${escapeHtml(icon)}" alt="" onerror="this.src='${artFor(slug)}'">
          <div class="mod-info"><div class="mod-name">${escapeHtml(h.title || slug)}</div><div class="mod-author">${escapeHtml(h.author || '')}</div></div>
        </div>
        <div class="mod-desc">${descEsc}</div>
        <div class="mod-stats"><span>${I.dl}${fmtCount(h.downloads)}</span><span>${I.heart}${fmtCount(h.follows)}</span></div>
        <div class="tag-row">${loaderTags}${otherTags}</div>
        <div class="mod-card-actions">
          <button class="btn-secondary sm icon-sq" data-mr-page="${escapeHtml(slug)}" title="Открыть страницу на Modrinth" aria-label="Страница">${I.arrow}</button>
          <button class="btn primary sm" data-mr-install="${escapeHtml(slug)}">Установить</button>
        </div>
      </div>`;
  }

  // ---- «Уже установлено» в карточках браузера: по индексу контента (modrinth:listInstalled) ----
  // projectId/slug → [{ gameVersions, loaders, versionNumber, disabled }]
  function installedIndex(list) {
    const m = new Map();
    (list || []).forEach(x => {
      const e = { gameVersions: Array.isArray(x.gameVersions) ? x.gameVersions : null, loaders: x.loaders || [], versionNumber: x.versionNumber || '', disabled: /\.disabled$/i.test(x.filename || '') };
      [x.projectId, x.slug].filter(Boolean).forEach(k => { if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
    });
    return m;
  }
  // f = { gameVersion, loader } - фильтр браузера / версия сборки. match = стоит именно под эту версию
  function installStatus(h, map, f) {
    const entries = map.get(h.project_id) || map.get(h.slug);
    if (!entries || !entries.length) return null;
    const uniq = (a) => Array.from(new Set(a));
    const loaderOk = (e) => !f.loader || !e.loaders.length || e.loaders.includes(f.loader) || (f.loader === 'quilt' && e.loaders.includes('fabric'));
    const known = entries.filter(e => e.gameVersions);
    const vers = uniq(known.map(e => e.gameVersions[e.gameVersions.length - 1]).filter(Boolean));
    const off = (e) => e && e.disabled ? ' (отключён)' : '';
    if (!f.gameVersion) return { match: true, text: 'Установлено' + (vers.length ? ' · для ' + vers.join(', ') : '') + off(entries[0]) };
    const hit = known.find(e => e.gameVersions.includes(f.gameVersion) && loaderOk(e));
    if (hit) return { match: true, text: `Установлено для ${f.gameVersion}${hit.versionNumber ? ' · ' + hit.versionNumber : ''}${off(hit)}` };
    if (known.length) return { match: false, text: 'Установлен для другой версии: ' + vers.join(', ') };
    return { match: false, text: 'Установлен (версия неизвестна)' };
  }
  const I_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function decorateInstalled(grid, hits, map, f) {
    if (!grid || !map) return;
    grid.querySelectorAll('.mod-card[data-mr-slug]').forEach(card => {
      const h = hits.find(x => (x.slug || x.project_id) === card.dataset.mrSlug);
      const st = h ? installStatus(h, map, f || {}) : null;
      card.classList.toggle('is-installed', !!(st && st.match));
      const old = card.querySelector('.mod-card-installed');
      if (old) old.remove();
      if (!st) return;
      const div = document.createElement('div');
      div.className = 'mod-card-installed' + (st.match ? '' : ' other');
      div.innerHTML = (st.match ? I_CHECK : I.info) + `<span>${escapeHtml(st.text)}</span>`;
      const actions = card.querySelector('.mod-card-actions');
      if (actions) actions.before(div); else card.appendChild(div);
      const btn = card.querySelector('[data-mr-install]');
      if (btn && st.match && !btn.disabled) { btn.textContent = 'Переустановить'; btn.classList.remove('primary'); btn.classList.add('btn-secondary'); }
    });
  }
  // список установленного (+ разовая дозагрузка версий для старых записей индекса)
  const _backfilled = new Set();
  async function fetchInstalledIndex(projectType, instance) {
    const ipc = getIpc();
    if (!ipc || projectType === 'modpack') return new Map();
    const key = instance || '';
    if (!_backfilled.has(key)) { _backfilled.add(key); await ipc.invoke('modrinth:backfill', { instance }).catch(() => {}); }
    const list = await ipc.invoke('modrinth:listInstalled', { projectType, instance }).catch(() => []);
    return installedIndex(list);
  }

  const BROWSE_PAGE_SIZE = 30;
  const browseState = {
    projectType: 'mod',
    query: '',
    gameVersion: '',
    loader: '',
    offset: 0,
    total: 0,
    hits: [],
    loading: false,
    _reqId: 0,
    _debounce: null
  };
  let _myContentType = 'mod';
  let _myContentSort = 'name';
  let _myContentInactive = false;
  let _myContentItems = [];

  function renderBrowseList() {
    const grid = content.querySelector('.browse-grid[data-grid="browse"]');
    const statusEl = content.querySelector('#browse-status');
    const moreWrap = content.querySelector('#browse-more-wrap');
    if (!grid) return;
    grid.innerHTML = browseState.hits.map(modrinthCard).join('');
    bindBrowseCardActions();
    decorateInstalled(grid, browseState.hits, browseState.installed, browseFilterNow());
    if (statusEl) {
      if (browseState.loading && !browseState.hits.length) statusEl.textContent = 'Поиск на Modrinth…';
      else if (!browseState.hits.length) statusEl.textContent = 'Ничего не найдено. Попробуйте изменить фильтры.';
      else statusEl.textContent = `Найдено ${browseState.total}. Показано ${browseState.hits.length}.`;
    }
    if (moreWrap) {
      const hasMore = browseState.hits.length < browseState.total;
      moreWrap.classList.toggle('hidden', !hasMore);
      const btn = moreWrap.querySelector('#browse-more-btn');
      if (btn) {
        btn.disabled = !!browseState.loading;
        btn.textContent = browseState.loading
          ? 'Загружаю…'
          : `Загрузить ещё (${browseState.total - browseState.hits.length} осталось)`;
      }
    }
  }
  function runBrowseSearch(append = false) {
    const grid = content.querySelector('.browse-grid[data-grid="browse"]');
    if (!grid) return;
    const ipc = getIpc();
    if (!ipc) {
      const key = { mod: 'mods', resourcepack: 'textures', shader: 'shaders', modpack: 'modpacks' }[browseState.projectType] || 'mods';
      grid.innerHTML = (D.content[key] || []).map(modCardDemo).join('');
      const statusEl = content.querySelector('#browse-status');
      if (statusEl) statusEl.textContent = 'Демо-каталог (превью в браузере). Реальный поиск доступен в приложении.';
      return;
    }
    if (!append) {
      browseState.offset = 0;
      browseState.hits = [];
      browseState.total = 0;
    }
    const myReq = ++browseState._reqId;
    browseState.loading = true;
    renderBrowseList();
    if (!append) fetchInstalledIndex(browseState.projectType).then(m => { if (myReq === browseState._reqId) { browseState.installed = m; renderBrowseList(); } });
    ipc.invoke('modrinth:search', {
      query: browseState.query,
      projectType: browseState.projectType,
      gameVersion: browseState.gameVersion,
      loader: browseState.projectType === 'mod' || browseState.projectType === 'modpack' ? browseState.loader : '',
      limit: BROWSE_PAGE_SIZE,
      offset: browseState.offset
    }).then(res => {
      if (myReq !== browseState._reqId) return;
      browseState.loading = false;
      if (!res || !res.ok) {
        const statusEl = content.querySelector('#browse-status');
        if (statusEl) statusEl.textContent = 'Ошибка: ' + (res && res.error || 'нет связи с Modrinth');
        return;
      }
      browseState.total = res.total || 0;
      browseState.hits = browseState.hits.concat(res.hits || []);
      browseState.offset = browseState.hits.length;
      renderBrowseList();
    }).catch(err => {
      if (myReq !== browseState._reqId) return;
      browseState.loading = false;
      const statusEl = content.querySelector('#browse-status');
      if (statusEl) statusEl.textContent = 'Ошибка: ' + err.message;
    });
  }
  function bindBrowseCardActions() {
    content.querySelectorAll('[data-mr-install]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        installModrinth(btn.dataset.mrInstall, btn);
      }));
    content.querySelectorAll('[data-mr-page]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slug = btn.dataset.mrPage;
        const ipc = getIpc();
        const url = `https://modrinth.com/${browseState.projectType}/${slug}`;
        if (ipc) ipc.send('open-url', url); else window.open(url, '_blank');
      }));
  }
  function installModrinth(slug, btn) {
    const ipc = getIpc();
    if (!ipc) { toast('Установка доступна только в приложении'); return; }
    if (browseState.projectType === 'modpack') {
      toast('Установка .mrpack пока не поддерживается - откройте страницу проекта');
      return;
    }
    // Берём заголовок из карточки
    const card = btn.closest('.mod-card');
    const title = card ? (card.querySelector('.mod-name') || {}).textContent || slug : slug;
    const taskId = 'mr:' + slug;
    Downloads.start(taskId, 'mr', title);

    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Качаю…';
    ipc.invoke('modrinth:install', {
      slug,
      projectType: browseState.projectType,
      gameVersion: browseState.gameVersion || undefined,
      loader: (browseState.projectType === 'mod' && browseState.loader) || undefined
    }).then(res => {
      if (btn.isConnected) btn.disabled = false;
      if (!res || !res.ok) {
        Downloads.finish(taskId, { ok: false, error: (res && res.error) || 'ошибка' });
        if (btn.isConnected) btn.textContent = orig;
        toast('Не удалось установить: ' + (res && res.error || ''));
        return;
      }
      Downloads.finish(taskId, { ok: true });
      if (btn.isConnected) btn.textContent = 'Установлено';
      fetchInstalledIndex(browseState.projectType).then(m => { browseState.installed = m; if (currentView === 'browse') renderBrowseList(); });
      const deps = res.deps || [];
      toast('Установлено: ' + res.filename + (deps.length ? ` · + зависимости: ${deps.map(d => d.title).join(', ')}` : '')
        + ((res.skipped || []).length ? ` · уже стоят: ${res.skipped.join(', ')}` : ''));
      (res.warnings || []).forEach(w => showNoticePlate(w));
    }).catch(err => {
      Downloads.finish(taskId, { ok: false, error: err.message });
      if (btn.isConnected) { btn.disabled = false; btn.textContent = orig; }
      toast('Ошибка: ' + err.message);
    });
  }
  function browseFilterNow() {
    return { gameVersion: browseState.gameVersion, loader: browseState.projectType === 'mod' ? browseState.loader : '' };
  }
  function onBrowseScroll() {
    if (currentView !== 'browse') return;
    if (browseState.loading) return;
    if (browseState.hits.length >= browseState.total) return;
    const nearBottom = content.scrollHeight - (content.scrollTop + content.clientHeight) < 220;
    if (nearBottom) runBrowseSearch(true);
  }
  function bindBrowseEvents() {
    const typeRow = content.querySelector('[data-tabscope="browse-type"]');
    if (typeRow) {
      typeRow.querySelectorAll('[data-browse-type]').forEach(tab =>
        tab.addEventListener('click', () => {
          browseState.projectType = tab.dataset.browseType;
          setView('browse'); // перерисуем, чтобы обновить фильтры/заголовок
        }));
    }
    const search = content.querySelector('#browse-search');
    if (search) search.addEventListener('input', () => {
      clearTimeout(browseState._debounce);
      browseState.query = search.value;
      browseState._debounce = setTimeout(runBrowseSearch, 350);
    });
    const ver = content.querySelector('#browse-ver');
    if (ver) ver.addEventListener('change', () => { browseState.gameVersion = ver.value; runBrowseSearch(); });
    const loader = content.querySelector('#browse-loader');
    if (loader) loader.addEventListener('change', () => { browseState.loader = loader.value; runBrowseSearch(); });
    const reload = content.querySelector('#browse-reload');
    if (reload) reload.addEventListener('click', () => runBrowseSearch(false));
    const moreBtn = content.querySelector('#browse-more-btn');
    if (moreBtn) moreBtn.addEventListener('click', () => runBrowseSearch(true));
    content.removeEventListener('scroll', onBrowseScroll);
    content.addEventListener('scroll', onBrowseScroll, { passive: true });
    if (!browseState.gameVersion && !browseState.loader) {
      const last = lastPlayed();
      if (last) {
        if (last.mc) { browseState.gameVersion = last.mc; if (ver) ver.value = last.mc; }
        if (last.loader && last.loader !== 'vanilla') { browseState.loader = last.loader; if (loader) loader.value = last.loader; }
      }
    }
    runBrowseSearch();
  }

  function sessionRow(s) {
    const metaParts = Array.isArray(s.meta) && s.meta.length
      ? s.meta
      : [s.ver || '', s.loaderName || '', s.pid ? 'PID ' + s.pid : '', formatPlaytime(s.durationSec || 0)].filter(Boolean);
    const meta = metaParts.map((x, i) => (i ? '<span class="sep">·</span>' : '') + `<span>${escapeHtml(String(x))}</span>`).join('');
    return `
      <div class="lib-row" data-session="${escapeHtml(s.id)}">
        <img class="lib-icon" src="${artFor(s.name)}" alt="">
        <div class="lib-main"><div class="lib-name">${escapeHtml(s.name)}</div><div class="lib-meta">${meta}</div></div>
        <div class="lib-right"><span class="pill running">Запущено</span>
          <button class="btn-ghost danger" data-stop-session="${escapeHtml(s.folder || s.id)}" title="Остановить">${I.stop}</button></div>
      </div>`;
  }

  function libRow(inst, editable) {
    const meta = `<span>${inst.ver || '-'}</span><span class="sep">·</span><span>${inst.loaderName}</span>`;
    const icon = editable
      ? `<div class="lib-icon-wrap" data-edit="${inst.id}" title="Сменить картинку">
           <img class="lib-icon" src="${iconFor(inst)}" alt=""><div class="lib-icon-edit">${I.pencil}</div></div>`
      : `<img class="lib-icon" src="${iconFor(inst)}" alt="">`;
    const pinMark = inst.pinned
      ? `<span class="pinned-mark" title="Закреплено"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7h7l-5.5 4.5L17 21l-5-3-5 3 1.5-7.5L3 9h7z"/></svg></span>`
      : '';
    return `
      <div class="lib-row" data-inst="${inst.id}" data-play="${inst.id}">
        ${icon}
        <div class="lib-main"><div class="lib-name">${escapeHtml(inst.name)}${pinMark}</div><div class="lib-meta">${meta}</div></div>
        <div class="lib-right"><button class="btn-ghost" data-inst-menu="${inst.id}">${I.dots}</button>
          <button class="btn-play-sm" title="Играть" data-play-direct="${inst.id}">${I.play}</button></div>
      </div>`;
  }

  function remoteServerRow(s, kind) {
    return `
      <div class="lib-row srv-row" data-remote="${kind}" data-id="${escapeHtml(s.id || '')}" data-ip="${escapeHtml(s.ip || '')}" data-name="${escapeHtml(s.name || s.ip || '')}">
        <img class="lib-icon srv-favicon" data-ping-icon src="${artFor((s.name || '') + (s.ip || ''))}" alt="">
        <div class="lib-main">
          <div class="lib-name">${escapeHtml(s.name || s.ip)}</div>
          <div class="srv-motd" data-ping-motd></div>
          <div class="lib-meta"><span>${escapeHtml(s.ip || '')}</span><span data-ping-version></span></div>
        </div>
        <div class="lib-right">
          <span class="ping-badge" data-ping-badge title="Пинг…"><i class="ping-dot"></i><span>…</span></span>
          <button class="btn-ghost" data-act="copy" title="Копировать IP">${I.copy}</button>
          <button class="btn-play-sm" data-act="join" title="Подключиться">${I.play}</button>
          <button class="btn-ghost danger" data-act="delete" title="Удалить">×</button>
        </div>
      </div>`;
  }
  const SRV_STATE_LABEL = { stopped: 'Оффлайн', starting: 'Запуск…', running: 'Онлайн', stopping: 'Остановка…' };
  function managedServerItem(s) {
    const st = serverState(s.id);
    const rt = srvRuntime(s.id);
    const busy = rt.state === 'starting' || rt.state === 'stopping';
    const live = rt.state !== 'stopped';
    return `
      <div class="server-item ${st.open ? 'open' : ''}" data-server="${s.id}" data-managed="1" data-state="${rt.state}">
        <div class="lib-row server-head">
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
          <img class="lib-icon" src="${artFor('mgl' + s.id)}" alt="">
          <div class="lib-main"><div class="lib-name">${escapeHtml(s.name)} <span class="managed-badge">управляемый</span></div>
            <div class="lib-meta"><span>${escapeHtml(s.mcVersion)}</span><span class="sep">·</span><span>${s.memory || 1024} МБ</span>
              <span class="sep">·</span><span class="js-port" title="Адрес для подключения из локальной сети">${escapeHtml(managedAddress(s.id))}</span>
              <span class="js-uptime">${rt.state === 'running' && rt.startedAt ? '· ' + formatPlaytime(Math.round((Date.now() - rt.startedAt) / 1000)) : ''}</span>
              <span class="js-players"></span></div></div>
          <div class="lib-right">
            <span class="pill ${live ? 'running' : ''} js-status">${SRV_STATE_LABEL[rt.state] || 'Оффлайн'}</span>
            <button class="btn-play-sm js-toggle ${live ? 'stop' : ''}" title="${live ? 'Остановить' : 'Запустить'}" ${busy ? 'disabled' : ''}>${live ? I.stop : I.play}</button>
          </div>
        </div>
        <div class="server-panel">
          <div class="server-toolbar">
            <button class="btn sm primary" data-act="join" ${rt.state === 'running' ? '' : 'disabled'}>${I.play} Играть</button>
            <button class="btn sm icon" data-act="copy" title="Копировать IP сервера">${I.copy}</button>
            <button class="btn sm icon" data-act="restart" title="Перезапустить">${I.restart}</button>
            <button class="btn sm icon" data-act="storage" title="Открыть папку сервера">${I.folder}</button>
            <button class="btn sm icon" data-act="config" title="Параметры и server.properties">${I.sliders}</button>
            <button class="btn sm" data-act="clear">Очистить лог</button>
            <button class="btn sm danger" data-act="kill" title="Завершить процесс без сохранения">Убить</button>
            <button class="btn sm danger" data-act="delete-managed">Удалить</button>
          </div>
          <div class="server-console" data-console></div>
          <div class="server-cmd">
            <span class="cmd-prompt">&gt;</span>
            <input type="text" class="cmd-input" placeholder="Команда сервера (say, op, list, whitelist…) - ↑/↓ история">
            <button class="btn sm primary cmd-send">Отправить</button>
          </div>
        </div>
      </div>`;
  }

  // Новости приходят с сервера на русском; если в записи есть title_en / desc_en - в английском режиме показываем их
  function newsText(n, field) {
    return (window.MglI18n && MglI18n.lang === 'en' && n[field + '_en']) || n[field] || '';
  }

  // Кнопки в пустых состояниях: [действие, html, primary?]; обрабатываются одним делегатом (emptyAction)
  function emptyBtns(list) {
    return `<div class="empty-actions">${list.map(([act, html, primary]) =>
      `<button type="button" class="btn ${primary ? 'primary ' : ''}sm" data-empty-act="${act}">${html}</button>`).join('')}</div>`;
  }
  // «Новая сессия» = к карточке «Запуск игры» на главной (при необходимости сразу открыть выбор версии)
  function goNewSession(openPicker) {
    if (currentView !== 'home') setView('home');
    setTimeout(() => {
      const card = content.querySelector('.launch-card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');
        setTimeout(() => card.classList.remove('pulse'), 1800);
      }
      if (openPicker) { const p = document.getElementById('launch-version-pick'); if (p) setTimeout(() => p.click(), 350); }
    }, 80);
  }
  function emptyAction(act) {
    if (act === 'new-session') goNewSession(false);
    else if (act === 'install-version') goNewSession(true);
    else if (act === 'browse') setView('browse');
    else if (act === 'create-pack') {
      setView('packs');
      if (window.MglPacks) window.MglPacks.create(); else toast('Сборки недоступны');
    }
  }

  function launchSection() {
    const map = installedMap();
    const versions = Object.keys(map).sort(cmpVerDesc);
    const hasAny = versions.length > 0;
    const firstLoaders = hasAny ? Object.keys(map[versions[0]]) : [];
    const lOptions = firstLoaders.map(l => `<option value="${l}">${LOADER[l] || l}</option>`).join('');
    const user = (D.settings && D.settings.username) || D.profile.name;
    const curVer = (D.settings && D.settings.lastVersion && (map[((D.instances||[]).find(i => i.folder === D.settings.lastVersion) || {}).mc]) ? ((D.instances||[]).find(i => i.folder === D.settings.lastVersion) || {}).mc : versions[0]) || '-';
    return `
      <div class="section">
        <div class="section-head"><div class="section-title">Запуск игры</div></div>
        <div class="launch-card">
          <div class="launch-fields">
            <div class="lf"><label>Никнейм</label><input type="text" id="launch-user" value="${escapeHtml(user)}"></div>
            <div class="lf"><label>Версия</label>
              <button type="button" class="version-picker" id="launch-version-pick" data-value="${escapeHtml(curVer)}">
                <span class="vp-label">${escapeHtml(curVer)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
              </button></div>
            <div class="lf"><label>Модлоадер</label>
              <select id="launch-loader" ${hasAny ? '' : 'disabled'}>${lOptions || '<option value="vanilla">Vanilla</option>'}</select></div>
          </div>
          <button class="launch-play" id="launch-btn">${I.play}<span>Играть</span></button>
        </div>
        <div class="launch-progress hidden" id="install-progress">
          <div class="lp-bar"><div class="lp-fill" id="ip-fill"></div></div>
          <div class="lp-status" id="ip-status">Подготовка…</div>
        </div>
        <div class="launch-progress hidden" id="launch-progress">
          <div class="lp-bar"><div class="lp-fill" id="lp-fill"></div></div>
          <div class="lp-status" id="lp-status">Подготовка…</div>
        </div>
      </div>`;
  }

  const views = {
    home() {
      const hero = lastPlayed();
      const heroBlock = hero ? `
        <div class="hero-tag">Продолжить играть</div>
        <div class="hero-title">${hero.name}</div>
        <div class="hero-sub">${hero.loaderName} · ${hero.ver || ''}</div>`
        : `
        <div class="hero-tag">Добро пожаловать</div>
        <div class="hero-title">Magma Launcher</div>
        <div class="hero-sub">Выберите версию в разделе «Запуск игры» ниже</div>`;
      const heroPlay = hero
        ? `<button class="hero-play" data-play="${hero.id}">${I.play} Играть</button>`
        : '';

      const sessionsBlock = (D.sessions && D.sessions.length)
        ? D.sessions.map(sessionRow).join('')
        : `<div class="empty sm">${I.box}<div>Нет активных сессий</div>${emptyBtns([['new-session', `${I.play} Новая сессия`, true]])}</div>`;

      const heroViz = HeroViz.wanted();
      const heroScene = heroViz ? null : HeroScenes.mode();
      return `
      <div class="view">
        <div class="hero ${heroViz ? 'viz-mode' : ''} ${heroScene ? 'scene-mode' : ''}">
          <div class="hero-anim"><div class="hero-anim-core"></div></div>
          ${heroViz ? '<canvas class="hero-viz"></canvas>' : ''}
          ${heroScene ? `<canvas class="hero-scene" data-scene="${heroScene}"></canvas>` : ''}
          <div class="hero-noise"></div>
          <button class="hero-servers-btn" id="hero-servers-btn" title="Недавние серверы">${I.arrow}</button>
          <div class="srv-pop hidden" id="srv-pop"></div>
          <div class="hero-score"></div>
          <div class="hero-body">
            <div>${heroBlock}</div>
            ${heroPlay}
          </div>
        </div>

        ${launchSection()}

        <div class="section">
          <div class="section-head"><div class="section-title">Активные сессии</div>
            <div class="section-link" data-view="sessions">Управление</div></div>
          ${sessionsBlock}
        </div>
      </div>`;
    },

    news() {
      return `
      <div class="view">
        <div class="page-head"><div class="page-title">Новости</div>
          <div class="page-sub">Обновления и анонсы Magma Launcher</div></div>
        <div id="news-list" class="news-list"><div class="browse-status">Загрузка новостей…</div></div>
      </div>`;
    },

    mycontent() {
      const types = [
        ['mod', 'Моды'],
        ['resourcepack', 'Текстуры'],
        ['shader', 'Шейдеры']
      ];
      const typeTabs = types.map(([k, l]) =>
        `<button class="tab ${k === _myContentType ? 'active' : ''}" data-mycontent-type="${k}">${l}</button>`
      ).join('');
      return `
      <div class="view">
        <div class="page-head"><div class="page-title">Мой контент</div>
          <div class="page-sub">Установленные моды, текстуры и шейдеры</div></div>
        <div class="tab-row" data-tabscope="mycontent-type">${typeTabs}</div>
        <div class="chip-row" id="mycontent-filters">
          <button class="chip ${_myContentSort === 'size' ? 'on' : ''}" data-mc-sort="size">По размеру</button>
          <button class="chip ${_myContentInactive ? 'on' : ''}" data-mc-inactive>Не активные</button>
          <button class="chip ${_myContentSort === 'date' ? 'on' : ''}" data-mc-sort="date">По дате добавления</button>
        </div>
        <div class="mc-toolbar">
          <button class="btn-secondary" id="mc-add">${I.plus} Добавить файлы</button>
          <button class="btn-secondary" id="mc-all-on">Включить все</button>
          <button class="btn-secondary" id="mc-all-off">Отключить все</button>
          <input type="file" id="mc-file" multiple hidden accept="${_myContentType === 'mod' ? '.jar' : '.zip'}">
        </div>
        <div id="mc-drop" class="mc-drop" title="Перетащите файлы сюда">
          ${I.dl}<div><b>Перетащите файлы сюда</b><span>${_myContentType === 'mod' ? '.jar-файлы модов' : _myContentType === 'resourcepack' ? '.zip-файлы ресурспаков' : '.zip-файлы шейдеров'} - копируются в папку автоматически</span></div>
        </div>
        <div id="mycontent-status" class="browse-status">Загрузка…</div>
        <div id="mycontent-list" class="mycontent-list"></div>
      </div>`;
    },

    browse() {
      const st = browseState;
      const instances = D.instances || [];
      const mcVersions = Array.from(new Set(instances.map(i => i.mc).filter(Boolean)));
      const loaders = ['forge', 'fabric', 'neoforge', 'quilt'];
      const projectTypes = [
        ['mod', 'Моды'],
        ['resourcepack', 'Текстуры'],
        ['shader', 'Шейдеры'],
        ['modpack', 'Модпаки']
      ];
      const typeTabs = projectTypes.map(([k, l]) =>
        `<button class="tab ${k === st.projectType ? 'active' : ''}" data-browse-type="${k}">${l}</button>`
      ).join('');
      const verOpts = ['<option value="">Любая версия</option>']
        .concat(mcVersions.map(v => `<option value="${escapeHtml(v)}" ${v === st.gameVersion ? 'selected' : ''}>${escapeHtml(v)}</option>`))
        .join('');
      const loaderOpts = ['<option value="">Любой лоадер</option>']
        .concat(loaders.map(l => `<option value="${l}" ${l === st.loader ? 'selected' : ''}>${LOADER[l]}</option>`))
        .join('');
      const typeSub = {
        mod: 'Моды с Modrinth. Устанавливаются в .minecraft/mods/',
        resourcepack: 'Ресурспаки с Modrinth. Устанавливаются в .minecraft/resourcepacks/',
        shader: 'Шейдеры с Modrinth. Устанавливаются в .minecraft/shaderpacks/',
        modpack: 'Модпаки с Modrinth. Пока только ссылка на страницу проекта'
      }[st.projectType];
      return `
      <div class="view">
        <div class="page-head"><div class="page-title">Браузер контента</div>
          <div class="page-sub">${typeSub}</div></div>
        <div class="tab-row" data-tabscope="browse-type">${typeTabs}</div>
        <div class="browse-filters">
          <input id="browse-search" class="input" type="text" placeholder="Поиск по Modrinth…" value="${escapeHtml(st.query || '')}">
          <select id="browse-ver" class="select">${verOpts}</select>
          ${st.projectType === 'mod' || st.projectType === 'modpack' ? `<select id="browse-loader" class="select">${loaderOpts}</select>` : ''}
          <button id="browse-reload" class="btn-secondary" title="Обновить">↻</button>
        </div>
        <div id="browse-status" class="browse-status">Загрузка…</div>
        <div class="browse-grid" data-grid="browse"></div>
        <div id="browse-more-wrap" class="browse-more hidden">
          <button id="browse-more-btn" class="btn-secondary">Загрузить ещё</button>
        </div>
      </div>`;
    },

    library() {
      const list = (D.instances && D.instances.length)
        ? D.instances.map(i => libRow(i, true)).join('')
        : `<div class="empty">${I.box}<div>Нет установленных версий</div><div class="empty-sub">Установите версию Minecraft или создайте сборку со своими модами</div>${emptyBtns([['install-version', `${I.dl} Установить версию`, true], ['create-pack', `${I.plus} Создать сборку`]])}</div>`;
      return `
      <div class="view">
        <div class="page-head"><div class="page-title">Библиотека</div>
          <div class="page-sub">${(D.instances || []).length} сборок · наведите на иконку, чтобы сменить картинку</div></div>
        <input type="file" id="lib-icon-file" accept="image/*" hidden>
        ${list}
      </div>`;
    },

    sessions() {
      const list = (D.sessions && D.sessions.length)
        ? D.sessions.map(sessionRow).join('')
        : `<div class="empty">${I.box}<div>Нет активных сессий</div><div class="empty-sub">Запущенные экземпляры игры будут отображаться здесь</div>${emptyBtns([['new-session', `${I.play} Новая сессия`, true]])}</div>`;
      return `
      <div class="view">
        <div class="page-head"><div class="page-title">Активные сессии</div>
          <div class="page-sub">${(D.sessions || []).length} запущенных экземпляров</div></div>
        ${list}
      </div>`;
    },

    skins() {
      return `
      <div class="view">
        <div class="page-head"><div class="page-title">Менеджер скинов</div>
          <div class="page-sub">Добавляйте скины (PNG, по нику или ссылке) - они сохраняются в <code class="path">.minecraft/mgl/skin/</code></div></div>
        <input type="file" id="skin-file" accept="image/png,.png" hidden>
        <input type="file" id="cape-file" accept="image/png,.png" hidden>
        <div class="skin-layout">
          <div class="skin-preview">
            <div class="skin-stage" id="skin-stage"><canvas id="skin-canvas"></canvas></div>
            <div class="skin-name" id="skin-active-name">-</div>
            <div class="account-tabs skin-model-tabs" id="skin-model-tabs" title="Тип модели: Classic - руки 4 px (Steve), Slim - 3 px (Alex)">
              <button class="account-tab" data-skin-model="auto">Авто</button>
              <button class="account-tab" data-skin-model="classic">Classic</button>
              <button class="account-tab" data-skin-model="slim">Slim</button>
            </div>
            <div class="skin-model-hint" id="skin-model-hint"></div>
            <div class="skin-actions">
              <button class="btn" id="skin-upload-btn">Добавить ▾</button>
              <button class="btn primary" id="skin-apply-btn">Применить</button>
            </div>
            <div class="skin-hint" id="skin-folder-hint"></div>
          </div>
          <div>
            <div class="section-title" style="margin-bottom:14px">Мои скины</div>
            <div class="skin-grid" id="skin-grid"></div>
            <div class="skin-divider"></div>
            <div class="section-title" style="margin-bottom:14px">Плащи</div>
            <div class="skin-grid" id="cape-grid"></div>
          </div>
        </div>
      </div>`;
    },

    servers() {
      const custom = D.customServers || [];
      const managed = D.managedServers || [];
      const vanilla = (D.servers || []).filter(s => !custom.some(c => normIp(c.ip) === normIp(s.ip)));
      const customRows = custom.length ? custom.map(s => remoteServerRow(s, 'custom')).join('') : '';
      const managedRows = managed.length ? managed.map(managedServerItem).join('') : '';
      const vanillaRows = vanilla.length ? vanilla.map(s => remoteServerRow(s, 'dat')).join('') : '';
      const empty = (!custom.length && !managed.length && !vanilla.length)
        ? `<div class="empty">${I.globe}<div>Серверов пока нет</div><div class="empty-sub">Добавьте внешний сервер по IP или создайте свой - лаунчер сам установит и развернёт серверный jar</div></div>`
        : '';
      return `
      <div class="view">
        <div class="page-head page-head-row"><div><div class="page-title">Серверы</div>
          <div class="page-sub">Запуск и управление серверами прямо из лаунчера. Добавленные серверы попадают и в список серверов игры</div></div>
          <button class="btn-secondary" id="srv-ping-all" title="Обновить пинг всех серверов">↻ Пинг</button></div>
        ${empty}
        ${customRows ? `<div class="section"><div class="section-head"><div class="section-title">Добавленные</div></div>${customRows}</div>` : ''}
        ${managedRows ? `<div class="section"><div class="section-head"><div class="section-title">Свои серверы (управляемые)</div></div>${managedRows}</div>` : ''}
        ${vanillaRows ? `<div class="section"><div class="section-head"><div class="section-title">Из servers.dat</div></div>${vanillaRows}</div>` : ''}
        <div class="server-actions">
          <button class="btn-split-half" id="add-server">${I.plus} Добавить сервер</button>
          <button class="btn-split-half primary" id="create-server">${I.plus} Создать сервер</button>
        </div>
      </div>`;
    },

    settings() {
      const s = D.settings || {};
      return `
      <div class="view">
        <div class="page-head page-head-row"><div><div class="page-title">Настройки</div>
          <div class="page-sub">Параметры запуска и внешнего вида · нажмите на заголовок блока, чтобы свернуть</div></div>
          <div class="head-tools">
            <label class="lang-pick" title="Язык / Language"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
              <select id="set-lang" aria-label="Language">${[['auto', 'Auto (system)'], ['ru', 'Русский'], ['en', 'English']]
                .map(([v, l]) => `<option value="${v}" ${((s.language) || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <button class="btn-secondary" id="sc-toggle-all">Свернуть всё</button></div></div>
        <div class="settings-card update-card">
          <div class="update-top">
            <div>
              <div class="update-title">Magma Launcher <span class="update-ver">v${LAUNCHER_VERSION}</span></div>
              <div class="update-sub" id="upd-sub">${isUpdateAvailable() ? `Доступна версия ${escapeHtml(_remoteMeta.latestVersion)}` : 'Нажмите, чтобы сверить версию с сервером'}</div>
            </div>
            <button class="btn-secondary update-btn ${isUpdateAvailable() ? 'glow' : ''}" id="upd-btn">${isUpdateAvailable() ? 'Скачать обновление' : 'Проверить обновления'}</button>
          </div>
          <div class="update-actions">
            <button class="btn-secondary icon-link" data-link="https://t.me/mglauncher" title="Telegram-канал @mglauncher" aria-label="Telegram"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.1 1.2 11.6c-1-.3-1.1-1 .2-1.5L20.6 2.7c.9-.3 1.6.2 1.3 1.6z"/></svg><span>Канал</span></button>
            <button class="btn-secondary icon-link" data-link="https://github.com/AuriXDev/Magma-Launcher/blob/main/docs/PRIVACY_POLICY.md" title="Политика конфиденциальности"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg><span>Конфиденциальность</span></button>
            <button class="btn-secondary icon-link" data-link="https://github.com/AuriXDev/Magma-Launcher/blob/main/docs/TERMS_OF_SERVICE.md" title="Условия использования"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg><span>Условия</span></button>
            <button class="btn-secondary icon-link" data-link="https://aurixdev.github.io/mgl/" title="Сайт" aria-label="Сайт"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></button>
            <button class="btn-secondary icon-link" data-link="https://github.com/AuriXDev/Magma-Launcher" title="GitHub" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg></button>
          </div>
        </div>
        <div class="settings-card">
          <h3>Профиль</h3>
          <div class="field"><label class="field-label">Никнейм</label>
            <input type="text" id="set-username" value="${escapeHtml(s.username || D.profile.name)}"></div>
          <div class="toggle-row"><div><div class="tl">Использовать MGL S&amp;C</div><div class="ts">Локальная смена скинов и плащей в игре с помощью мода Magma Skin &amp; Cape</div>
            <div class="ts mglsc-versions" id="mglsc-versions"></div></div>
            <div class="switch ${s.useMglSc ? 'on' : ''}" id="mglsc-switch"></div></div>
        </div>
        <div class="settings-card">
          <h3>Java и память</h3>
          <div class="field"><label class="field-label">Путь к Java</label>
            <div class="field-row">
              <input type="text" id="set-java" value="${escapeHtml(s.javaPath || '')}" placeholder="Определяется автоматически">
              <button type="button" class="btn-secondary" id="set-java-browse">Обзор…</button>
              <button type="button" class="btn-ghost" id="set-java-clear" title="Очистить">×</button>
            </div></div>
          <div class="field"><label class="field-label">Установка Java - Eclipse Temurin (Adoptium)</label>
            <div class="field-row" style="gap:8px; flex-wrap:wrap">
              <button type="button" class="btn-secondary" data-java-install="8">Java 8</button>
              <button type="button" class="btn-secondary" data-java-install="17">Java 17</button>
              <button type="button" class="btn-secondary" data-java-install="21">Java 21</button>
              <button type="button" class="btn-secondary" data-java-install="25">Java 25</button>
            </div>
            <div class="field-hint">Лаунчер скачает официальный установщик и откроет его. Путь по умолчанию - <code class="path">C:\Program Files\Eclipse Adoptium\</code>; именно оттуда Java подбирается в первую очередь.</div>
            <div class="java-found" id="java-found"></div>
          </div>
          <div class="field"><label class="field-label">Выделенная память</label>
            <div class="field-row">
              <input type="range" id="set-ram" min="1024" max="${ramMaxMb()}" step="512" value="${Math.min(s.memoryMax || 2048, ramMaxMb())}">
              <span class="range-val" id="ram-val">${Math.min(s.memoryMax || 2048, ramMaxMb())} МБ</span>
            </div>
            <div class="field-hint">${ramHintHtml()}</div></div>
        </div>
        <div class="settings-card" id="launch-card">${launchCardHtml()}</div>
        <div class="settings-card">
          <h3>Папка игры</h3>
          <div class="field"><label class="field-label">Путь к .minecraft</label>
            <div class="field-row">
              <input type="text" id="set-mcdir" value="${escapeHtml(s.minecraftDir || '')}" placeholder="По умолчанию: %APPDATA%/.minecraft" readonly>
              <button type="button" class="btn-secondary" id="set-mcdir-browse">Выбрать…</button>
              <button type="button" class="btn-ghost" id="set-mcdir-reset" title="Вернуть по умолчанию">×</button>
            </div>
            <div class="field-hint" id="mcdir-hint" style="margin-top:8px">При смене пути можно перенести всё содержимое старой папки в новую.</div>
          </div>
        </div>
        <div class="settings-card" id="custom-card">
          <h3>Кастомизация</h3>
          ${czSectionHtml('basic', 'Основное', 'Шрифт, фон «Продолжить играть», стиль стекла', `<div id="cz-basic">${czBasicHtml()}</div>`)}
          ${czSectionHtml('theme', 'Тема', 'Готовые и свои цветовые темы', `<div id="cz-main">${customizationCardHtml()}</div>`)}
          ${czSectionHtml('bg', 'Настройка фона', 'Фото или 3D-модель на фоне лаунчера, размытие', `<div id="bg-blur-box">${bgBlurHtml()}</div><div id="bg-card">${bgCardHtml()}</div>`)}
          ${czSectionHtml('rail', 'Панель быстрого доступа', 'Значки левой панели и их порядок', `<div id="rail-card">${railCardHtml()}</div>`)}
        </div>

        <div class="settings-card">
          <h3>Оптимизация</h3>
          ${hardwareInfoHtml()}
          ${uiPrefToggle('optimization', 'Режим оптимизации', '', s)}
          <div class="ui-pref-rest ${s.optimization ? 'hidden' : ''}">
            ${uiPrefToggle('noNeon', 'Отключить неон', 'Без свечения и подсветки под курсором', s)}
            ${uiPrefToggle('noAnimations', 'Отключить плавные анимации', 'Мгновенные переходы без анимаций', s)}
            ${uiPrefToggle('trafficSaver', 'Экономия трафика', 'Без иконок Modrinth и автообновления новостей', s)}
            ${uiPrefToggle('noBackground', 'Отключить фон', 'Скрыть анимированный и пользовательский фон', s)}
            ${uiPrefToggle('noSeasonal', 'Отключить сезонные эффекты', 'Снег зимой, сердечки на 14 февраля и другие праздничные эффекты', s)}          </div>
        </div>

        <div class="settings-card">
          <h3>Уведомления</h3>
          ${notifPrefToggle('notifyDesktop', 'Системные уведомления Windows', 'Всплывающие уведомления, когда лаунчер свёрнут или не в фокусе', s)}
          ${notifPrefToggle('notifyNews', 'Новые новости', 'Сообщать о новых публикациях (проверка каждые 20 минут)', s)}
          ${notifPrefToggle('notifyUpdates', 'Обновления лаунчера', 'Сообщать, когда выходит новая версия Magma Launcher', s)}
          ${notifPrefToggle('notifyServers', 'Серверы', 'Сообщать, если управляемый сервер остановился с ошибкой', s)}
        </div>

        <div class="settings-card">
          <h3>Какие версии показывать</h3>
          <div class="field-hint" style="margin-bottom:10px">Фильтр для попапа выбора версии в разделе «Запуск игры».</div>
          ${verTypeToggle('release', 'Релизы (release)', s)}
          ${verTypeToggle('snapshot', 'Снапшоты (snapshot)', s)}
          ${verTypeToggle('old_beta', 'Беты (old_beta)', s)}
          ${verTypeToggle('old_alpha', 'Альфы (old_alpha)', s)}
        </div>

        ${statsCard()}

        <div class="settings-card">
          <h3>Настройки лаунчера</h3>
          <div class="field-hint" style="margin:0 0 14px">Сохраните настройки в файл, перенесите на другой ПК или верните всё по умолчанию. UID аккаунта, папка игры и серверы при сбросе сохраняются.</div>
          <div class="field-row settings-data-actions">
            <button class="btn-secondary" id="set-export">${I.dl} Экспорт</button>
            <button class="btn-secondary" id="set-import">${I.folder} Импорт</button>
            <button class="btn-secondary danger" id="set-reset">${I.restart} Сброс</button>
          </div>
        </div>

        <div class="settings-card" id="crash-card">${crashCardHtml()}</div>

        <div class="settings-card">
          <h3>Фикс версий</h3>
          <div class="field-hint" style="margin:0 0 14px">Добавляет к папкам сборок префикс с версией Minecraft, например <b>[1.20.1]</b> fabric-loader-0.16.10-1.20.1 - иначе версия загрузчика может определиться как версия игры. В лаунчере префикс не показывается. Чистые vanilla-папки (1.20.1) не трогаются.</div>
          <div class="field-row settings-data-actions">
            <button class="btn-secondary" id="set-fix-versions">${I.restart} Исправить имена версий</button>
          </div>
        </div>

        ${s.debugMode ? `<div class="settings-card" id="debug-card">${debugCardHtml()}</div>` : ''}

        <div class="thanks-card">
          ${I.heart}
          <div>
            <div class="thanks-title">Спасибо, что пользуетесь Magma Launcher!</div>
            <div class="thanks-sub">Вы - часть нашего сообщества. Приятной игры и удачных приключений в Minecraft.</div>
          </div>
        </div>
      </div>`;
    }
  };

  function debugCardHtml() {
    const s = D.settings || {};
    const SE = window.MglSeasonal;
    if (!SE) return '<h3>Дебаг</h3><div class="field-hint">Модуль сезонных эффектов не загружен</div>';
    const date = SE.parseDate(s.seasonDate) || new Date();
    const auto = SE.detect(date);
    const cur = s.seasonOverride || '';
    const fmt = (md) => { const [m, d] = md.split('-'); return `${+d}.${m}`; };
    const opts = [['', `Авто по дате${auto ? ' (' + auto.name + ')' : ' (нет события)'}`], ['off', 'Выключить всё']]
      .concat(SE.EVENTS.map(e => [e.id, e.name]))
      .map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
    const rows = SE.EVENTS.map(e => `<div class="season-row ${auto && auto.id === e.id ? 'on' : ''}">
        <span class="season-name">${escapeHtml(e.name)}</span>
        <span class="season-dates">${fmt(e.from)} - ${fmt(e.to)}</span>
        <span class="season-desc">${escapeHtml(e.desc)}</span>
        <button class="btn-ghost season-try" data-season-try="${e.id}">Показать</button></div>`).join('');
    const dens = s.seasonDensity || 1;
    return `<h3>Дебаг</h3>
      <div class="field-hint" style="margin:0 0 14px">Проверка сезонных эффектов. По умолчанию эффект выбирается по текущей дате; здесь можно включить любой принудительно или подставить другую дату.</div>
      <div class="field"><label class="field-label">Сезонный эффект</label>
        <select id="dbg-season" class="select">${opts}</select></div>
      <div class="field"><label class="field-label">Симуляция даты</label>
        <div class="field-row">
          <input type="date" id="dbg-season-date" value="${escapeHtml(s.seasonDate || '')}">
          <button type="button" class="btn-ghost" id="dbg-season-date-clear" title="Сегодняшняя дата">×</button>
        </div></div>
      <div class="field"><label class="field-label">Плотность частиц</label>
        <div class="field-row">
          <input type="range" id="dbg-season-density" min="0.2" max="3" step="0.1" value="${dens}">
          <span class="range-val" id="dbg-season-density-val">×${(+dens).toFixed(1)}</span>
        </div></div>
      <div class="season-list">${rows}</div>
      <div class="toggle-row" style="margin-top:14px"><div><div class="tl">Режим бога в мини-играх</div>
        <div class="ts">Змейка, динозаврик, пинг-понг и «Уклонись в ритм» - проиграть нельзя. Рекорды и победы в этом режиме не сохраняются.</div></div>
        <div class="switch ${s.gameGodMode ? 'on' : ''}" id="dbg-god-switch"></div></div>
      <div class="field-row settings-data-actions" style="margin-top:12px">
        <button class="btn-secondary" id="dbg-sans-voice" title="Звук печати текста из финала «Уклонись в ритм»">Голос из мини-игры</button>
        <button class="btn-secondary" id="dbg-season-reset">${I.restart} Сбросить дебаг</button>
      </div>`;
  }
  function bindDebugCard() {
    const card = content.querySelector('#debug-card');
    if (!card) return;
    const update = (patch) => {
      saveSettings(patch);
      applySeasonal();
      card.innerHTML = debugCardHtml();
      bindDebugCard();
    };
    const sel = card.querySelector('#dbg-season');
    if (sel) sel.addEventListener('change', () => update({ seasonOverride: sel.value }));
    const date = card.querySelector('#dbg-season-date');
    if (date) date.addEventListener('change', () => update({ seasonDate: date.value }));
    const clr = card.querySelector('#dbg-season-date-clear');
    if (clr) clr.addEventListener('click', () => update({ seasonDate: '' }));
    const dens = card.querySelector('#dbg-season-density');
    if (dens) {
      dens.addEventListener('input', () => { card.querySelector('#dbg-season-density-val').textContent = '×' + (+dens.value).toFixed(1); });
      dens.addEventListener('change', () => { saveSettings({ seasonDensity: +dens.value }); applySeasonal(); });
    }
    card.querySelectorAll('[data-season-try]').forEach(b => b.addEventListener('click', () => {
      update({ seasonOverride: b.dataset.seasonTry });
      MglSeasonal.replay();   // розыгрыш 1 апреля - показать заново, даже если уже выбран
    }));
    const god = card.querySelector('#dbg-god-switch');
    if (god) god.addEventListener('click', async () => {
      const on = !(D.settings || {}).gameGodMode;
      if (on && !await confirmDialog({
        title: 'Режим бога',
        message: 'В мини-играх нельзя будет проиграть.\nРекорды и победы, набранные в этом режиме, не сохраняются.',
        okText: 'Включить'
      })) return;
      update({ gameGodMode: on });
      toast(on ? 'Режим бога включён - рекорды не сохраняются' : 'Режим бога выключен');
    });
    const voice = card.querySelector('#dbg-sans-voice');
    if (voice) voice.addEventListener('click', () => {
      const line = '* хе-хе. неплохой лаунчер, приятель.';
      HeroScenes.sansSay(line);
      toast(line);
    });
    const reset = card.querySelector('#dbg-season-reset');
    if (reset) reset.addEventListener('click', () => update({ seasonOverride: '', seasonDate: '', seasonDensity: 1, gameGodMode: false }));
  }

  // Скрытая карточка «Дебаг»: 5 быстрых кликов по «Magma Launcher» в шапке. При скрытии дебаг-настройки сбрасываются,
  // чтобы принудительный эффект не остался висеть без возможности его выключить.
  (function initDebugTap() {
    const brand = document.getElementById('breadcrumb-brand');
    if (!brand) return;
    let clicks = 0, timer = 0;
    brand.addEventListener('click', () => {
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 600);
      if (clicks < 5) return;
      clicks = 0;
      const on = !(D.settings || {}).debugMode;
      saveSettings(on ? { debugMode: true } : { debugMode: false, seasonOverride: '', seasonDate: '', seasonDensity: 1, gameGodMode: false });
      applySeasonal();
      toast(on ? 'Режим отладки включён - карточка «Дебаг» в настройках' : 'Режим отладки выключен');
      if (currentView === 'settings') {
        setView('settings');
        const card = on && content.querySelector('#debug-card');
        if (card) card.scrollIntoView({ block: 'center', behavior: uiPrefs().noAnimations ? 'auto' : 'smooth' });
      }
    });
  })();

  function statsCard() {
    const s = D.settings || {};
    const counts = s.launchCounts || {};
    let favFolder = null, favN = 0;
    Object.keys(counts).forEach(k => { if (counts[k] > favN) { favN = counts[k]; favFolder = k; } });
    const favInst = (D.instances || []).find(i => i.folder === favFolder);
    const favVersion = favInst ? favInst.ver : (favFolder || '-');
    const favLoader = favInst ? favInst.loaderName : '-';
    const favBuild = favFolder || '-';
    const hist = s.serverHistory || [];
    const favServer = hist.length ? (hist[0].name || hist[0].ip) : '-';
    const secs = s.playtimeSeconds != null ? s.playtimeSeconds : (s.playtimeMinutes || 0) * 60;
    const playtime = formatPlaytime(secs);

    const item = (label, value) => `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${escapeHtml(String(value))}</div></div>`;
    return `
      <div class="settings-card">
        <h3>Статистика</h3>
        <div class="stats-grid">
          ${item('Любимая версия', favVersion)}
          ${item('Любимый модлоадер', favLoader)}
          ${item('Время в Minecraft', playtime)}
          ${item('Любимая сборка', favBuild)}
          ${item('Любимый сервер', favServer)}
          ${item('Всего запусков', Object.values(counts).reduce((a, b) => a + b, 0) || 0)}
        </div>
      </div>`;
  }

  function verTypeToggle(key, label, s) {
    const vt = s.versionTypes || { release: true };
    const on = !!vt[key];
    return `<div class="toggle-row">
      <div><div class="tl">${label}</div></div>
      <div class="switch ${on ? 'on' : ''}" data-vertype="${key}"></div>
    </div>`;
  }
  function tabRow(labels, scope) {
    return `<div class="tab-row" data-tabscope="${scope}">` +
      labels.map((l, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${['mods', 'textures', 'shaders', 'modpacks'][i]}">${l}</button>`).join('') +
      `</div>`;
  }

  function setLaunchProgress(p, status) {
    const prog = document.getElementById('launch-progress');
    if (prog) prog.classList.remove('hidden');
    const fill = document.getElementById('lp-fill');
    const st = document.getElementById('lp-status');
    if (fill) fill.style.width = Math.max(0, Math.min(100, p)) + '%';
    if (st) st.textContent = status || '';
  }

  function doLaunch(folder, username, extra) {
    const ipc = getIpc();
    if (!folder) { toast('Выберите версию'); return; }
    if (!ipc) { toast('Запуск доступен в приложении (Electron)'); return; }
    const user = username || (document.getElementById('launch-user') || {}).value || (D.settings && D.settings.username) || 'Player';
    const mem = (D.settings && D.settings.memoryMax) || 2048;
    setLaunchProgress(5, 'Подготовка…');
    const btn = document.getElementById('launch-btn');
    if (btn) btn.disabled = true;
    ipc.invoke('mc:launch', { folder, username: user, memoryMax: mem, quickPlay: extra && extra.quickPlay });
  }

  function initLaunchSection() {
    const map = installedMap();
    const pick = document.getElementById('launch-version-pick');
    const lSel = document.getElementById('launch-loader');
    const btn = document.getElementById('launch-btn');
    if (!pick) return;

    const availableLoadersFor = (mc) => {
      const list = ['vanilla'];
      if (!mc) return list;
      if (cmpVer(mc, '1.1') >= 0) list.push('forge');
      if (cmpVer(mc, '1.14') >= 0) { list.push('fabric'); list.push('quilt'); }
      if (cmpVer(mc, '1.20.1') >= 0) list.push('neoforge');
      return list;
    };
    const syncLoaders = async (mc) => {
      let loaders = availableLoadersFor(mc);
      const ipc = getIpc();
      if (ipc) {
        try {
          const srv = await ipc.invoke('mc:getModloaders', mc);
          if (Array.isArray(srv) && srv.length) loaders = srv;
        } catch (e) {}
      }
      const installedForMc = map[mc] || {};
      lSel.innerHTML = loaders.map(l =>
        `<option value="${l}">${LOADER[l] || l}${installedForMc[l] ? '' : ' · не установлен'}</option>`
      ).join('');
      lSel.disabled = false;
      const last = lastPlayed();
      if (last && mc === last.mc && loaders.includes(last.loader)) lSel.value = last.loader;
      else if (installedForMc.vanilla) lSel.value = 'vanilla';
    };
    syncLoaders(pick.dataset.value);

    pick.addEventListener('click', () => openVersionPicker(pick.dataset.value, (chosen) => {
      pick.dataset.value = chosen;
      pick.querySelector('.vp-label').textContent = chosen;
      syncLoaders(chosen);
    }));

    const userInput = document.getElementById('launch-user');
    if (userInput) userInput.addEventListener('change', () => saveSettings({ username: userInput.value }));

    if (btn) btn.addEventListener('click', async () => {
      const mc = pick.dataset.value, loader = lSel.value || 'vanilla';
      const map2 = installedMap();
      let folder = (map2[mc] || {})[loader];
      if (!folder) {
        if (loader !== 'vanilla') {
          offerModloaderInstaller(mc, loader);
          return;
        }
        const confirmed = await confirmDialog({ title: 'Версия не установлена', message: `Версия ${mc} не установлена.\n\nСкачать и установить сейчас?\n(client.jar, библиотеки, нативы, ассеты)`, okText: 'Установить' });
        if (!confirmed) return;
        const ipc = getIpc();
        if (!ipc) { toast('Доступно только в приложении'); return; }
        btn.disabled = true;
        const prog = document.getElementById('install-progress');
        if (prog) prog.classList.remove('hidden');
        Downloads.start('mc:' + mc, 'mc', 'Minecraft ' + mc);
        const onProg = (e, d) => {
          if (d.id !== mc) return;
          const fill = document.getElementById('ip-fill'), st = document.getElementById('ip-status');
          if (fill && fill.isConnected) fill.style.width = (d.progress || 0) + '%';
          if (st && st.isConnected) st.textContent = d.status || '';
        };
        ipc.on('mc:installProgress', onProg);
        const r = await ipc.invoke('mc:installVersion', mc);
        ipc.removeListener('mc:installProgress', onProg);
        if (btn.isConnected) btn.disabled = false;
        if (!r || !r.ok) {
          Downloads.finish('mc:' + mc, { ok: false, error: (r && r.error) || 'ошибка' });
          toast(r && r.cancelled ? 'Установка отменена' : 'Не удалось установить: ' + (r && r.error || ''));
          return;
        }
        Downloads.finish('mc:' + mc, { ok: true });
        // перечитать установленные
        D.instances = await ipc.invoke('mc:getInstalled');
        normalize();
        folder = mc;
        renderInstances();
        toast('Установлено: ' + mc);
      }
      doLaunch(folder, userInput ? userInput.value : undefined);
    });
  }

  async function offerModloaderInstaller(mc, loader) {
    const ipc = getIpc();
    const name = LOADER[loader] || loader;
    if (!ipc) { toast('Доступно только в приложении'); return; }

    showModal({
      title: `Установить ${name} для ${mc}`,
      bodyHtml: `
        <div class="field-hint" style="line-height:1.6">
          Будет установлен <b>${escapeHtml(name)}</b> для Minecraft <b>${escapeHtml(mc)}</b>.
          ${loader === 'forge' || loader === 'neoforge'
            ? 'Загрузится официальный installer-jar и запустится через Java (может потребоваться автозагрузка Java).'
            : 'Профиль и библиотеки загрузятся напрямую с мета-API.'}
        </div>
        <div class="field" style="margin-top:12px">
          <label class="field-label">Версия ${name}</label>
          <select id="ml-ver-select" class="select"><option value="">Загрузка…</option></select>
        </div>
        <div id="ml-progress" class="hidden launch-progress">
          <div class="lp-bar"><div class="lp-fill" id="ml-fill"></div></div>
          <div class="lp-status" id="ml-status">Готов</div>
        </div>`,
      okText: 'Установить',
      onOk: async (modal) => {
        const sel = modal.querySelector('#ml-ver-select');
        const loaderVersion = sel && sel.value;
        if (!loaderVersion) { toast('Выберите версию'); return false; }
        const prog = modal.querySelector('#ml-progress');
        const fill = modal.querySelector('#ml-fill');
        const st = modal.querySelector('#ml-status');
        if (prog) prog.classList.remove('hidden');

        const taskId = 'ml:' + loader + ':' + mc;
        Downloads.start(taskId, 'ml', `${name} ${loaderVersion} для ${mc}`);

        const onProg = (e, d) => {
          if (d.loader !== loader || d.mcVersion !== mc) return;
          if (fill && fill.isConnected) fill.style.width = (d.progress || 0) + '%';
          if (st && st.isConnected) st.textContent = d.status || '';
        };
        const onJava = (e, d) => {
          if (fill && fill.isConnected) fill.style.width = (d.progress || 0) + '%';
          if (st && st.isConnected) st.textContent = 'Java: ' + (d.status || '');
        };
        ipc.on('ml:installProgress', onProg);
        ipc.on('java:installProgress', onJava);
        ipc.invoke('ml:install', { loader, mcVersion: mc, loaderVersion }).then(async (r) => {
          ipc.removeListener('ml:installProgress', onProg);
          ipc.removeListener('java:installProgress', onJava);
          if (!r || !r.ok) {
            Downloads.finish(taskId, { ok: false, error: (r && r.error) || 'ошибка' });
            toast(r && r.cancelled ? `Установка ${name} отменена` : 'Не удалось установить: ' + (r && r.error || ''));
            return;
          }
          Downloads.finish(taskId, { ok: true });
          D.instances = await ipc.invoke('mc:getInstalled');
          normalize();
          renderInstances();
          toast(`${name} установлен для ${mc}`);
        }).catch(err => {
          ipc.removeListener('ml:installProgress', onProg);
          ipc.removeListener('java:installProgress', onJava);
          Downloads.finish(taskId, { ok: false, error: err.message });
          toast('Ошибка: ' + err.message);
        });
        return true;
      }
    });

    try {
      const r = await ipc.invoke('ml:getLoaderVersions', { loader, mcVersion: mc });
      const sel = document.querySelector('#app-modal #ml-ver-select');
      if (!sel) return;
      if (!r || !r.ok || !r.versions || !r.versions.length) {
        sel.innerHTML = '<option value="">Версии не найдены</option>';
        return;
      }
      const opts = r.versions.map(v => {
        if (typeof v === 'string') return `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
        return `<option value="${escapeHtml(v.version)}">${escapeHtml(v.version)}${v.tag ? ' · ' + v.tag : ''}</option>`;
      });
      sel.innerHTML = opts.join('');
    } catch (e) {
      const sel = document.querySelector('#app-modal #ml-ver-select');
      if (sel) sel.innerHTML = '<option value="">Ошибка загрузки списка</option>';
    }
  }

  let _versionsCache = null;
  const _demoVersions = [
    { id: '1.21.1', type: 'release' }, { id: '1.20.4', type: 'release' },
    { id: '1.19.4', type: 'release' }, { id: '1.18.2', type: 'release' },
    { id: '1.16.5', type: 'release' }, { id: '1.12.2', type: 'release' },
    { id: '1.8.9', type: 'release' }, { id: '24w40a', type: 'snapshot' },
    { id: 'b1.7.3', type: 'old_beta' }, { id: 'a1.0.4', type: 'old_alpha' }
  ];
  function effectiveVersionTypes() {
    const vt = (D.settings && D.settings.versionTypes) || {};
    const anyOn = Object.values(vt).some(Boolean);
    return anyOn ? vt : { release: true, snapshot: false, old_beta: false, old_alpha: false };
  }
  async function openVersionPicker(currentValue, onPick) {
    const ipc = getIpc();
    showModal({
      title: 'Выбор версии Minecraft',
      bodyHtml: `
        <div class="field">
          <input type="text" id="vp-search" placeholder="Поиск версии…" autofocus>
        </div>
        <div class="vp-list" id="vp-list"><div class="vp-empty">Загрузка списка версий…</div></div>`,
      okText: 'Выбрать',
      onOk: (modal) => {
        const sel = modal.querySelector('.vp-row.active');
        if (!sel) { toast('Выберите версию'); return false; }
        onPick(sel.dataset.id);
        return true;
      }
    });
    const modalBody = document.querySelector('#app-modal .modal-body');
    if (modalBody) modalBody.style.maxHeight = '70vh';

    let versions = _versionsCache;
    if (!versions || !versions.length) {
      if (ipc) {
        try {
          versions = await ipc.invoke('mc:getAllVersions');
        } catch (e) { versions = []; }
        if (versions && versions.length) _versionsCache = versions;
      }
      if (!versions || !versions.length) versions = _demoVersions.slice();
    }

    const installed = new Set((D.instances || []).map(i => i.folder));
    const list = document.getElementById('vp-list');
    const search = document.getElementById('vp-search');
    if (!list || !search) return; // модалку могли закрыть пока ждали

    const render = () => {
      const q = (search.value || '').trim().toLowerCase();
      const vt = effectiveVersionTypes();
      const filtered = versions.filter(v => {
        if (!vt[v.type]) return false;
        if (q && !v.id.toLowerCase().includes(q)) return false;
        return true;
      });
      const anyFilterOn = Object.values(vt).some(Boolean);
      list.innerHTML = filtered.length
        ? filtered.map(v => `
          <div class="vp-row ${v.id === currentValue ? 'active' : ''}" data-id="${escapeHtml(v.id)}">
            <span class="vp-id">${escapeHtml(v.id)}</span>
            <span class="vp-type vp-type-${v.type}">${v.type}</span>
            ${installed.has(v.id) ? '<span class="vp-installed">установлено</span>' : ''}
          </div>`).join('')
        : `<div class="vp-empty">Ничего не найдено. ${anyFilterOn ? 'Попробуйте изменить поиск.' : 'Включите типы версий в Настройках.'}</div>`;
      list.querySelectorAll('.vp-row').forEach(row => {
        row.addEventListener('click', () => {
          list.querySelectorAll('.vp-row').forEach(r => r.classList.remove('active'));
          row.classList.add('active');
        });
        row.addEventListener('dblclick', () => {
          onPick(row.dataset.id);
          const close = document.querySelector('#app-modal .modal-close');
          if (close) close.click();
        });
      });
    };
    search.addEventListener('input', render);
    render();
  }

  function initHeroServers() {
    const btn = document.getElementById('hero-servers-btn');
    const pop = document.getElementById('srv-pop');
    if (!btn || !pop) return;
    const seen = new Set();
    const list = [].concat((D.settings && D.settings.serverHistory) || [], D.customServers || [], D.servers || [])
      .filter(s => s && s.ip && !seen.has(normIp(s.ip)) && seen.add(normIp(s.ip)))
      .slice(0, 5);
    pop.innerHTML = `<div class="srv-pop-title">Недавние серверы · клик - быстрый вход</div>` + (list.length
      ? list.map(s => `
        <div class="srv-pop-row" data-ip="${escapeHtml(s.ip)}" data-name="${escapeHtml(s.name || s.ip)}">
          <img src="${artFor((s.name || '') + (s.ip || ''))}" alt="" data-ping-icon>
          <div class="srv-pop-meta"><div class="srv-pop-name">${escapeHtml(s.name || s.ip)}</div>
            <div class="srv-pop-ip">${escapeHtml(s.ip)}</div></div>
          <span class="ping-badge" data-ping-badge><i class="ping-dot"></i><span>…</span></span>
        </div>`).join('')
      : `<div class="srv-pop-empty">Вы ещё не играли на серверах</div>`);
    pop.querySelectorAll('.srv-pop-row').forEach(row =>
      pingAddr(row.dataset.ip).then(res => { if (row.isConnected) applyPingToRow(row, res); }));

    const closeOnce = () => { pop.classList.add('hidden'); document.removeEventListener('click', closeOnce); };
    btn.onclick = (e) => {
      e.stopPropagation();
      const heroEl = btn.closest('.hero');
      if (heroEl && heroEl.classList.contains('game')) { setHeroGame(heroEl, false); return; }
      const willOpen = pop.classList.contains('hidden');
      pop.classList.toggle('hidden');
      if (willOpen) setTimeout(() => document.addEventListener('click', closeOnce), 0);
      else document.removeEventListener('click', closeOnce);
    };
    pop.onclick = e => e.stopPropagation();
    pop.querySelectorAll('.srv-pop-row').forEach(r =>
      r.addEventListener('click', () => { pop.classList.add('hidden'); quickJoin(r.dataset.ip, r.dataset.name); }));
  }

  const HERO_ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M8 7h9v9"></path></svg>';
  const HERO_ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function setHeroGame(hero, on) {
    if (!hero || hero.classList.contains('game') === on) return;
    hero.classList.toggle('game', on);
    const btn = hero.querySelector('#hero-servers-btn'), pop = hero.querySelector('#srv-pop');
    if (pop) pop.classList.add('hidden');
    if (btn) { btn.innerHTML = on ? HERO_ICON_CLOSE : HERO_ICON_ARROW; btn.title = on ? 'Закрыть игру' : 'Недавние серверы'; }
    if (on) {
      // у градиента/визуализатора своего канваса сцен нет - создаём временный под игру
      const kind = heroGameKind(hero);
      if (!hero.querySelector('.hero-scene')) {
        const cv = document.createElement('canvas');
        cv.className = 'hero-scene hero-game-cv'; cv.dataset.scene = kind;
        hero.querySelector('.hero-noise').before(cv);
        HeroScenes.attach(cv, kind);
      }
      HeroScenes.startGame(kind);
    } else {
      HeroScenes.stopGame();
      const cv = hero.querySelector('.hero-game-cv');
      if (cv) cv.remove();
    }
  }
  // фон hero → его мини-игра
  const HERO_GAMES = { snake: 'snake', land: 'dino', dots: 'paint', luni: 'lunigame', viz: 'dodge', anim: 'pong' };
  function heroGameKind(hero) {
    const sc = hero.querySelector('.hero-scene');
    return HERO_GAMES[sc ? sc.dataset.scene : hero.classList.contains('viz-mode') ? 'viz' : 'anim'];
  }
  function initHeroGame() {
    const hero = content.querySelector('.hero');
    if (!hero) return;
    HeroScenes.onExit = () => { const h = content.querySelector('.hero.game'); if (h) setHeroGame(h, false); };
    let clicks = [];
    hero.addEventListener('click', (e) => {
      if (e.target.closest('button, .srv-pop') || hero.classList.contains('game')) return;
      const now = Date.now();
      clicks = clicks.filter(t => now - t < 1500); clicks.push(now);
      if (clicks.length >= 5) { clicks = []; setHeroGame(hero, true); }
    });
  }

  let skinViewer = null, currentSkinUrl = null, currentCapeUrl = null, currentSkinFile = null;
  function disposeViewer() { if (skinViewer) { try { skinViewer.dispose(); } catch (e) {} skinViewer = null; } }
  const SKIN_MODEL_NAME = { classic: 'Classic (Steve)', slim: 'Slim (Alex)' };
  function currentSkinModel() { return currentSkinFile && window.SkinStore ? SkinStore.getModel(currentSkinFile) : 'auto'; }
  function syncSkinModelUi(detected) {
    const tabs = document.getElementById('skin-model-tabs'), hint = document.getElementById('skin-model-hint');
    if (!tabs) return;
    const m = currentSkinModel();
    tabs.querySelectorAll('[data-skin-model]').forEach(b => b.classList.toggle('active', b.dataset.skinModel === m));
    tabs.classList.toggle('disabled', !currentSkinFile);
    if (!hint) return;
    if (!currentSkinFile) { hint.textContent = ''; return; }
    if (m !== 'auto') { hint.textContent = 'В игре: ' + SKIN_MODEL_NAME[m]; return; }
    const d = detected || SkinStore.effectiveModel(currentSkinFile);
    hint.textContent = 'Определено автоматически: ' + (SKIN_MODEL_NAME[d] || SKIN_MODEL_NAME.classic);
  }
  function bindSkinModelTabs() {
    const tabs = document.getElementById('skin-model-tabs');
    if (!tabs) return;
    tabs.querySelectorAll('[data-skin-model]').forEach(b => b.addEventListener('click', () => {
      if (!currentSkinFile) return;
      SkinStore.setModel(currentSkinFile, b.dataset.skinModel);
      const card = document.querySelector(`#skin-grid .skin-card[data-skin="${CSS.escape(currentSkinFile)}"]`);
      if (card) card.classList.toggle('slim', b.dataset.skinModel === 'slim');
      renderModel();
    }));
  }

  function renderModel() {
    const canvas = document.getElementById('skin-canvas');
    const stage = document.getElementById('skin-stage');
    if (!canvas || !stage || !currentSkinUrl) return;
    if (typeof window.skinview3d === 'undefined') {
      stage.innerHTML = `<img src="${currentSkinUrl}" style="width:96px;image-rendering:pixelated">`; return;
    }
    const w = stage.clientWidth || 180, h = stage.clientHeight || 240;
    const m = currentSkinModel(), file = currentSkinFile;
    const model = m === 'slim' ? 'slim' : m === 'classic' ? 'default' : 'auto-detect';
    try {
      if (!skinViewer) {
        skinViewer = new skinview3d.SkinViewer({ canvas, width: w, height: h });
        skinViewer.animation = new skinview3d.WalkingAnimation();
        skinViewer.animation.speed = 0.6; skinViewer.zoom = 0.85;
        skinViewer.controls.enableZoom = true;
        if (skinViewer.camera) skinViewer.camera.position.z = 55;
      } else skinViewer.setSize(w, h);
      const viewer = skinViewer;
      Promise.resolve(viewer.loadSkin(currentSkinUrl, { model })).then(() => {
        if (viewer !== skinViewer || file !== currentSkinFile) return;
        let det = null;
        try { det = viewer.playerObject.skin.modelType === 'slim' ? 'slim' : 'classic'; } catch (e) {}
        // авто-определение запоминаем - по нему main выбирает модель для MGL S&C при запуске
        if (det && m === 'auto' && file && window.SkinStore) SkinStore.setDetected(file, det);
        syncSkinModelUi(m === 'auto' ? det : null);
      }).catch(() => syncSkinModelUi());
      if (currentCapeUrl) {
        const p = skinViewer.loadCape(currentCapeUrl);
        if (p && p.catch) p.catch(err => {
          console.warn('cape load failed', err);
          currentCapeUrl = null;
          try { skinViewer.loadCape(null); } catch (e) {}
          toast('Не удалось загрузить плащ (нужен размер 64×32)');
        });
      } else {
        try { const r = skinViewer.loadCape(null); if (r && r.catch) r.catch(() => {}); }
        catch (e) { try { skinViewer.playerObject.cape.visible = false; skinViewer.playerObject.elytra.visible = false; } catch (e2) {} }
      }
    } catch (e) { stage.innerHTML = `<img src="${currentSkinUrl}" style="width:96px;image-rendering:pixelated">`; }
  }

  function refreshSkinGrid() {
    const grid = document.getElementById('skin-grid');
    if (!grid) return;
    const skins = window.SkinStore ? SkinStore.list() : [];
    grid.innerHTML = skins.map(s => skinCardHtml(s, 'skin')).join('') + `
      <div class="skin-card add-skin" id="skin-add-card">${I.plus}<div class="skin-card-name" style="margin-top:8px">Добавить</div></div>`;
    const active = skins.find(s => s.active) || skins[0];
    const nameEl = document.getElementById('skin-active-name');
    if (active) { if (nameEl) nameEl.textContent = active.name; currentSkinUrl = active.url; currentSkinFile = active.file; renderModel(); }
    else { currentSkinFile = null; if (nameEl) nameEl.textContent = 'Нет скинов'; syncSkinModelUi(); }
    updateAvatars();
    grid.querySelectorAll('.skin-card[data-skin]').forEach(card =>
      card.addEventListener('click', () => {
        grid.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        document.getElementById('skin-active-name').textContent = card.querySelector('.skin-card-name').textContent;
        currentSkinUrl = card.dataset.url; currentSkinFile = card.dataset.skin; renderModel();
      }));
    const addCard = grid.querySelector('#skin-add-card');
    addCard.addEventListener('click', (e) => {
      e.stopPropagation();
      const r = addCard.getBoundingClientRect();
      showSkinAddMenu(r.left, r.bottom + 4);
    });
    bindSkinCardMenus(grid, 'skin');
  }

  let _skinAddBound = false;
  function showSkinAddMenu(x, y) {
    const menu = document.getElementById('skin-add-menu');
    if (!menu) { document.getElementById('skin-file').click(); return; }
    hideSkinMenu();
    menu.classList.remove('hidden');
    menu.style.visibility = 'hidden';
    menu.style.left = '0px'; menu.style.top = '0px';
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x)) + 'px';
    menu.style.top = Math.min(window.innerHeight - h - 8, y) + 'px';
    menu.style.visibility = '';
    if (_skinAddBound) return;
    _skinAddBound = true;
    const hide = () => menu.classList.add('hidden');
    menu.querySelectorAll('[data-addmode]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      hide();
      const mode = btn.dataset.addmode;
      if (mode === 'png') document.getElementById('skin-file').click();
      else showSkinFetchModal(mode);
    }));
    document.addEventListener('click', hide);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, true);
  }

  async function fetchSkinPng(mode, value) {
    const ipc = getIpc();
    if (ipc) return ipc.invoke('skin:fetch', { mode, value });
    const url = mode === 'nick' ? 'https://mc-heads.net/skin/' + encodeURIComponent(value) : value;
    try {
      const r = await fetch(url);
      if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
      const ab = await r.arrayBuffer();
      let bin = ''; const u = new Uint8Array(ab);
      for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
      const name = mode === 'nick' ? value : (url.split(/[?#]/)[0].split('/').pop() || 'skin').replace(/\.png$/i, '');
      return { ok: true, data: btoa(bin), name };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  function showSkinFetchModal(mode) {
    const nick = mode === 'nick';
    showModal({
      title: nick ? 'Скин по никнейму' : 'Скин по ссылке',
      bodyHtml: `<div class="field"><label class="field-label">${nick ? 'Ник игрока (лицензия)' : 'Ссылка на PNG'}</label>
        <input type="text" id="skin-fetch-val" ${nick ? 'maxlength="16" placeholder="Notch"' : 'placeholder="https://…/skin.png"'}></div>`,
      okText: 'Добавить',
      onOk: async (modal, api) => {
        const input = modal.querySelector('#skin-fetch-val');
        const value = input.value.trim();
        if (!value) { input.focus(); return false; }
        api.disable();
        const res = await fetchSkinPng(mode, value);
        api.enable();
        if (!res || !res.ok) { toast('Ошибка: ' + ((res && res.error) || 'не удалось скачать')); return false; }
        try {
          const { entry, width, height } = await SkinStore.addFromBase64(res.data, res.name);
          const ok = (width === 64 && (height === 64 || height === 32));
          SkinStore.setActive(entry.file); refreshSkinGrid();
          toast(ok ? `Скин «${entry.name}» сохранён` : `Скин сохранён (размер ${width}×${height}, ожидается 64×64)`);
        } catch (e) { toast('Ошибка: ' + e.message); return false; }
        return true;
      }
    });
    setTimeout(() => {
      const i = document.querySelector('#skin-fetch-val');
      if (!i) return;
      i.focus();
      i.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.querySelector('#app-modal .modal-ok').click(); });
    }, 30);
  }
  function skinCardHtml(s, kind) {
    const pin = s.pinned ? `<span class="skin-card-pin" title="Закреплено"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7h7l-5.5 4.5L17 21l-5-3-5 3 1.5-7.5L3 9h7z"/></svg></span>` : '';
    return `
      <div class="skin-card ${s.active ? 'active' : ''} ${kind === 'skin' && s.model === 'slim' ? 'slim' : ''}" data-${kind}="${escapeHtml(s.file)}" data-url="${escapeHtml(s.url)}">
        ${pin}<button class="skin-card-more" data-more title="Ещё">${I.dots}</button>${kind === 'skin' ? '<span class="skin-card-slim" title="Модель Slim (Alex)">Slim</span>' : ''}
        <img src="${escapeHtml(s.url)}" alt=""><div class="skin-card-name">${escapeHtml(s.name)}</div></div>`;
  }
  function bindSkinCardMenus(grid, kind) {
    grid.querySelectorAll(`.skin-card[data-${kind}] [data-more]`).forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = btn.getBoundingClientRect();
        showSkinMenu(kind, btn.closest('.skin-card').dataset[kind], r.right, r.bottom + 4);
      }));
  }
  let _skinMenuCtx = null, _skinMenuBound = false;
  function showSkinMenu(kind, file, x, y) {
    const menu = document.getElementById('skin-menu');
    const store = kind === 'cape' ? window.CapeStore : window.SkinStore;
    const item = store && store.list().find(s => s.file === file);
    if (!menu || !item) return;
    hideInstMenu();
    _skinMenuCtx = { kind, item };
    menu.querySelector('[data-spin-label]').textContent = item.pinned ? 'Открепить' : 'Закрепить';
    menu.classList.remove('hidden');
    menu.style.visibility = 'hidden';
    menu.style.left = '0px'; menu.style.top = '0px';
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w)) + 'px';
    menu.style.top = Math.min(window.innerHeight - h - 8, y) + 'px';
    menu.style.visibility = '';
    if (_skinMenuBound) return;
    _skinMenuBound = true;
    menu.querySelectorAll('[data-sact]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ctx = _skinMenuCtx;
      hideSkinMenu();
      if (ctx) skinMenuAction(btn.dataset.sact, ctx.kind, ctx.item);
    }));
    document.addEventListener('click', hideSkinMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSkinMenu(); });
    window.addEventListener('resize', hideSkinMenu);
    window.addEventListener('scroll', hideSkinMenu, true);
  }
  function hideSkinMenu() {
    const menu = document.getElementById('skin-menu');
    if (menu) menu.classList.add('hidden');
    _skinMenuCtx = null;
  }
  async function skinMenuAction(act, kind, item) {
    const store = kind === 'cape' ? CapeStore : SkinStore;
    const what = kind === 'cape' ? 'плащ' : 'скин';
    const refresh = () => kind === 'cape' ? refreshCapeGrid() : refreshSkinGrid();
    if (act === 'pin') {
      const on = store.togglePin(item.file);
      refresh();
      toast(on ? `Закреплено: ${item.name}` : `Откреплено: ${item.name}`);
    } else if (act === 'delete') {
      if (!await confirmDialog({ title: kind === 'cape' ? 'Удалить плащ' : 'Удалить скин', message: `Удалить ${what} «${item.name}»? Файл будет удалён с диска.`, okText: 'Удалить', danger: true })) return;
      store.remove(item.file);
      if (kind === 'skin' && !store.getActive()) { const first = store.list()[0]; if (first) store.setActive(first.file); }
      refresh();
      toast(`Удалено: ${item.name}`);
    } else if (act === 'rename') {
      showModal({
        title: kind === 'cape' ? 'Переименовать плащ' : 'Переименовать скин',
        bodyHtml: `<div class="field"><label class="field-label">Имя</label>
          <input type="text" id="skin-rn-name" value="${escapeHtml(item.name)}" maxlength="48"></div>`,
        okText: 'Сохранить',
        onOk: (modal) => {
          const name = modal.querySelector('#skin-rn-name').value.trim();
          if (!name || name === item.name) return true;
          try { store.rename(item.file, name); } catch (e) { toast('Ошибка: ' + e.message); return false; }
          refresh();
          toast('Переименовано: ' + name);
          return true;
        }
      });
      setTimeout(() => { const i = document.querySelector('#skin-rn-name'); if (i) { i.focus(); i.select(); } }, 30);
    }
  }

  function refreshCapeGrid() {
    const grid = document.getElementById('cape-grid');
    if (!grid) return;
    const capes = window.CapeStore ? CapeStore.list() : [];
    const noneActive = !capes.some(c => c.active);
    grid.innerHTML =
      `<div class="skin-card cape-none ${noneActive ? 'active' : ''}" data-cape="none">${I.stop}<div class="skin-card-name" style="margin-top:8px">Без плаща</div></div>` +
      capes.map(c => skinCardHtml(c, 'cape')).join('') + `
      <div class="skin-card add-skin" id="cape-add-card">${I.plus}<div class="skin-card-name" style="margin-top:8px">Загрузить</div></div>`;

    const active = capes.find(c => c.active);
    currentCapeUrl = active ? active.url : null;
    renderModel();

    grid.querySelectorAll('.skin-card[data-cape]').forEach(card =>
      card.addEventListener('click', () => {
        const f = card.dataset.cape;
        grid.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (f === 'none') { CapeStore.setActive(null); currentCapeUrl = null; }
        else { CapeStore.setActive(f); currentCapeUrl = card.dataset.url; }
        renderModel();
      }));
    grid.querySelector('#cape-add-card').addEventListener('click', () => document.getElementById('cape-file').click());
    bindSkinCardMenus(grid, 'cape');
  }

  async function initSkins() {
    const hint = document.getElementById('skin-folder-hint');
    if (hint) hint.textContent = SkinStore.isReal ? 'Папка: ' + SkinStore.folder() : SkinStore.folder();
    await SkinStore.ensureDefaultSkin();
    bindSkinModelTabs();
    refreshSkinGrid();
    refreshCapeGrid();

    const skinInput = document.getElementById('skin-file');
    skinInput.addEventListener('change', async () => {
      const file = skinInput.files[0]; skinInput.value = '';
      if (!file) return;
      try {
        const { entry, width, height } = await SkinStore.addFromFile(file);
        const ok = (width === 64 && (height === 64 || height === 32));
        SkinStore.setActive(entry.file); refreshSkinGrid();
        toast(ok ? `Скин «${entry.name}» сохранён` : `Скин сохранён (размер ${width}×${height}, ожидается 64×64)`);
      } catch (e) { toast('Ошибка: ' + e.message); }
    });
    const capeInput = document.getElementById('cape-file');
    capeInput.addEventListener('change', async () => {
      const file = capeInput.files[0]; capeInput.value = '';
      if (!file) return;
      try {
        const { entry, width, height } = await CapeStore.addFromFile(file);
        const ok = (width === 64 && height === 32) || (width / height === 2);
        CapeStore.setActive(entry.file); refreshCapeGrid();
        toast(ok ? `Плащ «${entry.name}» сохранён` : `Плащ сохранён (размер ${width}×${height}, обычно 64×32)`);
      } catch (e) { toast('Ошибка: ' + e.message); }
    });

    document.getElementById('skin-upload-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      showSkinAddMenu(r.left, r.bottom + 4);
    });
    document.getElementById('skin-apply-btn').addEventListener('click', () => {
      const sel = document.querySelector('#skin-grid .skin-card.active[data-skin]');
      if (!sel) { toast('Сначала выберите скин'); return; }
      SkinStore.setActive(sel.dataset.skin); refreshSkinGrid(); toast('Скин применён');
    });
  }

  const _serverStates = {};   // UI: раскрыта ли панель
  function serverState(id) { return _serverStates[id] || (_serverStates[id] = { open: false }); }
  const _srvRt = {};          // id -> { state, startedAt, port, pid }
  function srvRuntime(id) { return _srvRt[id] || (_srvRt[id] = { state: 'stopped' }); }
  const _srvLogs = {};
  const _srvLogLoaded = {};
  const SRV_LOG_UI_MAX = 800;
  const _cmdHistory = {};
  function normIp(ip) { return String(ip || '').trim().toLowerCase().replace(/:25565$/, ''); }
  function managedAddress(id) {
    const rt = srvRuntime(id);
    return `${rt.serverIp || rt.lanIp || 'localhost'}:${rt.port || 25565}`;
  }
  async function copyText(text, label) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {}
    if (!ok) {
      try { window.require('electron').clipboard.writeText(text); ok = true; } catch (e) {}
    }
    toast(ok ? `${label || 'Скопировано'}: ${text}` : 'Не удалось скопировать');
  }

  function fmtClock(t) { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
  function srvLineClass(l) {
    if (l.stream === 'cmd') return 'cmd';
    if (l.stream === 'system') return 'sys';
    if (/\b(ERROR|SEVERE|FATAL)\b|Exception/.test(l.line)) return 'err';
    if (l.stream === 'stderr' || /\bWARN(ING)?\b/.test(l.line)) return 'warn';
    if (/Done \(\d/.test(l.line)) return 'ok';
    return '';
  }
  function srvLineHtml(l) { return `<div class="log-line ${srvLineClass(l)}"><span class="log-t">${fmtClock(l.t)}</span>${escapeHtml(l.line)}</div>`; }
  function managedItemEl(id) { return content.querySelector(`.server-item[data-server="${CSS.escape(id)}"]`); }
  async function renderConsole(id) {
    const item = managedItemEl(id);
    const con = item && item.querySelector('[data-console]');
    if (!con) return;
    const ipc = getIpc();
    if (ipc && !_srvLogLoaded[id]) { _srvLogs[id] = (await ipc.invoke('srv:getLog', id)) || []; _srvLogLoaded[id] = true; }
    const logs = _srvLogs[id] || [];
    con.innerHTML = logs.length
      ? logs.map(srvLineHtml).join('')
      : `<div class="log-line sys" data-placeholder>${ipc ? 'Сервер не запущен. Нажмите ▶, чтобы запустить.' : 'Консоль сервера доступна в приложении.'}</div>`;
    con.scrollTop = con.scrollHeight;
  }
  function onSrvLog(d) {
    const list = _srvLogs[d.id] || (_srvLogs[d.id] = []);
    list.push(d);
    if (list.length > SRV_LOG_UI_MAX) list.splice(0, list.length - SRV_LOG_UI_MAX);
    if (/ (joined|left) the game|lost connection: /.test(d.line)) {
      clearTimeout(srvRuntime(d.id)._plTimer);
      srvRuntime(d.id)._plTimer = setTimeout(() => pingManagedPlayers(d.id), 400);
    }
    const item = managedItemEl(d.id);
    const con = item && serverState(d.id).open && item.querySelector('[data-console]');
    if (!con) return;
    const stick = con.scrollHeight - con.scrollTop - con.clientHeight < 40;
    const ph = con.querySelector('[data-placeholder]');
    if (ph) ph.remove();
    con.insertAdjacentHTML('beforeend', srvLineHtml(d));
    while (con.childElementCount > SRV_LOG_UI_MAX) con.firstElementChild.remove();
    if (stick) con.scrollTop = con.scrollHeight;
  }
  function onSrvState(d) {
    const rt = srvRuntime(d.id);
    const prev = rt.state;
    rt.state = d.state;
    if (d.startedAt) rt.startedAt = d.startedAt;
    rt.pid = d.pid;
    if (d.port) rt.port = d.port;
    updateManagedItem(d.id);
    const srv = (D.managedServers || []).find(s => s.id === d.id);
    const name = srv ? srv.name : d.id;
    if (d.state === 'running' && prev !== 'running') {
      toast(`Сервер «${name}» запущен - порт ${rt.port || 25565}`);
      setTimeout(() => pingManagedPlayers(d.id), 1500);
    }
    if (d.state === 'stopped' && d.crashed) {
      notify({ kind: 'server', title: `Сервер «${name}» остановился с ошибкой`, text: `Код выхода ${d.code}. Откройте консоль сервера, чтобы посмотреть лог.`, view: 'servers' });
    }
  }
  function updateManagedItem(id) {
    const item = managedItemEl(id);
    if (!item) return;
    const rt = srvRuntime(id);
    const live = rt.state !== 'stopped', busy = rt.state === 'starting' || rt.state === 'stopping';
    item.dataset.state = rt.state;
    const pill = item.querySelector('.js-status'), tg = item.querySelector('.js-toggle');
    if (pill) { pill.textContent = SRV_STATE_LABEL[rt.state] || 'Оффлайн'; pill.classList.toggle('running', live); }
    if (tg) { tg.innerHTML = live ? I.stop : I.play; tg.title = live ? 'Остановить' : 'Запустить'; tg.disabled = busy; tg.classList.toggle('stop', live); }
    const join = item.querySelector('[data-act="join"]');
    if (join) join.disabled = rt.state !== 'running';
    const port = item.querySelector('.js-port');
    if (port) port.textContent = managedAddress(id);
    const up = item.querySelector('.js-uptime');
    if (up) up.textContent = rt.state === 'running' && rt.startedAt ? '· ' + formatPlaytime(Math.round((Date.now() - rt.startedAt) / 1000)) : '';
    if (rt.state !== 'running') { const pl = item.querySelector('.js-players'); if (pl) pl.textContent = ''; }
  }
  async function loadSrvRuntime() {
    const ipc = getIpc();
    if (!ipc) return;
    const [list, infos] = await Promise.all([
      ipc.invoke('srv:status'),
      Promise.all((D.managedServers || []).map(s => ipc.invoke('srv:info', s.id).then(i => [s.id, i]).catch(() => [s.id, null])))
    ]);
    Object.keys(_srvRt).forEach(id => { _srvRt[id].state = 'stopped'; });
    infos.forEach(([id, info]) => {
      if (!info) return;
      Object.assign(srvRuntime(id), { port: info.port, lanIp: info.lanIp, serverIp: info.serverIp });
    });
    (list || []).forEach(s => Object.assign(srvRuntime(s.id), s));
  }
  async function srvAction(id, act) {
    const ipc = getIpc();
    if (!ipc) { toast('Управление сервером доступно в приложении'); return; }
    const st = serverState(id);
    if (!st.open) {
      st.open = true;
      const item = managedItemEl(id);
      if (item) item.classList.add('open');
      renderConsole(id);
    }
    let r;
    if (act === 'start') r = await ipc.invoke('srv:start', id);
    else if (act === 'stop') r = await ipc.invoke('srv:stop', id);
    else if (act === 'restart') r = await ipc.invoke('srv:restart', id);
    else if (act === 'kill') {
      if (!await confirmDialog({ title: 'Завершить сервер', message: 'Принудительно завершить процесс сервера?\nНесохранённые изменения мира будут потеряны.', okText: 'Завершить', danger: true })) return;
      r = await ipc.invoke('srv:stop', id, true);
    }
    if (r && !r.ok) toast('Ошибка: ' + r.error);
  }
  async function srvSendCommand(id, input) {
    const cmd = input.value.trim();
    if (!cmd) return;
    const ipc = getIpc();
    if (!ipc) { toast('Консоль доступна в приложении'); return; }
    const h = _cmdHistory[id] || (_cmdHistory[id] = { list: [], pos: -1 });
    if (h.list[h.list.length - 1] !== cmd) h.list.push(cmd);
    if (h.list.length > 50) h.list.shift();
    h.pos = -1;
    input.value = '';
    const r = await ipc.invoke('srv:command', { id, command: cmd });
    if (r && !r.ok) toast(r.error);
  }
  function srvCmdHistoryNav(id, input, dir) {
    const h = _cmdHistory[id];
    if (!h || !h.list.length) return;
    if (h.pos === -1) h.pos = h.list.length;
    h.pos = Math.max(0, Math.min(h.list.length, h.pos + dir));
    input.value = h.list[h.pos] || '';
  }
  setInterval(() => {
    if (currentView !== 'servers') return;
    Object.keys(_srvRt).forEach(id => { if (_srvRt[id].state === 'running') updateManagedItem(id); });
  }, 1000);

  const _pingCache = {};
  const PING_TTL = 60 * 1000;
  function pingAddr(ip, force) {
    const key = normIp(ip);
    const c = _pingCache[key];
    if (c && c.p) return c.p;
    if (c && c.res && !force && Date.now() - c.ts < PING_TTL) return Promise.resolve(c.res);
    const ipc = getIpc();
    const p = (ipc ? ipc.invoke('srv:ping', ip) : Promise.resolve({ ok: false, error: 'Пинг доступен в приложении' }))
      .catch(err => ({ ok: false, error: err.message }))
      .then(res => { _pingCache[key] = { ts: Date.now(), res }; return res; });
    _pingCache[key] = { ...(c || {}), p };
    return p;
  }
  function motdHtml(segs) {
    return (segs || []).map(s => {
      const st = [];
      if (s.color && /^#[0-9a-f]{6}$/i.test(s.color)) st.push('color:' + s.color);
      if (s.bold) st.push('font-weight:700');
      if (s.italic) st.push('font-style:italic');
      const deco = [s.underlined && 'underline', s.strikethrough && 'line-through'].filter(Boolean).join(' ');
      if (deco) st.push('text-decoration:' + deco);
      return `<span style="${st.join(';')}">${escapeHtml(s.text)}</span>`;
    }).join('');
  }
  function pingQuality(ms) { return ms < 120 ? 'good' : ms < 300 ? 'mid' : 'bad'; }
  function applyPingToRow(row, res) {
    const badge = row.querySelector('[data-ping-badge]');
    if (!badge) return;
    const label = badge.querySelector('span');
    const motd = row.querySelector('[data-ping-motd]');
    if (!res || !res.ok) {
      badge.className = 'ping-badge off';
      badge.title = (res && res.error) || 'Сервер недоступен';
      label.textContent = 'офлайн';
      if (motd) motd.textContent = '';
      return;
    }
    badge.className = 'ping-badge ' + pingQuality(res.latency);
    badge.title = `Пинг ${res.latency} мс` + (res.sample && res.sample.length ? '\nИгроки: ' + res.sample.join(', ') : '');
    label.textContent = `${fmtCount(res.online)}/${fmtCount(res.max)} · ${res.latency} мс`;
    if (motd) motd.innerHTML = motdHtml(res.motd);
    const ver = row.querySelector('[data-ping-version]');
    if (ver && res.version) ver.textContent = '· ' + res.version;
    const icon = row.querySelector('[data-ping-icon]');
    if (icon && res.favicon && !uiPrefs().trafficSaver) icon.src = res.favicon;
  }
  function pingManagedPlayers(id) {
    const rt = srvRuntime(id);
    if (rt.state !== 'running') return;
    pingAddr('127.0.0.1:' + (rt.port || 25565), true).then(res => {
      const item = managedItemEl(id);
      const pl = item && item.querySelector('.js-players');
      if (pl && res.ok && srvRuntime(id).state === 'running') {
        pl.textContent = `· ${res.online}/${res.max} игроков`;
        pl.title = res.sample && res.sample.length ? 'Онлайн: ' + res.sample.join(', ') : '';
      }
    });
  }
  function pingAllRows(force) {
    content.querySelectorAll('.srv-row[data-ip]').forEach(row => {
      const ip = row.dataset.ip;
      const c = _pingCache[normIp(ip)];
      if (c && c.res) applyPingToRow(row, c.res);
      pingAddr(ip, force).then(res => { if (row.isConnected) applyPingToRow(row, res); });
    });
    (D.managedServers || []).forEach(s => pingManagedPlayers(s.id));
  }
  setInterval(() => { if (currentView === 'servers') pingAllRows(true); }, 45000);

  function rememberServer(name, ip) {
    const hist = ((D.settings && D.settings.serverHistory) || []).filter(h => normIp(h.ip) !== normIp(ip));
    hist.unshift({ name: name || ip, ip, ts: Date.now() });
    D.settings = { ...(D.settings || {}), serverHistory: hist.slice(0, 20) };
  }
  function quickJoin(ip, name) {
    const insts = D.instances || [];
    if (!insts.length) { toast('Сначала установите версию игры на главной'); return; }
    const last = lastPlayed();
    const opts = insts.map(i => `<option value="${escapeHtml(i.folder)}" ${last && last.folder === i.folder ? 'selected' : ''}>${escapeHtml(i.name)} (${escapeHtml(i.ver || '?')}${i.loaderName && i.loaderName !== 'Vanilla' ? ', ' + escapeHtml(i.loaderName) : ''})</option>`).join('');
    const modal = showModal({
      title: 'Подключиться к серверу',
      bodyHtml: `
        <div class="qj-target"><b>${escapeHtml(name || ip)}</b><span>${escapeHtml(ip)}</span></div>
        <div class="field"><label class="field-label">Сборка для запуска</label><select id="qj-inst">${opts}</select></div>
        <div class="field-hint" id="qj-hint">Проверяю сервер…</div>`,
      okText: 'Играть',
      onOk: (m) => {
        const folder = m.querySelector('#qj-inst').value;
        rememberServer(name, ip);
        doLaunch(folder, undefined, { quickPlay: { type: 'multiplayer', value: ip, name: name || ip } });
        if (getIpc()) toast('Запуск и подключение к ' + (name || ip) + '…');
        return true;
      }
    });
    pingAddr(ip).then(res => {
      const h = modal.querySelector('#qj-hint');
      if (!h) return;
      h.textContent = res.ok
        ? `Сервер онлайн: ${res.online}/${res.max} игроков · версия ${res.version || '?'} · ${res.latency} мс`
        : 'Сервер не ответил на пинг - подключение всё равно будет выполнено после запуска';
    });
  }
  const PROP_DEFS = [
    ['motd', 'Описание сервера (MOTD)', 'text', 'A Minecraft Server'],
    ['server-port', 'Порт', 'number', '25565'],
    ['max-players', 'Максимум игроков', 'number', '20'],
    ['gamemode', 'Режим игры', 'select', ['survival', 'creative', 'adventure', 'spectator']],
    ['difficulty', 'Сложность', 'select', ['peaceful', 'easy', 'normal', 'hard']],
    ['hardcore', 'Хардкор', 'bool', 'false'],
    ['pvp', 'PvP', 'bool', 'true'],
    ['online-mode', 'Лицензионный режим (online-mode)', 'bool', 'true'],
    ['white-list', 'Белый список', 'bool', 'false'],
    ['enforce-whitelist', 'Кикать не из белого списка', 'bool', 'false'],
    ['allow-flight', 'Разрешить полёт', 'bool', 'false'],
    ['allow-nether', 'Нижний мир', 'bool', 'true'],
    ['spawn-monsters', 'Монстры', 'bool', 'true'],
    ['spawn-animals', 'Животные', 'bool', 'true'],
    ['spawn-npcs', 'Жители', 'bool', 'true'],
    ['generate-structures', 'Генерировать постройки', 'bool', 'true'],
    ['force-gamemode', 'Принудительный режим игры', 'bool', 'false'],
    ['enable-command-block', 'Командные блоки', 'bool', 'false'],
    ['view-distance', 'Дальность прорисовки (чанки)', 'number', '10'],
    ['simulation-distance', 'Дальность симуляции (чанки)', 'number', '10'],
    ['spawn-protection', 'Защита спавна (блоки)', 'number', '16'],
    ['level-name', 'Папка мира', 'text', 'world'],
    ['level-seed', 'Сид мира', 'text', ''],
    ['level-type', 'Тип мира', 'text', 'minecraft:normal'],
    ['server-ip', 'IP привязки (пусто - все интерфейсы)', 'text', '']
  ];
  const PROP_HINT = { gamemode: { survival: 'Выживание', creative: 'Творческий', adventure: 'Приключение', spectator: 'Наблюдатель' },
    difficulty: { peaceful: 'Мирная', easy: 'Лёгкая', normal: 'Нормальная', hard: 'Сложная' } };
  function propControlHtml(key, type, value, opts) {
    const k = escapeHtml(key);
    if (type === 'bool') return `<div class="switch ${value === 'true' ? 'on' : ''}" data-prop="${k}" data-type="bool"></div>`;
    if (type === 'select') {
      const list = opts.includes(value) || value === '' ? opts : [value].concat(opts);
      return `<select data-prop="${k}">${list.map(o => `<option value="${escapeHtml(o)}" ${o === value ? 'selected' : ''}>${escapeHtml((PROP_HINT[key] || {})[o] || o)}</option>`).join('')}</select>`;
    }
    return `<input type="${type === 'number' ? 'number' : 'text'}" data-prop="${k}" ${type === 'number' ? 'data-type="number"' : ''} value="${escapeHtml(value)}" spellcheck="false">`;
  }
  async function openManagedConfigModal(srv) {
    if (!srv) return;
    const ipc = getIpc();
    const res = ipc ? await ipc.invoke('srv:readProps', srv.id) : { exists: false, props: {} };
    const props = res.props || {};
    const known = new Set(PROP_DEFS.map(d => d[0]));
    const original = {};
    const row = (key, label, type, opt) => {
      const value = key in props ? String(props[key]) : (type === 'select' ? opt[0] : String(opt == null ? '' : opt));
      original[key] = key in props ? String(props[key]) : null;
      return `<div class="prop-row" data-search="${escapeHtml((key + ' ' + label).toLowerCase())}">
        <div class="prop-label"><span>${escapeHtml(label)}</span>${label !== key ? `<code>${escapeHtml(key)}</code>` : ''}</div>
        <div class="prop-ctl">${propControlHtml(key, type, value, Array.isArray(opt) ? opt : [])}</div></div>`;
    };
    const knownRows = PROP_DEFS.map(([k, l, t, o]) => row(k, l, t, o)).join('');
    const otherKeys = Object.keys(props).filter(k => !known.has(k)).sort();
    const otherRows = otherKeys.map(k => {
      const v = String(props[k]);
      return row(k, k, v === 'true' || v === 'false' ? 'bool' : /^-?\d+$/.test(v) ? 'number' : 'text', v);
    }).join('');
    const running = srvRuntime(srv.id).state !== 'stopped';
    showModal({
      title: 'Параметры сервера «' + srv.name + '»',
      wide: true,
      bodyHtml: `
        <div class="prop-section">Лаунчер</div>
        <div class="prop-grid3">
          <div class="field"><label class="field-label">Название</label><input type="text" id="mc-name" value="${escapeHtml(srv.name)}"></div>
          <div class="field"><label class="field-label">Память (МБ)</label><input type="number" id="mc-mem" min="512" step="256" value="${srv.memory || 1024}"></div>
        </div>
        <div class="field"><label class="field-label">Доп. JVM-аргументы</label><input type="text" id="mc-jvm" value="${escapeHtml(srv.jvmArgs || '')}" placeholder="-XX:+UseG1GC" spellcheck="false"></div>
        <div class="prop-section prop-section-row"><span>server.properties</span>
          <input type="text" id="prop-search" class="prop-search" placeholder="Поиск параметра…" spellcheck="false"></div>
        ${res.exists && otherKeys.length ? '' : '<div class="field-hint prop-note">Полный список параметров появится после первого запуска сервера - сейчас показаны основные со значениями по умолчанию.</div>'}
        <div class="prop-list" id="prop-list">${knownRows}
          ${otherRows ? `<div class="prop-section prop-sub">Остальные параметры</div>${otherRows}` : ''}</div>
        ${running ? '<div class="field-hint prop-note warn">Сервер запущен - изменения применятся после перезапуска.</div>' : ''}`,
      okText: 'Сохранить',
      onOk: async (m) => {
        if (!ipc) { toast('Доступно в приложении'); return false; }
        const changed = {};
        let bad = null;
        m.querySelectorAll('[data-prop]').forEach(el => {
          const key = el.dataset.prop;
          let v = el.dataset.type === 'bool' ? String(el.classList.contains('on')) : String(el.value).trim();
          if (el.dataset.type === 'number' && v !== '' && !/^-?\d+$/.test(v)) bad = key;
          if (key === 'server-port' && !(+v >= 1 && +v <= 65535)) bad = key;
          const orig = original[key];
          const def = PROP_DEFS.find(d => d[0] === key);
          const shown = orig != null ? orig : def ? (def[2] === 'select' ? def[3][0] : String(def[3])) : '';
          if (v !== shown) changed[key] = v;
        });
        if (bad) { toast('Неверное значение: ' + bad); return false; }
        const patch = { name: m.querySelector('#mc-name').value, memory: m.querySelector('#mc-mem').value, jvmArgs: m.querySelector('#mc-jvm').value };
        const r1 = await ipc.invoke('srv:updateManaged', { id: srv.id, patch });
        if (!r1 || !r1.ok) { toast('Ошибка: ' + ((r1 && r1.error) || '')); return false; }
        Object.assign(srv, r1.entry);
        if (Object.keys(changed).length) {
          const r2 = await ipc.invoke('srv:writeProps', { id: srv.id, props: changed });
          if (!r2 || !r2.ok) { toast('Ошибка server.properties: ' + ((r2 && r2.error) || '')); return false; }
          const rt = srvRuntime(srv.id);
          if ('server-port' in changed) rt.port = +changed['server-port'];
          if ('server-ip' in changed) rt.serverIp = changed['server-ip'];
        }
        setView('servers');
        toast(running && Object.keys(changed).length ? 'Сохранено - перезапустите сервер, чтобы применить' : 'Параметры сохранены');
        return true;
      }
    });
    const wrap = document.getElementById('app-modal');
    wrap.querySelectorAll('.prop-list .switch').forEach(sw => sw.addEventListener('click', () => sw.classList.toggle('on')));
    const search = wrap.querySelector('#prop-search');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      wrap.querySelectorAll('.prop-row').forEach(r => r.classList.toggle('hidden', !!q && !r.dataset.search.includes(q)));
      wrap.querySelectorAll('.prop-sub').forEach(s => s.classList.toggle('hidden', !!q));
    });
  }

  function initServers() {
    content.querySelectorAll('.server-item[data-managed="1"]').forEach(item => {
      const id = item.dataset.server;
      const st = serverState(id);
      item.querySelector('.server-head').addEventListener('click', (e) => {
        if (e.target.closest('.js-toggle')) return;
        st.open = !st.open;
        item.classList.toggle('open', st.open);
        if (st.open) renderConsole(id);
      });
      item.querySelector('.js-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        srvAction(id, srvRuntime(id).state === 'stopped' ? 'start' : 'stop');
      });
      item.querySelectorAll('.server-toolbar [data-act]').forEach(btn =>
        btn.addEventListener('click', async () => {
          const act = btn.dataset.act;
          const srv = (D.managedServers || []).find(s => s.id === id);
          if (act === 'storage') openServerStorage(id);
          else if (act === 'copy') copyText(managedAddress(id), 'IP скопирован');
          else if (act === 'restart' || act === 'kill') srvAction(id, act);
          else if (act === 'join') quickJoin('localhost:' + (srvRuntime(id).port || 25565), srv ? srv.name : 'Локальный сервер');
          else if (act === 'config') openManagedConfigModal(srv);
          else if (act === 'clear') {
            const ipc = getIpc();
            if (ipc) await ipc.invoke('srv:clearLog', id);
            _srvLogs[id] = [];
            renderConsole(id);
          } else if (act === 'delete-managed') {
            if (!srv) return;
            if (srvRuntime(id).state !== 'stopped') { toast('Сначала остановите сервер'); return; }
            if (!await confirmDialog({ title: 'Удалить сервер', message: `Полностью удалить сервер «${srv.name}»?\nПапка mgl/servers/${id} будет удалена с диска.`, okText: 'Удалить', danger: true })) return;
            const ipc = getIpc();
            if (ipc) {
              const r = await ipc.invoke('srv:removeManaged', id);
              if (r && !r.ok) { toast('Ошибка: ' + r.error); return; }
            }
            D.managedServers = (D.managedServers || []).filter(s => s.id !== id);
            setView('servers');
            toast('Сервер удалён');
          }
        }));
      const input = item.querySelector('.cmd-input');
      item.querySelector('.cmd-send').addEventListener('click', () => srvSendCommand(id, input));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') srvSendCommand(id, input);
        else if (e.key === 'ArrowUp') { e.preventDefault(); srvCmdHistoryNav(id, input, -1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); srvCmdHistoryNav(id, input, 1); }
      });
      if (st.open) renderConsole(id);
    });

    content.querySelectorAll('.srv-row').forEach(row =>
      row.querySelectorAll('[data-act]').forEach(btn =>
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const { ip, name, id } = row.dataset;
          const kind = row.dataset.remote;
          if (btn.dataset.act === 'join') { quickJoin(ip, name); return; }
          if (btn.dataset.act === 'copy') { copyText(ip, 'IP скопирован'); return; }
          if (btn.dataset.act !== 'delete') return;
          if (!await confirmDialog({ title: 'Удалить сервер', message: `Удалить сервер «${name}»?\nОн также будет убран из списка серверов в игре (servers.dat).`, okText: 'Удалить', danger: true })) return;
          const ipc = getIpc();
          if (kind === 'custom') {
            if (ipc) await ipc.invoke('srv:removeCustom', id);
            D.customServers = (D.customServers || []).filter(s => s.id !== id);
          } else if (ipc) {
            const r = await ipc.invoke('srv:datRemove', ip);
            if (r && !r.ok) { toast('Ошибка: ' + r.error); return; }
          }
          D.servers = (D.servers || []).filter(s => normIp(s.ip) !== normIp(ip));
          setView('servers');
          toast('Сервер удалён');
        })));

    const addSrv = content.querySelector('#add-server');
    if (addSrv) addSrv.addEventListener('click', () => openAddServerModal());
    const createSrv = content.querySelector('#create-server');
    if (createSrv) createSrv.addEventListener('click', () => openCreateServerModal());
    const pingAll = content.querySelector('#srv-ping-all');
    if (pingAll) pingAll.addEventListener('click', () => pingAllRows(true));

    loadSrvRuntime().then(() => {
      (D.managedServers || []).forEach(s => updateManagedItem(s.id));
      pingAllRows(false);
    });
  }

  function openAddServerModal() {
    showModal({
      title: 'Добавить сервер',
      bodyHtml: `
        <div class="field"><label class="field-label">Название</label>
          <input type="text" id="add-srv-name" placeholder="Мой сервер"></div>
        <div class="field"><label class="field-label">IP-адрес</label>
          <input type="text" id="add-srv-ip" placeholder="play.example.com или 1.2.3.4:25565"></div>`,
      okText: 'Добавить',
      onOk: async (modal) => {
        const name = modal.querySelector('#add-srv-name').value.trim();
        const ip = modal.querySelector('#add-srv-ip').value.trim();
        if (!ip) { toast('Введите IP'); return false; }
        const ipc = getIpc();
        if (!ipc) { toast('Доступно только в приложении'); return false; }
        const r = await ipc.invoke('srv:addCustom', { name, ip });
        if (!r || !r.ok) { toast('Ошибка: ' + (r && r.error || '')); return false; }
        D.customServers = (D.customServers || []).concat(r.entry);
        setView('servers');
        toast('Сервер добавлен');
        return true;
      }
    });
  }
  async function openCreateServerModal() {
    const ipc = getIpc();
    if (!ipc) { toast('Доступно только в приложении'); return; }
    showModal({
      title: 'Создать сервер',
      bodyHtml: `
        <div class="field"><label class="field-label">Название</label>
          <input type="text" id="crt-srv-name" placeholder="Выживание"></div>
        <div class="field"><label class="field-label">Версия Minecraft</label>
          <select id="crt-srv-ver"><option>Загрузка…</option></select></div>
        <div class="field"><label class="field-label">Выделенная память (МБ)</label>
          <input type="number" id="crt-srv-mem" value="1024" min="512" step="256"></div>
        <div class="field-hint">Будет скачан официальный vanilla-jar от Mojang, развёрнут в mgl/servers/, EULA принята автоматически.</div>
        <div class="create-progress hidden" id="crt-progress"><div class="lp-bar"><div class="lp-fill" id="crt-fill"></div></div><div class="lp-status" id="crt-status"></div></div>`,
      okText: 'Создать',
      onOk: async (modal, api) => {
        const name = modal.querySelector('#crt-srv-name').value.trim();
        const mcVersion = modal.querySelector('#crt-srv-ver').value;
        const memory = parseInt(modal.querySelector('#crt-srv-mem').value, 10) || 1024;
        if (!name) { toast('Введите название'); return false; }
        if (!mcVersion) { toast('Выберите версию'); return false; }
        const prog = modal.querySelector('#crt-progress');
        prog.classList.remove('hidden');
        api.disable();
        const onProg = (e, d) => {
          const fill = modal.querySelector('#crt-fill'), st = modal.querySelector('#crt-status');
          if (fill) fill.style.width = (d.progress || 0) + '%';
          if (st) st.textContent = d.status || '';
        };
        ipc.on('srv:createProgress', onProg);
        const r = await ipc.invoke('srv:createManaged', { name, mcVersion, memory });
        ipc.removeListener('srv:createProgress', onProg);
        if (!r || !r.ok) { toast('Ошибка: ' + (r && r.error || '')); api.enable(); return false; }
        D.managedServers = (D.managedServers || []).concat(r.entry);
        setView('servers');
        toast('Сервер создан: ' + name);
        return true;
      }
    });
    const versions = await ipc.invoke('srv:availableVersions');
    const sel = document.querySelector('#crt-srv-ver');
    if (sel) sel.innerHTML = versions.map(v => `<option value="${v}">${v}</option>`).join('');
  }

  function showModal({ title, bodyHtml, okText = 'OK', onOk, wide }) {
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();
    const wrap = document.createElement('div');
    wrap.id = 'app-modal';
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}">
        <div class="modal-head"><div class="modal-title">${escapeHtml(title)}</div>
          <button class="btn-ghost modal-close">×</button></div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-foot">
          <button class="btn-secondary modal-cancel">Отмена</button>
          <button class="btn primary modal-ok">${escapeHtml(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('.modal-close').addEventListener('click', close);
    wrap.querySelector('.modal-cancel').addEventListener('click', close);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    const okBtn = wrap.querySelector('.modal-ok');
    const api = {
      disable() { okBtn.disabled = true; okBtn.textContent = 'Работаю…'; },
      enable() { okBtn.disabled = false; okBtn.textContent = okText; }
    };
    okBtn.addEventListener('click', async () => {
      const result = await onOk(wrap, api);
      if (result !== false) close();
    });
    return wrap;
  }
  function appConfirm(opts) {
    if (typeof opts === 'string') opts = { message: opts };
    const { title = 'Подтверждение', message = '', okText = 'OK', cancelText = 'Отмена', danger = false } = opts;
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap confirm-wrap';
      wrap.innerHTML = `
        <div class="modal confirm-modal ${danger ? 'is-danger' : ''}" role="alertdialog" aria-modal="true">
          <div class="modal-head"><div class="modal-title">${escapeHtml(title)}</div>
            <button class="btn-ghost modal-close" data-r="x" aria-label="Закрыть">×</button></div>
          <div class="modal-body confirm-body">
            <div class="confirm-icon">${danger ? I.warn : I.info}</div>
            <div class="confirm-text">${escapeHtml(message)}</div>
          </div>
          <div class="modal-foot">
            <button class="btn-secondary" data-r="no">${escapeHtml(cancelText)}</button>
            <button class="btn primary ${danger ? 'danger-fill' : ''}" data-r="ok">${escapeHtml(okText)}</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      const done = (v) => { document.removeEventListener('keydown', onKey, true); wrap.remove(); resolve(v); };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); done(null); }
        else if (e.key === 'Enter') { e.preventDefault(); done(true); }
      };
      document.addEventListener('keydown', onKey, true);
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) return done(null);
        const b = e.target.closest('[data-r]');
        if (b) done(b.dataset.r === 'ok' ? true : b.dataset.r === 'no' ? false : null);
      });
      setTimeout(() => { const ok = wrap.querySelector('[data-r="ok"]'); if (ok) ok.focus(); }, 0);
    });
  }
  async function confirmDialog(opts) { return (await appConfirm(opts)) === true; }
  // Подтверждение удаления файла контента; для модов предупреждает, если от него зависят другие установленные моды
  async function confirmRemoveContent({ projectType, instance, filename, where }) {
    const ipc = getIpc();
    let extra = '';
    if (ipc && (projectType || 'mod') === 'mod') {
      const d = await ipc.invoke('modrinth:dependents', { projectType: 'mod', instance, filename }).catch(() => null);
      const list = (d && d.dependents) || [];
      if (list.length) extra = `\n\n⚠ От этого мода зависят: ${list.slice(0, 6).map(x => x.title).join(', ')}${list.length > 6 ? ` и ещё ${list.length - 6}` : ''}. Без него они могут не запуститься.`;
    }
    return confirmDialog({
      title: extra ? 'Удалить мод, от которого зависят другие?' : 'Удалить файл',
      message: `Удалить файл ${filename}${where ? ' ' + where : ''}?` + extra, okText: 'Удалить', danger: true
    });
  }

  function openServerStorage(id) {
    const ipc = getIpc();
    if (ipc) { ipc.send('open-server-folder', id); toast('Открываю папку сервера…'); }
    else toast('Папка сервера доступна в приложении');
  }

  let currentView = null;
  function setView(name) {
    if (!views[name]) return;
    if (currentView === 'skins' && name !== 'skins') disposeViewer();
    if (currentView === 'settings') {
      disposeBgEditor();
      if (_themeDraft) { _themeDraft = null; _themePickers = null; applyCurrentTheme(); }
    }
    if (currentView) UiBus.emit('view:leave', { name: currentView, next: name });
    currentView = name;
    content.innerHTML = views[name]();
    content.scrollTop = 0;
    document.querySelectorAll('.rail-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === name));
    document.querySelectorAll('.nav-link[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === name));
    document.getElementById('breadcrumb-current').textContent = TITLES[name] || name;
    bindViewEvents();
    UiBus.emit('view:render', { name, root: content });
  }

  function bindViewEvents() {
    content.querySelectorAll('.tab-row').forEach(row => {
      row.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
        row.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      }));
    });

    content.querySelectorAll('[data-play-direct]').forEach(el =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const inst = (D.instances || []).find(i => i.id === el.dataset.playDirect);
        if (inst) doLaunch(inst.folder, undefined);
        else toast('Версия недоступна');
      }));

    const openInstMenu = (el, inst) => {
      const r = el.getBoundingClientRect();
      showInstMenu(inst, r.right - 10, r.bottom + 6);
    };
    content.querySelectorAll('[data-inst]').forEach(el =>
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-play-direct]')) return;
        if (e.target.closest('[data-inst-menu]')) return;
        if (e.target.closest('.lib-icon-wrap[data-edit]')) return;
        e.stopPropagation();
        const inst = (D.instances || []).find(i => i.id === el.dataset.inst);
        if (inst) openInstMenu(el, inst);
      }));
    content.querySelectorAll('[data-inst-menu]').forEach(el =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const inst = (D.instances || []).find(i => i.id === el.dataset.instMenu);
        if (inst) openInstMenu(el, inst);
      }));

    content.querySelectorAll('[data-play]').forEach(el => {
      if (el.hasAttribute('data-inst')) return;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const inst = (D.instances || []).find(i => i.id === el.dataset.play);
        if (inst) doLaunch(inst.folder, undefined);
        else toast('Версия недоступна');
      });
    });

    content.querySelectorAll('.section-link[data-view]').forEach(el =>
      el.addEventListener('click', () => setView(el.dataset.view)));

    const ram = content.querySelector('#set-ram');
    if (ram) ram.addEventListener('input', () => {
      content.querySelector('#ram-val').textContent = ram.value + ' МБ';
    });
    if (ram) ram.addEventListener('change', () => saveSettings({ memoryMax: parseInt(ram.value, 10) }));
    const setUser = content.querySelector('#set-username');
    if (setUser) setUser.addEventListener('change', () => saveSettings({ username: setUser.value }));
    const setJava = content.querySelector('#set-java');
    if (setJava) setJava.addEventListener('change', () => saveSettings({ javaPath: setJava.value }));
    const javaBrowse = content.querySelector('#set-java-browse');
    if (javaBrowse) javaBrowse.addEventListener('click', async () => {
      const ipc = getIpc();
      if (!ipc) { toast('Доступно в приложении'); return; }
      const picked = await ipc.invoke('dialog:pickJava');
      if (picked && setJava) { setJava.value = picked; saveSettings({ javaPath: picked }); toast('Java: ' + picked); }
    });
    const javaClear = content.querySelector('#set-java-clear');
    if (javaClear) javaClear.addEventListener('click', () => {
      if (setJava) setJava.value = '';
      saveSettings({ javaPath: '' });
      toast('Путь к Java сброшен - будет автопоиск');
    });

    const mcdirBrowse = content.querySelector('#set-mcdir-browse');
    const mcdirReset = content.querySelector('#set-mcdir-reset');
    const mcdirInput = content.querySelector('#set-mcdir');
    if (mcdirBrowse) mcdirBrowse.addEventListener('click', async () => {
      const ipc = getIpc();
      if (!ipc) { toast('Доступно только в приложении'); return; }
      const picked = await ipc.invoke('mcdir:pick');
      if (!picked) return;
      const cur = await ipc.invoke('mcdir:current');
      const migrate = await appConfirm({
        title: 'Смена папки игры',
        message: `Новый путь:\n${picked}\n\nТекущая папка:\n${cur.current}\n\n` +
          `Перенести всё содержимое (сборки, моды, скины, сервера) в новую папку? Старая папка будет удалена.\n` +
          `Или просто переключиться - старое останется на месте.`,
        okText: 'Перенести', cancelText: 'Только переключиться'
      });
      if (migrate === null) return;
      Downloads.start('mcdir:move', 'mc', 'Перенос .minecraft');
      const onProg = (e, d) => Downloads.update('mcdir:move', { progress: d.progress, status: d.status });
      ipc.on('mcdir:migrateProgress', onProg);
      const r = await ipc.invoke('mcdir:set', { target: picked, migrate });
      ipc.removeListener('mcdir:migrateProgress', onProg);
      if (!r || !r.ok) {
        Downloads.finish('mcdir:move', { ok: false, error: (r && r.error) || 'ошибка' });
        toast('Ошибка: ' + (r && r.error || ''));
        return;
      }
      Downloads.finish('mcdir:move', { ok: true });
      saveSettings({ minecraftDir: r.path });
      if (mcdirInput) mcdirInput.value = r.path;
      // перечитаем установленные версии из новой папки
      if (window.MglIcons) MglIcons.reload();
      D.instances = await ipc.invoke('mc:getInstalled');
      D.servers = await ipc.invoke('mc:getServers');
      D.customServers = await ipc.invoke('srv:listCustom');
      D.managedServers = await ipc.invoke('srv:listManaged');
      normalize();
      renderInstances();
      toast('Папка .minecraft: ' + r.path);
    });
    if (mcdirReset) mcdirReset.addEventListener('click', async () => {
      const ipc = getIpc();
      if (!ipc) { toast('Доступно только в приложении'); return; }
      if (!await confirmDialog({ title: 'Папка по умолчанию', message: 'Вернуть путь к .minecraft по умолчанию (%APPDATA%/.minecraft)?\nСодержимое не трогается - просто переключаемся на дефолтную папку.', okText: 'Вернуть' })) return;
      const r = await ipc.invoke('mcdir:reset');
      if (r && r.ok) {
        saveSettings({ minecraftDir: null });
        if (mcdirInput) mcdirInput.value = '';
        if (window.MglIcons) MglIcons.reload();
        D.instances = await ipc.invoke('mc:getInstalled');
        D.servers = await ipc.invoke('mc:getServers');
        normalize();
        renderInstances();
        toast('Папка .minecraft сброшена к стандартной');
      }
    });

    content.querySelectorAll('[data-java-install]').forEach(btn =>
      btn.addEventListener('click', () => showJavaGuide(parseInt(btn.dataset.javaInstall, 10))));
    refreshJavaFound();

    content.querySelectorAll('[data-toggle]').forEach(sw =>
      sw.addEventListener('click', () => {
        sw.classList.toggle('on');
        saveSettings({ [sw.dataset.toggle]: sw.classList.contains('on') });
      }));

    content.querySelectorAll('[data-vertype]').forEach(sw =>
      sw.addEventListener('click', () => {
        sw.classList.toggle('on');
        const vt = { ...((D.settings && D.settings.versionTypes) || { release: true }) };
        vt[sw.dataset.vertype] = sw.classList.contains('on');
        saveSettings({ versionTypes: vt });
      }));

    if (currentView === 'home') {
      initLaunchSection(); initHeroServers(); initHeroGame();
      const vz = content.querySelector('.hero-viz');
      if (vz) HeroViz.attach(vz);
      const sc = content.querySelector('.hero-scene');
      if (sc) HeroScenes.attach(sc, sc.dataset.scene);
    }
    if (currentView === 'servers') initServers();
    if (currentView === 'skins') initSkins();
    if (currentView === 'library') initLibraryIcons();
    if (currentView === 'browse') bindBrowseEvents();
    if (currentView === 'news') initNewsView();
    if (currentView === 'mycontent') initMyContentView();
    if (currentView === 'settings') initSettingsExtras();
    bindSessionStops();
  }

  async function initNewsView() {
    const list = document.getElementById('news-list');
    if (!list) return;
    const items = await fetchNews();
    if (!list.isConnected) return;
    if (!items.length) {
      list.innerHTML = `<div class="empty">${I.box}<div>Нет новостей</div></div>`;
      return;
    }
    const seen = seenNewsSet();
    list.innerHTML = items.map(n => `
      <div class="news-card ${seen.has(newsKey(n)) ? '' : 'unread'}">
        <div class="news-card-title"><span translate="no">${escapeHtml(newsText(n, 'title'))}</span>${seen.has(newsKey(n)) ? '' : '<span class="news-new">новое</span>'}</div>
        <div class="news-card-desc" translate="no">${escapeHtml(newsText(n, 'desc'))}</div>
        ${n.url ? `<a class="news-card-link" href="#" data-news-url="${escapeHtml(n.url)}">Открыть ссылку</a>` : ''}
      </div>`).join('');
    list.querySelectorAll('[data-news-url]').forEach(el =>
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const url = el.dataset.newsUrl;
        const ipc = getIpc();
        if (ipc) ipc.send('open-url', url); else window.open(url, '_blank');
      }));
    markNewsRead();
  }

  function fmtSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' МБ';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' КБ';
    return bytes + ' Б';
  }
  async function initMyContentView() {
    const typeRow = content.querySelector('[data-tabscope="mycontent-type"]');
    if (typeRow) {
      typeRow.querySelectorAll('[data-mycontent-type]').forEach(tab =>
        tab.addEventListener('click', () => {
          _myContentType = tab.dataset.mycontentType;
          setView('mycontent');
        }));
    }
    bindMyContentTools();
    const filters = content.querySelector('#mycontent-filters');
    if (filters) {
      filters.querySelectorAll('[data-mc-sort]').forEach(chip =>
        chip.addEventListener('click', () => {
          _myContentSort = _myContentSort === chip.dataset.mcSort ? 'name' : chip.dataset.mcSort;
          filters.querySelectorAll('[data-mc-sort]').forEach(c => c.classList.toggle('on', c.dataset.mcSort === _myContentSort));
          renderMyContent();
        }));
      const inactive = filters.querySelector('[data-mc-inactive]');
      if (inactive) inactive.addEventListener('click', () => {
        _myContentInactive = !_myContentInactive;
        inactive.classList.toggle('on', _myContentInactive);
        renderMyContent();
      });
    }
    await loadMyContent();
  }
  async function importMyContentFiles(files) {
    const ipc = getIpc();
    if (!ipc) { toast('Добавление файлов доступно в приложении'); return; }
    const arr = Array.from(files || []);
    const paths = arr.map(f => f.path).filter(Boolean);
    if (!paths.length) { toast('Не удалось получить пути файлов'); return; }
    const jars = paths.filter(p => /\.jar$/i.test(p)), zips = paths.filter(p => /\.zip$/i.test(p));
    let added = 0;
    const skipped = paths.length - jars.length - zips.length;
    if (jars.length) { const r = await ipc.invoke('modrinth:importFiles', { projectType: 'mod', paths: jars }); added += r.added.length; }
    if (zips.length) {
      const t = _myContentType === 'mod' ? 'resourcepack' : _myContentType;
      const r = await ipc.invoke('modrinth:importFiles', { projectType: t, paths: zips });
      added += r.added.length;
      if (r.added.length && t !== _myContentType) { _myContentType = t; setView('mycontent'); toast(`Добавлено: ${added} (ресурспаки)`); return; }
    }
    if (jars.length && _myContentType !== 'mod' && !zips.length) { _myContentType = 'mod'; setView('mycontent'); }
    else await loadMyContent();
    toast(added ? `Добавлено файлов: ${added}${skipped ? `, пропущено: ${skipped}` : ''}` : 'Подходящих файлов нет (нужны .jar или .zip)');
  }
  function bindMyContentTools() {
    const ipc = getIpc();
    const drop = content.querySelector('#mc-drop');
    const view = content.querySelector('.view');
    const fileIn = content.querySelector('#mc-file');
    const add = content.querySelector('#mc-add');
    if (add) add.addEventListener('click', () => fileIn.click());
    if (fileIn) fileIn.addEventListener('change', () => { importMyContentFiles(fileIn.files); fileIn.value = ''; });
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    const setOver = (on) => { if (drop) drop.classList.toggle('over', on); };
    if (view) {
      view.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setOver(true); });
      view.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      view.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setOver(false); });
      view.addEventListener('drop', (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault(); depth = 0; setOver(false);
        importMyContentFiles(e.dataTransfer.files);
      });
    }
    const bulk = async (enable) => {
      if (!ipc) { toast('Доступно только в приложении'); return; }
      const n = _myContentItems.filter(it => /\.disabled$/i.test(it.filename) === enable).length;
      if (!n) { toast(enable ? 'Все файлы уже включены' : 'Все файлы уже отключены'); return; }
      if (!enable && !await confirmDialog({ title: 'Отключить всё', message: `Отключить все (${n})? Их можно включить обратно в любой момент.`, okText: 'Отключить' })) return;
      const r = await ipc.invoke('modrinth:toggleAll', { projectType: _myContentType, enable });
      if (r && r.ok) { toast(`${enable ? 'Включено' : 'Отключено'}: ${r.changed}${r.failed ? `, ошибок: ${r.failed}` : ''}`); await loadMyContent(); }
      else toast('Ошибка: ' + ((r && r.error) || ''));
    };
    const on = content.querySelector('#mc-all-on'), off = content.querySelector('#mc-all-off');
    if (on) on.addEventListener('click', () => bulk(true));
    if (off) off.addEventListener('click', () => bulk(false));
  }
  async function loadMyContent() {
    const listEl = document.getElementById('mycontent-list');
    const statusEl = document.getElementById('mycontent-status');
    if (!listEl) return;
    const ipc = getIpc();
    if (!ipc) {
      if (statusEl) statusEl.textContent = 'Доступно только в приложении';
      return;
    }
    if (statusEl) statusEl.textContent = 'Загрузка…';
    try {
      _myContentItems = (await ipc.invoke('modrinth:listInstalled', _myContentType)) || [];
      renderMyContent();
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Ошибка: ' + e.message;
    }
  }
  function renderMyContent() {
    const listEl = document.getElementById('mycontent-list');
    const statusEl = document.getElementById('mycontent-status');
    if (!listEl) return;
    const all = _myContentItems;
    if (!all.length) {
      if (statusEl) statusEl.textContent = '';
      listEl.innerHTML = `<div class="empty">${I.box}<div>Ничего не установлено</div><div class="empty-sub">Перейдите в «Браузер контента», чтобы скачать моды, текстуры или шейдеры</div>${emptyBtns([['browse', `${I.dl} Открыть браузер контента`, true]])}</div>`;
      return;
    }
    const isOff = (it) => /\.disabled$/i.test(it.filename);
    const isMgl = (it) => /^mglskin/i.test(it.filename);
    const pool = _myContentInactive ? all.filter(isOff) : all.slice();
    const mglVer = (it) => (it.filename.match(/(\d+(?:\.\d+)+)(?=\.jar)/) || [])[1] || '0';
    const mglItems = pool.filter(isMgl).sort((a, b) => cmpVer(mglVer(a), mglVer(b)) || a.filename.localeCompare(b.filename));
    const items = pool.filter(it => !isMgl(it));
    if (_myContentSort === 'size') items.sort((a, b) => b.size - a.size);
    else if (_myContentSort === 'date') items.sort((a, b) => (b.added || b.mtime) - (a.added || a.mtime));
    else items.sort((a, b) => a.filename.localeCompare(b.filename));
    const offCount = all.filter(isOff).length;
    if (statusEl) statusEl.textContent = `${all.length} файлов · отключено ${offCount}` + (_myContentInactive ? ` · показано ${pool.length}` : '');
    if (!pool.length) {
      listEl.innerHTML = `<div class="empty sm">${I.box}<div>Нет отключённых файлов</div></div>`;
      return;
    }
    const row = (it) => {
      const off = isOff(it);
      const displayName = it.filename.replace(/\.disabled$/i, '');
      const date = new Date(it.added || it.mtime).toLocaleDateString(MGL_LOCALE);
      const mgl = isMgl(it);
      return `
        <div class="mycontent-row ${off ? 'disabled' : ''} ${mgl ? 'mgl-skin' : ''}">
          <div class="mycontent-info">
            <div class="mycontent-name"><span class="${mgl ? 'rainbow-text' : ''}" ${mgl ? 'title="Официальный мод Magma Skin &amp; Cape"' : ''}>${escapeHtml(displayName)}</span>${mgl ? '<em class="mc-sys">системный</em>' : ''}</div>
            <div class="mycontent-meta">${fmtSize(it.size)} · добавлено ${date}${off ? ' · <span class="mc-off">отключено</span>' : ''}</div>
          </div>
          <div class="mycontent-actions">
            ${mgl
              ? `<span class="mc-state ${off ? 'off' : 'on'}" title="Включается автоматически при запуске подходящей сборки">${off ? 'ожидает' : 'активен'}</span>`
              : `<div class="switch ${off ? '' : 'on'}" data-mc-toggle="${escapeHtml(it.filename)}" title="${off ? 'Включить' : 'Отключить'}"></div>`}
            ${mgl
              ? `<span class="mc-lock" title="Управляется лаунчером. Чтобы убрать - отключите «Использовать MGL S&amp;C» в настройках">${I.lock}</span>`
              : `<button class="btn-ghost danger" data-mc-remove="${escapeHtml(it.filename)}" title="Удалить">×</button>`}
          </div>
        </div>`;
    };
    listEl.innerHTML = items.map(row).join('')
      + (mglItems.length ? `<div class="mc-sep"><span>Magma Skin &amp; Cape</span><i></i></div>` + mglItems.map(row).join('') : '');
    bindMyContentActions();
  }
  function bindMyContentActions() {
    const listEl = document.getElementById('mycontent-list');
    if (!listEl) return;
    listEl.querySelectorAll('[data-mc-toggle]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const ipc = getIpc();
        if (!ipc || btn.dataset.busy) return;
        btn.dataset.busy = '1';
        btn.classList.toggle('on');
        const res = await ipc.invoke('modrinth:toggle', { projectType: _myContentType, filename: btn.dataset.mcToggle });
        if (res && res.ok) { toast(res.enabled ? 'Включено' : 'Отключено'); await loadMyContent(); }
        else { toast('Ошибка: ' + (res && res.error || '')); btn.classList.toggle('on'); delete btn.dataset.busy; }
      }));
    listEl.querySelectorAll('[data-mc-remove]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const ipc = getIpc();
        if (!ipc) return;
        btn.disabled = true;
        const okRemove = await confirmRemoveContent({ projectType: _myContentType, filename: btn.dataset.mcRemove });
        if (!okRemove) { btn.disabled = false; return; }
        const res = await ipc.invoke('modrinth:remove', { projectType: _myContentType, filename: btn.dataset.mcRemove });
        if (res && res.ok) { toast('Удалено'); await loadMyContent(); }
        else { toast('Ошибка: ' + (res && res.error || '')); btn.disabled = false; }
      }));
  }

  function uiPrefs() {
    const s = D.settings || {};
    const all = !!s.optimization;
    return {
      optimization: all,
      noNeon: all || !!s.noNeon,
      noAnimations: all || !!s.noAnimations,
      trafficSaver: all || !!s.trafficSaver,
      noBackground: all || !!s.noBackground,
      noSeasonal: all || !!s.noSeasonal
    };
  }
  function applySeasonal() {
    if (!window.MglSeasonal) return;
    const s = D.settings || {}, p = uiPrefs();
    // «Отключить сезонные эффекты», «без анимаций» и режим оптимизации гасят всё, включая эффект из дебага
    // (поздравление в ДР остаётся).
    MglSeasonal.apply({
      effects: !p.noSeasonal && !p.noAnimations,
      override: s.seasonOverride || '',
      date: s.seasonDate || '',
      density: s.seasonDensity || 1
    });
  }
  function uiPrefToggle(key, title, sub, s) {
    return `<div class="toggle-row"><div><div class="tl">${title}</div>${sub ? `<div class="ts">${sub}</div>` : ''}</div>
      <div class="switch ${s[key] ? 'on' : ''}" data-uipref="${key}"></div></div>`;
  }
  function applyUiPrefs() {
    const p = uiPrefs();
    document.body.classList.toggle('no-neon', p.noNeon);
    document.body.classList.toggle('no-anim', p.noAnimations);
    document.body.classList.toggle('no-bg', p.noBackground);
    document.body.classList.toggle('font-mc', (D.settings || {}).uiFont === 'minecraft');
    applyLookPrefs();
    applyBackground();
    applySeasonal();
    cacheSplashPref();
  }

  let _updateBusy = false;
  function typeText(el, text) {
    if (el._typeTimer) clearInterval(el._typeTimer);
    let cur = el.textContent;
    let erasing = true;
    el.classList.add('typing');
    el._typeTimer = setInterval(() => {
      if (erasing) {
        cur = cur.slice(0, -1);
        if (!cur) erasing = false;
      } else {
        cur = text.slice(0, cur.length + 1);
      }
      el.textContent = cur || '​';
      if (!erasing && cur === text) {
        clearInterval(el._typeTimer); el._typeTimer = null;
        el.classList.remove('typing');
      }
    }, 34);
  }
  function refreshUpdateButton(animate) {
    const btn = content.querySelector('#upd-btn');
    const sub = content.querySelector('#upd-sub');
    if (!btn || _updateBusy) return;
    const avail = isUpdateAvailable();
    const want = avail ? 'Скачать обновление' : 'Проверить обновления';
    btn.classList.toggle('glow', avail);
    if (sub) sub.textContent = avail
      ? `Доступна версия ${_remoteMeta.latestVersion} (у вас ${LAUNCHER_VERSION})`
      : (_remoteMeta.latestVersion ? 'У вас последняя версия' : 'Нажмите, чтобы сверить версию с сервером');
    if (btn.textContent === want) return;
    if (animate && !uiPrefs().noAnimations) typeText(btn, want);
    else btn.textContent = want;
  }
  function initUpdateButton() {
    content.querySelectorAll('[data-link]').forEach(b => b.addEventListener('click', () => {
      const ipc = getIpc();
      if (ipc) ipc.send('open-url', b.dataset.link); else window.open(b.dataset.link, '_blank');
    }));
    const btn = content.querySelector('#upd-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (_updateBusy || btn._typeTimer) return;
      if (!isUpdateAvailable()) {
        _updateBusy = true; btn.disabled = true; btn.textContent = 'Проверяю…';
        await fetchNews(true);
        _updateBusy = false; btn.disabled = false;
        btn.textContent = 'Проверить обновления';
        onNewsRefreshed();
        if (!_remoteMeta.latestVersion) { toast('Не удалось получить версию с сервера'); return; }
        refreshUpdateButton(true);
        if (!isUpdateAvailable()) toast('У вас последняя версия ' + LAUNCHER_VERSION);
        return;
      }
      startUpdateDownload(btn);
    });
  }
  async function startUpdateDownload(btn) {
    const ipc = getIpc();
    if (!ipc) { toast('Обновление доступно только в приложении'); return; }
    _updateBusy = true; btn.disabled = true;
    const ver = _remoteMeta.latestVersion;
    Downloads.start('update', 'upd', 'Обновление до ' + ver);
    const onProg = (e, d) => {
      Downloads.update('update', { progress: d.progress, status: d.status });
      if (btn.isConnected) btn.textContent = `Скачивание… ${d.progress || 0}%`;
    };
    ipc.on('update:progress', onProg);
    const r = await ipc.invoke('update:download', { repo: _remoteMeta.updateRepo });
    ipc.removeListener('update:progress', onProg);
    _updateBusy = false;
    if (!r || !r.ok) {
      Downloads.finish('update', { ok: false, error: (r && r.error) || 'ошибка' });
      toast('Ошибка обновления: ' + ((r && r.error) || ''));
      if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Скачать обновление'; }
      return;
    }
    Downloads.finish('update', { ok: true });
    if (btn.isConnected) btn.textContent = 'Установка…';
    toast('Устанавливаю обновление - лаунчер перезапустится');
  }

  const RAIL_DEFS = {
    home: { title: 'Главная', view: 'home', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>' },
    news: { title: 'Новости', view: 'news', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h5M8 16h8"/></svg>' },
    mycontent: { title: 'Мой контент', view: 'mycontent', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m-8-4v10l8 4m-8-14l8 4m0 0v10"/></svg>' },
    browse: { title: 'Браузер контента', view: 'browse', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/></svg>' },
    packs: { title: 'Сборки', view: 'packs', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5l8 4.5 8-4.5"/></svg>' },
    library: { title: 'Библиотека', view: 'library', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h8"/></svg>' },
    servers: { title: 'Серверы', view: 'servers', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>' },
    sessions: { title: 'Активные сессии', view: 'sessions', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/></svg>' },
    skins: { title: 'Скины', view: 'skins', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="9" r="2"/></svg>' },
    folder: { title: 'Папка Minecraft', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' },
    plugins: { title: 'Плагины', view: 'plugins', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/></svg>' },
    settings: { title: 'Настройки', view: 'settings', locked: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 112.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z"/></svg>' }
  };
  const RAIL_DEFAULT = ['home', 'news', 'mycontent', 'browse', 'library', 'packs', 'servers', '-sessions', 'skins', 'spacer', 'folder', 'settings'];
  // новые значки, которые у старых раскладок должны появиться видимыми: id → после какого встать
  const RAIL_NEW_VISIBLE = { packs: 'library' };
  function railLayout() {
    const saved = D.settings && Array.isArray(D.settings.railLayout) ? D.settings.railLayout : null;
    let list = saved
      ? saved.filter(x => x && (x.id === 'spacer' || RAIL_DEFS[x.id])).map(x => ({ id: x.id, hidden: x.id === 'settings' ? false : !!x.hidden }))
      : RAIL_DEFAULT.map(id => ({ id: id.replace(/^-/, ''), hidden: id[0] === '-' }));
    const seen = new Set();
    list = list.filter(x => x.id === 'spacer' || (!seen.has(x.id) && seen.add(x.id)));
    Object.keys(RAIL_DEFS).forEach(id => {
      if (seen.has(id)) return;
      if (id in RAIL_NEW_VISIBLE) {
        const at = list.findIndex(x => x.id === RAIL_NEW_VISIBLE[id]);
        list.splice(at >= 0 ? at + 1 : list.length, 0, { id, hidden: false });
      } else list.push({ id, hidden: id !== 'settings' });
    });
    return list;
  }
  function renderRail() {
    const wrap = document.getElementById('rail-items');
    if (!wrap) return;
    wrap.innerHTML = railLayout().filter(x => !x.hidden).map(x => {
      if (x.id === 'spacer') return '<div class="rail-spacer"></div>';
      const d = RAIL_DEFS[x.id];
      return `<div class="rail-item ${d.view && d.view === currentView ? 'active' : ''}" data-rail="${x.id}" ${d.view ? `data-view="${d.view}"` : ''} title="${d.title}">${d.svg}</div>`;
    }).join('');
    wrap.querySelectorAll('[data-rail]').forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.rail;
      if (id === 'folder') {
        const ipc = getIpc();
        if (ipc) { ipc.send('open-folder', 'game'); toast('Открываю папку Minecraft…'); }
        else toast('Папка Minecraft доступна в приложении');
        return;
      }
      setView(RAIL_DEFS[id].view);
    }));
    UiBus.emit('rail:render', { el: wrap });
    updateBadges();
  }
  function railCardHtml() {
    const list = railLayout();
    const move = (i) => `<button class="btn-ghost sm-ico" data-rail-up="${i}" title="Выше" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn-ghost sm-ico" data-rail-down="${i}" title="Ниже" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>`;
    const rows = list.map((x, i) => {
      if (x.id === 'spacer') return `
        <div class="rail-cfg-row spacer" draggable="true" data-idx="${i}">
          <span class="rail-cfg-grip">⋮⋮</span>
          <span class="rail-cfg-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg></span>
          <span class="rail-cfg-name">Растягивающий пробел</span>
          <div class="rail-cfg-actions">${move(i)}<button class="btn-ghost danger sm-ico" data-rail-del="${i}" title="Убрать пробел">×</button></div>
        </div>`;
      const d = RAIL_DEFS[x.id];
      return `
        <div class="rail-cfg-row ${x.hidden ? 'off' : ''}" draggable="true" data-idx="${i}">
          <span class="rail-cfg-grip">⋮⋮</span>
          <span class="rail-cfg-ico">${d.svg}</span>
          <span class="rail-cfg-name">${d.title}${d.locked ? ' <span class="rail-cfg-lock">всегда</span>' : ''}</span>
          <div class="rail-cfg-actions">${move(i)}<div class="switch ${x.hidden ? '' : 'on'} ${d.locked ? 'locked' : ''}" data-rail-vis="${i}"></div></div>
        </div>`;
    }).join('');
    return `
      <div class="field-hint" style="margin:0 0 12px">Какие значки показывать в левой панели и в каком порядке. Перетаскивайте строки мышью или используйте стрелки.</div>
      <div class="rail-cfg-list" id="rail-cfg-list">${rows}</div>
      <div class="field-row" style="margin-top:12px">
        <button class="btn-secondary" id="rail-add-spacer">+ Растягивающий пробел</button>
        <button class="btn-secondary" id="rail-reset">Сбросить</button>
      </div>`;
  }
  function bindRailCard() {
    const card = content.querySelector('#rail-card');
    if (!card) return;
    const list = railLayout();
    const commit = (next) => {
      saveSettings({ railLayout: next });
      renderRail();
      card.innerHTML = railCardHtml();
      bindRailCard();
    };
    const moveTo = (from, to) => {
      if (to < 0 || to >= list.length || from === to) return;
      const [it] = list.splice(from, 1);
      list.splice(to, 0, it);
      commit(list);
    };
    card.querySelectorAll('[data-rail-vis]').forEach(sw => sw.addEventListener('click', () => {
      const i = +sw.dataset.railVis;
      if (list[i].id === 'settings') { toast('Значок настроек убрать нельзя'); return; }
      list[i].hidden = !list[i].hidden;
      commit(list);
    }));
    card.querySelectorAll('[data-rail-up]').forEach(b => b.addEventListener('click', () => moveTo(+b.dataset.railUp, +b.dataset.railUp - 1)));
    card.querySelectorAll('[data-rail-down]').forEach(b => b.addEventListener('click', () => moveTo(+b.dataset.railDown, +b.dataset.railDown + 1)));
    card.querySelectorAll('[data-rail-del]').forEach(b => b.addEventListener('click', () => { list.splice(+b.dataset.railDel, 1); commit(list); }));
    card.querySelector('#rail-add-spacer').addEventListener('click', () => {
      const at = list.findIndex(x => x.id === 'settings');
      list.splice(at >= 0 ? at : list.length, 0, { id: 'spacer', hidden: false });
      commit(list);
    });
    card.querySelector('#rail-reset').addEventListener('click', () => commit(null));
    // drag & drop
    let dragIdx = null;
    card.querySelectorAll('.rail-cfg-row').forEach(row => {
      row.addEventListener('dragstart', (e) => { dragIdx = +row.dataset.idx; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); card.querySelectorAll('.drop-target').forEach(r => r.classList.remove('drop-target')); });
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop-target'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
      row.addEventListener('drop', (e) => { e.preventDefault(); if (dragIdx != null) moveTo(dragIdx, +row.dataset.idx); dragIdx = null; });
    });
  }

  function initNavCollapse() {
    const group = document.getElementById('nav-overview');
    const toggle = document.getElementById('nav-overview-toggle');
    if (!group || !toggle) return;
    let collapsed = false;
    try { collapsed = localStorage.getItem('mgl.navOverviewCollapsed') === '1'; } catch (e) {}
    group.classList.toggle('collapsed', collapsed);
    toggle.addEventListener('click', () => {
      collapsed = !collapsed;
      group.classList.toggle('collapsed', collapsed);
      try { localStorage.setItem('mgl.navOverviewCollapsed', collapsed ? '1' : '0'); } catch (e) {}
    });
  }

  const BG_FRAME_W = 1170, BG_FRAME_H = 722;
  const _bgLists = { pictures: null, obj: null, videos: null };
  const BG_KIND = { photo: 'pictures', video: 'videos', '3d': 'obj' }, BG_ID = { photo: 'photoId', video: 'videoId', '3d': 'objId' };
  let _bgLiveScene = null, _bgLivePhoto = null, _bgApplyToken = 0;
  let _bgEditorMode = null, _bgEd = null;

  function bgSettings() { return (D.settings && D.settings.bg) || { mode: null }; }
  async function bgList(kind, force) {
    if (_bgLists[kind] && !force) return _bgLists[kind];
    const ipc = getIpc();
    if (ipc) _bgLists[kind] = (await ipc.invoke('bg:list', kind)) || [];
    else if (!_bgLists[kind]) _bgLists[kind] = kind === 'obj'
      ? [{ id: 'pumpkin', name: 'Тыква', demo: true, x: 0.18, y: 0.05, scale: 0.55, rx: -20, ry: 35, rz: 0, spin: { x: false, y: true, z: false }, speed: 12 }]
      : [];
    return _bgLists[kind];
  }
  async function bgLoadObjData(entry) {
    if (entry._data) return entry._data;
    const ipc = getIpc();
    if (ipc) return ipc.invoke('bg:loadObj', entry.id);
    if (entry.demo) {
      try { const r = await fetch('assets/obj/Pumpkin.obj'); return { obj: await r.text(), mtl: '', texUrl: null }; } catch (e) { return null; }
    }
    return null;
  }
  function coverScale(img, W, H) {
    const iw = img.naturalWidth || img.videoWidth || 1, ih = img.naturalHeight || img.videoHeight || 1;
    return Math.max(1, (H / W) * (iw / ih));
  }
  function layoutPhoto(img, W, H, t) {
    const iw = img.naturalWidth || img.videoWidth || 1, ih = img.naturalHeight || img.videoHeight || 1;
    const w = t.scale * W, h = w * ih / iw;
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style.left = ((0.5 + t.x) * W - w / 2) + 'px';
    img.style.top = ((0.5 + t.y) * H - h / 2) + 'px';
  }
  function layoutLivePhoto() {
    if (_bgLivePhoto) layoutPhoto(_bgLivePhoto.img, window.innerWidth, window.innerHeight, _bgLivePhoto.t);
  }
  function clearLiveBackground() {
    const layer = document.getElementById('app-bg');
    if (_bgLiveScene) { _bgLiveScene.dispose(); _bgLiveScene = null; }
    _bgLivePhoto = null;
    window.removeEventListener('resize', layoutLivePhoto);
    if (layer) { layer.innerHTML = ''; layer.classList.add('hidden'); }
    document.body.classList.remove('has-bg');
  }
  async function applyBackground() {
    const layer = document.getElementById('app-bg');
    if (!layer) return;
    const s = bgSettings();
    const token = ++_bgApplyToken;
    if (uiPrefs().noBackground || !s.mode) { clearLiveBackground(); return; }
    if (s.mode === 'video') {
      const e = (await bgList('videos')).find(x => x.id === s.videoId);
      if (token !== _bgApplyToken) return;
      clearLiveBackground();
      if (!e || !e.url) return;
      layer.innerHTML = '<video class="app-bg-img" muted loop playsinline></video><div class="app-bg-dim"></div>';
      const v = layer.querySelector('video');
      v.muted = true; v.loop = true;
      const t = { x: e.x || 0, y: e.y || 0, scale: e.scale != null ? e.scale : null };
      _bgLivePhoto = { img: v, t };
      v.onloadedmetadata = () => { if (t.scale == null) t.scale = coverScale(v, window.innerWidth, window.innerHeight); layoutLivePhoto(); };
      v.src = e.url;
      if (!uiPrefs().noAnimations) v.play().catch(() => {});
      window.addEventListener('resize', layoutLivePhoto);
    } else if (s.mode === 'photo') {
      const e = (await bgList('pictures')).find(x => x.id === s.photoId);
      if (token !== _bgApplyToken) return;
      clearLiveBackground();
      if (!e || !e.url) return;
      layer.innerHTML = '<img class="app-bg-img" alt=""><div class="app-bg-dim"></div>';
      const img = layer.querySelector('img');
      _bgLivePhoto = { img, t: { x: e.x || 0, y: e.y || 0, scale: e.scale || 1 } };
      img.onload = layoutLivePhoto;
      img.src = e.url;
      window.addEventListener('resize', layoutLivePhoto);
    } else {
      const e = (await bgList('obj')).find(x => x.id === s.objId);
      const data = e ? await bgLoadObjData(e) : null;
      if (token !== _bgApplyToken) return;
      clearLiveBackground();
      if (!data || !window.MglObjScene) return;
      layer.innerHTML = '<canvas class="app-bg-canvas"></canvas><div class="app-bg-dim"></div>';
      _bgLiveScene = new MglObjScene(layer.querySelector('canvas'));
      _bgLiveScene.setPaused(uiPrefs().noAnimations);
      _bgLiveScene.setTransform(e);
      _bgLiveScene.setModel(data);
    }
    layer.classList.remove('hidden');
    document.body.classList.add('has-bg');
  }

  function mockLauncherHtml() {
    return `
      <div class="bgp-mock">
        <div class="m-rail"><i class="m-logo"></i><i></i><i></i><i></i><i></i><i></i><b></b><i></i><i class="m-ava"></i></div>
        <div class="m-side"><i class="m-search"></i><i class="m-prof"></i><i class="m-l on"></i><i class="m-l"></i><i class="m-l"></i><i class="m-l"></i><i class="m-l"></i></div>
        <div class="m-main"><div class="m-top"></div>
          <div class="m-content"><div class="m-hero"></div><div class="m-row"></div><div class="m-row"></div><div class="m-row short"></div></div>
        </div>
      </div>`;
  }
  function bgCardHtml() {
    const s = bgSettings();
    const mode = _bgEditorMode || s.mode || 'photo';
    const cur = s.mode === 'photo' ? 'Фото' : s.mode === 'video' ? 'Видео' : s.mode === '3d' ? '3D-модель' : 'нет';
    return `
      <div class="account-tabs bg-mode-tabs">
        <button class="account-tab ${mode === '3d' ? 'active' : ''}" data-bg-mode="3d">3D</button>
        <button class="account-tab ${mode === 'photo' ? 'active' : ''}" data-bg-mode="photo">Фото</button>
        <button class="account-tab ${mode === 'video' ? 'active' : ''}" data-bg-mode="video">Видео</button>
      </div>
      <div class="bg-current">Сейчас на фоне: <b>${cur}</b>${s.mode ? ' · <a href="#" id="bg-clear">убрать фон</a>' : ''}${uiPrefs().noBackground ? ' · <span class="mc-off">фон отключён в «Оптимизация»</span>' : ''}</div>
      <div class="bgp-toolbar">
        <button class="btn-secondary" id="bg-pick">${mode === 'photo' ? 'Выбрать фото' : mode === 'video' ? 'Выбрать видео' : 'Загрузить модель (.obj / .zip)'}</button>
        <span class="bgp-hint">${mode !== '3d' ? 'ЛКМ - двигать · колесо - масштаб' : 'ЛКМ - двигать · колесо - масштаб · ПКМ - вращать'}</span>
      </div>
      <div class="bgp-frame" id="bgp-frame">
        <div class="bgp-layer" id="bgp-layer"></div>
        <div class="bgp-dim"></div>
        ${mockLauncherHtml()}
        <div class="bgp-empty hidden" id="bgp-empty">Выберите ${mode === 'photo' ? 'фото' : mode === 'video' ? 'видео' : 'модель'} или элемент из истории</div>
      </div>
      ${mode === '3d' ? `
      <div class="bgp-spin">
        <span class="bgp-spin-label">Медленное вращение</span>
        <button class="chip" data-bg-spin="x">X</button><button class="chip" data-bg-spin="y">Y</button><button class="chip" data-bg-spin="z">Z</button>
        <input type="range" id="bg-speed" min="2" max="90" step="1" value="12">
        <span class="range-val" id="bg-speed-val">12°/с</span>
      </div>` : ''}
      <div class="bgp-actions">
        <button class="btn-secondary" id="bg-cancel">Отменить</button>
        <button class="btn primary sm" id="bg-save">Сохранить</button>
      </div>
      <div class="bgp-history-title">История <span>.minecraft/mgl/data/${BG_KIND[mode]}</span></div>
      <div class="bgp-history" id="bgp-history"></div>
      <input type="file" id="bg-file" hidden accept="${mode === 'photo' ? 'image/*' : mode === 'video' ? 'video/*,.mp4,.webm,.mov,.m4v,.mkv,.ogv,.ogg,.avi' : '.obj,.zip'}">`;
  }
  function disposeBgEditor() {
    if (!_bgEd) return;
    if (_bgEd.scene) _bgEd.scene.dispose();
    if (_bgEd.objectUrl) URL.revokeObjectURL(_bgEd.objectUrl);
    _bgEd = null;
  }
  function renderBgCard() {
    const card = content.querySelector('#bg-card');
    if (!card) return;
    disposeBgEditor();
    card.innerHTML = bgCardHtml();
    initBgCard();
  }
  function bgPickTransform(e, mode) {
    if (mode !== '3d') return { x: e.x || 0, y: e.y || 0, scale: e.scale != null ? e.scale : null };
    return {
      x: e.x || 0, y: e.y || 0, scale: e.scale || 0.6,
      rx: e.rx || 0, ry: e.ry || 0, rz: e.rz || 0,
      spin: { x: false, y: false, z: false, ...(e.spin || {}) }, speed: e.speed || 12
    };
  }
  function bgEdUpdateView() {
    const ed = _bgEd;
    if (!ed || !ed.t) return;
    if (ed.mode !== '3d') {
      const f = content.querySelector('#bgp-frame');
      if (!ed.img || !f || !(ed.img.naturalWidth || ed.img.videoWidth)) return;
      if (ed.t.scale == null) ed.t.scale = coverScale(ed.img, BG_FRAME_W, BG_FRAME_H);
      layoutPhoto(ed.img, f.clientWidth, f.clientHeight, ed.t);
    } else if (ed.scene) ed.scene.setTransform(ed.t);
  }
  function bgEdSyncSpinUi() {
    const ed = _bgEd;
    if (!ed || ed.mode !== '3d' || !ed.t) return;
    content.querySelectorAll('[data-bg-spin]').forEach(c => c.classList.toggle('on', !!ed.t.spin[c.dataset.bgSpin]));
    const sp = content.querySelector('#bg-speed'), sv = content.querySelector('#bg-speed-val');
    if (sp) sp.value = ed.t.speed;
    if (sv) sv.textContent = ed.t.speed + '°/с';
  }
  async function bgEdLoad(entry) {
    const ed = _bgEd;
    const layer = content.querySelector('#bgp-layer');
    if (!ed || !layer) return;
    ed.entry = entry;
    ed.t = bgPickTransform(entry, ed.mode);
    const empty = content.querySelector('#bgp-empty');
    if (empty) empty.classList.add('hidden');
    if (ed.mode === 'video') {
      layer.innerHTML = '<video class="bgp-img" muted loop playsinline></video>';
      ed.img = layer.querySelector('video');
      ed.img.muted = true;
      ed.img.onloadedmetadata = bgEdUpdateView;
      ed.img.src = entry.url;
      ed.img.play().catch(() => {});
    } else if (ed.mode === 'photo') {
      layer.innerHTML = '<img class="bgp-img" alt="" draggable="false">';
      ed.img = layer.querySelector('img');
      ed.img.onload = bgEdUpdateView;
      ed.img.src = entry.url;
    } else {
      if (!ed.scene) {
        layer.innerHTML = '<canvas class="bgp-canvas"></canvas>';
        ed.scene = new MglObjScene(layer.querySelector('canvas'));
      }
      ed.scene.setTransform(ed.t);
      bgEdSyncSpinUi();
      const data = await bgLoadObjData(entry);
      if (_bgEd !== ed || ed.entry !== entry) return;
      if (!data) { toast('Не удалось загрузить модель'); return; }
      ed.scene.setModel(data);
    }
    renderBgHistory();
  }
  function bgEdShowEmpty() {
    const ed = _bgEd;
    const layer = content.querySelector('#bgp-layer');
    if (!ed || !layer) return;
    if (ed.scene) { ed.scene.dispose(); ed.scene = null; }
    ed.entry = null; ed.t = null; ed.img = null;
    layer.innerHTML = '';
    const empty = content.querySelector('#bgp-empty');
    if (empty) empty.classList.remove('hidden');
  }
  function renderBgHistory() {
    const ed = _bgEd;
    const el = content.querySelector('#bgp-history');
    if (!ed || !el) return;
    const list = _bgLists[ed.kind] || [];
    const s = bgSettings();
    const activeId = s.mode === ed.mode ? s[BG_ID[ed.mode]] : null;
    if (!list.length) { el.innerHTML = '<div class="bgp-history-empty">Пока пусто - сохранённые варианты появятся здесь</div>'; return; }
    el.innerHTML = list.map(e => `
      <div class="bgp-hist ${ed.entry && ed.entry.id === e.id ? 'sel' : ''}" data-bg-hist="${escapeHtml(e.id)}" title="${escapeHtml(e.name || '')}">
        ${ed.mode === 'video'
          ? `<video src="${escapeHtml(e.url || '')}#t=0.5" muted preload="metadata" draggable="false"></video>`
          : ed.mode === 'photo'
          ? `<img src="${escapeHtml(e.url || '')}" alt="" draggable="false">`
          : `<div class="bgp-hist-obj">${I.box}<span>${escapeHtml(e.name || 'Модель')}</span></div>`}
        ${e.id === activeId ? '<span class="bgp-hist-badge">на фоне</span>' : ''}
        <button class="bgp-hist-del" data-bg-del="${escapeHtml(e.id)}" title="Удалить из истории">×</button>
      </div>`).join('');
    el.querySelectorAll('[data-bg-hist]').forEach(item => item.addEventListener('click', (e) => {
      if (e.target.closest('[data-bg-del]')) return;
      const entry = list.find(x => x.id === item.dataset.bgHist);
      if (entry) bgEdLoad(entry);
    }));
    el.querySelectorAll('[data-bg-del]').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!await confirmDialog({ title: 'Удалить фон', message: 'Удалить из истории (файл тоже будет удалён)?', okText: 'Удалить', danger: true })) return;
      const id = b.dataset.bgDel;
      const ipc = getIpc();
      if (ipc) {
        const r = await ipc.invoke('bg:remove', { kind: ed.kind, id });
        if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
        await bgList(ed.kind, true);
      } else {
        const i = list.findIndex(x => x.id === id);
        if (i >= 0) list.splice(i, 1);
      }
      if (id === activeId) {
        saveSettings({ bg: { ...bgSettings(), mode: null } });
        applyBackground();
      }
      if (_bgEd !== ed) return;
      if (ed.entry && ed.entry.id === id) {
        const next = (_bgLists[ed.kind] || [])[0];
        if (next) bgEdLoad(next); else bgEdShowEmpty();
      }
      renderBgHistory();
    }));
  }
  async function bgEdFilePicked(file) {
    const ed = _bgEd;
    if (!ed || !file) return;
    if (ed.mode !== '3d') {
      if (ed.mode === 'video' && !/\.(mp4|webm|mov|m4v|mkv|ogv|ogg|avi)$/i.test(file.name) && !/^video\//.test(file.type)) { toast('Это не видеофайл'); return; }
      if (ed.objectUrl) URL.revokeObjectURL(ed.objectUrl);
      ed.objectUrl = URL.createObjectURL(file);
      bgEdLoad({ id: null, _temp: true, _srcPath: file.path || null, url: ed.objectUrl, name: file.name, x: 0, y: 0, scale: null });
      return;
    }
    const defaults = { x: 0, y: 0, scale: 0.6, rx: -15, ry: 30, rz: 0, spin: { x: false, y: true, z: false }, speed: 12 };
    const ipc = getIpc();
    if (!ipc) {
      if (!/\.obj$/i.test(file.name)) { toast('В превью поддерживается только .obj'); return; }
      const entry = { id: 'mem' + Date.now(), name: file.name.replace(/\.obj$/i, ''), _data: { obj: await file.text(), mtl: '', texUrl: null }, ...defaults };
      (await bgList('obj')).unshift(entry);
      bgEdLoad(entry);
      return;
    }
    if (!file.path) { toast('Не удалось получить путь к файлу'); return; }
    const r = await ipc.invoke('bg:save', { kind: 'obj', srcPath: file.path, entry: defaults });
    if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
    const list = await bgList('obj', true);
    if (_bgEd !== ed) return;
    bgEdLoad(list.find(x => x.id === r.entry.id) || r.entry);
  }
  async function bgEdSave() {
    const ed = _bgEd;
    if (!ed || !ed.entry || !ed.t) { toast('Сначала выберите ' + (ed && ed.mode === 'photo' ? 'фото' : ed && ed.mode === 'video' ? 'видео' : 'модель')); return; }
    const entry = {};
    Object.keys(ed.entry).forEach(k => { if (k[0] !== '_' && k !== 'url' && k !== 'texUrl') entry[k] = ed.entry[k]; });
    Object.assign(entry, JSON.parse(JSON.stringify(ed.t)));
    const ipc = getIpc();
    let saved;
    if (ipc) {
      if (ed.entry._temp && !ed.entry._srcPath) { toast('Не удалось получить путь к файлу'); return; }
      const r = await ipc.invoke('bg:save', { kind: ed.kind, entry, srcPath: ed.entry._temp ? ed.entry._srcPath : null });
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      saved = r.entry;
      await bgList(ed.kind, true);
    } else {
      saved = { ...ed.entry, ...entry, id: ed.entry.id || ('mem' + Date.now()), _temp: false };
      if (ed.mode !== '3d') ed.objectUrl = null; // URL теперь живёт в истории
      const list = await bgList(ed.kind);
      const i = list.findIndex(x => x.id === saved.id);
      if (i >= 0) list.splice(i, 1);
      list.unshift(saved);
    }
    saveSettings({ bg: { ...bgSettings(), mode: ed.mode, [BG_ID[ed.mode]]: saved.id } });
    _bgEditorMode = ed.mode;
    toast('Фон сохранён');
    await applyBackground();
    renderBgCard();
  }
  let _bgDrag = null;
  function bgFrameGlobalHandlers() {
    if (bgFrameGlobalHandlers.done) return;
    bgFrameGlobalHandlers.done = true;
    window.addEventListener('mousemove', (e) => {
      const d = _bgDrag, ed = _bgEd;
      if (!d || !ed || !ed.t) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      d.x = e.clientX; d.y = e.clientY;
      if (d.btn === 0) { ed.t.x += dx / d.frame.clientWidth; ed.t.y += dy / d.frame.clientHeight; }
      else { ed.t.ry += dx * 0.6; ed.t.rx += dy * 0.6; }
      bgEdUpdateView();
    });
    window.addEventListener('mouseup', () => {
      if (_bgDrag) _bgDrag.frame.classList.remove('dragging');
      _bgDrag = null;
    });
  }
  async function initBgCard() {
    const card = content.querySelector('#bg-card');
    if (!card) return;
    disposeBgEditor();
    const mode = _bgEditorMode || bgSettings().mode || 'photo';
    const ed = _bgEd = { mode, kind: BG_KIND[mode], entry: null, t: null, scene: null, img: null, objectUrl: null };
    bgFrameGlobalHandlers();

    card.querySelectorAll('[data-bg-mode]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.bgMode === mode) return;
      _bgEditorMode = b.dataset.bgMode;
      renderBgCard();
    }));
    const clear = card.querySelector('#bg-clear');
    if (clear) clear.addEventListener('click', (e) => {
      e.preventDefault();
      saveSettings({ bg: { ...bgSettings(), mode: null } });
      applyBackground();
      _bgEditorMode = mode;
      renderBgCard();
    });
    const fileIn = card.querySelector('#bg-file');
    card.querySelector('#bg-pick').addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', () => { bgEdFilePicked(fileIn.files[0]); fileIn.value = ''; });
    card.querySelector('#bg-cancel').addEventListener('click', () => {
      if (!ed.entry) return;
      if (ed.entry._temp) {
        const s = bgSettings();
        const list = _bgLists[ed.kind] || [];
        const back = list.find(x => x.id === s[BG_ID[mode]]) || list[0];
        if (back) bgEdLoad(back); else bgEdShowEmpty();
      } else bgEdLoad(ed.entry);
      toast('Изменения отменены');
    });
    card.querySelector('#bg-save').addEventListener('click', bgEdSave);

    const frame = card.querySelector('#bgp-frame');
    frame.addEventListener('contextmenu', e => e.preventDefault());
    frame.addEventListener('mousedown', (e) => {
      if (!ed.t) return;
      if (e.button !== 0 && !(e.button === 2 && mode === '3d')) return;
      e.preventDefault();
      _bgDrag = { btn: e.button, x: e.clientX, y: e.clientY, frame };
      frame.classList.add('dragging');
    });
    frame.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!ed.t || ed.t.scale == null) return;
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      const ns = Math.min(10, Math.max(0.05, ed.t.scale * Math.exp(-e.deltaY * 0.0015)));
      const k = ns / ed.t.scale;
      ed.t.x = px + (ed.t.x - px) * k;
      ed.t.y = py + (ed.t.y - py) * k;
      ed.t.scale = ns;
      bgEdUpdateView();
    }, { passive: false });

    card.querySelectorAll('[data-bg-spin]').forEach(c => c.addEventListener('click', () => {
      if (!ed.t) return;
      ed.t.spin[c.dataset.bgSpin] = !ed.t.spin[c.dataset.bgSpin];
      bgEdSyncSpinUi(); bgEdUpdateView();
    }));
    const speed = card.querySelector('#bg-speed');
    if (speed) speed.addEventListener('input', () => {
      if (!ed.t) return;
      ed.t.speed = +speed.value;
      bgEdSyncSpinUi(); bgEdUpdateView();
    });

    const list = await bgList(ed.kind);
    if (_bgEd !== ed) return;
    const s = bgSettings();
    const start = list.find(x => x.id === s[BG_ID[mode]]) || list[0];
    if (start) bgEdLoad(start); else { bgEdShowEmpty(); renderBgHistory(); }
  }

  function ramMaxMb() { return D.sys ? D.sys.maxGameMb : 16384; }
  function ramHintHtml() {
    const s = D.sys;
    if (!s) return 'Объём ОЗУ не определён';
    return `Всего ОЗУ: <b>${(s.totalMb / 1024).toFixed(1)} ГБ</b> · свободно ${(s.freeMb / 1024).toFixed(1)} ГБ · рекомендуется <b>${s.recommendedMb} МБ</b>. Максимум ползунка оставляет запас памяти для Windows.`;
  }
  function hardwareInfoHtml() {
    const s = D.sys;
    if (!s) return '';
    const parts = [s.cpuModel ? escapeHtml(s.cpuModel) : 'CPU', `${s.cores} потоков`];
    if (s.cpuMHz) parts.push(`${(s.cpuMHz / 1000).toFixed(2)} ГГц`);
    parts.push(`ОЗУ ${(s.totalMb / 1024).toFixed(1)} ГБ`);
    return `<div class="hw-info ${s.weak ? 'weak' : ''}"><div>${parts.join(' · ')}</div>
      ${s.weak ? `<div class="hw-weak">Слабый ПК: ${escapeHtml(s.reasons.join(', '))} - режим оптимизации включён автоматически</div>` : ''}</div>`;
  }
  async function loadSysInfo() {
    const ipc = getIpc();
    if (ipc) { try { D.sys = await ipc.invoke('sys:info'); } catch (e) {} return; }
    const totalMb = (navigator.deviceMemory || 8) * 1024;
    D.sys = {
      totalMb, freeMb: totalMb / 2, cpuModel: '', cpuMHz: 0, cores: navigator.hardwareConcurrency || 4,
      maxGameMb: Math.max(1024, Math.floor((totalMb - Math.min(2048, totalMb * 0.25)) / 512) * 512),
      recommendedMb: Math.max(1024, Math.min(8192, Math.floor(totalMb * 0.5 / 512) * 512)),
      weak: totalMb < 4096, reasons: totalMb < 4096 ? ['ОЗУ < 4 ГБ'] : []
    };
  }
  // ОЗУ < 4 ГБ или CPU < 2 ГГц -> режим оптимизации
  function autoOptimizeForHardware() {
    const s = D.sys, st = D.settings || {};
    if (!s) return;
    if ((st.memoryMax || 2048) > s.maxGameMb) saveSettings({ memoryMax: s.recommendedMb });
    if (s.weak && !st.autoOptApplied) {
      saveSettings({ optimization: true, autoOptApplied: true });
      setTimeout(() => toast('Слабый ПК (' + s.reasons.join(', ') + ') - включён режим оптимизации'), 800);
    }
  }

  function themeList() { return window.MglThemes ? MglThemes.PRESETS.concat((D.settings || {}).customThemes || []) : []; }
  function currentThemeId() { return (D.settings || {}).theme || 'mgl'; }
  function findTheme(id) { return themeList().find(t => t.id === id) || (window.MglThemes && MglThemes.PRESETS[0]); }
  function applyCurrentTheme() {
    const t = findTheme(currentThemeId());
    if (!t) return;
    MglThemes.apply(t);
    refreshArtIcons();
  }
  function refreshArtIcons() {
    if (!window.MglArt || !MglArt.refreshPalette) return;
    MglArt.refreshPalette();
    renderInstances();
    if (currentView && currentView !== 'settings') setView(currentView);
  }
  function themeCardHtml(t, custom) {
    const v = MglThemes.derive(t);
    const id = escapeHtml(t.id);
    return `
      <div class="theme-card ${t.id === currentThemeId() ? 'active' : ''}" data-theme-id="${id}" tabindex="0" role="button" title="${escapeHtml(t.name)}">
        <span class="theme-prev" style="background:${v['--bg']}">
          <i class="tp-rail" style="background:${v['--rail-bg']}"><b style="background:${t.grad || v['--accent']}"></b></i>
          <i class="tp-panel" style="background:${v['--panel']};border-color:${v['--border']}">
            <s style="background:${v['--text']}"></s><s class="short" style="background:${v['--text-faint']}"></s>
            <u style="background:${t.grad ? t.grad.replace('180deg', '90deg') : v['--accent']}"></u></i>
        </span>
        <span class="theme-name">${escapeHtml(t.name)}</span>
        ${custom ? `<span class="theme-actions"><span data-theme-edit="${id}" title="Изменить">${I.pencil}</span><span data-theme-del="${id}" title="Удалить">×</span></span>` : ''}
      </div>`;
  }
  const HERO_MODES = [['anim', 'Градиент'], ['viz', 'Визуализатор звука'], ['snake', 'Змейки'], ['land', 'Пиксельный пейзаж'], ['dots', 'Точечный шрифт'], ['luni', 'Луни']];
  function customizationCardHtml() {
    const s = D.settings || {};
    if (!window.MglThemes) return '';
    const presets = MglThemes.PRESETS;
    const customs = s.customThemes || [];
    return `
      <div class="theme-cols">
        <div><div class="theme-col-title">Тёмные</div><div class="theme-grid">${presets.filter(t => t.mode !== 'light').map(t => themeCardHtml(t)).join('')}</div></div>
        <div><div class="theme-col-title">Светлые</div><div class="theme-grid">${presets.filter(t => t.mode === 'light').map(t => themeCardHtml(t)).join('')}</div></div>
      </div>
      <div class="cz-sub">Свои темы</div>
      <div class="theme-grid theme-grid-custom">
        ${customs.map(t => themeCardHtml(t, true)).join('')}
        <div class="theme-card theme-add" data-theme-new tabindex="0" role="button"><span>${I.plus}</span><span class="theme-name">Создать тему</span></div>
      </div>
      <div class="theme-editor hidden" id="theme-editor"></div>`;
  }
  // ---- Кастомизация: сворачиваемые подвкладки ----
  const CZ_KEY = 'mgl.czCollapsed';
  function czCollapsed() { try { return new Set(JSON.parse(localStorage.getItem(CZ_KEY) || '[]')); } catch (e) { return new Set(); } }
  function czSectionHtml(id, title, sub, body) {
    const closed = czCollapsed().has(id);
    return `
      <div class="cz-section ${closed ? 'closed' : ''}" data-cz="${id}">
        <div class="cz-head" role="button" tabindex="0" aria-expanded="${!closed}">
          <div><div class="cz-head-title">${title}</div><div class="cz-head-sub">${sub}</div></div>
          <span class="cz-chev"></span>
        </div>
        <div class="cz-body">${body}</div>
      </div>`;
  }
  function bindCzSections() {
    content.querySelectorAll('.cz-section > .cz-head').forEach(h => {
      const toggle = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const sec = h.parentElement, closed = !sec.classList.contains('closed');
        sec.classList.toggle('closed', closed);
        h.setAttribute('aria-expanded', String(!closed));
        const set = czCollapsed();
        closed ? set.add(sec.dataset.cz) : set.delete(sec.dataset.cz);
        try { localStorage.setItem(CZ_KEY, JSON.stringify(Array.from(set))); } catch (err) {}
        // превью фона меряет размеры рамки - после разворачивания пересчитать
        if (!closed && sec.dataset.cz === 'bg') requestAnimationFrame(() => { bgEdUpdateView(); window.dispatchEvent(new Event('resize')); });
      };
      h.addEventListener('click', toggle);
      h.addEventListener('keydown', toggle);
    });
  }
  const GLASS_MODES = [['off', 'Выключено'], ['liquid', 'Жидкое стекло'], ['frosted', 'Матовое стекло']];
  function czBasicHtml() {
    const s = D.settings || {};
    const glass = GLASS_MODES.some(([v]) => v === s.glass) ? s.glass : 'off';
    return `
      <div class="toggle-row"><div><div class="tl">Шрифт</div><div class="ts">Пиксельный шрифт Minecraft или стандартный Inter</div></div>
        <div class="account-tabs font-tabs">
          <button class="account-tab ${s.uiFont === 'minecraft' ? 'active' : ''}" data-ui-font="minecraft">Minecraft</button>
          <button class="account-tab ${s.uiFont === 'minecraft' ? '' : 'active'}" data-ui-font="default">По умолчанию</button>
        </div></div>
      <div class="toggle-row"><div><div class="tl">Фон блока «Продолжить играть»</div><div class="ts">Анимация на главной. Визуализатор во время игры реагирует на системный звук (включая Minecraft)</div></div>
        <div class="hero-mode-pick"><select id="hero-mode">${HERO_MODES.map(([v, n]) => `<option value="${v}" ${(s.heroMode || 'anim') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div class="toggle-row"><div><div class="tl">Стекло</div><div class="ts">Кнопки и блоки в стиле жидкого или матового стекла - лучше всего смотрится с фоном. В режиме оптимизации отключается</div></div>
        <div class="hero-mode-pick"><select id="glass-mode">${GLASS_MODES.map(([v, n]) => `<option value="${v}" ${glass === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>`;
  }
  function bgBlurAmount() { const v = +((D.settings || {}).bgBlurAmount); return v >= 1 && v <= 40 ? v : 8; }
  function bgBlurHtml() {
    const s = D.settings || {};
    return `
      <div class="toggle-row"><div><div class="tl">Размытие фона</div><div class="ts">Размывает фото или 3D-модель на фоне лаунчера</div></div>
        <div class="switch ${s.bgBlur ? 'on' : ''}" id="bg-blur-switch"></div></div>
      <div class="bg-blur-range ${s.bgBlur ? '' : 'disabled'}">
        <span class="bgp-spin-label">Сила</span>
        <input type="range" id="bg-blur-amount" min="1" max="40" step="1" value="${bgBlurAmount()}">
        <span class="range-val" id="bg-blur-val">${bgBlurAmount()} px</span>
      </div>`;
  }
  function bindBgBlur() {
    const sw = content.querySelector('#bg-blur-switch'), range = content.querySelector('#bg-blur-amount');
    if (!sw || !range) return;
    sw.addEventListener('click', () => {
      const on = !sw.classList.contains('on');
      sw.classList.toggle('on', on);
      content.querySelector('.bg-blur-range').classList.toggle('disabled', !on);
      saveSettings({ bgBlur: on });
      applyLookPrefs();
    });
    range.addEventListener('input', () => {
      content.querySelector('#bg-blur-val').textContent = range.value + ' px';
      D.settings = { ...(D.settings || {}), bgBlurAmount: +range.value };
      applyLookPrefs();
    });
    range.addEventListener('change', () => saveSettings({ bgBlurAmount: +range.value }));
  }
  // Размытие фона + стекло: классы на body, сила - CSS-переменная
  function applyLookPrefs() {
    const s = D.settings || {}, p = uiPrefs();
    document.body.classList.toggle('bg-blur', !!s.bgBlur);
    document.body.style.setProperty('--bg-blur', bgBlurAmount() + 'px');
    const glass = p.optimization ? 'off' : s.glass;
    document.body.classList.toggle('glass-liquid', glass === 'liquid');
    document.body.classList.toggle('glass-frosted', glass === 'frosted');
  }

  let _themeDraft = null, _themePickers = null;
  function renderCustomCard() {
    const card = content.querySelector('#cz-main');
    if (!card) return;
    card.innerHTML = customizationCardHtml();
  }
  function defaultBgFor(mode, accent) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let hue = 0;
    if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue = ((hue * 60) + 360) % 360;
    return mode === 'light' ? `hsl(${hue},45%,97%)` : `hsl(${hue},35%,6%)`;
  }
  function hslStrToHex(str) {
    const el = document.createElement('div');
    el.style.color = str;
    document.body.appendChild(el);
    const m = getComputedStyle(el).color.match(/\d+/g).map(Number);
    el.remove();
    return '#' + m.slice(0, 3).map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function openThemeEditor(theme) {
    const ed = content.querySelector('#theme-editor');
    if (!ed) return;
    const base = theme || findTheme(currentThemeId());
    _themeDraft = { id: theme ? theme.id : null, name: theme ? theme.name : 'Моя тема', mode: base.mode || 'dark', bg: base.bg, accent: base.accent };
    ed.classList.remove('hidden');
    ed.innerHTML = `
      <div class="te-head">
        <input type="text" id="te-name" maxlength="24" value="${escapeHtml(_themeDraft.name)}" placeholder="Название темы">
        <div class="account-tabs te-mode">
          <button class="account-tab ${_themeDraft.mode === 'dark' ? 'active' : ''}" data-te-mode="dark">Тёмная</button>
          <button class="account-tab ${_themeDraft.mode === 'light' ? 'active' : ''}" data-te-mode="light">Светлая</button>
        </div>
      </div>
      <div class="te-pickers">
        <div><div class="te-label">Фон</div><div class="te-picker" id="te-bg"></div></div>
        <div><div class="te-label">Акцентный цвет</div><div class="te-picker" id="te-accent"></div></div>
      </div>
      <div class="field-hint te-hint">Выбирайте цвет на палитре или из быстрых цветов - изменения сразу видны во всём лаунчере. Остальные оттенки подбираются автоматически.</div>
      <div class="te-actions">
        <button class="btn-secondary" data-te-cancel>Отмена</button>
        <button class="btn primary sm" data-te-save>${theme ? 'Сохранить' : 'Создать тему'}</button>
      </div>`;
    const preview = () => MglThemes.apply(_themeDraft);
    _themePickers = {
      bg: new MglThemes.ColorPicker(ed.querySelector('#te-bg'), _themeDraft.bg, { onChange: (hex) => { _themeDraft.bg = hex; preview(); } }),
      accent: new MglThemes.ColorPicker(ed.querySelector('#te-accent'), _themeDraft.accent, { onChange: (hex) => { _themeDraft.accent = hex; preview(); } })
    };
    preview();
    ed.scrollIntoView({ block: 'nearest', behavior: uiPrefs().noAnimations ? 'auto' : 'smooth' });
  }
  function closeThemeEditor(revert) {
    const ed = content.querySelector('#theme-editor');
    if (ed) { ed.classList.add('hidden'); ed.innerHTML = ''; }
    _themeDraft = null; _themePickers = null;
    if (revert) applyCurrentTheme();
  }
  async function onCustomCardClick(e) {
    const card = e.currentTarget;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (e.type === 'keydown' && e.target.closest('input')) return;
    const font = e.target.closest('[data-ui-font]');
    if (font) {
      card.querySelectorAll('[data-ui-font]').forEach(x => x.classList.toggle('active', x === font));
      saveSettings({ uiFont: font.dataset.uiFont });
      applyUiPrefs();
      return;
    }
    const del = e.target.closest('[data-theme-del]');
    if (del) {
      e.stopPropagation();
      const id = del.dataset.themeDel;
      const t = themeList().find(x => x.id === id);
      if (!t || !await confirmDialog({ title: 'Удалить тему', message: `Удалить тему «${t.name}»?`, okText: 'Удалить', danger: true })) return;
      const patch = { customThemes: ((D.settings || {}).customThemes || []).filter(x => x.id !== id) };
      if (currentThemeId() === id) patch.theme = 'mgl';
      saveSettings(patch);
      applyCurrentTheme();
      renderCustomCard();
      return;
    }
    const edit = e.target.closest('[data-theme-edit]');
    if (edit) { e.stopPropagation(); openThemeEditor(themeList().find(x => x.id === edit.dataset.themeEdit)); return; }
    if (e.target.closest('[data-theme-new]')) { openThemeEditor(null); return; }
    const mode = e.target.closest('[data-te-mode]');
    if (mode && _themeDraft) {
      if (_themeDraft.mode === mode.dataset.teMode) return;
      _themeDraft.mode = mode.dataset.teMode;
      card.querySelectorAll('[data-te-mode]').forEach(b => b.classList.toggle('active', b === mode));
      _themeDraft.bg = hslStrToHex(defaultBgFor(_themeDraft.mode, _themeDraft.accent));
      _themePickers.bg.set(_themeDraft.bg);
      MglThemes.apply(_themeDraft);
      return;
    }
    if (e.target.closest('[data-te-cancel]')) { closeThemeEditor(true); return; }
    if (e.target.closest('[data-te-save]') && _themeDraft) {
      const name = (card.querySelector('#te-name').value || '').trim() || 'Моя тема';
      const list = ((D.settings || {}).customThemes || []).slice();
      const t = { id: _themeDraft.id || ('custom_' + Date.now().toString(36)), name, mode: _themeDraft.mode, bg: _themeDraft.bg, accent: _themeDraft.accent };
      const i = list.findIndex(x => x.id === t.id);
      if (i >= 0) list[i] = t; else list.push(t);
      saveSettings({ customThemes: list, theme: t.id });
      closeThemeEditor(false);
      applyCurrentTheme();
      renderCustomCard();
      toast(`Тема «${name}» сохранена`);
      return;
    }
    const pick = e.target.closest('[data-theme-id]');
    if (pick && !e.target.closest('.theme-editor')) {
      if (_themeDraft) closeThemeEditor(false);
      saveSettings({ theme: pick.dataset.themeId });
      applyCurrentTheme();
      card.querySelectorAll('[data-theme-id]').forEach(c => c.classList.toggle('active', c === pick));
    }
  }
  function bindCustomCard() {
    const card = content.querySelector('#cz-main');
    if (!card) return;
    card.onclick = onCustomCardClick;
    card.onkeydown = onCustomCardClick;
    const basic = content.querySelector('#cz-basic');
    if (basic) {
      basic.onclick = onCustomCardClick;
      basic.onkeydown = onCustomCardClick;
      basic.onchange = (e) => {
        if (e.target.id === 'glass-mode') {
          saveSettings({ glass: e.target.value });
          applyLookPrefs();
          if (e.target.value !== 'off' && uiPrefs().optimization) toast('Стекло не применяется в режиме оптимизации');
          return;
        }
        if (e.target.id !== 'hero-mode') return;
        const mode = e.target.value;
        saveSettings({ heroMode: mode });
        if (mode === 'viz' && !getIpc()) toast('Захват звука доступен в приложении - в превью показана демо-анимация');
        HeroViz.sync();
      };
    }
    bindCzSections();
    bindBgBlur();
  }

  function reapplyAllSettings() {
    normalize();
    applyCurrentTheme();
    applyUiPrefs();
    renderRail();
    renderInstances();
    document.getElementById('profile-name').textContent = D.profile.name;
    setView('settings');
  }
  function bindSettingsData() {
    const ipc = getIpc();
    const exp = content.querySelector('#set-export'), imp = content.querySelector('#set-import'), rst = content.querySelector('#set-reset');
    if (exp) exp.addEventListener('click', async () => {
      if (!ipc) {
        const blob = new Blob([JSON.stringify({ app: 'magma-launcher', version: 1, settings: D.settings }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'mgl-settings.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return;
      }
      const r = await ipc.invoke('settings:export');
      if (r && r.ok) toast('Настройки сохранены: ' + r.path);
      else if (r && !r.canceled) toast('Ошибка экспорта');
    });
    if (imp) imp.addEventListener('click', async () => {
      if (!ipc) { toast('Импорт доступен в приложении'); return; }
      const r = await ipc.invoke('settings:import');
      if (!r || r.canceled) return;
      if (!r.ok) { toast('Ошибка импорта: ' + r.error); return; }
      D.settings = r.settings;
      reapplyAllSettings();
      toast(`Импортировано параметров: ${r.count}`);
    });
    if (rst) rst.addEventListener('click', async () => {
      if (!await confirmDialog({ title: 'Сброс настроек', message: 'Сбросить все настройки лаунчера по умолчанию?\nUID, папка .minecraft и серверы сохранятся.', okText: 'Сбросить', danger: true })) return;
      if (ipc) D.settings = await ipc.invoke('settings:reset');
      else D.settings = { username: D.settings.username, userId: D.settings.userId, memoryMax: 2048 };
      try { localStorage.removeItem('mgl.settingsCollapsed'); localStorage.removeItem('mgl.navOverviewCollapsed'); } catch (e) {}
      autoOptimizeForHardware();
      reapplyAllSettings();
      toast('Настройки сброшены');
    });
    const fix = content.querySelector('#set-fix-versions');
    if (fix) fix.addEventListener('click', async () => {
      if (!ipc) { toast('Доступно в приложении'); return; }
      fix.disabled = true;
      try {
        const r = await ipc.invoke('mc:fixVersions');
        if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || 'неизвестно')); return; }
        const map = r.renamed || {};
        // картинки сборок (localStorage) привязаны к имени папки
        if (window.MglIcons) Object.entries(map).forEach(([a, b]) => { const u = MglIcons.get(a); if (u) { MglIcons.set(b, u); MglIcons.clear(a); } });
        D.settings = await ipc.invoke('settings:get');
        D.instances = await ipc.invoke('mc:getInstalled');
        normalize(); renderInstances();
        const n = Object.keys(map).length, sk = (r.skipped || []).length;
        toast(n ? `Переименовано сборок: ${n}` + (sk ? `, пропущено: ${sk}` : '') : (sk ? 'Не удалось: ' + r.skipped.map(x => verLabel(x.folder) + ' - ' + x.error).join('; ') : 'Все версии уже в порядке'));
      } finally { fix.disabled = false; }
    });
  }

  function skinUrlToSrc(url) {
    if (/^file:\/\/\//.test(url) && window.require) {
      try { return 'data:image/png;base64,' + window.require('fs').readFileSync(url.replace(/^file:\/\/\//, '')).toString('base64'); } catch (e) {}
    }
    return url;
  }
  function renderSkinFace(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = img.naturalWidth / 64;
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 8 * k, 8 * k, 8 * k, 8 * k, 0, 0, 64, 64);
        if (img.naturalHeight >= 32 * k) ctx.drawImage(img, 40 * k, 8 * k, 8 * k, 8 * k, 0, 0, 64, 64);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  async function updateAvatars() {
    if (!window.SkinStore) return;
    let active = SkinStore.getActive();
    if (!active && SkinStore.ensureDefaultSkin) { await SkinStore.ensureDefaultSkin(); active = SkinStore.getActive(); }
    let face;
    try { face = await renderSkinFace(active ? skinUrlToSrc(active.url) : 'assets/images/player.png'); } catch (e) { return; }
    document.querySelectorAll('.rail-session img, .profile-card img, .account-avatar img').forEach(img => {
      img.src = face;
      img.classList.add('skin-face');
    });
  }

  const HeroViz = (function () {
    const BARS = 64;
    const levels = new Float32Array(BARS), peaks = new Float32Array(BARS);
    let canvas = null, g = null, raf = 0;
    let actx = null, analyser = null, stream = null, bins = null;
    let connecting = false, failed = false, notified = false;
    let accent = [79, 166, 107], colorAge = 0, lastW = 0, lastH = 0, grad = null;
    const api = { demo: false };

    api.wanted = function () {
      const p = uiPrefs();
      return ((D.settings || {}).heroMode === 'viz') && !p.optimization && !p.noAnimations;
    };

    async function connect() {
      const ipc = getIpc();
      if (stream || connecting || failed || !ipc) return;
      connecting = true;
      try {
        let s = null;
        try {
          const id = await ipc.invoke('viz:sourceId');
          s = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'desktop' } },
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id || undefined } }
          });
        } catch (e1) {
          s = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
        }
        s.getVideoTracks().forEach(t => { t.stop(); s.removeTrack(t); });
        if (!s.getAudioTracks().length) throw new Error('нет звуковой дорожки');
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const src = actx.createMediaStreamSource(s);
        analyser = actx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        src.connect(analyser);
        bins = new Uint8Array(analyser.frequencyBinCount);
        stream = s;
        s.getAudioTracks()[0].addEventListener('ended', disconnect);
      } catch (e) {
        failed = true;
        console.warn('[viz] не удалось захватить звук:', e && e.message);
        if (!notified) { notified = true; toast('Визуализатор: не удалось получить системный звук - показана анимация покоя'); }
      }
      connecting = false;
    }
    function disconnect() {
      try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      try { if (actx) actx.close(); } catch (e) {}
      stream = null; actx = null; analyser = null; bins = null;
    }
    api.sync = function () {
      // захват системного звука идёт, пока визуализатор виден на главной (любая игра/музыка/видео), а не только при запущенном Minecraft
      if (!(api.wanted() && canvas && canvas.isConnected)) { disconnect(); failed = false; return; }
      connect();
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; grad = null; }
      return true;
    }
    function readAccent() {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
      const m = v.split(',').map(x => parseInt(x, 10));
      if (m.length === 3 && m.every(n => !isNaN(n))) { accent = m; grad = null; }
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!canvas || !canvas.isConnected) { stop(); disconnect(); return; }
      if (document.hidden) return;
      if (!resize()) return;
      if (++colorAge > 90) { colorAge = 0; readAccent(); }
      const w = lastW, h = lastH, t = now / 1000;
      // уровни по полосам
      let signal = 0;
      if (analyser && bins) {
        analyser.getByteFrequencyData(bins);
        const use = Math.floor(bins.length * 0.55);
        for (let i = 0; i < BARS; i++) {
          const lo = Math.floor(Math.pow(i / BARS, 1.65) * use);
          const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / BARS, 1.65) * use));
          let s = 0;
          for (let k = lo; k < hi; k++) s += bins[k];
          const v = Math.pow(s / (hi - lo) / 255, 1.2) * (0.85 + i / BARS * 0.5);
          signal += v;
          const prev = levels[i];
          levels[i] = v > prev ? prev + (v - prev) * 0.55 : prev + (v - prev) * 0.14;
        }
        signal /= BARS;
      } else if (api.demo) {
        for (let i = 0; i < BARS; i++) {
          const beat = Math.pow(Math.max(0, Math.sin(t * 3.1)), 3);
          const v = (0.25 + 0.55 * Math.abs(Math.sin(t * 1.3 + i * 0.37))) * (0.35 + beat * 0.65) * (1 - i / BARS * 0.55);
          levels[i] += (v - levels[i]) * 0.35;
        }
        signal = 1;
      }
      const idle = !analyser || signal < 0.012;
      g.clearRect(0, 0, w, h);
      if (!grad) {
        grad = g.createLinearGradient(0, h, 0, h * 0.15);
        grad.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},0.95)`);
        grad.addColorStop(1, `rgba(${Math.min(255, accent[0] + 70)},${Math.min(255, accent[1] + 70)},${Math.min(255, accent[2] + 70)},0.55)`);
      }
      const slot = w / BARS, bw = Math.max(2, slot * 0.58), maxH = h * 0.82;
      for (let i = 0; i < BARS; i++) {
        let lv = levels[i];
        if (idle && !api.demo) {
          lv = 0.035 + 0.03 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.42)) + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.7 - i * 0.2));
          levels[i] += (lv - levels[i]) * 0.12;
          lv = levels[i];
        }
        const bh = Math.max(3, lv * maxH);
        const x = i * slot + (slot - bw) / 2;
        g.fillStyle = grad;
        g.beginPath();
        if (g.roundRect) g.roundRect(x, h - bh, bw, bh, [bw / 2, bw / 2, 0, 0]);
        else g.rect(x, h - bh, bw, bh);
        g.fill();
        peaks[i] = Math.max(peaks[i] - 0.006, lv);
        const ph = Math.max(3, peaks[i] * maxH);
        if (ph > bh + 4) {
          g.fillStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.5)`;
          g.fillRect(x, h - ph - 3, bw, 2);
        }
      }
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    api.attach = function (el) {
      stop();
      canvas = el;
      g = canvas.getContext('2d');
      grad = null; lastW = lastH = 0;
      readAccent();
      raf = requestAnimationFrame(frame);
      api.sync();
    };
    api.stop = stop;
    window.MglHeroViz = api;
    return api;
  })();

  const HeroScenes = (function () {
    const MODES = ['snake', 'land', 'dots', 'luni'];
    let canvas = null, ctx = null, raf = 0, ro = null, scene = null;
    let W = 0, H = 0, last = 0, acc = 0, colorAge = 0;
    let C = { acc: '#4fa66b', acc2: '#8fd6a5', accDim: '#2f6a44', warm: '#d7793d', warm2: '#e3a04f', hot: '#ec5a6e', text: '#e8ece9', bg: '#0b0d0c' };
    let prevScene = null;
    const held = new Set();
    const api = {};

    api.mode = function () {
      const s = D.settings || {}, p = uiPrefs();
      if (p.optimization || p.noAnimations || p.noBackground) return null;
      return MODES.includes(s.heroMode) ? s.heroMode : null;
    };

    const rand = (a, b) => a + Math.random() * (b - a);
    const irand = n => Math.floor(Math.random() * n);
    const pick = arr => arr[irand(arr.length)];
    const wrap = (v, n) => (v + n) % n;
    // внизу слева - текст hero, там рисуем тише
    const side = (x, y) => {
      if (scene && scene.flat) return 1;
      const fx = Math.min(1, Math.max(0, (x - W * 0.28) / (W * 0.32)));
      const fy = Math.min(1, Math.max(0, (H * 0.62 - y) / (H * 0.3)));
      return 0.12 + 0.88 * Math.max(fx, fy);
    };
    function dot(x, y, r, color, alpha = 1) {
      if (r <= 0 || alpha <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // спрайт из строк '0101…' → точки; x, y - левый верхний угол, s - шаг сетки
    const spr = rows => {
      const p = [];
      rows.forEach((r, y) => [...r].forEach((b, x) => { if (b === '1') p.push(x, y); }));
      return { p, w: rows[0].length, h: rows.length };
    };
    function sprite(sp, x, y, s, color, alpha = 1) {
      const r = s * 0.42;
      ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
      for (let i = 0; i < sp.p.length; i += 2) {
        const cx = x + (sp.p[i] + 0.5) * s, cy = y + (sp.p[i + 1] + 0.5) * s;
        ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    // фоновая сетка точек - рисуется один раз во offscreen-канвас
    let gridCache = null;
    function drawGrid(gap, r, color, alpha, ox = gap / 2, oy = gap / 2) {
      const key = [W, H, gap, r, color, alpha, ox, oy].join();
      if (!gridCache || gridCache.key !== key) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2), cv = document.createElement('canvas');
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        const g = cv.getContext('2d');
        g.scale(dpr, dpr); g.fillStyle = color; g.globalAlpha = alpha; g.beginPath();
        for (let x = ox; x < W; x += gap) for (let y = oy; y < H; y += gap) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }
        g.fill();
        gridCache = { key, cv };
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(gridCache.cv, 0, 0, W, H);
    }
    function overlay(title, sub, y = H / 2) {
      ctx.globalAlpha = 1; ctx.fillStyle = C.text; ctx.textAlign = 'center';
      ctx.font = '700 22px sans-serif'; ctx.fillText(title, W / 2, y - 4);
      ctx.globalAlpha = 0.7; ctx.font = '13px sans-serif'; ctx.fillText(sub, W / 2, y + 20);
      ctx.textAlign = 'start';
    }
    // счёт/подсказка в углу hero (.hero-score)
    // Дебаг → «Режим бога»: проиграть нельзя, рекорды/победы не пишутся
    const god = () => { const s = D.settings || {}; return !!(s.debugMode && s.gameGodMode); };
    function hud(items, hint) {
      const hero = canvas && canvas.closest('.hero'), el = hero && hero.querySelector('.hero-score');
      if (!el) return;
      if (god() && scene !== Paint) hint = 'режим бога · рекорд не сохраняется' + (hint ? ' · ' + hint : '');
      const html = items.map(([l, v]) => `<span>${l} <b>${v}</b></span>`).join('') + (hint ? `<span class="hs-hint">${hint}</span>` : '');
      if (el.innerHTML !== html) el.innerHTML = html;
    }
    const loadNum = k => { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } };
    const saveNum = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };
    const KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    function parseRgb(str) {
      const m = String(str).match(/\d+(\.\d+)?/g);
      return m && m.length >= 3 ? m.slice(0, 3).map(Number) : null;
    }
    function readColors() {
      const cs = getComputedStyle(document.documentElement);
      const a = parseRgb(cs.getPropertyValue('--accent-rgb')) || [79, 166, 107];
      const bg = parseRgb(cs.getPropertyValue('--bg-rgb')) || [11, 13, 12];
      const tx = parseRgb(getComputedStyle(document.body).color) || [232, 236, 233];
      const warm = [215, 121, 61];
      C = {
        acc: hex(a), acc2: hex(mix(a, [255, 255, 255], 0.3)), accDim: hex(mix(a, bg, 0.45)), accTeal: hex(mix(a, [52, 160, 163], 0.45)),
        warm: hex(warm), warm2: hex(mix(warm, [255, 220, 120], 0.35)), hot: hex(mix(warm, [255, 60, 140], 0.6)), text: hex(tx), bg: hex(bg)
      };
      if (scene && scene.recolor) scene.recolor();
    }

    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const Snakes = {
      every: 120,
      recolor() { this.colors = [C.acc, C.acc2, C.accTeal, C.accDim]; (this.snakes || []).forEach((s, i) => { s.color = this.colors[i % 4]; }); },
      reset() {
        this.recolor();
        this.cell = 22;
        this.cols = Math.max(8, Math.floor(W / this.cell));
        this.rows = Math.max(6, Math.floor(H / this.cell));
        this.ox = (W - this.cols * this.cell) / 2;
        this.oy = (H - this.rows * this.cell) / 2;
        this.snakes = []; this.apples = []; this.pops = [];
        if (this.playing) { this.newRound(); return; }
        const n = W < 640 ? 2 : 3;
        for (let i = 0; i < n; i++) this.snakes.push(this.spawn(i));
        for (let i = 0; i < n + 2; i++) this.apples.push(this.freeCell());
      },
      best: (() => { try { return +localStorage.getItem('mgl.snakeBest') || 0; } catch (e) { return 0; } })(),
      aiA: 1, aiTarget: 1, live: false, playing: false, ready: false, flat: false,
      pushScore() { hud([['Рекорд', this.best], ['Счёт', this.score || 0]]); },
      onKey(e) { const d = KEYMAP[e.code]; if (!d) return false; this.turn(d); return true; },
      newRound() {
        const cx = Math.floor(this.cols / 2), cy = Math.floor(this.rows / 2);
        this.snakes = [{ player: true, body: [0, 1, 2, 3].map(i => ({ x: cx - i, y: cy })), grow: 0, dead: 0, dir: [1, 0], color: this.colors[0] }];
        this.apples = []; this.pops = [];
        for (let i = 0; i < 3; i++) this.apples.push(this.freeCell());
        this.score = 0; this.q = []; this.over = false; this.waiting = true; this.ready = true; this.every = 105; this.cheat = false;
        this.pushScore();
      },
      turn(d) {
        if (!this.ready) return;
        if (this.over) { this.newRound(); return; }
        const p = this.snakes[0], last = this.q.length ? this.q[this.q.length - 1] : p.dir;
        if ((d[0] === last[0] && d[1] === last[1]) || (d[0] === -last[0] && d[1] === -last[1])) return;
        if (this.q.length < 2) this.q.push(d);
        this.waiting = false;
      },
      startGame() {
        this.playing = true; this.ready = false; this.flat = true; this.aiTarget = 0; this.live = true;
        this.score = 0; this.pushScore();
      },
      stopGame() {
        this.playing = false; this.ready = false; this.flat = false; this.over = false;
        this.snakes = []; this.every = 120; this.aiA = 0; this.aiTarget = 1; this.live = true;
      },
      playStep() {
        if (this.over || this.waiting) return;
        const p = this.snakes[0];
        if (this.q.length) p.dir = this.q.shift();
        this.pops = this.pops.filter(q => ++q.t < 5);
        const h = p.body[0], last = p.body.length - 1;
        const nx = wrap(h.x + p.dir[0], this.cols), ny = wrap(h.y + p.dir[1], this.rows);
        if (god()) this.cheat = true;
        const hit = !god() && p.body.some((b, i) => b.x === nx && b.y === ny && !(i === last && p.grow === 0));
        if (hit) {
          this.over = true;
          if (this.score > this.best && !this.cheat) { this.best = this.score; try { localStorage.setItem('mgl.snakeBest', String(this.best)); } catch (e) {} }
          this.pushScore();
          return;
        }
        p.body.unshift({ x: nx, y: ny });
        const ai = this.apples.findIndex(a => a.x === nx && a.y === ny);
        if (ai >= 0) {
          p.grow += 1; this.score++;
          this.pops.push({ x: nx, y: ny, t: 0 });
          this.apples[ai] = this.freeCell();
          this.pushScore();
        }
        if (p.grow > 0) p.grow--; else p.body.pop();
      },
      overlay(title, sub) { overlay(title, sub); },
      key(x, y) { return y * this.cols + x; },
      occupied() {
        const set = new Set();
        for (const s of this.snakes) if (!s.dead) for (const p of s.body) set.add(this.key(p.x, p.y));
        return set;
      },
      freeCell() {
        const occ = this.occupied();
        const apples = new Set(this.apples.map(a => this.key(a.x, a.y)));
        for (let t = 0; t < 300; t++) {
          const x = irand(this.cols), y = irand(this.rows), k = this.key(x, y);
          if (!occ.has(k) && !apples.has(k)) return { x, y };
        }
        return { x: irand(this.cols), y: irand(this.rows) };
      },
      spawn(i) {
        const c = this.freeCell();
        return { body: Array.from({ length: 4 }, () => ({ x: c.x, y: c.y })), grow: 0, dead: 0, dir: pick(DIRS), color: this.colors[i % this.colors.length] };
      },
      distToApple(x, y) {
        let best = Infinity;
        for (const a of this.apples) {
          const dx = Math.abs(a.x - x), dy = Math.abs(a.y - y);
          best = Math.min(best, Math.min(dx, this.cols - dx) + Math.min(dy, this.rows - dy));
        }
        return best;
      },
      step() {
        if (this.playing && this.ready) { this.playStep(); return; }
        const occ = this.occupied();
        this.pops = this.pops.filter(p => ++p.t < 5);
        this.snakes.forEach((s, i) => {
          if (s.dead) { if (++s.dead > 14) Object.assign(s, this.spawn(i)); return; }
          const head = s.body[0], tail = s.body[s.body.length - 1];
          let best = null, bestScore = Infinity;
          for (const d of DIRS) {
            if (d[0] === -s.dir[0] && d[1] === -s.dir[1]) continue;
            const nx = wrap(head.x + d[0], this.cols), ny = wrap(head.y + d[1], this.rows);
            const freesTail = s.grow === 0 && nx === tail.x && ny === tail.y;
            if (occ.has(this.key(nx, ny)) && !freesTail) continue;
            let room = 0;
            for (const e of DIRS) if (!occ.has(this.key(wrap(nx + e[0], this.cols), wrap(ny + e[1], this.rows)))) room++;
            const score = this.distToApple(nx, ny) - room * 0.7 + Math.random() * 0.9 - (d === s.dir ? 0.25 : 0);
            if (score < bestScore) { bestScore = score; best = { d, nx, ny }; }
          }
          if (!best) { s.dead = 1; return; }
          s.dir = best.d;
          s.body.unshift({ x: best.nx, y: best.ny });
          occ.add(this.key(best.nx, best.ny));
          const ai = this.apples.findIndex(a => a.x === best.nx && a.y === best.ny);
          if (ai >= 0) {
            if (s.body.length < 22) s.grow += 3;
            this.pops.push({ x: best.nx, y: best.ny, t: 0 });
            this.apples[ai] = this.freeCell();
          }
          if (s.grow > 0) s.grow--; else s.body.pop();
        });
      },
      draw() {
        const now = performance.now(), dtf = Math.min(50, now - (this._t || now)); this._t = now;
        if (this.aiA !== this.aiTarget) {
          const k = dtf / 350;
          this.aiA = this.aiA < this.aiTarget ? Math.min(this.aiTarget, this.aiA + k) : Math.max(this.aiTarget, this.aiA - k);
        }
        this.live = this.aiA !== this.aiTarget;
        const c = this.cell, cx = x => this.ox + (x + 0.5) * c, cy = y => this.oy + (y + 0.5) * c;
        for (const a of this.apples) {
          const q = side(cx(a.x), cy(a.y));
          dot(cx(a.x), cy(a.y), c * 0.44, C.warm, 0.16 * q);
          dot(cx(a.x), cy(a.y), c * 0.26, C.warm, q);
        }
        for (const p of this.pops) {
          ctx.globalAlpha = (1 - p.t / 5) * side(cx(p.x), cy(p.y));
          ctx.strokeStyle = C.warm2;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx(p.x), cy(p.y), c * (0.3 + p.t * 0.28), 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const s of this.snakes) {
          const fade = (s.dead ? 1 - s.dead / 14 : 1) * (s.player ? (this.over ? 0.35 : 1) : this.aiA), n = s.body.length;
          for (let i = n - 1; i >= 0; i--) {
            const p = s.body[i], k = i / Math.max(1, n - 1);
            dot(cx(p.x), cy(p.y), c * (0.38 - k * 0.17), s.color, (1 - k * 0.6) * fade * side(cx(p.x), cy(p.y)));
          }
          const h = s.body[0];
          dot(cx(h.x) + s.dir[0] * c * 0.14, cy(h.y) + s.dir[1] * c * 0.14, c * 0.09, C.bg, fade * side(cx(h.x), cy(h.y)));
        }
        if (this.playing && this.ready) {
          if (this.over) this.overlay('Игра окончена', 'Счёт: ' + this.score + ' · стрелка или WASD - заново');
          else if (this.waiting) this.overlay('Змейка', 'WASD или стрелки - начать');
        }
      }
    };

    const Landscape = {
      every: 140,
      reset() {
        this.layers = [
          { lift: 0.4, amp: 0.16, speed: 0.25, color: C.accDim, r: 0.17, seed: 0 },
          { lift: 0.24, amp: 0.11, speed: 0.5, color: C.acc, r: 0.21, seed: 3 },
          { lift: 0.08, amp: 0.07, speed: 1, color: C.acc2, r: 0.25, seed: 7 }
        ];
        this.gap = 14;
        this.cols = Math.ceil(W / this.gap) + 1;
        this.rows = Math.ceil(H / this.gap) + 1;
        this.t = 0;
        this.clouds = Array.from({ length: W < 640 ? 2 : 4 }, () => this.cloud(irand(this.cols)));
      },
      recolor() { if (this.layers) [C.accDim, C.acc, C.acc2].forEach((c, i) => { this.layers[i].color = c; }); },
      cloud(x) { return { x, y: 1 + irand(Math.max(2, Math.floor(this.rows * 0.22))), w: 4 + irand(6) }; },
      hill(l, i) {
        const x = i + this.t * l.speed + l.seed * 40;
        const n = Math.sin(x * 0.045) * 0.55 + Math.sin(x * 0.11 + l.seed) * 0.25 + Math.sin(x * 0.019 + 2 * l.seed) * 0.6;
        return H - l.lift * H - n * l.amp * H;
      },
      step() {
        this.t++;
        if (this.t % 3 === 0) this.clouds.forEach((c, k) => {
          c.x--;
          if (c.x + c.w < 0) this.clouds[k] = this.cloud(this.cols + irand(8));
        });
      },
      draw() {
        const g = this.gap;
        const sun = { x: W * 0.8, y: H * 0.28, r: Math.max(26, H * 0.17) };
        for (let i = 0; i < this.cols; i++) {
          const tops = this.layers.map(l => this.hill(l, i));
          for (let j = 0; j < this.rows; j++) {
            const x = i * g, y = j * g;
            let layer = -1;
            for (let k = this.layers.length - 1; k >= 0; k--) if (y > tops[k]) { layer = k; break; }
            if (layer >= 0) {
              const l = this.layers[layer];
              dot(x, y, g * l.r, l.color, 0.9 * side(x, y));
            } else if (Math.hypot(x - sun.x, y - sun.y) < sun.r) {
              dot(x, y, g * 0.24, C.warm2, 0.85 * side(x, y));
            } else {
              dot(x, y, 1, C.text, 0.08);
            }
          }
        }
        for (const c of this.clouds) {
          for (let k = 0; k < c.w; k++) dot((c.x + k) * g, c.y * g, g * 0.22, C.text, 0.35 * side((c.x + k) * g, c.y * g));
          for (let k = 1; k < c.w - 1; k++) dot((c.x + k) * g, (c.y - 1) * g, g * 0.2, C.text, 0.25 * side((c.x + k) * g, c.y * g));
        }
      }
    };

    const FONT = {
      M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
      G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
      L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
      P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
      A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
      Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
      O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
      D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
      S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
      1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
      2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
      3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
      6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
      8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
      9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
      0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
      '.': ['000', '000', '000', '000', '000', '000', '010'],
      v: ['00000', '00000', '10001', '10001', '10001', '01010', '00100'],
      ':': ['000', '010', '010', '000', '010', '010', '000'],
      ')': ['100', '010', '001', '001', '001', '010', '100'],
      ' ': ['00', '00', '00', '00', '00', '00', '00']
    };
    const DotFont = {
      every: 60,
      words: ['MGL', ':)', 'PLAY', 'MODS', '1.8.9', '1.20.1', 'v 2.0'],
      reset() {
        this.gap = 11;
        this.cols = Math.ceil(W / this.gap) + 1;
        this.rows = Math.ceil(H / this.gap) + 1;
        this.wi = 0;
        this.setWord();
      },
      setWord() {
        const word = this.words[this.wi++ % this.words.length];
        const cells = [];
        let col = 0;
        for (const ch of word) {
          const gl = FONT[ch];
          if (!gl) continue;
          gl.forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') cells.push([col + x, y]); }));
          col += gl[0].length + 1;
        }
        const g = this.gap, s = this.rows >= 21 && (col - 1) * 2 <= this.cols * 0.55 ? 2 : 1, width = (col - 1) * s;
        const x0 = Math.max(1, this.cols - width - 5);
        const y0 = s === 2 ? 1 : 2;
        this.lit = [];
        for (const [x, y] of cells)
          for (let a = 0; a < s; a++) for (let b = 0; b < s; b++)
            this.lit.push([(x0 + x * s + a) * g, (y0 + y * s + b) * g]);
        this.lit.sort(() => Math.random() - 0.5);
        this.per = s * s * 2;
        this.on = 0; this.hold = 0; this.phase = 'in';
      },
      step() {
        if (this.phase === 'in') {
          this.on = Math.min(this.lit.length, this.on + this.per);
          if (this.on === this.lit.length) this.phase = 'hold';
        } else if (this.phase === 'hold') {
          if (++this.hold > 40) this.phase = 'out';
        } else {
          this.on = Math.max(0, this.on - this.per * 1.5);
          if (this.on === 0) this.setWord();
        }
      },
      draw() {
        const g = this.gap;
        for (let i = 0; i < this.cols; i++)
          for (let j = 0; j < this.rows; j++) dot(i * g, j * g, 1.1, C.text, 0.1 * side(i * g, j * g));
        const fresh = this.phase === 'in' ? this.on - this.per : Infinity;
        for (let k = 0; k < this.on; k++) {
          const [x, y] = this.lit[k];
          dot(x, y, g * 0.36, k >= fresh ? C.warm2 : C.acc, 0.95 * side(x, y));
        }
      }
    };

    // ---------- Мини-игры (5 быстрых кликов по hero) ----------
    // Общий контракт игры: reset() - раскладка под W×H + новый раунд, start()/end(), step() с шагом every,
    // draw(), onKey(e) → true если клавиша съедена, onKeyUp(e), onPointer(type, x, y, e), onWheel(dy).
    const gameBase = {
      every: 1000 / 60, flat: true, live: false, playing: false, inited: false, cursor: '',
      start() { this.playing = true; this.live = true; if (canvas) canvas.style.cursor = this.cursor; },
      end() { this.playing = false; this.live = false; if (canvas) canvas.style.cursor = ''; }
    };

    // Хром-динозаврик в точках (фон «Пиксельный пейзаж»)
    const DINO_BODY = [
      '000000111110', '000001101111', '000001111111', '000001111111', '000001111000', '000001111110',
      '100011110000', '110111111100', '111111110100', '011111110000', '001111100000'
    ];
    const DUCK_BODY = ['000000000011110', '100000111110111', '111111111111111', '011111111111100', '001111111100000'];
    const DINO_SP = {
      jump: spr(DINO_BODY.concat(['000101000000', '000110110000'])),
      runA: spr(DINO_BODY.concat(['000101000000', '000110000000'])),
      runB: spr(DINO_BODY.concat(['000101000000', '000000110000'])),
      duckA: spr(DUCK_BODY.concat(['000101000000000', '000110000000000'])),
      duckB: spr(DUCK_BODY.concat(['000101000000000', '000000110000000']))
    };
    const CACTUS = {
      small: spr(['00100', '00101', '10101', '10101', '10111', '11100', '00100', '00100']),
      big: spr(['0001000', '0011100', '0011101', '1011101', '1011101', '1011101', '1111111', '0011100', '0011100', '0011100', '0011100'])
    };
    const BIRD = [
      spr(['0000100000', '0000110000', '0100111000', '1111111111', '0001111110', '0000000000', '0000000000']),
      spr(['0000000000', '0100000000', '1111111111', '0001111110', '0000111000', '0000110000', '0000100000'])
    ];
    const hash = (n, m) => (Math.imul(n | 0, 2654435761) >>> 0) % m;
    const Dino = Object.assign({}, gameBase, {
      best: loadNum('mgl.dinoBest'),
      reset() {
        this.s = Math.max(4, Math.min(7, Math.round(H / 75)));
        const s = this.s;
        this.ground = Math.round(H * 0.8 / s) * s;
        this.dx = Math.round(W * 0.12 / s) * s;
        if (!this.inited || this.waiting) this.newRound();
        this.inited = W > 0;
      },
      newRound() {
        this.y = 0; this.vy = 0; this.duck = false; this.obs = []; this.dist = 0; this.speed = 50;
        this.score = 0; this.next = 40; this.over = false; this.waiting = true; this.frame = 0; this.cheat = false;
        this.clouds = Array.from({ length: W < 640 ? 2 : 4 }, () => ({ x: rand(0, W), y: rand(H * 0.08, H * 0.38), w: 3 + irand(5) }));
        this.pushScore();
      },
      pushScore() { hud([['Рекорд', String(this.best).padStart(5, '0')], ['Счёт', String(Math.floor(this.score)).padStart(5, '0')]]); },
      press() {
        if (this.over) { this.newRound(); this.waiting = false; return; }
        if (this.waiting) this.waiting = false;
        if (this.y === 0 && !this.duck) this.vy = 100;
      },
      onKey(e) {
        if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { if (!e.repeat) this.press(); return true; }
        return ['ArrowDown', 'KeyS'].includes(e.code);
      },
      onKeyUp(e) { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code) && this.vy > 38) this.vy = 38; },
      onPointer(type) { if (type === 'pointerdown') this.press(); },
      spawn() {
        const s = this.s;
        if (this.score > 250 && Math.random() < 0.3) {
          this.obs.push({ bird: true, sp: BIRD[0], x: W + 10, y: pick([1, 9, 17]) });
        } else {
          const big = this.score > 120 && Math.random() < 0.4, sp = big ? CACTUS.big : CACTUS.small;
          const n = 1 + irand(big ? 2 : 3);
          for (let k = 0; k < n; k++) this.obs.push({ sp, x: W + 10 + k * (sp.w + 1) * s, y: 0 });
        }
        this.next = this.speed * rand(0.7, 1.35) + 14;
      },
      box(o) {
        const s = this.s, top = this.ground - (o.y + o.sp.h) * s;
        return [o.x + s * 0.7, top + s * 0.7, (o.sp.w - 1.4) * s, (o.sp.h - 1.4) * s];
      },
      dinoBox() {
        const s = this.s;
        if (this.duck) return [this.dx + s, this.ground - 6 * s, 13 * s, 6 * s];
        const top = this.ground - (this.y + 13) * s;
        return [this.dx + 2 * s, top + s, 8 * s, 11.5 * s];
      },
      step() {
        this.frame++;
        if (this.waiting || this.over) return;
        const dt = this.every / 1000, s = this.s, down = held.has('ArrowDown') || held.has('KeyS');
        this.speed = Math.min(105, this.speed + dt * 1.1);
        const v = this.speed * s * dt;
        this.dist += v;
        this.score += this.speed * dt * 0.18;
        if (this.y > 0 || this.vy > 0) {
          this.vy -= (down ? 560 : 240) * dt;
          this.y += this.vy * dt;
          if (this.y <= 0) { this.y = 0; this.vy = 0; }
        }
        this.duck = down && this.y === 0;
        for (const o of this.obs) { o.x -= v * (o.bird ? 1.12 : 1); if (o.bird) o.sp = BIRD[(this.frame >> 3) & 1]; }
        this.obs = this.obs.filter(o => o.x + o.sp.w * s > -20);
        if ((this.next -= this.speed * dt) <= 0) this.spawn();
        for (const c of this.clouds) {
          c.x -= v * 0.15;
          if (c.x + c.w * s * 2 < 0) { c.x = W + rand(0, 120); c.y = rand(H * 0.08, H * 0.38); }
        }
        const a = this.dinoBox();
        if (god()) this.cheat = true;
        else for (const o of this.obs) {
          const b = this.box(o);
          if (a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]) {
            this.over = true;
            const sc = Math.floor(this.score);
            if (sc > this.best && !this.cheat) { this.best = sc; saveNum('mgl.dinoBest', sc); }
            break;
          }
        }
        this.pushScore();
      },
      draw() {
        const s = this.s, g = s * 2;
        drawGrid(g, 0.9, C.text, 0.09);
        // солнце и дальние холмы - как в пейзаже
        const sun = { x: W * 0.82, y: H * 0.24, r: Math.max(24, H * 0.12) };
        ctx.globalAlpha = 0.85; ctx.fillStyle = C.warm2; ctx.beginPath();
        for (let x = g / 2; x < W; x += g) for (let y = g / 2; y < H * 0.5; y += g)
          if (Math.hypot(x - sun.x, y - sun.y) < sun.r) { ctx.moveTo(x + s * 0.6, y); ctx.arc(x, y, s * 0.6, 0, Math.PI * 2); }
        ctx.fill();
        const far = this.dist * 0.12, fo = far % g, fi = Math.floor(far / g);
        ctx.globalAlpha = 0.5; ctx.fillStyle = C.accDim; ctx.beginPath();
        for (let i = 0, x = g / 2 - fo; x < W + g; i++, x += g) {
          const wi = i + fi, top = this.ground - H * (0.14 + 0.08 * Math.sin(wi * 0.09) + 0.05 * Math.sin(wi * 0.23 + 1));
          for (let y = this.ground - g; y > top; y -= g) { ctx.moveTo(x + s * 0.55, y); ctx.arc(x, y, s * 0.55, 0, Math.PI * 2); }
        }
        ctx.fill();
        for (const c of this.clouds)
          for (let k = 0; k < c.w; k++) {
            dot(c.x + k * g, c.y, s * 0.5, C.text, 0.32);
            if (k && k < c.w - 1) dot(c.x + k * g, c.y - g, s * 0.45, C.text, 0.22);
          }
        // земля: линия + камешки, едут вместе с миром
        const go = this.dist % s, gi = Math.floor(this.dist / s);
        ctx.globalAlpha = 0.9; ctx.fillStyle = C.acc; ctx.beginPath();
        for (let k = 0, x = s / 2 - go; x < W + s; k++, x += s) {
          const y = this.ground + s * 0.5;
          ctx.moveTo(x + s * 0.36, y); ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
          const h = hash(gi + k, 13);
          if (h === 0 || h === 5) { ctx.moveTo(x + s * 0.3, y + s * 2); ctx.arc(x, y + s * 2, s * 0.3, 0, Math.PI * 2); }
          if (h === 3) { ctx.moveTo(x + s * 0.3, y + s * 3.5); ctx.arc(x, y + s * 3.5, s * 0.3, 0, Math.PI * 2); }
        }
        ctx.fill();
        for (const o of this.obs) sprite(o.sp, o.x, this.ground - (o.y + o.sp.h) * s, s, o.bird ? C.warm : C.acc, 1);
        const run = (this.frame >> 3) & 1;
        const sp = this.duck ? (run ? DINO_SP.duckA : DINO_SP.duckB)
          : (this.y > 0 || this.waiting || this.over) ? DINO_SP.jump : (run ? DINO_SP.runA : DINO_SP.runB);
        sprite(sp, this.dx, this.ground - this.y * s - sp.h * s, s, C.acc2, this.over ? 0.5 : 1);
        if (this.waiting) overlay('Динозаврик', 'Пробел / ↑ / клик - прыжок · ↓ - пригнуться', H * 0.42);
        else if (this.over) overlay('Игра окончена', 'Счёт: ' + Math.floor(this.score) + ' · пробел - заново', H * 0.42);
      }
    });

    // Пинг-понг (фон «Градиент»)
    const Pong = Object.assign({}, gameBase, {
      cursor: 'none', target: 7,
      wins: loadNum('mgl.pongWins'),
      reset() {
        this.k = Math.max(0.75, Math.min(1.3, H / 420));
        this.ph = 80 * this.k; this.pw = 10; this.pad = 26; this.r = 7 * this.k;
        if (!this.inited || this.waiting) this.newMatch();
        else { this.bx = Math.min(this.bx, W); this.by = Math.min(this.by, H); }
        this.inited = W > 0;
      },
      newMatch() {
        this.me = 0; this.ai = 0; this.py = this.ay = H / 2; this.mouse = null;
        this.over = false; this.waiting = true; this.serveTo = -1; this.parts = []; this.trail = []; this.aiErr = 0; this.cheat = false;
        this.resetBall();
        this.pushScore();
      },
      resetBall() { this.bx = W / 2; this.by = H / 2; this.bvx = this.bvy = 0; this.serveT = 0.7; this.trail = []; },
      speed0() { return Math.max(300, W * 0.42); },
      pushScore() { hud([['Вы', this.me], ['ИИ', this.ai], ['Побед', this.wins]]); },
      press() {
        if (this.over) { this.newMatch(); this.waiting = false; return; }
        this.waiting = false;
      },
      onKey(e) {
        if (e.code === 'Space') { if (!e.repeat) this.press(); return true; }
        if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) { if (this.waiting) this.waiting = false; return true; }
        return false;
      },
      onPointer(type, x, y) {
        if (type === 'pointermove' || type === 'pointerdown') this.mouse = y;
        if (type === 'pointerdown') this.press();
      },
      sparks(x, y, dir, color) {
        for (let i = 0; i < 10; i++) {
          const a = rand(-1.1, 1.1) + (dir < 0 ? Math.PI : 0), v = rand(80, 260);
          this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.5), color });
        }
      },
      point(meScored) {
        if (meScored) this.me++; else this.ai++;
        this.sparks(meScored ? W - 4 : 4, this.by, meScored ? -1 : 1, meScored ? C.acc2 : C.hot);
        this.serveTo = meScored ? 1 : -1;
        if (this.me >= this.target || this.ai >= this.target) {
          this.over = true;
          if (this.me > this.ai && !this.cheat) { this.wins++; saveNum('mgl.pongWins', this.wins); }
        }
        this.resetBall();
        this.pushScore();
      },
      step() {
        const dt = this.every / 1000, half = this.ph / 2, lim = y => Math.max(half + 6, Math.min(H - half - 6, y));
        const up = held.has('ArrowUp') || held.has('KeyW'), dn = held.has('ArrowDown') || held.has('KeyS');
        if (up || dn) { this.mouse = null; this.py += ((dn ? 1 : 0) - (up ? 1 : 0)) * 560 * this.k * dt; }
        else if (this.mouse != null) this.py += (this.mouse - this.py) * Math.min(1, dt * 20);
        this.py = lim(this.py);
        this.parts = this.parts.filter(p => (p.life -= dt) > 0);
        for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; }
        // ИИ: следит за мячом, когда тот летит к нему, с ошибкой прицеливания
        const coming = this.bvx > 0 && this.bx > W * 0.35;
        const tgt = coming ? this.by + this.aiErr : H / 2;
        const aiMax = (300 + this.me * 18) * this.k * dt;
        this.ay = lim(this.ay + Math.max(-aiMax, Math.min(aiMax, tgt - this.ay)));
        if (this.waiting || this.over) return;
        if (god()) this.cheat = true;
        if (this.serveT > 0) {
          if ((this.serveT -= dt) <= 0) {
            const a = rand(-0.45, 0.45), v = this.speed0();
            this.bvx = Math.cos(a) * v * this.serveTo; this.bvy = Math.sin(a) * v;
          }
          return;
        }
        const r = this.r, xL = this.pad + this.pw, xR = W - this.pad - this.pw;
        for (let k = 0; k < 2; k++) {
          this.bx += this.bvx * dt / 2; this.by += this.bvy * dt / 2;
          if (this.by < r) { this.by = r; this.bvy = Math.abs(this.bvy); }
          if (this.by > H - r) { this.by = H - r; this.bvy = -Math.abs(this.bvy); }
          const hit = (py, dir) => {
            const off = Math.max(-1, Math.min(1, (this.by - py) / half)), a = off * 1.0;
            const v = Math.min(this.speed0() * 2.3, Math.hypot(this.bvx, this.bvy) * 1.06);
            this.bvx = Math.cos(a) * v * dir; this.bvy = Math.sin(a) * v;
          };
          // в режиме бога ракетка игрока отбивает всё (мяч не пролетает мимо)
          if (this.bvx < 0 && this.bx - r <= xL && this.bx > this.pad - r && (god() || Math.abs(this.by - this.py) <= half + r)) {
            this.bx = xL + r; hit(this.py, 1); this.sparks(this.bx, this.by, 1, C.acc2);
            this.aiErr = rand(-1, 1) * half * (0.35 + Math.min(0.6, this.me * 0.04));
          }
          if (this.bvx > 0 && this.bx + r >= xR && this.bx < W - this.pad + r && Math.abs(this.by - this.ay) <= half + r) {
            this.bx = xR - r; hit(this.ay, -1); this.sparks(this.bx, this.by, -1, C.warm2);
          }
        }
        this.trail.push([this.bx, this.by]);
        if (this.trail.length > 12) this.trail.shift();
        if (this.bx < -30) this.point(false);
        else if (this.bx > W + 30) this.point(true);
      },
      draw() {
        for (let y = 12; y < H; y += 18) dot(W / 2, y, 2.2, C.text, 0.16);
        ctx.globalAlpha = 0.13; ctx.fillStyle = C.text; ctx.font = `700 ${Math.round(64 * this.k)}px sans-serif`;
        ctx.textAlign = 'right'; ctx.fillText(this.me, W / 2 - 34, 30 + 64 * this.k);
        ctx.textAlign = 'left'; ctx.fillText(this.ai, W / 2 + 34, 30 + 64 * this.k);
        ctx.textAlign = 'start';
        const paddle = (x, y, color) => {
          ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y - this.ph / 2, this.pw, this.ph, this.pw / 2); else ctx.rect(x, y - this.ph / 2, this.pw, this.ph);
          ctx.fill(); ctx.shadowBlur = 0;
        };
        paddle(this.pad, this.py, C.acc2);
        paddle(W - this.pad - this.pw, this.ay, C.warm);
        const n = this.trail.length;
        this.trail.forEach((p, i) => dot(p[0], p[1], this.r * (i + 1) / n, C.acc2, 0.3 * (i + 1) / n));
        for (const p of this.parts) dot(p.x, p.y, 2, p.color, Math.min(1, p.life * 3));
        if (!this.over) {
          ctx.shadowColor = C.text; ctx.shadowBlur = 14;
          dot(this.bx, this.by, this.r, C.text, this.serveT > 0 ? 0.4 + 0.4 * Math.sin(performance.now() / 90) : 1);
          ctx.shadowBlur = 0;
        }
        if (this.waiting) overlay('Пинг-понг', `Мышь или W/S - ракетка · до ${this.target} очков · пробел / клик - старт`, H * 0.62);
        else if (this.over) overlay(this.me > this.ai ? 'Победа!' : 'Поражение', `${this.me} : ${this.ai} · пробел - ещё раз`, H * 0.62);
      }
    });

    // «Уклонись в ритм» (фон «Визуализатор») - атаки под собственный синтезированный трек
    const CHORDS = [[110, 130.81, 164.81], [87.31, 110, 130.81], [130.81, 164.81, 196], [98, 123.47, 146.83]]; // Am F C G
    const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
    const Beat = {
      bpm: 128, ac: null, muted: loadNum('mgl.dodgeMute') === 1,
      start() {
        this.step16 = 0;
        this.nextP = performance.now() + 80;
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          this.out = ac.createGain(); this.out.gain.value = this.muted ? 0 : 0.22; this.out.connect(ac.destination);
          this.noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
          const d = this.noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          this.ac = ac; this.next = ac.currentTime + 0.08;
        } catch (e) { this.ac = null; }
      },
      stop() {
        const ac = this.ac;
        this.ac = null;
        if (!ac) return;
        try { this.out.gain.setTargetAtTime(0, ac.currentTime, 0.05); } catch (e) {}
        setTimeout(() => { try { ac.close(); } catch (e) {} }, 300);
      },
      setMuted(m) {
        this.muted = m; saveNum('mgl.dodgeMute', m ? 1 : 0);
        if (this.ac) this.out.gain.setTargetAtTime(m ? 0 : 0.22, this.ac.currentTime, 0.03);
      },
      // планирует 16-е доли чуть вперёд; onStep(i, когда - в performance.now())
      pump(onStep) {
        const sp = 60 / this.bpm / 4;
        // контекст без жеста пользователя может быть suspended - тогда ритм идёт по таймеру, без звука
        if (this.ac && this.ac.state === 'suspended' && !this._resuming) {
          this._resuming = true;
          this.ac.resume().catch(() => {}).then(() => { this._resuming = false; });
        }
        if (this.ac && this.ac.state === 'running') {
          const now = this.ac.currentTime;
          if (this.next < now - 0.2) this.next = now + 0.05;
          while (this.next < now + 0.12) {
            this.play(this.step16, this.next);
            onStep(this.step16, performance.now() + (this.next - now) * 1000);
            this.next += sp; this.step16++;
          }
        } else {
          const now = performance.now();
          if (this.nextP < now - 200) this.nextP = now + 50;
          while (this.nextP < now + 120) { onStep(this.step16, this.nextP); this.nextP += sp * 1000; this.step16++; }
        }
      },
      tone(t, f, type, vol, dur, cut) {
        const ac = this.ac, o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
        o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(fl); fl.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
      },
      hit(t, type, f, vol, dur) {
        const ac = this.ac, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = this.noise; fl.type = type; fl.frequency.value = f;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t); s.stop(t + dur + 0.02);
      },
      kick(t) {
        const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.32);
      },
      play(i, t) {
        const n = i % 16, bar = Math.floor(i / 16), sec = Beat.section(bar), ch = CHORDS[bar % 4];
        const hard = sec >= 2, roll = (sec === 1 && bar % 4 === 3) || bar % this.LOOP === 19 || bar % this.LOOP === 27;
        if (n % 4 === 0 && (sec > 0 || n % 8 === 0)) this.kick(t);
        if (hard && (n === 4 || n === 12)) { this.hit(t, 'bandpass', 1800, 0.55, 0.16); this.tone(t, 190, 'triangle', 0.25, 0.08, 2000); }
        if (roll && n >= 8) this.hit(t, 'bandpass', 2000, 0.12 + (n - 8) * 0.04, 0.08);
        if (n % 2 === 0 || hard) this.hit(t, 'highpass', 7000, n % 4 === 2 ? 0.16 : 0.08, 0.05);
        if (sec >= 1 && n % 2 === 1) this.tone(t, ch[0], 'sawtooth', 0.26, 0.17, 650);
        if (sec === 2) this.tone(t, ch[ARP[n % 8]] * 4, 'square', 0.045, 0.12, 2600);
        // фаза «окно»: плотный октавный бас и тёмное медленное арпеджио
        if (sec === 3 && n % 2 === 0) this.tone(t, ch[0] * 2, 'sawtooth', 0.14, 0.1, 900);
        if (sec === 3 && n % 4 === 0) this.tone(t, ch[ARP[(n / 4 + bar) % 8]] * 2, 'square', 0.06, 0.4, 1500);
        // финал с бластерами: октавный бас + быстрое звенящее арпеджио
        if (sec === 4 && n % 2 === 0) this.tone(t, ch[0] * 2, 'sawtooth', 0.16, 0.09, 1100);
        if (sec === 4) this.tone(t, ch[ARP[(n * 5 + bar) % 8]] * 4, 'triangle', 0.09, 0.09, 3200);
      },
      // зарядка бластера (свист вверх) и залп через delay секунд
      zap(delay) {
        const ac = this.ac;
        if (!ac || ac.state !== 'running') return;
        const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(1100, t + delay);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + delay); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.05);
        o.connect(g); g.connect(this.out); o.start(t); o.stop(t + delay + 0.1);
        this.hit(t + delay, 'lowpass', 1400, 0.45, 0.35);
      },
      // 34 такта по кругу: 0–3 вступление, 4–7 нарастание, 8–19 дроп (14–19 - стены по бокам), 20–27 «окно»,
      // 28–33 финал с бластерами по кругу
      LOOP: 34,
      section(bar) { const b = bar % this.LOOP; return b < 4 ? 0 : b < 8 ? 1 : b < 20 ? 2 : b < 28 ? 3 : 4; },
      walls(bar) { const b = bar % this.LOOP; return b >= 14 && b < 20; }
    };
    // «Голос» Санса при печати текста: оригинальный блип из assets/audio/voice.mp3 на каждую букву
    // (пока файл не загрузился или не декодировался - синтезированный блип). В игре идёт в общий выход трека
    // (уважает M), вне игры - через свой AudioContext.
    const Voice = {
      ac: null, raw: null, bufs: new WeakMap(),
      load() {
        if (!this._loading) this._loading = new Promise(done => {
          try {
            const x = new XMLHttpRequest();   // XHR, а не fetch: в Electron страница открыта по file://
            x.open('GET', 'assets/audio/voice.mp3'); x.responseType = 'arraybuffer';
            x.onload = () => { if (x.response && x.response.byteLength) this.raw = x.response; done(); };
            x.onerror = () => done();
            x.send();
          } catch (e) { done(); }
        });
        return this._loading;
      },
      // загрузить и декодировать заранее, чтобы первые буквы не прозвучали синтезом
      ready() {
        // шрифт Comic Sans (@font-face MglSans) canvas сам не подгрузит - просим заранее
        try { if (document.fonts) document.fonts.load('17px MglSans').catch(() => {}); } catch (e) {}
        return this.load().then(() => {
          if (!this.raw) return;
          // и для контекста трека (даже если он ещё suspended), и для того, куда звук пойдёт прямо сейчас
          const list = [...new Set([Beat.ac, this.out()[0]])].filter(ac => ac && !(this.bufs.get(ac) instanceof AudioBuffer));
          return Promise.all(list.map(ac => ac.decodeAudioData(this.raw.slice(0)).then(buf => this.bufs.set(ac, buf), () => {})));
        });
      },
      // декодированный буфер под конкретный AudioContext (у трека игры и у Voice контексты разные)
      buffer(ac) {
        if (!this.raw) return null;
        const b = this.bufs.get(ac);
        if (b && b !== 'pending') return b;
        if (!b) {
          this.bufs.set(ac, 'pending');
          ac.decodeAudioData(this.raw.slice(0)).then(buf => this.bufs.set(ac, buf), () => this.bufs.delete(ac));
        }
        return null;
      },
      out() {
        if (Beat.ac && Beat.ac.state === 'running') return [Beat.ac, Beat.out];
        try {
          if (!this.ac) { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.gain = this.ac.createGain(); this.gain.gain.value = 0.9; this.gain.connect(this.ac.destination); }
          if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
          return [this.ac, this.gain];
        } catch (e) { return [null, null]; }
      },
      blip() {
        const [ac, dest] = this.out();
        if (!ac) return;
        const buf = this.buffer(ac);
        if (buf) {
          // новый блип обрывает предыдущий - как в оригинале, без наслоения
          try { if (this.src) this.src.stop(); } catch (e) {}
          const s = ac.createBufferSource();
          s.buffer = buf; s.connect(dest); s.start();
          this.src = s;
          return;
        }
        const t = ac.currentTime + 0.005, f0 = 150 + Math.random() * 25;
        const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.06);
        o2.type = 'triangle'; o2.frequency.setValueAtTime(f0 * 2.02, t);
        fl.type = 'lowpass'; fl.frequency.value = 1300; fl.Q.value = 5;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
        o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(dest);
        o.start(t); o2.start(t); o.stop(t + 0.09); o2.stop(t + 0.09);
      },
      // пауза после символа: на знаках препинания дольше, как в диалогах
      delay(ch) { return /[.!?…]/.test(ch) ? 220 : /[,;:-]/.test(ch) ? 120 : 45; },
      voiced(ch) { return /[0-9A-Za-zА-Яа-яЁё]/.test(ch); },
      // проговорить строку без игры (кнопка в Дебаге)
      say(text) {
        clearTimeout(this._t);
        let i = 0;
        const tick = () => {
          if (i >= text.length) return;
          const ch = text[i++];
          if (this.voiced(ch)) this.blip();
          this._t = setTimeout(tick, this.delay(ch));
        };
        this.ready().then(tick);
      }
    };
    const Dodge = Object.assign({}, gameBase, {
      cursor: 'none',
      best: loadNum('mgl.dodgeBest') / 10,
      reset() {
        if (!this.inited || this.waiting) this.newRound();
        else { this.px = Math.min(this.px, W - this.pr); this.py = Math.min(this.py, H - this.pr); }
        this.inited = W > 0;
      },
      newRound() {
        Beat.stop();
        this.px = W * 0.3; this.py = H * 0.5; this.pr = 7; this.hp = 3; this.inv = 0; this.dashT = 0; this.dashCd = 0;
        this.dir = [1, 0]; this.trail = []; this.atk = []; this.sched = []; this.time = 0; this.pulse = 0; this.shake = 0; this.flash = 0;
        this.walls = null; this.box = null; this.gAng = 0; this.caption = null;
        this.over = false; this.waiting = true; this.cheat = false;
        this.pushScore();
      },
      begin() { this.newRound(); this.waiting = false; Beat.start(); Voice.ready(); },
      end() { Beat.stop(); gameBase.end.call(this); },
      pushScore() {
        hud([['Время', this.time.toFixed(1)], ['Рекорд', this.best.toFixed(1)], ['HP', '●'.repeat(Math.max(0, this.hp)) + '○'.repeat(Math.max(0, 3 - this.hp))]],
          Beat.muted ? 'звук выкл · M' : '');
      },
      onKey(e) {
        if (e.code === 'KeyM') { Beat.setMuted(!Beat.muted); this.pushScore(); return true; }
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          if (e.repeat) return true;
          if (this.waiting || this.over) { if (e.code === 'Space') this.begin(); }
          else if (this.dashCd <= 0) { this.dashT = 0.16; this.dashCd = 0.45; }
          return true;
        }
        return !!KEYMAP[e.code];
      },
      onPointer(type) { if (type === 'pointerdown' && (this.waiting || this.over)) this.begin(); },
      beatMs() { return 60000 / Beat.bpm; },
      beam(vertical, pos, width) {
        const now = performance.now(), b = this.beatMs();
        this.atk.push({ kind: 'beam', vertical, pos, width, warn: now + b, hit: now + b * 1.4, gone: now + b * 1.8 });
      },
      ring(x, y, n, speed) {
        const a0 = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) {
          const a = a0 + i / n * Math.PI * 2;
          this.atk.push({ kind: 'b', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6 });
        }
      },
      eq(fromTop) {
        const now = performance.now(), b = this.beatMs(), n = 18, safe = irand(n);
        const hs = Array.from({ length: n }, (_, i) => Math.abs(i - safe) <= 1 ? 0.06 : rand(0.15, 0.5));
        this.atk.push({ kind: 'eq', fromTop, hs, warn: now + b, hit: now + b * 2, gone: now + b * 2.4 });
      },
      // Стены по бокам: столбик квадратов слева и справа, каждый ездит влево-вправо (фаза качания своя у ряда)
      WALL_ROWS: 4,
      wallDepth(side, i, now) {
        const w = this.walls, b = this.beatMs();
        if (!w) return 0;
        const enter = Math.min(1, (now - w.start) / (b * 2)), leave = w.leave ? Math.max(0, 1 - (now - w.leave) / b) : 1;
        const e = Math.min(enter, leave), ease = e * e * (3 - 2 * e);
        const ph = now / b * Math.PI / 2 + i * 1.1 + (side > 0 ? Math.PI : 0);
        return W * (0.07 + 0.13 * (0.5 + 0.5 * Math.sin(ph)) + 0.02 * this.pulse) * ease;
      },
      wallRects(now) {
        const out = [], rows = this.WALL_ROWS, s = H / rows;
        for (let i = 0; i < rows; i++) for (const side of [-1, 1]) {
          const d = this.wallDepth(side, i, now);
          if (d <= 0) continue;
          out.push({ x: side < 0 ? d - s : W - d, y: i * s + 3, w: s, h: s - 6, side });
        }
        return out;
      },
      // Фаза «окно»: всё поле - гигантские блоки, свободен только маленький квадрат, который ползает по экрану
      // окно = ровно одна клетка сетки блоков; сетка неподвижна и отцентрована, окно ходит на соседние клетки
      BOX_CELL: 96,
      boxStart(now) {
        const b = this.beatMs(), cell = this.BOX_CELL;
        const cols = Math.max(1, Math.floor(W / cell)), rows = Math.max(1, Math.floor(H / cell));
        const gox = (W - cols * cell) / 2, goy = (H - rows * cell) / 2;
        const ci = Math.max(0, Math.min(cols - 1, Math.floor((this.px - gox) / cell)));
        const cj = Math.max(0, Math.min(rows - 1, Math.floor((this.py - goy) / cell)));
        const cx = gox + (ci + 0.5) * cell, cy = goy + (cj + 0.5) * cell;
        // смыкание растянуто на 6 долей, раскрытие - на 2
        this.box = { cell, cols, rows, gox, goy, ci, cj, cx, cy, tx: cx, ty: cy, size: cell, start: now, shut: now + b * 6, open: now + b * 30, end: now + b * 32 };
      },
      boxMove() {
        const bx = this.box;
        if (bx.cx !== bx.tx || bx.cy !== bx.ty) return;
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dx, dy]) => [bx.ci + dx, bx.cj + dy])
          .filter(([i, j]) => i >= 0 && j >= 0 && i < bx.cols && j < bx.rows && !(i === bx.pi && j === bx.pj));
        if (!opts.length) return;
        const [i, j] = pick(opts);
        bx.pi = bx.ci; bx.pj = bx.cj; bx.ci = i; bx.cj = j;
        bx.tx = bx.gox + (i + 0.5) * bx.cell; bx.ty = bx.goy + (j + 0.5) * bx.cell;
      },
      boxRect(now) {
        const bx = this.box;
        if (!bx) return null;
        const b = this.beatMs(), big = Math.max(W, H) * 2.2;
        let k = 1;
        if (now < bx.shut) k = (now - bx.start) / (bx.shut - bx.start);
        else if (now > bx.open) k = 1 - (now - bx.open) / (bx.end - bx.open);
        k = Math.max(0, Math.min(1, k)); k = k * k * (3 - 2 * k);
        const s = big + (bx.size - big) * k;
        return { x: bx.cx - s / 2, y: bx.cy - s / 2, s, closed: now >= bx.shut && now <= bx.open, k };
      },
      // Бластер: стоит за краем экрана и бьёт широким лучом по прямой через точку (cx, cy) в направлении ang.
      // На экране видно только место входа луча (ex, ey) - там копится заряд.
      gaster(ang, cx = W / 2, cy = H / 2) {
        const now = performance.now(), b = this.beatMs(), dx = Math.cos(ang), dy = Math.sin(ang);
        let t = Infinity;   // расстояние от точки назад до края экрана
        if (dx > 1e-6) t = Math.min(t, cx / dx); else if (dx < -1e-6) t = Math.min(t, (cx - W) / dx);
        if (dy > 1e-6) t = Math.min(t, cy / dy); else if (dy < -1e-6) t = Math.min(t, (cy - H) / dy);
        if (!isFinite(t)) t = 0;
        this.atk.push({
          kind: 'gb', x: cx - dx * (t + 80), y: cy - dy * (t + 80), ex: cx - dx * t, ey: cy - dy * t, dx, dy, ang, w: 56,
          born: now, warn: now + b * 1.25, hit: now + b * 1.8, gone: now + b * 2.2
        });
        Beat.zap(b * 1.25 / 1000);
      },
      // Финал (такты 28–33): прицельные залпы → вращающийся веер лучей через центр (бегать по кругу) → кресты
      gasterBeat(gb, n, now) {
        const P = Math.PI;
        if (gb === 0 && n === 0) this.say('* Ты чувствуешь, как по спине пробегают мурашки.', 4);
        if (gb === 0 && (n === 4 || n === 8 || n === 12)) this.gaster(rand(0, P * 2), this.px, this.py);
        if (gb === 0 && n === 12) this.gAng = Math.atan2(this.py - H / 2, this.px - W / 2) + P / 2;
        // Веер через центр. Скорость вращения везде 45° за долю, меняется только плотность лучей - без рывков.
        // Разворот (такт 32) - шаг плавно уходит из +22.5° через 0 в −22.5° (косинус), а не переключается мгновенно.
        let every = 0, step = 0;
        if (gb === 1) { every = 4; step = P / 4; }
        else if (gb === 2) { every = n < 8 ? 4 : 2; step = n < 8 ? P / 4 : P / 8; }
        else if (gb === 3) { every = 2; step = P / 8; }
        else if (gb === 4) { every = 2; step = P / 8 * Math.cos(P * n / 16); }
        else if (gb === 5 && n < 8) { every = 2; step = -P / 8; }
        if (every && n % every === 0) { this.gAng += step; this.gaster(this.gAng); }
        // антикемпинг: у краёв и в углах луч веера почти не достаёт (там он далеко от центра, между лучами большие щели),
        // поэтому, пока игрок жмётся к рамке, на каждой второй доле по нему бьют вдоль этой рамки - надо уходить внутрь
        if (gb >= 1 && n % 4 === 2) {
          const m = 80, nearX = this.px < m || this.px > W - m, nearY = this.py < m || this.py > H - m;
          if (nearX) this.gaster(P / 2, this.px, this.py);
          if (nearY) this.gaster(0, this.px, this.py);
        }
        // финальный крест - между последними лучами веера, после короткой паузы
        if (gb === 5 && n === 10) for (let k = 0; k < 4; k++) this.gaster(this.gAng - P / 16 + k * P / 4);
        if (gb === 5 && n === 14) this.say('* …а ты неплох.', 4);
      },
      // надпись в диалоговом окне: печатается по буквам под «голос»; hold - сколько долей висит после печати
      say(text, hold) { this.caption = { text, shown: 0, next: performance.now(), hold: hold * this.beatMs(), until: Infinity }; },
      drawBlaster(a, now) {
        const b = this.beatMs(), GLOW = '#7fd8ff';
        const firing = now >= a.warn, fade = now >= a.hit ? Math.max(0, 1 - (now - a.hit) / (a.gone - a.hit)) : 1;
        const charge = firing ? 1 : Math.max(0, Math.min(1, (now - a.born) / (a.warn - a.born)));
        const appear = Math.min(1, (now - a.born) / (b * 0.35));
        const L = Math.hypot(W, H) * 1.4;
        ctx.save();
        ctx.translate(a.x, a.y); ctx.rotate(a.ang);
        if (!firing) {
          // прицел: пунктир по границам будущего луча + тонкая «нить» по центру, крепнет по мере заряда
          ctx.globalAlpha = (0.2 + 0.18 * Math.sin(now / 50)) * appear; ctx.strokeStyle = C.text; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.moveTo(0, -a.w / 2); ctx.lineTo(L, -a.w / 2); ctx.moveTo(0, a.w / 2); ctx.lineTo(L, a.w / 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.45 * charge * appear; ctx.fillStyle = GLOW;
          ctx.fillRect(0, -1 - charge, L, 2 + charge * 2);
        } else {
          // залп: в первые мгновения луч раскрывается от тонкого к полному
          const open = Math.min(1, (now - a.warn) / 70);
          const w = a.w * open * (now < a.hit ? 1 + 0.08 * Math.sin(now / 25) : fade);
          ctx.globalAlpha = 0.95 * fade; ctx.fillStyle = '#fff'; ctx.shadowColor = GLOW; ctx.shadowBlur = 26;
          ctx.fillRect(0, -w / 2, L, w);
          ctx.shadowBlur = 0;
        }
        ctx.restore();
        // точка входа на краю: светящийся заряд, при залпе - вспышка
        const r = firing ? a.w * 0.75 * fade : 5 + 13 * charge;
        ctx.save();
        ctx.shadowColor = GLOW; ctx.shadowBlur = 18;
        dot(a.ex, a.ey, r, firing ? '#fff' : GLOW, (firing ? 0.9 * fade : 0.35 + 0.5 * charge) * appear);
        ctx.restore();
        if (!firing) dot(a.ex, a.ey, 3 + 4 * charge * (0.7 + 0.3 * Math.sin(now / 45)), '#fff', appear);
      },
      onBeat(i) {
        const n = i % 16, bar = Math.floor(i / 16), sec = Beat.section(bar), lvl = Math.floor(bar / Beat.LOOP), b = bar % Beat.LOOP;
        const sp = 150 + lvl * 30, edge = () => pick([[rand(0, W), -10], [rand(0, W), H + 10], [-10, rand(0, H)], [W + 10, rand(0, H)]]);
        const now = performance.now();
        if (n % 4 === 0) this.pulse = 1;
        if (n === 0 && b === 14) this.walls = { start: now, warn: now + this.beatMs() };
        if (n === 0 && b === 20 && this.walls) this.walls.leave = now;
        if (n === 0 && b === 20) this.boxStart(now);
        if (n === 0 && (b < 20 || b >= 28) && this.box && now < this.box.open) { this.box.open = now; this.box.end = now + this.beatMs(); }
        // окно переезжает на соседнюю клетку раз в такт (во второй половине фазы - раз в 2 доли), только доехав до прошлой
        if (this.box && now > this.box.shut + 1 && n % (b >= 24 ? 8 : 16) === 0) this.boxMove();
        if (sec === 4) this.gasterBeat(b - 28, n, now);
        if (sec >= 3) return;
        if (Beat.walls(bar)) {
          // стены активны - без взрывных колец и эквалайзера, только лучи и падающие пули по центру
          if (n === 0) this.beam(false, this.py, 40);
          if (n === 8) this.beam(true, Math.max(W * 0.28, Math.min(W * 0.72, this.px)), 40);
          if (n % 4 === 2) this.atk.push({ kind: 'b', x: rand(W * 0.3, W * 0.7), y: -10, vx: 0, vy: sp * 1.3, r: 6 });
          return;
        }
        if (sec === 0) {
          if (n === 0) this.beam(true, rand(W * 0.1, W * 0.9), 40);
          if (n === 8) { const [x, y] = edge(); this.ring(x, y, 10, sp); }
        } else if (sec === 1) {
          if (n % 4 === 0) this.beam(n % 8 === 0, n % 8 === 0 ? this.px : this.py, 36);
          if (n === 10) { const [x, y] = edge(); this.ring(x, y, 12, sp); }
          if (bar % 4 === 3 && n >= 8 && n % 2 === 0) this.atk.push({ kind: 'b', x: rand(0, W), y: -10, vx: 0, vy: sp * 1.4, r: 5 });
        } else {
          // дроп до стен: эквалайзер и крест лучей чередуются по тактам, одно кольцо за такт и только с края
          if (n === 0 && bar % 2 === 0) this.eq(bar % 4 === 2);
          if (n === 8) { if (bar % 2) { this.beam(true, this.px, 44); this.beam(false, this.py, 44); } else this.beam(bar % 4 === 0, bar % 4 === 0 ? this.px : this.py, 40); }
          if (n === 12) { const [x, y] = edge(); this.ring(x, y, 8 + lvl, sp * 0.9); }
        }
      },
      hitPlayer() {
        if (this.inv > 0 || this.dashT > 0 || this.over || god()) return;
        this.hp--; this.inv = 1.4; this.shake = 0.35; this.flash = 0.25;
        if (this.hp <= 0) {
          this.over = true; Beat.stop();
          if (this.time > this.best && !this.cheat) { this.best = this.time; saveNum('mgl.dodgeBest', Math.round(this.time * 10)); }
        }
        this.pushScore();
      },
      step() {
        const dt = this.every / 1000, now = performance.now();
        this.pulse = Math.max(0, this.pulse - dt * 3); this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt);
        if (this.waiting || this.over) return;
        if (god()) this.cheat = true;
        Beat.pump((i, at) => this.sched.push({ i, at }));
        while (this.sched.length && this.sched[0].at <= now) this.onBeat(this.sched.shift().i);
        this.time += dt;
        const cap = this.caption;
        if (cap) {
          if (cap.shown < cap.text.length && now >= cap.next) {
            const ch = cap.text[cap.shown++];
            if (Voice.voiced(ch)) Voice.blip();
            cap.next = now + Voice.delay(ch);
            if (cap.shown === cap.text.length) cap.until = now + cap.hold;
          }
          if (now > cap.until + this.beatMs()) this.caption = null;
        }
        // движение
        let mx = 0, my = 0;
        for (const c of held) { const d = KEYMAP[c]; if (d) { mx += d[0]; my += d[1]; } }
        mx = Math.sign(mx); my = Math.sign(my);
        if (mx || my) { const l = Math.hypot(mx, my); this.dir = [mx / l, my / l]; }
        const v = 250 * (this.dashT > 0 ? 3.2 : 1);
        if (this.dashT > 0) { this.px += this.dir[0] * v * dt; this.py += this.dir[1] * v * dt; this.dashT -= dt; }
        else if (mx || my) { this.px += this.dir[0] * v * dt; this.py += this.dir[1] * v * dt; }
        this.dashCd -= dt; this.inv -= dt;
        this.px = Math.max(this.pr, Math.min(W - this.pr, this.px)); this.py = Math.max(this.pr, Math.min(H - this.pr, this.py));
        this.trail.push([this.px, this.py, this.dashT > 0]);
        if (this.trail.length > 10) this.trail.shift();
        // атаки
        const { px, py, pr } = this;
        for (const a of this.atk) {
          if (a.kind === 'b') {
            a.x += a.vx * dt; a.y += a.vy * dt;
            if (Math.hypot(a.x - px, a.y - py) < a.r + pr - 2) { a.dead = true; this.hitPlayer(); }
          } else if (now >= a.warn && now < a.hit) {
            if (a.kind === 'gb') {
              const vx = px - a.x, vy = py - a.y;
              if (vx * a.dx + vy * a.dy > 0 && Math.abs(vx * a.dy - vy * a.dx) < a.w / 2 + pr - 3) this.hitPlayer();
            } else if (a.kind === 'beam') {
              if (Math.abs((a.vertical ? px : py) - a.pos) < a.width / 2 + pr - 2) this.hitPlayer();
            } else {
              const bw = W / a.hs.length, i = Math.min(a.hs.length - 1, Math.floor(px / bw)), h = a.hs[i] * H;
              if (a.fromTop ? py - pr < h : py + pr > H - h) this.hitPlayer();
            }
          }
        }
        this.atk = this.atk.filter(a => !a.dead && (a.kind === 'b' ? a.x > -40 && a.x < W + 40 && a.y > -40 && a.y < H + 40 : now < a.gone));
        if (this.walls) {
          if (this.walls.leave && now > this.walls.leave + this.beatMs()) this.walls = null;
          else if (now >= this.walls.warn)
            for (const r of this.wallRects(now))
              if (px + pr - 2 > r.x && px - pr + 2 < r.x + r.w && py + pr - 2 > r.y && py - pr + 2 < r.y + r.h) { this.hitPlayer(); break; }
        }
        if (this.box) {
          const bx = this.box;
          if (now > bx.end) this.box = null;
          else {
            const lvl = Math.floor(Beat.step16 / 16 / Beat.LOOP), v = Math.min(170, 120 + lvl * 15) * dt;
            const dx = bx.tx - bx.cx, dy = bx.ty - bx.cy, l = Math.hypot(dx, dy);
            if (l > v) { bx.cx += dx / l * v; bx.cy += dy / l * v; } else { bx.cx = bx.tx; bx.cy = bx.ty; }
            const r = this.boxRect(now);
            if (r.closed && (px - pr < r.x - 2 || px + pr > r.x + r.s + 2 || py - pr < r.y - 2 || py + pr > r.y + r.s + 2)) this.hitPlayer();
          }
        }
        if (Math.floor(this.time * 10) !== this._shown) { this._shown = Math.floor(this.time * 10); this.pushScore(); }
      },
      draw() {
        const now = performance.now();
        ctx.save();
        if (this.shake > 0) ctx.translate(rand(-6, 6) * this.shake * 3, rand(-6, 6) * this.shake * 3);
        drawGrid(24, 1.1, C.text, 0.1);
        if (this.pulse > 0) {
          ctx.globalAlpha = this.pulse * 0.35; ctx.strokeStyle = C.acc; ctx.lineWidth = 3;
          ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
        }
        for (const a of this.atk) {
          if (a.kind === 'b') {
            dot(a.x, a.y, a.r + 4, C.hot, 0.18); dot(a.x, a.y, a.r, C.hot, 1);
            continue;
          }
          if (a.kind === 'gb') { this.drawBlaster(a, now); continue; }
          const warn = now < a.warn, k = warn ? 1 - (a.warn - now) / this.beatMs() : 0;
          const fade = now >= a.hit ? Math.max(0, 1 - (now - a.hit) / (a.gone - a.hit)) : 1;
          if (a.kind === 'beam') {
            const w = warn ? a.width : a.width * (1 + 0.25 * fade);
            const x = a.vertical ? a.pos - w / 2 : 0, y = a.vertical ? 0 : a.pos - w / 2;
            const rw = a.vertical ? w : W, rh = a.vertical ? H : w;
            ctx.fillStyle = C.hot;
            if (warn) {
              ctx.globalAlpha = 0.08 + 0.12 * k * (0.6 + 0.4 * Math.sin(now / 40)); ctx.fillRect(x, y, rw, rh);
              ctx.globalAlpha = 0.5; ctx.strokeStyle = C.hot; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, rw - 1, rh - 1);
            } else {
              ctx.globalAlpha = 0.95 * fade; ctx.fillRect(x, y, rw, rh);
              ctx.globalAlpha = 0.8 * fade; ctx.fillStyle = '#fff';
              if (a.vertical) ctx.fillRect(a.pos - w * 0.15, 0, w * 0.3, H); else ctx.fillRect(0, a.pos - w * 0.15, W, w * 0.3);
            }
          } else {
            const bw = W / a.hs.length;
            a.hs.forEach((hf, i) => {
              const h = hf * H * (warn ? 1 : 0.92 + 0.08 * Math.sin(now / 60 + i)), x = i * bw + bw * 0.12, y = a.fromTop ? 0 : H - h;
              ctx.fillStyle = C.hot;
              if (warn) { ctx.globalAlpha = 0.12 + 0.1 * k; ctx.fillRect(x, y, bw * 0.76, h); }
              else {
                ctx.globalAlpha = 0.9 * fade; ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, bw * 0.76, h, a.fromTop ? [0, 0, 6, 6] : [6, 6, 0, 0]); else ctx.rect(x, y, bw * 0.76, h);
                ctx.fill();
              }
            });
          }
        }
        if (this.walls) {
          const warn = now < this.walls.warn;
          for (const r of this.wallRects(now)) {
            ctx.globalAlpha = warn ? 0.28 : 0.92; ctx.fillStyle = C.hot; ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 10); else ctx.rect(r.x, r.y, r.w, r.h);
            ctx.fill();
            // светлая кромка со стороны игрока
            ctx.globalAlpha = warn ? 0.5 : 0.75; ctx.fillStyle = '#fff';
            ctx.fillRect(r.side < 0 ? r.x + r.w - 4 : r.x, r.y + 8, 4, r.h - 16);
          }
        }
        const hole = this.boxRect(now);
        if (hole) {
          ctx.save();
          ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(hole.x, hole.y, hole.s, hole.s);
          ctx.clip('evenodd');
          ctx.globalAlpha = 0.25 + 0.67 * hole.k; ctx.fillStyle = C.hot; ctx.fillRect(0, 0, W, H);
          // «швы» между гигантскими блоками - та же неподвижная сетка, по клеткам которой ходит окно
          const bx = this.box, cell = bx.cell, ox = bx.gox, oy = bx.goy;
          ctx.globalAlpha = 0.35 * hole.k; ctx.strokeStyle = C.bg; ctx.lineWidth = 4; ctx.beginPath();
          for (let x = ox; x < W; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
          for (let y = oy; y < H; y += cell) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = hole.closed ? 0.6 + 0.4 * this.pulse : 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.strokeRect(hole.x - 1, hole.y - 1, hole.s + 2, hole.s + 2);
        }
        // игрок
        const n = this.trail.length;
        this.trail.forEach((p, i) => dot(p[0], p[1], this.pr * (i + 1) / n, p[2] ? C.text : C.acc2, (p[2] ? 0.45 : 0.18) * (i + 1) / n));
        const blink = this.inv > 0 && Math.floor(now / 80) % 2 === 0;
        if (!this.over && !blink) {
          ctx.save();
          ctx.translate(this.px, this.py); ctx.rotate(now / 400);
          ctx.globalAlpha = 1; ctx.fillStyle = this.dashT > 0 ? C.text : C.acc2; ctx.shadowColor = C.acc2; ctx.shadowBlur = 12;
          const s = this.pr * 1.7;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(-s / 2, -s / 2, s, s, 3); else ctx.rect(-s / 2, -s / 2, s, s);
          ctx.fill();
          ctx.restore();
        }
        if (this.flash > 0) { ctx.globalAlpha = this.flash * 0.6; ctx.fillStyle = C.hot; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
        const cap = this.caption;
        if (cap && !this.over) {
          // диалоговое окно в духе Undertale: чёрная плашка с белой рамкой, текст печатается по буквам, в конце гаснет
          const a = cap.until === Infinity ? 1 : Math.max(0, Math.min(1, 1 - (now - cap.until) / this.beatMs()));
          const bw = Math.min(W - 32, 600), bh = 54, bx = (W - bw) / 2, by = H - bh - 14;
          ctx.globalAlpha = 0.92 * a; ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh);
          ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
          ctx.fillStyle = '#fff'; ctx.font = '17px MglSans, "Comic Sans MS", cursive'; ctx.textBaseline = 'middle';
          let txt = cap.text.slice(0, cap.shown);
          while (txt.length > 1 && ctx.measureText(txt).width > bw - 36) txt = txt.slice(1);
          ctx.fillText(txt, bx + 18, by + bh / 2 + 1);
          ctx.textBaseline = 'alphabetic';
        }
        if (this.waiting) overlay('Уклонись в ритм', 'WASD / стрелки - движение · Shift - рывок · M - звук · пробел - старт');
        else if (this.over) overlay('Попадание!', `Продержались ${this.time.toFixed(1)} с · пробел - заново`);
      }
    });

    // Пейнт по точкам (фон «Точечный шрифт»); рисунок хранится в localStorage индексами палитры - перекрашивается с темой
    const Paint = Object.assign({}, gameBase, {
      every: 1000 / 30, cursor: 'crosshair', gap: 14,
      reset() {
        const g = this.gap;
        this.cols = Math.max(4, Math.floor(W / g)); this.rows = Math.max(4, Math.floor(H / g));
        this.ox = (W - (this.cols - 1) * g) / 2; this.oy = (H - (this.rows - 1) * g) / 2;
        if (!this.cells) this.load();
        this.inited = W > 0;
        this.pushScore();
      },
      colors() { return [C.acc, C.acc2, C.accTeal, C.accDim, C.warm, C.warm2, C.hot, C.text]; },
      load() {
        try { this.cells = new Map(Object.entries(JSON.parse(localStorage.getItem('mgl.dotPaint') || '{}').cells || {})); }
        catch (e) { this.cells = new Map(); }
        this.color = 0; this.brush = 1; this.erase = false; this.undo = []; this.pops = []; this.down = null; this.hover = null;
      },
      save() {
        clearTimeout(this._saveT);
        this._saveT = setTimeout(() => {
          try { localStorage.setItem('mgl.dotPaint', JSON.stringify({ cells: Object.fromEntries(this.cells) })); } catch (e) {}
        }, 400);
      },
      pushScore() {
        hud([['Кисть', this.brush]], 'ЛКМ - рисовать · ПКМ - стереть · колесо - кисть · 1–8 - цвет · Ctrl+Z · C - очистить');
      },
      remember() { this.undo.push(new Map(this.cells)); if (this.undo.length > 40) this.undo.shift(); },
      // палитра - внизу по центру
      swatches() {
        const n = this.colors().length + 1, gap = 28, x0 = W / 2 - (n - 1) * gap / 2, y = H - 24;
        return Array.from({ length: n }, (_, i) => ({ x: x0 + i * gap, y, erase: i === n - 1, i }));
      },
      cell(x, y) { return [Math.round((x - this.ox) / this.gap), Math.round((y - this.oy) / this.gap)]; },
      paintAt(x, y, erase) {
        const [cx, cy] = this.cell(x, y), r = this.brush - 1;
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
          if (a * a + b * b > r * r + r) continue;
          const gx = cx + a, gy = cy + b;
          if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) continue;
          const k = gx + ',' + gy;
          if (erase) this.cells.delete(k);
          else if (this.cells.get(k) !== this.color) { this.cells.set(k, this.color); this.pops.push({ k, t: 0 }); }
        }
      },
      onPointer(type, x, y, e) {
        this.hover = type === 'pointerleave' ? null : [x, y];
        if (type === 'pointerdown') {
          const sw = this.swatches().find(s => Math.hypot(s.x - x, s.y - y) < 12);
          if (sw) { if (sw.erase) this.erase = !this.erase; else { this.color = sw.i; this.erase = false; } return; }
          try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
          this.remember();
          this.down = { erase: e.button === 2 || this.erase, x, y };
          this.paintAt(x, y, this.down.erase);
        } else if (type === 'pointermove' && this.down) {
          // интерполяция, чтобы быстрый мазок не рвался
          const d = this.down, steps = Math.ceil(Math.hypot(x - d.x, y - d.y) / (this.gap / 2));
          for (let s = 1; s <= steps; s++) this.paintAt(d.x + (x - d.x) * s / steps, d.y + (y - d.y) * s / steps, d.erase);
          d.x = x; d.y = y;
        } else if ((type === 'pointerup' || type === 'pointercancel') && this.down) {
          this.down = null; this.save();
        }
      },
      onWheel(dy) { this.brush = Math.max(1, Math.min(4, this.brush + (dy > 0 ? -1 : 1))); this.pushScore(); },
      ctrlKeys: ['KeyZ'],
      onKey(e) {
        if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) { const m = this.undo.pop(); if (m) { this.cells = m; this.save(); } return true; }
        const dg = /^Digit([1-8])$/.exec(e.code);
        if (dg) { this.color = +dg[1] - 1; this.erase = false; return true; }
        if (e.code === 'KeyE') { this.erase = !this.erase; return true; }
        if (e.code === 'BracketLeft' || e.code === 'BracketRight') { this.onWheel(e.code === 'BracketLeft' ? 1 : -1); return true; }
        if (e.code === 'KeyC') { if (this.cells.size) { this.remember(); this.cells = new Map(); this.save(); } return true; }
        return false;
      },
      step() { this.pops = this.pops.filter(p => (p.t += 1) < 8); },
      draw() {
        const g = this.gap, cols = this.colors();
        drawGrid(g, 1.2, C.text, 0.14, this.ox, this.oy);
        const pop = new Map(this.pops.map(p => [p.k, p.t]));
        for (const [k, ci] of this.cells) {
          const [gx, gy] = k.split(',').map(Number);
          if (gx >= this.cols || gy >= this.rows) continue;
          const t = pop.get(k), s = t == null ? 1 : 1.35 - 0.35 * t / 8;
          dot(this.ox + gx * g, this.oy + gy * g, g * 0.38 * s, cols[ci] || C.acc, 0.95);
        }
        if (this.hover && !this.down) {
          const [cx, cy] = this.cell(this.hover[0], this.hover[1]);
          ctx.globalAlpha = 0.6; ctx.strokeStyle = this.erase ? C.text : cols[this.color]; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(this.ox + cx * g, this.oy + cy * g, g * (this.brush - 0.5), 0, Math.PI * 2); ctx.stroke();
        }
        // палитра
        const sw = this.swatches(), x0 = sw[0].x - 16, x1 = sw[sw.length - 1].x + 16;
        ctx.globalAlpha = 0.85; ctx.fillStyle = C.bg; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x0, H - 42, x1 - x0, 36, 18); else ctx.rect(x0, H - 42, x1 - x0, 36);
        ctx.fill();
        for (const s of sw) {
          const active = s.erase ? this.erase : !this.erase && this.color === s.i;
          if (s.erase) {
            ctx.globalAlpha = 0.9; ctx.strokeStyle = C.text; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.moveTo(s.x - 5, s.y + 5); ctx.lineTo(s.x + 5, s.y - 5); ctx.stroke();
          } else dot(s.x, s.y, 8, cols[s.i], 1);
          if (active) { ctx.globalAlpha = 1; ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 11.5, 0, Math.PI * 2); ctx.stroke(); }
        }
      }
    });

    // ---------- Луни: глаза-капсулы (высота = 3 ширины), моргают и «живут»; обычные скруглённые формы, не точки ----------
    const rrect = (x, y, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    };
    // eyes: {w, cx, cy, gap}; st: {lx, ly (-1..1), open (0..1), happy (0..1), tall (множитель), tilt}
    function drawLuniEyes(e, st) {
      const h0 = e.w * 3, hp = st.happy || 0;
      // радость: глаз сжимается до ~1.1 ширины и снизу вырезается круг - получается дуга ^
      const h = Math.max(e.w * 0.16, (h0 + (e.w * 1.15 - h0) * hp) * st.open * st.tall), r = Math.min(e.w * 0.4, h / 2);
      const dx = st.lx * e.w * 0.55, dy = st.ly * e.w * 0.7;
      for (let i = 0; i < 2; i++) {
        const sgn = i ? 1 : -1;
        const cx = e.cx + sgn * (e.gap / 2 + e.w / 2) + dx, cy = e.cy + dy + st.tilt * sgn * e.w * 0.12;
        const x = cx - e.w / 2, y = cy - h / 2;
        ctx.save();
        ctx.globalAlpha = 1;
        if (st.rot) { ctx.translate(cx, cy); ctx.rotate(st.rot); ctx.translate(-cx, -cy); }
        const gr = ctx.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, C.acc2); gr.addColorStop(1, C.acc);
        ctx.fillStyle = gr;
        if (hp > 0.01) {
          const R = e.w * 0.62, ccy = y + h + R * (0.25 + (1 - hp) * 2);
          rrect(x, y, e.w, h, r); ctx.clip();
          ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.rect(x - 4, y - 4, e.w + 8, h + 8); ctx.moveTo(cx + R, ccy); ctx.arc(cx, ccy, R, 0, Math.PI * 2);
          ctx.fill('evenodd');
        } else { rrect(x, y, e.w, h, r); ctx.fill(); }
        ctx.restore();
        // блик
        if (st.open > 0.5 && hp < 0.3) {
          ctx.globalAlpha = 0.35 * st.open; ctx.fillStyle = '#fff';
          rrect(x + e.w * 0.2, y + h * 0.1, e.w * 0.22, Math.min(h * 0.22, e.w * 0.7), e.w * 0.11);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    const lunieyes = () => {
      const w = Math.max(14, Math.min(H * 0.17, W * 0.07, 50));
      return { w, gap: w * 0.95, cx: W * 0.73, cy: H * 0.44 };
    };
    const Luni = {
      every: 1000 / 60, live: true, flat: false,
      reset() {
        this.t = 0; this.lx = this.ly = 0; this.tx = this.ty = 0; this.nextLook = 1; this.nextBlink = 2;
        this.blinkT = -1; this.dbl = false; this.mood = 'idle'; this.moodT = 0; this.nextMood = 6;
        this.open = 1; this.happy = 0; this.tall = 1; this.tilt = 0; this.tiltT = 0;
      },
      step() {
        const dt = this.every / 1000;
        this.t += dt;
        if ((this.nextLook -= dt) <= 0 && this.mood !== 'sleep') {
          this.tx = rand(-1, 1); this.ty = rand(-0.8, 0.8);
          if (Math.random() < 0.3) this.tx = this.ty = 0;
          this.nextLook = rand(0.8, 2.8);
        }
        if ((this.nextBlink -= dt) <= 0 && this.mood !== 'sleep') {
          this.blinkT = 0; this.dbl = Math.random() < 0.25; this.nextBlink = rand(2, 5);
        }
        if (this.blinkT >= 0) {
          this.blinkT += dt;
          if (this.blinkT > 0.2) { if (this.dbl) { this.dbl = false; this.blinkT = 0; } else this.blinkT = -1; }
        }
        if ((this.nextMood -= dt) <= 0) {
          this.mood = pick(['happy', 'surprise', 'sleep', 'tilt', 'dance', 'dance']); this.moodT = this.mood === 'sleep' ? rand(9, 13) : this.mood === 'dance' ? rand(7, 10) : rand(3, 4.5);
          if (this.mood === 'surprise') { this.tx = this.ty = 0; }
          this.nextMood = this.moodT + rand(14, 26);
        }
        if (this.moodT > 0 && (this.moodT -= dt) <= 0) this.mood = 'idle';
        const m = this.mood, k = Math.min(1, dt * 9);
        let open = 1, happy = 0, tall = 1, tilt = 0, rot = 0;
        if (m === 'dance') rot = Math.sin(this.t * 4) * 0.24;
        this.rot = (this.rot || 0) + (rot - (this.rot || 0)) * k;
        if (this.blinkT >= 0) open = Math.abs(this.blinkT / 0.1 - 1) * 0.96 + 0.04;
        if (m === 'happy') happy = 1;
        else if (m === 'surprise') tall = 1.12;
        else if (m === 'sleep') { open = 0.08; this.tx = this.ty = 0; tilt = 0; }
        else if (m === 'tilt') { tilt = Math.sin(this.t * 6) * 1.2; }
        else if (m === 'dance') {
          // танец: наклоны и сдвиг вбок в такт, взгляд ходит из стороны в сторону (без движения вверх-вниз)
          this.tx = Math.sin(this.t * 4) * 0.9; this.ty = -0.2; this.nextLook = 0.3;
        }
        this.open += (open - this.open) * (m === 'sleep' ? Math.min(1, dt * 2.5) : Math.min(1, dt * 26));
        this.happy += (happy - this.happy) * k;
        this.tall += (tall - this.tall) * k;
        this.tilt += (tilt - this.tilt) * k;
        this.lx += (this.tx - this.lx) * Math.min(1, dt * 12);
        this.ly += (this.ty - this.ly) * Math.min(1, dt * 12);
      },
      draw() {
        if (!this.open && this.open !== 0) this.reset();
        const e = lunieyes();
        const float = Math.sin(this.t * 1.6) * e.w * 0.06;
        e.cy += float;
        if (this.mood === 'dance') {
          e.cy -= float;
          e.cx += Math.sin(this.t * 4) * e.w * 0.5;
        }
        drawLuniEyes(e, this);
        if (this.mood === 'dance') {
          ctx.fillStyle = C.acc2; ctx.textAlign = 'center';
          for (let i = 0; i < 4; i++) {
            const p = ((this.t * 0.45 + i / 4) % 1), side = i % 2 ? 1 : -1;
            ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
            ctx.font = `700 ${Math.round(e.w * (0.7 + (i % 3) * 0.15))}px sans-serif`;
            ctx.fillText(i % 2 ? '♪' : '♫', e.cx + side * (e.gap / 2 + e.w * 1.6 + p * e.w * 1.2 + (i % 3) * e.w * 0.3) + Math.sin(p * 9 + i) * e.w * 0.25, e.cy - e.w * 0.3 - p * e.w * 2.4);
          }
          ctx.textAlign = 'start'; ctx.globalAlpha = 1;
        }
        if (this.mood === 'sleep') {
          ctx.fillStyle = C.text; ctx.textAlign = 'center';
          for (let i = 0; i < 3; i++) {
            const p = ((this.t * 0.5 + i / 3) % 1);
            ctx.globalAlpha = (1 - p) * 0.6; ctx.font = `700 ${Math.round(e.w * (0.35 + i * 0.12))}px sans-serif`;
            ctx.fillText('z', e.cx + e.gap / 2 + e.w * 1.6 + p * e.w * 0.6 - e.w * 3.4, e.cy - e.w * 0.6 - p * e.w * 1.6);
          }
          ctx.textAlign = 'start'; ctx.globalAlpha = 1;
        }
      }
    };

    // Пасхалка фона «Луни»: «Лови светлячков» - Луни следит за курсором, ест светлячков и пугается искр
    const LuniGame = Object.assign({}, gameBase, {
      cursor: 'none', best: loadNum('mgl.luniBest'),
      reset() { this.inited = W > 0; if (!this.eyes) this.newRound(); },
      start() { gameBase.start.call(this); this.newRound(); },
      newRound() {
        this.px = W * 0.3; this.py = H * 0.5; this.mouse = null;
        this.score = 0; this.lives = 3; this.flies = []; this.sparks = []; this.parts = [];
        this.spawnT = 0.3; this.sparkT = 4; this.t = 0; this.over = false; this.waiting = true; this.cheat = false;
        this.eyes = { lx: 0, ly: 0, open: 1, happy: 0, tall: 1, tilt: 0 }; this.mood = 0; this.blinkT = 2; this.hurt = 0;
        this.pushScore();
      },
      pushScore() { hud([['Рекорд', this.best], ['Счёт', this.score || 0], ['Жизни', '♥'.repeat(Math.max(0, this.lives || 0)) || '-']]); },
      press() { if (this.over) { this.newRound(); this.waiting = false; } else this.waiting = false; },
      onKey(e) {
        if (e.code === 'Space') { if (!e.repeat) this.press(); return true; }
        if (KEYMAP[e.code]) { if (this.waiting) this.waiting = false; return true; }
        return false;
      },
      onPointer(type, x, y) {
        if (type === 'pointermove' || type === 'pointerdown') this.mouse = [x, y];
        if (type === 'pointerdown') this.press();
      },
      step() {
        const dt = this.every / 1000, E = this.eyes, e = lunieyes();
        this.parts = this.parts.filter(p => (p.life -= dt) > 0);
        for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
        let ax = 0, ay = 0;
        for (const c of held) { const d = KEYMAP[c]; if (d) { ax += d[0]; ay += d[1]; } }
        if (ax || ay) { this.mouse = null; this.px += ax * 420 * dt; this.py += ay * 420 * dt; }
        else if (this.mouse) { this.px += (this.mouse[0] - this.px) * Math.min(1, dt * 18); this.py += (this.mouse[1] - this.py) * Math.min(1, dt * 18); }
        this.px = Math.max(8, Math.min(W - 8, this.px)); this.py = Math.max(8, Math.min(H - 8, this.py));
        // глаза следят за курсором
        const tx = Math.max(-1, Math.min(1, (this.px - e.cx) / (W * 0.4))), ty = Math.max(-1, Math.min(1, (this.py - e.cy) / (H * 0.4)));
        E.lx += (tx - E.lx) * Math.min(1, dt * 10); E.ly += (ty - E.ly) * Math.min(1, dt * 10);
        if ((this.blinkT -= dt) <= 0) { this.blink = 0.2; this.blinkT = rand(2, 4.5); }
        let open = 1;
        if (this.blink > 0) { this.blink -= dt; open = Math.abs(this.blink / 0.1 - 1) * 0.96 + 0.04; }
        if (this.mood > 0) this.mood -= dt;
        if (this.hurt > 0) this.hurt -= dt;
        const happy = this.mood > 0 && this.hurt <= 0 ? 1 : 0, tall = this.hurt > 0 ? 1.15 : 1;
        E.open += (open - E.open) * Math.min(1, dt * 26);
        E.happy += (happy - E.happy) * Math.min(1, dt * 14);
        E.tall += (tall - E.tall) * Math.min(1, dt * 14);
        E.tilt = this.hurt > 0 ? Math.sin(this.t * 40) * 0.8 : E.tilt * 0.8;
        if (this.waiting || this.over) return;
        this.t += dt;
        if (god()) this.cheat = true;
        const lvl = Math.min(1, this.t / 60);
        if ((this.spawnT -= dt) <= 0) {
          this.spawnT = rand(0.55, 1.1) - lvl * 0.3;
          this.flies.push({ x: rand(20, W - 20), y: rand(20, H - 20), a: rand(0, 6.28), life: rand(5, 8), ph: rand(0, 6.28) });
        }
        if ((this.sparkT -= dt) <= 0) {
          this.sparkT = rand(1.2, 2.4) - lvl * 0.8;
          const side = irand(4), v = 110 + lvl * 140 + rand(0, 40);
          const s = side < 2 ? { x: side ? W + 10 : -10, y: rand(0, H) } : { x: rand(0, W), y: side === 2 ? -10 : H + 10 };
          const a = Math.atan2(this.py - s.y + rand(-80, 80), this.px - s.x + rand(-80, 80));
          this.sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 7 });
        }
        for (const f of this.flies) {
          f.a += rand(-1.8, 1.8) * dt * 3; f.x += Math.cos(f.a) * 40 * dt; f.y += Math.sin(f.a) * 40 * dt; f.life -= dt; f.ph += dt * 5;
          if (f.x < 10 || f.x > W - 10) f.a = Math.PI - f.a;
          if (f.y < 10 || f.y > H - 10) f.a = -f.a;
        }
        this.flies = this.flies.filter(f => {
          if (Math.hypot(f.x - this.px, f.y - this.py) < 20) {
            this.score++; this.mood = 0.7;
            for (let i = 0; i < 8; i++) { const a = rand(0, 6.28), v = rand(40, 150); this.parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.6), color: C.warm2 }); }
            this.pushScore();
            return false;
          }
          return f.life > 0;
        });
        for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
        this.sparks = this.sparks.filter(s => {
          if (this.hurt <= 0 && Math.hypot(s.x - this.px, s.y - this.py) < 15 && !god()) {
            this.lives--; this.hurt = 0.8;
            for (let i = 0; i < 12; i++) { const a = rand(0, 6.28), v = rand(60, 220); this.parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.6), color: C.hot }); }
            if (this.lives <= 0) {
              this.over = true;
              if (this.score > this.best && !this.cheat) { this.best = this.score; saveNum('mgl.luniBest', this.best); }
            }
            this.pushScore();
            return false;
          }
          return s.life > 0 && s.x > -40 && s.x < W + 40 && s.y > -40 && s.y < H + 40;
        });
      },
      draw() {
        const e = lunieyes();
        drawLuniEyes(e, this.eyes);
        for (const f of this.flies) {
          const a = Math.min(1, f.life) * (0.65 + 0.35 * Math.sin(f.ph));
          ctx.shadowColor = C.warm2; ctx.shadowBlur = 12;
          dot(f.x, f.y, 4.5, C.warm2, a);
        }
        for (const s of this.sparks) { ctx.shadowColor = C.hot; ctx.shadowBlur = 10; dot(s.x, s.y, 5, C.hot, 0.95); }
        ctx.shadowBlur = 0;
        for (const p of this.parts) dot(p.x, p.y, 2.2, p.color, Math.min(1, p.life * 2.5));
        // курсор-светлячок игрока
        const blink = this.hurt > 0 && Math.floor(this.hurt * 14) % 2;
        if (!blink) { ctx.shadowColor = C.text; ctx.shadowBlur = 14; dot(this.px, this.py, 7, C.text, 1); ctx.shadowBlur = 0; }
        if (this.waiting) overlay('Лови светлячков', 'мышь / WASD - двигаться · избегай красных искр · пробел - старт');
        else if (this.over) overlay('Луни наелась!', `Поймано ${this.score} · пробел - заново`);
      }
    });

    const SCENES = { snake: Snakes, land: Landscape, dots: DotFont, luni: Luni, dino: Dino, pong: Pong, dodge: Dodge, paint: Paint, lunigame: LuniGame };

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== W || h !== H || canvas.width !== Math.round(w * dpr)) {
        W = w; H = h;
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!api.hold || scene.inited === false) scene.reset();
        render();
      }
      return true;
    }
    function render() {
      ctx.clearRect(0, 0, W, H);
      scene.draw();
      ctx.globalAlpha = 1;
    }
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!canvas || !canvas.isConnected) { if (scene && scene.end && scene.playing) scene.end(); stop(); return; }
      if (document.hidden) { last = 0; return; }
      if (!resize()) return;
      if (++colorAge > 120) { colorAge = 0; readColors(); }
      const dt = Math.min(100, t - (last || t));
      last = t;
      acc += dt;
      let stepped = false;
      while (acc >= scene.every) { scene.step(); acc -= scene.every; stepped = true; }
      if (stepped || scene.live) render();
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (ro) { ro.disconnect(); ro = null; }
    }
    function bindPointer(el) {
      if (el._mglPtr) return;
      el._mglPtr = true;
      const fwd = e => {
        if (el !== canvas || !scene.playing || !scene.onPointer) return;
        const r = el.getBoundingClientRect();
        scene.onPointer(e.type, e.clientX - r.left, e.clientY - r.top, e);
      };
      ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, fwd));
      el.addEventListener('contextmenu', e => { if (el === canvas && scene.playing) e.preventDefault(); });
      el.addEventListener('wheel', e => {
        if (el !== canvas || !scene.playing || !scene.onWheel) return;
        e.preventDefault(); scene.onWheel(e.deltaY);
      }, { passive: false });
    }
    api.attach = function (el, mode) {
      stop();
      if (scene && scene.end && scene.playing) scene.end();
      prevScene = null;
      canvas = el; ctx = canvas.getContext('2d');
      scene = SCENES[mode] || Snakes;
      Snakes.playing = false; Snakes.ready = false; Snakes.flat = false; Snakes.aiA = Snakes.aiTarget = 1; Snakes.every = 120;
      clearTimeout(api._holdT); api.hold = false;
      W = H = 0; last = 0; acc = 0;
      readColors();
      bindPointer(el);
      if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (canvas) resize(); }); ro.observe(canvas); }
      raf = requestAnimationFrame(loop);
    };
    api.stop = stop;
    function relayout() {
      api.hold = true;
      clearTimeout(api._holdT);
      api._holdT = setTimeout(() => { api.hold = false; if (canvas && canvas.isConnected) { scene.reset(); render(); } }, 520);
    }
    api.startGame = function (kind) {
      if (!canvas) return;
      if (kind === 'snake') { if (scene !== Snakes) return; Snakes.startGame(); relayout(); return; }
      const g = SCENES[kind];
      if (!g || !g.start) return;
      if (scene !== g) { prevScene = scene; scene = g; }
      held.clear();
      g.inited = false;
      if (W) g.reset();
      g.start();
      relayout();
    };
    api.stopGame = function () {
      if (scene === Snakes) { Snakes.stopGame(); relayout(); return; }
      if (!scene || !scene.end) return;
      scene.end();
      if (prevScene) { scene = prevScene; prevScene = null; relayout(); }
      else stop();
    };
    document.addEventListener('keydown', (e) => {
      if (!scene || !scene.playing || !canvas || !canvas.isConnected) return;
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.altKey || ((e.ctrlKey || e.metaKey) && !(scene.ctrlKeys || []).includes(e.code))) return;
      if (e.code === 'Escape') { if (api.onExit) api.onExit(); return; }
      held.add(e.code);
      if (scene.onKey && scene.onKey(e)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => {
      held.delete(e.code);
      if (scene && scene.playing && scene.onKeyUp) scene.onKeyUp(e);
    });
    window.addEventListener('blur', () => held.clear());
    // отладка: MglHeroScenes.scenes.pong, MglHeroScenes.tick(n) - n шагов + перерисовка (когда rAF не крутится)
    api.scenes = SCENES;
    api.beat = Beat;   // перемотка трека «Уклонись в ритм»: MglHeroScenes.beat.step16 = такт * 16
    api.sansSay = text => Voice.say(text);
    api.tick = n => { for (let i = 0; i < n; i++) scene.step(); render(); };
    window.MglHeroScenes = api;
    return api;
  })();

  async function refreshJavaFound() {
    const box = document.getElementById('java-found');
    const ipc = getIpc();
    if (!box || !ipc) return;
    let r;
    try { r = await ipc.invoke('java:scan'); } catch (e) { return; }
    if (!box.isConnected) return;
    const row = (m) => {
      const p = r.pick && r.pick[m];
      return `<div class="jf-row ${p ? 'ok' : 'no'}"><b>Java ${m}</b><span>${p ? escapeHtml(p) : 'не найдена - нажмите кнопку выше'}</span></div>`;
    };
    const html = [8, 17, 21, 25].map(row).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
    startJavaPoll();
  }
  // Пока открыты настройки (блок «найденные Java») или мастер установки - пересканируем каждые 2 с,
  // чтобы только что установленная Java подхватывалась без перезапуска.
  let _javaPollTimer = null;
  function startJavaPoll() {
    if (_javaPollTimer) return;
    _javaPollTimer = setInterval(() => {
      const box = document.getElementById('java-found');
      const guide = _javaGuideMajor && document.querySelector('#app-modal #jg-status');
      if (!box && !guide) { clearInterval(_javaPollTimer); _javaPollTimer = null; return; }
      if (document.hidden) return;
      if (box) refreshJavaFound();
      if (guide) javaGuideCheck(true);
    }, 2000);
  }
  let _javaGuideChecking = false;
  async function javaGuideCheck(silent) {
    const ipc = getIpc(), major = _javaGuideMajor;
    const m = document.getElementById('app-modal');
    const st = m && m.querySelector('#jg-status');
    if (!ipc || !major || !st || _javaGuideChecking) return false;
    _javaGuideChecking = true;
    let r = null;
    try { r = await ipc.invoke('java:scan'); } catch (e) {}
    _javaGuideChecking = false;
    const found = r && r.pick && r.pick[major <= 8 ? 8 : major];
    if (!st.isConnected || _javaGuideMajor !== major) return false;
    if (found) {
      st.className = 'jg-status good';
      st.textContent = 'Java найдена: ' + found;
      toast(`Java ${major} найдена - можно запускать игру`);
      refreshJavaFound();
      _javaGuideMajor = 0;
      setTimeout(() => { const w = document.getElementById('app-modal'); if (w && w.contains(st)) w.remove(); }, 900);
      return true;
    }
    if (!silent) {
      st.className = 'jg-status bad';
      st.textContent = 'Java ещё не найдена. Завершите установку (Finish) - проверка идёт автоматически каждые 2 секунды.';
    }
    return false;
  }
  let _javaGuideMajor = 0;
  function showJavaGuide(major) {
    const ipc = getIpc();
    if (!ipc) { toast('Установка Java доступна в приложении'); return; }
    if (document.getElementById('app-modal') && _javaGuideMajor === major) return;
    _javaGuideMajor = major;
    const wrap = showModal({
      title: `Установка Java ${major} (Eclipse Temurin)`,
      bodyHtml: `
        <div class="jg-why">Java ${major} не найдена. Рантайм Mojang в папке пользователя с кириллицей не запускается, поэтому нужна обычная установка Temurin в <code class="path">C:\\Program Files\\Eclipse Adoptium\\</code>.</div>
        <ol class="jg-steps">
          <li>Нажмите <b>«Скачать установщик»</b> - лаунчер скачает Temurin ${major} с adoptium.net и откроет его.</li>
          <li>Подтвердите запрос Windows и в мастере нажимайте <b>Next</b> - путь установки менять не нужно.</li>
          <li>Дождитесь <b>Finish</b>, вернитесь сюда и нажмите <b>«Проверить»</b>. Java подхватится автоматически.</li>
        </ol>
        <div class="jg-status" id="jg-status"></div>`,
      okText: 'Скачать установщик',
      onOk: async (m, api) => {
        const st = m.querySelector('#jg-status');
        const ok = m.querySelector('.modal-ok');
        if (ok.dataset.stage === 'check') {
          api.disable();
          await javaGuideCheck(false);
          api.enable(); ok.textContent = 'Проверить';
          return false;
        }
        api.disable();
        st.className = 'jg-status'; st.textContent = 'Скачивание…';
        const onProg = (e, d) => { if (d.major === major && st.isConnected) st.textContent = d.status || ''; };
        ipc.on('java:installProgress', onProg);
        Downloads.start('java:' + major, 'java', `Temurin ${major}`);
        const r = await ipc.invoke('java:installAdoptium', major);
        ipc.removeListener('java:installProgress', onProg);
        api.enable();
        if (!r || !r.ok) {
          Downloads.finish('java:' + major, { ok: false, error: (r && r.error) || 'ошибка' });
          st.className = 'jg-status bad';
          st.textContent = 'Не удалось скачать: ' + ((r && r.error) || '');
          ok.textContent = 'Повторить';
          return false;
        }
        Downloads.finish('java:' + major, { ok: true });
        st.className = 'jg-status good';
        st.textContent = 'Установщик открыт. Пройдите мастер установки - Java подхватится автоматически (проверка каждые 2 с).';
        ok.dataset.stage = 'check';
        ok.textContent = 'Проверить';
        return false;
      }
    });
    startJavaPoll();
    const closeBtns = wrap.querySelectorAll('.modal-close, .modal-cancel');
    closeBtns.forEach(b => b.addEventListener('click', () => { _javaGuideMajor = 0; }));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) _javaGuideMajor = 0; });
  }

  const LOADER_NAMES = { forge: 'Forge', fabric: 'Fabric', quilt: 'Quilt', neoforge: 'NeoForge' };
  function mglVersionsText(mods) {
    if (!mods || !mods.length) return 'В assets/MGL нет модов';
    const by = {};
    mods.forEach(m => (by[m.loader] = by[m.loader] || []).push(m.mc));
    return 'Доступно: ' + Object.keys(by).map(l => `${LOADER_NAMES[l] || l} ${by[l].sort((a, b) => cmpVer(a, b)).join(', ')}`).join(' · ');
  }
  async function bindMglSc() {
    const sw = content.querySelector('#mglsc-switch');
    const info = content.querySelector('#mglsc-versions');
    if (!sw) return;
    const ipc = getIpc();
    if (ipc && info) { try { info.textContent = mglVersionsText((await ipc.invoke('mglsc:info')).mods); } catch (e) {} }
    sw.addEventListener('click', async () => {
      if (sw.dataset.busy) return;
      const on = !sw.classList.contains('on');
      if (!ipc) { toast('MGL S&C доступен в приложении'); return; }
      sw.dataset.busy = '1';
      sw.classList.toggle('on', on);
      const r = await ipc.invoke('mglsc:set', on);
      delete sw.dataset.busy;
      if (!r || !r.ok) { sw.classList.toggle('on', !on); toast('Ошибка MGL S&C: ' + ((r && r.error) || '')); return; }
      D.settings = { ...(D.settings || {}), useMglSc: on };
      if (info) info.textContent = mglVersionsText(r.mods && r.mods.length ? r.mods : (await ipc.invoke('mglsc:info')).mods);
      if (on) toast(r.warn || `MGL S&C включён - в mods/ добавлено: ${r.copied || 0}. Нужный мод включится при запуске`);
      else toast(`MGL S&C отключён - удалено из mods/: ${r.removed || 0}${r.failed ? ` (не удалось: ${r.failed}, закройте игру)` : ''}`);
    });
  }
  function showNoticePlate(text) {
    let stack = document.getElementById('notice-stack');
    if (!stack) { stack = document.createElement('div'); stack.id = 'notice-stack'; document.body.appendChild(stack); }
    const el = document.createElement('div');
    el.className = 'notice-plate';
    el.innerHTML = `<span class="notice-text">${escapeHtml(text)}</span><button class="notice-x" title="Закрыть">×</button>`;
    stack.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    el.querySelector('.notice-x').addEventListener('click', kill);
    setTimeout(kill, 12000);
  }

  const SC_KEY = 'mgl.settingsCollapsed';
  function scCollapsedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(SC_KEY) || '[]')); } catch (e) { return new Set(); }
  }
  function scSave(set) { try { localStorage.setItem(SC_KEY, JSON.stringify(Array.from(set))); } catch (e) {} }
  function scTitle(card) { const h = card.querySelector(':scope > h3'); return h ? h.textContent.trim() : null; }
  function scSyncToggleAll() {
    const btn = content.querySelector('#sc-toggle-all');
    if (!btn) return;
    const cards = Array.from(content.querySelectorAll('.settings-card')).filter(scTitle);
    btn.textContent = cards.length && cards.every(c => c.classList.contains('collapsed')) ? 'Развернуть всё' : 'Свернуть всё';
  }
  function scSetCollapsed(card, collapsed) {
    card.classList.toggle('collapsed', collapsed);
    const h = card.querySelector(':scope > h3');
    if (h) h.setAttribute('aria-expanded', String(!collapsed));
  }
  function initSettingsCollapse() {
    const set = scCollapsedSet();
    content.querySelectorAll('.settings-card').forEach(card => {
      const title = scTitle(card);
      if (!title) return;
      const h = card.querySelector(':scope > h3');
      h.setAttribute('role', 'button');
      h.tabIndex = 0;
      scSetCollapsed(card, set.has(title));
    });
    scSyncToggleAll();
    const all = content.querySelector('#sc-toggle-all');
    if (all) all.addEventListener('click', () => {
      const cards = Array.from(content.querySelectorAll('.settings-card')).filter(scTitle);
      const collapse = !cards.every(c => c.classList.contains('collapsed'));
      const s = new Set();
      cards.forEach(c => { scSetCollapsed(c, collapse); if (collapse) s.add(scTitle(c)); });
      scSave(s);
      scSyncToggleAll();
    });
  }
  function onSettingsHeadClick(e) {
    if (currentView !== 'settings') return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    const h = e.target.closest('.settings-card > h3');
    if (!h) return;
    e.preventDefault();
    const card = h.parentElement;
    const collapsed = !card.classList.contains('collapsed');
    scSetCollapsed(card, collapsed);
    const set = scCollapsedSet();
    collapsed ? set.add(scTitle(card)) : set.delete(scTitle(card));
    scSave(set);
    scSyncToggleAll();
  }
  content.addEventListener('click', onSettingsHeadClick);
  content.addEventListener('keydown', onSettingsHeadClick);

  function initSettingsExtras() {
    initSettingsCollapse();
    bindMglSc();
    bindCustomCard();
    bindSettingsData();
    bindDebugCard();
    content.querySelectorAll('[data-uipref]').forEach(sw => sw.addEventListener('click', () => {
      const key = sw.dataset.uipref;
      const on = !sw.classList.contains('on');
      sw.classList.toggle('on', on);
      saveSettings({ [key]: on });
      if (key === 'optimization') {
        const rest = content.querySelector('.ui-pref-rest');
        if (rest) rest.classList.toggle('hidden', on);
      }
      applyUiPrefs();
      const dbg = content.querySelector('#debug-card');
      if (dbg && key === 'optimization') { dbg.innerHTML = debugCardHtml(); bindDebugCard(); }
      if (key === 'optimization' || key === 'noBackground') {
        const cur = content.querySelector('.bg-current');
        if (cur) renderBgCard();
      }
    }));
    content.querySelectorAll('[data-notifpref]').forEach(sw => sw.addEventListener('click', () => {
      const on = !sw.classList.contains('on');
      sw.classList.toggle('on', on);
      saveSettings({ [sw.dataset.notifpref]: on });
    }));
    initUpdateButton();
    refreshUpdateButton(false);
    bindLaunchCard();
    bindCrashCard();
    const langSel = content.querySelector('#set-lang');
    if (langSel) langSel.addEventListener('change', async () => {
      const ipc = getIpc();
      D.settings = { ...(D.settings || {}), language: langSel.value };
      if (ipc) { try { await ipc.invoke('settings:save', { language: langSel.value }); } catch (e) {} }
      if (window.MglI18n) MglI18n.change(langSel.value);        // сохраняет выбор в localStorage и перезагружает окно
    });
    bindRailCard();
    initBgCard();
  }

  let _editIconId = null;
  function initLibraryIcons() {
    const fileInput = content.querySelector('#lib-icon-file');
    if (!fileInput) return;
    content.querySelectorAll('.lib-icon-wrap[data-edit]').forEach(w =>
      w.addEventListener('click', (e) => { e.stopPropagation(); _editIconId = w.dataset.edit; fileInput.click(); }));
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0]; fileInput.value = '';
      if (!f || !_editIconId) return;
      const fr = new FileReader();
      fr.onload = () => { MglIcons.set(_editIconId, fr.result); _editIconId = null; setView('library'); toast('Картинка сборки обновлена'); };
      fr.readAsDataURL(f);
    });
  }

  let _instMenuInst = null, _instMenuBound = false;
  function showInstMenu(inst, x, y) {
    const menu = document.getElementById('inst-menu');
    if (!menu) return;
    _instMenuInst = inst;
    const pinLabel = menu.querySelector('[data-pin-label]');
    if (pinLabel) pinLabel.textContent = inst.pinned ? 'Открепить' : 'Закрепить';
    // «Сбросить иконку» - только если установлена своя
    const resetItem = menu.querySelector('[data-reset-icon-item]');
    if (resetItem) {
      const hasCustom = window.MglIcons && MglIcons.get(inst.id);
      resetItem.style.display = hasCustom ? '' : 'none';
    }
    const javaNote = menu.querySelector('[data-java-note]');
    if (javaNote) javaNote.textContent = ((D.settings || {}).instanceJava || {})[inst.folder] ? 'своя' : '';
    UiBus.emit('instmenu:open', { inst, menu });
    menu.classList.remove('hidden');
    menu.style.visibility = 'hidden';
    menu.style.left = '0px'; menu.style.top = '0px';
    const w = menu.offsetWidth, h = menu.offsetHeight;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w));
    const top = Math.min(window.innerHeight - h - 8, y);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = '';
    if (!_instMenuBound) {
      _instMenuBound = true;
      menu.querySelectorAll('[data-act]').forEach(btn =>
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          const inst = _instMenuInst;
          hideInstMenu();
          if (!inst) return;
          if (act === 'play') doLaunch(inst.folder);
          else if (act === 'rename') renameInstance(inst);
          else if (act === 'pin') togglePinInstance(inst);
          else if (act === 'reset-icon') resetInstanceIcon(inst);
          else if (act === 'java') instanceJavaModal(inst);
          else if (act === 'reinstall') reinstallInstance(inst);
          else if (act === 'delete') deleteInstance(inst);
        }));
      document.addEventListener('click', hideInstMenu);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideInstMenu(); });
      window.addEventListener('resize', hideInstMenu);
      window.addEventListener('scroll', hideInstMenu, true);
    }
  }
  function hideInstMenu() {
    const menu = document.getElementById('inst-menu');
    if (menu) menu.classList.add('hidden');
    _instMenuInst = null;
  }
  function renameInstance(inst) {
    const current = inst.name || inst.folder;
    showModal({
      title: 'Переименовать сборку',
      bodyHtml: `
        <div class="field"><label class="field-label">Имя</label>
          <input type="text" id="rn-name" value="${escapeHtml(current)}"></div>
        <div class="field-hint">Папка на диске (${escapeHtml(inst.folder)}) не меняется.</div>`,
      okText: 'Сохранить',
      onOk: (modal) => {
        const name = modal.querySelector('#rn-name').value.trim();
        if (!name || name === current) return true;
        const aliases = { ...((D.settings && D.settings.aliases) || {}) };
        if (name === inst.folder) delete aliases[inst.folder];
        else aliases[inst.folder] = name;
        saveSettings({ aliases });
        inst.name = name;
        normalize();
        setView(currentView);
        renderInstances();
        toast('Переименовано: ' + name);
        return true;
      }
    });
    setTimeout(() => {
      const i = document.querySelector('#rn-name');
      if (i) { i.focus(); i.select(); }
    }, 50);
  }
  function togglePinInstance(inst) {
    const pinned = [...((D.settings && D.settings.pinned) || [])];
    const idx = pinned.indexOf(inst.folder);
    if (idx >= 0) pinned.splice(idx, 1); else pinned.push(inst.folder);
    saveSettings({ pinned });
    normalize();
    setView(currentView);
    renderInstances();
    toast(idx >= 0 ? 'Откреплено' : 'Закреплено');
  }
  function resetInstanceIcon(inst) {
    if (!window.MglIcons) return;
    if (!MglIcons.get(inst.id)) { toast('У сборки нет своей иконки'); return; }
    MglIcons.clear(inst.id);
    setView(currentView);
    renderInstances();
    toast('Иконка сброшена');
  }
  // Java для одной сборки: settings.instanceJava[folder] (main читает её в mc:launch раньше общей javaPath)
  async function instanceJavaModal(inst) {
    const ipc = getIpc();
    if (!ipc) { toast('Выбор Java доступен только в приложении'); return; }
    const label = inst.name || inst.folder;
    const [det, scan] = await Promise.all([
      ipc.invoke('java:detect', inst.folder).catch(() => null),
      ipc.invoke('java:scan').catch(() => null)
    ]);
    const need = (det && det.major) || 17;
    const cur = ((D.settings || {}).instanceJava || {})[inst.folder] || '';
    const found = (scan && scan.list) || [];
    const fits = (m) => need <= 8 ? m === 8 : m >= need;
    const known = found.some(j => j.path === cur);
    const opt = (v, text, sel) => `<option value="${escapeHtml(v)}" ${sel ? 'selected' : ''}>${escapeHtml(text)}</option>`;
    const options = [opt('', `Автоматически (Java ${need})`, !cur)]
      .concat(found.slice().sort((a, b) => (fits(b.major) - fits(a.major)) || (b.major - a.major))
        .map(j => opt(j.path, `Java ${j.major} · ${j.vendor}${fits(j.major) ? '' : ' - не подходит'} · ${j.path}`, j.path === cur)))
      .concat(cur && !known ? [opt(cur, 'Свой путь: ' + cur, true)] : [])
      .concat([opt('__custom', 'Выбрать файл…', false)]);
    const wrap = showModal({
      title: 'Java для сборки',
      bodyHtml: `
        <div class="field-hint" style="margin:0 0 12px">Сборке <b>${escapeHtml(label)}</b> нужна <b>Java ${need}${need <= 8 ? '' : '+'}</b>. Выбор действует только для этой сборки и важнее пути из «Настройки → Java и память».</div>
        <div class="field"><label class="field-label">Java</label>
          <select id="ij-select">${options.join('')}</select></div>
        <div class="jg-status" id="ij-status"></div>`,
      okText: 'Сохранить',
      onOk: async (m) => {
        const val = m.querySelector('#ij-select').value;
        if (val === '__custom') { toast('Выберите файл Java'); return false; }
        const map = { ...((D.settings || {}).instanceJava || {}) };
        if (val) map[inst.folder] = val; else delete map[inst.folder];
        saveSettings({ instanceJava: map });
        toast(val ? `Java для «${label}» сохранена` : `«${label}»: Java подбирается автоматически`);
        return true;
      }
    });
    const sel = wrap.querySelector('#ij-select'), st = wrap.querySelector('#ij-status');
    const check = async () => {
      const v = sel.value;
      if (!v || v === '__custom') { st.className = 'jg-status'; st.textContent = ''; return; }
      const r = await ipc.invoke('java:inspect', v).catch(() => null);
      if (!r || !r.ok) { st.className = 'jg-status bad'; st.textContent = 'Файл не найден'; return; }
      if (!r.ascii) { st.className = 'jg-status bad'; st.textContent = 'В пути есть кириллица - Java может не запуститься (could not open jvm.cfg)'; return; }
      if (r.major && !fits(r.major)) { st.className = 'jg-status bad'; st.textContent = `Это Java ${r.major}, а сборке нужна Java ${need}${need <= 8 ? '' : '+'} - игра, скорее всего, не запустится`; return; }
      st.className = 'jg-status good'; st.textContent = r.major ? `Java ${r.major} - подходит` : 'Версию Java определить не удалось';
    };
    sel.addEventListener('change', async () => {
      if (sel.value !== '__custom') { check(); return; }
      const picked = await ipc.invoke('dialog:pickJava');
      if (!picked) { sel.value = cur || ''; check(); return; }
      if (!Array.from(sel.options).some(o => o.value === picked)) {
        const o = document.createElement('option');
        o.value = picked; o.textContent = 'Свой путь: ' + picked;
        sel.insertBefore(o, sel.querySelector('option[value="__custom"]'));
      }
      sel.value = picked;
      sel.dispatchEvent(new Event('change'));
    });
    check();
  }
  async function reinstallInstance(inst) {
    const label = inst.name || inst.folder;
    const ipc = getIpc();
    if (!ipc) { toast('Переустановка доступна только в приложении'); return; }
    if ((D.sessions || []).some(s => s.folder === inst.folder)) { toast('Сначала закройте игру'); return; }
    if (!await confirmDialog({ title: 'Переустановить сборку', message: `Переустановить сборку «${label}»?\n\nПрофиль, client.jar, нативы и библиотеки будут скачаны заново (потребуется интернет). Миры, моды и настройки не затрагиваются. Если установка не удастся, старая версия вернётся.`, okText: 'Переустановить' })) return;
    const taskId = 're:' + inst.folder;
    Downloads.start(taskId, 'mc', 'Переустановка: ' + label);
    const onProg = (e, d) => { if (d.folder === inst.folder) Downloads.update(taskId, { progress: d.progress, status: d.status }); };
    ipc.on('mc:reinstallProgress', onProg);
    toast('Переустановка запущена - прогресс в трее загрузок');
    const r = await ipc.invoke('mc:reinstall', inst.folder);
    ipc.removeListener('mc:reinstallProgress', onProg);
    if (!r || !r.ok) {
      Downloads.finish(taskId, { ok: false, error: (r && r.error) || 'ошибка' });
      toast(r && r.cancelled ? 'Переустановка отменена - старая версия возвращена' : 'Не удалось переустановить: ' + ((r && r.error) || ''));
      return;
    }
    Downloads.finish(taskId, { ok: true });
    try { D.instances = await ipc.invoke('mc:getInstalled'); normalize(); renderInstances(); } catch (e) {}
    if (currentView === 'library' || currentView === 'home') setView(currentView);
    toast('Сборка переустановлена: ' + label);
  }
  async function deleteInstance(inst) {
    const label = inst.name || inst.folder;
    const ok = await confirmDialog({ title: 'Удалить сборку', message: `Удалить сборку «${label}»?\n\nПапка versions/${inst.folder} будет удалена с диска. Это действие нельзя отменить.`, okText: 'Удалить', danger: true });
    if (!ok) return;
    const ipc = getIpc();
    if (!ipc) { toast('Удаление доступно только в приложении'); return; }
    const res = await ipc.invoke('mc:deleteVersion', inst.folder);
    if (res && res.ok) {
      D.instances = (D.instances || []).filter(i => i.folder !== inst.folder);
      if (D.settings) {
        if (D.settings.aliases) delete D.settings.aliases[inst.folder];
        if (D.settings.pinned) D.settings.pinned = D.settings.pinned.filter(x => x !== inst.folder);
      }
      setView(currentView);
      renderInstances();
      toast('Сборка удалена: ' + label);
    } else {
      toast('Не удалось удалить: ' + (res && res.error || 'неизвестная ошибка'));
    }
  }

  // кавычки тоже: строка подставляется и в атрибуты (value="…", src="…") - иначе из названия с Modrinth можно вписать onfocus=…
  function escapeHtml(t) {
    return (t == null ? '' : String(t)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatPlaytime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} ч ${m} мин`;
    if (m > 0) return `${m} мин ${s} с`;
    return `${s} с`;
  }
  function getIpc() { try { return window.require ? window.require('electron').ipcRenderer : null; } catch (e) { return null; } }
  function cmpVerDesc(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (y[i] || 0) - (x[i] || 0); if (d) return d; }
    return 0;
  }
  function cmpVer(a, b) { return -cmpVerDesc(a, b); }
  function saveSettings(patch) {
    D.settings = { ...(D.settings || {}), ...patch };
    const ipc = getIpc();
    if (ipc) ipc.invoke('settings:save', patch);
    if (patch.username) { D.profile.name = patch.username; const pn = document.getElementById('profile-name'); if (pn) pn.textContent = patch.username; }
    UiBus.emit('settings:change', patch);
  }

  let _sidebarFilter = '';
  function renderInstances() {
    const list = document.getElementById('instance-list');
    if (!list) return;
    if (!(D.instances && D.instances.length)) {
      list.innerHTML = `<div class="sidebar-empty">Нет установленных версий<br><button type="button" class="sidebar-empty-btn" data-empty-act="install-version">Установить версию</button>
        <button type="button" class="sidebar-empty-btn" data-empty-act="create-pack">Создать сборку</button></div>`;
      return;
    }
    const q = _sidebarFilter.trim().toLowerCase();
    const items = q
      ? D.instances.filter(i =>
          (i.name || '').toLowerCase().includes(q) ||
          (i.ver || '').toLowerCase().includes(q) ||
          (i.loader || '').toLowerCase().includes(q) ||
          (i.loaderName || '').toLowerCase().includes(q))
      : D.instances;
    if (!items.length) {
      list.innerHTML = `<div class="sidebar-empty">Ничего не найдено</div>`;
      return;
    }
    list.innerHTML = items.map(inst => `
      <div class="instance-row" data-play="${inst.id}">
        <img class="instance-icon" src="${iconFor(inst)}" alt="">
        <div class="instance-meta"><div class="instance-name">${escapeHtml(inst.name)}</div>
          <div class="instance-ver">${escapeHtml(inst.ver)}${inst.loader !== 'vanilla' ? ' · ' + inst.loaderName : ''}</div></div>
      </div>`).join('');
    list.querySelectorAll('[data-play]').forEach(el =>
      el.addEventListener('click', () => { const inst = D.instances.find(i => i.id === el.dataset.play); if (inst) doLaunch(inst.folder); }));
  }
  function initSidebarSearch() {
    const inp = document.getElementById('sidebar-search');
    if (!inp) return;
    inp.addEventListener('input', () => { _sidebarFilter = inp.value || ''; renderInstances(); });
    const wrap = inp.closest('.search');
    if (wrap) wrap.addEventListener('click', (e) => { if (e.target !== inp) inp.focus(); });
  }

  const _notifs = [];
  let _newsKnown = null;
  function newsKey(n) { return (n.title || '') + '|' + (n.desc || '') + '|' + (n.url || ''); }
  function seenNewsSet() { return new Set((D.settings && D.settings.newsSeen) || []); }
  function unreadNews() {
    if (!_newsLoaded) return [];
    const seen = seenNewsSet();
    return _newsItems.filter(n => !seen.has(newsKey(n)));
  }
  function updateUnread() { return isUpdateAvailable() && (D.settings && D.settings.updateSeenVersion) !== _remoteMeta.latestVersion; }
  function unreadCount() { return unreadNews().length + _notifs.filter(n => !n.read).length + (updateUnread() ? 1 : 0); }
  function markNewsRead() {
    if (!_newsLoaded) return;
    const prev = (D.settings && D.settings.newsSeen) || [];
    const keys = _newsItems.map(newsKey);
    if (keys.every(k => prev.includes(k))) return;
    saveSettings({ newsSeen: Array.from(new Set(keys.concat(prev))).slice(0, 300) });
    updateBadges();
  }
  function markAllRead() {
    markNewsRead();
    _notifs.forEach(n => { n.read = true; });
    if (updateUnread()) saveSettings({ updateSeenVersion: _remoteMeta.latestVersion });
    updateBadges();
  }
  function notifPrefs() {
    const s = D.settings || {};
    const on = (k) => s[k] !== false;
    return { desktop: on('notifyDesktop'), news: on('notifyNews'), updates: on('notifyUpdates'), servers: on('notifyServers') };
  }
  function notifPrefToggle(key, title, sub, s) {
    return `<div class="toggle-row"><div><div class="tl">${title}</div><div class="ts">${sub}</div></div>
      <div class="switch ${s[key] === false ? '' : 'on'}" data-notifpref="${key}"></div></div>`;
  }
  function desktopNotify(title, body, onClick) {
    if (!notifPrefs().desktop) return false;
    if (document.hasFocus() && !document.hidden) return false;
    try {
      if (!('Notification' in window) || Notification.permission === 'denied') return false;
      const tr = window.MglI18n ? MglI18n.t : (s) => s;
      const n = new Notification(tr(title), { body: tr(body), icon: 'assets/icons/icon.png' });
      n.onclick = () => {
        const ipc = getIpc();
        if (ipc) ipc.send('focus-window'); else window.focus();
        if (onClick) onClick();
      };
      return true;
    } catch (e) { return false; }
  }
  function notify({ kind, title, text, view }) {
    if (kind === 'server' && !notifPrefs().servers) return;
    _notifs.unshift({ id: Date.now() + Math.random(), kind, title, text, view, ts: Date.now(), read: false });
    if (_notifs.length > 20) _notifs.length = 20;
    if (!desktopNotify(title, text, () => view && setView(view))) toast(title);
    renderNotifPop();
    updateBadges();
  }
  function updateBadges() {
    const n = unreadCount();
    const btn = document.getElementById('notif-btn');
    if (btn) {
      let b = btn.querySelector('.notif-badge');
      if (!b) { b = document.createElement('span'); b.className = 'notif-badge'; btn.appendChild(b); }
      b.textContent = n > 9 ? '9+' : String(n);
      b.classList.toggle('hidden', !n);
      btn.title = n ? `Уведомления: ${n} непрочитанных` : 'Уведомления';
    }
    const newsN = unreadNews().length;
    const link = document.querySelector('.nav-link[data-view="news"]');
    if (link) {
      let c = link.querySelector('.nav-new');
      if (!c) { c = document.createElement('span'); c.className = 'nav-count nav-new'; link.appendChild(c); }
      c.textContent = newsN ? String(newsN) : '';
      c.classList.toggle('hidden', !newsN);
    }
    const rail = document.querySelector('#rail-items [data-rail="news"]');
    if (rail) rail.classList.toggle('has-dot', newsN > 0);
  }
  function renderNotifPop() {
    const pop = document.getElementById('notif-pop');
    if (!pop) return;
    const seen = seenNewsSet();
    const news = (_newsLoaded ? _newsItems : (D.news || []).map(n => ({ title: n.title, desc: n.text, url: '' }))).slice(0, 2);
    const parts = [];
    if (isUpdateAvailable()) {
      parts.push(`
        <div class="notif-item notif-update ${updateUnread() ? 'unread' : ''}">
          <div class="notif-ico">${I.dl}</div>
          <div class="notif-body"><div class="notif-title">Доступно обновление ${escapeHtml(_remoteMeta.latestVersion)}</div>
            <div class="notif-text">У вас версия ${LAUNCHER_VERSION}. Новая версия скачается и установится автоматически.</div>
            <button class="btn primary sm notif-update-btn" data-notif-update>Обновить</button></div>
        </div>`);
    }
    _notifs.slice(0, 3).forEach(n => parts.push(`
        <div class="notif-item ${n.read ? '' : 'unread'} ${n.view ? 'clickable' : ''}" ${n.view ? `data-notif-view="${n.view}"` : ''}>
          <div class="notif-dot ${n.kind}"></div>
          <div class="notif-body"><div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-text">${escapeHtml(n.text)}</div><div class="notif-date">${fmtClock(n.ts)}</div></div>
        </div>`));
    const newsHtml = news.length
      ? news.map(n => `
        <div class="notif-item ${seen.has(newsKey(n)) || !_newsLoaded ? '' : 'unread'}">
          <div class="notif-dot"></div>
          <div class="notif-body"><div class="notif-title" translate="no">${escapeHtml(newsText(n, 'title'))}</div>
            <div class="notif-text" translate="no">${escapeHtml(newsText(n, 'desc'))}</div>
            ${n.url ? `<a class="notif-link" href="#" data-notif-url="${escapeHtml(n.url)}">Открыть ссылку</a>` : ''}</div>
        </div>`).join('')
      : `<div class="notif-empty">${I.box}<div>Пока нет новостей</div><div class="empty-sub">Здесь будут появляться обновления и анонсы</div></div>`;
    pop.innerHTML = `<div class="notif-head"><span>Уведомления</span>${unreadCount() ? '<a href="#" data-notif-readall>Прочитать всё</a>' : ''}</div>`
      + parts.join('')
      + (parts.length ? '<div class="notif-sub">Новости</div>' : '')
      + newsHtml
      + `<div class="notif-footer"><a href="#" data-notif-all>Все новости →</a></div>`;
    pop.querySelectorAll('[data-notif-url]').forEach(el => el.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const ipc = getIpc();
      if (ipc) ipc.send('open-url', el.dataset.notifUrl); else window.open(el.dataset.notifUrl, '_blank');
    }));
    const close = () => { pop.classList.add('hidden'); markAllRead(); };
    const all = pop.querySelector('[data-notif-all]');
    if (all) all.addEventListener('click', (e) => { e.preventDefault(); close(); setView('news'); });
    const readAll = pop.querySelector('[data-notif-readall]');
    if (readAll) readAll.addEventListener('click', (e) => { e.preventDefault(); markAllRead(); renderNotifPop(); });
    const upd = pop.querySelector('[data-notif-update]');
    if (upd) upd.addEventListener('click', () => {
      close();
      setView('settings');
      const b = content.querySelector('#upd-btn');
      if (b && isUpdateAvailable()) startUpdateDownload(b);
    });
    pop.querySelectorAll('[data-notif-view]').forEach(el => el.addEventListener('click', () => { close(); setView(el.dataset.notifView); }));
  }
  function onNewsRefreshed() {
    const p = notifPrefs();
    if (_newsKnown && p.news) {
      const fresh = _newsItems.filter(n => !_newsKnown.has(newsKey(n)));
      if (fresh.length) {
        const n = fresh[0];
        const title = fresh.length > 1 ? `Новые новости (${fresh.length})` : 'Новость: ' + n.title;
        if (!desktopNotify(title, n.desc || n.title, () => setView('news'))) toast(title);
      }
    }
    if (_newsLoaded) _newsKnown = new Set(_newsItems.map(newsKey));
    if (isUpdateAvailable() && p.updates && (D.settings || {}).updateNotifiedVersion !== _remoteMeta.latestVersion) {
      saveSettings({ updateNotifiedVersion: _remoteMeta.latestVersion });
      const title = `Доступно обновление ${_remoteMeta.latestVersion}`;
      if (!desktopNotify('Magma Launcher: ' + title, 'Откройте уведомления или настройки, чтобы обновиться', () => setView('settings'))) toast(title);
    }
    renderNotifPop();
    updateBadges();
    if (currentView === 'settings') refreshUpdateButton(false);
    if (currentView === 'news') initNewsView();
  }
  function initNotifications() {
    const btn = document.getElementById('notif-btn');
    if (!btn) return;
    let pop = document.getElementById('notif-pop');
    if (!pop) { pop = document.createElement('div'); pop.id = 'notif-pop'; pop.className = 'notif-pop hidden'; document.body.appendChild(pop); }
    renderNotifPop();
    updateBadges();
    fetchNews().then(onNewsRefreshed);

    const closeOnce = () => {
      if (pop.classList.contains('hidden')) return;
      pop.classList.add('hidden');
      document.removeEventListener('click', closeOnce);
      markAllRead();
    };
    btn.onclick = (e) => {
      e.stopPropagation();
      const r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 8) + 'px';
      pop.style.right = Math.max(10, window.innerWidth - r.right) + 'px';
      if (pop.classList.contains('hidden')) {
        renderNotifPop();
        pop.classList.remove('hidden');
        setTimeout(() => document.addEventListener('click', closeOnce), 0);
      } else closeOnce();
    };
    pop.onclick = e => e.stopPropagation();
  }

  function launchOpts() {
    return {
      customResolution: false, width: 1280, height: 720, fullscreen: false,
      quickPlayType: 'none', quickPlayValue: '', extraJvmArgs: '', wrapper: '', preLaunch: '', postExit: '',
      ...((D.settings && D.settings.launchOptions) || {})
    };
  }
  const QP_PLACEHOLDER = { none: 'Выберите режим', multiplayer: 'play.example.com:25565', singleplayer: 'Имя папки мира в saves/', realms: 'ID Realms-мира' };
  function launchCardHtml() {
    const o = launchOpts();
    const qpOpt = (v, l) => `<option value="${v}" ${o.quickPlayType === v ? 'selected' : ''}>${l}</option>`;
    return `
      <h3>Параметры запуска</h3>
      <div class="field"><label class="field-label">Дополнительные JVM-аргументы</label>
        <textarea id="lo-jvm" class="lo-textarea" rows="2" spellcheck="false" placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=50">${escapeHtml(o.extraJvmArgs)}</textarea>
        <div class="field-hint lo-hint">Добавляются после стандартных. Кавычки поддерживаются: -Dkey="a b". Память задаётся ползунком выше.</div></div>
      <div class="toggle-row"><div><div class="tl">Своё разрешение окна</div><div class="ts">Размер окна игры при запуске (--width / --height)</div></div>
        <div class="switch ${o.customResolution ? 'on' : ''}" data-lo-toggle="customResolution"></div></div>
      <div class="field-row lo-res ${o.customResolution ? '' : 'hidden'}">
        <input type="number" id="lo-w" min="320" max="7680" value="${+o.width || 1280}">
        <span class="lo-x">×</span>
        <input type="number" id="lo-h" min="240" max="4320" value="${+o.height || 720}">
        <select id="lo-preset"><option value="">Пресеты…</option><option>854x480</option><option>1280x720</option><option>1600x900</option><option>1920x1080</option><option>2560x1440</option></select>
      </div>
      <div class="toggle-row"><div><div class="tl">Полноэкранный режим</div><div class="ts">Сразу открывать игру на весь экран (--fullscreen)</div></div>
        <div class="switch ${o.fullscreen ? 'on' : ''}" data-lo-toggle="fullscreen"></div></div>
      <div class="field lo-gap"><label class="field-label">Окно лаунчера, когда игра запущена</label>
        <select id="lo-win">${[['keep', 'Оставить как есть'], ['minimize', 'Свернуть в панель задач'], ['tray', 'Скрыть в трей']]
          .map(([v, l]) => `<option value="${v}" ${((D.settings && D.settings.windowOnLaunch) || 'keep') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="field-hint lo-hint">Когда закроется последняя запущенная игра, окно вернётся само.</div></div>
      <div class="field lo-gap"><label class="field-label">Quick Play - куда зайти сразу после запуска</label>
        <div class="field-row">
          <select id="lo-qp-type">${qpOpt('none', 'Выключено')}${qpOpt('multiplayer', 'Сервер')}${qpOpt('singleplayer', 'Одиночный мир')}${qpOpt('realms', 'Realms')}</select>
          <input type="text" id="lo-qp-value" value="${escapeHtml(o.quickPlayValue)}" placeholder="${QP_PLACEHOLDER[o.quickPlayType] || ''}" ${o.quickPlayType === 'none' ? 'disabled' : ''}>
        </div>
        <div class="field-hint lo-hint">Сервер работает на всех версиях (до 1.20 - через --server). Мир и Realms - только 1.20+. Кнопка «Играть» у сервера подставляет его автоматически.</div></div>
      <div class="lo-sub">Хуки и обёртка</div>
      <div class="field"><label class="field-label">Pre-launch команда</label>
        <input type="text" id="lo-pre" value="${escapeHtml(o.preLaunch)}" placeholder="например: backup.bat" spellcheck="false">
        <div class="field-hint lo-hint">Выполняется перед запуском, вывод идёт в лог игры. Ненулевой код выхода отменяет запуск.</div></div>
      <div class="field"><label class="field-label">Wrapper-команда</label>
        <input type="text" id="lo-wrapper" value="${escapeHtml(o.wrapper)}" placeholder='например: "C:\\Tools\\optirun.exe"' spellcheck="false">
        <div class="field-hint lo-hint">Игра запускается как: &lt;wrapper&gt; &lt;java&gt; &lt;аргументы&gt;.</div></div>
      <div class="field"><label class="field-label">Post-exit команда</label>
        <input type="text" id="lo-post" value="${escapeHtml(o.postExit)}" placeholder="например: cleanup.bat" spellcheck="false">
        <div class="field-hint lo-hint">Выполняется после закрытия игры.</div></div>
      <div class="field-hint">Переменные окружения в командах: %INST_NAME%, %INST_DIR%, %INST_JAVA%, %INST_MC_VERSION%, в post-exit ещё %INST_EXIT_CODE%.</div>`;
  }
  // ---- «Отчёты о сбоях и логи» (main: crash:* / logs:*, scripts/crash-reporter.js) ----
  const fmtBytes = (b) => { b = +b || 0; return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' ГБ' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : b >= 1024 ? Math.round(b / 1024) + ' КБ' : b + ' Б'; };
  const CRASH_KIND = { main: 'Лаунчер', rejection: 'Лаунчер', renderer: 'Окно', 'renderer-gone': 'Окно', unresponsive: 'Зависание', 'child-gone': 'Процесс', game: 'Игра', test: 'Тест' };
  function copyText(t) {
    try { window.require('electron').clipboard.writeText(t); return true; } catch (e) {}
    try { navigator.clipboard.writeText(t); return true; } catch (e) { return false; }
  }
  function crashCardHtml() {
    const s = D.settings || {};
    const keep = s.logKeepDays == null ? 0 : +s.logKeepDays;
    const logRow = (scope, title, sub) => `<div class="toggle-row"><div><div class="tl">${title}</div><div class="ts" data-log-info="${scope}">${sub}</div></div>
      <div class="field-row log-btns"><button class="btn-secondary" data-log-open="${scope}">Папка</button><button class="btn-secondary danger" data-log-clear="${scope}">Очистить</button></div></div>`;
    return `
      <h3>Отчёты о сбоях и логи</h3>
      <div class="field-hint" style="margin:0 0 12px">Если лаунчер или игра падают, подробности сохраняются в файл на этом компьютере. Ничего никуда не отправляется - отчёт можно открыть, скопировать и показать разработчикам. Имя пользователя в путях маскируется.</div>
      ${notifPrefToggle('crashReports', 'Сохранять отчёты о сбоях', 'Падение игры, ошибки в окне и главном процессе, зависания', s)}
      <div class="crash-head"><div class="lo-sub" style="margin:0">Отчёты</div>
        <div class="field-row"><button class="btn-secondary" id="crash-open-dir">Папка</button><button class="btn-secondary" id="crash-test">Тестовый отчёт</button><button class="btn-secondary danger" id="crash-clear">Удалить все</button></div></div>
      <div class="crash-list" id="crash-list"><div class="field-hint">Загрузка…</div></div>
      <div class="lo-sub">Логи</div>
      ${logRow('game-logs', 'Логи игры', 'logs/ в .minecraft и сборках')}
      ${logRow('game-crashes', 'Отчёты самой игры', 'crash-reports/ в .minecraft и сборках')}
      ${logRow('plugins', 'Логи плагинов', 'plugin-logs/')}
      <div class="field lo-gap"><label class="field-label">Автоочистка логов и отчётов игры</label>
        <select id="log-keep-days">${[[0, 'Не удалять'], [7, 'Старше 7 дней'], [14, 'Старше 14 дней'], [30, 'Старше 30 дней'], [90, 'Старше 90 дней']]
          .map(([v, l]) => `<option value="${v}" ${keep === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="field-hint lo-hint">Проверяется при запуске лаунчера. latest.log запущенной игры не удаляется.</div></div>`;
  }
  async function refreshCrashCard() {
    const list = content.querySelector('#crash-list');
    if (!list) return;
    const ipc = getIpc();
    if (!ipc) { list.innerHTML = '<div class="field-hint">Доступно в приложении</div>'; return; }
    const r = await ipc.invoke('crash:list').catch(() => null);
    if (!list.isConnected) return;
    const items = (r && r.items) || [], seen = (r && r.seenTs) || 0;
    list.innerHTML = items.length ? items.map(i => `
      <div class="crash-item ${i.mtime > seen ? 'new' : ''}" data-crash="${escapeHtml(i.name)}" role="button" tabindex="0">
        <span class="crash-kind">${CRASH_KIND[i.kind] || escapeHtml(i.kind)}</span>
        <div class="crash-main"><div class="crash-sum">${escapeHtml(i.summary || i.name)}</div>
          <div class="crash-meta">${new Date(i.mtime).toLocaleString(MGL_LOCALE)} · ${fmtBytes(i.size)}</div></div>
        <button class="btn-ghost" data-crash-del title="Удалить" aria-label="Удалить отчёт">×</button>
      </div>`).join('') : '<div class="field-hint">Сбоев не было - отчётов нет.</div>';
    _crashUnseen = 0;
    ipc.invoke('crash:seen');
    const li = await ipc.invoke('logs:info').catch(() => null);
    if (li) content.querySelectorAll('[data-log-info]').forEach(el => {
      const x = li[el.dataset.logInfo];
      if (x) el.textContent = x.count ? `${x.count} файлов · ${fmtBytes(x.size)}` : 'пусто';
    });
  }
  async function openCrashReport(name) {
    const ipc = getIpc();
    const r = await ipc.invoke('crash:read', name).catch(() => null);
    if (!r || !r.ok) { toast('Не удалось открыть отчёт'); return; }
    const wrap = showModal({
      title: name, wide: true, okText: 'Скопировать',
      bodyHtml: `<pre class="crash-text">${escapeHtml(r.text)}</pre>`,
      onOk: () => { toast(copyText(r.text) ? 'Отчёт скопирован' : 'Не удалось скопировать'); return false; }
    });
    wrap.querySelector('.modal-cancel').textContent = 'Закрыть';
    const reveal = document.createElement('button');
    reveal.className = 'btn-secondary'; reveal.textContent = 'Показать в папке';
    reveal.addEventListener('click', () => ipc.send('crash:reveal', name));
    wrap.querySelector('.modal-foot').prepend(reveal);
  }
  function bindCrashCard() {
    const card = content.querySelector('#crash-card');
    if (!card) return;
    const ipc = getIpc();
    refreshCrashCard();
    const need = () => { if (ipc) return true; toast('Доступно в приложении'); return false; };
    card.querySelector('#crash-open-dir').addEventListener('click', () => need() && ipc.send('crash:openDir'));
    card.querySelector('#crash-test').addEventListener('click', async () => {
      if (!need()) return;
      const r = await ipc.invoke('crash:test');
      if (!r || !r.ok) toast((r && r.error) || 'Не удалось создать отчёт');
    });
    card.querySelector('#crash-clear').addEventListener('click', async () => {
      if (!need()) return;
      if (!await confirmDialog({ title: 'Удалить отчёты', message: 'Удалить все сохранённые отчёты о сбоях лаунчера?', okText: 'Удалить', danger: true })) return;
      await ipc.invoke('crash:clear');
      refreshCrashCard();
    });
    const openItem = (e) => {
      const item = e.target.closest('.crash-item');
      if (!item || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      if (e.target.closest('[data-crash-del]')) {
        if (e.type === 'click') ipc.invoke('crash:remove', item.dataset.crash).then(refreshCrashCard);
        return;
      }
      if (ipc) openCrashReport(item.dataset.crash);
    };
    card.querySelector('#crash-list').addEventListener('click', openItem);
    card.querySelector('#crash-list').addEventListener('keydown', openItem);
    card.querySelectorAll('[data-log-open]').forEach(b => b.addEventListener('click', () => need() && ipc.send('logs:open', b.dataset.logOpen)));
    card.querySelectorAll('[data-log-clear]').forEach(b => b.addEventListener('click', async () => {
      if (!need()) return;
      const scope = b.dataset.logClear;
      if (!await confirmDialog({ title: 'Очистить логи', message: 'Удалить все файлы в этой категории? Это нельзя отменить.', okText: 'Очистить', danger: true })) return;
      const r = await ipc.invoke('logs:clear', scope);
      toast(r && r.ok ? `Удалено файлов: ${r.removed} · освобождено ${fmtBytes(r.freed)}${r.locked ? ` · занято или используется: ${r.locked}` : ''}` : 'Ошибка: ' + ((r && r.error) || ''));
      refreshCrashCard();
    }));
    const keep = card.querySelector('#log-keep-days');
    keep.addEventListener('change', () => { saveSettings({ logKeepDays: parseInt(keep.value, 10) || 0 }); toast('Сохранено'); });
  }

  function bindLaunchCard() {
    const card = content.querySelector('#launch-card');
    if (!card) return;
    const save = (patch) => saveSettings({ launchOptions: { ...launchOpts(), ...patch } });
    card.querySelectorAll('[data-lo-toggle]').forEach(sw => sw.addEventListener('click', () => {
      const k = sw.dataset.loToggle;
      const on = !sw.classList.contains('on');
      sw.classList.toggle('on', on);
      save({ [k]: on });
      if (k === 'customResolution') card.querySelector('.lo-res').classList.toggle('hidden', !on);
    }));
    const w = card.querySelector('#lo-w'), h = card.querySelector('#lo-h');
    const clamp = (el, min, max, def) => Math.max(min, Math.min(max, parseInt(el.value, 10) || def));
    const saveRes = () => { w.value = clamp(w, 320, 7680, 1280); h.value = clamp(h, 240, 4320, 720); save({ width: +w.value, height: +h.value }); };
    w.addEventListener('change', saveRes);
    h.addEventListener('change', saveRes);
    const preset = card.querySelector('#lo-preset');
    preset.addEventListener('change', () => {
      if (!preset.value) return;
      const [pw, ph] = preset.value.split('x');
      w.value = pw; h.value = ph;
      preset.value = '';
      saveRes();
    });
    const winSel = card.querySelector('#lo-win');
    if (winSel) winSel.addEventListener('change', () => { saveSettings({ windowOnLaunch: winSel.value }); toast('Сохранено'); });
    const qpType = card.querySelector('#lo-qp-type'), qpVal = card.querySelector('#lo-qp-value');
    qpType.addEventListener('change', () => {
      qpVal.disabled = qpType.value === 'none';
      qpVal.placeholder = QP_PLACEHOLDER[qpType.value] || '';
      save({ quickPlayType: qpType.value });
      if (!qpVal.disabled) qpVal.focus();
    });
    qpVal.addEventListener('change', () => save({ quickPlayValue: qpVal.value.trim() }));
    [['#lo-jvm', 'extraJvmArgs'], ['#lo-pre', 'preLaunch'], ['#lo-wrapper', 'wrapper'], ['#lo-post', 'postExit']].forEach(([sel, key]) => {
      const el = card.querySelector(sel);
      el.addEventListener('change', () => { save({ [key]: el.value.trim() }); toast('Сохранено'); });
    });
  }

  function normTgUsername(v) {
    return String(v || '').trim().replace(/^@+/, '').toLowerCase();
  }
  async function loadMglRegistry() {
    const ipc = getIpc();
    const url = NEWS_URL + '?t=' + Date.now();
    let data = null;
    try {
      if (ipc) data = await ipc.invoke('fetch-json', url);
      else { const r = await fetch(url, { cache: 'no-store' }); data = await r.json(); }
    } catch (e) { data = null; }
    if (!data) return null;
    return Array.isArray(data.registrations_meta) ? data.registrations_meta : [];
  }
  // Подписи статуса аккаунта: «Зарегистрирован» после входа, иначе локальный режим
  function applyAccountStatus() {
    const auth = (D.settings && D.settings.mglAuth) || null;
    const registered = !!auth;
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setText('profile-sub', registered ? 'Зарегистрирован' : 'Локальный аккаунт');
    setText('account-title', registered ? 'Зарегистрирован' : 'Войдите в аккаунт');
    setText('account-status', registered ? 'Зарегистрирован' : 'Оффлайн-режим');
    setText('acc-mgl-status-tg', registered && auth.tgUsername ? '@' + auth.tgUsername : '');
    const form = document.getElementById('acc-mgl-form');
    const status = document.getElementById('acc-mgl-status');
    if (form) form.classList.toggle('hidden', registered);
    if (status) status.classList.toggle('hidden', !registered);
  }

  function initAccountPopup() {
    const btn = document.getElementById('rail-account');
    const pop = document.getElementById('account-pop');
    if (!btn || !pop) return;
    const place = () => {
      const r = btn.getBoundingClientRect();
      pop.style.left = (r.right + 10) + 'px';
      pop.style.bottom = Math.max(10, window.innerHeight - r.bottom) + 'px';
    };
    const refreshContent = () => {
      const s = D.settings || {};
      const uid = s.userId || 'user_0000_0000_0000_0000';
      const nick = s.username || D.profile.name || 'Player';
      const uidEl = document.getElementById('account-uid');
      const nickEl = document.getElementById('account-nick');
      const mglNickInput = document.getElementById('acc-mgl-nick');
      if (uidEl) uidEl.textContent = uid;
      if (nickEl) nickEl.textContent = nick;
      if (mglNickInput && !mglNickInput.value) mglNickInput.value = nick;
      applyAccountStatus();
    };
    const closeOnce = (e) => {
      if (e && (e.target === btn || btn.contains(e.target) || pop.contains(e.target))) return;
      pop.classList.add('hidden');
      document.removeEventListener('click', closeOnce);
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = pop.classList.contains('hidden');
      if (willOpen) {
        refreshContent();
        place();
        pop.classList.remove('hidden');
        setTimeout(() => document.addEventListener('click', closeOnce), 0);
      } else {
        pop.classList.add('hidden');
        document.removeEventListener('click', closeOnce);
      }
    });
    pop.querySelectorAll('[data-acc-tab]').forEach(tab =>
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.querySelectorAll('[data-acc-tab]').forEach(t => t.classList.toggle('active', t === tab));
        pop.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== tab.dataset.accTab));
      }));
    const regBtn = document.getElementById('acc-mgl-register');
    if (regBtn) regBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ipc = getIpc(), url = 'https://t.me/mglauncherbot';
      if (ipc) ipc.send('open-url', url); else window.open(url, '_blank');
    });
    const loginBtn = document.getElementById('acc-mgl-login');
    if (loginBtn) loginBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const uid = (document.getElementById('acc-mgl-uid').value || '').trim();
      const tg = normTgUsername(document.getElementById('acc-mgl-tg').value);
      const nick = (document.getElementById('acc-mgl-nick').value || '').trim();
      if (!uid) { toast('Введите UID'); return; }
      if (!tg) { toast('Введите Telegram username'); return; }
      loginBtn.disabled = true;
      try {
        const registry = await loadMglRegistry();
        if (!registry) { toast('Не удалось загрузить базу MGL, проверьте интернет'); return; }
        const member = registry.find(m =>
          String(m.launcher_id || '').trim().toLowerCase() === uid.toLowerCase() &&
          normTgUsername(m.tg_username) === tg);
        if (!member) { toast('UID и Telegram не совпадают с базой MGL'); return; }
        saveSettings({
          userId: member.launcher_id,
          username: nick || member.tg_username,
          mglAuth: { uid: member.launcher_id, tgId: member.tg_id, tgUsername: member.tg_username }
        });
        applyAccountStatus();
        refreshContent();
        toast('MGL: вход выполнен как @' + member.tg_username);
      } finally {
        loginBtn.disabled = false;
      }
    });
    const logoutBtn = document.getElementById('acc-mgl-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveSettings({ mglAuth: null });
      applyAccountStatus();
      refreshContent();
      toast('MGL: вы вышли из аккаунта');
    });
    const offBtn = document.getElementById('acc-mgl-offline');
    if (offBtn) offBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nick = (document.getElementById('acc-mgl-nick').value || '').trim();
      if (nick) { saveSettings({ username: nick }); refreshContent(); }
      pop.classList.add('hidden');
      toast('Оффлайн-режим: ' + (nick || 'Player'));
    });
    const mjBtn = document.getElementById('acc-mj-login');
    if (mjBtn) mjBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toast('Microsoft OAuth - в следующем обновлении');
    });
    // клик по UID - скопировать
    const uidEl = document.getElementById('account-uid');
    if (uidEl) uidEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await navigator.clipboard.writeText(uidEl.textContent); toast('UID скопирован'); }
      catch (err) {}
    });
    pop.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('resize', () => { if (!pop.classList.contains('hidden')) place(); });
  }

  let _sessionTimer = null;
  function sessionsFromRunning(running) {
    return (running || []).map(r => {
      const pack = String(r.folder).startsWith('inst:') ? (D.packs || []).find(p => 'inst:' + p.id === r.folder) : null;
      const inst = pack ? { name: pack.name, ver: pack.mc, loaderName: LOADER[pack.loader] || pack.loader } : ((D.instances || []).find(i => i.folder === r.folder) || {});
      return {
        id: 'ses_' + r.folder,
        folder: r.folder,
        name: inst.name || verLabel(r.folder),
        ver: inst.ver || '',
        loaderName: inst.loaderName || '',
        pid: r.pid,
        startedAt: r.startedAt,
        durationSec: Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000))
      };
    });
  }
  async function refreshSessions() {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const running = await ipc.invoke('mc:running');
      D.sessions = sessionsFromRunning(running);
    } catch (e) { D.sessions = []; }
    updateSidebarCounts();
    const el = document.querySelector('.rail-session');
    if (el) el.classList.toggle('active', (D.sessions || []).length > 0);
    // перерисовать активные экраны где это видно
    if (currentView === 'sessions' || currentView === 'home') setView(currentView);
    HeroViz.sync();
  }
  function startSessionTicker() {
    if (_sessionTimer) return;
    _sessionTimer = setInterval(() => {
      if ((D.sessions || []).length === 0) return;
      // просто обновим длительность в DOM без перерисовки
      D.sessions.forEach(s => { s.durationSec = Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000)); });
      document.querySelectorAll('[data-session]').forEach(row => {
        const id = row.dataset.session;
        const s = D.sessions.find(x => x.id === id);
        if (!s) return;
        const meta = row.querySelector('.lib-meta');
        if (meta) {
          const parts = [s.ver, s.loaderName, s.pid ? 'PID ' + s.pid : '', formatPlaytime(s.durationSec)].filter(Boolean);
          meta.innerHTML = parts.map((x, i) => (i ? '<span class="sep">·</span>' : '') + `<span>${escapeHtml(String(x))}</span>`).join('');
        }
      });
    }, 1000);
  }
  function bindSessionStops() {
    document.querySelectorAll('[data-stop-session]').forEach(btn => {
      if (btn._bound) return; btn._bound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const folder = btn.dataset.stopSession;
        const ipc = getIpc();
        if (ipc) ipc.invoke('mc:stop', folder);
        toast('Останавливаю: ' + folder);
      });
    });
  }

  function updateSidebarCounts() {
    const el = document.getElementById('sidebar-session-count');
    if (!el) return;
    const n = (D.sessions || []).length;
    el.textContent = n ? String(n) : '';
  }

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  const MAX_LOG_LINES = 2000;
  const gameLog = {
    activeFolder: null,
    lines: [],
    unseen: 0,
    panelOpen: false,
    el: null, body: null, sub: null, toggleBtn: null, badge: null
  };
  function initGameLog() {
    gameLog.el = document.getElementById('game-log');
    gameLog.body = document.getElementById('game-log-body');
    gameLog.sub = document.getElementById('game-log-sub');
    gameLog.toggleBtn = document.getElementById('game-log-toggle');
    gameLog.badge = document.getElementById('game-log-badge');
    document.getElementById('game-log-close').addEventListener('click', () => setGameLogPanel(false));
    document.getElementById('game-log-clear').addEventListener('click', () => { gameLog.lines = []; renderGameLog(); });
    document.getElementById('game-log-stop').addEventListener('click', () => {
      const ipc = getIpc();
      if (ipc && gameLog.activeFolder) { ipc.invoke('mc:stop', gameLog.activeFolder); toast('Останавливаю игру…'); }
    });
    gameLog.toggleBtn.addEventListener('click', () => setGameLogPanel(true));
  }
  function setGameLogPanel(open) {
    gameLog.panelOpen = open;
    gameLog.el.classList.toggle('hidden', !open);
    if (open) { gameLog.unseen = 0; updateBadge(); renderGameLog(true); }
  }
  function updateBadge() {
    const hasRun = !!gameLog.activeFolder;
    gameLog.toggleBtn.classList.toggle('hidden', !hasRun || gameLog.panelOpen);
    if (gameLog.unseen > 0) {
      gameLog.badge.textContent = gameLog.unseen > 99 ? '99+' : String(gameLog.unseen);
      gameLog.badge.classList.remove('hidden');
    } else {
      gameLog.badge.classList.add('hidden');
    }
  }
  function pushGameLog(entry) {
    const cls = entry.stream === 'stderr' ? 'err' : (entry.meta ? 'meta' : '');
    gameLog.lines.push({ cls, text: entry.line });
    if (gameLog.lines.length > MAX_LOG_LINES) gameLog.lines.splice(0, gameLog.lines.length - MAX_LOG_LINES);
    if (gameLog.panelOpen) appendGameLogLine(cls, entry.line);
    else { gameLog.unseen++; updateBadge(); }
  }
  function appendGameLogLine(cls, text) {
    if (!gameLog.body) return;
    const atBottom = gameLog.body.scrollTop + gameLog.body.clientHeight >= gameLog.body.scrollHeight - 20;
    const div = document.createElement('div');
    div.className = 'game-log-line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    gameLog.body.appendChild(div);
    while (gameLog.body.childElementCount > MAX_LOG_LINES) gameLog.body.removeChild(gameLog.body.firstChild);
    if (atBottom) gameLog.body.scrollTop = gameLog.body.scrollHeight;
  }
  function renderGameLog(scrollEnd) {
    if (!gameLog.body) return;
    gameLog.body.innerHTML = '';
    gameLog.lines.forEach(l => {
      const div = document.createElement('div');
      div.className = 'game-log-line' + (l.cls ? ' ' + l.cls : '');
      div.textContent = l.text;
      gameLog.body.appendChild(div);
    });
    if (scrollEnd) gameLog.body.scrollTop = gameLog.body.scrollHeight;
    if (gameLog.sub) gameLog.sub.textContent = gameLog.activeFolder ? '· ' + gameLog.activeFolder : '· процесс завершён';
  }
  function gameLogOnLaunched(folder) {
    gameLog.activeFolder = folder;
    gameLog.lines = [];
    gameLog.unseen = 0;
    pushGameLog({ stream: 'meta', line: '[MGL2] Запущено: ' + verLabel(folder), meta: true });
    if (gameLog.sub) gameLog.sub.textContent = '· ' + verLabel(folder);
    updateBadge();
  }
  function gameLogOnExit(info) {
    const code = info.code != null ? info.code : (info.signal || '?');
    pushGameLog({ stream: 'meta', line: `[MGL2] Процесс завершён (код ${code}, ~${info.minutes} мин)`, meta: true });
    gameLog.activeFolder = null;
    if (gameLog.sub) gameLog.sub.textContent = '· процесс завершён';
    updateBadge();
  }

  function initRailNeon() {
    const rail = document.querySelector('.rail');
    if (!rail) return;
    let raf = 0, pending = null;
    const apply = () => {
      if (!pending) return;
      rail.style.setProperty('--mx', pending.x + 'px');
      rail.style.setProperty('--my', pending.y + 'px');
      pending = null; raf = 0;
    };
    rail.addEventListener('mouseenter', () => rail.style.setProperty('--neon', '1'));
    rail.addEventListener('mouseleave', () => rail.style.setProperty('--neon', '0'));
    rail.addEventListener('mousemove', (e) => {
      const r = rail.getBoundingClientRect();
      pending = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }

  // Кнопка «развернуть/восстановить» в шапке. Двойной клик по самой шапке (drag-зона) разворачивает окно средствами ОС.
  function initMaximizeButton(ipc) {
    const btn = document.getElementById('maximize-btn');
    if (!btn) return;
    if (!ipc) { btn.classList.add('hidden'); return; }
    const MAX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1.5"/></svg>';
    const RESTORE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="12" height="12" rx="1.5"/><path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4H18.5A1.5 1.5 0 0 1 20 5.5V14.5A1.5 1.5 0 0 1 18.5 16H16"/></svg>';
    const apply = (max) => {
      btn.innerHTML = max ? RESTORE_ICON : MAX_ICON;
      btn.title = max ? 'Восстановить' : 'Развернуть';
      btn.setAttribute('aria-label', btn.title + ' окно');
    };
    const toggle = () => ipc.send('maximize-window');
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    ipc.on('window:state', (e, d) => apply(!!(d && d.maximized)));
    ipc.invoke('window:isMaximized').then(apply).catch(() => {});
  }

  // ---- отчёты о сбоях: ловим ошибки окна и отдаём в main (scripts/crash-reporter.js) ----
  function installErrorReporting() {
    const ipc = getIpc();
    if (!ipc) return;
    const send = (kind, d) => { try { ipc.send('crash:renderer', { kind, view: currentView, ...d }); } catch (e) {} };
    window.addEventListener('error', (e) => {
      if (!e.error && !e.message) return;                       // ошибка загрузки ресурса - не сбой кода
      if (/ResizeObserver loop/i.test(e.message || '')) return;
      send('error', { message: e.message, stack: e.error && e.error.stack, source: e.filename, line: e.lineno, col: e.colno });
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      send('unhandledrejection', { message: (r && r.message) || String(r), stack: r && r.stack });
    });
  }
  let _crashUnseen = 0;
  function onCrashReport(info) {
    _crashUnseen++;
    toast(info && info.kind === 'game' ? 'Игра завершилась с ошибкой - отчёт сохранён (Настройки → Отчёты о сбоях)' : 'Сбой записан в отчёт (Настройки → Отчёты о сбоях)');
    if (currentView === 'settings') refreshCrashCard();
  }
  async function checkNewCrashReports() {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const r = await ipc.invoke('crash:list');
      const fresh = ((r && r.items) || []).filter(i => i.mtime > (r.seenTs || 0));
      if (fresh.length) toast(`Есть новые отчёты о сбоях: ${fresh.length} (Настройки → Отчёты о сбоях)`);
    } catch (e) {}
  }

  function bindGlobalNav() {
    document.querySelectorAll('[data-view]').forEach(el => {
      if (el.closest('#content') || el.closest('#rail-items') || el.classList.contains('profile-card')) return;
      el.addEventListener('click', () => setView(el.dataset.view));
    });
    document.querySelector('.profile-card').addEventListener('click', () => setView('skins'));
    initAccountPopup();
    const ipc = getIpc();
    document.getElementById('minimize-btn').addEventListener('click', () => ipc && ipc.send('minimize-window'));
    document.getElementById('close-btn').addEventListener('click', () => ipc && ipc.send('close-window'));
    initMaximizeButton(ipc);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-empty-act]');
      if (b) { e.preventDefault(); emptyAction(b.dataset.emptyAct); }
    });

    initNotifications();

    initGameLog();

    if (ipc) {
      ipc.on('mc:progress', (e, d) => setLaunchProgress(d.progress, d.status));
      ipc.on('mc:launched', (e, d) => {
        setLaunchProgress(100, 'Minecraft запущен!');
        const btn = document.getElementById('launch-btn'); if (btn) btn.disabled = false;
        toast('Игра запущена: ' + verLabel(d.folder));
        // main уже записал lastVersion/launchCounts - синхронизируем локальную копию для «Продолжить играть» (у сборок - своё)
        if (!d.instance) {
          const counts = { ...((D.settings && D.settings.launchCounts) || {}) };
          counts[d.folder] = (counts[d.folder] || 0) + 1;
          D.settings = { ...(D.settings || {}), lastVersion: d.folder, launchCounts: counts };
        }
        UiBus.emit('game:launched', d);
        gameLogOnLaunched(d.folder);
        setGameLogPanel(true);
        refreshSessions();
        setTimeout(() => { const p = document.getElementById('launch-progress'); if (p) p.classList.add('hidden'); }, 3000);
      });
      ipc.on('mc:error', (e, msg) => {
        setLaunchProgress(0, 'Ошибка: ' + msg);
        const btn = document.getElementById('launch-btn'); if (btn) btn.disabled = false;
        toast('Ошибка запуска: ' + msg);
      });
      ipc.on('mc:log', (e, entry) => pushGameLog(entry));
      ipc.on('crash:new', (e, info) => onCrashReport(info));
      ipc.on('mc:notice', (e, d) => showNoticePlate((d && d.text) || ''));
      ipc.on('java:missing', (e, d) => { if (d && d.major) showJavaGuide(d.major); });
      ipc.on('srv:log', (e, d) => onSrvLog(d));
      ipc.on('srv:state', (e, d) => onSrvState(d));
      ipc.on('mc:exit', (e, info) => {
        gameLogOnExit(info);
        if (info.folder && !String(info.folder).startsWith('inst:')) D.settings = { ...(D.settings || {}), lastVersion: info.folder };
        refreshSessions();
        UiBus.emit('game:exit', info);
        // синхронизируем счётчик времени
        if (info.playtimeSeconds != null && D.settings) {
          D.settings.playtimeSeconds = info.playtimeSeconds;
          D.settings.playtimeMinutes = Math.floor(info.playtimeSeconds / 60);
          if (currentView === 'settings') setView('settings');
        }
        const added = formatPlaytime(info.seconds || 0);
        toast(`Minecraft завершён · +${added} игрового времени`);
      });
    }
  }

  async function loadData() {
    const ipc = getIpc();
    if (ipc) {
      try {
        const [inst, servers, settings, custom, managed] = await Promise.all([
          ipc.invoke('mc:getInstalled'), ipc.invoke('mc:getServers'), ipc.invoke('settings:get'),
          ipc.invoke('srv:listCustom'), ipc.invoke('srv:listManaged')
        ]);
        D.instances = inst || []; D.servers = servers || []; D.settings = settings || {};
        D.customServers = custom || []; D.managedServers = managed || [];
      } catch (e) { console.warn('loadData failed', e); }
    } else {
      // Превью в браузере: небольшой демонстрационный набор
      D.instances = D._preview.instances.map(x => ({ ...x }));
      D.servers = D._preview.servers.map(x => ({ ...x }));
      D.settings = {
        username: 'Player_MGL', memoryMax: 2048, backgroundAnimation: true,
        playtimeMinutes: 1280, playtimeSeconds: 1280 * 60 + 42,
        lastVersion: 'Forge 1.8.9', lastModloader: 'forge',
        launchCounts: { 'Forge 1.8.9': 14, '1.21.1': 3 },
        serverHistory: [{ name: 'Hypixel', ip: 'mc.hypixel.net' }, { name: 'Сервер друзей', ip: 'play.vanesmp.ru' }],
        aliases: {}, pinned: [],
        userId: 'user_4287_9361_5024_8173'
      };
      D.customServers = [{ id: 'cst_demo', name: 'Hypixel', ip: 'mc.hypixel.net' }];
      D.managedServers = [{ id: 'mgl_demo', name: 'Выживание', mcVersion: '1.20.4', memory: 2048 }];
      // одна демо-сессия
      D.sessions = [{
        id: 'ses_demo', folder: 'Forge 1.8.9', name: 'Forge 1.8.9',
        ver: '1.8.9', loaderName: 'Forge', pid: 12345,
        startedAt: Date.now() - 5 * 60 * 1000, durationSec: 300
      }];
    }
    normalize();
  }

  const Downloads = (function () {
    const tasks = new Map();
    const subs = [];
    const KIND_LABEL = { mc: 'MC', ml: 'Loader', java: 'Java', mr: 'Modrinth', upd: 'Update', pk: 'Сборка' };
    const AUTO_HIDE_MS = 6000;

    let _busyReported = -1;
    function reportBusy() {
      const n = active().length;
      if (n === _busyReported) return;
      _busyReported = n;
      const ipc = getIpc();
      if (ipc) ipc.send('app:busy', n);
    }
    function emit() { subs.forEach(fn => { try { fn(); } catch (e) {} }); render(); reportBusy(); }
    function on(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
    function all() { return Array.from(tasks.values()); }
    function active() { return all().filter(t => t.state === 'running'); }
    function get(id) { return tasks.get(id); }

    function start(id, kind, title) {
      const existing = tasks.get(id);
      const t = existing || { id, kind, title, progress: 0, status: '', state: 'running', ts: Date.now() };
      t.kind = kind; t.title = title || t.title || id;
      t.state = 'running'; t.progress = 0; t.status = ''; t.ts = Date.now(); t.cancelling = false;
      tasks.set(id, t);
      emit();
      return t;
    }
    function update(id, patch) {
      const t = tasks.get(id);
      if (!t) return;
      if (patch.progress != null) t.progress = patch.progress;
      if (patch.status != null && !t.cancelling) t.status = patch.status;
      if (patch.title) t.title = patch.title;
      emit();
    }
    function finish(id, { ok, error } = { ok: true }) {
      const t = tasks.get(id);
      if (!t) return;
      t.state = ok ? 'done' : 'error';
      if (!ok && error) t.status = /Отменено/i.test(error) ? 'Отменено' : error;
      t.cancelling = false;
      if (ok) t.progress = 100;
      emit();
      const delay = ok ? AUTO_HIDE_MS : AUTO_HIDE_MS * 3;
      setTimeout(() => { if (tasks.get(id) === t && t.state !== 'running') { tasks.delete(id); emit(); } }, delay);
    }
    function remove(id) { tasks.delete(id); emit(); }
    function clearDone() {
      for (const [id, t] of tasks) if (t.state !== 'running') tasks.delete(id);
      emit();
    }

    let toggleEl, badgeEl, panelEl, bodyEl, closeBtn, clearBtn;
    function ensureEls() {
      if (toggleEl) return;
      toggleEl = document.getElementById('downloads-toggle');
      badgeEl = document.getElementById('downloads-badge');
      panelEl = document.getElementById('downloads-panel');
      bodyEl = document.getElementById('downloads-body');
      closeBtn = document.getElementById('downloads-close');
      clearBtn = document.getElementById('downloads-clear');
      if (!toggleEl) return;
      toggleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        panelEl.classList.toggle('hidden');
        render();
      });
      closeBtn.addEventListener('click', () => panelEl.classList.add('hidden'));
      clearBtn.addEventListener('click', clearDone);
      document.addEventListener('click', (e) => {
        if (panelEl.classList.contains('hidden')) return;
        if (e.target.closest('#downloads-panel') || e.target.closest('#downloads-toggle')) return;
        panelEl.classList.add('hidden');
      });
    }
    function render() {
      ensureEls();
      if (!toggleEl) return;
      const list = all().sort((a, b) => b.ts - a.ts);
      const act = list.filter(t => t.state === 'running').length;
      // Тогглер видим если есть любые задачи (включая завершённые, но не удалённые)
      if (list.length) toggleEl.classList.remove('hidden'); else toggleEl.classList.add('hidden');
      toggleEl.classList.toggle('active', act > 0);
      if (badgeEl) {
        badgeEl.textContent = act || list.length;
        badgeEl.classList.toggle('hidden', list.length === 0);
      }
      if (!bodyEl) return;
      if (!list.length) {
        bodyEl.innerHTML = `<div class="downloads-empty">Нет активных загрузок</div>`;
        return;
      }
      bodyEl.innerHTML = list.map(t => `
        <div class="dl-item ${t.state === 'done' ? 'done' : ''} ${t.state === 'error' ? 'error' : ''}" data-dl-id="${escapeHtml(t.id)}">
          <div class="dl-item-head">
            <span class="dl-item-kind ${t.kind}">${KIND_LABEL[t.kind] || t.kind}</span>
            <span class="dl-item-title">${escapeHtml(t.title)}</span>
            ${t.state !== 'running' ? `<button class="dl-item-close" data-dl-close="${escapeHtml(t.id)}" title="Убрать">×</button>`
              : cancellable(t) ? `<button class="dl-item-cancel" data-dl-cancel="${escapeHtml(t.id)}" title="Отменить загрузку" ${t.cancelling ? 'disabled' : ''}>${t.cancelling ? 'Отмена…' : 'Отменить'}</button>` : ''}
          </div>
          <div class="dl-item-bar"><div class="dl-item-fill" style="width:${Math.max(0, Math.min(100, t.progress || 0))}%"></div></div>
          <div class="dl-item-status">${escapeHtml(t.status || (t.state === 'done' ? 'Готово' : t.state === 'error' ? 'Ошибка' : '…'))}</div>
        </div>`).join('');
      bodyEl.querySelectorAll('[data-dl-close]').forEach(btn =>
        btn.addEventListener('click', () => remove(btn.dataset.dlClose)));
      bodyEl.querySelectorAll('[data-dl-cancel]').forEach(btn =>
        btn.addEventListener('click', (e) => { e.stopPropagation(); cancel(btn.dataset.dlCancel); }));
    }
    // id задачи = ключ задачи в main (runCancellable): установка версии/загрузчика, переустановка, фоновые ассеты
    function cancellable(t) { return !!getIpc() && /^(mc|ml|re|assets|inst):/.test(t.id); }
    async function cancel(id) {
      const t = tasks.get(id), ipc = getIpc();
      if (!t || !ipc || t.state !== 'running') return;
      t.cancelling = true; t.status = 'Отмена…'; emit();
      let r = null;
      try { r = await ipc.invoke('install:cancel', id); } catch (e) {}
      if (!r || !r.ok) { t.cancelling = false; emit(); toast('Эту загрузку уже нельзя отменить'); }
    }

    function bindIpc() {
      const ipc = getIpc();
      if (!ipc) return;
      ipc.on('mc:installProgress', (e, d) => {
        if (!d || !d.id) return;
        const id = 'mc:' + d.id;
        if (!tasks.has(id)) start(id, 'mc', 'Minecraft ' + d.id);
        update(id, { progress: d.progress, status: d.status });
        if (/^Ошибка/i.test(d.status || '')) finish(id, { ok: false, error: d.status });
        else if ((d.progress || 0) >= 100) finish(id, { ok: true });
      });
      // фоновая докачка ассетов (звуки) после запуска игры - виден в трее, не блокирует игру
      ipc.on('assets:progress', (e, d) => {
        if (!d || !d.folder) return;
        const id = 'assets:' + d.folder;
        if (!tasks.has(id) || tasks.get(id).state !== 'running') start(id, 'mc', 'Ассеты: ' + verLabel(d.folder));
        if (d.done) {
          if (d.failed) finish(id, { ok: false, error: d.status });
          else finish(id, { ok: true });
        } else update(id, { progress: d.progress, status: d.status });
      });
      ipc.on('ml:installProgress', (e, d) => {
        if (!d || !d.loader || !d.mcVersion) return;
        const id = 'ml:' + d.loader + ':' + d.mcVersion;
        if (!tasks.has(id)) start(id, 'ml', `${LOADER[d.loader] || d.loader} ${d.mcVersion}`);
        update(id, { progress: d.progress, status: d.status });
        if (/^Ошибка/i.test(d.status || '')) finish(id, { ok: false, error: d.status });
        else if ((d.progress || 0) >= 100) finish(id, { ok: true });
      });
      // создание сборки / установка модпака / восстановление версии (scripts/instances.js); id = ключ отмены inst:<id>
      ipc.on('inst:progress', (e, d) => {
        if (!d || !d.id) return;
        const id = 'inst:' + d.id;
        if (!tasks.has(id) || tasks.get(id).state !== 'running') start(id, 'pk', 'Сборка «' + (d.name || d.id) + '»');
        update(id, { progress: d.progress, status: d.status });
        if (/^Ошибка/i.test(d.status || '')) finish(id, { ok: false, error: d.status });
        else if ((d.progress || 0) >= 100 && d.status === 'Готово') finish(id, { ok: true });
      });
      ipc.on('java:installProgress', (e, d) => {
        if (!d || d.major == null) return;
        const id = 'java:' + d.major;
        if (!tasks.has(id)) start(id, 'java', `Java ${d.major}`);
        update(id, { progress: d.progress, status: d.status });
        if (/^Ошибка/i.test(d.status || '')) finish(id, { ok: false, error: d.status });
        else if ((d.progress || 0) >= 100) finish(id, { ok: true });
      });
      ipc.on('modrinth:installProgress', (e, d) => {
        if (!d || !d.slug) return;
        const id = 'mr:' + d.slug;
        if (!tasks.has(id)) start(id, 'mr', d.slug);
        update(id, { progress: d.progress, status: d.status });
        if (/^Ошибка/i.test(d.status || '')) finish(id, { ok: false, error: d.status });
        else if ((d.progress || 0) >= 100) finish(id, { ok: true });
      });
    }

    return { start, update, finish, remove, clearDone, all, active, get, on, render, bindIpc };
  })();
  window.MGL_Downloads = Downloads;

  window.MGL_UI = {
    D, views, TITLES, RAIL_DEFS, I, bus: UiBus, content,
    setView, get currentView() { return currentView; }, refresh: () => currentView && setView(currentView),
    toast, notify, showModal, appConfirm, confirmDialog, confirmRemoveContent, escapeHtml, saveSettings, getIpc, fmtBytes, copyText,
    renderRail, renderInstances, hideInstMenu, doLaunch, verLabel, Downloads,
    // для scripts/packs.js (Сборки)
    LOADER, artFor, modrinthCard, fmtCount, decorateInstalled, fetchInstalledIndex, uiPrefs, showNoticePlate, formatPlaytime, cmpVer, openVersionPicker, setLaunchProgress,
    get sessions() { return D.sessions || []; },
    reloadData: async () => { await loadData(); renderInstances(); updateSidebarCounts(); }
  };

  const SPLASH_TIMEOUT_MS = 30000, SPLASH_MIN_MS = 700;
  const Splash = (function () {
    const t0 = Date.now();
    const el = () => document.getElementById('splash');
    return {
      step(pct, text) {
        if (!el()) return;
        const f = document.getElementById('splash-fill'), s = document.getElementById('splash-status');
        if (f) f.style.width = Math.max(4, Math.min(100, pct)) + '%';
        if (s && text) s.textContent = text;
      },
      setUpdating(on) { const s = el(); if (s) s.classList.toggle('updating', !!on); },
      async hide(instant) {
        const s = el();
        if (!s) return;
        if (!instant) {
          this.step(100, 'Готово');
          const wait = SPLASH_MIN_MS - (Date.now() - t0);
          if (wait > 0) await new Promise(r => setTimeout(r, wait));
        }
        if (s.classList.contains('static')) { s.remove(); return; }
        s.classList.add('hide');
        setTimeout(() => s.remove(), instant ? 0 : 500);
      }
    };
  })();
  function cacheSplashPref() {
    try { localStorage.setItem('mgl.splashStatic', uiPrefs().optimization ? '1' : '0'); } catch (e) {}
    const s = document.getElementById('splash');
    if (s) s.classList.toggle('static', uiPrefs().optimization);
  }

  // Язык из settings.json (импорт настроек, очищенный localStorage) расходится с применённым в окне - один раз выравниваем
  function syncLanguagePref() {
    if (!window.MglI18n || !D.settings || !getIpc()) return;
    const want = D.settings.language || 'auto';
    if (want === MglI18n.pref) return;
    try { if (sessionStorage.getItem('mgl.langSynced')) return; sessionStorage.setItem('mgl.langSynced', '1'); } catch (e) { return; }
    MglI18n.change(want);
  }

  async function init() {
    installErrorReporting();
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    Splash.step(10, 'Загрузка настроек и сборок…');
    let timedOut = false;
    const timeout = new Promise(r => setTimeout(() => { timedOut = true; r(); }, SPLASH_TIMEOUT_MS));
    const dataReady = Promise.all([loadData(), loadSysInfo()]);
    await Promise.race([dataReady, timeout]);
    cacheSplashPref();
    if (!timedOut) {
      Splash.step(55, 'Загрузка новостей…');
      await Promise.race([fetchNews().catch(() => {}), timeout]);
      if (await splashAutoUpdate().catch(() => false)) return; // установщик запущен, лаунчер закрывается
    } else {
      dataReady.then(() => { renderInstances(); updateSidebarCounts(); renderRail(); setView(currentView); }).catch(() => {});
    }
    syncLanguagePref();
    Splash.step(85, 'Подготовка интерфейса…');
    autoOptimizeForHardware();
    applyCurrentTheme();
    updateAvatars();
    document.getElementById('profile-name').textContent = D.profile.name;
    applyAccountStatus();
    renderInstances();
    initSidebarSearch();
    updateSidebarCounts();
    renderRail();
    bindGlobalNav();
    initNavCollapse();
    initRailNeon();
    applyUiPrefs();
    startNewsAutoRefresh();
    Downloads.bindIpc();
    Downloads.render();
    setView('home');
    refreshSessions();
    startSessionTicker();
    if (timedOut) toast('Часть данных ещё загружается…');
    Splash.hide();
    setTimeout(checkNewCrashReports, 2500);
    if (window.MglPlugins) window.MglPlugins.boot().catch(e => console.error('[plugins] boot', e));
  }
  init().catch(e => { console.error('init failed', e); Splash.hide(); });
})();
