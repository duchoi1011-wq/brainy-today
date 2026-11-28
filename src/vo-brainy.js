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
    chips: ["오늘 복습할 단어 뭐야?", "헷갈리는 단어 3개 골라서 쉽게 설명해 줘", "고칠 단어 처리해 줘", "이 앱에서 ○○ 고쳐 줘"],
    /* 고칠 단어 처리 (2026-11-24 동욱) — 뜻 고치기뿐 아니라 위키 페이지 새로 만들기·고치기까지. Brainy 는 볼트 노트 쓰기 도구(vault_write — Supabase 노트 사본에 쓰면 맥이 볼트로 받아 감)로 한다 */
    rules: function () {
      return ["[고칠 단어 처리 — 동욱이 「고칠 단어 처리해 줘」 「오류 고쳐 줘」처럼 시키면]",
        "- 이건 앱 고치기(app_edit_start)가 아니라 볼트 일이다. 단어 뜻·위키 페이지는 볼트가 정본이라, 볼트를 고치면 맥 동기화가 몇 초 안에 이 단어장에 다시 올린다.",
        "- 순서: ① 아래 [지금 앱 상태]의 고칠 단어와 동욱이 적은 글을 본다 ② vault_search 로 그 단어가 있는 곳(단어장 표 줄 — 학습 단어장은 위키 「영상 편집 용어 사전」, 외국어는 영어 단어장 표, 위키 개념은 그 개념 페이지)과 그 단어의 위키 페이지를 찾고 vault_read 로 읽는다 ③ 뜻이 틀렸으면 표 줄을 vault_write patch 로 고친다 ④ 위키 페이지 내용이 틀렸으면 그 페이지를 patch 로 고친다 ⑤ 위키 페이지가 없거나 「페이지가 없음」이라고 적혀 있으면 같은 영역의 다른 위키 페이지를 하나 읽어 frontmatter·형식을 맞춘 뒤 vault_write create 로 새로 만든다 (2_LLMWiki/wiki/<영역>/<단어>.md) ⑥ 중복이면 한쪽 줄·페이지로 합치고 다른 쪽에는 합쳤다고 적는다 (지우기는 없다) ⑦ 다 고친 단어마다 vocab_fix_done 으로 표시를 풀고 무엇을 고쳤는지 한 줄 남긴다.",
        "- 붙여 넣어 올린 단어와 옮긴 후보(브랜드·상품 · 스킬 · MCP)도 동욱이 볼트에 넣으라고 하면 같은 방법으로 볼트 표·페이지에 넣는다.",
        "- 다 하면 단어마다 한 줄로 무엇을 했는지(뜻 고침 · 페이지 고침 · 페이지 새로 만듦 · 중복 합침) 알려 준다. 적은 글만으로 어떻게 고칠지 알 수 없는 단어는 고치지 말고 그 단어만 짧게 묻는다."].join("\n");
    },
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
        "- 고칠 단어 " + fixList().length + "개(동욱이 「이 단어는 고쳐요」로 표시하고 오류·중복을 적은 것, progress/<id>.fix·.req — 단어장 · 단어 — 적은 글): " + fixList().slice(0, 30).map(function (t) { return t.dom + " · " + t.term + " — " + (reqOf(t.id).slice(0, 120) || "(글 없음)"); }).join(" / "),
        "- 붙여 넣어 올리거나 옮긴 단어(vo.marks/add — 아직 볼트에 없을 수 있음): " + addItems().slice(0, 30).map(function (t) { return t.dom + (t.cat && t.cat !== t.dom ? " · " + t.cat : "") + " · " + t.term; }).concat(Object.keys(ADD.move || {}).slice(0, 30).map(function (id) { return ADD.move[id] + (ADD.cat && ADD.cat[id] ? " · " + ADD.cat[id] : "") + " ← " + (BYID[id] ? BYID[id].term : id); })).join(", "),
        "- 궁전(「궁전」 탭 · 볼트 1_MyBrain/학습/외국어 암기/궁전-*.md 가 정본 — 장·면 이름은 동욱이 정함): " + ((PAL && PAL.palaces) || []).map(function (p) { var d = plOf(p); return p.name + "(" + (p.cat || p.for) + ") 만든 면 " + d.slots.length + "/" + (p.goal || d.slots.length) + " · 문장 " + d.placed + " · 오늘 복습 " + d.due.length; }).join(" / "),
        "- 발음매개: 외국어 단어를 펼쳐 「🔤 발음매개 만들기」 → 맥 Brainy 가 초안을 cmd(from vocab)에 적음 → 동욱이 고른 것만 맥 동기화가 볼트 단어장 표에 넣음. 대화에서 매개를 정해 주면 그 단어 카드의 「직접 쓰기」로 넣으라고 안내한다.",
        "- 암기 사진: 외국어 단어장 홈·궁전 탭 「📷 사진·PDF 올리기」(한 번에 20개, PDF 30MB까지) → 맥 Brainy 가 V 표시한 영어 단어·회화 문장을 묻지 않고 볼트 표에 넣고 단어마다 발음매개 초안 (볼트 외국어 암기/캡처/ 폴더에 넣어도 같음). 최근: " + capCmds().slice(0, 3).map(function (c) { return (c.status || "") + " " + String(c.result || "").split("\n")[0].slice(0, 80); }).join(" / "),
        "- 단어장: " + Object.keys(DOMAINS).map(function (d) { return d + " " + ALL.filter(function (t) { return t.dom === d; }).length; }).join(" · "),
        "- 단어를 새로 넣거나 정리할 때 규칙: 맥 단축키 앱과 겹치는 내용은 한쪽에만 둔다(단축키는 단축키 앱, 개념 설명은 단어장) · 동욱이 이미 알 만한 기본 단어는 넣지 않는다 · 브랜드·상품 단어, 스킬 설명, MCP 설명은 각자 단어장(dom: 브랜드·상품 · 스킬 · MCP)으로 따로 둔다",
        "- 앱 저장소(app_doc): vo.data/main(단어 목록·뜻) · progress/<단어id>(단계·복습 기록 · fix/req 고칠 단어 · fixDone 고친 기록) · vo.marks/lec(강의 탭 표시) · vo.marks/add(items 붙여 넣어 올린 단어 — cat 이 넣을 분야 · move 옮긴 후보 · cat 옮긴 후보의 넣을 분야 — 볼트에 넣을 때 그 단어장 페이지의 그 「## 분야」 표로) · ctx/<단어id>(카드 장면·쉽게)"].join("\n");
    },
    tools: [
      { name: "vocab_fix_done", description: "고칠 단어 하나를 다 고쳤을 때 「이 단어는 고쳐요」 표시와 적은 글을 풀고, 무엇을 고쳤는지 한 줄 남긴다 (예: 뜻 고침 · 위키 페이지 새로 만듦). 볼트를 실제로 고친 뒤에만.",
        inputSchema: { type: "object", properties: { term: { type: "string" }, note: { type: "string" } }, required: ["term", "note"] },
        execute: function (i) { var t = findTerm(i.term); if (!t) throw new Error("「" + i.term + "」 단어를 못 찾았어요"); save(t.id, { fix: false, fixAt: null, req: null, reqAt: null, fixDone: { at: nowIso(), note: String(i.note || "").slice(0, 200), req: reqOf(t.id) } }, "Brainy: 고침"); return t.term + " 고침 표시 풂"; } },
      { name: "vocab_set_level", description: "단어 하나의 단계를 올린다 (2 만남 = 뜻 보고 맞힘 · 3 소화 = 맥락 보고 맞힘 · 4 실행 = 단어로 명령·실제로 씀). 동욱이 그 수준에 왔다고 분명히 말했을 때만. 단계는 내려가지 않는다.",
        inputSchema: { type: "object", properties: { term: { type: "string" }, level: { type: "integer", enum: [2, 3, 4] }, why: { type: "string" } }, required: ["term", "level"] },
        execute: function (i) { var t = findTerm(i.term); if (!t) throw new Error("「" + i.term + "」 단어를 못 찾았어요"); save(t.id, { level: i.level }, "Brainy: " + (i.why || "대화에서")); return t.term + " → " + LV[i.level]; } },
      { name: "vocab_open", description: "단어장 화면을 연다: home(홈 대시보드) · review(복습·복습 주기) · stage(단계별 — 네 단계와 승급 시험) · new(새 개념) · lec(강의) · field(분야) · list(전체). term 을 주면 전체에서 그 단어를 펼친다.",
        inputSchema: { type: "object", properties: { view: { type: "string" }, term: { type: "string" } } },
        execute: function (i) {
          var t = i.term ? findTerm(i.term) : null;
          if (t) { S.detail = t.id; if (view() !== "list") { S.jump = true; location.hash = "list"; } else { render(); showDetail(); } return t.term; }
          var v = i.view === "learn" || i.view === "do" ? "stage" : (i.view || "home"); location.hash = v; return v;
        } }
    ]
  };
})();
</script>
