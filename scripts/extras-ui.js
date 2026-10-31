// UI дополнений (бэкенд - scripts/extras.js): карточка «Бекапы» в Настройках, обновления модов,
// скриншоты сборки, игроки сервера. Подключается после ui.js; использует window.MGL_UI.
(function () {
  'use strict';
  const U = window.MGL_UI;
  if (!U) return;
  const { D, toast, showModal, confirmDialog, escapeHtml: esc, getIpc, saveSettings, fmtBytes } = U;
  const loc = () => window.MGL_LOCALE || 'ru-RU';
  const fmtDate = (t) => new Date(t).toLocaleString(loc());
  const size = (b) => (fmtBytes ? fmtBytes(b) : (b / 1048576).toFixed(1) + ' МБ');
  const need = () => { if (getIpc()) return true; toast('Доступно в приложении'); return false; };

  // ================= Настройки → Бекапы =================
  function backupsCardHtml() {
    const s = D.settings || {};
    const on = s.autoBackupWorlds !== false;
    return `
      <div class="settings-card" id="backups-card">
        <h3>Бекапы</h3>
        <div class="toggle-row"><div><div class="tl">Автоматические бэкапы миров</div>
          <div class="ts">Перед запуском игры и после выхода сохраняются только изменившиеся миры (zip в папке backups/ сборки)</div></div>
          <div class="switch ${on ? 'on' : ''}" id="bk-auto"></div></div>
        <div class="field"><label class="field-label">Сколько копий каждого мира хранить</label>
          <input type="number" id="bk-keep" min="1" max="50" value="${parseInt(s.backupKeep, 10) || 5}"></div>
        <div class="field-hint">Бэкап серверов (по расписанию или кнопкой) настраивается в параметрах сервера. Старые автокопии удаляются сверх этого числа.</div>
        <div class="settings-data-actions">
          <button class="btn-secondary" id="bk-now">Бэкап всех миров сейчас</button>
          <button class="btn-secondary" id="bk-folder">Открыть папку бэкапов</button>
          <select id="bk-filter" class="select"><option value="all">Все</option><option value="world">Миры</option><option value="server">Серверы</option></select>
        </div>
        <div class="browse-status" id="bk-status">Загрузка…</div>
        <div class="mycontent-list" id="bk-list"></div>
      </div>`;
  }
  async function loadBackups(root) {
    const list = root.querySelector('#bk-list'), st = root.querySelector('#bk-status');
    if (!list) return;
    const ipc = getIpc();
    const r = ipc ? await ipc.invoke('bk:list').catch(() => null) : { ok: true, list: [] };
    if (!list.isConnected) return;
    if (!r || !r.ok) { st.textContent = 'Не удалось прочитать список: ' + ((r && r.error) || ''); return; }
    const f = root.querySelector('#bk-filter').value;
    const items = (r.list || []).filter(x => f === 'all' || x.kind === f);
    const total = items.reduce((a, x) => a + x.size, 0);
    st.textContent = items.length ? `Копий: ${items.length} · ${size(total)}` : 'Бэкапов пока нет';
    list.innerHTML = items.map(x => `
      <div class="mc-row" data-scope="${esc(x.scope)}" data-file="${esc(x.file)}">
        <div class="mc-main"><div class="mc-name">${esc(x.file)} ${x.auto ? '<span class="pk-badge">авто</span>' : ''}${x.kind === 'server' ? '<span class="pk-badge">сервер</span>' : ''}</div>
          <div class="mc-meta"><span>${esc(x.label)}</span><span class="sep">·</span><span>${fmtDate(x.mtime)}</span><span class="sep">·</span><span>${size(x.size)}</span></div></div>
        <div class="mc-actions">
          ${x.kind === 'world' ? '<button class="btn-secondary" data-bk="restore" title="Распаковать мир обратно в saves/ (текущий будет сохранён рядом)">Восстановить</button>' : ''}
          <button class="btn-secondary" data-bk="reveal" title="Показать в папке">Показать</button>
          <button class="btn-ghost danger" data-bk="delete" title="Удалить">×</button>
        </div>
      </div>`).join('');
  }
  function bindBackups(root) {
    const card = (root || document).querySelector('#backups-card');
    if (!card) return;
    const ipc = getIpc();
    card.querySelector('#bk-auto').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('on');
      e.currentTarget.classList.toggle('on', on);
      saveSettings({ autoBackupWorlds: on });
    });
    const keep = card.querySelector('#bk-keep');
    keep.addEventListener('change', () => {
      const v = Math.max(1, Math.min(50, parseInt(keep.value, 10) || 5));
      keep.value = v;
      saveSettings({ backupKeep: v });
    });
    card.querySelector('#bk-filter').addEventListener('change', () => loadBackups(card));
    card.querySelector('#bk-folder').addEventListener('click', () => need() && ipc.invoke('bk:action', { scope: 'g', action: 'folder' }));
    card.querySelector('#bk-now').addEventListener('click', async (e) => {
      if (!need()) return;
      const btn = e.currentTarget; btn.disabled = true;
      const jobs = [{ id: null }].concat((D.packs || []).map(p => ({ id: p.id })));
      let n = 0;
      for (const j of jobs) { const r = await ipc.invoke('bk:run', j).catch(() => null); if (r && r.ok) n += r.worlds.length; }
      btn.disabled = false;
      toast(n ? `Сохранено миров: ${n}` : 'Миров для бэкапа не найдено');
      loadBackups(card);
    });
    card.querySelector('#bk-list').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-bk]');
      if (!b || !need()) return;
      const row = b.closest('[data-file]');
      const args = { scope: row.dataset.scope, file: row.dataset.file, action: b.dataset.bk };
      if (args.action === 'delete' && !await confirmDialog({ title: 'Удалить бэкап', message: `Удалить «${args.file}»?`, okText: 'Удалить', danger: true })) return;
      if (args.action === 'restore' && !await confirmDialog({ title: 'Восстановить мир', message: `Распаковать «${args.file}» в saves/? Если такой мир уже есть, он будет переименован и сохранён рядом.`, okText: 'Восстановить' })) return;
      b.disabled = true;
      const r = await ipc.invoke('bk:action', args).catch(err => ({ ok: false, error: err.message }));
      b.disabled = false;
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      if (args.action === 'restore') toast(`Мир «${r.world}» восстановлен${r.replacedAs ? ' (прежний: ' + r.replacedAs + ')' : ''}`);
      if (args.action !== 'reveal') loadBackups(card);
    });
    loadBackups(card);
  }

  // ================= Обновления модов =================
  function guessFilters() {
    const s = D.settings || {};
    const inst = (D.instances || []).find(i => i.folder === s.lastVersion) || (D.instances || [])[0];
    return inst ? { gameVersion: inst.mc || inst.ver, loader: inst.loader } : {};
  }
  async function checkUpdates(opts) {
    if (!need()) return;
    const o = { ...(opts && opts.instance ? { instance: opts.instance } : guessFilters()), ...(opts || {}) };
    toast('Проверяю обновления модов…');
    const ipc = getIpc();
    const r = await ipc.invoke('modrinth:checkUpdates', o).catch(err => ({ ok: false, error: err.message }));
    if (!r || !r.ok) { toast('Не удалось проверить: ' + ((r && r.error) || '')); return; }
    if (!r.updates.length) { toast(r.total ? 'Все моды актуальны' : 'Модов пока нет'); return; }
    const rows = r.updates.map((u, i) => `
      <label class="mc-row upd-row"><input type="checkbox" data-upd="${i}" checked>
        <div class="mc-main"><div class="mc-name">${esc(u.title)}</div>
          <div class="mc-meta"><span>${esc(u.current || '?')}</span><span class="sep">→</span><span>${esc(u.latest)}</span>${u.versionType && u.versionType !== 'release' ? `<span class="pk-badge warn">${esc(u.versionType)}</span>` : ''}<span class="sep">·</span><span>${size(u.size)}</span></div></div>
      </label>`).join('');
    showModal({
      title: `Доступны обновления (${r.updates.length})`, wide: true, okText: 'Обновить выбранные',
      bodyHtml: `<div class="field-hint">Проверка идёт по файлам и фильтру ${esc(o.gameVersion || '')} ${esc(o.loader || '')}. Новые зависимости обновлённых модов нужно ставить отдельно.</div><div class="mycontent-list upd-list">${rows}</div>`,
      onOk: async (m) => {
        const items = Array.from(m.querySelectorAll('[data-upd]:checked')).map(c => r.updates[+c.dataset.upd]);
        if (!items.length) { toast('Ничего не выбрано'); return false; }
        const res = await ipc.invoke('modrinth:applyUpdates', { instance: o.instance, items }).catch(err => ({ ok: false, error: err.message, done: [], failed: [] }));
        toast(`Обновлено: ${(res.done || []).length}${(res.failed || []).length ? ' · ошибок: ' + res.failed.length : ''}`);
        if ((res.failed || []).length) U.showNoticePlate(res.failed.join('\n'));
        if (opts && opts.onDone) opts.onDone();
        return true;
      }
    });
  }

  // ================= Скриншоты сборки =================
  function shotsPaneHtml() {
    return `
      <div class="mc-toolbar">
        <button class="btn-secondary" data-shot-folder>Папка screenshots</button>
        <button class="btn-secondary" data-shot-reload>Обновить</button>
      </div>
      <div class="browse-status" id="shot-status">Загрузка…</div>
      <div class="shot-grid" id="shot-grid"></div>`;
  }
  async function bindShots(root, packId) {
    const ipc = getIpc();
    const grid = root.querySelector('#shot-grid'), st = root.querySelector('#shot-status');
    const load = async () => {
      const r = ipc ? await ipc.invoke('shots:list', { id: packId }).catch(() => null) : { list: [] };
      if (!grid.isConnected) return;
      const list = (r && r.list) || [];
      st.textContent = list.length ? `Скриншотов: ${list.length}` : 'Скриншотов пока нет - делайте их в игре на F2';
      grid.innerHTML = list.map(s => `
        <div class="shot" data-shot="${esc(s.name)}">
          <img src="${esc(s.url)}" loading="lazy" alt="" title="${esc(s.name)}">
          <div class="shot-bar"><span>${esc(new Date(s.mtime).toLocaleDateString(loc()))}</span>
            <span><button data-sact="copy" title="Копировать в буфер">⧉</button><button data-sact="reveal" title="Показать в папке">📁</button><button data-sact="delete" title="Удалить">×</button></span></div>
        </div>`).join('');
    };
    root.querySelector('[data-shot-folder]').addEventListener('click', () => need() && ipc.invoke('shots:action', { id: packId, action: 'folder' }));
    root.querySelector('[data-shot-reload]').addEventListener('click', load);
    grid.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-shot]');
      if (!card || !need()) return;
      const act = (e.target.closest('[data-sact]') || {}).dataset;
      const name = card.dataset.shot;
      if (!act) { ipc.invoke('shots:action', { id: packId, name, action: 'open' }); return; }
      if (act.sact === 'delete' && !await confirmDialog({ title: 'Удалить скриншот', message: name, okText: 'Удалить', danger: true })) return;
      const r = await ipc.invoke('shots:action', { id: packId, name, action: act.sact });
      if (!r || !r.ok) { toast('Ошибка: ' + ((r && r.error) || '')); return; }
      if (act.sact === 'copy') toast('Скопировано в буфер');
      if (act.sact === 'delete') load();
    });
    load();
  }

  // ================= Игроки сервера =================
  async function playersModal(srv) {
    if (!need()) return;
    const ipc = getIpc();
    const draw = async (wrap) => {
      const list = await ipc.invoke('srv:players', srv.id).catch(() => []);
      const body = wrap.querySelector('.modal-body');
      body.innerHTML = list.length ? list.map(n => `
        <div class="mc-row" data-nick="${esc(n)}"><div class="mc-main"><div class="mc-name">${esc(n)}</div></div>
          <div class="mc-actions">
            <button class="btn-secondary" data-pl="op">OP</button>
            <button class="btn-secondary" data-pl="deop">Снять OP</button>
            <button class="btn-secondary" data-pl="kick">Кик</button>
            <button class="btn-ghost danger" data-pl="ban">Бан</button>
          </div></div>`).join('') : '<div class="field-hint">Сейчас на сервере никого нет (или он не запущен).</div>';
    };
    const wrap = showModal({ title: `Игроки: ${srv.name}`, okText: 'Обновить', bodyHtml: '', onOk: async (m) => { await ipc.invoke('srv:command', { id: srv.id, command: 'list' }); setTimeout(() => draw(m), 600); return false; } });
    wrap.querySelector('.modal-cancel').textContent = 'Закрыть';
    wrap.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pl]');
      if (!b) return;
      const nick = b.closest('[data-nick]').dataset.nick;
      const cmd = { op: 'op', deop: 'deop', kick: 'kick', ban: 'ban' }[b.dataset.pl];
      if (b.dataset.pl === 'ban' && !await confirmDialog({ title: 'Забанить игрока', message: nick, okText: 'Забанить', danger: true })) return;
      const r = await ipc.invoke('srv:command', { id: srv.id, command: `${cmd} ${nick}` });
      if (r && !r.ok) toast(r.error); else { toast(`${cmd} ${nick}`); setTimeout(() => draw(wrap), 700); }
    });
    ipc.invoke('srv:command', { id: srv.id, command: 'list' });
    draw(wrap);
  }

  window.MglExtras = { backupsCardHtml, bindBackups, checkUpdates, shotsPaneHtml, bindShots, playersModal };
})();
