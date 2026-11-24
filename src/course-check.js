/* ── 내 체크 — 동욱이 앱에서 직접 누르는 체크 (build.py 가 course.html 에 끼움 · 2026-11-24 동욱 「내가 한 건 수동으로도 체크」) ──
   정본은 볼트 지도 카드다. 앱은 누른 것 하나를 Supabase 문서 하나로 보낸다:
     cr.tog/<번호표> = { cid, map 지도 카드 경로, key 칸, title, kind: cell|req|chk, id 항목 번호표, t 항목 글, done, at }
   맥 동기화(볼트 .claude/scripts/course_app.py apply_toggles)가 지도 카드에 적는다 — 항목 맨 앞 「☑ 」, 칸 끝은 「✅ MM-DD 동욱 체크」 —
   그리고 그 문서에 { ok_at: at, result } 를 붙인다. 지도 카드가 바뀌면 cr.data/main 이 다시 와서 화면이 그 결과를 보여 준다.
   그 사이(보통 몇 초)에는 누른 대로 먼저 보여 준다(TOG_WAIT). 맥이 꺼져 있으면 켜질 때 적힌다. */
let TOG = {};                               // 문서 id -> 저장소에서 받은 것
let TOG_WAIT = lsGet("cr.tog.wait", {});    // 아직 맥이 지도 카드에 적었다고 확인 안 된 것: 문서 id -> 보낸 것 (sent: 저장소가 받았나)
Object.values(TOG_WAIT).forEach(w => { delete w.sending; });
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

/* 빠진 것 세는 말 — 요구와 확인 질문을 따로 (「빠진 것 17개」만으로는 무엇이 몇 개인지 모름) */
const missWord = m => [m.req.length ? `요구 ${m.req.length}개` : "", m.chk.length ? `확인 질문 ${m.chk.length}개` : ""].filter(Boolean).join(" · ");
function togSend(c, x, kind, it, done){
  const id = togId(c.id, x.key, kind, it && it.id);
  TOG_WAIT[id] = { cid: c.id, map: c.map, key: x.key, title: x.title, kind, id: it ? it.id : "", t: it ? it.t : "", done, at: nowIso(), sent: 0 };
  lsPut("cr.tog.wait", TOG_WAIT);
  render();
  togPush(id, true);
}
/* 보내기 — 저장소가 「받았다」고 답한 것만 sent:1. 못 보낸 것(sent:0)은 연결이 돌아올 때·30초마다 다시 보낸다.
   받침은 보내기 전에 이 기기 사본을 먼저 바꾸므로, 「서버에 그 문서가 있나」로는 보냈는지 알 수 없다 (11-24 검증 높음 1 · 지침 F25). */
function togPush(id, say){
  const w = TOG_WAIT[id];
  if (!w || w.sent || w.sending) return;
  if (!db) { if (say) toast("아직 연결이 안 됐어요. 이 기기에 두었다가 연결되면 보내요."); return; }
  w.sending = 1;
  const { sent, sending, ...body } = w;
  db.doc("cr.tog/" + id).set(body).then(() => {
    w.sending = 0;
    if (TOG_WAIT[id] !== w) return;   // 그 사이 또 누름 — 새 것이 따로 간다
    w.sent = 1; lsPut("cr.tog.wait", TOG_WAIT);
    if (say) toast(w.kind === "cell" ? (w.done ? "끝 표시했어요 · 볼트 지도 카드에 적는 중" : "끝 표시를 풀었어요 · 볼트에 적는 중") : (w.done ? "체크했어요 · 볼트 지도 카드에 적는 중" : "체크를 풀었어요 · 볼트에 적는 중"));
  }, () => { w.sending = 0; if (say) toast("아직 못 보냈어요. 이 기기에 두었다가 연결되면 다시 보내요."); });
}
const togRetry = () => Object.keys(TOG_WAIT).forEach(id => togPush(id, false));
window.addEventListener("online", togRetry);
setInterval(() => { if (Object.values(TOG_WAIT).some(w => !w.sent)) togRetry(); }, 30000);
/* 저장소 소식 — 맥이 적은 결과를 보고 기다리던 것을 놓는다. 적지 못했으면(칸·항목 글이 바뀜 등) 이유를 알리고 원래대로.
   다른 기기가 같은 항목을 더 나중에 눌렀으면(r.at > w.at) 그쪽이 이긴다 — 이 기기의 기다림을 놓는다. 소식은 저장을 부르지 않는다(F23). */
function togListen(){
  if (!db) return;
  db.collection("cr.tog").onSnapshot(snap => {
    const m = {};
    snap.docs.forEach(d => { if (d.exists) m[d.id] = d.data(); });
    TOG = m;
    if (!snap.metadata.fromCache && !togListen.live) { togListen.live = true; togRetry(); }   // 지난번 못 보낸 것 — 연결되면 한 번
    let changed = false;
    Object.entries(TOG_WAIT).forEach(([id, w]) => {
      const r = TOG[id];
      if (!r) return;
      if (w.sent && r.at > w.at) { delete TOG_WAIT[id]; changed = true; return; }   // 다른 기기가 더 나중에 누름
      if (r.at !== w.at || r.ok_at !== w.at) return;   // 아직 맥이 안 적음
      if (!/^적음|^이미/.test(r.result || "")) toast("볼트에 못 적었어요 — " + (r.result || "이유 모름"));
      else if (!reflected(w)) return;   // 지도 카드가 다시 올 때까지 누른 대로 보여 준다
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
    if (naItem(it)) return `<li><span class="ck skip" aria-hidden="true">–</span><span class="muted">${inline(it.t)}${/해당 없음/.test(it.note || "") ? noteHtml(it.note) : ` <span class="small">— 해당 없음 (빠진 것으로 안 세요)</span>`}</span></li>`;
    const on = itemOn(c, x, kind, it), wait = !!TOG_WAIT[togId(c.id, x.key, kind, it.id)];
    const text = kind === "chk" ? (it.q || it.t) : it.t;
    return `<li><button type="button" class="ckrow${on ? " on" : ""}" data-tog="${esc(kind)}" data-id="${esc(it.id)}" aria-pressed="${on}" ${x.st === "done" && !x.mine ? "disabled" : ""}>
      <span class="ck" aria-hidden="true">${on ? "✓" : ""}</span><span>${inline(text)}${noteHtml(it.note)}${wait ? ` <span class="small muted">· ${TOG_WAIT[togId(c.id, x.key, kind, it.id)].sent ? "볼트에 적는 중" : "아직 못 보냄 — 연결되면 보내요"}</span>` : ""}</span></button></li>`;
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
  if (b.dataset.togcell !== undefined) {
    const x = cellBy(c, b.dataset.togcell); if (!x) return;
    const on = cellOn(c, x), m = missingOf(c, x);
    if (!on && !isListen(x) && m.n && !confirm(`아직 체크 안 된 것이 있어요 (${missWord(m)}).\n그래도 이 칸을 끝으로 표시할까요?`)) return;
    togSend(c, x, "cell", null, !on); return;
  }
  const x = cellBy(c, S.cell), it = x && (x[b.dataset.tog] || []).find(i => i.id === b.dataset.id);
  if (it) togSend(c, x, b.dataset.tog, it, !itemOn(c, x, b.dataset.tog, it));
});
