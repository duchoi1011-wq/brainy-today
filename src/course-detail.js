/* ── 칸 자세히 — 제목 · 상태 · 빠진 것 · 끝 표시 · 쉬운 설명 · 요구(체크) · 확인 질문(체크) · 결과 · 원문 · 교안 오류 · 재료 · 열쇠 · 내 메모 (build.py 가 course.html 에 끼움) ──
   볼트 지도 카드의 칸 밑 줄(원문·요구·확인·결과·교안 오류)을 보여 준다. 항목 나누기·판정 메모 떼기·질문 끝말·체크 표시(☑ ⏭)는 맥 동기화(course_app.py)가 한 곳에서 정해 보낸다:
   req [{id, t, note, ok|skip}] · chk [{id, t, q, note, ok|skip}] (q 가 비면 원문 t 그대로, t 가 비면 안내 줄) · out·err [글].
   체크·끝 표시는 course-check.js — 누르면 볼트 지도 카드에 적힌다. 빠진 것 = 체크 안 된 요구·확인 항목 (missingOf 한 곳). */
function renderCell(c, x){
  const keys = nowKeys(c), memo = memoOf(c.id, x.key), listen = isListen(x), miss = missingOf(c, x), done = cellOn(c, x);
  const sec = (title, body) => body ? `<div class="sec"><span class="lbl">${title}</span>${body}</div>` : "";
  const list = L => (L || []).length ? `<ul class="plain">${L.map(r => `<li>${inline(r)}</li>`).join("")}</ul>` : "";
  const back = { now: "지금", memo: "내 메모", notes: "배운 것", map: "지도", study: "공부" }[S.from] || "지도";
  const nReq = (x.req || []).filter(it => it.id).length, nChk = (x.chk || []).filter(it => it.id && it.t).length;
  /* 빠진 것 — 항목이 있는 칸은 체크 안 된 항목 그대로, 항목이 없는 칸은 지도 카드의 「빠진 것/남은 것」 글 */
  let missHtml = "";
  if (!done && !listen && miss.has) {
    missHtml = miss.n ? `<div class="remain"><span class="lbl">빠진 것 — ${missWord(miss)} · 교안이 요구했는데 아직 체크 안 된 것</span>
      ${miss.req.length ? `<ul class="miss">${miss.req.map(it => `<li>${inline(it.t)}</li>`).join("")}</ul>` : ""}
      ${miss.chk.length ? `<p class="small" style="margin-top:6px"><b>아직 답 안 한 확인 질문 ${miss.chk.length}개</b> — 아래 「확인 질문」에서 답할 수 있으면 체크해요.</p>` : ""}
      <p class="small muted" style="margin-top:6px">한 것은 아래 목록에서 눌러 체크하면 여기서 빠져요.</p></div>`
      : `<div class="remain ok"><span class="lbl">빠진 것 없음</span>요구 ${nReq}개${nChk ? `·확인 ${nChk}개` : ""}를 다 체크했어요. 끝났으면 「내가 끝냈어요」를 눌러요.</div>`;
  } else if (!done && x.remain) missHtml = `<div class="remain"><span class="lbl">남은 것 (지도 카드 글)</span>${remainHtml(x.remain)}</div>`;
  return `<section class="card">
    <button type="button" class="back" data-back>← ${back}${josaRo(back)} 돌아가기</button>
    <div class="meta" style="margin-top:6px">${esc(partOf(c, x))}${keys.has(x.key) ? ` · <span class="pill now">지금 태스크</span>` : ""}</div>
    <h3 style="margin:4px 0 8px">${esc(x.title)}</h3>
    <div class="meta">${pill(done ? "done" : x.st)}<span>${esc(done && x.st !== "done" ? "내가 끝 표시함 · 볼트에 적는 중" : x.mine ? "내가 앱에서 끝 표시한 칸" : ST[x.st].how)}</span></div>
    ${missHtml}
    <div class="btns" style="margin-top:12px">${doBtn(x)}${cellBtn(c, x)}</div>
    <p class="small muted" style="margin-top:8px">${listen ? "들은 뒤 「들었어요」를 누르면 볼트 지도에 체크돼요. 요약이 필요하면 Brainy에게 3줄 요약을 부탁해요." : "혼자 한 것은 직접 체크해요. Brainy와 하면 Brainy가 요구를 하나씩 대조하고 확인 질문을 한 뒤 체크해요. 체크는 모두 볼트 지도 카드에 적혀요."}</p>
  </section>
  <section class="card">
    ${easyBox(c, x)}
    ${sec("지도 카드에 적힌 것", x.desc && x.desc.replace(x.remain || "", "").replace(/[🔁⏳✅·\s]|(빠진|남은) 것\s*[:：]/g, "") ? `<p>${inline(x.desc)}</p>` : "")}
    ${sec(`요구 — 교안이 정한 완료 기준 ${nReq}개 · 한 것은 눌러 체크`, checkList(c, x, "req"))}
    ${sec(`확인 질문 ${nChk}개 — 답할 수 있으면 체크`, checkList(c, x, "chk"))}
    ${sec("이 실습이 만드는 것", list(x.out))}
    ${sec("📎 쓸 재료 — 동욱의 실제 파일·자료", x.mat ? `<p>${inline(x.mat)}</p>` : "")}
    ${sec("🔑 계정·열쇠 필요 — 로그인·열쇠는 동욱이 직접 넣어요", x.need ? `<p>${inline(x.need)}</p>` : "")}
    ${sec("교안이 틀린 곳 — 실제 도구와 달라 고쳐서 해요", list(x.err))}
    ${sec("원문 위치 — 볼트 교안의 줄 번호", x.src ? `<p class="small">${inline(x.src)}</p>` : "")}
    ${sec("그 밖에 적힌 것", x.extra ? `<ul class="plain">${x.extra.map(r => `<li>${inline(r)}</li>`).join("")}</ul>` : "")}
    ${!(x.req || []).length && !(x.chk || []).length && !(x.out || []).length && !x.src && !listen ? `<p class="small muted">이 칸에는 아직 교안 대조 줄(원문·요구·확인)이 없어요. Brainy와 이 칸을 할 때 원문에서 옮겨 적어요.</p>` : ""}
    <p class="small muted sec">정본: 볼트 「${esc(c.map.split("/").pop().replace(/\.md$/, ""))}」 ${x.line}번째 줄</p>
  </section>
  ${memoBox(c, x, memo)}`;
}
