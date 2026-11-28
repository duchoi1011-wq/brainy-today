<script>
/* 광고 실습 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   2026-11-27 동욱 「교과서 … 바로 Brainy한테 질문하게」: 교과서 과의 「Brainy에게 묻기」·칩은 BRAINY_CHAT.ask 로 바로 보낸다.
   mode(): 맥에서만 답한다 — 볼트 폴더에서 도는 Claude Code(본계정 구독)가 과를 직접 진행하며 가르친다. 맥이 꺼져 있어도 클라우드(콘솔 API 키)로 넘기지 않는다 (cloud:false · 2026-11-28 동욱 「너가 직접 진행하면서 학습하는 식으로 … 클로드 콘솔 말고 이 본계정 사용량으로」).
   지금 과의 요약·본문·확인 문제·완료 기준은 ctx() 가 통째로 보낸다.
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
    mode: function () { return { where: "mac", cloud: false }; },
    chips: ["이 과를 Brainy가 진행해 줘", "외울 것만 퀴즈로 내 줘", "이 앱에서 ○○ 고쳐 줘"],
    rules: function () {
      return ["[광고 실습 — Brainy가 직접 진행하고 동욱은 보며 배운다 (2026-11-28 동욱)]",
        "- [지금 앱 상태]에 그 과의 「한눈에·외울 것·더보기·확인 문제·완료 기준」이 들어 있다 — 진행·설명의 근거로 먼저 쓴다.",
        "- 「진행해 줘」면 그 과의 「따라 하기」를 네가 직접 한다. 한 번에 한 단계: ① 지금 하는 일 한 줄 ② 실제로 한다(데이터 뽑기·계산·표·초안 — 결과를 보여 줌) ③ 왜 이렇게 하는지 한 줄 + 외울 것과 잇기 ④ 동욱에게 확인 질문 하나. 동욱이 답하거나 「다음」 하면 다음 단계.",
        "- 데이터: 네이버 검색광고는 `python3 ~/.claude/tools/naver_sa.py GET <경로> '<query json>'` 로 읽는다(키는 출력 금지). 스토어 매출·앰플리튜드처럼 지금 못 읽는 것은 「못 읽음 — 동욱이 볼 곳」을 말하고 지어내지 않는다.",
        "- 「(동욱)」 단계(판단·광고시스템 화면 보기)는 네가 먼저 답 후보와 근거를 보여 주고 동욱이 고르게 한다 — 판단 연습이 이 과의 목적이다.",
        "- 광고 계정 변경(입찰가·키워드 켜고 끄기·매체·연결 주소)은 「키워드 · 지금 · 바꿀 값 · 이유」 표를 보여 주고 동욱이 이 대화에서 「승인」이라고 답한 줄만 naver_sa.py 로 적용한다. 적용 뒤 그 과 노트 「## 로그」에 한 줄. 예산 늘리기·충전·결제·새 캠페인은 하지 않는다.",
        "- 과 노트의 완료 기준 체크·상태는 그 단계가 실제로 끝났을 때 앱 도구나 노트로 바꾸고 한 줄로 말한다. 교과서 원고 고치기는 「넣어·해·반영해」를 들은 뒤에.",
        "- 말은 요약집처럼 짧게(긴 문단 금지). 과에 없는 사실(화면 위치·정책·단가)이 확실하지 않으면 「확인 필요」.",
        "- 건강 효능 표현(기력회복·면역 등)을 광고 문구로 제안하지 않는다 — 식품 광고 규제."].join("\n");
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
