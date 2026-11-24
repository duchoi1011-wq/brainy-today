/* Brainy 공통 부품 — 모든 앱(Brainy 홈 · 맥 단축키 · 체화 단어장 · 콘텐츠 기획)이 같이 쓴다. 여기 한 곳만 고치면 모든 앱이 바뀐다 (2026-11-24 동욱).
   원본 html 의 앱 스크립트 바로 앞, 이 파일을 끼우는 include 자리에 들어간다 → 앱 코드와 대화창(brainy-chat.js)보다 먼저 선다.
   · 답할 모델 버튼 줄 — modelRow() · 고른 값은 config/ai 의 model 하나를 모든 앱이 공유 (클라우드 Brainy 가 다음 질문부터 이 모델로, 짧은 일은 늘 Haiku)
   · 첫 안내문 — hello() · 노트 쓰기 도구(vault_write) 규칙 — NOTE_RULE
   · 「이 ○○는 고쳐요」 표시 + Brainy에게 맡기기 — fixHtml() · fixAsk() · ask()
   · 위 것들의 생김새 — 앱의 색(--ink·--accent …, 없으면 --g-*)을 따른다 */
(function () {
  "use strict";
  if (window.BRAINY_PARTS) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ── 생김새 ── */
  var css = document.createElement("style");
  css.textContent =
    /* 색 — 네 앱이 같이 쓰는 이름(--ink·--muted·--line·--surface·--accent)을 먼저, 없으면 받침의 --g-* */
    ".bp-models,.bp-hello,.bp-fix,.bp-fix-done,.bp-fix-tag,.bp-fixask{--bp-fg:var(--ink,var(--bp-fg));--bp-mut:var(--muted,var(--bp-mut));--bp-line:var(--line,var(--bp-line));" +
    "--bp-bg:var(--bg,var(--g-bg,#fff));--bp-card:var(--surface,var(--g-card,#fff));--bp-acc:var(--accent,var(--g-acc,#2f6f5e));--bp-acc-ink:var(--accent-ink,var(--g-acc-ink,#fff))}" +
    /* 모델 버튼 줄 */
    ".bp-models{display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid var(--bp-line);background:var(--bp-card);min-width:0}" +
    ".bp-m{flex:1;min-width:0;min-height:44px;padding:4px 2px;border:1px solid var(--bp-line);border-radius:12px;background:var(--bp-bg);color:var(--bp-fg);font:inherit;line-height:1.2;display:grid;place-content:center;text-align:center;cursor:pointer}" +
    ".bp-m b{display:block;font-size:13.5px;white-space:nowrap}.bp-m small{display:block;font-size:11px;color:var(--bp-mut)}" +
    ".bp-m:hover{border-color:var(--bp-acc)}.bp-m:disabled{opacity:.5;cursor:default}" +
    ".bp-m[aria-pressed=true]{background:var(--bp-acc);border-color:var(--bp-acc);color:var(--bp-acc-ink)}.bp-m[aria-pressed=true] small{color:inherit;opacity:.85}" +
    /* 첫 안내문 */
    ".bp-hello{align-self:flex-start;justify-self:start;max-width:90%}.bp-hello b{display:block;font-size:17px;margin-bottom:4px}" +
    ".bp-hello p{margin:0;font-size:13.5px;line-height:1.6;color:var(--bp-mut)}" +
    /* 「이 ○○는 고쳐요」 칸 */
    ".bp-fix{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:10px;background:var(--surface-2,var(--bp-card));border-left:3px solid var(--bp-acc);font-size:14px;color:var(--bp-fg)}" +
    ".bp-fix-l{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--bp-mut)}" +
    ".bp-fix textarea{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;font:inherit;color:var(--bp-fg);background:var(--bp-card);border:1px solid var(--bp-line);border-radius:10px;padding:9px 11px}" +
    ".bp-fix textarea:focus-visible{outline:2px solid var(--bp-acc);outline-offset:2px}" +
    ".bp-fix-t{white-space:pre-wrap;overflow-wrap:anywhere}.bp-fix-t .bp-mut{color:var(--bp-mut)}" +
    ".bp-fix-b{display:flex;gap:6px;flex-wrap:wrap}" +
    ".bp-fix-done{margin:4px 0 0;font-size:12.5px;color:var(--bp-mut)}" +
    ".bp-fix-tag{color:var(--bp-acc)!important;border-color:var(--bp-acc)!important}";
  (document.head || document.documentElement).appendChild(css);

  /* ── 답할 모델 — 모든 앱이 config/ai 의 model 하나를 같이 쓴다 (값: auto 또는 모델 id) ── */
  var MODELS = [["auto", "자동", "auto"], ["claude-haiku-5-5", "빠름", "Haiku"], ["claude-sonnet-5-5", "기본", "Sonnet"], ["claude-opus-5-5", "깊게", "Opus"], ["claude-fable-5-1", "최고", "Fable"]];
  var SHORT = { "claude-haiku-5-5": "haiku", "claude-sonnet-5-5": "sonnet", "claude-opus-5-5": "opus" };   // 맥에서 답할 때 넘기는 이름 (콘텐츠 기획 「Claude 모드」와 같은 꼴)
  var LS = "bp.model", model = "auto", DB = null, fns = [];
  try { model = localStorage.getItem(LS) || "auto"; } catch (e) {}
  function valid(m) { return MODELS.some(function (x) { return x[0] === m; }) ? m : "auto"; }
  model = valid(model);
  function take(m) { m = valid(m); if (m === model) return; model = m; try { localStorage.setItem(LS, m); } catch (e) {} paintModels(); fns.forEach(function (f) { try { f(m); } catch (e) {} }); }
  function modelRow(label) {
    return '<div class="bp-models" role="group" aria-label="' + esc(label || "답할 Claude 모델 — 다음 질문부터, 모든 앱에 같이") + '">' + MODELS.map(function (m) {
      var on = m[0] === model;
      return '<button type="button" class="bp-m" data-bp-model="' + m[0] + '" aria-pressed="' + on + '"' + (DB ? "" : " disabled") + ' title="' + esc(m[1] + " · " + m[2] + (on ? " — 지금 이 모델로 답해요" : " — 누르면 다음 질문부터 (모든 앱)")) + '"><b>' + (on ? "✓ " : "") + m[1] + "</b><small>" + m[2] + "</small></button>";
    }).join("") + "</div>";
  }
  function paintModels() { [].forEach.call(document.querySelectorAll(".bp-models"), function (el) { el.outerHTML = modelRow(el.getAttribute("aria-label")); }); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-bp-model]"); if (!b || !DB) return;
    take(b.getAttribute("data-bp-model"));
    DB.doc("config/ai").set({ model: model, at: new Date().toISOString() }).catch(function () {});
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintModels); else paintModels();   // 앱 html 에 미리 둔 빈 줄(.bp-models)도 채운다
  function pull() { if (DB && window.BRAINY && BRAINY.fetch) BRAINY.fetch("config/ai").then(function (d) { take((d && d.model) || "auto"); }, function () {}); }
  if (window.claude && claude.use) claude.use("db").then(function (db) {
    if (!db) return; DB = db; paintModels(); pull();
    db.doc("config/ai").onSnapshot(function (s) { if (s.exists) take((s.data() || {}).model || "auto"); }, function () {});   // 홈처럼 config 를 받는 앱은 실시간으로
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") pull(); });   // 다른 앱에서 바꾼 것도 다시 볼 때 맞춘다
  }, function () {});

  /* ── 노트 쓰기 도구 — 앱 대화 규칙에 같이 넣는 한 줄 ── */
  var NOTE_RULE = "- 볼트 노트(위키 페이지·단어 뜻·태스크 노트 등)를 쓰거나 고치라고 하면 앱 고치기(app_edit_start)가 아니라 노트 쓰기 도구 vault_write 로 바로 한다: 먼저 vault_search·vault_read 로 지금 내용을 읽고, 바꿀 곳만 patch 로 고치고, 없는 페이지는 같은 영역의 다른 페이지 형식에 맞춰 create 로 만든다. 쓴 뒤엔 어디를 고쳤는지와 맥이 켜져 있으면 몇 초 안에 옵시디언 볼트에 들어간다고 한 줄로 알린다. 시키지 않은 노트는 쓰지 않는다. 노트 쓰기는 .md 노트만 된다.";

  /* ── 첫 안내문 — o: {name 앱 이름, what 첫 문장(없으면 기본), editNote 앱 고치기 설명, local 로컬 앱, pics 사진 보내기 됨} → {title, text} ── */
  function hello(o) {
    o = o || {};
    if (o.local) return { title: "동욱 님, 무엇을 도와드릴까요?", text: (o.name || "이 앱") + "에 대해 묻거나 바꾸고 싶은 걸 말해 주세요. " + (o.editNote || "이 맥의 Claude가 앱 원본을 바로 고쳐요. 고친 뒤 새로고침하면 보여요.") };
    return { title: "동욱 님, 무엇을 도와드릴까요?",
      text: (o.what || (o.name || "이 앱") + "에 대해 묻거나 바꾸고 싶은 걸 말해 주세요.") +
        " 위키 페이지·단어 뜻 같은 볼트 노트도 쓰거나 고쳐 달라고 하면 바로 해요 — 맥이 켜져 있으면 몇 초 안에 볼트에 들어가요." +
        " 앱 화면을 바꿔 달라고 하면 " + (o.editNote || "고친 판이 5~15분 뒤 준비되고, 「적용해 줘」라고 해야 실제 앱에 들어가요.") +
        (o.pics === false ? "" : " 📎로 사진(화면 캡처)도 같이 보낼 수 있어요 — 붙여 넣어도 돼요.") };
  }
  function helloHtml(o) { var h = hello(o); return '<div class="bp-hello"><b>' + esc(h.title) + "</b><p>" + esc(h.text) + "</p></div>"; }

  /* ── 「이 ○○는 고쳐요」 칸 — 체화 단어장 고칠 단어 방식 (2026-11-24 동욱: 맥 단축키도 같은 방식으로)
     o: {id, what "단어"·"단축키", on 표시됨, text 적은 글, at 날짜, editing 쓰는 중, done {at, note} 지난번 고친 내용, placeholder, label 글칸 이름,
         attr(act, id) 단추 속성 — act: edit·save·cancel·del, btn {primary, ghost} 앱의 단추 class}
     저장 = 표시 + 적은 글(글 없이 표시만도 됨) · 표시 풀기 = 둘 다 지움. 글칸은 class rq-in · id "rq-<id>" (앱이 그 값을 읽는다) ── */
  function fixHtml(o) {
    var id = esc(o.id), w = o.what || "항목", A = o.attr || function (a, i) { return 'data-fix="' + a + '" data-id="' + esc(i) + '"'; };
    var P = (o.btn && o.btn.primary) || "btn primary", G = (o.btn && o.btn.ghost) || "btn ghost";
    function bt(cls, a, label) { return '<button type="button" class="' + cls + '" ' + A(a, o.id) + ">" + label + "</button>"; }
    if (o.editing) return '<div class="bp-fix"><span class="bp-fix-l">이 ' + esc(w) + "는 고쳐요 — 무엇이 틀렸나요?</span>" +
      '<textarea class="rq-in" id="rq-' + id + '" maxlength="300" placeholder="' + esc(o.placeholder || "예: 틀림 / 다른 것과 중복 / 설명이 너무 기본적임") + '" aria-label="' + esc((o.label || w) + " 고칠 점") + '">' + esc(o.text || "") + "</textarea>" +
      '<div class="bp-fix-b">' + bt(P, "save", "저장") + bt(G, "cancel", "취소") + (o.on ? bt(G, "del", "표시 풀기") : "") + "</div></div>";
    if (o.on) return '<div class="bp-fix"><span class="bp-fix-l">✓ 고칠 ' + esc(w) + (o.at ? " · " + esc(String(o.at).slice(0, 10)) : "") + '</span><span class="bp-fix-t">' + (o.text ? esc(o.text) : '<span class="bp-mut">적은 글이 없어요</span>') + "</span>" +
      '<div class="bp-fix-b">' + bt(G, "edit", "글 고치기") + bt(G, "del", "표시 풀기") + "</div></div>";
    return bt((o.btn && o.btn.mark) || G, "edit", "✎ 이 " + esc(w) + "는 고쳐요 (오류·중복)") +
      (o.done && o.done.note ? '<p class="bp-fix-done">지난번 고친 내용 · ' + esc(String(o.done.at || "").slice(0, 10)) + " · " + esc(o.done.note) + "</p>" : "");
  }
  /* Brainy에게 맡기기 단추 — o: {n 고칠 개수, sub 무엇까지 하는지, cls, attr} */
  function fixAsk(o) { return o.n ? '<button type="button" class="' + (o.cls || "btn primary") + '" ' + (o.attr || 'data-bp-fixask="1"') + ">✦ Brainy에게 고치기 맡기기" + (o.sub ? " — " + esc(o.sub) : "") + "</button>" : ""; }
  /* 대화창을 열고 그 말로 맡긴다 */
  function ask(q) { if (window.BRAINY_CHAT) window.BRAINY_CHAT.ask(q); else alert("Brainy 대화창이 아직 준비되지 않았어요. 로그인을 확인하고 잠시 뒤 다시 눌러 주세요."); }

  window.BRAINY_PARTS = {
    esc: esc, MODELS: MODELS, NOTE_RULE: NOTE_RULE,
    model: function () { return model; },
    modelShort: function () { return SHORT[model] || ""; },
    onModel: function (f) { fns.push(f); },
    modelRow: modelRow, paintModels: paintModels,
    hello: hello, helloHtml: helloHtml,
    fixHtml: fixHtml, fixAsk: fixAsk, ask: ask
  };
})();
