<div align="center">

<img src="assets/images/logo.jpg" alt="Magma Launcher" width="120">

# Magma Launcher

**Бесплатный неофициальный лаунчер Minecraft на Electron: сборки, моды, серверы, скины и плагины в одном окне.**

[Скачать](https://github.com/AuriXDev/Magma-Launcher/releases/latest) ·
[Плагины](docs/PLUGINS.md) ·
[Конфиденциальность](docs/PRIVACY_POLICY.md) ·
[Условия](docs/TERMS_OF_SERVICE.md)

</div>

---

## Возможности

**Игра**
- Установка любой версии Minecraft: от альфы до последних релизов (проверка sha1, библиотеки, natives, ассеты, докачка недостающего перед запуском).
- Загрузчики: **Fabric**, **Quilt**, **Forge**, **NeoForge**, версии подбираются автоматически под выбранную версию игры.
- Автоматический подбор и установка **Java** (Temurin, рантайм Mojang), отдельная Java и память на каждую сборку.
- Параметры запуска: JVM-аргументы, разрешение, полный экран, быстрый вход на сервер (Quick Play), pre-launch и post-exit хуки.
- Живой лог игры, остановка процесса, учёт игрового времени.

**Сборки**
- Изолированные сборки: у каждой свои `mods`, `config`, `saves`, `resourcepacks`, `shaderpacks`.
- Создание сборки в мастере, дублирование, переустановка с откатом при ошибке.
- Импорт и экспорт `.mrpack`, установка модпаков Modrinth.
- Управление модами, ресурспаками, шейдерами и мирами (бэкапы миров в zip).

**Контент**
- Поиск и установка с **Modrinth** с учётом версии игры и загрузчика, автоматические зависимости.
- «Мой контент»: включение и отключение, удаление с предупреждением о зависимых модах, перетаскивание файлов.

**Серверы**
- Свои серверы по IP с пингом (MOTD, игроки, иконка) и запись в `servers.dat`.
- Локальные серверы: скачивание `server.jar`, запуск и остановка, консоль, редактор `server.properties`.

**Оформление**
- Тёмные и светлые темы, свои темы из пары «фон + акцент», 3D-фон, визуализатор звука, сезонные эффекты.
- Скины и плащи с 3D-превью, импорт по нику, URL или файлу.
- Русский и английский интерфейс, поддержка клавиатуры и экранных дикторов.

**Прочее**
- Система плагинов ([руководство](docs/PLUGINS.md)).
- Локальные отчёты о сбоях (ничего никуда не отправляется).
- Работа в фоне из системного трея, уведомления Windows.
- Проверка и установка обновлений лаунчера.

> Вход через Microsoft-аккаунт пока не реализован: игра запускается с локальным никнеймом.

## Установка

1. Скачайте `MagmaLauncher-Setup-<версия>.exe` со страницы [Releases](https://github.com/AuriXDev/Magma-Launcher/releases/latest).
2. Запустите установщик.
3. Установщик пока не подписан сертификатом, поэтому Windows SmartScreen может показать предупреждение «неизвестный издатель». Нажмите «Подробнее» → «Выполнить в любом случае».

Требования: Windows 10 или новее, x64. Java ставить вручную не нужно: лаунчер найдёт её или предложит установить.

## Запуск из исходников

Нужны [Node.js](https://nodejs.org/) 18+ и Git.

```bash
git clone https://github.com/AuriXDev/Magma-Launcher.git
cd Magma-Launcher
npm install
npm start
```

| Команда | Что делает |
|---|---|
| `npm start` | запуск приложения |
| `npm run dev` | запуск с DevTools |
| `npm run build` | сборка установщика в `dist/` (NSIS, x64) |
| `node dev-server.js` | предпросмотр интерфейса в браузере на `:5188` (только для разработки) |

Если встроенный загрузчик бинарника Electron рвёт соединение, поставьте пакеты командой `npm install --ignore-scripts` и распакуйте Electron вручную в `node_modules/electron/dist`.

## Структура проекта

```
index.html            разметка окна
scripts/
  main.js             главный процесс: окно, IPC, запуск игры, трей
  minecraft-manager.js  установка версий, загрузчиков, Java, запуск
  instances.js        сборки, .mrpack, миры
  plugin-host.js      ядро плагинов
  ui.js, packs.js, plugins.js   интерфейс
  i18n.js, i18n-en.js локализация RU/EN
styles/style.css      стили и темы
assets/               icons/ (иконки), images/ (логотип, фон, скин), fonts/, audio/, MGL/ (моды скинов), obj/ (3D-фон)
docs/                 плагины, политика, условия
```

## Плагины

Плагины лежат в `%APPDATA%/magma-launcher/plugins/<id>/` и описываются файлом `plugin.json`. Они могут менять запуск игры, добавлять свои вкладки и работать с логом. Шаблон создаётся кнопкой «Создать плагин» во вкладке «Плагины», а полное руководство открывается кнопкой «Как писать плагины» (то же самое: [docs/PLUGINS.md](docs/PLUGINS.md)).

## Данные пользователя

Все настройки и файлы хранятся локально: `%APPDATA%/magma-launcher/` и папка `.minecraft`. Лаунчер не собирает аналитику и не отправляет персональные данные разработчику. Подробности в [политике конфиденциальности](docs/PRIVACY_POLICY.md).

## Документы

- [Политика конфиденциальности](docs/PRIVACY_POLICY.md)
- [Условия использования](docs/TERMS_OF_SERVICE.md)
- [Руководство по плагинам](docs/PLUGINS.md)

## Лицензия

[MIT](LICENSE). Код можно свободно использовать, изменять и распространять, в том числе в своих проектах, при условии сохранения упоминания автора оригинала (строки Copyright и текста лицензии).

## Отказ от ответственности

Magma Launcher не является продуктом Mojang Studios или Microsoft и не одобрен ими. «Minecraft» - товарный знак Mojang Studios / Microsoft.

## Контакты

Telegram: **@VuaTrix**

---

<sub>**English:** Magma Launcher is a free, unofficial Minecraft launcher built with Electron. It supports vanilla, Fabric, Quilt, Forge and NeoForge, isolated instances, Modrinth content and `.mrpack` modpacks, local servers, skins and capes, themes, and a plugin system. Download the installer from [Releases](https://github.com/AuriXDev/Magma-Launcher/releases/latest) or run from source with `npm install && npm start`. The interface is available in Russian and English.</sub>
