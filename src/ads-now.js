/* ── 「지금」 탭 — 오늘 조율할 일 (build.py 가 ads.html 에 끼움) ──
   일은 ads-calc.js todosOf() 가 숫자에서 뽑는다: 빨강 = 오늘 손대야 함 · 노랑 = 보고 판단 · 파랑 = 참고·준비.
   「✦ Brainy와 조율」은 대화창을 그 일의 말로 채운다 — 맥의 Brainy가 볼트 기준으로 조정안 표를 보여 주고, 동욱이 승인한 줄만 적용한다. */
const LV = { high: "오늘 손대기", mid: "보고 판단", low: "참고" };
function todoRow(x, showBrand){
  const more = x.camp ? `<button type="button" class="btn" data-camp="${esc(x.camp)}">캠페인 보기</button>` : x.filt ? `<button type="button" class="btn" data-jf="${x.filt}">키워드 보기</button>` : "";
  return `<div class="row ${x.lv} todo"><div class="ct">
    <b>${esc(x.title)}</b><span>${showBrand ? esc(x.b.short || x.b.name) + " · " : ""}${esc(chName(x.ch))}</span>
    ${x.why ? `<p class="why">${esc(x.why)}</p>` : ""}
    ${x.ask || more ? `<div class="btns act">${x.ask ? askBtn(x.ask, "✦ Brainy와 조율", x.lv === "high" ? "primary" : "") : ""}${more}</div>` : ""}
  </div><div class="tags"><span class="pill ${x.lv}">${LV[x.lv]}</span></div></div>`;
}
function renderNow(){
  const list = selBrands(), T = todosOf(list), many = list.length > 1;
  let h = "";
  if (many) {
    h += `<section class="card"><h2>브랜드 한눈에</h2>${list.map(b => {
      const t = totalsOf([b]), n = todosOf([b]).filter(x => x.lv === "high").length;
      return `<button type="button" class="row ${n ? "high" : chOrder().some(ch => chState(b, ch).k === "run") ? "run" : "none"}" data-brand="${esc(b.id)}" aria-label="${esc(b.name)} 열기">
        <span class="ct"><b>${esc(b.name)}</b><span>${esc(b.product || "")}${b.goal ? " · 목표 " + esc(b.goal) : ""}</span>
        <span class="figs">${chOrder().map(ch => `<span>${esc(chName(ch))} <i>${esc(chState(b, ch).t)}</i></span>`).join("")}${t.camps ? `<span>7일 <i>${won(t.cost7)}원</i></span>` : ""}</span></span>
        <span class="tags">${n ? `<span class="pill high">급함 ${n}</span>` : ""}</span></button>`;
    }).join("")}</section>`;
  } else {
    const b = list[0];
    if (b) h += `<p class="small muted" style="padding:0 4px">${esc(b.product || "")}${b.goal ? " · 목표 " + esc(b.goal) : ""}${b.breakeven ? ` · 손익분기 구매당 광고비 <span class="num">${won(b.breakeven)}</span>원` : b.breakevenNote ? " · " + esc(b.breakevenNote) : ""}${b.note ? "<br>" + esc(b.note) : ""}</p>`;
  }
  const hi = T.filter(x => x.lv !== "low"), lo = T.filter(x => x.lv === "low");
  h += `<section class="card"><h2>조율할 일 · ${hi.length}</h2>${hi.length ? hi.map(x => todoRow(x, many)).join("") : `<p class="empty">지금 손댈 일이 없어요. 숫자가 기준을 넘으면 여기에 떠요.</p>`}</section>`;
  if (lo.length) h += `<section class="card"><h2>참고 · 준비 중 ${lo.length}</h2>${lo.map(x => todoRow(x, many)).join("")}</section>`;
  const nv = NV(), st = D.store || {};
  const hasStore = list.some(b => b.store), hasPlan = list.some(b => b.plan);
  h += `<p class="small muted" style="text-align:center;padding:0 8px">${hasPlan ? `네이버 숫자 ${nv.ok ? ago(nv.at) : "못 받음"}${hasStore ? ` · 스토어 주문 ${st.ok ? ago(st.at) : "연결 안 됨"}` : ""} · 메타·구글은 주간 리뷰 숫자<br>` : ""}이 앱은 광고를 바꾸지 않아요. 「Brainy와 조율」로 제안을 받고, 승인한 것만 Brainy가 적용해요.</p>`;
  return h;
}
