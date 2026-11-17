/* ── ✍️ 내 말로 끼어들기 — 어느 탭에서든 내 지시로 워크플로우 중간에 들어가 콘텐츠를 만든다 ──
   2026-11-18 동욱: "키워드·콘텐츠에 없더라도 중간에 내 프롬프트로 어느 부분에서든 그 기반으로 워크플로우에 끼어들어 콘텐츠를 제작할 수 있게, 거의 모든 탭별로".
   탭마다 맨 위에 칸 하나(promptBarHtml) + 구축 문서 · 대본마다 칸(promptBoxHtml).
   cmd kind "prompt" {where, prompt, target?, context} → 맥 Claude 가 그 단계의 스킬로 처리하고, 결과를 그 탭이 보여 주는 파일에 `from: "✍️ 내 지시"` 로 넣는다 (cmd.md).
   대본 고치기는 cmd kind "scriptedit" {rec, prompt} — 같은 대본을 고쳐 쓴다. 쓰던 글은 ui.prDraft 에 지켜 다시 그려도 남는다. */
/* 탭 → [탭 이름, 결과가 뜨는 탭 id, 그 이름, 예시]. 예시는 어느 브랜드에도 맞는 말로 — 브랜드 이름·번호(P1·K1)를 넣지 않는다 (앱 검증 지침 F15 · §1-1) */
var PROMPT_TABS = {
  sum: ["한눈에", "rec", "콘텐츠 › 추천", "예: 이번 달 시즌에 맞춰 상품 파는 영상 2편, 사람 모으는 영상 3편 기획해 줘"],
  brand: ["브랜드", "rec", "콘텐츠 › 추천", "예: 이 브랜드 타깃이 요즘 가장 많이 하는 고민으로 바로 찍을 콘텐츠 3편 뽑아 줘"],
  kw: ["키워드", "kw", "이 탭 「Claude 키워드 추천」", "예: 내 씨앗 단어에서 살 사람이 실제로 검색하는 말로 키워드 더 찾아 줘"],
  kwset: ["키워드 순위 기준", "rec", "콘텐츠 › 추천", "예: 검색량이 크고 클릭률이 높은 키워드만으로 콘텐츠 추천해 줘"],
  ref: ["콘텐츠", "rec", "콘텐츠 › 추천", "예: 위 영상 중 구독자보다 5배 넘게 본 것만 골라, 그 구성으로 상품 파는 영상 2편 만들어 줘"],
  rec: ["추천", "rec", "이 탭 (새 추천 회차)", "예: 두 번째 추천을 다른 장면으로 바꾸고, 같은 결로 한 편 더 추천해 줘"],
  build: ["구축", "build", "이 탭 (구축 문서)", "예: 오른쪽 다시 착안한 추천 중 첫 번째를 사람 모으는 영상 문서로 만들고, 상품 파는 영상과 이어지게 해 줘"],
  refpage: ["참고 페이지", "refpage", "이 탭 (후보)", "예: 해외 블로그·뉴스레터 중 내 상품 소재가 많은 곳을 더 찾아 줘"],
  script: ["대본", "script", "이 탭 (대본)", "예: 고른 대본들을 5분 분량으로 줄이고 도입 3초를 질문으로 바꿔 줘"]
};
function prId(key){ return "pr-" + String(key).replace(/[^\w-]/g, "_") }
function prDraft(key){ return (ui.prDraft || {})[key] || "" }
function promptBoxHtml(key, title, ph, kind){
  var busy = openCmd(kind || "prompt");
  return "<div class=\"prbox\"><div class=\"prbox-h\">✍️ " + esc(title) + "</div>" +
    "<textarea id=\"" + prId(key) + "\" data-prin=\"" + esc(key) + "\" rows=\"2\" maxlength=\"1000\" placeholder=\"" + esc(ph) + "\">" + esc(prDraft(key)) + "</textarea>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"" + (kind === "scriptedit" ? "scriptedit" : "prompt") + "\" data-key=\"" + esc(key) + "\"" + (busy ? " disabled" : "") + ">" +
    (busy ? "맥이 하는 중…" : kind === "scriptedit" ? "이대로 고쳐 줘" : "이걸로 만들어 줘") + "</button>" + promptWhereHtml(key) + "</div></div>";
}
/* 결과가 어디에 뜨나 — 다른 탭이면 「결과 보기 →」 (2026-11-18 검증: 「결과는 이 탭에」가 사실과 다름) */
function promptWhereHtml(key){
  var t = key.indexOf("build:") === 0 ? ["", "build", "이 문서"] : key.indexOf("script:") === 0 ? ["", "script", "이 대본"] : PROMPT_TABS[tab] || ["", tab, "이 탭"];
  return "<span class=\"it-d\">맥의 Claude가 이 자리 자료로 처리해요 · 결과: " + esc(t[2]) + "</span>" + (t[1] !== tab ? "<button class=\"btn sm\" data-tab=\"" + esc(t[1]) + "\">결과 보기 →</button>" : "");
}
function promptBarHtml(){
  var t = PROMPT_TABS[tab]; if(!t || !B()) return "";
  return "<details class=\"prbar\"" + (prDraft("tab:" + tab) ? " open" : "") + "><summary>✍️ 내 말로 끼어들기 <span class=\"muted\">— 이 탭(" + esc(t[0]) + ") 자료로 바로 시키기</span></summary>" + promptBoxHtml("tab:" + tab, "무엇을 할까요?", t[3]) + "</details>";
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
