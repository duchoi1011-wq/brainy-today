/* ── 추천 탭 (content-recommend 결과) · 대본 탭 (content-production 결과) ── */
function scriptOf(id){ var s = part("script"); return s && s.items ? s.items.filter(function(x){ return x.rec === id })[0] : null }
/* 발행 달력 (Metricool 플래너) — 고른 추천에 올릴 날을 붙인다. 자동 배치는 날짜가 없는 편만, 내일부터 「한 주에 올릴 편 수」대로 요일을 나눠 빈 날에 차례로 놓는다 (손으로 정한 날짜는 건드리지 않는다).
   날짜는 ct.set 의 plan {추천 번호: YYYY-MM-DD} — 실제 예약 게시는 하지 않는다 (계획표일 뿐) */
var WEEK_SLOTS = { 1: [2], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
function ymd(d){ return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) }
function autoPlan(s){
  var r = part("rec"), rd = r && r.rounds[r.rounds.length - 1]; if(!rd) return {};
  var plan = Object.assign({}, s.plan), taken = {}, slots = WEEK_SLOTS[s.perWeek] || WEEK_SLOTS[2], d = new Date();
  Object.keys(plan).forEach(function(id){ taken[plan[id]] = 1 });
  var ids = rd.items.map(function(x){ return x.id }).filter(function(id){ return s.pick[id] && !plan[id] });   // 이미 날짜가 있는 편은 그대로 둔다
  for(var i = 0; i < ids.length; ){ d.setDate(d.getDate() + 1); var k = ymd(d); if(slots.indexOf(d.getDay()) >= 0 && !taken[k]){ plan[ids[i]] = k; i++ } }
  return plan;
}
function planHtml(rd, s){
  var days = ["일", "월", "화", "수", "목", "금", "토"];
  var rows = rd.items.filter(function(x){ return s.plan[x.id] || s.pick[x.id] }).sort(function(a, b){ return (s.plan[a.id] || "9").localeCompare(s.plan[b.id] || "9") });
  var nPick = rd.items.filter(function(x){ return s.pick[x.id] && !s.plan[x.id] }).length, nSet = rd.items.filter(function(x){ return s.plan[x.id] }).length;
  return "<section class=\"card\"><div class=\"card-h\"><h3>발행 달력</h3><span class=\"n\">주 " + s.perWeek + "편 · " + nSet + "개 잡힘</span></div>" +
    (rows.length ? "<div class=\"list\">" + rows.map(function(x){ var has = s.plan[x.id], dt = new Date((has || "") + "T12:00:00");
        return "<div class=\"it\"><span class=\"num" + (has ? "" : " muted") + "\">" + (has ? esc(has.slice(5)) + " " + days[dt.getDay()] : "날짜 없음") + "</span><div class=\"it-m\"><div><span class=\"tag fill\">" + esc(x.role) + "</span> " + stageTag(x) + " " + esc(x.title) + "</div></div>" +
          "<input type=\"date\" data-plan=\"" + esc(x.id) + "\" min=\"" + ymd(new Date()) + "\" value=\"" + esc(has || "") + "\" aria-label=\"올릴 날\"></div>" }).join("") + "</div>"
      : "<p class=\"lead\">아래에서 ＋로 추천을 고르면 여기에 뜨고, 「자동 배치」를 누르면 날짜 없는 편만 내일부터 주 " + s.perWeek + "편으로 잡아 줘요. 날짜는 하나씩 바꿀 수 있어요.</p>") +
    "<div class=\"acts\"><button class=\"btn sm\" data-act=\"autoplan\"" + (nPick ? "" : " disabled") + ">날짜 없는 " + nPick + "개 자동 배치</button>" +
    (nSet ? "<button class=\"btn sm\" data-act=\"clearplan\">날짜 모두 비우기</button>" : "") + "<span class=\"lead\" style=\"margin:0\">계획표예요 — 실제 예약 게시는 하지 않아요.</span></div></section>";
}
/* 원문 칸 (2026-11-16 동욱 "추천 컨텐츠는 내 원문이 기준") — 조사 시트 [조사] 콘텐츠 E~N열과 같은 순서.
   주제 칸만 우리 추천이고, 썸네일부터 댓글까지는 그 추천의 근거 레퍼런스(refs = [조사] 행 번호) 칸을 그대로 보여 준다.
   뷰트랩 기여도·성과도는 등급을 읽은 레퍼런스에만 채널 칸 끝에 붙는다 (연결됐을 때만) */
var ORIG_COLS = ["주제 (우리 적용)", "썸네일", "문구 / 배경", "제목", "채널", "대본", "파동", "댓글"];
var VT_GRADE = /^(Great|Good|Normal|Bad|Worst)$/;
/* 근거 레퍼런스 — 숫자면 [조사] 시트 행, 글이면 영상 id (조사 없이 ☆ 즐겨찾기·키워드로 찾은 콘텐츠로 추천받았을 때) */
function refByRow(n){
  if(typeof n === "number"){ var r = part("ref"); return r && r.items ? r.items.filter(function(x){ return x.row === n })[0] : null }
  var x = (((part("search") || {}).items) || []).filter(function(y){ return y.vid === n })[0], f = favOf(n);
  if(!x && !f) return null; x = x || {};
  return { vid: n, url: "https://www.youtube.com/watch?v=" + n, title: x.title || f.title, channel: x.channel || f.channel, subs: x.subs != null ? fmt(x.subs) : "", views: x.views != null ? fmt(x.views) : "",
    ratio: x.ratio, published: x.date, len: x.len, wave: Array.isArray(x.replayed) ? "많이 다시 본 구간 " + x.replayed.join(" · ") : "", comments: x.comments != null ? "댓글 " + x.comments + "개" : "" };
}
/* 추천 재료 — 「추천 받기」를 누를 때 맥으로 가는 ★ 키워드와 ☆ 즐겨찾기 콘텐츠. ☆는 누른 뒤 추천을 새로 받아야 들어간다 (2026-11-17 동욱: "즐겨찾기 누른 게 왜 추천에 안 보이지") */
function recMaterialHtml(r){
  var s = S(), pins = Object.keys(s.pin).filter(function(k){ return s.pin[k] && !s.ex[k] }), f = (SETS[cur] || {}).favc || {}, ids = Object.keys(f);
  var last = r && r.updatedAt ? Date.parse(r.updatedAt) : 0, fresh = ids.filter(function(v){ return !last || Date.parse(f[v].at) > last });
  return "<section class=\"card\"><div class=\"card-h\"><h3>추천 재료</h3><span class=\"n\">★ 키워드 " + pins.length + " · ☆ 콘텐츠 " + ids.length + "</span></div>" +
    "<p class=\"lead\">「추천 받기」를 누르면 이 재료가 맥으로 가고, 맥의 Claude가 ☆ 콘텐츠를 성과·구성의 첫 근거로, ★ 키워드를 주제로 써요. ☆·★는 누른 뒤 추천을 <b>새로 받아야</b> 들어가요." +
      (fresh.length && r ? " <b>마지막 추천 뒤에 ☆한 " + fresh.length + "개는 아직 안 들어갔어요.</b>" : "") + "</p>" +
    (ids.length ? "<details><summary>☆ 즐겨찾기 콘텐츠 " + ids.length + "개</summary><div class=\"list\" style=\"margin-top:6px\">" + ids.map(function(v){ var x = f[v];
        return "<div class=\"it\"><div class=\"it-m\"><a href=\"https://www.youtube.com/watch?v=" + esc(v) + "\" target=\"_blank\" rel=\"noopener\">" + esc(x.title || v) + "</a><div class=\"it-d\">" + esc(x.channel || "") + (x.kw ? " · 키워드 " + esc(x.kw) : "") + (fresh.indexOf(v) >= 0 && r ? " · <b>아직 추천 전</b>" : "") + "</div></div></div>" }).join("") + "</div></details>"
      : "<p class=\"lead\">아직 ☆한 콘텐츠가 없어요. <button class=\"btn sm\" data-go=\"ref|refView=search\">콘텐츠 탭에서 ☆ 누르기 →</button></p>") +
    (pins.length ? "<details><summary>★ 키워드 " + pins.length + "개</summary><div class=\"chips\" style=\"margin-top:6px\">" + pins.map(function(k){ return "<span class=\"tag\">" + esc(k) + "</span>" }).join("") + "</div></details>" : "") + "</section>";
}
function topicCell(x, s){
  var sc = scriptOf(x.id);
  return "<div class=\"o-top\"><span class=\"num muted\">" + esc(x.id) + "</span> " + stageTag(x) + "<button class=\"mk\" data-pick=\"" + esc(x.id) + "\" aria-pressed=\"" + !!s.pick[x.id] + "\" title=\"대본 만들 추천으로 고르기\" aria-label=\"대본 만들 추천으로 고르기\">＋</button></div>" +
    "<b>" + ([x.product, x.format].filter(Boolean).length ? "[" + [x.product, x.format].filter(Boolean).map(esc).join(" · ") + "] " : "") + esc(x.title) + "</b>" +
    (x.structure ? "<div class=\"apply\">" + esc(x.structure) + "</div>" : "") +
    "<div class=\"it-d\">" + [sc ? "<span class=\"tag ok\">대본 " + esc(sc.status || "있음") + "</span>" : "", s.plan[x.id] ? "<span class=\"tag\">" + esc(s.plan[x.id].slice(5)) + " 발행</span>" : ""].filter(Boolean).join(" ") + "</div>" +
    "<details><summary>근거 · 다음 연결 · 이어 쓸 카드</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
    (x.scene ? "<dt>찍을 장면</dt><dd>" + esc(x.scene) + "</dd>" : "") + "<dt>근거</dt><dd>" + esc(x.basis) + "</dd>" +
    (x.next ? "<dt>다음 연결</dt><dd>" + esc(x.next) + "</dd>" : "") + (x.cards ? "<dt>이어 쓸 카드</dt><dd>" + md(x.cards) + "</dd>" : "") + (x.bank ? "<dt>포맷</dt><dd>" + esc(x.bank) + "</dd>" : "") + "</dl></details>";
}
function refCells(r){
  var vt = [VT_GRADE.test(r.vtContrib || "") ? "기여도 " + r.vtContrib : "", VT_GRADE.test(r.vtPerf || "") ? "성과도 " + r.vtPerf : ""].filter(Boolean);
  var ch = [r.channel, "구독 " + (r.subs || "—"), "조회 " + (r.views || "—"), r.ratio != null ? "조회÷구독 " + r.ratio + "배" + (r.ad ? "(광고 집행 추정)" : "") : "", r.published, r.len].concat(vt).filter(Boolean);
  return "<td>" + (r.vid ? "<a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(r.vid) + "/mqdefault.jpg\"></a>" : "") + "</td>" +
    "<td>" + esc(r.thumbText || "확인 못 함") + "</td>" +
    "<td><a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title) + "</a></td>" +
    "<td>" + esc(ch.join(" · ")) + "</td><td>" + esc(r.structure || "") + "</td><td>" + esc(r.wave || "") + "</td><td>" + esc(r.comments || "") + "</td>";
}
function origRows(x, s){
  var refs = (x.refs || []).map(refByRow).filter(Boolean), n = Math.max(1, refs.length);
  var first = "<tr><td rowspan=\"" + n + "\" class=\"o-topic\">" + topicCell(x, s) + "</td>" +
    (refs.length ? refCells(refs[0]) : "<td colspan=\"7\" class=\"muted\">근거 레퍼런스 없음 — " + esc(x.cards ? String(x.cards).replace(/\[\[|\]\]/g, "").slice(0, 80) : "모아 둔 카드에서") + "</td>") + "</tr>";
  return first + refs.slice(1).map(function(r){ return "<tr>" + refCells(r) + "</tr>" }).join("");
}
function viewRec(){
  var b = B(), r = part("rec"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var s = S(), h = "", nRole = roleNames().reduce(function(t, n){ return t + (s.roles[n] || 0) }, 0);
  var nFav = Object.keys((SETS[cur] || {}).favc || {}).length, nPin = Object.keys(s.pin).filter(function(k){ return s.pin[k] }).length, hasMat = part("ref") || nFav || nPin;
  h += recMaterialHtml(r);
  if(!r || !r.rounds || !r.rounds.length)
    return h + "<section class=\"card\"><p class=\"empty\">아직 추천이 없어요.</p><div class=\"acts\"><button class=\"btn primary\" data-act=\"recommend\"" + (openCmd("recommend") || !nRole || !hasMat ? " disabled" : "") + ">" + (openCmd("recommend") ? "맥이 추천 만드는 중…" : "추천 받기") + "</button></div><p class=\"lead\" style=\"margin-top:8px\">" + (hasMat ? [part("ref") ? "조사한 레퍼런스" : "", nFav ? "☆ 콘텐츠 " + nFav + "개" : "", nPin ? "★ 키워드 " + nPin + "개" : ""].filter(Boolean).join(" · ") + "로 만들어요." : "재료가 없어요. 키워드 탭에서 ★를 누르거나 콘텐츠 탭에서 ☆를 누르세요.") + "</p></section>";
  var rd0 = r.rounds[r.rounds.length - 1], rd = Object.assign({}, rd0, { items: rd0.items.filter(isLongRec) }), nShort = rd0.items.length - rd.items.length, picked = Object.keys(s.pick).filter(function(id){ return rd.items.some(function(x){ return x.id === id }) });
  var need = picked.filter(function(id){ return !scriptOf(id) });
  h += "<section class=\"card\"><div class=\"card-h\"><h3>추천 " + esc(rd.date) + "</h3><span class=\"n\">" + rd.items.length + "개</span></div>" +
    "<p>" + esc(rd.summary) + "</p>" + (nShort ? "<p class=\"lead\" style=\"margin-top:8px\">미드폼·롱폼만 보여요 — 이 회차의 숏폼 추천 " + nShort + "개는 뺐어요.</p>" : "") + (rd.order ? "<p class=\"lead\" style=\"margin-top:8px\">바로 찍을 수 있는 순서 · " + esc(rd.order) + "</p>" : "") +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"script\"" + (!need.length || openCmd("script") ? " disabled" : "") + ">고른 " + need.length + "개 대본 초안 만들기</button>" +
    "<button class=\"btn\" data-act=\"source\"" + (!picked.length || openCmd("source") ? " disabled" : "") + ">고른 " + picked.length + "개 소재 찾기</button>" +
    "<button class=\"btn\" data-act=\"recommend\"" + (openCmd("recommend") || !nRole ? " disabled" : "") + ">" + (openCmd("recommend") ? "맥이 추천 만드는 중…" : "추천 새로 받기 (☆·★ 반영)") + "</button></div>" +
    "<p class=\"lead\" style=\"margin-top:10px\">추천마다 ＋로 고른 뒤 「대본 초안 만들기」를 누르면, 맥의 Claude가 대본을 쓰면서 이 주제로 잘된 영상과 레퍼런스 채널에서 가져온 구성을 같이 붙여요. 새 추천은 역할마다 " + roleNames().map(function(n){ return esc(n) + " " + s.roles[n] + "편" }).join(" · ") + "씩 받아요.</p></section>";
  h += planHtml(rd, s);
  roleNames().forEach(function(role){
    var items = rd.items.filter(function(x){ return x.role === role });
    if(!items.length) return;
    var what = ((b.roles || []).filter(function(x){ return x.name === role })[0] || {}).what || "";
    var order = stageList().map(function(g){ return g.name });
    items = items.slice().sort(function(a, c){ return order.indexOf(c.stage) - order.indexOf(a.stage) });   // 사다리와 같은 순서 — 마지막 단계부터
    h += "<section class=\"card\"><div class=\"card-h\"><h3><span class=\"tag fill\">" + esc(role) + "</span> " + esc(what) + "</h3><span class=\"n\">" + items.length + "개</span></div>" +
      ladderHtml(items, function(x){ return "<span class=\"chipx\"><span class=\"num muted\">" + esc(x.id) + "</span> <span class=\"clip\">" + esc(x.title) + "</span></span>" }) + "<div class=\"orig\"><table><thead><tr>" + ORIG_COLS.map(function(c){ return "<th>" + c + "</th>" }).join("") + "</tr></thead><tbody>" +
      items.map(function(x){ return origRows(x, s) }).join("") + "</tbody></table></div></section>";
  });
  return h;
}
/* 📚 소재와 출처 — content-source 가 기획 카드의 소재 채널(정체성 · 판매 상품)을 돌며 찾은 사실과 출처 (볼트 <브랜드>/소재.json → ct.data .source) */
function sourceOf(id){ var p = part("source"); return p && p.items ? p.items.filter(function(x){ return x.rec === id })[0] : null }
function sourceHtml(id){
  var x = sourceOf(id), busy = openCmd("source");
  var btn = "<button class=\"btn sm\" data-act=\"source\" data-id=\"" + esc(id || "") + "\"" + (busy || !id ? " disabled" : "") + ">" + (x ? "소재 다시 찾기" : "소재 찾기") + "</button>";
  if(!x) return "<details><summary>📚 소재와 출처 <span class=\"num muted\">아직</span></summary><p class=\"lead\" style=\"margin-top:6px\">브랜드 탭 「브랜드 레퍼런스」의 소재 채널을 돌며 사례·숫자·연구·현장 목소리와 출처를 찾아요.</p><div class=\"acts\">" + btn + "</div></details>";
  var ok = x.items.filter(function(i){ return i.check === "✅" }).length;
  return "<details><summary>📚 소재와 출처 <span class=\"num muted\">" + x.items.length + "개 · ✅ " + ok + " · " + esc(x.date || "") + "</span></summary><div class=\"list\" style=\"margin-top:6px\">" +
    x.items.map(function(i){ return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag " + (i.group === "판매 상품" ? "p" : "i") + "\">" + esc(i.kind || "") + "</span> " + esc(i.claim) + "</div>" +
      "<div class=\"it-d\"><a href=\"" + esc(i.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(i.cite || i.channel) + "</a> · " + esc(i.useIn || "") + " · " + esc(i.check || "") + (i.outside ? " <span class=\"tag p\">카드 밖</span>" : "") + "</div></div></div>" }).join("") + "</div>" +
    ((x.gaps || []).length ? "<p class=\"small\" style=\"margin-top:6px\"><b>못 찾은 것</b> " + x.gaps.map(esc).join(" / ") + "</p>" : "") +
    ((x.suggest || []).length ? "<p class=\"small\"><b>카드 보강 후보</b> " + x.suggest.map(esc).join(" / ") + "</p>" : "") +
    "<div class=\"acts\">" + btn + "</div></details>";
}
function viewScript(){
  var b = B(), sc = part("script"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var h = "";
  if(!sc || !sc.items || !sc.items.length) return "<p class=\"empty\">아직 대본 초안이 없어요. 추천 탭에서 ＋로 고른 뒤 「대본 초안 만들기」를 누르세요.</p>";
  h += "<p class=\"lead\">여기까지가 편집 믹서 바로 앞 단계예요. 편집 믹서가 생기면 이 대본 자료(볼트 「콘텐츠 기획 앱/" + esc(b.id) + "/대본.json」)를 그대로 읽어 템플릿에 맞춰요. 본문 정본은 각 카드입니다.</p>";
  sc.items.forEach(function(x, i){
    h += "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(x.title) + "</h3><span class=\"n\">" + esc(x.rec || "") + " · " + esc(x.status || "") + "</span></div>" +
      (x.meta ? "<p class=\"lead\">" + md(x.meta) + "</p>" : "") +
      (x.summary ? "<h4>스크립트 요약</h4><div class=\"pre\">" + md(x.summary) + "</div>" : "") +
      (x.shoot ? "<details><summary>촬영 요약</summary><div class=\"pre\" style=\"margin-top:6px\">" + md(x.shoot) + "</div></details>" : "") +
      (x.script ? "<details open><summary>대본 뼈대</summary><div class=\"pre\" id=\"sc-" + i + "\" style=\"margin-top:6px\">" + md(x.script) + "</div></details>" : "") +
      sourceHtml(x.rec) +
      (x.todo ? "<details><summary>아직 정해야 할 것</summary><div class=\"pre\" style=\"margin-top:6px\">" + md(x.todo) + "</div></details>" : "") +
      "<div class=\"acts\">" + (x.script ? "<button class=\"btn sm\" data-copy=\"sc-" + i + "\">대본 복사</button>" : "") + "<span class=\"lead\" style=\"margin:0\">카드 · " + esc(String(x.card || "").split("/").pop().replace(/\.md$/, "")) + "</span></div></section>";
  });
  return h;
}
