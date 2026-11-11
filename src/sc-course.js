/* ── 강의 — 강의(챕터)별 단축키·명령어 (build.py 가 src/shortcuts.html 의 @@COURSE@@ 자리에 끼움) ──
   데이터: 볼트 `4_Outputs/단축키 앱/강의 순서.json` → 맥 동기화(app_data.py) → sc.data/course
   진도·표시: sc.marks/course — 모든 기기에서 같다.  cp ✓외웠어 · cf ★즐겨찾기 · cn ✕필요없어 (하나만)
   2026-11-11 단어장처럼 정리: 과정 칩 → 강의 고르기 → 종류 칩 → 강의 카드. 「차례대로 따라 하기」·「종류별」 보기는 뺐다. */
var COURSE = load("sc.course.data", { courses: [] });
var CREQ = [], csAdd = false;   // ＋ 강의: 동욱이 고른 강의 요청 (sc.creq) — 맥의 Brainy가 교안에서 뽑아 넣는다
var CPROG = load("sc.course", null) || { cur: "", at: {}, done: {}, sd: {}, all: false };
CPROG.cp = CPROG.cp || {}; CPROG.cf = CPROG.cf || {}; CPROG.cn = CPROG.cn || {}; CPROG.pk = CPROG.pk || {};
var csFilt = "all";
var CS_SHOW = { key: 1, cmd: 1, slash: 1 };   // 단축키·명령어만 (Claude에게 할 말·화면 조작은 뺀다)
var CS_KIND = { key: "단축키", cmd: "터미널", slash: "클로드 코드" };
var CS_ICON = { key: "⌘", cmd: "$", slash: "/" };
var CS_MAP = { pass: "cp", fav: "cf", no: "cn" };
function csSteps(ch){ var o = []; ch.steps.forEach(function(s, i){ if(CS_SHOW[s.kind]) o.push({ s: s, i: i }); }); return o; }
function cx(s){ return esc(s); }
function csSave(){
  save("sc.course", CPROG);
  if(DB && DB.doc) DB.doc("sc.marks/course").set(Object.assign({}, CPROG, { updatedAt: new Date().toISOString() })).catch(function(){});
}
function renderCourse(){ if(current === "course") render(); else renderNav(); }
function csList(){
  return (COURSE.courses || []).filter(function(c){ return (c.cheat || []).length || c.chapters.some(function(ch){ return csSteps(ch).length; }); });
}
function csCourse(){
  var list = csList();
  return list.filter(function(c){ return c.id === CPROG.cur; })[0] || list.filter(function(c){ return c.status === "진행"; })[0] || list[0] || null;
}
function csHere(c){
  var at = CPROG.at[c.id], hit = c.chapters.filter(function(ch){ return ch.id === at; })[0];
  if(hit) return hit;
  return c.chapters.filter(function(ch){ return csSteps(ch).length && !CPROG.done[c.id + "|" + ch.id]; })[0] || c.chapters[0];
}
function cpKey(c, x){ return (x.sec === "터미널 기본" ? "tb" : c.id) + "|" + (x.kind === "key" ? x.k.map(function(a){ return a.join("+"); }).join("/") + "|" + x.t : x.code); }
function csMark(k){ return CPROG.cf[k] ? "fav" : CPROG.cp[k] ? "pass" : CPROG.cn[k] ? "no" : ""; }
function csSetMark(k, kind){
  var was = csMark(k);
  delete CPROG.cp[k]; delete CPROG.cf[k]; delete CPROG.cn[k];
  if(kind && kind !== "none" && kind !== was) CPROG[CS_MAP[kind]][k] = 1;
  csSave();
}
function csIsCmd(x){ return x.kind === "cmd" || x.kind === "slash"; }
function csKindOk(x){ return csFilt === "all" || (csFilt === "key" ? x.kind === "key" : csIsCmd(x)); }
/* 한 줄 — 단축키 목록과 같은 모양 */
function csCrow(c, x, withCourse){
  var key = cpKey(c, x), m = csMark(key);
  var body = x.kind === "key" ? combo(x.k)
    : "<code class=\"code\">" + (x.kind === "cmd" ? "<i>$</i> " : "") + cx(x.code) + "</code><button type=\"button\" class=\"copy\" data-cscopy=\"" + cx(x.code) + "\">복사</button>";
  return "<div class=\"it" + (m ? " m-" + m : "") + "\"><div class=\"it-m\">" +
    "<div class=\"it-h\"><b>" + cx(x.t) + "</b>" + (x.kind === "slash" ? "<span class=\"tag\">클로드 코드</span>" : "") + "</div>" +
    (x.why ? "<div class=\"it-d\">" + cx(x.why) + "</div>" : "") +
    "<div class=\"it-k\">" + body + "</div>" +
    (withCourse ? "<button type=\"button\" class=\"it-src\" data-csjump=\"" + cx(c.id + "|" + (x.ch || "")) + "\">" + cx(c.name) + "</button>" : "") +
    "</div>" + mkBtns("data-csmk", key, m, cx(x.t)) + "</div>";
}
function csRows(c, list, withCourse, empty){
  return list.length ? "<div class=\"list\">" + list.map(function(x){ return csCrow(c, x, withCourse); }).join("") + "</div>" : "<p class=\"empty\">" + (empty || "남은 게 없어요.") + "</p>";
}
function csLecSteps(ch, keep){   // 그 강의(챕터)에 나온 단축키·명령어 — 교안 순서, 겹치는 건 한 번
  var seen = {};
  return csSteps(ch).map(function(x){ return x.s.ch ? x.s : Object.assign({ ch: ch.id }, x.s); }).filter(function(s){
    var k = s.kind === "key" ? JSON.stringify(s.k) : s.code; if(seen[k]) return false; seen[k] = 1; return keep(s);
  });
}
function viewCourse(){
  var list = csList();
  var h = "<div class=\"chips\">" + list.map(function(x){
    var dn = x.chapters.filter(function(ch){ return CPROG.done[x.id + "|" + ch.id]; }).length;
    return "<button type=\"button\" class=\"chip" + (csCourse() === x ? " on" : "") + "\" data-cspick=\"" + cx(x.id) + "\">" + (x.tag ? "<b>" + cx(x.tag) + "</b> " : "") + cx(x.name) + "<span>" + dn + "/" + x.chapters.length + "</span></button>";
  }).join("") + "<button type=\"button\" class=\"chip dash\" data-csadd=\"1\">＋ 강의</button></div>" + csReqLines() + csAddPanel();
  if(!list.length) return h + "<p class=\"empty\">강의 순서를 불러오는 중… 맥이 켜져 있으면 몇 초 안에 떠요.</p>";
  var c = csCourse(), here = csHere(c), all = c.cheat || [];
  var lecs = c.chapters.filter(function(ch){ return csSteps(ch).length; });
  var sel = lecs.filter(function(ch){ return ch.id === CPROG.pk[c.id]; })[0];
  // 강의 고르기
  h += "<div class=\"row2\"><select id=\"cs-lsel\" data-cslsel=\"1\" aria-label=\"강의 고르기\"><option value=\"\">전체 강의 — 순서대로 다 보기</option>" +
    lecs.map(function(ch){ var dn = !!CPROG.done[c.id + "|" + ch.id];
      return "<option value=\"" + cx(ch.id) + "\"" + (sel === ch ? " selected" : "") + ">" + (ch === here ? "▶ " : dn ? "✓ " : "") + cx(ch.title) + " (" + csLecSteps(ch, function(){ return true; }).length + ")</option>"; }).join("") +
    "</select>" + (sel && sel !== here && lecs.indexOf(here) > -1 ? "<button type=\"button\" class=\"btn sm ghost\" data-cslpick=\"" + cx(here.id) + "\">▶ 지금 들을 강의</button>" : "") + "</div>";
  // 종류 칩 — 남은 것(✓·✕ 뺀 것) 수
  var keep = function(x){ return !gone(csMark(cpKey(c, x))); };
  var pool = sel ? csLecSteps(sel, keep) : all.filter(keep);
  var n = { all: pool.length, key: pool.filter(function(x){ return x.kind === "key"; }).length };
  n.cmd = n.all - n.key;
  h += "<div class=\"chips\">" + [["all", "전체"], ["key", "⌘ 단축키"], ["cmd", "$ 명령어"]].map(function(k){
    return "<button type=\"button\" class=\"chip" + (csFilt === k[0] ? " on" : "") + "\" data-csfilt=\"" + k[0] + "\">" + k[1] + "<span>" + n[k[0]] + "</span></button>"; }).join("") + "</div>";
  if(!all.length && !lecs.length) return h + "<p class=\"empty\">이 강의 교안에는 따로 외울 단축키·명령어가 없어요.</p>";
  var ok = function(x){ return keep(x) && csKindOk(x); };
  if(sel){
    var i = lecs.indexOf(sel), rows = csLecSteps(sel, ok);
    h += card((sel === here ? "▶ " : "") + cx(sel.title), csRows(c, rows, false, "이 강의엔 남은 게 없어요."), { cls: sel === here ? "here" : "", n: (sel.part ? cx(sel.part) + " · " : "") + rows.length });
    h += "<div class=\"cs-nav\">" + (i > 0 ? "<button type=\"button\" class=\"btn sm ghost\" data-cslpick=\"" + cx(lecs[i - 1].id) + "\">◀ 이전 강의</button>" : "<span></span>") +
      (sel !== here ? "<button type=\"button\" class=\"btn sm\" data-cshere=\"" + cx(sel.id) + "\">여기를 지금 들을 강의로</button>" : "<span class=\"small muted\">▶ 지금 들을 강의</span>") +
      (i < lecs.length - 1 ? "<button type=\"button\" class=\"btn sm ghost\" data-cslpick=\"" + cx(lecs[i + 1].id) + "\">다음 강의 ▶</button>" : "<span></span>") + "</div>";
    return h + legend();
  }
  var listAll = all.filter(ok), by = {}, basics = [];
  listAll.forEach(function(x){ if(x.sec === "터미널 기본") basics.push(x); else (by[x.ch] = by[x.ch] || []).push(x); });
  var chs = c.chapters.filter(function(ch){ return by[ch.id]; }), hereIdx = c.chapters.indexOf(here);
  var target = chs.filter(function(ch){ return c.chapters.indexOf(ch) >= hereIdx; })[0];
  if(target) h += "<button type=\"button\" class=\"cs-goto\" data-cslpick=\"" + cx(target.id) + "\"><span>▶ " + (target === here ? "지금 들을 강의" : "다음에 나오는 강의") + "</span><b>" + cx(target.title) + "</b><span class=\"n\">" + by[target.id].length + "개 →</span></button>";
  if(!listAll.length) return h + card(cx(c.name), "<p class=\"empty\">남은 게 없어요 — 「외웠어」·「필요없어」 탭에 있어요.</p>") + legend();
  if(basics.length) h += card("$ 터미널 기본", csRows(c, basics, false), { n: "어느 강의에서나 · " + basics.length });
  var part = null;
  chs.forEach(function(ch){
    if(ch.part !== part){ part = ch.part; h += "<p class=\"cs-part\">" + cx(part) + "</p>"; }
    var isHere = ch === target, dn = !!CPROG.done[c.id + "|" + ch.id];
    h += card((isHere ? "▶ " : dn ? "✓ " : "") + cx(ch.title), csRows(c, by[ch.id], false), { cls: (isHere ? "here" : "") + (dn ? " done" : ""), n: by[ch.id].length, attr: " data-cslec=\"" + cx(ch.id) + "\"" });
  });
  return h + legend();
}
/* ── ＋ 강의: 내가 고른 강의 넣기 · 빼기 ── */
function csReqLines(){
  var day = Date.now() - 864e5;
  return CREQ.filter(function(r){ return r.status && r.status !== "닫음" && !(r.status === "끝" && Date.parse(r.createdAt || 0) < day); }).map(function(r){
    var nm = "「" + cx(r.text || r.course || "") + "」", x = " <button type=\"button\" class=\"btn sm ghost cs-x\" data-csx=\"" + cx(r.id) + "\" aria-label=\"닫기\">✕</button>";
    if(r.status === "대기" || r.status === "만드는 중") return "<p class=\"cs-req\">⏳ " + nm + (r.action === "remove" ? " 빼는 중…" : " 교안에서 단축키·명령어 뽑는 중… <span>맥의 Brainy가 몇 분 안에 넣어요</span>") + "</p>";
    if(r.status === "끝" && r.action === "remove") return "<p class=\"cs-req ok\">✓ " + nm + " 뺐어요" + x + "</p>";
    if(r.status === "끝") return "<p class=\"cs-req ok\">✓ " + nm + " 넣었어요 <span>" + cx(r.msg || "") + "</span> <button type=\"button\" class=\"btn sm ghost\" data-csopen=\"" + cx(r.id) + "\">보기</button>" + x + "</p>";
    return "<p class=\"cs-req bad\">" + (r.status === "못 찾음" ? "못 찾았어요 " : "안 됐어요 ") + nm + " <span>" + cx(r.msg || "") + "</span>" + x + "</p>";
  }).join("");
}
function csAddPanel(){
  if(!csAdd) return "";
  var have = {}; CREQ.forEach(function(r){ if(r.status === "대기" || r.status === "만드는 중") have[r.text] = 1; });
  var av = (COURSE.avail || []).filter(function(a){ return !have[a.name]; });
  var mine = (COURSE.courses || []).filter(function(x){ return x.mine; });
  var h = "<form class=\"row2\" data-csform=\"1\"><input id=\"cs-addin\" type=\"text\" placeholder=\"강의 이름 — 예: 클로드 코드 영상 자동화\" autocomplete=\"off\"><button type=\"submit\" class=\"btn primary\">넣기</button></form>";
  if(av.length) h += "<p class=\"lbl\" style=\"margin-top:12px\">볼트에 있는 교안</p><div class=\"chips\">" + av.map(function(a){ return "<button type=\"button\" class=\"chip\" data-csreq=\"" + cx(a.name) + "\">＋ " + cx(a.name) + "<span>" + a.files + "개 파일</span></button>"; }).join("") + "</div>";
  else h += "<p class=\"lead\" style=\"margin-top:10px\">볼트 교안은 다 들어와 있어요. 새 강의는 <code>/ingest</code>로 교안을 넣거나, 위에 이름을 써 보세요.</p>";
  if(mine.length) h += "<p class=\"lbl\" style=\"margin-top:12px\">내가 넣은 강의</p>" + mine.map(function(x){ return "<p class=\"cs-req\">" + cx(x.name) + " <button type=\"button\" class=\"btn sm ghost\" data-csrm=\"" + cx(x.id) + "\" data-csrmname=\"" + cx(x.name) + "\">빼기</button></p>"; }).join("");
  return card("＋ 강의 넣기", h, { lead: "들을 강의 이름을 쓰면 맥의 Brainy가 볼트 교안(<code>2_LLMWiki/raw</code>)에서 <b>단축키·명령어만</b> 뽑아 강의로 넣어요." });
}
function csRequest(doc){
  if(!DB){ alert("저장소에 연결되지 않았어요 — 새로고침해 주세요."); return; }
  doc.status = "대기"; doc.createdAt = new Date().toISOString();
  var tmp = Object.assign({ id: "tmp" + Date.now() }, doc); CREQ = [tmp].concat(CREQ); renderCourse();
  DB.collection("sc.creq").doc().set(doc).catch(function(){ tmp.status = "오류"; tmp.msg = "저장하지 못했어요 — 다시 해 주세요"; renderCourse(); });
}
function csSetReqs(list){
  CREQ = list.sort(function(a, b){ return (b.createdAt || "") < (a.createdAt || "") ? -1 : 1; });
  if(current === "course") renderCourse();
}
function csLPick(id){
  var c = csCourse(); if(!c) return;
  if(id) CPROG.pk[c.id] = id; else delete CPROG.pk[c.id];
  csSave(); renderCourse();
}
// 지금 들을 강의로 정한다 — 그 앞 강의는 다 들은 것으로 (Brainy 도구 course_set_here 도 이것)
function csGo(chId, markPrev){
  var c = csCourse(); if(!c) return;
  if(markPrev){ var past = true; c.chapters.forEach(function(ch){ if(ch.id === chId) past = false; if(past) CPROG.done[c.id + "|" + ch.id] = 1; else if(ch.id === chId) delete CPROG.done[c.id + "|" + ch.id]; }); }
  CPROG.at[c.id] = chId; CPROG.pk[c.id] = chId; csSave(); renderCourse();
}
function csPeek(chId){ csLPick(chId); }
function csNext(dir){
  var c = csCourse(); if(!c) return;
  var lecs = c.chapters.filter(function(ch){ return csSteps(ch).length; });
  var cur = lecs.filter(function(ch){ return ch.id === CPROG.pk[c.id]; })[0], i = cur ? lecs.indexOf(cur) : -1, j = i + dir;
  if(j >= 0 && j < lecs.length){ csLPick(lecs[j].id); window.scrollTo({ top: 0, behavior: "instant" }); }
}
// 강의 하나의 단축키·명령어 전부 (모음 + 챕터 단계) — 표시가 어느 화면에서 눌렸든 여기서 찾는다
function csIndex(c){
  var idx = {}, order = [];
  (c.cheat || []).forEach(function(x){ var k = cpKey(c, x); if(!idx[k]){ idx[k] = x; order.push(k); } });
  c.chapters.forEach(function(ch){ ch.steps.forEach(function(s){
    if(!CS_SHOW[s.kind]) return;
    var x = s.ch ? s : Object.assign({ ch: ch.id }, s), k = cpKey(c, x);
    if(!idx[k]){ idx[k] = x; order.push(k); }
  }); });
  return { idx: idx, order: order };
}
// ★ · ✓ · ✕ 탭 — 강의 단축키·명령어 중 표시한 것을 강의별로
function csMarkedBlock(kind){
  var m = CPROG[CS_MAP[kind]] || {}, h = "", seenTb = {};
  (COURSE.courses || []).forEach(function(c){
    var I = csIndex(c), list = I.order.filter(function(k){ if(!m[k] || seenTb[k]) return false; if(k.indexOf("tb|") === 0) seenTb[k] = 1; return true; }).map(function(k){ return I.idx[k]; });
    if(list.length) h += card("강의 · " + cx(c.name), csRows(c, list, true), { n: list.length });
  });
  return h;
}
function csMarkCount(){
  var o = {};
  ["fav", "pass", "no"].forEach(function(k){
    var m = CPROG[CS_MAP[k]] || {}, n = 0, seen = {};
    (COURSE.courses || []).forEach(function(c){ csIndex(c).order.forEach(function(key){ if(m[key] && !seen[key]){ seen[key] = 1; n++; } }); });
    o[k] = n;
  });
  return o;
}
function courseSearch(t){
  var hits = [], seen = {};
  (COURSE.courses || []).forEach(function(c){
    var I = csIndex(c);
    I.order.forEach(function(k){
      var s = I.idx[k]; if(seen[k] || hits.length >= 20) return;
      var hay = (s.t + " " + (s.code || "") + " " + (s.why || "") + " " + (s.sec || "") + " " + (s.k ? s.k.map(function(x){ return x.join(""); }).join(" ") : "")).toLowerCase();
      if(hay.indexOf(t) > -1){ seen[k] = 1; hits.push([c, s]); }
    });
  });
  if(!hits.length) return "";
  return card("강의에서", "<div class=\"list\">" + hits.map(function(x){ return csCrow(x[0], x[1], true); }).join("") + "</div>", { n: hits.length });
}
document.addEventListener("change", function(e){ if(e.target && e.target.hasAttribute && e.target.hasAttribute("data-cslsel")) csLPick(e.target.value); });
document.addEventListener("submit", function(e){
  if(!e.target.closest("[data-csform]")) return;
  e.preventDefault();
  var v = (document.getElementById("cs-addin").value || "").trim();
  if(v){ csAdd = false; csRequest({ text: v.slice(0, 120) }); }
});
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-csmk],[data-cspick],[data-csfilt],[data-cslpick],[data-cshere],[data-csjump],[data-cscopy],[data-csadd],[data-csreq],[data-csrm],[data-csx],[data-csopen]");
  if(!b) return;
  if(b.hasAttribute("data-csmk")){ csSetMark(b.getAttribute("data-id"), b.getAttribute("data-csmk")); refresh(); return; }
  if(b.hasAttribute("data-cspick")){ CPROG.cur = b.getAttribute("data-cspick"); csFilt = "all"; csSave(); renderCourse(); return; }
  if(b.hasAttribute("data-csfilt")){ csFilt = b.getAttribute("data-csfilt"); renderCourse(); return; }
  if(b.hasAttribute("data-cslpick")){ csLPick(b.getAttribute("data-cslpick")); window.scrollTo({ top: 0, behavior: "instant" }); return; }
  if(b.hasAttribute("data-cshere")){ csGo(b.getAttribute("data-cshere"), true); return; }
  if(b.hasAttribute("data-csjump")){ var p = b.getAttribute("data-csjump").split("|"); CPROG.cur = p[0]; if(p[1]) CPROG.pk[p[0]] = p[1]; csSave(); query = ""; show("course"); return; }
  if(b.hasAttribute("data-cscopy")){
    var txt = b.getAttribute("data-cscopy"), done = function(){ b.textContent = "복사됨 ✓"; setTimeout(function(){ b.textContent = "복사"; }, 1400); };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function(){ b.textContent = "길게 눌러 복사"; });
    else b.textContent = "길게 눌러 복사";
    return;
  }
  if(b.hasAttribute("data-csadd")){ csAdd = !csAdd; renderCourse(); if(csAdd){ var i = document.getElementById("cs-addin"); if(i) i.focus(); } return; }
  if(b.hasAttribute("data-csreq")){ csAdd = false; csRequest({ text: b.getAttribute("data-csreq") }); return; }
  if(b.hasAttribute("data-csrm")){ if(confirm("「" + b.getAttribute("data-csrmname") + "」을 강의 목록에서 뺄까요? (볼트 교안은 그대로예요)")){ csAdd = false; csRequest({ action: "remove", course: b.getAttribute("data-csrm"), text: b.getAttribute("data-csrmname") }); } return; }
  var id = b.getAttribute("data-csx") || b.getAttribute("data-csopen"), r = CREQ.filter(function(x){ return x.id === id; })[0];
  if(b.hasAttribute("data-csopen") && r && r.course){ CPROG.cur = r.course; csSave(); }
  if(r){ r.status = "닫음"; if(DB && id.indexOf("tmp") !== 0) DB.collection("sc.creq").doc(id).update({ status: "닫음" }).catch(function(){}); }
  renderCourse();
});
document.addEventListener("keydown", function(e){
  if(current !== "course" || e.metaKey || e.ctrlKey || e.altKey) return;
  var a = document.activeElement; if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  if(e.key === "ArrowRight"){ e.preventDefault(); csNext(1); }
  if(e.key === "ArrowLeft"){ e.preventDefault(); csNext(-1); }
});
