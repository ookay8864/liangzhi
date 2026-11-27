// =============================================================
// 核心功能：資料儲存、加密、語音、通知
// 之後要改成雲端後台，只需要改 Store 和 Notify 這兩塊。
// =============================================================

// ---------- 資料儲存（目前存在這支手機） ----------
window.Store = (function () {
  const P = 'lz_';
  function get(k, d) {
    try { const v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function del(k) { try { localStorage.removeItem(P + k); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  return {
    get, set, del, uid,
    kids() { return get('kids', CONFIG.defaultKids); },
    setKids(v) { set('kids', v); },
    kid(id) { return this.kids().find(k => k.id === id); },
    settings() {
      return Object.assign({ apiKey: '', webhook: '', summaryHour: CONFIG.summaryHour, notifyOn: true,
        kidScript: 'hans', adultScript: 'hant', deviceMode: 'normal' }, get('settings', {}));
    },
    saveSettings(s) { set('settings', s); },
    records() { return get('records', []); },
    saveRecord(r) {
      const all = this.records();
      const i = all.findIndex(x => x.id === r.id);
      if (i >= 0) all[i] = r; else all.unshift(r);
      set('records', all.slice(0, 500));
    },
    deleteRecord(id) { set('records', this.records().filter(r => r.id !== id)); },
    stars(kidId) { return get('stars_' + kidId, 0); },
    // 加星星；每集滿 10 顆送一張特別貼紙，回傳 { stars, special }
    addStars(kidId, n) {
      const before = this.stars(kidId), v = before + n; set('stars_' + kidId, v);
      let special = null;
      if (Math.floor(v / 10) > Math.floor(before / 10)) special = this.addSticker(kidId, 'special');
      return { stars: v, special };
    },
    stickers(kidId) { return get('stickers_' + kidId, []); },
    addSticker(kidId, kind) {
      const have = this.stickers(kidId);
      const pool = STICKERS[kind].filter(s => !have.some(h => h.s === s));
      const s = (pool.length ? pool : STICKERS[kind])[Math.floor(Math.random() * (pool.length || STICKERS[kind].length))];
      have.push({ s, kind, time: Date.now() }); set('stickers_' + kidId, have);
      return s;
    },
    played(kidId) { return get('played_' + kidId, []); },
    markPlayed(kidId, sid) { const p = this.played(kidId); if (!p.includes(sid)) { p.push(sid); set('played_' + kidId, p); } },
    clearAll() {
      Object.keys(localStorage).filter(k => k.indexOf(P) === 0).forEach(k => localStorage.removeItem(k));
    }
  };
})();


// ---------- 文字：繁體／簡體、拼音 ----------
window.Lang = (function () {
  const D = window.ZH_DATA || { t2s: '', t2sp: {}, py: {}, pyp: {} };
  const T2S = {}; { const a = Array.from(D.t2s); for (let i = 0; i + 1 < a.length; i += 2) T2S[a[i]] = a[i + 1]; }
  const PY = {}; Object.keys(D.py).forEach(r => { for (const c of D.py[r]) PY[c] = r; });
  const TP = Object.keys(D.t2sp).sort((a, b) => b.length - a.length);
  const CJK = /[㐀-鿿]/;
  let zone = 'adult', kidPinyin = false;

  function script() { const s = Store.settings(); return zone === 'kid' ? s.kidScript : s.adultScript; }
  function conv(text) {
    if (!text || script() !== 'hans') return text;
    let t = String(text);
    for (const p of TP) if (t.indexOf(p) >= 0) t = t.split(p).join(D.t2sp[p]);
    let out = ''; for (const c of t) out += T2S[c] || c; return out;
  }
  function pinyinFrag(text) {
    const frag = document.createDocumentFragment();
    const chars = Array.from(text); let buf = '';
    const flush = () => { if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; } };
    for (let i = 0; i < chars.length;) {
      if (!CJK.test(chars[i])) { buf += chars[i++]; continue; }
      flush();
      let reads = null, len = 1;
      for (let L = 3; L >= 2; L--) {
        const w = chars.slice(i, i + L).join('');
        if (w.length === L && D.pyp[w]) { reads = D.pyp[w].split(' '); len = L; break; }
      }
      for (let k = 0; k < len; k++) {
        const c = chars[i + k], r = reads ? reads[k] : PY[c] || PY[T2S[c]] || '';
        const ruby = document.createElement('ruby'); ruby.textContent = c;
        const rt = document.createElement('rt'); rt.textContent = r; ruby.appendChild(rt);
        frag.appendChild(ruby);
      }
      i += len;
    }
    flush(); return frag;
  }
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, RT: 1, RUBY: 1, svg: 1, SVG: 1 };
  function localize(root) {
    if (!root) return;
    const hans = script() === 'hans', py = zone === 'kid' && kidPinyin;
    if (!hans && !py) return;
    if (root.nodeType === 1) {
      root.querySelectorAll && root.querySelectorAll('[placeholder]').forEach(el => {
        const v = conv(el.getAttribute('placeholder')); if (v !== el.getAttribute('placeholder')) el.setAttribute('placeholder', v);
      });
    }
    const nodes = [];
    if (root.nodeType === 3) nodes.push(root);
    else {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          for (let p = n.parentNode; p && p !== document.body; p = p.parentNode) {
            if (SKIP[p.nodeName] || (p.classList && (p.classList.contains('lzpy') || p.classList.contains('no-py')))) return NodeFilter.FILTER_REJECT;
          }
          return CJK.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      while (w.nextNode()) nodes.push(w.currentNode);
    }
    nodes.forEach(n => {
      if (!n.parentNode) return;
      const t = conv(n.nodeValue);
      if (py) {
        const span = document.createElement('span'); span.className = 'lzpy';
        span.appendChild(pinyinFrag(t)); n.parentNode.replaceChild(span, n);
      } else if (t !== n.nodeValue) n.nodeValue = t;
    });
  }
  return {
    conv, localize,
    setZone(z, pinyin) { zone = z; kidPinyin = !!pinyin; document.body.dataset.zone = z; document.body.classList.toggle('pinyin', z === 'kid' && !!pinyin); },
    zone() { return zone; },
    script,
    speechLang() { return script() === 'hans' ? 'zh-CN' : 'zh-TW'; },
    observe(el) {
      new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.classList.contains('lzpy')) return;
        if (n.nodeType === 3 && n.parentNode && n.parentNode.closest && n.parentNode.closest('.lzpy,textarea,rt')) return;
        localize(n);
      }))).observe(el, { childList: true, subtree: true });
    }
  };
})();

// ---------- 加密（家長密碼保護紀錄） ----------
window.Secure = (function () {
  const enc = new TextEncoder(), dec = new TextDecoder();
  function b64(buf) {
    let s = ''; const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const s = atob(str); const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  async function pbkdf2(password, salt, bits) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, base, bits));
  }
  async function compress(bytes) {
    if (typeof CompressionStream === 'undefined') return { data: bytes, z: 0 };
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return { data: new Uint8Array(await new Response(cs).arrayBuffer()), z: 1 };
  }
  async function decompress(bytes) {
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }

  return {
    available() { return !!(window.crypto && crypto.subtle); },
    hasPassword() { return !!Store.get('pw', null); },
    // 設定密碼：存驗證用雜湊，以及加密用的金鑰（不存密碼本身）
    async setPassword(pw) {
      const vSalt = crypto.getRandomValues(new Uint8Array(16));
      const kSalt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await pbkdf2(pw, vSalt, 256);
      const key = await pbkdf2(pw, kSalt, 256);
      Store.set('pw', { s: b64(vSalt), h: b64(hash), ks: b64(kSalt), k: b64(key), len: pw.length });
    },
    async check(pw) {
      const p = Store.get('pw', null); if (!p) return false;
      const hash = await pbkdf2(pw, unb64(p.s), 256);
      const ok = b64(hash) === p.h;
      if (ok && !p.len) { p.len = pw.length; Store.set('pw', p); }
      return ok;
    },
    pinLength() { const p = Store.get('pw', null); return p && p.len ? p.len : 0; },
    // 用這支手機存的金鑰加密，產生可放進連結的字串
    async seal(obj) {
      const p = Store.get('pw', null); if (!p) return null;
      const key = await crypto.subtle.importKey('raw', unb64(p.k), 'AES-GCM', false, ['encrypt']);
      const c = await compress(enc.encode(JSON.stringify(obj)));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, c.data));
      return c.z + '.' + p.ks + '.' + b64(iv) + '.' + b64(ct);
    },
    // 在家長自己的手機上，用密碼解開
    async open(token, pw) {
      const [z, ks, iv, ct] = token.split('.');
      const raw = await pbkdf2(pw, unb64(ks), 256);
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      let pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)));
      if (z === '1') pt = await decompress(pt);
      return JSON.parse(dec.decode(pt));
    }
  };
})();

// ---------- 語音：只有按了才念，絕不自動播放 ----------
window.Voice = (function () {
  let current = null;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    const L = Lang.speechLang();
    return vs.find(v => v.lang === L) || vs.find(v => v.lang.replace('_', '-') === L) || vs.find(v => /^zh/i.test(v.lang)) || null;
  }
  return {
    canSpeak: 'speechSynthesis' in window,
    canListen: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    speak(text, btn) {
      if (!this.canSpeak) return;
      if (current === btn) { this.stop(); return; }
      this.stop();
      const u = new SpeechSynthesisUtterance(Lang.conv(text).replace(/[*#>]/g, ''));
      u.lang = Lang.speechLang(); const v = pickVoice(); if (v) u.voice = v;
      u.rate = 0.95;
      u.onend = u.onerror = () => { if (btn) btn.classList.remove('playing'); current = null; };
      current = btn; if (btn) btn.classList.add('playing');
      speechSynthesis.speak(u);
    },
    stop() {
      if (this.canSpeak) speechSynthesis.cancel();
      document.querySelectorAll('.speak.playing').forEach(b => b.classList.remove('playing'));
      current = null;
    },
    listen(onText, onEnd) {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) return null;
      const r = new R(); r.lang = Lang.speechLang(); r.interimResults = true; r.continuous = false;
      let finalText = '';
      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
        }
        onText(finalText, interim);
      };
      r.onerror = () => onEnd(true);
      r.onend = () => onEnd(false);
      try { r.start(); } catch (e) { onEnd(true); return null; }
      return r;
    }
  };
})();

// ---------- 通知：企業微信消息推送 ----------
window.Notify = (function () {
  const LIMIT = 3800; // 企業微信 markdown 上限約 4096 位元組
  function bytes(s) { return new TextEncoder().encode(s).length; }
  async function post(content) {
    const s = Store.settings();
    if (!s.webhook || !s.notifyOn) return false;
    try {
      // 用 no-cors 從網頁直接送出（不讀取回應）
      await fetch(s.webhook, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }) });
      return true;
    } catch (e) { return false; }
  }
  async function linkFor(record) {
    const token = await Secure.seal({
      kid: record.kidName, t: record.time, level: record.level, summary: record.summary || '',
      tip: record.parentTip || '', text: (record.kidText || '').slice(0, 500)
    });
    if (!token) return null;
    return location.origin + location.pathname + '#/view?d=' + token;
  }
  function timeStr(t) {
    const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  return {
    post,
    // 第 1 級：立刻通知
    async urgent(record) {
      const link = await linkFor(record);
      let c = '**【需要關心】' + record.kidName + ' 有一則新紀錄**\n> ' + timeStr(record.time);
      if (link) c += '\n[點這裡查看（需要家長密碼）](' + link + ')';
      const ok = await post(c);
      if (ok) { record.notified = true; Store.saveRecord(record); }
      return ok;
    },
    async helpButton(kidName) {
      return post('**【找你幫忙】' + kidName + ' 按了「找爸爸媽媽幫忙」**\n> 他現在可能想跟你聊聊。');
    },
    // 第 2 級：每日摘要（打開網站時檢查，到了設定時間就送）
    async dailyIfDue(force) {
      const s = Store.settings();
      if (!s.webhook || !s.notifyOn) return false;
      const now = new Date(); const today = now.toDateString();
      if (!force && (now.getHours() < s.summaryHour || Store.get('lastSummary', '') === today)) return false;
      const pending = Store.records().filter(r => r.type === 'kid-talk' && !r.notified && !r.inSummary);
      if (!pending.length) { if (!force) Store.set('lastSummary', today); return false; }
      const counts = {};
      pending.forEach(r => { counts[r.kidName] = (counts[r.kidName] || 0) + 1; });
      let msg = '**今日小結**\n> ' + Object.keys(counts).map(n => n + ' ' + counts[n] + ' 則').join('，') + '\n';
      const msgs = [];
      for (const r of pending) {
        const link = await linkFor(r);
        const line = '\n- ' + r.kidName + ' ' + timeStr(r.time) + (link ? ' [查看](' + link + ')' : '');
        if (bytes(msg + line) > LIMIT) { msgs.push(msg); msg = '**今日小結（續）**\n'; }
        msg += line;
      }
      msgs.push(msg);
      let ok = true;
      for (const m of msgs) ok = (await post(m)) && ok;
      if (ok) {
        pending.forEach(r => { r.inSummary = true; Store.saveRecord(r); });
        Store.set('lastSummary', today);
      }
      return ok;
    }
  };
})();
