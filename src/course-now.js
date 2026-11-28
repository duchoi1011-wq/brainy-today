/* ── 「지금」 탭 — 오늘 할 칸 하나 + 지금 태스크의 완료 기준 (build.py 가 course.html 에 끼움) ──
   지금 태스크 = 볼트 32_태스크 중 이 강의 지도를 잇는 것 (동기화가 진행 → 할일 순으로 보냄). 기준 줄마다 맞는 지도 칸(crit.cell)이 붙어 온다.
   기준 줄 체크(☑)와 상태 버튼은 course-task.js — 누르면 taskwork/cr-… 로 가서 맥이 볼트 태스크 노트에 적는다. 화면은 노트 그대로(그 사이엔 누른 대로). */
function renderNow(c){
  const t = taskOf(c), x = nextCell(c), keys = nowKeys(c);
  let h = c.full || c.meta ? `<p class="small muted" style="padding:0 4px">${fullHtml(c.full)}${c.full && c.meta ? "<br>" : ""}${inline(c.meta || "")}</p>` : "";
  if (x) {
    h += `<section class="card nowcell"><h2>지금 할 칸</h2>
      <div class="meta">${esc(partOf(c, x))}${keys.has(x.key) ? ` · <span class="pill now">지금 태스크</span>` : ""} ${pill(x.st)}</div>
      <h3>${esc(x.title)}</h3>
      ${(() => { const m = missingOf(c, x); return m.has && m.n ? `<div class="remain"><span class="lbl">빠진 것 — ${missWord(m)}</span>${m.req.concat(m.chk).slice(0, 3).map(it => inline(it.t)).join("<br>")}${m.n > 3 ? `<br><span class="muted">… 외 ${m.n - 3}개 — 요구사항 보기에서 전부</span>` : ""}</div>` : ""; })() || (x.remain ? `<div class="remain"><span class="lbl">남은 것</span>${remainHtml(x.remain)}</div>` : "") || (x.desc ? `<p class="small muted" style="margin-bottom:12px">${inline(x.desc)}</p>` : "")}
      <div class="btns">${doBtn(x)}<button type="button" class="btn" data-cell="${esc(x.key)}">요구사항 보기</button></div>
      <p class="small muted" style="margin-top:10px">▶ 를 누르면 맥의 Brainy(본계정)가 새 대화에서 이 칸을 바로 시작해 한 단계씩 직접 진행하고, 단계마다 결과를 보여 주며 확인 질문을 해요. 맥이 꺼져 있으면 답하지 않아요.</p>
    </section>`;
  } else {
    h += `<section class="card"><h2>지금 할 칸</h2><p class="empty">남은 실습 칸이 없어요. 이 강의는 실습을 다 끝냈어요.</p></section>`;
  }
  if (t) {
    const done = t.crit.filter(k => critOn(t, k)).length;
    h += `<section class="card"><h2>지금 태스크 · ${done}/${t.crit.length} 끝</h2>
      <p style="font-weight:700;margin-bottom:2px">${esc(t.name.replace(/^T-/, ""))}</p>
      <p class="small muted">${t.estimate ? "예상 " + esc(t.estimate) : ""}${t.due ? " · 기한 " + esc(t.due) : ""}${t.estimate || t.due ? " · " : ""}기준 줄을 다 체크하면 끝이에요 · 누르면 볼트 태스크 노트에 적혀요${twOf(t) ? ` <span class="muted">· 볼트에 적는 중</span>` : ""}</p>
      ${statusBtns(t)}
      <div style="margin-top:6px">${t.crit.map(k => critRow(c, t, k)).join("") || `<p class="empty">이 태스크에 완료 기준 줄이 없어요.</p>`}</div>
    </section>`;
  } else {
    h += `<section class="card"><h2>지금 태스크</h2>
      <p>이 강의를 잇는 태스크가 아직 없어요.</p>
      <p class="small muted" style="margin:4px 0 12px">Brainy가 지도에서 아직 안 끝난 첫 Part로 1~3시간짜리 태스크 하나를 만들어요.</p>
      <div class="btns"><button type="button" class="btn primary" data-newtask>✦ Brainy와 다음 태스크 만들기</button></div></section>`;
  }
  const others = c.tasks.filter(o => o !== t);
  if (others.length) h += `<section class="card"><h2>이 강의를 쓰는 다른 태스크</h2><ul class="plain">${others.map(o => `<li>${esc(o.name.replace(/^T-/, ""))} <span class="muted small">· ${esc(o.status)}</span></li>`).join("")}</ul></section>`;
  h += `<p class="small muted" style="text-align:center;padding:0 8px">위 태스크 기준 줄 체크와 상태는 볼트 태스크 노트에, 칸을 열어 하는 요구·확인 체크와 「내가 끝냈어요」는 볼트 지도 카드에 적혀요. Brainy와 하면 Brainy가 대조하고 확인 질문을 한 뒤 체크해요.</p>`;
  return h;
}
function critRow(c, t, k){
  const x = k.cell && cellBy(c, k.cell), on = critOn(t, k);
  const [head, ...rest] = k.text.split(" — ");
  return `<div class="crit ${on ? "on" : ""}"><button type="button" class="box" data-tbox="${k.box}" aria-pressed="${on}" aria-label="${esc(head)} — ${on ? "체크됨, 누르면 풀기" : "누르면 체크"}">${on ? "✓" : ""}</button><div class="cb">
    <b>${inline(head)}</b>${rest.length ? `<p>${inline(rest.join(" — "))}</p>` : ""}
    ${x ? `<div class="meta">${pill(x.st)}${x.remain && !on ? ` <span>지도 카드의 남은 것: ${remainHtml(x.remain)}</span>` : ""}</div>
    ${on ? "" : `<div class="btns">${doBtn(x)}<button type="button" class="btn" data-cell="${esc(x.key)}">요구사항 보기</button></div>`}` : `<p class="small muted">지도에서 맞는 칸을 못 찾았어요 — 태스크 줄 그대로예요.</p>`}
  </div></div>`;
}
