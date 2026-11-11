/* ───────── 10분 복습 (간격 반복) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   떠올리기 먼저 → 뒤집기 → 몰랐음 / 헷갈림 / 알았음. 간격은 /memory-check 와 같다 (단계 0:1일 1:3일 2:7일 3:14일 4:30일 5:60일).
   기록은 progress/<id>.srs = {box, due, first, last, n, lapses, log:[{at,r}], pending:[{at,r}]}
   - 영어 단어의 pending 은 맥 동기화가 볼트 「영어 단어장」 표(단계·다음 복습·기록 ✓△✗)에 넣고 비운다. */
const RV_GAP = [1, 3, 7, 14, 30, 60];
const RV_NEW = 5, RV_MAX = 40;
const RV = { queue: null, i: 0, flipped: false, again: new Set(), stats: { ok: 0, mid: 0, bad: 0 }, dom: null, day: null, touched: false };
const kday = (off = 0) => { const d = new Date(Date.now() + 9 * 3600e3 + off * 86400e3); return d.toISOString().slice(0, 10); };
/* 날짜는 2026-11-11 · 2026.11.11 · 2026/11/11 어느 꼴이든 YYYY-MM-DD 로 맞춰 비교한다 (볼트 표에서 오는 값) */
const dayOf = v => { const m = String(v || "").match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : ""; };
const boxOf = v => Math.max(0, Math.min(5, parseInt(v, 10) || 0));
const vaultSrs = t => (t.stage !== undefined && t.stage !== "" && dayOf(t.due)) ? { box: boxOf(t.stage), due: dayOf(t.due) } : null;
/* 앱 기록(progress)이 먼저, 없으면 볼트 표의 단계·다음 복습. 날짜가 빠진 기록은 오늘 볼 단어로 */
const srsOf = id => { const s = prog[id]?.srs; return s ? { ...s, box: boxOf(s.box), due: dayOf(s.due) || kday() } : vaultSrs(BYID[id] || {}); };
const isNewCard = id => !srsOf(id);
const firstToday = () => TERMS.filter(t => prog[t.id]?.srs?.first === kday()).length;
/* 오늘 복습할 단어는 영역(학습·외국어)과 상관없이 다 모은다 — 지금 영역 것을 먼저 */
const dueAll = (day = kday()) => ALL.filter(t => { const s = srsOf(t.id); return s && s.due <= day; });
const freshCards = (skip = new Set()) => TERMS.filter(t => isNewCard(t.id) && !skip.has(t.id)).sort((a, b) => (isCore(b.id) - isCore(a.id)) || 0);

function rvBuild(){
  const today = kday();
  const due = dueAll(today)
    .sort((a, b) => ((b.dom === S.domain) - (a.dom === S.domain)) || srsOf(a.id).due.localeCompare(srsOf(b.id).due) || srsOf(a.id).box - srsOf(b.id).box).slice(0, RV_MAX);
  const room = Math.max(0, RV_NEW - firstToday());
  const fresh = freshCards().slice(0, room);
  RV.queue = due.map(t => t.id).concat(fresh.map(t => t.id));
  RV.i = 0; RV.flipped = false; RV.again = new Set(); RV.stats = { ok: 0, mid: 0, bad: 0 }; RV.dom = S.domain; RV.day = today; RV.touched = false;
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
  const id = RV.queue?.[RV.i], t = BYID[id]; if (!t) return;
  const now = nowIso(), today = kday();
  const wasNew = !srsOf(id);
  const s0 = srsOf(id) || { box: -1 };
  const s = { box: s0.box ?? -1, n: 0, lapses: 0, log: [], pending: [], ...(prog[id]?.srs || {}) };
  if (s.box < 0) s.box = 0;
  if (!s.first && wasNew) s.first = today;   // 처음 보는 단어만 「오늘 새 단어」로 센다 — 볼트에서 이미 외운 단어를 복습해도 새 단어 몫이 줄지 않게
  if (r === "ok") { s.box = Math.min(5, (s0.box ?? -1) + 1); s.due = kday(rvNext(s.box)); RV.stats.ok++; }
  else if (r === "mid") { s.box = Math.max(0, s0.box ?? 0); s.due = kday(Math.max(1, Math.floor(rvNext(s.box) / 2))); RV.stats.mid++; }
  else { s.box = 0; s.due = kday(1); s.lapses = (s.lapses || 0) + 1; RV.stats.bad++; if (!RV.again.has(id)) { RV.again.add(id); RV.queue.splice(Math.min(RV.queue.length, RV.i + 4), 0, id); } }
  s.n = (s.n || 0) + 1; s.last = now;
  s.log = [...(s.log || []), { at: now, r }].slice(-30);
  if (t.cat === "영어 단어") s.pending = [...(s.pending || []), { at: now, r, box: s.box, due: s.due }];
  const patch = { srs: s, lastSeen: now, seen: (prog[id]?.seen || 0) + 1 };
  if (r === "ok") { patch.level = Math.max(lv(id), s.box >= 4 ? 3 : 2); patch.fuzzy = false; } else if (r === "bad") patch.fuzzy = true;   // 2주 넘게(④칸) 떠올리면 ③ 소화 — 설명하기는 뺐다 (2026-11-07 동욱)
  RV.i++; RV.flipped = false; RV.touched = true;
  save(id, patch, r === "ok" ? "복습: 떠올림" : r === "mid" ? "복습: 헷갈림" : "복습: 몰랐음");
}
function rvFront(t, dir){
  const c = CTX[t.id], fg = t.dom === "외국어 단어장";
  if (dir === "recall") return `<div class="scene"><span class="lbl">${fg ? "이 순간, 영어로" : "이 장면"}</span>${esc(c.scene)}</div>
    ${fg ? `<p class="small muted">뜻 · ${esc(t.def)}</p>` : ""}
    <p class="muted small">${fg ? "어떤 영어 단어를 쓸지" : "어떤 용어인지"} 떠올린 뒤 뒤집어요.</p>`;
  return `<h3 style="font-size:28px">${esc(t.term)}</h3><p class="muted small">뜻을 떠올린 뒤 뒤집어요.</p>`;
}
function rvBack(t, dir){
  const c = CTX[t.id] || {}, fg = t.dom === "외국어 단어장";
  return `${dir === "recall" ? `<h3 style="font-size:24px">${esc(t.term)}</h3>` : ""}
    <div class="def">${rich(t.def)}</div>
    ${t.hook ? `<p class="small">소리 고리 · <b>${esc(t.hook)}</b>${t.pic ? `<br>그림 · ${esc(t.pic)}` : ""}</p>` : ""}
    ${c.ask ? `<div class="ly say"><span class="lbl">${fg ? "이렇게 말해요" : "Claude에게 이렇게"}</span>${esc(c.ask)}</div>` : ""}
    <details class="small"><summary class="muted">더 보기 — 장면·쉽게·헷갈리는 짝·강의 원문</summary><div class="stack" style="margin-top:10px">${sceneHtml(t)}${ctxLayers(t)}${stageHtml(t)}</div></details>`;
}
function renderReview(){
  // 아직 손대기 전이면 그릴 때마다 새로 짠다 — 기록(progress)·단어 목록이 늦게 도착해도 오늘 복습할 단어가 빠지지 않게
  if (!RV.queue || RV.dom !== S.domain || RV.day !== kday() || !RV.touched) rvBuild();
  const today = kday();
  const dueL = dueAll(today), dueN = dueL.length, dueOther = dueL.filter(t => t.dom !== S.domain).length;
  const learned = TERMS.filter(t => srsOf(t.id)).length;
  const tmr = dueAll(kday(1)).length;
  const head = `${statusNote()}
    <div class="meta small muted"><span>오늘 복습 <b class="mono">${dueN}</b>${dueOther ? ` (다른 영역 ${dueOther})` : ""} · 새 단어 <b class="mono">${Math.max(0, RV_NEW - firstToday())}</b>/${RV_NEW}</span><span>익힌 단어 <span class="mono">${learned}</span>/${TERMS.length}</span></div>`;
  if (RV.i >= RV.queue.length) {
    const st = RV.stats, did = st.ok + st.mid + st.bad;
    return `${head}<section class="card stack">
      <h3>${did ? "오늘 복습 끝" : "오늘은 복습할 게 없어요"}</h3>
      ${did ? `<p>✓ ${st.ok} · △ ${st.mid} · ✗ ${st.bad} — 내일 볼 단어 ${tmr}개</p>` : `<p class="muted">새 단어는 하루 ${RV_NEW}개까지예요. 내일 볼 단어 ${tmr}개.</p>`}

      ${freshCards().length ? `<div class="btns"><button class="btn" data-rv="more">새 단어 ${Math.min(RV_NEW, freshCards().length)}개 더</button></div>` : `<p class="small muted">이 영역 단어는 모두 한 번 이상 봤어요.</p>`}
    </section>`;
  }
  const t = BYID[RV.queue[RV.i]];
  if (!t) { RV.queue.splice(RV.i, 1); return renderReview(); }   // 단어 목록에서 빠진 단어
  const dir = rvDir(t), pv = rvPreview(t), s = srsOf(t.id);
  return `${head}
  <div class="prog" aria-label="진행 ${RV.i + 1}/${RV.queue.length}"><span style="width:${RV.i / RV.queue.length * 100}%"></span></div>
  <section class="card flash" data-rv="flip" style="cursor:${RV.flipped ? "default" : "pointer"}">
    <div class="meta"><span class="tc">${esc(t.cat)} · ${s ? "단계 " + s.box : "새 단어"}${RV.again.has(t.id) ? " · 다시" : ""}</span><span class="btns" style="gap:6px">${coreTag(t.id)}</span></div>
    <div class="stack">${rvFront(t, dir)}${RV.flipped ? `<hr style="border:0;border-top:1px solid var(--line);margin:4px 0">` + rvBack(t, dir) : ""}</div>
    ${RV.flipped
      ? `<div class="btns">
          <button class="btn" data-rv="bad">몰랐음<br><span class="small muted">${pv.bad}</span></button>
          <button class="btn" data-rv="mid">헷갈림<br><span class="small muted">${pv.mid}</span></button>
          <button class="btn primary" data-rv="ok">알았음<br><span class="small" style="opacity:.8">${pv.ok}</span></button></div>`
      : `<div class="btns"><button class="btn primary" data-rv="flip">뒤집기</button></div>`}
  </section>
  <p class="small muted mono" style="text-align:center">${RV.i + 1} / ${RV.queue.length}</p>`;
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-rv]"); if (!el || view() !== "review") return;
  if (e.target.closest("details,summary,a,[data-go]") && el.dataset.rv === "flip") return;
  const a = el.dataset.rv;
  if (a === "flip") { if (!RV.flipped && RV.i < (RV.queue || []).length) { RV.flipped = true; RV.touched = true; render(); } return; }
  if (a === "more") { const extra = freshCards(new Set(RV.queue || [])).slice(0, RV_NEW).map(t => t.id); RV.queue = (RV.queue || []).concat(extra); RV.touched = true; render(); return; }
  if (RV.flipped && (a === "ok" || a === "mid" || a === "bad")) { e.stopPropagation(); rvGrade(a); }
});
document.addEventListener("keydown", e => {
  if (view() !== "review" || e.isComposing || /input|textarea|select/i.test(document.activeElement?.tagName || "")) return;
  if (e.key === " " || e.key === "Enter") {
    if (e.target.closest?.("button,a,summary")) return;   // 버튼 위에서 누른 Enter·Space 는 그 버튼 클릭으로 처리된다 (두 번 처리 막기)
    if (!RV.flipped && RV.i < (RV.queue || []).length) { e.preventDefault(); RV.flipped = true; RV.touched = true; render(); }
    return;
  }
  if (RV.flipped && ["1", "2", "3"].includes(e.key)) rvGrade(e.key === "1" ? "bad" : e.key === "2" ? "mid" : "ok");
});
