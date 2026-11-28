/* ── 콘텐츠 › 💬 공감 댓글 — 키워드로 찾은 영상들의 댓글을 공감(좋아요) 많은 순으로 ──
   2026-11-28 동욱: "순수하게 키워드에서 뽑은 콘텐츠에서 댓글로 공감을 가장 많이 받은 게 뭔지 정리해서 뽑아 주는 칸.
   구독자 수 대비 조회수 이런 거 상관없이. 키워드로 뽑은 콘텐츠에서 공감순을 가장 많이 받은 댓글을 찾는 거야".
   영상 = part("search")(키워드로 찾은 콘텐츠), 댓글 = part("cmts")(영상마다 좋아요 많은 5개 — 맥 content_app.py cmts --search 가
   콘텐츠 검색이 끝나면 저절로 받음). 줄 세우기는 댓글 좋아요 수 하나뿐 — 영상 점수·구독자·조회수는 보지 않는다. */
function likedRows(){
  var sr = ((part("search") || {}).items) || [], cm = ((part("cmts") || {}).items) || {}, seen = {}, out = [];
  sr.forEach(function(v){
    if(ui.lkRel && !relOf(v)) return;   // 「키워드와 맞는 영상만」 — 제목·설명에 키워드가 든 영상
    ((cm[v.vid] || {}).comments || []).forEach(function(c){
      var key = String(c.text || "").replace(/\s+/g, " ").trim(); if(!key || seen[key]) return; seen[key] = 1;
      out.push({ text: c.text, likes: c.likes || 0, replies: c.replies || 0, at: c.at, vid: v.vid, title: v.title, channel: v.channel, kw: v.kw });
    });
  });
  return out.sort(function(a, b){ return b.likes - a.likes });
}
function likedCount(){ return likedRows().length }
function likedBusy(){ var r = (SETS[cur] || {}).cmtReq, d = part("cmts"); return !!(r && r.what === "search" && (!d || Date.parse(d.updatedAt) < Date.parse(r.at) - 5000)) }
function likedHtml(){
  var sr = ((part("search") || {}).items) || [], cm = ((part("cmts") || {}).items) || {};
  if(!sr.length) return "<section class=\"card\"><p class=\"empty\">아직 키워드로 찾은 콘텐츠가 없어요. 키워드 탭에서 ★ 키워드로 「콘텐츠 검색」을 먼저 돌리면, 찾은 영상마다 공감 많은 댓글을 맥이 받아 와요.</p></section>";
  var all = likedRows(), kws = [], byKw = {};
  all.forEach(function(r){ if(!byKw[r.kw]){ byKw[r.kw] = []; kws.push(r.kw) } byKw[r.kw].push(r) });
  var k = ui.lkKw !== "" && ui.lkKw != null && byKw[String(ui.lkKw)] ? String(ui.lkKw) : "", list = k ? byKw[k] : all, more = ui.lkMore || 30;
  var got = sr.filter(function(v){ return cm[v.vid] && !cm[v.vid].error }).length, off = sr.filter(function(v){ return cm[v.vid] && cm[v.vid].error }).length, wait = sr.length - got - off, busy = likedBusy();
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>💬 공감 댓글</h3><span class=\"n\">댓글 " + all.length + "개 · 영상 " + got + "/" + sr.length + "</span></div>" +
    "<p class=\"lead\">키워드로 찾은 영상들의 댓글을 <b>공감(좋아요) 많은 순</b>으로만 — 구독자·조회수는 보지 않아요. 영상마다 좋아요 많은 5개를 모았어요.</p>" +
    "<div class=\"acts\"><button class=\"chip" + (ui.lkRel ? " on" : "") + "\" data-ui=\"lkRel=" + !ui.lkRel + "\" title=\"제목·설명에 키워드가 든 영상의 댓글만\">" + (ui.lkRel ? "✓ " : "") + "키워드와 맞는 영상만</button><button class=\"btn sm\" data-act=\"likedreq\"" + (busy ? " disabled" : "") + ">" + (busy ? "맥이 댓글 받는 중…" : wait ? "안 받은 영상 " + wait + "개 댓글 받기" : "댓글 다시 받기") + "</button>" +
    (off ? "<span class=\"lead\" style=\"margin:0\">댓글 막힘 · 못 받음 " + off + "개</span>" : "") + "</div></section>";
  if(!all.length) return h + "<section class=\"card\"><p class=\"empty\">" + (busy ? "맥이 댓글을 받는 중이에요 — 1~2분 걸려요." : "아직 받은 댓글이 없어요. 위 버튼을 누르면 맥이 받아 와요.") + "</p></section>";
  /* 정리 — 키워드마다 공감 1위 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>키워드마다 공감 1위</h3><span class=\"n\">" + kws.length + "개 키워드</span></div><div class=\"list\">" +
    kws.slice().sort(function(a, b){ return byKw[b][0].likes - byKw[a][0].likes }).map(function(kw){ var r = byKw[kw][0];
      return "<div class=\"it\"><span class=\"num\">👍 " + fmt(r.likes) + "</span><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag\">" + esc(kw) + "</span> " + esc(String(r.text).replace(/\s+/g, " ").slice(0, 90)) + (String(r.text).length > 90 ? "…" : "") + "</div>" +
        "<div class=\"it-d lk-t\"><a href=\"https://www.youtube.com/watch?v=" + esc(r.vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.vid) + "</a></div></div>" +
        "<button class=\"btn sm\" data-ui=\"lkKw=" + esc(kw) + "\">이 키워드 " + byKw[kw].length + "개</button></div>" }).join("") + "</div></section>";
  /* 전체 순위 — 키워드로 거르기 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>공감 순위" + (k ? " · 「" + esc(k) + "」" : "") + "</h3><span class=\"n\">" + list.length + "개</span></div>" +
    "<div class=\"chips\"><button class=\"chip" + (k ? "" : " on") + "\" data-ui=\"lkKw=\">전체 <span>" + all.length + "</span></button>" +
    kws.map(function(kw){ return "<button class=\"chip" + (k === kw ? " on" : "") + "\" data-ui=\"lkKw=" + esc(kw) + "\">" + esc(kw) + " <span>" + byKw[kw].length + "</span></button>" }).join("") + "</div>" +
    "<div class=\"list lk\">" + list.slice(0, more).map(function(r, i){ var long = String(r.text).length > 160;
      return "<div class=\"it\"><span class=\"num muted\">" + (i + 1) + "</span><div class=\"it-m\"><div class=\"it-h\"><b class=\"num\">👍 " + fmt(r.likes) + "</b>" + (r.replies ? " <span class=\"muted\">💬 " + fmt(r.replies) + "</span>" : "") + " <span class=\"tag\">" + esc(r.kw) + "</span></div>" +
        (long ? "<details><summary>" + esc(String(r.text).slice(0, 160)) + "…</summary><div class=\"pre\">" + esc(r.text) + "</div></details>" : "<div class=\"pre\">" + esc(r.text) + "</div>") +
        "<div class=\"it-d lk-t\"><a href=\"https://www.youtube.com/watch?v=" + esc(r.vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.vid) + "</a> · " + esc(r.channel || "") + (r.at ? " · " + esc(r.at) : "") + "</div></div></div>" }).join("") + "</div>" +
    (list.length > more ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"lkMore=" + (more + 30) + "\">더 보기 (" + (list.length - more) + "개)</button></div>" : "") + "</section>";
  return h;
}
