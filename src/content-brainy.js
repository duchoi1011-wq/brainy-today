<script>
/* 콘텐츠 기획 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   ctx(): 지금 앱 상태를 Brainy 에게 알려 준다 · tools: Brainy 가 답한 뒤 이 화면에서 실행하는 앱 도구 */
(function () {
  function subName(id) { var n = id; TABS.forEach(function (g) { g.subs.forEach(function (x) { if (x[0] === id) n = g.name + " › " + x[1]; }); }); return n; }
  window.BRAINY_HOOK = {
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
