// Шаблон нового плагина
// Показывает основные возможности API подробности - PLUGINS.md
function files(id, name) {
  const manifest = {
    id,
    name: name || id,
    version: '1.0.0',
    author: '',
    description: 'Пример плагина: вкладка, блок настроек, кнопка в шапке, пункт меню сборки и хук запуска.',
    main: 'main.js',
    renderer: 'renderer.js',
    style: 'style.css',
    minLauncher: '2.0.1'
  };

  const main = `// main.js - выполняется в ГЛАВНОМ процессе Electron (Node.js, полный доступ к ФС, сети, процессу игры).
// api: см. PLUGINS.md → «API главного процесса».
module.exports = {
  activate(api) {
    api.log.info('Привет из main.js! Папка данных:', api.dataDir);

    // Хук перед запуском игры: можно поменять параметры или отменить запуск
    api.on('launch:before', (ctx) => {
      const n = api.storage.get('launches', 0) + 1;
      api.storage.set('launches', n);
      api.log.info(\`Запуск \${ctx.folder} (\${n}-й раз), Java: \${ctx.javaPath}\`);
      // ctx.launch.extraJvmArgs += ' -Dmgl.plugin=${id}';
      // if (что-то не так) ctx.cancel('Причина отмены');
    });

    api.on('game:exit', (info) => {
      api.log.info(\`Игра закрыта, код \${info.code}, сыграно \${info.seconds} с\`);
    });

    // Метод, который вызывает renderer.js через mgl.invoke('stats')
    api.handle('stats', () => ({
      launches: api.storage.get('launches', 0),
      minecraftDir: api.minecraftDir(),
      installed: api.manager.getInstalledVersions().length
    }));
  },

  deactivate() {
    // Хуки, handle() и таймеры api снимаются автоматически. Здесь - закрыть свои ресурсы (сокеты, файлы…).
  }
};
`;

  const renderer = `// renderer.js - выполняется в ОКНЕ лаунчера (DOM + Node.js через require).
// mgl: см. PLUGINS.md → «API интерфейса».
module.exports = {
  activate(mgl) {
    // 1. Своя вкладка (появится в сайдбаре в группе «Из плагинов» и в левой панели)
    mgl.ui.addView('main', {
      title: ${JSON.stringify(name || id)},
      rail: true,
      icon: mgl.ui.icons.star,
      render: () => \`
        <div class="page-head"><div class="page-title">${escapeTpl(name || id)}</div>
          <div class="page-sub">Вкладка, добавленная плагином</div></div>
        <div class="settings-card">
          <h3>Статистика</h3>
          <div class="tpl-stats" id="tpl-stats">Загрузка…</div>
          <div class="field-row" style="margin-top:14px;gap:8px">
            <button class="btn primary" id="tpl-hello">Показать уведомление</button>
            <button class="btn-secondary" id="tpl-count">Нажато: \${mgl.storage.get('clicks', 0)}</button>
          </div>
        </div>\`,
      async mount(root) {
        root.querySelector('#tpl-hello').addEventListener('click', () => mgl.ui.notify('Привет!', 'Это уведомление от плагина'));
        root.querySelector('#tpl-count').addEventListener('click', (e) => {
          const n = mgl.storage.get('clicks', 0) + 1;
          mgl.storage.set('clicks', n);
          e.target.textContent = 'Нажато: ' + n;
        });
        const s = await mgl.invoke('stats');
        const el = root.querySelector('#tpl-stats');
        if (el) el.innerHTML = \`Запусков игры через лаунчер: <b>\${s.launches}</b><br>
          Установлено сборок: <b>\${s.installed}</b><br>Папка: <code class="path">\${mgl.ui.escapeHtml(s.minecraftDir)}</code>\`;
      }
    });

    // 2. Блок в «Настройках»
    mgl.ui.addSettingsCard({
      title: ${JSON.stringify(name || id)},
      render: () => \`<div class="toggle-row"><div><div class="tl">Тосты при запуске игры</div>
        <div class="ts">Пример настройки плагина (хранится в mgl.storage)</div></div>
        <div class="switch \${mgl.storage.get('toastOnLaunch', true) ? 'on' : ''}" id="tpl-sw"></div></div>\`,
      mount(el) {
        const sw = el.querySelector('#tpl-sw');
        sw.addEventListener('click', () => { sw.classList.toggle('on'); mgl.storage.set('toastOnLaunch', sw.classList.contains('on')); });
      }
    });

    // 3. Кнопка в шапке
    mgl.ui.addTopbarButton({ title: ${JSON.stringify(name || id)}, icon: mgl.ui.icons.star, onClick: () => mgl.ui.openView('main') });

    // 4. Пункт в меню сборки
    mgl.ui.addInstanceMenuItem({
      label: 'Инфо (плагин)',
      icon: mgl.ui.icons.info,
      onClick: (inst) => mgl.ui.toast(\`\${inst.name}: \${inst.loaderName} \${inst.ver}\`)
    });

    // 5. События
    mgl.on('game:launched', (d) => { if (mgl.storage.get('toastOnLaunch', true)) mgl.ui.toast('Плагин: игра запущена - ' + d.folder); });
  },

  deactivate() {
    // Всё, что добавлено через mgl.ui.*, mgl.on, mgl.setInterval, убирается автоматически.
  }
};
`;

  const style = `/* style.css плагина - подключается автоматически, удаляется при выключении. Цвета - через переменные темы. */
.tpl-stats { font-size: 13px; line-height: 1.8; color: var(--text-dim); }
.tpl-stats b { color: var(--accent); }
`;

  const readme = `# ${name || id}

Плагин для Magma Launcher. Создан из шаблона.

- \`plugin.json\` - манифест
- \`main.js\` - код главного процесса (хуки запуска, файлы, сеть)
- \`renderer.js\` - код интерфейса (вкладки, кнопки, настройки)
- \`style.css\` - стили

Документация: docs/PLUGINS.md на GitHub (кнопка «Как писать плагины» во вкладке «Плагины»).
После правок нажмите ↻ у плагина - перезагрузка без перезапуска лаунчера.
`;

  return {
    'plugin.json': JSON.stringify(manifest, null, 2) + '\n',
    'main.js': main,
    'renderer.js': renderer,
    'style.css': style,
    'README.md': readme
  };
}
function escapeTpl(s) { return String(s).replace(/[`$\\<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || '\\' + c)); }

module.exports = { files };
