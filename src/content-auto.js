/* ── 🚀 자동 진행 — 누르기만 하면 키워드 → 추천 → 구축 → 대본 → 보고까지 ──
   2026-11-18 동욱: "추천 버튼이 있으니 내가 누르기만 하면 알아서 대본까지 나오고 보고까지 하는 방향으로. 너가 직접 알아서 돌아가기에도 최적화".
   앱은 ct.set autoReq {at, upto, n, params:{kw, rec}} 만 쓴다 → 맥 동기화(content_app.py)가 자동 진행.json 을 만들고 단계마다 cmd(kind auto)를 이어 보낸다.
   맥 Claude 는 한 cmd 에 한 단계만 하고 auto-step 으로 상태를 적는다 (cmd.md). 진행·보고는 자동 진행.json(ct.data .auto).
   앱 밖(Claude 대화·예약 작업)에서는 `content_app.py auto-start <브랜드> [rec|build|script] [편 수]` 로 같은 흐름을 시작한다. */
var AUTO_UPTO = [["rec", "추천까지"], ["build", "구축 문서까지"], ["script", "대본까지"]];
function autoOpt(){ var o = (SETS[cur] || {}).autoOpt || {}; return { upto: o.upto || "script", n: o.n || 2 } }
function autoState(){
  var st = part("auto"), r = (SETS[cur] || {}).autoReq;
  var waiting = !!(r && r.at && (!st || st.reqAt !== r.at) && Date.now() - Date.parse(r.at) < 10 * 60000);   // 눌렀는데 맥이 아직 시작 전
  return { st: st, waiting: waiting, running: waiting || !!(st && st.status === "진행 중") };
}
function autoStart(){
  var a = autoState(), o = autoOpt(); if(a.running || !seedsOf().length) return;
  var label = AUTO_UPTO.filter(function(x){ return x[0] === o.upto })[0][1];
  if(!confirm("🚀 자동 진행 — 씨앗마다 최고 키워드 ★ → 콘텐츠 추천" + (o.upto !== "rec" ? " → 구축 문서 " + o.n + "편" : "") + (o.upto === "script" ? " → 대본 " + o.n + "편" : "") + " → 보고. " + label + " 맥이 이어서 해요 (30분~1시간). 시작할까요?")) return;
  setS({ autoReq: { at: new Date().toISOString(), upto: o.upto, n: o.n, params: { kw: kwRecParams(), rec: recParams() } } });
}
function autoStepsHtml(st){
  var ic = { "끝": "✓", "하는 중": "⏳", "실패": "⚠", "대기": "·" };
  return "<ol class=\"auto-steps\">" + (st.stages || []).map(function(x){
    return "<li class=\"s-" + esc(x.status) + "\"><b>" + (ic[x.status] || "·") + " " + esc(x.name) + "</b>" + (x.note ? " <span class=\"it-d\">" + esc(x.note) + "</span>" : "") + "</li>" }).join("") + "</ol>";
}
function autoPilotHtml(where){
  if(!B() || !seedsOf().length) return "";
  var a = autoState(), o = autoOpt(), st = a.st;
  var h = "<div class=\"auto-card\"><div class=\"card-h\"><h3>🚀 자동으로 — " + esc(AUTO_UPTO.filter(function(x){ return x[0] === o.upto })[0][1]) + "</h3>" + (st && st.startedAt ? "<span class=\"n\">" + esc(String(st.startedAt).slice(5, 16).replace("T", " ")) + " " + esc(st.status || "") + "</span>" : "") + "</div>" +
    "<p class=\"lead\">한 번 누르면 맥의 Claude가 이어서 해요: 씨앗마다 <b>최고 키워드 ★</b> → <b>콘텐츠 추천</b> → 키·풀링 골라 <b>구축 문서</b> → <b>대본</b> → <b>보고</b>. 맥이 켜져 있어야 해요.</p>" +
    "<div class=\"chips\">" + AUTO_UPTO.map(function(x){ return "<button class=\"chip" + (o.upto === x[0] ? " on" : "") + "\" data-act=\"autoopt\" data-k=\"upto\" data-v=\"" + x[0] + "\"" + (a.running ? " disabled" : "") + ">" + x[1] + "</button>" }).join("") +
    (o.upto !== "rec" ? "<span class=\"lead\" style=\"margin:0 4px 0 10px\">편 수</span>" + [1, 2, 3].map(function(n){ return "<button class=\"chip" + (o.n === n ? " on" : "") + "\" data-act=\"autoopt\" data-k=\"n\" data-v=\"" + n + "\"" + (a.running ? " disabled" : "") + ">" + n + (n === 2 ? " (키 1 · 풀링 1)" : "") + "</button>" }).join("") : "") + "</div>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"autostart\"" + (a.running ? " disabled" : "") + ">" + (a.waiting ? "맥이 시작하는 중…" : a.running ? "맥이 진행하는 중…" : "🚀 시작") + "</button></div>";
  if(st && (st.stages || []).length && (a.running || Date.now() - Date.parse(st.doneAt || st.startedAt) < 3 * 86400000)){
    h += autoStepsHtml(st);
    if(st.report) h += "<div class=\"note\" style=\"margin-top:8px;white-space:pre-wrap\"><b>보고</b>\n" + esc(st.report) + "</div>" +
      "<div class=\"acts\"><button class=\"btn sm\" data-tab=\"rec\">추천 보기</button>" + (st.upto !== "rec" ? "<button class=\"btn sm\" data-tab=\"build\">구축 보기</button>" : "") + (st.upto === "script" ? "<button class=\"btn sm\" data-tab=\"script\">대본 보기</button>" : "") + "</div>";
  }
  return h + "</div>";
}
