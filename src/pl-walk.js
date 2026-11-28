/* ───────── 걷기 탭 — 궁전을 들어가 나오는 순서대로 한 자리씩 (palace.html 이 끼운다) ─────────
   장소 사진 · 면 이름 · 장소 메모를 보고 → 그 자리에 놓은 문장을 먼저 떠올린 뒤 「보기」로 문장·장면 그림을 연다.
   기억의 궁전은 자리가 늘 같은 순서로 이어져야 한다 — 이 화면이 그 길이다. 아무것도 쓰지 않는다. */
const WK = { show: false };

function renderWalk(){
  const p = curPal(); if (!p) return noPal();
  const d = palData(p), list = d.slots;
  if (!list.length) return `<section class="card"><p class="empty">아직 면이 없어요. 궁전 탭에서 장을 더해요.</p></section>`;
  if (S.walk >= list.length || S.walk < 0) S.walk = 0;
  const s = list[S.walk], ts = d.byFace[s.no] || [], fk = imgKey("f", p.name, s.no), sk = imgKey("s", p.name, s.no);
  const chName = p.chapters.find(c => c.n === s.ch)?.name || "";
  const chSlots = list.filter(x => x.ch === s.ch);
  const steps = `<div class="steps" aria-hidden="true">${chSlots.map(x => `<i class="${x.no === s.no ? "on" : d.byFace[x.no] ? "s" : ""}"></i>`).join("")}</div>`;
  const reveal = !ts.length ? `<p class="small muted">${s.placed ? esc(s.placed) : "빈 면 — 지나가요."}</p>`
    : WK.show ? ts.map(t => `<div class="stack" style="gap:8px"><p class="sent">${esc(t.term)}</p><p class="small">${esc(t.def)}</p>
        ${t.pic ? `<p class="scene-t">${esc(t.pic)}</p>` : ""}${imgOf(sk) ? picHtml(sk, "scene", "", "장면") : ""}</div>`).join("")
    : `<p class="small muted">이 자리에 놓은 뜻: <b style="color:var(--ink)">${esc(ts.map(t => t.def).join(" / "))}</b></p>
       <button class="btn primary" data-wk="show">떠올렸어요 — 문장 보기</button>`;
  return `<section class="card walk">
    <div class="meta"><span class="walk-no">${esc(s.ch)}장${chName ? " " + esc(chName) : ""} · ${esc(s.no)}</span><span class="small mono muted">${S.walk + 1} / ${list.length}</span></div>
    ${steps}
    ${picHtml(fk, "place", "장소 사진이 없어요 — 궁전 탭에서 이 자리를 찍어요", "")}
    <div class="stack" style="gap:4px"><h3>${s.name ? esc(s.name) : `<span class="muted">이름 없는 자리</span>`}</h3>${s.memo ? `<p class="small muted">${esc(s.memo)}</p>` : ""}</div>
    ${reveal}
    <div class="walk-nav">
      <button class="btn ghost" data-wk="prev" ${S.walk ? "" : "disabled"}>← 앞 자리</button>
      <button class="btn ${ts.length && !WK.show ? "ghost" : "primary"}" data-wk="next" ${S.walk < list.length - 1 ? "" : "disabled"}>다음 자리 →</button>
    </div>
    <div class="btns"><button class="btn ghost sm" data-face="${esc(s.no)}">이 자리 고치기</button><button class="btn ghost sm" data-wk="first">처음부터</button>${d.placed ? `<button class="btn ghost sm" data-wk="filled">문장 있는 자리만 ${WK.only ? "✓" : ""}</button>` : ""}</div>
  </section>
  <p class="small muted" style="padding:0 4px">← → 키로도 걸어요. 같은 길을 같은 순서로 자주 걸을수록 자리가 단단해져요.</p>`;
}
function walkGo(dir){
  const p = curPal(); if (!p) return;
  const d = palData(p), list = d.slots; let i = S.walk;
  do { i += dir; } while (WK.only && i > 0 && i < list.length - 1 && !d.byFace[list[i].no]);
  S.walk = Math.max(0, Math.min(list.length - 1, i)); WK.show = false; keep(); render();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-wk]"); if (!b) return;
  const a = b.dataset.wk;
  if (a === "show") { WK.show = true; render(); return; }
  if (a === "prev") walkGo(-1);
  if (a === "next") walkGo(1);
  if (a === "first") { S.walk = 0; WK.show = false; keep(); render(); }
  if (a === "filled") { WK.only = !WK.only; render(); }
});
document.addEventListener("keydown", e => {
  if (view() !== "walk" || e.target.closest?.("input,textarea")) return;
  if (e.key === "ArrowRight") walkGo(1); else if (e.key === "ArrowLeft") walkGo(-1); else if ((e.key === " " || e.key === "Enter") && !WK.show && e.target === document.body) { e.preventDefault(); WK.show = true; render(); }
});
