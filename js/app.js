// =============================================================
// 畫面與流程
// =============================================================
(function () {
  const app = document.getElementById('app');
  const C = CONFIG;
  const NAME = C.kidCharacter;
  Lang.observe(app);

  // ---------- 小工具 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function md(text) {
    const lines = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n/);
    let out = '', list = false;
    lines.forEach(l => {
      const m = l.match(/^\s*(?:[-•]|\d+\.)\s+(.*)/);
      if (m) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + m[1] + '</li>'; }
      else { if (list) { out += '</ul>'; list = false; } if (l.trim()) out += '<p>' + l + '</p>'; }
    });
    if (list) out += '</ul>';
    return out;
  }
  function go(path) { location.hash = '#' + path; }
  function toast(t) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = Lang.conv(t);
    document.body.appendChild(d); setTimeout(() => d.remove(), 2800);
  }
  function timeStr(t) {
    const d = new Date(t);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function top(title, back, right) {
    return '<div class="top">' + (back ? '<button class="back" data-back="' + esc(back) + '" aria-label="返回">‹</button>' : '<span style="width:8px"></span>') +
      '<h1>' + esc(title) + '</h1><div class="right">' + (right || '') + '</div></div>';
  }
  function speakBtn(text, label) {
    if (!Voice.canSpeak) return '';
    return '<button class="speak" data-speak="' + esc(text) + '" aria-label="念出來"><span class="spk-ic">🔈</span>' + (label === '' ? '' : '<span>' + (label || '念給我聽') + '</span>') + '</button>';
  }
  // 轉轉：圓臉羅盤，想事情時頭上的指針會慢慢轉
  function buddy(size, thinking) {
    size = size || 44;
    return '<svg class="buddy-svg' + (thinking ? ' thinking' : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" aria-hidden="true">' +
      '<g class="needle"><path d="M60 8 L66 26 L54 26 Z" fill="#E24B4A"/><rect x="56" y="22" width="8" height="6" rx="2" fill="#1D9E75"/></g>' +
      '<circle cx="60" cy="66" r="42" fill="#5DCAA5"/><circle cx="60" cy="66" r="34" fill="#fff"/>' +
      '<circle cx="60" cy="66" r="34" fill="none" stroke="#1D9E75" stroke-width="2" stroke-dasharray="2 7"/>' +
      '<circle cx="47" cy="62" r="4.5" fill="#2C2C2A"/><circle cx="73" cy="62" r="4.5" fill="#2C2C2A"/>' +
      '<circle cx="48.5" cy="60.5" r="1.5" fill="#fff"/><circle cx="74.5" cy="60.5" r="1.5" fill="#fff"/>' +
      '<ellipse cx="40" cy="73" rx="5" ry="3" fill="#F4C0D1"/><ellipse cx="80" cy="73" rx="5" ry="3" fill="#F4C0D1"/>' +
      '<path d="M53 74 Q60 81 67 74" fill="none" stroke="#2C2C2A" stroke-width="2.5" stroke-linecap="round"/></svg>';
  }
  // 大人版：心中一盞燈（綠色燈座），思考時光暈一明一暗
  function lamp(size, thinking) {
    size = size || 44;
    return '<svg class="lamp-svg' + (thinking ? ' thinking' : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" aria-hidden="true">' +
      '<rect width="120" height="120" rx="28" fill="#E6F4EE"/><circle class="glow" cx="60" cy="52" r="26" fill="#FAC775" opacity=".5"/>' +
      '<circle cx="60" cy="52" r="15" fill="#EF9F27"/><rect x="51" y="72" width="18" height="7" rx="3.5" fill="#0F6E56"/>' +
      '<rect x="53" y="82" width="14" height="6" rx="3" fill="#0F6E56"/></svg>';
  }
  // 跳出視窗
  function modal(title, text, buttons) {
    const d = document.createElement('div'); d.className = 'celebrate';
    d.innerHTML = '<div class="cel-box modal-box"><div class="modal-t">' + esc(title) + '</div><div class="modal-x">' + esc(text) + '</div>' +
      buttons.map((b, i) => '<button class="btn ' + (b.cls || 'ghost') + '" data-mi="' + i + '">' + esc(b.label) + '</button>').join('') + '</div>';
    document.body.appendChild(d); Lang.localize(d);
    d.onclick = e => { const b = e.target.closest('[data-mi]'); if (b) { d.remove(); const f = buttons[+b.dataset.mi].fn; if (f) f(); } else if (e.target === d) d.remove(); };
  }
  // 離開保護：對話還沒保留時，離開前先問
  let guard = null;
  function render(html, opts) {
    guard = null;
    Voice.stop();
    opts = opts || {};
    const kid = opts.kid || null;
    Lang.setZone(opts.zone || (kid ? 'kid' : 'adult'), kid && kid.pinyin);
    document.body.classList.toggle('has-help', !!kid && !opts.noHelp);
    app.innerHTML = html + (kid && !opts.noHelp ? '<div class="helpbar"><button data-go="/kid/' + kid.id + '/help">找爸爸媽媽幫忙</button></div>' : '');
    window.scrollTo(0, 0);
  }
  const levelName = { urgent: '需要關心', concern: '一般煩惱', normal: '聊天' };
  const MOOD = {
    happy: ['😊', 'good'], proud: ['😄', 'good'], calm: ['😌', 'good'], surprised: ['😮', 'mid'],
    worried: ['😟', 'mid'], sad: ['😢', 'bad'], scared: ['😨', 'bad'], angry: ['😠', 'bad']
  };
  function feelingsHtml(list) {
    return '<div class="feelings">' + list.map(f => {
      const m = MOOD[f.mood] || MOOD.calm;
      return '<div class="feel ' + m[1] + '"><div class="face">' + m[0] + '</div><div class="who">' + esc(f.who) + '</div><div class="ft">' + esc(f.text) + '</div></div>';
    }).join('') + '</div>';
  }
  function parseFeel(arr) { return (arr || []).map(s => { const [who, mood, text] = s.split('|'); return { who, mood, text }; }); }
  function starPill(kid) { return '<span class="stars" id="starCount">⭐ ' + Store.stars(kid.id) + '</span>'; }
  function giveStars(kid, n) {
    const r = Store.addStars(kid.id, n);
    const sc = document.getElementById('starCount');
    if (sc) { sc.textContent = '⭐ ' + r.stars; sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop'); }
    if (r.special) celebrate(r.special, '集滿 10 顆星，得到一張特別貼紙！');
  }
  function celebrate(sticker, text) {
    const d = document.createElement('div'); d.className = 'celebrate';
    d.innerHTML = '<div class="cel-box"><div class="cel-st pop">' + sticker + '</div><div>' + esc(text) + '</div><button class="btn" style="margin-top:14px">好耶！</button></div>';
    document.body.appendChild(d); Lang.localize(d);
    d.querySelector('button').onclick = () => d.remove();
  }
  // 孩子說的話存成紀錄，需要時通知家長
  function saveKidRecord(kid, record, text, r, extra) {
    if (r.silly && r.level !== 'urgent') return record;
    if (!record) record = { id: Store.uid(), type: 'kid-talk', kidId: kid.id, kidName: kid.name, time: Date.now(), level: 'normal', kidText: '' };
    record.kidText = (record.kidText ? record.kidText + '\n' : '') + text;
    const rank = { normal: 0, concern: 1, urgent: 2 };
    if ((rank[r.level] || 0) > (rank[record.level] || 0)) record.level = r.level;
    if (r.summary) record.summary = r.summary;
    if (r.parent_tip) record.parentTip = r.parent_tip;
    Object.assign(record, extra || {});
    Store.saveRecord(record);
    if (record.level === 'urgent' && !record.notified) Notify.urgent(record);
    else Notify.dailyIfDue();
    return record;
  }

  // 共用點擊處理
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-back],[data-go],[data-speak]');
    if (!b) return;
    const dest = b.dataset.back || b.dataset.go;
    if (dest && guard && guard.needs()) { e.preventDefault(); guard.show(dest); return; }
    if (b.dataset.back) go(b.dataset.back);
    else if (b.dataset.go) go(b.dataset.go);
    else if (b.dataset.speak) { e.stopPropagation(); Voice.speak(b.dataset.speak, b); }
  });

  // ---------- 首頁 ----------
  function home() {
    const mode = Store.settings().deviceMode;
    if (mode === 'kid') return kidPick();
    if (mode === 'adult') return adultHome();
    render(
      '<div class="screen"><div class="hero"><div class="logo-buddy">' + buddy(76) + '</div>' +
      '<h2>' + esc(C.appName) + '</h2><p>' + esc(C.appSubtitle) + '</p></div>' +
      '<button class="choice" data-go="/kid"><span class="ic">🧒</span><span><div class="t">我是小朋友</div><div class="d">和' + esc(NAME) + '一起想一想</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/adult"><span class="ic" style="background:#f1efe8">🧭</span><span><div class="t">我是大人</div><div class="d">把兩難的事想清楚</div></span><span class="arrow">›</span></button>' +
      '<div class="foot-note"><a href="#/parent" style="color:inherit">家長專區</a> · <a href="#/about" style="color:inherit">我們的原則</a></div></div>'
    );
  }

  function about() {
    render(top('我們的原則', '/') +
      '<div class="screen"><p class="muted">這裡不替你下判斷，而是陪你想清楚。不管選哪一種回答方式，背後都是同一組良知底線：</p>' +
      C.principles.map((p, i) => '<div class="choice" style="padding:14px"><span class="ic" style="width:32px;height:32px;font-size:15px;font-weight:600;color:#0f6e56">' + (i + 1) + '</span><span class="t" style="font-size:16px">' + esc(p) + '</span></div>').join('') +
      '<div class="label">遇到危險的時候</div><div class="notice urgent">' + hotlinesHtml() + '</div>' +
      '<p class="small muted">最後的決定和責任在你自己。涉及法律、醫療、財務的重大問題，請尋求專業人士協助。</p>' +
      '<div class="foot-note">版本 ' + esc(C.version) + '</div></div>');
  }
  function hotlinesHtml() {
    return C.hotlines.map(h => '<div class="hotline"><span><b>' + esc(h.name) + '</b><br><span class="small">' + esc(h.note) + '</span></span><a href="tel:' + h.number + '">' + h.number + '</a></div>').join('');
  }

  // ---------- 小孩：選擇是誰 ----------
  function kidPick() {
    const kids = Store.kids();
    const kidMode = Store.settings().deviceMode === 'kid';
    render(top('', kidMode ? '' : '/') +
      '<div class="screen"><div class="center" style="margin:16px 0 8px">' + buddy(88) + '</div>' +
      '<p class="center" style="font-size:18px;margin:0 0 24px">嗨！我是' + esc(NAME) + '，<br>點一下你的名字吧！</p>' +
      '<div class="kid-grid">' + kids.map(k =>
        '<button class="kid-card" data-go="/kid/' + k.id + '"><span class="avatar" style="background:' + k.color + '">' + esc(k.name.slice(0, 1)) + '</span>' + esc(k.name) + '</button>').join('') +
      '</div>' + (kidMode ? '<div class="foot-note"><a href="#/parent" style="color:inherit">家長專區</a></div>' : '') + '</div>', { zone: 'kid' });
  }

  function dailyScene(kid) {
    const list = SCENARIOS.kid, played = Store.played(kid.id);
    const fresh = list.filter(s => !played.includes(s.id));
    const pool = fresh.length ? fresh : list;
    const day = Math.floor((Date.now() + 8 * 3600e3) / 86400e3);
    let h = day; for (const c of kid.id) h = (h * 31 + c.charCodeAt(0)) % 100000;
    return pool[h % pool.length];
  }

  function kidHome(kid) {
    const d = dailyScene(kid);
    const n = Store.stickers(kid.id).length;
    render(top('', Store.settings().deviceMode === 'kid' ? '/' : '/kid', starPill(kid)) +
      '<div class="screen"><div class="buddy">' + buddy(48) + '<div style="padding-top:4px"><b>嗨，' + esc(kid.name) + '！</b><br>今天想做什麼呢？</div></div>' +
      '<button class="daily" data-go="/kid/' + kid.id + '/scene/' + d.id + '"><div class="small" style="opacity:.8">今天的情境卡</div>' +
      '<div class="daily-row"><span class="daily-ic">' + d.icon + '</span><span class="daily-t">' + esc(d.title) + '</span><span class="arrow" style="color:inherit">›</span></div></button>' +
      '<button class="choice" data-go="/kid/' + kid.id + '/scenes"><span class="ic" style="background:#faeeda">🎲</span><span><div class="t">玩一玩</div><div class="d">選一張情境卡，看看你會怎麼做</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/kid/' + kid.id + '/talk"><span class="ic">💬</span><span><div class="t">說說我的煩惱</div><div class="d">' + esc(NAME) + '陪你一起想</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/kid/' + kid.id + '/stickers"><span class="ic" style="background:#fbeaf0">📒</span><span><div class="t">我的貼紙冊</div><div class="d">已經收集 ' + n + ' 張</div></span><span class="arrow">›</span></button>' +
      '</div>', { kid });
  }

  function stickerBook(kid) {
    const have = Store.stickers(kid.id);
    const slots = (list, kind) => list.map(s => {
      const got = have.some(h => h.s === s && h.kind === kind);
      return '<div class="slot' + (got ? ' got' : '') + (kind === 'special' ? ' sp' : '') + '">' + (got ? s : '?') + '</div>';
    }).join('');
    render(top('我的貼紙冊', '/kid/' + kid.id, starPill(kid)) +
      '<div class="screen"><p class="muted small">完成一張情境卡，就能得到一張貼紙。集滿 10 顆星，可以換一張特別貼紙！</p>' +
      '<div class="label">特別貼紙</div><div class="book">' + slots(STICKERS.special, 'special') + '</div>' +
      '<div class="label">一般貼紙</div><div class="book">' + slots(STICKERS.normal, 'normal') + '</div>' +
      '<p class="small muted center" style="margin-top:16px">下一張特別貼紙還差 ' + (10 - Store.stars(kid.id) % 10) + ' 顆星</p></div>', { kid });
  }

  // ---------- 情境列表 ----------
  function sceneList(kind, kid) {
    const list = SCENARIOS[kind];
    const base = kind === 'kid' ? '/kid/' + kid.id : '/adult';
    const played = kid ? Store.played(kid.id) : [];
    render(top(kind === 'kid' ? '選一張情境卡' : '情境練習', base) +
      '<div class="screen">' + (kind === 'adult' ? '<p class="muted small">每個情境都沒有標準答案。選一個最接近你的想法，或寫下你自己的做法。</p>' : '') +
      list.map(s => '<button class="choice" data-go="' + base + '/scene/' + s.id + '">' +
        (s.icon ? '<span class="ic" style="background:#faeeda">' + s.icon + '</span>' : '') +
        '<span><div class="t">' + esc(s.title) + '</div><div class="d">' + s.steps.length + ' 關' + (played.includes(s.id) ? ' · 玩過了 ✓' : '') + '</div></span><span class="arrow">›</span></button>').join('') +
      '</div>', kid ? { kid } : null);
  }

  // ---------- 情境遊玩 ----------
  function scenePlay(kind, kid, sid) {
    const s = SCENARIOS[kind].find(x => x.id === sid);
    const isKid = kind === 'kid';
    if (!s) return go(isKid ? '/kid/' + kid.id + '/scenes' : '/adult/scenes');
    const base = isKid ? '/kid/' + kid.id : '/adult';
    let step = 0, earned = 0, sillyCount = 0, record = null;
    const picks = []; const awarded = {};
    const L = ['A', 'B', 'C'];

    function draw() {
      const st = s.steps[step];
      const all = st.story + '。' + st.question + '。' + st.options.map((o, i) => L[i] + '，' + o.text).join('。') + '。D，我有別的想法。';
      render(top(s.title, base + '/scenes', isKid ? starPill(kid) : '') +
        '<div class="screen">' +
        (s.steps.length > 1 ? '<div class="progress">' + s.steps.map((_, i) => '<span class="' + (i <= step ? 'on' : '') + '"></span>').join('') + '</div>' : '') +
        '<div class="story">' + esc(st.story) + '</div>' +
        '<div class="q-row"><span class="question">' + esc(st.question) + '</span>' + speakBtn(all, '全部念給我聽') + '</div>' +
        '<div id="opts">' + st.options.map((o, i) =>
          '<div class="opt" data-i="' + i + '"><span class="letter">' + L[i] + '</span><span class="ot">' + esc(o.text) + '</span>' + speakBtn(L[i] + '，' + o.text, '') + '</div>').join('') +
        '<div class="opt own" data-i="own"><span class="letter d">D</span><span class="ot">我有別的想法</span><span class="spk-ic muted">✏️</span></div></div>' +
        '<div id="ownBox"></div><div id="res"></div></div>', isKid ? { kid } : null);

      app.querySelectorAll('#opts .opt').forEach(el => el.onclick = e => {
        if (e.target.closest('.speak')) return;
        if (app.querySelector('.opt.picked')) return;
        if (el.dataset.i === 'own') return openOwn(st);
        const o = st.options[+el.dataset.i];
        pickDone(el, o.text);
        showResult({ result: o.result, feelings: parseFeel(o.feel), think: o.think }, false);
      });
    }

    function pickDone(el, text) {
      el.classList.add('picked');
      app.querySelectorAll('#opts .opt').forEach(b => { if (b !== el) b.classList.add('dim'); });
      picks.push(text);
    }

    function openOwn(st) {
      const box = document.getElementById('ownBox');
      box.innerHTML = '<div class="own-box"><div class="small muted" style="margin-bottom:6px">寫下你會怎麼做，或按麥克風說出來</div>' +
        composerHtml(isKid ? '我會…' : '寫下你的做法…') + '</div>';
      const c = bindComposer(box, async text => {
        if (app.querySelector('.opt.picked')) return;
        pickDone(app.querySelector('.opt.own'), text);
        box.innerHTML = '<div class="msg-user" style="margin:10px 0 0 auto;width:fit-content">' + esc(text) + '</div>';
        document.getElementById('res').innerHTML = '<div class="thinking-row">' + buddy(40, true) + '<span class="typing">' + (isKid ? esc(NAME) + '想一想' : '思考中') + '</span></div>';
        try {
          const r = await AI.sceneOwn(kind, kid, st, text, sillyCount);
          if (isKid) {
            if (r.silly) sillyCount++; else sillyCount = 0;
            record = saveKidRecord(kid, record, text, r, { summary: r.summary || '在情境「' + s.title + '」寫了自己的想法' });
          }
          showResult(r, true);
        } catch (err) {
          document.getElementById('res').innerHTML = '<div class="notice urgent">' + esc(AI.errorText(err)) + '</div><button class="btn ghost" id="retry">再試一次</button>';
          document.getElementById('retry').onclick = () => { picks.pop(); draw(); };
        }
      });
      c.focus();
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showResult(r, own) {
      const last = step === s.steps.length - 1;
      let starLine = '';
      if (isKid && !awarded[step] && !r.silly) {
        awarded[step] = true; const n = own ? 2 : 1; earned += n; giveStars(kid, n);
        starLine = '<div class="small star-line">' + (own ? '你自己想出答案，得到 2 顆星！' : '你認真想了一想，得到 1 顆星！') + '</div>';
      }
      const speakText = (r.praise ? r.praise + '。' : '') + (r.result || '') + '。' + (r.feelings || []).map(f => f.who + '，' + f.text).join('。') + '。' + (r.think || '');
      let html = '<div class="steps3">' +
        (r.praise ? '<div class="praise r-step" style="animation-delay:0s">' + esc(r.praise) + '</div>' : '') +
        '<div class="r-step" style="animation-delay:.1s"><div class="r-lab">1 · 接下來發生了什麼</div><div class="r-body">' + esc(r.result || '') + '</div></div>' +
        ((r.feelings && r.feelings.length) ? '<div class="r-step" style="animation-delay:.7s"><div class="r-lab">2 · 大家的心情</div>' + feelingsHtml(r.feelings) + '</div>' : '') +
        '<div class="r-step" style="animation-delay:1.3s"><div class="r-lab">3 · 想一想</div><div class="think-box">💭 ' + esc(r.think || '') + '</div></div>' +
        '<div class="r-step" style="animation-delay:1.5s">' + starLine + '<div style="margin:6px 0 12px">' + speakBtn(speakText) + '</div></div></div>';
      if (isKid && r.level === 'urgent') html += '<div class="notice urgent">這件事很重要。要不要現在就去找爸爸媽媽說？<div style="margin-top:8px"><button class="btn danger" data-go="/kid/' + kid.id + '/help">找爸爸媽媽幫忙</button></div></div>';
      if (!isKid && r.level === 'urgent') html += '<div class="notice urgent"><b>你的安全最重要。</b>' + hotlinesHtml() + '</div>';
      if (isKid && sillyCount >= 3) {
        html += '<div class="result center">' + esc(NAME) + '有點累了，我們休息一下，下次再一起玩吧！<div style="margin-top:12px"><button class="btn" data-go="/kid/' + kid.id + '">回到首頁</button></div></div>';
      } else {
        html += '<div class="two-btn"><button class="btn ghost" id="retry">試試別的選擇</button><button class="btn" id="next">' + (last ? '完成' : '下一關') + '</button></div>';
      }
      const res = document.getElementById('res'); res.innerHTML = html;
      res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const rt = document.getElementById('retry'), nx = document.getElementById('next');
      if (rt) rt.onclick = () => { picks.pop(); draw(); };
      if (nx) nx.onclick = () => { if (last) finish(); else { step++; draw(); } };
    }

    function finish() {
      if (isKid) {
        Store.markPlayed(kid.id, s.id);
        const sticker = Store.addSticker(kid.id, 'normal');
        Store.saveRecord({ id: Store.uid(), type: 'kid-scene', kidId: kid.id, kidName: kid.name, time: Date.now(), level: 'normal', summary: '玩了情境「' + s.title + '」', picks });
        render(top('', base + '/scenes', starPill(kid)) +
          '<div class="screen center"><div class="sticker-big pop">' + sticker + '</div>' +
          '<h2 style="margin:8px 0">完成了！</h2><p class="muted">你得到一張新貼紙' + (earned ? '和 ' + earned + ' 顆星' : '') + '。<br>會為別人著想的你，好棒！</p>' +
          '<div style="margin:6px 0 24px">' + speakBtn('完成了！你得到一張新貼紙。會為別人著想的你，好棒！') + '</div>' +
          '<button class="btn" data-go="' + base + '/scenes">再玩一張</button>' +
          '<button class="btn ghost" data-go="' + base + '/stickers">看我的貼紙冊</button>' +
          '<button class="btn ghost" data-go="' + base + '">回到首頁</button></div>', { kid });
      } else {
        const prefill = '情境：' + s.steps.map(x => x.story).join(' ') + '\n我的選擇：' + picks.join('、') + '\n我想多聊聊這個選擇。';
        sessionStorage.setItem('lz_prefill', prefill);
        render(top(s.title, '/adult/scenes') +
          '<div class="screen"><div class="notice info">你的選擇：' + esc(picks.join('、')) + '</div>' +
          '<p class="muted">想從不同角度多聊聊這個選擇嗎？</p>' +
          '<button class="btn" data-go="/adult/talk">和 AI 聊聊這個情境</button>' +
          '<button class="btn ghost" data-go="/adult/scenes">換一個情境</button></div>');
      }
    }
    draw();
  }

  // ---------- 輸入框（打字＋麥克風） ----------
  function composerHtml(ph, topHtml) {
    const tip = Store.get('tipDictation', false) ? '' :
      '<div class="tip">小技巧：也可以用鍵盤右下角的 🎤 聽寫，比較準，可以一次說很長。<button class="tip-x">知道了</button></div>';
    return (topHtml ? '<div class="comp-top">' + topHtml + '</div>' : '') +
      '<div class="inputbox"><textarea class="inp" rows="3" placeholder="' + esc(ph) + '"></textarea>' +
      '<div class="ib-btns"><button class="icon-btn mic" aria-label="語音輸入">🎤</button><button class="icon-btn send" aria-label="送出" disabled>↑</button></div></div>' +
      '<div class="hint"></div>' + tip;
  }
  function bindComposer(root, onSend, canSend) {
    const inp = root.querySelector('.inp'), send = root.querySelector('.send'), mic = root.querySelector('.mic'), hint = root.querySelector('.hint');
    canSend = canSend || (() => true);
    const tx = root.querySelector('.tip-x');
    if (tx) tx.onclick = () => { Store.set('tipDictation', true); tx.parentNode.remove(); };
    function fit() { inp.style.height = 'auto'; inp.style.height = Math.max(76, Math.min(inp.scrollHeight, 210)) + 'px'; send.disabled = !inp.value.trim() || !canSend(); }
    inp.oninput = fit; fit();
    let rec = null, timer = null;
    const noVoice = '沒有聽到聲音。可以改用鍵盤右下角的 🎤 聽寫，會更準喔';
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      if (!Voice.canListen) { hint.textContent = Lang.conv('請按鍵盤右下角的 🎤 說話'); inp.focus(); return; }
      const before = inp.value; let got = false;
      mic.classList.add('on'); hint.textContent = Lang.conv('正在聽…說完再按一次麥克風');
      rec = Voice.listen((fin, interim) => { if (fin || interim) got = true; inp.value = before + fin + interim; fit(); }, failed => {
        clearTimeout(timer); rec = null; mic.classList.remove('on');
        hint.textContent = (failed || !got) ? Lang.conv(noVoice) : '';
      });
      if (!rec) { mic.classList.remove('on'); hint.textContent = Lang.conv(noVoice); return; }
      timer = setTimeout(() => { if (rec && !got) rec.stop(); }, 6000);
    };
    send.onclick = () => { const t = inp.value.trim(); if (!t || !canSend()) return; if (rec) rec.stop(); inp.value = ''; fit(); hint.textContent = ''; onSend(t); };
    return { inp, fit, focus() { inp.focus(); }, set(v) { inp.value = v; fit(); } };
  }

  // ---------- 對話（小孩和大人共用） ----------
  function talk(kind, kid, resumeId) {
    const isKid = kind === 'kid';
    const versions = C.versions[kind];
    const verKey = isKid ? 'ver_kid_' + kid.id : 'ver_adult';
    const maxPick = isKid ? 1 : 2;
    let selected = Store.get(verKey, [versions[0].id]).filter(id => versions.some(v => v.id === id)).slice(0, maxPick);
    if (!selected.length) selected = [versions[0].id];
    let msgs = [];
    let sillyCount = 0, record = null, busy = false, paused = false, summarizedAt = 0, saved = false, closed = false;
    if (resumeId) {
      record = Store.records().find(r => r.id === resumeId) || null;
      if (record) {
        saved = true;
        msgs = record.raw ? JSON.parse(JSON.stringify(record.raw)) :
          (record.messages || []).map(m => m.role === 'user' ? { role: 'user', text: m.text } : { role: 'ai', v: { [versions[0].id]: { reply: m.text } }, active: versions[0].id, order: [versions[0].id] });
        msgs.forEach(m => { if (m.role === 'ai') Object.keys(m.v).forEach(k => { if (m.v[k] && m.v[k].loading) m.v[k] = { error: '這則沒有完成，請按「重試」。' }; }); });
      }
    }
    const base = isKid ? '/kid/' + kid.id : '/adult';
    const vname = id => (versions.find(v => v.id === id) || {}).name || '';

    const greet = isKid ? '嗨，' + kid.name + '！今天有什麼想跟我說的嗎？開心的、不開心的都可以喔。' : '把你正在猶豫的事寫下來或說出來。不用整理得很完整，我們一步一步想。';
    const topHtml = '<button class="ver-btn" id="verBtn"></button><button class="sum-pill" id="sumPill" hidden>📝 整理我的思考</button>' +
      '<div class="ver-panel" id="verPanel" hidden><div class="small muted" style="margin-bottom:8px">' + (isKid ? '選一種回答方式' : '回答方式（最多選 2 種，改了只影響之後的回答）') + '</div>' +
      '<div class="chips">' + versions.map(v => '<button class="chip" data-v="' + v.id + '">' + esc(v.name) + '</button>').join('') + '</div>' +
      '<div class="small muted" id="vdesc" style="margin-top:8px"></div><button class="btn" id="verDone" style="margin-top:10px;padding:10px">好了</button></div>';
    render(top(isKid ? '說說我的煩惱' : '說出我的困境', base, isKid ? starPill(kid) : '') +
      '<div class="screen" style="padding-bottom:' + (isKid ? '150px' : '40px') + '">' +
      '<div class="buddy">' + (isKid ? buddy(44) : lamp(44)) + '<div class="msg-ai" style="flex:1"><div class="body"><p>' + esc(greet) + '</p></div><div class="foot">' + speakBtn(greet) + '</div></div></div>' +
      (isKid ? '' : '<div class="small muted center" id="keepNote" style="margin-top:8px">' + (saved ? '這是保留的對話，會自動更新。' : '🔒 沒有保留的對話，離開後就會刪除。') + '</div>') +
      '<div class="chat" id="chat" style="margin-top:18px"></div>' +
      '<div id="tail"></div>' +
      '<div class="composer" id="composer">' + composerHtml(isKid ? '寫下來，或按麥克風說話' : '例如：同事拜託我幫他隱瞞一個錯誤…', topHtml) +
      (isKid ? '' : '<div class="end-row"><button id="endBtn">結束對話</button></div>') + '</div>' +
      '</div>', isKid ? { kid } : null);

    const chat = document.getElementById('chat');
    function rawSnapshot() { return JSON.parse(JSON.stringify(msgs.filter(m => !(m.role === 'summary' && m.loading)))); }
    function keep() {
      if (!record) record = { id: Store.uid(), type: 'adult-talk', time: Date.now(), level: 'normal' };
      record.raw = rawSnapshot();
      record.messages = msgs.filter(m => m.role !== 'summary').map(m => m.role === 'user' ? { role: 'user', text: m.text } : { role: 'ai', text: (m.v[m.active] || {}).reply || '' });
      const lastSum = msgs.filter(m => m.role === 'summary' && m.data).pop();
      if (lastSum) record.summaryCard = lastSum.data;
      const first = msgs.find(m => m.role === 'user');
      record.summary = first ? first.text.slice(0, 40) : '';
      record.updated = Date.now();
      Store.saveRecord(record); saved = true;
      const kn = document.getElementById('keepNote'); if (kn) kn.textContent = Lang.conv('這是保留的對話，會自動更新。');
    }
    function endFlow(dest) {
      dest = dest || '/adult';
      if (saved) { keep(); guard = null; go(dest); return; }
      modal('要結束這次對話嗎？', '為了保護你的隱私，不保留的對話會直接刪除。保留的對話可以在「我的對話」裡找到（需要家長密碼），也能接著聊。', [
        { label: '保留對話', cls: 'accent', fn: () => { keep(); toast('已保留'); guard = null; go(dest); } },
        { label: '不保留，直接結束', cls: 'danger', fn: () => { guard = null; go(dest); } },
        { label: '繼續聊', cls: 'ghost' }
      ]);
    }
    if (!isKid) {
      guard = { hash: location.hash, needs: () => !saved && msgs.some(m => m.role === 'user'), show: endFlow };
      document.getElementById('endBtn').onclick = () => msgs.some(m => m.role === 'user') ? endFlow('/adult') : go('/adult');
    }
    const comp = bindComposer(document.getElementById('composer'), t => send(t), () => !busy && !paused);
    const prefill = !isKid && sessionStorage.getItem('lz_prefill');
    if (prefill) { comp.set(prefill); sessionStorage.removeItem('lz_prefill'); }

    // 回答方式（收在輸入框上方）
    const verBtn = document.getElementById('verBtn'), panel = document.getElementById('verPanel');
    function paintVer() {
      verBtn.textContent = Lang.conv('回答方式：' + selected.map(vname).join('＋') + ' ▾');
      panel.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', selected.includes(c.dataset.v)));
      document.getElementById('vdesc').textContent = Lang.conv(versions.filter(v => selected.includes(v.id)).map(v => v.name + '：' + v.desc).join('；'));
    }
    verBtn.onclick = () => { panel.hidden = !panel.hidden; };
    document.getElementById('verDone').onclick = () => { panel.hidden = true; };
    panel.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const id = b.dataset.v;
      if (maxPick === 1) selected = [id];
      else if (selected.includes(id)) { if (selected.length > 1) selected = selected.filter(x => x !== id); }
      else { if (selected.length >= maxPick) selected.shift(); selected.push(id); }
      Store.set(verKey, selected); paintVer();
    };
    paintVer();

    const sumPill = document.getElementById('sumPill');
    sumPill.onclick = () => summarize();
    const rounds = () => msgs.filter(m => m.role === 'user').length;
    function paintTop() {
      const last = msgs[msgs.length - 1];
      const show = !paused && !busy && last && last.role === 'ai' && rounds() >= 3;
      sumPill.hidden = !show;
      const hot = show && rounds() >= 5 && summarizedAt < 5;
      sumPill.classList.toggle('hot', hot);
      sumPill.textContent = Lang.conv(hot ? '📝 聊了好幾輪，要不要整理一下？' : '📝 整理我的思考');
    }

    function history(uptoIndex) {
      const h = [];
      msgs.slice(0, uptoIndex).forEach(m => {
        if (m.role === 'user') h.push({ role: 'user', content: m.text });
        else if (m.role === 'ai') { const r = m.v[m.active]; if (r && r.reply) h.push({ role: 'assistant', content: r.reply }); }
      });
      return h;
    }
    async function summarize() {
      if (busy) return;
      busy = true; comp.fit(); paintTop();
      const entry = { role: 'summary', loading: true }; msgs.push(entry); draw();
      try { entry.data = await AI.summary(kind, kid, history(msgs.length - 1)); }
      catch (e) { entry.error = AI.errorText(e); }
      entry.loading = false; busy = false; summarizedAt = rounds();
      if (entry.data && record && isKid) { record.summaryCard = entry.data; Store.saveRecord(record); }
      if (!isKid && saved) keep();
      comp.fit(); draw();
    }
    function summaryHtml(e) {
      if (e.loading) return '<div class="sum-card"><div class="thinking-row">' + (isKid ? buddy(36, true) : lamp(36, true)) + '<span class="typing">正在整理</span></div></div>';
      if (e.error) return '<div class="sum-card"><p>' + esc(e.error) + '</p></div>';
      const d = e.data || {};
      if (isKid) {
        const say = (d.happened || '') + '。' + (d.feelings || []).map(f => f.who + '，' + f.text).join('。') + '。我可以：' + (d.cando || []).join('，') + '。' + (d.encourage || '');
        return '<div class="sum-card kid"><div class="sum-h">' + buddy(30) + '<b>今天我想到了</b></div>' +
          '<div class="r-lab">發生了什麼事</div><div class="r-body">' + esc(d.happened) + '</div>' +
          ((d.feelings || []).length ? '<div class="r-lab">大家的心情</div>' + feelingsHtml(d.feelings) : '') +
          '<div class="r-lab">我可以怎麼做</div><ul class="sum-list">' + (d.cando || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
          '<div class="think-box">' + esc(d.encourage) + '</div><div style="margin-top:10px">' + speakBtn(say) + '</div></div>';
      }
      const say = '核心的兩難：' + (d.dilemma || '') + '。我在乎的：' + (d.values || []).join('、') + '。' + (d.options || []).map(o => o.name + '，好處是' + o.pros + '，代價是' + o.cons).join('。') + '。目前傾向：' + (d.leaning || '') + '。下一步：' + (d.next || '');
      return '<div class="sum-card"><div class="sum-h">' + lamp(30) + '<b>我的思考小結</b></div>' +
        '<div class="r-lab">核心的兩難</div><div class="r-body">' + esc(d.dilemma) + '</div>' +
        '<div class="r-lab">我在乎的</div><div class="chips">' + (d.values || []).map(v => '<span class="chip">' + esc(v) + '</span>').join('') + '</div>' +
        '<div class="r-lab">各個選擇</div>' + (d.options || []).map(o => '<div class="opt-sum"><b>' + esc(o.name) + '</b><div class="small"><span class="pro">好處</span>' + esc(o.pros) + '</div><div class="small"><span class="con">代價</span>' + esc(o.cons) + '</div></div>').join('') +
        '<div class="r-lab">目前傾向</div><div>' + esc(d.leaning) + '</div>' +
        '<div class="think-box" style="margin-top:12px">下一步：' + esc(d.next) + '</div><div style="margin-top:10px">' + speakBtn(say) + '</div></div>';
    }
    async function gen(msgIndex, vid) {
      const m = msgs[msgIndex];
      m.v[vid] = { loading: true }; draw();
      try {
        const h = history(msgIndex);
        m.v[vid] = isKid ? await AI.kid(kid, vid, h, sillyCount) : await AI.adult(vid, h);
      } catch (e) { m.v[vid] = { error: AI.errorText(e) }; }
      draw();
      return m.v[vid];
    }
    async function send(text) {
      if (!text || busy || paused) return;
      busy = true; comp.fit(); Voice.stop(); panel.hidden = true;
      msgs.push({ role: 'user', text });
      msgs.push({ role: 'ai', v: {}, active: selected[0], order: selected.slice() });
      const idx = msgs.length - 1;
      const results = await Promise.all(selected.map(v => gen(idx, v)));
      busy = false;
      const main = results.find(r => r && !r.error);
      if (main) comp.inp.setAttribute('placeholder', Lang.conv(isKid ? '還想說什麼嗎？寫下來或按麥克風' : '繼續說說你的想法…'));
      if (main && !isKid && saved) keep();
      closed = !!(main && main.closing);
      if (main && isKid && main.closing && !main.silly) giveStars(kid, 1);
      if (main && isKid) {
        if (main.silly) sillyCount++; else { sillyCount = 0; giveStars(kid, 1); }
        record = saveKidRecord(kid, record, text, main, {
          messages: msgs.filter(m => m.role !== 'summary').map(m => m.role === 'user' ? { role: 'user', text: m.text } : { role: 'ai', text: (m.v[m.active] || {}).reply || '' })
        });
        if (sillyCount >= 3) paused = true;
      }
      comp.fit(); draw();
    }
    function draw() {
      chat.innerHTML = msgs.map((m, i) => {
        if (m.role === 'user') return '<div class="msg-user">' + esc(m.text) + '</div>';
        if (m.role === 'summary') return '<div class="ai-wrap">' + summaryHtml(m) + '</div>';
        const canAdd = !isKid && m.order.length < versions.length;
        const tabs = (m.order.length > 1 || canAdd) ?
          '<div class="tabs">' + (m.order.length > 1 ? m.order.map(v => '<button class="tab' + (v === m.active ? ' on' : '') + '" data-m="' + i + '" data-tab="' + v + '">' + esc(vname(v)) + '</button>').join('') : '<span class="tab on">' + esc(vname(m.active)) + '</span>') +
          (canAdd ? '<button class="tab add" data-m="' + i + '" data-add="1">換個方式</button>' : '') + '</div>' : '';
        const r = m.v[m.active] || {};
        let body;
        if (r.loading) body = '<div class="thinking-row">' + (isKid ? buddy(36, true) : lamp(36, true)) + '<span class="typing">' + (isKid ? esc(NAME) + '想一想' : '思考中') + '</span></div>';
        else if (r.error) body = '<div class="body"><p>' + esc(r.error) + '</p></div><div class="foot"><button class="btn ghost" style="width:auto;padding:8px 16px" data-retry="' + i + '" data-rv="' + m.active + '">重試</button></div>';
        else body = '<div class="body">' + md(r.reply || '') + '</div><div class="foot">' + speakBtn(r.reply || '') + '</div>';
        let extra = '';
        if (!r.loading && !r.error && i === msgs.length - 1) {
          if (isKid && r.level === 'urgent') extra += '<div class="notice urgent">這件事很重要，' + esc(kid.name) + '。要不要現在就去找爸爸媽媽說？<div style="margin-top:8px"><button class="btn danger" data-go="/kid/' + kid.id + '/help">找爸爸媽媽幫忙</button></div></div>';
          if (!isKid && r.level === 'urgent') extra += '<div class="notice urgent"><b>你的安全最重要。</b>請聯絡身邊信任的人，或撥打以下電話：' + hotlinesHtml() + '</div>';
          if (r.closing && !isKid) extra += '<div class="notice info">要結束這次對話了嗎？<div class="two-btn" style="margin-top:10px"><button class="btn ghost" data-act="cont">繼續聊</button><button class="btn accent" data-act="end">結束對話</button></div></div>';
          if (r.closing && isKid) extra += '<div class="result center">今天你很勇敢說出來！⭐<div style="margin-top:12px"><button class="btn" data-go="/kid/' + kid.id + '">回到首頁</button></div></div>';
          if (r.looping && !r.closing) extra += '<div class="notice privacy">好像在同一個地方打轉了。要不要先整理一下，或休息一下？<div class="two-btn" style="margin-top:10px"><button class="btn ghost" data-act="rest">先休息一下</button><button class="btn accent" data-act="sum">整理我的思考</button></div></div>';
          let opts = r.closing ? [] : (r.options || []).slice();
          if (!isKid && !r.closing && !opts.some(o => /對方|对方/.test(o))) opts.push('從對方的角度看看');
          if (!paused && opts.length) extra += '<div class="quick">' + opts.map(o => '<button data-quick="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>';
        }
        return '<div class="ai-wrap"><div class="ai-row">' + (isKid ? buddy(30) : lamp(30)) + '<div class="msg-ai">' + tabs + body + '</div></div>' + extra + '</div>';
      }).join('');

      let tail = '';
      if (paused) tail = '<div class="result center" style="margin-top:16px">' + esc(NAME) + '有點累了，我們休息一下，下次再一起想吧！<div style="margin-top:12px"><button class="btn" data-go="/kid/' + kid.id + '/scenes">去玩情境卡</button><button class="btn ghost" data-go="/kid/' + kid.id + '">回到首頁</button></div></div>';
      document.getElementById('tail').innerHTML = tail;
      chat.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
        const a = b.dataset.act;
        if (a === 'end' || a === 'rest') endFlow('/adult');
        else if (a === 'sum') summarize();
        else if (a === 'cont') { b.closest('.notice').remove(); comp.focus(); }
      });
      chat.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { msgs[+b.dataset.m].active = b.dataset.tab; draw(); });
      chat.querySelectorAll('[data-add]').forEach(b => b.onclick = () => pickExtra(+b.dataset.m));
      chat.querySelectorAll('[data-retry]').forEach(b => b.onclick = () => gen(+b.dataset.retry, b.dataset.rv));
      chat.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => (/整理/.test(b.dataset.quick) && rounds() >= 2) ? summarize() : send(b.dataset.quick));
      paintTop();
      const lastEl = chat.lastElementChild;
      if (lastEl) { const y = lastEl.getBoundingClientRect().top + window.scrollY - 70; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }
    }
    if (msgs.length) { comp.inp.setAttribute('placeholder', Lang.conv('繼續說說你的想法…')); draw(); }
    function pickExtra(i) {
      const m = msgs[i];
      const left = versions.filter(v => !m.order.includes(v.id));
      const box = document.createElement('div');
      box.className = 'chips'; box.style.margin = '8px 0';
      box.innerHTML = left.map(v => '<button class="chip" data-x="' + v.id + '">' + esc(v.name) + '</button>').join('');
      chat.children[i].appendChild(box);
      box.onclick = async e => {
        const b = e.target.closest('[data-x]'); if (!b) return;
        m.order.push(b.dataset.x); m.active = b.dataset.x; box.remove();
        await gen(i, b.dataset.x);
      };
    }
  }

  // ---------- 找爸爸媽媽幫忙 ----------
  function kidHelp(kid) {
    const hasHook = !!Store.settings().webhook;
    const msg = '你很勇敢。有任何讓你不舒服、害怕、或想不通的事，都可以跟爸爸媽媽說。這不是告狀，是在照顧自己。';
    render(top('找爸爸媽媽幫忙', '/kid/' + kid.id) +
      '<div class="screen center"><div style="margin-top:20px">' + buddy(80) + '</div>' +
      '<h2 style="margin:8px 0 4px">你很勇敢</h2><p class="muted">有任何讓你不舒服、害怕、或想不通的事，<br>都可以跟爸爸媽媽說。這不是告狀，是在照顧自己。</p>' +
      '<div style="margin:4px 0 20px">' + speakBtn(msg) + '</div>' +
      '<div id="area">' +
      (hasHook ? '<button class="btn danger" id="call" style="font-size:17px;padding:16px">請爸爸媽媽來找我</button>' :
        '<div class="notice info">現在就去找爸爸媽媽，跟他們說：<br><b>「我需要你幫忙。」</b></div>') +
      '<button class="btn ghost" data-go="/kid/' + kid.id + '">回到首頁</button></div></div>', { kid, noHelp: true });
    const call = document.getElementById('call');
    if (call) call.onclick = async () => {
      call.disabled = true; call.textContent = Lang.conv('傳送中…');
      Store.saveRecord({ id: Store.uid(), type: 'kid-help', kidId: kid.id, kidName: kid.name, time: Date.now(), level: 'urgent', summary: '按了「找爸爸媽媽幫忙」', notified: true });
      await Notify.helpButton(kid.name);
      const d = document.createElement('div'); d.className = 'notice info pop';
      d.innerHTML = '已經告訴爸爸媽媽了！<br>他們很快會來找你。你也可以直接去找他們喔。';
      call.replaceWith(d);
    };
  }

  // ---------- 大人首頁 ----------
  function adultHome() {
    const adultMode = Store.settings().deviceMode === 'adult';
    const urgent = Store.records().filter(r => r.kidId && r.level === 'urgent' && !r.seen).length;
    render(top('', adultMode ? '' : '/') +
      '<div class="screen"><div class="buddy">' + lamp(48) + '<div style="padding-top:4px"><b>遇到兩難了嗎？</b><br><span class="muted">很多事沒有標準答案，我們一起想清楚。</span></div></div>' +
      '<div style="height:12px"></div>' +
      '<button class="choice" data-go="/parent"><span class="ic" style="background:#f1efe8">👨‍👩‍👦</span><span><div class="t">孩子的紀錄' + (urgent ? ' <span class="badge urgent">' + urgent + ' 則需要關心</span>' : '') + '</div><div class="d">查看孩子的煩惱和情境練習（需要密碼）</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/adult/talk"><span class="ic">✍️</span><span><div class="t">說出我的困境</div><div class="d">寫下或說出你正在猶豫的事</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/adult/history"><span class="ic" style="background:#f1efe8">🗂️</span><span><div class="t">我的對話</div><div class="d">回去看保留的對話，也能接著聊（需要密碼）</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/adult/scenes"><span class="ic" style="background:#faeeda">🎲</span><span><div class="t">情境練習</div><div class="d">從常見的兩難情境開始</div></span><span class="arrow">›</span></button>' +
      '<p class="small muted center" style="margin-top:20px">對話只存在這支手機上，結束時由你決定要不要保留。</p>' +
      '<div class="foot-note">' + (adultMode ? '<a href="#/kid" style="color:inherit">小孩版</a> · ' : '') + '<a href="#/about" style="color:inherit">我們的原則</a></div></div>');
  }

  function adultHistory() {
    const list = Store.records().filter(r => r.type === 'adult-talk').sort((a, b) => (b.updated || b.time) - (a.updated || a.time));
    render(top('我的對話', '/adult') +
      '<div class="screen"><p class="small muted">點一下就能回到對話，接著聊。</p>' +
      (list.length ? list.map(r => '<div class="rec-row"><button class="rec" data-go="/adult/talk/' + r.id + '"><div class="row"><span>' + timeStr(r.updated || r.time) + '</span><span class="small">' + ((r.messages || []).filter(m => m.role === 'user').length) + ' 輪</span></div><div class="sum">' + esc(r.summary || '（沒有內容）') + '</div></button><button class="rec-del" data-del="' + r.id + '" aria-label="刪除">🗑</button></div>').join('')
        : '<p class="muted center" style="margin-top:40px">還沒有保留的對話</p>') +
      '<div style="margin-top:20px"><button class="btn ghost" id="lock">鎖定並離開</button></div></div>');
    app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      modal('刪除這段對話？', '刪除後就找不回來了。', [
        { label: '刪除', cls: 'danger', fn: () => { Store.deleteRecord(b.dataset.del); adultHistory(); } },
        { label: '取消', cls: 'ghost' }]);
    });
    document.getElementById('lock').onclick = () => { sessionStorage.removeItem('lz_unlock'); go('/adult'); };
  }
  function gated(fn) {
    if (!Secure.available()) return render(top('', '/') + '<div class="screen"><div class="notice urgent">請用 Safari 打開這個網站（需要 https 網址）。</div></div>');
    if (!Secure.hasPassword()) return parentSetup();
    if (!unlocked()) return parentGate(fn);
    sessionStorage.setItem('lz_unlock', Date.now()); fn();
  }

  // ---------- 家長專區 ----------
  function unlocked() { const t = +sessionStorage.getItem('lz_unlock') || 0; return Date.now() - t < 15 * 60 * 1000; }
  function parent(sub, arg) {
    if (!Secure.available()) return render(top('家長專區', '/') + '<div class="screen"><div class="notice urgent">請用 Safari 打開這個網站（需要 https 網址）。</div></div>');
    if (!Secure.hasPassword()) return parentSetup();
    if (!unlocked()) return parentGate(() => parent(sub, arg));
    sessionStorage.setItem('lz_unlock', Date.now());
    if (sub === 'rec') return parentRecord(arg);
    if (sub === 'settings') return parentSettings();
    return parentDash(arg);
  }
  function parentSetup() {
    render(top('設定家長密碼', '/') +
      '<div class="screen"><p class="muted">請設定一組家長密碼（至少 4 位）。孩子的紀錄和設定都需要這組密碼才能看。</p>' +
      '<div class="notice privacy">請記好這組密碼。之後在你自己的手機上查看通知裡的紀錄，也要用同一組密碼。</div>' +
      '<div class="field"><label>密碼</label><input type="password" id="p1" class="pin" inputmode="numeric" autocomplete="new-password"></div>' +
      '<div class="field"><label>再輸入一次</label><input type="password" id="p2" class="pin" inputmode="numeric" autocomplete="new-password"><div class="err" id="err"></div></div>' +
      '<button class="btn" id="ok">設定</button></div>');
    document.getElementById('ok').onclick = async () => {
      const a = document.getElementById('p1').value, b = document.getElementById('p2').value;
      const err = document.getElementById('err');
      if (a.length < 4) return err.textContent = Lang.conv('至少 4 位');
      if (a !== b) return err.textContent = Lang.conv('兩次輸入不一樣');
      await Secure.setPassword(a);
      sessionStorage.setItem('lz_unlock', Date.now());
      toast('密碼設定好了');
      if (/^#\/adult\/(history|talk\/)/.test(location.hash)) route(); else go('/parent/settings');
    };
  }
  function parentGate(next) {
    render(top('家長專區', '/') +
      '<div class="screen"><div class="center" style="margin:40px 0 20px"><div style="font-size:40px">🔒</div><p class="muted">請輸入家長密碼</p></div>' +
      '<div class="field"><input type="password" id="pw" class="pin" inputmode="numeric" autocomplete="current-password"><div class="err" id="err"></div></div>' +
      '<button class="btn" id="ok">進入</button></div>');
    const pw = document.getElementById('pw'); pw.focus();
    const ok = async () => {
      if (await Secure.check(pw.value)) { sessionStorage.setItem('lz_unlock', Date.now()); next(); }
      else { document.getElementById('err').textContent = Lang.conv('密碼不正確'); pw.value = ''; }
    };
    document.getElementById('ok').onclick = ok;
    pw.onkeydown = e => { if (e.key === 'Enter') ok(); };
  }
  function parentDash(tab) {
    const kids = Store.kids();
    tab = tab || (kids[0] && kids[0].id) || 'me';
    const recs = Store.records();
    const list = tab === 'me' ? recs.filter(r => r.type === 'adult-talk') : recs.filter(r => r.kidId === tab);
    const urgentCount = id => recs.filter(r => r.kidId === id && r.level === 'urgent' && !r.seen).length;
    render(top('家長專區', '/', '<button data-go="/parent/settings" style="color:inherit">設定</button>') +
      '<div class="screen">' +
      '<div class="notice privacy"><b>這是孩子的真心話。</b>請不要直接拿著紀錄去問他，也不要轉告別人。用自然的方式關心，他才會願意繼續說。</div>' +
      '<div class="seg">' + kids.map(k => '<button class="' + (tab === k.id ? 'on' : '') + '" data-go="/parent/kid/' + k.id + '">' + esc(k.name) + (urgentCount(k.id) ? ' 🔴' : '') + '</button>').join('') +
      '<button class="' + (tab === 'me' ? 'on' : '') + '" data-go="/parent/kid/me">我的紀錄</button></div>' +
      (tab !== 'me' ? '<div class="small muted" style="margin:-6px 0 10px">⭐ ' + Store.stars(tab) + ' 顆星 · 📒 ' + Store.stickers(tab).length + ' 張貼紙 · 玩過 ' + Store.played(tab).length + ' 張情境卡</div>' : '') +
      (list.length ? list.map(r =>
        '<button class="rec" data-go="' + (r.type === 'adult-talk' ? '/adult/talk/' : '/parent/rec/') + r.id + '"><div class="row"><span>' + timeStr(r.time) + '</span><span class="badge ' + (r.level || 'normal') + '">' +
        (r.type === 'kid-scene' ? '情境練習' : r.type === 'kid-help' ? '找你幫忙' : levelName[r.level] || '紀錄') + '</span></div>' +
        '<div class="sum">' + esc(r.summary || (r.kidText || '').slice(0, 40) || '（沒有內容）') + '</div></button>').join('')
        : '<p class="muted center" style="margin-top:40px">還沒有紀錄</p>') +
      '<div style="margin-top:24px">' + (Store.settings().deviceMode === 'kid' ? '<button class="btn ghost" data-go="/adult">前往大人版</button>' : '') +
      '<button class="btn ghost" id="lock">鎖定並離開</button></div></div>');
    document.getElementById('lock').onclick = () => { sessionStorage.removeItem('lz_unlock'); go('/'); };
  }
  function parentRecord(id) {
    const r = Store.records().find(x => x.id === id);
    if (!r) return go('/parent');
    r.seen = true; Store.saveRecord(r);
    const back = r.kidId ? '/parent/kid/' + r.kidId : '/parent/kid/me';
    render(top(r.kidName || '我的紀錄', back) +
      '<div class="screen"><div class="row muted small" style="margin-bottom:8px">' + timeStr(r.time) + ' · <span class="badge ' + (r.level || 'normal') + '">' + (levelName[r.level] || '') + '</span></div>' +
      (r.summary ? '<div class="notice info"><b>摘要：</b>' + esc(r.summary) + '</div>' : '') +
      (r.parentTip ? '<div class="notice privacy"><b>怎麼開口：</b>' + esc(r.parentTip) + '</div>' : '') +
      (r.summaryCard ? '<div class="label">整理的小結</div><div class="story" style="font-size:15px">' + esc(Object.values(r.summaryCard).map(v => Array.isArray(v) ? v.map(x => typeof x === 'object' ? Object.values(x).join('：') : x).join('、') : v).join('\n')).replace(/\n/g, '<br>') + '</div>' : '') +
      (r.picks ? '<div class="label">孩子的選擇</div><div class="story" style="font-size:15px">' + r.picks.map(esc).join('<br>') + '</div>' : '') +
      (r.kidText && !r.messages ? '<div class="label">孩子說的話</div><div class="story" style="font-size:15px;white-space:pre-wrap">' + esc(r.kidText) + '</div>' : '') +
      (r.messages ? '<div class="label">對話內容</div><div class="chat">' + r.messages.map(m =>
        m.role === 'user' ? '<div class="msg-user">' + esc(m.text) + '</div>' : '<div class="msg-ai"><div class="body">' + md(m.text) + '</div></div>').join('') + '</div>' : '') +
      '<div style="margin-top:24px"><button class="btn danger" id="del">刪除這則紀錄</button></div></div>');
    document.getElementById('del').onclick = () => { if (confirmBox()) { Store.deleteRecord(id); go(back); } };
  }
  let delArmed = 0;
  function confirmBox() {
    if (Date.now() - delArmed < 4000) { delArmed = 0; return true; }
    delArmed = Date.now(); toast('再按一次確認'); return false;
  }
  function parentSettings() {
    const s = Store.settings(); const kids = Store.kids();
    const hours = Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === +s.summaryHour ? ' selected' : '') + '>' + h + ':00</option>').join('');
    const seg = (id, val, opts) => '<div class="seg" id="' + id + '">' + opts.map(o => '<button data-val="' + o[0] + '" class="' + (val === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
    render(top('設定', '/parent') +
      '<div class="screen">' +
      '<div class="label">這支手機給誰用</div>' + seg('deviceMode', s.deviceMode, [['kid', '孩子'], ['adult', '大人'], ['normal', '一般']]) +
      '<div class="help small muted" style="margin-top:-6px">孩子：打開就直接選孩子的名字。大人：打開就是大人版和孩子的紀錄。一般：先選小朋友或大人。</div>' +

      '<div class="label">文字</div>' +
      '<div class="field"><label>小孩版</label>' + seg('kidScript', s.kidScript, [['hans', '簡體'], ['hant', '繁體']]) + '</div>' +
      '<div class="field"><label>大人版和家長專區</label>' + seg('adultScript', s.adultScript, [['hans', '簡體'], ['hant', '繁體']]) + '</div>' +

      '<div class="label">孩子</div><div id="kids">' + kids.map((k, i) =>
        '<div class="kid-row"><span class="avatar" style="background:' + k.color + ';width:36px;height:36px;font-size:15px">' + esc(k.name.slice(0, 1)) + '</span>' +
        '<input data-kid="' + i + '" value="' + esc(k.name) + '">' +
        '<label class="py-toggle"><input type="checkbox" data-py="' + i + '"' + (k.pinyin ? ' checked' : '') + '>拼音</label>' +
        (kids.length > 1 ? '<button class="small muted" data-rm="' + i + '">移除</button>' : '') + '</div>').join('') + '</div>' +
      '<button class="btn ghost" id="addKid">＋ 新增孩子</button>' +

      '<div class="label">AI 設定</div>' +
      '<div class="field"><label>DeepSeek API 金鑰</label><input id="key" type="password" value="' + esc(s.apiKey) + '" placeholder="sk-..." autocomplete="off"><div class="help">在 platform.deepseek.com 申請，只存在這支手機上。</div></div>' +
      '<button class="btn ghost" id="testAI">測試 AI 連線</button>' +

      '<div class="label">企業微信通知</div>' +
      '<div class="field"><label>消息推送網址（Webhook）</label><input id="hook" type="password" value="' + esc(s.webhook) + '" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." autocomplete="off"><div class="help">通知只會寫「誰有新紀錄」，不會寫出內容。點通知裡的連結並輸入家長密碼才看得到。</div></div>' +
      '<div class="switch"><span>開啟通知</span><input type="checkbox" id="notifyOn"' + (s.notifyOn ? ' checked' : '') + '></div>' +
      '<div class="field" style="margin-top:12px"><label>每日小結時間</label><select id="hour">' + hours + '</select><div class="help">到了這個時間之後，孩子第一次打開網站時送出。</div></div>' +
      '<button class="btn ghost" id="testHook">傳送測試通知</button>' +
      '<button class="btn ghost" id="sumNow">現在傳送今日小結</button>' +

      '<div style="margin-top:24px"><button class="btn" id="save">儲存設定</button></div>' +
      '<div class="label" style="margin-top:32px">其他</div>' +
      '<button class="btn ghost" id="chpw">更改家長密碼</button>' +
      '<button class="btn danger" id="wipe">清除這支手機上的所有資料</button>' +
      '<div class="foot-note">' + esc(C.appName) + ' 版本 ' + esc(C.version) + '</div></div>');

    app.querySelectorAll('.seg[id]').forEach(g => g.onclick = e => {
      const b = e.target.closest('[data-val]'); if (!b) return;
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
    const segVal = id => { const b = document.querySelector('#' + id + ' .on'); return b ? b.dataset.val : null; };
    function collect() {
      const k = Store.kids();
      document.querySelectorAll('[data-kid]').forEach(inp => { const v = inp.value.trim(); if (v) k[+inp.dataset.kid].name = v; });
      document.querySelectorAll('[data-py]').forEach(cb => { k[+cb.dataset.py].pinyin = cb.checked; });
      Store.setKids(k);
      Store.saveSettings(Object.assign(Store.settings(), {
        apiKey: document.getElementById('key').value.trim(), webhook: document.getElementById('hook').value.trim(),
        notifyOn: document.getElementById('notifyOn').checked, summaryHour: +document.getElementById('hour').value,
        deviceMode: segVal('deviceMode'), kidScript: segVal('kidScript'), adultScript: segVal('adultScript')
      }));
    }
    document.getElementById('save').onclick = () => { collect(); toast('已儲存'); parentSettings(); };
    document.getElementById('addKid').onclick = () => {
      collect(); const k = Store.kids(); const colors = ['#534AB7', '#D4537E', '#185FA5', '#BA7517'];
      k.push({ id: 'k' + Store.uid(), name: '孩子' + (k.length + 1), color: colors[k.length % colors.length], pinyin: false });
      Store.setKids(k); parentSettings();
    };
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      if (!confirmBox()) return;
      collect(); const k = Store.kids(); k.splice(+b.dataset.rm, 1); Store.setKids(k); parentSettings();
    });
    document.getElementById('testAI').onclick = async e => {
      collect(); const b = e.currentTarget; b.disabled = true;
      try { await AI.test(); toast('AI 連線成功'); } catch (err) { toast(AI.errorText(err)); }
      b.disabled = false;
    };
    document.getElementById('testHook').onclick = async () => {
      collect(); if (!Store.settings().webhook) return toast('請先填入網址');
      await Notify.post('**' + C.appName + '**\n> 測試通知。如果你看到這則訊息，就設定成功了！');
      toast('已送出，請到企業微信查看');
    };
    document.getElementById('sumNow').onclick = async () => {
      collect(); const ok = await Notify.dailyIfDue(true);
      toast(ok ? '已送出今日小結' : '目前沒有新的紀錄要傳送');
    };
    document.getElementById('chpw').onclick = () => parentSetup();
    document.getElementById('wipe').onclick = () => {
      if (!confirmBox()) return;
      Store.clearAll(); sessionStorage.clear(); toast('已清除'); go('/');
    };
  }

  // ---------- 家長在自己手機上看通知裡的紀錄 ----------
  function viewShared(token) {
    render(top('查看紀錄', '/') +
      '<div class="screen"><div class="center" style="margin:32px 0 16px"><div style="font-size:40px">🔒</div><p class="muted">請輸入家長密碼</p></div>' +
      '<div class="field"><input type="password" id="pw" class="pin" inputmode="numeric"><div class="err" id="err"></div></div>' +
      '<button class="btn" id="ok">查看</button></div>');
    const pw = document.getElementById('pw');
    const ok = async () => {
      try {
        const d = await Secure.open(token, pw.value);
        render(top(d.kid + ' 的紀錄', '/') +
          '<div class="screen"><div class="notice privacy"><b>這是孩子的真心話。</b>請不要直接拿著紀錄去問他，也不要轉告別人。</div>' +
          '<div class="muted small">' + timeStr(d.t) + ' · <span class="badge ' + (d.level || 'normal') + '">' + (levelName[d.level] || '') + '</span></div>' +
          (d.summary ? '<div class="notice info"><b>摘要：</b>' + esc(d.summary) + '</div>' : '') +
          (d.text ? '<div class="label">孩子說的話</div><div class="story" style="font-size:15px;white-space:pre-wrap">' + esc(d.text) + '</div>' : '') +
          (d.tip ? '<div class="notice privacy" style="margin-top:14px"><b>怎麼開口：</b>' + esc(d.tip) + '</div>' : '') +
          '<p class="small muted" style="margin-top:20px">完整對話在孩子用的手機上，可以在那邊的家長專區查看。</p></div>');
      } catch (e) {
        document.getElementById('err').textContent = Lang.conv('密碼不正確，或連結不完整'); pw.value = '';
      }
    };
    document.getElementById('ok').onclick = ok;
    pw.onkeydown = e => { if (e.key === 'Enter') ok(); };
  }

  // ---------- 路由 ----------
  function route() {
    if (guard && location.hash !== guard.hash && guard.needs()) {
      const dest = location.hash.replace(/^#/, '') || '/';
      history.replaceState(null, '', guard.hash);
      guard.show(dest); return;
    }
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, query] = raw.split('?');
    const p = path.split('/').filter(Boolean);
    if (p[0] === 'view') { const m = (query || '').match(/d=([^&]+)/); return m ? viewShared(m[1]) : home(); }
    if (p[0] === 'about') return about();
    if (p[0] === 'kid') {
      if (!p[1]) return kidPick();
      const kid = Store.kid(p[1]); if (!kid) return kidPick();
      if (!p[2]) return kidHome(kid);
      if (p[2] === 'scenes') return sceneList('kid', kid);
      if (p[2] === 'scene') return scenePlay('kid', kid, p[3]);
      if (p[2] === 'talk') return talk('kid', kid);
      if (p[2] === 'help') return kidHelp(kid);
      if (p[2] === 'stickers') return stickerBook(kid);
      return kidHome(kid);
    }
    if (p[0] === 'adult') {
      if (p[1] === 'scenes') return sceneList('adult');
      if (p[1] === 'scene') return scenePlay('adult', null, p[2]);
      if (p[1] === 'talk' && p[2]) return gated(() => talk('adult', null, p[2]));
      if (p[1] === 'talk') return talk('adult');
      if (p[1] === 'history') return gated(adultHistory);
      return adultHome();
    }
    if (p[0] === 'parent') {
      if (p[1] === 'kid') return parent('dash', p[2]);
      return parent(p[1], p[2]);
    }
    return home();
  }
  window.addEventListener('hashchange', route);
  if (window.speechSynthesis) speechSynthesis.getVoices();
  route();
  Notify.dailyIfDue();
})();
