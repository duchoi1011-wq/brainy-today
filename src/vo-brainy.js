<script>
/* 체화 단어장 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   ctx(): 지금 단어장 상태를 Brainy 에게 알려 준다 · tools: Brainy 가 답한 뒤 이 화면에서 실행하는 앱 도구 */
(function () {
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }
  function findTerm(q) {
    var n = norm(q); if (!n) return null;
    return BYID[q] || ALL.filter(function (t) { return norm(t.term) === n; })[0] ||
      ALL.filter(function (t) { return norm(t.term).indexOf(n) >= 0 || n.indexOf(norm(t.term)) >= 0; })[0] || null;
  }
  window.BRAINY_HOOK = {
    chips: ["오늘 복습할 단어 뭐야?", "헷갈리는 단어 3개 골라서 쉽게 설명해 줘", "이 앱에서 ○○ 고쳐 줘"],
    ctx: function () {
      var day = kday(), by = { 1: [], 2: [], 3: [], 4: [] }, due = [];
      ALL.forEach(function (t) {
        (by[lv(t.id)] || by[1]).push(t.term);
        var s = srsOf(t.id); if (s && s.due && s.due <= day) due.push(t.term);
      });
      return ["[지금 앱 상태 — 체화 단어장]",
        "- 보고 있는 화면: " + view() + " · 단어 " + ALL.length + "개 (학습 " + DATA.terms.length + " · 외국어 " + FOREIGN.length + ")",
        "- 단계: ① 낯섦 " + by[1].length + " · ② 만남 " + by[2].length + " · ③ 소화 " + by[3].length + " · ④ 실행 " + by[4].length,
        "- ② 만남: " + by[2].slice(0, 40).join(", "),
        "- ③·④: " + by[3].concat(by[4]).slice(0, 40).join(", "),
        "- 오늘 복습할 단어(" + due.length + "): " + due.slice(0, 40).join(", "),
        "- 앱 저장소(app_doc): vo.data/main(단어 목록·뜻) · progress/<단어id>(단계·복습 기록) · vo.marks/lec(강의 탭 표시) · ctx/<단어id>(카드 장면·쉽게)"].join("\n");
    },
    tools: [
      { name: "vocab_set_level", description: "단어 하나의 단계를 올린다 (2 만남 · 3 소화 · 4 실행). 동욱이 그 단어를 알게 됐다·설명했다·실제로 썼다고 분명히 말했을 때만. 단계는 내려가지 않는다.",
        inputSchema: { type: "object", properties: { term: { type: "string" }, level: { type: "integer", enum: [2, 3, 4] }, why: { type: "string" } }, required: ["term", "level"] },
        execute: function (i) { var t = findTerm(i.term); if (!t) throw new Error("「" + i.term + "」 단어를 못 찾았어요"); save(t.id, { level: i.level }, "Brainy: " + (i.why || "대화에서")); return t.term + " → " + LV[i.level]; } },
      { name: "vocab_open", description: "단어장 화면을 연다: review(복습) · lec(강의) · field(분야) · home · learn(알기) · do(실행하기) · list(전체). term 을 주면 전체에서 그 단어를 펼친다.",
        inputSchema: { type: "object", properties: { view: { type: "string" }, term: { type: "string" } } },
        execute: function (i) {
          var t = i.term ? findTerm(i.term) : null;
          if (t) { S.detail = t.id; location.hash = "list"; render(); return t.term; }
          location.hash = i.view || "review"; return i.view || "review";
        } }
    ]
  };
})();
</script>
