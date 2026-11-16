/* ── 판정 믹서 — 스킬이 키워드·레퍼런스를 고를 때 쓰는 조절값. 음향 믹서처럼 분야 템플릿을 고르고 값마다 올리고 내린다 ──
   조절값 정의(이름·범위·뜻)와 분야별 템플릿은 볼트 「콘텐츠 기획 앱/믹서.json」(ct.data/mixer.def)이 정본 — 코드에 값을 넣지 않는다.
   지금 값 = 고른 템플릿 값 + 이 브랜드에서 바꾼 값(ct.set mixer). 이 값으로 ③ 키워드 점수와 ④ 레퍼런스 점수를 앱이 계산하고,
   맥의 스킬은 같은 값을 설정.json 에서 읽어 조사·추천 기준으로 쓴다. 피드백(ct.set feedback)은 스킬이 다음 실행 때 읽고 「믹서 기록」에 답한다. */
function mixDef(){ return RAW["mixer.def"] || { knobs: [], templates: [] } }
function mixTpl(){
  var d = mixDef(), s = SETS[cur] || {}, id = s.template || (B() && B().template) || "base";
  return d.templates.filter(function(t){ return t.id === id })[0] || d.templates[0] || { id: id, name: id, values: {} };
}
function M(){   // 지금 적용되는 값
  var v = Object.assign({}, mixTpl().values, (SETS[cur] || {}).mixer || {});
  return v;
}
function wsum(pairs){   // [[가중치, 0~100 점수], …] → 가중 평균
  var w = 0, t = 0; pairs.forEach(function(p){ w += p[0]; t += p[0] * p[1] }); return w ? t / w : 0;
}
function knobText(k, v){ return v + (k.unit || "") }
function viewMixer(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var d = mixDef(), tpl = mixTpl(), s = SETS[cur] || {}, over = s.mixer || {}, v = M();
  if(!d.knobs.length) return "<p class=\"empty\">믹서 정의가 아직 안 올라왔어요. 맥 동기화가 볼트의 「믹서.json」을 올리면 떠요.</p>";
  var nChanged = d.knobs.filter(function(k){ return over[k.id] != null && over[k.id] !== tpl.values[k.id] }).length;
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>분야 템플릿</h3><span class=\"n\">" + (nChanged ? nChanged + "개 바꿈" : "템플릿 그대로") + "</span></div>" +
    "<p class=\"lead\">분야에 따라 무엇을 더 믿을지가 달라요. 템플릿을 고른 뒤 아래에서 값마다 조절하세요. 이 값대로 ③ 키워드·④ 콘텐츠 점수가 바로 바뀌고, 다음 조사·추천부터 스킬도 이 기준으로 골라요.</p>" +
    "<div class=\"chips\">" + d.templates.map(function(t){ return "<button class=\"chip" + (t.id === tpl.id ? " on" : "") + "\" data-tpl=\"" + esc(t.id) + "\">" + esc(t.name) + "</button>" }).join("") + "</div>" +
    "<p class=\"small\" style=\"margin-top:10px\"><b>" + esc(tpl.name) + "</b> — " + esc(tpl["for"] || "") + "</p><p class=\"lead\">" + esc(tpl.why || "") + "</p>" +
    (nChanged ? "<div class=\"acts\"><button class=\"btn sm\" data-act=\"resetmixer\">템플릿 값으로 되돌리기</button></div>" : "") + "</section>";
  var groups = [], by = {};
  d.knobs.forEach(function(k){ if(!by[k.group]){ by[k.group] = []; groups.push(k.group) } by[k.group].push(k) });
  groups.forEach(function(g){
    h += "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(g) + "</h3></div><div class=\"knobs\">" + by[g].map(function(k){
      var val = v[k.id] != null ? v[k.id] : k.min, base = tpl.values[k.id], ch = base != null && val !== base;
      return "<div class=\"knob\"><div class=\"knob-h\"><b>" + esc(k.name) + "</b><span class=\"num\" id=\"kv-" + k.id + "\">" + knobText(k, val) + "</span></div>" +
        "<input type=\"range\" data-knob=\"" + k.id + "\" min=\"" + k.min + "\" max=\"" + k.max + "\" step=\"" + k.step + "\" value=\"" + val + "\" aria-label=\"" + esc(k.name) + "\">" +
        "<div class=\"it-d\">" + esc(k.what) + (ch ? " · <span class=\"up\">템플릿 " + knobText(k, base) + " → " + knobText(k, val) + "</span>" : "") + "</div></div>";
    }).join("") + "</div></section>";
  });
  var fb = s.feedback || [], lg = part("mixlog");
  h += "<section class=\"card\"><div class=\"card-h\"><h3>피드백</h3><span class=\"n\">" + fb.length + "개</span></div>" +
    "<p class=\"lead\">결과를 보고 느낀 것을 그대로 적어 두세요 (예: 「댓글 반응 좋은 영상이 실제로 잘 맞았다 — 댓글 비중 더」). 스킬이 다음 조사·추천 때 읽고, 어떻게 반영했는지 아래 기록에 남겨요.</p>" +
    "<div class=\"row2\"><select id=\"fb-knob\" style=\"flex:0 0 38%\"><option value=\"\">전체에 대해</option>" + d.knobs.map(function(k){ return "<option value=\"" + k.id + "\">" + esc(k.name) + "</option>" }).join("") + "</select>" +
    "<input type=\"text\" id=\"fb-text\" placeholder=\"피드백 한 줄\"></div><div class=\"acts\"><button class=\"btn sm primary\" data-act=\"fbadd\">남기기</button></div>" +
    (fb.length ? "<div class=\"list\" style=\"margin-top:8px\">" + fb.slice().reverse().map(function(f){ var k = d.knobs.filter(function(x){ return x.id === f.knob })[0];
      return "<div class=\"it\"><span class=\"num muted\">" + esc(day(f.at).slice(5)) + "</span><div class=\"it-m\"><div>" + (k ? "<span class=\"tag\">" + esc(k.name) + "</span> " : "") + esc(f.text) + "</div></div>" +
        "<button class=\"mk no\" data-fbdel=\"" + esc(f.at) + "\" aria-label=\"지우기\">✕</button></div>" }).join("") + "</div>" : "") + "</section>";
  h += "<section class=\"card\"><div class=\"card-h\"><h3>믹서 기록 — 스킬이 남긴 것</h3><span class=\"n\">" + (lg ? lg.items.length : 0) + "개</span></div>" +
    (lg && lg.items.length ? "<div class=\"list\">" + lg.items.slice(0, 10).map(function(x){
      return "<div class=\"it\"><span class=\"num muted\">" + esc(String(x.date).slice(5)) + "</span><div class=\"it-m\"><div><b>" + esc(x.run) + "</b> " + esc(x.note) + "</div>" +
        (x.suggest ? "<div class=\"it-d\">제안 · " + esc(x.suggest) + "</div>" : "") + (x.tools ? "<div class=\"it-d\">쓴 도구 · " + esc(x.tools) + "</div>" : "") + "</div></div>" }).join("") + "</div>"
      : "<p class=\"lead\">조사·추천을 돌릴 때마다 스킬이 「어떤 값으로 골랐고 결과가 어땠는지, 값을 어떻게 바꾸면 좋을지, 어떤 도구를 썼는지」를 여기에 남겨요. 아직 이 믹서로 돌린 실행이 없어요.</p>") + "</section>";
  return h;
}
