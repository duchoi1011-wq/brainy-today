/* ── 강의 · 분야 — 강의(챕터)별 / 학습 분야별 용어, 거기서 바로 익히기, 용어를 누르면 맥락 (build.py 가 끼움) ──
   데이터: 볼트 `4_Outputs/체화 단어장/강의 용어.json` → 맥 동기화(app_data.py) → vo.data/lec  (용어마다 f = 학습 분야)
           + 용어 사전(vo.data/main)의 영상 편집 용어는 그 분류(cat)로 분야에 함께 나온다
   표시(고른 과정·강의·분야, ✓ 외웠어, ★): vo.marks/lec — 모든 기기에서 같다
   맥락(장면·쉽게·정확히·모르면·Claude에게): 누르면 맥의 Brainy가 만들어 ctx/lt-<번호> 에 둔다 (사전 용어는 기존 ctx/<id>) */
function lsGet(k, d){ try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } }
function lsPut(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
/* 강의 데이터 다듬기 — 챕터·용어가 빠졌거나 모양이 다른 항목이 있으면 강의 탭이 그리다 멈추므로 걸러 낸다 */
function lecNorm(v){
  const cs = v && Array.isArray(v.courses) ? v.courses : [];
  return { ...(v || {}), courses: cs.filter(c => c && typeof c === "object").map(c => ({ ...c, id: String(c.id ?? c.name ?? ""), name: String(c.name ?? c.id ?? ""),
    chapters: (Array.isArray(c.chapters) ? c.chapters : []).filter(ch => ch && typeof ch === "object").map(ch => ({ ...ch, id: String(ch.id ?? ch.title ?? ""), title: String(ch.title ?? ch.id ?? ""),
      terms: (Array.isArray(ch.terms) ? ch.terms : []).filter(t => t && t.t).map(t => ({ ...t, t: String(t.t), d: String(t.d ?? "") })) })) })) };
}
let LEC = lecNorm(lsGet("vo.lec", { courses: [] }));
let LM = lsGet("vo.lecm", {});
if (!LM || typeof LM !== "object") LM = {};
LM.ok = LM.ok || {}; LM.fav = LM.fav || {}; LM.pk = LM.pk || {};
let lecFilt = "all", LSTUDY = null, LDET = null;   // LSTUDY: 바로 익히기 {list,i,flip,again,ok,title} · LDET: 맥락 보는 용어
function lmSave(){ lsPut("vo.lecm", LM); if (db) db.doc("vo.marks/lec").set({ ...LM, updatedAt: nowIso() }).catch(() => {}); }
const lecKey = t => "t|" + String(t.t).toLowerCase().replace(/\s+/g, "");
const lecList = () => (LEC.courses || []).filter(c => c.chapters.some(ch => (ch.terms || []).length));
const lecCur = () => { const L = lecList(); return L.find(c => c.id === LM.cur) || L[0] || null; };
const lecChs = c => c.chapters.filter(ch => (ch.terms || []).length);
const lecKeep = t => lecFilt === "all" || (lecFilt === "todo" ? !LM.ok[lecKey(t)] : lecFilt === "ok" ? !!LM.ok[lecKey(t)] : !!LM.fav[lecKey(t)]);
const FIELDS = [["영상 편집", ["편집·구성", "촬영", "오디오", "색", "자막", "모션"]],
  ["AI·일", ["AI·Claude 활용", "자동화·에이전트", "터미널·개발 환경", "지식관리·PKM", "비즈니스·기획", "콘텐츠·마케팅", "디자인·이미지"]]];
const CAT2F = { "AI 편집 자동화": "AI·Claude 활용" };

// 모든 용어 (강의 + 용어 사전) — 같은 용어는 한 번, 강의에서 처음 나온 곳을 출처로
let _allLec = null, _allAll = null, _all = [], _byKey = {};
function allTerms(){
  if (_allLec === LEC && _allAll === ALL) return _all;   // 데이터가 새로 오면(새 객체) 다시 만든다
  const out = [], by = {}, refd = new Set();
  (LEC.courses || []).forEach(c => c.chapters.forEach(ch => (ch.terms || []).forEach(t => {
    const k = lecKey(t); if (by[k]) return;
    const o = { ...t, src: `${c.tag ? c.tag + " · " : ""}${ch.title}`, cid: c.id, chid: ch.id };
    by[k] = o; out.push(o); if (t.ref) refd.add(t.ref);
  })));
  ALL.filter(x => x.dom !== "외국어 단어장" && !refd.has(x.id)).forEach(x => {
    const o = { t: x.term, d: String(x.def || "").replace(/`/g, ""), ref: x.id, f: CAT2F[x.cat] || x.cat, src: "용어 사전 · " + x.cat };
    const k = lecKey(o); if (by[k]) return; by[k] = o; out.push(o);
  });
  _allLec = LEC; _allAll = ALL; _all = out; _byKey = by; return out;
}
const termOf = k => (allTerms(), _byKey[k]);
const fieldOf = t => t.f || (t.ref && BYID[t.ref] ? (CAT2F[BYID[t.ref].cat] || BYID[t.ref].cat) : "");

function lecRow(t){
  const k = lecKey(t), ok = !!LM.ok[k], fv = !!LM.fav[k], c = lecCtxOf(t);
  return `<div class="lt${ok ? " ok" : ""}"><button class="lt-m" data-lterm="${esc(k)}"><span class="lt-h"><b>${esc(t.t)}</b>${t.en ? `<small>${esc(t.en)}</small>` : ""}${t.ref && BYID[t.ref] ? " " + pill(lv(t.ref)) : ""}</span>
    <span class="lt-d">${esc(t.d)}</span>${t.ex ? `<span class="lt-ex">${esc(t.ex)}</span>` : ""}<span class="lt-go">${c ? "맥락 보기 →" : "눌러서 맥락 만들기 →"}</span></button>
    <div class="lt-mk"><button class="mk ok" data-lok="${esc(k)}" aria-pressed="${ok}" title="외웠어" aria-label="${esc(t.t)} 외웠어">✓</button><button class="mk fav" data-lfav="${esc(k)}" aria-pressed="${fv}" title="즐겨찾기" aria-label="${esc(t.t)} 즐겨찾기">★</button></div></div>`;
}
function filtChips(base){
  const n = { all: base.length, todo: base.filter(t => !LM.ok[lecKey(t)]).length, ok: base.filter(t => LM.ok[lecKey(t)]).length, fav: base.filter(t => LM.fav[lecKey(t)]).length };
  return `<div class="chips" style="margin:2px 0 12px">${[["all", "전체"], ["todo", "아직"], ["ok", "✓ 외운 것"], ["fav", "★"]].map(([k, l]) =>
    `<button class="chip${lecFilt === k ? " on" : ""}" data-lfilt="${k}">${l} <span>${n[k]}</span></button>`).join("")}</div>`;
}
function studyBtn(list, title){
  const todo = list.filter(t => !LM.ok[lecKey(t)]).length;
  return `<button class="btn primary lc-study" data-lstudy="${esc(title)}">▶ 바로 익히기 · ${todo || list.length}개</button>`;
}

/* ── 강의 탭 ── */
function renderLec(){
  if (LDET) return renderTermCtx();
  if (LSTUDY) return renderStudy();
  const L = lecList();
  if (!L.length) return `<section class="card"><p class="empty">강의 용어를 불러오는 중… 맥이 켜져 있으면 몇 초 안에 떠요.</p></section>`;
  const c = lecCur(), chs = lecChs(c), sel = chs.find(ch => ch.id === LM.pk[c.id]);
  const base = sel ? sel.terms : chs.flatMap(ch => ch.terms);
  let h = `<div class="chips lc-pick">${L.map(x => { const tn = lecChs(x).reduce((a, ch) => a + ch.terms.length, 0);
    return `<button class="chip${x.id === c.id ? " on" : ""}" data-lcourse="${esc(x.id)}">${x.tag ? `<b>${esc(x.tag)}</b> ` : ""}${esc(x.name)} <span>${tn}</span></button>`; }).join("")}</div>`;
  h += `<div class="lc-sel"><label for="lc-sel">강의</label><select id="lc-sel" data-lsel="1"><option value="">전체 강의 — 순서대로 다 보기</option>${chs.map(ch => {
    const k = ch.terms.filter(t => LM.ok[lecKey(t)]).length;
    return `<option value="${esc(ch.id)}"${sel === ch ? " selected" : ""}>${k === ch.terms.length ? "✓ " : ""}${esc(ch.title)} (${ch.terms.length})</option>`; }).join("")}</select></div>`;
  h += filtChips(base);
  if (sel) {
    const i = chs.indexOf(sel), rows = sel.terms.filter(lecKeep);
    h += `<section class="card lc-card"><div class="meta"><span class="tc">${esc(sel.part || "")}</span>${studyBtn(sel.terms, sel.title)}</div><h3>${esc(sel.title)}</h3>
      ${rows.length ? rows.map(lecRow).join("") : `<p class="empty">여기엔 없어요.</p>`}</section>
      <div class="lc-nav">${i > 0 ? `<button class="btn ghost" data-lpick="${esc(chs[i - 1].id)}">◀ 이전 강의</button>` : "<span></span>"}
      ${i < chs.length - 1 ? `<button class="btn ghost" data-lpick="${esc(chs[i + 1].id)}">다음 강의 ▶</button>` : "<span></span>"}</div>`;
    return h;
  }
  h += `<div class="btns" style="margin:0 0 12px">${studyBtn(base, c.name)}</div>`;
  let part = null;
  chs.forEach(ch => {
    const rows = ch.terms.filter(lecKeep); if (!rows.length) return;
    if (ch.part !== part) { part = ch.part; h += `<p class="lc-part">${esc(part || "")}</p>`; }
    h += `<section class="card lc-card"><button class="lc-h" data-lpick="${esc(ch.id)}"><h3>${esc(ch.title)}</h3><span class="muted">${rows.length} →</span></button>${rows.map(lecRow).join("")}</section>`;
  });
  return h;
}

/* ── 분야 탭 ── */
function renderField(){
  if (LDET) return renderTermCtx();
  if (LSTUDY) return renderStudy();
  const all = allTerms(), cnt = {};
  all.forEach(t => { const f = fieldOf(t); if (f) cnt[f] = (cnt[f] || 0) + 1; });
  const cur = LM.field && cnt[LM.field] ? LM.field : (FIELDS.flatMap(g => g[1]).find(f => cnt[f]) || "");
  let h = FIELDS.map(([g, fs]) => { const xs = fs.filter(f => cnt[f]); return xs.length ? `<p class="lc-part" style="margin:8px 2px 6px">${esc(g)}</p><div class="chips lc-pick">${xs.map(f =>
    `<button class="chip${f === cur ? " on" : ""}" data-lfield="${esc(f)}">${esc(f)} <span>${cnt[f]}</span></button>`).join("")}</div>` : ""; }).join("");
  if (!cur) return h + `<section class="card"><p class="empty">분야를 불러오는 중… 맥이 켜져 있으면 몇 초 안에 떠요.</p></section>`;
  const base = all.filter(t => fieldOf(t) === cur), rows = base.filter(lecKeep);
  h += filtChips(base);
  h += `<section class="card lc-card"><div class="meta"><h3 style="margin:0">${esc(cur)}</h3>${studyBtn(base, cur)}</div>
    ${rows.length ? rows.map(t => lecRow(t).replace('<span class="lt-go">', `<span class="lt-src">${esc(t.src || "")}</span><span class="lt-go">`)).join("") : `<p class="empty">여기엔 없어요.</p>`}</section>`;
  return h;
}

/* ── 바로 익히기: 용어 → 뒤집기 → 알았어 ✓ / 다시 볼래 ── */
function startStudy(list, title){
  const todo = list.filter(t => !LM.ok[lecKey(t)]);
  const pick = (todo.length ? todo : list).slice().sort((a, b) => hash(lecKey(a) + kday()) - hash(lecKey(b) + kday())).slice(0, 15);
  LSTUDY = { list: pick, i: 0, flip: false, again: new Set(), ok: 0, title }; LDET = null; render(); window.scrollTo({ top: 0, behavior: "instant" });
}
function renderStudy(){
  const s = LSTUDY, t = s.list[s.i];
  if (!t) return `<section class="card stack"><h3>다 봤어요 · ${esc(s.title)}</h3><p class="muted">알았어 ✓ ${s.ok}개 · 다시 본 것 ${s.again.size}개</p>
    <div class="btns"><button class="btn" data-lstudyend="1">목록으로</button><button class="btn primary" data-lstudyagain="1">한 번 더</button></div></section>`;
  let h = `<div class="meta" style="margin:4px 2px 8px"><span class="tc">${esc(s.title)} · ${s.i + 1}/${s.list.length}</span><button class="btn ghost" data-lstudyend="1" style="padding:6px 12px">그만</button></div>
    <div class="lc-bar"><i style="width:${Math.round(s.i / s.list.length * 100)}%"></i></div>`;
  h += `<section class="card stack lc-flash" data-lflip="1"><span class="tc">${esc(t.src || "")}</span><h3 style="font-size:26px;margin:6px 0">${esc(t.t)}</h3>${t.en ? `<p class="muted">${esc(t.en)}</p>` : ""}`;
  if (!s.flip) return h + `<p class="muted small">뜻을 떠올린 뒤 눌러서 뒤집어요.</p></section>`;
  const c = lecCtxOf(t);
  h += `<div class="scene"><span class="lbl">뜻</span>${esc(t.d)}</div>${t.ex ? `<p class="small">${esc(t.ex)}</p>` : ""}
    ${c && c.easy ? `<p class="small muted"><b>쉽게 말하면</b> · ${esc(c.easy)}</p>` : ""}
    <button class="btn ghost" data-lterm="${esc(lecKey(t))}" style="align-self:flex-start;padding:6px 12px">맥락 자세히 →</button></section>
    <div class="btns lc-gr"><button class="btn" data-lgrade="again">다시 볼래</button><button class="btn primary" data-lgrade="ok">알았어 ✓</button></div>`;
  return h;
}
function lecGrade(r){
  const s = LSTUDY, t = s.list[s.i]; if (!t) return;
  const k = lecKey(t);
  if (r === "ok") { s.ok++; LM.ok[k] = 1; lmSave(); if (t.ref && BYID[t.ref] && lv(t.ref) < 2) save(t.ref, { level: 2, fuzzy: false, lastSeen: nowIso() }, "강의·분야 익히기: 알았음"); }
  else if (!s.again.has(k)) { s.again.add(k); s.list.splice(Math.min(s.list.length, s.i + 4), 0, t); }
  s.i++; s.flip = false; render();
}

/* ── 용어 맥락: 장면 · 쉽게 · 정확히 · 모르면 · Claude에게 — 없으면 맥의 Brainy가 만든다 ── */
const lecCtxId = t => (t.ref && BYID[t.ref] && ctxOk(t.ref)) ? t.ref : "lt-" + hash(lecKey(t)).toString(36);
const lecCtxOf = t => { const id = lecCtxId(t), c = CTX[id]; return c && c.scene ? c : null; };
const lecBusy = new Set(), lecErr = {};
function lecCtxPrompt(t){
  return `동욱이 강의에서 배운 용어를 정확히 이해하도록 돕는 카드를 만든다. 동욱은 행사·부스 영상 일을 하고, Claude Code·옵시디언으로 자기 일을 자동화하는 중이다.
용어: ${t.t}${t.en ? ` (${t.en})` : ""}
강의에서 준 뜻: ${t.d}${t.ex ? `\n강의 속 쓰임: ${t.ex}` : ""}
나온 곳: ${t.src || ""}

규칙: 한국어 해요체. 중학생도 알아듣게. 강의 뜻과 어긋나지 않게, 확실하지 않은 수치는 쓰지 않는다.
JSON 하나만 출력: {"scene": "동욱 일 속 이 용어가 필요한 한 순간 — 용어 이름은 넣지 말고 '이걸 뭐라고 하죠?'로 끝 (60자 안팎)", "easy": "일상 비유 한 문장", "exact": "정확한 정의 2~3문장 — 무엇이고, 비슷한 것과 무엇이 다른지", "why": "모르면 생기는 일 한 문장", "ask": "Claude에게 이 용어를 넣어 맡길 짧은 요청 한 문장"}`;
}
function ensureLecCtx(t, force){
  const id = lecCtxId(t);
  if (!sample || lecBusy.has(id) || (!force && (lecCtxOf(t) || lecErr[id]))) return;
  lecBusy.add(id); delete lecErr[id];
  sample.json(lecCtxPrompt(t), { cache: false }).then(r => {
    const c = { v: CTXV, scene: String(r?.scene || ""), easy: String(r?.easy || ""), exact: String(r?.exact || ""), why: String(r?.why || ""), ask: String(r?.ask || ""), term: t.t, at: nowIso(), by: "lec" };
    if (!c.scene && !c.exact) throw { code: "empty" };
    CTX = { ...CTX, [id]: c };
    if (mode === "db" && db) db.doc("ctx/" + id).set(c).catch(() => {});
  }).catch(e => {
    if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e?.code)) { sample = null; sampleChecked = true; }
    else lecErr[id] = e?.code === "rate_limited" ? "요청이 많아 아직 못 만들었어요." : "맥락을 만들지 못했어요 — 맥이 켜져 있는지 봐 주세요.";
  }).then(() => { lecBusy.delete(id); render(); });
}
function renderTermCtx(){
  const t = termOf(LDET); if (!t) { LDET = null; return ""; }
  const id = lecCtxId(t), c = lecCtxOf(t), k = lecKey(t), ok = !!LM.ok[k], fv = !!LM.fav[k];
  if (!c) ensureLecCtx(t);
  const row = (lbl, v) => v ? `<div class="ly"><span class="lbl">${lbl}</span>${esc(v)}</div>` : "";
  let h = `<button class="btn ghost" data-lback="1" style="margin:4px 0 10px;padding:6px 12px">← ${LSTUDY ? "익히기로" : "목록으로"}</button>
    <section class="card stack"><div class="meta"><span class="tc">${esc(t.src || "")}</span>${t.ref && BYID[t.ref] ? pill(lv(t.ref)) : ""}</div>
    <h3 style="font-size:24px;margin:2px 0">${esc(t.t)}</h3>${t.en ? `<p class="muted" style="margin:0">${esc(t.en)}</p>` : ""}
    <div class="scene"><span class="lbl">강의에서 뜻</span>${esc(t.d)}</div>${t.ex ? `<p class="small">${esc(t.ex)}</p>` : ""}`;
  if (c) h += `${c.scene ? `<div class="scene"><span class="lbl">이런 순간</span>${esc(c.scene)}</div>` : ""}<div class="layers">${row("정확히", c.exact)}${row("쉽게 말하면", c.easy)}${row("모르면", c.why)}${row("Claude에게 이렇게", c.ask)}</div>
    ${sample ? `<button class="btn ghost" data-lregen="${esc(k)}" style="align-self:flex-start;padding:6px 12px"${lecBusy.has(id) ? " disabled" : ""}>${lecBusy.has(id) ? "다시 만드는 중…" : "맥락 다시 만들기"}</button>` : ""}`;
  else if (lecBusy.has(id)) h += `<p class="muted">맥의 Brainy가 이 용어의 맥락을 만드는 중… (보통 10~30초)</p>`;
  else if (lecErr[id]) h += `<p class="muted">${esc(lecErr[id])}</p><button class="btn" data-lregen="${esc(k)}">다시 만들기</button>`;
  else if (!sample) h += `<p class="muted">이 화면에서는 맥락을 만들 수 없어요.</p>`;
  h += `<div class="btns"><button class="btn${ok ? " primary" : ""}" data-lok="${esc(k)}">${ok ? "✓ 외웠어" : "외웠어 ✓"}</button><button class="btn${fv ? " primary" : ""}" data-lfav="${esc(k)}">★ ${fv ? "즐겨찾기됨" : "즐겨찾기"}</button>
    ${t.ref && BYID[t.ref] ? `<button class="btn ghost" data-detail="${esc(t.ref)}">단어장에서 보기</button>` : ""}</div></section>`;
  return h;
}

function lecPick(id){ const c = lecCur(); if (!c) return; if (id) LM.pk[c.id] = id; else delete LM.pk[c.id]; lmSave(); render(); window.scrollTo({ top: 0, behavior: "instant" }); }
function lecCurList(){
  if (view() === "field") { const all = allTerms(), cur = LM.field; return all.filter(t => fieldOf(t) === cur || (!cur && false)); }
  const c = lecCur(), chs = lecChs(c), sel = chs.find(ch => ch.id === LM.pk[c.id]);
  return sel ? sel.terms : chs.flatMap(ch => ch.terms);
}
document.addEventListener("change", e => { if (e.target && e.target.dataset && e.target.dataset.lsel) lecPick(e.target.value); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-lcourse],[data-lok],[data-lfav],[data-lpick],[data-lfilt],[data-lfield],[data-lterm],[data-lback],[data-lregen],[data-lstudy],[data-lstudyend],[data-lstudyagain],[data-lgrade],[data-lflip]"); if (!b) return;
  const d = b.dataset;
  if (d.lcourse) { LM.cur = d.lcourse; lmSave(); render(); return; }
  if (d.lfield) { LM.field = d.lfield; lmSave(); render(); return; }
  if (d.lfilt) { lecFilt = d.lfilt; render(); return; }
  if (d.lpick !== undefined) { lecPick(d.lpick); return; }
  if (d.lterm) { LDET = d.lterm; render(); window.scrollTo({ top: 0, behavior: "instant" }); return; }
  if (d.lback) { LDET = null; render(); return; }
  if (d.lregen) { const t = termOf(d.lregen); if (t) ensureLecCtx(t, true); render(); return; }
  if (d.lstudy !== undefined) { if (view() === "field" && !LM.field) { const f = FIELDS.flatMap(g => g[1]).find(x => allTerms().some(t => fieldOf(t) === x)); LM.field = f; }
    startStudy(lecCurList(), d.lstudy); return; }
  if (d.lstudyend) { LSTUDY = null; render(); return; }
  if (d.lstudyagain) { const s = LSTUDY; startStudy(s.list.filter((t, i, a) => a.indexOf(t) === i), s.title); return; }
  if (d.lgrade) { lecGrade(d.lgrade); return; }
  if (d.lflip) { if (LSTUDY && !LSTUDY.flip) { LSTUDY.flip = true; render(); } return; }
  const m = d.lok ? LM.ok : LM.fav, k = d.lok || d.lfav;
  if (m[k]) delete m[k]; else m[k] = 1;
  lmSave(); render();
});
/* 탭을 옮기면 익히기·맥락 화면을 닫고 다시 그린다 (이 처리는 화면 그리기보다 늦게 와서, 그냥 두면 옛 화면이 남아 멈춘 듯 보였다) */
window.addEventListener("hashchange", () => { if (LSTUDY || LDET) { LSTUDY = null; LDET = null; render(); } });
