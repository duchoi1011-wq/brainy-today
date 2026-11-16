/* ── 브랜드 레퍼런스 — 브랜드 탭 아래. 대본(content-production)이 「레퍼런스 채널에서 가져온 구성」을 찾는 곳 ──
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
      (c.grade && c.grade !== "—" ? " <span class=\"tag\">" + esc(c.grade) + "</span>" : "") + (c.pillar && c.pillar !== "—" ? " <span class=\"tag\">필러 " + esc(c.pillar) + "</span>" : "") +
      (fresh.length ? " <span class=\"tag ok\">새 영상 " + fresh.length + "</span>" : "") + "</div>" +
      "<div class=\"it-d\">" + esc(c.take) + "</div>" + (c.example ? "<div class=\"apply\"><b>대본 적용 예</b> " + esc(c.example) + "</div>" : "") +
      (top ? "<div class=\"it-d\">" + (isNew(top) ? "새 영상" : "최근 영상") + " · <a href=\"https://www.youtube.com/watch?v=" + esc(top.id) + "\" target=\"_blank\" rel=\"noopener\">" + esc(top.title) + "</a> · " + esc(top.when) +
        (top.views != null ? " · 조회 " + fmt(top.views) : "") + (top.ratio != null ? " · 조회÷구독 " + top.ratio + "배" : "") + "</div>" : "") + "</div></div>";
  }).join("");
  return "<details style=\"margin-top:10px\"><summary>" + esc(g) + " " + list.length + "곳" + (nNew ? " · 새 영상 " + nNew : "") + "</summary><div class=\"list\" style=\"margin-top:4px\">" + rows + "</div></details>";
}
function brandRefsHtml(b){
  var chan = part("chan"), t = b.tone, groups = {}, order = [];
  (b.channels || []).forEach(function(c){ if(!groups[c.group]){ groups[c.group] = []; order.push(c.group) } groups[c.group].push(c) });
  if(!order.length && !t) return "<section class=\"card\"><div class=\"card-h\"><h3>브랜드 레퍼런스</h3></div><p class=\"lead\">이 브랜드는 아직 레퍼런스 채널 카드가 없어요. 볼트에 레퍼런스 카드(소재 · 말하는 방식 · 화면 묶음 표)를 만들고 브랜드 파일의 refCards 에 적으면 여기에 떠요.</p></section>";
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>브랜드 레퍼런스</h3><span class=\"n\">" + (b.channels || []).length + "곳</span></div>" +
    "<p class=\"lead\">대본을 쓸 때 이 채널들에서 같은 주제 영상을 찾아 구성을 가져와요. 볼트의 레퍼런스 카드를 고치면 몇 초 안에 여기가 바뀌고, 채널 새 영상은 하루 한 번 저절로 최신화돼요. 카드 맞춘 때 " +
    (b.refsAt ? esc(day(b.refsAt)) + " " + esc(String(b.refsAt).slice(11, 16)) : "—") + " · 새 영상 읽은 때 " + (chan ? esc(day(chan.updatedAt)) : "아직") + "</p>";
  if((b.refOrder || []).length) h += "<h4>쓰는 순서</h4><div class=\"list\">" + b.refOrder.map(function(r, i){ return "<div class=\"it\"><span class=\"num muted\">" + (i + 1) + "</span><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>";
  if(t) h += "<details style=\"margin-top:10px\"><summary>이 채널의 결 — 말하는 방식</summary><div class=\"list\" style=\"margin-top:4px\">" + (t.rules || []).map(function(r){ return "<div class=\"it\"><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>" +
    "<dl class=\"kv small\" style=\"margin-top:8px\">" + [["쓰는 말", t.words], ["화면", t.screen], ["하지 않는 것", t.avoid]].filter(function(r){ return r[1] }).map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>" }).join("") + "</dl>" +
    (t.todo ? "<p class=\"note\" style=\"margin-top:8px\">" + esc(t.todo) + "</p>" : "") + "</details>";
  order.forEach(function(g){ h += refGroupHtml(g, groups[g], chan) });
  if((b.formats || []).length) h += "<details style=\"margin-top:10px\"><summary>콘텐츠 포맷 " + b.formats.length + "종</summary><div class=\"list\" style=\"margin-top:4px\">" + b.formats.map(function(f){
    return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(f.name) + "</b> <span class=\"num muted\">" + esc(f.len) + "</span> <span class=\"tag\">" + esc(f.goal) + "</span></div><div class=\"it-d\">" + esc(f.structure) + "</div></div></div>" }).join("") + "</div></details>";
  if(b.refFields || (b.refNotes || []).length) h += "<details style=\"margin-top:10px\"><summary>영상 분석 칸 · 주의</summary><p class=\"small\" style=\"margin-top:6px\">" + esc(b.refFields || "") + "</p>" +
    (b.refNotes || []).map(function(n){ return "<p class=\"small muted\" style=\"margin-top:4px\">· " + esc(n) + "</p>" }).join("") + "</details>";
  var src = b.refCards ? Object.keys(b.refCards).map(function(k){ return String(b.refCards[k]).split("/").pop().replace(/\.md$/, "") }).join(" · ") : "";
  return h + (src ? "<p class=\"lead\" style=\"margin-top:10px\">정본 카드 · " + esc(src) + "</p>" : "") + "</section>";
}
