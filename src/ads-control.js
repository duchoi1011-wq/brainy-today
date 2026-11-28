/* ── 「조율」 탭 — 캠페인 → 광고그룹 → 키워드를 보며 바로 바꾼다 (build.py 가 ads.html 에 끼움) ──
   바꿀 수 있는 것: 켜기·끄기 · 입찰가(그룹·키워드) · 일예산(캠페인). 누르면 한 줄 확인 → ah.req 요청 → 맥이 limits·허용 CPC 안에서 적용 (ads-req.js).
   키워드 거르기(S.kf): act 손볼 것(판정 대상·품질 낮음·상한 넘음) · live 켜진 것 · qlow 품질지수 1~2 · over 허용 CPC 넘음 · 판정 이름 · all 전체. S.grp = 광고그룹 하나만. */
const KF = [["act", "손볼 것"], ["live", "켜진 것"], ["qlow", "품질 낮음"], ["over", "상한 넘음"], ["stop", KJ.stop.name], ["watch", KJ.watch.name], ["wait", KJ.wait.name], ["off", KJ.off.name], ["all", "전체"]];
function keepK(x, b){
  const f = S.kf, cap = maxCpc(b), live = x.j.code !== "off";
  if (S.grp && x.k.group !== S.grp) return false;
  if (f === "all") return true;
  if (f === "live") return live;
  if (f === "qlow") return live && x.k.qi && x.k.qi <= 2;
  if (f === "over") return live && cap && x.k.bid > cap;
  if (f === "act") return ["stop", "core", "watch", "win"].includes(x.j.code) || (live && ((x.k.qi && x.k.qi <= 2) || (cap && x.k.bid > cap)));
  return x.j.code === f;
}
function budgetCtl(c, b){
  const L = LIM(), step = 1000, lo = L.budgetMin || 1000, hi = L.budgetMax || 0, cur = c.budget || 0;
  const base = { kind: "budget", type: "campaign", id: c.id, name: c.name, brand: b.id, from: cur };
  return `<span class="ctl">${rqBtn({ ...base, to: Math.max(lo, cur - step) }, "−1,000")}<input class="bidin" type="number" inputmode="numeric" min="${lo}" max="${hi}" step="${step}" value="${cur}" aria-label="${esc(c.name)} 일예산" data-bidin="${RQ.length}">${rqBtn({ ...base, to: cur }, "적용")}${rqBtn({ ...base, to: Math.min(hi, cur + step) }, "+1,000")}</span>
    <span class="small muted">일예산 ${won(lo)}~${won(hi)}원 안에서 (상한은 볼트 정본)</span>`;
}
function campCard(c, b){
  const G = groupsOf(c);
  return `<section class="card"><div class="btns" style="gap:6px;align-items:center">${stPill({ k: c.on ? "run" : "stop", t: c.on ? "켜짐" : "꺼 둠" })}${pendTag("campaign", c.id)}</div>
    <h3 style="margin-top:6px">${esc(c.name)}</h3>
    <p class="small muted">${c.type === "SHOPPING" ? "쇼핑검색" : c.type === "POWER_CONTENTS" ? "파워콘텐츠" : "파워링크"} · ${esc(since(c))} · 전환추적 ${c.tracking ? "켜짐" : "꺼짐"}</p>
    <div class="figs" style="margin-top:4px"><span>7일 광고비 <i>${won(c.s7.cost)}원</i></span><span>노출 <i>${won(c.s7.imp)}</i></span><span>클릭 <i>${won(c.s7.clk)}</i></span><span>CTR <i>${ctrTxt(c.s7)}</i></span><span>CPC <i>${cpcTxt(c.s7)}</i></span>${c.today ? `<span>오늘 <i>${won(c.today.cost)}원</i></span>` : ""}</div>
    <div class="ctlrow"><span class="lbl">캠페인</span>${onBtn("campaign", c, b)}</div>
    ${c.budget != null ? `<div class="ctlrow"><span class="lbl">일예산</span>${budgetCtl(c, b)}</div>` : ""}
    ${G.length ? `<h2 style="margin:14px 0 4px">광고그룹 ${G.length}</h2>${G.map(g => { const ks = (NV().keywords || []).filter(k => k.group === g.id);
      return `<div class="row ${!g.on || !c.on ? "stop" : "ok"}"><div class="ct"><b>${esc(g.name)}</b>
        <span>${c.type === "SHOPPING" ? "쇼핑검색이라 키워드 없음" : `키워드 ${ks.length}개`} · 입찰 ${won(g.bid)}원${!c.on ? " · 캠페인 꺼짐" : ""}</span>
        <span class="figs"><span>7일 노출 <i>${won(g.s7 ? g.s7.imp : 0)}</i> · 클릭 <i>${won(g.s7 ? g.s7.clk : 0)}</i> · CTR <i>${ctrTxt(g.s7)}</i></span><span>누적 <i>${won(g.all.cost)}원</i> · 클릭 <i>${won(g.all.clk)}</i> · CPC <i>${cpcTxt(g.all)}</i></span></span>
        ${pendTag("group", g.id)}
        <div class="ctlrow">${bidCtl("group", g, b, g.bid || 0)}${onBtn("group", g, b)}${ks.length ? `<button type="button" class="btn sm" data-grp="${esc(g.id)}">키워드 보기</button>` : ""}</div></div>
        <div class="tags">${stPill(!c.on ? { k: "stop", t: "캠페인 꺼짐" } : { k: g.on ? "run" : "stop", t: g.on ? "켜짐" : "꺼 둠" })}</div></div>`; }).join("")}` : ""}
  </section>`;
}
function kwRow(x, b){
  const k = x.k, j = x.j, R = rules(), g = groupBy(k.group), cap = maxCpc(b), scale = Math.max(R.stop * 1.2, k.all.clk), info = KJ[j.code];
  const note = j.code === "wait" ? `조정 기준(${R.adjust}클릭)까지 ${j.left}클릭 남음` : j.code === "watch" ? `정지 기준(${R.stop}클릭)까지 ${j.left}클릭 남음` : info.how;
  return `<div class="row ${info.lv || (j.code === "off" ? "none" : "")}"><div class="ct">
    <b>${esc(k.kw)}</b><span>${esc(g ? g.name : "")} · 입찰 ${won(k.bid)}원${k.groupBid ? "(그룹 값)" : ""}${cap && k.bid > cap ? ` · <span style="color:var(--s-bad)">허용 ${won(cap)}원 넘음</span>` : ""}${k.qi ? ` · 품질지수 ${k.qi}/7` : ""}${k.inspect && k.inspect !== "APPROVED" ? " · 검수 " + esc(k.inspect) : ""}</span>
    <span class="figs"><span>7일 노출 <i>${won(k.s7 ? k.s7.imp : 0)}</i> · 클릭 <i>${won(k.s7 ? k.s7.clk : 0)}</i> · CTR <i>${ctrTxt(k.s7)}</i></span><span>누적 클릭 <i>${won(k.all.clk)}</i> · 광고비 <i>${won(k.all.cost)}원</i> · CPC <i>${cpcTxt(k.all)}</i>${k.all.rank ? ` · 순위 <i>${k.all.rank}</i>` : ""}</span></span>
    ${j.code !== "off" ? `<div class="meter" aria-hidden="true"><i style="width:${Math.min(100, k.all.clk / scale * 100)}%"></i><b style="left:${R.adjust / scale * 100}%"></b><b style="left:${R.stop / scale * 100}%"></b></div>` : ""}
    <span style="margin-top:4px">${esc(note)}</span>${pendTag("keyword", k.id)}
    <div class="ctlrow">${bidCtl("keyword", k, b, k.bid || 0)}${onBtn("keyword", k, b)}</div></div>
    <div class="tags"><span class="pill ${info.lv}">${esc(info.name)}</span></div></div>`;
}
function renderControl(){
  const list = selBrands().filter(b => campsOf(b).length);
  if (!list.length) return `<section class="card"><p class="empty">고른 브랜드에 네이버 캠페인이 없어요. 메타·구글은 아직 이 앱에서 바꿀 수 없어요 — 광고 관리자에서 직접.</p></section>`;
  const off = /맥 꺼짐/.test(document.body.innerText || "");   // 받침(shim.js)의 동기화 표시 글을 읽는다
  let h = (off ? `<section class="card" style="border-color:var(--s-stop)"><p><b>지금 맥이 꺼져 있어요.</b> 요청은 남지만 맥이 켜질 때 적용돼요.</p></section>` : "") + `<p class="small muted" style="padding:0 4px">누르면 한 줄로 확인한 뒤 요청을 남기고, 맥이 네이버에 적용해요(1분 안). 입찰은 ${won(LIM().bidMin || 70)}원~허용 CPC, 일예산은 ${won(LIM().budgetMin || 1000)}~${won(LIM().budgetMax || 0)}원 안에서만 돼요. 적용한 것은 기록 탭에서 되돌릴 수 있어요.</p>`;
  list.forEach(b => {
    const C = campsOf(b), on = C.filter(c => c.on), off = C.filter(c => !c.on);
    h += on.map(c => campCard(c, b)).join("");
    if (off.length) h += `<section class="card"><details class="fold"><summary><h2>${esc(b.short || b.name)} · 꺼 둔 캠페인 ${off.length}</h2></summary>${off.map(c => `<div class="row stop"><div class="ct"><b>${esc(c.name)}</b><span>${esc(since(c))}${c.budget ? ` · 일예산 ${won(c.budget)}원` : ""}</span>${pendTag("campaign", c.id)}<div class="ctlrow">${onBtn("campaign", c, b)}</div></div></div>`).join("")}</details></section>`;
    const J = kwsOf(b).map(k => ({ k, j: judgeKw(k, b) }));
    if (!J.length) return;
    const cnt = f => { const k = S.kf; S.kf = f; const n = J.filter(x => keepK(x, b)).length; S.kf = k; return n; };
    const L = J.filter(x => keepK(x, b)).sort((x, y) => KJ_ORDER.indexOf(x.j.code) - KJ_ORDER.indexOf(y.j.code) || y.k.all.clk - x.k.all.clk || (y.k.s7 ? y.k.s7.imp : 0) - (x.k.s7 ? x.k.s7.imp : 0));
    const shown = S.kwMore ? L : L.slice(0, 30), g = S.grp && groupBy(S.grp);
    h += `<section class="card"><div class="part"><h2>${esc(b.short || b.name)} · 키워드</h2><small>${L.length}개</small></div>
      ${g ? `<p class="small" style="margin-bottom:6px">광고그룹 「${esc(g.name)}」만 <button type="button" class="linkbtn" data-grp="">모든 그룹 보기</button></p>` : ""}
      <div class="filt" role="group" aria-label="키워드 거르기">${KF.map(([f, t]) => `<button type="button" class="chip ${S.kf === f ? "on" : ""}" data-kf="${f}" aria-pressed="${S.kf === f}">${esc(t)}<b>${cnt(f)}</b></button>`).join("")}</div>
      <p class="small muted" style="margin:6px 0">판정은 켠 날부터 쌓인 클릭으로 — ${rules().adjust}번이면 조정, ${rules().stop}번에 전환 0이면 정지. 막대의 눈금 두 개가 ${rules().adjust}·${rules().stop}.</p>
      ${L.length ? shown.map(x => kwRow(x, b)).join("") + (L.length > shown.length ? `<button type="button" class="more" data-kwmore>나머지 ${L.length - shown.length}개 더 보기</button>` : "")
        : S.kf === "act" ? `<p class="empty">손볼 키워드가 없어요 — 아직 ${rules().adjust}클릭을 넘은 것이 없고, 품질지수·입찰 상한도 괜찮아요. 「켜진 것」에서 하나씩 볼 수 있어요.</p>` : `<p class="empty">이 거르기에 맞는 키워드가 없어요.</p>`}
      ${L.length && S.kf !== "off" ? `<div class="btns" style="margin-top:10px">${askBtn(`광고 한눈에 — ${b.name} 네이버: 조율 탭 「${(KF.find(f => f[0] === S.kf) || [])[1]}」 키워드 ${L.length}개. 손볼 순서와 조정안을 줘. 목록: ${L.slice(0, 25).map(x => `${x.k.kw}(누적 클릭 ${x.k.all.clk}·${won(x.k.all.cost)}원·입찰 ${x.k.bid}·품질 ${x.k.qi || "?"}·${KJ[x.j.code].name})`).join(", ")}${L.length > 25 ? " …" : ""}.` + ASK_TAIL(), "✦ 이 목록으로 Brainy와 조율", "sm")}</div>` : ""}</section>`;
  });
  return h;
}
