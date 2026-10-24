// Базовая доступность: клавиатура и подписи для интерфейса из <div>-кнопок.
//  · кликабельные не-нативные элементы получают tabindex=0 + role (button / switch), Enter и Пробел их «нажимают»;
//  · иконки без текста получают aria-label из title; активный пункт меню - aria-current; тосты - aria-live;
//  · модалки - role=dialog, фокус при открытии, Esc закрывает. Видимый фокус - в style.css (:focus-visible).
// Работает наблюдателем за DOM, поэтому код отрисовки вью менять не нужно.
(function () {
  'use strict';
  const CLICKABLE = '.nav-link, .nav-label-toggle, .rail-item, .rail-session, .icon-btn, .switch, .pk-card, .instance-row, .lib-row, ' +
    '.skin-card, .vp-row, .section-link, .profile-card, .crash-item, .theme-card, .notif-item[data-view]';
  const NATIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY|OPTION)$/;

  function enhance(el) {
    if (el.nodeType !== 1) return;
    if (el.matches(CLICKABLE) && !NATIVE.test(el.nodeName)) {
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      if (!el.hasAttribute('role')) el.setAttribute('role', el.classList.contains('switch') ? 'switch' : 'button');
    }
    if (el.classList.contains('switch')) el.setAttribute('aria-checked', String(el.classList.contains('on')));
    if (el.classList.contains('nav-link') || el.classList.contains('rail-item')) {
      if (el.classList.contains('active')) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    }
    // иконка без текста: подпись из title
    if (!el.hasAttribute('aria-label') && el.hasAttribute('title') && el.matches('button, [role="button"], .icon-btn, .rail-item') && !el.textContent.trim()) {
      el.setAttribute('aria-label', el.getAttribute('title'));
    }
    if (el.classList.contains('toast')) { el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); }
    if (el.classList.contains('modal') && !el.hasAttribute('role')) { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); focusFirst(el); }
    if (el.classList.contains('ctx-menu')) el.setAttribute('role', 'menu');
    if (el.classList.contains('ctx-item')) el.setAttribute('role', 'menuitem');
  }
  function enhanceTree(root) {
    if (root.nodeType !== 1) return;
    enhance(root);
    root.querySelectorAll('*').forEach(enhance);
  }
  function focusFirst(modal) {
    setTimeout(() => {
      if (!modal.isConnected || modal.contains(document.activeElement)) return;
      const t = modal.querySelector('input:not([type=hidden]):not([disabled]), select, textarea, .modal-ok, button:not([disabled])');
      if (t) try { t.focus(); } catch (e) {}
    }, 30);
  }

  function start() {
    enhanceTree(document.body);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(enhanceTree);
        else if (m.type === 'attributes' && m.target.nodeType === 1) {
          const t = m.target;
          if (t.classList.contains('switch') || t.classList.contains('nav-link') || t.classList.contains('rail-item')) enhance(t);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (e.key === 'Escape') {
        // закрыть верхнюю модалку (подтверждения закрываются сами в appConfirm)
        const modal = document.getElementById('app-modal');
        const confirm = document.querySelector('.confirm-wrap');
        if (modal && !confirm) { const x = modal.querySelector('.modal-close'); if (x) { e.stopPropagation(); x.click(); } }
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && t && t.nodeType === 1 && t.matches('[role="button"], [role="switch"]') && !NATIVE.test(t.nodeName) && !e.defaultPrevented) {
        e.preventDefault();
        t.click();
      }
    });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
