// Данные UI
//  - В Electron заполняется реальными данными
//  - В браузере используется небольшой fallback только для разработки
// Каталог контента (Моды/Текстуры/...) - демонстрационный это витрина
window.MGL_DATA = {
  profile: { name: 'Player_MGL', sub: 'Локальный аккаунт' },

  instances: [],   // реальные установленные версии
  sessions: [],    // активные сессии
  servers: [],     // серверы из servers.dat
  versions: [],    // версии для запуска/установки
  settings: {},
  stats: null,

  // Новости
  news: [
    { title: 'Добро пожаловать в Magma Launcher 2.0', text: 'Новый интерфейс - новый день, запуск сборок и своих серверов, работа с модпаками', date: 'Недавно' },
    { title: 'Поддержка плащей', text: 'Теперь можно загружать свои плащи - они отображаются на 3D-модели', date: 'Сегодня' }
  ],

  content: {
    mods: [
      { name: 'Just Enough Items', author: 'mezz', desc: 'Просмотр рецептов крафта и предметов прямо в инвентаре, без лишних меню.', dl: '84М', rating: '4.9', tags: [['Forge', 'loader'], ['Утилиты', '']] },
      { name: 'Sodium', author: 'CaffeineMC', desc: 'Переработка рендера мира для существенного прироста FPS без потери качества.', dl: '112М', rating: '4.8', tags: [['Fabric', 'loader'], ['Производительность', '']] },
      { name: 'Create', author: 'simibubi', desc: 'Механизмы, автоматизация и кинетическая энергия - целая инженерная песочница.', dl: '76М', rating: '4.9', tags: [['Forge', 'loader'], ['Техника', '']] },
      { name: 'Iris Shaders', author: 'coderbot', desc: 'Поддержка шейдеров в связке с Sodium для максимального FPS и красоты.', dl: '54М', rating: '4.8', tags: [['Fabric', 'loader'], ['Графика', '']] }
    ],
    textures: [
      { name: 'Fresh Animations', author: 'Gefyord', desc: 'Пак текстур с плавной анимацией мобов и деталями, близкими к ванильному стилю.', dl: '21М', rating: '4.7', tags: [['Текстуры', '']] },
      { name: 'Faithful 32x', author: 'Faithful Team', desc: 'Повышенное разрешение ванильных текстур с сохранением оригинального вида.', dl: '48М', rating: '4.8', tags: [['Текстуры', '']] }
    ],
    shaders: [
      { name: 'Complementary Shaders', author: 'EminGT', desc: 'Мягкое освещение, объёмные тени и вода - баланс между красотой и FPS.', dl: '38М', rating: '4.9', tags: [['Шейдеры', '']] },
      { name: 'BSL Shaders', author: 'Capt Tatsu', desc: 'Популярный пак с реалистичным освещением и настраиваемыми эффектами.', dl: '29М', rating: '4.7', tags: [['Шейдеры', '']] }
    ],
    modpacks: [
      { name: 'All the Mods 9', author: 'ATM Team', desc: 'Огромная сборка на сотни модов для технического и магического прохождения.', dl: '9М', rating: '4.8', tags: [['Forge', 'loader'], ['Модпак', '']] },
      { name: 'Better MC', author: 'Luna Pixels', desc: 'Приключенческая сборка с новыми биомами, мобами и улучшенной графикой.', dl: '6М', rating: '4.6', tags: [['Fabric', 'loader'], ['Модпак', '']] }
    ]
  },

  // Fallback только для просмотра в браузере
  _preview: {
    instances: [
      { folder: 'Forge 1.8.9', name: 'Forge 1.8.9', mc: '1.8.9', loader: 'forge' },
      { folder: '1.21.1', name: '1.21.1', mc: '1.21.1', loader: 'vanilla' }
    ],
    servers: [{ name: 'Hypixel', ip: 'mc.hypixel.net' }, { name: 'Сервер друзей', ip: 'play.vanesmp.ru' }],
    versions: ['1.21.1', '1.20.4', '1.20.1', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9']
  }
};
