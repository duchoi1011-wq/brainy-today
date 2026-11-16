/* ── 판정 믹서 — 스킬이 키워드·레퍼런스를 고를 때 쓰는 조절값. 음향 믹서처럼 분야 템플릿을 고르고 값마다 올리고 내린다 ──
   조절값 정의(이름·뜻·올리면)와 분야별 템플릿·설명(guide)은 볼트 「콘텐츠 기획 앱/믹서.json」(ct.data/mixer.def)이 정본 — 코드에 값·문구를 넣지 않는다.
   지금 값 = 고른 템플릿 값 + 이 브랜드에서 바꾼 값(ct.set mixer). 이 값으로 키워드 점수와 레퍼런스 점수를 앱이 계산하고 (skillOnly 값은 스킬만 읽는다),
   맥의 스킬은 같은 값을 설정.json 에서 읽어 조사·추천 기준으로 쓴다. 피드백(ct.set feedback)은 스킬이 다음 실행 때 읽고 「믹서 기록」에 답한다.
   템플릿 저장: 지금 값을 ct.set/_mixer saves 에 쓰면 맥 동기화가 믹서.json templates 에 넣는다. 맥이 받기 전에도 화면에서 바로 쓰이게 정의에 겹쳐 본다. */
function mixSaves(){ return (SETS._mixer || {}).saves || {} }
function mixDef(){
  var d = RAW["mixer.def"] || { knobs: [], templates: [] }, sv = mixSaves(), ids = {};
  var tpls = d.templates.map(function(t){ ids[t.id] = 1; var s = sv[t.id]; return s && (!t.saved || String(s.at) > String(t.saved)) ? Object.assign({}, t, { name: s.name, values: s.values, saved: s.at }) : t });
  Object.keys(sv).forEach(function(id){ if(!ids[id]) tpls.push(Object.assign({ saved: sv[id].at }, sv[id])) });
  return Object.assign({}, d, { templates: tpls });
}
function mixTpl(){
  var d = mixDef(), s = SETS[cur] || {}, id = s.template || (B() && B().template) || "base";
  return d.templates.filter(function(t){ return t.id === id })[0] || d.templates[0] || { id: id, name: id, values: {} };
}
function M(){ return Object.assign({}, mixTpl().values, (SETS[cur] || {}).mixer || {}) }   // 지금 적용되는 값
function wsum(pairs){   // [[가중치, 0~100 점수], …] → 가중 평균
  var w = 0, t = 0; pairs.forEach(function(p){ w += p[0]; t += p[0] * p[1] }); return w ? t / w : 0;
}
function knobText(k, v){ return v + (k.unit || "") }
/* 비중 묶음(weight)에서 이 값이 차지하는 몫 — 「검색량 6 · 클릭률 3 · 상승세 2」 → 55% · 27% · 18% */
function sharePct(list, v, k){ var t = 0; list.forEach(function(x){ t += +(v[x.id] || 0) }); return t ? Math.round(+(v[k.id] || 0) / t * 100) : 0 }
function saveTpl(mode){
  var tpl = mixTpl(), v = M(), at = new Date().toISOString(), b = B(), sv = Object.assign({}, mixSaves()), id;
  if(mode === "over"){
    if(!confirm("「" + tpl.name + "」 템플릿 값을 지금 값으로 바꿀까요? 이 템플릿을 쓰는 다른 브랜드도 같이 바뀌어요.")) return;
    id = tpl.id; sv[id] = { id: id, name: tpl.name, "for": tpl["for"] || "", why: tpl.why || "", values: v, at: at };
  } else {
    var el = document.getElementById("tpl-name"), nm = ((el && el.value) || "").trim();
    if(!nm){ alert("새 템플릿 이름을 적어 주세요."); if(el) el.focus(); return }
    id = "u" + Date.now().toString(36);
    sv[id] = { id: id, name: nm.slice(0, 40), "for": (b ? b.name : "") + "에서 맞춘 값", why: "「" + tpl.name + "」에서 출발해 " + (b ? b.name : "") + " 믹서 탭에서 맞춤 (" + day(at) + ")", values: v, at: at };
    ui.tplName = "";
  }
  SETS._mixer = { saves: sv, updatedAt: at };
  if(DB) DB.doc("ct.set/_mixer").set(SETS._mixer).catch(function(){ alert("저장하지 못했어요 — 인터넷을 확인하고 다시 눌러 주세요") });
  ui.toast = "「" + sv[id].name + "」 템플릿으로 저장했어요. 맥이 볼트 믹서.json 에도 넣어요.";
  setS({ template: id, mixer: {} });
}
function viewMixer(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var d = mixDef(), tpl = mixTpl(), s = SETS[cur] || {}, over = s.mixer || {}, v = M(), g0 = d.guide || {};
  if(!d.knobs.length) return "<p class=\"empty\">믹서 정의가 아직 안 올라왔어요. 맥 동기화가 볼트의 「믹서.json」을 올리면 떠요.</p>";
  var nChanged = d.knobs.filter(function(k){ return over[k.id] != null && over[k.id] !== tpl.values[k.id] }).length;
  var h = "";
  if(ui.toast){ h += "<div class=\"run done\"><b>✓</b><span>" + esc(ui.toast) + "</span><button class=\"x\" data-act=\"toastx\" aria-label=\"닫기\">✕</button></div>" }
  if(g0.what) h += "<section class=\"card\"><div class=\"card-h\"><h3>믹서는 무엇을 하나</h3></div><p>" + esc(g0.what) + "</p>" +
    ((g0.flow || []).length ? "<div class=\"list\" style=\"margin-top:8px\">" + g0.flow.map(function(f){ return "<div class=\"it\"><div class=\"it-m small\">" + esc(f) + "</div></div>" }).join("") + "</div>" : "") +
    (g0.weight ? "<p class=\"note\" style=\"margin-top:10px\">" + esc(g0.weight) + "</p>" : "") + (g0.skillOnly ? "<p class=\"lead\" style=\"margin-top:8px\">" + esc(g0.skillOnly) + "</p>" : "") + "</section>";
  h += "<section class=\"card\"><div class=\"card-h\"><h3>분야 템플릿</h3><span class=\"n\">" + (nChanged ? nChanged + "개 바꿈" : "템플릿 그대로") + "</span></div>" +
    "<div class=\"chips\">" + d.templates.map(function(t){ return "<button class=\"chip" + (t.id === tpl.id ? " on" : "") + "\" data-tpl=\"" + esc(t.id) + "\">" + esc(t.name) + (t.saved ? "<span>저장</span>" : "") + "</button>" }).join("") + "</div>" +
    "<p class=\"small\" style=\"margin-top:10px\"><b>" + esc(tpl.name) + "</b> — " + esc(tpl["for"] || "") + "</p><p class=\"lead\">" + esc(tpl.why || "") + (tpl.saved ? " · 저장 " + esc(day(tpl.saved)) : "") + "</p>" +
    "<h4>지금 값 저장하기</h4><div class=\"row2\"><input type=\"text\" id=\"tpl-name\" maxlength=\"40\" placeholder=\"새 템플릿 이름 (예: B2B 문의형 — 댓글 더)\" value=\"" + esc(ui.tplName || "") + "\"><button class=\"btn sm primary\" data-act=\"tplnew\">새 템플릿으로</button></div>" +
    "<div class=\"acts\">" + (nChanged ? "<button class=\"btn sm\" data-act=\"tplover\">「" + esc(tpl.name) + "」에 덮어쓰기</button><button class=\"btn sm\" data-act=\"resetmixer\">템플릿 값으로 되돌리기</button>" : "") +
    "<span class=\"lead\" style=\"margin:0\">저장한 템플릿은 다른 브랜드에서도 골라 쓸 수 있어요.</span></div></section>";
  var groups = [], by = {};
  d.knobs.forEach(function(k){ if(!by[k.group]){ by[k.group] = []; groups.push(k.group) } by[k.group].push(k) });
  groups.forEach(function(g){
    var list = by[g], wl = list.filter(function(k){ return k.weight });
    h += "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(g) + "</h3>" + (wl.length ? "<span class=\"n\">" + wl.map(function(k){ return esc(k.name) + " " + sharePct(wl, v, k) + "%" }).join(" · ") + "</span>" : "") + "</div><div class=\"knobs\">" + list.map(function(k){
      var val = v[k.id] != null ? v[k.id] : k.min, base = tpl.values[k.id], ch = base != null && val !== base;
      return "<div class=\"knob\"><div class=\"knob-h\"><b>" + esc(k.name) + (k.skillOnly ? " <span class=\"tag\">스킬만</span>" : "") + "</b><span class=\"num\" id=\"kv-" + k.id + "\">" + knobText(k, val) + (k.weight ? " · " + sharePct(wl, v, k) + "%" : "") + "</span></div>" +
        "<input type=\"range\" data-knob=\"" + k.id + "\" min=\"" + k.min + "\" max=\"" + k.max + "\" step=\"" + k.step + "\" value=\"" + val + "\" aria-label=\"" + esc(k.name) + "\">" +
        "<div class=\"it-d\">" + esc(k.what) + (ch ? " · <span class=\"up\">템플릿 " + knobText(k, base) + " → " + knobText(k, val) + "</span>" : "") + "</div>" +
        (k.up ? "<div class=\"it-d\">↑ " + esc(k.up) + "</div>" : "") + "</div>";
    }).join("") + "</div></section>";
  });
  var fb = s.feedback || [], lg = part("mixlog");
  h += "<section class=\"card\"><div class=\"card-h\"><h3>피드백</h3><span class=\"n\">" + fb.length + "개</span></div>" +
    "<p class=\"lead\">결과를 보고 느낀 것을 그대로 적어 두세요 (예: 「댓글 반응 좋은 영상이 실제로 잘 맞았다 — 댓글 비중 더」). 스킬이 다음 조사·추천 때 읽고, 어떻게 반영했는지 아래 기록에 남겨요.</p>" +
    "<div class=\"row2\"><select id=\"fb-knob\" style=\"flex:0 0 38%\"><option value=\"\">전체에 대해</option>" + d.knobs.map(function(k){ return "<option value=\"" + k.id + "\">" + esc(k.name) + "</option>" }).join("") + "</select>" +
    "<input type=\"text\" id=\"fb-text\" maxlength=\"400\" placeholder=\"피드백 한 줄 (Enter로 남기기)\" value=\"" + esc(ui.fbDraft || "") + "\"></div><div class=\"acts\"><button class=\"btn sm primary\" data-act=\"fbadd\">남기기</button></div>" +
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
