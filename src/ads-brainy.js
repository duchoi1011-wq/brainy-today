<script>
/* 광고 한눈에 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   mode(): 맥에서만 답한다 — 볼트 폴더의 Claude Code(본계정)가 네이버 API·볼트 기준 문서를 직접 읽는다. 클라우드로 넘기지 않는다.
   ctx(): 지금 고른 브랜드·화면·조율할 일·숫자를 통째로 보낸다 · tools: 브랜드·탭·캠페인 열기. 앱 데이터는 ads.html 이 window.ADS_APP 으로 내준다. */
(function () {
  function A() { return window.ADS_APP || null; }
  function norm(s) { return String(s || "").replace(/\s+/g, "").toLowerCase(); }
  window.BRAINY_HOOK = {
    mode: function () { return { where: "mac", cloud: false }; },
    chips: ["점검표의 문제부터 순서대로 조정안 줘", "브랜드별 광고비·CTR·CPC를 표로 비교해 줘", "이 앱에서 ○○ 고쳐 줘"],
    rules: function () {
      return ["[광고 한눈에 — 모든 브랜드의 광고를 파악하고 조율한다 (2026-11-28 동욱)]",
        "- 판단 전에 볼트 기준 문서를 먼저 읽는다: `2_LLMWiki/wiki/기업/광고 손익분기와 표본 기준.md` · `3_Action/33_카드/C-진액 키워드 광고 집행 기획.md` · `3_Action/33_카드/C-광고 3채널 동시 실습 전략판.md`. 문서와 어긋나는 제안을 하지 않는다.",
        "- 숫자: 네이버는 `python3 ~/.claude/tools/naver_sa.py GET <경로> '<query json>'` 로 다시 읽어 확인한다(키 출력 금지). 스토어 주문·메타·구글처럼 못 읽는 숫자는 「못 읽음 — 동욱이 볼 곳」이라 말하고 지어내지 않는다.",
        "- 바꿀 것은 「대상 · 지금 · 바꿀 값 · 근거(문서 몇 절)」 표로 보여 주고, 동욱이 이 대화에서 「승인」한 줄만 naver_sa.py 로 적용한다. 예산 늘리기·충전·결제·새 캠페인·메타/구글 계정 변경은 하지 않는다(동욱이 직접, 화면 위치만 안내).",
        "- 적용했으면 볼트 `4_Outputs/광고 한눈에 앱/광고 한눈에.json` 의 changes 맨 위에 {d, brand, ch, t, why} 한 줄을 더하고(앱 기록 탭에 뜬다), 그 일이 광고 태스크에 걸리면 태스크 노트 「## 로그」에도 한 줄.",
        "- 「보여 줘·정리해 줘」는 보여 주기까지. 건강 효능 표현(기력회복·면역 등)은 광고 문구로 제안하지 않는다.",
        "- 말은 짧게: 결론 한 줄 → 표 → 다음 한 걸음."].join("\n");
    },
    ctx: function () {
      var a = A(); if (!a || !a.data()) return "[지금 앱 상태 — 광고 한눈에] 데이터를 아직 못 받았어요.";
      var D = a.data(), B = a.selBrands(), R = a.rules(), T = a.checksOf(B), Q = a.requests();
      var L = ["[지금 앱 상태 — 광고 한눈에]", "- 보고 있는 화면: " + a.view() + " (now 점검 · metrics 지표 · control 조율 · log 기록)",
        "- 고른 브랜드: " + B.map(function (b) { return b.name; }).join(", ") + " · 판정 기준 조정 " + R.adjust + " / 정지 " + R.stop + "클릭",
        "- 네이버 숫자 받은 때: " + (D.naver && D.naver.at || "못 받음") + " · 스토어: " + (D.store && D.store.ok ? "연결 " + D.store.period : "연결 안 됨 (" + (D.store && D.store.error || "") + ")")];
      B.forEach(function (b) {
        var t = a.totalsOf([b]);
        L.push("## " + b.name + " (" + (b.product || "") + ")" + (b.breakeven ? " · 손익분기 구매당 광고비 " + b.breakeven + "원" : "") + (a.maxCpc(b) ? " · 허용 CPC " + a.maxCpc(b) + "원 (전환율 " + b.cvr + "% 가정)" : ""));
        ["naver", "meta", "google"].forEach(function (ch) { var s = a.chState(b, ch); L.push("- " + ch + ": " + s.t + (((b.channels || {})[ch] || {}).plan ? " — " + b.channels[ch].plan : "")); });
        a.campsOf(b).forEach(function (c) { L.push("  · 캠페인 " + c.name + " [" + c.id + "] " + (c.on ? "켜짐" : "꺼짐") + (c.budget ? " · 일예산 " + c.budget : "") + " · 7일 노출 " + c.s7.imp + " 클릭 " + c.s7.clk + " 광고비 " + c.s7.cost + "원" + (c.all ? " · 누적(" + (c.from || c.start) + "~) 클릭 " + c.all.clk + " 광고비 " + c.all.cost + "원" : "")); });
        if (t.camps) L.push("  · 합계 7일 광고비 " + t.s7.cost + "원 · 클릭 " + t.s7.clk + " · 누적 " + t.all.cost + "원");
      });
      L.push("## 점검표 (앱이 숫자에서 뽑음 — bad 문제 · warn 주의 · none 숫자 없음 · ok · info)");
      T.forEach(function (x) { L.push("- [" + x.lv + "] " + x.b.name + " · " + x.ch + " · " + x.name + ": " + x.val + (x.std ? " (기준 " + x.std + ")" : "") + (x.why ? " — " + x.why : "")); });
      var open = Object.keys(Q).map(function (k) { return Q[k]; }).filter(function (q) { return q.status === "요청"; });
      if (open.length) L.push("- 적용 기다리는 앱 요청: " + open.map(function (q) { return q.name + " " + q.kind + " → " + q.to; }).join(" / "));
      L.push("- 앱 저장소: ah.data/main (볼트 JSON + API 숫자, 맥 동기화 adhub_app.py 가 올림 — 직접 쓰지 않는다) · ah.req (앱의 조율 요청 — 맥이 limits 안에서 적용) · ad.data/main (광고 태스크)");
      return L.join("\n");
    },
    tools: [
      { name: "ads_open", description: "광고 한눈에 앱에서 브랜드·탭을 연다. brand 는 브랜드 이름 일부 또는 「전체」, view 는 now(점검)·metrics(지표)·control(조율)·log(기록).",
        inputSchema: { type: "object", properties: { brand: { type: "string" }, view: { type: "string", enum: ["now", "metrics", "control", "log"] } } },
        execute: function (i) {
          var a = A(); if (!a || !a.data()) throw new Error("앱을 아직 못 읽었어요");
          if (i.brand) {
            var n = norm(i.brand), b = n === "전체" || n === "all" ? { id: "all", name: "전체" } : (a.data().hub.brands || []).filter(function (x) { return norm(x.name).indexOf(n) >= 0 || norm(x.id) === n; })[0];
            if (!b) throw new Error("「" + i.brand + "」 브랜드를 못 찾았어요"); a.setBrand(b.id);
          }
          if (i.view) location.hash = i.view;
          return (i.brand || "") + " " + (i.view || "");
        } }
    ]
  };
})();
</script>
