/* ── ⚙ 설정 창 — 왼쪽 목록에서 고르고 오른쪽에서 바꾸는 창 하나 ──
   2026-11-18 동욱 (Claude 앱 설정 창을 보여 주며): "이렇게 설정 안에서 고르고 설정을 할 수 있게 만들라고".
   탭 줄의 「설계」 그룹을 없애고, 단계별 기준 · 템플릿 · Claude 모드 · 돌린 기록 · 🔖 중요를 이 창의 칸으로 둔다.
   칸 화면은 각 파일의 view 함수(viewDesign · viewTpl · viewClaude · viewHist · viewImp)를 그대로 쓴다.
   여는 곳: 머리 「⚙ 설정」 · 단계 탭의 「설계에서 바꾸기 →」(data-go="design|dsOpen=…") · 앱 대화 open_tab. 열린 칸 = ui.set (닫히면 null) */
var SETTINGS = [
  { name: "자동 추천 기준", items: [["design", "단계별 기준", "🎚", "단계마다 자동 추천이 무엇을 보고 고르나"], ["tpl", "템플릿", "🗂", "설계 묶음 저장 · 다른 브랜드에 적용"]] },
  { name: "기록", items: [["hist", "돌린 기록", "🕘", "단계를 돌릴 때마다 남은 결과"], ["imp", "중요", "🔖", "기간 상관없이 모아 둔 것"]] },
  { name: "앱", items: [["claude", "Claude 모드", "🤖", "대화 · 일마다 빠름 · 보통 · 깊게"]] }
];
var SET_VIEW = { design: function(){ return viewDesign() }, tpl: function(){ return viewTpl() }, claude: function(){ return viewClaude() }, hist: function(){ return viewHist() }, imp: function(){ return viewImp() } };
function isSet(id){ return !!SET_VIEW[id] }
function setOpen(id){ ui.set = isSet(id) ? id : "design"; save("ct.set.last", ui.set); render() }
function setClose(){ ui.set = null; render() }
function settingsHtml(){
  if(!ui.set) return "";
  var q = String(ui.setQ || "").trim(), cur0 = ui.set;
  var nav = SETTINGS.map(function(g){
    var its = g.items.filter(function(x){ return !q || (x[1] + " " + x[3]).indexOf(q) >= 0 });
    if(!its.length) return "";
    return "<div class=\"sg\">" + esc(g.name) + "</div>" + its.map(function(x){ return "<button class=\"si" + (x[0] === cur0 ? " on" : "") + "\" data-setgo=\"" + x[0] + "\" title=\"" + esc(x[3]) + "\"><span class=\"sic\">" + x[2] + "</span>" + esc(x[1]) + "</button>" }).join("");
  }).join("") || "<p class=\"lead\" style=\"padding:8px\">「" + esc(q) + "」 칸이 없어요.</p>";
  var it = []; SETTINGS.forEach(function(g){ g.items.forEach(function(x){ if(x[0] === cur0) it = x }) });
  return "<div class=\"setm-bg\" data-setclose=\"1\"></div><div class=\"setm\" role=\"dialog\" aria-modal=\"true\" aria-label=\"설정\">" +
    "<div class=\"setm-h\"><b>설정</b><span class=\"muted\">" + esc((B() || {}).name || "") + "</span><button class=\"setm-x\" data-setclose=\"1\" aria-label=\"설정 닫기\">✕</button></div>" +
    "<div class=\"setm-b\"><nav class=\"setm-nav\"><input type=\"search\" id=\"setq\" placeholder=\"검색\" value=\"" + esc(q) + "\" aria-label=\"설정 칸 찾기\">" + nav + "</nav>" +
    "<div class=\"setm-c\" id=\"setm-c\"><h2>" + (it[2] || "") + " " + esc(it[1] || "") + "</h2><p class=\"lead\">" + esc(it[3] || "") + "</p>" + SET_VIEW[cur0]() + "</div></div></div>";
}
