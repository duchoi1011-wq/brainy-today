/* ── 참고 탭 — 추천 하나를 대본으로 만들기 전에, 그 채널의 결에 맞는 레퍼런스를 찾아 정리한 참고 페이지 ──
   흐름: 추천 탭에서 고름 → 「참고 페이지 만들기」(맥의 Claude가 채널 결·레퍼런스 채널·내 채널을 뒤져 칸마다 채움) → 여기서 읽고
        모자라면 한 줄 적어 「더 찾기」, 됐으면 「이 참고로 확정」 → 확정한 것만 「대본 초안 만들기」.
   자료는 볼트 `<브랜드>/참고.json` (ct.data/<브랜드>.refpage) — content-production 스킬이 쓴다. 확정 여부는 앱이 ct.set refok 에 둔다
   (스킬이 쓴 status 가 「확정」이면 이미 확정된 것으로 본다). 칸 이름은 브랜드 레퍼런스의 묶음 이름(카드의 소재 발굴 · 말하는 방식·스크립트 구조 · 화면·비주얼 …)을 스킬이 slot 에 그대로 쓴다.
   브랜드 레퍼런스가 페이지보다 나중에 바뀌었으면(브랜드.json refsAt > 페이지 updatedAt) 「다시 맞추기」를 띄운다. */
function pageOf(id){ var p = part("refpage"); return p && p.items ? p.items.filter(function(x){ return x.rec === id })[0] : null }
function pageOk(p){ return p.status === "확정" || !!((SETS[cur] || {}).refok || {})[p.rec] }
/* 브랜드 레퍼런스 — 브랜드의 레퍼런스 카드(기획·판매)를 맥 동기화가 읽어 브랜드.json 에 맞춰 둔 것을 카드와 같은 순서로 보여 준다:
   쓰는 순서 → 묶음별 채널(등급·가져올 것·대본 적용 예 + 그 채널의 새 영상) → 포맷 → 분석 칸. 카드를 고치면 몇 초 안에 여기가 바뀐다 (코드에 목록을 두지 않는다). */
function isNew(v){ return /(시간|일|주) 전$/.test(v.when || "") }
function refGroupHtml(g, list, chan){
  var nNew = 0;
  var rows = list.map(function(c){
    var now = chan && chan.items && chan.items[c.name], vs = now ? now.videos : [], fresh = vs.filter(isNew); nNew += fresh.length;
    var top = fresh[0] || vs[0];
    return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\">" + (c.url ? "<a href=\"" + esc(c.url) + "\" target=\"_blank\" rel=\"noopener\"><b>" + esc(c.name) + "</b></a>" : "<b>" + esc(c.name) + "</b>") +
      (c.grade && c.grade !== "—" ? " <span class=\"tag\">" + esc(c.grade) + "</span>" : "") + (c.pillar && c.pillar !== "—" ? " <span class=\"tag\">필러 " + esc(c.pillar) + "</span>" : "") +
      (fresh.length ? " <span class=\"tag ok\">새 영상 " + fresh.length + "</span>" : "") + "</div>" +
      "<div class=\"it-d\">" + esc(c.take) + "</div>" + (c.example ? "<div class=\"apply\"><b>대본 적용 예</b> " + esc(c.example) + "</div>" : "") +
      (top ? "<div class=\"it-d\">" + (isNew(top) ? "새 영상" : "최근 영상") + " · <a href=\"https://www.youtube.com/watch?v=" + esc(top.id) + "\" target=\"_blank\" rel=\"noopener\">" + esc(top.title) + "</a> · " + esc(top.when) +
        (top.views != null ? " · 조회 " + fmt(top.views) : "") + (top.ratio != null ? " · 조회÷구독 " + top.ratio + "배" : "") + "</div>" : "") + "</div></div>";
  }).join("");
  return "<details style=\"margin-top:10px\"><summary>" + esc(g) + " " + list.length + "곳" + (nNew ? " · 새 영상 " + nNew : "") + "</summary><div class=\"list\" style=\"margin-top:4px\">" + rows + "</div></details>";
}
function brandRefsHtml(b){
  var chan = part("chan"), t = b.tone, groups = {}, order = [];
  (b.channels || []).forEach(function(c){ if(!groups[c.group]){ groups[c.group] = []; order.push(c.group) } groups[c.group].push(c) });
  if(!order.length && !t) return "<section class=\"card\"><div class=\"card-h\"><h3>브랜드 레퍼런스</h3></div><p class=\"lead\">이 브랜드는 아직 레퍼런스 채널 카드가 없어요. 볼트에 레퍼런스 카드(소재 · 말하는 방식 · 화면 묶음 표)를 만들고 브랜드 파일의 refCards 에 적으면 여기에 떠요.</p></section>";
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>브랜드 레퍼런스</h3><span class=\"n\">" + (b.channels || []).length + "곳</span></div>" +
    "<p class=\"lead\">참고 페이지는 여기 있는 브랜드 레퍼런스에서 찾아요. 볼트의 레퍼런스 카드를 고치면 몇 초 안에 여기가 바뀌고, 채널 새 영상은 하루 한 번 저절로 최신화돼요. 카드 맞춘 때 " +
    (b.refsAt ? esc(day(b.refsAt)) + " " + esc(String(b.refsAt).slice(11, 16)) : "—") + " · 새 영상 읽은 때 " + (chan ? esc(day(chan.updatedAt)) : "아직") + "</p>";
  if((b.refOrder || []).length) h += "<h4>쓰는 순서</h4><div class=\"list\">" + b.refOrder.map(function(r, i){ return "<div class=\"it\"><span class=\"num muted\">" + (i + 1) + "</span><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>";
  if(t) h += "<details style=\"margin-top:10px\"><summary>이 채널의 결 — 말하는 방식</summary><div class=\"list\" style=\"margin-top:4px\">" + (t.rules || []).map(function(r){ return "<div class=\"it\"><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>" +
    "<dl class=\"kv small\" style=\"margin-top:8px\">" + [["쓰는 말", t.words], ["화면", t.screen], ["하지 않는 것", t.avoid]].filter(function(r){ return r[1] }).map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>" }).join("") + "</dl>" +
    (t.todo ? "<p class=\"note\" style=\"margin-top:8px\">" + esc(t.todo) + "</p>" : "") + "</details>";
  order.forEach(function(g){ h += refGroupHtml(g, groups[g], chan) });
  if((b.formats || []).length) h += "<details style=\"margin-top:10px\"><summary>콘텐츠 포맷 " + b.formats.length + "종</summary><div class=\"list\" style=\"margin-top:4px\">" + b.formats.map(function(f){
    return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(f.name) + "</b> <span class=\"num muted\">" + esc(f.len) + "</span> <span class=\"tag\">" + esc(f.goal) + "</span></div><div class=\"it-d\">" + esc(f.structure) + "</div></div></div>" }).join("") + "</div></details>";
  if(b.refFields || (b.refNotes || []).length) h += "<details style=\"margin-top:10px\"><summary>영상 분석 칸 · 주의</summary><p class=\"small\" style=\"margin-top:6px\">" + esc(b.refFields || "") + "</p>" +
    (b.refNotes || []).map(function(n){ return "<p class=\"small muted\" style=\"margin-top:4px\">· " + esc(n) + "</p>" }).join("") + "</details>";
  var src = b.refCards ? Object.keys(b.refCards).map(function(k){ return String(b.refCards[k]).split("/").pop().replace(/\.md$/, "") }).join(" · ") : "";
  return h + (src ? "<p class=\"lead\" style=\"margin-top:10px\">정본 카드 · " + esc(src) + "</p>" : "") + "</section>";
}
function pageStale(p){ var b = B(); return !!(b && b.refsAt && p.updatedAt && Date.parse(b.refsAt) > Date.parse(p.updatedAt)) }
function viewRefpage(){
  var b = B(); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var pg = part("refpage"), s = S(), items = (pg && pg.items) || [], rc = part("rec"), rd = rc && rc.rounds && rc.rounds[rc.rounds.length - 1];
  var waiting = rd ? rd.items.filter(function(x){ return s.pick[x.id] && !pageOf(x.id) }) : [];
  var ready = items.filter(function(p){ return pageOk(p) && !scriptOf(p.rec) });
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>참고 페이지</h3><span class=\"n\">" + items.length + "개 · 확정 " + items.filter(pageOk).length + "</span></div>" +
    "<p class=\"lead\">대본을 쓰기 전에, 추천마다 이 채널 결에 맞는 참고 영상을 찾아 「무엇을 가져올지」를 한 장으로 정리해요. 읽어 보고 됐으면 확정, 모자라면 한 줄 적어 더 찾게 하세요. 확정한 것만 대본으로 넘어가요.</p>" +
    (waiting.length ? "<p class=\"small\" style=\"margin-top:6px\">고른 추천 중 참고 페이지가 아직 없는 것 · " + waiting.map(function(x){ return esc(x.id) + " " + esc(x.title) }).join(" / ") + "</p>" : "") +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"refpage\"" + (!waiting.length || openCmd("refpage") ? " disabled" : "") + ">고른 " + waiting.length + "개 참고 페이지 만들기</button>" +
    "<button class=\"btn\" data-act=\"script\"" + (!ready.length || openCmd("script") ? " disabled" : "") + ">확정한 " + ready.length + "개 대본 초안 만들기</button></div>" +
    (!items.length && !waiting.length ? "<p class=\"lead\" style=\"margin-top:10px\">아직 고른 추천이 없어요. <button class=\"chip\" data-tab=\"rec\">추천 탭</button>에서 ＋로 고르세요.</p>" : "") + "</section>";
  items.forEach(function(p){
    var ok = pageOk(p), stale = pageStale(p), sm = p.summary || {}, sc = scriptOf(p.rec), groups = {}, order = [];
    (p.refs || []).forEach(function(r){ if(!groups[r.slot]){ groups[r.slot] = []; order.push(r.slot) } groups[r.slot].push(r) });
    h += "<section class=\"card\"><div class=\"card-h\"><h3><span class=\"num muted\">" + esc(p.rec) + "</span> " + esc(p.title) + "</h3><span class=\"n\">" + (p.refs || []).length + "개</span></div>" +
      "<div><span class=\"tag fill\">" + esc(p.role || "") + "</span> " + stageTag(p) + " <span class=\"tag " + (ok ? "ok" : "p") + "\">" + (ok ? "확정" : esc(p.status || "초안")) + "</span>" + (sc ? " <span class=\"tag ok\">대본 " + esc(sc.status || "있음") + "</span>" : "") + (p.format ? " <span class=\"tag\">포맷 " + esc(p.format) + "</span>" : "") +
      (stale ? " <span class=\"tag p\">브랜드 레퍼런스가 바뀜</span>" : "") + "</div>" +
      (stale ? "<div class=\"note\" style=\"margin-top:10px\">이 참고 페이지를 만든 뒤에 브랜드 레퍼런스(카드·잘 된 채널)가 바뀌었어요. <button class=\"chip\" data-rpsync=\"" + esc(p.rec) + "\"" + (openCmd("refpage") ? " disabled" : "") + ">지금 레퍼런스에 다시 맞추기</button></div>" : "") +
      "<h4>가져올 것 — 한 장 요약</h4><dl class=\"kv\">" + [["첫 3초 훅", sm.hook], ["구성", sm.structure], ["화면", sm.screen], ["말투", sm.voice], ["CTA", sm.cta]].filter(function(r){ return r[1] })
        .map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>" }).join("") + "</dl>" +
      order.map(function(slot){
        return "<h4>" + esc(slot) + " <span class=\"num muted\">" + groups[slot].length + "</span></h4>" + groups[slot].map(function(r){
          return "<div class=\"ref\">" + (r.vid ? "<a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(r.vid) + "/mqdefault.jpg\"></a>" : "") +
            "<div class=\"ref-m\"><a class=\"t\" href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.channel) + "</a>" +
            "<div class=\"it-d\">" + [r.title ? r.channel : "", r.published, r.len, r.perf].filter(Boolean).map(esc).join(" · ") + "</div>" +
            (r.take ? "<div class=\"apply\"><b>가져올 것</b> " + esc(r.take) + "</div>" : "") +
            (r.fit ? "<div class=\"it-d\"><b>결에 맞는 이유</b> " + esc(r.fit) + "</div>" : "") +
            "<details><summary>영상 분석 칸</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
            [["첫 3초 훅", r.hook], ["핵심 질문", r.question], ["구조", r.structure], ["화면", r.screen], ["시청자가 얻는 것", r.gain], ["댓글", r.comments], ["적용 제목", r.applyTitle], ["제작 난도", r.difficulty], ["상품 연결점", r.productLink], ["권리", r.rights], ["더 본 영상", r.more]].filter(function(x){ return x[1] }).map(function(x){ return "<dt>" + x[0] + "</dt><dd>" + esc(x[1]) + "</dd>" }).join("") +
            "</dl></details></div></div>";
        }).join("");
      }).join("") +
      ((p.gaps || []).length ? "<h4>찾았지만 없던 것</h4><p class=\"small\">" + p.gaps.map(esc).join(" / ") + "</p>" : "") +
      ((p.queries || []).length ? "<details style=\"margin-top:8px\"><summary>어디서 어떻게 찾았나</summary><p class=\"small\" style=\"margin-top:6px\">" + p.queries.map(esc).join(" · ") + "</p></details>" : "") +
      (p.note ? "<p class=\"lead\" style=\"margin-top:8px\">" + esc(p.note) + "</p>" : "") +
      "<div class=\"row2\" style=\"margin-top:12px\"><input type=\"text\" id=\"rp-note-" + esc(p.rec) + "\" maxlength=\"300\" placeholder=\"모자란 점 한 줄 (예: 말하는 방식이 더 차분한 영상으로)\"><button class=\"btn sm\" data-rpmore=\"" + esc(p.rec) + "\"" + (openCmd("refpage") ? " disabled" : "") + ">더 찾기</button></div>" +
      "<div class=\"acts\">" + (p.status === "확정" ? "" : "<button class=\"btn sm" + (ok ? "" : " primary") + "\" data-rpok=\"" + esc(p.rec) + "\">" + (ok ? "확정 풀기" : "이 참고로 확정") + "</button>") +
      "<span class=\"lead\" style=\"margin:0\">" + (p.card ? "카드 · " + esc(String(p.card).split("/").pop().replace(/\.md$/, "")) : "") + (p.confirmedBy ? " · " + esc(p.confirmedBy) : "") + "</span></div></section>";
  });
  return h + brandRefsHtml(b);
}
