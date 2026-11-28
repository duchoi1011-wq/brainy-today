/* ── 「교과서」 탭 — 광고 실습 교과서와 같은 틀 (build.py 가 course.html 에 끼움 · 2026-11-28 동욱 「강의 실습앱도 광고실습앱처럼 자동실습과 교과서와 핵심 등이 담도록」) ──
   본문 정본: 볼트 위키 요약 2_LLMWiki/wiki/<영역>/요약 - <지도 카드 study:>*.md → 맥 동기화 → Supabase cr.study/<강의 id>
   = { name, pages: [{ title, part, path, tldr, secs: [{h, body}] }] }. 목차(c.study)는 cr.data/main 에 같이 온다.
   본문(강의마다 15~45KB)은 cr.data/main 과 따로 둔다 — 위키가 바뀔 때만 다시 오고, 지도·체크가 바뀔 때는 안 온다 (전송량 — 앱 검증 지침 F17).
   장(위키 요약 한 장 = Part 하나) = 한눈에(tldr) → ★ 핵심(「핵심 …」 칸) → 더보기(나머지 칸) → 이 장의 실습(칸마다 쉬운 설명 + ▶ Brainy 진행)
   → 확인 문제(그 장 실습 칸들의 확인 질문 — 칸 자세히와 같은 셈) → Brainy에게 묻기 → 이전/다음 장.
   주소: #book (다음 칸이 든 장) · #book/<장 번호> · #book/core (★ 핵심 모음). 칸마다 맞는 차시 한 줄은 cell.easy = { t, code, page }. */
const STUDY = {};          // 강의 id -> cr.study 문서 (받은 것)
const studyOn = {};        // 강의 id -> 받기 시작함
function studyLoad(c){
  if (!c || !db || studyOn[c.id]) return;
  studyOn[c.id] = true;
  db.doc("cr.study/" + c.id).onSnapshot(s => { STUDY[c.id] = s.exists ? s.data() : { pages: [] }; if (["book", "cell"].includes(view())) render(); }, () => {});
}
const isCore = s => /^핵심/.test(s.h || "");   // 위키 요약의 「핵심 3가지」 칸 — 처음부터 보이는 ★ 핵심
/* 장 이름 — Part 가 있으면 「Part N」, 없으면 제목의 차시 번호(「CH01-02 iTerm2 세팅」 같은 따로 만든 요약) 또는 「강의 전체」(전체 커리큘럼) */
const pageName = t => t.part != null ? "Part " + t.part : ((t.title || "").match(/(?:CH|Ch)\d+-\d+\s*\S+/) || ["강의 전체"])[0];
const partName = p => p == null ? "강의 전체" : "Part " + p;
/* 장 제목에서 강의 이름·Part 번호를 뗀 것 (「클로드 코드 24시간 가동 Part1 개발 환경 세팅」 → 「개발 환경 세팅」) */
const pageShort = t => (t.part != null ? String(t.title || "").replace(/^.*?Part\s*0*\d+\s*/, "") : "") || t.title || "";
/* 칸의 Part 번호 — 실습은 지도의 Part, 듣기는 「P1 …」 */
const partNo = (c, x) => x.part != null ? x.part : (x.easy && (c.study[x.easy.page] || {}).part) ?? null;
const pageCells = (c, pg) => pg.part == null ? [] : cellsOf(c).filter(x => partNo(c, x) === pg.part);
/* 숫자는 지도와 같은 셈 — 실습 「끝 x/N」의 N은 합친 칸·건너뛴 칸을 뺀 수, 듣기도 건너뛴 칸을 뺀다 (COUNT_RULE 한 곳) */
function pageCount(c, cells){
  const pr = cells.filter(x => !isListen(x) && !["merged", "skip"].includes(x.st)), ls = cells.filter(x => isListen(x) && x.st !== "skip");
  return [pr.length ? `실습 끝 ${pr.filter(x => cellOn(c, x)).length}/${pr.length}` : "", ls.length ? `듣기 끝 ${ls.filter(x => cellOn(c, x)).length}/${ls.length}` : ""].filter(Boolean).join(" · ");
}
/* 확인 문제 — 그 장 실습 칸들의 확인 질문 (안내 줄은 문제가 아님 — 칸 자세히 「확인 질문 N개」와 같은 셈) */
const quizOf = (c, cells) => cells.filter(x => !isListen(x)).flatMap(x => (x.chk || []).filter(q => q.id && q.t).map(q => ({ x, q })));
/* 지금 보는 장 — 주소의 번호, 없으면 다음 칸이 든 장, 그것도 없으면 첫 장 */
function bookSel(c){
  const a = location.hash.split("/")[1] || "", toc = (c && c.study) || [];
  if (a === "core") return "core";
  if (a !== "" && toc[+a]) return +a;
  const x = nextCell(c), p = x ? partNo(c, x) : null, i = toc.findIndex(t => t.part != null && t.part === p);
  return i >= 0 ? i : 0;
}
/* Brainy ctx 가 쓰는 지금 장 (course-brainy.js) — 교과서를 보고 있을 때만 */
function bookNow(c){
  if (view() !== "book" || !c) return null;
  const sel = bookSel(c), doc = STUDY[c.id];
  if (sel === "core" || !doc) return { core: sel === "core" };
  const pg = (doc.pages || [])[sel]; if (!pg) return null;
  const cells = pageCells(c, pg);
  return { pg, name: pageName(pg) + " " + pageShort(pg), cells, quiz: quizOf(c, cells) };
}

function renderBook(c){
  studyLoad(c);
  const toc = c.study || [];
  if (!toc.length) return `<section class="card"><h2>교과서</h2><p>${esc(c.name)} 강의는 아직 교과서로 쓸 위키 요약이 이어져 있지 않아요.</p>
    <p class="small muted" style="margin-top:6px">볼트 지도 카드 머리말(frontmatter)에 <code>study:</code> 로 위키 요약 이름 앞부분을 적으면 여기에 장마다 한눈에·핵심·본문이 보여요.</p></section>`;
  const sel = bookSel(c), doc = STUDY[c.id];
  const cur = sel === "core" ? "★ 핵심 모음" : pageName(toc[sel]) + " · " + pageShort(toc[sel]);
  let h = `<details class="card fold toc"><summary><h2>목차 · <span class="cur">${inline(cur)}</span></h2></summary><nav aria-label="교과서 목차">
    ${toc.map((t, i) => { const n = pageCount(c, pageCells(c, t)); return `<a href="#book/${i}"${sel === i ? ' aria-current="page"' : ""}><b>${esc(pageName(t))}</b><span>${inline(pageShort(t))}</span>${n ? `<small>${esc(n)}</small>` : ""}</a>`; }).join("")}
    <a href="#book/core" class="corelink"${sel === "core" ? ' aria-current="page"' : ""}><b>★</b><span>핵심 모음 — 장마다 핵심을 한 화면에</span></a></nav></details>`;
  if (!doc) return h + `<section class="card"><p class="empty">교과서를 불러오는 중이에요…</p></section>`;
  const pages = doc.pages || [];
  return h + (sel === "core" ? coreAllHtml(c, pages) : chapterHtml(c, pages, sel));
}
function secsHtml(L){ return L.map(s => `<h4>${inline(s.h)}</h4>${mdHtml(s.body)}`).join(""); }
function chapterHtml(c, pages, i){
  const pg = pages[i];
  if (!pg) return `<section class="card"><p class="empty">이 장을 못 찾았어요. 목차에서 다시 골라 주세요.</p></section>`;
  const cells = pageCells(c, pg), keys = nowKeys(c), cnt = pageCount(c, cells), quiz = quizOf(c, cells);
  const core = (pg.secs || []).filter(isCore), rest = (pg.secs || []).filter(s => !isCore(s));
  const prev = pages[i - 1], next = pages[i + 1];
  let h = `<section class="card"><div class="part"><h2>${esc(pageName(pg))}</h2>${cnt ? `<small>${esc(cnt)}</small>` : ""}</div>
    <h3 style="margin:2px 0 10px">${inline(pageShort(pg))}</h3>
    ${pg.tldr ? `<span class="lbl">한눈에</span><div class="tldr">${inline(pg.tldr)}</div>` : ""}</section>`;
  if (core.length) h += `<section class="card core"><h2>★ 핵심 — 이것만은 기억</h2><div class="md">${core.length === 1 ? mdHtml(core[0].body) : secsHtml(core)}</div></section>`;
  if (rest.length) h += `<section class="card"><details class="fold more"><summary><b>더보기 — 교과서 본문 <span class="muted small">(${esc(rest.map(s => s.h).slice(0, 3).join(" · "))}${rest.length > 3 ? " …" : ""})</span></b></summary><div class="md">${secsHtml(rest)}</div></details></section>`;
  if (cells.length) h += `<section class="card"><h2>이 장의 실습 · ${cells.length}칸 — ▶ 를 누르면 Brainy가 맥에서 바로 진행</h2>
    <div>${cells.map(x => `<div class="brow">${cellRow(c, x, keys, x.easy ? x.easy.t : "")}${runMini(c, x)}</div>`).join("")}</div></section>`;
  if (quiz.length) h += `<section class="card"><h2>확인 문제 ${quiz.length}개 — 눌러서 Brainy와 답 맞춰 보기</h2><div class="quiz">
    ${quiz.map(({ x, q }, n) => `<details class="qz"><summary><span>Q${n + 1}. ${inline(q.q || q.t)}${itemOn(c, x, "chk", q) ? ` <span class="pill done">✓ 체크함</span>` : ""}</span></summary>
      <div class="qa"><p class="small muted">「${esc(x.title)}」 칸의 확인 질문이에요. 답은 Brainy가 먼저 묻고, 내 답을 듣고 짚어 줘요.</p>
      <div class="btns"><button type="button" class="btn primary" data-quiz="${esc(x.key)}" data-qid="${esc(q.id)}">✦ Brainy와 답 맞춰 보기</button><button type="button" class="btn" data-cell="${esc(x.key)}">칸 자세히</button></div></div></details>`).join("")}</div></section>`;
  h += `<section class="card ask"><h2>Brainy에게 묻기 — 이 장 내용과 함께 바로 보내요</h2>
    <div class="chips">${["이 장을 더 쉽게 설명해 줘", "핵심만 퀴즈로 내 줘", "내 일에 옮기면 어떻게 돼?"].map(q => `<button type="button" class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <form data-askform class="askf"><input class="ask-in" name="q" placeholder="이 장에서 궁금한 것" maxlength="500" autocomplete="off" enterkeyhint="send" aria-label="Brainy에게 물을 것"><button type="submit" class="btn primary">묻기</button></form>
    <p class="small muted">맥의 Brainy(본계정)가 답해요. 맥이 꺼져 있으면 답하지 않아요.</p></section>`;
  h += `<nav class="lnav" aria-label="앞뒤 장">${prev ? `<a href="#book/${i - 1}">← ${esc(pageName(prev))} ${inline(pageShort(prev))}</a>` : "<span></span>"}${next ? `<a href="#book/${i + 1}">${esc(pageName(next))} ${inline(pageShort(next))} →</a>` : `<a href="#book/core">★ 핵심 모음 →</a>`}</nav>
    <p class="small muted" style="text-align:center">정본: 볼트 위키 「${esc(pg.title)}」</p>`;
  return h;
}
function coreAllHtml(c, pages){
  const L = pages.map((pg, i) => ({ pg, i, core: (pg.secs || []).filter(isCore) })).filter(o => o.core.length);
  return `<section class="card"><h2>★ 핵심 모음</h2><p class="small muted">장마다 「핵심」을 한데 모았어요. 장 이름을 누르면 그 장으로 가요.</p></section>` +
    (L.length ? L.map(o => `<section class="card core"><a class="clink" href="#book/${o.i}">${esc(pageName(o.pg))} · ${inline(pageShort(o.pg))} →</a><div class="md">${o.core.length === 1 ? mdHtml(o.core[0].body) : secsHtml(o.core)}</div></section>`).join("")
      : `<section class="card"><p class="empty">위키 요약에 「핵심」 칸이 아직 없어요.</p></section>`);
}
/* 교과서 실습 줄 옆 단추 — 끝난 칸은 없음, 실습은 ▶ 진행, 듣기는 3줄 요약 */
function runMini(c, x){
  if (cellOn(c, x) || ["merged", "skip"].includes(x.st)) return "";
  return isListen(x) ? `<button type="button" class="btn mini" data-listen="${esc(x.key)}" aria-label="${esc(x.title)} — Brainy에게 3줄 요약 듣기">🎧 요약</button>`
    : `<button type="button" class="btn mini primary" data-do="${esc(x.key)}" aria-label="${esc(x.title)} — Brainy가 진행">▶ 진행</button>`;
}
/* 칸 자세히의 「쉬운 설명」 칸 */
function easyBox(c, x){
  if (!x.easy) return (c.study || []).length ? `<div class="sec"><span class="lbl">쉬운 설명</span><p class="small muted">위키 요약에 이 차시만의 줄이 없어요. ${partNo(c, x) != null ? `<button type="button" class="linkbtn" data-studypart="${partNo(c, x)}">${esc(partName(partNo(c, x)))} 교과서 보기 →</button>` : ""}</p></div>` : "";
  const t = c.study[x.easy.page] || {};
  return `<div class="sec"><span class="lbl">쉬운 설명 — 위키 「${esc(t.title || "")}」 ${esc(x.easy.code)}</span><p>${inline(x.easy.t)}</p>
    <button type="button" class="linkbtn" data-page="${x.easy.page}">${esc(pageName(t))} 교과서 보기 →</button></div>`;
}
/* 교과서에서 Brainy에게 — 지금 장 이름을 앞에 붙여 바로 보낸다 (지금 장 내용은 ctx 가 같이 간다) */
function askBook(q){
  const c = course(), b = bookNow(c);
  brainyGo(`(교과서 ${c.name}${b && b.name ? " · " + b.name : ""}) ${q}`);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-page],[data-studypart],[data-quiz],[data-ask]");
  if (!b) return;
  const c = course(); if (!c) return;
  if (b.dataset.page !== undefined) { location.hash = "book/" + b.dataset.page; return; }
  if (b.dataset.studypart !== undefined) { const i = (c.study || []).findIndex(t => String(t.part) === b.dataset.studypart); location.hash = "book/" + (i >= 0 ? i : ""); return; }
  if (b.dataset.ask) return askBook(b.dataset.ask);
  if (b.dataset.quiz) {
    const x = cellBy(c, b.dataset.quiz), q = x && (x.chk || []).find(it => it.id === b.dataset.qid);
    if (x && q) brainyGo(`(교과서 ${c.name} · ${x.title}) 확인 문제 「${q.q || q.t}」 — 답을 먼저 알려 주지 말고 나에게 물어본 뒤, 내 답을 듣고 맞는지 짚어 줘.`);
  }
});
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-askform]"); if (!f) return;
  e.preventDefault();
  const inp = f.querySelector("input"), q = inp.value.trim(); if (!q) return;
  inp.value = ""; inp.blur(); askBook(q);
});
