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
        return "<div class=\"it\"><span class=\"num" + (has ? "" : " muted") + "\">" + (has ? esc(has.slice(5)) + " " + days[dt.getDay()] : "날짜 없음") + "</span><div class=\"it-m\"><div><span class=\"tag fill\">" + esc(roleKo(x.role)) + "</span> " + stageTag(x) + " " + txt(x.title) + "</div></div>" +
          "<input type=\"date\" data-plan=\"" + esc(x.id) + "\" min=\"" + ymd(new Date()) + "\" value=\"" + esc(has || "") + "\" aria-label=\"올릴 날\"></div>" }).join("") + "</div>"
      : "<p class=\"lead\">아래에서 ＋로 추천을 고르면 여기에 뜨고, 「자동 배치」를 누르면 날짜 없는 편만 내일부터 주 " + s.perWeek + "편으로 잡아 줘요. 날짜는 하나씩 바꿀 수 있어요.</p>") +
    "<div class=\"acts\"><button class=\"btn sm\" data-act=\"autoplan\"" + (nPick ? "" : " disabled") + ">날짜 없는 " + nPick + "개 자동 배치</button>" +
    (nSet ? "<button class=\"btn sm\" data-act=\"clearplan\">날짜 모두 비우기</button>" : "") + "<span class=\"lead\" style=\"margin:0\">계획표예요 — 실제 예약 게시는 하지 않아요.</span></div></section>";
}
/* 원문 칸 (2026-11-16 동욱 "추천 컨텐츠는 내 원문이 기준") — 조사 시트 [조사] 콘텐츠 E~N열과 같은 순서.
   주제 칸만 우리 추천이고, 썸네일부터 댓글까지는 그 추천의 근거 레퍼런스(refs = [조사] 행 번호) 칸을 그대로 보여 준다.
   뷰트랩 기여도·성과도는 등급을 읽은 레퍼런스에만 채널 칸 끝에 붙는다 (연결됐을 때만) */
var ORIG_COLS = ["주제 (우리 적용)", "기준 레퍼런스 → 내 주제", "썸네일", "문구 / 배경", "제목", "채널", "대본", "파동", "댓글 (좋아요 순 5개)"];
/* 이 레퍼런스의 주제와, 거기서 무엇을 가져와 내 주제를 만들었나 (2026-11-17 동욱 "어떤 레퍼런스를 기준으로 저런 콘텐츠를 만들었는지, 내 주제와 레퍼런스 주제를 같이")
   맥이 추천할 때 x.refNotes{<refs 값>: {topic, took}} 를 쓴다. 없으면 조사 시트의 refLine(레퍼런스 한 줄) · apply(우리 적용) · 영상 분석 주제 · 제목 순으로 */
function refBasisCell(x, r, key){
  var n = ((x.refNotes || {})[String(key)]) || {}, an = r.vid ? anaOf(r.vid) : null;
  var topic = n.topic || r.refLine || (an && an.topic) || r.title || "", took = n.took || r.apply || "";
  return "<td class=\"o-basis\"><div class=\"small muted\">레퍼런스 주제</div><div>" + esc(topic) + "</div>" +
    "<div class=\"small muted\" style=\"margin-top:6px\">→ 내 주제</div><div><b>" + txt(x.title) + "</b></div>" +
    (took ? "<div class=\"small muted\" style=\"margin-top:6px\">가져온 것</div><div class=\"small\">" + esc(took) + "</div>" : "") + "</td>";
}
/* 댓글 — 좋아요 많은 순 5개 (2026-11-17 동욱 "댓글을 자세히 읽게 하는 칸 · 가져오는 모든 댓글은 좋아요 순 5개").
   볼트 <브랜드>/댓글.json(ct.data .cmts, content_app.py cmts — 공식 API 100개 중 좋아요 순) > 영상 분석 댓글 > 조사 시트 요약 글 */
var CMT_TOP = 5;   // 좋아요 많은 댓글 기본 개수 — 설계 「콘텐츠」 칸에서 5·10·20 으로 바꾼다 (anaOpt().nCmt)
function cmtsOf(vid){
  var c = vid && (((part("cmts") || {}).items) || {})[vid];
  if(c && (c.comments || []).length) return { list: c.comments.slice(0, anaOpt().nCmt), at: c.at };
  var an = vid ? anaOf(vid) : null;
  if(an && (an.comments || []).length) return { list: an.comments.slice().sort(function(a, b){ return (b.likes || 0) - (a.likes || 0) })
    .slice(0, anaOpt().nCmt), at: an.at };
  return c ? { list: [], error: c.error || "댓글 없음" } : null;
}
function cmtCell(r){
  var c = cmtsOf(r.vid);
  if(!c || !c.list.length) return "<td>" + esc(c && c.error ? c.error : (r.comments || "아직 안 받음")) + "</td>";
  var top = c.list[0];
  return "<td class=\"o-cmt\"><div><span class=\"num\">👍 " + fmt(top.likes || 0) + "</span> " + esc(String(top.text || "").slice(0, 70)) + (String(top.text || "").length > 70 ? "…" : "") + "</div>" +
    "<details style=\"margin-top:4px\"><summary>댓글 " + c.list.length + "개 자세히</summary><ol class=\"cmts\">" +
    c.list.map(function(m){ return "<li><div>" + esc(m.text || "") + "</div><div class=\"it-d\">👍 " + fmt(m.likes || 0) + (m.replies ? " · 답글 " + m.replies : "") + (m.at ? " · " + esc(m.at) : "") + "</div></li>" }).join("") + "</ol></details></td>";
}
var VT_GRADE = /^(Great|Good|Normal|Bad|Worst)$/;
/* 근거 레퍼런스 — 숫자면 [조사] 시트 행, 글이면 영상 id (조사 없이 ☆ 즐겨찾기·키워드로 찾은 콘텐츠로 추천받았을 때) */
function refByRow(n){
  if(typeof n === "number"){ var r = part("ref"); return r && r.items ? r.items.filter(function(x){ return x.row === n })[0] : null }
  var x = (((part("search") || {}).items) || []).filter(function(y){ return y.vid === n })[0], f = favOf(n);
  if(!x && !f) return null; x = x || {};
  return { vid: n, url: "https://www.youtube.com/watch?v=" + n, title: x.title || f.title, channel: x.channel || f.channel, subs: x.subs != null ? fmt(x.subs) : "", views: x.views != null ? fmt(x.views) : "",
    ratio: x.ratio, published: x.date, len: x.len, wave: Array.isArray(x.replayed) ? "많이 다시 본 구간 " + x.replayed.join(" · ") : "", comments: x.comments != null ? "댓글 " + x.comments + "개" : "" };
}
/* 이 추천은 어디서 나왔나 — ☆ 즐겨찾기 영상 · ★ 키워드로 찾은 영상 · 씨앗 단어 (2026-11-17 동욱: "즐겨찾기를 제외한 추천 기준은 뭐야? 직관적으로") */
function recFrom(x){
  var s = S(), favs = (SETS[cur] || {}).favc || {}, refs = x.refs || [];
  var fv = refs.filter(function(v){ return typeof v === "string" && favs[v] })[0];
  if(fv) return { k: "fav", t: "☆ 즐겨찾기 영상에서", ref: favs[fv].title };
  var r = refs.map(refByRow).filter(Boolean)[0], rt = r ? r.title : "";
  if(x.keyword && s.pin[x.keyword]) return { k: "pin", t: "★ 키워드 「" + x.keyword + "」로 찾은 영상에서", ref: rt };
  if(x.keyword) return { k: "seed", t: "씨앗 단어 「" + x.keyword + "」에서", ref: rt };
  return { k: "ref", t: "조사한 레퍼런스에서", ref: rt };
}
/* 순서 줄의 P1·K1 같은 번호를 추천 제목으로 */
function orderText(rd){
  var t = esc(rd.order || ""), byId = {}; rd.items.forEach(function(x){ byId[x.id] = x.title });
  return t.replace(/\b([PK]\d+)\b/g, function(m){ return byId[m] ? "<b>" + recNo(m) + "</b> 「" + esc(byId[m]) + "」" : m });
}
function topicCell(x, s){
  var sc = scriptOf(x.id);
  return "<div class=\"o-top\"><span class=\"num muted\">" + esc(recNo(x.id)) + "</span> " + stageTag(x) + "<button class=\"mk\" data-pick=\"" + esc(x.id) + "\" aria-pressed=\"" + !!s.pick[x.id] + "\" title=\"대본 만들 추천으로 고르기\" aria-label=\"대본 만들 추천으로 고르기\">＋</button>" + delBtn("rec", x.id, recNo(x.id) + " " + x.title) + impBtn("rec", x.title, x.title, recNo(x.id) + (x.date ? " · " + x.date : "")) + "</div>" +
    (function(f){ return "<div class=\"small\" style=\"margin:2px 0 4px\"><span class=\"tag" + (f.k === "fav" ? " ok" : "") + "\">" + esc(f.t) + "</span>" + (f.ref ? " <span class=\"muted\">「" + esc(f.ref) + "」</span>" : "") + "</div>" })(recFrom(x)) +
    "<b>" + ([x.product, x.format].filter(Boolean).length ? "[" + [x.product, x.format].filter(Boolean).map(esc).join(" · ") + "] " : "") + txt(x.title) + "</b>" +
    (x.structure ? "<div class=\"apply\">" + txt(x.structure) + "</div>" : "") +
    "<div class=\"it-d\">" + [sc ? "<span class=\"tag ok\">대본 " + esc(sc.status || "있음") + "</span>" : "", s.plan[x.id] ? "<span class=\"tag\">" + esc(s.plan[x.id].slice(5)) + " 발행</span>" : ""].filter(Boolean).join(" ") + "</div>" +
    "<details><summary>왜 추천했나 · 다음 연결</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
    (x.scene ? "<dt>찍을 장면</dt><dd>" + txt(x.scene) + "</dd>" : "") + "<dt>근거</dt><dd>" + txt(x.basis) + "</dd>" +
    (x.next ? "<dt>다음 연결</dt><dd>" + txt(x.next) + "</dd>" : "") + (x.cards ? "<dt>이어 쓸 카드</dt><dd>" + md(x.cards) + "</dd>" : "") + (x.bank ? "<dt>포맷</dt><dd>" + txt(x.bank) + "</dd>" : "") + "</dl></details>";
}
function refCells(r, x, key){
  var vt = [VT_GRADE.test(r.vtContrib || "") ? "뷰트랩 채널 기여 " + VT_KO[r.vtContrib] : "", VT_GRADE.test(r.vtPerf || "") ? "뷰트랩 영상 성과 " + VT_KO[r.vtPerf] : ""].filter(Boolean);
  var ch = [r.channel, "구독 " + (r.subs || "—"), "조회 " + (r.views || "—"), r.ratio != null ? "조회÷구독 " + r.ratio + "배" + (r.ad ? "(광고 집행 추정)" : "") : "", r.published, r.len].concat(vt).filter(Boolean);
  return refBasisCell(x, r, key) + "<td>" + (r.vid ? "<a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(r.vid) + "/mqdefault.jpg\"></a>" : "") + "</td>" +
    "<td>" + esc(r.thumbText || "확인 못 함") + "</td>" +
    "<td><a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\">" + txt(r.title) + "</a></td>" +
    "<td>" + esc(ch.join(" · ")) + "</td><td>" + esc(r.structure || "") + "</td><td>" + esc(r.wave || "") + "</td>" + cmtCell(r);
}
function origRows(x, s){
  var keys = (x.refs || []).filter(function(k){ return refByRow(k) }), refs = keys.map(refByRow), n = Math.max(1, refs.length);
  var first = "<tr><td rowspan=\"" + n + "\" class=\"o-topic\">" + topicCell(x, s) + "</td>" +
    (refs.length ? refCells(refs[0], x, keys[0]) : "<td colspan=\"8\" class=\"muted\">근거 레퍼런스 없음 — " + esc(x.cards ? String(x.cards).replace(/\[\[|\]\]/g, "").slice(0, 80) : "모아 둔 카드에서") + "</td>") + "</tr>";
  return first + refs.slice(1).map(function(r, i){ return "<tr>" + refCells(r, x, keys[i + 1]) + "</tr>" }).join("");
}
function viewRec(){
  var b = B(), r = part("rec"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var s = S(), h = "";
  if(!r || !r.rounds || !r.rounds.length) return recCritHtml(null) + "<section class=\"card\"><p class=\"empty\">아직 추천이 없어요. 위 기준을 고른 뒤 「추천 받기」를 누르세요.</p></section>";
  var rd0 = r.rounds[r.rounds.length - 1], rdAll = rd0.items.filter(isLongRec), rd = Object.assign({}, rd0, { items: rdAll.filter(function(x){ return !isGone("rec", x.id) }) }), nShort = rd0.items.length - rdAll.length, picked = Object.keys(s.pick).filter(function(id){ return rd.items.some(function(x){ return x.id === id }) });
  var need = picked.filter(function(id){ return !scriptOf(id) });
  h += recCritHtml(rd) + "<section class=\"card\"><div class=\"card-h\"><h3>추천 " + esc(rd.date) + "</h3><span class=\"n\">" + rd.items.length + "개</span></div>" +
    "<p>" + txt(rd.summary) + "</p>" + (nShort ? "<p class=\"lead\" style=\"margin-top:8px\">미드폼·롱폼만 보여요 — 이 회차의 숏폼 추천 " + nShort + "개는 뺐어요.</p>" : "") + (rd.order ? "<details style=\"margin-top:8px\"><summary>찍는 순서 (" + rd.items.length + "편)</summary><p class=\"lead\" style=\"margin-top:6px\">" + orderText(rd) + "</p></details>" : "") +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"script\"" + (!need.length || openCmd("script") ? " disabled" : "") + ">고른 " + need.length + "개 대본 초안 만들기</button>" +
    "<button class=\"btn\" data-act=\"source\"" + (!picked.length || openCmd("source") ? " disabled" : "") + ">고른 " + picked.length + "개 소재 찾기</button>" +
    cmtBtnHtml() +
"</div>" + nextBar("추천에서 바로 대본으로", [1, 2, 3].map(function(n){ return n <= rd.items.filter(function(x){ return !scriptOf(x.id) }).length ? ["추천 순서대로 " + n + "편 대본 초안", "data-act=\"recgo\" data-n=\"" + n + "\"", !!openCmd("script")] : null })) +
    "<p class=\"lead\" style=\"margin-top:10px\">추천마다 ＋로 고른 뒤 「대본 초안 만들기」를 누르면, 맥의 Claude가 대본을 쓰면서 이 주제로 잘된 영상과 레퍼런스 채널에서 가져온 구성을 같이 붙여요.</p></section>";
  h += planHtml(rd, s);
  roleNames().forEach(function(role){
    var items = rd.items.filter(function(x){ return x.role === role });
    if(!items.length) return;
    var what = ((b.roles || []).filter(function(x){ return x.name === role })[0] || {}).what || "";
    var order = stageList().map(function(g){ return g.name });
    items = items.slice().sort(function(a, c){ return order.indexOf(c.stage) - order.indexOf(a.stage) });   // 사다리와 같은 순서 — 마지막 단계부터
    h += "<section class=\"card\"><div class=\"card-h\"><h3><span class=\"tag fill\">" + esc(roleKo(role)) + "</span> " + esc(what) + "</h3><span class=\"n\">" + items.length + "개</span></div>" +
      ladderHtml(items, function(x){ return "<span class=\"chipx\"><span class=\"num muted\">" + esc(recNo(x.id)) + "</span> <span class=\"clip\">" + txt(x.title) + "</span></span>" }) + "<div class=\"orig\"><table><thead><tr>" + ORIG_COLS.map(function(c){ return "<th>" + c + "</th>" }).join("") + "</tr></thead><tbody>" +
      items.map(function(x){ return origRows(x, s) }).join("") + "</tbody></table></div></section>";
  });
  var goneRec = goneListHtml("rec", rdAll, function(x){ return x.id }, function(x){ return recNo(x.id) + " " + x.title });   // 🗑 로 지운 추천 — 되돌리기
  if(goneRec) h += "<section class=\"card\">" + goneRec + "</section>";
  return h;
}
/* 📚 소재와 출처 — content-source 가 기획 카드의 소재 채널(정체성 · 판매 상품)을 돌며 찾은 사실과 출처 (볼트 <브랜드>/소재.json → ct.data .source) */
function sourceOf(id){ var p = part("source"); return p && p.items ? p.items.filter(function(x){ return x.rec === id })[0] : null }
function sourceHtml(id){
  var x = sourceOf(id), busy = openCmd("source");
  var btn = "<button class=\"btn sm\" data-act=\"source\" data-id=\"" + esc(id || "") + "\"" + (busy || !id ? " disabled" : "") + ">" + (x ? "소재 다시 찾기" : "소재 찾기") + "</button>";
  if(!x) return "<details><summary>📚 소재와 출처 <span class=\"num muted\">아직</span></summary><p class=\"lead\" style=\"margin-top:6px\">대본 탭 「참고 페이지」의 소재 채널을 돌며 사례·숫자·연구·현장 목소리와 출처를 찾아요.</p><div class=\"acts\">" + btn + "</div></details>";
  var ok = x.items.filter(function(i){ return i.check === "✅" }).length;
  return "<details><summary>📚 소재와 출처 <span class=\"num muted\">" + x.items.length + "개 · ✅ " + ok + " · " + esc(x.date || "") + "</span></summary><div class=\"list\" style=\"margin-top:6px\">" +
    x.items.map(function(i){ return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag " + (i.group === "판매 상품" ? "p" : "i") + "\">" + esc(i.kind || "") + "</span> " + txt(i.claim) + "</div>" +
      "<div class=\"it-d\"><a href=\"" + esc(i.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(i.cite || i.channel) + "</a> · " + esc(i.useIn || "") + " · " + esc(i.check || "") + (i.outside ? " <span class=\"tag p\">카드 밖</span>" : "") + "</div></div></div>" }).join("") + "</div>" +
    ((x.gaps || []).length ? "<p class=\"small\" style=\"margin-top:6px\"><b>못 찾은 것</b> " + x.gaps.map(esc).join(" / ") + "</p>" : "") +
    ((x.suggest || []).length ? "<p class=\"small\"><b>카드 보강 후보</b> " + x.suggest.map(esc).join(" / ") + "</p>" : "") +
    "<div class=\"acts\">" + btn + "</div></details>";
}
function viewScript(){
  var b = B(), sc = part("script"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var h = "";
  if(!sc || !sc.items || !sc.items.length) return "<p class=\"empty\">아직 대본 초안이 없어요. 콘텐츠 탭 「추천」 칸에서 ＋로 고른 뒤 「대본 초안 만들기」를 누르세요.</p>";
  h += "<p class=\"lead\">여기까지가 편집 믹서 바로 앞 단계예요. 대본을 「대본 복사」로 복사해 편집 믹서의 대본 칸에 붙여 넣으세요.</p>";
  function sid(x){ return x.rec || x.title }   // 지우기 열쇠 — 추천 번호(없으면 제목)
  var live = sc.items.filter(function(x){ return !isGone("script", sid(x)) });
  if(!live.length) h += "<p class=\"empty\">대본을 모두 지웠어요. 아래 「지운 것」에서 되돌릴 수 있어요.</p>";
  sc.items.forEach(function(x, i){
    if(isGone("script", sid(x))) return;
    h += "<section class=\"card\"><div class=\"card-h\"><h3>" + txt(x.title) + "</h3><span class=\"n\">" + esc(recNo(x.rec || "")) + " · " + esc(x.status || "") + " " + impBtn("script", x.title, x.title, recNo(x.rec || "")) + "</span></div>" +
      (x.meta ? "<p class=\"lead\">" + md(x.meta) + "</p>" : "") +
      (x.summary ? "<h4>스크립트 요약</h4><div class=\"pre\">" + md(x.summary) + "</div>" : "") +
      (x.shoot ? "<details><summary>촬영 요약</summary><div class=\"pre\" style=\"margin-top:6px\">" + md(x.shoot) + "</div></details>" : "") +
      (x.script ? "<details open><summary>대본 뼈대</summary><div class=\"pre\" id=\"sc-" + i + "\" style=\"margin-top:6px\">" + md(x.script) + "</div></details>" : "") +
      sourceHtml(x.rec) +
      "<details class=\"prbar\"" + (prDraft("script:" + x.rec) ? " open" : "") + "><summary>✍️ 이 대본 고치기 · 첨삭</summary>" + promptBoxHtml("script:" + x.rec, "무엇을 고칠까요?", "예: 도입 3초를 시청자에게 던지는 질문으로 바꾸고, 두 번째 소주제를 실제 사례로 바꿔 줘", "scriptedit") + "</details>" +
      (x.todo ? "<details><summary>아직 정해야 할 것</summary><div class=\"pre\" style=\"margin-top:6px\">" + md(x.todo) + "</div></details>" : "") +
      "<div class=\"acts\">" + (x.script ? "<button class=\"btn sm\" data-copy=\"sc-" + i + "\">대본 복사</button>" : "") + delBtn("script", sid(x), x.title, "btn sm") + "<span class=\"lead\" style=\"margin:0\">카드 · " + esc(String(x.card || "").split("/").pop().replace(/\.md$/, "")) + "</span></div></section>";
  });
  var goneSc = goneListHtml("script", sc.items, sid, function(x){ return x.title });   // 🗑 로 지운 대본 — 되돌리기
  if(goneSc) h += "<section class=\"card\">" + goneSc + "</section>";
  return h;
}
/* 추천 근거 영상 댓글 다시 받기 — ct.set cmtReq {at} → 맥 동기화가 content_app.py cmts (Claude 없이, 1분 안팎). 추천을 새로 받으면 맥이 알아서 받는다 */
function cmtBtnHtml(){
  var r = (SETS[cur] || {}).cmtReq, d = part("cmts"), busy = !!(r && (!d || Date.parse(d.updatedAt) < Date.parse(r.at) - 5000));
  return "<button class=\"btn\" data-act=\"cmtreq\"" + (busy ? " disabled" : "") + ">" + (busy ? "맥이 댓글 받는 중…" : "레퍼런스 댓글 다시 받기 (좋아요 순 5개)") + "</button>";
}
