/* ── 「지도」 탭 — 브랜드 × 매체 전부, 상태 색으로 + 캠페인 자세히 (build.py 가 ads.html 에 끼움) ──
   네이버 줄은 실제 캠페인(API), 메타·구글 줄은 볼트 JSON 상태 + 광고 실습 계획 metrics(주간 리뷰 숫자).
   태스크 칩은 그 매체를 잇는 볼트 32_태스크 (광고 실습 앱과 같은 ad.data). 캠페인을 누르면 자세히. */
function chNums(b, ch){
  if (ch === "naver") {
    const t = totalsOf([b]);
    return t.camps ? `<div class="figs"><span>7일 <i>${won(t.cost7)}원</i> · 클릭 <i>${won(t.clk7)}</i></span><span>누적 <i>${won(t.costAll)}원</i> · 클릭 <i>${won(t.clkAll)}</i></span></div>` : "";
  }
  const m = metricOf(b, ch);
  if (m) return `<div class="figs"><span>${esc(m.week || "")} 주 광고비 <i>${won(m.spend)}원</i></span><span>${esc(b.resultLabel || "결과")} <i>${won(m.result)}</i>${m.contracts != null ? ` · 계약 <i>${won(m.contracts)}</i>` : ""}</span></div>`;
  return hasSlot(b, ch) ? `<div class="figs"><span>숫자 없음 — 주간 통합 리뷰가 채워요</span></div>` : "";
}
function taskChips(b, ch){
  const ids = ((b.channels || {})[ch] || {}).tasks || [];
  if (!ids.length) return "";
  return `<div class="tasklist">${ids.map(id => { const t = taskBy(id); return `<span class="pill ${t && t.status === "완료" ? "run" : t && t.status === "진행" ? "prep" : ""}" title="${esc(t ? t.title : id)}">${esc(id)} ${esc(t ? taskName(t).slice(0, 14) : "")}${t ? " · " + esc(t.status || "할일") : ""}</span>`; }).join("")}</div>`;
}
const campRow = c => `<button type="button" class="row ${c.on ? "run" : "none"}" data-camp="${esc(c.id)}" aria-label="${esc(c.name)} 자세히">
  <span class="ct"><b>${esc(c.name)}</b><span>${c.type === "SHOPPING" ? "쇼핑검색" : c.type === "POWER_CONTENTS" ? "파워콘텐츠" : "파워링크"}${c.budget ? ` · 일예산 ${won(c.budget)}원` : ""} · ${esc(c.start)}부터</span>
  <span class="figs"><span>7일 <i>${won(c.s7.cost)}원</i> · 노출 <i>${won(c.s7.imp)}</i> · 클릭 <i>${won(c.s7.clk)}</i></span>${c.all ? `<span>누적 <i>${won(c.all.cost)}원</i> · 클릭 <i>${won(c.all.clk)}</i></span>` : ""}</span></span>
  <span class="tags">${stPill({ k: c.on ? "run" : "stop", t: c.on ? "켜짐" : "꺼 둠" })}</span></button>`;
function renderMap(){
  let h = `<div class="legend" aria-label="색 뜻" style="padding:0 4px">${["run", "stop", "prep", "none"].map(k => `<span><i class="${k}"></i>${STATE[k]}</span>`).join("")}</div>`;
  selBrands().forEach(b => {
    const camps = campsOf(b).sort((x, y) => (y.on - x.on) || (y.all ? 1 : 0) - (x.all ? 1 : 0));
    h += `<section class="card"><div class="part"><h2>${esc(b.name)}</h2><small>${esc(b.product || "")}</small></div>${b.note ? `<p class="small muted">${esc(b.note)}</p>` : ""}
      <div style="margin-top:8px">${chOrder().map(ch => { const st = chState(b, ch), conf = (b.channels || {})[ch] || {};
        return `<div class="chrow"><b>${esc(chName(ch))}</b><div><div class="btns" style="gap:6px;align-items:center">${stPill(st)}${st.sub ? `<span class="small muted">${esc(st.sub)}</span>` : ""}</div>
          ${conf.plan ? `<p class="plan" style="margin-top:4px">${esc(conf.plan)}</p>` : ""}${chNums(b, ch)}${taskChips(b, ch)}</div></div>`; }).join("")}</div>
      ${camps.length ? `<h2 style="margin:14px 0 4px">네이버 캠페인 ${camps.length}</h2><div>${camps.map(campRow).join("")}</div>` : ""}</section>`;
  });
  return h;
}
/* ── 캠페인 자세히 ── */
function renderCamp(c){
  const b = brandOf(c), G = groupsOf(c), K = (NV().keywords || []).filter(k => k.camp === c.id);
  const ctr = c.all && c.all.imp ? (c.all.clk / c.all.imp * 100).toFixed(2) + "%" : "—", cpc = c.all && c.all.clk ? won(c.all.cost / c.all.clk) + "원" : "—";
  const days = c.daily || [], max = Math.max(1, ...days.map(d => d.cost));
  let h = `<div><button type="button" class="back" data-back>← 돌아가기</button></div>
    <section class="card"><div class="btns" style="gap:6px;align-items:center">${stPill({ k: c.on ? "run" : "stop", t: c.on ? "켜짐" : "꺼 둠" })}<span class="small muted">${esc(b ? b.name : "")} · 네이버</span></div>
      <h3 style="margin-top:6px">${esc(c.name)}</h3>
      <p class="small muted">${c.budget ? `일예산 ${won(c.budget)}원 · ` : ""}${esc(c.start)}부터 · 전환추적 ${c.tracking ? "켜짐" : "꺼짐"}</p>
      <div class="stats">
        <div class="stat"><span class="k">광고비 7일</span><span class="v">${won(c.s7.cost)}</span><span class="s">원 · 하루 ${won(c.s7.cost / 7)}</span></div>
        <div class="stat"><span class="k">클릭 7일</span><span class="v">${won(c.s7.clk)}</span><span class="s">노출 ${won(c.s7.imp)}</span></div>
        ${c.all ? `<div class="stat"><span class="k">누적 광고비</span><span class="v">${won(c.all.cost)}</span><span class="s">원 · CPC ${cpc}</span></div>
        <div class="stat"><span class="k">누적 클릭</span><span class="v">${won(c.all.clk)}</span><span class="s">노출 ${won(c.all.imp)} · CTR ${ctr}</span></div>` : ""}
      </div>
      ${days.length ? `<h2 style="margin:14px 0 0">최근 14일 광고비</h2><div class="bars" role="img" aria-label="최근 14일 하루 광고비">${days.map(d => `<i class="${d.cost ? "" : "zero"}" style="height:${Math.max(2, d.cost / max * 100)}%" title="${esc(d.d)} · ${won(d.cost)}원 · 클릭 ${d.clk}"></i>`).join("")}</div><div class="barcap"><span>${esc((days[0] || {}).d || "")}</span><span>최고 ${won(max)}원</span><span>${esc((days[days.length - 1] || {}).d || "")}</span></div>` : ""}
      <div class="btns" style="margin-top:14px">${askBtn(`광고 한눈에 — ${b ? b.name : ""} 네이버 「${c.name}」 캠페인을 점검해 줘: 지금 상태·노출 추이·광고그룹별로 손볼 곳.` + ASK_TAIL, "✦ Brainy와 이 캠페인 조율", "primary")}</div></section>`;
  if (G.length) h += `<section class="card"><h2>광고그룹 ${G.length}</h2>${G.map(g => {
      const ks = K.filter(k => k.group === g.id), J = ks.map(k => judgeKw(k, b).code), cnt = code => J.filter(x => x === code).length;
      return `<div class="row ${!g.on ? "none" : cnt("stop") ? "high" : cnt("watch") || cnt("core") ? "mid" : "run"}"><div class="ct"><b>${esc(g.name)}</b>
        <span>입찰 ${won(g.bid)}원 · 키워드 ${ks.length}개${cnt("stop") ? ` · 정지 후보 ${cnt("stop")}` : ""}${cnt("watch") ? ` · 조정 구간 ${cnt("watch")}` : ""}</span>
        <span class="figs"><span>누적 광고비 <i>${won(g.all.cost)}원</i> · 클릭 <i>${won(g.all.clk)}</i> · 노출 <i>${won(g.all.imp)}</i></span></span></div>
        <div class="tags">${stPill({ k: g.on ? "run" : "stop", t: g.on ? "켜짐" : "꺼 둠" })}</div></div>`; }).join("")}</section>`;
  else if (!c.all) h += `<section class="card"><p class="empty">오래 꺼 둔 캠페인이라 광고그룹·키워드는 받지 않았어요.</p></section>`;
  return h;
}
