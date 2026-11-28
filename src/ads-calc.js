/* ── 셈 — 브랜드·캠페인 짝, 매체 상태, 지표, 키워드 판정, 점검표 (build.py 가 ads.html 에 끼움) ──
   지표와 기준은 광고 실습 교과서(외울 것)에서 온 것만 쓴다: CTR · CPC · 평균 순위 · 품질지수 · 허용 CPC(손익분기 × 전환율)
   · 누적 클릭 판정(조정·정지) · 구매당/계약당 광고비 · 계약률 · 예산 비중 · 측정 준비(공통 기반 태스크).
   기준 숫자는 데이터(hub.rules · hub.checks · hub.limits · brand.breakeven·cvr · plan.budgetShare)에서 읽는다. 여기는 셈법만. */
const brands = () => (D && D.hub.brands) || [];
const selBrands = () => S.bid === "all" ? brands() : brands().filter(b => b.id === S.bid);
const rules = () => (D && D.hub.rules) || {};
const CK = () => (D && D.hub.checks) || {};
const LIM = () => (D && D.hub.limits) || {};
const chName = ch => ch === "common" ? "공통" : ((D && D.hub.channels[ch]) || {}).name || ch;
const chOrder = () => (D && D.hub.order) || ["naver", "meta", "google"];
const NV = () => (D && D.naver) || {};
const PLAN = () => (D && D.plan) || {};
const matchName = (b, name) => (b.naverMatch || []).some(m => String(name || "").includes(m));
const campsOf = b => (NV().campaigns || []).filter(c => matchName(b, c.name));
const campBy = id => (NV().campaigns || []).find(c => c.id === id) || null;
const brandOf = c => brands().find(b => matchName(b, c.name)) || null;
const groupBy = id => (NV().groups || []).find(g => g.id === id) || null;
const groupsOf = c => (NV().groups || []).filter(g => g.camp === c.id);
const kwsOf = b => { const ids = new Set(campsOf(b).map(c => c.id)); return (NV().keywords || []).filter(k => ids.has(k.camp)); };
const taskBy = id => ((AD && AD.tasks) || []).find(t => t.id === id) || null;
const taskName = t => String(t.title || "").replace(/^T-/, "");
const daysSince = d => Math.max(1, Math.round((Date.now() - new Date(d + "T00:00:00+09:00")) / 86400000) + 1);
const pctTxt = (a, b) => { if (!(b > 0)) return "0"; const p = a / b * 100; return p > 0 && p < 1 ? p.toFixed(1) : String(Math.round(p)); };
const since = c => c.from && c.from > c.start ? `${c.start}부터 · 숫자는 ${c.from}부터(최근 92일)` : `${c.start}부터`;

/* 지표 — 숫자 묶음 s = {imp, clk, cost, conv, rank} */
const ctrOf = s => s && s.imp > 0 ? s.clk / s.imp * 100 : null;
const cpcOf = s => s && s.clk > 0 ? s.cost / s.clk : null;
const ctrTxt = s => { const v = ctrOf(s); return v == null ? "—" : v.toFixed(v < 1 ? 2 : 1) + "%"; };
const cpcTxt = s => { const v = cpcOf(s); return v == null ? "—" : won(v) + "원"; };
const sumStats = L => { const t = { imp: 0, clk: 0, cost: 0, conv: 0, rk: 0 }; L.forEach(s => { if (!s) return; t.imp += s.imp; t.clk += s.clk; t.cost += s.cost; t.conv += s.conv; if (s.rank) t.rk += s.rank * s.imp; }); t.rank = t.imp ? +(t.rk / t.imp).toFixed(1) : null; return t; };
/* 허용 CPC = 손익분기 결과당 광고비 × 전환율 (교과서 N1 「클릭당 허용 비용 = 93,500원 × 전환율」) */
const maxCpc = b => b && b.breakeven && b.cvr ? Math.round(b.breakeven * b.cvr / 100) : null;

/* 매체 상태 — 네이버는 실제 캠페인에서, 메타·구글은 볼트 JSON 의 state 에서 */
const STATE = { run: "집행 중", stop: "꺼 둠", prep: "준비", none: "없음" };
function chState(b, ch){
  const conf = (b.channels || {})[ch] || {};
  if (ch === "naver") {
    const L = campsOf(b);
    if (L.some(c => c.on)) return { k: "run", t: STATE.run };
    if (L.length) return { k: "stop", t: STATE.stop, sub: `캠페인 ${L.length}개 모두 꺼짐` };
    return (conf.tasks || []).length ? { k: "prep", t: STATE.prep } : { k: "none", t: STATE.none };
  }
  const s = conf.state || "없음";
  return { k: s === "집행" || s === "집행 중" ? "run" : s === "준비" ? "prep" : s === "멈춤" || s === "꺼 둠" ? "stop" : "none", t: s === "집행" ? STATE.run : s };
}
const stPill = st => `<span class="pill ${st.k}">${esc(st.t)}</span>`;
/* 주간 숫자 — 광고 실습 계획 metrics (주간 통합 리뷰가 채움) */
const metricOf = (b, ch) => b.plan ? ((D.metrics || {}).values || {})[`${b.plan}-${ch}`] || null : null;
const hasSlot = (b, ch) => b.plan && ((D.metrics || {}).slots || []).some(s => s.product === b.plan && s.channel === ch);
const product = b => b.plan ? (PLAN().products || {})[b.plan] || null : null;
function nextTask(b, ch){
  const L = ((((b.channels || {})[ch] || {}).tasks) || []).map(taskBy).filter(Boolean);
  return L.find(t => t.status === "진행") || L.find(t => !["완료", "보류"].includes(t.status)) || null;
}
/* 측정 준비 — 공통 기반 태스크(track common) 중 이 브랜드 상품에 걸린 것 */
const baseTasks = b => b.plan ? ((AD && AD.tasks) || []).filter(t => t.track === "common" && (t.products || []).includes(b.plan)) : [];

function totalsOf(list){
  const L = list.flatMap(campsOf);
  return { camps: L.length, on: L.filter(c => c.on).length, s7: sumStats(L.map(c => c.s7)), all: sumStats(L.filter(c => c.all).map(c => c.all)), today: sumStats(L.map(c => c.today)), budget: L.filter(c => c.on).reduce((a, c) => a + (c.budget || 0), 0) };
}
function storeOrders(list){
  const st = (D && D.store) || {};
  if (!list.some(b => b.store)) return { none: true, ok: false };
  if (!st.ok || !st.total) return { ok: false, err: st.error || "아직 한 번도 못 받았어요", at: st.tried || st.at };
  const days = st.days || [], since14 = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
  return { ok: true, n: st.total.orders, amount: st.total.paymentAmount, n14: days.filter(d => d.d >= since14).reduce((a, d) => a + d.orders, 0), at: st.at, period: st.period, products: st.products || [] };
}
const storeWhy = err => /IP/.test(err || "") ? "커머스API센터에 이 맥의 공인 IP가 등록돼 있지 않아요 — 동욱이 커머스API센터에 로그인해 애플리케이션 「API 호출 IP」에 넣으면 다음 바퀴(60분 안)부터 자동으로 받아요." : (err || "");

/* 키워드 판정 — 누적 클릭(캠페인 켠 날부터)으로 */
const KJ = {
  stop:  { lv: "bad",  name: "정지 후보",   how: "클릭이 정지 기준을 넘었는데 전환 0" },
  core:  { lv: "warn", name: "대표 — 유지", how: "정지 기준을 넘었지만 대표 키워드라 끄지 않음 — 입찰·페이지를 먼저 본다" },
  watch: { lv: "warn", name: "조정 구간",   how: "조정 기준을 넘었고 전환 0" },
  win:   { lv: "ok",   name: "전환 있음",   how: "조정 기준을 넘었고 전환이 있음 — 승격 후보" },
  wait:  { lv: "",     name: "표본 부족",   how: "조정 기준까지 클릭이 모자람 — 그대로 둔다" },
  off:   { lv: "",     name: "꺼 둠",       how: "키워드·광고그룹·캠페인 중 하나가 꺼져 있음" }
};
const KJ_ORDER = ["stop", "core", "watch", "win", "wait", "off"];
function judgeKw(k, b){
  const R = rules(), g = groupBy(k.group), c = campBy(k.camp), clk = k.all.clk, conv = k.all.conv;
  if (!k.on || (g && !g.on) || (c && !c.on)) return { code: "off", left: 0 };
  const core = ((b || brandOf(c) || {}).coreKeywords || []).includes(k.kw);
  if (conv === 0 && clk >= R.stop) return { code: core ? "core" : "stop", left: 0 };
  if (clk >= R.adjust) return { code: conv > 0 ? "win" : "watch", left: Math.max(0, R.stop - clk) };
  return { code: "wait", left: R.adjust - clk };
}

/* ── 점검표 — 지표마다 한 줄: lv bad(빨강) · warn(노랑) · ok(초록) · info(참고) · none(숫자 없음)
   각 줄 = {lv, b, ch, name 지표, val 지금 값, std 기준, why, ask, camp?, filt?} ── */
const ASK_TAIL = () => ` 볼트 기준(${rules().doc || ""})대로 판단하고, 바꿀 것은 「대상 · 지금 · 바꿀 값 · 근거」 표로 보여 줘. 적용은 내가 승인한 줄만.`;
function checksOf(list){
  if (!D) return [];
  const R = rules(), C = CK(), out = [];
  const add = (lv, b, ch, name, val, std, why, ask, extra = {}) => out.push(Object.assign({ lv, b, ch, name, val, std, why, ask: ask ? `광고 한눈에 — ${b.name} ${chName(ch)}: ${ask}` + ASK_TAIL() : "" }, extra));
  list.forEach(b => {
    const camps = campsOf(b), on = camps.filter(c => c.on), cap = maxCpc(b);
    if (on.length) {
      const t = totalsOf([b]);
      on.forEach(c => {
        if (!c.all) return;
        const days = daysSince(c.from || c.start), wk = c.all.imp / (days / 7), stall = days >= 10 && wk > 0 && c.s7.imp < wk * (C.stallPct || 10) / 100;
        add(stall ? "bad" : "ok", b, "naver", "노출 흐름", `7일 노출 ${won(c.s7.imp)}`, `켠 뒤 주당 평균 ${won(wk)}`, stall ? `평균의 ${pctTxt(c.s7.imp, wk)}% — 「${c.name}」이 사실상 멈췄어요. 꺼진 키워드·입찰가·순위를 봐야 해요.` : "",
          stall ? `「${c.name}」 노출이 최근 7일 ${won(c.s7.imp)}회로 거의 멈췄어. 꺼진 키워드·광고그룹, 입찰가와 순위, 검수 상태를 네이버 API로 확인해서 왜 멈췄는지 말해 주고 다시 돌게 할 조정안을 줘.` : "", { camp: c.id });
        if (c.budget) { const day = c.s7.cost / 7, low = day < c.budget * (C.spendLowPct || 15) / 100;
          add(low ? "warn" : "ok", b, "naver", "일예산 소진", `하루 ${won(day)}원 (${pctTxt(day, c.budget)}%)`, `일예산 ${won(c.budget)}원 · 오늘 ${won(c.today ? c.today.cost : 0)}원`, low ? "예산이 남는다 = 노출 기회를 못 사고 있다는 뜻이에요. 입찰가가 낮거나 켜진 키워드가 적어요." : "", "", { camp: c.id }); }
        if (!c.tracking) add("warn", b, "naver", "전환추적", "꺼짐", "켜져 있어야 매체 전환이 보임", `「${c.name}」은 매체 전환이 늘 0이에요. 판정은 누적 클릭과 스토어 실제 주문으로만 해요.`,
          `「${c.name}」 전환추적이 꺼져 있어. 켜는 게 맞는지, 켠다면 어디서 어떻게 하는지 단계로 알려 줘 (설정 변경은 내가 직접).`, { camp: c.id });
      });
      const cpc = cpcOf(t.s7);
      add(cpc == null ? "none" : cap && cpc > cap ? "bad" : "ok", b, "naver", "CPC (클릭당 광고비)", cpc == null ? "7일 클릭 0" : `${won(cpc)}원 (7일)`, cap ? `허용 CPC ${won(cap)}원 이하` : "허용 CPC 없음 (손익분기·전환율 필요)",
        cap ? `허용 CPC = 손익분기 ${won(b.breakeven)}원 × 전환율 ${b.cvr}%${b.cvrNote ? " — " + b.cvrNote : ""}` : "", "");
      add("info", b, "naver", "CTR (클릭률)", `${ctrTxt(t.s7)} (7일)`, `누적 ${ctrTxt(t.all)}`, "광고를 본 사람 중 누른 비율. 넓은 키워드가 많으면 낮아져요.", "");
      add("info", b, "naver", "평균 노출 순위", t.s7.rank ? `${t.s7.rank}위 (7일)` : "—", `누적 ${t.all.rank || "—"}위`, "광고 순위 = 입찰가 × 품질지수. 순위가 너무 낮으면 노출이 줄어요.", "");
      const K = kwsOf(b), J = K.map(k => ({ k, j: judgeKw(k, b) })), live = J.filter(x => x.j.code !== "off");
      const qlow = live.filter(x => x.k.qi && x.k.qi <= 2).length;
      add(qlow ? "warn" : "ok", b, "naver", "품질지수", `켜진 ${live.length}개 중 낮음(1~2) ${qlow}개`, "1~7칸 · 높을수록 같은 입찰에 높은 순위", qlow ? "품질지수가 낮은 키워드는 같은 돈으로 순위가 낮아요 — 광고 문구·랜딩이 그 검색어와 맞는지 봐요." : "", qlow ? "품질지수 1~2 키워드를 어떻게 할지(문구·랜딩·끄기) 판단해 줘." : "", { filt: "qlow" });
      const over = cap ? live.filter(x => x.k.bid > cap) : [];
      if (cap) add(over.length ? "bad" : "ok", b, "naver", "입찰가 상한", over.length ? `허용 CPC 넘은 키워드 ${over.length}개` : `모두 ${won(cap)}원 이하`, `허용 CPC ${won(cap)}원`, over.length ? over.slice(0, 3).map(x => `${x.k.kw}(${won(x.k.bid)}원)`).join(" · ") : "", over.length ? `입찰가가 허용 CPC를 넘은 키워드 ${over.length}개를 내릴 안을 줘.` : "", { filt: "over" });
      const of = code => J.filter(x => x.j.code === code), names = L => L.slice().sort((x, y) => y.k.all.clk - x.k.all.clk).slice(0, 3).map(x => `${x.k.kw}(${x.k.all.clk})`).join(" · ") + (L.length > 3 ? " …" : "");
      const top = live.slice().sort((x, y) => y.k.all.clk - x.k.all.clk)[0];
      const lvJ = of("stop").length ? "bad" : of("watch").length || of("core").length ? "warn" : "ok";
      add(lvJ, b, "naver", "키워드 판정 (누적 클릭)", `정지 후보 ${of("stop").length} · 조정 구간 ${of("watch").length} · 대표 ${of("core").length}`, `${R.adjust}클릭 조정 · ${R.stop}클릭에 전환 0이면 정지`,
        lvJ === "ok" ? (top ? `아직 판정할 키워드가 없어요 — 가장 많은 「${top.k.kw}」가 ${top.k.all.clk}클릭` : "") : [of("stop").length ? "정지 후보: " + names(of("stop")) : "", of("watch").length ? "조정 구간: " + names(of("watch")) : "", of("core").length ? "대표: " + names(of("core")) : ""].filter(Boolean).join(" / "),
        lvJ === "ok" ? "" : `판정 대상 키워드(정지 후보 ${names(of("stop")) || "없음"} · 조정 구간 ${names(of("watch")) || "없음"} · 대표 ${names(of("core")) || "없음"})의 조정안을 줘.`, { filt: lvJ === "ok" ? "" : "act" });
      const rej = live.filter(x => x.k.inspect && x.k.inspect !== "APPROVED");
      if (rej.length) add("warn", b, "naver", "검수", `통과 못 한 켜진 키워드 ${rej.length}개`, "검수 통과", rej.slice(0, 3).map(x => x.k.kw).join(" · "), `검수 통과 못 한 키워드 ${rej.length}개를 정리할지 판단해 줘.`);
    }
    /* 결과 — 스토어 실제 주문(염소) · 주간 숫자(메타·구글·이벤트랩) */
    const pr = product(b);
    if (b.store) {
      const o = storeOrders([b]);
      if (!o.ok) add("none", b, "naver", `${pr ? pr.metric : "구매당 광고비"}`, "스토어 미연결", b.breakeven ? `손익분기 ${won(b.breakeven)}원 이하` : "", storeWhy(o.err), "");
      else {
        const daily = camps.flatMap(c => c.daily || []), cost14 = daily.reduce((a, d) => a + d.cost, 0), clk14 = daily.reduce((a, d) => a + d.clk, 0);
        if (!o.n14) add(clk14 >= R.adjust ? "bad" : "info", b, "naver", pr ? pr.metric : "구매당 광고비", `14일 주문 0 · 광고비 ${won(cost14)}원`, `손익분기 ${won(b.breakeven)}원`, clk14 >= R.adjust ? `클릭 ${clk14}번에 주문 0 — 키워드가 아니라 상세페이지를 고쳐요.` : "", clk14 >= R.adjust ? `14일 클릭 ${clk14}번에 스토어 주문 0이야. 상세페이지에서 무엇부터 볼지 점검 순서를 줘.` : "");
        else { const cpa = cost14 / o.n14; add(cpa > b.breakeven ? "bad" : "ok", b, "naver", pr ? pr.metric : "구매당 광고비", `${won(cpa)}원 (14일 · 주문 ${o.n14})`, `손익분기 ${won(b.breakeven)}원 이하`, "주문에는 광고 밖에서 온 것도 섞여 있어요.", cpa > b.breakeven ? `14일 구매당 광고비가 ${won(cpa)}원으로 손익분기를 넘었어. 어디를 줄일지 조정안을 줘.` : ""); }
      }
    }
    chOrder().forEach(ch => {
      if (!hasSlot(b, ch) || (ch === "naver" && campsOf(b).length)) return;   // 네이버는 API 숫자가 있으니 주간 칸을 따로 보지 않는다
      const m = metricOf(b, ch), st = chState(b, ch);
      if (!m) { if (st.k === "run") add("warn", b, ch, `${chName(ch)} 주간 숫자`, "비어 있음", "주간 통합 리뷰가 채움", "집행 중인데 이번 주 광고비·결과가 없어요.", `${chName(ch)} 이번 주 광고비·결과를 광고 실습 계획 metrics 에 채워 줘.`); return; }
      const res = pr ? m[pr.resultField] : m.result, per = m.spend && res ? m.spend / res : null;
      add(per != null && b.breakeven && per > b.breakeven ? "bad" : per != null ? "ok" : "info", b, ch, `${chName(ch)} ${pr ? pr.metric.replace("계약당", "결과당") : "결과당 광고비"}`, per != null ? `${won(per)}원 (${m.period || m.week || ""})` : `광고비 ${won(m.spend)}원 · ${pr ? pr.resultLabel : "결과"} ${won(res)}`, b.breakeven ? `손익분기 ${won(b.breakeven)}원` : "목표 아직 없음", "", "");
      if (pr && pr.hasContracts && res) add("info", b, ch, `${chName(ch)} 계약률`, `${pctTxt(m.contracts || 0, res)}% (계약 ${m.contracts || 0} ÷ 문의 ${res})`, "문의 → 계약", `계약당 광고비 ${m.contracts ? won(m.spend / m.contracts) + "원" : "—"}`, "");
    });
    /* 예산 비중 — 계획(광고 실습) vs 실제 */
    const share = b.plan ? ((PLAN().budgetShare || {})[b.plan]) : null;
    if (share) {
      const spend = { naver: totalsOf([b]).s7.cost }; chOrder().forEach(ch => { if (ch !== "naver") { const m = metricOf(b, ch); spend[ch] = m && m.spend ? m.spend / (m.days || 7) * 7 : 0; } });
      const tot = Object.values(spend).reduce((a, v) => a + v, 0);
      const plan = chOrder().map(ch => `${chName(ch)} ${share[ch] || 0}`).join(" · "), real = tot ? chOrder().map(ch => `${chName(ch)} ${pctTxt(spend[ch] || 0, tot)}`).join(" · ") : "광고비 0";
      const running = chOrder().filter(ch => chState(b, ch).k === "run"), notYet = chOrder().filter(ch => (share[ch] || 0) > 0 && chState(b, ch).k !== "run");
      const gap = tot && running.length > 1 ? running.some(ch => Math.abs((share[ch] || 0) - (spend[ch] || 0) / tot * 100) > 20) : false;
      add(gap ? "warn" : "info", b, "naver", "예산 비중 (%)", real, `계획 ${plan}`, gap ? "집행 중인 매체끼리 계획과 20%p 넘게 달라요." : notYet.length ? `${notYet.map(chName).join("·")}를 아직 켜지 않아서 계획과 달라요 — 켜면 맞춰 봐요.` : "", "");
    }
    /* 측정 준비 — 공통 기반 */
    const base = baseTasks(b);
    if (base.length) { const done = base.filter(t => t.status === "완료"); add(done.length === base.length ? "ok" : "warn", b, "common", "측정 준비", `${done.length}/${base.length} 끝`, `공통 기반 중 ${product(b) ? product(b).name : "이 상품"}에 걸린 태스크 전부`, done.length === base.length ? "" : "남은 것: " + base.filter(t => t.status !== "완료").map(taskName).slice(0, 3).join(" · ") + " — 이게 끝나야 어느 매체가 주문·문의를 만들었는지 가를 수 있어요.", "", { tasks: base.map(t => t.id) }); }
    chOrder().forEach(ch => {
      const st = chState(b, ch), t = nextTask(b, ch);
      if (st.k === "prep") add("info", b, ch, `${chName(ch)} 준비`, t ? `다음 「${taskName(t)}」` : "준비 중", t ? `상태 ${t.status || "할일"}` : "", "", t ? `${chName(ch)} 광고를 켜려면 지금 뭐가 남았는지 태스크 「${taskName(t)}」 완료 기준으로 보여 주고, 내가 할 것과 네가 할 것을 나눠 줘.` : "", { task: t && t.id });
    });
  });
  const rank = { bad: 0, warn: 1, none: 2, ok: 3, info: 4 };
  return out.sort((x, y) => rank[x.lv] - rank[y.lv]);
}
const LVN = { bad: "문제", warn: "주의", ok: "좋음", info: "참고", none: "숫자 없음" };
