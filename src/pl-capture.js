/* ───────── 암기 사진·PDF (palace.html 이 끼운다 · 2026-11-28 체화 단어장에서 옮김 — 동욱 「사진으로 찍으면 자동으로 올라가게 · 영단어는 V표로 표시한 부분만」
   · 「한번에 넣을 수 있도록 앱에서도 pdf나 사진을 넣으면 그걸 인식해서 단어장 등과 회화로」) ─────────
   1. 「📷 사진·PDF 올리기」(한 번에 CAP_MAX 개) → 사진은 긴 변 2000px JPEG 로 줄여 vo.cap/<id> {status "올림", img, name, at},
      PDF 는 줄이지 않고 원본을 CAP_PART 글자씩 나눠 vo.cap/<묶음id>-<n> {status "올림", group, part, parts, b64, name, at} 로 보낸다 (db.send — 이 기기에 남기지 않음).
      맥 memcap.py 가 조각을 모아 PDF 로 되살린다.
   2. cmd 하나 {from: "palace", kind: "capture", params: {caps, via: "앱"}} — 맥 cmd_runner 가 Claude 를 깨운다
   3. 맥 Brainy(볼트 .claude/routines/cmd.md 「암기 사진」 · memcap.py)가 사진을 볼트 「외국어 암기/캡처/」로 꺼내고, V 표시한 영어 단어 · 회화 문장을 표에 넣고
      (문장은 궁전의 다음 빈 면에), 단어마다 발음매개 초안을 그 cmd 의 mnem 에 적는다 → 매개 탭 단어 카드에 초안이 뜬다 (pl-mnem.js)
   폰에서 볼트 「외국어 암기/캡처/」에 바로 넣은 사진도 맥 동기화(app_data.py _capture_watch)가 같은 cmd 를 만든다 — 아래 목록에 같이 뜬다. */
const CAP = { busy: false, msg: "", ok: true };
const CAP_MAX = 20, CAP_EDGE = 2000, CAP_PART = 900000, CAP_PDF_MB = 30;   // 한 번에 20개 · PDF 조각 약 0.9MB · PDF 한 개 30MB까지
const isPdf = f => f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
const isImg = f => /^image\//.test(f.type) || /\.(heic|jpe?g|png|webp)$/i.test(f.name || "");
function capB64(file){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, "")); r.onerror = () => rej({ code: "read" }); r.readAsDataURL(file); }); }
const capCmds = () => CMDS.filter(c => c.kind === "capture");
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
  const all = Array.from(files || []), pick = all.filter(f => isImg(f) || isPdf(f));
  const big = pick.filter(f => isPdf(f) && f.size > CAP_PDF_MB * 1048576), list = pick.filter(f => !big.includes(f)).slice(0, CAP_MAX);
  const skipped = all.length - list.length;
  if (CAP.busy) return;
  if (!list.length) { CAP.ok = false; CAP.msg = big.length ? `PDF는 ${CAP_PDF_MB}MB까지 올릴 수 있어요. 쪽을 나눠 올려 주세요.` : "사진(JPEG·PNG·HEIC)이나 PDF를 골라 주세요."; render(); return; }
  if (!canWrite() || !db.send) { CAP.ok = false; CAP.msg = "기록 저장소에 연결된 뒤 올릴 수 있어요. 새로고침해 주세요."; render(); return; }
  const nImg = list.filter(isImg).length, nPdf = list.length - nImg;
  const what = [nImg ? `사진 ${nImg}장` : "", nPdf ? `PDF ${nPdf}개` : ""].filter(Boolean).join(" · ");
  CAP.busy = true; CAP.ok = true; render();
  const at = nowIso(), base = Date.now().toString(36), caps = [];
  try {
    for (let i = 0; i < list.length; i++) {
      const f = list[i], name = String(f.name || "").slice(0, 80), id = "k" + base + i;
      CAP.msg = `${what} 보내는 중 — ${i + 1}/${list.length}${isPdf(f) ? ` · ${name}` : ""}`; render();
      if (isPdf(f)) {
        const b = await capB64(f), parts = Math.max(1, Math.ceil(b.length / CAP_PART));
        for (let k = 0; k < parts; k++) {
          if (parts > 3) { CAP.msg = `${what} 보내는 중 — ${i + 1}/${list.length} · ${name} ${Math.round((k + 1) / parts * 100)}%`; render(); }
          await db.send("vo.cap/" + id + "-" + k, { status: "올림", kind: "pdf", group: id, part: k, parts, b64: b.slice(k * CAP_PART, (k + 1) * CAP_PART), name, size: f.size, at });
        }
      } else {
        const img = await capShrink(f);
        if (!img) throw { code: "image", name };
        await db.send("vo.cap/" + id, { status: "올림", img, name, at });
      }
      caps.push(id);
    }
    const data = { text: `🏛 기억의 궁전 — 암기 ${what} 넣기`, from: "palace", app: "palace", kind: "capture",
      params: { caps, via: "앱", pdf: nPdf, img: nImg }, createdAt: at, sentAt: at, status: "보내는 중", result: "" };
    await db.doc("cmd/c" + base).set(data);
    CAP.msg = `${what}를 맥에 보냈어요 — 맥이 켜져 있으면 V 표시한 단어·회화 문장이 들어와요 (PDF는 쪽이 많으면 몇 번에 나눠 넣어요).`
      + (skipped ? ` 고른 것 중 ${skipped}개는 빼고 보냈어요(사진·PDF가 아니거나 ${CAP_MAX}개를 넘거나 PDF ${CAP_PDF_MB}MB 초과).` : "");
  } catch (e) {
    CAP.ok = false;
    CAP.msg = e?.code === "image" ? `「${e.name}」를 읽지 못했어요. JPEG·PNG로 바꿔 올려 주세요.` : e?.code === "read" ? "파일을 읽지 못했어요. 다시 골라 주세요."
      : "보내지 못했어요 — 인터넷을 확인하고 다시 올려 주세요." + (caps.length ? ` (${caps.length}개는 이미 보내졌어요 — 맥이 다음에 같이 넣어요)` : "");
    if (caps.length) db.doc("cmd/c" + base).set({ text: `🏛 기억의 궁전 — 암기 ${caps.length}개 넣기 (보내다 끊김)`, from: "palace", app: "palace", kind: "capture",
      params: { caps, via: "앱" }, createdAt: at, sentAt: at, status: "보내는 중", result: "" }).catch(() => {});
  }
  CAP.busy = false; render();
}
function capRow(c){
  const open = openSt(c), added = c.added || {}, words = Array.isArray(added.words) ? added.words : [], sents = Array.isArray(added.sents) ? added.sents : [];
  const head = `<div class="meta"><span class="small mono muted">${esc(capWhen(c.createdAt))} · ${c.params?.via === "폴더" ? "볼트 폴더에서" : "앱에서 올림"}</span>
    <span class="pill ${c.status === "끝" ? "ok" : c.status === "멈춤" ? "warn" : "acc"}">${open ? "맥이 넣는 중" : esc(c.status || "")}</span></div>`;
  if (open) return `<div class="cap-r">${head}<p class="small muted">${ago(c.sentAt || c.createdAt)} 보냄 — 맥이 꺼져 있으면 켜질 때 넣어요.</p></div>`;
  const byTerm = w => words().find(t => t.term === w);
  return `<div class="cap-r">${head}
    ${c.result ? `<p class="small">${esc(String(c.result).split("\n").slice(0, 2).join(" "))}</p>` : ""}
    ${words.length ? `<div class="chips">${words.map(w => { const t = byTerm(w); return t ? `<button class="chip" data-wopen="${t.id}">${esc(w)}</button>` : `<span class="chip" style="cursor:default;border-style:dashed" title="단어장에 올라오는 중">${esc(w)}</span>`; }).join("")}</div>` : ""}
    ${sents.length ? `<p class="small muted">${sents.map(esc).join("<br>")}</p>` : ""}
    ${c.status === "멈춤" ? `<button class="btn ghost" data-cap="retry" data-id="${esc(c.id)}">맥에 다시 보내기</button>` : ""}</div>`;
}
function capHtml(){
  /* 맥이 넣는 중인 것 + 가장 최근 결과 하나만 — 쌓여도 「오늘 할 일」을 밀어내지 않게 (검증 F14) */
  const all = capCmds(), last = all.find(c => !openSt(c)), cs = all.filter(openSt).concat(last ? [last] : []).slice(0, 3);
  return `<section class="card stack cap">
    <div class="meta"><h2 style="margin:0">📷 암기 사진·PDF</h2><span class="small muted">한 번에 ${CAP_MAX}개 · PDF ${CAP_PDF_MB}MB까지</span></div>
    <p class="small muted">교재 사진이나 PDF를 여러 개 한 번에 올리면 맥 Brainy가 알아보고 넣어요. <b>영어 단어는 V 표시한 것만</b> 단어장에, 회화는 V 표시한 줄(없으면 그날 대표 문장)을 궁전의 다음 빈 면에. 단어마다 발음매개 초안이 같이 와요 — 매개 탭에서 골라요.</p>
    <label class="btn primary cap-b${CAP.busy || !canWrite() ? " off" : ""}" for="capFile">${CAP.busy ? "보내는 중…" : "📷 사진·PDF 올리기"}</label>
    <input type="file" id="capFile" accept="image/*,application/pdf,.pdf" multiple hidden ${CAP.busy || !canWrite() ? "disabled" : ""}>
    ${CAP.msg ? `<p class="${CAP.ok ? "small" : "note"}" role="status">${esc(CAP.msg)}</p>` : ""}
    ${cs.length ? `<div class="stack" style="gap:8px">${cs.map(capRow).join("")}</div>` : ""}
    <p class="small muted">볼트의 외국어 암기 「캡처」 폴더에 사진·PDF를 바로 넣어도 같은 길로 들어와요.</p>
  </section>`;
}
document.addEventListener("change", e => { if (e.target?.id === "capFile") { const f = e.target.files; capUpload(f); e.target.value = ""; } });
document.addEventListener("click", e => {
  const w = e.target.closest("[data-wopen]"); if (w) { S.word = w.dataset.wopen; location.hash = "words"; setTimeout(() => document.getElementById("w-" + S.word)?.scrollIntoView({ block: "center" }), 80); return; }
  const b = e.target.closest("[data-cap]"); if (!b) return;
  if (b.dataset.cap === "retry" && canWrite()) db.doc("cmd/" + b.dataset.id).update({ status: "보내는 중", result: "", sentAt: nowIso() }).catch(() => { CAP.ok = false; CAP.msg = "다시 보내지 못했어요 — 인터넷을 확인해 주세요."; render(); });
});
