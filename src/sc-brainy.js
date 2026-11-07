<script>
/* 맥 단축키 — Brainy 연결 (build.py 가 brainy-chat.js 앞에 붙인다)
   ctx(): 지금 앱 상태를 Brainy 에게 알려 준다 · tools: Brainy 가 답한 뒤 이 화면에서 실행하는 앱 도구 */
(function () {
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }
  function findItem(q) {
    var n = norm(q); if (!n) return null;
    return BY_ID[q] || ITEMS.filter(function (s) { return norm(s.t) === n; })[0] ||
      ITEMS.filter(function (s) { return norm(s.t).indexOf(n) >= 0 || norm(s.x || "").indexOf(n) >= 0; })[0] || null;
  }
  function findCourse(q) {
    var list = (COURSE.courses || []), n = norm(q);
    if (!n) return csCourse();
    return list.filter(function (c) { return c.id === q || norm(c.name).indexOf(n) >= 0 || norm(c.tag) === n; })[0] || null;
  }
  function findChapter(c, q) {
    var n = norm(q);
    return c.chapters.filter(function (ch) { return ch.id === q; })[0] ||
      c.chapters.filter(function (ch) { return norm(ch.title).indexOf(n) >= 0; })[0] || null;
  }
  function setMark(id, kind) {
    if (kind === "none") delete marks[id]; else marks[id] = kind;
    save("mk.marks", marks);
    if (DB) DB.doc("sc.marks/main").set({ marks: marks, updatedAt: new Date().toISOString() }).catch(function () {});
    refresh();
  }
  window.BRAINY_HOOK = {
    chips: ["지금 들을 강의 단축키 알려 줘", "Git 명령어 즐겨찾기 해 줘", "이 앱에서 ○○ 고쳐 줘"],
    ctx: function () {
      var c = csCourse(), here = c ? csHere(c) : null;
      var favs = ITEMS.filter(function (s) { return marks[s.id] === "fav"; }).map(function (s) { return s.t; });
      var pass = ITEMS.filter(function (s) { return marks[s.id] === "pass"; }).length;
      var L = ["[지금 앱 상태 — 맥 단축키]",
        "- 보고 있는 탭: " + current + " (now 지금 · course 강의 · home 목록 · fav 즐겨찾기 · pass 패스)",
        "- 단축키 목록 " + ITEMS.length + "개 · ★ " + favs.length + "개" + (favs.length ? "(" + favs.slice(0, 25).join(", ") + ")" : "") + " · ✓패스 " + pass + "개",
        "- 강의들: " + csList().map(function (x) { return (x.tag ? x.tag + " " : "") + x.name + " [" + x.id + "]"; }).join(" / ")];
      if (c) {
        L.push("- 고른 강의: " + c.name + " · 지금 들을 강의(챕터): " + (here ? here.title : "-") + " · 그 강의 단축키·명령어 " + (c.cheat || []).length + "개");
        var mine = (c.cheat || []).filter(function (x) { return here && x.ch === here.id; }).slice(0, 30);
        if (mine.length) L.push("- 지금 들을 강의의 단축키·명령어: " + mine.map(function (x) { return x.t + " = " + (x.code || (x.k || []).map(function (a) { return a.join(""); }).join(" / ")); }).join(" · "));
      }
      L.push("- 앱 저장소(app_doc): sc.data/main(단축키 목록) · sc.marks/main(✓★) · sc.data/course(강의·단축키·명령어) · sc.marks/course(강의 진도·외움·★)");
      return L.join("\n");
    },
    tools: [
      { name: "shortcut_mark", description: "맥 단축키 목록의 단축키 하나에 ✓패스(pass)·★즐겨찾기(fav)를 붙이거나 뗀다(none). query 는 단축키 이름이나 id.",
        inputSchema: { type: "object", properties: { query: { type: "string" }, mark: { type: "string", enum: ["pass", "fav", "none"] } }, required: ["query", "mark"] },
        execute: function (i) { var s = findItem(i.query); if (!s) throw new Error("「" + i.query + "」 단축키를 못 찾았어요"); setMark(s.id, i.mark); return s.t + " → " + i.mark; } },
      { name: "course_item_mark", description: "강의 탭의 단축키·명령어 하나에 외움(known)·★(fav)을 붙이거나 뗀다(none). course 는 강의 이름(비우면 지금 고른 강의), query 는 명령(code)이나 이름(t).",
        inputSchema: { type: "object", properties: { course: { type: "string" }, query: { type: "string" }, mark: { type: "string", enum: ["known", "fav", "none"] } }, required: ["query", "mark"] },
        execute: function (i) {
          var c = findCourse(i.course); if (!c) throw new Error("강의를 못 찾았어요");
          var n = norm(i.query), x = (c.cheat || []).filter(function (y) { return norm(y.code) === n || norm(y.t) === n; })[0] || (c.cheat || []).filter(function (y) { return norm(y.code).indexOf(n) >= 0 || norm(y.t).indexOf(n) >= 0; })[0];
          if (!x) throw new Error("「" + i.query + "」를 그 강의에서 못 찾았어요");
          var k = cpKey(c, x);
          if (i.mark === "none") { delete CPROG.cp[k]; delete CPROG.cf[k]; } else (i.mark === "fav" ? CPROG.cf : CPROG.cp)[k] = 1;
          csSave(); if (current === "course") renderCourse(); if (current === "fav") renderList("fav");
          return x.t + " → " + i.mark;
        } },
      { name: "course_set_here", description: "강의 탭에서 강의를 고르고 「지금 들을 강의(챕터)」를 정한다. chapter 는 챕터 제목 일부(예: CH02-03)나 id.",
        inputSchema: { type: "object", properties: { course: { type: "string" }, chapter: { type: "string" } }, required: ["chapter"] },
        execute: function (i) {
          var c = findCourse(i.course); if (!c) throw new Error("강의를 못 찾았어요");
          var ch = findChapter(c, i.chapter); if (!ch) throw new Error("「" + i.chapter + "」 챕터를 못 찾았어요");
          CPROG.cur = c.id; csGo(ch.id, true); show("course"); return c.name + " · " + ch.title;
        } },
      { name: "open_view", description: "맥 단축키 앱의 탭을 연다: now(지금) · course(강의) · home(목록) · fav(즐겨찾기) · pass(패스).",
        inputSchema: { type: "object", properties: { view: { type: "string", enum: ["now", "course", "home", "fav", "pass"] } }, required: ["view"] },
        execute: function (i) { show(i.view); return i.view; } }
    ]
  };
})();
</script>
