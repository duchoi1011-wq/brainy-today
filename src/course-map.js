/* ── 「지도」 탭 — 강의의 모든 칸을 Part 별로, 상태 색으로 (build.py 가 course.html 에 끼움) ──
   거르기(S.filt): all 전체 · left 남은 칸(🔁·⏳·아직) · done · similar · doing · todo · listen 듣기만. 머리말 숫자를 눌러도 여기로 온다.
   지금 태스크의 칸은 보라 바탕(isnow). 칸을 누르면 자세히(course-detail.js). */
const FILTS = [["all", "전체"], ["left", "남은 칸"], ["similar", "🔁 빠진 것 있음"], ["doing", "⏳ 하는 중"], ["todo", "○ 아직"], ["done", "✅ 끝"], ["listen", "🎧 듣기"]];
const keepCell = x => {
  const f = S.filt;
  if (f === "all") return true;
  if (f === "listen") return isListen(x);
  if (isListen(x)) return false;
  return f === "left" ? ["similar", "doing", "todo"].includes(x.st) : x.st === f;
};
function cellRow(c, x, keys){
  const memo = memoOf(c.id, x.key), miss = missingOf(c, x), done = cellOn(c, x);
  const sub = !done && miss.has && miss.n ? `빠진 것 ${missWord(miss)}: ` + miss.req.concat(miss.chk).map(it => it.t.replace(/\*\*/g, "")).slice(0, 2).join(" · ") + (miss.n > 2 ? " …" : "") : x.remain && !done ? "남은 것: " + x.remain : x.desc;
  const tags = [keys.has(x.key) ? `<span class="pill now">지금</span>` : "", x.need ? `<span class="pill" title="계정·열쇠가 필요해요">🔑</span>` : "", memo ? `<span class="pill" title="내 메모 있음">✍︎</span>` : ""].join("");
  return `<button type="button" class="cell ${done ? "done" : x.st}${keys.has(x.key) ? " isnow" : ""}" data-cell="${esc(x.key)}" aria-label="${esc(x.title)} — ${ST[x.st].name}">
    <span class="ct"><b>${esc(x.title)}</b>${sub ? `<span>${inline(sub)}</span>` : ""}</span>
    <span class="tags">${pill(done ? "done" : x.st)}${tags}</span></button>`;
}
function renderMap(c){
  const keys = nowKeys(c), n = counts(c);
  const fcount = f => f === "all" ? n.all + c.listen.length : f === "listen" ? c.listen.length : f === "left" ? n.similar + n.doing + n.todo : n[f];
  /* 거르기 줄은 옆으로 밀리는 한 줄 — 본 목록이 첫 화면에 보이게 (색 뜻은 그 밑 한 줄, 자세한 뜻은 칸을 열면) */
  let h = `<div><div class="filt" role="group" aria-label="칸 거르기">${FILTS.map(([f, t]) => `<button type="button" class="chip ${S.filt === f ? "on" : ""}" data-filt="${f}" aria-pressed="${S.filt === f}">${t}<b>${fcount(f)}</b></button>`).join("")}</div>
    <div class="legend" aria-label="색 뜻">${["done", "similar", "doing", "todo", "merged"].map(s => `<span title="${esc(ST[s].how)}"><i class="${s}"></i>${ST[s].name}</span>`).join("")}<span><i class="now"></i>지금 태스크</span></div><p class="small muted" style="margin-top:4px">칩의 숫자는 그 칸 수 그대로예요. ${COUNT_RULE}</p></div>`;
  const showListen = S.filt === "all" || S.filt === "listen";
  if (showListen && c.listen.length) {
    const L = c.listen.filter(keepCell);
    h += `<section class="card"><details class="fold"${S.filt === "listen" ? " open" : ""}><summary><h2>🎧 듣기만 ${c.listen.length}칸 · 끝 ${n.lDone}/${n.lAll}${c.listen.length > n.lAll ? ` (건너뜀 ${c.listen.length - n.lAll}칸 뺌)` : ""}</h2></summary>
      <p class="small muted" style="margin-bottom:6px">실습 문제가 없는 차시예요. 실습 사이에 Brainy가 필요한 것만 3줄로 요약해 줘요.</p>
      <div>${L.map(x => cellRow(c, x, keys)).join("")}</div></details></section>`;
  }
  if (S.filt !== "listen") {
    c.parts.forEach(p => {
      const L = p.cells.filter(keepCell);
      if (!L.length) return;
      const pd = p.cells.filter(x => x.st === "done").length, pg = p.cells.filter(x => !["merged", "skip"].includes(x.st)).length;
      h += `<section class="card"><div class="part"><h2>${esc(p.name || "실습")}</h2><small>끝 ${pd}/${pg}</small></div>${p.note ? `<p class="small muted">${inline(p.note)}</p>` : ""}
        <div style="margin-top:6px">${L.map(x => cellRow(c, x, keys)).join("")}</div></section>`;
    });
  }
  if (!h.includes('class="cell')) h += `<section class="card"><p class="empty">이 거르기에 맞는 칸이 없어요.</p></section>`;
  return h;
}
