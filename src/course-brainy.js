<script>
/* 강의 실습 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   mode(): 맥에서 답한다 — 볼트 폴더에서 도는 Claude Code 가 course-practice 스킬·지도 카드·교안 원문을 직접 읽고 고친다 (맥이 12초 안에 안 집으면 클라우드 Brainy 가 대신).
   ctx(): 지금 고른 강의·칸·태스크를 알려 준다 · tools: 이 화면에서 강의·탭·칸 열기.
   「Brainy와 이 칸 하기」는 BRAINY_CHAT.fill 로 대화창을 채워 연다 — 보내기는 동욱이 ↑. */
(function () {
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }
  function findCourse(q) { var n = norm(q); return !n ? course() : DATA.courses.filter(function (c) { return c.id === q || norm(c.name).indexOf(n) >= 0 || n.indexOf(norm(c.name)) >= 0; })[0] || null; }
  function findCell(c, q) {
    var n = norm(q), L = cellsOf(c); if (!n) return null;
    return L.filter(function (x) { return x.key === q || norm(x.title) === n; })[0] || L.filter(function (x) { return norm(x.title).indexOf(n) >= 0 || n.indexOf(norm(x.title)) >= 0; })[0] || null;
  }
  function cellText(c, x) {
    return ["  · 칸: " + partOf(c, x) + " › " + x.title + " [" + ST[x.st].icon + " " + ST[x.st].name + "] (지도 카드 " + x.line + "번째 줄)",
      x.remain ? "  · 남은 것: " + x.remain : "", x.desc ? "  · 지도에 적힌 것: " + x.desc : "",
      x.src ? "  · 원문: " + x.src : "",
      (x.req || []).length ? "  · 요구 " + x.req.length + "개: " + x.req.map(function (r) { return r.t + (r.note ? " — " + r.note : ""); }).join(" / ") : "",
      (x.chk || []).length ? "  · 확인: " + x.chk.map(function (q) { return (q.t || "") + (q.note ? " — " + q.note : ""); }).join(" / ") : "",
      (x.out || []).length ? "  · 결과: " + x.out.join(" / ") : "", (x.err || []).length ? "  · 교안 오류: " + x.err.join(" / ") : "", x.mat ? "  · 📎 재료: " + x.mat : "", x.need ? "  · 🔑 열쇠: " + x.need : "",
      memoOf(c.id, x.key) ? "  · 동욱의 메모: " + memoOf(c.id, x.key) : ""].filter(Boolean).join("\n");
  }
  window.BRAINY_HOOK = {
    mode: function () { return { where: "mac" }; },
    chips: ["지금 할 칸 같이 하자", "이 강의 다음에 뭐 하면 돼?", "이 앱에서 ○○ 고쳐 줘"],
    editNote: "고친 판은 5~15분 뒤 준비되고, 「적용해 줘」 하면 앱에 들어가요.",
    rules: function () {
      var ex = DATA.courses.filter(function (c) { return c.note && c.note.units.length; })[0];   // 학습 노트 모양 본보기
      return ["[강의 실습 — 동욱이 「/course-practice …」 「이 칸 하자」 「다음 칸」처럼 실습 이야기를 하면]",
        "- 이건 앱 고치기(app_edit_start)가 아니라 볼트 일이다. 먼저 볼트 `.claude/skills/course-practice/SKILL.md` 를 읽고 그 규칙대로 한다 (맥에서 답하는 중이면 파일을 직접, 클라우드면 vault_read 로).",
        "- 순서는 스킬 §1·§2 그대로: 이 칸이 뭔지·왜·요구 몇 개·무엇이 나오는지 3~5줄 → 첫 질문 하나 → 동욱이 직접 하고 Brainy는 안내·검사 → 끝낼 때 요구 대조표 + 확인 질문.",
        "- ✅ 는 요구가 전부 충족이고 확인 질문을 마쳤을 때만, 볼트 지도 카드(아래 [지금 앱 상태]의 지도 카드 경로)에 쓴다. 쓰기 전에 바꿀 줄을 보여 주고 확인받는다. 이 앱 화면에는 끝 표시 도구가 없다 — 맥 동기화가 몇 초 뒤 앱에 보여 준다.",
        "- 칸을 끝내면 그 강의 학습 노트(경로는 [지금 앱 상태])에 단원 하나를 더한다 — 단원 목록 표 한 줄 + 「### 단원 N. 칸 이름」 본문. 노트가 없으면 같은 폴더에 「C-<강의> 실습 학습 노트.md」를 " + (ex ? "`" + ex.note.path + "` 와" : "다른 강의 학습 노트와") + " 같은 모양으로 만든다 (만들기 전에 묻는다).",
        "- 듣기 칸 요약은 볼트 교안·위키 요약에서 실습에 필요한 것만 3줄. 동욱이 「들었어」 하면 지도 카드의 그 줄을 [x] 로.",
        "- 맥에서만 되는 확인(동욱 컴퓨터의 설정·파일 보기)이 필요한데 클라우드에서 답하는 중이면, 할 수 없다고 말하고 맥이 켜졌을 때 다시 보내 달라고 한다.",
        "- 「보여 줘·정리해 줘」는 보여 주기까지. 볼트 쓰기는 「넣어·해·반영해」를 들은 뒤."].join("\n");
    },
    ctx: function () {
      var c = course(); if (!c) return "[지금 앱 상태 — 강의 실습] 강의 데이터를 아직 못 받았어요.";
      var n = counts(c), t = taskOf(c), x = nextCell(c), v = view(), sel = v === "cell" ? cellBy(c, S.cell) : null;
      var L = ["[지금 앱 상태 — 강의 실습]",
        "- 보고 있는 탭: " + v + " (now 지금 · map 지도 · notes 배운 것 · memo 내 메모 · cell 칸 자세히)",
        "- 강의들: " + DATA.courses.map(function (o) { var m = counts(o); return o.name + " [" + o.id + "] 실습 끝 " + m.done + "/" + m.goal; }).join(" / "),
        "- 고른 강의: " + c.name + (c.full ? " (" + c.full + ")" : "") + " · 실습 " + n.all + "칸 = ✅ " + n.done + " · 🔁 " + n.similar + " · ⏳ " + n.doing + " · 아직 " + n.todo + " · ↪ " + n.merged + " · ⏭ " + n.skip + " · 듣기 끝 " + n.lDone + "/" + n.lAll,
        "- 볼트 파일: 지도 카드 `" + c.map + "`" + (c.note ? " · 학습 노트 `" + c.note.path + "` (단원 " + c.note.units.length + "개)" : " · 학습 노트 없음") + (t ? " · 지금 태스크 `" + t.path + "`" : " · 지금 태스크 없음"),
        c.next ? "- 지도 카드에 적힌 다음 칸: " + c.next : ""];
      if (t) L.push("- 지금 태스크 「" + t.name + "」 (" + t.status + ") 완료 기준:\n" + t.crit.map(function (k) { return "  " + (k.done ? "[x] " : "[ ] ") + k.text; }).join("\n"));
      if (x) L.push("- 앱이 고른 다음 칸:\n" + cellText(c, x));
      if (sel && sel !== x) L.push("- 동욱이 지금 열어 본 칸:\n" + cellText(c, sel));
      L.push("- 앱 저장소(app_doc): cr.data/main(강의·칸·학습 노트·태스크 — 볼트에서 맥 동기화가 올림, 직접 쓰지 않는다) · cr.memo/<강의 id>-<칸 번호표>(동욱의 칸 메모, 칸마다 문서 하나 {cid, key, title, t, at})");
      return L.filter(Boolean).join("\n");
    },
    tools: [
      { name: "course_open", description: "강의 실습 앱에서 강의·탭·칸을 연다. course 는 강의 이름(비우면 지금 강의), view 는 now(지금)·map(지도)·notes(배운 것)·memo(내 메모)·cell(칸 자세히 — cell 에 칸 제목), cell 은 칸 제목 일부.",
        inputSchema: { type: "object", properties: { course: { type: "string" }, view: { type: "string", enum: ["now", "map", "notes", "memo", "cell"] }, cell: { type: "string" } }, required: ["view"] },
        execute: function (i) {
          var c = findCourse(i.course); if (!c) throw new Error("「" + i.course + "」 강의를 못 찾았어요");
          if (c.id !== S.cid) { S.cid = c.id; lsPut("cr.cid", c.id); }
          if (i.view === "cell" || i.cell) { var x = findCell(c, i.cell); if (!x) throw new Error("「" + i.cell + "」 칸을 못 찾았어요"); openCell(x.key); return c.name + " · " + x.title; }
          location.hash = i.view; render(); return c.name + " · " + i.view;
        } }
    ]
  };
})();
</script>
