/* ── 조율 요청 — 앱이 쓰는 유일한 자료 (build.py 가 ads.html 에 끼움) ──
   ah.req/<id> = {kind: bid|onoff|budget, type: keyword|group|campaign, id, name, brand, to, why, status: "요청", at}
   누르면 한 줄로 확인받고(confirm) 요청을 남긴다 → 맥 동기화(adhub_app.py)가 정본 JSON limits·허용 CPC 안인지 다시 보고 네이버에 적용,
   status 적용/실패 · before(바꾸기 전 값) · error 를 적는다. 적용한 것은 볼트 changes 에 한 줄. 되돌리기 = before 값으로 새 요청.
   저장소 소식(스냅숏)은 화면만 맞춘다 — 저장을 부르지 않는다. */
let REQ = {};
let reqDb = null;
const REQ_WORD = { bid: "입찰가", onoff: "켜기·끄기", budget: "일예산" };
const reqOpen = (type, id) => Object.values(REQ).filter(q => q.type === type && q.id === id && q.status === "요청");
const reqFmt = (kind, v) => kind === "onoff" ? (v ? "켬" : "끔") : won(v) + "원";
function reqListen(db){
  reqDb = db;
  db.collection("ah.req").onSnapshot(snap => {
    const m = {}; snap.docs.forEach(d => { if (d.exists) m[d.id] = d.data(); });
    const before = REQ; REQ = m;
    Object.entries(m).forEach(([id, q]) => { const o = before[id]; if (o && o.status === "요청" && q.status !== "요청") toast(q.status === "적용" ? `적용됨 — ${q.name} ${REQ_WORD[q.kind]} ${reqFmt(q.kind, q.to)}` : `못 바꿈 — ${q.name}: ${q.error || ""}`); });
    render();
  }, () => {});
}
/* 요청 보내기 — 한 줄 확인 뒤에만 */
function sendReq(q){
  if (!reqDb) { toast("로그인하지 않아 바꿀 수 없어요."); return; }
  const line = `${q.name} — ${REQ_WORD[q.kind]} ${q.from != null ? reqFmt(q.kind, q.from) + " → " : ""}${reqFmt(q.kind, q.to)}`;
  if (!window.confirm(`${line}\n\n네이버 광고에 적용할까요? (맥이 켜져 있으면 1분 안에 적용돼요)`)) return;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const body = { kind: q.kind, type: q.type, id: q.id, name: q.name, brand: q.brand, to: q.to, from: q.from ?? null, why: q.why || "앱 「조율」에서", status: "요청", at: new Date().toISOString() };
  REQ[id] = body; render();
  reqDb.doc("ah.req/" + id).set(body).then(() => toast("요청했어요 — 맥이 적용하면 알려 드려요."), () => { delete REQ[id]; render(); toast("요청을 못 보냈어요. 연결을 확인해 주세요."); });
}
/* 조작 버튼 — data-rq 에 요청 번호를 두고 RQ 표에서 꺼낸다 (긴 글을 속성에 넣지 않게) */
const RQ = [];
const rqBtn = (q, label, cls = "") => `<button type="button" class="btn sm ${cls}" data-rq="${RQ.push(q) - 1}"${reqOpen(q.type, q.id).some(r => r.kind === q.kind) ? " disabled" : ""}>${esc(label)}</button>`;
const pendTag = (type, id) => { const L = reqOpen(type, id); return L.length ? `<span class="pill prep">적용 기다림 · ${L.map(q => REQ_WORD[q.kind] + " " + reqFmt(q.kind, q.to)).join(", ")}</span>` : ""; };
/* 입찰 조작 한 묶음: −10 · 입력 · +10 · 켜기/끄기 */
function bidCtl(type, o, b, cur){
  const L = LIM(), step = L.bidStep || 10, cap = maxCpc(b), lo = L.bidMin || 70;
  const base = { kind: "bid", type, id: o.id, name: o.kw || o.name, brand: b.id, from: cur };
  return `<span class="ctl">${rqBtn({ ...base, to: Math.max(lo, cur - step) }, `−${step}`, "")}<input class="bidin" type="number" inputmode="numeric" min="${lo}" ${cap ? `max="${cap}"` : ""} step="${step}" value="${cur}" aria-label="${esc(o.kw || o.name)} 입찰가" data-bidin="${RQ.length}">${rqBtn({ ...base, to: cur }, "적용", "")}${rqBtn({ ...base, to: cap ? Math.min(cap, cur + step) : cur + step }, `+${step}`, "")}</span>`;
}
const onBtn = (type, o, b) => rqBtn({ kind: "onoff", type, id: o.id, name: o.kw || o.name, brand: b.id, from: !!o.on, to: !o.on }, o.on ? "끄기" : "켜기", o.on ? "" : "ok");
