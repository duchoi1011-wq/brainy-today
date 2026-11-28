/* ── 「기록」 탭 — 조율 요청 · 바꾼 것 · 판정 기준 · 숫자 출처 (build.py 가 ads.html 에 끼움) ──
   요청은 ah.req (앱이 남기고 맥이 적용 · 하루 지나면 맥이 지움). 바꾼 것 정본은 볼트 광고 한눈에.json 의 changes.
   되돌리기 = 적용된 요청의 before 값으로 새 요청 (한 줄 확인 뒤). */
function renderLog(){
  const ids = new Set(selBrands().map(b => b.id)), C = (D.hub.changes || []).filter(c => ids.has(c.brand));
  const Q = Object.entries(REQ).filter(([, q]) => ids.has(q.brand)).sort((a, b) => (b[1].at || "") < (a[1].at || "") ? -1 : 1);
  const nv = NV(), o = storeOrders(selBrands()), R = rules();
  let h = "";
  if (Q.length) h += `<section class="card"><h2>조율 요청 · ${Q.length}</h2>${Q.map(([id, q]) => `<div class="row ${q.status === "적용" ? "ok" : q.status === "실패" ? "bad" : "info"}"><div class="ct">
      <b>${esc(q.name)} — ${REQ_WORD[q.kind]} ${q.before != null || q.from != null ? reqFmt(q.kind, q.before ?? q.from) + " → " : ""}${reqFmt(q.kind, q.to)}</b>
      <span>${esc((q.at || "").slice(5, 16).replace("T", " "))} 요청${q.done ? " · " + esc(q.done.slice(5, 16).replace("T", " ")) + " " + esc(q.status) : ""}</span>
      ${q.status === "실패" ? `<p class="why">${esc(q.error || "")}</p>` : q.status === "요청" ? `<p class="why">맥이 적용하기를 기다려요 (맥이 꺼져 있으면 켜질 때).</p>` : ""}
      ${q.status === "적용" && q.before != null ? `<div class="btns act">${rqBtn({ kind: q.kind, type: q.type, id: q.id, name: q.name, brand: q.brand, from: q.to, to: q.before, why: "되돌리기" }, "되돌리기", "sm")}</div>` : ""}
    </div><div class="tags"><span class="pill ${q.status === "적용" ? "ok" : q.status === "실패" ? "bad" : "info"}">${esc(q.status)}</span></div></div>`).join("")}
    <p class="small muted" style="margin-top:8px">끝난 요청은 하루 뒤 이 목록에서 빠지고, 아래 「바꾼 것」에 남아요.</p></section>`;
  h += `<section class="card"><h2>바꾼 것 · ${C.length}</h2>${C.length ? C.map(c => { const b = brands().find(x => x.id === c.brand);
      return `<div class="logline"><span class="d">${esc(c.d)}</span><div><b style="font-weight:600">${esc(c.t)}</b><p class="small muted">${esc((b ? (b.short || b.name) + " · " : "") + chName(c.ch))}${c.why ? " — " + esc(c.why) : ""}</p></div></div>`; }).join("") : `<p class="empty">이 브랜드는 아직 바꾼 기록이 없어요.</p>`}
    <p class="small muted" style="margin-top:8px">앱에서 바꾼 것은 맥이, Brainy가 바꾼 것은 Brainy가 볼트 「광고 한눈에.json」에 한 줄씩 더해요.</p></section>`;
  if (selBrands().some(b => b.plan)) h += `<section class="card"><h2>판정 기준</h2><ul class="plain">${(R.lines || []).map(l => `<li>${esc(l)}</li>`).join("")}</ul>${R.doc ? `<p class="small muted" style="margin-top:8px">정본: 볼트 ${esc(R.doc)}</p>` : ""}</section>`;
  h += `<section class="card"><h2>숫자 출처</h2>
    <div class="row ${nv.ok ? "ok" : "bad"}"><div class="ct"><b>네이버 검색광고</b><span>${nv.ok ? `${ago(nv.at)} 받음 · 캠페인 ${(nv.campaigns || []).length} · 광고그룹 ${(nv.groups || []).length} · 키워드 ${(nv.keywords || []).length}` : "못 받음 — " + esc(nv.error || "")}</span><span>맥이 30분마다 API에서 받아요(바꾼 직후엔 바로). 누적은 캠페인 켠 날부터, 최대 92일. 오래 꺼 둔 캠페인은 광고그룹·키워드를 받지 않아요.</span></div></div>
    ${o.none ? "" : `<div class="row ${o.ok ? "ok" : "warn"}"><div class="ct"><b>스마트스토어 주문</b><span>${o.ok ? `${ago(o.at)} 받음 · ${esc(o.period || "")} 주문 ${won(o.n)}건 · ${won(o.amount)}원` : "미연결"}</span><span>${o.ok ? o.products.slice(0, 3).map(p => esc(p.name) + " " + p.qty + "개").join(" · ") : esc(storeWhy(o.err))}</span></div></div>`}
    <div class="row ${Object.keys((D.metrics || {}).values || {}).length ? "ok" : "none"}"><div class="ct"><b>메타 · 구글 · 이벤트랩 결과</b><span>${Object.keys((D.metrics || {}).values || {}).length ? "주간 통합 리뷰 숫자" : "아직 숫자 없음 — 두 매체 모두 준비 단계"}</span><span>정본: 볼트 광고 실습 계획.json metrics (주간 통합 리뷰가 채움)</span></div></div>
    <p class="small muted" style="margin-top:8px">브랜드·기준·바꿀 수 있는 범위(limits) 정본: 볼트 4_Outputs/광고 한눈에 앱/광고 한눈에.json · 화면 갱신 ${ago(D.updatedAt)}</p></section>`;
  return h;
}
