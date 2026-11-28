/* ── 콘텐츠 › 💬 공감 댓글 — 키워드로 찾은 영상들의 댓글을 공감(좋아요) 많은 순으로 ──
   2026-11-28 동욱: "순수하게 키워드에서 뽑은 콘텐츠에서 댓글로 공감을 가장 많이 받은 게 뭔지 정리해서 뽑아 주는 칸.
   구독자 수 대비 조회수 이런 거 상관없이. 키워드로 뽑은 콘텐츠에서 공감순을 가장 많이 받은 댓글을 찾는 거야".
   영상 = part("search")(키워드로 찾은 콘텐츠), 댓글 = part("cmts")(영상마다 좋아요 많은 5개 — 맥 content_app.py cmts --search 가
   콘텐츠 검색이 끝나면 저절로 받음). 줄 세우기는 댓글 좋아요 수 하나뿐 — 영상 점수·구독자·조회수는 보지 않는다.
   맥 쪽 같은 규칙: content_app.py liked(에이전트·자동 진행이 씀) — 규칙을 바꾸면 둘 다.
   댓글 → 대본 (2026-11-28 동욱 "댓글 아이디어로 대본 만들기 버튼 … 이 모든 작용은 에이전트로 자동화될 수 있게"):
   ＋로 고른 댓글(ct.set lkPick) → 맥 cmd ideas / script (params.comments) · 🚀 = autoReq route "liked"(공감 댓글 → 아이디어 → 대본, 맥이 liked 순위에서 직접 고름).
   앱 밖에서는 `content_app.py auto-start <브랜드> liked [편 수]` 로 같은 흐름. */
/* kw 를 주면 그 키워드로 찾은 영상만 — 같은 글은 그 범위 안에서 한 번. 전체에서 한 번만 남긴 뒤 키워드로 나누면 여러 키워드에 걸린 영상 댓글이
   첫 키워드에만 들어갔다 (2026-11-28 검증: 휴대폰사진인화 1위가 👍 9 · 실제 1,412) */
function likedRows(kw){
  var sr = ((part("search") || {}).items) || [], cm = ((part("cmts") || {}).items) || {}, seen = {}, out = [];
  sr.forEach(function(v){
    if(ui.lkRel && !vidRelOf(v)) return;
    if(kw != null && v.kw !== kw) return;   // 그 키워드로 찾은 영상만
    ((cm[v.vid] || {}).comments || []).forEach(function(c){
      var key = String(c.text || "").replace(/\s+/g, " ").trim(); if(!key || seen[key]) return; seen[key] = 1;
      out.push({ text: c.text, likes: c.likes || 0, replies: c.replies || 0, at: c.at, vid: v.vid, title: v.title, channel: v.channel, kw: v.kw });
    });
  });
  return out.sort(function(a, b){ return b.likes - a.likes });
}
function lkKey(r){ return r.vid + ":" + String(r.text).replace(/\s+/g, " ").slice(0, 40) }
function lkPicks(){ return (SETS[cur] || {}).lkPick || {} }
function lkPickList(){ var pk = lkPicks(); return Object.keys(pk).map(function(k){ return pk[k] }).sort(function(a, b){ return (a.at || 0) - (b.at || 0) }) }   // 고른 순서대로 (저장소가 키 순서를 바꾼다)
function likedCount(){ return likedRows().length }
function likedBusy(){ var r = (SETS[cur] || {}).cmtReq, d = part("cmts"); return !!(r && r.what === "search" && (!d || Date.parse(d.updatedAt) < Date.parse(r.at) - 5000)) }
function likedHtml(){
  var sr = ((part("search") || {}).items) || [], cm = ((part("cmts") || {}).items) || {};
  if(!sr.length) return "<section class=\"card\"><p class=\"empty\">아직 키워드로 찾은 콘텐츠가 없어요. 키워드 탭에서 ★ 키워드로 「콘텐츠 검색」을 먼저 돌리면, 찾은 영상마다 공감 많은 댓글을 맥이 받아 와요.</p></section>";
  var all = likedRows(), kws = [], byKw = {};
  sr.forEach(function(v){ if(byKw[v.kw] || (ui.lkRel && !vidRelOf(v))) return; byKw[v.kw] = likedRows(v.kw); kws.push(v.kw) });   // 키워드마다 따로 센다 · 댓글 0개 키워드도 남긴다
  var k = ui.lkKw !== "" && ui.lkKw != null && byKw[String(ui.lkKw)] ? String(ui.lkKw) : "", list = k ? byKw[k] : all, more = ui.lkMore || 30;
  var got = sr.filter(function(v){ return cm[v.vid] && !cm[v.vid].error }).length, off = sr.filter(function(v){ return cm[v.vid] && cm[v.vid].error }).length, wait = sr.length - got - off, busy = likedBusy();
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>💬 공감 댓글</h3><span class=\"n\">댓글 " + all.length + "개 · 댓글 받은 영상 " + got + "/" + sr.length + "</span></div>" +
    "<p class=\"lead\">키워드로 찾은 영상들의 댓글을 <b>공감(좋아요) 많은 순</b>으로만 — 구독자·조회수는 보지 않아요. 영상마다 좋아요 많은 5개를 모았어요.</p>" +
    "<div class=\"acts\"><button class=\"chip" + (ui.lkRel ? " on" : "") + "\" data-ui=\"lkRel=" + !ui.lkRel + "\" title=\"제목·설명에 키워드가 든 영상의 댓글만\">" + (ui.lkRel ? "✓ " : "") + "키워드와 맞는 영상만</button><button class=\"btn sm\" data-act=\"likedreq\"" + (busy ? " disabled" : "") + ">" + (busy ? "맥이 댓글 받는 중…" : wait ? "안 받은 영상 " + wait + "개 댓글 받기" : "댓글 다시 받기") + "</button>" +
    (off ? "<span class=\"lead\" style=\"margin:0\">댓글 막힘 · 못 받음 " + off + "개</span>" : "") + "</div></section>";
  if(!all.length) return h + "<section class=\"card\"><p class=\"empty\">" + (busy ? "맥이 댓글을 받는 중이에요 — 1~2분 걸려요." : "아직 받은 댓글이 없어요. 위 버튼을 누르면 맥이 받아 와요.") + "</p></section>";
  /* 정리 — 키워드마다 공감 1위 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>키워드마다 공감 1위</h3><span class=\"n\">" + kws.length + "개 키워드</span></div><div class=\"list\">" +
    kws.slice().sort(function(a, b){ return ((byKw[b][0] || {}).likes || -1) - ((byKw[a][0] || {}).likes || -1) }).map(function(kw){ var r = byKw[kw][0];
      if(!r){ var vs = sr.filter(function(v){ return v.kw === kw }), nNo = vs.filter(function(v){ return !cm[v.vid] }).length, nOff = vs.filter(function(v){ return cm[v.vid] && cm[v.vid].error }).length;   // 0개인 까닭을 나눈다: 아직 안 받음 · 막힘 · 받았는데 0개 (2026-11-28 검증)
        return "<div class=\"it\"><span class=\"num muted\">—</span><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag\">" + esc(kw) + "</span> <span class=\"muted\">" + (nNo ? "영상 " + nNo + "개 댓글을 아직 안 받았어요 — 위 「댓글 받기」" : nOff ? "댓글이 막힌 영상이에요" : "찾은 영상 " + vs.length + "개에 댓글이 없어요") + "</span></div></div></div>" }
      return "<div class=\"it\"><span class=\"num\">👍 " + fmt(r.likes) + "</span><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag\">" + esc(kw) + "</span> " + esc(String(r.text).replace(/\s+/g, " ").slice(0, 90)) + (String(r.text).length > 90 ? "…" : "") + "</div>" +
        "<div class=\"it-d lk-t\"><a href=\"https://www.youtube.com/watch?v=" + esc(r.vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.vid) + "</a></div></div>" +
        "<button class=\"btn sm\" data-act=\"lkkw\" data-kw=\"" + esc(kw) + "\">이 키워드 " + byKw[kw].length + "개 →</button></div>" }).join("") + "</div></section>";
  h += likedToScriptHtml();   // 1위 정리 다음 — 폰 첫 화면에 정리가 먼저 (2026-11-28 검증)
  /* 전체 순위 — 키워드로 거르기 */
  h += "<section class=\"card\" id=\"lk-rank\"><div class=\"card-h\"><h3>공감 순위" + (k ? " · 「" + esc(k) + "」" : "") + "</h3><span class=\"n\">" + list.length + "개</span></div>" +
    "<div class=\"chips\"><button class=\"chip" + (k ? "" : " on") + "\" data-ui=\"lkKw=\">전체 <span>" + all.length + "</span></button>" +
    kws.filter(function(kw){ return byKw[kw].length }).map(function(kw){ return "<button class=\"chip" + (k === kw ? " on" : "") + "\" data-ui=\"lkKw=" + esc(kw) + "\">" + esc(kw) + " <span>" + byKw[kw].length + "</span></button>" }).join("") + "</div>" +
    "<div class=\"list lk\">" + list.slice(0, more).map(function(r, i){ var long = String(r.text).length > 160;
      return "<div class=\"it\"><span class=\"num muted\">" + (i + 1) + "</span><div class=\"it-m\"><div class=\"it-h\"><b class=\"num\">👍 " + fmt(r.likes) + "</b>" + (r.replies ? " <span class=\"muted\">↩ 답글 " + fmt(r.replies) + "</span>" : "") + " <span class=\"tag\">" + esc(r.kw) + "</span></div>" +
        (long ? "<details><summary>" + esc(String(r.text).slice(0, 160)) + "…</summary><div class=\"pre\">" + esc(r.text) + "</div></details>" : "<div class=\"pre\">" + esc(r.text) + "</div>") +
        "<div class=\"it-d lk-t\"><a href=\"https://www.youtube.com/watch?v=" + esc(r.vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.vid) + "</a> · " + esc(r.channel || "") + (r.at ? " · 댓글 " + esc(r.at) : "") + "</div></div>" +
        "<button class=\"mk\" data-act=\"lkpick\" data-k=\"" + esc(lkKey(r)) + "\" aria-pressed=\"" + !!lkPicks()[lkKey(r)] + "\" title=\"대본 재료로 고르기\" aria-label=\"대본 재료로 고르기\">＋</button></div>" }).join("") + "</div>" +
    (list.length > more ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"lkMore=" + (more + 30) + "\">더 보기 (" + (list.length - more) + "개)</button></div>" : "") + "</section>";
  return h;
}

/* 댓글 → 대본 — 고른 댓글로 아이디어·대본, 또는 🚀 맥이 공감 순위에서 골라 대본까지 */
function likedToScriptHtml(){
  var pk = lkPickList(), a = autoState(), st = a.st, mine = st && st.route === "liked", busyS = !!openCmd("script"), busyI = !!openCmd("ideas");
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>댓글 → 대본</h3><span class=\"n\">고른 댓글 " + pk.length + "개</span></div>";
  if(pk.length) h += "<div class=\"list\">" + pk.map(function(r){ return "<div class=\"it\"><span class=\"num\">👍 " + fmt(r.likes) + "</span><div class=\"it-m\">" + esc(String(r.text).replace(/\s+/g, " ").slice(0, 160)) + (String(r.text).length > 160 ? "…" : "") + "</div><button class=\"mk no\" data-act=\"lkpick\" data-k=\"" + esc(lkKey(r)) + "\" aria-label=\"빼기\">✕</button></div>" }).join("") + "</div>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"lkscript\"" + (busyS ? " disabled" : "") + ">✍️ 고른 " + pk.length + "개로 대본 초안</button><button class=\"btn\" data-act=\"lkideas\"" + (busyI ? " disabled" : "") + ">💡 아이디어만 뽑기</button><button class=\"btn sm\" data-act=\"lkclear\">고르기 풀기</button></div>";
  else h += "<p class=\"lead\">아래 순위에서 ＋로 댓글을 고르면 그 댓글로 대본 초안(대본 탭)이나 💡 아이디어를 만들어요. 고르기 귀찮으면 🚀 — 맥이 공감 순위에서 이 브랜드에 맞는 댓글을 골라 대본까지 만들고 보고해요.</p>";
  if(mine) h += "<p class=\"note\">🚀 공감 댓글 자동 진행 · " + esc(st.status || "") + "</p>" + autoStepsHtml(st) + (st.report ? "<div class=\"pre\">" + txt(st.report) + "</div>" : "");
  return h + nextBar("공감 댓글에서 바로 대본으로", [1, 2, 3].map(function(n){ return ["🚀 공감 상위에서 " + n + "편 자동", "data-act=\"lkauto\" data-n=\"" + n + "\"", a.running] })) + "</section>";
}
function likedAct(name, el){
  if(name === "lkpick"){ var k = el.dataset.k, pk = Object.assign({}, lkPicks());
    if(pk[k]) delete pk[k]; else { var r = likedRows().filter(function(x){ return lkKey(x) === k })[0] || lkPickList().filter(function(x){ return lkKey(x) === k })[0]; if(!r) return true; pk[k] = { text: String(r.text).slice(0, 600), likes: r.likes, vid: r.vid, title: r.title, kw: r.kw, at: Date.now() } }
    setS({ lkPick: pk }); var nn = Object.keys(pk).length; toast(nn ? "댓글 " + nn + "개 골랐어요 — 위 「댓글 → 대본」에서 대본 만들기" : "고른 댓글을 뺐어요"); return true }   // 아래 순위에서 고르면 칸이 화면 밖이라 알림으로 (2026-11-28 써 보기)
  if(name === "lkkw"){ ui.lkKw = el.dataset.kw; ui.lkMore = 30; render(); var rk = document.getElementById("lk-rank"); if(rk){ var hd = document.querySelector("header"); window.scrollTo(0, rk.getBoundingClientRect().top + window.scrollY - (hd ? hd.getBoundingClientRect().bottom : 0) - 8) } return true }   // 그 키워드 순위로 내려 준다 (2026-11-28 검증: 눌러도 화면 밖)
  if(name === "lkclear"){ setS({ lkPick: {} }); return true }
  if(name === "lkideas" || name === "lkscript"){ var cs = lkPickList(); if(!cs.length) return true;
    send(name === "lkscript" ? "script" : "ideas", (name === "lkscript" ? "공감 댓글로 대본 초안 — 댓글 " : "공감 댓글에서 아이디어 뽑기 — 댓글 ") + cs.length + "개", { comments: cs });
    setS({ lkPick: {} }); toast(name === "lkscript" ? "맥에 보냈어요 — 대본은 대본 탭에 생겨요" : "맥에 보냈어요 — 아이디어는 「💡 아이디어」 칸에"); return true }
  if(name === "lkauto"){ var n = +el.dataset.n || 1; if(autoState().running) return true; if(pastOn()){ toast(PAST_BLOCK); return true }
    if(!confirm("🚀 공감 댓글 자동 진행 — 맥이 공감 순위(키워드와 맞는 영상의 댓글)에서 이 브랜드에 맞는 댓글 " + n + "개를 골라 아이디어 → 대본 초안까지 만들고 보고해요. 시작할까요?")) return true;
    setS({ autoReq: { at: new Date().toISOString(), route: "liked", upto: "script", n: n, params: baseParams() } }); return true }
  return false;
}
