/* ── ③ 키워드 — 점수 매기기 · 비율대로 후보 뽑기 · 화면 ──
   점수(0~100)는 종류마다 다르게 본다 (화면 아래 「점수 계산」에 같은 설명):
     상품    = 검색량 60% + 광고 클릭률 25% + 상승세 15%   (사려는 사람이 찾는 말인지가 중요)
               클릭률은 월 검색 200 미만이면 그만큼 덜 믿는다 (검색 20에 클릭 4번이면 20%가 나오므로)
     정체성  = 검색량 70% + 상승세 30%                    (채널 성격에 맞는 넓은 주제 — 클릭률은 안 본다)
   검색량은 로그로 눌러 큰 키워드 하나가 다 가져가지 않게 한다. 상승세 = 구글 트렌드 최근 4주 ÷ 그 앞 8주. */
function riseOf(kw){ var t = part("trend"); var x = t && t.items && t.items[kw]; return x ? x : null }
function scored(){
  var k = part("kw"); if(!k || !k.items) return [];
  var max = { "상품": 0, "정체성": 0 };
  k.items.forEach(function(x){ if(x.total > (max[x.kind] || 0)) max[x.kind] = x.total });
  return k.items.map(function(x){
    var tr = riseOf(x.kw), rise = tr ? tr.rise : null;
    var vol = max[x.kind] ? Math.log10(x.total + 1) / Math.log10(max[x.kind] + 1) * 100 : 0;
    var ctr = Math.min(x.ctr || 0, 10) * 10 * Math.min(1, x.total / 200);
    var up = rise == null ? 50 : Math.max(0, Math.min(1, (rise - 0.5) / 1.5)) * 100;
    var score = x.kind === "상품" ? vol * .60 + ctr * .25 + up * .15 : vol * .70 + up * .30;
    return Object.assign({}, x, { rise: rise, w: tr ? tr.w : null, score: Math.round(score), buy: /^구매/.test(x.intent || "") && !/경쟁사 이름/.test(x.intent || "") });
  }).sort(function(a, b){ return b.score - a.score || b.total - a.total });
}
/* 비율 → 몇 개씩: 상품 nP · 정체성 nI, 상품 안에서는 상품 비중대로 (나머지는 큰 쪽부터) */
function split(s){
  var nP = Math.round(s.count * s.ratio / 100), nI = s.count - nP, names = Object.keys(s.share);
  var sum = names.reduce(function(a, n){ return a + s.share[n] }, 0), per = {}, used = 0;
  var fr = names.map(function(n){ var raw = sum ? nP * s.share[n] / sum : 0; per[n] = Math.floor(raw); used += per[n]; return [n, raw - per[n]] })
    .sort(function(a, b){ return b[1] - a[1] });
  for(var i = 0; used < nP && fr.length; i = (i + 1) % fr.length){ per[fr[i][0]]++; used++ }
  return { nP: nP, nI: nI, per: per };
}
/* 이번 조사 후보: 고정한 것 먼저, 그다음 점수순. 뺀 것·(켜 두면) 이미 조사한 것·구매 결 아닌 상품 키워드는 뺀다 */
function candidates(s){
  var all = scored(), sp = split(s), out = [];
  function ok(x){ return !s.ex[x.kw] && (s.pin[x.kw] || ((!s.fresh || !x.surveyed) && (x.kind !== "상품" || !s.buyOnly || x.buy))) }
  function take(pool, n){ pool.filter(function(x){ return s.pin[x.kw] }).concat(pool.filter(function(x){ return !s.pin[x.kw] })).slice(0, n).forEach(function(x){ out.push(x) }) }
  Object.keys(sp.per).forEach(function(name){ take(all.filter(function(x){ return x.kind === "상품" && x.product === name && ok(x) }), sp.per[name]) });
  var short = sp.nP - out.length;   // 어느 상품 후보가 모자라면 다른 상품 키워드로 채운다
  if(short > 0) take(all.filter(function(x){ return x.kind === "상품" && ok(x) && out.indexOf(x) < 0 }), short);
  take(all.filter(function(x){ return x.kind === "정체성" && ok(x) }), sp.nI);
  return out;
}
function spark(w){
  if(!w || w.length < 8) return "";
  var v = w.slice(-26), mx = Math.max.apply(null, v) || 1, W = 64, H = 18;
  var pts = v.map(function(y, i){ return (i / (v.length - 1) * W).toFixed(1) + "," + (H - 1 - y / mx * (H - 2)).toFixed(1) }).join(" ");
  return "<svg class=\"spark\" width=\"" + W + "\" height=\"" + H + "\" viewBox=\"0 0 " + W + " " + H + "\" aria-hidden=\"true\"><polyline points=\"" + pts + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/></svg>";
}
function riseHtml(x){
  if(x.rise == null) return x.w ? "<span class=\"muted\">" + spark(x.w) + " 값 적음</span>" : "<span class=\"muted\">추세 없음</span>";
  var cls = x.rise >= 1.15 ? "up" : x.rise <= 0.85 ? "down" : "muted";
  return "<span class=\"" + cls + "\">" + spark(x.w) + " " + (x.rise >= 1.15 ? "▲" : x.rise <= 0.85 ? "▼" : "") + "×" + x.rise.toFixed(2) + "</span>";
}
function kwRow(x, s, mark){
  return "<div class=\"it" + (s.ex[x.kw] ? " off" : "") + "\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.kw) + "</b> <span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" +
    esc(x.kind === "상품" ? (x.product || "상품") : "정체성") + "</span>" + (x.surveyed ? " <span class=\"tag\">조사함</span>" : "") + "</div>" +
    "<div class=\"it-d\"><span class=\"num\">월 " + fmt(x.total) + "</span> · 클릭률 " + (x.ctr == null ? "—" : x.ctr + "%") + " · " + riseHtml(x) + " · <b class=\"num\">" + x.score + "점</b></div>" +
    "<div class=\"it-d\">" + (x.buy ? "<span class=\"tag ok\">구매</span> " : "") + esc(x.intent || "") + "</div></div>" +
    (mark ? "<button class=\"mk\" data-pin=\"" + esc(x.kw) + "\" aria-pressed=\"" + !!s.pin[x.kw] + "\" title=\"후보에 고정\" aria-label=\"후보에 고정\">★</button>" +
            "<button class=\"mk no\" data-ex=\"" + esc(x.kw) + "\" aria-pressed=\"" + !!s.ex[x.kw] + "\" title=\"후보에서 빼기\" aria-label=\"후보에서 빼기\">✕</button>" : "") + "</div>";
}
function viewKw(){
  var b = B(), k = part("kw"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  if(!k) return "<p class=\"empty\">아직 키워드 자료가 없어요. 조사를 한 번 돌리면 채워져요.</p>";
  var s = S(), all = scored(), c = candidates(s), sp = split(s), t = part("trend");
  var nP = c.filter(function(x){ return x.kind === "상품" }).length;
  var h = runHtml(["discover", "trends"]);
  h += "<section class=\"card\"><div class=\"card-h\"><h3>이번 조사 후보</h3><span class=\"n\">상품 " + nP + " · 정체성 " + (c.length - nP) + "</span></div>" +
    "<p class=\"lead\">② 비율(상품 " + s.ratio + " : 정체성 " + (100 - s.ratio) + ")대로 점수가 높은 키워드를 뽑았어요. ★은 고정, ✕는 빼기." +
    (c.length < s.count ? " 조건에 맞는 키워드가 " + (s.count - c.length) + "개 모자라요 — 아래 조건을 풀거나 조사를 돌려 새 키워드를 받으세요." : "") + "</p>" +
    "<div class=\"chips\" style=\"margin-bottom:6px\"><button class=\"chip" + (s.buyOnly ? " on" : "") + "\" data-set=\"buyOnly=" + !s.buyOnly + "\">상품은 구매 결만</button>" +
    "<button class=\"chip" + (s.fresh ? " on" : "") + "\" data-set=\"fresh=" + !s.fresh + "\">이미 조사한 것 빼기</button></div>" +
    "<div class=\"list\">" + (c.map(function(x){ return kwRow(x, s, true) }).join("") || "<p class=\"empty\">후보가 없어요.</p>") + "</div>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"discover\"" + (openCmd("discover") || !c.length ? " disabled" : "") + ">이 구성으로 조사 돌리기</button>" +
    "<button class=\"btn\" data-act=\"trends\"" + (openCmd("trends") ? " disabled" : "") + ">구글 트렌드 다시 받기</button></div>" +
    "<p class=\"lead\" style=\"margin-top:10px\">조사는 맥의 Claude가 콘텐츠 발굴 스킬로 돌려요 (키워드 검색량 → 경쟁사 → 레퍼런스 20개 → 시트·카드 → 이 앱).</p></section>";
  var list = all.filter(function(x){ return ui.kwKind === "all" || (ui.kwKind === "up" ? x.rise != null && x.rise >= 1.15 : x.kind === ui.kwKind) });
  var nUp = all.filter(function(x){ return x.rise != null && x.rise >= 1.15 }).length;
  h += "<section class=\"card\"><div class=\"card-h\"><h3>전체 키워드</h3><span class=\"n\">" + list.length + "개</span></div><div class=\"chips\">" +
    [["all", "전체", all.length], ["상품", "상품", all.filter(function(x){ return x.kind === "상품" }).length], ["정체성", "정체성", all.filter(function(x){ return x.kind === "정체성" }).length], ["up", "▲ 오르는 중", nUp]]
      .map(function(f){ return "<button class=\"chip" + (ui.kwKind === f[0] ? " on" : "") + "\" data-ui=\"kwKind=" + f[0] + "\">" + f[1] + "<span>" + f[2] + "</span></button>" }).join("") + "</div>" +
    "<div class=\"list\" style=\"margin-top:6px\">" + list.slice(0, ui.kwMore).map(function(x){ return kwRow(x, s, true) }).join("") + "</div>" +
    (list.length > ui.kwMore ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"kwMore=" + (ui.kwMore + 100) + "\">더 보기 (" + (list.length - ui.kwMore) + "개 남음)</button></div>" : "") + "</section>";
  h += "<section class=\"card\"><details><summary>점수 계산 · 자료 출처</summary><div class=\"small\" style=\"margin-top:8px;display:grid;gap:6px\">" +
    "<p><span class=\"tag p\">상품</span> 검색량 60% + 광고 클릭률 25% + 상승세 15%. 클릭률이 높을수록 사려는 사람이 찾는 말이에요. 월 검색 200 미만이면 클릭률을 그만큼 덜 믿어요.</p>" +
    "<p><span class=\"tag i\">정체성</span> 검색량 70% + 상승세 30%. 채널 성격에 맞는 넓은 주제라 클릭률은 안 봐요.</p>" +
    "<p>검색량·클릭률: " + esc(k.source || "") + " · " + day(k.updatedAt) + "</p>" +
    "<p>상승세(최근 4주 ÷ 그 앞 8주): " + (t ? esc(t.source || "") + " · " + day(t.updatedAt) + " · " + Object.keys(t.items || {}).length + "개 키워드" : "아직 받지 않음") + ". 검색이 적은 키워드는 구글이 값을 0으로 줘서 「값 적음」으로 두고 점수에서는 중간값으로 봐요.</p>" +
    "<p>정체성 키워드의 구매 결은 아직 검증 전이에요 (조사를 돌리면 유튜브 상위 제목으로 확인).</p></div></details></section>";
  return h;
}
