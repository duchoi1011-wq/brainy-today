/* ── ✍️ 내 말로 끼어들기 — 어느 탭에서든 내 지시로 워크플로우 중간에 들어가 콘텐츠를 만든다 ──
   2026-11-18 동욱: "키워드·콘텐츠에 없더라도 중간에 내 프롬프트로 어느 부분에서든 그 기반으로 워크플로우에 끼어들어 콘텐츠를 제작할 수 있게, 거의 모든 탭별로".
   탭마다 맨 위에 칸 하나(promptBarHtml) + 구축 문서 · 대본마다 칸(promptBoxHtml).
   cmd kind "prompt" {where, prompt, target?, context} → 맥 Claude 가 그 단계의 스킬로 처리하고, 결과를 그 탭이 보여 주는 파일에 `from: "✍️ 내 지시"` 로 넣는다 (cmd.md).
   대본 고치기는 cmd kind "scriptedit" {rec, prompt} — 같은 대본을 고쳐 쓴다. 쓰던 글은 ui.prDraft 에 지켜 다시 그려도 남는다. */
var PROMPT_TABS = {
  sum: ["한눈에", "예: 이번 달 송년회 시즌에 맞춰 키 콘텐츠 2편, 풀링 3편 기획해 줘"],
  brand: ["브랜드", "예: 이 브랜드 타깃으로 바로 찍을 수 있는 콘텐츠 3편 뽑아 줘"],
  kw: ["키워드", "예: 「송년회」에서 담당자가 진짜 고민하는 말로 키워드 더 찾아서 추천해 줘"],
  kwset: ["키워드 순위 기준", "예: 검색량 1,000 넘는 말 중 클릭률 높은 것만으로 콘텐츠 추천해 줘"],
  ref: ["콘텐츠", "예: 위 영상 중 조회÷구독 5배 넘는 것만 골라 그 구성으로 키 콘텐츠 2편 만들어 줘"],
  rec: ["추천", "예: P2를 웨딩 말고 기업 행사 장면으로 바꾸고, 같은 결로 한 편 더 추천해 줘"],
  build: ["구축", "예: 다시 착안한 추천 I2를 풀링 문서로 만들고, 키콘 K1과 이어지게 해 줘"],
  refpage: ["참고 페이지", "예: 일본 행사 회사 블로그 중 포토부스 소재가 많은 곳 더 찾아 줘"],
  script: ["대본", "예: 고른 대본들을 5분 분량으로 줄이고 도입 3초를 질문으로 바꿔 줘"]
};
function prId(key){ return "pr-" + String(key).replace(/[^\w-]/g, "_") }
function prDraft(key){ return (ui.prDraft || {})[key] || "" }
function promptBoxHtml(key, title, ph, kind){
  var busy = openCmd(kind || "prompt");
  return "<div class=\"prbox\"><div class=\"prbox-h\">✍️ " + esc(title) + "</div>" +
    "<textarea id=\"" + prId(key) + "\" data-prin=\"" + esc(key) + "\" rows=\"2\" maxlength=\"1000\" placeholder=\"" + esc(ph) + "\">" + esc(prDraft(key)) + "</textarea>" +
    "<div class=\"acts\"><button class=\"btn sm primary\" data-act=\"" + (kind === "scriptedit" ? "scriptedit" : "prompt") + "\" data-key=\"" + esc(key) + "\"" + (busy ? " disabled" : "") + ">" +
    (busy ? "맥이 하는 중…" : kind === "scriptedit" ? "이대로 고쳐 줘" : "이걸로 만들어 줘") + "</button><span class=\"it-d\">맥의 Claude가 이 자리의 자료를 바탕으로 처리하고, 결과는 이 탭에 떠요.</span></div></div>";
}
function promptBarHtml(){
  var t = PROMPT_TABS[tab]; if(!t || !B()) return "";
  return "<details class=\"prbar\"" + (prDraft("tab:" + tab) ? " open" : "") + "><summary>✍️ 내 말로 끼어들기 <span class=\"muted\">— 이 탭(" + esc(t[0]) + ") 자료로 바로 시키기</span></summary>" + promptBoxHtml("tab:" + tab, "무엇을 할까요?", t[1]) + "</details>";
}
/* 지금 이 자리의 맥락 — 맥이 무엇을 기준으로 할지 알게 넘긴다 */
function promptContext(key){
  var s = S(), c = { tab: tab, where: (PROMPT_TABS[tab] || [tab])[0] };
  c.pins = Object.keys(s.pin).filter(function(k){ return s.pin[k] && !s.ex[k] });
  c.picked = Object.keys(s.pick || {}).filter(function(k){ return s.pick[k] });
  c.seeds = seedsOf().map(function(x){ return x.word });
  if(tab === "build" && ui.bdDoc) c.buildDoc = ui.bdDoc;
  if(key.indexOf("build:") === 0) c.target = { type: "build", id: key.slice(6) };
  if(key.indexOf("script:") === 0) c.target = { type: "script", id: key.slice(7) };
  if(key.indexOf("idea:") === 0) c.target = { type: "idea", id: key.slice(5) };
  return c;
}
function promptSend(key, kind){
  var el = document.getElementById(prId(key)), p = ((el && el.value) || prDraft(key)).trim();
  if(!p){ alert("무엇을 할지 적어 주세요."); if(el) el.focus(); return }
  var c = promptContext(key);
  if(kind === "scriptedit") send("scriptedit", "대본 고치기 — " + c.target.id + " · " + p.slice(0, 40), { rec: c.target.id, prompt: p });
  else send("prompt", "✍️ " + c.where + (c.target ? " " + c.target.id : "") + " — " + p.slice(0, 50), { where: c.where, prompt: p, target: c.target || null, context: c });
  ui.prDraft = Object.assign({}, ui.prDraft); ui.prDraft[key] = "";
}
