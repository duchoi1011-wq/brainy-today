/* ── 한눈에 탭 — 씨앗 단어 → 뽑은 검색어 → 검증한 키워드·주제 → 레퍼런스 채널·조사 시트 → 대본 을 한 화면에 ──
   (2026-11-16 동욱: "참고 페이지와 뽑아낸 검색어와 정리된 시트 등을 한 번에 쉽게 파악할 수 있게")
   새 자료를 만들지 않는다 — 다른 탭이 쓰는 자료(키워드·설정·브랜드 레퍼런스·레퍼런스·추천·대본·기록)를 같은 함수로 읽어 줄여 보여 주고, 누르면 그 탭으로 간다. */
function goBtn(label, to){ return "<button class=\"chip\" data-go=\"" + esc(to) + "\">" + label + " →</button>" }
/* 다음 할 일 — 동욱이 고른 것(씨앗 단어 → ★ 검증 키워드 → ＋ 고른 추천)을 따라 지금 한 걸음만 보여 준다. 한눈에 맨 위와 브랜드·키워드·추천 탭 맨 아래에 같은 것을 쓴다 */
function nextStep(){
  var b = B(); if(!b) return null;
  var s = S(), sd = seedsOf(), all = scored(), pins = all.filter(function(x){ return s.pin[x.kw] && !s.ex[x.kw] });
  var rc = part("rec"), rd = rc && rc.rounds && rc.rounds[rc.rounds.length - 1], picks = pickedIds(s), noScript = picks.filter(function(id){ return !scriptOf(id) });
    if(!sd.length) return { n: 1, t: "검색어를 뽑을 단어 넣기", d: "브랜드 탭에서 브랜드 정체성 단어와 상품 판매 단어를 넣으세요.", go: "brand" };
  if(seedsPending()) return { n: 2, t: "연관 검색어 받는 중", d: "맥이 단어마다 연관 검색어를 받고 있어요 (1분 안팎). 다 받으면 키워드 탭에서 ★로 고르세요.", go: "kw" };
  if(!pins.length) return { n: 3, t: "쓸 검색어 ★로 고르기", d: "키워드 탭에서 씨앗 단어별 연관 검색어를 보고 쓸 것에 ★을 누르세요. 다음 단계는 ★한 것 위주로 가요.", go: "kw" };
  var sr = part("search"), searched = {}; ((sr && sr.runs) || []).forEach(function(r){ searched[r.kw] = 1 });
  var unsearched = pins.filter(function(x){ return !searched[x.kw] });
  if(unsearched.length) return { n: 4, t: "★ 키워드로 콘텐츠 검색", d: "★한 " + pins.length + "개 중 " + unsearched.length + "개로 아직 콘텐츠를 안 찾아봤어요 (" + unsearched.slice(0, 4).map(function(x){ return x.kw }).join(" · ") + (unsearched.length > 4 ? " …" : "") + "). 맥이 유튜브에서 미드폼·롱폼을 찾아 와요.", act: "search", btn: "★ 키워드로 콘텐츠 검색", busy: searchState().busy };
  if(!Object.keys((SETS[cur] || {}).favc || {}).length) return { n: 5, t: "좋은 콘텐츠 ☆ 즐겨찾기", d: "콘텐츠 탭 「키워드로 찾은 콘텐츠」에서 좋은 영상에 ☆를 누르세요. 추천은 ☆한 콘텐츠와 ★ 키워드 위주로 가요.", go: "ref|refView=search" };
  if(!rd || (rc.updatedAt && sr && Date.parse(sr.updatedAt) > Date.parse(rc.updatedAt))) return { n: 6, t: "★ 검색어 위주로 추천 받기", d: "★ 키워드 " + pins.length + "개와 ☆ 콘텐츠 위주로 찍을 주제를 추천받으세요.", act: "recommend", btn: "★ 위주로 추천 받기", busy: openCmd("recommend") };
  if(!picks.length) return { n: 7, t: "찍을 주제 ＋로 고르기", d: "콘텐츠 탭 「추천」 칸에서 찍을 주제에 ＋를 누르세요. 고른 것만 대본으로 넘어가요.", go: "rec" };
  if(noScript.length) return { n: 8, t: "고른 주제로 대본 초안", d: "고른 " + picks.length + "개 중 " + noScript.length + "개가 대본 전이에요. 레퍼런스 채널의 말하는 방식·구성에 맞춰 대본 초안을 써요.", act: "script", btn: "고른 " + noScript.length + "개 대본 초안 만들기", busy: openCmd("script") };
  return { n: 9, t: "대본 검토", d: "고른 주제의 대본이 다 나왔어요. 대본 탭에서 읽고 고칠 점을 남기세요.", go: "script" };
}
function nextHtml(){
  var x = nextStep(); if(!x) return "";
  return "<section class=\"card next\"><div class=\"card-h\"><h3>다음 할 일 · " + esc(x.t) + "</h3><span class=\"n\">" + x.n + " / 9</span></div><p class=\"lead\">" + esc(x.d) + "</p><div class=\"acts\">" +
    (x.act ? "<button class=\"btn primary\" data-act=\"" + x.act + "\"" + (x.busy ? " disabled" : "") + ">" + esc(x.busy ? "맥이 하는 중…" : x.btn) + "</button>" : "") +
    (x.go ? "<button class=\"btn primary\" data-go=\"" + x.go + "\">" + esc({ brand: "브랜드 탭", kw: "키워드 탭", rec: "추천 탭", script: "대본 탭", "ref|refView=search": "콘텐츠 탭" }[x.go] || x.go) + "으로 →</button>" : "") + "</div></section>";
}
function viewSum(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var s = S(), sd = seedsOf(), all = scored(), pins = all.filter(function(x){ return s.pin[x.kw] });
  var seedKw = all.filter(function(x){ return (x.seed || []).length });
  var rc = part("rec"), rd = rc && rc.rounds && rc.rounds[rc.rounds.length - 1], picks = rd ? rd.items.filter(function(x){ return isLongRec(x) && s.pick[x.id] }) : [];
  var sc = part("script"), scripts = (sc && sc.items) || [];
  var ref = part("ref"), refs = ((ref && ref.items) || []).filter(isLong), chs = b.channels || [], chan = part("chan");
  var nNew = 0; chs.forEach(function(c){ var n = chan && chan.items && chan.items[c.name]; if(n) nNew += n.videos.filter(isNew).length });
  function box(n, label, big, sub, to){ return "<button class=\"stepbox\" data-go=\"" + to + "\"><span class=\"num muted\">" + n + "</span><b>" + label + "</b><span class=\"big\">" + big + "</span><span class=\"it-d\">" + sub + "</span></button>" }
  var h = nextHtml() + "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(b.name) + " 한눈에</h3><span class=\"n\">" + esc(b.handle || "") + "</span></div><p class=\"lead\">" + esc(b.one || "") + "</p>" +
    "<div class=\"flow\">" +
    box(1, "씨앗 단어", sd.length, "정체성 " + sd.filter(function(x){ return x.kind === "정체성" }).length + " · 상품 " + sd.filter(function(x){ return x.kind === "상품" }).length, "kw") +
    box(2, "뽑은 검색어", seedKw.length, "씨앗이 든 연관 검색어", "kw") +
    box(3, "검증", pins.length + " · " + picks.length, "★ 키워드 · 고른 주제", "rec") +
    box(4, "레퍼런스", chs.length, "채널" + (nNew ? " · 새 영상 " + nNew : "") + " · 조사 영상 " + refs.length, "ref|refView=chans") +
    box(5, "대본", scripts.length, scripts.length ? scripts.map(function(x){ return x.status || "초안" }).filter(function(v, i, a){ return a.indexOf(v) === i }).join(" · ") : "아직", "script") +
    "</div></section>";
  /* ① 씨앗 → 검색어 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>① 씨앗 단어와 뽑은 검색어</h3>" + goBtn("키워드 탭", "kw") + "</div>" +
    (sd.length ? "<div class=\"list\">" + sd.map(function(x){
      var it = seedItems(x.word, false);
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" + esc(x.kind === "상품" ? (x.product || "상품") : "정체성") + "</span> <b>" + esc(x.word) + "</b> <span class=\"num muted\">" + it.length + "개</span></div>" +
        "<div class=\"it-d\">" + (it.slice(0, 4).map(function(y){ return (s.pin[y.kw] ? "★" : "") + esc(y.kw) + " <span class=\"num\">" + fmt(y.total) + "</span>" }).join(" · ") || "아직 안 받음") + "</div></div>" +
        "<button class=\"btn sm\" data-go=\"kw|seed=" + esc(x.word) + "\">보기</button></div>" }).join("") + "</div>"
      : "<p class=\"lead\">씨앗 단어가 아직 없어요. 브랜드 탭에서 정체성 단어와 상품 판매 단어를 넣으세요.</p>") + "</section>";
  /* ② 검증한 키워드 · 주제 → 대본 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>② 검증한 키워드와 주제</h3>" + goBtn("추천 탭", "rec") + "</div>" +
    "<h4>★ 검증한 키워드 <span class=\"num muted\">" + pins.length + "</span></h4>" +
    (pins.length ? "<div class=\"chips\">" + pins.map(function(x){ return "<span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" + esc(x.kw) + " · " + fmt(x.total) + "</span>" }).join("") + "</div>"
      : "<p class=\"lead\">아직 없어요. 키워드 탭의 씨앗별 검색어에서 ★을 누르세요.</p>") +
    "<h4>고른 주제 → 대본 <span class=\"num muted\">" + picks.length + "</span></h4>" +
    (picks.length ? "<div class=\"list\">" + picks.map(function(x){
      var t = scriptOf(x.id);
      return "<div class=\"it\"><span class=\"num muted\">" + esc(recNo(x.id)) + "</span><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.title) + "</b></div>" +
        "<div class=\"it-d\"><span class=\"tag fill\">" + esc(x.role || "") + "</span> " + esc(x.product || "") +
        " · 대본 " + (t ? "<span class=\"tag ok\">" + esc(t.status || "있음") + "</span>" : "<span class=\"tag\">아직</span>") + "</div></div>" +
        "<button class=\"btn sm\" data-go=\"" + (t ? "script" : "rec") + "\">" + (t ? "대본" : "추천") + "</button></div>" }).join("") + "</div>"
      : "<p class=\"lead\">아직 고른 주제가 없어요. 콘텐츠 탭 「추천」 칸에서 ＋로 고르면 대본으로 이어져요.</p>") + "</section>";
  /* ③ 레퍼런스 채널 · 조사 시트 */
  var groups = {}, order = [];
  chs.forEach(function(c){ if(!groups[c.group]){ groups[c.group] = []; order.push(c.group) } groups[c.group].push(c) });
  var proof = refs.filter(function(x){ return x.buyer === "✓" && isProof(x) }).length, rounds = (ref && ref.rounds) || [];
  h += "<section class=\"card\"><div class=\"card-h\"><h3>③ 레퍼런스 채널과 조사 시트</h3>" + goBtn("참고 페이지", "refpage") + "</div>" +
    "<p class=\"lead\">상품·정체성과 닿은 채널이에요. 대본은 검증한 키워드·주제를 이 채널들의 말하는 방식·구성에 맞춰 써요.</p>" +
    (order.length ? "<div class=\"list\">" + order.map(function(g){
      var l = groups[g], nw = 0; l.forEach(function(c){ var n = chan && chan.items && chan.items[c.name]; if(n) nw += n.videos.filter(isNew).length });
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(g) + "</b> <span class=\"num muted\">" + l.length + "곳</span>" + (nw ? " <span class=\"tag ok\">새 영상 " + nw + "</span>" : "") + "</div>" +
        "<div class=\"it-d\">" + l.slice(0, 4).map(function(c){ return esc(c.name) }).join(" · ") + (l.length > 4 ? " …" : "") + "</div></div></div>" }).join("") + "</div>"
      : "<p class=\"lead\">레퍼런스 채널 카드가 아직 없어요.</p>") +
    "<h4>조사 시트</h4><dl class=\"kv\"><dt>조사</dt><dd>" + rounds.length + "회" + (rounds.length ? " · 마지막 " + esc(rounds[rounds.length - 1].date) : "") + "</dd>" +
    "<dt>레퍼런스 영상</dt><dd>" + refs.length + "개 · 구매자 ✓ 성과 근거 " + proof + "개</dd></dl>" +
    "<div class=\"acts\">" + (b.sheet ? "<a class=\"btn sm primary\" href=\"" + esc(b.sheet) + "\" target=\"_blank\" rel=\"noopener\" style=\"text-decoration:none\">조사 시트 열기</a>" : "") + goBtn("잘 되는 콘텐츠", "ref|refView=videos") + "</div></section>";
  /* 기록 */
  var lg = part("log");
  if(lg && lg.items.length) h += "<section class=\"card\"><div class=\"card-h\"><h3>단계 기록 PDF</h3>" + goBtn("전체", "brand") + "</div><div class=\"list\">" + lg.items.slice(0, 4).map(function(x){
    return "<div class=\"it\"><span class=\"num muted\">" + esc(x.date.slice(5)) + "</span><div class=\"it-m\">" + esc(String(x.file).replace(/^\S+ /, "").replace(/\.pdf$/, "")) + "</div></div>" }).join("") + "</div>" +
    "<p class=\"lead\" style=\"margin-top:6px\">볼트 · 드라이브에 저장돼요 — " + esc(lg.where || "") + "</p></section>";
  return h;
}

/* 즐겨찾기 — 브랜드가 기억하는 좋은 키워드(★ pin)·콘텐츠(☆ favc). 맥이 브랜드.json favorites 에도 적어 스킬이 읽는다 */
function favHtml(){
  var s = S(), kws = scored().filter(function(x){ return s.pin[x.kw] }), f = (SETS[cur] || {}).favc || {}, ids = Object.keys(f);
  return "<section class=\"card\"><div class=\"card-h\"><h3>즐겨찾기 — 브랜드가 기억하는 것</h3><span class=\"n\">키워드 " + kws.length + " · 콘텐츠 " + ids.length + "</span></div>" +
    "<p class=\"lead\">키워드 탭에서 ★, 콘텐츠 탭에서 ☆를 누른 것이에요. 추천·대본·소재 찾기가 이것을 먼저 봐요.</p>" +
    "<h4>★ 키워드</h4>" + (kws.length ? "<div class=\"chips\">" + kws.map(function(x){ return "<span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" + esc(x.kw) + " · " + fmt(x.total) + " <button class=\"x0\" data-pin=\"" + esc(x.kw) + "\" aria-label=\"즐겨찾기 풀기\">✕</button></span>" }).join("") + "</div>" : "<p class=\"lead\">아직 없어요.</p>") +
    "<h4>☆ 콘텐츠</h4>" + (ids.length ? "<div class=\"list\">" + ids.slice(0, 8).map(function(vid){ var x = f[vid]; return "<div class=\"it\"><div class=\"it-m\"><a href=\"https://www.youtube.com/watch?v=" + esc(vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(x.title || vid) + "</a><div class=\"it-d\">" + esc(x.channel || "") + (x.kw ? " · " + esc(x.kw) : "") + "</div></div>" + favBtn(vid) + "</div>" }).join("") + "</div>" +
      (ids.length > 8 ? "<div class=\"acts\"><button class=\"btn sm\" data-go=\"ref|refView=fav\">전체 " + ids.length + "개 보기 →</button></div>" : "") : "<p class=\"lead\">아직 없어요.</p>") + "</section>";
}
