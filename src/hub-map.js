/* ── 「지도」 탭 — 무엇이 무엇과 이어지나 (build.py 가 hub.html 에 끼움) ──
   칸 넷: 예약 · 스킬 · 대시보드 · 에이전트 (폰은 두 칸: 예약+스킬 · 대시보드+에이전트). 선은 edges() — SKILL.md 에서 뽑은 부름·씀 + 예약 + 흐름의 앞뒤.
   마디를 누르면 그 마디와 바로 이어진 것만 밝히고, 위 카드에 설명·이어진 것·들어간 흐름·할 수 있는 일을 보여 준다(#map/<이름표>). 다시 누르면 풀린다. */
function mapOrder(){
  // 스킬은 흐름에 처음 나오는 순서대로 (선이 덜 엉키게), 나머지는 이름순
  const seen = [];
  flows().forEach(w => (w.steps || []).forEach(st => { if (st.ref.startsWith("skill:") && !seen.includes(st.ref)) seen.push(st.ref); }));
  scheds().forEach(x => { const k = "skill:" + x.skill; if (x.skill && !seen.includes(k)) seen.push(k); });
  skills().map(s => "skill:" + s.id).sort().forEach(k => { if (!seen.includes(k)) seen.push(k); });
  return seen.filter(k => skills().some(s => "skill:" + s.id === k));
}
function nd(key, nearSet){
  const n = node(key), cls = S.sel === key ? "sel" : nearSet && nearSet.has(key) ? "near" : "";
  const small = n.kind === "app" ? (n.state && n.state !== "ok" ? ST[n.state] : "") : n.kind === "sched" ? n.sub : n.kind === "agent" ? (n.obj && n.obj.state) || "" : "";
  return `<button type="button" class="nd ${cls}" data-node="${esc(key)}" aria-pressed="${S.sel === key}" title="${esc(n.sub)}">${kdTag(n.kind)}${n.kind === "app" ? `<span class="dot ${esc(n.state)}" aria-hidden="true"></span>` : ""}<span class="tx">${esc(n.name)}${small ? `<small>${esc(small)}</small>` : ""}</span></button>`;
}
function mapDetail(){
  if (!S.sel) return `<section class="card"><h2>연결 지도</h2><div class="legend">${["sched", "skill", "app", "agent"].map(k => `<span>${kdTag(k)}${KIND[k][0]}</span>`).join("")}</div>
    <p class="small muted" style="margin-top:6px">마디를 누르면 바로 이어진 것만 밝아지고, 여기에 무슨 일을 하는지·어느 흐름에 들어가는지가 떠요. 실선 = 스킬이 다른 스킬을 부르거나 대시보드를 씀(SKILL.md 에서 자동) · 예약이 스킬을 돌림 / 점선 = 흐름에서 바로 앞뒤 단계. 폰에서는 하나를 고르면 선이 보여요.</p></section>`;
  const n = node(S.sel), by = nearBy(S.sel), fw = flowsWith(S.sel);
  const chips = list => `<div class="links2">${list.map(k => { const m = node(k); return `<button type="button" class="chipn" data-node="${esc(k)}">${kdTag(m.kind)}${esc(m.name)}</button>`; }).join("")}</div>`;
  let body = "";
  if (n.kind === "skill") body = `<p class="desc">${esc(n.sub)}</p>`;
  else if (n.kind === "app") body = `<p class="desc">${esc(n.obj ? n.obj.what || "" : "")}</p><p class="small" style="margin-top:4px">${esc(n.sub)}</p>`;
  else if (n.kind === "agent") body = `<p class="desc">${esc(n.sub)}</p>${n.obj && n.obj.line ? `<p class="small" style="margin-top:4px">${esc(n.obj.line)}</p>` : ""}`;
  else if (n.kind === "sched") body = `<p class="desc">${esc(n.sub)} 자동으로 ${n.obj && n.obj.skill ? "스킬 " + esc(n.obj.skill) + " 을 돌려요" : "돌아요"}</p>`;
  // 선 종류마다 이름을 따로 — SKILL.md 의 부름·씀 / 예약이 돌림 / 흐름에서 앞뒤 (11-28 검증 중간 1: 흐름 앞뒤가 「예약」으로 섞여 뜸)
  const lab = n.kind === "skill" ? "SKILL.md 에서 서로 부르거나 쓰는 것" : n.kind === "app" ? "이 대시보드를 쓰는 스킬 (SKILL.md)" : "이어진 것";
  const groups = [["부름·씀", lab], ["예약", n.kind === "sched" ? "이 예약이 돌리는 스킬" : "이 스킬을 돌리는 예약"], ["흐름", "흐름에서 바로 앞뒤 단계"]].filter(([k]) => (by[k] || []).length);
  const acts = n.kind === "app" ? openBtn(n.obj || {}) + askBtn(`${n.name} 현황 정리해 줘 — 지금 숫자와 볼 것, 다음 한 걸음만.`, "✦ Brainy에게 묻기")
    : n.kind === "agent" ? `<button type="button" class="btn primary" data-who="${esc(n.id)}">✦ ${esc(n.id === "brainy" ? "Brainy와" : n.name + "과")} 이야기</button>`
    : n.kind === "skill" ? askBtn(`스킬 ${n.id} 가 하는 일, 최근에 언제 돌았는지, 이어진 스킬·대시보드와 어떻게 주고받는지 짧게 알려 줘.`, "✦ Brainy에게 이 스킬 묻기")
    : askBtn(`예약 「${n.name}」(${n.sub})이 최근에 잘 돌았는지, 무엇을 만들었는지 알려 줘.`, "✦ Brainy에게 묻기");
  return `<section class="card detail"><div class="fhead"><h3>${kdTag(n.kind)}${esc(n.name)}</h3><span class="pill ${n.kind === "app" ? esc(n.state) : ""}">${KIND[n.kind][0]}${n.kind === "app" && n.state ? " · " + ST[n.state] : ""}</span></div>${body}
    ${groups.map(([k, label]) => `<h5>${label} ${by[k].length}</h5>${chips(by[k])}`).join("")}
    ${fw.length ? `<h5>들어간 흐름 ${fw.length}</h5><div class="links2">${fw.map(w => `<button type="button" class="chipn" data-flow="${esc(w.id)}"><span class="kd me" aria-hidden="true">⇢</span>${esc(w.name)}</button>`).join("")}</div>` : ""}
    <div class="btns">${acts}<button type="button" class="btn" data-node="${esc(S.sel)}">선택 풀기</button></div></section>`;
}
function renderMap(){
  if (S.sel && !node(S.sel).obj && S.sel !== "me") S.sel = "";
  const nb = S.sel ? near(S.sel) : null;
  const col = (title, keys) => keys.length ? `<div class="col"><h4>${title} ${keys.length}</h4>${keys.map(k => nd(k, nb)).join("")}</div>` : "";
  const sc = scheds().map(x => "sched:" + x.id), sk = mapOrder(), ap = apps().map(a => "app:" + a.id), ag = agents().map(a => "agent:" + a.id);
  return `${mapDetail()}<section class="card"><div class="map ${S.sel ? "focus" : ""}" id="map"><svg aria-hidden="true"></svg>
    <div class="cw">${col("예약", sc)}${col("스킬", sk)}</div><div class="cw">${col("대시보드", ap)}${col("에이전트", ag)}</div></div></section>` + foot();
}
/* 선 긋기 — 마디 자리(화면 좌표)를 읽어 지도 안 좌표로. 다른 칸끼리는 옆으로 휘는 선, 같은 칸끼리는 왼쪽으로 부푸는 호 */
function drawMap(){
  const map = document.getElementById("map"); if (!map) return;
  const svg = map.querySelector("svg"), box = map.getBoundingClientRect(), at = {};
  map.querySelectorAll(".nd[data-node]").forEach(el => { const r = el.getBoundingClientRect(); at[el.dataset.node] = { l: r.left - box.left, r: r.right - box.left, y: r.top - box.top + r.height / 2 }; });
  const sel = S.sel;
  svg.innerHTML = edges().map(e => {
    let p = at[e.a], q = at[e.b]; if (!p || !q) return "";
    if (p.l > q.l) [p, q] = [q, p];
    let d;
    if (Math.abs(p.l - q.l) < 8) { const bend = Math.min(60, 18 + Math.abs(q.y - p.y) * .12); d = `M${p.l},${p.y} C${p.l - bend},${p.y} ${q.l - bend},${q.y} ${q.l},${q.y}`; }
    else { const mx = (p.r + q.l) / 2; d = `M${p.r},${p.y} C${mx},${p.y} ${mx},${q.y} ${q.l},${q.y}`; }
    const on = sel && (e.a === sel || e.b === sel);
    return `<path d="${d}" class="${on ? "on" : sel ? "dim" : ""}${e.why === "흐름" ? " fl" : ""}"><title>${esc(e.why)}</title></path>`;
  }).join("");
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (view() === "map") drawMap(); });
