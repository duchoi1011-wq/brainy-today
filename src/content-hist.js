/* ── 기록 탭 — 🕘 돌린 기록 · 🔖 중요 ──
   2026-11-18 동욱: "키워드 콘텐츠 등 내가 돌렸던 부분들을 과거 기록을 돌려서 확인할 수 있게 · 필요한 기록들은 즐겨찾기 ·
   다음 단계를 돌리기 위한 즐겨찾기(★·☆) 말고도 과거의 모든 기록 통틀어 내게 중요한 즐겨찾기를 새로 만드는 구조".
   - 돌린 기록 목록 = 맥(content_app.py _hist)이 단계를 돌릴 때마다 남기는 `<브랜드>/돌린 기록.json` → part("hist").
     본문은 ct.hist/<브랜드>.<id> 문서 — 열 때만 받는다(BRAINY.fetch). 단계마다 최근 20개 + 🔖 한 것만 클라우드에, 볼트 사본은 다.
   - 🔖 중요 = ct.set imp [{kind, key, label, sub, url, at, from:{id, at, label}, memo}] — kind: run(돌린 기록 하나) · kw · vid · rec · script.
     ★·☆(다음 단계에 쓰는 표시)와 따로다 — 🔖 는 다음 단계에 쓰이지 않고 내가 모아 두기만 한다. 맥은 kind run 인 것의 본문을 지우지 않는다.
   - 과거 기록 열기 = PAST 에 그 본문을 두고 part() 가 그 단계만 그 본문을 돌려준다 → 평소 화면 그대로 그때 결과가 보인다(맨 위 띠로 알림). */
var HIST_GROUPS = [["all", "전체"], ["kw", "키워드", ["kw", "trend", "wordcand", "kwrec"]], ["ct", "콘텐츠", ["search", "analysis", "cmts", "ref", "chancand"]],
  ["rec", "추천", ["rec"]], ["sc", "대본", ["build", "source", "script"]], ["imp", "🔖 한 것"]];
var HIST_TAB = { kw: "kwall", trend: "kw", wordcand: "brand", kwrec: "kw", search: "ref", analysis: "ref", cmts: "rec", ref: "ref", chancand: "refpage", rec: "rec", build: "build", source: "script", script: "script" };   // 그 기록을 어느 탭에서 보나
var IMP_KINDS = [["run", "돌린 기록"], ["kw", "키워드"], ["vid", "영상"], ["rec", "추천"], ["script", "대본"]];
var PAST = null;   // {brand, id, part, label, at, data} — 과거 기록을 보는 중
var HCACHE = {};

function hAt(at){ var d = new Date(at); return isNaN(d) ? String(at || "") : (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) }
function histItems(){ var h = part("hist"); return (h && h.items) || [] }
function pastPart(name){ return PAST && PAST.brand === cur && PAST.part === name ? PAST.data : null }
function impList(){ return (SETS[cur] || {}).imp || [] }
function impOf(kind, key){ return impList().filter(function(x){ return x.kind === kind && x.key === key })[0] }
/* 🔖 버튼 — 어느 목록에 붙여도 같은 모양 */
function impBtn(kind, key, label, sub, url){
  var on = !!impOf(kind, key);
  return "<button class=\"mk imp\" data-act=\"imp\" data-kind=\"" + kind + "\" data-key=\"" + esc(key) + "\" data-label=\"" + esc(label || key) + "\" data-sub=\"" + esc(sub || "") + "\" data-url=\"" + esc(url || "") + "\" aria-pressed=\"" + on + "\" title=\"" + (on ? "🔖 중요에서 빼기" : "🔖 중요에 모아 두기 — 기록 탭에서 언제든 다시 봄") + "\" aria-label=\"중요\">🔖</button>";
}
function impToggle(el){
  var d = el.dataset, list = impList().slice(), i = -1;
  list.forEach(function(x, j){ if(x.kind === d.kind && x.key === d.key) i = j });
  if(i >= 0){ list.splice(i, 1); toast("🔖 중요에서 뺐어요") }
  else { list.unshift({ kind: d.kind, key: d.key, label: d.label, sub: d.sub || "", url: d.url || "", at: new Date().toISOString(),
    from: PAST && PAST.brand === cur ? { id: PAST.id, at: PAST.at, label: PAST.label } : null }); toast("🔖 중요에 모았어요 — 「기록 › 🔖 중요」에서 봐요") }
  setS({ imp: list });
}
/* 과거 기록 열기 — 본문을 받아 그 단계 탭을 그때 결과로 */
function histOpen(id){
  var x = histItems().filter(function(y){ return y.id === id })[0];
  if(!x){ toast("그 기록이 목록에 없어요"); return }
  function show(data){ PAST = { brand: cur, id: x.id, part: x.part, label: x.label, at: x.at, data: data }; tab = HIST_TAB[x.part] || "sum"; save("ct.tab", tab); window.scrollTo(0, 0); render() }
  if(HCACHE[cur + "." + id]) return show(HCACHE[cur + "." + id]);
  if(!x.cloud && !impOf("run", id)){ toast("오래된 기록이라 볼트에만 있어요 — 🔖 하면 맥이 30초 안에 다시 올려요"); return }
  if(!window.BRAINY || !BRAINY.fetch){ toast("이 화면에서는 기록을 받을 수 없어요"); return }
  ui.histLoading = id; render();
  BRAINY.fetch("ct.hist/" + cur + "." + id).then(function(data){
    ui.histLoading = null;
    if(!data){ toast(x.cloud ? "기록 본문을 못 받았어요 — 잠시 뒤 다시" : "맥이 아직 안 올렸어요 — 30초 뒤 다시 눌러 주세요"); render(); return }
    HCACHE[cur + "." + id] = data; show(data);
  }, function(){ ui.histLoading = null; toast("기록을 못 받았어요 — 인터넷을 확인하세요"); render() });
}
function histClose(){ var back = PAST ? "hist" : tab; PAST = null; tab = back; save("ct.tab", tab); window.scrollTo(0, 0); render() }
/* 과거 기록을 보는 동안 모든 탭 맨 위에 붙는 띠 */
function pastBarHtml(){
  if(!PAST || PAST.brand !== cur) return "";
  return "<div class=\"pastbar\" role=\"status\"><span>🕘 <b>" + esc(hAt(PAST.at)) + " 「" + esc(PAST.label) + "」</b> 기록을 보는 중 — 이 단계만 그때 결과예요</span>" +
    "<span class=\"acts\" style=\"margin:0\">" + impBtn("run", PAST.id, PAST.label, hAt(PAST.at)) + "<button class=\"btn sm primary\" data-act=\"histclose\">지금 자료로 돌아가기</button></span></div>";
}

function viewHist(){
  if(!B()) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var all = histItems(), g = ui.histG || "all", grp = HIST_GROUPS.filter(function(x){ return x[0] === g })[0] || HIST_GROUPS[0];
  var list = all.filter(function(x){ return g === "all" ? true : g === "imp" ? !!impOf("run", x.id) : grp[2].indexOf(x.part) >= 0 });
  var latest = {}; all.forEach(function(x){ if(!latest[x.part] || x.at > latest[x.part]) latest[x.part] = x.at });
  var more = ui.histMore || 30;
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>🕘 돌린 기록</h3><span class=\"n\">" + all.length + "개</span></div>" +
    "<p class=\"lead\">키워드 받기 · 콘텐츠 검색 · 영상 분석 · 추천 · 대본을 돌릴 때마다 맥이 그 결과를 하나씩 남겨요. 「열어 보기」를 누르면 그 단계 탭이 그때 결과로 보이고, 맨 위 띠의 「지금 자료로 돌아가기」로 돌아와요. 🔖 하면 「🔖 중요」에 모여요.</p>" +
    "<div class=\"chips\">" + HIST_GROUPS.map(function(x){ var n = x[0] === "all" ? all.length : x[0] === "imp" ? all.filter(function(y){ return impOf("run", y.id) }).length : all.filter(function(y){ return x[2].indexOf(y.part) >= 0 }).length;
      return "<button class=\"chip" + (x[0] === g ? " on" : "") + "\" data-ui=\"histG=" + x[0] + "\">" + x[1] + " <span>" + n + "</span></button>" }).join("") + "</div>";
  if(!all.length) return h + "<p class=\"empty\">아직 기록이 없어요. 맥 동기화가 켜져 있으면 처음 한 번 지난 하루 사본으로 채우고, 그다음부터는 돌릴 때마다 남아요.</p></section>";
  if(!list.length) return h + "<p class=\"empty\">" + (g === "imp" ? "아직 🔖 한 기록이 없어요." : "이 단계는 아직 기록이 없어요.") + "</p></section>";
  var day = "";
  h += "<div class=\"list\">" + list.slice(0, more).map(function(x){
    var d = hAt(x.at).split(" ")[0], head = d !== day ? "<div class=\"hday\">" + esc(d) + "</div>" : ""; day = d;
    var now = latest[x.part] === x.at, viewing = PAST && PAST.id === x.id, off = !x.cloud && !impOf("run", x.id);
    return head + "<div class=\"it" + (viewing ? " on" : "") + "\"><span class=\"num muted\">" + esc(hAt(x.at).split(" ")[1] || "") + "</span><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.label) + "</b>" + (now ? " <span class=\"tag ok\">지금 자료</span>" : "") + (viewing ? " <span class=\"tag p\">보는 중</span>" : "") + "</div>" +
      "<div class=\"it-d\">" + esc(x.sum || "") + (off ? " · <span class=\"muted\">볼트에만 — 🔖 하면 다시 올라와요</span>" : "") + "</div></div>" +
      impBtn("run", x.id, x.label, hAt(x.at)) +
      "<button class=\"btn sm\" data-act=\"histopen\" data-id=\"" + esc(x.id) + "\"" + (off || ui.histLoading === x.id ? " disabled" : "") + ">" + (ui.histLoading === x.id ? "받는 중…" : "열어 보기") + "</button></div>" }).join("") + "</div>" +
    (list.length > more ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"histMore=" + (more + 30) + "\">더 보기 (" + (list.length - more) + "개)</button></div>" : "") + "</section>";
  return h;
}

function viewImp(){
  if(!B()) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var list = impList(), q = String(ui.impQ || "").trim();
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>🔖 중요</h3><span class=\"n\">" + list.length + "개</span></div>" +
    "<p class=\"lead\">기간에 상관없이 내게 중요한 것을 모아 두는 곳이에요. 돌린 기록 · 키워드 · 영상 · 추천 · 대본 어디서든 🔖 를 누르면 여기 와요. ★·☆ 즐겨찾기는 다음 단계(콘텐츠 검색 · 추천)에 쓰이는 표시이고, 🔖 는 다음 단계에 쓰이지 않고 모아 두기만 해요.</p>" +
    (list.length > 6 ? "<input type=\"search\" id=\"impq\" placeholder=\"이름 · 메모로 찾기\" value=\"" + esc(q) + "\" style=\"margin-bottom:8px\">" : "");
  if(!list.length) return h + "<p class=\"empty\">아직 없어요. 「🕘 돌린 기록」이나 키워드 · 영상 · 추천 · 대본 줄의 🔖 를 눌러 보세요.</p></section>";
  var hit = list.filter(function(x){ return !q || (x.label + " " + (x.sub || "") + " " + (x.memo || "")).indexOf(q) >= 0 });
  IMP_KINDS.forEach(function(k){
    var items = hit.filter(function(x){ return x.kind === k[0] });
    if(!items.length) return;
    h += "<h4>" + esc(k[1]) + " <span class=\"num muted\">" + items.length + "</span></h4><div class=\"list\">" + items.map(function(x){
      var open = x.kind === "run" ? "<button class=\"btn sm\" data-act=\"histopen\" data-id=\"" + esc(x.key) + "\">열어 보기</button>"
        : x.from ? "<button class=\"btn sm\" data-act=\"histopen\" data-id=\"" + esc(x.from.id) + "\" title=\"이 항목을 모은 그때 기록\">그때 기록</button>"
        : x.url ? "<a class=\"btn sm\" href=\"" + esc(x.url) + "\" target=\"_blank\" rel=\"noopener\">열기</a>" : "";
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(x.label) + "</b>" + (x.sub ? " <span class=\"muted\">" + esc(x.sub) + "</span>" : "") + "</div>" +
        "<div class=\"it-d\">🔖 " + esc(hAt(x.at)) + (x.from ? " · " + esc(hAt(x.from.at)) + " 「" + esc(x.from.label) + "」 기록에서" : "") + "</div>" +
        (x.memo ? "<div class=\"it-d\">✎ " + esc(x.memo) + "</div>" : "") + "</div>" +
        open + "<button class=\"mk\" data-act=\"impmemo\" data-kind=\"" + x.kind + "\" data-key=\"" + esc(x.key) + "\" title=\"메모 — 왜 중요한지\" aria-label=\"메모\">✎</button>" +
        "<button class=\"mk no\" data-act=\"imp\" data-kind=\"" + x.kind + "\" data-key=\"" + esc(x.key) + "\" title=\"🔖 중요에서 빼기\" aria-label=\"빼기\">✕</button></div>" }).join("") + "</div>";
  });
  if(!hit.length) h += "<p class=\"empty\">「" + esc(q) + "」 이 들어간 것이 없어요.</p>";
  return h + "</section>";
}

function histAct(name, el){
  if(name === "imp"){ impToggle(el); return true }
  if(name === "histopen"){ histOpen(el.dataset.id); return true }
  if(name === "histclose"){ histClose(); return true }
  if(name === "impmemo"){
    var list = impList().map(function(x){ return Object.assign({}, x) }), x = list.filter(function(y){ return y.kind === el.dataset.kind && y.key === el.dataset.key })[0];
    if(!x) return true;
    var m = prompt("왜 중요한지 한 줄 (비우면 메모 지움)", x.memo || ""); if(m == null) return true;
    x.memo = m.trim().slice(0, 200); if(!x.memo) delete x.memo; setS({ imp: list }); return true;
  }
  return false;
}
