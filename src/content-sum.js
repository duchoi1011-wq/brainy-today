/* ── 한눈에 탭 — 씨앗 단어 → 뽑은 검색어 → 검증한 키워드·주제 → 레퍼런스 채널·조사 시트 → 대본 을 한 화면에 ──
   (2026-11-16 동욱: "참고 페이지와 뽑아낸 검색어와 정리된 시트 등을 한 번에 쉽게 파악할 수 있게")
   새 자료를 만들지 않는다 — 다른 탭이 쓰는 자료(키워드·설정·브랜드 레퍼런스·레퍼런스·추천·대본·기록)를 같은 함수로 읽어 줄여 보여 주고, 누르면 그 탭으로 간다. */
function goBtn(label, to){ return "<button class=\"chip\" data-go=\"" + esc(to) + "\">" + label + " →</button>" }
function viewSum(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var s = S(), sd = seedsOf(), all = scored(), pins = all.filter(function(x){ return s.pin[x.kw] });
  var seedKw = all.filter(function(x){ return (x.seed || []).length });
  var rc = part("rec"), rd = rc && rc.rounds && rc.rounds[rc.rounds.length - 1], picks = rd ? rd.items.filter(function(x){ return s.pick[x.id] }) : [];
  var sc = part("script"), scripts = (sc && sc.items) || [];
  var ref = part("ref"), refs = (ref && ref.items) || [], chs = b.channels || [], chan = part("chan");
  var nNew = 0; chs.forEach(function(c){ var n = chan && chan.items && chan.items[c.name]; if(n) nNew += n.videos.filter(isNew).length });
  function box(n, label, big, sub, to){ return "<button class=\"stepbox\" data-go=\"" + to + "\"><span class=\"num muted\">" + n + "</span><b>" + label + "</b><span class=\"big\">" + big + "</span><span class=\"it-d\">" + sub + "</span></button>" }
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(b.name) + " 한눈에</h3><span class=\"n\">" + esc(b.handle || "") + "</span></div><p class=\"lead\">" + esc(b.one || "") + "</p>" +
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
      var it = seedItems(x.word);
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" + esc(x.kind === "상품" ? (x.product || "상품") : "정체성") + "</span> <b>" + esc(x.word) + "</b> <span class=\"num muted\">" + it.length + "개</span></div>" +
        "<div class=\"it-d\">" + (it.slice(0, 4).map(function(y){ return (s.pin[y.kw] ? "★" : "") + esc(y.kw) + " <span class=\"num\">" + fmt(y.total) + "</span>" }).join(" · ") || "아직 안 받음") + "</div></div>" +
        "<button class=\"btn sm\" data-go=\"kw|seed=" + esc(x.word) + "\">보기</button></div>" }).join("") + "</div>"
      : "<p class=\"lead\">씨앗 단어가 아직 없어요. 키워드 탭에서 정체성 3 · 상품 3개를 정하세요.</p>") + "</section>";
  /* ② 검증한 키워드 · 주제 → 대본 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>② 검증한 키워드와 주제</h3>" + goBtn("추천 탭", "rec") + "</div>" +
    "<h4>★ 검증한 키워드 <span class=\"num muted\">" + pins.length + "</span></h4>" +
    (pins.length ? "<div class=\"chips\">" + pins.map(function(x){ return "<span class=\"tag " + (x.kind === "상품" ? "p" : "i") + "\">" + esc(x.kw) + " · " + fmt(x.total) + "</span>" }).join("") + "</div>"
      : "<p class=\"lead\">아직 없어요. 키워드 탭의 씨앗별 검색어에서 ★을 누르세요.</p>") +
    "<h4>고른 주제 → 대본 <span class=\"num muted\">" + picks.length + "</span></h4>" +
    (picks.length ? "<div class=\"list\">" + picks.map(function(x){
      var t = scriptOf(x.id);
      return "<div class=\"it\"><span class=\"num muted\">" + esc(x.id) + "</span><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.title) + "</b></div>" +
        "<div class=\"it-d\"><span class=\"tag fill\">" + esc(x.role || "") + "</span> " + esc(x.product || "") +
        " · 대본 " + (t ? "<span class=\"tag ok\">" + esc(t.status || "있음") + "</span>" : "<span class=\"tag\">아직</span>") + "</div></div>" +
        "<button class=\"btn sm\" data-go=\"" + (t ? "script" : "rec") + "\">" + (t ? "대본" : "추천") + "</button></div>" }).join("") + "</div>"
      : "<p class=\"lead\">아직 고른 주제가 없어요. 추천 탭에서 ＋로 고르면 대본으로 이어져요.</p>") + "</section>";
  /* ③ 레퍼런스 채널 · 조사 시트 */
  var groups = {}, order = [];
  chs.forEach(function(c){ if(!groups[c.group]){ groups[c.group] = []; order.push(c.group) } groups[c.group].push(c) });
  var proof = refs.filter(function(x){ return x.buyer === "✓" && isProof(x) }).length, rounds = (ref && ref.rounds) || [];
  h += "<section class=\"card\"><div class=\"card-h\"><h3>③ 레퍼런스 채널과 조사 시트</h3>" + goBtn("브랜드 레퍼런스", "brand") + "</div>" +
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
