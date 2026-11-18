/* ── 설계 탭 — 단계마다 자동 추천 기준을 한 곳에서, 같은 모양으로 (2026-11-18 동욱) ──
   "각 워크플로우마다 자동 추천한 기준을 설정에서 설계를 조율할 수 있게, 템플릿화할 수 있게. 지금은 흩어져 있는데 각 단계마다 통일된 UX/UI.
    설계에서도 대화창이 있어서 내가 요구하면 그에 맞게 세팅도 되고."
   단계 칸 = 번호 · 이름 · 무엇을 정하나 · 「지금」 한 줄 · 접힌 「바꾸기」(그 단계의 조절 칸). 각 단계 탭에는 dsLine(한 줄 + 「설계에서 바꾸기 →」)만 둔다.
   값은 그대로 그 단계의 ct.set 칸(seedSrc · kwCrit · anaOpt · recCrit · roles · rpOpt) — 템플릿은 그 칸들을 한 벌로 ct.set/_tpl 에 저장한다. */
var DS = [
  { id: "word", name: "단어 — 연관 검색어 받는 곳 · 나라", what: "씨앗 단어마다 어디서 · 어느 나라 기준으로 연관 검색어를 받을지", keys: ["seedSrc", "kwCountry"],
    sum: function(){ return "연관 검색어 " + ({ naver: "네이버", google: "구글 트렌드", both: "네이버 + 구글 트렌드" }[seedSrc()] || seedSrc()) + " · 나라 " + kwCountryName(kwCountry()) }, body: function(){ return seedSrcHtml() + kwCountryHtml() } },
  { id: "kw", name: "키워드 — 순위 기준", what: "연관 검색어를 무엇으로 줄 세우고 무엇을 숨길지", keys: ["kwCrit"],
    sum: function(){ var c = kwCrit(), r = 0; return c.order.filter(function(id){ return !c.off[id] }).slice(0, 3).map(function(id){ return (++r) + " " + KWCRIT.filter(function(q){ return q.id === id })[0].name }).join(" · ") + (c.minVol ? " · 월 " + c.minVol + " 이상" : "") },
    body: function(){ return kwCritHtml() } },
  { id: "content", name: "콘텐츠 — 영상 분석", what: "찾은 영상에서 무엇을 읽고 어떤 영상을 분석할지", keys: ["anaOpt"],
    sum: function(){ var o = anaOpt(); return ANA_PARTS.filter(function(p){ return o[p[0]] }).map(function(p){ return p[1] }).join(" · ") + " · 댓글 " + o.nCmt + "개 · " + (o.target === "picked" ? "💡 담은 영상" : "키워드마다 상위 " + o.topN + "개") },
    body: function(){ return anaOptHtml() } },
  { id: "rec", name: "추천 — 고르는 기준", what: "어떤 영상을 재료로, 무엇을 먼저 보고, 몇 편씩 추천할지", keys: ["recCrit", "roles"],
    sum: function(){ var c = recCrit(), s = S(), r = 0; return c.order.filter(function(id){ return !c.off[id] }).slice(0, 3).map(function(id){ return (++r) + " " + CRIT.filter(function(k){ return k.id === id })[0].name }).join(" · ") + (c.minRatio ? " · 구독자보다 " + c.minRatio + "배 이상" : "") + " · " + roleNames().map(function(n){ return roleKo(n) + " " + s.roles[n] + "편" }).join(" · ") },
    body: function(){ var r = part("rec"); return recCritPanel(r && r.rounds && r.rounds[r.rounds.length - 1]) } },
  { id: "ref", name: "참고 페이지 — 찾는 범위", what: "어떤 단어로 · 무엇을(소재 · 연출) · 어디서 찾을지", keys: ["rpOpt"],
    sum: function(){ var o = rpOpt(); return rpWords().length + "개 단어 · " + RP_SIDES.filter(function(x){ return o.sides[x.id] }).map(function(x){ return x.name }).join(" · ") + " · " + RP_REGION.filter(function(r){ return r[0] === o.region })[0][1] },
    body: function(){ return rpScopeHtml() } }
];
var DS_KEYS = ["seedSrc", "kwCountry", "kwCrit", "anaOpt", "recCrit", "roles", "rpOpt"];
function dsStage(id){ return DS.filter(function(x){ return x.id === id })[0] }
function dsChanged(st){ var c = SETS[cur] || {}; return st.keys.some(function(k){ return c[k] != null }) }
/* 각 단계 탭 맨 위의 한 줄 — 모든 단계가 같은 모양 */
function dsLine(id){
  var st = dsStage(id); if(!st) return "";
  return "<div class=\"dsline\"><span><b>기준</b> " + esc(st.sum()) + (dsChanged(st) ? "" : " <span class=\"muted\">(기본)</span>") + "</span><button class=\"chip\" data-go=\"design|dsOpen=" + id + "\">설계에서 바꾸기 →</button></div>";
}
function viewDesign(){
  if(!B()) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>설계</h3><span class=\"n\">" + esc(B().name) + "</span></div>" +
    "<p class=\"lead\">맥이 단계마다 무엇을 기준으로 자동 추천할지 여기서 정해요. 바꾸면 바로 저장되고, 다음에 맥이 일할 때부터 그대로 써요. 잘 맞는 한 벌은 「템플릿」에 저장해 다른 브랜드에도 써요.</p>" +
    "<h4>말로 바꾸기</h4><div class=\"row2\"><input type=\"text\" id=\"ds-ask\" data-dsask=\"1\" placeholder=\"예: 추천은 좋아요 많은 댓글을 제일 먼저 보고, 구독자보다 3배 이상 본 영상만\" value=\"" + esc(ui.dsDraft || "") + "\"><button class=\"btn primary\" data-act=\"dsask\">바꿔 줘</button></div>" +
    "<p class=\"it-d\" style=\"margin-top:4px\">✦ Brainy 대화가 열려 지금 기준을 읽고 바꿔요. 무엇을 어떻게 바꿨는지 대화에 남아요.</p></section>";
  DS.forEach(function(st, i){
    var open = ui.dsOpen === st.id;
    h += "<section class=\"card ds\" id=\"ds-" + st.id + "\"><div class=\"card-h\"><h3><span class=\"num muted\">" + (i + 1) + "</span> " + esc(st.name) + "</h3><span class=\"n\">" + (dsChanged(st) ? "바꿈" : "기본") + "</span></div>" +
      "<p class=\"lead\">" + esc(st.what) + "</p><p class=\"dsnow\"><b>지금</b> " + esc(st.sum()) + "</p>" +
      "<details class=\"wbox\"" + (open ? " open" : "") + "><summary><b>바꾸기</b>" + (dsChanged(st) ? "<span class=\"wsum\">기본값으로 되돌리기는 맨 아래</span>" : "") + "</summary><div class=\"wbody\">" + st.body() +
      (dsChanged(st) ? "<div class=\"acts\"><button class=\"btn sm\" data-act=\"dsreset\" data-v=\"" + st.id + "\">이 단계 기본값으로</button></div>" : "") + "</div></details></section>";
  });
  h += "<section class=\"card\"><div class=\"card-h\"><h3>Claude 모드</h3></div><p class=\"dsnow\"><b>지금</b> " + esc(claudeSummary()) + "</p><div class=\"acts\"><button class=\"btn sm\" data-tab=\"claude\">Claude 모드 칸으로 →</button></div></section>";
  return h;
}
/* 템플릿 — 설계 한 벌(단계 칸 값 전부)을 이름 붙여 저장하고 다른 브랜드에 적용. 앱 전체에 한 목록 ct.set/_tpl {list:[{id, name, from, at, values}]} */
function tplList(){ return ((SETS._tpl || {}).list || []).slice() }
function tplSave(list){ SETS._tpl = { list: list, updatedAt: new Date().toISOString() }; saveSet("_tpl"); render() }
function viewTpl(){
  if(!B()) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var list = tplList(), c = SETS[cur] || {};
  return "<section class=\"card\"><div class=\"card-h\"><h3>템플릿</h3><span class=\"n\">" + list.length + "개</span></div>" +
    "<p class=\"lead\">지금 브랜드(" + esc(B().name) + ")의 설계 — 단어 받는 곳 · 키워드 순위 · 영상 분석 · 추천 기준과 편 수 · 참고 페이지 범위 — 를 한 벌로 저장해요. 다른 브랜드를 열고 「적용」하면 그 브랜드의 설계가 이 한 벌로 바뀌어요.</p>" +
    "<div class=\"row2\"><input type=\"text\" id=\"tpl-name\" data-tplin=\"1\" maxlength=\"30\" placeholder=\"템플릿 이름 (예: B2B 문의형 · 개인 채널 성장형)\" value=\"" + esc(ui.tplDraft || "") + "\"><button class=\"btn primary\" data-act=\"tplsave\">지금 설계 저장</button></div></section>" +
    "<section class=\"card\"><div class=\"list\">" + (list.map(function(t){
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(t.name) + "</b> <span class=\"num muted\">" + esc(String(t.at || "").slice(0, 10)) + " · " + esc(t.from || "") + "에서</span></div>" +
        "<div class=\"it-d\">" + DS.filter(function(st){ return st.keys.some(function(k){ return t.values[k] != null }) }).map(function(st){ return st.name.split(" — ")[0] }).join(" · ") + " 바꾼 값 · 나머지는 기본</div></div>" +
        "<button class=\"btn sm primary\" data-act=\"tplapply\" data-v=\"" + esc(t.id) + "\">" + esc(B().name) + "에 적용</button><button class=\"mk no\" data-act=\"tpldel\" data-v=\"" + esc(t.id) + "\" aria-label=\"" + esc(t.name) + " 지우기\" title=\"지우기\">✕</button></div>" }).join("") ||
      "<p class=\"empty\">아직 저장한 템플릿이 없어요. 설계를 맞춘 뒤 위에서 이름을 붙여 저장하세요.</p>") + "</div>" +
    "<div class=\"acts\"><button class=\"btn sm\" data-act=\"dsresetall\"" + (DS_KEYS.some(function(k){ return c[k] != null }) ? "" : " disabled") + ">" + esc(B().name) + " 설계 전부 기본값으로</button></div></section>";
}
function designAct(name, el){
  var v = el.dataset.v;
  if(name === "dsreset"){ var st = dsStage(v), p = {}; st.keys.forEach(function(k){ p[k] = null }); if(confirm("「" + st.name + "」을 기본값으로 되돌릴까요?")) setS(p); return true }
  if(name === "dsresetall"){ var p2 = {}; DS_KEYS.forEach(function(k){ p2[k] = null }); if(confirm(B().name + "의 설계를 전부 기본값으로 되돌릴까요?")) setS(p2); return true }
  if(name === "dsask"){ var inp = document.getElementById("ds-ask"), q = ((inp && inp.value) || "").trim(); if(!q){ if(inp) inp.focus(); return true }
    ui.dsDraft = ""; if(window.BRAINY_CHAT) window.BRAINY_CHAT.ask("[설계] " + q); else alert("Brainy 대화를 열 수 없어요 — 로그인을 확인해 주세요."); render(); return true }   // 「[설계] …」를 어떻게 바꿀지는 대화 규칙(content-brainy.js rules)에 — 대화창엔 동욱 말만 보이게
  /* 템플릿 저장 — Enter(한글 조합 끝)로 눌러도 쓰던 이름(ui.tplDraft)으로 */
  if(name === "tplsave"){ var ni = document.getElementById("tpl-name"), nm = ((ni && ni.value) || ui.tplDraft || "").trim(); if(!nm){ alert("템플릿 이름을 적어 주세요."); if(ni) ni.focus(); return true }
    var c = SETS[cur] || {}, vals = {}; DS_KEYS.forEach(function(k){ if(c[k] != null) vals[k] = JSON.parse(JSON.stringify(c[k])) });
    var list = tplList().filter(function(t){ return t.name !== nm }); list.unshift({ id: "t" + Date.now().toString(36), name: nm, from: B().name, at: new Date().toISOString(), values: vals });
    ui.tplDraft = ""; tplSave(list); toast("「" + nm + "」 템플릿을 저장했어요"); return true }
  if(name === "tplapply"){ var t = tplList().filter(function(x){ return x.id === v })[0]; if(!t) return true;
    if(!confirm("「" + t.name + "」을 " + B().name + "에 적용할까요? 지금 설계는 이 템플릿 값으로 바뀌어요.")) return true;
    var p3 = {}; DS_KEYS.forEach(function(k){ p3[k] = t.values[k] != null ? JSON.parse(JSON.stringify(t.values[k])) : null }); setS(p3); toast("「" + t.name + "」을 적용했어요"); return true }
  if(name === "tpldel"){ var t2 = tplList().filter(function(x){ return x.id === v })[0]; if(t2 && confirm("「" + t2.name + "」 템플릿을 지울까요?")) tplSave(tplList().filter(function(x){ return x.id !== v })); return true }
  return false;
}
/* 설계 대화가 읽을 지금 값과 바꿀 수 있는 칸 (content-brainy.js 의 ctx · set_design) */
function designState(){ var c = SETS[cur] || {}, o = {}; DS_KEYS.forEach(function(k){ o[k] = c[k] != null ? c[k] : "(기본)" }); return o }
var DS_SCHEMA = [
  "seedSrc: \"naver\" | \"google\" | \"both\" — 연관 검색어 받는 곳",
  "kwCountry: \"KR\"|\"US\"|\"JP\"|\"GB\"|\"TW\"|\"VN\"|\"\"(전 세계) — 구글 트렌드·유튜브 검색 나라",
  "kwCrit: {order: [\"rel\",\"vol\",\"ctr\",\"rise\",\"comp\"] 순서(위일수록 크게), off: {id: true 끄기}, far: \"mix\"|\"fold\"|\"hide\"(씨앗 글자 안 든 말), minVol: 0|10|100|1000, minRel: 0|1|50}",
  "anaOpt: {topic, wave, comments, fit: true|false(영상 주제·파동 대사·좋아요 많은 댓글·구매 욕구 검증), nCmt: 5|10|20, target: \"top\"|\"picked\", topN: 1|3|5}",
  "recCrit: {order: [\"ratio\",\"comment\",\"fit\",\"wave\",\"topic\",\"fresh\"] 순서, off: {id: true}, use: {fav, pin, seed, ref: true|false 재료}, favFirst: true|false, minRatio: 0|1|3|10}",
  "roles: {역할 이름: 편 수 0~8} — 역할 이름은 브랜드의 역할(풀링 · 키 등)",
  "rpOpt: {sides: {정체성, 상품, 연출: true|false}, region: \"world\"|\"ko\"|\"en\"|\"ja\"|\"zh\"|\"eu\", words: {씨앗 단어: false 이면 빼기}}",
  "값을 null 로 주면 그 칸은 기본값으로 돌아간다"
].join("\n");
