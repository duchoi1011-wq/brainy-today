/* ── ⑤ 추천 (content-recommend 결과) · ⑥ 대본 초안 (content-production 결과) ── */
function scriptOf(id){ var s = part("script"); return s && s.items ? s.items.filter(function(x){ return x.rec === id })[0] : null }
/* 발행 달력 (Metricool 플래너) — 고른 추천에 올릴 날을 붙인다. 자동 배치는 내일부터 「한 주에 올릴 편 수」대로 요일을 나눠 차례로 놓는다.
   날짜는 ct.set 의 plan {추천 번호: YYYY-MM-DD} — 실제 예약 게시는 하지 않는다 (계획표일 뿐) */
var WEEK_SLOTS = { 1: [2], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
function ymd(d){ return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) }
function autoPlan(s){
  var r = part("rec"), rd = r && r.rounds[r.rounds.length - 1]; if(!rd) return {};
  var ids = rd.items.map(function(x){ return x.id }).filter(function(id){ return s.pick[id] }), slots = WEEK_SLOTS[s.perWeek] || WEEK_SLOTS[2], plan = {}, d = new Date();
  for(var i = 0; i < ids.length; ){ d.setDate(d.getDate() + 1); if(slots.indexOf(d.getDay()) >= 0){ plan[ids[i]] = ymd(d); i++ } }
  return plan;
}
function planHtml(rd, s){
  var days = ["일", "월", "화", "수", "목", "금", "토"];
  var rows = rd.items.filter(function(x){ return s.plan[x.id] }).sort(function(a, b){ return s.plan[a.id].localeCompare(s.plan[b.id]) });
  var nPick = rd.items.filter(function(x){ return s.pick[x.id] }).length;
  return "<section class=\"card\"><div class=\"card-h\"><h3>발행 달력</h3><span class=\"n\">주 " + s.perWeek + "편 · " + rows.length + "개 잡힘</span></div>" +
    (rows.length ? "<div class=\"list\">" + rows.map(function(x){ var dt = new Date(s.plan[x.id] + "T12:00:00");
        return "<div class=\"it\"><span class=\"num\">" + esc(s.plan[x.id].slice(5)) + " " + days[dt.getDay()] + "</span><div class=\"it-m\"><div><span class=\"tag fill\">" + esc(x.role) + "</span> " + esc(x.title) + "</div></div>" +
          "<input type=\"date\" data-plan=\"" + esc(x.id) + "\" value=\"" + esc(s.plan[x.id]) + "\" aria-label=\"올릴 날\"></div>" }).join("") + "</div>"
      : "<p class=\"lead\">아래에서 ＋로 추천을 고른 뒤 「자동 배치」를 누르면, 내일부터 주 " + s.perWeek + "편으로 올릴 날을 잡아 줘요. 날짜는 하나씩 바꿀 수 있어요.</p>") +
    "<div class=\"acts\"><button class=\"btn sm\" data-act=\"autoplan\"" + (nPick ? "" : " disabled") + ">고른 " + nPick + "개 자동 배치</button>" +
    (rows.length ? "<button class=\"btn sm\" data-act=\"clearplan\">비우기</button>" : "") + "<span class=\"lead\" style=\"margin:0\">계획표예요 — 실제 예약 게시는 하지 않아요.</span></div></section>";
}
function viewRec(){
  var b = B(), r = part("rec"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var s = S(), h = runHtml(["recommend", "script"]);
  if(!r || !r.rounds || !r.rounds.length)
    return h + "<section class=\"card\"><p class=\"empty\">아직 추천이 없어요.</p><div class=\"acts\"><button class=\"btn primary\" data-act=\"recommend\"" + (openCmd("recommend") ? " disabled" : "") + ">추천 받기</button></div></section>";
  var rd = r.rounds[r.rounds.length - 1], picked = Object.keys(s.pick).filter(function(id){ return rd.items.some(function(x){ return x.id === id }) });
  h += "<section class=\"card\"><div class=\"card-h\"><h3>추천 " + esc(rd.date) + "</h3><span class=\"n\">" + rd.items.length + "개</span></div>" +
    "<p>" + esc(rd.summary) + "</p>" + (rd.order ? "<p class=\"lead\" style=\"margin-top:8px\">바로 찍을 수 있는 순서 · " + esc(rd.order) + "</p>" : "") +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"script\"" + (!picked.length || openCmd("script") ? " disabled" : "") + ">고른 " + picked.length + "개 대본 초안 만들기</button>" +
    "<button class=\"btn\" data-act=\"recommend\"" + (openCmd("recommend") ? " disabled" : "") + ">추천 새로 받기</button></div>" +
    "<p class=\"lead\" style=\"margin-top:10px\">추천마다 ＋를 눌러 고르면 맥의 Claude가 제작 발굴 스킬로 대본 뼈대·촬영표를 만들어 ⑥ 대본에 올려요. 새 추천은 ② 비율의 역할 수(풀링 " + s.roles["풀링"] + " · 신뢰 " + s.roles["신뢰"] + " · 키 " + s.roles["키"] + ")대로 받아요.</p></section>";
  h += planHtml(rd, s);
  ["풀링", "신뢰", "키"].forEach(function(role){
    var items = rd.items.filter(function(x){ return x.role.indexOf(role) === 0 });
    if(!items.length) return;
    var what = ((b.roles || []).filter(function(x){ return x.name === role })[0] || {}).what || "";
    h += "<section class=\"card\"><div class=\"card-h\"><h3><span class=\"tag fill\">" + role + "</span> " + esc(what) + "</h3><span class=\"n\">" + items.length + "개</span></div><div class=\"list\">" +
      items.map(function(x){
        var sc = scriptOf(x.id);
        return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><span class=\"num muted\">" + esc(x.id) + "</span> <b>" + esc(x.title) + "</b></div>" +
          "<div class=\"it-d\">" + [x.product, x.format, x.from === "카드" ? "모아 둔 카드에서" : ""].filter(Boolean).map(esc).join(" · ") + (sc ? " · <span class=\"tag ok\">대본 " + esc(sc.status || "있음") + "</span>" : "") + (s.plan[x.id] ? " · <span class=\"tag\">" + esc(s.plan[x.id].slice(5)) + " 발행</span>" : "") + "</div>" +
          (x.structure ? "<div class=\"apply\">" + esc(x.structure) + "</div>" : "") +
          "<details><summary>근거 · 다음 연결 · 이어 쓸 카드</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
          (x.scene ? "<dt>찍을 장면</dt><dd>" + esc(x.scene) + "</dd>" : "") + "<dt>근거</dt><dd>" + esc(x.basis) + "</dd>" +
          (x.next ? "<dt>다음 연결</dt><dd>" + esc(x.next) + "</dd>" : "") + (x.cards ? "<dt>이어 쓸 카드</dt><dd>" + md(x.cards) + "</dd>" : "") + (x.bank ? "<dt>포맷</dt><dd>" + esc(x.bank) + "</dd>" : "") + "</dl></details></div>" +
          "<button class=\"mk\" data-pick=\"" + esc(x.id) + "\" aria-pressed=\"" + !!s.pick[x.id] + "\" title=\"대본 만들 추천으로 고르기\" aria-label=\"대본 만들 추천으로 고르기\">＋</button></div>";
      }).join("") + "</div></section>";
  });
  return h;
}
function viewScript(){
  var b = B(), sc = part("script"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var h = runHtml(["script"]);
  if(!sc || !sc.items || !sc.items.length) return h + "<p class=\"empty\">아직 대본 초안이 없어요. ⑤ 추천에서 고르고 「대본 초안 만들기」를 누르세요.</p>";
  h += "<p class=\"lead\">여기까지가 편집 믹서 바로 앞 단계예요. 편집 믹서가 생기면 이 대본 자료(볼트 「콘텐츠 기획 앱/" + esc(b.id) + "/대본.json」)를 그대로 읽어 템플릿에 맞춰요. 본문 정본은 각 카드입니다.</p>";
  sc.items.forEach(function(x, i){
    h += "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(x.title) + "</h3><span class=\"n\">" + esc(x.rec || "") + " · " + esc(x.status || "") + "</span></div>" +
      (x.meta ? "<p class=\"lead\">" + md(x.meta) + "</p>" : "") +
      (x.summary ? "<h4>스크립트 요약</h4><div class=\"pre\">" + md(x.summary) + "</div>" : "") +
      (x.shoot ? "<details><summary>촬영 요약</summary><div class=\"pre\" style=\"margin-top:6px\">" + md(x.shoot) + "</div></details>" : "") +
      (x.script ? "<details open><summary>대본 뼈대</summary><div class=\"pre\" id=\"sc-" + i + "\" style=\"margin-top:6px\">" + md(x.script) + "</div></details>" : "") +
      (x.todo ? "<details><summary>아직 정해야 할 것</summary><div class=\"pre\" style=\"margin-top:6px\">" + md(x.todo) + "</div></details>" : "") +
      "<div class=\"acts\">" + (x.script ? "<button class=\"btn sm\" data-copy=\"sc-" + i + "\">대본 복사</button>" : "") + "<span class=\"lead\" style=\"margin:0\">카드 · " + esc(String(x.card || "").split("/").pop().replace(/\.md$/, "")) + "</span></div></section>";
  });
  return h;
}
