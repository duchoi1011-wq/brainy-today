/* ── 「기록」 탭 — 바꾼 것 · 판정 기준 · 숫자 출처 (build.py 가 ads.html 에 끼움) ──
   변경 기록 정본은 볼트 광고 한눈에.json 의 changes (Brainy가 적용한 뒤 한 줄씩 위에 더함). 기준 글은 hub.rules.lines. */
function renderLog(){
  const ids = new Set(selBrands().map(b => b.id)), C = (D.hub.changes || []).filter(c => ids.has(c.brand));
  const nv = NV(), st = D.store || {}, o = storeOrders(selBrands()), R = rules();
  let h = `<section class="card"><h2>바꾼 것 · ${C.length}</h2>${C.length ? C.map(c => { const b = brands().find(x => x.id === c.brand);
      return `<div class="logline"><span class="d">${esc(c.d)}</span><div><b style="font-weight:600">${esc(c.t)}</b><p class="small muted">${esc((b ? (b.short || b.name) + " · " : "") + chName(c.ch))}${c.why ? " — " + esc(c.why) : ""}</p></div></div>`; }).join("") : `<p class="empty">이 브랜드는 아직 바꾼 기록이 없어요.</p>`}
    <p class="small muted" style="margin-top:8px">Brainy가 승인받아 적용하면 볼트 「광고 한눈에.json」에 한 줄씩 더해요.</p></section>`;
  h += `<section class="card"><h2>판정 기준</h2><ul class="plain">${(R.lines || []).map(l => `<li>${esc(l)}</li>`).join("")}</ul>${R.doc ? `<p class="small muted" style="margin-top:8px">정본: 볼트 ${esc(R.doc)}</p>` : ""}</section>`;
  h += `<section class="card"><h2>숫자 출처</h2>
    <div class="row ${nv.ok ? "run" : "high"}"><div class="ct"><b>네이버 검색광고</b><span>${nv.ok ? `${ago(nv.at)} 받음 · 캠페인 ${(nv.campaigns || []).length} · 광고그룹 ${(nv.groups || []).length} · 키워드 ${(nv.keywords || []).length}` : "못 받음 — " + esc(nv.error || "")}</span><span>맥이 30분마다 API에서 받아요 (읽기만). 누적은 캠페인 켠 날부터, 92일까지.</span></div></div>
    ${o.none ? "" : `<div class="row ${o.ok ? "run" : "mid"}"><div class="ct"><b>스마트스토어 주문</b><span>${o.ok ? `${ago(o.at)} 받음 · ${esc(o.period || "")} 주문 ${won(o.n)}건 · ${won(o.amount)}원` : "연결 안 됨"}</span><span>${o.ok ? o.products.slice(0, 3).map(p => esc(p.name) + " " + p.qty + "개").join(" · ") : esc(storeWhy(o.err))}</span></div></div>`}
    <div class="row ${Object.keys((D.metrics || {}).values || {}).length ? "run" : "none"}"><div class="ct"><b>메타 · 구글</b><span>${Object.keys((D.metrics || {}).values || {}).length ? "주간 통합 리뷰 숫자" : "아직 숫자 없음 — 두 매체 모두 준비 단계"}</span><span>정본: 볼트 광고 실습 계획.json metrics (주간 통합 리뷰가 채움)</span></div></div>
    <p class="small muted" style="margin-top:8px">브랜드·매체 상태·기준·기록 정본: 볼트 4_Outputs/광고 한눈에 앱/광고 한눈에.json · 화면 갱신 ${ago(D.updatedAt)}</p></section>`;
  return h;
}
