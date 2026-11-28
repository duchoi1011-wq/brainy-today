/* ── 「판정」 탭 — 네이버 키워드마다 누적 클릭 판정 (build.py 가 ads.html 에 끼움) ──
   셈법은 ads-calc.js judgeKw(): 기준 숫자(조정·정지)는 hub.rules, 대표 키워드는 brand.coreKeywords.
   거르기(S.filt): act 손볼 것(정지 후보·대표·조정 구간·전환 있음) · all 전체 · 판정 이름 하나. 막대 = 누적 클릭, 눈금 = 조정·정지 */
const JF = [["act", "손볼 것"], ["stop", KJ.stop.name], ["core", KJ.core.name], ["watch", KJ.watch.name], ["win", KJ.win.name], ["wait", KJ.wait.name], ["off", KJ.off.name], ["all", "전체"]];
const keepJ = code => S.filt === "all" ? true : S.filt === "act" ? ["stop", "core", "watch", "win"].includes(code) : code === S.filt;
function kwRow(x, b){
  const k = x.k, j = x.j, R = rules(), g = groupBy(k.group), scale = Math.max(R.stop * 1.2, k.all.clk), info = KJ[j.code];
  const note = j.code === "wait" ? `조정 기준(${R.adjust}클릭)까지 ${j.left}클릭 남음` : j.code === "watch" ? `정지 기준(${R.stop}클릭)까지 ${j.left}클릭 남음` : info.how;
  return `<div class="row ${info.lv || (j.code === "off" ? "none" : "")}"><div class="ct">
    <b>${esc(k.kw)}</b><span>${esc(g ? g.name : "")} · 입찰 ${won(k.bid)}원${k.inspect && k.inspect !== "APPROVED" ? " · 검수 " + esc(k.inspect) : ""}</span>
    <span class="figs"><span>클릭 <i>${won(k.all.clk)}</i></span><span>광고비 <i>${won(k.all.cost)}원</i></span><span>노출 <i>${won(k.all.imp)}</i></span>${k.all.rank ? `<span>순위 <i>${k.all.rank}</i></span>` : ""}${k.all.conv ? `<span>전환 <i>${k.all.conv}</i></span>` : ""}</span>
    ${j.code !== "off" ? `<div class="meter" aria-hidden="true"><i style="width:${Math.min(100, k.all.clk / scale * 100)}%"></i><b style="left:${R.adjust / scale * 100}%"></b><b style="left:${R.stop / scale * 100}%"></b></div>` : ""}
    <span style="margin-top:4px">${esc(note)}</span></div>
    <div class="tags"><span class="pill ${info.lv}">${esc(info.name)}</span></div></div>`;
}
function renderJudge(){
  const R = rules(), list = selBrands().filter(b => kwsOf(b).length);
  const J = list.flatMap(b => kwsOf(b).map(k => ({ k, b, j: judgeKw(k, b) })));
  const cnt = f => J.filter(x => f === "all" ? true : f === "act" ? ["stop", "core", "watch", "win"].includes(x.j.code) : x.j.code === f).length;
  let h = `<div><div class="filt" role="group" aria-label="판정 거르기">${JF.map(([f, t]) => `<button type="button" class="chip ${S.filt === f ? "on" : ""}" data-filt="${f}" aria-pressed="${S.filt === f}">${esc(t)}<b>${cnt(f)}</b></button>`).join("")}</div>
    <p class="small muted" style="margin-top:6px;padding:0 4px">켠 날부터 쌓인 클릭으로 판정해요 — ${R.adjust}번이면 조정, ${R.stop}번에 전환 0이면 정지. 대표 키워드는 끄지 않아요. 막대의 눈금 두 개가 ${R.adjust}·${R.stop}이에요.</p></div>`;
  if (!list.length) return h + `<section class="card"><p class="empty">고른 브랜드에 네이버 키워드가 없어요.</p></section>`;
  const LIM = 40;
  list.forEach(b => {
    const L = J.filter(x => x.b === b && keepJ(x.j.code)).sort((x, y) => KJ_ORDER.indexOf(x.j.code) - KJ_ORDER.indexOf(y.j.code) || y.k.all.clk - x.k.all.clk || y.k.all.imp - x.k.all.imp);
    /* 손볼 것이 0이면 빈 칸 대신 판정에 가장 가까운 키워드(클릭 많은 순 10개)를 보여 준다 */
    if (S.filt === "act" && !L.length) {
      const near = J.filter(x => x.b === b && x.j.code === "wait").sort((x, y) => y.k.all.clk - x.k.all.clk).slice(0, 10);
      h += `<section class="card"><div class="part"><h2>${esc(b.name)}</h2><small>손볼 것 0</small></div>
        <p class="small muted" style="margin-bottom:6px">아직 ${R.adjust}클릭을 넘은 켜진 키워드가 없어요 — 판정에 가장 가까운 ${near.length}개예요.</p>${near.map(x => kwRow(x, b)).join("")}</section>`;
      return;
    }
    const shown = S.kwMore ? L : L.slice(0, LIM);
    h += `<section class="card"><div class="part"><h2>${esc(b.name)}</h2><small>${L.length}개</small></div>
      ${L.length ? shown.map(x => kwRow(x, b)).join("") + (L.length > shown.length ? `<button type="button" class="more" data-kwmore>나머지 ${L.length - shown.length}개 더 보기</button>` : "") : `<p class="empty">이 거르기에 맞는 키워드가 없어요.</p>`}
      ${L.length && S.filt !== "off" && S.filt !== "wait" ? `<div class="btns" style="margin-top:10px">${askBtn(`광고 한눈에 — ${b.name} 네이버: 판정 탭 「${(JF.find(f => f[0] === S.filt) || [])[1]}」 키워드 ${L.length}개를 기준대로 볼게. 손볼 순서와 조정안을 줘. 목록: ${L.slice(0, 25).map(x => `${x.k.kw}(클릭 ${x.k.all.clk}·${won(x.k.all.cost)}원·${KJ[x.j.code].name})`).join(", ")}${L.length > 25 ? " …" : ""}.` + ASK_TAIL(), "✦ 이 목록으로 Brainy와 조율")}</div>` : ""}</section>`;
  });
  return h;
}
