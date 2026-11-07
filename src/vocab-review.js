/* ───────── 10분 복습 (간격 반복) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   떠올리기 먼저 → 뒤집기 → 몰랐음 / 헷갈림 / 알았음. 간격은 /memory-check 와 같다 (단계 0:1일 1:3일 2:7일 3:14일 4:30일 5:60일).
   기록은 progress/<id>.srs = {box, due, first, last, n, lapses, log:[{at,r}], pending:[{at,r}]}
   - 영어 단어의 pending 은 맥 동기화가 볼트 「영어 단어장」 표(단계·다음 복습·기록 ✓△✗)에 넣고 비운다. */
const RV_GAP = [1, 3, 7, 14, 30, 60];
const RV_NEW = 5, RV_MAX = 40;
const RV = { queue: null, i: 0, flipped: false, again: new Set(), stats: { ok: 0, mid: 0, bad: 0 }, dom: null, day: null };
const kday = (off = 0) => { const d = new Date(Date.now() + 9 * 3600e3 + off * 86400e3); return d.toISOString().slice(0, 10); };
const vaultSrs = t => (t.stage !== undefined && t.stage !== "" && t.due) ? { box: Math.max(0, Math.min(5, parseInt(t.stage, 10) || 0)), due: t.due } : null;
const srsOf = id => prog[id]?.srs || vaultSrs(BYID[id] || {}) || null;
const isNewCard = id => !srsOf(id);
const firstToday = () => TERMS.filter(t => prog[t.id]?.srs?.first === kday()).length;

function rvBuild(){
  const today = kday();
  const due = TERMS.filter(t => { const s = srsOf(t.id); return s && s.due <= today; })
    .sort((a, b) => srsOf(a.id).due.localeCompare(srsOf(b.id).due) || srsOf(a.id).box - srsOf(b.id).box).slice(0, RV_MAX);
  const room = Math.max(0, RV_NEW - firstToday());
  const fresh = TERMS.filter(t => isNewCard(t.id)).sort((a, b) => (isCore(b.id) - isCore(a.id)) || 0).slice(0, room);
  RV.queue = due.map(t => t.id).concat(fresh.map(t => t.id));
  RV.i = 0; RV.flipped = false; RV.again = new Set(); RV.stats = { ok: 0, mid: 0, bad: 0 }; RV.dom = S.domain; RV.day = today;
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
  s.n = (s.n || 0) + 1; s.last = now;
  s.log = [...(s.log || []), { at: now, r }].slice(-30);
  if (t.cat === "영어 단어") s.pending = [...(s.pending || []), { at: now, r, box: s.box, due: s.due }];
  const patch = { srs: s, lastSeen: now, seen: (prog[id]?.seen || 0) + 1 };
  if (r === "ok") { patch.level = 2; patch.fuzzy = false; } else if (r === "bad") patch.fuzzy = true;
  RV.i++; RV.flipped = false;
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
  if (!RV.queue || RV.dom !== S.domain || RV.day !== kday()) rvBuild();
  const today = kday();
  const dueN = TERMS.filter(t => { const s = srsOf(t.id); return s && s.due <= today; }).length;
  const learned = TERMS.filter(t => srsOf(t.id)).length;
  const tmr = TERMS.filter(t => { const s = srsOf(t.id); return s && s.due <= kday(1); }).length;
  const talkReady = TERMS.filter(t => (srsOf(t.id)?.box || 0) >= 3 && lv(t.id) < 3);
  const head = `${statusNote()}
    <div class="meta small muted"><span>오늘 복습 <b class="mono">${dueN}</b> · 새 단어 <b class="mono">${Math.max(0, RV_NEW - firstToday())}</b>/${RV_NEW}</span><span>익힌 단어 <span class="mono">${learned}</span>/${TERMS.length}</span></div>`;
  if (RV.i >= RV.queue.length) {
    const st = RV.stats, did = st.ok + st.mid + st.bad;
    return `${head}<section class="card stack">
      <h3>${did ? "오늘 복습 끝" : "오늘은 복습할 게 없어요"}</h3>
      ${did ? `<p>✓ ${st.ok} · △ ${st.mid} · ✗ ${st.bad} — 내일 볼 단어 ${tmr}개</p>` : `<p class="muted">새 단어는 하루 ${RV_NEW}개까지예요. 내일 볼 단어 ${tmr}개.</p>`}
      ${talkReady.length ? `<div class="note">설명해 볼 단어 ${talkReady.length}개 — 2주 넘게 떠올린 단어예요. 내 말로 설명하면 ③ 소화로 올라가요.
        <div class="btns" style="margin-top:8px"><button class="btn primary" data-go="talk" data-id="${talkReady[0].id}">설명하기</button></div></div>` : ""}
      <div class="btns"><button class="btn" data-rv="more">새 단어 5개 더</button></div>
    </section>`;
  }
  const t = BYID[RV.queue[RV.i]];
  if (!t) { RV.i++; return renderReview(); }
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
  if (a === "flip") { if (!RV.flipped) { RV.flipped = true; render(); } return; }
  if (a === "more") { const extra = TERMS.filter(t => isNewCard(t.id)).slice(0, RV_NEW).map(t => t.id); RV.queue = RV.queue.concat(extra); render(); return; }
  if (RV.flipped && (a === "ok" || a === "mid" || a === "bad")) { e.stopPropagation(); rvGrade(a); }
});
document.addEventListener("keydown", e => {
  if (view() !== "review" || e.isComposing || /input|textarea|select/i.test(document.activeElement?.tagName || "")) return;
  if (e.key === " " || e.key === "Enter") { if (!RV.flipped) { e.preventDefault(); RV.flipped = true; render(); } return; }
  if (RV.flipped && ["1", "2", "3"].includes(e.key)) rvGrade(e.key === "1" ? "bad" : e.key === "2" ? "mid" : "ok");
});
