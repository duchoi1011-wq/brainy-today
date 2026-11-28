/* ── 「점검」 탭 — 지표마다 한 줄: 지금 값 · 기준 · 왜 · 할 일 (build.py 가 ads.html 에 끼움) ──
   줄은 ads-calc.js checksOf() 가 숫자에서 뽑는다: 빨강 문제 · 노랑 주의 · 회색 숫자 없음 · 초록 좋음 · 파랑 참고.
   「✦ Brainy와 조율」은 대화창을 채우고, 「조율하러 가기」는 그 대상의 조작 화면(조율 탭)으로 간다. */
const CF = [["need", "손볼 것"], ["all", "전체"], ["ok", "좋음"], ["info", "참고"]];
const keepC = x => S.cf === "all" ? true : S.cf === "need" ? ["bad", "warn", "none"].includes(x.lv) : S.cf === "ok" ? x.lv === "ok" : x.lv === "info";
function checkRow(x, many){
  const go = x.camp || x.filt != null && x.filt !== "" ? `<button type="button" class="btn sm" data-goctl="${esc(x.b.id)}" data-gf="${esc(x.filt || "")}">조율하러 가기</button>` : "";
  return `<div class="row ${x.lv} ck"><div class="ct">
    <b>${esc(x.name)}</b><span>${many ? esc(x.b.short || x.b.name) + " · " : ""}${esc(chName(x.ch))}</span>
    <div class="vs"><span class="v">${esc(x.val)}</span>${x.std ? `<span class="s">기준 ${esc(x.std)}</span>` : ""}</div>
    ${x.why ? `<p class="why">${esc(x.why)}</p>` : ""}
    ${x.ask || go ? `<div class="btns act">${x.ask ? askBtn(x.ask, "✦ Brainy와 조율", x.lv === "bad" ? "primary sm" : "sm") : ""}${go}</div>` : ""}
  </div><div class="tags"><span class="pill ${x.lv}">${LVN[x.lv]}</span></div></div>`;
}
function renderNow(){
  const list = selBrands(), T = checksOf(list), many = list.length > 1;
  const cnt = f => T.filter(x => { const k = S.cf; S.cf = f; const r = keepC(x); S.cf = k; return r; }).length;
  let h = "";
  if (many) {
    h += `<section class="card"><h2>브랜드 한눈에</h2>${list.map(b => {
      const C = checksOf([b]), bad = C.filter(x => x.lv === "bad").length, warn = C.filter(x => x.lv === "warn").length, t = totalsOf([b]);
      return `<button type="button" class="row ${bad ? "bad" : warn ? "warn" : chOrder().some(ch => chState(b, ch).k === "run") ? "ok" : "none"}" data-brand="${esc(b.id)}" aria-label="${esc(b.name)} 열기">
        <span class="ct"><b>${esc(b.name)}</b><span>${esc(b.product || "")}${b.goal ? " · 목표 " + esc(b.goal) : ""}</span>
        <span class="figs">${chOrder().map(ch => `<span>${esc(chName(ch))} <i>${esc(chState(b, ch).t)}</i></span>`).join("")}${t.camps ? `<span>7일 <i>${won(t.s7.cost)}원</i> · CTR <i>${ctrTxt(t.s7)}</i> · CPC <i>${cpcTxt(t.s7)}</i></span>` : ""}</span></span>
        <span class="tags">${bad ? `<span class="pill bad">문제 ${bad}</span>` : ""}${warn ? `<span class="pill warn">주의 ${warn}</span>` : ""}</span></button>`;
    }).join("")}</section>`;
  } else if (list[0]) {
    const b = list[0], cap = maxCpc(b);
    h += `<p class="small muted" style="padding:0 4px">${esc(b.product || "")}${b.goal ? " · 목표 " + esc(b.goal) : ""}${b.breakeven ? ` · 손익분기 <span class="num">${won(b.breakeven)}</span>원` : b.breakevenNote ? " · " + esc(b.breakevenNote) : ""}${cap ? ` · 허용 CPC <span class="num">${won(cap)}</span>원` : ""}${b.note ? "<br>" + esc(b.note) : ""}</p>`;
  }
  if (!T.length) return h + `<section class="card"><p class="empty">이 브랜드는 광고 계획이 없어 점검할 지표가 없어요.</p></section>`;
  h += `<div><div class="filt" role="group" aria-label="점검 거르기">${CF.map(([f, t]) => `<button type="button" class="chip ${S.cf === f ? "on" : ""}" data-cf="${f}" aria-pressed="${S.cf === f}">${t}<b>${cnt(f)}</b></button>`).join("")}</div>
    <div class="legend" style="padding:0 4px">${["bad", "warn", "none", "ok", "info"].map(k => `<span><i class="${k}"></i>${LVN[k]}</span>`).join("")}</div></div>`;
  const L = T.filter(keepC);
  h += `<section class="card"><h2>점검표 · ${L.length}</h2>${L.length ? L.map(x => checkRow(x, many)).join("") : `<p class="empty">${S.cf === "need" ? "손볼 지표가 없어요." : "이 거르기에 맞는 줄이 없어요."}</p>`}</section>`;
  const nv = NV(), st = D.store || {};
  h += `<p class="small muted" style="text-align:center;padding:0 8px">네이버 숫자 ${nv.ok ? ago(nv.at) : "못 받음"}${list.some(b => b.store) ? ` · 스토어 주문 ${st.ok ? ago(st.at) : "미연결"}` : ""} · 메타·구글은 주간 리뷰 숫자<br>기준은 광고 실습 교과서의 「외울 것」과 볼트 광고 문서에서 왔어요.</p>`;
  return h;
}
