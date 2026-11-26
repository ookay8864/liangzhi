// =============================================================
// 畫面與流程
// =============================================================
(function () {
  const app = document.getElementById('app');
  const C = CONFIG;

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
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
  }
  function timeStr(t) {
    const d = new Date(t);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function top(title, back, right) {
    return '<div class="top">' + (back ? '<button class="back" data-back="' + esc(back) + '" aria-label="返回">‹</button>' : '<span style="width:8px"></span>') +
      '<h1>' + esc(title) + '</h1><div class="right">' + (right || '') + '</div></div>';
  }
  function speakBtn(text) {
    if (!Voice.canSpeak) return '';
    return '<button class="speak" data-speak="' + esc(text) + '" aria-label="念出來">🔈 念給我聽</button>';
  }
  function render(html, opts) {
    Voice.stop();
    opts = opts || {};
    document.body.classList.toggle('has-help', !!opts.kidHelp);
    app.innerHTML = html + (opts.kidHelp ? '<div class="helpbar"><button data-go="/kid/' + opts.kidHelp + '/help">找爸爸媽媽幫忙</button></div>' : '');
    window.scrollTo(0, 0);
  }
  const levelName = { urgent: '需要關心', concern: '一般煩惱', normal: '聊天' };

  // 共用點擊處理
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-back],[data-go],[data-speak]');
    if (!b) return;
    if (b.dataset.back) go(b.dataset.back);
    else if (b.dataset.go) go(b.dataset.go);
    else if (b.dataset.speak) Voice.speak(b.dataset.speak, b);
  });

  // ---------- 首頁 ----------
  function home() {
    render(
      '<div class="screen"><div class="hero"><div class="logo">' + logoSvg() + '</div>' +
      '<h2>' + esc(C.appName) + '</h2><p>' + esc(C.appSubtitle) + '</p></div>' +
      '<button class="choice" data-go="/kid"><span class="ic">🧒</span><span><div class="t">我是小朋友</div><div class="d">和' + esc(C.kidCharacter) + '一起想一想</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/adult"><span class="ic" style="background:#f1efe8">🧭</span><span><div class="t">我是大人</div><div class="d">把兩難的事想清楚</div></span><span class="arrow">›</span></button>' +
      '<div class="foot-note"><a href="#/parent" style="color:inherit">家長專區</a> · <a href="#/about" style="color:inherit">我們的原則</a></div></div>'
    );
  }
  function logoSvg() {
    return '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0f6e56" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>';
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
    render(top('你是誰呢？', '/') +
      '<div class="screen"><div class="buddy" style="margin-bottom:24px"><div class="buddy-face">🐣</div><div style="padding-top:8px">嗨！我是' + esc(C.kidCharacter) + '，點一下你的名字吧！</div></div>' +
      '<div class="kid-grid">' + kids.map(k =>
        '<button class="kid-card" data-go="/kid/' + k.id + '"><span class="avatar" style="background:' + k.color + '">' + esc(k.name.slice(0, 1)) + '</span>' + esc(k.name) + '</button>').join('') +
      '</div></div>');
  }

  function kidHome(kid) {
    render(top('', '/kid', '<span class="stars">⭐ ' + Store.stars(kid.id) + '</span>') +
      '<div class="screen"><div class="buddy"><div class="buddy-face">🐣</div><div style="padding-top:4px"><b>嗨，' + esc(kid.name) + '！</b><br>今天想做什麼呢？</div></div>' +
      '<div style="height:12px"></div>' +
      '<button class="choice" data-go="/kid/' + kid.id + '/scenes"><span class="ic" style="background:#faeeda">🎲</span><span><div class="t">玩一玩</div><div class="d">選一張情境卡，看看你會怎麼做</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/kid/' + kid.id + '/talk"><span class="ic">💬</span><span><div class="t">說說我的煩惱</div><div class="d">' + esc(C.kidCharacter) + '陪你一起想</div></span><span class="arrow">›</span></button>' +
      '</div>', { kidHelp: kid.id });
  }

  // ---------- 情境列表 ----------
  function sceneList(kind, kid) {
    const list = SCENARIOS[kind];
    const base = kind === 'kid' ? '/kid/' + kid.id : '/adult';
    render(top(kind === 'kid' ? '選一張情境卡' : '情境練習', base) +
      '<div class="screen">' + (kind === 'adult' ? '<p class="muted small">每個情境都沒有標準答案。選一個最接近你的想法，看看會發生什麼。</p>' : '') +
      list.map(s => '<button class="choice" data-go="' + base + '/scene/' + s.id + '">' +
        (s.icon ? '<span class="ic" style="background:#faeeda">' + s.icon + '</span>' : '') +
        '<span><div class="t">' + esc(s.title) + '</div><div class="d">' + s.steps.length + ' 關</div></span><span class="arrow">›</span></button>').join('') +
      '</div>', kid ? { kidHelp: kid.id } : null);
  }

  // ---------- 情境遊玩 ----------
  function scenePlay(kind, kid, sid) {
    const s = SCENARIOS[kind].find(x => x.id === sid);
    if (!s) return go(kind === 'kid' ? '/kid/' + kid.id + '/scenes' : '/adult/scenes');
    const base = kind === 'kid' ? '/kid/' + kid.id : '/adult';
    let step = 0, earned = 0; const picks = []; const awarded = {};

    function draw() {
      const st = s.steps[step];
      const right = kind === 'kid' ? '<span class="stars" id="starCount">⭐ ' + Store.stars(kid.id) + '</span>' : '';
      render(top(s.title, base + '/scenes', right) +
        '<div class="screen">' +
        (s.steps.length > 1 ? '<div class="progress">' + s.steps.map((_, i) => '<span class="' + (i <= step ? 'on' : '') + '"></span>').join('') + '</div>' : '') +
        '<div class="story">' + esc(st.story) + '<div style="margin-top:10px">' + speakBtn(st.story + ' ' + st.question) + '</div></div>' +
        '<div class="question">' + esc(st.question) + '</div>' +
        st.options.map((o, i) => '<button class="opt" data-i="' + i + '">' + esc(o.text) + '</button>').join('') +
        '<div id="res"></div></div>', kind === 'kid' ? { kidHelp: kid.id } : null);

      app.querySelectorAll('.opt').forEach(btn => btn.onclick = () => {
        if (app.querySelector('.opt.picked')) return;
        const o = st.options[+btn.dataset.i];
        btn.classList.add('picked');
        app.querySelectorAll('.opt').forEach(b => { if (b !== btn) b.style.opacity = '.45'; });
        picks.push(o.text);
        let extra = '';
        if (kind === 'kid' && !awarded[step]) {
          awarded[step] = true; earned++; const n = Store.addStars(kid.id, 1);
          const sc = document.getElementById('starCount'); if (sc) { sc.textContent = '⭐ ' + n; sc.classList.add('pop'); }
          extra = '<div class="small" style="margin-top:8px;color:#ba7517">你認真想了一想，得到 1 顆星！</div>';
        }
        const last = step === s.steps.length - 1;
        document.getElementById('res').innerHTML =
          '<div class="result"><div>' + esc(o.result) + '</div><div class="think">💭 ' + esc(o.think) + '</div>' + extra +
          '<div style="margin-top:10px">' + speakBtn(o.result + ' ' + o.think) + '</div></div>' +
          '<div style="margin-top:16px"><button class="btn" id="next">' + (last ? '完成' : '下一關') + '</button>' +
          '<button class="btn ghost" id="retry">換一個選擇看看</button></div>';
        document.getElementById('res').scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('retry').onclick = () => { picks.pop(); draw(); };
        document.getElementById('next').onclick = () => { if (last) finish(); else { step++; draw(); } };
      });
    }

    function finish() {
      if (kind === 'kid') {
        Store.saveRecord({ id: Store.uid(), type: 'kid-scene', kidId: kid.id, kidName: kid.name, time: Date.now(), level: 'normal', summary: '玩了情境「' + s.title + '」', picks });
        render(top('', base + '/scenes', '<span class="stars">⭐ ' + Store.stars(kid.id) + '</span>') +
          '<div class="screen center"><div style="font-size:64px;margin-top:40px" class="pop">🌟</div>' +
          '<h2 style="margin:8px 0">完成了！</h2><p class="muted">你這次得到 ' + earned + ' 顆星。<br>會為別人著想的你，好棒！</p>' +
          '<div style="margin-top:28px"><button class="btn" data-go="' + base + '/scenes">再玩一張</button>' +
          '<button class="btn ghost" data-go="' + base + '">回到首頁</button></div></div>', { kidHelp: kid.id });
      } else {
        const prefill = '情境：' + s.steps.map(x => x.story).join(' ') + '\n我的選擇：' + picks.join('、') + '\n我想多聊聊這個選擇。';
        sessionStorage.setItem('lz_prefill', prefill);
        render(top(s.title, '/adult/scenes') +
          '<div class="screen"><div class="notice info">你選擇了：' + esc(picks.join('、')) + '</div>' +
          '<p class="muted">想從不同角度多聊聊這個選擇嗎？</p>' +
          '<button class="btn" data-go="/adult/talk">和 AI 聊聊這個情境</button>' +
          '<button class="btn ghost" data-go="/adult/scenes">換一個情境</button></div>');
      }
    }
    draw();
  }

  // ---------- 對話（小孩和大人共用） ----------
  function talk(kind, kid) {
    const isKid = kind === 'kid';
    const versions = C.versions[kind];
    let selected = [versions[0].id];
    const msgs = []; // {role:'user',text} | {role:'ai', v:{id:result}, active}
    let sillyCount = 0, record = null, busy = false, paused = false;
    const base = isKid ? '/kid/' + kid.id : '/adult';

    const greet = isKid ? '嗨，' + kid.name + '！今天有什麼想跟我說的嗎？開心的、不開心的都可以喔。' : '把你正在猶豫的事寫下來或說出來。不用整理得很完整，我們一步一步想。';
    render(top(isKid ? '說說我的煩惱' : '說出我的困境', base, isKid ? '<span class="stars" id="starCount">⭐ ' + Store.stars(kid.id) + '</span>' : '') +
      '<div class="screen" style="padding-bottom:' + (isKid ? '150px' : '40px') + '">' +
      '<div class="buddy"><div class="buddy-face">' + (isKid ? '🐣' : '🧭') + '</div><div class="msg-ai" style="flex:1"><div class="body"><p>' + esc(greet) + '</p></div><div class="foot">' + speakBtn(greet) + '</div></div></div>' +
      '<div class="label" style="margin-top:8px">' + (isKid ? esc(C.kidCharacter) + '用什麼方式回答你？' : '回答方式（可選 1 到 3 個）') + '</div>' +
      '<div class="chips" id="vchips">' + versions.map(v => '<button class="chip' + (selected.includes(v.id) ? ' on' : '') + '" data-v="' + v.id + '">' + esc(v.name) + '</button>').join('') + '</div>' +
      '<div class="small muted" id="vdesc" style="margin-top:6px">' + esc(versions[0].desc) + '</div>' +
      '<div class="chat" id="chat" style="margin-top:18px"></div>' +
      '<div id="tail"></div>' +
      '<div class="composer"><div class="inputbox"><textarea id="inp" rows="1" placeholder="' + (isKid ? '寫下來，或按麥克風說話' : '例如：同事拜託我幫他隱瞞一個錯誤…') + '"></textarea>' +
      '<button class="icon-btn mic" id="mic" aria-label="語音輸入">🎤</button><button class="icon-btn send" id="send" aria-label="送出" disabled>↑</button></div>' +
      '<div class="hint" id="hint">' + (Voice.canListen ? '' : '也可以按鍵盤上的麥克風說話') + '</div></div>' +
      '</div>', isKid ? { kidHelp: kid.id } : null);

    const chat = document.getElementById('chat'), inp = document.getElementById('inp'), sendBtn = document.getElementById('send');
    const prefill = !isKid && sessionStorage.getItem('lz_prefill');
    if (prefill) { inp.value = prefill; sessionStorage.removeItem('lz_prefill'); }

    // 版本選擇
    document.getElementById('vchips').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const id = b.dataset.v;
      if (isKid) selected = [id];
      else if (selected.includes(id)) { if (selected.length > 1) selected = selected.filter(x => x !== id); }
      else { if (selected.length >= 3) { toast('最多選 3 個'); return; } selected.push(id); }
      document.querySelectorAll('#vchips .chip').forEach(c => c.classList.toggle('on', selected.includes(c.dataset.v)));
      document.getElementById('vdesc').textContent = versions.filter(v => selected.includes(v.id)).map(v => v.desc).join('；');
    };

    // 輸入框
    function fit() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 140) + 'px'; sendBtn.disabled = !inp.value.trim() || busy || paused; }
    inp.oninput = fit; fit();

    // 語音輸入
    let rec = null;
    document.getElementById('mic').onclick = () => {
      const mic = document.getElementById('mic');
      if (rec) { rec.stop(); return; }
      if (!Voice.canListen) { toast('請按鍵盤上的麥克風說話'); inp.focus(); return; }
      const before = inp.value;
      mic.classList.add('on'); document.getElementById('hint').textContent = '正在聽…說完再按一次麥克風';
      rec = Voice.listen((fin, interim) => { inp.value = before + fin + interim; fit(); }, failed => {
        rec = null; mic.classList.remove('on');
        document.getElementById('hint').textContent = failed ? '沒聽清楚，可以再試一次，或按鍵盤上的麥克風' : '';
      });
      if (!rec) { mic.classList.remove('on'); toast('請按鍵盤上的麥克風說話'); }
    };

    sendBtn.onclick = () => send(inp.value.trim());

    function history(uptoIndex) {
      const h = [];
      msgs.slice(0, uptoIndex).forEach(m => {
        if (m.role === 'user') h.push({ role: 'user', content: m.text });
        else { const r = m.v[m.active]; if (r && r.reply) h.push({ role: 'assistant', content: r.reply }); }
      });
      return h;
    }

    async function gen(msgIndex, vid) {
      const m = msgs[msgIndex];
      m.v[vid] = { loading: true }; draw();
      try {
        const h = history(msgIndex);
        const r = isKid ? await AI.kid(kid, vid, h, sillyCount) : await AI.adult(vid, h);
        m.v[vid] = r;
      } catch (e) { m.v[vid] = { error: AI.errorText(e) }; }
      draw();
      return m.v[vid];
    }

    async function send(text) {
      if (!text || busy || paused) return;
      busy = true; inp.value = ''; fit(); Voice.stop();
      msgs.push({ role: 'user', text });
      const ai = { role: 'ai', v: {}, active: selected[0], order: selected.slice() };
      msgs.push(ai);
      const idx = msgs.length - 1;
      const results = await Promise.all(selected.map(v => gen(idx, v)));
      busy = false;
      const main = results.find(r => r && !r.error);
      if (main) after(text, main);
      fit(); draw();
    }

    function after(text, r) {
      if (isKid) {
        if (r.silly) sillyCount++; else {
          sillyCount = 0;
          const n = Store.addStars(kid.id, 1);
          const sc = document.getElementById('starCount'); if (sc) { sc.textContent = '⭐ ' + n; sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop'); }
        }
        if (!r.silly || r.level === 'urgent') {
          if (!record) record = { id: Store.uid(), type: 'kid-talk', kidId: kid.id, kidName: kid.name, time: Date.now(), level: 'normal', kidText: '' };
          record.kidText = (record.kidText ? record.kidText + '\n' : '') + text;
          const rank = { normal: 0, concern: 1, urgent: 2 };
          if ((rank[r.level] || 0) > (rank[record.level] || 0)) record.level = r.level;
          if (r.summary) record.summary = r.summary;
          if (r.parent_tip) record.parentTip = r.parent_tip;
          record.messages = msgs.map(m => m.role === 'user' ? { role: 'user', text: m.text } : { role: 'ai', text: (m.v[m.active] || {}).reply || '' });
          Store.saveRecord(record);
          if (record.level === 'urgent' && !record.notified) Notify.urgent(record);
          else Notify.dailyIfDue();
        }
        if (sillyCount >= 3) paused = true;
      } else {
        if (r.level === 'urgent') r._urgent = true;
      }
    }

    function draw() {
      chat.innerHTML = msgs.map((m, i) => {
        if (m.role === 'user') return '<div class="msg-user">' + esc(m.text) + '</div>';
        const tabs = (m.order.length > 1 || !isKid) ?
          '<div class="tabs">' + m.order.map(v => '<button class="tab' + (v === m.active ? ' on' : '') + '" data-m="' + i + '" data-tab="' + v + '">' + esc(versions.find(x => x.id === v).name) + '</button>').join('') +
          (!isKid && m.order.length < versions.length ? '<button class="tab add" data-m="' + i + '" data-add="1">＋ 其他角度</button>' : '') + '</div>' : '';
        const r = m.v[m.active] || {};
        let body;
        if (r.loading) body = '<div class="typing">' + (isKid ? esc(C.kidCharacter) + '想一想' : '思考中') + '</div>';
        else if (r.error) body = '<div class="body"><p>' + esc(r.error) + '</p></div>';
        else body = '<div class="body">' + md(r.reply || '') + '</div><div class="foot">' + speakBtn(r.reply || '') + '</div>';
        let extra = '';
        const isLast = i === msgs.length - 1;
        if (!r.loading && !r.error && isLast) {
          if (isKid && r.level === 'urgent') extra += '<div class="notice urgent">這件事很重要，' + esc(kid.name) + '。要不要現在就去找爸爸媽媽說？<div style="margin-top:8px"><button class="btn danger" data-go="/kid/' + kid.id + '/help">找爸爸媽媽幫忙</button></div></div>';
          if (!isKid && r.level === 'urgent') extra += '<div class="notice urgent"><b>你的安全最重要。</b>請聯絡身邊信任的人，或撥打以下電話：' + hotlinesHtml() + '</div>';
          if (isKid && !paused && r.options && r.options.length) extra += '<div class="quick">' + r.options.map(o => '<button data-quick="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>';
        }
        return '<div style="display:flex;flex-direction:column;gap:10px"><div class="msg-ai">' + tabs + body + '</div>' + extra + '</div>';
      }).join('');

      let tail = '';
      if (paused) tail = '<div class="result center" style="margin-top:16px">' + esc(C.kidCharacter) + '有點累了，我們休息一下，下次再一起想吧！<div style="margin-top:12px"><button class="btn" data-go="/kid/' + kid.id + '/scenes">去玩情境卡</button><button class="btn ghost" data-go="/kid/' + kid.id + '">回到首頁</button></div></div>';
      else if (!isKid && msgs.length && !busy) tail = '<div style="margin-top:14px"><button class="btn ghost" id="saveAdult">' + (record ? '已存到我的紀錄 ✓' : '存到我的紀錄（只有家長密碼能看）') + '</button></div>';
      document.getElementById('tail').innerHTML = tail;
      const sa = document.getElementById('saveAdult');
      if (sa) sa.onclick = () => {
        if (!Secure.hasPassword()) { toast('請先到家長專區設定密碼'); return; }
        if (!record) record = { id: Store.uid(), type: 'adult-talk', time: Date.now(), level: 'normal' };
        record.messages = msgs.map(m => m.role === 'user' ? { role: 'user', text: m.text } : { role: 'ai', text: (m.v[m.active] || {}).reply || '' });
        record.summary = msgs[0].text.slice(0, 40);
        Store.saveRecord(record); draw(); toast('已儲存');
      };

      chat.querySelectorAll('[data-tab]').forEach(b => b.onclick = async () => {
        const m = msgs[+b.dataset.m]; m.active = b.dataset.tab; draw();
      });
      chat.querySelectorAll('[data-add]').forEach(b => b.onclick = () => pickExtra(+b.dataset.m));
      chat.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => send(b.dataset.quick));
      if (msgs.length) document.querySelector('.composer').scrollIntoView({ block: 'end', behavior: 'smooth' });
    }

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
    render(top('找爸爸媽媽幫忙', '/kid/' + kid.id) +
      '<div class="screen center"><div style="font-size:56px;margin-top:24px">🤗</div>' +
      '<h2 style="margin:8px 0 4px">你很勇敢</h2><p class="muted">有任何讓你不舒服、害怕、或想不通的事，<br>都可以跟爸爸媽媽說。這不是告狀，是在照顧自己。</p>' +
      '<div style="margin-top:28px" id="area">' +
      (hasHook ? '<button class="btn danger" id="call" style="font-size:17px;padding:16px">請爸爸媽媽來找我</button>' :
        '<div class="notice info">現在就去找爸爸媽媽，跟他們說：<br><b>「我需要你幫忙。」</b></div>') +
      '<button class="btn ghost" data-go="/kid/' + kid.id + '">回到首頁</button></div></div>');
    const call = document.getElementById('call');
    if (call) call.onclick = async () => {
      call.disabled = true; call.textContent = '傳送中…';
      Store.saveRecord({ id: Store.uid(), type: 'kid-help', kidId: kid.id, kidName: kid.name, time: Date.now(), level: 'urgent', summary: '按了「找爸爸媽媽幫忙」', notified: true });
      await Notify.helpButton(kid.name);
      call.outerHTML = '<div class="notice info pop">已經告訴爸爸媽媽了！<br>他們很快會來找你。你也可以直接去找他們喔。</div>';
    };
  }

  // ---------- 大人首頁 ----------
  function adultHome() {
    render(top('', '/') +
      '<div class="screen"><div class="buddy"><div class="buddy-face">🧭</div><div style="padding-top:4px"><b>遇到兩難了嗎？</b><br><span class="muted">很多事沒有標準答案，我們一起想清楚。</span></div></div>' +
      '<div style="height:12px"></div>' +
      '<button class="choice" data-go="/adult/talk"><span class="ic">✍️</span><span><div class="t">說出我的困境</div><div class="d">寫下或說出你正在猶豫的事</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/adult/scenes"><span class="ic" style="background:#faeeda">🎲</span><span><div class="t">情境練習</div><div class="d">從常見的兩難情境開始</div></span><span class="arrow">›</span></button>' +
      '<button class="choice" data-go="/parent"><span class="ic" style="background:#f1efe8">🔒</span><span><div class="t">家長專區</div><div class="d">孩子的紀錄、我的紀錄、設定</div></span><span class="arrow">›</span></button>' +
      '<p class="small muted center" style="margin-top:20px">對話內容只存在這支手機上，除非你選擇儲存。</p></div>');
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
      '<div class="screen"><p class="muted">第一次使用，請設定一組家長密碼（至少 4 位）。孩子的紀錄和設定都需要這組密碼才能看。</p>' +
      '<div class="notice privacy">請記好這組密碼。之後在你自己的手機上查看通知裡的紀錄，也要用同一組密碼。</div>' +
      '<div class="field"><label>密碼</label><input type="password" id="p1" class="pin" inputmode="numeric" autocomplete="new-password"></div>' +
      '<div class="field"><label>再輸入一次</label><input type="password" id="p2" class="pin" inputmode="numeric" autocomplete="new-password"><div class="err" id="err"></div></div>' +
      '<button class="btn" id="ok">設定</button></div>');
    document.getElementById('ok').onclick = async () => {
      const a = document.getElementById('p1').value, b = document.getElementById('p2').value;
      const err = document.getElementById('err');
      if (a.length < 4) return err.textContent = '至少 4 位';
      if (a !== b) return err.textContent = '兩次輸入不一樣';
      await Secure.setPassword(a);
      sessionStorage.setItem('lz_unlock', Date.now());
      toast('密碼設定好了'); go('/parent/settings');
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
      else { document.getElementById('err').textContent = '密碼不正確'; pw.value = ''; }
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
      (list.length ? list.map(r =>
        '<button class="rec" data-go="/parent/rec/' + r.id + '"><div class="row"><span>' + timeStr(r.time) + '</span><span class="badge ' + (r.level || 'normal') + '">' +
        (r.type === 'kid-scene' ? '情境練習' : r.type === 'kid-help' ? '找你幫忙' : levelName[r.level] || '紀錄') + '</span></div>' +
        '<div class="sum">' + esc(r.summary || (r.kidText || '').slice(0, 40) || '（沒有內容）') + '</div></button>').join('')
        : '<p class="muted center" style="margin-top:40px">還沒有紀錄</p>') +
      '<div style="margin-top:24px"><button class="btn ghost" id="lock">鎖定並離開</button></div></div>');
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
      (r.picks ? '<div class="label">孩子的選擇</div><div class="story" style="font-size:15px">' + r.picks.map(esc).join('<br>') + '</div>' : '') +
      (r.messages ? '<div class="label">對話內容</div><div class="chat">' + r.messages.map(m =>
        m.role === 'user' ? '<div class="msg-user">' + esc(m.text) + '</div>' : '<div class="msg-ai"><div class="body">' + md(m.text) + '</div></div>').join('') + '</div>' : '') +
      '<div style="margin-top:24px"><button class="btn danger" id="del">刪除這則紀錄</button></div></div>');
    document.getElementById('del').onclick = () => { if (confirmBox()) { Store.deleteRecord(id); go(back); } };
  }
  let delArmed = 0;
  function confirmBox() {
    if (Date.now() - delArmed < 4000) { delArmed = 0; return true; }
    delArmed = Date.now(); toast('再按一次確認刪除'); return false;
  }

  function parentSettings() {
    const s = Store.settings(); const kids = Store.kids();
    const hours = Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === +s.summaryHour ? ' selected' : '') + '>' + h + ':00</option>').join('');
    render(top('設定', '/parent') +
      '<div class="screen">' +
      '<div class="label">孩子</div><div id="kids">' + kids.map((k, i) =>
        '<div class="field" style="display:flex;gap:8px;align-items:center"><span class="avatar" style="background:' + k.color + ';width:36px;height:36px;font-size:15px">' + esc(k.name.slice(0, 1)) + '</span>' +
        '<input data-kid="' + i + '" value="' + esc(k.name) + '">' + (kids.length > 1 ? '<button class="small muted" data-rm="' + i + '">移除</button>' : '') + '</div>').join('') + '</div>' +
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

    function collect() {
      const k = Store.kids();
      document.querySelectorAll('[data-kid]').forEach(inp => { const v = inp.value.trim(); if (v) k[+inp.dataset.kid].name = v; });
      Store.setKids(k);
      const ns = Object.assign(Store.settings(), {
        apiKey: document.getElementById('key').value.trim(), webhook: document.getElementById('hook').value.trim(),
        notifyOn: document.getElementById('notifyOn').checked, summaryHour: +document.getElementById('hour').value
      });
      Store.saveSettings(ns);
    }
    document.getElementById('save').onclick = () => { collect(); toast('已儲存'); };
    document.getElementById('addKid').onclick = () => {
      collect(); const k = Store.kids(); const colors = ['#534AB7', '#D4537E', '#185FA5', '#BA7517'];
      k.push({ id: 'k' + Store.uid(), name: '孩子' + (k.length + 1), color: colors[k.length % colors.length] });
      Store.setKids(k); parentSettings();
    };
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      if (!confirmBox()) return;
      collect(); const k = Store.kids(); k.splice(+b.dataset.rm, 1); Store.setKids(k); parentSettings();
    });
    document.getElementById('testAI').onclick = async e => {
      collect(); e.target.textContent = '測試中…';
      try { await AI.test(); toast('AI 連線成功'); } catch (err) { toast(AI.errorText(err)); }
      e.target.textContent = '測試 AI 連線';
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
        document.getElementById('err').textContent = '密碼不正確，或連結不完整'; pw.value = '';
      }
    };
    document.getElementById('ok').onclick = ok;
    pw.onkeydown = e => { if (e.key === 'Enter') ok(); };
  }

  // ---------- 路由 ----------
  function route() {
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
      return kidHome(kid);
    }
    if (p[0] === 'adult') {
      if (p[1] === 'scenes') return sceneList('adult');
      if (p[1] === 'scene') return scenePlay('adult', null, p[2]);
      if (p[1] === 'talk') return talk('adult');
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
