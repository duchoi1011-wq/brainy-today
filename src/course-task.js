/* ── 지금 태스크 — 완료 기준 체크·상태 바꾸기 (build.py 가 course.html 에 끼움 · 2026-11-24 동욱 「볼트의 액션(3_Action 태스크)과 연동돼서 움직이도록」) ──
   볼트 태스크 노트가 정본이다. 앱은 누른 것을 문서 하나에 모아 보낸다 (광고 실습 앱과 같은 규약):
     taskwork/cr-<번호표> = { task: "T- 뺀 노트 이름", from: "강의 실습", status: "할일|진행|완료|보류"(노트와 같으면 ""),
                             steps: { "<본문 체크칸 번호 = crit.box>": true|false }, log: [], synced: false, updatedAt }
   맥의 task_sync.py 가 노트 status·머리줄·로그·허브·실행 로그·데일리 노트에 적고 synced:true 로 바꾼다.
   그 뒤 노트가 바뀌어 cr.data/main 이 다시 오면 화면은 노트 그대로. 그 사이에는 누른 대로 먼저 보여 준다. */
let TW = {};   // 문서 id -> taskwork 문서 (강의 실습 것만)
const twId = t => "cr-" + memoId("t", t.name);
const twName = t => t.name.replace(/^T-/, "");
function twOf(t){ const d = TW[twId(t)]; return d && d.synced === false ? d : null; }   // 아직 노트에 안 들어간 것만
function critOn(t, k){ const d = twOf(t); return d && d.steps && d.steps[k.box] !== undefined ? !!d.steps[k.box] : k.done; }
function taskStatus(t){ const d = twOf(t); return (d && d.status) || t.status; }
function twListen(){
  if (!db) return;
  db.collection("taskwork").onSnapshot(snap => {
    const m = {};
    snap.docs.forEach(d => { if (d.exists && d.id.indexOf("cr-") === 0) m[d.id] = d.data(); });
    Object.keys(TW_UNSENT).forEach(id => { if (TW[id]) m[id] = TW[id]; });   // 아직 못 보낸 것은 이 기기 것을 지킨다
    TW = m;
    if (view() === "now") render();
  }, () => {});
}
function twChange(t, mutate){
  if (!db) { toast("아직 연결이 안 됐어요. 잠시 뒤 다시 눌러 주세요."); return; }
  const id = twId(t);
  const cur = JSON.parse(JSON.stringify(TW[id] || {}));
  if (cur.synced !== false) { cur.steps = {}; cur.status = ""; }   // 지난번 것은 이미 노트에 들어감 — 새로 시작
  cur.task = twName(t); cur.from = "강의 실습"; cur.steps = cur.steps || {}; cur.log = cur.log || [];
  mutate(cur);
  Object.keys(cur.steps).forEach(b => { const k = t.crit.find(x => String(x.box) === b); if (k && cur.steps[b] === k.done) delete cur.steps[b]; });   // 노트와 같아진 칸은 뺀다
  if (cur.status === t.status) cur.status = "";
  cur.synced = false; cur.updatedAt = nowIso();
  TW[id] = cur; TW_UNSENT[id] = 1; render();
  twPush(id, true);
}
/* 못 보낸 것은 연결이 돌아올 때·30초마다 다시 (받침이 이 기기 사본을 먼저 바꾸므로 「보냈나」는 저장소 답으로만 안다 — 지침 F25) */
const TW_UNSENT = {};
function twPush(id, say){
  if (!TW_UNSENT[id] || !db) return;
  const body = TW[id];
  db.doc("taskwork/" + id).set(body).then(() => { if (TW[id] === body) delete TW_UNSENT[id]; if (say) toast("볼트 태스크 노트에 적는 중이에요 (몇 초)"); },
    () => { if (say) toast("아직 못 보냈어요. 연결되면 다시 보내요."); });
}
window.addEventListener("online", () => Object.keys(TW_UNSENT).forEach(id => twPush(id)));
setInterval(() => Object.keys(TW_UNSENT).forEach(id => twPush(id)), 30000);
const TASK_ST = ["할일", "진행", "완료", "보류"];
function statusBtns(t){
  const now = taskStatus(t);
  return `<div class="chips" role="group" aria-label="태스크 상태" style="margin-top:8px">${TASK_ST.map(s => `<button type="button" class="chip ${s === now ? "on" : ""}" data-tstatus="${s}" aria-pressed="${s === now}">${s}</button>`).join("")}</div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-tbox],[data-tstatus]");
  if (!b) return;
  const c = course(), t = taskOf(c); if (!t) return;
  if (b.dataset.tbox !== undefined) {
    const k = t.crit.find(x => String(x.box) === b.dataset.tbox); if (!k) return;
    const on = critOn(t, k);
    return twChange(t, cur => { cur.steps[k.box] = !on; });
  }
  const s = b.dataset.tstatus;
  if (s === taskStatus(t)) return;
  if (s === "완료") {
    const left = t.crit.filter(k => !critOn(t, k)).length;
    if (!confirm(left ? `완료 기준 ${left}줄이 아직 체크 안 됐어요.\n그래도 이 태스크를 완료로 바꿀까요? (볼트 태스크 노트에 적혀요)` : "이 태스크를 완료로 바꿀까요? (볼트 태스크 노트에 적혀요)")) return;
  }
  twChange(t, cur => { cur.status = s; });
});
