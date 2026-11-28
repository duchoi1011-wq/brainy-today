<script>
/* 전체 현황 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   mode(): 맥으로만 답한다(본계정 · 클라우드로 넘기지 않음) + 받는 사람(agent: brainy 또는 ~/agents 폴더 이름) + 엔진(engine: claude · gpt · gemini).
           맥의 ai_runner.py 가 agent 로 폴더를, engine 으로 Claude Code · Codex(ChatGPT 계정) · Gemini(읽기만)를 고른다.
   bar(): 대화창 윗줄 — 받는 사람 단추 · 엔진 단추 3개 (누르면 hub.html 의 setWho · setEng → BRAINY_CHAT.repaint)
   ctx(): 모든 앱의 현황·볼 것·에이전트를 통째로 보낸다. 앱 데이터는 hub.html 이 window.HUB_APP 으로 내준다. */
(function () {
  function H() { return window.HUB_APP || null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  window.BRAINY_HOOK = {
    modelPick: false,   // 모델 줄 대신 아래 bar(받는 사람·엔진)
    mode: function () {
      var h = H(), w = h ? h.who() : { id: "brainy" }, e = h ? h.engine() : { id: "claude" };
      var m = { where: "mac", cloud: false, engine: e.id };
      if (w.id !== "brainy") { m.agent = w.id; m.agentName = w.name; }
      if (e.id === "claude" && window.BRAINY_PARTS && window.BRAINY_PARTS.modelShort && window.BRAINY_PARTS.modelShort()) m.model = window.BRAINY_PARTS.modelShort();   // 다른 앱에서 고른 Claude 모델을 같이 쓴다
      return m;
    },
    sub: function () { var h = H(); if (!h) return "전체 현황"; var w = h.who(), e = h.engine(); return w.name + " · " + e.name + (e.note ? " (" + e.note + ")" : ""); },
    bar: function () {
      var h = H(); if (!h) return "";
      var w = h.who(), e = h.engine();
      return '<span class="hb-l">받는 사람</span><div class="hb-who" role="group" aria-label="받는 사람">' + h.agents().map(function (a) {
        return '<button type="button" data-hb-who="' + esc(a.id) + '" aria-pressed="' + (a.id === w.id) + '" title="' + esc((a.dept ? a.dept + " · " : "") + (a.line || "")) + '">' + (a.id === w.id ? "✓ " : "") + esc(a.name) + "</button>";
      }).join("") + '</div><span class="hb-l">답할 엔진</span><div class="hb-eng" role="group" aria-label="답할 엔진">' + h.engines().map(function (x) {
        return '<button type="button" data-hb-eng="' + esc(x.id) + '" aria-pressed="' + (x.id === e.id) + '" title="' + esc(x.note || "") + '"><b>' + (x.id === e.id ? "✓ " : "") + esc(x.name) + "</b><small>" + esc(x.note || "") + "</small></button>";
      }).join("") + "</div>";
    },
    chips: ["오늘 모든 앱에서 손댈 것 순서대로 정리해 줘", "이번 주 비즈니스 현황 한 줄씩 요약해 줘", "학습 앱마다 다음 한 걸음 하나씩"],
    editNote: "받는 사람과 엔진은 위 단추로 바꿔요. 이 맥에서 본계정으로 돌아요.",
    rules: function () {
      var h = H(), w = h ? h.who() : { id: "brainy", name: "Brainy" };
      return ["[전체 현황 — 동욱이 직접 쓰는 비즈니스·학습 앱을 한 화면에서 보고, Brainy·팀 에이전트에게 바로 맡긴다 (2026-11-28 동욱)]",
        "- 지금 받는 사람: " + w.name + (w.id === "brainy" ? " (볼트 전체)" : " (~/agents/" + w.id + " 폴더 — 그 폴더 CLAUDE.md 를 따른다)") + ".",
        "- 아래 현황은 맥 동기화가 각 앱 문서를 5분마다 줄인 것이다. 자세한 숫자가 필요하면 그 앱의 정본(볼트 4_Outputs/<앱>/ 의 JSON · 앱 문서)을 읽고, 못 읽는 숫자는 「못 읽음」이라 말하고 지어내지 않는다.",
        "- 「보여 줘·정리해 줘·제안해 줘」는 보여 주기까지. 쓰기·저장·적용은 동욱이 「해·넣어·반영해」라고 한 것만. 게시·발송·결제·광고 예산 늘리기는 하지 않고 준비까지만.",
        "- 앱을 넣거나 빼 달라면 볼트 `4_Outputs/전체 현황 앱/전체 현황.json` 의 apps · left 를 고친다(앱 숫자 줄이는 법은 `.claude/scripts/hub_app.py` SUMMARY).",
        "- 말은 짧게: 결론 한 줄 → 목록 → 다음 한 걸음."].join("\n");
    },
    ctx: function () {
      var h = H(); if (!h || !h.data()) return "[지금 앱 상태 — 전체 현황] 현황을 아직 못 받았어요.";
      var D = h.data(), L = ["[지금 앱 상태 — 전체 현황] 현황 " + (D.updatedAt || "") + " 기준 · 보고 있는 화면: " + h.view()];
      (D.groups || []).forEach(function (g) {
        L.push("## " + g.name);
        h.apps().filter(function (a) { return a.group === g.id; }).forEach(function (a) {
          L.push("- " + a.name + " [" + a.state + "] " + (a.line || "") + ((a.figs || []).length ? " · " + a.figs.map(function (f) { return f[0] + " " + f[1]; }).join(" · ") : "") + (a.url ? " · " + a.url : ""));
          (a.alerts || []).forEach(function (x) { L.push("  · [" + x.lv + "] " + x.t); });
        });
      });
      L.push("## 에이전트");
      h.agents().forEach(function (a) { L.push("- " + a.name + " (" + a.id + ")" + (a.dept ? " · " + a.dept : "") + (a.state ? " · " + a.state : "") + (a.line ? " — " + a.line : "")); });
      L.push("- 앱 저장소: hub.data/main (맥 동기화 hub_app.py 가 올림 — 직접 쓰지 않는다)");
      return L.join("\n");
    },
    tools: [
      { name: "hub_open", description: "전체 현황 앱의 탭을 연다. view 는 now(지금 볼 것) · apps(앱 카드) · agents(에이전트).",
        inputSchema: { type: "object", properties: { view: { type: "string", enum: ["now", "apps", "agents"] } }, required: ["view"] },
        execute: function (i) { location.hash = i.view; return i.view; } }
    ]
  };
})();
</script>
