/* ───────── 암기 사진 (2026-11-28 동욱 「단어장의 단어들을 넣거나 영어 회화를 사진으로 찍으면 자동으로 올라가게 · 영단어는 V표로 표시한 부분만」) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   1. 「📷 암기 사진 올리기」 → 사진마다 긴 변 2000px JPEG 로 줄여 vo.cap/<id> {status "올림", img, name, at} 로 보낸다 (db.send — 이 기기에 남기지 않음)
   2. cmd 하나 {from: "vocab", kind: "capture", params: {caps, via: "앱"}} — 맥 cmd_runner 가 Claude 를 깨운다
   3. 맥 Brainy(볼트 .claude/routines/cmd.md 「암기 사진」 · memcap.py)가 사진을 볼트 「외국어 암기/캡처/」로 꺼내고, V 표시한 영어 단어 · 회화 문장을 표에 넣고,
      단어마다 발음매개 초안을 그 cmd 의 mnem 에 적는다 → 맥 동기화가 단어장에 올리면 단어 카드에 초안이 뜬다 (vocab-mnem.js)
   폰에서 볼트 「외국어 암기/캡처/」에 바로 넣은 사진도 맥 동기화(app_data.py _capture_watch)가 같은 cmd 를 만든다 — 아래 목록에 같이 뜬다. */
const CAP = { busy: false, msg: "", ok: true };
const CAP_MAX = 5, CAP_EDGE = 2000;
const capCmds = () => MN_CMDS.filter(c => c.kind === "capture");
const capWhen = iso => { const t = Date.parse(iso || ""); return isFinite(t) ? new Date(t + 9 * 3600e3).toISOString().slice(5, 16).replace("T", " ") : ""; };   // 한국 시간 MM-DD HH:MM
function capShrink(file){
  return new Promise(res => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, CAP_EDGE / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}
async function capUpload(files){
  const list = Array.from(files || []).filter(f => /^image\//.test(f.type) || /\.(heic|jpe?g|png|webp)$/i.test(f.name)).slice(0, CAP_MAX);
  if (!list.length || CAP.busy) return;
  if (!db || mode !== "db" || !db.send) { CAP.ok = false; CAP.msg = "기록 저장소에 연결된 뒤 올릴 수 있어요. 새로고침해 주세요."; render(); return; }
  CAP.busy = true; CAP.ok = true; CAP.msg = `사진 ${list.length}장을 올리는 중이에요…`; render();
  try {
    const at = nowIso(), base = Date.now().toString(36), caps = [];
    for (let i = 0; i < list.length; i++) {
      const img = await capShrink(list[i]);
      if (!img) throw { code: "image" };
      const id = "k" + base + i;
      await db.send("vo.cap/" + id, { status: "올림", img, name: String(list[i].name || "").slice(0, 80), at });
      caps.push(id);
    }
    const cid = "c" + base;
    const data = { text: `🔤 체화 단어장 — 암기 사진 ${caps.length}장 넣기`, from: "vocab", app: "vocab", kind: "capture",
      params: { caps, via: "앱" }, createdAt: at, sentAt: at, status: "보내는 중", result: "" };
    await db.doc("cmd/" + cid).set(data);
    CAP.msg = `사진 ${caps.length}장을 맥에 보냈어요 — 맥이 켜져 있으면 몇 분 안에 V 표시한 단어·문장이 들어와요.`;
  } catch (e) {
    CAP.ok = false;
    CAP.msg = e?.code === "image" ? "이 사진을 읽지 못했어요. 다른 사진(JPEG·PNG)으로 올려 주세요." : "사진을 보내지 못했어요 — 인터넷을 확인하고 다시 올려 주세요.";
  }
  CAP.busy = false; render();
}
function capRow(c){
  const open = mnOpenSt(c), added = c.added || {}, words = Array.isArray(added.words) ? added.words : [], sents = Array.isArray(added.sents) ? added.sents : [];
  const head = `<div class="meta"><span class="small mono muted">${esc(capWhen(c.createdAt))} · ${c.params?.via === "폴더" ? "볼트 폴더에서" : "앱에서 올림"}</span>
    <span class="pill ${c.status === "끝" ? "p4" : c.status === "멈춤" ? "" : "p3"}">${open ? "맥이 넣는 중" : esc(c.status || "")}</span></div>`;
  if (open) return `<div class="cap-r">${head}<p class="small muted">${mnAge(c.sentAt || c.createdAt)} 보냄 — 맥이 꺼져 있으면 켜질 때 넣어요.</p></div>`;
  const byTerm = w => ALL.find(t => t.dom === "외국어 단어장" && t.term === w);
  return `<div class="cap-r">${head}
    ${c.result ? `<p class="small">${esc(String(c.result).split("\n").slice(0, 2).join(" "))}</p>` : ""}
    ${words.length ? `<div class="chips">${words.map(w => { const t = byTerm(w); return t ? `<button class="chip" data-detail="${t.id}">${esc(w)}</button>` : `<span class="chip" style="cursor:default;border-style:dashed" title="단어장에 올라오는 중">${esc(w)}</span>`; }).join("")}</div>` : ""}
    ${sents.length ? `<p class="small muted">${sents.map(esc).join("<br>")}</p>` : ""}
    ${c.status === "멈춤" ? `<button class="btn ghost" data-cap="retry" data-id="${esc(c.id)}">맥에 다시 보내기</button>` : ""}</div>`;
}
function capHtml(){
  /* 맥이 넣는 중인 것 + 가장 최근 결과 하나만 — 쌓여도 「오늘 할 일」을 밀어내지 않게 (검증 F14) */
  const all = capCmds(), last = all.find(c => !mnOpenSt(c)), cs = all.filter(mnOpenSt).concat(last ? [last] : []).slice(0, 3);
  return `<section class="card stack cap">
    <div class="meta"><h2 style="margin:0">📷 암기 사진</h2><span class="small muted">한 번에 ${CAP_MAX}장</span></div>
    <p class="small muted">교재·단어 화면을 찍어 올리면 맥 Brainy가 넣어요. <b>영어 단어는 V 표시한 것만</b>, 회화는 V 표시한 줄(없으면 그날 대표 문장)을 다음 빈 면에. 단어마다 발음매개 초안이 같이 와요 — 단어 카드에서 골라요.</p>
    <label class="btn primary cap-b${CAP.busy || mode !== "db" ? " off" : ""}" for="capFile">${CAP.busy ? "올리는 중…" : "📷 암기 사진 올리기"}</label>
    <input type="file" id="capFile" accept="image/*" multiple hidden ${CAP.busy || mode !== "db" ? "disabled" : ""}>
    ${CAP.msg ? `<p class="${CAP.ok ? "small" : "note"}" role="status">${esc(CAP.msg)}</p>` : ""}
    ${cs.length ? `<div class="stack" style="gap:8px">${cs.map(capRow).join("")}</div>` : ""}
    <p class="small muted">폰에서는 볼트 「1_MyBrain/학습/외국어 암기/캡처」 폴더에 바로 저장해도 같은 길로 들어와요.</p>
  </section>`;
}
document.addEventListener("change", e => { if (e.target?.id === "capFile") { const f = e.target.files; capUpload(f); e.target.value = ""; } });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-cap]"); if (!b) return;
  if (b.dataset.cap === "retry" && db) db.doc("cmd/" + b.dataset.id).update({ status: "보내는 중", result: "", sentAt: nowIso() }).catch(() => { CAP.ok = false; CAP.msg = "다시 보내지 못했어요 — 인터넷을 확인해 주세요."; render(); });
});
