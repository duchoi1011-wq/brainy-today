/* ── 강의 — 강의(챕터)별 용어 정리 (맥 단축키 「강의 고르기」와 같은 방식, build.py 가 끼움) ──
   데이터: 볼트 `4_Outputs/체화 단어장/강의 용어.json` → 맥 동기화(app_data.py) → vo.data/lec
   표시(고른 과정·강의, ✓ 외웠어, ★ 즐겨찾기): vo.marks/lec — 모든 기기에서 같다 */
function lsGet(k, d){ try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } }
function lsPut(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
let LEC = lsGet("vo.lec", { courses: [] });
let LM = lsGet("vo.lecm", {});
LM.ok = LM.ok || {}; LM.fav = LM.fav || {}; LM.pk = LM.pk || {};
let lecFilt = "all";
function lmSave(){ lsPut("vo.lecm", LM); if (db) db.doc("vo.marks/lec").set({ ...LM, updatedAt: nowIso() }).catch(() => {}); }
const lecKey = t => "t|" + String(t.t).toLowerCase().replace(/\s+/g, "");
const lecList = () => (LEC.courses || []).filter(c => c.chapters.some(ch => (ch.terms || []).length));
const lecCur = () => { const L = lecList(); return L.find(c => c.id === LM.cur) || L[0] || null; };
const lecChs = c => c.chapters.filter(ch => (ch.terms || []).length);
const lecKeep = t => lecFilt === "all" || (lecFilt === "todo" ? !LM.ok[lecKey(t)] : lecFilt === "ok" ? !!LM.ok[lecKey(t)] : !!LM.fav[lecKey(t)]);

function lecRow(t){
  const k = lecKey(t), ok = !!LM.ok[k], fv = !!LM.fav[k], ref = t.ref && BYID[t.ref];
  return `<div class="lt${ok ? " ok" : ""}"><div class="lt-m"><div class="lt-h"><b>${esc(t.t)}</b>${t.en ? `<small>${esc(t.en)}</small>` : ""}</div>
    <p>${esc(t.d)}</p>${t.ex ? `<p class="lt-ex">${esc(t.ex)}</p>` : ""}
    ${ref ? `<button class="lt-ref" data-detail="${esc(t.ref)}">단어장에 있음 ${pill(lv(t.ref))} 장면·복습 보기 →</button>` : ""}</div>
    <div class="lt-mk"><button class="mk ok" data-lok="${esc(k)}" aria-pressed="${ok}" title="외웠어" aria-label="${esc(t.t)} 외웠어">✓</button><button class="mk fav" data-lfav="${esc(k)}" aria-pressed="${fv}" title="즐겨찾기" aria-label="${esc(t.t)} 즐겨찾기">★</button></div></div>`;
}
function renderLec(){
  const L = lecList();
  if (!L.length) return `<section class="card"><p class="empty">강의 용어를 불러오는 중… 맥이 켜져 있으면 몇 초 안에 떠요.</p></section>`;
  const c = lecCur(), chs = lecChs(c), all = chs.flatMap(ch => ch.terms);
  const sel = chs.find(ch => ch.id === LM.pk[c.id]);
  const base = sel ? sel.terms : all;
  const n = { all: base.length, todo: base.filter(t => !LM.ok[lecKey(t)]).length, ok: base.filter(t => LM.ok[lecKey(t)]).length, fav: base.filter(t => LM.fav[lecKey(t)]).length };
  let h = `<p class="muted" style="margin:6px 2px 10px;font-size:14px">강의를 고르면 <b>그 강의에서 배우는 용어</b>만 모아 봐요. 외운 건 ✓, 다시 볼 건 ★.</p>`;
  h += `<div class="chips lc-pick">${L.map(x => { const tn = lecChs(x).reduce((a, ch) => a + ch.terms.length, 0);
    return `<button class="chip${x.id === c.id ? " on" : ""}" data-lcourse="${esc(x.id)}">${x.tag ? `<b>${esc(x.tag)}</b> ` : ""}${esc(x.name)} <span>${tn}</span></button>`; }).join("")}</div>`;
  h += `<div class="lc-sel"><label for="lc-sel">강의</label><select id="lc-sel" data-lsel="1"><option value="">전체 강의 — 순서대로 다 보기</option>${chs.map(ch => {
    const k = ch.terms.filter(t => LM.ok[lecKey(t)]).length;
    return `<option value="${esc(ch.id)}"${sel === ch ? " selected" : ""}>${k === ch.terms.length ? "✓ " : ""}${esc(ch.title)} (${ch.terms.length})</option>`; }).join("")}</select></div>`;
  h += `<div class="chips" style="margin:2px 0 12px">${[["all", "전체"], ["todo", "아직"], ["ok", "✓ 외운 것"], ["fav", "★ 즐겨찾기"]].map(([k, l]) =>
    `<button class="chip${lecFilt === k ? " on" : ""}" data-lfilt="${k}">${l} <span>${n[k]}</span></button>`).join("")}</div>`;
  if (sel) {
    const i = chs.indexOf(sel), rows = sel.terms.filter(lecKeep);
    h += `<section class="card lc-card"><div class="meta"><span class="tc">${esc(sel.part || "")}</span><span class="muted">${sel.terms.length}개</span></div><h3>${esc(sel.title)}</h3>
      ${rows.length ? rows.map(lecRow).join("") : `<p class="empty">여기엔 없어요.</p>`}</section>
      <div class="lc-nav">${i > 0 ? `<button class="btn ghost" data-lpick="${esc(chs[i - 1].id)}">◀ 이전 강의</button>` : "<span></span>"}
      ${i < chs.length - 1 ? `<button class="btn ghost" data-lpick="${esc(chs[i + 1].id)}">다음 강의 ▶</button>` : "<span></span>"}</div>`;
    return h;
  }
  let part = null;
  chs.forEach(ch => {
    const rows = ch.terms.filter(lecKeep); if (!rows.length) return;
    if (ch.part !== part) { part = ch.part; h += `<p class="lc-part">${esc(part || "")}</p>`; }
    h += `<section class="card lc-card"><button class="lc-h" data-lpick="${esc(ch.id)}"><h3>${esc(ch.title)}</h3><span class="muted">${rows.length} →</span></button>${rows.map(lecRow).join("")}</section>`;
  });
  return h;
}
function lecPick(id){ const c = lecCur(); if (!c) return; if (id) LM.pk[c.id] = id; else delete LM.pk[c.id]; lmSave(); render(); window.scrollTo({ top: 0, behavior: "instant" }); }
document.addEventListener("change", e => { if (e.target && e.target.dataset && e.target.dataset.lsel) lecPick(e.target.value); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-lcourse],[data-lok],[data-lfav],[data-lpick],[data-lfilt]"); if (!b) return;
  const d = b.dataset;
  if (d.lcourse) { LM.cur = d.lcourse; lmSave(); render(); return; }
  if (d.lfilt) { lecFilt = d.lfilt; render(); return; }
  if (d.lpick !== undefined) { lecPick(d.lpick); return; }
  const m = d.lok ? LM.ok : LM.fav, k = d.lok || d.lfav;
  if (m[k]) delete m[k]; else m[k] = 1;
  lmSave(); render();
});
