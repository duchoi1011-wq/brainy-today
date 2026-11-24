/* ── 칸 자세히 — 제목 · 상태 · 남은 것 · 요구(완료 기준, 읽기만) · 확인 질문 · 결과 · 원문 · 교안 오류 · 재료 · 열쇠 · 내 메모 (build.py 가 course.html 에 끼움) ──
   볼트 지도 카드의 칸 밑 줄(원문·요구·확인·결과·교안 오류)을 보여 주기만 한다. 항목 나누기·판정 메모 떼기·질문 끝말은 맥 동기화(course_app.py)가 한 곳에서 정해 보낸다:
   req [{t, note}] · chk [{t, q, note}] (q 가 비면 원문 t 그대로, t 가 비면 안내 줄) · out·err [글]. */
function renderCell(c, x){
  const keys = nowKeys(c), memo = memoOf(c.id, x.key), listen = isListen(x);
  const sec = (title, body) => body ? `<div class="sec"><span class="lbl">${title}</span>${body}</div>` : "";
  const noteHtml = n => n ? ` <span class="muted small">— ${remainHtml(n)}</span>` : "";
  const reqs = (x.req || []).length ? `<ul class="reqs">${x.req.map(r => `<li class="${/해당 없음/.test(r.note || r.t) ? "na" : ""}"><span>${inline(r.t)}${noteHtml(r.note)}</span></li>`).join("")}</ul>` : "";
  const chk = (x.chk || []).length ? `<ol class="qs">${x.chk.map(q => q.t ? `<li>${inline(q.q || q.t)}${noteHtml(q.note)}</li>` : `<li class="qnote muted small">${inline(q.note)}</li>`).join("")}</ol>` : "";
  const list = L => (L || []).length ? `<ul class="plain">${L.map(r => `<li>${inline(r)}</li>`).join("")}</ul>` : "";
  const back = { now: "지금", memo: "내 메모", notes: "배운 것", map: "지도" }[S.from] || "지도";
  return `<section class="card">
    <button type="button" class="back" data-back>← ${back}${josaRo(back)} 돌아가기</button>
    <div class="meta" style="margin-top:6px">${esc(partOf(c, x))}${keys.has(x.key) ? ` · <span class="pill now">지금 태스크</span>` : ""}</div>
    <h3 style="margin:4px 0 8px">${esc(x.title)}</h3>
    <div class="meta">${pill(x.st)}<span>${esc(ST[x.st].how)}</span></div>
    ${x.remain ? `<div class="remain"><span class="lbl">남은 것</span>${remainHtml(x.remain)}</div>` : ""}
    <div class="btns" style="margin-top:${x.remain ? 0 : 12}px">${doBtn(x)}</div>
    <p class="small muted" style="margin-top:8px">${listen ? "누르면 Brainy 대화창에 요약 부탁이 채워져요. 듣고 나서 「들었어」라고 하면 Brainy가 볼트 지도에 체크해요." : "누르면 Brainy 대화창에 이 칸 진행 부탁이 채워져요. 끝 표시는 Brainy가 아래 요구를 하나씩 대조하고 확인 질문을 마친 뒤 볼트에 적어요."}</p>
  </section>
  <section class="card">
    ${sec("지도 카드에 적힌 것", x.desc && x.desc.replace(x.remain || "", "").replace(/[🔁⏳✅·\s]|(빠진|남은) 것\s*[:：]/g, "") ? `<p>${inline(x.desc)}</p>` : "")}
    ${sec(`요구 — 교안이 정한 완료 기준 (${(x.req || []).length}개, 다 맞아야 끝)`, reqs)}
    ${sec("끝낼 때 Brainy가 확인할 것 — 질문으로 물어요", chk)}
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
