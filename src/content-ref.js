/* ── 콘텐츠 탭 — 잘 되는 콘텐츠 — 레퍼런스 영상 · 레퍼런스 채널 ──
   성과는 조회수 그 자체로 보지 않는다 (content-recommend §1): 조회÷구독 100배↑ 퍼짐 · 10~100 잘 나감 · 1~10 채널 크기만큼 · 1 미만 약함.
   1배 미만과 광고 집행 추정은 성과 근거로 쓰지 않는다 — 「성과 근거만」을 켜면 빠진다. */
function band(r){ return r == null ? ["확인 못 함", ""] : r >= 100 ? ["퍼짐", "ok"] : r >= 10 ? ["잘 나감", "ok"] : r >= 1 ? ["채널 크기만큼", ""] : ["약함", ""] }
function liveOf(x){ var l = part("live"); return l && l.items && x.vid ? l.items[x.vid] : null }
function koNum(s){ var m = /([\d.,]+)\s*([천만억])?/.exec(String(s || "")); return m ? parseFloat(m[1].replace(/,/g, "")) * ({ "천": 1e3, "만": 1e4, "억": 1e8 }[m[2]] || 1) : null }
function growth(x){   // 수집 때 조회수 → 지금 조회수 (늘어난 비율)
  var l = liveOf(x), was = koNum(x.views);
  return l && was ? { now: l.views, was: was, pct: Math.round((l.views - was) / was * 100) } : null;
}
/* 아웃라이어 (vidIQ) = 이 영상 지금 조회수 ÷ 그 채널 평소 조회수(최근 영상 30개 중앙값, 채널.json byId). 구독자 대비와 같이 본다 — 구독이 작아도 평소보다 얼마나 튀었는지 */
function outlier(x){
  var l = liveOf(x), c = part("chan"), ch = l && c && c.byId ? c.byId[l.channelId] : null;
  return ch && ch.median > 0 ? Math.round(l.views / ch.median * 10) / 10 : null;
}
/* 하루 조회 (vidIQ 시간당 조회의 하루 판) = 최신화 기록 마지막 두 번 사이 늘어난 조회 ÷ 날 수. 최신화를 두 번 이상 해야 나온다 */
function daily(x){
  var l = liveOf(x), h = l && l.hist;
  if(!h || h.length < 2) return null;
  var a = h[h.length - 2], b = h[h.length - 1], days = Math.max(1, Math.round((Date.parse(b[0]) - Date.parse(a[0])) / 86400000));
  return Math.round((b[1] - a[1]) / days);
}
/* 믹서 점수 (0~100) = 판정 믹서의 「레퍼런스 고르기」 비중으로 여섯 가지를 가중 평균. 성과 근거가 안 되는 영상(기준 배수 미만 · 광고 추정)은 조회 쪽 점수를 0으로 본다 */
var VT = { Great: 100, Good: 80, Normal: 50, Bad: 25, Worst: 0 };
function isProof(x){ var m = M(); return x.ratio != null && x.ratio >= (m.th_ratio || 1) && !x.ad }
function refScore(x){
  var m = M(), o = outlier(x), ok = isProof(x);
  var age = x.published ? (Date.now() - Date.parse(x.published)) / (365 * 86400000) : 3;
  return Math.round(wsum([
    [m.ref_ratio || 0, ok ? Math.min(1, Math.log10(x.ratio + 1) / 3) * 100 : 0],
    [o == null ? 0 : (m.ref_outlier || 0), ok && o != null ? Math.min(1, Math.log10(o + 1) / 2) * 100 : 0],
    [m.ref_comment || 0, x.buyer === "✓" ? 100 : x.buyer === "△" ? 40 : 0],
    [VT[x.vtPerf] == null ? 0 : (m.ref_viewtrap || 0), VT[x.vtPerf] || 0],          // 뷰트랩 등급이 없는 영상은 이 항목을 빼고 계산
    [m.ref_wave || 0, /많이 다시 본 구간/.test(x.wave || "") && !/생성 안 됨|만들지 않음/.test(x.wave || "") ? 100 : 0],
    [m.ref_fresh || 0, Math.max(0, Math.min(1, (3 - age) / 2)) * 100]
  ]));
}
function refCard(x){
  var bd = band(x.ratio), g = growth(x), proof = isProof(x), o = outlier(x), dv = daily(x);
  return "<div class=\"ref\">" + (x.vid ? "<a href=\"" + esc(x.url) + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(x.vid) + "/mqdefault.jpg\"></a>" : "") +
    "<div class=\"ref-m\"><div class=\"ref-t\"><a class=\"t\" href=\"" + esc(x.url) + "\" target=\"_blank\" rel=\"noopener\">" + txt(x.title) + "</a>" + (x.vid ? favBtn(x.vid) : "") + "</div>" +
    "<div class=\"it-d\">" + esc(x.channel) + " · 구독 " + esc(x.subs || "—") + " · 조회 " + (g ? fmt(g.now) + (g.pct > 0 ? " <span class=\"up\">(+" + g.pct + "%)</span>" : "") : esc(x.views || "—")) + " · " + esc(x.len) + " · " + esc(x.published) + "</div>" +
    "<div><span class=\"tag fill\">" + esc(roleKo(x.role)) + "</span> " + stageTag(x) + " <span class=\"tag\" style=\"border-color:var(--accent);color:var(--accent)\">점수 " + refScore(x) + "</span> <span class=\"tag p\">" + esc(x.product) + "</span> <span class=\"tag\">" + esc(x.form) + "</span> " +
    "<span class=\"tag " + bd[1] + "\">" + (x.ratio != null ? "조회÷구독 " + x.ratio + "배 · " : "") + bd[0] + "</span> " +
    (o != null ? "<span class=\"tag " + (o >= 3 ? "ok" : "") + "\">채널 평소의 " + o + "배</span> " : "") + (dv ? "<span class=\"tag " + (dv > 0 ? "ok" : "") + "\">하루 +" + fmt(dv) + "</span> " : "") +
    (x.buyer ? "<span class=\"tag " + (x.buyer === "✓" ? "ok" : "") + "\">구매자 " + x.buyer + "</span> " : "") +
    (/Great|Good/.test(x.vtPerf) ? "<span class=\"tag ok\">뷰트랩 영상 성과 " + esc(VT_KO[x.vtPerf]) + "</span> " : "") +
    (x.ad ? "<span class=\"tag\">광고 추정</span> " : "") + (proof ? "" : "<span class=\"tag\">성과 근거 ✕</span>") + "</div>" +
    (x.apply ? "<div class=\"apply\"><b>적용</b> " + esc(x.apply) + "</div>" : "") +
    "<details><summary>구성 · 다시 본 구간 · 댓글</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
    "<dt>레퍼런스</dt><dd>" + txt(x.refLine) + "</dd><dt>구성</dt><dd>" + txt(x.structure) + "</dd><dt>파동</dt><dd>" + txt(x.wave) + "</dd><dt>댓글</dt><dd>" + txt(x.comments) + "</dd>" +
    "<dt>살 사람의 말인가</dt><dd>" + txt(x.buyerNote) + "</dd><dt>검색어</dt><dd>" + esc(x.query) + " · " + x.round + "회차 " + esc(x.date) + " · 조사 시트 " + x.row + "번째 줄</dd></dl></details></div></div>";
}
function viewRef(){
  var b = B(), r = part("ref"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var items = r ? r.items.filter(isLong) : [], nShort = r ? r.items.length - items.length : 0;
  var live = part("live"), chan = part("chan");
  var sr = part("search"), nFav = Object.keys((SETS[cur] || {}).favc || {}).length;
  var h = "<div class=\"chips\"><button class=\"chip" + (ui.refView === "search" ? " on" : "") + "\" data-ui=\"refView=search\">키워드로 찾은 콘텐츠<span>" + (sr && sr.items ? sr.items.length : 0) + "</span></button>" +
    "<button class=\"chip" + (ui.refView === "ideas" ? " on" : "") + "\" data-ui=\"refView=ideas\">💡 아이디어<span>" + (((part("ideas") || {}).items) || []).length + "</span></button>" +
    "<button class=\"chip" + (ui.refView === "fav" ? " on" : "") + "\" data-ui=\"refView=fav\">☆ 즐겨찾기<span>" + nFav + "</span></button>" +
    "<button class=\"chip" + (ui.refView === "videos" ? " on" : "") + "\" data-ui=\"refView=videos\">레퍼런스 영상<span>" + items.length + "</span></button>" +
    "<button class=\"chip" + (ui.refView === "stages" ? " on" : "") + "\" data-ui=\"refView=stages\">단계 사다리</button>" +
    "<button class=\"chip" + (ui.refView === "chans" ? " on" : "") + "\" data-ui=\"refView=chans\">레퍼런스 채널<span>" + ((b.channels || []).length) + "</span></button>" +
    "<button class=\"chip dash\" data-act=\"refresh\"" + (openCmd("refresh") || !r || !r.items.length ? " disabled" : "") + ">↻ 지금 최신화</button></div>" +
    "<p class=\"lead\">반응 최신화 " + (live ? day(live.updatedAt) : "아직 안 함") + " · 채널 새 영상 " + (chan ? day(chan.updatedAt) : "아직 안 함") + "</p>";
  if(ui.refView === "chans") return h + chansHtml(b, chan);
  if(ui.refView === "search") return h + searchResultsHtml();
  if(ui.refView === "fav") return h + favListHtml();
  if(ui.refView === "ideas") return h + ideasHtml();
  if(!r) return h + "<p class=\"empty\">아직 레퍼런스가 없어요. 키워드 탭에서 조사를 돌리면 채워져요.</p>";
  if(ui.refView === "stages") return h + stagesHtml(items);
  var list = items.filter(function(x){
    return (ui.refRole === "all" || x.role === ui.refRole) &&
      (!ui.refBuyer || (x.buyer === "✓" && isProof(x)));
  });
  var by = { mix: function(a, c){ return refScore(c) - refScore(a) }, ratio: function(a, c){ return (c.ratio || 0) - (a.ratio || 0) }, out: function(a, c){ return (outlier(c) || 0) - (outlier(a) || 0) }, grow: function(a, c){ return ((growth(c) || {}).pct || 0) - ((growth(a) || {}).pct || 0) }, date: function(a, c){ return c.row - a.row } }[ui.refSort];
  list.sort(by);
  function chip(key, val, label){ return "<button class=\"chip" + (ui[key] === val ? " on" : "") + "\" data-ui=\"" + key + "=" + val + "\">" + label + "</button>" }
  h += "<section class=\"card\"><div class=\"card-h\"><h3>잘 되는 콘텐츠</h3><span class=\"n\">" + list.length + " / " + items.length + "</span></div>" +
    "<div class=\"chips\">" + chip("refRole", "all", "역할 전체") + roleNames().map(function(n){ return chip("refRole", esc(n), esc(n)) }).join("") + "</div>" +
    (nShort ? "<p class=\"lead\">미드폼·롱폼만 보여요 — 지난 조사의 숏폼 " + nShort + "개는 뺐어요 (시트에는 남아 있어요).</p>" : "") +
    "<div class=\"chips\" style=\"margin-top:6px\"><button class=\"chip" + (ui.refBuyer ? " on" : "") + "\" data-ui=\"refBuyer=" + !ui.refBuyer + "\">구매자 ✓ · 성과 근거만</button></div>" +
    "<div class=\"chips\" style=\"margin-top:6px\">" + chip("refSort", "mix", "종합 점수순") + chip("refSort", "ratio", "조회÷구독순") + chip("refSort", "out", "채널 평소 대비순") + chip("refSort", "grow", "요즘 조회 늘어난 순") + chip("refSort", "date", "최근 조사순") + "</div>" +
    (ui.refSort === "out" ? "<p class=\"lead\" style=\"margin-top:8px\">채널 평소 = 그 채널 일반 영상 최근 30개의 가운데 조회수예요.</p>" : "") +
    "<div style=\"margin-top:6px\">" + (list.slice(0, ui.refMore).map(refCard).join("") || "<p class=\"empty\">조건에 맞는 레퍼런스가 없어요.</p>") + "</div>" +
    (list.length > ui.refMore ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"refMore=" + (ui.refMore + 30) + "\">더 보기 (" + (list.length - ui.refMore) + "개 남음)</button></div>" : "") + "</section>";
  return h + weekdayHtml(items);
}
/* 단계 사다리 보기 — 역할(풀링·키)마다 5단계 칸에 레퍼런스를 썸네일로 놓는다. 칸 안은 믹서 점수순, 「구매자 ✓ · 성과 근거만」을 켜면 그것만 */
function stagesHtml(all){
  var items = all.filter(function(x){ return !ui.refBuyer || (x.buyer === "✓" && isProof(x)) });
  return "<p class=\"lead\">역할은 끝맺음(내 상품을 거느냐), 단계는 보는 사람이 어디쯤 와 있느냐예요. 정체성 키워드로 찾은 영상은 풀링, 상품 키워드로 찾은 영상은 키예요.</p>" +
    "<div class=\"chips\"><button class=\"chip" + (ui.refBuyer ? " on" : "") + "\" data-ui=\"refBuyer=" + !ui.refBuyer + "\">구매자 ✓ · 성과 근거만</button></div>" +
    roleNames().map(function(role){
      var its = items.filter(function(x){ return x.role === role }).sort(function(a, c){ return refScore(c) - refScore(a) });
      var what = ((B().roles || []).filter(function(x){ return x.name === role })[0] || {}).what || "";
      return "<section class=\"card\"><div class=\"card-h\"><h3><span class=\"tag fill\">" + esc(roleKo(role)) + "</span> " + esc(what) + "</h3><span class=\"n\">" + its.length + "개</span></div>" +
        ladderHtml(its, function(x){ return "<a href=\"" + esc(x.url) + "\" target=\"_blank\" rel=\"noopener\" title=\"" + txt(x.title) + "\">" + (x.vid ? "<img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(x.vid) + "/mqdefault.jpg\">" : "") + "<span class=\"clip\">" + txt(x.title) + "</span></a>" }) + "</section>";
    }).join("");
}
function chansHtml(b, chan){
  var groups = {}, order = [];
  (b.channels || []).forEach(function(c){ if(!groups[c.group]){ groups[c.group] = []; order.push(c.group) } groups[c.group].push(c) });
  return order.map(function(g){
    return "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(g) + "</h3><span class=\"n\">" + groups[g].length + "곳</span></div><div class=\"list\">" +
      groups[g].map(function(c){
        var now = chan && chan.items && chan.items[c.name];
        return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><a href=\"" + esc(c.url) + "\" target=\"_blank\" rel=\"noopener\"><b>" + esc(c.name) + "</b></a>" +
          (c.grade && c.grade !== "—" ? " <span class=\"tag\">" + esc(c.grade) + "</span>" : "") + (now && now.subs ? " <span class=\"num muted\">구독 " + fmt(now.subs) + "</span>" : "") + "</div>" +
          "<div class=\"it-d\">" + txt(c.take) + "</div>" +
          (now ? "<details><summary>새 영상 " + now.videos.length + "개 · " + esc(now.at) + "</summary><div class=\"list\">" + now.videos.map(function(v){
              return "<div class=\"it\"><div class=\"it-m\"><a href=\"https://www.youtube.com/watch?v=" + esc(v.id) + "\" target=\"_blank\" rel=\"noopener\">" + txt(v.title) + "</a>" +
                "<div class=\"it-d\">조회 " + fmt(v.views) + " · " + esc(v.when) + " · " + esc(v.len) + (v.ratio != null ? " · <span class=\"" + (v.ratio >= 1 ? "up" : "muted") + "\">조회÷구독 " + v.ratio + "배</span>" : "") + "</div></div></div>" }).join("") + "</div></details>"
            : "<div class=\"it-d\">" + (/youtube\.com\/(@|channel\/)/.test(c.url) ? "아직 최신화 전" : "유튜브 채널이 아니라 자동으로 못 읽어요 — 링크로 직접 보기") + "</div>") +
          "</div></div>";
      }).join("") + "</div></section>";
  }).join("") || "<p class=\"empty\">레퍼런스 채널이 없어요.</p>";
}
/* 게시 요일 — Metricool 의 「올리기 좋은 때」는 내 팔로워 활동으로 계산한다. 그 자료가 없어서 여기서는 성과 근거가 되는 레퍼런스가 올라온 요일을 센다 (참고용) */
function weekdayHtml(items){
  var good = items.filter(function(x){ return x.buyer === "✓" && isProof(x) && x.published }), n = [0, 0, 0, 0, 0, 0, 0];
  good.forEach(function(x){ var d = new Date(x.published + "T12:00:00").getDay(); if(!isNaN(d)) n[d]++ });
  var mx = Math.max.apply(null, n) || 1, names = ["일", "월", "화", "수", "목", "금", "토"];
  return "<section class=\"card\"><div class=\"card-h\"><h3>잘 된 영상이 올라온 요일</h3><span class=\"n\">" + good.length + "개</span></div>" +
    "<p class=\"lead\">구매자 ✓ · 성과 근거가 되는 레퍼런스의 게시 요일이에요. 표본이 작고 남의 채널이라 참고만 하세요 — 내 채널 시청자가 깨어 있는 시간은 유튜브 스튜디오 자료가 있어야 알 수 있어요.</p>" +
    "<div class=\"bars\">" + [1, 2, 3, 4, 5, 6, 0].map(function(i){ return "<div><span class=\"num\">" + n[i] + "</span><i style=\"height:" + Math.round(n[i] / mx * 44) + "px\"></i>" + names[i] + "</div>" }).join("") + "</div></section>";
}

/* ☆ 콘텐츠 즐겨찾기 — 좋은 콘텐츠를 브랜드가 기억한다 (ct.set favc {영상 id: {title, channel, kw, at}} → 맥이 브랜드.json favorites 에도 적는다) */
function favOf(vid){ return ((SETS[cur] || {}).favc || {})[vid] }
function favBtn(vid){ var on = !!favOf(vid); return "<button class=\"mk fav\" data-act=\"favc\" data-vid=\"" + esc(vid) + "\" aria-pressed=\"" + on + "\" title=\"" + (on ? "즐겨찾기 풀기" : "즐겨찾기 — 브랜드가 기억") + "\" aria-label=\"즐겨찾기\">" + (on ? "★" : "☆") + "</button>" }
function videoOf(vid){   // 즐겨찾기에 적을 영상 정보 — 검색 결과나 레퍼런스에서 찾는다
  var sr = part("search"), r = part("ref"), x = ((sr && sr.items) || []).filter(function(y){ return y.vid === vid })[0];
  if(x) return { title: x.title, channel: x.channel, kw: x.kw };
  x = ((r && r.items) || []).filter(function(y){ return y.vid === vid })[0];
  return x ? { title: x.title, channel: x.channel, kw: x.query || "" } : {};
}
/* 키워드로 찾은 콘텐츠의 점수 — 동욱이 브랜드 탭에 정해 둔 기준으로 본다 (2026-11-17 동욱: "조회수·최신순만 나오나? 주제 등 기준을 해 놨고 댓글·파동도 있잖아").
   주제 맞음 = 씨앗 단어·콘텐츠 축·필러·구매자 욕구·상품 이름을 「·」·띄어쓰기로 잘라(두 글자 이상) 제목에 몇 개 들었나 (2개면 만점).
   댓글 = 댓글 수(1,000개면 만점) · 파동 = 많이 다시 본 구간이 있나 · 구독 대비 조회 · 새 영상. 비중은 믹서.json 의 ref_topic · ref_comment · ref_wave · ref_ratio · ref_fresh */
function topicWords(){
  var b = B() || {}, id = b.identity || {}, out = {};
  seedsOf().map(function(x){ return x.word }).concat(id.axes || [], id.needs || [], (id.pillars || []).map(function(p){ return p.name }), (b.products || []).map(function(p){ return p.name }))
    .forEach(function(t){ String(t || "").split(/[\s·,\/()\[\]—-]+/).forEach(function(k){ if(k.length >= 2) out[k] = 1 }) });
  return Object.keys(out);
}
function topicHits(x, words){ var t = String(x.title || "").replace(/\s+/g, ""); return words.filter(function(k){ return t.indexOf(k) >= 0 }) }
function cmtN(x){ return koNum(x.comments) || 0 }
function hasWave(x){ return Array.isArray(x.replayed) && x.replayed.length > 0 }
function srScore(x, words){
  var w = critWeights(), age = x.date ? (Date.now() - Date.parse(x.date)) / (365 * 86400000) : 3, ok = x.ratio != null && x.ratio >= recCrit().minRatio;   // 비중·최소 배수는 추천 칸 「추천 기준」
  return Math.round(wsum([
    [w.topic, Math.min(1, topicHits(x, words).length / 2) * 100],
    [w.ratio, ok ? Math.min(1, Math.log10(x.ratio + 1) / 3) * 100 : 0],
    [w.comment, Math.min(1, Math.log10(cmtN(x) + 1) / 3) * 100],
    [w.wave, hasWave(x) ? 100 : 0],
    [w.fresh, Math.max(0, Math.min(1, (3 - age) / 2)) * 100],
    [fitV(x) == null || !anaOpt().fit ? 0 : w.fit, fitV(x) || 0]   // 구매 욕구 검증 — 분석한 영상만 (안 한 영상은 이 항목을 빼고 계산)
  ]));
}
/* 영상 분석 — 많이 다시 본 구간의 대사 · 좋아요 많은 댓글 · 영상 주제 · 구매 욕구 검증 (2026-11-17 동욱: "파동 내용이 뭔지, 좋아요 많이 받은 댓글이 뭔지, 영상 주제가 뭔지,
   시청자의 욕구가 내 제품 구매 욕구와 비슷한지 검증이 아직 없어. 넣을지 말지 조절 탭을 만들어도 좋아").
   맥의 Claude가 ego lite 로 영상을 열어 읽는다 (cmd kind "analyze" → 볼트 <브랜드>/분석.json → ct.data .analysis, 영상 id 별).
   구매 욕구 검증 행은 구축 틀.json 의 「욕구 결 검증」과 같다(viewer · buyer · verdict · basis · fix). 무엇을 읽고 보여 줄지는 ct.set anaOpt */
var ANA_PARTS = [["topic", "영상 주제"], ["wave", "파동 대사"], ["comments", "좋아요 많은 댓글"], ["fit", "구매 욕구 검증"]];
function anaOpt(){ var o = (SETS[cur] || {}).anaOpt || {}; return { topic: o.topic !== false, wave: o.wave !== false, comments: o.comments !== false, fit: o.fit !== false, nCmt: [5, 10, 20].indexOf(o.nCmt) >= 0 ? o.nCmt : CMT_TOP, target: o.target || "top", topN: o.topN || 3 } }
function anaOf(vid){ var a = part("analysis"); return a && a.items ? a.items[vid] : null }
function fitV(x){ var a = anaOf(x.vid), v = a && a.fit && String(a.fit.verdict || "").split(" ")[0]; return { "같음": 100, "비슷": 60, "다름": 0 }[v] }
function fitTag(x){ var a = anaOf(x.vid), v = a && a.fit && String(a.fit.verdict || "").split(" ")[0]; if(!v) return "";
  return "<span class=\"tag" + (v === "같음" ? " ok" : v === "비슷" ? " ok" : "") + "\"" + (v === "다름" ? " style=\"border-color:#C0392B;color:#C0392B\"" : "") + ">구매 욕구 " + esc(v) + "</span> " }
/* 분석할 영상 — 「키워드마다 점수 상위 N개」 또는 「💡 담은 영상」. 이미 분석한 것은 빼고 보낸다 */
function anaTargets(words){
  var o = anaOpt(), d = part("search"), its = (d && d.items) || [];
  if(o.target === "picked") return its.filter(function(x){ return ideaPicks()[x.vid] });
  var by = {}; its.filter(function(x){ return relOf(x) > 0 }).forEach(function(x){ (by[x.kw] = by[x.kw] || []).push(x) });
  return Object.keys(by).reduce(function(a, k){ return a.concat(by[k].sort(function(p, q){ return srScore(q, words) - srScore(p, words) }).slice(0, o.topN)) }, []);
}
/* 영상 분석 — 무엇을 읽을지·어떤 영상을 읽을지는 설계 탭 「콘텐츠」 칸(anaOptHtml), 여기는 한 줄과 분석하기 버튼 */
function anaOptHtml(){
  var o = anaOpt();
  function tg(k, label){ return "<button class=\"chip" + (o[k] ? " on" : "") + "\" data-act=\"anaopt\" data-k=\"" + k + "\">" + label + "</button>" }
  return "<p class=\"it-d\">맥의 Claude가 영상을 열어 읽어요. 켠 것만 읽고, 카드 「자세히」에도 켠 것만 보여요.</p>" +
    "<div class=\"chips\">" + ANA_PARTS.map(function(p){ return tg(p[0], p[1]) }).join("") + "</div>" +
    "<div class=\"chips\" style=\"margin-top:6px\"><span class=\"lead\" style=\"margin:0 4px 0 0\">댓글</span>" + [5, 10, 20].map(function(n){ return "<button class=\"chip" + (o.nCmt === n ? " on" : "") + "\" data-act=\"anaopt\" data-k=\"nCmt\" data-v=\"" + n + "\">" + n + "개</button>" }).join("") + "</div>" +
    "<div class=\"chips\" style=\"margin-top:6px\"><span class=\"lead\" style=\"margin:0 4px 0 0\">분석할 영상</span>" + [1, 3, 5].map(function(n){ return "<button class=\"chip" + (o.target === "top" && o.topN === n ? " on" : "") + "\" data-act=\"anaopt\" data-k=\"topN\" data-v=\"" + n + "\">키워드마다 점수 상위 " + n + "개</button>" }).join("") +
      "<button class=\"chip" + (o.target === "picked" ? " on" : "") + "\" data-act=\"anaopt\" data-k=\"target\" data-v=\"picked\">💡 담은 영상</button></div>";
}
function anaBarHtml(words){
  var o = anaOpt(), t = anaTargets(words), todo = t.filter(function(x){ return !anaOf(x.vid) }), busy = openCmd("analyze");
  return "<div style=\"margin-top:8px\">" + dsLine("content") + "<div class=\"acts\" style=\"margin-top:6px\"><button class=\"btn primary\" data-act=\"analyze\"" + (busy || !todo.length || !ANA_PARTS.some(function(p){ return o[p[0]] }) ? " disabled" : "") + ">" + (busy ? "맥이 영상 읽는 중…" : todo.length ? "🔍 새 영상 " + todo.length + "개 분석하기" : "고른 영상은 다 분석했어요") + "</button>" +
    (t.length - todo.length ? "<span class=\"lead\" style=\"margin:0\">이미 분석 " + (t.length - todo.length) + "개</span>" : "") + "</div></div>";
}
/* 카드 「자세히」 안의 분석 칸 — 조절에서 켠 것만 */
function anaHtml(x){
  var a = anaOf(x.vid), o = anaOpt(), url = "https://www.youtube.com/watch?v=" + x.vid;
  if(!a) return "<dt>분석</dt><dd class=\"muted\">아직 안 함 — 위 「🔍 영상 분석」에서 분석하면 파동 대사·댓글·주제·구매 욕구가 채워져요</dd>";
  var h = "";
  if(o.topic && a.topic) h += "<dt>영상 주제</dt><dd>" + txt(a.topic) + "</dd>";
  if(o.wave) h += "<dt>파동 대사</dt><dd>" + ((a.wave || []).length ? a.wave.map(function(w){ return "<div><a href=\"" + url + "&t=" + secs(w.at) + "\" target=\"_blank\" rel=\"noopener\">" + esc(w.at) + "</a> “" + esc(w.line || "못 읽음") + "”" + (w.note ? " <span class=\"muted\">— " + txt(w.note) + "</span>" : "") + "</div>" }).join("") : "<span class=\"muted\">" + esc(a.waveNote || "다시 본 구간 없음") + "</span>") + "</dd>";
  if(o.comments) h += "<dt>좋아요 많은 댓글</dt><dd>" + ((a.comments || []).length ? a.comments.slice().sort(function(p, q){ return (q.likes || 0) - (p.likes || 0) }).slice(0, o.nCmt).map(function(c){ return "<div>“" + txt(c.text) + "” <span class=\"muted\">· 좋아요 " + esc(c.likes != null ? fmt(c.likes) : "?") + "</span></div>" }).join("") : "<span class=\"muted\">" + esc(a.commentNote || "못 읽음") + "</span>") + "</dd>";
  if(o.fit && a.fit) h += "<dt>구매 욕구 검증</dt><dd>" + buildFit((buildDef().sections.reduce(function(r, sc){ return r.concat(sc.fields) }, []).filter(function(f){ return f.type === "fit" })[0]) || { rows: [{ id: "viewer", label: "시청자 욕구" }, { id: "buyer", label: "구매 욕구" }, { id: "verdict", label: "같은가" }, { id: "basis", label: "근거" }, { id: "fix", label: "다르면" }] }, a.fit) + "</dd>";
  return h + "<dt>분석한 때</dt><dd class=\"muted\">" + esc(day(a.at)) + "</dd>";
}
var SR_SORT = [["mix", "우리 기준 종합순"], ["fit", "구매 욕구 맞는 순"], ["topic", "주제 맞는 순"], ["cmt", "댓글 많은 순"], ["wave", "파동 있는 것 먼저"], ["ratio", "조회÷구독순"], ["views", "조회순"], ["date", "최신순"]];
function secs(t){ return String(t).split(":").reduce(function(a, v){ return a * 60 + (+v || 0) }, 0) }
/* 카드 한 장 — 접힌 상태에서는 제목·점수·주제·댓글·파동만, 「자세히」를 펴면 맞은 말·다시 본 구간(그 시각으로 열림)·구독 대비 조회 */
function searchCard(x, words){
  var url = "https://www.youtube.com/watch?v=" + x.vid, bd = band(x.ratio), hits = topicHits(x, words), n = cmtN(x);
  return "<div class=\"ref\"><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(x.vid) + "/mqdefault.jpg\"></a>" +
    "<div class=\"ref-m\"><div class=\"ref-t\"><a class=\"t\" href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">" + txt(x.title) + "</a>" + favBtn(x.vid) + "</div>" +
    "<div class=\"it-d\">" + esc(x.channel) + " · 조회 " + fmt(x.views) + " · " + esc(x.date) + "</div>" +
    (anaOpt().topic && anaOf(x.vid) && anaOf(x.vid).topic ? "<div class=\"small\"><b>주제</b> " + esc(anaOf(x.vid).topic) + "</div>" : "") +
    "<div><span class=\"tag\" style=\"border-color:var(--accent);color:var(--accent)\">점수 " + srScore(x, words) + "</span> " + (anaOpt().fit ? fitTag(x) : "") +
      "<span class=\"tag" + (hits.length ? " ok" : "") + "\">주제 " + (hits.length ? hits.length + "개 맞음" : "안 맞음") + "</span> " +
      "<span class=\"tag" + (n >= 100 ? " ok" : "") + "\">댓글 " + (x.comments != null ? fmt(n) : "확인 못 함") + "</span> " +
      "<span class=\"tag" + (hasWave(x) ? " ok" : "") + "\">파동 " + (hasWave(x) ? "있음" : "없음") + "</span></div>" +
    "<details><summary>자세히</summary><dl class=\"kv small\" style=\"margin-top:6px\">" + anaHtml(x) +
      "<dt>주제에 맞은 말</dt><dd>" + (hits.length ? hits.map(esc).join(" · ") : "브랜드 탭의 정체성·축·상품 말이 제목에 없어요") + "</dd>" +
      "<dt>다시 본 구간</dt><dd>" + (hasWave(x) ? "" + x.replayed.map(function(t){ return "<a href=\"" + url + "&t=" + secs(t) + "\" target=\"_blank\" rel=\"noopener\">" + esc(t) + "</a>" }).join(" · ") : esc(typeof x.replayed === "string" ? x.replayed : "없음")) + "</dd>" +
      "<dt>댓글 수</dt><dd>" + (x.comments != null ? fmt(n) + "개" : "확인 못 함") + "</dd>" +
      "<dt>성과</dt><dd>구독 " + fmt(x.subs) + " · " + (x.ratio != null ? "조회÷구독 " + x.ratio + "배 · " : "") + bd[0] + " · " + esc(x.len) + "</dd>" +
      "<dt>찾은 키워드</dt><dd>" + esc(x.kw) + (relOf(x) === 2 ? " (제목에 있음)" : relOf(x) === 1 ? " (설명·키워드 조각에 있음)" : " (먼 영상)") + "</dd></dl></details>" +
    "<div class=\"acts\" style=\"margin-top:4px\">" + ideaPickBtn(x.vid) + "</div></div></div>";
}
function searchResultsHtml(){
  var d = part("search"), st = searchState();
  if(!d || !d.items || !d.items.length) return "<section class=\"card\"><p class=\"empty\">" + (st.busy ? "맥이 검색하는 중이에요…" : "아직 검색한 콘텐츠가 없어요.") + "</p><div class=\"acts\"><button class=\"btn\" data-go=\"kw\">키워드 탭에서 ★ 키워드로 검색 →</button></div></section>";
  var kws = [], by = {}, words = topicWords(), sort = ui.srSort || "mix";
  d.items.forEach(function(x){ if(!by[x.kw]){ by[x.kw] = []; kws.push(x.kw) } by[x.kw].push(x) });
  var cmp = { mix: function(a, c){ return srScore(c, words) - srScore(a, words) }, fit: function(a, c){ return (fitV(c) == null ? -1 : fitV(c)) - (fitV(a) == null ? -1 : fitV(a)) || srScore(c, words) - srScore(a, words) }, topic: function(a, c){ return topicHits(c, words).length - topicHits(a, words).length || srScore(c, words) - srScore(a, words) },
    cmt: function(a, c){ return cmtN(c) - cmtN(a) }, wave: function(a, c){ return (hasWave(c) ? 1 : 0) - (hasWave(a) ? 1 : 0) || srScore(c, words) - srScore(a, words) },
    ratio: function(a, c){ return (c.ratio || 0) - (a.ratio || 0) }, views: function(a, c){ return c.views - a.views }, date: function(a, c){ return String(c.date).localeCompare(String(a.date)) } }[sort] || function(){ return 0 };
  function keep(x){ return (!ui.srFit || fitV(x) >= 60) && (!ui.srTopic || topicHits(x, words).length) && (!ui.srCmt || cmtN(x) > 0) && (!ui.srWave || hasWave(x)) }
  function tog(key, label){ return "<button class=\"chip" + (ui[key] ? " on" : "") + "\" data-ui=\"" + key + "=" + !ui[key] + "\">" + label + "</button>" }
  return "<section class=\"card\"><div class=\"card-h\"><h3>키워드로 찾은 콘텐츠</h3><span class=\"n\">" + d.items.length + "개 · " + esc(day(d.updatedAt)) + "</span></div>" +
    "<details class=\"help\"><summary>이 목록은 뭔가요?</summary><p class=\"lead\">★ 키워드마다 유튜브 검색 상위의 미드폼·롱폼이에요. 점수는 브랜드 탭에 정해 둔 주제(정체성·축·상품)와 댓글·파동·구독 대비 조회로 매겨요. 좋은 콘텐츠는 ☆로 즐겨찾기 하면 추천에 쓰여요." + (st.busy ? " 지금 새로 검색하는 중이에요." : "") + "</p></details>" +
    "<details style=\"margin-top:6px\"><summary>정렬 · 거르기 <span class=\"num muted\">" + SR_SORT.filter(function(o){ return o[0] === sort })[0][1] + (["srFit","srTopic","srCmt","srWave"].some(function(k){ return ui[k] }) ? " · 거르는 중" : "") + " — 펴서 바꾸기</span></summary>" +
    "<div class=\"chips\">" + SR_SORT.map(function(o){ return "<button class=\"chip" + (sort === o[0] ? " on" : "") + "\" data-ui=\"srSort=" + o[0] + "\">" + o[1] + "</button>" }).join("") + "</div>" +
    "<div class=\"chips\" style=\"margin-top:6px\">" + tog("srFit", "구매 욕구 같음·비슷만") + tog("srTopic", "주제 맞는 것만") + tog("srCmt", "댓글 있는 것만") + tog("srWave", "파동 있는 것만") + "</div>" + "</details>" +
    "<details style=\"margin-top:8px\"><summary>점수는 어떻게 매기나 · 주제로 보는 말 " + words.length + "개</summary><p class=\"lead\" style=\"margin-top:6px\">주제로 보는 말: " + (words.map(esc).join(" · ") || "없음 — 브랜드 탭에서 정체성 단어·콘텐츠 축·상품을 넣으세요") + "</p>" +
      "<p class=\"lead\">비중: " + CRIT.map(function(k){ return esc(k.name) + " " + critWeights()[k.id] }).join(" · ") + " — 추천 칸 「추천 기준」의 우선순위를 따라요. <button class=\"btn sm\" data-go=\"rec\">바꾸기 →</button></p></details>" +
    anaBarHtml(words) + ideaBarHtml() + "</section>" +
    kws.map(function(k){
      var l = by[k].filter(keep).sort(cmp);
      var near = l.filter(function(x){ return relOf(x) > 0 }), far = l.filter(function(x){ return relOf(x) === 0 });
      return "<section class=\"card\"><details open><summary style=\"font-size:16px;color:var(--ink)\">" + esc(k) + " <span class=\"num muted\">맞는 영상 " + near.length + "개" + (by[k].length > l.length ? " · 거른 것 " + (by[k].length - l.length) + "개" : "") + "</span></summary>" +
        (near.map(function(x){ return searchCard(x, words) }).join("") || "<p class=\"lead\">조건에 맞는 영상이 없어요. 거르기를 풀거나 💡 아이디어·다른 키워드로 다시 검색해 보세요.</p>") +
        (far.length ? "<details style=\"margin-top:8px\"><summary>키워드와 먼 영상 " + far.length + "개 — 유튜브가 함께 보여 준 것</summary>" + far.map(function(x){ return searchCard(x, words) }).join("") + "</details>" : "") + "</details></section>";
    }).join("") + (function(){   // 다음 단계 — 찾은 영상을 분석하고 · 아이디어를 뽑고 · 추천으로
      var todo = anaTargets(words).filter(function(x){ return !anaOf(x.vid) }).length, nPick = Object.keys(ideaPicks()).length;
      return "<section class=\"card\">" + nextBar("찾은 영상으로", [
        todo ? ["새 영상 " + todo + "개 분석하기", "data-act=\"analyze\"", !!openCmd("analyze")] : null,
        nPick ? ["담은 " + nPick + "개에서 💡 아이디어 뽑기", "data-act=\"ideas\"", !!openCmd("ideas")] : null,
        ["이 영상들로 추천 받기", "data-go=\"rec\""]
      ]) + "</section>";
    })();
}
function favListHtml(){
  var f = (SETS[cur] || {}).favc || {}, ids = Object.keys(f).sort(function(a, c){ return String(f[c].at).localeCompare(String(f[a].at)) });
  if(!ids.length) return "<section class=\"card\"><p class=\"empty\">아직 즐겨찾기 한 콘텐츠가 없어요. 콘텐츠 옆 ☆를 누르세요.</p></section>";
  return "<section class=\"card\"><div class=\"card-h\"><h3>☆ 즐겨찾기 콘텐츠</h3><span class=\"n\">" + ids.length + "개</span></div><div class=\"list\">" + ids.map(function(vid){ var x = f[vid];
    return "<div class=\"ref\"><a href=\"https://www.youtube.com/watch?v=" + esc(vid) + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(vid) + "/mqdefault.jpg\"></a>" +
      "<div class=\"ref-m\"><div class=\"ref-t\"><a class=\"t\" href=\"https://www.youtube.com/watch?v=" + esc(vid) + "\" target=\"_blank\" rel=\"noopener\">" + esc(x.title || vid) + "</a>" + favBtn(vid) + "</div>" +
      "<div class=\"it-d\">" + esc(x.channel || "") + (x.kw ? " · 키워드 " + esc(x.kw) : "") + " · " + esc(day(x.at)) + "</div></div></div>" }).join("") + "</div></section>";
}

/* 키워드와 맞는 영상인가 — 맥이 검색할 때 매긴 rel(제목 2 · 설명 1 · 없음 0). 예전 결과처럼 rel 이 없으면 제목에 키워드가 있는지로 본다 */
function relOf(x){ return x.rel != null ? x.rel : String(x.title || "").replace(/\s+/g, "").indexOf(String(x.kw || "").replace(/\s+/g, "")) >= 0 ? 2 : 0 }
/* 💡 아이디어 — 고른 영상의 댓글과 많이 다시 본 구간에서 맥의 Claude가 아이디어를 뽑는다 (cmd kind "ideas" → 볼트 <브랜드>/아이디어.json → ct.data .ideas).
   아이디어마다 「이 말로 다시 검색」(searchReq) 이나 「바로 원고 짜기」(cmd script + params.ideas → 대본.json) 로 이어진다. 고른 영상은 ct.set ideaPick */
function ideaPicks(){ return (SETS[cur] || {}).ideaPick || {} }
function ideaPickBtn(vid){ var on = !!ideaPicks()[vid]; return "<button class=\"btn sm" + (on ? " primary" : "") + "\" data-act=\"ideapick\" data-vid=\"" + esc(vid) + "\">" + (on ? "💡 담음" : "💡 담기") + "</button>" }
function ideaBarHtml(){
  var n = Object.keys(ideaPicks()).length, busy = openCmd("ideas");
  return "<details style=\"margin:8px 0\"><summary>💡 아이디어 뽑기란?</summary><div class=\"note\" style=\"margin-top:6px\">영상마다 「💡 담기」를 누른 뒤 아래 버튼을 누르면, 맥의 Claude가 그 영상들의 <b>인기 댓글</b>과 <b>많이 다시 본 구간의 대사</b>를 읽어 이 브랜드가 찍을 아이디어를 뽑아요. 아이디어로 다시 검색하거나 바로 원고를 짤 수 있어요.</div></details>" +
    "<div class=\"acts\" style=\"margin-bottom:8px\"><button class=\"btn primary\" data-act=\"ideas\"" + (!n || busy ? " disabled" : "") + ">" + (busy ? "맥이 댓글·파동 읽는 중…" : "담은 " + n + "개에서 💡 아이디어 뽑기") + "</button>" +
    (n ? "<button class=\"btn sm\" data-act=\"ideaclear\">담은 것 비우기</button>" : "") + "</div>";
}
function ideasHtml(){
  var d = part("ideas"), items = ((d && d.items) || []).slice().reverse();
  if(!items.length) return "<section class=\"card\"><p class=\"empty\">아직 아이디어가 없어요.</p>" + ideaBarHtml() + "<div class=\"acts\"><button class=\"btn\" data-ui=\"refView=search\">키워드로 찾은 콘텐츠에서 영상 담기 →</button></div></section>";
  return "<section class=\"card\"><div class=\"card-h\"><h3>💡 댓글·파동에서 나온 아이디어</h3><span class=\"n\">" + items.length + "개 · " + esc(day(d.updatedAt)) + "</span></div>" +
    "<p class=\"lead\">「이 말로 다시 검색」은 아이디어의 키워드로 콘텐츠를 다시 찾고, 「바로 원고 짜기」는 이 아이디어로 대본 초안을 써요 (대본 탭).</p></section>" +
    items.map(function(x){
      var sc = scriptOf(x.id), busyS = openCmd("script"), busyQ = searchState().busy;
      return "<section class=\"card\"><div class=\"card-h\"><h3>" + esc(x.title || x.idea) + "</h3><span class=\"n\">" + esc(x.from || "") + (x.at ? " " + esc(x.at) : "") + "</span></div>" +
        "<p>" + esc(x.idea || "") + "</p>" +
        (x.quote ? "<div class=\"apply\" style=\"margin-top:8px\"><b>" + (x.from === "댓글" ? "댓글" : "그 구간 대사") + "</b> “" + esc(x.quote) + "”" + (x.likes ? " <span class=\"muted\">· 좋아요 " + esc(x.likes) + "</span>" : "") + "</div>" : "") +
        "<div class=\"it-d\" style=\"margin-top:6px\">" + (x.vid ? "<a href=\"https://www.youtube.com/watch?v=" + esc(x.vid) + (x.at ? "&t=" + esc(String(x.at).split(":").reduce(function(a, v){ return a * 60 + (+v || 0) }, 0)) : "") + "\" target=\"_blank\" rel=\"noopener\">" + esc(x.videoTitle || "영상") + "</a>" : "") +
          (x.kw ? " · 찾은 키워드 " + esc(x.kw) : "") + (x.angle ? " · " + txt(x.angle) : "") + (x.buyer ? " <span class=\"tag ok\">살 사람의 말</span>" : "") + "</div>" +
        ((x.keywords || []).length ? "<div class=\"chips\" style=\"margin-top:8px\">" + x.keywords.map(function(k){ return "<span class=\"tag\">" + esc(k) + "</span>" }).join("") + "</div>" : "") +
        "<div class=\"acts\">" + ((x.keywords || []).length ? "<button class=\"btn sm\" data-act=\"idearesearch\" data-id=\"" + esc(x.id) + "\"" + (busyQ ? " disabled" : "") + ">이 말로 다시 검색</button>" : "") +
          (sc ? "<button class=\"btn sm\" data-tab=\"script\">원고 보기 (" + esc(sc.status || "초안") + ") →</button>" : "<button class=\"btn sm primary\" data-act=\"ideascript\" data-id=\"" + esc(x.id) + "\"" + (busyS ? " disabled" : "") + ">바로 원고 짜기</button>") + "</div></section>";
    }).join("");
}
