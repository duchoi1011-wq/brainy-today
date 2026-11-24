/* Brainy 대화창 공통 부품 — 세 앱(Brainy 홈 · 맥 단축키 · 체화 단어장)이 같이 쓴다 (2026-11-24 동욱 "전반적인 수정은 다 같이 포함되게")
   · 맥 단축키 · 체화 단어장(+ 콘텐츠 기획): build.py 가 brainy-chat.js 바로 앞에 붙인다 → brainy-chat.js 가 이 부품을 쓴다
   · Brainy 홈: 대화창이 따로라 원본의 /*@include brainy-parts.js*\/ 자리에 끼워 같은 부품을 쓴다
   여기를 고치면 세 앱에 같이 들어간다. 앱 하나만 다르게 할 땐 그 앱의 BRAINY_HOOK 으로 끈다.
   window.BRAINY_PARTS = {
     FAMILY 세 앱 key · inFamily(key)
     MODELS 답할 모델 [값, 이름, 모델] — 값은 config/ai 의 model (Brainy 홈 상자 · set_model 과 같은 곳, 세 앱이 같이 본다)
     modelRow(cur, enabled) 모델 버튼 줄 HTML (data-bp-model) · MODEL_NOTE 줄 아래 안내
     watchModel(db, cb) 고른 모델 받기 · setModel(db, value) 고르기
     VAULT_NOTE 노트 쓰기 안내 · fixAsk(o) 「✦ Brainy에게 고치기 맡기기」가 보낼 부탁 글 } */
(function () {
  if (window.BRAINY_PARTS) return;
  var FAMILY = ["home", "shortcuts", "vocab"];
  var MODELS = [["auto", "자동", "auto"], ["claude-haiku-5-5", "빠름", "Haiku"], ["claude-sonnet-5-5", "기본", "Sonnet"], ["claude-opus-5-5", "깊게", "Opus"], ["claude-fable-5-1", "최고", "Fable"]];
  var MODEL_NOTE = "고른 모델은 다음 질문부터 적용돼요 · Brainy 홈 · 맥 단축키 · 체화 단어장이 같이 써요 (짧은 일은 늘 Haiku)";
  var VAULT_NOTE = "노트 쓰기·고치기는 지금 바로 돼요 (맥이 켜져 있으면 몇 초 안에 옵시디언 볼트에 들어가요).";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* 색은 앱의 --g-* 를 따른다 (없으면 기본값) */
  var css = document.createElement("style");
  css.textContent =
    ".bp-models{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;border-bottom:1px solid var(--g-line,rgba(0,0,0,.1));background:var(--g-card,#fff);min-width:0}" +
    ".bp-m{flex:1;min-width:0;min-height:44px;padding:4px 2px;border:1px solid var(--g-line,rgba(0,0,0,.1));border-radius:12px;background:var(--g-bg,#fff);color:var(--g-fg,#16181d);font:inherit;line-height:1.2;display:grid;place-content:center;text-align:center;cursor:pointer}" +
    ".bp-m b{display:block;font-size:13.5px;white-space:nowrap}.bp-m small{display:block;font-size:11px;color:var(--g-mut,#6b7280)}" +
    ".bp-m:hover{border-color:var(--g-acc,#2f6f5e)}.bp-m:disabled{opacity:.5;cursor:default}" +
    ".bp-m[aria-pressed=true]{background:var(--g-acc,#2f6f5e);border-color:var(--g-acc,#2f6f5e);color:var(--g-acc-ink,#fff)}.bp-m[aria-pressed=true] small{color:inherit;opacity:.85}" +
    ".bp-mnote{flex-basis:100%;margin:2px 2px 0;font-size:11.5px;line-height:1.4;color:var(--g-mut,#6b7280)}";
  document.head.appendChild(css);

  function known(v) { return MODELS.some(function (m) { return m[0] === v; }) ? v : "auto"; }
  function modelRow(cur, enabled) {
    cur = known(cur);
    return MODELS.map(function (m) {
      var on = m[0] === cur;
      return '<button type="button" class="bp-m" data-bp-model="' + m[0] + '" aria-pressed="' + on + '"' + (enabled ? "" : " disabled") +
        ' title="' + esc(m[1] + " · " + m[2] + (on ? " — 지금 이 모델로 답해요" : " — 누르면 다음 질문부터")) + '"><b>' + (on ? "✓ " : "") + m[1] + "</b><small>" + m[2] + "</small></button>";
    }).join("") + '<p class="bp-mnote">' + esc(MODEL_NOTE) + "</p>";
  }
  function watchModel(db, cb) { return db.doc("config/ai").onSnapshot(function (s) { cb(known((s.exists && s.data().model) || "auto")); }, function () {}); }
  function setModel(db, v) { return db.doc("config/ai").set({ model: known(v), at: new Date().toISOString() }).catch(function () {}); }

  /* 「✦ Brainy에게 고치기 맡기기」 — 앱에 표시해 둔 고칠 것들을 한 번에 Brainy 에게 맡긴다.
     o = { app 앱 이름, what 고칠 것 이름(예: 단축키), items [{name, note}], source 정본 노트 설명, clearTool 다 고친 뒤 표시를 풀 앱 도구 이름 }
     Brainy 는 vault_read 로 정본을 읽고 vault_write 로 노트(페이지)를 고치거나 새로 만든다 → 맥의 동기화가 앱 데이터로 다시 올린다 */
  function fixAsk(o) {
    var items = (o.items || []).slice(0, 40);
    return o.app + " 앱: 내가 고칠 " + o.what + "로 표시해 둔 " + items.length + "개를 고쳐 줘.\n" +
      items.map(function (x, i) { return (i + 1) + ". " + x.name + (x.note ? " — " + x.note : " — (적은 글 없음: 틀린 곳·중복·너무 기본적인 설명이 있는지 살펴봐 줘)"); }).join("\n") +
      "\n\n고치는 법: vault_read 로 정본 노트(" + o.source + ")와 관련 위키 페이지를 먼저 읽고, vault_write 로 바꿀 곳만 고쳐 줘(patch 먼저). 필요한 페이지가 없으면 새로 만들어도 돼. " +
      "중복이면 한쪽만 남기고, 확실하지 않은 건 고치지 말고 물어봐 줘. 다 고친 뒤 무엇을 고쳤는지 한 줄씩 알려 주고" + (o.clearTool ? ", 고친 것은 " + o.clearTool + " 로 표시를 풀어 줘." : ".");
  }

  window.BRAINY_PARTS = {
    FAMILY: FAMILY, inFamily: function (k) { return FAMILY.indexOf(k) >= 0; },
    MODELS: MODELS, MODEL_NOTE: MODEL_NOTE, VAULT_NOTE: VAULT_NOTE,
    modelRow: modelRow, watchModel: watchModel, setModel: setModel, fixAsk: fixAsk, esc: esc
  };
})();
