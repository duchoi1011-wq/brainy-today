/* ── 셈 — 브랜드·캠페인 짝, 매체 상태, 합계, 키워드 판정, 조율할 일 (build.py 가 ads.html 에 끼움) ──
   판정 기준 숫자(조정 30 · 정지 50)와 대표 키워드는 데이터(hub.rules · brand.coreKeywords)에서 읽는다. 여기는 셈법만. */
const brands = () => (D && D.hub.brands) || [];
const selBrands = () => S.bid === "all" ? brands() : brands().filter(b => b.id === S.bid);
const rules = () => Object.assign({ adjust: 30, stop: 50 }, (D && D.hub.rules) || {});
const chName = ch => ((D && D.hub.channels[ch]) || {}).name || ch;
const chOrder = () => (D && D.hub.order) || ["naver", "meta", "google"];
const NV = () => (D && D.naver) || {};
const matchName = (b, name) => (b.naverMatch || []).some(m => String(name || "").includes(m));
const campsOf = b => (NV().campaigns || []).filter(c => matchName(b, c.name));
const campBy = id => (NV().campaigns || []).find(c => c.id === id) || null;
const brandOf = c => brands().find(b => matchName(b, c.name)) || null;
const groupBy = id => (NV().groups || []).find(g => g.id === id) || null;
const groupsOf = c => (NV().groups || []).filter(g => g.camp === c.id);
const kwsOf = b => { const ids = new Set(campsOf(b).map(c => c.id)); return (NV().keywords || []).filter(k => ids.has(k.camp)); };
const taskBy = id => ((AD && AD.tasks) || []).find(t => t.id === id) || null;
const daysSince = d => Math.max(1, Math.round((Date.now() - new Date(d + "T00:00:00+09:00")) / 86400000) + 1);
const pctOf = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

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
/* 메타·구글 숫자 — 광고 실습 계획 metrics (주간 통합 리뷰가 채움) */
const metricOf = (b, ch) => b.plan ? ((D.metrics || {}).values || {})[`${b.plan}-${ch}`] || null : null;
const hasSlot = (b, ch) => b.plan && ((D.metrics || {}).slots || []).some(s => s.product === b.plan && s.channel === ch);
/* 그 매체의 다음 광고 태스크 — 볼트 32_태스크 (광고 실습 앱과 같은 ad.data) */
function nextTask(b, ch){
  const ids = ((b.channels || {})[ch] || {}).tasks || [];
  const L = ids.map(taskBy).filter(Boolean);
  return L.find(t => t.status === "진행") || L.find(t => !["완료", "보류"].includes(t.status)) || null;
}
const taskName = t => String(t.title || "").replace(/^T-/, "");

/* 합계 — 고른 브랜드들의 네이버 캠페인 */
function totalsOf(list){
  const L = list.flatMap(campsOf);
  const t = { camps: L.length, on: L.filter(c => c.on).length, cost7: 0, clk7: 0, imp7: 0, costAll: 0, clkAll: 0, impAll: 0 };
  L.forEach(c => { t.cost7 += c.s7.cost; t.clk7 += c.s7.clk; t.imp7 += c.s7.imp; if (c.all) { t.costAll += c.all.cost; t.clkAll += c.all.clk; t.impAll += c.all.imp; } });
  return t;
}
/* 스토어 실제 주문 (판정의 기준 숫자) — store:true 인 브랜드만 */
function storeOrders(list){
  const st = (D && D.store) || {};
  if (!list.some(b => b.store)) return { none: true, ok: false };
  if (!st.ok || !st.total) return { ok: false, err: st.error || "아직 한 번도 못 받았어요", at: st.tried || st.at };
  const days = st.days || [], since14 = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
  return { ok: true, n: st.total.orders, amount: st.total.paymentAmount, n14: days.filter(d => d.d >= since14).reduce((a, d) => a + d.orders, 0), at: st.at, period: st.period, products: st.products || [] };
}
const storeWhy = err => /IP/.test(err || "") ? "커머스API센터에 이 맥의 공인 IP가 등록돼 있지 않아요 — 동욱이 커머스API센터에 로그인해 애플리케이션 「API 호출 IP」에 넣으면 다음 바퀴(60분 안)부터 자동으로 받아요." : (err || "");

/* 키워드 판정 — 누적 클릭(캠페인 켠 날부터)으로. 기간이 아니라 클릭 수 */
const KJ = {
  stop:  { lv: "high", name: "정지 후보",   how: "클릭이 정지 기준을 넘었는데 전환 0" },
  core:  { lv: "mid",  name: "대표 — 유지", how: "정지 기준을 넘었지만 대표 키워드라 끄지 않음 — 입찰·페이지를 먼저 본다" },
  watch: { lv: "mid",  name: "조정 구간",   how: "조정 기준을 넘었고 전환 0 — 입찰 조정을 볼 수 있음, 정지까지 남은 클릭" },
  win:   { lv: "low",  name: "전환 있음",   how: "조정 기준을 넘었고 전환이 있음 — 승격 후보" },
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

/* 조율할 일 — 급함 high(빨강) · mid(노랑) · low(파랑 · 참고). 각 일에는 Brainy에게 넘길 말이 붙는다 */
const ASK_TAIL = " 볼트 기준(광고 손익분기와 표본 기준 · C-진액 키워드 광고 집행 기획)대로 판단하고, 바꿀 것은 「대상 · 지금 · 바꿀 값 · 근거」 표로 보여 줘. 적용은 내가 승인한 줄만.";
function todosOf(list){
  if (!D) return [];
  const R = rules(), out = [];
  const add = (lv, b, ch, title, why, ask, extra = {}) => out.push(Object.assign({ lv, b, ch, title, why, ask: ask ? `광고 한눈에 — ${b.name} ${chName(ch)}: ${ask}` : "" }, extra));
  list.forEach(b => {
    const camps = campsOf(b);
    camps.filter(c => c.on).forEach(c => {
      if (c.all) {
        const days = daysSince(c.start), wk = c.all.imp / (days / 7);
        if (days >= 10 && wk > 0 && c.s7.imp < wk * 0.1)
          add("high", b, "naver", `「${c.name}」 노출이 거의 멈췄어요`,
            `최근 7일 노출 ${won(c.s7.imp)} · 클릭 ${won(c.s7.clk)} · 광고비 ${won(c.s7.cost)}원 — 켠 뒤 주당 평균 노출 ${won(wk)}회의 ${pctOf(c.s7.imp, wk)}%. 일예산 ${won(c.budget)}원 중 하루 ${won(c.s7.cost / 7)}원만 쓰는 중이에요.`,
            `「${c.name}」 노출이 최근 7일 ${won(c.s7.imp)}회로 거의 멈췄어. 꺼진 키워드·광고그룹, 입찰가와 순위, 검수 상태를 네이버 API로 확인해서 왜 멈췄는지 말해 주고 다시 돌게 할 조정안을 줘.` + ASK_TAIL, { camp: c.id });
      }
      if (!c.tracking) add("mid", b, "naver", "전환추적이 꺼져 있어요", `「${c.name}」은 매체 전환이 늘 0으로 보여요. 그래서 판정은 키워드 누적 클릭과 스토어 실제 주문으로만 해요.`,
        `「${c.name}」 전환추적이 꺼져 있어. 켜는 게 맞는지, 켠다면 어디서 어떻게 하는지 단계로 알려 줘 (설정 변경은 내가 직접).`, { camp: c.id });
    });
    const J = kwsOf(b).map(k => ({ k, j: judgeKw(k, b) }));
    const of = code => J.filter(x => x.j.code === code);
    const names = L => L.sort((x, y) => y.k.all.clk - x.k.all.clk).slice(0, 3).map(x => `${x.k.kw}(${x.k.all.clk})`).join(" · ") + (L.length > 3 ? " …" : "");
    if (of("stop").length) add("high", b, "naver", `정지 후보 키워드 ${of("stop").length}개`, `클릭 ${R.stop}번이 넘었는데 전환 0 — ${names(of("stop"))}`,
      `정지 후보 키워드 ${of("stop").length}개(${names(of("stop"))})를 끌지 판단해 줘. 전환추적이 꺼져 있으면 스토어 주문도 같이 봐.` + ASK_TAIL, { go: "judge", filt: "stop" });
    if (of("core").length) add("mid", b, "naver", `대표 키워드가 정지 기준을 넘었어요`, `${names(of("core"))} — 끄지 않고 입찰을 낮추거나 상세페이지를 먼저 봐요.`,
      `대표 키워드 ${names(of("core"))}가 정지 기준을 넘었어. 끄지 않는 대신 입찰·페이지 중 뭘 먼저 볼지 정리해 줘.` + ASK_TAIL, { go: "judge", filt: "core" });
    if (of("watch").length) add("mid", b, "naver", `조정 구간 키워드 ${of("watch").length}개`, `클릭 ${R.adjust}~${R.stop - 1}번, 전환 0 — ${names(of("watch"))}`,
      `조정 구간 키워드 ${of("watch").length}개(${names(of("watch"))})의 입찰 조정안을 만들어 줘.` + ASK_TAIL, { go: "judge", filt: "watch" });
    const rej = J.filter(x => x.j.code !== "off" && x.k.inspect && x.k.inspect !== "APPROVED");
    if (rej.length) add("mid", b, "naver", `검수 통과 못 한 키워드 ${rej.length}개가 켜져 있어요`, rej.slice(0, 3).map(x => x.k.kw).join(" · ") + (rej.length > 3 ? " …" : ""),
      `검수 통과 못 한 키워드 ${rej.length}개를 정리할지(끄기·지우기·문구 바꾸기) 판단해 줘.` + ASK_TAIL);
    if (b.store) {
      const o = storeOrders([b]);
      if (!o.ok) add("mid", b, "naver", "스토어 주문을 못 받고 있어요", storeWhy(o.err) + " 그 전까지 주문은 「—」로 보여요.", "");
      else {
        const daily = camps.flatMap(c => c.daily || []), cost14 = daily.reduce((a, d) => a + d.cost, 0), clk14 = daily.reduce((a, d) => a + d.clk, 0);
        if (clk14 >= R.adjust && o.n14 === 0) add("high", b, "naver", `14일 동안 클릭 ${clk14}번에 주문 0`, "클릭이 쌓였는데 주문이 0이면 키워드가 아니라 상세페이지를 고쳐요.",
          `14일 클릭 ${clk14}번에 스토어 주문 0이야. 상세페이지에서 무엇부터 볼지 점검 순서를 줘.` + ASK_TAIL);
        else if (o.n14 > 0 && b.breakeven) {
          const cpa = cost14 / o.n14;
          add(cpa > b.breakeven ? "high" : "low", b, "naver", `구매당 광고비 ${won(cpa)}원 (14일)`, `손익분기 ${won(b.breakeven)}원 ${cpa > b.breakeven ? "초과" : "안"} — 광고비 ${won(cost14)}원 ÷ 스토어 주문 ${o.n14}건. 주문은 광고 밖에서 온 것도 섞여 있어요.`,
            cpa > b.breakeven ? `14일 구매당 광고비가 ${won(cpa)}원으로 손익분기 ${won(b.breakeven)}원을 넘었어. 어디를 줄일지 조정안을 줘.` + ASK_TAIL : "");
        }
      }
    }
    chOrder().forEach(ch => {
      const st = chState(b, ch), t = nextTask(b, ch);
      if (st.k === "prep") add("low", b, ch, `${chName(ch)} 준비 중`, t ? `다음 태스크 「${taskName(t)}」 · ${t.status || "할일"}` : (((b.channels || {})[ch] || {}).plan || ""),
        t ? `${chName(ch)} 광고를 켜려면 지금 뭐가 남았는지 태스크 「${taskName(t)}」 완료 기준으로 보여 주고, 내가 할 것과 네가 할 것을 나눠 줘.` : "", { task: t && t.id });
      if (st.k === "run" && ch !== "naver" && hasSlot(b, ch) && !metricOf(b, ch)) add("mid", b, ch, `${chName(ch)} 숫자가 비어 있어요`, "집행 중인데 이번 주 광고비·결과가 없어요 — 주간 통합 리뷰가 채워요.",
        `${chName(ch)} 이번 주 광고비·결과를 광고 실습 계획 metrics 에 채워 줘 (못 읽는 건 내가 볼 곳을 알려 줘).`);
    });
  });
  const rank = { high: 0, mid: 1, low: 2 };
  return out.sort((x, y) => rank[x.lv] - rank[y.lv]);
}
