/* ── 「지표」 탭 — 브랜드마다 숫자를 한 장에 (build.py 가 ads.html 에 끼움) ──
   ① 네이버 7일·누적·오늘 (노출·클릭·CTR·CPC·광고비·순위) ② 손익 기준 (판매가·마진·손익분기·전환율·허용 CPC)
   ③ 매체별 결과 표 (네이버 실시간 + 메타·구글 주간 숫자 · 결과당 광고비 · 계약률) ④ 예산 비중 계획 vs 실제
   ⑤ 14일 추이 ⑥ 측정 준비(공통 기반 태스크) · 용어 풀이. 숫자는 API·볼트 그대로, 판단은 점검 탭에서. */
const statBox = (k, v, s) => `<div class="stat"><span class="k">${esc(k)}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ""}</div>`;
function chTable(b){
  const pr = product(b), t = totalsOf([b]);
  const rows = chOrder().map(ch => {
    const st = chState(b, ch);
    if (ch === "naver" && t.camps) { const o = b.store ? storeOrders([b]) : null;
      return `<tr><td>${esc(chName(ch))} ${stPill(st)}</td><td class="n">${won(t.s7.cost)}</td><td class="n">${won(t.s7.clk)}</td><td class="n">${ctrTxt(t.s7)}</td><td class="n">${cpcTxt(t.s7)}</td><td class="n">${o ? (o.ok ? won(o.n14) + " (14일)" : "미연결") : "—"}</td><td class="n">—</td><td>최근 7일 · API</td></tr>`; }
    const m = metricOf(b, ch);
    if (!m) return `<tr><td>${esc(chName(ch))} ${stPill(st)}</td><td class="n" colspan="6">${hasSlot(b, ch) ? "숫자 없음 — 주간 통합 리뷰가 채워요" : st.k === "none" || st.t === "안 함" ? "집행하지 않음" : "—"}</td><td></td></tr>`;
    const res = pr ? m[pr.resultField] : m.result;
    return `<tr><td>${esc(chName(ch))} ${stPill(st)}</td><td class="n">${won(m.spend)}</td><td class="n">${won(m.clicks)}</td><td class="n">${m.clicks && m.impressions ? (m.clicks / m.impressions * 100).toFixed(2) + "%" : "—"}</td><td class="n">${m.spend && m.clicks ? won(m.spend / m.clicks) + "원" : "—"}</td><td class="n">${won(res)}</td><td class="n">${m.spend && res ? won(m.spend / res) : "—"}</td><td>${esc(m.period || m.week || "")}</td></tr>`;
  }).join("");
  return `<div class="tbl"><table><thead><tr><th>매체</th><th class="n">광고비</th><th class="n">클릭</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">${esc(pr ? pr.resultLabel : "결과")}</th><th class="n">${esc(pr ? pr.metric : "결과당")}</th><th>기간</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function shareBars(b){
  const share = b.plan ? ((PLAN().budgetShare || {})[b.plan]) : null; if (!share) return "";
  const spend = { naver: totalsOf([b]).s7.cost }; chOrder().forEach(ch => { if (ch !== "naver") { const m = metricOf(b, ch); spend[ch] = m && m.spend ? m.spend : 0; } });
  const tot = Object.values(spend).reduce((a, v) => a + v, 0);
  return `<h2 style="margin:16px 0 6px">예산 비중 · 계획 vs 실제</h2>${chOrder().map(ch => { const p = share[ch] || 0, r = tot ? spend[ch] / tot * 100 : 0;
    return `<div class="share"><span>${esc(chName(ch))}</span><div class="sb"><i class="plan" style="width:${p}%"></i><i class="real" style="width:${r}%"></i></div><span class="num">${p}% · <b>${Math.round(r)}%</b></span></div>`; }).join("")}
    <p class="small muted">위 막대 = 계획(광고 실습 예산 비중) · 아래 = 실제 광고비 비중 · ${esc((PLAN().budgetShare || {}).note || "")}</p>`;
}
function trend(b){
  const days = {}; campsOf(b).forEach(c => (c.daily || []).forEach(d => { const x = days[d.d] || (days[d.d] = { d: d.d, cost: 0, clk: 0, imp: 0 }); x.cost += d.cost; x.clk += d.clk; x.imp += d.imp; }));
  const L = Object.values(days).sort((x, y) => x.d < y.d ? -1 : 1); if (!L.length) return "";
  const max = Math.max(0, ...L.map(d => d.cost));
  return `<h2 style="margin:16px 0 0">최근 14일 · 광고비 막대</h2><div class="bars" role="img" aria-label="최근 14일 하루 광고비">${L.map(d => `<i class="${d.cost ? "" : "zero"}" style="height:${max ? Math.max(2, d.cost / max * 100) : 2}%" title="${esc(d.d)} · ${won(d.cost)}원 · 클릭 ${d.clk} · 노출 ${won(d.imp)}"></i>`).join("")}</div>
    <div class="barcap"><span>${esc(L[0].d.slice(5))}</span><span>${max ? `최고 ${won(max)}원` : "14일 동안 0원"} · 클릭 ${won(L.reduce((a, d) => a + d.clk, 0))}</span><span>${esc(L[L.length - 1].d.slice(5))}</span></div>`;
}
function renderMetrics(){
  let h = "";
  selBrands().forEach(b => {
    const t = totalsOf([b]), cap = maxCpc(b), base = baseTasks(b);
    h += `<section class="card"><div class="part"><h2>${esc(b.name)}</h2><small>${esc(b.product || "")}</small></div>`;
    if (!b.plan && !t.camps) { h += `<p class="empty">광고 계획이 없는 브랜드예요. ${esc(b.note || "")}</p></section>`; return; }
    if (t.camps) h += `<div class="stats">
        ${statBox("광고비 7일", won(t.s7.cost) + "원", `오늘 ${won(t.today.cost)}원 / 일예산 ${won(t.budget)}원`)}
        ${statBox("노출 · 클릭 7일", `${won(t.s7.imp)} · ${won(t.s7.clk)}`, `누적 ${won(t.all.imp)} · ${won(t.all.clk)}`)}
        ${statBox("CTR 7일", ctrTxt(t.s7), `누적 ${ctrTxt(t.all)}`)}
        ${statBox("CPC 7일", cpcTxt(t.s7), `누적 ${cpcTxt(t.all)}${cap ? ` · 허용 ${won(cap)}원` : ""}`)}
        ${statBox("평균 순위 7일", t.s7.rank ? t.s7.rank + "위" : "—", `누적 ${t.all.rank || "—"}위`)}
        ${statBox("누적 광고비", won(t.all.cost) + "원", `켜진 캠페인 ${t.on}/${t.camps}`)}
      </div>`;
    if (b.breakeven || b.breakevenNote) h += `<h2 style="margin:16px 0 6px">손익 기준</h2><div class="stats">
        ${b.price ? statBox("판매가", won(b.price) + "원", "") : ""}${b.margin ? statBox("마진율", b.margin + "%", "손익분기 ACoS") : ""}
        ${statBox(product(b) ? product(b).metric + " 손익분기" : "손익분기", b.breakeven ? won(b.breakeven) + "원" : "—", b.breakeven ? "" : esc(b.breakevenNote || ""))}
        ${b.cvr ? statBox("전환율", b.cvr + "%", "가정") : ""}${cap ? statBox("허용 CPC", won(cap) + "원", "손익분기 × 전환율") : ""}</div>${b.cvrNote ? `<p class="small muted" style="margin-top:6px">${esc(b.cvrNote)}</p>` : ""}`;
    h += `<h2 style="margin:16px 0 6px">매체별 결과</h2>${chTable(b)}`;
    h += shareBars(b) + trend(b);
    if (base.length) h += `<h2 style="margin:16px 0 4px">측정 준비 · ${base.filter(x => x.status === "완료").length}/${base.length}</h2><div>${base.map(x => `<a class="row ${x.status === "완료" ? "ok" : x.status === "진행" ? "info" : "none"}" href="../ad/#book/${encodeURIComponent(x.id)}" style="text-decoration:none;color:inherit"><span class="ct"><b>${esc(taskName(x))}</b><span>광고 실습 교과서에서 열기</span></span><span class="tags"><span class="pill">${esc(x.status || "할일")}</span></span></a>`).join("")}</div>`;
    h += `</section>`;
  });
  const G = PLAN().glossary || [];
  if (G.length) h += `<section class="card"><details class="fold"><summary><h2>지표 용어 ${G.length}</h2></summary><ul class="plain">${G.map(g => `<li><b>${esc(g.term)}</b> — ${esc(g.desc)}</li>`).join("")}</ul><p class="small muted" style="margin-top:6px">정본: 광고 실습 계획 용어</p></details></section>`;
  return h;
}
