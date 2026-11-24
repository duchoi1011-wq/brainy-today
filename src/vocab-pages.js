/* ---------- 내가 정리하는 단어장 — 브랜드·상품 페이지 · 스킬 · MCP (2026-11-24 동욱) ----------
   볼트 표를 기다리지 않고 앱에서 바로 채우고 고친다. 문서 vo.marks/pages = { items: [{ id, dom, term, def, when, cand, at }] }.
   · 이름이 볼트 단어(CapCut 등)와 같으면 그 단어의 id·복습 기록을 그대로 같이 쓴다 (단어를 새로 만들지 않는다 — 기존 데이터·기록은 그대로).
   · 「목록 붙여 넣어 올리기」: 분야 이름(제목줄·표의 분야 칸·줄 맨 앞)에 브랜드·상품 / 스킬 / MCP 가 들어가면 그 단어장으로 나눠 올린다.
   · 단축키는 맥 단축키 앱에만 둔다 — 여기는 이름·한 줄 설명·언제 쓰는지만. */
const PAGES = ["브랜드·상품 페이지", "스킬", "MCP"];
const PG_CAT = { "브랜드·상품 페이지": "브랜드·상품", "스킬": "스킬", "MCP": "MCP" };
const PGKEY = "chewha-vocab-pages-v1";
/* 문서가 아직 없을 때 한 번만 넣는 처음 후보 — 넣은 뒤로는 앱에서 빼고 더한다 */
const PG_SEED = [
  ...["CapCut", "vidIQ", "VOICEVOX", "Figma", "Suno (수노)", "Premiere Pro", "GPT Image", "타입캐스트", "Pretendard (프리텐다드)"].map(term => ({ dom: "브랜드·상품 페이지", term, cand: true })),
  ...["review-coach", "content-discovery", "content-recommend", "memory-check"].map(term => ({ dom: "스킬", term, cand: true })),
  ...["네이버 광고 MCP", "피그마 MCP", "CapCut MCP"].map(term => ({ dom: "MCP", term, cand: true }))
];
let PG = { items: [] };
const PGD = { term: "", def: "", when: "", paste: "", rows: null, edit: null, msg: "" };
const pgId = () => "pg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pgNorm = s => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[\s·_\-]/g, "");
function pgMatch(it){
  const n = pgNorm(it.term); if (!n) return null;
  return VAULT.find(t => t.dom !== "외국어 단어장" && (pgNorm(t.term) === n || tokens(t.term).some(x => pgNorm(x) === n))) || null;
}
/* 볼트 단어 + 내가 정리한 것 → ALL. 볼트와 이름이 같은 것은 따로 만들지 않고 그 단어를 이 단어장에도 보여 준다 */
let VAULT = [];
function buildAll(){
  VAULT = DATA.terms.concat(FOREIGN).map(t => ({ ...t, dom: domFor(t) }));
  const own = (PG.items || []).filter(it => PAGES.includes(it.dom) && !pgMatch(it))
    .map(it => ({ id: it.id, term: it.term, def: it.def || "", when: it.when || "", cat: PG_CAT[it.dom], dom: it.dom, at: it.at || "", mine: it.id }));
  ALL = VAULT.concat(own);
  BYID = Object.fromEntries(ALL.map(t => [t.id, t]));
}
function pgTerms(d){
  const out = ALL.filter(t => t.dom === d); if (!PAGES.includes(d)) return out;
  (PG.items || []).filter(it => it.dom === d).forEach(it => {
    const m = pgMatch(it); if (!m) return;
    const sh = { ...m, def: it.def || m.def || "", when: it.when || m.when || "", dom: d, cat: m.dom === d ? m.cat : PG_CAT[d], mine: it.id };
    const i = out.findIndex(t => t.id === m.id);
    if (i >= 0) out[i] = sh; else out.push(sh);
  });
  return out;
}
const pgCount = d => pgTerms(d).length;
const pgItemOf = t => (PG.items || []).find(it => it.id === t.mine);

function pgSave(items, msg){
  PG = { ...PG, items, seeded: true, updatedAt: nowIso() };
  if (msg !== undefined) PGD.msg = msg;
  if (mode === "db" && db) db.doc("vo.marks/pages").set(PG).catch(() => { PGD.msg = "저장하지 못했어요. 잠시 후 다시 해 주세요."; render(); });
  else { try { localStorage.setItem(PGKEY, JSON.stringify(PG)); } catch(e) {} }
  pgApply();
}
function pgApply(){ buildAll(); wikiCats(); refreshTerms(); render(); }
function pgLoadLocal(){ try { const v = JSON.parse(localStorage.getItem(PGKEY) || "null"); PG = v && Array.isArray(v.items) ? v : { items: pgSeedItems() }; } catch(e) { PG = { items: pgSeedItems() }; } pgApply(); }
const pgSeedItems = () => PG_SEED.map(s => ({ id: pgId(), def: "", when: "", at: today(), ...s }));
function pgWatch(){
  db.doc("vo.marks/pages").onSnapshot(s => {
    const v = s.exists ? s.data() : null;
    if (v && Array.isArray(v.items)) { PG = v; pgApply(); return; }
    if (!s.metadata.fromCache && !PG.seeded) pgSave(pgSeedItems());   // 처음 한 번 — 후보를 넣어 둔다
  }, () => {});
}

/* 붙여 넣은 목록 나누기 — 분야 이름에 브랜드·상품 / 스킬 / MCP 가 들어가면 그 단어장 */
function pgDomOf(s){ s = String(s || ""); if (/mcp/i.test(s)) return "MCP"; if (/스킬|skill/i.test(s)) return "스킬"; if (/브랜드|상품|brand|product/i.test(s)) return "브랜드·상품 페이지"; return ""; }
const pgClean = s => String(s || "").trim().replace(/^\*\*|\*\*$/g, "").replace(/^`|`$/g, "").trim();
function pgParse(txt){
  const rows = []; let sec = "", hdr = null;
  String(txt || "").split(/\r?\n/).forEach(raw => {
    let l = raw.trim(); if (!l || /^\|?[\s:|-]{3,}$/.test(l)) return;
    const head = l.match(/^#{1,6}\s*(.+)$/) || l.match(/^\[([^\]]+)\]$/) || l.match(/^(?:분야|종류|구분)\s*[:：]\s*(.+)$/) || (l.length <= 30 && /[:：]$/.test(l) ? [l, l.slice(0, -1)] : null);
    if (head) { sec = pgDomOf(head[1]); hdr = null; return; }
    l = l.replace(/^(?:[-*•]|\d+[.)])\s+/, "").replace(/^\[[ xX]\]\s*/, "");
    let parts = l.includes("|") ? l.replace(/^\||\|$/g, "").split("|") : l.includes("\t") ? l.split("\t") : l.split(/\s+[—–-]\s+/);
    if (parts.length === 1) { const m = l.match(/^([^:：]{1,60})[:：]\s*(.+)$/); if (m) parts = [m[1], m[2]]; }
    parts = parts.map(pgClean);
    /* 표 머리줄 — 이름·설명·언제·분야 칸 위치를 기억 */
    const hk = parts.map(p => /^(이름|name|항목)$/i.test(p) ? "term" : /^(설명|한 ?줄.*|description|뜻)$/i.test(p) ? "def" : /^(언제.*|용도|when|쓰임)$/i.test(p) ? "when" : /^(분야|종류|구분|type|category)$/i.test(p) ? "dom" : "");
    if (hk.filter(Boolean).length >= 2) { hdr = hk; return; }
    let r;
    if (hdr) { r = {}; hdr.forEach((k, i) => { if (k) r[k] = parts[i] || ""; }); r.dom = pgDomOf(r.dom); if (!r.term) r.term = parts.find((p, i) => !hdr[i]) || ""; }
    else {
      let dom = "";
      if (parts.length > 1 && parts[0].length <= 12 && pgDomOf(parts[0]) && pgNorm(parts[0]).replace(/브랜드|상품|페이지|스킬|mcp|skills?|분야/g, "") === "") dom = pgDomOf(parts.shift());
      r = { term: parts[0] || "", def: parts[1] || "", when: parts.slice(2).join(" · "), dom };
    }
    r.term = String(r.term || "").slice(0, 80); if (!r.term) return;
    r.dom = r.dom || sec || (/mcp/i.test(r.term) ? "MCP" : "");
    rows.push({ term: r.term, def: String(r.def || "").slice(0, 200), when: String(r.when || "").slice(0, 200), dom: r.dom });
  });
  return rows.slice(0, 300);
}
function pgUpload(rows){
  const items = (PG.items || []).slice(); let add = 0, upd = 0;
  rows.filter(r => r.dom && r.term).forEach(r => {
    const i = items.findIndex(it => it.dom === r.dom && pgNorm(it.term) === pgNorm(r.term));
    if (i >= 0) { items[i] = { ...items[i], def: r.def || items[i].def, when: r.when || items[i].when, cand: false }; upd++; }
    else { items.push({ id: pgId(), dom: r.dom, term: r.term, def: r.def, when: r.when, at: today() }); add++; }
  });
  const skip = rows.filter(r => !r.dom).length;
  pgSave(items, `올렸어요 — 새로 ${add}개 · 고침 ${upd}개${skip ? ` · 분야를 몰라 뺀 줄 ${skip}개` : ""}.`);
}

function pgCard(){
  const d = S.domain, list = TERMS.slice().sort((a, b) => String(a.term).localeCompare(String(b.term), "ko"));
  const what = d === "브랜드·상품 페이지" ? "내가 쓰는 브랜드·상품과 그 페이지(상세페이지·랜딩)" : d === "스킬" ? "내가 만든 Claude 스킬" : "Claude에 연결해 둔 MCP";
  const row = t => {
    const it = pgItemOf(t);
    if (it && PGD.edit === it.id) return `<div class="pg-row stack">
      <input class="pg-in" data-pge="term" value="${esc(PGD.term)}" placeholder="이름" aria-label="이름">
      <input class="pg-in" data-pge="def" value="${esc(PGD.def)}" placeholder="한 줄 설명" aria-label="한 줄 설명">
      <input class="pg-in" data-pge="when" value="${esc(PGD.when)}" placeholder="언제 쓰나요" aria-label="언제 쓰는지">
      <div class="btns"><button class="btn primary" data-pg="esave">저장</button><button class="btn ghost" data-pg="ecancel">취소</button></div></div>`;
    return `<div class="pg-row"><div class="t"><b>${esc(t.term)}</b>${it?.cand ? ` <span class="pill">후보</span>` : ""}
      <span>${t.def ? rich(t.def) : `<span class="muted">한 줄 설명이 비어 있어요</span>`}</span>
      ${t.when ? `<span class="small muted">언제 · ${esc(t.when)}</span>` : ""}</div>
      <div class="btns">${it ? `${it.cand ? `<button class="btn ghost" data-pg="keep" data-id="${it.id}">남기기</button>` : ""}<button class="btn ghost" data-pg="edit" data-id="${it.id}">✎</button><button class="btn ghost" data-pg="del" data-id="${it.id}" aria-label="${esc(t.term)} 빼기">빼기</button>` : `<span class="small muted">볼트에서 와요</span>`}</div></div>`;
  };
  const rows = PGD.rows;
  return `<section class="card stack pg">
    <h2>${esc(d)} 정리 <span class="mono muted" style="font-size:14px">${list.length}</span></h2>
    <p class="small muted">${what}을 하나씩 적어 두는 단어장이에요. 앱에서 바로 더하고 고치고 뺄 수 있어요. 이름이 단어장에 있는 단어와 같으면 그 단어의 복습 기록을 같이 써요.${d === "MCP" ? " 단축키는 맥 단축키 앱에만 둬요." : ""}</p>
    ${PGD.msg ? `<p class="note">${esc(PGD.msg)}</p>` : ""}
    <div class="pg-list">${list.length ? list.map(row).join("") : `<p class="empty">아직 비어 있어요. 아래에서 더하거나 목록을 붙여 넣어 주세요.</p>`}</div>
    ${PGD.edit ? "" : `<div class="stack pg-add"><span class="lbl">하나 더하기</span>
      <input class="pg-in" data-pgd="term" value="${esc(PGD.term)}" placeholder="이름" aria-label="이름">
      <input class="pg-in" data-pgd="def" value="${esc(PGD.def)}" placeholder="한 줄 설명" aria-label="한 줄 설명">
      <input class="pg-in" data-pgd="when" value="${esc(PGD.when)}" placeholder="언제 쓰나요" aria-label="언제 쓰는지">
      <div class="btns"><button class="btn primary" data-pg="add">${esc(d)}에 더하기</button></div></div>`}
    <details class="pg-up"${PGD.paste || rows ? " open" : ""}><summary><b>목록 붙여 넣어 올리기</b> <span class="small muted">— 브랜드·상품 / 스킬 / MCP 로 알아서 나눠요</span></summary>
      <p class="small muted" style="margin:8px 0">최신 스킬·MCP 목록을 그대로 붙여 넣으세요. 「## 스킬」「MCP:」 같은 제목줄이나 표의 분야 칸, 줄 맨 앞 분야 이름(<code>MCP | 이름 | 설명 | 언제</code>)으로 나눠요. 한 줄은 <code>이름 — 한 줄 설명 — 언제 쓰나</code>처럼 적어요. 이미 있는 이름은 설명만 새로 고쳐요.</p>
      <textarea class="pg-in" data-pgd="paste" rows="6" placeholder="## 스킬&#10;- review-coach — 한 줄 설명 — 언제 쓰나&#10;## MCP&#10;- 피그마 MCP — 한 줄 설명 — 언제 쓰나" aria-label="붙여 넣을 목록">${esc(PGD.paste)}</textarea>
      <div class="btns"><button class="btn ghost" data-pg="parse">나눠 보기</button>${rows ? `<button class="btn primary" data-pg="upload" ${rows.some(r => r.dom) ? "" : "disabled"}>${rows.filter(r => r.dom).length}개 올리기</button><button class="btn ghost" data-pg="pcancel">취소</button>` : ""}</div>
      ${rows ? (rows.length ? `<div class="pg-list">${rows.map((r, i) => `<div class="pg-row"><div class="t"><b>${esc(r.term)}</b><span>${esc(r.def) || `<span class="muted">설명 없음</span>`}</span>${r.when ? `<span class="small muted">언제 · ${esc(r.when)}</span>` : ""}</div>
        <select data-pgrow="${i}" aria-label="${esc(r.term)} 분야">${[["", "분야 고르기"], ...PAGES.map(p => [p, p])].map(([v, n]) => `<option value="${esc(v)}"${r.dom === v ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`).join("")}</div>` : `<p class="empty">나눌 줄을 찾지 못했어요.</p>`) : ""}
    </details>
  </section>`;
}

document.addEventListener("input", e => {
  const k = e.target.dataset?.pgd || e.target.dataset?.pge; if (k) PGD[k] = e.target.value;
});
document.addEventListener("change", e => {
  const i = e.target.dataset?.pgrow; if (i !== undefined && PGD.rows?.[i]) { PGD.rows[i].dom = e.target.value; document.activeElement?.blur?.(); render(); }
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-pg]"); if (!b) return;
  const a = b.dataset.pg, id = b.dataset.id, items = (PG.items || []).slice(), it = items.find(x => x.id === id);
  document.activeElement?.blur?.();
  if (a === "add") {
    const term = PGD.term.trim().slice(0, 80); if (!term) { PGD.msg = "이름을 적어 주세요."; render(); return; }
    if (items.some(x => x.dom === S.domain && pgNorm(x.term) === pgNorm(term))) { PGD.msg = "이미 있는 이름이에요. ✎로 고쳐 주세요."; render(); return; }
    items.push({ id: pgId(), dom: S.domain, term, def: PGD.def.trim().slice(0, 200), when: PGD.when.trim().slice(0, 200), at: today() });
    PGD.term = PGD.def = PGD.when = ""; pgSave(items, `「${term}」을 더했어요.`); return;
  }
  if (a === "edit" && it) { PGD.edit = id; PGD.term = it.term; PGD.def = it.def || ""; PGD.when = it.when || ""; PGD.msg = ""; render(); return; }
  if (a === "ecancel") { PGD.edit = null; PGD.term = PGD.def = PGD.when = ""; render(); return; }
  if (a === "esave") {
    const j = items.findIndex(x => x.id === PGD.edit), term = PGD.term.trim().slice(0, 80);
    if (j >= 0 && term) items[j] = { ...items[j], term, def: PGD.def.trim().slice(0, 200), when: PGD.when.trim().slice(0, 200), cand: false };
    PGD.edit = null; PGD.term = PGD.def = PGD.when = ""; pgSave(items, "고쳤어요."); return;
  }
  if (a === "keep" && it) { pgSave(items.map(x => x.id === id ? { ...x, cand: false } : x), `「${it.term}」을 남겼어요.`); return; }
  if (a === "del" && it) { pgSave(items.filter(x => x.id !== id), `「${it.term}」을 뺐어요. 복습 기록은 그대로 남아요.`); return; }
  if (a === "parse") { PGD.rows = pgParse(PGD.paste); PGD.msg = ""; render(); return; }
  if (a === "pcancel") { PGD.rows = null; render(); return; }
  if (a === "upload" && PGD.rows) { const r = PGD.rows; PGD.rows = null; PGD.paste = ""; pgUpload(r); return; }
});
