/* ── 내 메모 — 칸마다 동욱이 적는 메모 (build.py 가 course.html 에 끼움) ──
   저장: Supabase cr.marks/<강의 id> = { memo: { 칸 key: { t 글, at 쓴 시각, title 칸 제목 } }, updatedAt } — 모든 기기에서 같다.
   이 앱이 직접 쓰는 유일한 자료다(볼트에는 안 들어간다). 지운 메모도 { t: "" , at } 로 남겨 두 기기가 합칠 때 되살아나지 않게 한다.
   합치기: 칸마다 at 이 늦은 쪽이 이긴다. 저장이 실패하면 이 기기(localStorage cr.memo)에 두고 다시 이어지면 보낸다. */
let MEMO = lsGet("cr.memo", {});          // 강의 id -> { 칸 key -> {t, at, title} }
let DIRTY = lsGet("cr.memo.dirty", {});   // 아직 저장소에 못 보낸 강의 id
let memoT = 0, memoState = "";
const memoOf = (cid, key) => ((MEMO[cid] || {})[key] || {}).t || "";
function memoMerge(cid, remote){
  const mine = MEMO[cid] || {}, all = { ...remote };
  Object.keys(mine).forEach(k => { if (!all[k] || (mine[k].at || "") > (all[k].at || "")) all[k] = mine[k]; });
  MEMO[cid] = all;
  return JSON.stringify(all) !== JSON.stringify(remote);   // 이 기기에만 있는 게 있으면 true
}
function memoListen(){
  if (!db) return;
  db.collection("cr.marks").onSnapshot(snap => {
    snap.docs.forEach(d => { if (!d.exists) return; const v = d.data() || {}; if (memoMerge(d.id, v.memo || {}) && !d.metadata.fromCache) DIRTY[d.id] = 1; });
    lsPut("cr.memo", MEMO);
    memoFlush();
    if (["memo", "map", "cell"].includes(view())) render();
  }, () => {});
}
function memoSet(cid, key, title, t){
  MEMO[cid] = MEMO[cid] || {};
  MEMO[cid][key] = { t, at: nowIso(), title };
  DIRTY[cid] = 1; lsPut("cr.memo", MEMO); lsPut("cr.memo.dirty", DIRTY);
  memoState = "saving"; paintMemoState();
  clearTimeout(memoT); memoT = setTimeout(memoFlush, 700);
}
function memoFlush(){
  const ids = Object.keys(DIRTY);
  if (!ids.length) return;
  if (!db) { memoState = "fail"; paintMemoState(); return; }
  ids.forEach(cid => {
    db.doc("cr.marks/" + cid).set({ memo: MEMO[cid] || {}, updatedAt: nowIso() }).then(() => {
      delete DIRTY[cid]; lsPut("cr.memo.dirty", DIRTY);
      if (!Object.keys(DIRTY).length) { memoState = "saved"; paintMemoState(); }
    }, () => { memoState = "fail"; paintMemoState(); });
  });
}
window.addEventListener("online", memoFlush);
setInterval(() => { if (Object.keys(DIRTY).length) memoFlush(); }, 30000);
function paintMemoState(){
  const el = document.getElementById("memo-state"); if (!el) return;
  el.className = "saved" + (memoState === "fail" ? " fail" : "");
  el.textContent = memoState === "saving" ? "저장하는 중…" : memoState === "saved" ? "저장했어요 · 다른 기기에서도 보여요" : memoState === "fail" ? "아직 저장 못 했어요 — 이 기기에 두었다가 연결되면 저절로 보내요" : "쓰면 바로 저장돼요 · 모든 기기에서 같아요";
}
function memoBox(c, x, memo){
  return `<section class="card"><h2>내 메모</h2>
    <textarea class="memo-in" id="memo-in" data-key="${esc(x.key)}" placeholder="이 칸을 하며 떠오른 것, 막힌 곳, 다음에 할 것을 적어 두세요" aria-label="${esc(x.title)} 메모">${esc(memo)}</textarea>
    <p id="memo-state" class="saved" style="margin-top:6px"></p></section>`;
}
document.addEventListener("input", e => {
  if (e.target.id !== "memo-in") return;
  const c = course(), x = c && cellBy(c, e.target.dataset.key);
  if (x) memoSet(c.id, x.key, x.title, e.target.value);
});

/* 「내 메모」 탭 — 이 강의에서 메모를 적은 칸 전부 (최근 순) */
function renderMemo(c){
  const m = MEMO[c.id] || {};
  const rows = Object.keys(m).filter(k => (m[k].t || "").trim()).sort((a, b) => (m[b].at || "").localeCompare(m[a].at || ""));
  const other = DATA.courses.filter(o => o !== c).map(o => [o, Object.values(MEMO[o.id] || {}).filter(v => (v.t || "").trim()).length]).filter(([, n]) => n);
  let h = `<section class="card"><h2>내 메모 · ${rows.length}칸</h2>`;
  if (!rows.length) h += `<p class="empty">아직 적은 메모가 없어요.<br>지도에서 칸을 열면 맨 아래에 메모 칸이 있어요. 쓰면 바로 저장되고 모든 기기에서 같아요.</p>`;
  else h += rows.map(k => {
    const x = cellBy(c, k), v = m[k], when = new Date(v.at);
    return `<button type="button" class="cell ${x ? x.st : "todo"}"${x ? ` data-cell="${esc(k)}"` : " disabled"}><span class="ct"><b>${esc(x ? x.title : v.title || k)}</b><span style="white-space:pre-wrap;-webkit-line-clamp:4">${esc(v.t)}</span></span>
      <span class="tags">${x ? pill(x.st) : `<span class="pill" title="지도에서 칸 이름이 바뀌어 못 찾았어요">칸 없음</span>`}<small class="muted mono">${when.getMonth() + 1}/${when.getDate()}</small></span></button>`;
  }).join("");
  h += `</section>`;
  if (other.length) h += `<section class="card"><h2>다른 강의의 메모</h2><div class="chips">${other.map(([o, n]) => `<button type="button" class="chip" data-course="${o.id}">${esc(o.name)}<b>${n}</b></button>`).join("")}</div></section>`;
  return h;
}
