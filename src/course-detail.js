/* ── 칸 자세히 — 제목 · 상태 · 남은 것 · 요구(완료 기준, 읽기만) · 확인 질문 · 결과 · 원문 · 교안 오류 · 재료 · 열쇠 · 내 메모 (build.py 가 course.html 에 끼움) ──
   볼트 지도 카드의 칸 밑 줄(원문·요구·확인·결과·교안 오류)을 그대로 보여 준다. 줄은 「 · 」로 나뉜 항목 — 괄호·따옴표·코드 안의 「 · 」는 나누지 않는다.
   확인 줄은 끝낼 때 Brainy가 물을 질문으로 바꿔 보여 준다 (글은 볼트 그대로, 끝말만 「~할 수 있나요?」). */
function splitItems(s){
  const out = []; let cur = "", depth = 0, tick = false;
  const open = "(（「『[", close = ")）」』]";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "`") tick = !tick;
    else if (!tick && open.includes(ch)) depth++;
    else if (!tick && close.includes(ch)) depth = Math.max(0, depth - 1);
    if (!tick && depth === 0 && s.startsWith(" · ", i)) { out.push(cur.trim()); cur = ""; i += 2; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  /* 값 나열(「`allowAll` · `denyAll`」 「rm -rf · sudo」 「/help · /init」)은 한 항목으로 다시 붙인다 — 앞이 영문·코드로 끝나고 뒤가 영문·코드로 시작하면 */
  return out.filter(Boolean).reduce((acc, x) => {
    const prev = acc[acc.length - 1];
    if (prev && /[A-Za-z0-9_`'")\]*.\-]$/.test(prev) && /^[`A-Za-z\/\-.]/.test(x) && !/^(Step|STEP|Clip|Part)\b/.test(x)) acc[acc.length - 1] = prev + " · " + x;
    else acc.push(x);
    return acc;
  }, []);
}
function asQuestion(s){
  s = s.trim().replace(/[.。]$/, "");
  const rules = [
    [/할 수 있다$/, "할 수 있나요?"], [/수 있는가$/, "수 있나요?"], [/할 수 있음$/, "할 수 있나요?"],
    [/(이해|확인|설치|실행|사용|작성|선택|적용|체험|등록|생성|입력|해결)했다$/, "$1했나요?"], [/했다$/, "했나요?"],
    [/안다$/, "알고 있나요?"], [/있다$/, "있나요?"], [/된다$/, "되나요?"], [/나온다$/, "나오나요?"], [/보여 준다$/, "보여 주나요?"], [/인가$/, "인가요?"],
    [/설명$/, "설명할 수 있나요?"], [/말하기$/, "말할 수 있나요?"], [/하기$/, "할 수 있나요?"],
    [/(이해|확인|설치|실행|사용|작성|선택|적용|체험|등록|생성|입력|해결|완료)$/, "$1했나요?"]
  ];
  for (const [re, to] of rules) if (re.test(s)) return s.replace(re, to);
  return /[?？]$/.test(s) ? s : s + " — 할 수 있나요?";
}
const isNote = s => /다\.?$/.test(s.trim()) && !/(수 있다|안다|했다)\.?$/.test(s.trim());   // 「원문에 없음. …이다.」 같은 설명 줄은 질문으로 바꾸지 않는다
function renderCell(c, x){
  const keys = nowKeys(c), memo = memoOf(c.id, x.key), listen = isListen(x);
  const sec = (title, body) => body ? `<div class="sec"><span class="lbl">${title}</span>${body}</div>` : "";
  const reqs = x.req ? `<ul class="reqs">${splitItems(x.req).map(r => `<li class="${/해당 없음/.test(r) ? "na" : ""}"><span>${inline(r)}</span></li>`).join("")}</ul>` : "";
  const chk = x.chk ? (() => { const L = splitItems(x.chk); const notes = L.filter(isNote), qs = L.filter(q => !isNote(q));
    return (notes.length ? `<p class="small muted">${notes.map(inline).join(" ")}</p>` : "") + (qs.length ? `<ol class="qs">${qs.map(q => `<li>${inline(asQuestion(q))}</li>`).join("")}</ol>` : ""); })() : "";
  const list = s => `<ul class="plain">${splitItems(s).map(r => `<li>${inline(r)}</li>`).join("")}</ul>`;
  return `<section class="card">
    <button type="button" class="back" data-back>← ${S.from === "now" ? "지금" : S.from === "memo" ? "내 메모" : S.from === "notes" ? "배운 것" : "지도"}로</button>
    <div class="meta" style="margin-top:6px">${esc(partOf(c, x))}${keys.has(x.key) ? ` · <span class="pill now">지금 태스크</span>` : ""}</div>
    <h3 style="margin:4px 0 8px">${esc(x.title)}</h3>
    <div class="meta">${pill(x.st)}<span>${esc(ST[x.st].how)}</span></div>
    ${x.remain ? `<div class="remain"><span class="lbl">남은 것</span>${remainHtml(x.remain)}</div>` : ""}
    <div class="btns" style="margin-top:${x.remain ? 0 : 12}px">${doBtn(x)}</div>
    <p class="small muted" style="margin-top:8px">${listen ? "누르면 Brainy 대화창에 요약 부탁이 채워져요. 듣고 나서 「들었어」라고 하면 Brainy가 볼트 지도에 체크해요." : "누르면 Brainy 대화창에 이 칸 진행 부탁이 채워져요. 끝 표시는 Brainy가 아래 요구를 하나씩 대조하고 확인 질문을 마친 뒤 볼트에 적어요."}</p>
  </section>
  <section class="card">
    ${sec("지도 카드에 적힌 것", x.desc && x.desc.replace(x.remain || "", "").replace(/[🔁⏳✅·\s]|(빠진|남은) 것\s*[:：]/g, "") ? `<p>${inline(x.desc)}</p>` : "")}
    ${sec(`요구 — 교안이 정한 완료 기준 (${x.req ? splitItems(x.req).length : 0}개, 다 맞아야 끝)`, reqs)}
    ${sec("끝낼 때 Brainy가 물어볼 질문", chk)}
    ${sec("이 실습이 만드는 것", x.out ? list(x.out) : "")}
    ${sec("📎 쓸 재료 — 동욱의 실제 파일·자료", x.mat ? `<p>${inline(x.mat)}</p>` : "")}
    ${sec("🔑 계정·열쇠 필요 — 로그인·열쇠는 동욱이 직접 넣어요", x.need ? `<p>${inline(x.need)}</p>` : "")}
    ${sec("교안이 틀린 곳 — 실제 도구와 달라 고쳐서 해요", x.err ? list(x.err) : "")}
    ${sec("원문 위치 — 볼트 교안의 줄 번호", x.src ? `<p class="small">${inline(x.src)}</p>` : "")}
    ${sec("그 밖에 적힌 것", x.extra ? `<ul class="plain">${x.extra.map(r => `<li>${inline(r)}</li>`).join("")}</ul>` : "")}
    ${!x.req && !x.chk && !x.out && !x.src && !listen ? `<p class="small muted">이 칸에는 아직 교안 대조 줄(원문·요구·확인)이 없어요. Brainy와 이 칸을 할 때 원문에서 옮겨 적어요.</p>` : ""}
    <p class="small muted sec">정본: 볼트 「${esc(c.map.split("/").pop().replace(/\.md$/, ""))}」 ${x.line}번째 줄</p>
  </section>
  ${memoBox(c, x, memo)}`;
}
