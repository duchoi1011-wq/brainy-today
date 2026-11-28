/* ───────── 발음매개 (2026-11-28 동욱 「내 단어장에서 매개법이 진행될 수 있게 버튼 — 발음 매개법 위주로」) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   외국어 단어(분야 이름이 「… 단어」)를 펼치면 「🔤 발음매개 만들기」가 있다.
   1. 누르면 cmd 문서 하나({from: "vocab", kind: "mnemonic", params})를 맥에 보낸다 — 맥의 cmd_runner 가 Claude 를 깨우고,
      Claude 는 볼트 「외국어 암기 안내」 「발음매개 만드는 법」(오리쌤 07강) 순서로 초안을 그 cmd 문서의 drafts 에 적는다 (볼트 .claude/routines/cmd.md).
   2. 동욱이 초안 하나를 「이걸로 넣기」 하거나 고쳐서·직접 써서 넣으면 progress/<id>.mnem.pending = {hook, pic} 만 남긴다.
   3. 맥 동기화(app_data.py 발음매개 되쓰기)가 볼트 「영어 단어장」 표의 소리 고리·그림 칸에 넣고 mnem.done 으로 닫는다 — 정본은 볼트 표.
   단어·매개 글은 코드에 넣지 않는다. */
let MN_CMDS = [];                  // 단어장이 보낸 발음매개 cmd (최근 것 먼저)
const MN = { edit: null, draft: {} };   // edit = 「고쳐서·직접 써서」 칸이 열린 단어 id · draft = 그 칸의 처음 값
const isMnWord = t => !!t && t.dom === "외국어 단어장" && /단어$/.test(t.cat || "");
const mnOpenSt = c => /보내는 중|맥 대기|처리 중/.test(c?.status || "");
const mnCmd = id => MN_CMDS.find(c => c.kind === "mnemonic" && c.params?.id === id) || null;
const SIM = { "상": "p4", "중": "p3", "하": "p1" };
function mnAge(iso){ const m = Math.round((Date.now() - Date.parse(iso || "")) / 60000); return !isFinite(m) ? "" : m < 1 ? "방금" : m < 60 ? m + "분 전" : Math.round(m / 60) + "시간 전"; }

function mnemHtml(t){
  if (!isMnWord(t)) return "";
  const c = mnCmd(t.id), m = prog[t.id]?.mnem || {}, busy = mnOpenSt(c);
  const drafts = c && c.status === "끝" && Array.isArray(c.drafts) ? c.drafts.filter(d => d && d.hook) : [];
  let st = "";
  if (m.pending) st = `<p class="note">고른 매개 「${esc(m.pending.hook)}」를 볼트 단어장 표에 넣는 중이에요 — 맥이 켜져 있으면 몇 초 안에 들어가요.</p>`;
  else if (m.err) st = `<p class="note">${esc(m.err)}</p>`;
  else if (m.done && m.done.hook === t.hook) st = `<p class="small muted">✓ 볼트 표에 넣었어요 · ${esc(String(m.done.at || "").slice(0, 10))}</p>`;
  const cmdLine = !c ? "" : busy ? `<p class="small muted" role="status">맥 Brainy가 초안을 만드는 중이에요 (${mnAge(c.sentAt || c.createdAt)} 보냄). 맥이 꺼져 있으면 켜질 때 만들어요.</p>`
    : c.status === "멈춤" ? `<p class="note">초안을 못 만들었어요 — ${esc(String(c.result || "").split("\n")[0])}</p>`
    : c.status === "못 보냄" ? `<p class="note">${esc(c.result || "못 보냈어요")}</p>`
    : !drafts.length ? `<p class="small muted">${esc(String(c.result || "초안이 없어요").split("\n")[0])}</p>` : "";
  const edit = MN.edit === t.id ? `<div class="mn-ed stack">
      <label class="small muted">소리 고리 (한국어로 들리는 말)<input class="mn-in" id="mnH" maxlength="80" value="${esc(MN.draft.hook || "")}" placeholder="예: 올라이언"></label>
      <label class="small muted">그림 (매개어와 뜻을 묶은 과장된 장면)<textarea class="mn-in" id="mnP" maxlength="200" rows="2" placeholder="예: 사자들이 올라와 손잡고 동맹 맺는 그림">${esc(MN.draft.pic || "")}</textarea></label>
      <div class="btns"><button class="btn primary" data-mn="save" data-id="${t.id}">이걸로 볼트에 넣기</button><button class="btn ghost" data-mn="cancel">닫기</button></div></div>` : "";
  return `<div class="mn stack">
    <div class="meta"><span class="lbl" style="margin:0">발음매개</span><span class="small muted">뜻 → 소리 고리 → 그림 → ${esc(t.cat.replace(/ ?단어$/, ""))} 발음</span></div>
    ${t.hook ? `<p>소리 고리 <b>${esc(t.hook)}</b>${t.pic ? `<br><span class="small">${esc(t.pic)}</span>` : ""}</p>` : `<p class="small muted">아직 매개가 없어요.</p>`}
    ${st}${cmdLine}
    ${drafts.length ? `<div class="mn-dr">${drafts.map((d, k) => `<div class="mn-d">
        <div class="meta"><b class="mn-h">${esc(d.hook)}</b>${d.sim ? `<span class="pill ${SIM[d.sim] || ""}">유사도 ${esc(d.sim)}</span>` : ""}</div>
        ${d.how ? `<p class="small muted">${esc(d.how)}</p>` : ""}
        ${d.pic ? `<p class="small">${esc(d.pic)}</p>` : ""}
        ${d.reps ? `<p class="small muted">반복 · ${esc(d.reps)}</p>` : ""}
        <div class="btns"><button class="btn primary" data-mn="pick" data-id="${t.id}" data-k="${k}" ${m.pending ? "disabled" : ""}>이걸로 넣기</button><button class="btn ghost" data-mn="fix" data-id="${t.id}" data-k="${k}">고쳐서 넣기</button></div>
      </div>`).join("")}</div>` : ""}
    ${edit}
    <div class="btns">
      <button class="btn ${drafts.length || t.hook ? "ghost" : "primary"}" data-mn="ask" data-id="${t.id}" ${busy || mode !== "db" ? "disabled" : ""}>${busy ? "초안 만드는 중…" : drafts.length || t.hook ? "🔤 발음매개 다시 만들기" : "🔤 발음매개 만들기"}</button>
      ${MN.edit === t.id ? "" : `<button class="btn ghost" data-mn="own" data-id="${t.id}">직접 쓰기</button>`}
    </div>
    ${mode !== "db" ? `<p class="small muted">기록 저장소에 연결되면 맥에 보낼 수 있어요.</p>` : ""}
  </div>`;
}

function mnAsk(id){
  const t = BYID[id]; if (!t || !db || mode !== "db" || mnOpenSt(mnCmd(id))) return;
  const cid = "c" + Date.now().toString(36), at = nowIso();
  const data = { text: "🔤 체화 단어장 — 발음매개 초안: " + t.term + " (" + t.def + ")", from: "vocab", app: "vocab", kind: "mnemonic",
    params: { id: t.id, term: t.term, def: t.def, cat: t.cat, hook: t.hook || "", pic: t.pic || "" }, createdAt: at, sentAt: at, status: "보내는 중", result: "" };
  MN_CMDS = [{ id: cid, ...data }, ...MN_CMDS];
  db.doc("cmd/" + cid).set(data).catch(() => { const c = MN_CMDS.find(x => x.id === cid); if (c) { c.status = "못 보냄"; c.result = "못 보냈어요 — 인터넷을 확인하고 다시 눌러 주세요"; } render(); });
  render();
  toast("맥에 보냈어요 — 「" + t.term + "」 발음매개 초안을 만들어요");
}
function mnPut(id, hook, pic, how){
  hook = String(hook || "").trim().slice(0, 80); pic = String(pic || "").trim().slice(0, 200);
  if (!hook) { toast("소리 고리를 적어 주세요"); return false; }
  const cur = prog[id]?.mnem || {};
  save(id, { mnem: { ...cur, pending: { hook, pic, how: how || "", at: nowIso() }, err: null } }, "발음매개 고름");
  toast("「" + hook + "」를 볼트 단어장에 넣어요");
  return true;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-mn]"); if (!b) return;
  const a = b.dataset.mn, id = b.dataset.id, c = id ? mnCmd(id) : null, d = c?.drafts?.[+b.dataset.k];
  if (a === "ask") { mnAsk(id); return; }
  if (a === "pick" && d) { mnPut(id, d.hook, d.pic, d.how); return; }
  if (a === "fix" || a === "own") { MN.edit = id; MN.draft = a === "fix" && d ? { hook: d.hook, pic: d.pic } : { hook: "", pic: "" }; render(); document.getElementById("mnH")?.focus(); return; }
  if (a === "cancel") { MN.edit = null; document.activeElement?.blur?.(); render(); return; }
  if (a === "save") { const h = document.getElementById("mnH")?.value, p = document.getElementById("mnP")?.value; document.activeElement?.blur?.(); if (mnPut(id, h, p, "동욱이 고침")) { MN.edit = null; render(); } }
});
