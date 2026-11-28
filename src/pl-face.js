/* ───────── 궁전 탭 — 장마다 면 10개 격자 · 면을 누르면 그 자리 (palace.html 이 끼운다) ─────────
   면 하나 = 장소 사진(내가 찍음) · 면 이름 · 장소 메모 → 궁전 노트 「N장」 표 (pl.edit face · pl.up f)
            놓인 문장 · 장면 글 → 회화장 표 「장면 이미지」 (pl.edit scene) · 장면 그림 → GPT 가 그림 (pl.gen scene) 또는 직접 올림 (pl.up s)
   장 이름 ✎ → 장 목록 표 (pl.edit chname) · 「+ 장 더하기」 → 다음 장 면 10개 (pl.edit addch)
   이전 면 · 다음 면으로 걷는 순서대로 이어 본다. */
const FE = { ch: null };   // 이름을 고치는 중인 장 번호

function tileHtml(p, s, d){
  const t = d.byFace[s.no]?.[0], u = imgOf(imgKey("f", p.name, s.no));
  const cls = (!t && !s.placed ? "e" : t && isDue(t) ? "d" : "s") + (u ? " ph-on" : "") + (S.face === s.no ? " on" : "");
  return `<button class="tile ${cls}" data-tile="${esc(s.no)}" aria-pressed="${S.face === s.no}" aria-label="${esc(s.no)}면 ${esc(s.name || "")} ${t || s.placed ? "문장 있음" : "빈 면"}${u ? " · 장소 사진 있음" : ""}">
    ${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : ""}${s.pending ? `<i class="dot" title="볼트에 넣는 중"></i>` : ""}
    <span class="mono">${esc(s.no)}</span><small>${esc(s.name || (t || s.placed ? "" : "빈 면"))}</small></button>`;
}

function faceHtml(p, s, d){
  const list = d.slots, i = list.findIndex(x => x.no === s.no), prev = list[i - 1], next = list[i + 1];
  const ts = d.byFace[s.no] || [], fk = imgKey("f", p.name, s.no), sk = imgKey("s", p.name, s.no);
  const chName = p.chapters.find(c => c.n === s.ch)?.name || "";
  const sents = ts.length ? ts.map(t => {
    const st = stOf(t), g = genOf(sk);
    return `<div class="stack" style="gap:10px">
      <span class="lbl" style="margin:0">이 자리의 문장</span>
      <p class="sent">${esc(t.term)}</p>
      <p class="small">${esc(t.def)}</p>
      <label class="small muted">장면 — 이 자리에서 문장이 벌어지는 모습 (크게·움직이게·웃기게)
        <textarea class="pl-in" id="scTx" maxlength="200" rows="3" placeholder="예: 접수대 직원이 거대한 확성기로 문장을 외치고, 내 명찰이 날아간다">${esc(t.pic || "")}</textarea></label>
      <div class="btns"><button class="btn ghost sm" data-fe="scene" data-term="${esc(t.term)}" data-cat="${esc(t.cat)}">장면 글 볼트에 넣기</button></div>
      ${picHtml(sk, "scene", "장면 그림이 아직 없어요", "장면")}
      ${genLine(sk)}
      <div class="btns">
        <button class="btn primary" data-fe="gen" data-term="${esc(t.term)}" ${genBusy(g) || !canWrite() ? "disabled" : ""}>${genBusy(g) ? "그리는 중…" : imgOf(sk) ? "🎨 GPT로 다시 그리기" : "🎨 GPT로 장면 그리기"}</button>
        <label class="btn ghost${canWrite() ? "" : " off"}" for="upS">🖼 내 그림·사진 넣기</label>
      </div>
      <p class="small mono muted">복습 단계 ${esc(t.stage || "—")} · 다음 복습 ${esc(t.due || "—")}${t.src ? " · " + esc(t.src) : ""}</p>
      <div class="stg" role="list" aria-label="오리쌤 스테이지">${STAGE.map(([n, nm]) => `<span role="listitem" class="${st >= +n ? "on" : ""}">${n} ${nm}</span>`).join("")}</div>
      ${t.meta ? `<p class="small"><span class="muted">메타반복 · </span>${esc(t.meta)}</p>` : ""}
    </div>`; }).join("") : `<div class="stack" style="gap:6px"><span class="lbl" style="margin:0">이 자리의 문장</span>
      ${s.placed ? `<p>${esc(s.placed)}</p><p class="small muted">궁전 노트에만 적혀 있고 회화장 표에는 아직 없어요.</p>` : `<p class="small muted">빈 면이에요. 오늘 탭 「📷 암기 사진·PDF」로 문장을 넣으면 다음 빈 면부터 놓여요.</p>`}</div>`;
  return `<div class="face" id="face">
    <div class="meta"><div><span class="mono muted small">${esc(s.ch)}장${chName ? " " + esc(chName) : ""} · ${i + 1}/${list.length}번째 자리</span><h3>${esc(s.no)}면${s.name ? " · " + esc(s.name) : ""}</h3></div><button class="btn ghost sm" data-fe="close">접기</button></div>
    ${picHtml(fk, "place", "장소 사진이 없어요 — 이 자리를 찍어 두면 걷기에서 순서대로 이어져요", "장소")}
    <label class="btn ghost${canWrite() ? "" : " off"}" for="upF">📷 ${imgOf(fk) ? "장소 사진 바꾸기" : "장소 사진 찍기·고르기"}</label>
    <div class="stack" style="gap:8px">
      <label class="small muted">면 이름 (이 자리를 부르는 짧은 이름)<input class="pl-in" id="fName" maxlength="40" value="${esc(s.name || "")}" placeholder="예: 접수대"></label>
      <label class="small muted">장소 메모 (거기 무엇이 있나 — 장면을 걸 갈고리)<textarea class="pl-in" id="fMemo" maxlength="200" rows="2" placeholder="예: 왼쪽에 큰 화분, 오른쪽에 번호표 기계">${esc(s.memo || "")}</textarea></label>
      <div class="btns"><button class="btn primary" data-fe="save" data-no="${esc(s.no)}">이 자리 볼트에 넣기</button></div>
      ${s.pending ? `<p class="small muted" role="status">볼트 궁전 노트에 넣는 중이에요 — 맥이 켜져 있으면 몇 초 안에 들어가요.</p>` : s.err ? `<p class="note">${esc(s.err)}</p>` : ""}
    </div>
    ${sents}
    <div class="btns">${prev ? `<button class="btn ghost" data-tile="${esc(prev.no)}">← ${esc(prev.no)}${prev.name ? " " + esc(prev.name) : ""}</button>` : ""}${next ? `<button class="btn ghost" data-tile="${esc(next.no)}">${esc(next.no)}${next.name ? " " + esc(next.name) : ""} →</button>` : ""}</div>
    <input type="file" id="upF" accept="image/*" hidden><input type="file" id="upS" accept="image/*" hidden>
  </div>`;
}

function renderPalace(){
  const p = curPal(); if (!p) return noPal();
  const d = palData(p), open = d.slots.find(s => s.no === S.face);
  const chs = p.chapters.map(c => {
    const slots = d.slots.filter(s => s.ch === c.n), fill = slots.filter(s => d.byFace[s.no] || s.placed).length;
    const pend = EDITS.filter(x => x.kind === "chname" && x.palace === p.name && +x.ch === c.n && x.status === "올림").pop();
    const name = pend ? pend.name : c.name;
    const head = FE.ch === c.n
      ? `<div class="chname"><span class="mono">${c.n}장</span><input class="pl-in" id="chIn" maxlength="40" value="${esc(name || "")}" placeholder="예: 주차장 · 입구 · 접수대" aria-label="${c.n}장 이름"><button class="btn primary sm" data-fe="chsave" data-ch="${c.n}">넣기</button><button class="btn ghost sm" data-fe="chcancel">닫기</button></div>`
      : `<div class="meta"><button class="btn ghost sm" data-fe="chedit" data-ch="${c.n}" style="font-size:16px;font-weight:700" aria-label="${c.n}장 이름 고치기">${c.n}장 · ${name ? esc(name) : `<span class="muted">이름 없음</span>`} ✎</button><span class="small mono muted">${pend ? "넣는 중 · " : ""}문장 ${fill}/${c.faces}면</span></div>`;
    return `<section class="card stack">${head}<div class="grid">${slots.map(s => tileHtml(p, s, d)).join("")}</div>${open && open.ch === c.n ? faceHtml(p, open, d) : ""}</section>`;
  }).join("");
  const goal = p.goal || d.slots.length, adding = EDITS.some(x => x.kind === "addch" && x.palace === p.name && x.status === "올림");
  const more = `<section class="card stack" style="border-style:dashed;background:transparent">
    <p class="small muted">${d.slots.length < goal ? `목표 ${goal}면까지 ${goal - d.slots.length}면 남았어요. ` : ""}걷는 순서 다음 자리가 생기면 장을 더해요 (면 10개).</p>
    <button class="btn ghost" data-fe="addch" ${adding || !canWrite() ? "disabled" : ""}>${adding ? "장을 더하는 중…" : `+ ${p.chapters.length + 1}장 더하기`}</button></section>`;
  const loose = d.loose.length ? `<section class="card stack"><h2>면 번호가 궁전에 없는 문장 ${d.loose.length}</h2><div class="list">${d.loose.map(t => `<div class="row" style="cursor:default"><div class="t"><b>${esc(t.term)}</b><span>면 「${esc(t.face || "비어 있음")}」 · ${esc(t.def)}</span></div></div>`).join("")}</div><p class="small muted">회화장 표의 면 칸을 「장-면」(예: 1-3)으로 고치거나 장을 더해요.</p></section>` : "";
  const legend = `<p class="small muted" style="padding:0 4px">칸: <span class="key s">문장 있음</span><span class="key d">오늘 복습</span><span class="key e">빈 면</span> · 사진을 찍은 자리는 사진이 칸에 깔려요 · 스테이지 1 궁전 결합 → 2 메타반복 → 3 3단 챌린지</p>`;
  return chs + more + loose + legend;
}

document.addEventListener("click", e => {
  const t = e.target.closest("[data-tile]");
  if (t) { S.face = S.face === t.dataset.tile && t.closest(".grid") ? null : t.dataset.tile; render(); if (S.face) setTimeout(() => document.getElementById("face")?.scrollIntoView({ block: "start", behavior: "smooth" }), 40); return; }
  const b = e.target.closest("[data-fe]"); if (!b) return;
  const a = b.dataset.fe, p = curPal(); if (!p) return;
  if (a === "close") { S.face = null; render(); return; }
  if (a === "chedit") { FE.ch = +b.dataset.ch; render(); document.getElementById("chIn")?.focus(); return; }
  if (a === "chcancel") { FE.ch = null; document.activeElement?.blur?.(); render(); return; }
  if (a === "chsave") { const v = document.getElementById("chIn")?.value.trim() || ""; document.activeElement?.blur?.(); if (sendEdit({ kind: "chname", palace: p.name, ch: +b.dataset.ch, name: v }, `${b.dataset.ch}장 이름을 볼트에 넣어요`)) FE.ch = null; render(); return; }
  if (a === "addch") { sendEdit({ kind: "addch", palace: p.name }, `${p.chapters.length + 1}장을 더해요`); return; }
  if (a === "save") {
    const name = document.getElementById("fName")?.value.trim() || "", memo = document.getElementById("fMemo")?.value.trim() || "";
    document.activeElement?.blur?.();
    sendEdit({ kind: "face", palace: p.name, no: b.dataset.no, name, memo }, `${b.dataset.no}면을 볼트 궁전 노트에 넣어요`); return;
  }
  if (a === "scene") {
    const scene = document.getElementById("scTx")?.value.trim() || ""; document.activeElement?.blur?.();
    sendEdit({ kind: "scene", cat: b.dataset.cat, term: b.dataset.term, scene }, "장면 글을 회화장 표에 넣어요"); return;
  }
  if (a === "gen") {
    const d = palData(p), s = d.slots.find(x => x.no === S.face), t = (d.byFace[S.face] || []).find(x => x.term === b.dataset.term); if (!s || !t) return;
    const scene = document.getElementById("scTx")?.value.trim() || t.pic || "";
    if (!scene) { toast("장면 글을 먼저 적어 주세요 — 그 글대로 그려요"); document.getElementById("scTx")?.focus(); return; }
    if (scene !== (t.pic || "")) sendEdit({ kind: "scene", cat: t.cat, term: t.term, scene });   // 그린 글과 볼트 장면 글이 같게
    askGen({ target: "scene", key: imgKey("s", p.name, s.no), palace: p.name, no: s.no, faceName: s.name || "", memo: s.memo || "", sentence: t.term, def: t.def, scene });
  }
});
document.addEventListener("change", e => {
  const id = e.target?.id; if (id !== "upF" && id !== "upS") return;
  const p = curPal(), f = e.target.files?.[0]; e.target.value = ""; if (!p || !S.face || !f) return;
  const k = id === "upF" ? "f" : "s";
  upPhoto(f, { kind: k, palace: p.name, no: S.face }, imgKey(k, p.name, S.face));
});
