/* ── 내 체크 — 동욱이 앱에서 직접 누르는 체크 (build.py 가 course.html 에 끼움 · 2026-11-24 동욱 「내가 한 건 수동으로도 체크」) ──
   정본은 볼트 지도 카드다. 앱은 누른 것 하나를 Supabase 문서 하나로 보낸다:
     cr.tog/<번호표> = { cid, map 지도 카드 경로, key 칸, title, kind: cell|req|chk, id 항목 번호표, t 항목 글, done, at }
   맥 동기화(볼트 .claude/scripts/course_app.py apply_toggles)가 지도 카드에 적는다 — 항목 맨 앞 「☑ 」, 칸 끝은 「✅ MM-DD 동욱 체크」 —
   그리고 그 문서에 { ok_at: at, result } 를 붙인다. 지도 카드가 바뀌면 cr.data/main 이 다시 와서 화면이 그 결과를 보여 준다.
   그 사이(보통 몇 초)에는 누른 대로 먼저 보여 준다(TOG_WAIT). 맥이 꺼져 있으면 켜질 때 적힌다. */
let TOG = {};                               // 문서 id -> 저장소에서 받은 것
let TOG_WAIT = lsGet("cr.tog.wait", {});    // 아직 맥이 지도 카드에 적었다고 확인 안 된 것: 문서 id -> 보낸 것
const togId = (cid, key, kind, id) => memoId(cid, key + "|" + kind + "|" + (id || ""));

/* 지금 보이는 체크 상태 — 기다리는 것이 있으면 그것, 없으면 볼트 지도 카드 그대로 */
function itemOn(c, x, kind, it){
  const w = TOG_WAIT[togId(c.id, x.key, kind, it.id)];
  if (w) return w.done;
  return !!it.ok || (x.st === "done" && !x.mine);   // Brainy가 끝낸 칸은 다 맞춘 칸
}
function cellOn(c, x){
  const w = TOG_WAIT[togId(c.id, x.key, "cell")];
  return w ? w.done : x.st === "done";
}
const naItem = it => /해당 없음/.test((it.note || "") + " " + (it.t || ""));
/* 빠진 것 — 교안 요구·확인 항목 중 아직 체크 안 된 것 (☑ 충족 · ⏭ 넘김 · 「해당 없음」은 뺀다). 셈은 여기 한 곳 */
function missingOf(c, x){
  const req = (x.req || []).filter(it => it.id && !it.skip && !naItem(it) && !itemOn(c, x, "req", it));
  const chk = (x.chk || []).filter(it => it.id && it.t && !it.skip && !itemOn(c, x, "chk", it));
  return { req, chk, n: req.length + chk.length, has: (x.req || []).some(it => it.id) || (x.chk || []).some(it => it.id && it.t) };
}

function togSend(c, x, kind, it, done){
  const id = togId(c.id, x.key, kind, it && it.id);
  const body = { cid: c.id, map: c.map, key: x.key, title: x.title, kind, id: it ? it.id : "", t: it ? it.t : "", done, at: nowIso() };
  TOG_WAIT[id] = body; lsPut("cr.tog.wait", TOG_WAIT);
  render();
  if (!db) { toast("아직 연결이 안 됐어요. 이 기기에 두었다가 연결되면 보내요."); return; }
  db.doc("cr.tog/" + id).set(body).then(() => toast(kind === "cell" ? (done ? "끝 표시했어요 · 볼트 지도 카드에 적는 중" : "끝 표시를 풀었어요 · 볼트에 적는 중") : (done ? "체크했어요 · 볼트 지도 카드에 적는 중" : "체크를 풀었어요 · 볼트에 적는 중")),
    () => toast("아직 못 보냈어요. 이 기기에 두었다가 연결되면 다시 보내요."));
}
/* 저장소 소식 — 맥이 적은 결과를 보고 기다리던 것을 놓는다. 적지 못했으면(칸·항목 글이 바뀜 등) 이유를 알리고 원래대로 */
function togListen(){
  if (!db) return;
  db.collection("cr.tog").onSnapshot(snap => {
    const m = {};
    snap.docs.forEach(d => { if (d.exists) m[d.id] = d.data(); });
    TOG = m;
    let changed = false;
    Object.entries(TOG_WAIT).forEach(([id, w]) => {
      const r = TOG[id];
      if (!r) { if (!snap.metadata.fromCache && db && !w.resent) { w.resent = 1; const { resent, ...b } = w; db.doc("cr.tog/" + id).set(b).catch(() => {}); } return; }   // 못 보낸 것 — 이 화면에서 한 번만 다시 (저장이 저장을 부르지 않게, 지침 F23)
      if (r.at !== w.at || r.ok_at !== w.at) return;   // 아직 맥이 안 적음 (또는 더 새로 누름)
      if (!/^적음|^이미/.test(r.result || "")) toast("볼트에 못 적었어요 — " + (r.result || "이유 모름"));
      if (/^적음|^이미/.test(r.result || "") && !reflected(w)) return;   // 지도 카드가 다시 올 때까지 누른 대로 보여 준다
      delete TOG_WAIT[id]; changed = true;
    });
    if (changed) { lsPut("cr.tog.wait", TOG_WAIT); render(); }
  }, () => {});
}
/* 받은 지도(cr.data)가 그 체크를 이미 담고 있나 */
function reflected(w){
  const c = DATA.courses.find(o => o.id === w.cid), x = c && cellBy(c, w.key);
  if (!x) return true;
  if (w.kind === "cell") return (x.st === "done") === w.done;
  const it = (x[w.kind] || []).find(i => i.id === w.id);
  return !it || !!it.ok === w.done;
}
/* cr.data 가 새로 오면 이미 담긴 체크는 놓는다 */
function togSettle(){
  let changed = false;
  Object.entries(TOG_WAIT).forEach(([id, w]) => { const r = TOG[id]; if (r && r.ok_at === w.at && reflected(w)) { delete TOG_WAIT[id]; changed = true; } });
  if (changed) lsPut("cr.tog.wait", TOG_WAIT);
}

/* 칸 자세히의 체크 목록 — 줄 전체가 누르는 자리 (44px) */
function checkList(c, x, kind){
  const L = (x[kind] || []);
  if (!L.length) return "";
  const noteHtml = n => n ? ` <span class="muted small">— ${remainHtml(n)}</span>` : "";
  return `<ul class="checks">${L.map(it => {
    if (!it.t) return `<li class="qnote muted small">${inline(it.note || "")}</li>`;   // 안내 줄 (질문이 아님)
    if (it.skip) return `<li><span class="ck skip" aria-hidden="true">⏭</span><span class="muted">${inline(it.t)} <span class="small">— 넘김</span>${noteHtml(it.note)}</span></li>`;
    if (naItem(it)) return `<li><span class="ck skip" aria-hidden="true">–</span><span class="muted">${inline(it.t)}${noteHtml(it.note)}</span></li>`;
    const on = itemOn(c, x, kind, it), wait = !!TOG_WAIT[togId(c.id, x.key, kind, it.id)];
    const text = kind === "chk" ? (it.q || it.t) : it.t;
    return `<li><button type="button" class="ckrow${on ? " on" : ""}" data-tog="${esc(kind)}" data-id="${esc(it.id)}" aria-pressed="${on}" ${x.st === "done" && !x.mine ? "disabled" : ""}>
      <span class="ck" aria-hidden="true">${on ? "✓" : ""}</span><span>${inline(text)}${noteHtml(it.note)}${wait ? ` <span class="small muted">· 볼트에 적는 중</span>` : ""}</span></button></li>`;
  }).join("")}</ul>`;
}
/* 칸 끝 표시 단추 — 실습은 「내가 끝냈어요」, 듣기는 「들었어요」. Brainy가 대조해 끝낸 칸은 풀지 않는다 */
function cellBtn(c, x){
  const on = cellOn(c, x), listen = isListen(x);
  if (x.st === "done" && !x.mine && !TOG_WAIT[togId(c.id, x.key, "cell")]) return `<p class="small muted">✅ Brainy가 교안 요구를 대조하고 확인 질문까지 마친 칸이에요.</p>`;
  return `<button type="button" class="btn${on ? "" : " ok"}" data-togcell="${esc(x.key)}" aria-pressed="${on}">${on ? (listen ? "↺ 들었어요 풀기" : "↺ 끝 표시 풀기") : (listen ? "✓ 들었어요" : "✓ 내가 끝냈어요 — 끝 표시")}</button>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-tog],[data-togcell]");
  if (!b) return;
  const c = course(); if (!c) return;
  if (b.dataset.togcell !== undefined) { const x = cellBy(c, b.dataset.togcell); if (x) togSend(c, x, "cell", null, !cellOn(c, x)); return; }
  const x = cellBy(c, S.cell), it = x && (x[b.dataset.tog] || []).find(i => i.id === b.dataset.id);
  if (it) togSend(c, x, b.dataset.tog, it, !itemOn(c, x, b.dataset.tog, it));
});
