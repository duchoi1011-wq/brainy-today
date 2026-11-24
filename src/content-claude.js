/* ── Claude 모드 — 브랜드 탭 「Claude 모드」 칸 (앱 전체에 한 벌) ──
   2026-11-18 동욱: "이 앱의 대화가 볼트 자체와 볼트의 지침을 읽고 작업할 수 있게, 앱 전반에 클로드 모드를 조절해서 쓸 수 있게".
   묶음·모델 이름·기본값·미리 정한 묶음(아끼기·균형·최고)은 볼트 「콘텐츠 기획 앱/Claude 모드.json」(ct.data/claude.def)이 정본 — 코드에 적지 않는다.
   동욱이 고른 값은 ct.set/_claude {where, models: {묶음 id: 모델}} 한 곳. 맥의 cmd_runner.py(맥 작업)와 ai_runner.py(앱 대화)가 읽는다. */
function claudeDef(){ return RAW["claude.def"] || { models: [], groups: [], chatWhere: [], presets: [] } }
function claudeSet(){ return SETS._claude || {} }
function claudeModel(gid){ var d = claudeDef(), g = d.groups.filter(function(x){ return x.id === gid })[0] || {}, m = (claudeSet().models || {})[gid]; return d.models.some(function(x){ return x.id === m }) ? m : g.default }
function claudeWhere(){ var w = claudeSet().where; return w || claudeDef().chatWhereDefault || "mac" }
function modelName(id){ var m = claudeDef().models.filter(function(x){ return x.id === id })[0]; return m ? m.name : id }
function claudeSave(patch){ SETS._claude = Object.assign({}, claudeSet(), patch, { updatedAt: new Date().toISOString() }); saveSet("_claude"); render() }
function claudeSummary(){ return claudeDef().groups.map(function(g){ return g.name + " " + modelName(claudeModel(g.id)) }).join(" · ") }
function viewClaude(){
  var d = claudeDef(); if(!d.groups.length) return "<section class=\"card\"><p class=\"empty\">Claude 모드 설정을 불러오는 중이에요.</p></section>";
  var cur3 = d.groups.map(function(g){ return claudeModel(g.id) }).join(","), w = claudeWhere();
  function chip(on, act, v, label, title){ return "<button class=\"chip" + (on ? " on" : "") + "\" data-act=\"" + act + "\" data-v=\"" + esc(v) + "\"" + (title ? " title=\"" + esc(title) + "\"" : "") + ">" + esc(label) + "</button>" }
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>Claude 모드</h3><span class=\"n\">이 앱 전체</span></div>" +
    "<p class=\"lead\">앱 대화와 맥이 하는 일마다 어떤 Claude가 일할지 골라요. 「깊게」일수록 똑똑하지만 사용량을 많이 써요. 바꾸면 다음 일부터 바로 적용돼요.</p>" +
    "<h4>한 번에 고르기</h4><div class=\"chips\">" + d.presets.map(function(p){ var on = d.groups.map(function(g){ return p.values[g.id] }).join(",") === cur3; return chip(on, "clpreset", p.id, p.name) }).join("") + "</div>" +
    "<h4>앱 대화 — 어디서 답할까</h4><div class=\"list\">" + d.chatWhere.map(function(x){
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.name) + "</b></div><div class=\"it-d\">" + esc(x.what) + "</div></div>" +
        "<button class=\"btn sm" + (w === x.id ? " primary" : "") + "\" data-act=\"clwhere\" data-v=\"" + esc(x.id) + "\">" + (w === x.id ? "쓰는 중" : "이걸로") + "</button></div>" }).join("") + "</div>" +
    "<h4>일마다 — 얼마나 깊게</h4><div class=\"list\">" + d.groups.map(function(g){ var m = claudeModel(g.id);
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(g.name) + "</b> <span class=\"num muted\">기본 " + esc(modelName(g.default)) + "</span></div><div class=\"it-d\">" + esc(g.what) + "</div>" +
        "<div class=\"chips\" style=\"margin-top:6px\">" + d.models.map(function(x){ return chip(m === x.id, "clmodel", g.id + ":" + x.id, x.name, x.what) }).join("") + "</div></div></div>" }).join("") + "</div>" +
    "<p class=\"lead\" style=\"margin-top:10px\">" + d.models.map(function(x){ return "<b>" + esc(x.name) + "</b> " + esc(x.what) }).join(" · ") + "</p></section>";
  return h;
}
function claudeAct(name, el){
  var v = el.dataset.v;
  /* 저장은 서버 값을 받은 뒤에(whenLive) — 그때의 값 위에 고른 것만 얹는다 (이 기기에 남은 옛 사본으로 덮지 않게, 2026-11-21) */
  if(name === "clwhere"){ whenLive(function(){ claudeSave({ where: v }) }); return true }
  if(name === "clmodel"){ var p = v.split(":"); whenLive(function(){ var ms = Object.assign({}, claudeSet().models || {}); ms[p[0]] = p[1]; claudeSave({ models: ms }) }); return true }
  if(name === "clpreset"){ var pr = claudeDef().presets.filter(function(x){ return x.id === v })[0]; if(pr) whenLive(function(){ claudeSave({ models: Object.assign({}, pr.values) }) }); return true }
  return false;
}
