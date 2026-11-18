/* ── 그 밖의 레퍼런스 — 대본 탭 「참고 페이지」 맨 아래 (위 세 칸에 안 드는 판매 묶음 · 이 채널의 결 · 포맷). 대본(content-production)이 「레퍼런스 채널에서 가져온 구성」을 찾는 곳 ──
   (2026-11-16 참고 탭을 없애며 그 탭 아래에 있던 이 목록을 브랜드 탭으로 옮겼다) */
/* 브랜드 레퍼런스 — 브랜드의 레퍼런스 카드(기획·판매)를 맥 동기화가 읽어 브랜드.json 에 맞춰 둔 것을 카드와 같은 순서로 보여 준다:
   쓰는 순서 → 묶음별 채널(등급·가져올 것·대본 적용 예 + 그 채널의 새 영상) → 포맷 → 분석 칸. 카드를 고치면 몇 초 안에 여기가 바뀐다 (코드에 목록을 두지 않는다). */
function isNew(v){ return /(시간|일|주) 전$/.test(v.when || "") }
function refGroupHtml(g, list, chan){
  var nNew = 0;
  var rows = list.map(function(c){
    var now = chan && chan.items && chan.items[c.name], vs = now ? now.videos : [], fresh = vs.filter(isNew); nNew += fresh.length;
    var top = fresh[0] || vs[0];
    return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\">" + (c.url ? "<a href=\"" + esc(c.url) + "\" target=\"_blank\" rel=\"noopener\"><b>" + esc(c.name) + "</b></a>" : "<b>" + esc(c.name) + "</b>") +
      (c.grade && c.grade !== "—" ? " <span class=\"tag\" title=\"이 브랜드에 얼마나 맞나 — A+ 매번 볼 곳 · A 자주 · A-·B+ 가끔 · B 참고\">맞음 " + esc(c.grade) + "</span>" : "") + (c.pillar && c.pillar !== "—" ? " <span class=\"tag\">필러 " + esc(c.pillar) + "</span>" : "") +
      (fresh.length ? " <span class=\"tag ok\">새 영상 " + fresh.length + "</span>" : "") + "</div>" +
      "<div class=\"it-d\">" + txt(c.take) + "</div>" + (c.example ? "<div class=\"apply\"><b>대본 적용 예</b> " + txt(c.example) + "</div>" : "") +
      (top ? "<div class=\"it-d\">" + (isNew(top) ? "새 영상" : "최근 영상") + " · <a href=\"https://www.youtube.com/watch?v=" + esc(top.id) + "\" target=\"_blank\" rel=\"noopener\">" + esc(top.title) + "</a> · " + esc(top.when) +
        (top.views != null ? " · 조회 " + fmt(top.views) : "") + (top.ratio != null ? " · 조회÷구독 " + top.ratio + "배" : "") + "</div>" : "") + "</div></div>";
  }).join("");
  return "<details style=\"margin-top:10px\"><summary>" + esc(g) + " " + list.length + "곳" + (nNew ? " · 새 영상 " + nNew : "") + "</summary><div class=\"list\" style=\"margin-top:4px\">" + rows + "</div></details>";
}
function brandRefsHtml(b){
  var chan = part("chan"), t = b.tone, groups = {}, order = [];
  (b.channels || []).filter(function(c){ return !RP_SIDES.some(function(x){ return x.group.test(c.group) }) }).forEach(function(c){ if(!groups[c.group]){ groups[c.group] = []; order.push(c.group) } groups[c.group].push(c) });
  if(!order.length && !t) return "<section class=\"card\"><div class=\"card-h\"><h3>브랜드 레퍼런스</h3></div><p class=\"lead\">이 브랜드는 아직 레퍼런스 채널 카드가 없어요. 볼트에 레퍼런스 카드(소재 · 말하는 방식 · 화면 묶음 표)를 만들고 브랜드 파일의 refCards 에 적으면 여기에 떠요.</p></section>";
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>그 밖의 레퍼런스 — 판매 · 말투 · 포맷</h3><span class=\"n\">" + order.length + "묶음</span></div>" +
    "<p class=\"lead\">대본을 쓸 때 이 채널들에서 같은 주제 영상을 찾아 구성을 가져와요. 볼트의 레퍼런스 카드를 고치면 몇 초 안에 여기가 바뀌고, 채널 새 영상은 하루 한 번 저절로 최신화돼요. 카드 맞춘 때 " +
    (b.refsAt ? esc(day(b.refsAt)) + " " + esc(String(b.refsAt).slice(11, 16)) : "—") + " · 새 영상 읽은 때 " + (chan ? esc(day(chan.updatedAt)) : "아직") + "</p>";
  if((b.refOrder || []).length) h += "<h4>쓰는 순서</h4><div class=\"list\">" + b.refOrder.map(function(r, i){ return "<div class=\"it\"><span class=\"num muted\">" + (i + 1) + "</span><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>";
  if(t) h += "<details style=\"margin-top:10px\"><summary>이 채널의 결 — 말하는 방식</summary><div class=\"list\" style=\"margin-top:4px\">" + (t.rules || []).map(function(r){ return "<div class=\"it\"><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>" +
    "<dl class=\"kv small\" style=\"margin-top:8px\">" + [["쓰는 말", t.words], ["화면", t.screen], ["하지 않는 것", t.avoid]].filter(function(r){ return r[1] }).map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>" }).join("") + "</dl>" +
    (t.todo ? "<p class=\"note\" style=\"margin-top:8px\">" + esc(t.todo) + "</p>" : "") + "</details>";
  order.forEach(function(g){ h += refGroupHtml(g, groups[g], chan) });
  if((b.formats || []).length) h += "<details style=\"margin-top:10px\"><summary>콘텐츠 포맷 " + b.formats.length + "종</summary><div class=\"list\" style=\"margin-top:4px\">" + b.formats.map(function(f){
    return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(f.name) + "</b> <span class=\"num muted\">" + esc(f.len) + "</span> <span class=\"tag\">" + esc(f.goal) + "</span></div><div class=\"it-d\">" + txt(f.structure) + "</div></div></div>" }).join("") + "</div></details>";
  if(b.refFields || (b.refNotes || []).length) h += "<details style=\"margin-top:10px\"><summary>영상 분석 칸 · 주의</summary><p class=\"small\" style=\"margin-top:6px\">" + esc(b.refFields || "") + "</p>" +
    (b.refNotes || []).map(function(n){ return "<p class=\"small muted\" style=\"margin-top:4px\">· " + esc(n) + "</p>" }).join("") + "</details>";
  var src = b.refCards ? Object.keys(b.refCards).map(function(k){ return String(b.refCards[k]).split("/").pop().replace(/\.md$/, "") }).join(" · ") : "";
  return h + (src ? "<p class=\"lead\" style=\"margin-top:10px\">정본 카드 · " + esc(src) + "</p>" : "") + "</section>";
}
/* ── 대본 탭 「참고 페이지」 — 대본을 쓰기 전에 보는 곳 (2026-11-17 동욱: "구축과 대본 사이에 내 채널 소재를 찾을 수 있는 레퍼런스 채널 만드는 칸. 한국뿐 아니라 전 세계 페이지와 자료를 모으고,
   정체성 키워드·판매 상품 키워드에 맞는 소재 정보가 많은지, 내 채널 연출에 참고될 자료인지 보는 참고 페이지. 이걸 기반으로 대본을 쓴다").
   세 칸: 정체성 소재(기획 카드 1-1) · 상품 소재(1-2) · 연출 참고(2 말하는 방식 · 3 화면). 넣은 곳은 기획 레퍼런스 카드가 정본(브랜드.json channels 로 읽힘),
   후보는 맥의 Claude가 찾은 볼트 <브랜드>/채널 후보.json (cmd kind "chanfind"). 「넣기」(ct.set chanpick = add)한 것만 맥 동기화가 카드 표에 한 줄씩 넣는다 — 카드가 없으면 새로 만든다.
   찾는 범위는 ct.set rpOpt {sides, region} */
var RP_SIDES = [
  { id: "정체성", name: "정체성 소재", what: "정체성 단어에 맞는 사례·숫자·연구·현장 목소리를 꾸준히 주는 곳", card: "1-1", group: /^소재 발굴 · 정체성/ },
  { id: "상품", name: "상품 소재", what: "판매 상품 단어에 맞는 소재 — 시장·고객·가격·후기·업계 조사", card: "1-2", group: /^소재 발굴 · 판매/ },
  { id: "연출", name: "연출 참고", what: "내 채널 연출(말하는 방식·구성·화면·편집)에 참고할 채널 — 소재가 아니라 「어떻게 보여 주나」", card: "2 · 3", group: /^(말하는 방식|화면)/ }
];
var RP_REGION = [["world", "전 세계"], ["ko", "한국"], ["en", "영어권"], ["ja", "일본"], ["zh", "중국어권"], ["eu", "유럽"]];
function rpOpt(){ var o = (SETS[cur] || {}).rpOpt || {}; return { sides: o.sides || { "정체성": true, "상품": true, "연출": true }, region: o.region || "world", words: o.words || null } }
function rpWords(){ var o = rpOpt(); return seedsOf().filter(function(x){ return !o.words || o.words[x.word] !== false }) }
/* Claude 추천 — 동욱이 하나하나 확인하지 않아도 「추천대로 넣기」로 넣는다 (2026-11-17 동욱: "내가 다 확인할 수 없으니 너의 추천대로 넣기도 눌러서 진행하게").
   후보에 recommend(true/false)·recommendWhy 가 있으면 그것(맥의 Claude 판단), 없던 옛 후보는 기준으로: 소재·상품은 등급 A 이면서 소재 보통 이상이거나 소재 많음, 연출은 등급 A */
function rpRec(c){
  if(c.recommend != null) return !!c.recommend;
  var a = /^A/.test(c.grade || ""), am = c.amount || "";
  return (c.side || "정체성") === "연출" ? a : (a && !/적음/.test(am)) || /많음/.test(am);
}
function rpRecWhy(c){ return c.recommendWhy || (rpRec(c) ? "등급 " + (c.grade || "—") + (c.amount ? " · 소재 " + c.amount : "") : "") }
function rpRecBtn(list, label){
  var pick = (SETS[cur] || {}).chanpick || {}, ids = list.filter(function(c){ return rpRec(c) && pick[c.id] !== "add" }).map(function(c){ return c.id });
  return ids.length ? "<button class=\"btn primary\" data-act=\"chanrec\" data-ids=\"" + esc(ids.join(",")) + "\">" + label + " " + ids.length + "곳 넣기</button>" : "";
}
function amountTag(a){ return a ? "<span class=\"tag" + (/많음/.test(a) ? " ok" : "") + "\">소재 " + esc(a) + "</span>" : "" }
function rpRow(c, cand){
  var on = cand && ((SETS[cur] || {}).chanpick || {})[c.id] === "add";
  return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\">" + (c.url ? "<a href=\"" + esc(c.url) + "\" target=\"_blank\" rel=\"noopener\"><b>" + esc(c.name) + "</b></a>" : "<b>" + esc(c.name) + "</b>") +
      (c.seed ? " <span class=\"tag " + (c.side === "상품" ? "p" : "i") + "\">" + esc(c.seed) + "</span>" : "") + (c.kind ? " <span class=\"tag\">" + esc(c.kind) + "</span>" : "") + (c.lang ? " <span class=\"tag\">" + esc(c.lang) + "</span>" : "") +
      (c.grade && c.grade !== "—" ? " <span class=\"tag\" title=\"이 브랜드에 얼마나 맞나 — A+ 매번 볼 곳 · A 자주 · A-·B+ 가끔 · B 참고\">맞음 " + esc(c.grade) + "</span>" : "") + " " + amountTag(c.amount) + (cand && rpRec(c) ? " <span class=\"tag fill\" title=\"" + esc(rpRecWhy(c)) + "\">Claude 추천</span>" : "") + "</div>" +
    "<div class=\"it-d\">" + esc(c.take || "") + "</div>" +
    "<details><summary>자세히</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
      (cand && rpRec(c) ? "<dt>추천 이유</dt><dd>" + esc(rpRecWhy(c)) + "</dd>" : "") + (c.amountProof ? "<dt>소재가 많나</dt><dd>" + txt(c.amountProof) + "</dd>" : "") + (c.direction ? "<dt>연출 참고</dt><dd>" + txt(c.direction) + "</dd>" : "") +
      (c.example ? "<dt>대본 적용 예</dt><dd>" + txt(c.example) + "</dd>" : "") + ((c.proof || c.why) ? "<dt>확인한 것</dt><dd>" + esc([c.proof, c.why].filter(Boolean).join(" · ")) + "</dd>" : "") +
      (c.pillar && c.pillar !== "—" ? "<dt>필러</dt><dd>" + esc(c.pillar) + "</dd>" : "") + "</dl></details>" +
    (cand ? "<div class=\"acts\"><button class=\"btn sm" + (on ? "" : " primary") + "\" data-act=\"chanpick\" data-id=\"" + esc(c.id) + "\" data-v=\"" + (on ? "" : "add") + "\">" + (on ? "넣는 중 — 취소" : "참고 페이지에 넣기") + "</button>" +
      "<button class=\"btn sm\" data-act=\"chanpick\" data-id=\"" + esc(c.id) + "\" data-v=\"skip\">빼기</button></div>" : "") + "</div></div>";
}
/* 「빼기」한 후보 — 되돌리기 (2026-11-18 동욱: 목록마다 삭제와 되돌리기) */
function rpSkippedHtml(cd, pick){
  var sk = ((cd && cd.items) || []).filter(function(x){ return !x.added && pick[x.id] === "skip" });
  if(!sk.length) return "";
  return "<details class=\"gone\"><summary>뺀 후보 " + sk.length + "곳 — 되돌리기</summary><div class=\"list\">" + sk.map(function(c){
    return "<div class=\"it off\"><div class=\"it-m\"><div>" + esc(c.name) + (c.seed ? " <span class=\"num muted\">" + esc(c.seed) + "</span>" : "") + "</div></div><button class=\"btn sm\" data-act=\"chanpick\" data-id=\"" + esc(c.id) + "\" data-v=\"\">↺ 되돌리기</button></div>" }).join("") + "</div></details>";
}
/* 참고 페이지 찾는 범위 — ⚙ 설정 › 단계별 기준 「참고 페이지」 칸 (content-design.js) */
function rpScopeHtml(){
  var o = rpOpt(), sd = seedsOf();
  return "<h4>어떤 단어로 찾을까</h4><div class=\"chips\">" + (sd.map(function(x){ var off = o.words && o.words[x.word] === false;
      return "<button class=\"chip" + (off ? "" : " on") + "\" data-act=\"rpword\" data-word=\"" + esc(x.word) + "\">" + (x.kind === "상품" ? "🛒 " : "") + esc(x.word) + "</button>" }).join("") || "<span class=\"lead\">브랜드 탭에서 정체성 단어·상품 판매 단어를 먼저 넣으세요.</span>") + "</div>" +
    "<h4>무엇을 찾을까</h4><div class=\"chips\">" + RP_SIDES.map(function(x){ return "<button class=\"chip" + (o.sides[x.id] ? " on" : "") + "\" data-act=\"rpside\" data-side=\"" + x.id + "\">" + x.name + "</button>" }).join("") + "</div>" +
    "<h4>어디서</h4><div class=\"chips\">" + RP_REGION.map(function(r){ return "<button class=\"chip" + (o.region === r[0] ? " on" : "") + "\" data-act=\"rpregion\" data-v=\"" + r[0] + "\">" + r[1] + "</button>" }).join("") + "</div>";
}
function viewRefPage(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var o = rpOpt(), sd = seedsOf(), cd = part("chancand"), pick = (SETS[cur] || {}).chanpick || {}, busy = openCmd("chanfind");
  var cands = ((cd && cd.items) || []).filter(function(x){ return !x.added && pick[x.id] !== "skip" });
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>참고 페이지</h3><span class=\"n\">넣은 곳 " + (b.channels || []).filter(function(c){ return RP_SIDES.some(function(sd0){ return sd0.group.test(c.group) }) }).length + " · 후보 " + cands.length + "</span></div>" +
    "<p class=\"lead\">대본은 이 페이지를 기반으로 써요. 정체성 단어·상품 단어에 맞는 <b>소재가 많은 곳</b>과 내 채널 <b>연출에 참고할 곳</b>을 한국만이 아니라 전 세계에서 모아요 — 유튜브 · 매체 · 리서치 · 뉴스레터 · 팟캐스트 · 커뮤니티. 「대본 초안」과 「소재 찾기」는 여기 넣은 곳을 돌아요.</p>" +
    dsLine("ref") +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"chanfind\"" + (busy || !rpWords().length || !RP_SIDES.some(function(x){ return o.sides[x.id] }) ? " disabled" : "") + ">" + (busy ? "맥이 찾는 중…" : "고른 단어로 참고 페이지 채우기") + "</button>" +
    (cd && cd.updatedAt ? "<span class=\"lead\" style=\"margin:0\">마지막 " + esc(day(cd.updatedAt)) + "</span>" : "") + "</div>" +
    (cands.some(rpRec) ? "<div class=\"note\" style=\"margin-top:10px\">하나하나 보지 않아도 돼요 — 「Claude 추천」 표시가 붙은 곳만 한 번에 넣을 수 있어요. 넣은 곳은 기획 레퍼런스 카드에 들어가고, 나중에 카드에서 빼면 여기서도 빠져요.</div><div class=\"acts\">" + rpRecBtn(cands, "Claude 추천 전부 —") + "</div>" : "") + rpSkippedHtml(cd, pick) + "</section>";
  /* 단어마다 소재가 충분한가 — 후보·넣은 곳을 단어별로 센다 */
  var all = (cd && cd.items) || [];
  if(all.length) h += "<section class=\"card\"><div class=\"card-h\"><h3>단어마다 소재가 충분한가</h3></div><div class=\"list\">" + sd.map(function(x){
      var l = all.filter(function(c){ return c.seed === x.word }), got = l.filter(function(c){ return c.added || pick[c.id] === "add" }), many = l.filter(function(c){ return /많음/.test(c.amount || "") });
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.word) + "</b> <span class=\"num muted\">" + (x.kind === "상품" ? "상품" : "정체성") + "</span></div><div class=\"it-d\">찾은 곳 " + l.length + " · 넣은 곳 " + got.length + " · 소재 많은 곳 " + many.length +
        (!l.length ? " — <b>아직 못 찾음</b>" : !many.length ? " — 소재가 넉넉한 곳이 없어요" : "") + "</div></div></div>" }).join("") + "</div></section>";
  RP_SIDES.forEach(function(sd0){
    var have = (b.channels || []).filter(function(c){ return sd0.group.test(c.group) }), cl = cands.filter(function(c){ return (c.side || "정체성") === sd0.id });
    h += "<section class=\"card\"><div class=\"card-h\"><h3>" + sd0.name + "</h3><span class=\"n\">넣은 곳 " + have.length + " · 후보 " + cl.length + "</span></div><p class=\"lead\">" + sd0.what + " · 기획 레퍼런스 카드 " + sd0.card + "</p>" +
      (cl.length ? "<h4>찾은 후보 <span class=\"num muted\">추천 " + cl.filter(rpRec).length + " / " + cl.length + "</span></h4><div class=\"acts\" style=\"margin-top:0\">" + rpRecBtn(cl, "이 칸 추천") + "</div>" +
        "<div class=\"list\">" + cl.slice().sort(function(a, c){ return (rpRec(c) ? 1 : 0) - (rpRec(a) ? 1 : 0) }).map(function(c){ return rpRow(c, true) }).join("") + "</div>" : "") +
      (have.length ? "<details" + (cl.length ? "" : " open") + " style=\"margin-top:10px\"><summary>넣은 곳 " + have.length + "</summary><div class=\"list\" style=\"margin-top:4px\">" + have.map(function(c){ return rpRow(c, false) }).join("") + "</div></details>"
        : (cl.length ? "" : "<p class=\"lead\">아직 없어요. 위에서 「참고 페이지 채우기」를 누르세요.</p>")) + "</section>";
  });
  var picks = pickedIds(S()).filter(function(id){ return !scriptOf(id) });   // 다음 단계 — 넣은 참고 페이지로 대본
  h += "<section class=\"card\">" + nextBar("이 참고 페이지로 대본 쓰기", [picks.length ? ["고른 추천 " + picks.length + "개 대본 초안", "data-act=\"script\"", !!openCmd("script")] : ["추천에서 찍을 것 고르기", "data-go=\"rec\""], ["대본 보기", "data-go=\"script\""]]) + "</section>";
  return h + brandRefsHtml(b);
}
