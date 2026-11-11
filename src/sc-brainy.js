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
  window.BRAINY_HOOK = {
    chips: ["지금 들을 강의 단축키 알려 줘", "Git 명령어 즐겨찾기 해 줘", "이 앱에서 ○○ 고쳐 줘"],
    ctx: function () {
      var c = csCourse(), here = c ? csHere(c) : null;
      var favs = ITEMS.filter(function (s) { return marks[s.id] === "fav"; }).map(function (s) { return s.t; });
      var pass = ITEMS.filter(function (s) { return marks[s.id] === "pass"; }).length;
      var no = ITEMS.filter(function (s) { return marks[s.id] === "no"; }).length;
      var L = ["[지금 앱 상태 — 맥 단축키]",
        "- 보고 있는 탭: " + current + " (now 지금 · field 분야 · course 강의 · all 전체 · fav ★즐겨찾기 · pass ✓외웠어 · no ✕필요없어)" + (current === "field" ? " · 고른 앱: " + area : ""),
        "- 분야: " + catList().map(function (c) { return c + "(" + areaList().filter(function (g) { return catOf(g) === c; }).join(", ") + ")"; }).join(" / "),
        "- 단축키 목록 " + ITEMS.length + "개 · ★ " + favs.length + "개" + (favs.length ? "(" + favs.slice(0, 25).join(", ") + ")" : "") + " · ✓외웠어 " + pass + "개 · ✕필요없어 " + no + "개 (표시는 하나만, ✓·✕는 목록에서 빠짐)",
        "- 강의들: " + csList().map(function (x) { return (x.tag ? x.tag + " " : "") + x.name + " [" + x.id + "]"; }).join(" / ")];
      if (c) {
        L.push("- 고른 강의: " + c.name + " · 지금 들을 강의(챕터): " + (here ? here.title : "-") + " · 그 강의 단축키·명령어 " + (c.cheat || []).length + "개");
        var mine = (c.cheat || []).filter(function (x) { return here && x.ch === here.id; }).slice(0, 30);
        if (mine.length) L.push("- 지금 들을 강의의 단축키·명령어: " + mine.map(function (x) { return x.t + " = " + (x.code || (x.k || []).map(function (a) { return a.join(""); }).join(" / ")); }).join(" · "));
      }
      L.push("- 앱 저장소(app_doc): sc.data/main(단축키 목록) · sc.marks/main(marks: id→fav|pass|no) · sc.data/course(강의·단축키·명령어) · sc.marks/course(진도 · cp✓ cf★ cn✕)");
      return L.join("\n");
    },
    tools: [
      { name: "shortcut_mark", description: "맥 단축키 목록의 단축키 하나에 ★즐겨찾기(fav)·✓외웠어(pass)·✕필요없어(no) 중 하나를 붙이거나 뗀다(none). query 는 단축키 이름이나 id.",
        inputSchema: { type: "object", properties: { query: { type: "string" }, mark: { type: "string", enum: ["fav", "pass", "no", "none"] } }, required: ["query", "mark"] },
        execute: function (i) { var s = findItem(i.query); if (!s) throw new Error("「" + i.query + "」 단축키를 못 찾았어요"); if (i.mark === "none" || marks[s.id] !== i.mark) setMark(s.id, i.mark); refresh(); return s.t + " → " + i.mark; } },
      { name: "course_item_mark", description: "강의 탭의 단축키·명령어 하나에 ★즐겨찾기(fav)·✓외웠어(pass)·✕필요없어(no) 중 하나를 붙이거나 뗀다(none). course 는 강의 이름(비우면 지금 고른 강의), query 는 명령(code)이나 이름(t).",
        inputSchema: { type: "object", properties: { course: { type: "string" }, query: { type: "string" }, mark: { type: "string", enum: ["fav", "pass", "no", "none"] } }, required: ["query", "mark"] },
        execute: function (i) {
          var c = findCourse(i.course); if (!c) throw new Error("강의를 못 찾았어요");
          var n = norm(i.query), x = (c.cheat || []).filter(function (y) { return norm(y.code) === n || norm(y.t) === n; })[0] || (c.cheat || []).filter(function (y) { return norm(y.code).indexOf(n) >= 0 || norm(y.t).indexOf(n) >= 0; })[0];
          if (!x) throw new Error("「" + i.query + "」를 그 강의에서 못 찾았어요");
          var k = cpKey(c, x), mk = i.mark === "known" ? "pass" : i.mark;
          delete CPROG.cp[k]; delete CPROG.cf[k]; delete CPROG.cn[k];   // 표시는 하나만
          if (mk !== "none") CPROG[CS_MAP[mk]][k] = 1;
          csSave(); refresh();
          return x.t + " → " + i.mark;
        } },
      { name: "course_set_here", description: "강의 탭에서 강의를 고르고 「지금 들을 강의(챕터)」를 정한다. chapter 는 챕터 제목 일부(예: CH02-03)나 id.",
        inputSchema: { type: "object", properties: { course: { type: "string" }, chapter: { type: "string" } }, required: ["chapter"] },
        execute: function (i) {
          var c = findCourse(i.course); if (!c) throw new Error("강의를 못 찾았어요");
          var ch = findChapter(c, i.chapter); if (!ch) throw new Error("「" + i.chapter + "」 챕터를 못 찾았어요");
          CPROG.cur = c.id; csGo(ch.id, true); show("course"); return c.name + " · " + ch.title;
        } },
      { name: "open_view", description: "맥 단축키 앱의 탭을 연다: now(지금) · field(분야, area 로 앱 고르기 — 예: 옵시디언) · course(강의) · all(전체·찾기) · fav(★즐겨찾기) · pass(✓외웠어) · no(✕필요없어).",
        inputSchema: { type: "object", properties: { view: { type: "string", enum: ["now", "field", "course", "all", "fav", "pass", "no"] }, area: { type: "string" } }, required: ["view"] },
        execute: function (i) { var v = i.view === "home" ? "field" : i.view; if (i.area) { var n = norm(i.area), g = areaList().filter(function (x) { return norm(x).indexOf(n) >= 0; })[0]; if (g) { area = g; save("sc.area", g); } } show(v); return v + (v === "field" ? " · " + area : ""); } }
    ]
  };
})();
</script>
