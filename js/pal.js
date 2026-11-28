// =============================================================
// 小夥伴：在小孩版畫面下方走來走去的火柴人或小貓
// 開心的時候才會出現笑臉；開心次數累積起來可以解鎖配件
// =============================================================
window.Pal = (function () {
  const STICK_COLORS = [
    ['black', '黑色', '#2C2C2A'], ['blue', '藍色', '#185FA5'], ['orange', '橘色', '#D85A30'], ['brown', '咖啡色', '#8A5A33'],
    ['red', '紅色', '#E24B4A'], ['purple', '紫色', '#7F77DD'], ['yellow', '黃色', '#EF9F27'], ['green', '綠色', '#1D9E75'], ['pink', '粉紅色', '#D4537E']
  ];
  const CAT_COLORS = [['white', '白貓'], ['brown', '咖啡貓'], ['calico', '三花貓']];
  const ITEMS = [
    { id: 'scarf', name: '圍巾', need: 3, slot: 'neck', icon: '🧣' },
    { id: 'hat', name: '派對帽', need: 6, slot: 'head', icon: '🎉' },
    { id: 'bow', name: '蝴蝶結', need: 10, slot: 'head', icon: '🎀' },
    { id: 'crown', name: '皇冠', need: 15, slot: 'head', icon: '👑' },
    { id: 'shades', name: '酷墨鏡', need: 20, slot: 'face', icon: '🕶️' },
    { id: 'wings', name: '小翅膀', need: 25, slot: 'wings', icon: '🪽' }
  ];
  // 免費裝備（一開始就能穿）；cat/stick 標示只給某種夥伴
  const FREE = [
    { id: 'cap', name: '棒球帽', slot: 'head', icon: '🧢' },
    { id: 'bag', name: '小書包', slot: 'back', icon: '🎒' },
    { id: 'pants', name: '短褲', slot: 'legs', icon: '🩳', only: 'stick' },
    { id: 'bell', name: '鈴鐺項圈', slot: 'neck', icon: '🔔', only: 'cat' },
    { id: 'glasses', name: '圓眼鏡', slot: 'face', icon: '👓' }
  ];
  const ALL = FREE.concat(ITEMS);
  function fits(it, p) { return !it.only || it.only === p.type; }
  function freeFor(p) { return FREE.filter(it => fits(it, p)); }
  function fixWear(p) { const w = p.wear || {}; Object.keys(w).forEach(k => { const it = ALL.find(x => x.id === w[k]); if (it && !fits(it, p)) w[k] = ''; }); p.wear = w; return p; }

  // ---------- 心情：每天從「有點沒精神」開始，陪它就會升級，不會往下扣 ----------
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function level(p) { return p.moodDay === today() ? Math.min(2, p.mood || 0) : 0; }
  const MOODS = [
    { name: '有點沒精神', icon: '😐', face: 'tired', short: '它有點悶悶的，去看看它吧', say: ['我有點悶悶的，陪我玩一下好嗎？', '今天還沒有人陪我…', '我有點口渴了'] },
    { name: '還不錯', icon: '🙂', face: 'blank', short: '它今天還不錯喔', say: ['今天還不錯喔！', '謝謝你來看我', '再陪我一下下'] },
    { name: '很開心', icon: '😄', face: 'happy', short: '它今天很開心！', say: ['謝謝你陪我！我好開心！', '你是最棒的朋友！', '今天好快樂～'] }
  ];
  function moodInfo(p) { const l = level(p), m = MOODS[l]; return { level: l, name: m.name, icon: m.icon, face: m.face, short: m.short, say: m.say[Math.floor(Math.random() * m.say.length)] }; }
  function bump(p) { const l = level(p); p.moodDay = today(); p.mood = Math.min(2, l + 1); }
  function drankToday(p) { return p.drankDay === today(); }
  function drink(kidId) { const p = get(kidId); if (!p || drankToday(p)) return; p.drankDay = today(); bump(p); save(kidId, p); }
  function face(p) { return moodInfo(p).face; }
  const BG = 'var(--bg)', INK = '#2C2C2A';

  function get(kidId) { return Store.get('pal_' + kidId, null); }
  function save(kidId, p) { Store.set('pal_' + kidId, p); }
  function stickColor(id) { return (STICK_COLORS.find(c => c[0] === id) || STICK_COLORS[0])[2]; }

  // ---------- 配件 ----------
  function wear(p, head, neck) {
    let s = '';
    const w = p.wear || {};
    if (w.neck === 'scarf') {
      s += '<path d="M' + (neck[0] - 11) + ' ' + neck[1] + ' Q' + neck[0] + ' ' + (neck[1] + 6) + ' ' + (neck[0] + 11) + ' ' + neck[1] + '" fill="none" stroke="#E24B4A" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M' + (neck[0] + 5) + ' ' + (neck[1] + 3) + ' l3 11" stroke="#E24B4A" stroke-width="4" stroke-linecap="round"/>';
    }
    const [hx, hy] = head;
    const eyes = p.type === 'cat' ? [[18, 31], [30, 31]] : [[24, 17], [36, 17]];
    if (w.wings === 'wings') { const [wx, wy] = p.type === 'cat' ? [50, 34] : [30, 46];
      s = '<g opacity=".9"><path d="M' + wx + ' ' + wy + ' Q' + (wx - 20) + ' ' + (wy - 16) + ' ' + (wx - 16) + ' ' + (wy + 4) + ' Z" fill="#B5D4F4" stroke="#378ADD" stroke-width="1.2"/><path d="M' + wx + ' ' + wy + ' Q' + (wx + 20) + ' ' + (wy - 16) + ' ' + (wx + 16) + ' ' + (wy + 4) + ' Z" fill="#B5D4F4" stroke="#378ADD" stroke-width="1.2"/></g>' + s; }
    if (w.face === 'glasses' || w.face === 'shades') { const f = w.face === 'shades' ? '#2C2C2A' : 'none';
      s += eyes.map(e => '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="4.6" fill="' + f + '" stroke="#2C2C2A" stroke-width="1.6"/>').join('') + '<path d="M' + (eyes[0][0] + 4.6) + ' ' + eyes[0][1] + ' L' + (eyes[1][0] - 4.6) + ' ' + eyes[1][1] + '" stroke="#2C2C2A" stroke-width="1.6"/>'; }
    if (w.legs === 'pants' && p.type !== 'cat') s += '<path d="M23 64 L37 64 L40 79 L33 79 L30 70 L27 79 L20 79 Z" fill="#378ADD"/>';
    if (w.back === 'bag') s += p.type === 'cat'
      ? '<rect x="44" y="27" width="16" height="13" rx="4" fill="#D85A30"/><rect x="48" y="31" width="8" height="4" rx="1.5" fill="#F0997B"/>'
      : '<rect x="33" y="40" width="12" height="15" rx="3" fill="#D85A30"/><rect x="35" y="45" width="8" height="4" rx="1.5" fill="#F0997B"/><path d="M33 42 L30 40" stroke="#993C1D" stroke-width="2" stroke-linecap="round"/>';
    if (w.neck === 'bell') s += '<path d="M' + (neck[0] - 12) + ' ' + (neck[1] - 4) + ' Q' + neck[0] + ' ' + (neck[1] + 4) + ' ' + (neck[0] + 4) + ' ' + (neck[1] - 6) + '" fill="none" stroke="#E24B4A" stroke-width="3" stroke-linecap="round"/><circle cx="' + (neck[0] - 3) + '" cy="' + (neck[1] + 2) + '" r="3.5" fill="#EF9F27" stroke="#BA7517" stroke-width="1"/>';
    if (w.head === 'cap') s += '<path d="M' + (hx - 13) + ' ' + (hy + 9) + ' Q' + (hx - 12) + ' ' + (hy - 6) + ' ' + hx + ' ' + (hy - 6) + ' Q' + (hx + 12) + ' ' + (hy - 6) + ' ' + (hx + 13) + ' ' + (hy + 9) + ' Z" fill="#185FA5"/><path d="M' + (hx + 6) + ' ' + (hy + 9) + ' L' + (hx + 22) + ' ' + (hy + 10) + '" stroke="#0C447C" stroke-width="3.5" stroke-linecap="round"/>';
    if (w.head === 'hat') s += '<path d="M' + (hx - 9) + ' ' + (hy + 2) + ' L' + hx + ' ' + (hy - 18) + ' L' + (hx + 9) + ' ' + (hy + 2) + ' Z" fill="#7F77DD"/><circle cx="' + hx + '" cy="' + (hy - 19) + '" r="3" fill="#EF9F27"/><circle cx="' + (hx - 2) + '" cy="' + (hy - 6) + '" r="1.6" fill="#fff"/><circle cx="' + (hx + 3) + '" cy="' + (hy - 1) + '" r="1.6" fill="#fff"/>';
    if (w.head === 'crown') s += '<path d="M' + (hx - 11) + ' ' + (hy + 2) + ' L' + (hx - 11) + ' ' + (hy - 9) + ' L' + (hx - 5) + ' ' + (hy - 3) + ' L' + hx + ' ' + (hy - 12) + ' L' + (hx + 5) + ' ' + (hy - 3) + ' L' + (hx + 11) + ' ' + (hy - 9) + ' L' + (hx + 11) + ' ' + (hy + 2) + ' Z" fill="#EF9F27" stroke="#BA7517" stroke-width="1"/>';
    if (w.head === 'bow') s += '<g transform="translate(' + (hx + 8) + ' ' + (hy + 1) + ')"><path d="M0 0 L-8 -6 L-8 6 Z M0 0 L8 -6 L8 6 Z" fill="#D4537E"/><circle r="2.6" fill="#ED93B1"/></g>';
    return s;
  }

  // ---------- 火柴人 ----------
  function stick(p, mood) {
    const c = stickColor(p.color);
    let face = '';
    if (mood === 'happy') face = '<circle cx="24" cy="17" r="2.2" fill="' + c + '"/><circle cx="36" cy="17" r="2.2" fill="' + c + '"/><path d="M22 24 Q30 32 38 24" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="19" cy="23" rx="3" ry="2" fill="#F4C0D1"/><ellipse cx="41" cy="23" rx="3" ry="2" fill="#F4C0D1"/>';
    if (mood === 'tired') face = '<path d="M21 18 L27 18 M33 18 L39 18" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/><path d="M25 26 L35 26" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>';
    if (mood === 'blush') face = '<ellipse cx="20" cy="23" rx="3.5" ry="2.2" fill="#F4C0D1"/><ellipse cx="40" cy="23" rx="3.5" ry="2.2" fill="#F4C0D1"/>';
    return '<svg viewBox="0 0 60 110" width="100%" height="100%">' +
      '<line class="lg1" x1="30" y1="66" x2="18" y2="96" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<line class="lg2" x1="30" y1="66" x2="42" y2="96" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<line x1="30" y1="35" x2="30" y2="66" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<line class="ar1" x1="30" y1="42" x2="14" y2="58" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<line class="ar2" x1="30" y1="42" x2="46" y2="58" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="30" cy="20" r="15" fill="' + BG + '" stroke="' + c + '" stroke-width="3.5"/>' + face +
      wear(p, [30, 5], [30, 37]) + '</svg>';
  }

  // ---------- 小貓 ----------
  function cat(p, mood) {
    const base = p.color === 'brown' ? '#C98B5A' : '#FFFFFF';
    const line = p.color === 'brown' ? '#8A5A33' : '#888780';
    let patches = '';
    if (p.color === 'calico') patches =
      '<path d="M46 34 Q58 30 64 40 Q56 46 46 42 Z" fill="#EF9F27"/><path d="M60 48 Q68 46 70 54 Q62 58 58 54 Z" fill="#444441"/>' +
      '<path d="M12 22 Q16 16 22 18 Q20 26 14 27 Z" fill="#EF9F27"/><path d="M29 16 L33 8 L36 19 Z" fill="#444441"/>';
    const eyes = mood === 'tired'
      ? '<path d="M15 31 L21 31 M27 31 L33 31" stroke="#2C2C2A" stroke-width="2" stroke-linecap="round"/>'
      : mood === 'happy'
      ? '<path d="M15 31 Q18 28 21 31" fill="none" stroke="#2C2C2A" stroke-width="2" stroke-linecap="round"/><path d="M27 31 Q30 28 33 31" fill="none" stroke="#2C2C2A" stroke-width="2" stroke-linecap="round"/>'
      : '<circle cx="18" cy="31" r="2.2" fill="#2C2C2A"/><circle cx="30" cy="31" r="2.2" fill="#2C2C2A"/>';
    const mouth = mood === 'happy'
      ? '<path d="M20 36 Q22 39 24 36 Q26 39 28 36" fill="none" stroke="#2C2C2A" stroke-width="1.6" stroke-linecap="round"/>'
      : '<path d="M22 36 Q24 37.5 26 36" fill="none" stroke="#2C2C2A" stroke-width="1.4" stroke-linecap="round"/>';
    const blush = (mood === 'happy' || mood === 'blush') ? '<ellipse cx="13" cy="36" rx="3" ry="2" fill="#F4C0D1"/><ellipse cx="35" cy="36" rx="3" ry="2" fill="#F4C0D1"/>' : '';
    return '<svg viewBox="0 0 90 76" width="100%" height="100%">' +
      '<path class="tail" d="M70 46 Q86 40 82 22" fill="none" stroke="' + line + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path class="tail" d="M70 46 Q86 40 82 22" fill="none" stroke="' + base + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<line class="lg1" x1="34" y1="56" x2="32" y2="70" stroke="' + line + '" stroke-width="6" stroke-linecap="round"/>' +
      '<line class="lg2" x1="60" y1="56" x2="62" y2="70" stroke="' + line + '" stroke-width="6" stroke-linecap="round"/>' +
      '<ellipse cx="48" cy="46" rx="25" ry="15" fill="' + base + '" stroke="' + line + '" stroke-width="2"/>' +
      '<line class="lg2" x1="40" y1="58" x2="40" y2="70" stroke="' + line + '" stroke-width="6" stroke-linecap="round"/>' +
      '<line class="lg1" x1="54" y1="58" x2="54" y2="70" stroke="' + line + '" stroke-width="6" stroke-linecap="round"/>' +
      '<line class="lg2" x1="40" y1="58" x2="40" y2="70" stroke="' + base + '" stroke-width="3" stroke-linecap="round"/>' +
      '<line class="lg1" x1="54" y1="58" x2="54" y2="70" stroke="' + base + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M9 22 L12 6 L22 16 Z" fill="' + base + '" stroke="' + line + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M26 16 L36 6 L39 22 Z" fill="' + base + '" stroke="' + line + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="24" cy="30" r="16" fill="' + base + '" stroke="' + line + '" stroke-width="2"/>' + patches +
      '<path d="M12.5 10.5 L14 15 L18 14 Z M35 10 L33 15 L30 13.5 Z" fill="#F4C0D1"/>' +
      eyes + '<path d="M23 34 L25 34 L24 35.3 Z" fill="#D4537E"/>' + mouth + blush +
      wear(p, [24, 14], [36, 44]) + '</svg>';
  }

  function svg(p, mood) { return p.type === 'cat' ? cat(p, mood) : stick(p, mood); }

  // ---------- 在畫面上走動 ----------
  let layer = null, el = null, kid = null, x = 30, timer = null, moodTimer = null, quiet = false;
  function unmount() {
    clearTimeout(timer); clearTimeout(moodTimer);
    if (layer) layer.remove(); layer = null; el = null; kid = null;
    document.body.classList.remove('has-pal');
  }
  function mount(k) {
    const p = get(k.id);
    if (!p) { unmount(); return; }
    if (layer && kid && kid.id === k.id) { el.querySelector('.pal-art').innerHTML = svg(p, face(p)); return; }
    unmount(); kid = k;
    document.body.classList.add('has-pal');
    layer = document.createElement('div'); layer.className = 'pal-layer';
    el = document.createElement('div'); el.className = 'pal ' + (p.type === 'cat' ? 'is-cat' : 'is-stick');
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', '我的夥伴，點一下摸摸它');
    el.innerHTML = '<div class="pal-bubble"></div><div class="pal-art">' + svg(p, 'blank') + '</div>';
    layer.appendChild(el); document.body.appendChild(layer);
    x = 20 + Math.random() * 120; el.style.transform = 'translateX(' + x + 'px)';
    el.onclick = pet;
    timer = setTimeout(wander, 1200);
  }
  function maxX() { return Math.max(40, Math.min(window.innerWidth, 520) - (el && el.classList.contains('is-cat') ? 90 : 60) - 20); }
  function wander() {
    if (!el) return;
    if (quiet) { timer = setTimeout(wander, 1500); return; }
    const nx = 10 + Math.random() * maxX();
    if (Math.abs(nx - x) < 50) { timer = setTimeout(wander, 1800); return; }
    el.classList.toggle('flip', el.classList.contains('is-cat') ? nx > x : nx < x);
    el.classList.add('walk');
    const dur = Math.min(3.5, Math.abs(nx - x) / 60);
    el.style.transition = 'transform ' + dur + 's linear';
    x = nx; el.style.transform = 'translateX(' + x + 'px)';
    timer = setTimeout(() => { if (!el) return; el.classList.remove('walk'); timer = setTimeout(wander, 1800 + Math.random() * 3500); }, dur * 1000);
  }
  function say(t) {
    if (!el) return;
    const b = el.querySelector('.pal-bubble'); b.textContent = Lang.conv(t); b.classList.add('show');
    clearTimeout(say.t); say.t = setTimeout(() => b.classList.remove('show'), 2000);
  }
  function hearts(n) {
    if (!el) return;
    for (let i = 0; i < n; i++) {
      const h = document.createElement('div'); h.className = 'pal-heart'; h.textContent = '💗';
      h.style.left = (10 + i * 14) + 'px'; h.style.animationDelay = (i * 0.15) + 's';
      el.appendChild(h); setTimeout(() => h.remove(), 1600);
    }
  }
  function jump() { el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump'); }
  function show(mood, ms) {
    const p = get(kid.id); if (!p) return;
    el.querySelector('.pal-art').innerHTML = svg(p, mood);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => { if (el && kid) el.querySelector('.pal-art').innerHTML = svg(get(kid.id), face(get(kid.id))); }, ms);
  }
  function pet() {
    if (!el) return;
    jump(); hearts(2); show('blush', 1500);
    say(['嘻嘻，好癢！', '再摸一下～', '我在這裡陪你', '你好棒！'][Math.floor(Math.random() * 4)]);
  }
  // 開心：出現笑臉，累積開心次數，可能解鎖配件
  function happy(k, msg) {
    const p = get(k.id); if (!p) return null;
    p.happy = (p.happy || 0) + 1; bump(p);
    let unlocked = null;
    ITEMS.forEach(it => {
      if (p.happy === it.need) {
        unlocked = it; p.wear = p.wear || {};
        if (!p.wear[it.slot]) p.wear[it.slot] = it.id;
      }
    });
    save(k.id, p);
    if (el && kid && kid.id === k.id) {
      setTimeout(() => { if (!el) return; show('happy', 5000); jump(); hearts(3); say(msg || '太好了！'); }, 300);
    }
    return unlocked;
  }
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('textarea, input')) quiet = true; });
  document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('textarea, input')) quiet = false; });

  return { STICK_COLORS, CAT_COLORS, ITEMS, FREE, ALL, fits, freeFor, fixWear, moodInfo, drankToday, drink, get, save, svg, mount, unmount, happy };
})();
