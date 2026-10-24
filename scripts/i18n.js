// Локализация RU/EN. Исходные строки в коде - русские; английский режим переводит ГОТОВЫЙ текст:
//  · в окне - обходом DOM (текстовые узлы + title/placeholder/aria-label/alt) и MutationObserver для всего, что дорисовывается позже;
//  · в главном процессе - функцией t() для трея/диалогов/уведомлений (require('./i18n')).
// Словарь - scripts/i18n-en.js: «русский фрагмент → английский». Фрагмент - кусок текста между тегами/подстановками ${…},
// поэтому составные строки («Ошибка: » + текст) переводятся по частям. Логика кода от текста не зависит.
// Язык: settings.language = auto | ru | en; в окне кэшируется в localStorage['mgl.lang'] (применяется до отрисовки).
(function (root, factory) {
  const api = factory(root);
  // в окне Electron (nodeIntegration) `module` тоже существует - глобал выставляем всегда, когда есть document
  if (typeof document !== 'undefined') { root.MglI18n = api; api.boot(); }
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  const isBrowser = typeof document !== 'undefined';
  const CYR = /[А-Яа-яЁё]/;
  const isCyr = (c) => !!c && /[А-Яа-яЁё]/.test(c);
  const KEY = 'mgl.lang';

  let DICT = {};
  try { DICT = isBrowser ? (root.MGL_I18N_EN || {}) : require('./i18n-en.js'); } catch (e) { DICT = {}; }

  // ---- выбор языка ----
  function autoLang() {
    let loc = '';
    try { loc = (isBrowser ? navigator.language : (process.env.LANG || '')) || ''; } catch (e) {}
    return /^(ru|uk|be|kk)/i.test(loc) ? 'ru' : 'en';
  }
  let pref = 'auto', lang = 'ru';
  function setPref(p) {                      // 'auto' | 'ru' | 'en'
    pref = p === 'ru' || p === 'en' ? p : 'auto';
    lang = pref === 'auto' ? autoLang() : pref;
    if (isBrowser) {
      try { pref === 'auto' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, pref); } catch (e) {}
      root.MGL_LOCALE = lang === 'en' ? 'en-GB' : 'ru-RU';
      try { document.documentElement.lang = lang; } catch (e) {}
    }
    cache.clear();
  }

  // ---- ядро перевода ----
  // Ключи группируются по первому символу и сортируются от длинных к коротким → в тексте побеждает самое длинное совпадение.
  // Короткие ключи (< 4 символов) допустимы только как весь текст целиком - иначе «с», «для» ломали бы обычные фразы.
  const exact = new Map();
  const buckets = new Map();
  Object.keys(DICT).forEach(k => {
    exact.set(k, DICT[k]);
    if (k.length < 4 && !/^[А-ЯЁ]{2,}$/.test(k)) return;      // короткие - только целиком; аббревиатуры (ОЗУ, ИИ) - и внутри текста
    const c = k[0];
    if (!buckets.has(c)) buckets.set(c, []);
    buckets.get(c).push(k);
  });
  buckets.forEach(list => list.sort((a, b) => b.length - a.length));

  // числа с единицами: «512 МБ», «3 ч 12 мин», «45 мс»
  const UNITS = { 'МБ': 'MB', 'ГБ': 'GB', 'КБ': 'KB', 'ГГц': 'GHz', 'мс': 'ms', 'мин': 'min', 'ч': 'h', 'с': 's' };
  const UNIT_RE = /(\d)(\s?)(МБ|ГБ|КБ|ГГц|мс|мин|ч|с)(?![А-Яа-яЁёA-Za-z])/g;

  function scan(text) {
    let out = '', i = 0, changed = false;
    const n = text.length;
    while (i < n) {
      const c = text[i];
      const list = buckets.get(c);
      let hit = null;
      if (list && !(isCyr(c) && i > 0 && isCyr(text[i - 1]))) {
        for (let j = 0; j < list.length; j++) {
          const k = list[j];
          if (!text.startsWith(k, i)) continue;
          const end = i + k.length;
          if (isCyr(k[k.length - 1]) && isCyr(text[end])) continue;      // не обрывать слово посередине
          hit = k; break;
        }
      }
      if (hit) { out += DICT[hit]; i += hit.length; changed = true; }
      else { out += c; i++; }
    }
    return changed ? out : text;
  }
  const cache = new Map();
  function translate(text) {
    if (lang !== 'en' || !text || !CYR.test(text)) return text;
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    const lead = /^\s*/.exec(text)[0], trail = /\s*$/.exec(text)[0];
    const core = text.slice(lead.length, text.length - trail.length);
    let res;
    if (exact.has(core)) res = exact.get(core);
    else {
      res = scan(core);
      if (CYR.test(res) && /\s{2,}|\n/.test(core)) {               // перенос строки/отступы посреди предложения в HTML
        const flat = core.replace(/\s+/g, ' ');
        const r2 = exact.has(flat) ? exact.get(flat) : scan(flat);
        const cyr = (s) => (s.match(/[А-Яа-яЁё]/g) || []).length;
        if (cyr(r2) < cyr(res)) res = r2;
      }
      res = res.replace(UNIT_RE, (m, d, sp, u) => d + sp + UNITS[u]);
    }
    res = lead + res + trail;
    if (cache.size > 4000) cache.clear();
    cache.set(text, res);
    return res;
  }

  // ---- DOM (только окно) ----
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const SKIP = 'script,style,textarea,pre,.game-log-body,.srv-log,.srv-console,.cmd-input,.crash-text,[translate="no"]';
  let observer = null;
  function skipped(el) { return !!(el && el.closest && el.closest(SKIP)); }
  function fixText(node) {
    const v = node.nodeValue;
    if (!v || !CYR.test(v)) return;
    if (skipped(node.parentElement)) return;
    const t = translate(v);
    if (t !== v) node.nodeValue = t;
  }
  function fixAttrs(el) {
    for (let i = 0; i < ATTRS.length; i++) {
      const a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (v && CYR.test(v)) { const t = translate(v); if (t !== v) el.setAttribute(a, t); }
    }
  }
  // отвергнутый элемент пропускается вместе со всем содержимым
  const walkFilter = { acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) };
  function walk(node) {
    if (node.nodeType === 3) { fixText(node); return; }
    if (node.nodeType !== 1 || skipped(node)) return;
    fixAttrs(node);
    const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, walkFilter);
    for (let cur = tw.nextNode(); cur; cur = tw.nextNode()) {
      if (cur.nodeType === 3) fixText(cur); else fixAttrs(cur);
    }
  }
  function start() {
    if (observer || !document.body) return;
    walk(document.body);
    document.title = translate(document.title);
    observer = new MutationObserver((list) => {
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (m.type === 'childList') m.addedNodes.forEach(n => walk(n));
        else if (m.type === 'characterData') fixText(m.target);
        else if (m.type === 'attributes') fixAttrs(m.target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function boot() {
    if (!isBrowser) return;
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    setPref(saved === 'ru' || saved === 'en' ? saved : 'auto');
    if (lang === 'en') {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    }
  }

  return {
    boot, translate, t: translate,
    get lang() { return lang; }, get pref() { return pref; },
    // для главного процесса: выставить язык из настроек (auto → по системной локали)
    use(p, systemLocale) {
      pref = p === 'ru' || p === 'en' ? p : 'auto';
      if (pref === 'auto') lang = /^(ru|uk|be|kk)/i.test(systemLocale || autoLang()) ? 'ru' : 'en';
      else lang = pref;
      cache.clear();
    },
    // из окна: сменить язык и перезагрузить (перевод применяется при загрузке страницы)
    change(p) { setPref(p); if (isBrowser) location.reload(); },
    get size() { return exact.size; }
  };
});
