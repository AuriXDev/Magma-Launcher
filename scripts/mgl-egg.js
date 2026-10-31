// Пасхалка в Настройках: заголовок «MGL» из трёх букв, которые можно менять местами
// (клик по букве, затем по другой - или перетащить одну на другую).
//   MGL - исходное слово, ничего не происходит
//   MLG - слева снизу выглядывает картинка на 5 секунд и один раз играет песня
//   GLM - уведомление «Z»
// Выключается: Настройки -> Оптимизация -> «Отключить пасхалки».
(function () {
  const IMAGES = ['assets/event/mlg.png']; // сюда можно докинуть ещё картинки - выберется случайная
  const SONG = 'assets/event/mlg.mp3';
  const PEEK_MS = 5000;

  let root = null, audio = null, imgEl = null, imgTimer = null, curWord = 'MGL', picked = null, notify = null;

  const letters = () => (root ? Array.from(root.querySelectorAll('.mgl-letter')) : []);
  const word = () => letters().map(l => l.dataset.ch).join('');

  function swap(a, b) {
    if (!a || !b || a === b) return;
    const ph = document.createComment('');
    a.replaceWith(ph); b.replaceWith(a); ph.replaceWith(b);
    check();
  }

  function mount(opts) {
    unmount();
    notify = (opts && opts.notify) || null;
    root = document.getElementById('mgl-egg');
    if (!root) return;
    curWord = word();
    root.addEventListener('click', (e) => {
      const l = e.target.closest('.mgl-letter');
      if (!l) return;
      if (!picked) { picked = l; l.classList.add('picked'); return; }
      const p = picked; picked = null;
      p.classList.remove('picked');
      swap(p, l);
    });
    let dragged = null;
    root.addEventListener('dragstart', (e) => {
      dragged = e.target.closest('.mgl-letter');
      if (!dragged) return;
      if (picked) { picked.classList.remove('picked'); picked = null; }
      try { e.dataTransfer.setData('text/plain', dragged.dataset.ch); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
    });
    root.addEventListener('dragover', (e) => { if (dragged) e.preventDefault(); });
    root.addEventListener('drop', (e) => {
      e.preventDefault();
      const t = e.target.closest('.mgl-letter');
      const d = dragged; dragged = null;
      if (d && t) swap(d, t);
    });
    root.addEventListener('dragend', () => { dragged = null; });
  }

  function unmount() {
    hideImage(true);
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    root = null; picked = null; curWord = 'MGL';
  }

  function check() {
    const w = word();
    if (w === curWord) return;
    curWord = w;
    if (w === 'MLG') mlg();
    else if (w === 'GLM' && notify) notify('Z');
  }

  function mlg() {
    // песня - один раз за собранное слово, не перезапускаем пока играет
    if (!audio || audio.ended || audio.paused) {
      try { audio = new Audio(SONG); audio.volume = 0.3; audio.play().catch(() => {}); } catch (e) {}
    }
    showImage();
  }
  function showImage() {
    hideImage(true);
    imgEl = document.createElement('img');
    imgEl.className = 'mgl-mlg-img';
    imgEl.alt = '';
    imgEl.src = IMAGES[Math.floor(Math.random() * IMAGES.length)];
    document.body.appendChild(imgEl);
    requestAnimationFrame(() => requestAnimationFrame(() => imgEl && imgEl.classList.add('in')));
    imgTimer = setTimeout(() => hideImage(false), PEEK_MS);
  }
  function hideImage(now) {
    if (imgTimer) { clearTimeout(imgTimer); imgTimer = null; }
    const el = imgEl; imgEl = null;
    if (!el) return;
    if (now) { el.remove(); return; }
    el.classList.remove('in');
    setTimeout(() => el.remove(), 500);
  }

  window.MglEgg = { mount, unmount };
})();
