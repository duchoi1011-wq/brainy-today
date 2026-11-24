/* ── 「공부」 탭 — 강의 내용 쉬운 설명 + 그 Part 의 칸 (build.py 가 course.html 에 끼움 · 2026-11-24 동욱 「공부하면서 실습도」) ──
   본문 정본: 볼트 위키 요약 2_LLMWiki/wiki/<영역>/요약 - <지도 카드 study:>*.md → 맥 동기화 → Supabase cr.study/<강의 id>
   = { name, pages: [{ title, part, path, tldr, secs: [{h, body}] }] }. 목차(c.study)는 cr.data/main 에 같이 온다.
   본문(강의마다 15~45KB)은 cr.data/main 과 따로 둔다 — 위키가 바뀔 때만 다시 오고, 지도·체크가 바뀔 때는 안 온다 (전송량 — 앱 검증 지침 F17).
   칸마다 맞는 차시 한 줄은 cell.easy = { t, code, page } — 칸 자세히에 보인다. */
const STUDY = {};          // 강의 id -> cr.study 문서 (받은 것)
const studyOn = {};        // 강의 id -> 받기 시작함
function studyLoad(c){
  if (!c || !db || studyOn[c.id]) return;
  studyOn[c.id] = true;
  db.doc("cr.study/" + c.id).onSnapshot(s => { STUDY[c.id] = s.exists ? s.data() : { pages: [] }; if (["study", "cell"].includes(view())) render(); }, () => {});
}
const KEEP_OPEN = /^핵심/;   // 처음부터 펼쳐 둘 칸 (나머지는 접어 둔다)
/* 장 이름 — Part 가 있으면 「Part N」, 없으면 제목의 차시 번호(「CH01-02 iTerm2 세팅」 같은 따로 만든 요약) 또는 「강의 전체」(전체 커리큘럼) */
const pageName = t => t.part != null ? "Part " + t.part : ((t.title || "").match(/(?:CH|Ch)\d+-\d+\s*\S+/) || ["강의 전체"])[0];
const partName = p => p == null ? "강의 전체" : "Part " + p;
function renderStudy(c){
  studyLoad(c);
  const toc = c.study || [];
  if (!toc.length) return `<section class="card"><h2>공부</h2><p>${esc(c.name)} 강의는 아직 공부할 요약이 이어져 있지 않아요.</p>
    <p class="small muted" style="margin-top:6px">볼트 지도 카드 머리말(frontmatter)에 <code>study:</code> 로 위키 요약 이름 앞부분을 적으면 여기에 강의 내용 쉬운 설명이 보여요.</p></section>`;
  const doc = STUDY[c.id];
  let h = `<section class="card"><h2>공부 · 요약 ${toc.length}장</h2><p class="small muted" style="margin-bottom:8px">볼트 위키에 Part마다 정리한 강의 내용이에요. 읽고, 그 아래 칸으로 바로 실습하거나 들은 칸을 체크해요.</p>
    <div class="chips">${toc.map((t, i) => `<button type="button" class="chip" data-page="${i}">${esc(pageName(t))}</button>`).join("")}</div></section>`;
  if (!doc) return h + `<section class="card"><p class="empty">공부 내용을 불러오는 중이에요…</p></section>`;
  (doc.pages || []).forEach((pg, i) => {
    const cells = pg.part == null ? [] : cellsOf(c).filter(x => partNo(c, x) === pg.part);
    const done = cells.filter(x => cellOn(c, x)).length;
    h += `<section class="card" id="page-${i}"><div class="part"><h2>${esc(pageName(pg))}</h2>${cells.length ? `<small>끝 ${done}/${cells.length}</small>` : ""}</div>
      <h3 style="font-size:17px;margin:2px 0 8px">${inline(pg.title)}</h3>
      ${pg.tldr ? `<div class="tldr">${inline(pg.tldr)}</div>` : ""}
      ${(pg.secs || []).map(s => `<details class="fold sfold"${KEEP_OPEN.test(s.h) ? " open" : ""}><summary><b>${inline(s.h)}</b></summary><div class="md">${mdHtml(s.body)}</div></details>`).join("")}
      ${cells.length ? `<div class="sec"><span class="lbl">이 Part의 칸 — 누르면 자세히·체크</span>${cells.map(x => cellRow(c, x, nowKeys(c))).join("")}</div>` : ""}
      <p class="small muted sec">정본: 볼트 「${esc(pg.title)}」</p></section>`;
  });
  return h;
}
/* 칸의 Part 번호 — 실습은 지도의 Part, 듣기는 「P1 …」 */
const partNo = (c, x) => x.part != null ? x.part : (x.easy && (c.study[x.easy.page] || {}).part) ?? null;
/* 칸 자세히의 「쉬운 설명」 칸 */
function easyBox(c, x){
  if (!x.easy) return (c.study || []).length ? `<div class="sec"><span class="lbl">쉬운 설명</span><p class="small muted">위키 요약에 이 차시만의 줄이 없어요. ${partNo(c, x) != null ? `<button type="button" class="linkbtn" data-studypart="${partNo(c, x)}">${esc(partName(partNo(c, x)))} 공부 보기 →</button>` : ""}</p></div>` : "";
  const t = c.study[x.easy.page] || {};
  return `<div class="sec"><span class="lbl">쉬운 설명 — 위키 「${esc(t.title || "")}」 ${esc(x.easy.code)}</span><p>${inline(x.easy.t)}</p>
    <button type="button" class="linkbtn" data-page="${x.easy.page}">${esc(pageName(t))} 공부 전체 보기 →</button></div>`;
}
function goPage(i){
  S.page = +i;
  if (view() !== "study") { location.hash = "study"; return; }
  const el = document.getElementById("page-" + i); if (el) el.scrollIntoView({ block: "start" });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-page],[data-studypart]");
  if (!b) return;
  const c = course(); if (!c) return;
  if (b.dataset.page !== undefined) return goPage(b.dataset.page);
  const i = (c.study || []).findIndex(t => String(t.part) === b.dataset.studypart);
  if (i >= 0) goPage(i);
});
