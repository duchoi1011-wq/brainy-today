/* ───────── 10분 복습 (간격 반복) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   떠올리기 먼저 → 뒤집기 → 몰랐음 / 헷갈림 / 알았음. 간격은 /memory-check 와 같다 (단계 0:1일 1:3일 2:7일 3:14일 4:30일 5:60일).
   기록은 progress/<id>.srs = {box, due, first, last, n, lapses, log:[{at,r}], pending:[{at,r}]}
   - 영어 단어의 pending 은 맥 동기화가 볼트 「영어 단어장」 표(단계·다음 복습·기록 ✓△✗)에 넣고 비운다.
   시험 3단계 (2026-11-12 동욱): 1 설명 보고 단어 맞히기(통과해도 ① 낯섦, progress.t1) → 2 상황(이럴 때) 보고 맞히기 = ② 만남
   → 3 그 단어로 내 작업 명령 내리기 = ③ 소화. ③ 이상은 예전처럼 알아보기/꺼내기 복습. ④ 실행은 실제로 썼을 때만. 단계는 내려가지 않는다. */
const RV_GAP = [1, 3, 7, 14, 30, 60];
const RV_NEW = 5, RV_MAX = 40;
const RV = { queue: null, i: 0, flipped: false, again: new Set(), stats: { ok: 0, mid: 0, bad: 0 }, dom: null, day: null, drafts: {}, res: null, busy: false, err: "" };
/* 위키 개념 먼저, 그 안에서는 최근에 생기거나 고쳐진 것 먼저 (2026-11-12 동욱).
   wiki(위키 페이지가 있는 개념)·at(위키 날짜, 없으면 단어장에 처음 들어온 날)은 볼트가 붙여 보낸다. */
const isConcept = t => !!(t && t.wiki);
const conceptFirst = (a, b) => isConcept(b) - isConcept(a);
const newerFirst = (a, b) => String(b.at || "").localeCompare(String(a.at || ""));
const isFresh = t => !!(t && t.at && t.at >= kday(-14));
/* 승급 시험 (2026-11-13 동욱): 「단계」 탭에서 고른 단계의 단어만 모아 바로 다음 단계 시험 — ①→② 상황 보고 맞히기 · ②→③ 명령 쓰기 · ③→④ 실제로 쓴 장면 적기 */
const stageStep = id => lv(id) >= 4 ? 0 : lv(id) === 3 ? 4 : lv(id) === 2 ? 3 : 2;
const rvStep = id => RV.mode === "stage" ? stageStep(id) : lv(id) >= 3 ? 0 : lv(id) === 2 ? 3 : prog[id]?.t1 ? 2 : 1;
const kday = (off = 0) => { const d = new Date(Date.now() + 9 * 3600e3 + off * 86400e3); return d.toISOString().slice(0, 10); };
const vaultSrs = t => (t.stage !== undefined && t.stage !== "" && t.due) ? { box: Math.max(0, Math.min(5, parseInt(t.stage, 10) || 0)), due: t.due } : null;
const srsOf = id => prog[id]?.srs || vaultSrs(BYID[id] || {}) || null;
const isNewCard = id => !srsOf(id);
const firstToday = () => TERMS.filter(t => prog[t.id]?.srs?.first === kday()).length;

function rvBuild(){
  const today = kday();
  const due = TERMS.filter(t => { const s = srsOf(t.id); return s && s.due <= today; })
    .sort((a, b) => conceptFirst(a, b) || srsOf(a.id).due.localeCompare(srsOf(b.id).due) || srsOf(a.id).box - srsOf(b.id).box).slice(0, RV_MAX);
  const room = Math.max(0, RV_NEW - firstToday());
  const fresh = rvFresh().slice(0, room);
  RV.queue = due.map(t => t.id).concat(fresh.map(t => t.id));
  RV.i = 0; RV.flipped = false; RV.again = new Set(); RV.stats = { ok: 0, mid: 0, bad: 0 }; RV.dom = S.domain; RV.day = today; RV.res = null; RV.err = "";
}
function rvFresh(){ return TERMS.filter(t => isNewCard(t.id)).sort((a, b) => conceptFirst(a, b) || newerFirst(a, b) || (isCore(b.id) - isCore(a.id)) || 0); }
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
  s.n = (s.n || 0) + 1; s.last = now;
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
    else if (step === 4) { patch.level = 4; patch.action = { note: (RV.drafts[id] || "").trim(), at: now }; how = "승급 시험: 실제로 쓴 장면 기록"; }
    if (RV.mode === "stage" && step) RV.up = (RV.up || 0) + 1;
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
  if (step === 4) return `<h3 style="font-size:24px">${esc(t.term)}</h3><p class="small">${rich(t.def)}</p>
    <p class="small">이 ${fg ? "단어" : "용어"}를 <b>실제 작업·대화에서 언제, 어떻게 썼는지</b> 한 줄로 적어요. 썼으면 ④ 실행이에요.</p>
    <textarea id="rvTxt" data-id="${t.id}" placeholder="예: 오늘 Claude에게 영상 편집을 맡기면서 이 말을 넣어 지시했다">${esc(RV.drafts[t.id] || "")}</textarea>
    ${RV.err ? `<p class="note">${esc(RV.err)}</p>` : ""}`;
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
  if (RV.mode !== "stage" && (!RV.queue || RV.dom !== S.domain || RV.day !== kday())) rvBuild();
  const today = kday();
  const dueN = TERMS.filter(t => { const s = srsOf(t.id); return s && s.due <= today; }).length;
  const learned = TERMS.filter(t => srsOf(t.id)).length;
  const tmr = TERMS.filter(t => { const s = srsOf(t.id); return s && s.due <= kday(1); }).length;
  const head = `${statusNote()}
    <div class="meta small muted"><span>오늘 복습 <b class="mono">${dueN}</b> · 새 단어 <b class="mono">${Math.max(0, RV_NEW - firstToday())}</b>/${RV_NEW}</span><span>익힌 단어 <span class="mono">${learned}</span>/${TERMS.length}</span></div>`;
  if (RV.mode === "stage") {
    const from = RV.from, to = from + 1;
    const top = `<div class="meta" style="margin:2px"><span class="tc">승급 시험 · ${pill(from)} → ${pill(to)}</span><button class="btn ghost" data-rv="stageend" style="padding:6px 12px">그만</button></div>`;
    if (RV.i >= RV.queue.length) return `${top}<section class="card stack"><h3>승급 시험 끝</h3>
      <p>${RV.queue.length}개 중 <b>${RV.up || 0}개</b>가 ${ro(LV[to])} 올라갔어요.</p>
      <div class="btns"><button class="btn primary" data-rv="stageend">단계로 돌아가기</button></div></section>`;
    return top + rvCard();
  }
  if (RV.i >= RV.queue.length) {
    const st = RV.stats, did = st.ok + st.mid + st.bad;
    return `${head}<section class="card stack">
      <h3>${did ? "오늘 복습 끝" : "오늘은 복습할 게 없어요"}</h3>
      ${did ? `<p>✓ ${st.ok} · △ ${st.mid} · ✗ ${st.bad} — 내일 볼 단어 ${tmr}개</p>` : `<p class="muted">새 단어는 하루 ${RV_NEW}개까지예요. 내일 볼 단어 ${tmr}개.</p>`}

      <div class="btns"><button class="btn" data-rv="more">새 단어 5개 더</button></div>
    </section>`;
  }
  return head + rvCard();
}
function rvCard(){
  const t = BYID[RV.queue[RV.i]];
  if (!t) { RV.i++; return renderReview(); }
  const step = rvStep(t.id), dir = rvDir(t), pv = rvPreview(t), s = srsOf(t.id);
  const r = RV.res?.id === t.id ? RV.res : null, fail3 = step === 3 && r && !r.self && !r.pass;
  const STEPN = { 1: "설명 보고 맞히기", 2: "상황 보고 맞히기 → ② 만남", 3: "단어로 명령 내리기 → ③ 소화", 4: "실제로 쓴 장면 적기 → ④ 실행" };
  return `
  <div class="prog" aria-label="진행 ${RV.i + 1}/${RV.queue.length}"><span style="width:${RV.i / RV.queue.length * 100}%"></span></div>
  <section class="card flash" ${step >= 3 ? "" : `data-rv="flip"`} style="cursor:${RV.flipped || step >= 3 ? "default" : "pointer"}">
    <div class="meta"><span class="tc">${esc(t.cat)} · ${s ? "단계 " + s.box : "새 단어"}${RV.again.has(t.id) ? " · 다시" : ""}</span><span class="btns" style="gap:6px">${isFresh(t) ? `<span class="pill p3">새로</span>` : ""}${isConcept(t) ? `<span class="pill">개념</span>` : ""}${coreTag(t.id)}${pill(lv(t.id))}</span></div>
    ${step ? `<p class="small mono" style="margin:0;color:var(--accent)">${RV.mode === "stage" ? "승급 시험" : "시험 " + step + "/3"} · ${STEPN[step]}</p>` : ""}
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
      : step === 4 ? `<div class="btns"><button class="btn" data-rv="skip">아직 안 써 봤어요</button><button class="btn primary" data-rv="used">실제로 썼어요 → ④</button></div>`
      : step === 3 ? `<div class="btns"><button class="btn primary" data-rv="check" ${RV.busy ? "disabled" : ""}>${RV.busy ? "Claude가 읽는 중…" : sample ? "Claude에게 확인받기" : "예시와 비교하기"}</button></div>`
      : `<div class="btns"><button class="btn primary" data-rv="flip">뒤집기</button></div>`}
  </section>
  <p class="small muted mono" style="text-align:center">${RV.i + 1} / ${RV.queue.length}</p>`;
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-rv]"); if (!el || view() !== "review") return;
  if (e.target.closest("details,summary,a,[data-go]") && el.dataset.rv === "flip") return;
  const a = el.dataset.rv;
  const step3 = rvStep(RV.queue?.[RV.i]) >= 3;
  if (a === "flip") { if (!RV.flipped && !step3) { RV.flipped = true; render(); } return; }
  if (a === "stageend") { RV.mode = null; RV.queue = null; RV.up = 0; location.hash = "stage"; return; }
  if (a === "skip") { RV.i++; RV.err = ""; render(); return; }
  if (a === "used") { const id = RV.queue[RV.i]; if ((RV.drafts[id] || "").trim().length < 4) { RV.err = "언제, 어떻게 썼는지 한 줄 적어 주세요."; render(); return; } RV.flipped = true; rvGrade("ok"); return; }
  if (a === "check") { rvCheck(); return; }
  if (a === "retry") { RV.flipped = false; RV.res = null; render(); return; }
  if (a === "more") { const extra = rvFresh().filter(t => !RV.queue.includes(t.id)).slice(0, RV_NEW).map(t => t.id); RV.queue = RV.queue.concat(extra); render(); return; }
  if (RV.flipped && (a === "ok" || a === "mid" || a === "bad")) { e.stopPropagation(); rvGrade(a); }
});
document.addEventListener("input", e => { if (e.target.id === "rvTxt") RV.drafts[e.target.dataset.id] = e.target.value; });
document.addEventListener("keydown", e => {
  if (view() !== "review" || e.isComposing || /input|textarea|select/i.test(document.activeElement?.tagName || "")) return;
  const step3 = rvStep(RV.queue?.[RV.i]) >= 3, r = RV.res;
  if (e.key === " " || e.key === "Enter") { if (!RV.flipped && !step3) { e.preventDefault(); RV.flipped = true; render(); } return; }
  if (RV.flipped && ["1", "2", "3"].includes(e.key) && !(e.key === "3" && step3 && r && !r.self && !r.pass)) rvGrade(e.key === "1" ? "bad" : e.key === "2" ? "mid" : "ok");
});

/* ── 단계 탭: ① 낯섦 · ② 만남 · ③ 소화 · ④ 실행을 한 화면에 나누고, 칸마다 승급 시험 (2026-11-13 동욱) ── */
const STAGE_TEST = { 1: "상황 보고 맞히기", 2: "단어로 명령 쓰기", 3: "실제로 쓴 장면 적기" };
const STAGE_MAX = 10;
const ro = w => { const c = (w || "").charCodeAt(w.length - 1) - 0xAC00, j = c >= 0 && c < 11172 ? c % 28 : 0; return w + (j && j !== 8 ? "으로" : "로"); };   // 만남으로 · 소화로 · 실행으로
function stagePool(L){ return TERMS.filter(t => (lv(t.id) || 1) === L).sort((a, b) => conceptFirst(a, b) || newerFirst(a, b) || String(prog[a.id]?.lastSeen || "").localeCompare(String(prog[b.id]?.lastSeen || ""))); }
function renderStage(){
  const L = S.stage || 1, n = [1, 2, 3, 4].map(k => TERMS.filter(t => (lv(t.id) || 1) === k).length);
  let h = `${statusNote()}<div class="stagegrid">${[1, 2, 3, 4].map(k => `<button class="stagebox${k === L ? " on" : ""}" data-stage="${k}">
    ${pill(k)}<b class="mono">${n[k - 1]}</b><span class="small muted">${k < 4 ? "시험 → " + LV[k + 1] : "실제로 쓴 단어"}</span></button>`).join("")}</div>`;
  const list = stagePool(L);
  h += `<section class="card stack"><div class="meta"><h3 style="margin:0">${pill(L)} ${list.length}개</h3>
    ${L < 4 && list.length ? `<button class="btn primary" data-stagetest="${L}">▶ 시험 보고 ${ro(LV[L + 1])} · ${Math.min(STAGE_MAX, list.length)}개</button>` : ""}</div>
    <p class="small muted">${L < 4 ? `승급 시험: <b>${STAGE_TEST[L]}</b> — 통과한 단어는 바로 ${ro(pill(L + 1).replace(/<[^>]*>/g, "").trim())} 올라가요. 한 번에 ${STAGE_MAX}개씩.` : "실제 작업·대화에서 쓴 단어예요."}</p>
    ${list.length ? `<div class="list">${list.slice(0, 60).map(t => `<button class="row" data-go="learn" data-id="${t.id}"><div class="t"><b>${esc(t.term)}</b><span>${esc(t.cat)} · ${esc(t.def)}</span></div>${isFresh(t) ? `<span class="pill p3">새로</span>` : ""}</button>`).join("")}</div>${list.length > 60 ? `<p class="small muted">외 ${list.length - 60}개</p>` : ""}` : `<p class="empty">이 단계에 있는 단어가 없어요.</p>`}
  </section>`;
  return h;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-stage],[data-stagetest]"); if (!b) return;
  if (b.dataset.stage) { S.stage = +b.dataset.stage; render(); return; }
  const L = +b.dataset.stagetest, ids = stagePool(L).slice(0, STAGE_MAX).map(t => t.id);
  if (!ids.length) return;
  RV.mode = "stage"; RV.from = L; RV.up = 0; RV.queue = ids; RV.i = 0; RV.flipped = false; RV.res = null; RV.err = ""; RV.again = new Set();
  location.hash = "review";
});
