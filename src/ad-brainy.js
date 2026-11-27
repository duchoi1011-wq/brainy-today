<script>
/* 광고 실습 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   2026-11-27 동욱 「교과서 … 바로 Brainy한테 질문하게」: 교과서 과의 「Brainy에게 묻기」·칩은 BRAINY_CHAT.ask 로 바로 보낸다.
   mode(): 클라우드 Brainy 가 답한다 (빨리) — 지금 과의 요약·본문·확인 문제·완료 기준을 ctx() 가 통째로 보내므로 볼트를 다시 읽지 않아도 답할 수 있다.
   ctx(): 지금 화면과 과 · tools: 교과서에서 과 열기. 앱 데이터는 ad.html 이 window.AD_APP 으로 내준다. */
(function () {
  function A() { return window.AD_APP || null; }
  function nm(t) { return String(t.title || "").replace(/^T-/, ""); }
  function find(q) {
    var a = A(), n = String(q || "").replace(/\s+/g, "").toLowerCase(); if (!a || !n) return null;
    var L = a.lessons();
    return L.filter(function (t) { return t.id.toLowerCase() === n; })[0] ||
      L.filter(function (t) { var x = nm(t).replace(/\s+/g, "").toLowerCase(); return x.indexOf(n) >= 0 || n.indexOf(x) >= 0; })[0] || null;
  }
  window.BRAINY_HOOK = {
    chips: ["이 과를 더 쉽게 설명해 줘", "외울 것만 퀴즈로 내 줘", "이 앱에서 ○○ 고쳐 줘"],
    rules: function () {
      return ["[광고 실습 — 동욱이 교과서 과(예: 「(N1 …) 질문」)에 대해 물으면]",
        "- 너는 광고 실습 과외 선생님이다. [지금 앱 상태]에 그 과의 「한눈에·외울 것·더보기·확인 문제·완료 기준」이 들어 있다 — 먼저 그걸 근거로 답한다.",
        "- 답은 요약집처럼: 핵심 한 줄 → 짧은 줄 3~6개(→·= 써도 됨) → 필요하면 우리 숫자로 예시 하나. 긴 문단 금지. 마지막에 「더 물어볼 것」 한 줄 제안.",
        "- 과에 없는 사실(광고 화면 위치·정책·단가)은 아는 범위에서 말하되 확실하지 않으면 「확인 필요」라고 붙인다. 지어내지 않는다.",
        "- 「같이 하자」면 따라 하기 1단계부터 한 번에 한 단계씩: 할 일 → 확인할 것 → 동욱이 「했어」 하면 다음.",
        "- 건강 효능 표현(기력회복·면역 등)을 광고 문구로 제안하지 않는다 — 식품 광고 규제.",
        "- 볼트 노트 고치기(교과서 원고·완료 기준 체크)는 「넣어·해·반영해」를 들은 뒤에. 실제 광고 계정 변경은 이 대화에서 하지 않는다 — 맥의 Brainy 에게 목록을 보여 주고 승인받아 하라고 안내한다."].join("\n");
    },
    ctx: function () {
      var a = A(); if (!a) return "[지금 앱 상태 — 광고 실습] 앱을 아직 못 읽었어요.";
      var L = ["[지금 앱 상태 — 광고 실습]", "- 보고 있는 화면: " + a.view() + " (run 실행 · book 교과서 · learn 학습 전략)"];
      var t = a.lesson();
      if (t) {
        var b = t.book || {};
        L.push("- 지금 과: " + t.id + " 「" + nm(t) + "」 · " + t.week + "주차 · 상태 " + a.state(t.id) + " · 예상 " + (t.estimate || "?") + " · 담당 " + (t.owner || t.worker || "?"));
        L.push("- 볼트 노트: `3_Action/" + (t.archived ? "39_보관" : "32_태스크") + "/" + t.title + ".md`");
        if (b.glance) L.push("## 한눈에\n" + b.glance);
        if ((b.memo || []).length) L.push("## 외울 것\n" + b.memo.map(function (x) { return "- " + x; }).join("\n"));
        if (b.more) L.push("## 더보기\n" + b.more);
        if ((b.quiz || []).length) L.push("## 확인 문제\n" + b.quiz.map(function (q) { return "- Q. " + q.q + "\n  - A. " + q.a; }).join("\n"));
        L.push("## 완료 기준\n" + (t.crit || []).map(function (k) { return (k.done ? "- [x] " : "- [ ] ") + k.t; }).join("\n"));
        if ((t.log || []).length) L.push("## 최근 로그\n" + t.log.join("\n"));
      } else {
        L.push("- 과 목록: " + a.lessons().map(function (x) { return x.id + " " + nm(x) + " [" + a.state(x.id) + "]"; }).join(" / "));
      }
      L.push("- 앱 저장소: ad.data/main (볼트에서 맥 동기화가 올림, 직접 쓰지 않는다) · taskwork/ad-<번호> (상태·체크·기록 → 맥이 노트에 넣음)");
      return L.join("\n");
    },
    tools: [
      { name: "ad_open", description: "광고 실습 앱의 교과서에서 과를 연다. lesson 은 과 번호(N1·C2 …)나 이름 일부, 「memo」면 외울 것 모음.",
        inputSchema: { type: "object", properties: { lesson: { type: "string" } }, required: ["lesson"] },
        execute: function (i) {
          var a = A(); if (!a) throw new Error("앱을 아직 못 읽었어요");
          if (String(i.lesson).toLowerCase() === "memo") { location.hash = "#book/memo"; return "외울 것 모음"; }
          var t = find(i.lesson); if (!t) throw new Error("「" + i.lesson + "」 과를 못 찾았어요");
          a.open(t.id); return t.id + " " + nm(t);
        } }
    ]
  };
})();
</script>
