<script>
/* Brainy 대화 — 맥 단축키·체화 단어장 안에서 (build.py 가 두 앱 끝에 붙인다)
   클라우드 Brainy(supabase/functions/brainy-ai)를 부른다 — 묻기·이 앱 고치기(app_edit_*) 모두 거기서.
   대화는 이 기기에 최근 30개만 남긴다. */
(function () {
  "use strict";
  var APP = window.BRAINY_APP || {}, NAME = APP.name || "이 앱", KEY = "bc." + (APP.key || "app");
  var turns = [], busy = false, ctl = null, sample = null, openOld = false;
  try { turns = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
  function keep() { try { localStorage.setItem(KEY, JSON.stringify(turns.filter(function (t) { return t.content; }).slice(-30))); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var css = document.createElement("style");
  css.textContent =
    "#bc-fab{position:fixed;z-index:30;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif;border:0;border-radius:999px;padding:12px 16px;background:var(--g-acc);color:var(--g-acc-ink);box-shadow:0 6px 18px rgba(0,0,0,.22);cursor:pointer}" +
    "#bc{position:fixed;inset:0;z-index:45;display:grid;grid-template-rows:auto 1fr auto;background:var(--g-bg);color:var(--g-fg);padding-top:env(safe-area-inset-top,0px);font:15px/1.6 -apple-system,BlinkMacSystemFont,sans-serif}" +
    "#bc[hidden]{display:none!important}" +
    "#bc .bc-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--g-line);background:var(--g-card)}" +
    "#bc .bc-bar b{flex:1;font-size:16px}#bc .bc-bar small{display:block;font-weight:400;font-size:12px;color:var(--g-mut)}" +
    "#bc button{font:inherit;cursor:pointer}" +
    "#bc .bc-q{border:1px solid var(--g-line);background:none;color:var(--g-fg);border-radius:999px;padding:6px 12px;font-size:13px}" +
    "#bc .bc-msgs{overflow-y:auto;padding:14px 16px;display:grid;gap:10px;align-content:start}" +
    "#bc .bc-b{padding:10px 14px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere;max-width:92%}" +
    "#bc .bc-me{justify-self:end;background:var(--g-acc);color:var(--g-acc-ink);border-bottom-right-radius:4px}" +
    "#bc .bc-ai{justify-self:start;background:var(--g-card);border:1px solid var(--g-line);border-bottom-left-radius:4px}" +
    "#bc .bc-wait{color:var(--g-mut)}#bc .bc-more{justify-self:start;background:none;border:0;color:var(--g-mut);font-size:13px;padding:0}" +
    "#bc .bc-chips{display:flex;flex-wrap:wrap;gap:6px}#bc .bc-hint{font-size:13px;color:var(--g-mut);margin:0}" +
    "#bc .bc-in{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--g-line);background:var(--g-card);align-items:end}" +
    "#bc textarea{font:inherit;font-size:16px;color:var(--g-fg);background:var(--g-bg);border:1px solid var(--g-line);border-radius:12px;padding:10px 12px;resize:none;height:46px;min-height:46px;max-height:140px;box-sizing:border-box}" +
    "#bc .bc-send{height:46px;border:0;border-radius:12px;padding:0 16px;background:var(--g-acc);color:var(--g-acc-ink);font-weight:600}";
  document.head.appendChild(css);

  var fab = document.createElement("button");
  fab.id = "bc-fab"; fab.type = "button"; fab.textContent = "✦ Brainy"; fab.hidden = true;
  fab.setAttribute("aria-label", "Brainy에게 묻거나 이 앱 고쳐 달라기");
  var box = document.createElement("div");
  box.id = "bc"; box.hidden = true;
  box.innerHTML = '<div class="bc-bar"><b>Brainy<small>' + esc(NAME) + ' — 묻기 · 이 앱 고쳐 달라기</small></b><button type="button" class="bc-q" data-bc="new">새 대화</button><button type="button" class="bc-q" data-bc="close">닫기</button></div>' +
    '<div class="bc-msgs" id="bc-msgs"></div>' +
    '<div class="bc-in"><textarea id="bc-text" rows="1" placeholder="예: 강의 탭 글씨를 더 크게 고쳐 줘"></textarea><button type="button" class="bc-send" id="bc-send">보내기</button></div>';
  document.body.appendChild(fab); document.body.appendChild(box);
  var msgs = box.querySelector("#bc-msgs"), text = box.querySelector("#bc-text"), send = box.querySelector("#bc-send");

  var CHIPS = ["이 앱에서 ○○ 고쳐 줘", "맡긴 앱 고치기 어떻게 됐어?", "준비된 판 적용해 줘"];
  function render() {
    var h = "";
    if (!turns.length) {
      h += '<p class="bc-hint">' + esc(NAME) + '에 대해 묻거나, 바꾸고 싶은 걸 말하면 Brainy가 고친 판을 만들어요(5~15분). 「적용해 줘」라고 해야 실제 앱에 들어가요.</p>';
      h += '<div class="bc-chips">' + CHIPS.map(function (c) { return '<button type="button" class="bc-q" data-bc-chip="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>";
    }
    var cut = openOld ? 0 : Math.max(0, turns.length - 2);
    if (cut) h += '<button type="button" class="bc-more" data-bc="old">▾ 이전 대화 ' + Math.ceil(cut / 2) + "개 보기</button>";
    else if (openOld && turns.length > 2) h += '<button type="button" class="bc-more" data-bc="old">▴ 이전 대화 숨기기</button>';
    turns.forEach(function (t, i) {
      if (i < cut) return;
      h += '<div class="bc-b ' + (t.role === "user" ? "bc-me" : "bc-ai" + (t.content ? "" : " bc-wait")) + '"' + (i === turns.length - 1 ? ' id="bc-last"' : "") + ">" + esc(t.content || "생각하는 중…") + "</div>";
    });
    msgs.innerHTML = h; msgs.scrollTop = msgs.scrollHeight;
    send.textContent = busy ? "멈추기" : "보내기";
  }
  function rules() {
    return "[앱 규칙] 너는 동욱의 Brainy다. 동욱은 지금 '" + NAME + "' 앱(폰일 수 있음) 안의 Brainy 창에서 말하고 있다. 한국어 해요체로 짧고 쉽게 답한다.\n" +
      "- 이 앱의 사용법·데이터를 물으면 답한다. 필요하면 app_doc 로 앱 저장소를 읽는다.\n" +
      "- 이 앱의 화면이나 기능을 바꿔 달라고 하면 app_edit_start 로 맡긴다. request 에는 반드시 '" + NAME + " 앱:' 으로 시작해 무엇을 어떻게 바꿀지 동욱의 말 그대로 + 필요한 맥락을 적는다. 맡긴 뒤엔 5~15분 걸리고 「적용해 줘」라고 해야 앱에 들어간다고 알려 준다.\n" +
      "- 진행 상황은 app_edit_status 로 본다. app_edit_apply 는 동욱이 이 대화에서 적용하라고 분명히 말했을 때만 쓴다. 버리라고 하면 app_edit_discard.\n" +
      "- 다른 앱(Brainy 홈 등)을 바꿔 달라고 해도 같은 방법으로 맡겨도 된다.";
  }
  function go(q) {
    q = String(q || "").trim(); if (!q || busy) return;
    if (!sample) { turns.push({ role: "user", content: q }, { role: "assistant", content: "⚠ 지금은 Brainy를 부를 수 없어요. 로그인을 확인해 주세요." }); keep(); render(); return; }
    var hist = turns.filter(function (t) { return t.content && !t.err; }).slice(-10).map(function (t) { return { role: t.role, content: t.content }; });
    turns.push({ role: "user", content: q }); var ai = { role: "assistant", content: "" }; turns.push(ai);
    busy = true; openOld = false; ctl = new AbortController(); text.value = ""; render();
    sample([{ role: "user", content: rules() }].concat(hist).concat([{ role: "user", content: q }]), {
      signal: ctl.signal, cache: false,
      onText: function (u) { ai.content = u.text; var el = document.getElementById("bc-last"); if (el) { el.textContent = u.text; el.classList.remove("bc-wait"); msgs.scrollTop = msgs.scrollHeight; } }
    }).then(function (r) { ai.content = r.text; }, function (e) {
      ai.content = (e && e.text) || ai.content || ""; ai.err = 1;
      ai.content += (ai.content ? "\n\n" : "") + (e && e.code === "cancelled" ? "멈췄어요." : "⚠ " + ((e && e.message) || "답을 받지 못했어요"));
    }).then(function () { busy = false; ctl = null; keep(); render(); });
  }
  fab.addEventListener("click", function () { box.hidden = false; fab.hidden = true; render(); setTimeout(function () { try { text.focus(); } catch (e) {} }, 50); });
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-bc],[data-bc-chip]"); if (!b) return;
    var a = b.getAttribute("data-bc");
    if (a === "close") { box.hidden = true; fab.hidden = false; return; }
    if (a === "new") { if (ctl) ctl.abort(); turns = []; keep(); render(); return; }
    if (a === "old") { openOld = !openOld; render(); return; }
    var c = b.getAttribute("data-bc-chip");
    if (c) { if (c.indexOf("○○") >= 0) { text.value = c.replace("○○ ", ""); text.focus(); } else go(c); }
  });
  send.addEventListener("click", function () { if (busy) { if (ctl) ctl.abort(); } else go(text.value); });
  text.addEventListener("input", function () { text.style.height = "auto"; text.style.height = Math.min(text.scrollHeight, 140) + "px"; });
  text.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); go(text.value); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) { box.hidden = true; fab.hidden = false; } });
  // 로그인돼 Brainy를 부를 수 있을 때만 버튼을 보인다
  if (window.claude && claude.use) claude.use("sample").then(function (s) { sample = s; fab.hidden = !s; }, function () {});
})();
</script>
