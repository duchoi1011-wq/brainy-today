/* ── 내 메모 — 칸마다 동욱이 적는 메모 (build.py 가 course.html 에 끼움) ──
   저장: 칸 하나 = 문서 하나 — Supabase cr.memo/<강의 id>-<칸 번호표> = { cid, key 칸 key, title 칸 제목, t 글, at 쓴 시각 }.
   칸마다 따로라서 두 기기가 다른 칸에 쓰면 서로 지우지 않는다. 같은 칸이면 나중에 쓴 글이 남는다. 지운 메모는 t: "" 로 남는다.
   이 앱이 직접 쓰는 유일한 자료다(볼트에는 안 들어간다).
   저장은 「쓰기 → 0.7초 쉬면 그 칸 하나만 보낸다」 뿐이다. 저장소에서 온 소식(스냅숏)은 화면만 맞추고 절대 저장을 부르지 않는다
   (2026-11-24 검증: 소식마다 다시 보내 한 번 쓰기가 실시간 UPDATE 약 1,400건이 됨 — 11-19 전송량 초과 선례).
   못 보낸 칸은 이 기기(localStorage cr.memo.wait)에 두었다가 연결이 돌아오면(online · 30초마다) 그 칸만 다시 보낸다. */
let MEMO = {};                              // 문서 id -> {cid, key, title, t, at}  (저장소에서 받은 것)
let WAIT = lsGet("cr.memo.wait", {});       // 아직 저장소가 받았다고 확인 안 된 칸: 문서 id -> 같은 모양
Object.values(WAIT).forEach(d => { delete d.sending; });
let memoT = 0, memoState = "";
const memoId = (cid, key) => { let h = 2166136261; for (const ch of key) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return cid + "-" + (h >>> 0).toString(36); };
const memoGet = (cid, key) => WAIT[memoId(cid, key)] || MEMO[memoId(cid, key)] || null;
const memoOf = (cid, key) => (memoGet(cid, key) || {}).t || "";
function memoListen(){
  if (!db) return;
  db.collection("cr.memo").onSnapshot(snap => {
    const m = {};
    snap.docs.forEach(d => { if (d.exists) m[d.id] = d.data(); });
    MEMO = m;
    if (!snap.metadata.fromCache && !memoListen.live) { memoListen.live = true; memoRetry(); }   // 지난번 못 보낸 칸 — 처음 한 번만
    if (["memo", "map", "cell"].includes(view())) render();   // 쓰는 중이면 render 가 미룬다 — 여기서 저장은 부르지 않는다
  }, () => {});
}
function memoSet(c, x, t){
  const id = memoId(c.id, x.key);
  WAIT[id] = { cid: c.id, key: x.key, title: x.title, t, at: nowIso() };
  lsPut("cr.memo.wait", WAIT);
  memoState = "saving"; paintMemoState();
  clearTimeout(memoT); memoT = setTimeout(() => { memoT = 0; memoSend(id); }, 700);
}
function memoSend(id){
  const doc = WAIT[id];
  if (!doc || doc.sending) return;
  if (!db) { memoState = "fail"; paintMemoState(); return; }
  doc.sending = true;
  const { sending, ...body } = doc;
  db.doc("cr.memo/" + id).set(body).then(() => {
    if (WAIT[id] === doc) { delete WAIT[id]; lsPut("cr.memo.wait", WAIT); }   // 보내는 사이 더 썼으면 그 글은 다음 차례에
    MEMO[id] = body;
    if (WAIT[id]) memoSend(id); else { memoState = "saved"; paintMemoState(); }   // 저장소가 받은 글 = 지금 칸의 글일 때만 「저장했어요」
  }, () => { doc.sending = false; memoState = "fail"; paintMemoState(); });
}
const memoRetry = () => { if (!memoT) Object.keys(WAIT).forEach(memoSend); };
window.addEventListener("online", memoRetry);
setInterval(() => { if (Object.keys(WAIT).length) memoRetry(); }, 30000);
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
  if (x) memoSet(c, x, e.target.value);
});

/* 「내 메모」 탭 — 이 강의에서 메모를 적은 칸 전부 (최근 순) */
function memoList(cid){
  const all = { ...MEMO, ...WAIT };
  return Object.values(all).filter(v => v && v.cid === cid && (v.t || "").trim()).sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}
function renderMemo(c){
  const rows = memoList(c.id);
  const other = DATA.courses.filter(o => o !== c).map(o => [o, memoList(o.id).length]).filter(([, n]) => n);
  let h = `<section class="card"><h2>내 메모 · ${rows.length}칸</h2>`;
  if (!rows.length) h += `<p class="empty">아직 적은 메모가 없어요.<br>지도에서 칸을 열면 맨 아래에 메모 칸이 있어요. 쓰면 바로 저장되고 모든 기기에서 같아요.</p>`;
  else h += rows.map(v => {
    const x = cellBy(c, v.key), when = new Date(v.at);
    return `<button type="button" class="cell ${x ? x.st : "todo"}"${x ? ` data-cell="${esc(v.key)}"` : " disabled"}><span class="ct"><b>${esc(x ? x.title : v.title || v.key)}</b><span style="white-space:pre-wrap;-webkit-line-clamp:4">${esc(v.t)}</span></span>
      <span class="tags">${x ? pill(x.st) : `<span class="pill" title="지도에서 칸 이름이 바뀌어 못 찾았어요">칸 없음</span>`}<small class="muted mono">${when.getMonth() + 1}/${when.getDate()}</small></span></button>`;
  }).join("");
  h += `</section>`;
  if (other.length) h += `<section class="card"><h2>다른 강의의 메모</h2><div class="chips">${other.map(([o, n]) => `<button type="button" class="chip" data-course="${o.id}">${esc(o.name)}<b>${n}</b></button>`).join("")}</div></section>`;
  return h;
}
