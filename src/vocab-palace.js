/* ───────── 기억의 궁전 대시보드 (2026-11-28 동욱 「기억의 궁전 대시보드를 우선 만들어야겠고」) — build.py 가 단어장 스크립트 끝(init 앞)에 끼운다 ─────────
   궁전마다 장(면 10개) → 면마다 놓인 문장 · 장면 이미지 · 복습 단계 · 다음 복습 · 오리쌤 스테이지. 오늘 복습할 면 · 다음 빈 면.
   - 궁전의 장·면: 볼트 `1_MyBrain/학습/외국어 암기/궁전-*.md` (장 목록 표 · 「N장 — 이름」 면 표 · frontmatter goal_faces·goal_from) → 맥 동기화 → vo.data/palace
   - 면에 놓인 문장: 회화장 표(영어 회화장 · 중국어 회화장)의 `면` 칸이 정본 → vo.data/main foreign (face · stage · due · st · meta …)
   - 장 이름·면 이름은 동욱이 정한다 — 비어 있으면 비어 있다고만 보인다 (지어내지 않는다).
   - 스테이지 3(3단 챌린지)은 내용 확인 전이라 이름만 둔다. 이 화면은 아무것도 쓰지 않는다. */
let PAL = null;                       // vo.data/palace — null 이면 아직 못 받음
const PL = { sel: 0, face: null };
const PAL_KEY = "chewha-vocab-palace";
try { PL.sel = parseInt(localStorage.getItem(PAL_KEY) || "0", 10) || 0; } catch(e) {}
const PL_STAGE = [["1", "궁전 결합", "문장을 면 하나에 장면으로 놓는다"], ["2", "메타반복", "단어·구조를 바꿔 다른 데 써 본다"], ["3", "3단 챌린지", "내용 확인 전 — 오리쌤 강의에서 확인한 뒤 채워요"]];
const faceKey = s => { const m = String(s || "").match(/(\d+)\s*-\s*(\d+)/); return m ? m[1] + "-" + m[2] : ""; };   // 「현장 1-3(접수대)」 · 「1-3-7」(소) → 1-3
const isDay = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || ""));
const plDue = t => isDay(t.due) && String(t.due).slice(0, 10) <= kday();
const plLong = t => /장기/.test(String(t.due || "")) || String(t.stage) === "5";
const plSt = t => { const m = String(t.st || "").match(/[123]/); return m ? +m[0] : 0; };

function plOf(p){
  const sent = FOREIGN.filter(t => t.cat === p.cat);
  const byFace = {}; sent.forEach(t => { const k = faceKey(t.face); if (k) (byFace[k] = byFace[k] || []).push(t); });
  const slots = p.chapters.flatMap(c => c.slots);
  const placed = slots.filter(s => byFace[s.no] || s.placed).length;
  const due = sent.filter(plDue).sort((a, b) => String(a.due).localeCompare(String(b.due)) || faceKey(a.face).localeCompare(faceKey(b.face), undefined, { numeric: true }));
  const next = slots.find(s => !byFace[s.no] && !s.placed) || null;
  const loose = sent.filter(t => !slots.some(s => s.no === faceKey(t.face)));   // 면 번호가 궁전에 없는 문장 (장이 아직 없거나 번호 오타)
  return { sent, byFace, slots, placed, due, next, loose };
}
function plTile(s, d){
  const t = d.byFace[s.no]?.[0], cls = !t && !s.placed ? "e" : t && plDue(t) ? "d" : t && plLong(t) ? "l" : "p";
  return `<button class="pl-t ${cls}${PL.face === s.no ? " on" : ""}" data-pl="face" data-no="${esc(s.no)}" aria-pressed="${PL.face === s.no}" aria-label="${esc(s.no)}면 ${s.name ? esc(s.name) + " " : ""}${cls === "e" ? "빈 면" : cls === "d" ? "오늘 복습" : "문장 있음"}">
    <span class="mono">${esc(s.no)}</span><small>${esc(s.name || (t || s.placed ? "" : "빈 면"))}</small></button>`;
}
function plFace(s, d){
  const ts = d.byFace[s.no] || [];
  const head = `<div class="meta"><h3 style="font-size:18px">${esc(s.no)}면${s.name ? " · " + esc(s.name) : ""}</h3><button class="btn ghost" data-pl="close" style="padding:6px 12px">접기</button></div>
    ${s.name ? "" : `<p class="small muted">면 이름이 아직 없어요 — 궁전 노트 「${esc(s.no.split("-")[0])}장」 표에 동욱이 정해요.</p>`}`;
  if (!ts.length) return `<div class="pl-f stack">${head}${s.placed ? `<p>${esc(s.placed)}</p><p class="small muted">궁전 노트에만 적혀 있고 회화장 표에는 아직 없어요.</p>` : `<p class="small muted">빈 면이에요. /memory-check로 문장을 넣으면 다음 빈 면부터 놓여요.</p>`}</div>`;
  return `<div class="pl-f stack">${head}${ts.map(t => { const st = plSt(t); return `<div class="stack" style="gap:8px">
      <p class="pl-s">${esc(t.term)}</p>
      <p class="small">${esc(t.def)}</p>
      ${t.pic ? `<div class="scene"><span class="lbl">장면 이미지</span>${esc(t.pic)}</div>` : `<p class="small muted">장면 이미지가 아직 없어요.</p>`}
      <p class="small mono muted">복습 단계 ${esc(t.stage || "—")} · 다음 복습 ${esc(t.due || "—")}${t.rec ? " · " + esc(t.rec) : ""}${t.src ? " · " + esc(t.src) : ""}</p>
      <div class="pl-stg" role="list" aria-label="오리쌤 스테이지">${PL_STAGE.map(([n, nm]) => `<span role="listitem" class="${st >= +n ? "on" : ""}"><b>${n}</b> ${nm}</span>`).join("")}</div>
      ${t.meta ? `<p class="small"><span class="muted">메타반복 · </span>${esc(t.meta)}</p>` : ""}
    </div>`; }).join("")}</div>`;
}
function renderPalace(){
  if (!PAL) return `<section class="card"><p class="empty">${mode === "local" ? "기록 저장소에 연결되지 않아 궁전을 못 불러왔어요.<br>인터넷을 확인하고 새로고침해 주세요." : "궁전을 불러오는 중이에요…<br>맥 동기화가 궁전 노트를 올리면 여기에 떠요."}</p></section>`;
  const pals = PAL.palaces || [];
  if (!pals.length) return `<section class="card"><p class="empty">궁전 노트가 없어요.<br>볼트 「외국어 암기」에 궁전-○○ 노트를 만들면 여기에 떠요.</p></section>`;
  if (PL.sel >= pals.length) PL.sel = 0;
  const p = pals[PL.sel], d = plOf(p), built = d.slots.length, goal = p.goal || built;
  const noName = p.chapters.filter(c => !c.name).length, needCh = Math.max(0, Math.ceil((goal - built) / 10));
  const pct = n => Math.min(100, Math.round(n / (goal || 1) * 100));
  const chips = `<div class="chips">${pals.map((x, i) => `<button class="chip${i === PL.sel ? " on" : ""}" data-pl="sel" data-i="${i}">${esc(x.name.replace(/^궁전-/, ""))} <span>${esc(x.cat || x.for)}</span></button>`).join("")}</div>`;
  const sum = `<section class="card stack">
    <div class="meta"><h3 style="margin:0">${esc(p.name)}</h3><span class="small muted">${esc(p.cat || p.for)}</span></div>
    <div class="pl-sum">
      <div><b class="mono">${d.placed}</b><span>놓은 면</span></div>
      <div><b class="mono">${d.due.length}</b><span>오늘 복습</span></div>
      <div><b class="mono">${built - d.placed}</b><span>빈 면</span></div>
      <div><b class="mono">${built}<small>/${goal}</small></b><span>만든 면</span></div>
    </div>
    <div class="pl-bar" role="img" aria-label="목표 ${goal}면 중 만든 면 ${built} · 문장 ${d.placed}"><i class="b" style="width:${pct(built)}%"></i><i class="f" style="width:${pct(d.placed)}%"></i></div>
    <p class="small muted">목표 ${goal}면${p.goalFrom ? " (" + esc(p.goalFrom) + ")" : ""} · 1장 = 10면 · <span class="pl-k" style="vertical-align:1px">회색</span> 만든 면 <span class="pl-k l" style="vertical-align:1px">초록</span> 문장${needCh ? ` · 장 ${needCh}개 더 필요` : ""}${noName ? ` · <b style="color:var(--accent)">장 이름 ${noName}개 빈칸 — 궁전 노트 「장 목록」에 동욱이 정해요</b>` : ""}</p>
  </section>`;
  const today = `<section class="card stack"><h2>오늘 복습할 면 ${d.due.length}</h2>
    ${d.due.length ? `<div class="list">${d.due.map(t => `<details class="pl-q"><summary><span class="mono">${esc(faceKey(t.face) || t.face || "면 없음")}</span> ${esc(t.def)}</summary><p class="pl-s" style="margin-top:6px">${esc(t.term)}</p>${t.pic ? `<p class="small muted">${esc(t.pic)}</p>` : ""}</details>`).join("")}</div>
      <p class="small muted">면과 뜻을 보고 문장을 먼저 말한 뒤 펼쳐요. 맞았는지는 /memory-check로 기록해요.</p>`
      : `<p class="small muted">${d.sent.length ? "오늘 복습할 면이 없어요." : "아직 놓은 문장이 없어요. /memory-check로 문장을 넣으면 면에 놓이고 여기에 복습이 떠요."}</p>`}
    ${d.next ? `<button class="btn ghost" data-pl="face" data-no="${esc(d.next.no)}">다음 빈 면 · ${esc(d.next.no)}${d.next.name ? " " + esc(d.next.name) : ""}</button>` : built ? `<p class="small">만든 면이 다 찼어요 — 장을 더해요.</p>` : ""}
  </section>`;
  const chs = p.chapters.map(c => { const fill = c.slots.filter(s => d.byFace[s.no] || s.placed).length, open = c.slots.find(s => s.no === PL.face);
    return `<section class="card stack"><div class="meta"><h3 style="font-size:18px;margin:0">${c.n}장 · ${c.name ? esc(c.name) : `<span class="muted">이름 없음</span>`}</h3><span class="small mono muted">${fill}/${c.faces}면</span></div>
      <div class="pl-g">${c.slots.map(s => plTile(s, d)).join("")}</div>${open ? plFace(open, d) : ""}</section>`; }).join("");
  const rest = needCh ? `<section class="card pl-rest"><p class="small muted">${p.chapters.length + 1}~${p.chapters.length + needCh}장 · ${goal - built}면 — 아직 궁전 노트에 없어요.</p></section>` : "";
  const loose = d.loose.length ? `<section class="card stack"><h2>면 번호가 궁전에 없는 문장 ${d.loose.length}</h2><div class="list">${d.loose.map(t => `<div class="row" style="cursor:default"><div class="t"><b>${esc(t.term)}</b><span>면 「${esc(t.face || "비어 있음")}」 · ${esc(t.def)}</span></div></div>`).join("")}</div><p class="small muted">회화장 표의 면 칸을 「장-면」(예: 1-3)으로 고치거나 궁전에 장을 더해요.</p></section>` : "";
  const legend = `<section class="card stack"><h2>문장 스테이지 (오리쌤)</h2><div class="list">${PL_STAGE.map(([n, nm, how]) => `<div class="row" style="cursor:default"><span class="pill">${n}</span><div class="t"><b>${nm}</b><span style="white-space:normal">${how}</span></div></div>`).join("")}</div>
    <p class="small muted">복습 단계(0~5)는 간격이고, 스테이지(1~3)는 문장 훈련의 진도예요. 색: <span class="pl-k p">문장 있음</span> <span class="pl-k d">오늘 복습</span> <span class="pl-k l">장기 기억</span> <span class="pl-k e">빈 면</span></p></section>`;
  return chips + sum + today + chs + rest + loose + legend;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-pl]"); if (!b) return;
  const a = b.dataset.pl;
  if (a === "sel") { PL.sel = +b.dataset.i || 0; PL.face = null; try { localStorage.setItem(PAL_KEY, String(PL.sel)); } catch(err) {} render(); return; }
  if (a === "close") { PL.face = null; render(); return; }
  if (a === "face") { PL.face = PL.face === b.dataset.no ? null : b.dataset.no; render(); if (PL.face) document.querySelector(".pl-t.on")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
});
