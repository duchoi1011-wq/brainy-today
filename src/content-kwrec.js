/* ── 씨앗마다 Claude 키워드 추천 → 바로 콘텐츠 검색 (키워드 탭) ──
   2026-11-17 동욱: "내 모든 맥락을 파악한 씨앗 키워드별로 키워드를 추천받을 수 있고, 그 기반으로 콘텐츠 검색으로 다음 워크플로우가 이어지게".
   「🤖 씨앗마다 키워드 추천받기」 → cmd kwrec (params.seeds = 씨앗마다 지금 순위 기준 상위 후보 · params.criteria = 순위 기준)
   → 맥 Claude 가 브랜드.json(타깃·구매자 욕구·상품·축·필러·역할)·★·☆·영상 분석·아이디어·추천을 읽고 씨앗마다 고른 키워드를
   키워드 추천.json(ct.data .kwrec) {updatedAt, items:[{seed, kw, role, why, volume, pick}]} 에 쓴다.
   앱은 씨앗 칸 안에 추천을 보여 주고 ★(하나) · 「추천 ★하고 콘텐츠 검색」(★ + searchReq) 으로 다음 단계(콘텐츠 탭 「키워드로 찾은 콘텐츠」)로 넘긴다. */
var KWREC_CANDS = 40;   // 씨앗 하나에서 맥에 넘길 후보 수 (순위 기준 점수 순)
function kwRecs(seed){ var d = part("kwrec"); return (((d || {}).items) || []).filter(function(x){ return !seed || x.seed === seed }) }
function kwRecOf(kw){ return kwRecs().filter(function(x){ return x.kw === kw })[0] || null }
function kwRecPicks(){ var s = S(), seen = {}; return kwRecs().filter(function(x){ if(!x.pick || s.ex[x.kw] || seen[x.kw]) return false; seen[x.kw] = 1; return true }) }
/* 씨앗 카드 위 — 추천 받기 · 지난 추천 · 추천으로 바로 콘텐츠 검색 */
function kwRecBarHtml(){
  var d = part("kwrec"), busy = openCmd("kwrec"), sd = seedsOf(), picks = kwRecPicks(), st = searchState();
  if(!sd.length) return "";
  /* 평소엔 접어 두고 한 줄만 — 폰에서 씨앗 연관 검색어 목록이 첫 화면에 오게 (2026-11-18 검증 F14). 맥이 고르는 중이거나 추천이 막 왔으면 펼친다 */
  return "<section class=\"card\" id=\"kwrec\"><details" + (busy ? " open" : "") + "><summary>🤖 Claude 키워드 추천 · 🚀 자동 진행 <span class=\"num muted\">" + (busy ? "맥이 고르는 중" : picks.length ? "추천 " + picks.length + "개" : d ? "지난 추천 있음" : "아직 안 받음") + " — 펴서 쓰기</span></summary>" +
    "<details class=\"help\"><summary>이 추천은 어떻게 고르나요?</summary><p class=\"lead\">맥의 Claude가 브랜드 정보(타깃 · 구매자 욕구 · 상품 · 콘텐츠 축 · 필러), ★ 키워드, ☆ 영상, 영상 분석과 아이디어를 다 읽고 씨앗 단어마다 콘텐츠로 찍을 만한 키워드를 골라요. 고른 키워드로 바로 콘텐츠 검색까지 이어져요.</p></details>" +
    "<div class=\"acts\"><button class=\"btn" + (picks.length ? "" : " primary") + "\" data-act=\"kwrec\"" + (busy ? " disabled" : "") + ">" + (busy ? "맥이 키워드 고르는 중…" : d ? "씨앗마다 다시 추천받기" : "씨앗마다 키워드 추천받기") + "</button>" +
    (picks.length ? "<button class=\"btn primary\" data-act=\"kwrecgo\"" + (st.busy ? " disabled" : "") + ">" + (st.busy ? "맥이 검색하는 중…" : "추천 " + Math.min(picks.length, 10) + "개 ★하고 콘텐츠 검색 →") + "</button>" : "") + "</div>" +
    autoPilotHtml("kw") +
    (busy ? "<p class=\"lead\" style=\"margin-top:8px\">씨앗 " + sd.length + "개 — 몇 분 걸려요. 맥이 켜져 있어야 해요.</p>" : "") +
    (picks.length ? "<div class=\"chips\" style=\"margin-top:8px\">" + picks.map(function(x){ return "<button class=\"chip" + (S().pin[x.kw] ? " on" : "") + "\" data-pin=\"" + esc(x.kw) + "\" title=\"" + esc(x.why || "") + "\">" + (S().pin[x.kw] ? "★ " : "☆ ") + esc(x.kw) + "<span>" + esc(x.seed) + "</span></button>" }).join("") + "</div>" +
      "<p class=\"it-d\" style=\"margin-top:4px\">눌러서 ★ 켜고 끄기 · 콘텐츠 검색은 한 번에 10개까지예요.</p>" : "") + "</details></section>";
}
/* 씨앗 연관 검색어 카드 안 — 그 씨앗의 추천과 이유 */
function kwRecSeedHtml(word){
  var rs = kwRecs(word), s = S(); if(!rs.length) return "";
  var first = rs.filter(function(x){ return x.pick })[0];   // 접어 두고 한 줄만 — 폰에서 연관 검색어 목록이 첫 화면에 오게 (2026-11-18 검증)
  return "<details class=\"wbox\"><summary><b><span class=\"tag p\">Claude 추천</span> " + rs.length + "개</b><span class=\"wsum\">" + (first ? "먼저 「" + esc(first.kw) + "」" : "") + "</span></summary><div class=\"wrec wbody\"><div class=\"it-d\"><span class=\"tag p\">Claude 추천</span> 「" + esc(word) + "」에서 고른 키워드 — 진한 칸이 먼저 찍자는 것</div><div class=\"list\">" +
    rs.map(function(x){ return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.kw) + "</b>" + (x.pick ? " <span class=\"tag p\">먼저</span>" : "") + (x.role ? " <span class=\"tag\">" + esc(x.role) + "</span>" : "") + (x.volume ? " <span class=\"num muted\">월 " + fmt(x.volume) + "</span>" : "") + "</div><div class=\"it-d\">" + esc(x.why || "") + "</div></div>" +
      "<button class=\"mk\" data-pin=\"" + esc(x.kw) + "\" aria-pressed=\"" + !!s.pin[x.kw] + "\" title=\"즐겨찾기 — 콘텐츠 검색에 씀\" aria-label=\"즐겨찾기\">★</button></div>" }).join("") + "</div></div></details>";
}
function kwRecParams(){
  var s = S(), c = kwCrit();
  var seeds = seedsOf().map(function(x){
    return { word: x.word, kind: x.kind, product: x.product || "",
      cands: seedItems(x.word).filter(function(y){ return kwShown(y, x.word) }).slice(0, KWREC_CANDS).map(function(y){ return { kw: y.kw, total: y.total, ctr: y.ctr, comp: y.comp, rel: y.rel, score: y.score, pinned: !!s.pin[y.kw] } }) };
  });
  return { seeds: seeds,
    criteria: c.order.filter(function(id){ return !c.off[id] }).map(function(id){ return KWCRIT.filter(function(q){ return q.id === id })[0].name }),
    pins: Object.keys(s.pin).filter(function(k){ return s.pin[k] && !s.ex[k] }), perSeed: 5, country: kwCountry() };   // 찾는 나라 (content-basekw.js)
}
function kwRecSend(){ var p = kwRecParams(); send("kwrec", "씨앗마다 키워드 추천 — " + p.seeds.map(function(x){ return x.word }).join(" · "), p) }
/* 🚀 자동 진행(content-auto.js)의 ① 키워드 단계가 키워드 추천.json 에 auto {at, best:[...]} 를 쓰면,
   앱이 처음 볼 때 한 번 ★ 를 켠다(autoPinAt) — 동욱이 나중에 끈 ★ 를 다시 켜지 않는다 */
function autoPinApply(){
  var a = ((part("kwrec") || {}).auto) || null;
  if(!a || !a.at || !SETS_LIVE || (SETS[cur] || {}).autoPinAt === a.at) return;
  var pin = Object.assign({}, S().pin), ex = Object.assign({}, S().ex);
  (a.best || []).forEach(function(k){ pin[k] = 1; delete ex[k] });
  setS({ pin: pin, ex: ex, autoPinAt: a.at });
}
/* 추천 「먼저」 키워드를 ★하고 바로 콘텐츠 검색 — 콘텐츠 탭 「키워드로 찾은 콘텐츠」로 넘어간다 */
function kwRecGo(){
  if(searchState().busy) return;
  if(pastOn()){ toast("옛 기록을 보는 중이라 맥에 일을 보내지 않아요 — 맨 위 「지금 자료로 돌아가기」 뒤에 눌러 주세요"); return }   // 탭을 옮기기 전에 막는다
  var kws = kwRecPicks().map(function(x){ return x.kw }).slice(0, 10); if(!kws.length) return;
  var pin = Object.assign({}, S().pin), ex = Object.assign({}, S().ex);
  kws.forEach(function(k){ pin[k] = 1; delete ex[k] });
  ui.refView = "search"; tab = "ref"; save("ct.tab", tab); window.scrollTo(0, 0);
  setS({ pin: pin, ex: ex, searchReq: { at: new Date().toISOString(), kws: kws, country: kwCountry() } });
}
