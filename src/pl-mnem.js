/* ───────── 매개 탭 — 매개법으로 외우는 단어 (palace.html 이 끼운다 · 2026-11-28 체화 단어장 「발음매개」에서 옮김) ─────────
   단어 = 볼트 「영어 단어장」 표 (vo.data/main foreign 중 분야가 「… 단어」). 소리 고리 · 그림 (매개) · 단계 · 다음 복습이 그 표에서 온다.
   1. 「🔤 발음매개 만들기」 → cmd {from: "palace", kind: "mnemonic", params} → 맥 Brainy 가 볼트 「외국어 암기 안내」 「발음매개 만드는 법」대로
      초안을 그 cmd 의 drafts 에 적는다 (볼트 .claude/routines/cmd.md).
   2. 초안을 「이걸로 넣기」·고쳐서·직접 써서 넣으면 progress/<id>.mnem.pending = {hook, pic} 만 남긴다
      → 맥 동기화(app_data.py 발음매개 되쓰기)가 볼트 표의 소리 고리·그림 칸에 넣고 mnem.done 으로 닫는다.
   3. 「🎨 GPT로 그리기」 → pl.gen {target: "word"} → 맥이 ChatGPT 계정 Codex 로 그려 볼트 「매개 그림/<단어>.jpg」 · 직접 올리기는 pl.up {kind: "w"}
   암기 사진으로 들어온 단어는 그 사진 cmd 의 mnem[단어] 에 초안이 같이 온다. 단어·매개 글은 코드에 넣지 않는다. */
const MN = { edit: null, draft: {} };
const WQ = [["all", "전체"], ["due", "오늘 복습"], ["nohook", "매개 없음"], ["nopic", "그림 없음"]];
const words = () => FOREIGN.filter(t => /단어$/.test(t.cat || "") && t.id);
const wKey = t => "w/" + String(t.term || "").trim();
const openSt = c => /보내는 중|맥 대기|처리 중/.test(c?.status || "");
const mnCmd = id => CMDS.find(c => c.kind === "mnemonic" && c.params?.id === id) || null;
const SIM = { "상": "ok", "중": "gold", "하": "" };
function mnDrafts(t){
  const a = mnCmd(t.id), b = CMDS.find(c => c.kind === "capture" && c.status === "끝" && c.mnem && Array.isArray(c.mnem[t.term]));
  const ok = l => (Array.isArray(l) ? l : []).filter(d => d && d.hook);
  if (a && (!b || String(a.createdAt) > String(b.createdAt))) return a.status === "끝" ? ok(a.drafts) : [];
  return b ? ok(b.mnem[t.term]) : [];
}

function mnemHtml(t){
  const c = mnCmd(t.id), m = prog[t.id]?.mnem || {}, busy = openSt(c), drafts = mnDrafts(t);
  let st = "";
  if (m.pending) st = `<p class="note">고른 매개 「${esc(m.pending.hook)}」를 볼트 단어장 표에 넣는 중이에요 — 맥이 켜져 있으면 곧 들어가요.</p>`;
  else if (m.err) st = `<p class="note">${esc(m.err)}</p>`;
  else if (m.done && m.done.hook === t.hook) st = `<p class="small muted">✓ 볼트 표에 넣었어요 · ${esc(String(m.done.at || "").slice(0, 10))}</p>`;
  const cmdLine = !c ? "" : busy ? `<p class="small muted" role="status">맥 Brainy가 초안을 만드는 중이에요 (${ago(c.sentAt || c.createdAt)} 보냄). 맥이 꺼져 있으면 켜질 때 만들어요.</p>`
    : c.status === "멈춤" ? `<p class="note">초안을 못 만들었어요 — ${esc(String(c.result || "").split("\n")[0])}</p>`
    : c.status === "못 보냄" ? `<p class="note">${esc(c.result || "못 보냈어요")}</p>`
    : !drafts.length ? `<p class="small muted">${esc(String(c.result || "초안이 없어요").split("\n")[0])}</p>` : "";
  const edit = MN.edit === t.id ? `<div class="stack" style="gap:8px">
      <label class="small muted">소리 고리 (한국어로 들리는 말)<input class="pl-in" id="mnH" maxlength="80" value="${esc(MN.draft.hook || "")}" placeholder="원 발음을 한국어로 들리는 말로"></label>
      <label class="small muted">그림 (매개어와 뜻을 묶은 과장된 장면)<textarea class="pl-in" id="mnP" maxlength="200" rows="2" placeholder="소리 고리와 뜻이 한 장면에 — 크게, 움직이게, 웃기게">${esc(MN.draft.pic || "")}</textarea></label>
      <div class="btns"><button class="btn gold" data-mn="save" data-id="${t.id}">이걸로 볼트에 넣기</button><button class="btn ghost" data-mn="cancel">닫기</button></div></div>` : "";
  return `<div class="stack" style="gap:10px">
    ${st}${cmdLine}
    ${drafts.length ? `<div class="stack" style="gap:8px">${drafts.map((d, k) => `<div class="mn-d">
        <div class="meta"><b class="mn-h">${esc(d.hook)}</b>${d.sim ? `<span class="pill ${SIM[d.sim] || ""}">유사도 ${esc(d.sim)}</span>` : ""}</div>
        ${d.how ? `<p class="small muted">${esc(d.how)}</p>` : ""}${d.pic ? `<p class="small">${esc(d.pic)}</p>` : ""}${d.reps ? `<p class="small muted">반복 · ${esc(d.reps)}</p>` : ""}
        <div class="btns"><button class="btn gold sm" data-mn="pick" data-id="${t.id}" data-k="${k}" ${m.pending ? "disabled" : ""}>이걸로 넣기</button><button class="btn ghost sm" data-mn="fix" data-id="${t.id}" data-k="${k}">고쳐서 넣기</button></div>
      </div>`).join("")}</div>` : ""}
    ${edit}
    <div class="btns">
      <button class="btn ${drafts.length || t.hook ? "ghost" : "gold"}" data-mn="ask" data-id="${t.id}" ${busy || !canWrite() ? "disabled" : ""}>${busy ? "초안 만드는 중…" : drafts.length || t.hook ? "🔤 발음매개 다시 만들기" : "🔤 발음매개 만들기"}</button>
      ${MN.edit === t.id ? "" : `<button class="btn ghost" data-mn="own" data-id="${t.id}">직접 쓰기</button>`}
    </div>
  </div>`;
}

function wordHtml(t){
  const open = S.word === t.id, k = wKey(t), g = genOf(k), u = imgOf(k);
  return `<div class="wd" id="w-${esc(t.id)}">
    <button class="wd-h" data-wd="${esc(t.id)}" aria-expanded="${open}"><span><b>${esc(t.term)}</b> <span class="small muted">${esc(t.def)}</span></span>
      <span class="small mono muted">${isDue(t) ? `<span class="pill warn">오늘 복습</span>` : esc(t.due || "")}</span></button>
    ${t.hook ? `<p><span class="hook">${esc(t.hook)}</span>${t.pic ? ` <span class="small">— ${esc(t.pic)}</span>` : ""}</p>` : `<p class="small muted">아직 매개가 없어요.</p>`}
    ${open ? `<div class="stack">
      <p class="small muted">뜻 → 소리 고리 → 그림 → ${esc(t.cat.replace(/ ?단어$/, ""))} 발음 · 단계 ${esc(t.stage || "—")}${t.rec ? " · " + esc(t.rec) : ""}</p>
      ${picHtml(k, "scene", t.hook ? "매개 그림이 아직 없어요" : "매개를 먼저 정하면 그 장면을 그릴 수 있어요", "매개")}
      ${genLine(k)}
      <div class="btns"><button class="btn primary" data-mn="gen" data-id="${t.id}" ${genBusy(g) || !t.hook || !canWrite() ? "disabled" : ""}>${genBusy(g) ? "그리는 중…" : u ? "🎨 GPT로 다시 그리기" : "🎨 GPT로 매개 그리기"}</button>
        <label class="btn ghost${canWrite() ? "" : " off"}" for="upW">🖼 내 그림·사진 넣기</label></div>
      <input type="file" id="upW" accept="image/*" hidden>
      ${mnemHtml(t)}
    </div>` : ""}
  </div>`;
}

function renderWords(){
  const all = words();
  if (!all.length) return `<section class="card"><p class="empty">${FOREIGN.length || mode !== "loading" ? "매개법 단어가 아직 없어요.<br>오늘 탭 「📷 암기 사진·PDF」로 V 표시한 단어를 넣으면 여기에 떠요." : "단어를 불러오는 중이에요…"}</p></section>`;
  const test = { all: () => true, due: isDue, nohook: t => !t.hook, nopic: t => t.hook && !imgOf(wKey(t)) };
  const list = all.filter(test[S.wq] || test.all).sort((a, b) => (isDue(b) - isDue(a)) || String(b.at || "").localeCompare(String(a.at || "")));
  return `<section class="card stack">
    <div class="meta"><h2>매개법 단어 ${all.length}</h2><span class="small muted">볼트 「영어 단어장」</span></div>
    <div class="chips">${WQ.map(([k, n]) => `<button class="chip${S.wq === k ? " on" : ""}" data-wq="${k}">${n}<span>${all.filter(test[k]).length}</span></button>`).join("")}</div>
    ${list.length ? `<div>${list.map(wordHtml).join("")}</div>` : `<p class="small muted">이 칸에 맞는 단어가 없어요.</p>`}
    <p class="small muted">복습 기록(맞음·틀림)은 /memory-check로 해요. 같은 단어를 두 번 틀리면 더 센 매개로 바꿔요.</p>
  </section>`;
}

function mnAsk(id){
  const t = words().find(x => x.id === id); if (!t || !canWrite() || openSt(mnCmd(id))) return;
  const cid = "c" + Date.now().toString(36), at = nowIso();
  const data = { text: "🔤 기억의 궁전 — 발음매개 초안: " + t.term + " (" + t.def + ")", from: "palace", app: "palace", kind: "mnemonic",
    params: { id: t.id, term: t.term, def: t.def, cat: t.cat, hook: t.hook || "", pic: t.pic || "" }, createdAt: at, sentAt: at, status: "보내는 중", result: "" };
  CMDS = [{ id: cid, ...data }, ...CMDS];
  db.doc("cmd/" + cid).set(data).catch(() => { const c = CMDS.find(x => x.id === cid); if (c) { c.status = "못 보냄"; c.result = "못 보냈어요 — 인터넷을 확인하고 다시 눌러 주세요"; } render(); });
  render(); toast("맥에 보냈어요 — 「" + t.term + "」 발음매개 초안을 만들어요");
}
function mnPut(id, hook, pic, how){
  hook = String(hook || "").trim().slice(0, 80); pic = String(pic || "").trim().slice(0, 200);
  if (!hook) { toast("소리 고리를 적어 주세요"); return false; }
  if (!canWrite()) { toast("기록 저장소에 연결된 뒤 넣을 수 있어요"); return false; }
  const mnem = { ...(prog[id]?.mnem || {}), pending: { hook, pic, how: how || "", at: nowIso() }, err: null };
  prog = { ...prog, [id]: { ...(prog[id] || {}), mnem } };
  db.doc("progress/" + id).update({ mnem }).catch(() => toast("넣지 못했어요 — 인터넷을 확인해 주세요"));
  toast("「" + hook + "」를 볼트 단어장에 넣어요"); render();
  return true;
}
document.addEventListener("click", e => {
  const w = e.target.closest("[data-wd]");
  if (w) { S.word = S.word === w.dataset.wd ? null : w.dataset.wd; MN.edit = null; render(); return; }
  const q = e.target.closest("[data-wq]"); if (q && view() === "words") { S.wq = q.dataset.wq; keep(); render(); return; }
  const b = e.target.closest("[data-mn]"); if (!b) return;
  const a = b.dataset.mn, id = b.dataset.id, t = words().find(x => x.id === id), d = t ? mnDrafts(t)[+b.dataset.k] : null;
  if (a === "ask") { mnAsk(id); return; }
  if (a === "pick" && d) { mnPut(id, d.hook, d.pic, d.how); return; }
  if (a === "fix" || a === "own") { MN.edit = id; MN.draft = a === "fix" && d ? { hook: d.hook, pic: d.pic } : { hook: t?.hook || "", pic: t?.pic || "" }; render(); document.getElementById("mnH")?.focus(); return; }
  if (a === "cancel") { MN.edit = null; document.activeElement?.blur?.(); render(); return; }
  if (a === "save") { const h = document.getElementById("mnH")?.value, p = document.getElementById("mnP")?.value; document.activeElement?.blur?.(); if (mnPut(id, h, p, "동욱이 고침")) { MN.edit = null; render(); } return; }
  if (a === "gen" && t) askGen({ target: "word", key: wKey(t), term: t.term, def: t.def, hook: t.hook || "", pic: t.pic || "" });
});
document.addEventListener("change", e => {
  if (e.target?.id !== "upW") return;
  const f = e.target.files?.[0], t = words().find(x => x.id === S.word); e.target.value = ""; if (!f || !t) return;
  upPhoto(f, { kind: "w", term: t.term }, wKey(t));
});
