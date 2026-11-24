/* ── 기준 키워드 · 영상 주제 한 줄 · 목록 지우기와 되돌리기 · 찾는 나라 ──
   2026-11-18 동욱 (같은 부탁이 두 번 와서 한 벌로 넣음):
   ① 기준 키워드 — 대본 탭(구축 · 참고 페이지 · 대본) 맨 위. 잘 나온 키워드(🚀 자동 진행이 고른 최고 키워드 → 없으면 점수 높은 순)를 기본으로 쓰고, 동욱이 직접 넣고 뺀다.
      ★(콘텐츠 검색용으로 고른 키워드)는 기본에 넣지 않는다 — 검색어로 고른 것이라 대본 기준과 따로 (2026-11-22 동욱).
      ct.set baseKw {add:[키워드…], off:{키워드:1}} — 기본 목록은 자료가 바뀌면 따라 바뀌고, 직접 넣은 것·뺀 것만 기억한다.
   ② 영상 주제 한 줄 — 같은 칸. ct.set topic (글 한 줄).
      ①② 는 맥에 보내는 구축·대본·참고 페이지·소재·고치기 명령(cmd params.baseKw · params.topic)과 🚀 자동 진행(autoReq.params)에 같이 실린다 (send → BASE_KINDS).
   ③ 목록마다 지우기와 되돌리기 — 추천 · 구축 문서 · 다시 착안한 추천 · 대본 · 참고 페이지 후보. 지우면 화면 아래에 「되돌리기」가 잠깐 뜨고, 목록 끝 「지운 것」에서도 되살린다.
      앱에서 숨기기만 한다 — ct.set gone {"<목록>:<id>": 지운 때}. 볼트 원본 파일은 그대로다.
   ④ 찾는 나라 — 키워드 탭 씨앗 카드. ct.set kwCountry (기본 KR). 맥이 구글 트렌드·유튜브 검색을 그 나라로 받는다 (네이버 검색량은 늘 한국).
      키워드 추천(kwrec params.country) · 콘텐츠 검색(searchReq.country) · 단어 후보 찾기(wordReq.country)에도 실린다. */
var BASE_N = 5;   // 기본으로 쓰는 잘 나온 키워드 수
function baseSet(){ var o = (SETS[cur] || {}).baseKw || {}; return { add: (o.add || []).slice(), off: Object.assign({}, o.off || {}) } }
function baseKwAuto(){   // 잘 나온 키워드 — 자동 진행이 고른 최고 키워드, 없으면 점수 높은 순 (★ 검색어는 넣지 않는다)
  var s = S(), all = scored(), out = [];
  function put(k){ if(k && !s.ex[k] && out.indexOf(k) < 0 && out.length < BASE_N) out.push(k) }
  ((((part("kwrec") || {}).auto) || {}).best || []).forEach(put);
  if(!out.length) all.filter(function(x){ return kwShown(x) }).forEach(function(x){ put(x.kw) });
  return out;
}
function baseKw(){ var o = baseSet(), out = [];
  o.add.concat(baseKwAuto()).forEach(function(k){ if(!o.off[k] && out.indexOf(k) < 0) out.push(k) });
  return out;
}
function baseTopic(){ return String((SETS[cur] || {}).topic || "").trim() }
function baseParams(){ return { baseKw: baseKw(), topic: baseTopic() } }
var BASE_KINDS = { build: 1, script: 1, scriptedit: 1, chanfind: 1, source: 1, prompt: 1 };   // 기준 키워드·영상 주제를 같이 보내는 맥 명령
function baseText(){ var p = baseParams(); return (p.baseKw.length ? " · 기준 키워드 " + p.baseKw.join(" · ") : "") + (p.topic ? " · 영상 주제 「" + p.topic + "」" : "") }
function baseBarHtml(){
  var o = baseSet(), auto = baseKwAuto(), list = baseKw(), topic = baseTopic();
  var offAuto = auto.filter(function(k){ return o.off[k] });
  return "<section class=\"card base-bar\"><div class=\"card-h\"><h3>기준 키워드 · 영상 주제</h3><span class=\"n\">" + list.length + "개</span></div>" +
    "<p class=\"lead\">구축 문서 · 참고 페이지 · 대본을 만들 때 맥의 Claude가 이 키워드와 주제를 기준으로 써요. 🚀 자동 진행이 고른 키워드(없으면 점수 높은 순 5개)가 기본으로 들어가고, ✕로 빼고 아래에서 넣어요. 키워드 탭의 ★는 콘텐츠 검색용이라 여기 저절로 안 들어와요.</p>" +
    "<div class=\"chips\">" + (list.map(function(k){ var mine = o.add.indexOf(k) >= 0;
      return "<span class=\"chip on base-kw\">" + (mine ? "" : "<i class=\"dot i\" title=\"기본 — 자동 진행이 고른 키워드 또는 점수 높은 순\"></i>") + esc(k) + "<button class=\"x0\" data-act=\"basekwdel\" data-kw=\"" + esc(k) + "\" aria-label=\"" + esc(k) + " 빼기\">✕</button></span>" }).join("") ||
      "<span class=\"lead\" style=\"margin:0\">아직 없어요 — 아래에서 넣으세요.</span>") + "</div>" +
    (offAuto.length ? "<div class=\"chips\" style=\"margin-top:6px\"><span class=\"lead\" style=\"margin:0 4px 0 0\">뺀 기본 키워드 (눌러 되돌리기)</span>" + offAuto.map(function(k){ return "<button class=\"chip dash\" data-act=\"basekwback\" data-kw=\"" + esc(k) + "\">↺ " + esc(k) + "</button>" }).join("") + "</div>" : "") +
    "<div class=\"row2\" style=\"margin-top:8px\"><input type=\"text\" id=\"base-kw-in\" data-basekw=\"1\" maxlength=\"30\" placeholder=\"기준 키워드 넣기\" value=\"" + esc(ui.baseDraft || "") + "\"><button class=\"btn sm primary\" data-act=\"basekwadd\">넣기</button>" +
      (o.add.length || Object.keys(o.off).length ? "<button class=\"btn sm\" data-act=\"basekwreset\">기본으로</button>" : "") + "</div>" +
    "<h4>영상 주제 한 줄</h4><div class=\"row2\"><input type=\"text\" id=\"base-topic\" maxlength=\"80\" placeholder=\"예: 처음 키우는 사람이 첫 달에 꼭 실수하는 세 가지\" value=\"" + esc(ui.topicDraft != null ? ui.topicDraft : topic) + "\">" +
      "<button class=\"btn sm primary\" data-act=\"topicsave\">저장</button>" + (topic ? "<button class=\"btn sm\" data-act=\"topicclear\">지우기</button>" : "") + "</div>" +
    (topic ? "<p class=\"it-d\" style=\"margin-top:4px\">지금 주제: 「" + esc(topic) + "」</p>" : "") + "</section>";
}
function baseAct(name, el){
  var o = baseSet(), k = el && el.dataset ? el.dataset.kw : "";
  if(name === "basekwadd"){ var inp = document.getElementById("base-kw-in"), w = ((inp && inp.value) || "").trim().slice(0, 30);
    if(!w){ alert("넣을 키워드를 적어 주세요."); if(inp) inp.focus(); return true }
    delete o.off[w]; if(o.add.indexOf(w) < 0 && baseKw().indexOf(w) < 0) o.add.push(w);
    ui.baseDraft = ""; setS({ baseKw: o }); return true }
  if(name === "basekwdel"){ var i = o.add.indexOf(k); if(i >= 0) o.add.splice(i, 1); if(baseKwAuto().indexOf(k) >= 0) o.off[k] = 1; setS({ baseKw: o }); return true }
  if(name === "basekwback"){ delete o.off[k]; setS({ baseKw: o }); return true }
  if(name === "basekwreset"){ if(!confirm("기준 키워드를 잘 나온 키워드 기본으로 되돌릴까요? 직접 넣은 것과 뺀 것이 지워져요.")) return true; setS({ baseKw: {} }); return true }
  if(name === "topicsave"){ var t = document.getElementById("base-topic"), v = ((t && t.value) || "").replace(/\s+/g, " ").trim().slice(0, 80); ui.topicDraft = null; setS({ topic: v }); return true }
  if(name === "topicclear"){ ui.topicDraft = null; setS({ topic: "" }); return true }
  if(name === "gone"){ goneSet(el.dataset.key, true, el.dataset.label); return true }
  if(name === "ungone"){ goneSet(el.dataset.key, false); return true }
  if(name === "undo"){ var u = ui.undo; ui.undo = null; if(u) goneSet(u.key, false); else render(); return true }
  if(name === "undoclose"){ ui.undo = null; render(); return true }
  if(name === "kwcountry"){ if(el.dataset.v !== kwCountry()) setS({ kwCountry: el.dataset.v }); return true }
  return false;
}

/* ③ 지우기 · 되돌리기 */
function goneMap(){ return (SETS[cur] || {}).gone || {} }
function isGone(list, id){ return !!goneMap()[list + ":" + id] }
function goneSet(key, on, label){
  var g = Object.assign({}, goneMap());
  if(on){ g[key] = new Date().toISOString(); ui.undo = { key: key, label: label || "" }; clearTimeout(ui.undoT); ui.undoT = setTimeout(function(){ if(ui.undo && ui.undo.key === key){ ui.undo = null; renderSoft() } }, 10000) }
  else { delete g[key]; if(ui.undo && ui.undo.key === key) ui.undo = null }
  setS({ gone: g });
}
function delBtn(list, id, label, cls){   // 🗑 지우기 — cls 가 있으면 작은 단추(btn sm), 없으면 네모 단추(mk)
  return "<button class=\"" + (cls || "mk no") + "\" data-act=\"gone\" data-key=\"" + esc(list + ":" + id) + "\" data-label=\"" + esc(label || "") + "\" title=\"지우기 (되돌릴 수 있어요)\" aria-label=\"" + esc(label || "") + " 지우기\">" + (cls ? "🗑 지우기" : "🗑") + "</button>";
}
function goneListHtml(list, items, idOf, labelOf){   // 목록 끝 — 지운 것 다시 보기 · 되돌리기
  var g = goneMap(), dead = items.filter(function(x){ return g[list + ":" + idOf(x)] });
  if(!dead.length) return "";
  return "<details class=\"gone\"><summary>지운 것 " + dead.length + "개 — 되돌리기</summary><div class=\"list\">" + dead.map(function(x){
    return "<div class=\"it off\"><div class=\"it-m\"><div>" + txt(labelOf(x)) + "</div></div><button class=\"btn sm\" data-act=\"ungone\" data-key=\"" + esc(list + ":" + idOf(x)) + "\">↺ 되돌리기</button></div>" }).join("") + "</div></details>";
}
function undoToastHtml(){
  var u = ui.undo; if(!u) return "";
  return "<div class=\"undo-toast\" role=\"status\"><span>" + (u.label ? "「" + esc(String(u.label).slice(0, 30)) + "」 " : "") + "지웠어요</span><button class=\"btn sm\" data-act=\"undo\">↺ 되돌리기</button><button class=\"x0\" data-act=\"undoclose\" aria-label=\"닫기\">✕</button></div>";
}

/* ④ 찾는 나라 — 키워드 탭 */
var KW_COUNTRY = [["KR", "한국"], ["US", "미국"], ["JP", "일본"], ["GB", "영국"], ["TW", "대만"], ["VN", "베트남"], ["", "전 세계"]];
function kwCountry(){ var v = (SETS[cur] || {}).kwCountry; return v == null ? "KR" : v }
function kwCountryName(v){ var c = KW_COUNTRY.filter(function(x){ return x[0] === v })[0]; return c ? c[1] : v }
function kwCountryHtml(){
  var v = kwCountry(), k = part("kw"), got = k && k.country != null ? k.country : null;
  return "<h4>찾는 나라</h4><div class=\"chips\">" + KW_COUNTRY.map(function(c){ return "<button class=\"chip" + (v === c[0] ? " on" : "") + "\" data-act=\"kwcountry\" data-v=\"" + c[0] + "\">" + c[1] + "</button>" }).join("") + "</div>" +
    "<p class=\"lead\" style=\"margin-top:6px\">구글 트렌드 연관 검색어·상승세와 콘텐츠 검색(유튜브)을 이 나라 기준으로 받아요. 네이버 검색량은 늘 한국 기준이에요 — 다른 나라를 고르면 받는 곳을 「구글 트렌드」나 「둘 다」로 두세요." +
    (got != null && got !== v ? " <b>지금 목록은 " + esc(kwCountryName(got)) + " 기준</b> — 맥이 " + esc(kwCountryName(v)) + " 기준으로 다시 받으면 바뀌어요." : "") + "</p>";
}
