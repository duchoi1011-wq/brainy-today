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
  return "<section class=\"card\" id=\"kwrec\"><div class=\"card-h\"><h3>🤖 Claude 키워드 추천</h3><span class=\"n\">" + (d && d.updatedAt ? esc(String(d.updatedAt).slice(5, 16).replace("T", " ")) : "아직 안 받음") + "</span></div>" +
    "<details class=\"help\"><summary>이 추천은 어떻게 고르나요?</summary><p class=\"lead\">맥의 Claude가 브랜드 정보(타깃 · 구매자 욕구 · 상품 · 콘텐츠 축 · 필러), ★ 키워드, ☆ 영상, 영상 분석과 아이디어를 다 읽고 씨앗 단어마다 콘텐츠로 찍을 만한 키워드를 골라요. 고른 키워드로 바로 콘텐츠 검색까지 이어져요.</p></details>" +
    "<div class=\"acts\"><button class=\"btn" + (picks.length ? "" : " primary") + "\" data-act=\"kwrec\"" + (busy ? " disabled" : "") + ">" + (busy ? "맥이 키워드 고르는 중…" : d ? "씨앗마다 다시 추천받기" : "씨앗마다 키워드 추천받기") + "</button>" +
    (picks.length ? "<button class=\"btn primary\" data-act=\"kwrecgo\"" + (st.busy ? " disabled" : "") + ">" + (st.busy ? "맥이 검색하는 중…" : "추천 " + Math.min(picks.length, 10) + "개 ★하고 콘텐츠 검색 →") + "</button>" : "") + "</div>" +
    autoRecHtml(d) +
    (busy ? "<p class=\"lead\" style=\"margin-top:8px\">씨앗 " + sd.length + "개 — 몇 분 걸려요. 맥이 켜져 있어야 해요.</p>" : "") +
    (picks.length ? "<div class=\"chips\" style=\"margin-top:8px\">" + picks.map(function(x){ return "<button class=\"chip" + (S().pin[x.kw] ? " on" : "") + "\" data-pin=\"" + esc(x.kw) + "\" title=\"" + esc(x.why || "") + "\">" + (S().pin[x.kw] ? "★ " : "☆ ") + esc(x.kw) + "<span>" + esc(x.seed) + "</span></button>" }).join("") + "</div>" +
      "<p class=\"it-d\" style=\"margin-top:4px\">눌러서 ★ 켜고 끄기 · 콘텐츠 검색은 한 번에 10개까지예요.</p>" : "") + "</section>";
}
/* 씨앗 연관 검색어 카드 안 — 그 씨앗의 추천과 이유 */
function kwRecSeedHtml(word){
  var rs = kwRecs(word), s = S(); if(!rs.length) return "";
  return "<div class=\"wrec\" style=\"margin-top:10px;background:var(--bg);border-radius:10px;padding:10px 12px\"><div class=\"it-d\"><span class=\"tag p\">Claude 추천</span> 「" + esc(word) + "」에서 고른 키워드 — 진한 칸이 먼저 찍자는 것</div><div class=\"list\">" +
    rs.map(function(x){ return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.kw) + "</b>" + (x.pick ? " <span class=\"tag p\">먼저</span>" : "") + (x.role ? " <span class=\"tag\">" + esc(x.role) + "</span>" : "") + (x.volume ? " <span class=\"num muted\">월 " + fmt(x.volume) + "</span>" : "") + "</div><div class=\"it-d\">" + esc(x.why || "") + "</div></div>" +
      "<button class=\"mk\" data-pin=\"" + esc(x.kw) + "\" aria-pressed=\"" + !!s.pin[x.kw] + "\" title=\"즐겨찾기 — 콘텐츠 검색에 씀\" aria-label=\"즐겨찾기\">★</button></div>" }).join("") + "</div></div>";
}
function kwRecParams(){
  var s = S(), c = kwCrit();
  var seeds = seedsOf().map(function(x){
    return { word: x.word, kind: x.kind, product: x.product || "",
      cands: seedItems(x.word).filter(function(y){ return kwShown(y, x.word) }).slice(0, KWREC_CANDS).map(function(y){ return { kw: y.kw, total: y.total, ctr: y.ctr, comp: y.comp, rel: y.rel, score: y.score, pinned: !!s.pin[y.kw] } }) };
  });
  return { seeds: seeds,
    criteria: c.order.filter(function(id){ return !c.off[id] }).map(function(id){ return KWCRIT.filter(function(q){ return q.id === id })[0].name }),
    pins: Object.keys(s.pin).filter(function(k){ return s.pin[k] && !s.ex[k] }), perSeed: 5 };
}
function kwRecSend(){ var p = kwRecParams(); send("kwrec", "씨앗마다 키워드 추천 — " + p.seeds.map(function(x){ return x.word }).join(" · "), p) }
/* ⚡ 한 번에 — 씨앗마다 최고 키워드 하나를 맥 Claude 가 골라 ★ 하고, 이어서 그 키워드로 콘텐츠 추천까지 (2026-11-17 동욱
   "너가 뽑는 순위에 따라 내 키워드별로 최고의 추천 키워드를 알아서 지정해 주고 바로 콘텐츠 추천을 받게 자동화 버튼").
   cmd autorec {kw: kwrec 파라미터, rec: 추천 파라미터} → 맥이 키워드 추천.json(auto {at, best:[...]}) 과 추천.json 을 쓴다.
   ★ 는 앱이 auto.at 을 처음 볼 때 한 번 켠다(autoPinAt) — 동욱이 나중에 끈 ★ 를 다시 켜지 않는다 */
function autoRecSend(){
  if(!seedsOf().length || openCmd("autorec")) return;
  var kp = kwRecParams();
  send("autorec", "한 번에 — 씨앗 " + kp.seeds.length + "개마다 최고 키워드 ★ → 콘텐츠 추천", { kw: kp, rec: recParams() });
}
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
  var kws = kwRecPicks().map(function(x){ return x.kw }).slice(0, 10); if(!kws.length) return;
  var pin = Object.assign({}, S().pin), ex = Object.assign({}, S().ex);
  kws.forEach(function(k){ pin[k] = 1; delete ex[k] });
  ui.refView = "search"; tab = "ref"; save("ct.tab", tab); window.scrollTo(0, 0);
  setS({ pin: pin, ex: ex, searchReq: { at: new Date().toISOString(), kws: kws } });
}
function autoRecHtml(d){
  var busy = openCmd("autorec"), a = (d || {}).auto, rb = openCmd("recommend");
  return "<div class=\"note\" style=\"margin-top:10px\"><b>⚡ 한 번에</b> — 씨앗마다 Claude가 순위 기준대로 <b>최고 키워드 1개</b>를 골라 ★ 하고, 그 키워드로 <b>콘텐츠 추천</b>까지 받아요. 다 되면 콘텐츠 탭 「추천」에 떠요." +
    "<div class=\"acts\" style=\"margin-top:8px\"><button class=\"btn primary\" data-act=\"autorec\"" + (busy || rb ? " disabled" : "") + ">" + (busy ? "맥이 고르고 추천 받는 중… (10~20분)" : "⚡ 키워드 고르고 콘텐츠 추천까지") + "</button>" +
    (a && a.best && a.best.length ? "<span class=\"it-d\">지난번 " + esc(String(a.at).slice(5, 16).replace("T", " ")) + " · " + a.best.map(esc).join(" · ") + "</span>" : "") + "</div></div>";
}
