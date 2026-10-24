# Плагины Magma Launcher — руководство разработчика

Документ для программистов **и ИИ-ассистентов**: здесь всё, что нужно, чтобы написать рабочий плагин,
не заглядывая в исходники лаунчера. Если вы ИИ — прочитайте раздел «Правила для ИИ» в конце.

---

## 1. Что такое плагин

Плагин — это папка с файлом `plugin.json` и одним-двумя JS-файлами:

| Файл | Где выполняется | Для чего |
|---|---|---|
| `main.js` | **главный процесс** Electron (Node.js) | хуки запуска игры, файлы, сеть, процессы, свои IPC-методы |
| `renderer.js` | **окно лаунчера** (DOM + Node.js через `require`) | вкладки, кнопки, блоки настроек, пункты меню, реакции на события |
| `style.css` | окно лаунчера | стили (подключаются и удаляются автоматически) |

Обе части необязательны: плагин может быть только `main.js`, только `renderer.js` или только `style.css`.

**Доступ полный.** Плагин — обычный код Node.js/Electron без песочницы: он может читать и писать любые файлы,
ходить в сеть, запускать процессы, менять интерфейс и настройки. Ставьте только плагины, которым доверяете.

### Где лежат

```
%APPDATA%\magma-launcher\
├── plugins\              ← сюда кладутся плагины (каждый — своя папка)
│   └── my-plugin\
│       ├── plugin.json
│       ├── main.js
│       ├── renderer.js
│       └── style.css
├── plugin-data\<id>\     ← данные плагина (api.dataDir), storage.json
├── plugin-logs\          ← логи: plugins.log, <id>.log, crash-*.log
└── plugins.lock          ← служебный: есть во время загрузки плагинов
```

Папки, имя которых начинается с `_` или `.`, игнорируются (удобно, чтобы временно «спрятать» плагин).

---

## 2. Быстрый старт

1. Откройте вкладку **«Плагины»** (сайдбар → «Плагины»).
2. Нажмите **«Создать плагин»** → введите имя → откроется папка с готовым рабочим примером.
3. Правьте `main.js` / `renderer.js`, затем нажмите **↻** у плагина — он перезагрузится без перезапуска лаунчера.
4. Смотрите лог кнопкой ☰ у плагина (или `npm run dev` — в DevTools видно `console.log` из `renderer.js`).

Установка чужого плагина: **«Установить .zip»** (архив с `plugin.json` в корне или в одной вложенной папке)
или **«Из папки»**. Установленный так плагин сразу включается. Плагин, просто скопированный в папку
`plugins` вручную, появляется **выключенным** — включите его переключателем.

---

## 3. plugin.json

```json
{
  "id": "my-plugin",
  "name": "Мой плагин",
  "version": "1.0.0",
  "author": "nickname",
  "description": "Что делает плагин — одной строкой.",
  "main": "main.js",
  "renderer": "renderer.js",
  "style": "style.css",
  "icon": "icon.png",
  "homepage": "https://github.com/me/my-plugin",
  "minLauncher": "2.0.0"
}
```

| Поле | Обяз. | Описание |
|---|---|---|
| `id` | нет (по умолчанию имя папки) | уникальный id: латиница, цифры, `.` `_` `-`, до 64 символов. Используется в каналах IPC, именах логов и папке данных. |
| `name` | нет | отображаемое имя |
| `version` | нет | версия плагина |
| `author`, `description`, `homepage` | нет | показываются в списке |
| `main` / `renderer` / `style` | нет | пути к файлам внутри папки. Если не указаны, но в папке есть `main.js` / `renderer.js` / `style.css` — подхватятся сами. |
| `icon` | нет | PNG/JPG/SVG внутри папки (квадрат, ~64×64). Без иконки генерируется абстрактная. |
| `minLauncher` | нет | минимальная версия лаунчера (`package.json → version`, сейчас `2.0.0`). На старых версиях плагин не запустится. |

Пути не могут выходить за пределы папки плагина.

---

## 4. Жизненный цикл

Оба файла экспортируют объект с `activate` и (по желанию) `deactivate`:

```js
module.exports = {
  activate(api) { /* ... */ },   // может быть async; лимит 15 секунд
  deactivate() { /* ... */ }
};
// или короче: module.exports = (api) => { ... };
```

- **Загрузка:** при старте лаунчера (`main.js` — до создания окна, `renderer.js` — после загрузки интерфейса),
  при включении переключателем, по кнопке ↻.
- **Выгрузка:** при выключении, удалении, перезагрузке, отключении плагин-системы и выходе из лаунчера.
- **Автоочистка:** всё, что зарегистрировано через `api` / `mgl` (хуки, IPC-методы, вкладки, кнопки, стили,
  `setInterval`/`setTimeout` из API, подписки `on`) снимается **автоматически**. В `deactivate()` нужно освобождать
  только то, что вы создали сами напрямую (свои `fs.watch`, сокеты, дочерние процессы, `ipcMain.on`, DOM-узлы вне API).
- Кеш `require` для файлов плагина сбрасывается при перезагрузке — изменения кода применяются по ↻.

Все методы регистрации возвращают объект `{ dispose() }`, чтобы снять регистрацию раньше.

---

## 5. Защита от сбоев (что будет, если плагин упадёт)

| Ситуация | Реакция |
|---|---|
| Исключение в `activate()` или он не завершился за 15 с | плагин **отключается**, пишется `crash-plugin-<id>-*.log` |
| Необработанное исключение / отклонённый промис, в стеке которого есть файл плагина | плагин **отключается** + crash-лог |
| Ошибка в хуке, обработчике события, IPC-методе, таймере | ошибка в логе; **3 ошибки за минуту** → плагин отключается |
| Хук главного процесса не ответил за 20 с | считается ошибкой, запуск игры продолжается |
| За сессию автоматически отключено **3 плагина** | отключается **вся плагин-система** |
| Окно лаунчера упало (`render-process-gone`) или зависло, когда работали renderer-плагины | отключается **вся плагин-система**, окно перезагружается |
| Лаунчер упал/завис/был убит во время загрузки плагинов (остался `plugins.lock`, примерно первые 15 с после старта) | при следующем запуске плагин-система **не загружается** и отключается |

Во всех случаях: лог сохраняется в `plugin-logs`, приходит уведомление, во вкладке «Плагины» видна причина.
Отключённый после сбоя плагин включается обратно переключателем; систему — кнопкой «Включить снова».

> Если при разработке вы закрываете лаунчер через Ctrl+C / диспетчер задач в первые секунды после старта,
> при следующем запуске система отключится из-за `plugins.lock` — просто включите её снова.

Пишите код так, чтобы ошибки не вылетали наружу: оборачивайте сетевые запросы и работу с файлами в `try/catch`.

---

## 6. API главного процесса (`main.js` → `activate(api)`)

### Свойства
| | |
|---|---|
| `api.id`, `api.manifest`, `api.dir` | id, содержимое plugin.json, абсолютный путь к папке плагина |
| `api.dataDir` | папка для данных плагина (`plugin-data/<id>`, создайте сами при первой записи: `fs.mkdirSync(api.dataDir, {recursive:true})`) |
| `api.launcherVersion` | версия лаунчера |
| `api.electron` | модуль `electron` целиком (`app`, `BrowserWindow`, `dialog`, `shell`, `net`, `Notification`…) |
| `api.app`, `api.ipcMain` | то же, для удобства |
| `api.window` | главное окно `BrowserWindow` (может быть `null`, пока окно не создано) |
| `api.manager` | `MinecraftManager` — установленные версии, запуск, Java (см. ниже) |
| `api.minecraftDir()` | текущая папка `.minecraft` |

### Логи, настройки, хранилище
```js
api.log.info('текст', obj);  api.log.warn(...);  api.log.error(err);   // → plugin-logs/<id>.log и plugins.log

api.settings.get('memoryMax');           // одна настройка лаунчера (без аргумента — все)
api.settings.set({ memoryMax: 4096 });   // изменить и сохранить (рендерер тоже узнает)

api.storage.get('key', defaultValue);    // своё key-value хранилище (plugin-data/<id>/storage.json)
api.storage.set('key', value);           // value — любой JSON
api.storage.delete('key');  api.storage.all();
```
Хранилище **общее** для `main.js` и `renderer.js` одного плагина.

### Хуки лаунчера — `api.on(event, handler)`
| Событие | Данные | Можно |
|---|---|---|
| `app:ready` | `{}` | — плагины main загружены (до создания окна) |
| `launch:before` | `ctx = { folder, username, memoryMax, javaPath, launch, cancel(reason) }` | **менять поля ctx** и **отменить запуск** `ctx.cancel('причина')`. Обработчик может быть `async` — запуск ждёт. |
| `launch:after` | `{ folder, username }` | процесс игры запущен |
| `game:log` | `{ folder, stream: 'stdout'\|'stderr', line }` | каждая строка лога игры (синхронно, не делайте тяжёлого) |
| `game:exit` | `{ folder, code, signal, seconds, minutes, playtimeSeconds }` | игра закрылась |
| `app:quit` | `{}` | лаунчер выходит (только синхронный код) |

`ctx.launch` в `launch:before`:
```js
{
  extraJvmArgs: '-XX:+UseG1GC',          // строка доп. JVM-аргументов
  resolution: { width, height } | null,
  fullscreen: false,
  quickPlay: { type: 'multiplayer'|'singleplayer'|'realms', value: 'mc.server.net' } | null,
  wrapper: '', preLaunch: '', postExit: ''   // shell-команды
}
```

Свои события между плагинами: `api.emit('my-plugin:something', data)` и `api.on('my-plugin:something', fn)`.
Называйте их с префиксом своего id.

### Связь с `renderer.js`
```js
// main.js
api.handle('getStats', async (arg1, arg2) => ({ ok: true }));   // канал plugin:<id>:getStats
api.send('tick', { n: 1 });                                      // событие в renderer.js
api.notify('Заголовок', 'Текст');                                // уведомление в лаунчере (колокол + Windows)
```
```js
// renderer.js
const stats = await mgl.invoke('getStats', 1, 2);
mgl.onMain('tick', (data) => { ... });
```

### Таймеры и очистка
```js
api.setInterval(fn, 60000);   api.setTimeout(fn, 1000);   // ошибки ловятся, снимаются при выгрузке
api.onDispose(() => server.close());                     // своя очистка
api.plugins.list();  api.plugins.get('other-id');        // экспорт (module.exports) другого плагина
```

### `api.manager` (MinecraftManager) — полезное
```js
api.manager.getInstalledVersions()      // ['[1.20.1] fabric-loader-0.16.10-1.20.1', '1.8.9', ...]
api.manager.readVersionJson(folder)     // JSON профиля версии
api.manager.getRunning()                // [{ folder, pid, startedAt }] запущенные игры
api.manager.stop(folder)                // остановить игру
api.manager.javaMajorFor(folder)        // нужная версия Java (8/17/21…)
api.manager.minecraftDir                // папка .minecraft этого менеджера
```
Остальное — `scripts/minecraft-manager.js`. Встроенные IPC лаунчера (список в `CLAUDE.md`) можно вызывать
из `renderer.js` через `mgl.launcher.ipc.invoke('mc:getInstalled')` и т.п.

---

## 7. API интерфейса (`renderer.js` → `activate(mgl)`)

Окно лаунчера: `nodeIntegration: true`, поэтому в `renderer.js` работают `require('fs')`, `require('path')`,
`require('electron').ipcRenderer` и `document`.

### Общее
`mgl.id`, `mgl.manifest`, `mgl.dir`, `mgl.dataDir`, `mgl.launcherVersion`, `mgl.log.*`, `mgl.storage.*`
(то же, что в main; хранилище синхронное), `mgl.setInterval`, `mgl.setTimeout`, `mgl.onDispose`,
`mgl.plugins.list() / get(id)`, `mgl.require` (= `require`).

### Интерфейс — `mgl.ui`

**Своя вкладка**
```js
const view = mgl.ui.addView('main', {
  title: 'Моя вкладка',          // заголовок в шапке и в сайдбаре
  sidebar: true,                 // ссылка в группе «Из плагинов» (по умолчанию true)
  rail: true,                    // значок в левой панели (по умолчанию false)
  icon: mgl.ui.icons.star,       // SVG-строка для рейла
  render: () => `<div class="page-head"><div class="page-title">Привет</div></div>`,  // HTML-строка
  mount(root, mgl) { /* root — контейнер вкладки, навешивайте обработчики */ },
  unmount() { /* уход с вкладки */ }
});
view.open();                    // или mgl.ui.openView('main')
```
Внутренний ключ вкладки — `plugin.<id>.<key>` (его же принимает `mgl.launcher.setView`).
`render()` вызывается при каждом открытии вкладки; для перерисовки на месте — `mgl.ui.refresh()`.

**Блок в «Настройках»**
```js
mgl.ui.addSettingsCard({
  title: 'Мой плагин',
  render: () => `<div class="toggle-row"><div><div class="tl">Опция</div><div class="ts">Пояснение</div></div>
                 <div class="switch ${mgl.storage.get('opt') ? 'on' : ''}" id="my-sw"></div></div>`,
  mount(el) { el.querySelector('#my-sw').onclick = (e) => { e.target.classList.toggle('on'); mgl.storage.set('opt', e.target.classList.contains('on')); }; }
});
```

**Кнопки и меню**
```js
mgl.ui.addTopbarButton({ title: 'Подсказка', icon: mgl.ui.icons.info, onClick: () => {} });   // шапка, рядом с колоколом
mgl.ui.addRailButton({ title: 'Действие', icon: '<svg …>', onClick: () => {} });              // левая панель
mgl.ui.addInstanceMenuItem({                                                                   // меню сборки (⋯)
  label: 'Открыть логи', icon: mgl.ui.icons.folder, danger: false,
  when: (inst) => inst.loader === 'fabric',     // показывать ли пункт (необязательно)
  onClick: (inst) => {}                          // inst: { id, folder, name, ver, mc, loader, loaderName, pinned }
});
mgl.ui.addStyle('.my-class{ color: var(--accent); }');
```

**Диалоги и уведомления**
```js
mgl.ui.toast('Короткое сообщение');
mgl.ui.notify('Заголовок', 'Текст', 'plugin.my-plugin.main');   // колокол (+ уведомление Windows, если окно не в фокусе); 3-й аргумент — вкладка по клику
const ok = await mgl.ui.confirm({ title: 'Удалить?', message: 'Точно?', okText: 'Да', danger: true });  // true/false
const r  = await mgl.ui.ask({ title, message, okText, cancelText });   // true / false / null (закрыто)
mgl.ui.modal({
  title: 'Окно', okText: 'Сохранить', wide: false,
  bodyHtml: '<div class="field"><label class="field-label">Имя</label><input type="text" id="f-name"></div>',
  onOk: async (wrap, ctl) => { const v = wrap.querySelector('#f-name').value; return true; }   // false — не закрывать
});
mgl.ui.escapeHtml(str);   // ВСЕГДА экранируйте пользовательские/сетевые строки в HTML
mgl.ui.html('<div>…</div>');   // строка → DOM-элемент
mgl.ui.icons               // встроенные SVG: play, stop, plus, folder, star, info, warn, dl, box, globe, clock, lock, copy, pencil, restart, heart, sliders, arrow, dots
```

### Лаунчер — `mgl.launcher`
```js
mgl.launcher.data                 // живые данные UI: instances[], servers[], settings{}, profile, sessions[]
mgl.launcher.settings.get('username');
mgl.launcher.settings.save({ username: 'Steve' });   // сохранить настройку лаунчера
mgl.launcher.launch(folder, { username, quickPlay: { type: 'multiplayer', value: 'mc.hypixel.net' } });
mgl.launcher.setView('home');     // home, news, mycontent, browse, library, servers, sessions, skins, settings, plugins
mgl.launcher.currentView;
await mgl.launcher.reloadData();  // перечитать сборки/настройки
mgl.launcher.downloads            // трекер фоновых загрузок: start(id, kind, title), update(id, {progress, status}), finish(id, {ok, error})
mgl.launcher.ipc                  // ipcRenderer — любые встроенные IPC лаунчера
mgl.launcher.verLabel(folder)     // имя папки версии без префикса [1.20.1]
```

### События — `mgl.on(event, handler)`
| Событие | Данные |
|---|---|
| `game:launched` | `{ folder }` |
| `game:exit` | `{ folder, code, seconds, playtimeSeconds }` |
| `game:log` | `{ folder, stream, line }` |
| `game:error` | строка ошибки запуска |
| `launch:progress` | `{ progress, status }` |
| `view:change` | `{ name, root }` — вкладка отрисована (можно дописать в неё свои элементы) |
| `view:leave` | `{ name, next }` |
| `settings:change` | patch изменённых настроек |
| `instmenu:open` | `{ inst, menu }` |
| `rail:render` | `{ el }` |
| любое другое имя | свои события renderer-плагинов: `mgl.emit(name, data)` |

### Полный доступ
`mgl.internals` — внутренний объект UI (`views`, `TITLES`, `setView`, `showModal`, `D` и т.д.). Менять встроенные
вкладки можно, например обернув `mgl.internals.views.home`, но такие плагины могут сломаться при обновлении лаунчера.
Предпочитайте публичный API выше.

---

## 8. Оформление

Используйте классы и CSS-переменные лаунчера — тогда плагин автоматически подхватит любую тему (тёмную/светлую):

- Цвета: `var(--bg)`, `var(--panel)`, `var(--panel-raised)`, `var(--border)`, `var(--text)`, `var(--text-dim)`,
  `var(--text-faint)`, `var(--accent)`, `var(--accent-hover)`, `var(--on-accent)`, `var(--ember)` (предупреждение),
  `rgba(var(--accent-rgb), .2)`. **Не задавайте цвета хексом.**
- Страница: `.page-head > .page-title + .page-sub`, `.section > .section-head > .section-title`.
- Карточки: `.settings-card` (+ `h3`), строки `.toggle-row > div > .tl + .ts`, переключатель `.switch` (+ `.on`).
- Кнопки: `.btn.primary`, `.btn-secondary`, `.btn-ghost`; поля: `.field > .field-label + input`, `.field-hint`, `.field-row`.
- Пусто: `.empty` (+ `.sm`) с SVG и текстом; чипы `.chip` (+ `.on`); путь `code.path`.
- Свои классы называйте с префиксом id плагина (`.myplugin-…`), чтобы не конфликтовать.

---

## 9. Примеры

### 9.1. Discord-подобный «статус игры» в шапке (только renderer)
```js
module.exports = {
  activate(mgl) {
    let started = 0;
    const btn = mgl.ui.addTopbarButton({ title: 'Не в игре', icon: mgl.ui.icons.clock, onClick: () => mgl.ui.toast(btn.title) });
    mgl.on('game:launched', () => { started = Date.now(); });
    mgl.on('game:exit', (d) => mgl.ui.notify('Сессия окончена', `Сыграно ${Math.round(d.seconds / 60)} мин`));
  }
};
```

### 9.2. Авто-бэкап миров после выхода из игры (только main)
```js
const fs = require('fs'), path = require('path');
module.exports = {
  activate(api) {
    api.on('game:exit', async () => {
      const saves = path.join(api.minecraftDir(), 'saves');
      if (!fs.existsSync(saves)) return;
      const dest = path.join(api.dataDir, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(saves, dest, { recursive: true });
      api.log.info('бэкап:', dest);
      api.notify('Бэкап готов', dest);
    });
  }
};
```

### 9.3. Запрет запуска без нужного мода + JVM-флаг (main)
```js
const fs = require('fs'), path = require('path');
module.exports = (api) => {
  api.on('launch:before', (ctx) => {
    ctx.launch.extraJvmArgs = (ctx.launch.extraJvmArgs + ' -XX:+UseG1GC').trim();
    if (ctx.folder.includes('fabric')) {
      const mods = path.join(api.minecraftDir(), 'mods');
      const ok = fs.existsSync(mods) && fs.readdirSync(mods).some(f => /^fabric-api.*\.jar$/i.test(f));
      if (!ok) ctx.cancel('Для Fabric нужен Fabric API в папке mods');
    }
  });
};
```

### 9.4. Вкладка с данными из main (оба файла)
```js
// main.js
module.exports = (api) => {
  api.handle('versions', () => api.manager.getInstalledVersions());
};
// renderer.js
module.exports = (mgl) => {
  mgl.ui.addView('list', {
    title: 'Мои версии',
    render: () => '<div class="page-head"><div class="page-title">Версии</div></div><div class="settings-card" id="v"></div>',
    async mount(root) {
      const list = await mgl.invoke('versions');
      root.querySelector('#v').innerHTML = list.map(v => `<div class="toggle-row">${mgl.ui.escapeHtml(mgl.launcher.verLabel(v))}</div>`).join('');
    }
  });
};
```

### 9.5. Счётчик ошибок в логе игры (main → renderer)
```js
// main.js
module.exports = (api) => {
  let n = 0;
  api.on('launch:after', () => { n = 0; });
  api.on('game:log', (e) => { if (e.stream === 'stderr' || /ERROR/.test(e.line)) api.send('err', ++n); });
};
// renderer.js
module.exports = (mgl) => {
  mgl.onMain('err', (n) => { if (n === 1) mgl.ui.toast('В логе игры появились ошибки'); });
};
```

---

## 10. Отладка

- `npm run dev` — лаунчер с DevTools: `console.log` из `renderer.js` и ошибки видны в консоли.
- Логи `main.js` — в терминале, где запущен лаунчер, и в `plugin-logs/<id>.log` (кнопка ☰ у плагина).
- Журнал (☰ в панели инструментов) показывает `plugins.log` и все crash-логи.
- `window.MglPlugins.active()` в DevTools — список активных renderer-плагинов; `MglPlugins.state()` — полное состояние.
- После изменения `plugin.json` нажмите ↻ «Перезагрузить все» или выключите/включите плагин.

## 11. Распространение

Упакуйте папку плагина в `.zip` (`plugin.json` в корне архива или в единственной вложенной папке) — пользователь
ставит её кнопкой «Установить .zip». При установке плагин с тем же `id` заменяется (данные в `plugin-data` сохраняются).
Внешние npm-зависимости кладите в `node_modules` внутри папки плагина (`require` найдёт их относительно файла).

---

## 12. Правила для ИИ (как сгенерировать плагин по запросу пользователя)

1. Выдавай **полный набор файлов**: `plugin.json` + `main.js` и/или `renderer.js` (+ `style.css` при необходимости).
   Указывай путь: `%APPDATA%\magma-launcher\plugins\<id>\`.
2. `id` — kebab-case латиницей, уникальный, совпадает с именем папки.
3. Модульный формат — **CommonJS** (`module.exports`, `require`). Никаких `import/export`, бандлеров, TypeScript.
4. Код главного процесса (файлы, сеть, процессы, хуки запуска) — в `main.js`; интерфейс — в `renderer.js`.
   Связь между ними — только `api.handle`/`mgl.invoke` и `api.send`/`mgl.onMain`.
5. Регистрируй всё через API (`api.on`, `mgl.ui.*`, `mgl.setInterval` …) — тогда выгрузка чистая. Если создаёшь ресурсы
   напрямую (`fs.watch`, `http.createServer`, `child_process`) — закрывай их в `deactivate()` или через `api.onDispose`.
6. Любые строки из сети/файлов/ввода пользователя вставляй в HTML только через `mgl.ui.escapeHtml`.
7. Оборачивай сеть и файловые операции в `try/catch`, логируй через `api.log.error` / `mgl.log.error`.
   Три ошибки за минуту отключат плагин.
8. Цвета — только CSS-переменные темы, классы — с префиксом id. Используй готовые классы лаунчера (раздел 8).
9. Тексты интерфейса — на русском, как в остальном лаунчере.
10. Не блокируй поток: тяжёлые операции — асинхронно; в `game:log` и `app:quit` — только быстрый синхронный код.
11. Для HTTP в `main.js` предпочитай `api.electron.net` (через Chromium; Node `https` в некоторых сетях рвёт соединение)
    или `fetch` в `renderer.js`.
12. В конце кратко объясни пользователю, как установить (скопировать папку → включить во вкладке «Плагины» или ↻).

### Минимальный шаблон для копирования

`plugin.json`
```json
{ "id": "example", "name": "Пример", "version": "1.0.0", "description": "…", "main": "main.js", "renderer": "renderer.js" }
```
`main.js`
```js
module.exports = {
  activate(api) {
    api.handle('ping', () => 'pong');
  },
  deactivate() {}
};
```
`renderer.js`
```js
module.exports = {
  activate(mgl) {
    mgl.ui.addView('main', {
      title: 'Пример',
      render: () => `<div class="page-head"><div class="page-title">Пример</div></div>
                     <div class="settings-card"><button class="btn primary" id="ex-btn">Ping</button></div>`,
      mount(root) {
        root.querySelector('#ex-btn').addEventListener('click', async () => mgl.ui.toast(await mgl.invoke('ping')));
      }
    });
  },
  deactivate() {}
};
```
