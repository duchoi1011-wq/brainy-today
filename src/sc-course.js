/* ── 강의 — 교안 순서대로 누르고 치는 것 (build.py 가 끼움) ──
   데이터: 볼트 `4_Outputs/단축키 앱/강의 순서.json` → 맥 동기화(app_data.py) → sc.data/course
   진도(지금 챕터·끝낸 챕터·끝낸 단계): sc.marks/course — 모든 기기에서 같다 */
var COURSE = load("sc.course.data", { courses: [] });
var CREQ = [], csAdd = false;   // ＋ 강의: 동욱이 고른 강의 요청 (sc.creq) — 맥의 Brainy가 교안에서 뽑아 넣는다
var CPROG = load("sc.course", null) || { cur: "", at: {}, done: {}, sd: {}, all: false };
CPROG.cp = CPROG.cp || {}; CPROG.cf = CPROG.cf || {};   // cf: 강의 단축키·명령어 ★ 즐겨찾기                 // 단축키·명령어 모음에서 「외웠어」 ✓ 한 것
var csView = load("sc.cview2", "cheat"), csFilt = "all", csSort = load("sc.csort", "order");   // 기본: 강의 순서대로 그 강의 단축키·명령어 (따라 하기는 나중에 — 2026-11-07 동욱)   // 강의 탭: 차례대로 / 단축키·명령어
var csOpen = {}, csTB = load("sc.tb", true);   // csTB: 「터미널 기본」 펼침
var CS_SHOW = { key: 1, cmd: 1, slash: 1 };   // 「차례대로」엔 단축키·명령어만 (Claude에게 할 말·화면 조작은 뺀다 — 2026-11-07 동욱)
function csSteps(ch){ var o = []; ch.steps.forEach(function(s, i){ if(CS_SHOW[s.kind]) o.push({ s: s, i: i }); }); return o; }
var CS_KIND = { key: "단축키", cmd: "터미널", slash: "클로드 코드", say: "Claude에게", click: "화면에서" };
var CS_ICON = { key: "⌘", cmd: "$", slash: "/", say: "“", click: "◎" };
function cx(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function csSave(){
  save("sc.course", CPROG);
  if(DB) DB.doc("sc.marks/course").set(Object.assign({}, CPROG, { updatedAt: new Date().toISOString() })).catch(function(){});
}
function csList(){
  return (COURSE.courses || []).filter(function(c){ return (c.cheat || []).length || c.chapters.some(function(ch){ return csSteps(ch).length; }); });
}
function csCourse(){
  var list = csList();
  return list.filter(function(c){ return c.id === CPROG.cur; })[0] || list.filter(function(c){ return c.status === "진행"; })[0] || list[0] || null;
}
function csVisible(c){ return c.chapters.filter(function(ch){ return CPROG.all || csSteps(ch).length || ch.id === CPROG.at[c.id]; }); }
function csHere(c){
  var at = CPROG.at[c.id], hit = c.chapters.filter(function(ch){ return ch.id === at; })[0];
  if(hit) return hit;
  return c.chapters.filter(function(ch){ return csSteps(ch).length && !CPROG.done[c.id + "|" + ch.id]; })[0] || c.chapters[0];
}
function csStep(ch, s, i, j){
  var key = ch.id + "#" + i, ok = !!CPROG.sd[key], body = "";
  if(s.kind === "key") body = combo(s.k);
  else if(s.kind === "click") body = "<span class=\"cs-path\">" + cx(s.code) + "</span>";
  else body = "<code class=\"cs-code\">" + (s.kind === "cmd" ? "<i>$</i> " : "") + cx(s.code) + "</code>";
  var ref = s.ref && BY_ID[s.ref] ? " <span class=\"tag\">목록에 있음</span>" : "";
  var copy = (s.kind === "cmd" || s.kind === "slash" || s.kind === "say") ? "<button type=\"button\" class=\"cs-copy\" data-cscopy=\"" + cx(s.code) + "\">복사</button>" : "";
  return "<li class=\"cs-step k-" + s.kind + (ok ? " ok" : "") + "\">" +
    "<button type=\"button\" class=\"cs-num\" data-cssd=\"" + cx(key) + "\" aria-pressed=\"" + ok + "\" title=\"했으면 눌러 체크\">" + (ok ? "✓" : (j + 1)) + "</button>" +
    "<div class=\"cs-main\"><div class=\"cs-t\"><span class=\"cs-kind\">" + CS_ICON[s.kind] + " " + CS_KIND[s.kind] + "</span>" + cx(s.t) + ref + "</div>" +
    "<div class=\"cs-body\">" + body + copy + "</div>" + (s.why ? "<div class=\"cs-why\">" + cx(s.why) + "</div>" : "") + "</div></li>";
}
function csBody(c, ch, here){
  var vis = csVisible(c), idx = vis.indexOf(ch);
  var st = csSteps(ch);
  var h = st.length ? "<ol class=\"cs-steps\">" + st.map(function(x, j){ return csStep(ch, x.s, x.i, j); }).join("") + "</ol>"
                    : "<p class=\"cs-empty\">이 챕터엔 단축키·명령어가 없어요 — 듣기만 하면 돼요.</p>";
  h += "<div class=\"cs-nav\">" +
    (idx > 0 ? "<button type=\"button\" class=\"ghost\" data-csgo=\"" + cx(vis[idx - 1].id) + "\">◀ 이전</button>" : "<span></span>") +
    (here ? "<button type=\"button\" class=\"btn\" data-csdone=\"" + cx(ch.id) + "\">" + (idx < vis.length - 1 ? "다 했어 — 다음 챕터 ▶" : "다 했어 ✓") + "</button>"
          : "<button type=\"button\" class=\"ghost\" data-cshere=\"" + cx(ch.id) + "\">여기서부터 들을래</button>") +
    "</div>" + (ch.src ? "<p class=\"cs-src\">교안 · " + cx(ch.src.replace(/\.md$/, "")) + "</p>" : "");
  return h;
}
function csCount(ch){
  var n = {}; csSteps(ch).forEach(function(x){ n[x.s.kind] = (n[x.s.kind] || 0) + 1; });
  return Object.keys(CS_ICON).filter(function(k){ return n[k]; }).map(function(k){ return "<i title=\"" + CS_KIND[k] + "\">" + CS_ICON[k] + n[k] + "</i>"; }).join("");
}
function renderCourse(){
  var el = document.getElementById("view-course"), list = csList();
  if(!list.length){ el.innerHTML = "<div class=\"cs-pick\"><button type=\"button\" class=\"mode cs-addbtn\" data-csadd=\"1\">＋ 강의</button></div>" + csAddPanel() + "<p class=\"empty\">강의 순서를 불러오는 중… 맥이 켜져 있으면 몇 초 안에 떠요.</p>"; return; }
  var c = csCourse(), here = csHere(c), vis = csVisible(c);
  var doneN = c.chapters.filter(function(ch){ return CPROG.done[c.id + "|" + ch.id]; }).length;
  var h = "<div class=\"cs-pick\">" + list.map(function(x){
    var dn = x.chapters.filter(function(ch){ return CPROG.done[x.id + "|" + ch.id]; }).length;
    return "<button type=\"button\" class=\"mode\" data-cspick=\"" + cx(x.id) + "\" aria-pressed=\"" + (x.id === c.id) + "\">" + (x.tag ? "<b>" + cx(x.tag) + "</b> " : "") + cx(x.name) + " <span class=\"n\">" + dn + "/" + x.chapters.length + "</span></button>";
  }).join("") + "<button type=\"button\" class=\"mode cs-addbtn\" data-csadd=\"1\" aria-pressed=\"" + csAdd + "\">＋ 강의</button></div>" + csReqLines() + csAddPanel();
  var cheat = c.cheat || [];
  h += "<div class=\"cs-seg\" role=\"tablist\"><button type=\"button\" data-csview=\"cheat\" aria-pressed=\"" + (csView === "cheat") + "\">강의별 단축키·명령어 " + cheat.length + "</button>" +
    "<button type=\"button\" data-csview=\"seq\" aria-pressed=\"" + (csView !== "cheat") + "\">차례대로 따라 하기</button></div>";
  if(csView === "cheat"){ el.innerHTML = h + csCheat(c); return; }
  h += "<p class=\"why\">강의 들으면서 <b>차례대로</b> — 그 챕터에 나온 단축키·명령어만. 번호를 누르면 체크, 다 하면 「다음 챕터」. " + (c.note ? cx(c.note) + " " : "") + "<span style=\"color:var(--faint)\">← → 키로 챕터 이동</span></p>";
  // 지금 여기
  h += "<div class=\"cs-now\"><div class=\"block-head\"><h2>▶ 지금 여기</h2><i class=\"hr\"></i><span class=\"meta\">" + doneN + "/" + c.chapters.length + " 챕터 끝</span></div>" +
    "<p class=\"cs-part-l\">" + cx(here.part) + "</p><h3 class=\"cs-h\">" + cx(here.title) + "</h3>" + csBody(c, here, true) + "</div>";
  h += csBasics(c);
  // 전체 순서
  var empty = c.chapters.filter(function(ch){ return !csSteps(ch).length; }).length, part = null;
  h += "<div class=\"block\"><div class=\"block-head\"><h2>전체 순서</h2><i class=\"hr\"></i>" +
    (empty ? "<button type=\"button\" class=\"ghost\" data-csall=\"1\">" + (CPROG.all ? "단축키·명령어 없는 챕터 숨기기" : "단축키·명령어 없는 챕터 " + empty + "개도 보기") + "</button>" : "") + "</div>";
  vis.forEach(function(ch){
    if(ch.part !== part){ part = ch.part; h += "<p class=\"cs-part-l\" style=\"margin-top:18px\">" + cx(part) + "</p>"; }
    var dn = !!CPROG.done[c.id + "|" + ch.id], isHere = ch.id === here.id;
    h += "<details class=\"cs-ch" + (dn ? " done" : "") + (isHere ? " here" : "") + "\" data-csch=\"" + cx(ch.id) + "\"" + (csOpen[ch.id] ? " open" : "") + ">" +
      "<summary><span class=\"cs-mark\">" + (isHere ? "▶" : dn ? "✓" : "") + "</span><span class=\"cs-title\">" + cx(ch.title) + "</span><span class=\"cs-cnt\">" + csCount(ch) + "</span></summary>" +
      (csOpen[ch.id] ? "<div class=\"cs-in\">" + csBody(c, ch, isHere) + "</div>" : "") + "</details>";
  });
  el.innerHTML = h + "</div>";
}
/* ── ＋ 강의: 내가 고른 강의 넣기 · 빼기 ── */
function csReqLines(){
  var day = Date.now() - 864e5;
  return CREQ.filter(function(r){ return r.status && r.status !== "닫음" && !(r.status === "끝" && Date.parse(r.createdAt || 0) < day); }).map(function(r){
    var nm = "「" + cx(r.text || r.course || "") + "」", x = " <button type=\"button\" class=\"ghost cs-x\" data-csx=\"" + cx(r.id) + "\" aria-label=\"닫기\">✕</button>";
    if(r.status === "대기" || r.status === "만드는 중") return "<p class=\"cs-req\">⏳ " + nm + (r.action === "remove" ? " 빼는 중…" : " 교안에서 단축키·명령어 뽑는 중… <span>맥의 Brainy가 몇 분 안에 넣어요</span>") + "</p>";
    if(r.status === "끝" && r.action === "remove") return "<p class=\"cs-req ok\">✓ " + nm + " 뺐어요" + x + "</p>";
    if(r.status === "끝") return "<p class=\"cs-req ok\">✓ " + nm + " 넣었어요 <span>" + cx(r.msg || "") + "</span> <button type=\"button\" class=\"ghost\" data-csopen=\"" + cx(r.id) + "\">보기</button>" + x + "</p>";
    return "<p class=\"cs-req bad\">" + (r.status === "못 찾음" ? "못 찾았어요 " : "안 됐어요 ") + nm + " <span>" + cx(r.msg || "") + "</span>" + x + "</p>";
  }).join("");
}
function csAddPanel(){
  if(!csAdd) return "";
  var have = {}; CREQ.forEach(function(r){ if(r.status === "대기" || r.status === "만드는 중") have[r.text] = 1; });
  var av = (COURSE.avail || []).filter(function(a){ return !have[a.name]; });
  var mine = (COURSE.courses || []).filter(function(x){ return x.mine; });
  var h = "<div class=\"cs-add\"><p class=\"why\" style=\"margin:0 0 8px\">들을 강의 이름을 쓰면 맥의 Brainy가 볼트 교안(<code>2_LLMWiki/raw</code>)에서 찾아 <b>단축키·명령어만</b> 뽑아 강의로 넣어요.</p>" +
    "<form class=\"cs-addf\" data-csform=\"1\"><input id=\"cs-addin\" type=\"text\" placeholder=\"강의 이름 — 예: 클로드 코드 영상 자동화\" autocomplete=\"off\"><button type=\"submit\" class=\"btn\">넣기</button></form>";
  if(av.length) h += "<p class=\"cs-sub\">볼트에 있는 교안</p><div class=\"cs-pick\" style=\"margin:0\">" + av.map(function(a){ return "<button type=\"button\" class=\"mode\" data-csreq=\"" + cx(a.name) + "\">＋ " + cx(a.name) + " <span class=\"n\">" + a.files + "개 파일</span></button>"; }).join("") + "</div>";
  else h += "<p class=\"cs-sub\">볼트 교안은 다 들어와 있어요. 새 강의는 <code>/ingest</code>로 교안을 넣거나, 위에 이름을 써 보세요.</p>";
  if(mine.length) h += "<p class=\"cs-sub\">내가 넣은 강의</p>" + mine.map(function(x){ return "<p class=\"cs-req\">" + cx(x.name) + " <button type=\"button\" class=\"ghost\" data-csrm=\"" + cx(x.id) + "\" data-csrmname=\"" + cx(x.name) + "\">빼기</button></p>"; }).join("");
  return h + "</div>";
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
  CPROG.pk = CPROG.pk || {}; if(id) CPROG.pk[c.id] = id; else delete CPROG.pk[c.id];
  csView = "cheat"; save("sc.cview2", csView); csSave(); renderCourse();
  var t = document.getElementById("cs-lsel"); if(t) t.scrollIntoView({ block: "nearest" });
}
document.addEventListener("change", function(e){ if(e.target && e.target.hasAttribute && e.target.hasAttribute("data-cslsel")) csLPick(e.target.value); });
document.addEventListener("click", function(e){ var b = e.target.closest("[data-cslpick]"); if(b) csLPick(b.getAttribute("data-cslpick")); });
document.addEventListener("submit", function(e){
  if(!e.target.closest("[data-csform]")) return;
  e.preventDefault();
  var v = (document.getElementById("cs-addin").value || "").trim();
  if(v){ csAdd = false; csRequest({ text: v.slice(0, 120) }); }
});
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-csadd],[data-csreq],[data-csrm],[data-csx],[data-csopen]");
  if(!b) return;
  if(b.hasAttribute("data-csadd")){ csAdd = !csAdd; renderCourse(); if(csAdd){ var i = document.getElementById("cs-addin"); if(i) i.focus(); } return; }
  if(b.hasAttribute("data-csreq")){ csAdd = false; csRequest({ text: b.getAttribute("data-csreq") }); return; }
  if(b.hasAttribute("data-csrm")){ if(confirm("「" + b.getAttribute("data-csrmname") + "」을 강의 목록에서 뺄까요? (볼트 교안은 그대로예요)")){ csAdd = false; csRequest({ action: "remove", course: b.getAttribute("data-csrm"), text: b.getAttribute("data-csrmname") }); } return; }
  var id = b.getAttribute("data-csx") || b.getAttribute("data-csopen"), r = CREQ.filter(function(x){ return x.id === id; })[0];
  if(b.hasAttribute("data-csopen") && r && r.course){ CPROG.cur = r.course; csView = "cheat"; save("sc.cview2", csView); csSave(); }
  if(r){ r.status = "닫음"; if(DB && id.indexOf("tmp") !== 0) DB.collection("sc.creq").doc(id).update({ status: "닫음" }).catch(function(){}); }
  renderCourse();
});
// 「터미널 기본」 — cd·ls·Tab처럼 어느 챕터에서나 쓰는 것. 차례대로 맨 위에 접었다 폈다
function csBasics(c){
  var b = (c.cheat || []).filter(function(x){ return x.sec === "터미널 기본" && !CPROG.cp[cpKey(c, x)]; });
  if(!b.length) return "";
  return "<details class=\"cs-ch cs-basics\"" + (csTB ? " open" : "") + " data-cstb=\"1\"><summary><span class=\"cs-mark\">$</span><span class=\"cs-title\">터미널 기본 — cd · ls · Tab처럼 늘 쓰는 것</span><span class=\"cs-cnt\"><i>" + b.length + "</i></span></summary>" +
    "<div class=\"cs-in\"><div class=\"cs-cheat\">" + b.map(function(x){ return csCrow(c, x, {}, false); }).join("") + "</div></div></details>";
}
/* 강의의 단축키·명령어 모음 — 교안의 치트시트·명령어 표 + 강의 중 나온 것 */
function cpKey(c, x){ return (x.sec === "터미널 기본" ? "tb" : c.id) + "|" + (x.kind === "key" ? x.k.map(function(a){ return a.join("+"); }).join("/") + "|" + x.t : x.code); }
// 챕터 들여다보기 — 「지금 여기」는 그대로 두고 전체 순서에서 그 챕터만 펼친다
function csPeek(chId){
  var c = csCourse(); if(!c) return;
  csView = "seq"; save("sc.cview2", csView);
  var ch = c.chapters.filter(function(x){ return x.id === chId; })[0];
  if(ch && !csSteps(ch).length && !CPROG.all){ CPROG.all = true; }
  csOpen = {}; csOpen[chId] = true; renderCourse();
  var d = document.querySelector('[data-csch="' + chId.replace(/"/g, "") + '"]');
  if(d){ d.style.scrollMarginTop = "130px"; d.scrollIntoView({ block: "start", behavior: "instant" }); }
}
var CS_FILT = { all: "전체", key: "⌘ 단축키", cmd: "$ 명령어", fav: "★ 즐겨찾기" };
function csIsCmd(x){ return x.kind === "cmd" || x.kind === "slash"; }
function csCrow(c, x, chT, withCourse){
  var key = cpKey(c, x), ok = !!CPROG.cp[key], fv = !!CPROG.cf[key];
  var body = x.kind === "key" ? combo(x.k) : "<code class=\"cs-code\">" + (x.kind === "cmd" ? "<i>$</i> " : "") + cx(x.code) + "</code>";
  var link = withCourse ? " <button type=\"button\" class=\"cs-chlink\" data-csjump=\"" + cx(c.id + "|" + (x.ch || "")) + "\">" + cx(c.name) + "</button>"
    : (x.ch && chT[x.ch] ? " <button type=\"button\" class=\"cs-chlink\" data-csjump=\"" + cx(c.id + "|" + x.ch) + "\">" + cx(chT[x.ch]) + "</button>" : "");
  return "<div class=\"cs-crow k-" + x.kind + (ok ? " ok" : "") + "\"><div class=\"cs-cmain\"><div class=\"cs-t\">" + cx(x.t) + link + "</div>" +
    (x.why ? "<div class=\"cs-why\">" + cx(x.why) + "</div>" : "") + "</div>" +
    "<div class=\"cs-cbody\">" + body + (x.kind !== "key" ? "<button type=\"button\" class=\"cs-copy\" data-cscopy=\"" + cx(x.code) + "\">복사</button>" : "") +
    "<div class=\"marks\"><button type=\"button\" class=\"mk pass\" data-cscp=\"" + cx(key) + "\" aria-pressed=\"" + ok + "\" title=\"패스 — 「패스」 탭으로\" aria-label=\"" + cx(x.t) + " 패스\">✓</button>" +
    "<button type=\"button\" class=\"mk fav\" data-cscf=\"" + cx(key) + "\" aria-pressed=\"" + fv + "\" title=\"즐겨찾기\" aria-label=\"" + cx(x.t) + " 즐겨찾기\">★</button></div></div></div>";
}
function csCheat(c){
  var all = c.cheat || [], chT = {};
  c.chapters.forEach(function(ch){ chT[ch.id] = ch.title; });
  if(!all.length) return "<p class=\"empty\">이 강의 교안에는 따로 외울 단축키·명령어가 없어요 — 「차례대로」에서 Claude에게 할 말을 보세요.</p>";
  var n = { all: all.length, key: 0, cmd: 0, fav: 0 };
  all.forEach(function(x){ if(CPROG.cp[cpKey(c, x)]) return; if(x.kind === "key") n.key++; else n.cmd++; });
  n.all = n.key + n.cmd;
  n.fav = Object.keys(CPROG.cf).filter(function(k){ return k.indexOf(c.id + "|") === 0 || k.indexOf("tb|") === 0; }).length;
  if(!n[csFilt] && csFilt !== "all") csFilt = "all";
  var known = Object.keys(CPROG.cp).filter(function(k){ return k.indexOf(c.id + "|") === 0 || k.indexOf("tb|") === 0; }).length;
  var h = (csSort === "order" ? csLPickRow(c) : "") + "<div class=\"modes\" style=\"margin:0 0 6px\">" + Object.keys(CS_FILT).filter(function(k){ return n[k] || k === "fav"; }).map(function(k){
    return "<button type=\"button\" class=\"mode\" data-csfilt=\"" + k + "\" aria-pressed=\"" + (csFilt === k) + "\">" + CS_FILT[k] + " <span class=\"n\">" + n[k] + "</span></button>"; }).join("") + "</div>";
  h += "<div class=\"cs-sort\"><span>보기</span><button type=\"button\" data-cssort=\"order\" aria-pressed=\"" + (csSort === "order") + "\">강의 순서</button><button type=\"button\" data-cssort=\"sec\" aria-pressed=\"" + (csSort !== "order") + "\">종류별</button></div>";
  h += "<div class=\"legend cs-legend\"><span><i class=\"dotp\">✓</i> 패스 — 「패스」 탭으로 옮겨져요</span><span><i class=\"dotf\">★</i> 즐겨찾기 — 「즐겨찾기」 탭에도 모임</span>" + (known ? "<span>패스 " + known + "개</span>" : "") + "</div>";
  if(csFilt === "fav"){   // ★ — 이 강의에서 즐겨찾기한 것 전부 (모음·강의 단계 어디서 눌렀든)
    var I = csIndex(c), favs = I.order.filter(function(k){ return CPROG.cf[k]; }).map(function(k){ return I.idx[k]; });
    return h + (favs.length ? "<div class=\"cs-cheat\">" + favs.map(function(x){ return csCrow(c, x, chT, false); }).join("") + "</div>" : "<p class=\"empty\">아직 없어요. 줄 옆 ★을 눌러 모아요.</p>");
  }
  var list = all.filter(function(x){ return !CPROG.cp[cpKey(c, x)] && (csFilt === "all" || (csFilt === "key" ? x.kind === "key" : csIsCmd(x))); });
  if(!list.length) return h + "<p class=\"empty\">남은 게 없어요 — 패스한 건 「패스」 탭에 있어요.</p>";
  if(csSort === "order") return h + csByLecture(c, list, all);
  var secs = [], by = {};
  list.forEach(function(x){ var s = x.sec === "터미널 기본" ? "▶ 터미널 기본" : (x.kind === "key" ? "⌘ " : "$ ") + (x.sec || "기타"); if(!by[s]){ by[s] = []; secs.push(s); } by[s].push(x); });
  // 터미널 기본 → 단축키 묶음 → 명령어 묶음
  var rank = function(a){ return a[0] === "▶" ? 0 : a[0] === "⌘" ? 1 : 2; };
  secs.sort(function(a, b){ return rank(a) - rank(b); });
  return h + secs.map(function(s){
    return "<div class=\"block\"><div class=\"block-head\"><h2>" + cx(s) + "</h2><i class=\"hr\"></i><span class=\"meta\">" + by[s].length + "</span></div><div class=\"cs-cheat\">" +
      by[s].map(function(x){ return csCrow(c, x, chT, false); }).join("") + "</div></div>";
  }).join("");
}
// 강의 순서 — 챕터(강의)마다 거기서 배우는 단축키·명령어. 지금 들을 강의는 표시하고 바로 가기
function csLecSteps(ch, keep){   // 그 강의(챕터)에 나온 단축키·명령어 — 교안 순서, 겹치는 건 한 번
  var seen = {};
  return csSteps(ch).map(function(x){ return x.s; }).filter(function(s){
    var k = s.kind === "key" ? JSON.stringify(s.k) : s.code; if(seen[k]) return false; seen[k] = 1; return keep(s);
  });
}
function csLPickRow(c){
  var lecs = c.chapters.filter(function(ch){ return csSteps(ch).length; }), here = csHere(c);
  var pick = (CPROG.pk || {})[c.id] || "", sel = lecs.filter(function(ch){ return ch.id === pick; })[0];
  // 강의 고르기 — 전체 / 강의 하나
  var h = "<div class=\"cs-lpick\"><label for=\"cs-lsel\">강의</label><select id=\"cs-lsel\" data-cslsel=\"1\"><option value=\"\">전체 강의 — 순서대로 다 보기</option>" +
    lecs.map(function(ch){ var dn = !!CPROG.done[c.id + "|" + ch.id];
      return "<option value=\"" + cx(ch.id) + "\"" + (sel === ch ? " selected" : "") + ">" + (ch === here ? "▶ " : dn ? "✓ " : "") + cx(ch.title) + " (" + csLecSteps(ch, function(){ return true; }).length + ")</option>"; }).join("") + "</select>" +
    (sel !== here && lecs.indexOf(here) > -1 ? "<button type=\"button\" class=\"ghost\" data-cslpick=\"" + cx(here.id) + "\">▶ 지금 들을 강의</button>" : "") + "</div>";
  return h;
}
function csByLecture(c, list, all){
  var keep = function(x){ return !CPROG.cp[cpKey(c, x)] && (csFilt === "all" || (csFilt === "key" ? x.kind === "key" : csFilt === "cmd" ? csIsCmd(x) : CPROG.cf[cpKey(c, x)])); };
  var lecs = c.chapters.filter(function(ch){ return csSteps(ch).length; }), here = csHere(c);
  var pick = (CPROG.pk || {})[c.id] || "", sel = lecs.filter(function(ch){ return ch.id === pick; })[0];
  var h = "";
  if(sel){
    var i = lecs.indexOf(sel), rows = csLecSteps(sel, keep);
    h += "<div class=\"block cs-lec here\"><div class=\"block-head\"><h2>" + cx(sel.title) + "</h2><i class=\"hr\"></i><span class=\"meta\">" + cx(sel.part || "") + " · " + rows.length + "</span></div>" +
      (rows.length ? "<div class=\"cs-cheat\">" + rows.map(function(x){ return csCrow(c, x, {}, false); }).join("") + "</div>" : "<p class=\"empty\">이 강의엔 이 종류가 없어요.</p>") + "</div>";
    h += "<div class=\"cs-nav\">" + (i > 0 ? "<button type=\"button\" class=\"ghost\" data-cslpick=\"" + cx(lecs[i - 1].id) + "\">◀ 이전 강의</button>" : "<span></span>") +
      (sel !== here ? "<button type=\"button\" class=\"ghost\" data-cshere=\"" + cx(sel.id) + "\" data-cskeep=\"1\">여기를 지금 들을 강의로</button>" : "<span class=\"small\" style=\"color:var(--faint)\">▶ 지금 들을 강의</span>") +
      (i < lecs.length - 1 ? "<button type=\"button\" class=\"ghost\" data-cslpick=\"" + cx(lecs[i + 1].id) + "\">다음 강의 ▶</button>" : "<span></span>") + "</div>";
    return h;
  }
  var hereIdx = c.chapters.indexOf(here), by = {}, basics = [];
  list.forEach(function(x){ if(x.sec === "터미널 기본") basics.push(x); else (by[x.ch] = by[x.ch] || []).push(x); });
  var chs = c.chapters.filter(function(ch){ return by[ch.id]; });
  var target = chs.filter(function(ch){ return c.chapters.indexOf(ch) >= hereIdx; })[0];
  if(target) h += "<button type=\"button\" class=\"cs-goto\" data-cslpick=\"" + cx(target.id) + "\"><span>▶ " + (target === here ? "지금 들을 강의" : "다음에 단축키 나오는 강의") + "</span><b>" + cx(target.title) + "</b><span class=\"n\">" + by[target.id].length + "개 →</span></button>";
  if(basics.length) h += "<div class=\"block\"><div class=\"block-head\"><h2>$ 터미널 기본</h2><i class=\"hr\"></i><span class=\"meta\">어느 강의에서나 · " + basics.length + "</span></div><div class=\"cs-cheat\">" +
    basics.map(function(x){ return csCrow(c, x, {}, false); }).join("") + "</div></div>";
  var part = null;
  chs.forEach(function(ch){
    if(ch.part !== part){ part = ch.part; h += "<p class=\"cs-part-l\" style=\"margin:26px 0 4px\">" + cx(part) + "</p>"; }
    var isHere = ch === target, dn = !!CPROG.done[c.id + "|" + ch.id];
    h += "<div class=\"block cs-lec" + (isHere ? " here" : "") + (dn ? " done" : "") + "\" data-cslec=\"" + cx(ch.id) + "\"><div class=\"block-head\"><h2>" + (isHere ? "▶ " : dn ? "✓ " : "") + cx(ch.title) + "</h2><i class=\"hr\"></i><span class=\"meta\">" + by[ch.id].length + "</span></div><div class=\"cs-cheat\">" +
      by[ch.id].map(function(x){ return csCrow(c, x, {}, false); }).join("") + "</div></div>";
  });
  return h;
}
// 강의 하나의 단축키·명령어 전부 (모음 + 챕터 단계) — key → 항목. ★·✓ 이 어느 화면에서 눌렸든 여기서 찾는다
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
// 「즐겨찾기」(★)·「패스」(✓) 탭 — 강의 단축키·명령어 중 표시한 것을 강의별로
function csMarkedBlock(kind){
  var m = kind === "fav" ? CPROG.cf : CPROG.cp, h = "", seenTb = {};
  (COURSE.courses || []).forEach(function(c){
    var I = csIndex(c), list = I.order.filter(function(k){ if(!m[k] || seenTb[k]) return false; if(k.indexOf("tb|") === 0) seenTb[k] = 1; return true; }).map(function(k){ return I.idx[k]; });
    if(list.length) h += "<div class=\"block\"><div class=\"block-head\"><h2>강의 · " + cx(c.name) + "</h2><i class=\"hr\"></i><span class=\"meta\">" + list.length + "</span></div><div class=\"cs-cheat\">" +
      list.map(function(x){ return csCrow(c, x, {}, true); }).join("") + "</div></div>";
  });
  return h;
}
function csFavBlock(){ return csMarkedBlock("fav"); }
var _renderList0 = renderList;
renderList = function(kind){
  _renderList0(kind);
  var el = document.getElementById(kind === "fav" ? "view-fav" : "view-pass"), extra = csMarkedBlock(kind);
  if(!extra) return;
  if(el.querySelector(".row")) el.insertAdjacentHTML("beforeend", extra); else el.innerHTML = extra;
};
function csGo(chId, markPrev){
  var c = csCourse(); if(!c) return;
  if(markPrev){ var past = true; c.chapters.forEach(function(ch){ if(ch.id === chId) past = false; if(past) CPROG.done[c.id + "|" + ch.id] = 1; else if(ch.id === chId) delete CPROG.done[c.id + "|" + ch.id]; }); }
  CPROG.at[c.id] = chId; csOpen = {}; csView = "seq"; save("sc.cview2", csView); csSave(); renderCourse();
  var n = document.querySelector(".cs-now"); if(n) n.scrollIntoView({ block: "start", behavior: "instant" });
}
function csNext(dir){
  var c = csCourse(); if(!c) return;
  var vis = csVisible(c), i = vis.indexOf(csHere(c)), j = i + dir;
  if(j >= 0 && j < vis.length) csGo(vis[j].id);
}
function courseSearch(t){
  var hits = [];
  var tbHit = {};
  (COURSE.courses || []).forEach(function(c){ var seen = {}; (c.cheat || []).forEach(function(s){
    if(s.sec === "터미널 기본"){ if(tbHit[cpKey(c, s)]) return; }
    var hay = (s.t + " " + (s.code || "") + " " + (s.why || "") + " " + (s.sec || "") + " " + (s.k ? s.k.map(function(x){ return x.join(""); }).join(" ") : "")).toLowerCase();
    if(hay.indexOf(t) > -1 && hits.length < 16){ seen[cpKey(c, s)] = 1; if(s.sec === "터미널 기본") tbHit[cpKey(c, s)] = 1; hits.push([c, { id: s.ch || "", title: s.sec || "" }, s]); }
  }); c.chapters.forEach(function(ch){ ch.steps.forEach(function(s){
    if(!CS_SHOW[s.kind] || seen[cpKey(c, s)]) return;   // 단축키·명령어만
    var hay = (s.t + " " + (s.code || "") + " " + (s.why || "") + " " + (s.k ? s.k.map(function(x){ return x.join(""); }).join(" ") : "")).toLowerCase();
    if(hay.indexOf(t) > -1 && hits.length < 16) hits.push([c, ch, s]);
  }); }); });
  if(!hits.length) return "";
  return "<div class=\"block\"><div class=\"block-head\"><h2>강의에서</h2><i class=\"hr\"></i><span class=\"meta\">" + hits.length + "</span></div>" +
    hits.map(function(x){ var s = x[2];
      return "<button type=\"button\" class=\"cs-hit\" data-csjump=\"" + cx(x[0].id + "|" + x[1].id) + "\"><span class=\"cs-kind\">" + CS_ICON[s.kind] + " " + CS_KIND[s.kind] + "</span> <b>" + cx(s.t) + "</b> " +
        (s.kind === "key" ? combo(s.k) : "<code class=\"cs-code\">" + cx(s.code) + "</code>") + "<span class=\"cs-src\">" + cx(x[0].name) + " · " + cx(x[1].title) + "</span></button>";
    }).join("") + "</div>";
}
var _runSearch0 = runSearch;
runSearch = function(){
  _runSearch0();
  var t = document.getElementById("q").value.trim().toLowerCase();
  if(!t) return;
  var sv = document.getElementById("view-search"), ch = courseSearch(t);
  if(!ch) return;
  if(sv.querySelector(".row")) sv.insertAdjacentHTML("beforeend", ch);
  else sv.insertAdjacentHTML("afterbegin", ch);   // 단축키 목록엔 없고 강의에만 있으면 강의 것을 먼저
};
document.addEventListener("toggle", function(e){
  var d = e.target; if(d && d.getAttribute && d.getAttribute("data-cstb")){ csTB = d.open; save("sc.tb", csTB); return; }
  if(!d || !d.getAttribute || !d.getAttribute("data-csch")) return;
  var id = d.getAttribute("data-csch");
  if(d.open && !csOpen[id]){ csOpen[id] = true; var c = csCourse(), ch = c && c.chapters.filter(function(x){ return x.id === id; })[0]; if(ch) d.insertAdjacentHTML("beforeend", "<div class=\"cs-in\">" + csBody(c, ch, ch.id === csHere(c).id) + "</div>"); }
  else if(!d.open) csOpen[id] = false;
}, true);
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-csview],[data-csfilt],[data-cssort],[data-csscroll],[data-cscp],[data-cscf],[data-cspick],[data-cssd],[data-csdone],[data-csgo],[data-cshere],[data-csall],[data-cscopy],[data-csjump]");
  if(!b) return;
  var c = csCourse();
  if(b.hasAttribute("data-csview")){ csView = b.getAttribute("data-csview"); save("sc.cview2", csView); renderCourse(); return; }
  if(b.hasAttribute("data-cssort")){ csSort = b.getAttribute("data-cssort"); save("sc.csort", csSort); renderCourse(); return; }
  if(b.hasAttribute("data-csscroll")){ var tg = document.querySelector('[data-cslec="' + b.getAttribute("data-csscroll").replace(/"/g, "") + '"]'); if(tg) tg.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
  if(b.hasAttribute("data-csfilt")){ csFilt = b.getAttribute("data-csfilt"); renderCourse(); return; }
  if(b.hasAttribute("data-cscp") || b.hasAttribute("data-cscf")){
    var isF = b.hasAttribute("data-cscf"), ck = b.getAttribute(isF ? "data-cscf" : "data-cscp"), m = isF ? CPROG.cf : CPROG.cp;
    if(m[ck]) delete m[ck]; else m[ck] = 1;
    csSave(); if(current === "fav" || current === "pass") renderList(current); else renderCourse(); return;
  }
  if(b.hasAttribute("data-cspick")){ CPROG.cur = b.getAttribute("data-cspick"); csOpen = {}; csSave(); renderCourse(); return; }
  if(b.hasAttribute("data-cssd")){ var k = b.getAttribute("data-cssd"); if(CPROG.sd[k]) delete CPROG.sd[k]; else CPROG.sd[k] = 1; csSave(); renderCourse(); return; }
  if(b.hasAttribute("data-csdone")){ CPROG.done[c.id + "|" + b.getAttribute("data-csdone")] = 1; var vis = csVisible(c), i = vis.indexOf(csHere(c)); csGo(i < vis.length - 1 ? vis[i + 1].id : csHere(c).id); return; }
  if(b.hasAttribute("data-csgo")){ csGo(b.getAttribute("data-csgo")); return; }
  if(b.hasAttribute("data-cshere") && b.hasAttribute("data-cskeep")){ CPROG.at[c.id] = b.getAttribute("data-cshere"); csSave(); renderCourse(); return; }
  if(b.hasAttribute("data-cshere")){ csGo(b.getAttribute("data-cshere"), true); return; }
  if(b.hasAttribute("data-csall")){ CPROG.all = !CPROG.all; csSave(); renderCourse(); return; }
  if(b.hasAttribute("data-csjump")){ var p = b.getAttribute("data-csjump").split("|"); CPROG.cur = p[0]; document.getElementById("q").value = ""; if(p[1]){ show("course"); csPeek(p[1]); } else { csView = "cheat"; save("sc.cview2", csView); show("course"); } return; }
  if(b.hasAttribute("data-cscopy")){
    var txt = b.getAttribute("data-cscopy"), done = function(){ b.textContent = "복사됨 ✓"; setTimeout(function(){ b.textContent = "복사"; }, 1400); };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function(){ b.textContent = "길게 눌러 복사"; });
    else b.textContent = "길게 눌러 복사";
  }
});
document.addEventListener("keydown", function(e){
  if(current !== "course" || e.metaKey || e.ctrlKey || e.altKey) return;
  var a = document.activeElement; if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  if(e.key === "ArrowRight"){ e.preventDefault(); csNext(1); }
  if(e.key === "ArrowLeft"){ e.preventDefault(); csNext(-1); }
});
