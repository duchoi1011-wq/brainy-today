/* ── 콘텐츠 › 💬 댓글 칸 — 키워드로 찾은 영상들의 댓글을 공감(좋아요) 순으로, 맥락·뜻·내 채널과 맞나까지 ──
   2026-11-28 동욱: "순수하게 키워드에서 뽑은 콘텐츠에서 댓글로 공감을 가장 많이 받은 게 뭔지 정리해서 뽑아 주는 칸. 구독자 수 대비 조회수 이런 거 상관없이",
   "콘텐츠 내에서 / 콘텐츠와 댓글 이렇게 칸을 나눠서 분석", "댓글만 보니 어떤 맥락인지 이해가 안 가. 영상의 맥락과 댓글의 의미가 뭔지도 기록되게",
   "내 채널 맥락과 맞게 너가 추천해 주는 버튼 · 바로 댓글로 콘텐츠 기획을 만드는 칸", "댓글 아이디어로 대본 만들기 … 이 모든 작용은 에이전트로 자동화될 수 있게".
   영상 = part("search"), 댓글 = part("cmts")(영상마다 좋아요 많은 5개), 풀이 = part("cmtx")(맥 Claude cmd cmtx — 영상 맥락 · 댓글 뜻 · fit 높음/보통/낮음 · why · angle).
   줄 세우기는 댓글 좋아요 수 하나뿐. 맥 쪽 같은 규칙: content_app.py liked · cmtx-todo · cmtx-put (에이전트·자동 진행이 씀) — 규칙·key 를 바꾸면 둘 다.
   ＋로 고른 댓글(ct.set lkPick) → 맥 cmd build(콘텐츠 기획 = 구축 문서) / script / ideas (params.comments) · 🚀 = autoReq route "liked".
   앱 밖에서는 `content_app.py auto-start <브랜드> liked [편 수]` · `cmtx-send <브랜드>` 로 같은 흐름. */
function lkKey(r){ return r.vid + ":" + Array.from(String(r.text).replace(/\s+/g, " ")).slice(0, 40).join("") }   // 맥 content_app.py cmt_key 와 같은 규칙 — 글자(코드포인트) 40개. slice 는 UTF-16 단위라 이모지 든 댓글 키가 달라 풀이가 안 붙었다 (2026-11-28 검증)
function cmtxOf(r){ var cx = part("cmtx") || {}; return { ctx: (((cx.videos || {})[r.vid]) || {}).ctx || "", ann: ((cx.comments || {})[lkKey(r)]) || null } }
/* kw 를 주면 그 키워드로 찾은 영상만 — 같은 글은 그 범위 안에서 한 번 (전체에서 한 번만 남긴 뒤 나누면 여러 키워드에 걸린 영상 댓글이 첫 키워드에만 갔다, 11-28 검증) */
function likedRows(kw){
  var sr = ((part("search") || {}).items) || [], cm = ((part("cmts") || {}).items) || {}, seen = {}, out = [];
  sr.forEach(function(v){
    if(ui.lkRel && !vidRelOf(v)) return;   // 「키워드와 맞는 영상만」 — 제목·설명에 키워드가 든 영상
    if(kw != null && v.kw !== kw) return;   // 그 키워드로 찾은 영상만
    ((cm[v.vid] || {}).comments || []).forEach(function(c){
      var key = String(c.text || "").replace(/\s+/g, " ").trim(); if(!key || seen[key]) return; seen[key] = 1;
      var r = { text: c.text, likes: c.likes || 0, replies: c.replies || 0, at: c.at, vid: v.vid, title: v.title, channel: v.channel, kw: v.kw };
      if(ui.lkFit && ((cmtxOf(r).ann || {}).fit !== "높음")) return;   // 「🎯 내 채널에 맞는 것만」
      out.push(r);
    });
  });
  return out.sort(function(a, b){ return b.likes - a.likes });
}
function lkPicks(){ return (SETS[cur] || {}).lkPick || {} }
function lkPickList(){ var pk = lkPicks(); return Object.keys(pk).map(function(k){ return pk[k] }).sort(function(a, b){ return (a.at || 0) - (b.at || 0) }) }   // 고른 순서대로 (저장소가 키 순서를 바꾼다)
function likedCount(){ return likedRows().length }
function likedBusy(){ var r = (SETS[cur] || {}).cmtReq, d = part("cmts"); return !!(r && r.what === "search" && (!d || Date.parse(d.updatedAt) < Date.parse(r.at) - 5000)) }
/* 안 푼 댓글 수 — 맥 cmtx-todo 와 같은 범위(공감 상위 40 + 키워드마다 5) */
function cmtxTodo(){
  var rel = ui.lkRel, fit = ui.lkFit; ui.lkRel = ui.lkFit = false;   // 거르기와 상관없이 맥과 같은 범위
  var pick = likedRows().slice(0, 40), kws = {}, seen = {}, n = 0;
  (((part("search") || {}).items) || []).forEach(function(v){ if(kws[v.kw]) return; kws[v.kw] = 1; pick = pick.concat(likedRows(v.kw).slice(0, 5)) });   // 키워드마다 따로 센 상위 5 (맥 cmtx_todo 와 같게, 11-28 검증)
  ui.lkRel = rel; ui.lkFit = fit;
  pick.forEach(function(r){ var k = lkKey(r); if(seen[k]) return; seen[k] = 1; if(!cmtxOf(r).ann) n++ });
  return n;
}
/* 의도 제목 — 이 댓글이 무엇을 말하려는지 제목만 봐도 보이게 (2026-11-28 동욱 "어떤 의도인지가 제목으로 먼저 드러났으면. 그 제목만 봐도 이런 의미라는 게 보이도록").
   맥 풀이의 head(짧은 제목), 아직 없으면 뜻(mean) 한 줄, 풀이가 없으면 null — 그때는 원문이 제목 자리 */
function cmtHead(r){ var a = cmtxOf(r).ann; return a ? (a.head || a.mean || null) : null }
/* 댓글 한 줄 — 의도 제목 · 공감 수 · 키워드 · 원문 · 영상 맥락 · 뜻 · 내 채널과 맞나 */
function cmtRowHtml(r, i, opt){
  var x = cmtxOf(r), a = x.ann, hd = cmtHead(r), long = String(r.text).length > 160, fitCls = a ? (a.fit === "높음" ? " ok" : a.fit === "낮음" ? "" : " p") : "";
  return "<div class=\"it\">" + (i != null ? "<span class=\"num muted\">" + (i + 1) + "</span>" : "") + "<div class=\"it-m\">" + (hd ? "<div class=\"cmt-head\">" + esc(hd) + "</div>" : "") + "<div class=\"it-h\"><b class=\"num\">👍 " + fmt(r.likes) + "</b>" + (r.replies ? " <span class=\"muted\">↩ 답글 " + fmt(r.replies) + "</span>" : "") + " <span class=\"tag\">" + esc(r.kw) + "</span>" +
      (a && a.fit ? " <span class=\"tag" + fitCls + "\" title=\"" + esc(a.why || "") + "\">🎯 내 채널 " + esc(a.fit) + "</span>" : "") + "</div>" +
    (long ? "<details><summary>" + esc(String(r.text).slice(0, 160)) + "…</summary><div class=\"pre" + (hd ? " cmt-orig" : "") + "\">" + esc(r.text) + "</div></details>" : "<div class=\"pre" + (hd ? " cmt-orig" : "") + "\">" + esc(r.text) + "</div>") +
    (x.ctx || a ? "<div class=\"cmtx\">" + (x.ctx ? "<div><b>🎬 영상 맥락</b> " + esc(x.ctx) + "</div>" : "") + (a && a.mean && a.mean !== hd ? "<div><b>💭 뜻</b> " + esc(a.mean) + "</div>" : "") +
      (a && a.why ? "<div><b>🎯 왜</b> " + esc(a.why) + "</div>" : "") + (a && a.angle ? "<div><b>📋 찍을 것</b> " + esc(a.angle) + "</div>" : "") + "</div>" : "") +
    "<div class=\"it-d lk-t\"><a href=\"https://www.youtube.com/watch?v=" + esc(r.vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.vid) + "</a> · " + esc(r.channel || "") + (r.at ? " · 댓글 " + esc(r.at) : "") + "</div></div>" +
    ((opt || {}).plan ? "<button class=\"btn sm\" data-act=\"lkplan1\" data-k=\"" + esc(lkKey(r)) + "\"" + (openCmd("build") ? " disabled" : "") + ">📋 이걸로 기획</button>" : "") +
    "<button class=\"mk\" data-act=\"lkpick\" data-k=\"" + esc(lkKey(r)) + "\" aria-pressed=\"" + !!lkPicks()[lkKey(r)] + "\" title=\"기획·대본 재료로 고르기\" aria-label=\"기획·대본 재료로 고르기\">＋</button></div>";
}
function viewCmt(){
  if(!B()) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var sr = ((part("search") || {}).items) || [], cm = ((part("cmts") || {}).items) || {};
  if(!sr.length) return "<section class=\"card\"><p class=\"empty\">아직 키워드로 찾은 콘텐츠가 없어요. 키워드 탭에서 ★ 키워드로 「콘텐츠 검색」을 먼저 돌리면, 찾은 영상마다 공감 많은 댓글을 맥이 받아 와요.</p></section>";
  var all = likedRows(), kws = [], byKw = {};
  sr.forEach(function(v){ if(byKw[v.kw] || (ui.lkRel && !vidRelOf(v))) return; byKw[v.kw] = likedRows(v.kw); kws.push(v.kw) });   // 키워드마다 따로 센다 · 댓글 0개 키워드도 남긴다
  var k = ui.lkKw !== "" && ui.lkKw != null && byKw[String(ui.lkKw)] ? String(ui.lkKw) : "", list = k ? byKw[k] : all, more = ui.lkMore || 30;
  var got = sr.filter(function(v){ return cm[v.vid] && !cm[v.vid].error }).length, off = sr.filter(function(v){ return cm[v.vid] && cm[v.vid].error }).length, wait = sr.length - got - off, busy = likedBusy();
  var todo = cmtxTodo(), xBusy = !!openCmd("cmtx"), nFit = all.filter(function(r){ return (cmtxOf(r).ann || {}).fit === "높음" }).length;
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>💬 댓글</h3><span class=\"n\">댓글 " + all.length + "개 · 댓글 받은 영상 " + got + "/" + sr.length + "</span></div>" +
    "<p class=\"lead\">키워드로 찾은 영상들의 댓글을 <b>공감(좋아요) 많은 순</b>으로만 — 구독자·조회수는 보지 않아요. 맥이 댓글마다 <b>영상 맥락 · 뜻 · 내 채널과 맞나</b>를 풀어 붙여요.</p>" +
    "<div class=\"acts\"><button class=\"chip" + (ui.lkRel ? " on" : "") + "\" data-ui=\"lkRel=" + !ui.lkRel + "\" title=\"제목·설명에 키워드가 든 영상의 댓글만\">" + (ui.lkRel ? "✓ " : "") + "키워드와 맞는 영상만</button>" +
    "<button class=\"chip" + (ui.lkFit ? " on" : "") + "\" data-ui=\"lkFit=" + !ui.lkFit + "\" title=\"맥이 내 채널과 맞음 「높음」으로 본 댓글만\">" + (ui.lkFit ? "✓ " : "") + "🎯 내 채널에 맞는 것만</button>" +
    "<button class=\"btn sm\" data-act=\"cmtxreq\"" + (xBusy || !todo ? " disabled" : "") + ">" + (xBusy ? "맥이 맥락·뜻 푸는 중…" : todo ? "🧠 맥락·뜻 풀고 내 채널 추천받기 (" + todo + "개)" : "🧠 다 풀었어요") + "</button>" +
    "<button class=\"btn sm\" data-act=\"likedreq\"" + (busy ? " disabled" : "") + ">" + (busy ? "맥이 댓글 받는 중…" : wait ? "안 받은 영상 " + wait + "개 댓글 받기" : "댓글 다시 받기") + "</button>" +
    (off ? "<span class=\"lead\" style=\"margin:0\">댓글 막힘 · 못 받음 " + off + "개</span>" : "") + "</div></section>";
  if(!all.length) return h + "<section class=\"card\"><p class=\"empty\">" + (ui.lkFit ? "아직 「내 채널에 맞음 높음」으로 푼 댓글이 없어요 — 🧠 버튼으로 맥에 맡기세요." : busy ? "맥이 댓글을 받는 중이에요 — 1~2분 걸려요." : "아직 받은 댓글이 없어요. 위 버튼을 누르면 맥이 받아 와요.") + "</p></section>";
  /* 🎯 내 채널에 맞는 댓글 추천 — 맥 풀이의 fit 높음, 공감 순 */
  var fit = all.filter(function(r){ return (cmtxOf(r).ann || {}).fit === "높음" });
  h += "<section class=\"card\"><div class=\"card-h\"><h3>🎯 내 채널에 맞는 댓글 추천</h3><span class=\"n\">" + nFit + "개</span></div>" +
    (fit.length ? "<p class=\"lead\">맥이 " + esc(B().name) + "의 정체성 · 상품 · 타깃에 비춰 「맞음 높음」으로 본 댓글이에요. 「📋 이걸로 기획」을 누르면 그 댓글로 콘텐츠 기획(구축 문서)을 바로 만들어요.</p><div class=\"list\">" +
      fit.slice(0, ui.lkFitMore || 5).map(function(r){ return cmtRowHtml(r, null, { plan: true }) }).join("") + "</div>" +
      (fit.length > (ui.lkFitMore || 5) ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"lkFitMore=" + ((ui.lkFitMore || 5) + 10) + "\">더 보기 (" + (fit.length - (ui.lkFitMore || 5)) + "개)</button></div>" : "")
      : "<p class=\"empty\">" + (xBusy ? "맥이 맥락·뜻을 푸는 중이에요 — 몇 분 걸려요." : "아직 풀지 않았어요. 위 「🧠 맥락·뜻 풀고 내 채널 추천받기」를 누르면 맥이 골라 줘요.") + "</p>") + "</section>";
  /* 정리 — 키워드마다 공감 1위 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>키워드마다 공감 1위</h3><span class=\"n\">" + kws.length + "개 키워드</span></div><div class=\"list\">" +
    kws.slice().sort(function(a, b){ return ((byKw[b][0] || {}).likes || -1) - ((byKw[a][0] || {}).likes || -1) }).map(function(kw){ var r = byKw[kw][0];
      if(!r){ var vs = sr.filter(function(v){ return v.kw === kw }), nNo = vs.filter(function(v){ return !cm[v.vid] }).length, nOff = vs.filter(function(v){ return cm[v.vid] && cm[v.vid].error }).length;   // 0개인 까닭: 아직 안 받음 · 막힘 · 받았는데 0개
        return "<div class=\"it\"><span class=\"num muted\">—</span><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag\">" + esc(kw) + "</span> <span class=\"muted\">" + (ui.lkFit ? "내 채널에 맞는 댓글이 없어요" : nNo ? "영상 " + nNo + "개 댓글을 아직 안 받았어요 — 위 「댓글 받기」" : nOff ? "댓글이 막힌 영상이에요" : "찾은 영상 " + vs.length + "개에 댓글이 없어요") + "</span></div></div></div>" }
      var hd1 = cmtHead(r);
      return "<div class=\"it\"><span class=\"num\">👍 " + fmt(r.likes) + "</span><div class=\"it-m\"><div class=\"it-h\"><span class=\"tag\">" + esc(kw) + "</span> " + (hd1 ? "<b>" + esc(hd1) + "</b>" : esc(String(r.text).replace(/\s+/g, " ").slice(0, 90)) + (String(r.text).length > 90 ? "…" : "")) + "</div>" +
        (hd1 ? "<div class=\"it-d\">「" + esc(String(r.text).replace(/\s+/g, " ").slice(0, 70)) + (String(r.text).length > 70 ? "…" : "") + "」</div>" : "") +
        "<div class=\"it-d lk-t\"><a href=\"https://www.youtube.com/watch?v=" + esc(r.vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.vid) + "</a></div></div>" +
        "<button class=\"btn sm\" data-act=\"lkkw\" data-kw=\"" + esc(kw) + "\">이 키워드 " + byKw[kw].length + "개 →</button></div>" }).join("") + "</div></section>";
  h += likedToScriptHtml();
  /* 전체 순위 — 키워드로 거르기 */
  h += "<section class=\"card\" id=\"lk-rank\"><div class=\"card-h\"><h3>공감 순위" + (k ? " · 「" + esc(k) + "」" : "") + "</h3><span class=\"n\">" + list.length + "개</span></div>" +
    "<div class=\"chips\"><button class=\"chip" + (k ? "" : " on") + "\" data-ui=\"lkKw=\">전체 <span>" + all.length + "</span></button>" +
    kws.filter(function(kw){ return byKw[kw].length }).map(function(kw){ return "<button class=\"chip" + (k === kw ? " on" : "") + "\" data-ui=\"lkKw=" + esc(kw) + "\">" + esc(kw) + " <span>" + byKw[kw].length + "</span></button>" }).join("") + "</div>" +
    "<div class=\"list lk\">" + list.slice(0, more).map(function(r, i){ return cmtRowHtml(r, i) }).join("") + "</div>" +
    (list.length > more ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"lkMore=" + (more + 30) + "\">더 보기 (" + (list.length - more) + "개)</button></div>" : "") + "</section>";
  return h;
}

/* 댓글로 기획·대본 — 고른 댓글로 콘텐츠 기획(구축 문서)·대본·아이디어, 또는 🚀 맥이 공감 순위에서 골라 대본까지 */
function likedToScriptHtml(){
  var pk = lkPickList(), a = autoState(), st = a.st, mine = st && st.route === "liked", busyB = !!openCmd("build"), busyS = !!openCmd("script"), busyI = !!openCmd("ideas");
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>댓글로 기획 · 대본</h3><span class=\"n\">고른 댓글 " + pk.length + "개</span></div>";
  if(pk.length) h += "<div class=\"list\">" + pk.map(function(r){ return "<div class=\"it\"><span class=\"num\">👍 " + fmt(r.likes) + "</span><div class=\"it-m\">" + (cmtHead(r) ? "<b>" + esc(cmtHead(r)) + "</b><div class=\"it-d\">" : "") + esc(String(r.text).replace(/\s+/g, " ").slice(0, 160)) + (String(r.text).length > 160 ? "…" : "") + (cmtHead(r) ? "</div>" : "") + "</div><button class=\"mk no\" data-act=\"lkpick\" data-k=\"" + esc(lkKey(r)) + "\" aria-label=\"빼기\">✕</button></div>" }).join("") + "</div>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"lkplan\"" + (busyB ? " disabled" : "") + ">📋 고른 " + pk.length + "개로 콘텐츠 기획</button><button class=\"btn\" data-act=\"lkscript\"" + (busyS ? " disabled" : "") + ">✍️ 대본 초안</button><button class=\"btn\" data-act=\"lkideas\"" + (busyI ? " disabled" : "") + ">💡 아이디어만</button><button class=\"btn sm\" data-act=\"lkclear\">고르기 풀기</button></div>";
  else h += "<p class=\"lead\">댓글 줄의 ＋로 고르면 그 댓글로 <b>콘텐츠 기획</b>(대본 탭 「구축」 문서) · 대본 초안 · 💡 아이디어를 만들어요. 고르기 귀찮으면 🚀 — 맥이 「내 채널에 맞음」 댓글부터 골라 대본까지 만들고 보고해요.</p>";
  if(mine) h += "<p class=\"note\">🚀 공감 댓글 자동 진행 · " + esc(st.status || "") + "</p>" + autoStepsHtml(st) + (st.report ? "<div class=\"pre\">" + txt(st.report) + "</div>" : "");
  return h + nextBar("공감 댓글에서 바로 대본으로", [1, 2, 3].map(function(n){ return ["🚀 공감 상위에서 " + n + "편 자동", "data-act=\"lkauto\" data-n=\"" + n + "\"", a.running] })) + "</section>";
}
function lkFind(k){ return likedRows().filter(function(x){ return lkKey(x) === k })[0] || lkPickList().filter(function(x){ return lkKey(x) === k })[0] }
function lkWithCtx(r){ var x = cmtxOf(r); return { text: String(r.text).slice(0, 600), likes: r.likes, vid: r.vid, title: r.title, kw: r.kw, ctx: x.ctx || "", head: (x.ann || {}).head || "", mean: (x.ann || {}).mean || "", angle: (x.ann || {}).angle || "" } }   // 맥에 보낼 때 풀이도 같이
function likedAct(name, el){
  if(name === "lkpick"){ var k = el.dataset.k, pk = Object.assign({}, lkPicks());
    if(pk[k]) delete pk[k]; else { var r = lkFind(k); if(!r) return true; pk[k] = Object.assign(lkWithCtx(r), { at: Date.now() }) }
    setS({ lkPick: pk }); var nn = Object.keys(pk).length; toast(nn ? "댓글 " + nn + "개 골랐어요 — 「댓글로 기획 · 대본」에서 만들기" : "고른 댓글을 뺐어요"); return true }   // 고르는 줄과 만드는 칸이 떨어져 있어 알림으로
  if(name === "lkkw"){ ui.lkKw = el.dataset.kw; ui.lkMore = 30; render(); var rk = document.getElementById("lk-rank"); if(rk){ var hd = document.querySelector("header"); window.scrollTo(0, rk.getBoundingClientRect().top + window.scrollY - (hd ? hd.getBoundingClientRect().bottom : 0) - 8) } return true }   // 그 키워드 순위로 내려 준다
  if(name === "lkclear"){ setS({ lkPick: {} }); return true }
  if(name === "cmtxreq"){ send("cmtx", "댓글 풀이(영상 맥락 · 댓글 뜻 · 내 채널과 맞나) — " + cmtxTodo() + "개", {}); toast("맥에 보냈어요 — 몇 분 뒤 댓글마다 맥락·뜻과 🎯 추천이 붙어요"); return true }
  if(name === "lkplan1"){ var r1 = lkFind(el.dataset.k); if(!r1) return true; send("build", "공감 댓글로 콘텐츠 기획 — 「" + String(r1.text).replace(/\s+/g, " ").slice(0, 30) + "」", { comments: [lkWithCtx(r1)] }); toast("맥에 보냈어요 — 기획은 대본 탭 「구축」에 생겨요"); return true }
  if(name === "lkplan" || name === "lkideas" || name === "lkscript"){ var cs = lkPickList(); if(!cs.length) return true;
    var kind = { lkplan: "build", lkscript: "script", lkideas: "ideas" }[name], what = { lkplan: "콘텐츠 기획", lkscript: "대본 초안", lkideas: "아이디어 뽑기" }[name];
    send(kind, "공감 댓글로 " + what + " — 댓글 " + cs.length + "개", { comments: cs });
    setS({ lkPick: {} }); toast("맥에 보냈어요 — " + { lkplan: "기획은 대본 탭 「구축」에", lkscript: "대본은 대본 탭에", lkideas: "아이디어는 콘텐츠 「💡 아이디어」에" }[name] + " 생겨요"); return true }
  if(name === "lkauto"){ var n = +el.dataset.n || 1; if(autoState().running) return true; if(pastOn()){ toast(PAST_BLOCK); return true }
    if(!confirm("🚀 공감 댓글 자동 진행 — 맥이 공감 순위(키워드와 맞는 영상의 댓글, 「내 채널에 맞음」 먼저)에서 이 브랜드에 맞는 댓글 " + n + "개를 골라 아이디어 → 대본 초안까지 만들고 보고해요. 시작할까요?")) return true;
    setS({ autoReq: { at: new Date().toISOString(), route: "liked", upto: "script", n: n, params: baseParams() } }); return true }
  return false;
}
