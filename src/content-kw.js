/* ── 키워드 탭 — 점수 매기기 · 비율대로 후보 뽑기 · 화면 ──
   점수(0~100)는 종류마다 다르게 본다. 무엇을 얼마나 볼지는 판정 믹서 값이다 (content-mixer.js · 볼트 믹서.json) — 여기에 비중을 적지 않는다:
     상품    = 검색량(kw_vol) · 광고 클릭률(kw_ctr) · 상승세(kw_rise) 의 가중 평균   (사려는 사람이 찾는 말인지가 중요)
               클릭률은 월 검색 200 미만이면 그만큼 덜 믿는다 (검색 20에 클릭 4번이면 20%가 나오므로)
     정체성  = 검색량(id_vol) · 상승세(id_rise) 의 가중 평균   (채널 성격에 맞는 넓은 주제 — 클릭률은 안 본다)
   검색량은 로그로 눌러 큰 키워드 하나가 다 가져가지 않게 한다. 상승세 = 구글 트렌드 최근 4주 ÷ 그 앞 8주. */
/* 다른 도구에서 가져온 보는 법 (자료는 네이버 검색광고 값 그대로 — 새로 추정하지 않는다)
     난이도 (Ahrefs 키워드 난이도) = 광고 경쟁: 경쟁정도 높음 + 노출 광고 9개 이상 → 어려움 · 노출 광고 5개 이하나 경쟁정도 낮음 → 쉬움 · 그 사이 보통
     주제 묶음 (Ahrefs 상위 주제) = 브랜드.json clusters 의 말이 든 키워드끼리 묶어 검색량을 더한다 — 키워드 하나가 아니라 주제의 크기를 본다
     빈 곳 (Ahrefs 콘텐츠 갭) = 구매 결인 상품 키워드인데 아직 조사하지 않았고, 레퍼런스 검색어·추천 제목 어디에도 안 나온 것 */
/* 씨앗 단어 — 브랜드마다 「브랜드 정체성 단어」와 「상품별 판매 단어」를 동욱이 넣고 뺀다 (브랜드 탭 · 한 쪽에 SEED_MAX 개까지).
   맥이 씨앗마다 연관 검색어를 받아 키워드.json 에 seed 를 달아 둔다 (content_app.py seeds). 받는 곳(seedSrc) = 네이버 검색광고 · 구글 트렌드 · 둘 다.
   고친 것은 ct.set(Supabase)에 바로 쓰이고, 맥 동기화가 설정.json 과 브랜드.json 정본에도 적는다 → ct.data/<브랜드> 도 따라 바뀐다. */
var SEED_MAX = 10;
var SEED_SRC = [["naver", "네이버 검색광고"], ["google", "구글 트렌드"], ["both", "둘 다"]];
function seedsOf(){ return ((SETS[cur] || {}).seeds || (B() && B().seeds) || []).filter(function(x){ return x.word }) }
function seedSrc(){ return (SETS[cur] || {}).seedSrc || (B() && B().seedSrc) || "naver" }
function isFar(x, word){ return (x.far || []).indexOf(word) >= 0 }   // 씨앗이 안 든 말 — 구글 관련 검색어로만 들어온 것
function seedItems(word, far){ return scored().filter(function(x){ return (x.seed || []).indexOf(word) >= 0 && (far == null || isFar(x, word) === far) }).sort(function(a, b){ return b.total - a.total || (b.gTop || 0) - (a.gTop || 0) }) }
function seedRun(word){ var k = part("kw"); return ((k && k.seeds) || []).filter(function(x){ return x.word === word })[0] || null }
function seedsPending(){ var k = part("kw"), have = ((k && k.seeds) || []).map(function(x){ return x.word }).join("|") + "@" + ((k && k.seedSrc) || "naver"); return seedsOf().map(function(x){ return x.word }).join("|") + "@" + seedSrc() !== have }
function seedRowHtml(x, s){
  var r = seedRun(x.word), n = seedItems(x.word, false), nf = seedItems(x.word, true).length;
  return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.word) + "</b></div>" +
    "<div class=\"it-d\">" + (r ? "연관 검색어 " + n.length + "개" + (nf ? " · 구글이 같이 찾은 말 " + nf + "개" : "") + " · 검색량 합 월 " + fmt(n.reduce(function(a, y){ return a + y.total }, 0)) + " · ★ " + n.filter(function(y){ return s.pin[y.kw] }).length +
      (r.error ? " · <span class=\"down\">" + esc(r.error) + "</span>" : "") : (seedsPending() ? "맥이 받는 중" : "아직 안 받음")) + "</div></div>" +
    "<button class=\"btn sm\" data-go=\"kw|seed=" + esc(x.word) + "\">검색어</button><button class=\"mk no\" data-act=\"seeddel\" data-word=\"" + esc(x.word) + "\" aria-label=\"" + esc(x.word) + " 빼기\" title=\"빼기\">✕</button></div>";
}
function seedAddHtml(key, n, hint){   // key = "정체성" 또는 "상품:<상품 이름>"
  if(n >= SEED_MAX) return "";
  return "<div class=\"row2\" style=\"margin-top:6px\"><input type=\"text\" data-addseed=\"" + esc(key) + "\" maxlength=\"20\" placeholder=\"" + esc(hint) + "\" value=\"" + esc((ui.seedDraft || {})[key] || "") + "\">" +
    "<button class=\"btn sm primary\" data-act=\"seedadd\" data-key=\"" + esc(key) + "\">넣기</button></div>";
}
function seedSrcHtml(){
  var v = seedSrc();
  return "<div class=\"chips\">" + SEED_SRC.map(function(o){ return "<button class=\"chip" + (v === o[0] ? " on" : "") + "\" data-act=\"seedsrc\" data-v=\"" + o[0] + "\">" + o[1] + "</button>" }).join("") + "</div>" +
    "<p class=\"lead\" style=\"margin-top:6px\">네이버 = 한국 검색량·광고 클릭률(살 사람이 찾는 말) · 구글 트렌드 = 관련 검색어의 인기와 상승세(요즘 뜨는 말) · 둘 다 = 구글에서 나온 말에도 네이버 검색량을 붙여요. 바꾸면 맥이 다시 받아요.</p>";
}
function seedPendingHtml(){ return seedsPending() ? "<p class=\"note\" style=\"margin-top:10px\">씨앗 단어나 받는 곳이 바뀌었어요 — 맥이 연관 검색어를 받는 중이에요 (1분 안팎, 맥이 켜져 있어야 해요).</p>" : "" }
/* 브랜드 탭 — 정체성 카드 안 「브랜드 정체성 단어」 */
function identityWordsHtml(){
  var s = S(), list = seedsOf().filter(function(x){ return x.kind === "정체성" });
  return "<h4><span class=\"tag i\">정체성</span> 브랜드 정체성 단어 <span class=\"num muted\">" + list.length + "</span></h4>" +
    "<p class=\"lead\">채널 성격을 말하는 단어예요. 이 단어가 들어간 연관 검색어가 풀링(처음 보는 사람 끌어오기) 재료가 돼요.</p>" +
    "<div class=\"list\">" + list.map(function(x){ return seedRowHtml(x, s) }).join("") + "</div>" + seedAddHtml("정체성", list.length, "정체성 단어 넣기 (예: 사내행사)");
}
/* 브랜드 탭 — 판매 상품 카드 안, 상품마다 「판매 단어」 */
function productWordsHtml(name){
  var s = S(), list = seedsOf().filter(function(x){ return x.kind === "상품" && x.product === name });
  return "<div class=\"list\" style=\"margin-top:4px\">" + list.map(function(x){ return seedRowHtml(x, s) }).join("") + "</div>" + seedAddHtml("상품:" + name, list.length, "「" + name + "」 판매 단어 넣기");
}
/* 키워드 탭 맨 위 — 씨앗을 고르면 그 씨앗의 연관 검색어. 단어 고치기는 브랜드 탭 한 곳에서 */
function seedsHtml(){
  var sd = seedsOf(), s = S(), src = SEED_SRC.filter(function(o){ return o[0] === seedSrc() })[0];
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>씨앗 단어</h3><button class=\"chip\" data-go=\"brand\">단어 고치기 →</button></div>" +
    "<p class=\"lead\">브랜드 정체성 단어와 상품 판매 단어마다 " + esc(src ? src[1] : "") + (seedSrc() === "both" ? "(네이버 + 구글)" : "") + "에서 받은 연관 검색어예요. 쓸 검색어에 ★을 누르면 「검증한 키워드」가 되고, 다음 단계(조사·추천·대본)는 ★한 것 위주로 가요.</p>" +
    (sd.length ? "" : "<p class=\"note\">아직 씨앗 단어가 없어요. 브랜드 탭에서 넣으세요.</p>") + seedPendingHtml() + "</section>";
  var pickW = ui.seed && sd.some(function(x){ return x.word === ui.seed }) ? ui.seed : (sd[0] || {}).word;
  if(pickW){
    var list = seedItems(pickW, false), far = seedItems(pickW, true), more = ui.seedMore || 15;
    h += "<section class=\"card\" id=\"seed-list\"><div class=\"card-h\"><h3>「" + esc(pickW) + "」 연관 검색어</h3><span class=\"n\">검색량 순 · " + list.length + "개</span></div><div class=\"chips\">" +
      sd.map(function(x){ return "<button class=\"chip" + (x.word === pickW ? " on" : "") + "\" data-ui=\"seed=" + esc(x.word) + "\"><i class=\"dot " + (x.kind === "상품" ? "p" : "i") + "\"></i>" + esc(x.word) + "<span>" + seedItems(x.word, false).length + "</span></button>" }).join("") + "</div>" +
      "<div class=\"list\" style=\"margin-top:6px\">" + (list.slice(0, more).map(function(x){ return kwRow(x, s, true) }).join("") || "<p class=\"empty\">이 씨앗이 들어간 연관 검색어가 없어요. 브랜드 탭에서 더 넓은 단어로 바꿔 보세요.</p>") + "</div>" +
      (list.length > more ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"seedMore=" + (more + 25) + "\">더 보기 (" + (list.length - more) + "개 남음)</button></div>" : "") +
      (far.length ? "<details style=\"margin-top:12px\"><summary>구글이 같이 찾은 말 " + far.length + "개 — 「" + esc(pickW) + "」이 안 든 관련 검색어</summary><p class=\"lead\" style=\"margin-top:6px\">구글 트렌드에서 이 단어와 함께 검색된 말이에요. 쓸 만한 것만 ★하세요.</p><div class=\"list\">" +
        far.map(function(x){ return kwRow(x, s, true) }).join("") + "</div></details>" : "") + "</section>";
  }
  return h;
}
function diffOf(x){ return x.comp === "높음" && x.ads >= 9 ? "어려움" : (x.ads <= 5 || x.comp === "낮음") ? "쉬움" : "보통" }
function clusterOf(kw){
  var cs = (B() && B().clusters) || [];
  for(var i = 0; i < cs.length; i++){ if(new RegExp(cs[i].match).test(kw)) return cs[i].name }
  return "그 밖";
}
function coveredText(){
  var r = part("ref"), rc = part("rec"), t = "";
  if(r) r.items.forEach(function(x){ t += " " + x.query });
  if(rc) rc.rounds.forEach(function(rd){ rd.items.forEach(function(x){ t += " " + x.title }) });
  return t.replace(/\s+/g, "");
}
function riseOf(kw){ var t = part("trend"); var x = t && t.items && t.items[kw]; return x ? x : null }
function scored(){
  var k = part("kw"); if(!k || !k.items) return [];
  var max = { "상품": 0, "정체성": 0 };
  k.items.forEach(function(x){ if(x.total > (max[x.kind] || 0)) max[x.kind] = x.total });
  var cov = coveredText(), m = M();
  function w(id){ return m[id] != null ? m[id] : 1 }   // 믹서 정의가 아직 안 왔으면 고르게
  return k.items.map(function(x){
    var tr = riseOf(x.kw), rise = tr ? tr.rise : null;
    var vol = max[x.kind] ? Math.log10(x.total + 1) / Math.log10(max[x.kind] + 1) * 100 : 0;
    var ctr = Math.min(x.ctr || 0, 10) * 10 * Math.min(1, x.total / 200);
    var up = rise == null ? 50 : Math.max(0, Math.min(1, (rise - 0.5) / 1.5)) * 100;
    var score = x.kind === "상품" ? wsum([[w("kw_vol"), vol], [w("kw_ctr"), ctr], [w("kw_rise"), up]]) : wsum([[w("id_vol"), vol], [w("id_rise"), up]]);
    return Object.assign({}, x, { rise: rise, w: tr ? tr.w : null, score: Math.round(score), buy: /^구매/.test(x.intent || "") && !/경쟁사 이름/.test(x.intent || ""), diff: diffOf(x), cluster: clusterOf(x.kw) });
  }).map(function(x){ return Object.assign(x, { gap: x.kind === "상품" && x.buy && !x.surveyed && x.total >= 10 && cov.indexOf(x.kw) < 0 });
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
function candidates(s){   // ★(검증한 키워드)은 비율·조건과 상관없이 먼저 다 넣고, 「★만 조사」가 아니면 남은 자리를 비율대로 점수순으로 채운다
  var all = scored(), out = all.filter(function(x){ return s.pin[x.kw] && !s.ex[x.kw] });
  if(s.pinOnly && out.length) return out;
  var sp = split(Object.assign({}, s, { count: Math.max(0, s.count - out.length) }));
  function ok(x){ return !s.ex[x.kw] && (s.pin[x.kw] || ((!s.fresh || !x.surveyed) && (x.kind !== "상품" || !s.buyOnly || x.buy))) }
  function take(pool, n){ pool.filter(function(x){ return out.indexOf(x) < 0 }).slice(0, n).forEach(function(x){ out.push(x) }) }
  Object.keys(sp.per).forEach(function(name){ take(all.filter(function(x){ return x.kind === "상품" && x.product === name && ok(x) }), sp.per[name]) });
  var short = sp.nP - out.filter(function(x){ return x.kind === "상품" && !s.pin[x.kw] }).length;   // 어느 상품 후보가 모자라면 다른 상품 키워드로 채운다
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
var RISE_UP = 1.15, RISE_DOWN = 0.85;   // 상승세를 「오르는 중」·「내리는 중」으로 보는 선
function isUp(x){ return x.rise != null && x.rise >= RISE_UP }
function riseHtml(x){
  if(x.rise == null) return x.w ? "<span class=\"muted\">" + spark(x.w) + " 값 적음</span>" : "<span class=\"muted\">추세 없음</span>";
  var cls = isUp(x) ? "up" : x.rise <= RISE_DOWN ? "down" : "muted";
  return "<span class=\"" + cls + "\">" + spark(x.w) + " " + (isUp(x) ? "▲" : x.rise <= RISE_DOWN ? "▼" : "") + "×" + x.rise.toFixed(2) + "</span>";
}
function kwRow(x, s, mark){
  return "<div class=\"it" + (s.ex[x.kw] ? " off" : "") + "\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.kw) + "</b> <span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" +
    esc(x.kind === "상품" ? (x.product || "상품") : "정체성") + "</span>" + (x.surveyed ? " <span class=\"tag\">조사함</span>" : "") + (x.gap ? " <span class=\"tag ok\">빈 곳</span>" : "") + "</div>" +
    "<div class=\"it-d\"><span class=\"num\">월 " + fmt(x.total) + "</span> · 클릭률 " + (x.ctr == null ? "—" : x.ctr + "%") + " · 경쟁 " + x.diff + " · " + riseHtml(x) + (x.gRise ? " · <span class=\"up\">구글 ▲" + esc(x.gRise) + "</span>" : x.gTop != null ? " · 구글 인기 " + x.gTop : "") + " · <b class=\"num\">" + x.score + "점</b></div>" +
    "<div class=\"it-d\">" + (x.buy ? "<span class=\"tag ok\">" + esc(x.intent) + "</span>" : esc(x.intent || "")) + "</div></div>" +
    (mark ? "<button class=\"mk\" data-pin=\"" + esc(x.kw) + "\" aria-pressed=\"" + !!s.pin[x.kw] + "\" title=\"검증한 키워드로 고정\" aria-label=\"검증한 키워드로 고정\">★</button>" +
            "<button class=\"mk no\" data-ex=\"" + esc(x.kw) + "\" aria-pressed=\"" + !!s.ex[x.kw] + "\" title=\"후보에서 빼기\" aria-label=\"후보에서 빼기\">✕</button>" : "") + "</div>";
}
function viewKw(){
  var b = B(), k = part("kw"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  if(!k) return seedsHtml() + "<section class=\"card\"><div class=\"card-h\"><h3>첫 조사</h3></div><p class=\"lead\">이 브랜드는 아직 키워드 자료가 없어요. 첫 조사를 누르면 맥의 Claude가 채널 기획안으로 조사 프로필 초안부터 만들고, 기획안에 없는 칸(키워드 힌트 등)은 지어내지 않고 되물어요. 답한 뒤 다시 누르면 조사가 돌아요.</p>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"discover\"" + (openCmd("discover") ? " disabled" : "") + ">첫 조사 시작하기</button></div></section>";
  var s = S(), all = scored(), c = candidates(s), sp = split(s), t = part("trend");
  var h0 = seedsHtml();
  var nP = c.filter(function(x){ return x.kind === "상품" }).length;
  var h = h0 + "<section class=\"card\"><div class=\"card-h\"><h3>이번 조사 후보</h3><span class=\"n\">상품 " + nP + " · 정체성 " + (c.length - nP) + "</span></div>" +
    "<p class=\"lead\">비율 탭 값(상품 " + s.ratio + " : 정체성 " + (100 - s.ratio) + ")대로 뽑되, ★한 검증 키워드를 먼저 다 넣고 남은 자리만 점수순으로 채워요. 「★만 조사」를 켜면 ★한 것만 조사해요. ✕는 빼기 — 뺀 것은 아래 「뺀 것」 칩에서 되살려요." +
    (c.length < s.count ? " 조건에 맞는 키워드가 " + (s.count - c.length) + "개 모자라요 — 아래 조건을 풀거나 조사를 돌려 새 키워드를 받으세요." : "") + "</p>" +
    "<div class=\"chips\" style=\"margin-bottom:6px\"><button class=\"chip" + (s.pinOnly ? " on" : "") + "\" data-set=\"pinOnly=" + !s.pinOnly + "\">★만 조사</button><button class=\"chip" + (s.buyOnly ? " on" : "") + "\" data-set=\"buyOnly=" + !s.buyOnly + "\">상품은 구매 결만</button>" +
    "<button class=\"chip" + (s.fresh ? " on" : "") + "\" data-set=\"fresh=" + !s.fresh + "\">이미 조사한 것 빼기</button></div>" +
    "<div class=\"list\">" + (c.map(function(x){ return kwRow(x, s, true) }).join("") || "<p class=\"empty\">후보가 없어요.</p>") + "</div>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"discover\"" + (openCmd("discover") || !c.length ? " disabled" : "") + ">이 구성으로 조사 돌리기</button>" +
    "<button class=\"btn\" data-act=\"trends\"" + (openCmd("trends") ? " disabled" : "") + ">구글 트렌드 다시 받기</button></div>" +
    "<p class=\"lead\" style=\"margin-top:10px\">조사는 맥의 Claude가 콘텐츠 발굴 스킬로 돌려요 (키워드 검색량 → 경쟁사 → 레퍼런스 20개 → 시트·카드 → 이 앱). 누르면 진행 상태가 화면 맨 위에 떠요.</p></section>";
  h += clustersHtml(all);
  var pool = all.filter(function(x){ return !ui.kwCluster || x.cluster === ui.kwCluster });   // 묶음을 골랐으면 칩 숫자도 그 묶음 안에서 센다
  var KF = { all: function(){ return true }, "상품": function(x){ return x.kind === "상품" }, "정체성": function(x){ return x.kind === "정체성" }, up: isUp, gap: function(x){ return x.gap },
             pin: function(x){ return s.pin[x.kw] }, ex: function(x){ return s.ex[x.kw] } };
  var list = pool.filter(KF[ui.kwKind] || KF.all);
  h += "<section class=\"card\" id=\"kw-list\"><div class=\"card-h\"><h3>" + (ui.kwCluster ? esc(ui.kwCluster) + " 묶음" : "전체 키워드") + "</h3><span class=\"n\">" + list.length + "개</span></div><div class=\"chips\">" +
    (ui.kwCluster ? "<button class=\"chip on\" data-ui=\"kwCluster=\">" + esc(ui.kwCluster) + " ✕</button>" : "") +
    [["all", "전체"], ["상품", "상품"], ["정체성", "정체성"], ["up", "▲ 오르는 중"], ["gap", "빈 곳"], ["pin", "★ 고정"], ["ex", "✕ 뺀 것"]]
      .map(function(f){ return "<button class=\"chip" + (ui.kwKind === f[0] ? " on" : "") + "\" data-ui=\"kwKind=" + f[0] + "\">" + f[1] + "<span>" + pool.filter(KF[f[0]]).length + "</span></button>" }).join("") + "</div>" +
    "<div class=\"list\" style=\"margin-top:6px\">" + list.slice(0, ui.kwMore).map(function(x){ return kwRow(x, s, true) }).join("") + "</div>" +
    (list.length > ui.kwMore ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"kwMore=" + (ui.kwMore + 100) + "\">더 보기 (" + (list.length - ui.kwMore) + "개 남음)</button></div>" : "") + "</section>";
  h += "<section class=\"card\"><details><summary>점수 계산 · 자료 출처</summary><div class=\"small\" style=\"margin-top:8px;display:grid;gap:6px\">" +
    "<p><span class=\"tag p\">상품</span> 검색량 " + M().kw_vol + " : 광고 클릭률 " + M().kw_ctr + " : 상승세 " + M().kw_rise + " 비중. 클릭률이 높을수록 사려는 사람이 찾는 말이에요. 월 검색 200 미만이면 클릭률을 그만큼 덜 믿어요.</p>" +
    "<p><span class=\"tag i\">정체성</span> 검색량 " + M().id_vol + " : 상승세 " + M().id_rise + " 비중. 채널 성격에 맞는 넓은 주제라 클릭률은 안 봐요.</p>" +
    "<p>비중은 <button class=\"chip\" data-tab=\"mixer\">믹서 탭</button>에서 바꿔요 (지금 템플릿: " + esc(mixTpl().name) + ").</p>" +
    "<p>검색량·클릭률: " + esc(k.source || "") + " · " + day(k.updatedAt) + "</p>" +
    "<p>상승세(최근 4주 ÷ 그 앞 8주): " + (t ? esc(t.source || "") + " · " + day(t.updatedAt) + " · " + Object.keys(t.items || {}).length + "개 키워드" : "아직 받지 않음") + ". 검색이 적은 키워드는 구글이 값을 0으로 줘서 「값 적음」으로 두고 점수에서는 중간값으로 봐요.</p>" +
    "<p>경쟁(난이도): 네이버 경쟁정도와 월평균 노출 광고 수로 봐요 — 높음 + 광고 9개 이상이면 어려움, 광고 5개 이하면 쉬움. 주제 묶음: 같은 주제 말이 든 키워드의 검색량을 더한 값. 빈 곳: 구매 결인데 아직 조사·추천에 안 나온 키워드.</p>" +
    "<p>정체성 키워드의 구매 결은 아직 검증 전이에요 (조사를 돌리면 유튜브 상위 제목으로 확인).</p></div></details></section>";
  return h;
}
/* 주제 묶음 — 묶음을 누르면 아래 목록이 그 묶음만 보인다 */
function clustersHtml(all){
  var m = {}, order = [];
  all.forEach(function(x){ var c = m[x.cluster]; if(!c){ c = m[x.cluster] = { name: x.cluster, n: 0, total: 0, buy: 0, done: 0, gap: 0, top: [] }; order.push(c) }
    c.n++; c.total += x.total; if(x.buy) c.buy++; if(x.surveyed) c.done++; if(x.gap) c.gap++; if(c.top.length < 3) c.top.push(x.kw) });
  if(order.length < 2) return "";
  order.sort(function(a, b){ return b.total - a.total });
  return "<section class=\"card\"><details" + (ui.kwCluster ? " open" : "") + "><summary>주제 묶음 " + order.length + "개 — 키워드 하나가 아니라 주제의 크기로 보기</summary><div class=\"list\" style=\"margin-top:6px\">" +
    order.map(function(c){
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(c.name) + "</b> <span class=\"num muted\">월 " + fmt(c.total) + "</span></div>" +
        "<div class=\"it-d\">키워드 " + c.n + " · 구매 결 " + c.buy + " · 조사함 " + c.done + (c.gap ? " · <span class=\"up\">빈 곳 " + c.gap + "</span>" : "") + " · " + esc(c.top.join(" · ")) + "</div></div>" +
        "<button class=\"btn sm\" data-ui=\"kwCluster=" + esc(c.name) + "\">보기</button></div>";
    }).join("") + "</div></details></section>";
}
