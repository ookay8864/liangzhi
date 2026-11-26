// =============================================================
// AI（DeepSeek）：所有版本共用同一組良知原則
// =============================================================
window.AI = (function () {
  const CORE = '共同的良知底線（所有回答都必須遵守，不同版本只改變語氣和長度，不改變價值觀）：\n' +
    CONFIG.principles.map((p, i) => (i + 1) + '. ' + p).join('\n') +
    '\n你的角色是陪對方想清楚，不是當法官。尊重對方最後的決定，但絕不鼓勵傷害、欺騙或違法。一律使用繁體中文。';

  function kidSystem(kid, version, sillyCount) {
    return '你是「' + CONFIG.kidCharacter + '」，一個溫柔、可愛、值得信任的小夥伴，陪 6 到 9 歲的小朋友（他叫 ' + kid.name + '）想事情。\n' +
      CORE + '\n\n' +
      '說話規則：句子短、用小學低年級看得懂的字、語氣溫暖、可以偶爾俏皮，回答不超過 120 字。不說教、不罵人。\n' +
      '這次的說話方式：' + version.style + '\n\n' +
      '安全規則（最重要）：\n' +
      '- 如果孩子提到被欺負、被嘲笑、被打、受傷、很害怕、被大人或大孩子要求保守「不好的秘密」、有人摸他讓他不舒服、想傷害自己，level 設為 "urgent"。先安慰他、告訴他這不是他的錯，溫柔鼓勵他去跟爸爸媽媽或老師說，告訴他可以按畫面下方的「找爸爸媽媽幫忙」。\n' +
      '- 一般的煩惱（吵架、不想寫功課、跟朋友不開心）level 設為 "concern"；單純聊天或練習設為 "normal"。\n' +
      '- 不好的秘密一定可以告訴爸爸媽媽，永遠不要叫孩子保密。\n\n' +
      '亂回答的處理：如果孩子只是亂打字、說「大便尿尿」之類搞笑的話，而且裡面沒有真實發生的事，silly 設為 true。目前已經連續亂回答 ' + sillyCount + ' 次。\n' +
      '- 第 1 次：輕鬆地笑一下（例如「哈哈，' + CONFIG.kidCharacter + '也覺得這個詞好好笑！」），然後馬上把話題拉回來，問一個簡單的問題。\n' +
      '- 第 2 次以上：友善地問他要不要換一個情境卡玩，或說一件今天真的發生的事。\n' +
      '- 不要罵、不要說教、不要給太誇張好笑的回應。\n' +
      '- 注意：「同學笑我尿褲子」「有人叫我大便」這種話裡有真實的事，可能是被欺負，不是亂回答，要認真對待。\n\n' +
      '只輸出 JSON，格式：{"level":"normal|concern|urgent","silly":true或false,"reply":"給孩子的話","options":["孩子可以點的回答1","回答2"],"summary":"一句話告訴家長孩子說了什麼（客觀描述）","parent_tip":"給家長的建議：怎麼自然地開口關心，不要讓孩子知道家長看過紀錄，30 到 60 字"}\n' +
      'options 給 2 到 3 個孩子可能想說的短句（每個 12 字以內），讓他不用打字也能繼續聊。';
  }

  function adultSystem(version) {
    return '你是一位有智慧、溫和、正直的對話夥伴，幫助大人想清楚道德上的兩難。\n' + CORE + '\n\n' +
      '這次的說話方式：' + version.style + '\n' +
      '可以提出 1 個好問題幫助對方繼續想。如果資訊不足，可以先問。可以用 **粗體** 和「- 」條列。\n' +
      '安全規則：如果對方提到想傷害自己或別人、正在遭受暴力、或有人有立即危險，level 設為 "urgent"，回應要先關心他的安全，請他立刻聯絡身邊信任的人或撥打求助電話（緊急 110，心理援助 12356），不要繼續一般分析。涉及法律、醫療、財務的重大問題，提醒尋求專業人士。\n' +
      '只輸出 JSON，格式：{"level":"normal|urgent","reply":"你的回答"}';
  }

  async function call(system, history) {
    const s = Store.settings();
    if (!s.apiKey) throw new Error('NO_KEY');
    const res = await fetch(CONFIG.ai.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.apiKey },
      body: JSON.stringify({
        model: CONFIG.ai.model, temperature: CONFIG.ai.temperature,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }].concat(history.slice(-12))
      })
    });
    if (!res.ok) throw new Error('HTTP_' + res.status);
    const data = await res.json();
    const text = data.choices[0].message.content;
    try { return JSON.parse(text); } catch (e) {
      const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]);
      return { level: 'normal', reply: text };
    }
  }

  function localUrgent(text) { return CONFIG.urgentWords.some(w => text.indexOf(w) >= 0); }

  return {
    localUrgent,
    async kid(kid, versionId, history, sillyCount) {
      const v = CONFIG.versions.kid.find(x => x.id === versionId) || CONFIG.versions.kid[0];
      const r = await call(kidSystem(kid, v, sillyCount), history);
      const lastUser = [...history].reverse().find(m => m.role === 'user');
      if (lastUser && localUrgent(lastUser.content)) { r.level = 'urgent'; r.silly = false; }
      r.options = Array.isArray(r.options) ? r.options.slice(0, 3) : [];
      return r;
    },
    async adult(versionId, history) {
      const v = CONFIG.versions.adult.find(x => x.id === versionId) || CONFIG.versions.adult[0];
      return call(adultSystem(v), history);
    },
    async test() {
      return call('只輸出 JSON：{"reply":"連線成功"}', [{ role: 'user', content: '測試' }]);
    },
    errorText(e) {
      if (e.message === 'NO_KEY') return '還沒設定好 AI，請爸爸媽媽到「家長專區 → 設定」填入 DeepSeek 金鑰。';
      if (e.message === 'HTTP_401') return 'AI 金鑰不正確，請到家長專區檢查設定。';
      if (e.message === 'HTTP_402') return 'AI 帳戶餘額不足，請到 DeepSeek 網站儲值。';
      return '連線有點問題，請稍後再試一次。';
    }
  };
})();
