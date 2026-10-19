(function () {
  'use strict';

  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  const CHEV = '<svg class="cs-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  let openState = null;
  function esc(t) { const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function closePop(focusBtn) {
    if (!openState) return;
    const { pop, btn } = openState;
    pop.remove();
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDocDown, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onWinChange);
    window.removeEventListener('scroll', onWinChange, true);
    if (focusBtn) btn.focus();
    openState = null;
  }
  function onDocDown(e) {
    if (!openState) return;
    if (openState.pop.contains(e.target) || openState.btn.contains(e.target)) return;
    closePop(false);
  }
  function onWinChange(e) {
    if (openState && e && e.target && openState.pop.contains(e.target)) return;
    closePop(false);
  }
  function highlight(i) {
    if (!openState) return;
    const items = openState.items;
    if (!items.length) return;
    openState.idx = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((el, k) => el.classList.toggle('hl', k === openState.idx));
    items[openState.idx].scrollIntoView({ block: 'nearest' });
  }
  function step(dir) {
    if (!openState) return;
    const items = openState.items;
    let i = openState.idx;
    do { i += dir; } while (i >= 0 && i < items.length && items[i].classList.contains('dis'));
    if (i >= 0 && i < items.length) highlight(i);
  }
  function choose(sel, index) {
    const opt = sel.options[index];
    if (!opt || opt.disabled) return;
    if (sel.selectedIndex !== index) {
      sel.selectedIndex = index;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closePop(true);
  }
  function onKey(e) {
    if (!openState) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); highlight(0); }
    else if (e.key === 'End') { e.preventDefault(); highlight(openState.items.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const it = openState.items[openState.idx];
      if (it) choose(openState.sel, +it.dataset.i);
    } else if (e.key === 'Tab') closePop(false);
  }

  function openPop(sel, btn) {
    closePop(false);
    const pop = document.createElement('div');
    pop.className = 'cs-pop';
    pop.setAttribute('role', 'listbox');
    const opts = Array.from(sel.options);
    const label = (t) => {
      const p = String(t).split(' · ');
      return p.length === 2 ? `${esc(p[0])} <em class="cs-note">${esc(p[1])}</em>` : esc(t);
    };
    pop.innerHTML = opts.map((o, i) => `
      <div class="cs-item${o.selected ? ' sel' : ''}${o.disabled ? ' dis' : ''}" role="option" data-i="${i}" aria-selected="${o.selected}">
        <span>${label(o.textContent)}</span>${o.selected ? CHECK : ''}
      </div>`).join('') || '<div class="cs-empty">Нет вариантов</div>';
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.minWidth = r.width + 'px';
    const ph = pop.offsetHeight, pw = pop.offsetWidth;
    const below = window.innerHeight - r.bottom - 10, above = r.top - 10;
    const up = ph > below && above > below;
    const maxH = Math.max(120, Math.min(300, up ? above : below));
    pop.style.maxHeight = maxH + 'px';
    const h = Math.min(ph, maxH);
    pop.style.top = (up ? r.top - h - 6 : r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left)) + 'px';
    pop.classList.toggle('up', up);
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    const items = Array.from(pop.querySelectorAll('.cs-item'));
    openState = { sel, btn, pop, items, idx: Math.max(0, sel.selectedIndex) };
    pop.addEventListener('mousedown', (e) => e.preventDefault());
    pop.addEventListener('click', (e) => {
      const it = e.target.closest('.cs-item');
      if (it && !it.classList.contains('dis')) choose(sel, +it.dataset.i);
    });
    pop.addEventListener('mousemove', (e) => {
      const it = e.target.closest('.cs-item');
      if (it && !it.classList.contains('dis')) highlight(items.indexOf(it));
    });
    highlight(openState.idx);
    document.addEventListener('mousedown', onDocDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onWinChange);
    window.addEventListener('scroll', onWinChange, true);
  }

  function enhance(sel) {
    if (sel.dataset.cs || sel.multiple || sel.size > 1) return;
    sel.dataset.cs = '1';
    const wrap = document.createElement('div');
    wrap.className = 'cs';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cs-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    wrap.insertBefore(btn, sel);
    const refresh = () => {
      const o = sel.options[sel.selectedIndex];
      btn.innerHTML = `<span class="cs-label">${esc(o ? o.textContent : '')}</span>${CHEV}`;
      btn.disabled = sel.disabled;
      wrap.classList.toggle('disabled', sel.disabled);
      if (openState && openState.sel === sel) closePop(false);
    };
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get() { return valueDesc.get.call(this); },
      set(v) { valueDesc.set.call(this, v); refresh(); }
    });
    new MutationObserver(refresh).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
    sel.addEventListener('change', refresh);
    btn.addEventListener('click', () => {
      if (openState && openState.sel === sel) closePop(true);
      else openPop(sel, btn);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openPop(sel, btn); }
    });
    refresh();
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'SELECT') enhance(root);
    root.querySelectorAll && root.querySelectorAll('select:not([data-cs])').forEach(enhance);
  }
  const obs = new MutationObserver((muts) => {
    muts.forEach(m => m.addedNodes.forEach(scan));
  });
  function start() {
    scan(document.body);
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.MglSelect = { scan };
})();
