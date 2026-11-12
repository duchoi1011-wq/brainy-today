/* ───────── 10분 복습 (간격 반복) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   떠올리기 먼저 → 뒤집기 → 몰랐음 / 헷갈림 / 알았음. 간격은 /memory-check 와 같다 (단계 0:1일 1:3일 2:7일 3:14일 4:30일 5:60일).
   기록은 progress/<id>.srs = {box, due, first, last, n, lapses, log:[{at,r}], pending:[{at,r}]}
   - 영어 단어의 pending 은 맥 동기화가 볼트 「영어 단어장」 표(단계·다음 복습·기록 ✓△✗)에 넣고 비운다.
   시험 3단계 (2026-11-12 동욱): 1 설명 보고 단어 맞히기(통과해도 ① 낯섦, progress.t1) → 2 상황(이럴 때) 보고 맞히기 = ② 만남
   → 3 그 단어로 내 작업 명령 내리기 = ③ 소화. ③ 이상은 예전처럼 알아보기/꺼내기 복습. ④ 실행은 실제로 썼을 때만. 단계는 내려가지 않는다.
   복습 목록은 영역(학습·외국어)과 상관없이 모든 단어에서 짠다 (2026-11-12 동욱: alliance도 오늘 복습에).
   기록(progress)이 오기 전엔 목록을 짜지 않고, 아직 손대지 않은 목록은 기록·단어가 새로 오면 다시 짠다. */
const RV_GAP = [1, 3, 7, 14, 30, 60];
const RV_NEW = 5, RV_MAX = 40;
const RV = { queue: null, i: 0, flipped: false, again: new Set(), stats: { ok: 0, mid: 0, bad: 0 }, day: null, drafts: {}, res: null, busy: false, err: "", touched: false, prog: null, all: null };
/* 위키 페이지 하나로 따로 설 만한 개념 먼저 — 볼트가 t.wiki 를 주면 그걸 따르고, 없으면
   이름이 하나뿐인 단어(「A · B」「A / B」처럼 묶인 짝·목록이 아님)이고 "용어만 등장"이 아닌 단어 */
const isConcept = t => (t && typeof t.wiki === "boolean") ? t.wiki : !!t && tokens(t.term).length === 1 && !/용어만 등장/.test(t.def || "");
const conceptFirst = (a, b) => isConcept(b) - isConcept(a);
const rvStep = id => lv(id) >= 3 ? 0 : lv(id) === 2 ? 3 : prog[id]?.t1 ? 2 : 1;
const kday = (off = 0) => { const d = new Date(Date.now() + 9 * 3600e3 + off * 86400e3); return d.toISOString().slice(0, 10); };
/* 날짜 읽기 — 「2026-11-12」「2026.11.12(목)」「2026년 11월 12일」「11/12」, 숫자(ms)·Date·{seconds} 모두 YYYY-MM-DD 로. 못 읽으면 "" */
function ymd(v){
  if (v == null || v === "") return "";
  if (typeof v === "object" && !(v instanceof Date)) v = typeof v.toDate === "function" ? v.toDate() : typeof v.seconds === "number" ? v.seconds * 1000 : String(v);
  if (typeof v === "number" || v instanceof Date) { const d = new Date(+v); return isNaN(d) ? "" : new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10); }
  const s = String(v), p2 = n => String(n).padStart(2, "0");
  let m = s.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
  if (m) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  m = s.match(/^\s*(\d{1,2})\s*[/.월]\s*(\d{1,2})/);
  return m ? `${kday().slice(0, 4)}-${p2(m[1])}-${p2(m[2])}` : "";
}
/* 볼트 표의 단계·다음 복습 — 단계만 있고 날짜를 못 읽으면 오늘 복습으로 */
const vaultSrs = t => (t.stage === undefined || t.stage === null || String(t.stage).trim() === "") ? null
  : { box: Math.max(0, Math.min(5, parseInt((String(t.stage).match(/\d+/) || ["0"])[0], 10))), due: ymd(t.due) || kday() };
const srsOf = id => { const s = prog[id]?.srs; return s ? { ...s, box: Number.isFinite(+s.box) ? +s.box : 0, due: ymd(s.due) || kday() } : vaultSrs(BYID[id] || {}) || null; };
const isNewCard = id => !srsOf(id);
const firstToday = () => ALL.filter(t => ymd(prog[t.id]?.srs?.first) === kday()).length;

function rvBuild(){
  const today = kday();
  const due = ALL.filter(t => { const s = srsOf(t.id); return s && s.due <= today; })
    .sort((a, b) => conceptFirst(a, b) || srsOf(a.id).due.localeCompare(srsOf(b.id).due) || srsOf(a.id).box - srsOf(b.id).box).slice(0, RV_MAX);
  const room = Math.max(0, RV_NEW - firstToday());
  const fresh = rvFresh().slice(0, room);
  RV.queue = due.map(t => t.id).concat(fresh.map(t => t.id));
  RV.i = 0; RV.flipped = false; RV.again = new Set(); RV.stats = { ok: 0, mid: 0, bad: 0 }; RV.day = today; RV.res = null; RV.err = "";
  RV.touched = false; RV.prog = prog; RV.all = ALL;
}
/* 새 단어 — 개념 먼저, 그 안에서 학습·외국어를 번갈아 (한 영역만 몰리지 않게) */
function rvFresh(){
  const rank = {}, by = {};
  ALL.filter(t => isNewCard(t.id)).sort((a, b) => conceptFirst(a, b) || (isCore(b.id) - isCore(a.id)) || 0)
    .forEach(t => { by[t.dom] = (by[t.dom] || 0) + 1; rank[t.id] = by[t.dom]; });
  return ALL.filter(t => rank[t.id]).sort((a, b) => conceptFirst(a, b) || rank[a.id] - rank[b.id] || (isCore(b.id) - isCore(a.id)));
}
/* 방향: 새 단어는 용어→뜻(알아보기), 한 번 넘긴 단어는 장면→용어(꺼내기)와 번갈아 */
function rvDir(t){
  const s = srsOf(t.id), c = CTX[t.id];
  if (!s || !c?.scene) return "recog";
  return ((s.box || 0) + hash(t.id + kday())) % 2 ? "recall" : "recog";
}
function rvNext(box){ return RV_GAP[Math.min(5, Math.max(0, box))]; }
function rvPreview(t){
  const s = srsOf(t.id) || { box: -1 };
  const ok = Math.min(5, (s.box ?? -1) + 1), mid = Math.max(0, s.box ?? 0);
  return { bad: "내일", mid: (Math.max(1, Math.floor(rvNext(mid) / 2))) + "일 뒤", ok: rvNext(ok) + "일 뒤" };
}
function rvGrade(r){
  const id = RV.queue[RV.i], t = BYID[id]; if (!t) return;
  const now = nowIso(), today = kday();
  const s0 = srsOf(id) || { box: -1 };
  const s = { box: s0.box ?? -1, n: 0, lapses: 0, log: [], pending: [], ...(prog[id]?.srs || {}) };
  if (s.box < 0) s.box = 0;
  if (!s.first) s.first = today;
  if (r === "ok") { s.box = Math.min(5, (s0.box ?? -1) + 1); s.due = kday(rvNext(s.box)); RV.stats.ok++; }
  else if (r === "mid") { s.box = Math.max(0, s0.box ?? 0); s.due = kday(Math.max(1, Math.floor(rvNext(s.box) / 2))); RV.stats.mid++; }
  else { s.box = 0; s.due = kday(1); s.lapses = (s.lapses || 0) + 1; RV.stats.bad++; if (!RV.again.has(id)) { RV.again.add(id); RV.queue.splice(Math.min(RV.queue.length, RV.i + 4), 0, id); } }
  s.n = (s.n || 0) + 1; s.last = now; RV.touched = true;
  s.log = [...(s.log || []), { at: now, r }].slice(-30);
  if (t.cat === "영어 단어") s.pending = [...(s.pending || []), { at: now, r, box: s.box, due: s.due }];
  const patch = { srs: s, lastSeen: now, seen: (prog[id]?.seen || 0) + 1 };
  const step = rvStep(id);
  let how = r === "ok" ? "복습: 떠올림" : r === "mid" ? "복습: 헷갈림" : "복습: 몰랐음";
  if (r === "ok") {
    patch.fuzzy = false;   // 단계는 시험으로만 오른다 — 1단계는 낯섦 그대로, 2단계 ② 만남, 3단계 ③ 소화
    if (step === 1) { patch.t1 = now; how = "시험 1단계 통과: 설명 보고 맞힘"; }
    else if (step === 2) { patch.level = 2; how = "시험 2단계 통과: 상황 보고 맞힘"; }
    else if (step === 3) { patch.level = 3; patch.cmd = { text: (RV.drafts[id] || "").trim(), at: now, by: RV.res?.id === id && !RV.res.self ? "Claude 확인" : "직접 비교" }; how = "시험 3단계 통과: 단어로 명령 내림 (" + patch.cmd.by + ")"; }
  } else if (r === "bad") patch.fuzzy = true;
  RV.i++; RV.flipped = false; RV.res = null; RV.err = "";
  save(id, patch, how);
}
/* 3단계 — 내가 쓴 명령(외국어는 영어 문장)을 Claude가 본다. Claude를 못 쓰면 예시와 직접 비교 */
function rvCmdPrompt(t, txt){
  if (t.dom === "외국어 단어장") return foreignPrompt(t, txt);
  return `너는 ${t.cat === "AI 편집 자동화" ? "AI 도구" : "영상 편집"} 용어를 가르치는 코치다. 학습자(동욱)가 아래 용어를 넣어 자기 작업(행사·부스 영상)에서 Claude에게 내릴 편집 명령을 한두 문장 썼다. 위키 정의를 기준으로 판정하라.

용어: ${t.term}
위키 정의: ${t.def.replace(/`/g,"")}
분야: ${t.cat}
학습자 명령: ${txt}

판정 기준:
- 용어를 뜻에 맞게 썼고, 받는 쪽이 무엇을 할지 알 수 있는 구체적인 명령이면 통과.
- 용어가 여러 개(· 또는 /로 묶임)면 하나 이상을 맞게 쓰면 통과.
- 용어를 틀린 뜻으로 썼거나, 용어가 없거나, 명령이 아니면 불통과.

JSON 하나만 답하라. 한국어 존댓말, 친근하고 짧게:
{"pass": true 또는 false, "good": "잘한 점 한 문장", "fix": "고칠 점 한 문장, 없으면 빈 문자열", "example": "이 용어를 넣은 더 좋은 명령 한 문장"}`;
}
async function rvCheck(){
  const id = RV.queue[RV.i], t = BYID[id]; if (!t || RV.busy) return;
  const txt = (RV.drafts[id] || "").trim();
  if (txt.length < 6) { RV.err = t.dom === "외국어 단어장" ? "단어를 넣어 문장을 하나 써 주세요." : "단어를 넣어 명령을 한 문장 써 주세요."; render(); return; }
  RV.err = "";
  if (!sample) { RV.res = { id, self: true }; RV.flipped = true; render(); return; }
  RV.busy = true; render();
  try {
    const r = await sample.json(rvCmdPrompt(t, txt), { modelTier: "quick", cache: false });
    RV.res = { id, pass: !!r?.pass, good: String(r?.good || ""), fix: String(r?.fix || ""), example: String(r?.example || "") };
    RV.flipped = true;
  } catch (e) {
    if (["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e?.code)) { sample = null; sampleChecked = true; RV.res = { id, self: true }; RV.flipped = true; }
    else RV.err = e?.code === "rate_limited" ? "요청이 많아요. 잠시 뒤 다시 눌러 주세요." : "확인하지 못했어요. 다시 눌러 주세요.";
  }
  RV.busy = false; render();
}
function rvFront(t, dir, step){
  const c = CTX[t.id], fg = t.dom === "외국어 단어장";
  if (step === 1) return `<div class="scene"><span class="lbl">${fg ? "뜻" : "설명"}</span>${rich(t.def)}</div>
    <p class="muted small">어떤 ${fg ? "영어 단어" : "용어"}인지 떠올린 뒤 뒤집어요.</p>`;
  if (step === 2) {
    if (!c?.scene) ensureCtx(t.id);
    return c?.scene ? `<div class="scene"><span class="lbl">이럴 때 써요</span>${esc(c.scene)}</div>
      <p class="muted small">이 상황에 맞는 ${fg ? "영어 단어" : "용어"}를 떠올린 뒤 뒤집어요.</p>`
      : `<div class="scene"><span class="lbl">이럴 때 써요</span>${genBusy.has(t.id) ? "상황을 만드는 중이에요…" : "아직 상황 카드가 없어 뜻으로 대신 봐요."}</div>
      <p class="small">${rich(t.def)}</p><p class="muted small">어떤 ${fg ? "영어 단어" : "용어"}인지 떠올린 뒤 뒤집어요.</p>`;
  }
  if (step === 3) return `<h3 style="font-size:24px">${esc(t.term)}</h3>
    ${c?.scene ? `<div class="scene"><span class="lbl">이럴 때</span>${esc(c.scene)}</div>` : ""}
    <p class="small">${fg ? "이 단어를 넣어, 내가 실제로 할 말을 영어 한 문장으로 써 보세요." : "이 용어를 넣어, 내 작업에서 Claude에게 내릴 명령을 한 문장으로 써 보세요."}</p>
    ${RV.flipped ? `<p class="small muted">내가 쓴 ${fg ? "문장" : "명령"} · ${esc(RV.drafts[t.id] || "")}</p>`
      : `<textarea id="rvTxt" data-id="${t.id}" placeholder="${fg ? "예: 이 단어를 넣은 짧은 영어 문장" : "예: 이 용어를 넣어 무엇을 어떻게 해 달라는 명령"}">${esc(RV.drafts[t.id] || "")}</textarea>
      ${RV.err ? `<p class="note">${esc(RV.err)}</p>` : ""}`}`;
  if (dir === "recall") return `<div class="scene"><span class="lbl">${fg ? "이 순간, 영어로" : "이 장면"}</span>${esc(c.scene)}</div>
    ${fg ? `<p class="small muted">뜻 · ${esc(t.def)}</p>` : ""}
    <p class="muted small">${fg ? "어떤 영어 단어를 쓸지" : "어떤 용어인지"} 떠올린 뒤 뒤집어요.</p>`;
  return `<h3 style="font-size:28px">${esc(t.term)}</h3><p class="muted small">뜻을 떠올린 뒤 뒤집어요.</p>`;
}
function rvBack(t, dir, step){
  const c = CTX[t.id] || {}, fg = t.dom === "외국어 단어장", r = RV.res?.id === t.id ? RV.res : null;
  const res = step !== 3 || !r ? "" : r.self ? `<div class="result fail"><b>예시와 비교해 보세요</b><p class="small">단어를 뜻에 맞게 넣어 ${fg ? "말이 되는 문장" : "무엇을 할지 알 수 있는 명령"}이면 「통과」예요.</p></div>`
    : `<div class="result ${r.pass ? "pass" : "fail"}"><b>${r.pass ? "통과 · ③ 소화로 올라가요" : "조금만 더"}</b>
      ${r.good ? `<p><span class="muted small">잘한 점</span><br>${esc(r.good)}</p>` : ""}
      ${r.fix ? `<p><span class="muted small">${r.pass ? "더하면 좋은 점" : "고칠 점"}</span><br>${esc(r.fix)}</p>` : ""}
      ${r.example ? `<p><span class="muted small">이렇게 써요</span><br>${esc(r.example)}</p>` : ""}</div>`;
  return `${res}${dir === "recall" || step === 1 || step === 2 ? `<h3 style="font-size:24px">${esc(t.term)}</h3>` : ""}
    <div class="def">${rich(t.def)}</div>
    ${t.hook ? `<p class="small">소리 고리 · <b>${esc(t.hook)}</b>${t.pic ? `<br>그림 · ${esc(t.pic)}` : ""}</p>` : ""}
    ${c.ask ? `<div class="ly say"><span class="lbl">${fg ? "이렇게 말해요" : "Claude에게 이렇게"}</span>${esc(c.ask)}</div>` : ""}
    <details class="small"><summary class="muted">더 보기 — 장면·쉽게·헷갈리는 짝·강의 원문</summary><div class="stack" style="margin-top:10px">${sceneHtml(t)}${ctxLayers(t)}${stageHtml(t)}</div></details>`;
}
function renderReview(){
  if (mode === "loading") return `${statusNote()}<section class="card"><p class="empty">복습 목록을 짜는 중이에요.</p></section>`;
  if (!RV.queue || RV.day !== kday() || (!RV.touched && (RV.prog !== prog || RV.all !== ALL))) rvBuild();
  const today = kday();
  const dueN = ALL.filter(t => { const s = srsOf(t.id); return s && s.due <= today; }).length;
  const learned = ALL.filter(t => srsOf(t.id)).length;
  const tmr = ALL.filter(t => { const s = srsOf(t.id); return s && s.due <= kday(1); }).length;
  const head = `${statusNote()}
    <div class="meta small muted"><span>오늘 복습 <b class="mono">${dueN}</b> · 새 단어 <b class="mono">${Math.max(0, RV_NEW - firstToday())}</b>/${RV_NEW}</span><span>익힌 단어 <span class="mono">${learned}</span>/${ALL.length} · 학습·외국어 함께</span></div>`;
  if (RV.i >= RV.queue.length) {
    const left = rvFresh().filter(t => !RV.queue.includes(t.id)).length;
    const st = RV.stats, did = st.ok + st.mid + st.bad;
    return `${head}<section class="card stack">
      <h3>${did ? "오늘 복습 끝" : "오늘은 복습할 게 없어요"}</h3>
      ${did ? `<p>✓ ${st.ok} · △ ${st.mid} · ✗ ${st.bad} — 내일 볼 단어 ${tmr}개</p>` : `<p class="muted">새 단어는 하루 ${RV_NEW}개까지예요. 내일 볼 단어 ${tmr}개.</p>`}

      ${left ? `<div class="btns"><button class="btn" data-rv="more">새 단어 ${Math.min(RV_NEW, left)}개 더</button></div>` : `<p class="small muted">새 단어는 다 꺼냈어요.</p>`}
    </section>`;
  }
  const t = BYID[RV.queue[RV.i]];
  if (!t) { RV.i++; return renderReview(); }
  const step = rvStep(t.id), dir = rvDir(t), pv = rvPreview(t), s = srsOf(t.id);
  const r = RV.res?.id === t.id ? RV.res : null, fail3 = step === 3 && r && !r.self && !r.pass;
  const STEPN = { 1: "설명 보고 맞히기", 2: "상황 보고 맞히기 → ② 만남", 3: "단어로 명령 내리기 → ③ 소화" };
  return `${head}
  <div class="prog" aria-label="진행 ${RV.i + 1}/${RV.queue.length}"><span style="width:${RV.i / RV.queue.length * 100}%"></span></div>
  <section class="card flash" ${step === 3 ? "" : `data-rv="flip"`} style="cursor:${RV.flipped || step === 3 ? "default" : "pointer"}">
    <div class="meta"><span class="tc">${esc(t.cat)} · ${s ? "단계 " + s.box : "새 단어"}${RV.again.has(t.id) ? " · 다시" : ""}</span><span class="btns" style="gap:6px">${isConcept(t) ? `<span class="pill">개념</span>` : ""}${coreTag(t.id)}${pill(lv(t.id))}</span></div>
    ${step ? `<p class="small mono" style="margin:0;color:var(--accent)">시험 ${step}/3 · ${STEPN[step]}</p>` : ""}
    <div class="stack">${rvFront(t, dir, step)}${RV.flipped ? `<hr style="border:0;border-top:1px solid var(--line);margin:4px 0">` + rvBack(t, dir, step) : ""}</div>
    ${RV.flipped
      ? fail3 ? `<div class="btns">
          <button class="btn" data-rv="bad">몰랐음<br><span class="small muted">${pv.bad}</span></button>
          <button class="btn" data-rv="mid">헷갈림<br><span class="small muted">${pv.mid}</span></button>
          <button class="btn primary" data-rv="retry">다시 써 보기</button></div>`
      : `<div class="btns">
          <button class="btn" data-rv="bad">몰랐음<br><span class="small muted">${pv.bad}</span></button>
          <button class="btn" data-rv="mid">헷갈림<br><span class="small muted">${pv.mid}</span></button>
          <button class="btn primary" data-rv="ok">${step === 3 ? "통과" : "알았음"}<br><span class="small" style="opacity:.8">${pv.ok}</span></button></div>`
      : step === 3 ? `<div class="btns"><button class="btn primary" data-rv="check" ${RV.busy ? "disabled" : ""}>${RV.busy ? "Claude가 읽는 중…" : sample ? "Claude에게 확인받기" : "예시와 비교하기"}</button></div>`
      : `<div class="btns"><button class="btn primary" data-rv="flip">뒤집기</button></div>`}
  </section>
  <p class="small muted mono" style="text-align:center">${RV.i + 1} / ${RV.queue.length}</p>`;
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-rv]"); if (!el || view() !== "review") return;
  if (e.target.closest("details,summary,a,[data-go]") && el.dataset.rv === "flip") return;
  const a = el.dataset.rv;
  const step3 = rvStep(RV.queue?.[RV.i]) === 3;
  if (a === "more") { e.stopPropagation(); if (!RV.queue) rvBuild(); const extra = rvFresh().filter(t => !RV.queue.includes(t.id)).slice(0, RV_NEW).map(t => t.id);
    RV.touched = true; RV.i = Math.min(RV.i, RV.queue.length); RV.queue = RV.queue.concat(extra); RV.flipped = false; RV.res = null; RV.err = ""; render(); window.scrollTo(0, 0); return; }
  if (!RV.queue) return;
  RV.touched = true;
  if (a === "flip") { if (!RV.flipped && !step3) { RV.flipped = true; render(); } return; }
  if (a === "check") { rvCheck(); return; }
  if (a === "retry") { RV.flipped = false; RV.res = null; render(); return; }
  if (RV.flipped && (a === "ok" || a === "mid" || a === "bad")) { e.stopPropagation(); rvGrade(a); }
});
document.addEventListener("input", e => { if (e.target.id === "rvTxt") { RV.touched = true; RV.drafts[e.target.dataset.id] = e.target.value; } });
document.addEventListener("keydown", e => {
  if (view() !== "review" || e.isComposing || /input|textarea|select/i.test(document.activeElement?.tagName || "")) return;
  const step3 = rvStep(RV.queue?.[RV.i]) === 3, r = RV.res;
  if (!RV.queue || RV.i >= RV.queue.length) return;
  if (e.key === " " || e.key === "Enter") { if (!RV.flipped && !step3) { e.preventDefault(); RV.touched = true; RV.flipped = true; render(); } return; }
  if (RV.flipped && ["1", "2", "3"].includes(e.key) && !(e.key === "3" && step3 && r && !r.self && !r.pass)) rvGrade(e.key === "1" ? "bad" : e.key === "2" ? "mid" : "ok");
});
