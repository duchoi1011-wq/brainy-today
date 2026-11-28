/* ── 「흐름」 탭 — 일이 도는 순서 (build.py 가 hub.html 에 끼움) ──
   흐름 정의는 정본 JSON 의 workflows(단계 ref·글)뿐 — 여기선 그 순서대로 그리고, 단계마다 종류(스킬·대시보드·에이전트·예약·나)와
   대시보드 상태(볼 것·막힘)를 얹는다. 단계를 누르면 「지도」에서 그 마디와 이어진 것을 보여 준다. */
function stepState(st){ if (st.bad) return "bad"; const n = node(st.ref); return n.kind === "app" && (n.state === "warn" || n.state === "bad") ? n.state : ""; }
function stepSub(n){ return n.kind === "skill" ? "스킬 " + n.id : n.kind === "app" ? "대시보드 " + n.name : n.kind === "agent" ? "에이전트 " + n.name : n.kind === "sched" ? "예약 " + n.sub : "동욱이 직접"; }
function flowAlerts(w){
  const ids = new Set((w.steps || []).filter(x => x.ref.startsWith("app:")).map(x => x.ref.slice(4)));
  return allAlerts().filter(x => ids.has(x.app.id) && x.lv !== "low");
}
function flowCard(w){
  const al = flowAlerts(w), g = (D.groups || []).find(x => x.id === w.group);
  const steps = (w.steps || []).map((st, i) => {
    const n = node(st.ref), s = stepState(st);
    return `<li><button type="button" class="stp ${n.kind === "me" ? "me" : ""} ${s}" ${n.kind === "me" ? "" : `data-node="${esc(st.ref)}"`} aria-label="${i + 1}단계 ${esc(st.t)} — ${esc(stepSub(n))}">${kdTag(n.kind)}<span class="tx"><b>${esc(st.t)}</b><span>${esc(stepSub(n))}${s ? " · " + ST[s] : ""}${st.bad ? " (정본에서 못 찾음)" : ""}</span></span></button></li>`;
  }).join("");
  return `<section class="card" id="fl-${esc(w.id)}"><div class="fhead"><div><h3>${esc(w.name)}</h3><p>${esc(w.goal || "")}</p></div>${g ? `<span class="pill">${esc(g.name)}</span>` : ""}</div>
    <ol class="flow">${steps}</ol>
    ${al.map(x => `<p class="al ${esc(x.lv)}" style="margin-top:8px"><i aria-hidden="true"></i><span>${esc(x.app.name)} — ${esc(x.t)}</span></p>`).join("")}
    <div class="btns">${askBtn(`「${w.name}」 흐름이 지금 어디까지 와 있는지 단계별로 봐 줘 — 막힌 단계와 다음에 내가 할 한 가지만.`, "✦ Brainy에게 이 흐름 묻기")}</div></section>`;
}
function renderFlows(){
  const legend = `<section class="card"><div class="legend">${Object.keys(KIND).map(k => `<span>${kdTag(k)}${KIND[k][0]}</span>`).join("")}<span><span class="dot warn"></span>대시보드 볼 것</span><span><span class="dot bad"></span>막힘</span></div>
    <p class="small muted" style="margin-top:6px">단계를 누르면 「지도」에서 그 스킬·대시보드가 무엇과 이어지는지 보여요. 흐름 순서는 볼트 「전체 현황.json」이 정본이에요.</p></section>`;
  let h = legend;
  (D.groups || []).forEach(g => {
    const list = flows().filter(w => w.group === g.id);
    if (list.length) h += `<div class="part"><h2>${esc(g.name)}</h2><small>흐름 ${list.length}</small></div>` + list.map(flowCard).join("");
  });
  const rest = flows().filter(w => !(D.groups || []).some(g => g.id === w.group));
  h += rest.map(flowCard).join("");
  if (!flows().length) h += `<section class="card"><p class="empty">흐름이 아직 없어요. 볼트 「전체 현황.json」의 workflows 에 순서를 적으면 여기에 떠요.</p></section>`;
  return h + foot();
}
/* 「지금」 탭의 흐름 요약 — 흐름마다 한 줄: 단계 점(종류 색 · 볼 것/막힘 테두리) */
function flowSummary(){
  if (!flows().length) return `<p class="empty">흐름이 아직 없어요.</p>`;
  return flows().map(w => {
    const al = flowAlerts(w);
    return `<button type="button" class="frow" data-flow="${esc(w.id)}"><b>${esc(w.name)}</b><span class="fdots" aria-hidden="true">${(w.steps || []).map(st => `<i class="${node(st.ref).kind} ${stepState(st)}"></i>`).join("")}</span>
      <span class="small ${al.length ? "" : "muted"}" style="margin-left:auto;white-space:nowrap">${al.length ? `<span class="dot ${al.some(x => x.lv === "high") ? "bad" : "warn"}"></span> 볼 것 ${al.length}` : (w.steps || []).length + "단계"}</span></button>`;
  }).join("");
}
/* 넓은 화면: 줄이 바뀌는 자리의 단계에는 화살표를 감춘다 — 다음 단계가 아래 줄로 내려가 가리킬 곳이 없음 (11-28 검증 낮음 5) */
function drawFlowEnds(){
  document.querySelectorAll(".flow").forEach(ol => {
    const li = [...ol.children];
    li.forEach((x, i) => x.classList.toggle("eol", !!li[i + 1] && li[i + 1].offsetTop > x.offsetTop + 4));
  });
}
