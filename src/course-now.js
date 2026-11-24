/* ── 「지금」 탭 — 오늘 할 칸 하나 + 지금 태스크의 완료 기준 (build.py 가 course.html 에 끼움) ──
   지금 태스크 = 볼트 32_태스크 중 이 강의 지도를 잇는 것 (동기화가 진행 → 할일 순으로 보냄). 기준 줄마다 맞는 지도 칸(crit.cell)이 붙어 온다.
   끝 표시(☑)는 볼트 태스크 노트의 체크 그대로 — 여기서 누르지 않는다. */
function renderNow(c){
  const t = taskOf(c), x = nextCell(c), keys = nowKeys(c);
  let h = c.full || c.meta ? `<p class="small muted" style="padding:0 4px">${inline(c.full || "")}${c.full && c.meta ? "<br>" : ""}${inline(c.meta || "")}</p>` : "";
  if (x) {
    h += `<section class="card nowcell"><h2>지금 할 칸</h2>
      <div class="meta">${esc(partOf(c, x))}${keys.has(x.key) ? ` · <span class="pill now">지금 태스크</span>` : ""} ${pill(x.st)}</div>
      <h3>${esc(x.title)}</h3>
      ${x.remain ? `<div class="remain"><span class="lbl">남은 것</span>${inline(x.remain)}</div>` : x.desc ? `<p class="small muted" style="margin-bottom:12px">${inline(x.desc)}</p>` : ""}
      <div class="btns">${doBtn(x)}<button type="button" class="btn" data-cell="${esc(x.key)}">요구사항 보기</button></div>
      <p class="small muted" style="margin-top:10px">누르면 Brainy 대화창에 「${esc(sayDo(c, x))}」가 채워져요. ↑ 로 보내면 Brainy가 이 칸이 뭔지 설명하고 한 단계씩 같이 진행해요.</p>
    </section>`;
  } else {
    h += `<section class="card"><h2>지금 할 칸</h2><p class="empty">남은 실습 칸이 없어요. 이 강의는 실습을 다 끝냈어요.</p></section>`;
  }
  if (t) {
    const done = t.crit.filter(k => k.done).length;
    h += `<section class="card"><h2>지금 태스크 · ${done}/${t.crit.length} 끝</h2>
      <p style="font-weight:700;margin-bottom:2px">${esc(t.name.replace(/^T-/, ""))}</p>
      <p class="small muted">${esc(t.status || "")}${t.estimate ? " · 예상 " + esc(t.estimate) : ""}${t.due ? " · 기한 " + esc(t.due) : ""} · 칸마다 아래 기준을 다 맞추면 끝이에요</p>
      <div style="margin-top:6px">${t.crit.map(k => critRow(c, k)).join("") || `<p class="empty">이 태스크에 완료 기준 줄이 없어요.</p>`}</div>
    </section>`;
  } else {
    h += `<section class="card"><h2>지금 태스크</h2>
      <p>이 강의를 잇는 태스크가 아직 없어요.</p>
      <p class="small muted" style="margin:4px 0 12px">Brainy가 지도에서 아직 안 끝난 첫 Part로 1~3시간짜리 태스크 하나를 만들어요.</p>
      <div class="btns"><button type="button" class="btn primary" data-newtask>✦ Brainy와 다음 태스크 만들기</button></div></section>`;
  }
  const others = c.tasks.filter(o => o !== t);
  if (others.length) h += `<section class="card"><h2>이 강의를 쓰는 다른 태스크</h2><ul class="plain">${others.map(o => `<li>${esc(o.name.replace(/^T-/, ""))} <span class="muted small">· ${esc(o.status)}</span></li>`).join("")}</ul></section>`;
  h += `<p class="small muted" style="text-align:center;padding:0 8px">✅ 끝 표시는 Brainy가 교안 요구사항을 하나씩 대조하고 확인 질문을 마친 뒤 볼트 지도 카드에 적어요. 이 앱은 그 결과를 몇 초 뒤 그대로 보여 줘요.</p>`;
  return h;
}
function critRow(c, k){
  const x = k.cell && cellBy(c, k.cell);
  const [head, ...rest] = k.text.split(" — ");
  return `<div class="crit ${k.done ? "on" : ""}"><span class="box" aria-label="${k.done ? "끝" : "아직"}">${k.done ? "✓" : ""}</span><div class="cb">
    <b>${inline(head)}</b>${rest.length ? `<p>${inline(rest.join(" — "))}</p>` : ""}
    ${x ? `<div class="meta">${pill(x.st)}${x.remain && !k.done ? ` <span>지도 카드의 남은 것: ${inline(x.remain)}</span>` : ""}</div>
    ${k.done ? "" : `<div class="btns">${doBtn(x)}<button type="button" class="btn" data-cell="${esc(x.key)}">요구사항 보기</button></div>`}` : `<p class="small muted">지도에서 맞는 칸을 못 찾았어요 — 태스크 줄 그대로예요.</p>`}
  </div></div>`;
}
