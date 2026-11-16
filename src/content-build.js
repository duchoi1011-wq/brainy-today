/* ── 구축 탭 — 동욱 원문 [구축 - 콘텐츠] 그대로, 편집기 앱처럼 한 화면에 ──
   칸 이름·순서·안내 글은 볼트 「콘텐츠 기획 앱/구축 틀.json」(ct.data/build.def)이 정본 — 코드에 칸을 적지 않는다.
   문서는 볼트 `<브랜드>/구축.json` (ct.data/<브랜드>.build) — content-recommend 스킬이 쓴다.
   왼쪽: 퍼널(아이템 → 키콘 → 풀링) 목록 · 가운데: 고른 문서 (세로 / 시트 보기) · 오른쪽: 댓글·파동에서 다시 착안한 추천(ideas).
   PDF 는 브라우저 인쇄(「PDF로 보기」) — 인쇄할 때는 가운데 문서만 남는다 (content.html @media print). */
function buildDef(){ return RAW["build.def"] || { sections: [], funnel: [] } }
function buildDocs(){ var b = part("build"); return (b && b.items) || [] }
function buildRefCell(n){
  var r = refByRow(n);
  if(!r) return "<span class=\"muted\">[조사] " + esc(n) + "행 — 레퍼런스 목록에 없음</span>";
  return "<a class=\"bd-ref\" href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\">" + (r.vid ? "<img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(r.vid) + "/mqdefault.jpg\">" : "") +
    "<span><b>" + esc(r.title) + "</b><br><span class=\"muted\">" + esc([r.channel, r.ratio != null ? "조회÷구독 " + r.ratio + "배" : "", "[조사] " + r.row + "행"].filter(Boolean).join(" · ")) + "</span></span></a>";
}
/* 욕구 결 검증 (2026-11-16 동욱: "시청자의 욕구의 본질과 내 상품의 구매의 본질이 동일하냐") — 행 이름은 구축 틀.json 의 rows */
function buildFit(f, v){
  if(!v || typeof v !== "object") return "<span class=\"bd-empty\">비어 있음</span>";
  var cls = { "같음": "v-same", "비슷": "v-near", "다름": "v-diff" }[String(v.verdict || "").split(" ")[0]] || "";
  return "<table class=\"bd-fit\">" + (f.rows || []).map(function(r){
    var val = v[r.id];
    return "<tr><th>" + esc(r.label) + "</th><td" + (r.id === "verdict" ? " class=\"" + cls + "\"" : "") + ">" + (val ? esc(val) : "<span class=\"bd-empty\">비어 있음</span>") + "</td></tr>" }).join("") + "</table>";
}
function buildVal(f, v){
  if(f.type === "fit") return buildFit(f, v);
  if(f.type === "refs") return Array.isArray(v) && v.length ? v.map(buildRefCell).join("") : "<span class=\"bd-empty\">비어 있음</span>";
  return v ? esc(v) : "<span class=\"bd-empty\">비어 있음</span>";
}
function buildFilled(doc){
  var n = 0, all = 0, vals = doc.values || {};
  buildDef().sections.forEach(function(s){ s.fields.forEach(function(f){ all++; var v = vals[f.id]; if(Array.isArray(v) ? v.length : (v && typeof v === "object") ? v.verdict : v) n++ }) });
  return [n, all];
}
function buildDocHtml(doc){
  var vals = doc.values || {}, secs = buildDef().sections, fl = buildFilled(doc);
  var head = "<div class=\"bd-head\"><div><span class=\"tag fill\">" + esc(doc.role) + "</span> " + stageTag(doc) + " <span class=\"tag p\">" + esc(doc.item || "") + "</span> <span class=\"tag\">" + esc(doc.status || "") + "</span> <span class=\"tag\">" + fl[0] + " / " + fl[1] + "칸</span></div>" +
    "<h2>" + esc(doc.id) + " · " + esc(doc.title) + "</h2>" + (doc.from ? "<p class=\"lead\">" + esc(doc.from) + "</p>" : "") + "</div>";
  if(ui.bdView === "sheet"){
    return head + "<div class=\"orig bd-sheet\"><table><thead><tr><th>구분</th><th>칸</th><th>내용</th></tr></thead><tbody>" +
      secs.map(function(s){ return s.fields.map(function(f, i){
        return "<tr>" + (i === 0 ? "<td rowspan=\"" + s.fields.length + "\" class=\"o-topic\"><b>" + esc(s.title) + "</b></td>" : "") +
          "<td><b>" + esc((f.group ? f.group + " · " : "") + f.label) + "</b>" + (f.guide ? "<div class=\"muted small\">" + esc(f.guide) + "</div>" : "") + "</td><td>" + buildVal(f, vals[f.id]) + "</td></tr>" }).join("") }).join("") +
      "</tbody></table></div>";
  }
  return head + secs.map(function(s){
    var last = "";
    return "<section class=\"card bd-sec\"><div class=\"card-h\"><h3>" + esc(s.title) + "</h3></div>" + (s.guide ? "<p class=\"lead\">" + esc(s.guide) + "</p>" : "") +
      "<dl class=\"bd-kv\">" + s.fields.map(function(f){
        var g = f.group && f.group !== last ? "<dt class=\"bd-group\">" + (last ? "↑ " : "") + esc(f.group) + "</dt><dd class=\"bd-group\"></dd>" : "";
        last = f.group || last;
        return g + "<dt>" + esc(f.label) + (f.guide ? "<span>" + esc(f.guide) + "</span>" : "") + "</dt><dd>" + buildVal(f, vals[f.id]) + "</dd>";
      }).join("") + "</dl></section>";
  }).join("");
}
function buildListHtml(docs, sel){
  var groups = {}, order = [];
  docs.forEach(function(d){ var k = d.item || "아이템 없음"; if(!groups[k]){ groups[k] = []; order.push(k) } groups[k].push(d) });
  var rank = { "키": 0, "풀링": 1 };
  return order.map(function(k){
    return "<div class=\"bd-item\"><b>" + esc(k) + "</b>" + groups[k].sort(function(a, c){ return (rank[a.role] || 0) - (rank[c.role] || 0) }).map(function(d){
      var fl = buildFilled(d);
      return "<button class=\"bd-doc" + (d.id === sel ? " on" : "") + "\" data-ui=\"bdDoc=" + esc(d.id) + "\"><span class=\"tag fill\">" + esc(d.role === "키" ? "키콘" : d.role) + "</span> " + esc(d.id) +
        "<span class=\"clip\">" + esc(d.title) + "</span><span class=\"muted small\">" + esc(d.stage || "") + " · " + fl[0] + "/" + fl[1] + "칸</span></button>" }).join("") + "</div>";
  }).join("") || "<p class=\"empty\">아직 구축 문서가 없어요.</p>";
}
function buildIdeasHtml(){
  var b = part("build"), ideas = (b && b.ideas) || [];
  return "<h3>다시 착안한 추천</h3><p class=\"lead\">" + esc((b && b.ideasNote) || "레퍼런스 댓글·파동에서 다시 뽑은 주제예요.") + "</p>" +
    (ideas.map(function(x){
      return "<div class=\"bd-idea\"><div><span class=\"tag fill\">" + esc(x.role) + "</span> " + stageTag(x) + (x.product ? " <span class=\"tag p\">" + esc(x.product) + "</span>" : "") + " <span class=\"tag\">" + esc(x.from || "") + "</span></div>" +
        "<b>" + esc(x.title) + "</b><div class=\"it-d\">" + esc(x.basis || "") + "</div>" +
        ((x.refs || []).length ? "<details><summary>근거 레퍼런스 " + x.refs.length + "개</summary>" + x.refs.map(buildRefCell).join("") + "</details>" : "") + "</div>";
    }).join("") || "<p class=\"empty\">아직 없어요.</p>");
}
function viewBuild(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var docs = buildDocs(), sel = docs.filter(function(d){ return d.id === ui.bdDoc })[0] || docs[0];
  var bar = "<div class=\"bd-bar\"><div class=\"chips\"><button class=\"chip" + (ui.bdView !== "sheet" ? " on" : "") + "\" data-ui=\"bdView=cards\">세로</button>" +
    "<button class=\"chip" + (ui.bdView === "sheet" ? " on" : "") + "\" data-ui=\"bdView=sheet\">시트</button></div>" +
    "<button class=\"btn sm\" data-act=\"buildpdf\"" + (sel ? "" : " disabled") + ">PDF로 보기</button>" +
    "<span class=\"lead\" style=\"margin:0\">원문 [구축 - 콘텐츠] 칸 그대로예요. 문서는 맥의 Claude(추천 스킬)가 채워요.</span></div>";
  return bar + "<div class=\"bd\"><aside class=\"bd-left\"><h3>퍼널</h3><p class=\"lead\">" + esc((buildDef().funnel || []).join(" → ")) + "</p>" + buildListHtml(docs, sel && sel.id) + "</aside>" +
    "<div class=\"bd-main\" id=\"bd-print\">" + (sel ? buildDocHtml(sel) : "<p class=\"empty\">왼쪽에서 문서를 고르세요.</p>") + "</div>" +
    "<aside class=\"bd-right\">" + buildIdeasHtml() + "</aside></div>";
}
