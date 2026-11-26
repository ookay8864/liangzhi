// =============================================================
// AI（DeepSeek）：所有版本共用同一組良知原則
// =============================================================
window.AI = (function () {
  function scriptRule(zone) {
    const s = Store.settings();
    const hans = (zone === 'kid' ? s.kidScript : s.adultScript) === 'hans';
    return hans ? '一律使用簡體中文。' : '一律使用繁體中文。';
  }
  function core(zone) {
    return '共同的良知底線（所有回答都必須遵守，不同版本只改變語氣和長度，不改變價值觀）：\n' +
      CONFIG.principles.map((p, i) => (i + 1) + '. ' + p).join('\n') +
      '\n你的角色是陪對方想清楚，不是當法官。尊重對方最後的決定，但絕不鼓勵傷害、欺騙或違法。' + scriptRule(zone);
  }
  const NAME = CONFIG.kidCharacter;

  const KID_SAFETY =
    '安全規則（最重要）：\n' +
    '- 如果孩子提到被欺負、被嘲笑、被打、受傷、很害怕、被大人或大孩子要求保守「不好的秘密」、有人摸他讓他不舒服、想傷害自己，level 設為 "urgent"。先安慰他、告訴他這不是他的錯，溫柔鼓勵他去跟爸爸媽媽或老師說，告訴他可以按畫面下方的「找爸爸媽媽幫忙」。\n' +
    '- 一般的煩惱（吵架、不想寫功課、跟朋友不開心）level 設為 "concern"；單純聊天或練習設為 "normal"。\n' +
    '- 不好的秘密一定可以告訴爸爸媽媽，永遠不要叫孩子保密。\n\n';
  function sillyRule(n) {
    return '亂回答的處理：如果孩子只是亂打字、說「大便尿尿」之類搞笑的話，而且裡面沒有真實發生的事，silly 設為 true。目前已經連續亂回答 ' + n + ' 次。\n' +
      '- 第 1 次：輕鬆地笑一下（例如「哈哈，' + NAME + '也覺得這個詞好好笑！」），然後馬上把話題拉回來。\n' +
      '- 第 2 次以上：友善地問他要不要換一個情境卡玩，或說一件今天真的發生的事。\n' +
      '- 不要罵、不要說教、不要給太誇張好笑的回應。\n' +
      '- 注意：「同學笑我尿褲子」「有人叫我大便」這種話裡有真實的事，可能是被欺負，不是亂回答，要認真對待。\n\n';
  }
  const KID_STYLE = '說話規則：句子短、用小學低年級看得懂的字、語氣溫暖、可以偶爾俏皮。不說教、不罵人。\n';

  function kidSystem(kid, version, sillyCount) {
    return '你是「' + NAME + '」，一個圓圓的小羅盤，溫柔、可愛、值得信任，陪 6 到 9 歲的小朋友（他叫 ' + kid.name + '）想事情。\n' +
      core('kid') + '\n\n' + KID_STYLE + '回答不超過 120 字。\n這次的說話方式：' + version.style + '\n\n' + KID_SAFETY + sillyRule(sillyCount) +
      '只輸出 JSON 物件，reply 一定要有內容。格式：{"level":"normal|concern|urgent","silly":true或false,"reply":"給孩子的話","options":["孩子可以點的回答1","回答2"],"summary":"一句話告訴家長孩子說了什麼（客觀描述）","parent_tip":"給家長的建議：怎麼自然地開口關心，不要讓孩子知道家長看過紀錄，30 到 60 字"}\n' +
      '如果孩子表示要結束（例如「拜拜」「好了」「沒有了」「我要去玩了」），closing 設為 true，reply 改成溫暖的道別：誇他今天願意說出來很勇敢，並提醒他也可以跟爸爸媽媽說說。\n' +
      'JSON 另外加上 "closing":true或false。\n' +
      'options 給 2 到 3 個孩子可能想說的短句（每個 12 字以內），讓他不用打字也能繼續聊。summary 和 parent_tip 用繁體中文。';
  }

  function adultSystem(version) {
    return '你是使用者一位睿智、真誠、說話直接的老朋友，幫他想清楚生活中的兩難。\n' + core('adult') + '\n\n' +
      '說話方式（所有回答都要做到）：\n' +
      '- 像朋友聊天一樣用口語，不要像客服或老師。不說「我理解你的感受」「這是一個很好的問題」這類套話，不重複對方說過的話。\n' +
      '- 一針見血：找出他話裡真正卡住的核心（常常不是表面的問題），直接點出來。\n' +
      '- 每次只問一個問題，而且是能幫他看清自己的關鍵問題。\n' +
      '- 要能解決問題：給具體、現在就能做的建議，不給空泛的大道理。\n' +
      '- 自然地幫他換位思考：想想對方的感受和立場。\n' +
      '這次的回答長度和風格：' + version.style + '\n\n' +
      '安全規則：如果對方提到想傷害自己或別人、正在遭受暴力、或有人有立即危險，level 設為 "urgent"，回應要先關心他的安全，請他立刻聯絡身邊信任的人或撥打求助電話（緊急 110，心理援助 12356），不要繼續一般分析。涉及法律、醫療、財務的重大問題，提醒尋求專業人士。\n\n' +
      '結束與繞圈：\n' +
      '- 如果使用者表示要結束（例如「好，我知道了」「謝謝」「就這樣吧」「我想想」），closing 設為 true，reply 改成溫暖的收尾：具體肯定他這次想清楚的地方（1 句）、提醒一個可以先做的小行動（1 句）、最後一句「想到什麼隨時再回來聊」。\n' +
      '- 如果對話明顯在同一個問題上反覆打轉（同樣的擔心或問題已經出現 3 次以上），looping 設為 true，在 reply 裡溫和地說出「我們好像在同一個地方打轉了」，並點出卡住的那一點。\n\n' +
      '只輸出 JSON 物件，不要有其他文字。格式範例：{"level":"normal","reply":"你的回答寫在這裡","options":["我比較在意他的感受","如果他不改呢？"],"closing":false,"looping":false}\n' +
      'reply 一定要有內容。options 給 2 個使用者可能想接著說或問的短句（每個 15 字以內，用第一人稱）。';
  }

  function summarySystem(kind, kid) {
    if (kind === 'kid') {
      return '你是「' + NAME + '」，一個圓圓的小羅盤。請把剛才和小朋友（' + kid.name + '）的對話，整理成一張給 6 到 9 歲孩子看的小卡片。' + core('kid') + '\n' + KID_STYLE +
        '只輸出 JSON：{"happened":"發生了什麼事（1 到 2 句）","feelings":[{"who":"","mood":"happy|sad|worried|angry|calm|proud|scared|surprised","text":"2 到 6 字"}],"cando":["我可以怎麼做（2 到 3 個，每個 15 字以內）"],"encourage":"一句溫暖的鼓勵，並溫柔提醒也可以跟爸爸媽媽說說"}';
    }
    return '請把剛才的對話整理成一份清楚的思考小結，幫助使用者看清自己的想法。' + core('adult') + '\n' +
      '只輸出 JSON：{"dilemma":"核心的兩難（1 句）","values":["使用者在乎的價值（2 到 4 個短詞）"],"options":[{"name":"選擇","pros":"好處","cons":"代價"}],"leaning":"從對話看，他目前比較傾向哪一邊（如果看不出來就說還在考慮）","next":"一個具體的下一步建議"}';
  }

  // 情境卡的 D 選項：使用者自己寫的答案
  function sceneSystem(kind, kid, sillyCount) {
    const feelRule = '"feelings" 列出這個做法會影響的 2 個人（包含「你」）和他們的心情，mood 只能是 happy sad worried angry calm proud scared surprised 其中之一，text 是 2 到 6 個字的心情描述。';
    if (kind === 'kid') {
      return '你是「' + NAME + '」，一個圓圓的小羅盤，陪 6 到 9 歲的小朋友（他叫 ' + kid.name + '）玩情境卡。孩子沒有選 A、B、C，而是自己想了一個做法。\n' +
        core('kid') + '\n\n' + KID_STYLE + '不要判斷對或錯。\n' +
        '"praise"：先具體肯定他自己動腦想（15 字以內）。\n"result"：用 1 到 2 句說說這樣做接下來可能會發生什麼（誠實但溫和）。\n' + feelRule + '\n"think"：問他一個簡單的問題，想想別人的感受。\n\n' +
        KID_SAFETY + sillyRule(sillyCount) +
        '只輸出 JSON：{"level":"normal|concern|urgent","silly":true或false,"praise":"","result":"","feelings":[{"who":"","mood":"","text":""}],"think":"","summary":"一句話告訴家長（繁體中文）","parent_tip":"給家長的開口建議（繁體中文，只有 level 不是 normal 時才需要）"}';
    }
    return '你是一位有智慧、正直的對話夥伴。使用者在一個道德兩難情境中，沒有選擇提供的選項，而是寫了自己的做法。\n' + core('adult') + '\n\n' +
      '不要評判對錯。"praise"：一句話點出這個做法的出發點（20 字以內）。"result"：2 到 3 句分析可能的後果和取捨。' + feelRule + ' "think"：提出一個值得再想的問題。\n' +
      '如果內容涉及有人有立即危險，level 設為 "urgent"。\n只輸出 JSON：{"level":"normal|urgent","praise":"","result":"","feelings":[{"who":"","mood":"","text":""}],"think":""}';
  }

  // 從 AI 回應裡找出文字：先找 reply，再找其他字串欄位
  function pickText(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (typeof obj.reply === 'string' && obj.reply.trim()) return obj.reply;
    let best = '';
    Object.keys(obj).forEach(k => {
      const v = obj[k];
      if (typeof v === 'string' && !/^(level|silly|summary|parent_tip)$/.test(k) && v.length > best.length) best = v;
    });
    return best;
  }
  async function request(system, history, json) {
    const s = Store.settings();
    if (!s.apiKey) throw new Error('NO_KEY');
    const body = {
      model: CONFIG.ai.model, temperature: CONFIG.ai.temperature, max_tokens: 2000,
      messages: [{ role: 'system', content: system }].concat(history.slice(-12))
    };
    if (json) body.response_format = { type: 'json_object' };
    const res = await fetch(CONFIG.ai.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.apiKey }, body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP_' + res.status);
    const data = await res.json();
    const text = ((data.choices || [])[0] || {}).message ? data.choices[0].message.content || '' : '';
    if (!text.trim()) return null;
    try { return JSON.parse(text); } catch (e) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
      return { level: 'normal', reply: text.trim() };
    }
  }
  // needReply：需要有 reply 文字的回答（對話），空的就自動再試一次
  async function call(system, history, needReply) {
    let r = await request(system, history, true);
    if (needReply) {
      if (r && !r.reply) r.reply = pickText(r);
      if (!r || !r.reply) {
        r = await request(system, history, false);
        if (r && !r.reply) r.reply = pickText(r);
      }
      if (!r || !r.reply) throw new Error('EMPTY');
    } else if (!r) {
      r = await request(system, history, true);
      if (!r) throw new Error('EMPTY');
    }
    return r;
  }

  function localUrgent(text) { return CONFIG.urgentWords.some(w => text.indexOf(w) >= 0 || text.indexOf(Lang.conv(w)) >= 0); }

  return {
    localUrgent,
    async kid(kid, versionId, history, sillyCount) {
      const v = CONFIG.versions.kid.find(x => x.id === versionId) || CONFIG.versions.kid[0];
      const r = await call(kidSystem(kid, v, sillyCount), history, true);
      const lastUser = [...history].reverse().find(m => m.role === 'user');
      if (lastUser && localUrgent(lastUser.content)) { r.level = 'urgent'; r.silly = false; }
      r.options = Array.isArray(r.options) ? r.options.slice(0, 3) : [];
      return r;
    },
    async adult(versionId, history) {
      const v = CONFIG.versions.adult.find(x => x.id === versionId) || CONFIG.versions.adult[0];
      const r = await call(adultSystem(v), history, true);
      r.options = Array.isArray(r.options) ? r.options.slice(0, 3) : [];
      return r;
    },
    async sceneOwn(kind, kid, step, answer, sillyCount) {
      const msg = '情境：' + step.story + '\n問題：' + step.question + '\n提供的選項：' + step.options.map(o => o.text).join('／') + '\n我自己的做法：' + answer;
      const r = await call(sceneSystem(kind, kid, sillyCount), [{ role: 'user', content: msg }]);
      if (localUrgent(answer)) { r.level = 'urgent'; r.silly = false; }
      r.feelings = Array.isArray(r.feelings) ? r.feelings.slice(0, 3) : [];
      return r;
    },
    async summary(kind, kid, history) {
      const h = history.concat([{ role: 'user', content: '請幫我整理一下剛才想到的。' }]);
      const r = await call(summarySystem(kind, kid), h);
      r.feelings = Array.isArray(r.feelings) ? r.feelings.slice(0, 3) : [];
      return r;
    },
    async test() {
      return call('只輸出 JSON：{"reply":"連線成功"}', [{ role: 'user', content: '測試' }]);
    },
    errorText(e) {
      if (e.message === 'NO_KEY') return '還沒設定好 AI，請爸爸媽媽到「家長專區 → 設定」填入 DeepSeek 金鑰。';
      if (e.message === 'HTTP_401') return 'AI 金鑰不正確，請到家長專區檢查設定。';
      if (e.message === 'HTTP_402') return 'AI 帳戶餘額不足，請到 DeepSeek 網站儲值。';
      if (e.message === 'EMPTY') return '這次沒有回應成功，請按「重試」。';
      return '連線有點問題，請按「重試」再試一次。';
    }
  };
})();
