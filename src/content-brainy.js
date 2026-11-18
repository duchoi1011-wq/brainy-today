<script>
/* 콘텐츠 기획 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   ctx(): 지금 앱 상태를 Brainy 에게 알려 준다 · tools: Brainy 가 답한 뒤 이 화면에서 실행하는 앱 도구 */
(function () {
  function subName(id) { var n = id; TABS.forEach(function (g) { g.subs.forEach(function (x) { if (x[0] === id) n = g.name + " › " + x[1]; }); }); return n; }
  window.BRAINY_HOOK = {
    /* 대화 방식 — 「Claude 모드」(content-claude.js)에서 고른 곳(맥·클라우드)과 모델 */
    mode: function () { return { where: claudeWhere(), model: claudeModel("chat") }; },
    /* 볼트를 읽고 일하게 (2026-11-18 동욱 "이 앱의 대화가 볼트 자체와 볼트의 지침을 읽고 작업할 수 있게, 너무 지금은 멍청해") */
    rules: function () {
      return "- 이 앱(콘텐츠 기획)의 일은 볼트를 읽고 답한다. 짐작으로 답하지 않는다. 필요한 만큼 먼저 연다:\n" +
        "  · 볼트 지침: 루트 CLAUDE.md · `3_Action/CLAUDE.md`\n" +
        "  · 이 앱: `4_Outputs/콘텐츠 기획 앱/README.md` · 그 폴더의 `검증 지침.md` · 공통 `4_Outputs/앱 검증 지침.md`\n" +
        "  · 지금 브랜드 자료: `4_Outputs/콘텐츠 기획 앱/" + cur + "/` 의 브랜드.json · 키워드.json · 검색.json · 추천.json · 구축.json · 대본.json · 분석.json (정본)\n" +
        "  · 일하는 법: `.claude/skills/` 의 content-discovery · content-recommend · content-production · content-source SKILL.md 와 `.claude/routines/cmd.md` 🎬 칸\n" +
        "  · 브랜드 기획·레퍼런스 카드: 브랜드.json 의 refCards · planCard 가 가리키는 볼트 카드\n" +
        "- 무엇을 근거로 답했는지(어느 파일·어느 칸) 한 줄 붙인다. 숫자·사례는 볼트에 있는 것만 쓴다.\n" +
        "- 동욱이 이 앱 일(추천·대본·키워드·참고 페이지 등)을 시키면, 맥에서 답하는 중이면 그 스킬 규칙대로 바로 해서 볼트 파일에 쓰고(맥 동기화가 앱에 올린다) 무엇을 어디에 했는지 말한다. 클라우드에서 답하는 중이면 할 수 없다고 말하고, 「⚙ Claude 모드」에서 대화를 「맥에서」로 두면 된다고 알려 준다.\n" +
        "- 답에는 추천 번호(P1·K1)·파일 속 약어 대신 제목과 쉬운 말을 쓴다. 숏폼은 하지 않기로 했다(미드폼·롱폼만, 11-16) — 옛 자료에 숏폼이 있어도 권하지 않는다.\n" +
        "- 「보여 줘·제안해 줘」는 보여 주기까지. 쓰기는 「넣어·해·반영해」를 들은 뒤.";
    },
    editNote: "고친 판은 5~15분 뒤 준비되고, 「적용해 줘」 하면 원본에 들어가요. 이 주소에 실제로 바뀌어 보이려면 맥의 Claude에게 「콘텐츠 기획 올려 줘」라고 한 번 더 말해 주세요.",
    chips: ["지금 이 브랜드에서 다음에 뭘 하면 돼?", "이 탭 설명을 더 쉽게 바꿔 줘", "이 앱에서 ○○ 고쳐 줘"],
    ctx: function () {
      var b = (typeof B === "function" && B()) || {};
      var L = ["[지금 앱 상태 — 콘텐츠 기획]",
        "- 브랜드: " + (b.name || cur || "-") + " [" + cur + "] · 보고 있는 탭: " + subName(tab),
        "- 탭 순서: " + TABS.map(function (g) { return g.name + "(" + g.subs.map(function (x) { return x[1] + "=" + x[0]; }).join(", ") + ")"; }).join(" → "),
        "- 브랜드들: " + brands().map(function (x) { return (x.name || x.id) + " [" + x.id + "]"; }).join(" / ")];
      var recent = (CMDS || []).slice(0, 5).map(function (c) { return (KIND[c.kind] || c.kind || "명령") + " · " + (c.status || "") + (c.result ? " — " + String(c.result).split("\n")[0].slice(0, 80) : ""); });
      if (recent.length) L.push("- 최근에 맥에 보낸 일: " + recent.join(" / "));
      L.push("- 화면 글(지금 탭, 앞부분): " + ((document.getElementById("view") || document.body).innerText || "").replace(/\s+/g, " ").slice(0, 2500));
      L.push("- 데이터 정본은 볼트 4_Outputs/콘텐츠 기획 앱/<브랜드>/*.json (앱 저장소 ct.data · ct.set · cmd). 실행은 맥의 Claude(콘텐츠 스킬 셋).");
      return L.join("\n");
    },
    tools: [
      { name: "open_tab", description: "콘텐츠 기획 앱의 탭을 연다: sum(한눈에) · brand(브랜드) · kw(키워드) · kwset(순위 기준) · ref(콘텐츠) · rec(추천) · build(구축) · refpage(참고 페이지) · script(대본).",
        inputSchema: { type: "object", properties: { tab: { type: "string", enum: ["sum", "brand", "kw", "kwset", "ref", "rec", "build", "refpage", "script"] } }, required: ["tab"] },
        execute: function (i) { tab = i.tab; save("ct.tab", tab); window.scrollTo(0, 0); render(); return subName(i.tab); } }
    ]
  };
})();
</script>
