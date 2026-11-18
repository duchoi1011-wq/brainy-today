/* ── 키워드 순위 기준 — ⚙ 설정 › 단계별 기준 「키워드」 칸의 몸통 (content-design.js · 2026-11-18 키워드 탭에서 옮김) ──
   2026-11-17 동욱: "흑염소사육은 왜 하나만 받았어?" → 씨앗 글자가 든 말만 남기던 규칙을 바꾸고, "순위를 매기는 기준을 합리적으로 바꾸고 그걸 내가 조절할 수 있는 설정 탭".
   맥(content_app.py seeds)은 이제 씨앗 글자가 안 든 네이버 연관 검색어도 버리지 않고 far 로 표시해 넘긴다. 무엇을 위로 올리고 무엇을 숨길지는 여기 값(ct.set kwCrit)이 정한다:
     ① 우선순위 — 아래 다섯 기준의 순서(위일수록 크게) · 끄기
     ② 씨앗 글자가 안 든 말 — 섞어 보기 · 아래에 접기 · 숨기기
     ③ 최소 검색량 · ④ 최소 가까움
   점수(scored)·씨앗 연관 검색어 줄(seedItems)·전체 키워드 목록이 모두 이 값을 쓴다. 손대지 않은 브랜드는 KW_DEFAULT 순서. */
var KWCRIT = [
  { id: "rel", name: "씨앗과 가까운 말", what: "씨앗 단어가 통째로 들었으면 만점, 아니면 씨앗을 두 글자씩 끊은 조각이 겹치는 만큼" },
  { id: "vol", name: "많이 찾는 말", what: "한 달 검색량 — 같은 종류(상품·정체성)에서 가장 큰 말과 비교 (큰 말 하나가 다 가져가지 않게 눌러서)" },
  { id: "ctr", name: "살 사람이 찾는 말", what: "광고 클릭률 — 높을수록 사러 온 사람이 많아요 (월 검색 200 미만이면 덜 믿어요)" },
  { id: "rise", name: "요즘 오르는 말", what: "구글 트렌드 최근 4주 ÷ 그 앞 8주 (값이 없으면 중간)" },
  { id: "comp", name: "경쟁이 적은 말", what: "네이버 광고 경쟁 정도와 붙은 광고 수 — 적을수록 높게" }
];
var KW_DEFAULT = ["rel", "vol", "ctr", "rise", "comp"];
var KW_RANK_W = [5, 4, 3, 2, 1];
var KW_FAR = [["mix", "같이 섞어 보기"], ["fold", "아래에 접어 두기"], ["hide", "숨기기"]];
var KW_MINVOL = [[0, "따지지 않음"], [10, "월 10 이상"], [100, "월 100 이상"], [1000, "월 1,000 이상"]];
var KW_MINREL = [[0, "따지지 않음"], [1, "글자 조각 하나라도 겹침"], [50, "절반 이상 겹침"]];
function kwCrit(){
  var c = (SETS[cur] || {}).kwCrit || {};
  return { set: !!c.order, order: c.order || KW_DEFAULT, off: c.off || {}, far: c.far || "mix", minVol: c.minVol || 0, minRel: c.minRel || 0 };
}
function kwWeights(){ var c = kwCrit(), w = {}, r = 0; c.order.forEach(function(id){ w[id] = c.off[id] ? 0 : KW_RANK_W[r++] || 1 }); return w }
/* 씨앗과 가까움 0~100 — 통째로 들었으면 100, 아니면 씨앗을 두 글자씩 밀어 끊은 조각 중 든 비율 × 80 (통째로 든 말이 늘 위) */
function relTo(seed, kw){
  var w = String(seed).replace(/\s+/g, ""), k = String(kw).replace(/\s+/g, "");
  if(!w) return 0; if(k.indexOf(w) >= 0) return 100;
  var parts = []; for(var i = 0; i < w.length - 1; i++) parts.push(w.slice(i, i + 2));
  if(!parts.length) return 0;
  return Math.round(parts.filter(function(p){ return k.indexOf(p) >= 0 }).length / parts.length * 80);
}
function relOf(x){ var seeds = x.seed || []; return seeds.length ? Math.max.apply(null, seeds.map(function(w){ return relTo(w, x.kw) })) : 100 }
/* 보이는가 — 최소 검색량 · 최소 가까움 · 씨앗 글자가 안 든 말 숨기기. ★한 말은 늘 보인다 */
function kwShown(x, word){
  var c = kwCrit(); if(S().pin[x.kw]) return true;
  if((x.total || 0) < c.minVol) return false;
  var r = word ? relTo(word, x.kw) : x.rel;
  if(c.minRel === 1 ? r <= 0 : r < c.minRel) return false;
  return !(c.far === "hide" && word && isFar(x, word));
}
function kwCritHtml(){
  var c = kwCrit(), rank = 0, k = part("kw");
  function chip(on, key, label){ return "<button class=\"chip" + (on ? " on" : "") + "\" data-act=\"kc\" data-k=\"" + key + "\">" + label + "</button>" }
  function step(n, t, body){ return "<div class=\"it\"><span class=\"num muted\">" + n + "</span><div class=\"it-m\"><div class=\"it-h\"><b>" + t + "</b></div>" + body + "</div></div>" }
  var all = scored(), seen = all.filter(function(x){ return kwShown(x) }).length;
  var pri = "<div class=\"it-d\">위에 있을수록 크게 봐요 (1위 5 · 2위 4 · 3위 3 · 4위 2 · 5위 1). 끈 것은 안 봐요." + (c.set ? "" : " 지금은 기본 순서예요.") + "</div><div class=\"list\">" + c.order.map(function(id, i){
      var x = KWCRIT.filter(function(q){ return q.id === id })[0], off = c.off[id]; if(!x) return "";
      return "<div class=\"it\"><span class=\"num" + (off ? " muted" : "") + "\">" + (off ? "—" : ++rank) + "</span><div class=\"it-m\"" + (off ? " style=\"opacity:.5\"" : "") + "><div class=\"it-h\"><b>" + esc(x.name) + "</b></div><div class=\"it-d\">" + esc(x.what) + "</div></div>" +
        "<span style=\"display:flex;gap:2px\"><button class=\"mk\" data-act=\"kc\" data-k=\"up:" + id + "\" aria-label=\"" + esc(x.name) + " 위로\" title=\"위로\"" + (i ? "" : " disabled") + ">↑</button>" +
        "<button class=\"mk\" data-act=\"kc\" data-k=\"down:" + id + "\" aria-label=\"" + esc(x.name) + " 아래로\" title=\"아래로\"" + (i < c.order.length - 1 ? "" : " disabled") + ">↓</button>" +
        "<button class=\"mk" + (off ? "" : " no") + "\" data-act=\"kc\" data-k=\"off:" + id + "\" aria-pressed=\"" + !off + "\" title=\"" + (off ? "다시 보기" : "안 보기") + "\">" + (off ? "○" : "✓") + "</button></span></div>" }).join("") + "</div>";
  var ex0 = (seedsOf()[0] || {}).word || "씨앗 단어";
  var far = "<div class=\"it-d\">「" + esc(ex0) + "」 같은 씨앗을 넣으면 네이버는 씨앗 글자가 안 든 말도 같이 줘요. 이런 말을 어떻게 볼지 골라요.</div><div class=\"chips\">" +
    KW_FAR.map(function(o){ return chip(c.far === o[0], "far:" + o[0], o[1]) }).join("") + "</div>";
  var minVol = "<div class=\"chips\">" + KW_MINVOL.map(function(o){ return chip(c.minVol === o[0], "minVol:" + o[0], o[1]) }).join("") + "</div>";
  var minRel = "<div class=\"it-d\">씨앗과 글자가 하나도 안 겹치는 말을 거를지 골라요.</div><div class=\"chips\">" +
    KW_MINREL.map(function(o){ return chip(c.minRel === o[0], "minRel:" + o[0], o[1]) }).join("") + "</div>";
  return "<p class=\"it-d\">씨앗 단어의 연관 검색어와 전체 키워드를 이 기준으로 점수 매기고 줄 세워요. 바꾸면 바로 저장되고 키워드 칸에 바로 반영돼요." + (k ? " 지금 키워드 " + all.length + "개 중 " + seen + "개가 보여요 (★한 말은 늘 보여요)." : "") + "</p><div class=\"list\">" +
    step(1, "무엇을 먼저 볼까 (우선순위)", pri) + step(2, "씨앗 글자가 안 든 말", far) + step(3, "최소 검색량", minVol) + step(4, "씨앗과 얼마나 가까워야 하나", minRel) + "</div>" +
    kwCritSampleHtml();
}
/* 지금 기준으로 1~5위 — 씨앗마다 바뀐 결과를 바로 본다 */
function kwCritSampleHtml(){
  var sd = seedsOf(); if(!sd.length || !part("kw")) return "";
  return "<details class=\"wbox\"><summary><b>지금 기준으로 씨앗마다 1~5위</b></summary><div class=\"wbody\"><div class=\"list\">" + sd.map(function(x){
    var it = seedItems(x.word).filter(function(y){ return kwShown(y, x.word) }).slice(0, 5);
    return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><i class=\"dot " + (x.kind === "상품" ? "p" : "i") + "\" style=\"display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:var(--" + (x.kind === "상품" ? "prod" : "iden") + ")\"></i><b>" + esc(x.word) + "</b></div>" +
      "<div class=\"it-d\">" + (it.map(function(y){ return esc(y.kw) + " <span class=\"num\">" + y.score + "점</span>" }).join(" · ") || "보이는 말이 없어요") + "</div></div>" +
      "<button class=\"btn sm\" data-go=\"kw|seed=" + esc(x.word) + "\">보기</button></div>" }).join("") + "</div></div></details>";
}
function kwCritAct(k){
  var c = kwCrit(), o = { order: c.set ? c.order.slice() : undefined, off: Object.assign({}, c.off), far: c.far, minVol: c.minVol, minRel: c.minRel };
  var p = k.split(":");
  if(p[0] === "off") o.off[p[1]] = !o.off[p[1]];
  if(p[0] === "far") o.far = p[1];
  if(p[0] === "minVol") o.minVol = +p[1];
  if(p[0] === "minRel") o.minRel = +p[1];
  if(p[0] === "up" || p[0] === "down"){ o.order = c.order.slice(); var i = o.order.indexOf(p[1]), j = p[0] === "up" ? i - 1 : i + 1; if(j >= 0 && j < o.order.length){ o.order[i] = o.order[j]; o.order[j] = p[1] } }
  setS({ kwCrit: o });
}
