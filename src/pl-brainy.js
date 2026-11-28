<script>
/* 기억의 궁전 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   ctx(): 지금 궁전·면·매개 단어 상태 · tools: 화면 열기 */
(function () {
  window.BRAINY_HOOK = {
    chips: ["이 면에 놓을 장면 3개 제안해 줘", "매개 없는 단어 발음매개 같이 만들자", "오늘 복습할 면 순서대로 물어봐 줘", "이 앱에서 ○○ 고쳐 줘"],
    ctx: function () {
      var p = curPal(), d = p ? palData(p) : null, f = d && S.face ? d.slots.filter(function (s) { return s.no === S.face; })[0] : null;
      var ws = words();
      return ["[지금 앱 상태 — 기억의 궁전]",
        "- 정본은 볼트: 궁전 노트 1_MyBrain/학습/외국어 암기/궁전-*.md (장 목록 · 「## N장 — 이름」 표: 면 · 면 이름 · 장소 메모 · 놓은 문장) · 회화장 표(문장 · 면 · 장면 이미지 …) · 영어 단어장 표(소리 고리 · 그림 (매개) …). 사진·그림 파일: 외국어 암기/궁전 사진/<궁전>/<장-면>.jpg(장소) · <장-면> 장면.jpg · 외국어 암기/매개 그림/<단어>.jpg. 장·면 이름은 동욱이 정한다 — 지어서 넣지 않는다(제안은 해도 됨).",
        "- 보고 있는 화면: " + view() + (p ? " · 궁전 " + p.name + "(" + (p.cat || p.for) + ") 만든 면 " + d.slots.length + "/" + (p.goal || d.slots.length) + " · 문장 놓은 면 " + d.placed + " · 오늘 복습 " + d.due.length + " · 장 이름 빈칸 " + p.chapters.filter(function (c) { return !c.name; }).length : ""),
        f ? "- 펼친 면: " + f.no + " 「" + (f.name || "이름 없음") + "」 메모 " + (f.memo || "없음") + " · 문장: " + (d.byFace[f.no] || []).map(function (t) { return t.term + " (" + t.def + ") 장면: " + (t.pic || "없음"); }).join(" / ") : "",
        "- 오늘 복습할 면: " + (d ? d.due.slice(0, 20).map(function (t) { return faceKey(t.face) + " " + t.def; }).join(" / ") : ""),
        "- 매개 단어 " + ws.length + "개 · 매개 없음: " + ws.filter(function (t) { return !t.hook; }).slice(0, 30).map(function (t) { return t.term; }).join(", ") + " · 오늘 복습: " + ws.filter(isDue).slice(0, 30).map(function (t) { return t.term + "(" + t.hook + ")"; }).join(", "),
        "- 앱이 쓰는 것: pl.edit(장 이름 · 면 이름·장소 메모 · 장 더하기 · 장면 글 → 맥이 볼트 표에) · pl.up(사진) · pl.gen(GPT 그림 — 맥 ChatGPT 계정 Codex) · progress/<id>.mnem.pending(고른 매개) · cmd from palace(발음매개 초안 · 암기 사진).",
        "- 대화에서 면 이름·장면·매개를 정해 주면, 동욱에게 그 면(궁전 탭)이나 그 단어(매개 탭)의 칸에 넣으라고 안내하거나 palace_open 으로 그 자리를 연다."].filter(Boolean).join("\n");
    },
    tools: [
      { name: "palace_open", description: "기억의 궁전 화면을 연다: today(오늘) · palace(궁전 — face 를 주면 그 면을 펼침, 예 1-3) · walk(걷기) · words(매개 — term 을 주면 그 단어를 펼침).",
        inputSchema: { type: "object", properties: { view: { type: "string" }, face: { type: "string" }, term: { type: "string" } } },
        execute: function (i) {
          if (i.term) { var t = words().filter(function (x) { return x.term.toLowerCase() === String(i.term).toLowerCase(); })[0]; if (!t) throw new Error("「" + i.term + "」 단어를 못 찾았어요"); S.word = t.id; location.hash = "words"; render(); return t.term; }
          if (i.face) { S.face = faceKey(i.face) || i.face; location.hash = "palace"; render(); return S.face; }
          location.hash = i.view || "today"; return i.view || "today";
        } }
    ]
  };
})();
</script>
