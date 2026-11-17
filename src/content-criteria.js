/* ── 추천 기준 — 조절 · 우선 (추천 칸 맨 위) ──
   2026-11-17 동욱: "추천을 고르는 기준 매우 적절해. 이 기준을 내가 자동적으로 조율할 수 있게 조절과 우선 칸을 만들면 좋겠어".
   ① 재료(☆ · ★ · 씨앗 단어 · 조사) ② 잘된 영상만(구독자 대비 최소 배수) ③ 우선순위(위일수록 크게 본다) ④ 우리 채널로(역할마다 몇 편).
   값은 ct.set recCrit(+ 역할 수는 ct.set roles) — 「추천 받기」 때 params.criteria 로 맥에 가고, 콘텐츠 칸 종합 점수(srScore)도 같은 우선순위를 쓴다.
   아직 손대지 않은 브랜드는 믹서.json 브랜드 템플릿 비중을 기본 순서로 쓴다 (그래서 처음 열면 지금까지와 같은 점수). */
var CRIT = [
  { id: "ratio", name: "구독자보다 많이 본 영상", what: "채널 크기를 빼고 봐도 잘된 영상 — 주제 덕에 터진 것", mix: "ref_ratio" },
  { id: "comment", name: "좋아요 많은 댓글", what: "시청자의 고민·질문이 많이 달린 영상", mix: "ref_comment" },
  { id: "fit", name: "구매 욕구가 맞는 영상", what: "영상 분석에서 시청자 욕구가 내 상품 구매 욕구와 같음·비슷 (분석한 영상만)", mix: "ref_fit" },
  { id: "wave", name: "많이 다시 본 구간", what: "사람들이 되돌려 본 장면이 있는 영상", mix: "ref_wave" },
  { id: "topic", name: "우리 주제와 맞는 영상", what: "제목에 정체성 단어·콘텐츠 축·상품 이름이 든 영상", mix: "ref_topic" },
  { id: "fresh", name: "최근 영상", what: "올라온 지 오래되지 않은 영상", mix: "ref_fresh" }
];
var REC_USE = [["fav", "☆ 즐겨찾기 영상"], ["pin", "★ 키워드로 찾은 영상"], ["seed", "씨앗 단어로 찾은 영상"], ["ref", "조사한 레퍼런스"]];
var RANK_W = [6, 5, 4, 3, 2, 1];   // 우선순위 1위부터의 비중
function recCrit(){
  var c = (SETS[cur] || {}).recCrit || {}, m = M();
  var order = c.order || CRIT.slice().sort(function(a, b){ return (m[b.mix] || 0) - (m[a.mix] || 0) }).map(function(x){ return x.id });
  return { set: !!c.order, order: order, off: c.off || {}, use: Object.assign({ fav: true, pin: true, seed: true, ref: true }, c.use || {}),
    favFirst: c.favFirst !== false, minRatio: c.minRatio != null ? c.minRatio : (m.th_ratio || 1) };
}
/* 기준마다 비중 — 손댄 브랜드는 우선순위 순서(6·5·4…, 끈 것 0), 아니면 믹서 템플릿 값 */
function critWeights(){
  var c = recCrit(), m = M(), w = {};
  if(!c.set){ CRIT.forEach(function(x){ w[x.id] = c.off[x.id] ? 0 : (m[x.mix] || 0) }); return w }
  var r = 0; c.order.forEach(function(id){ w[id] = c.off[id] ? 0 : RANK_W[r++] || 1 });
  return w;
}
function recCritHtml(rd){
  var c = recCrit(), s = S(), f = (SETS[cur] || {}).favc || {}, favIds = Object.keys(f), pins = Object.keys(s.pin).filter(function(k){ return s.pin[k] && !s.ex[k] });
  var r = part("rec"), last = r && r.updatedAt ? Date.parse(r.updatedAt) : 0, fresh = favIds.filter(function(v){ return !last || Date.parse(f[v].at) > last });
  var nRole = roleNames().reduce(function(t, n){ return t + (s.roles[n] || 0) }, 0), busy = openCmd("recommend");
  var hasMat = (c.use.ref && part("ref")) || (c.use.fav && favIds.length) || (c.use.pin && pins.length) || (c.use.seed && seedsOf().length);
  function chip(on, k, label){ return "<button class=\"chip" + (on ? " on" : "") + "\" data-act=\"rc\" data-k=\"" + k + "\">" + label + "</button>" }
  function step(n, t, body){ return "<div class=\"it\"><span class=\"num muted\">" + n + "</span><div class=\"it-m\"><div class=\"it-h\"><b>" + t + "</b></div>" + body + "</div></div>" }
  var cnt = null; if(rd){ cnt = { fav: 0, pin: 0, seed: 0, ref: 0 }; rd.items.forEach(function(x){ cnt[recFrom(x).k]++ }) }
  var use = "<div class=\"chips\">" + REC_USE.map(function(u){ var n = u[0] === "fav" ? favIds.length : u[0] === "pin" ? pins.length : u[0] === "seed" ? seedsOf().length : (part("ref") ? part("ref").items.length : 0);
      return chip(c.use[u[0]], "use:" + u[0], u[1] + " <span>" + n + "</span>") }).join("") + chip(c.favFirst, "favFirst", "☆ 영상을 맨 먼저") + "</div>" +
    (cnt ? "<div class=\"it-d\">지난 추천은 ☆ " + cnt.fav + " · ★ " + cnt.pin + " · 씨앗 단어 " + cnt.seed + (cnt.ref ? " · 조사 " + cnt.ref : "") + "개에서 나왔어요." + (fresh.length ? " <b>그 뒤에 ☆한 " + fresh.length + "개는 아직 안 들어갔어요.</b>" : "") + "</div>" : "") +
    (favIds.length ? "<details><summary>☆ 즐겨찾기 영상 " + favIds.length + "개</summary><div class=\"list\" style=\"margin-top:6px\">" + favIds.map(function(v){ var x = f[v];
        return "<div class=\"it\"><div class=\"it-m\"><a href=\"https://www.youtube.com/watch?v=" + esc(v) + "\" target=\"_blank\" rel=\"noopener\">" + esc(x.title || v) + "</a><div class=\"it-d\">" + esc(x.channel || "") + (x.kw ? " · 키워드 " + esc(x.kw) : "") + (fresh.indexOf(v) >= 0 && r ? " · <b>아직 추천 전</b>" : "") + "</div></div></div>" }).join("") + "</div></details>"
      : "<div class=\"it-d\">아직 ☆한 영상이 없어요. <button class=\"btn sm\" data-go=\"ref|refView=search\">콘텐츠 칸에서 ☆ 누르기 →</button></div>") +
    (pins.length ? "<details><summary>★ 키워드 " + pins.length + "개</summary><div class=\"chips\" style=\"margin-top:6px\">" + pins.map(function(k){ return "<span class=\"tag\">" + esc(k) + "</span>" }).join("") + "</div></details>" : "");
  var ratio = "<div class=\"it-d\">조회수가 아니라 「구독자 수보다 몇 배 더 봤나」로 걸러요. 이보다 못한 영상은 근거로 쓰지 않아요.</div><div class=\"chips\">" +
    [[0, "따지지 않음"], [1, "1배 이상"], [3, "3배 이상"], [10, "10배 이상"]].map(function(o){ return chip(c.minRatio === o[0], "minRatio:" + o[0], o[1]) }).join("") + "</div>";
  var rank = 0, pri = "<div class=\"it-d\">위에 있을수록 크게 봐요. 끈 것은 안 봐요. 콘텐츠 칸의 종합 점수도 이 순서를 따라요." + (c.set ? "" : " (지금은 기본 순서예요.)") + "</div><div class=\"list\">" + c.order.map(function(id, i){
      var x = CRIT.filter(function(k){ return k.id === id })[0], off = c.off[id]; if(!x) return "";
      return "<div class=\"it\"><span class=\"num" + (off ? " muted" : "") + "\">" + (off ? "—" : ++rank) + "</span><div class=\"it-m\"" + (off ? " style=\"opacity:.5\"" : "") + "><div class=\"it-h\"><b>" + esc(x.name) + "</b></div><div class=\"it-d\">" + esc(x.what) + "</div></div>" +
        "<span style=\"display:flex;gap:2px\"><button class=\"mk\" data-act=\"rc\" data-k=\"up:" + id + "\" aria-label=\"" + esc(x.name) + " 위로\" title=\"위로\"" + (i ? "" : " disabled") + ">↑</button>" +
        "<button class=\"mk\" data-act=\"rc\" data-k=\"down:" + id + "\" aria-label=\"" + esc(x.name) + " 아래로\" title=\"아래로\"" + (i < c.order.length - 1 ? "" : " disabled") + ">↓</button>" +
        "<button class=\"mk" + (off ? "" : " no") + "\" data-act=\"rc\" data-k=\"off:" + id + "\" aria-pressed=\"" + !off + "\" title=\"" + (off ? "다시 보기" : "안 보기") + "\">" + (off ? "○" : "✓") + "</button></span></div>" }).join("") + "</div>";
  var roles = "<div class=\"list\">" + roleNames().map(function(n){ var what = ((B().roles || []).filter(function(x){ return x.name === n })[0] || {}).what || "";
      return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(n) + "</b> <span class=\"num\">" + s.roles[n] + "편</span></div><div class=\"it-d\">" + esc(what) + "</div></div>" +
        "<span style=\"display:flex;gap:2px\"><button class=\"mk\" data-act=\"rc\" data-k=\"role:" + esc(n) + ":-1\" aria-label=\"" + esc(n) + " 한 편 빼기\"" + (s.roles[n] > 0 ? "" : " disabled") + ">−</button>" +
        "<button class=\"mk\" data-act=\"rc\" data-k=\"role:" + esc(n) + ":1\" aria-label=\"" + esc(n) + " 한 편 더\"" + (s.roles[n] < 8 ? "" : " disabled") + ">＋</button></span></div>" }).join("") + "</div>";
  return "<section class=\"card\"><div class=\"card-h\"><h3>추천 기준 — 조절 · 우선</h3>" + (c.set || (SETS[cur] || {}).recCrit ? "<button class=\"btn sm\" data-act=\"rc\" data-k=\"reset\">기본값으로</button>" : "") + "</div>" +
    "<p class=\"lead\">맥의 Claude는 이 네 단계로 추천을 골라요. 바꾸면 바로 저장되고, 다음 「추천 받기」부터 이 기준대로 골라요.</p><div class=\"list\">" +
    step(1, "재료 — 어떤 영상에서 고를까", use) + step(2, "잘된 영상만", ratio) + step(3, "무엇을 먼저 볼까 (우선순위)", pri) +
    step(4, "우리 채널로 — 몇 편씩", "<div class=\"it-d\">사람 모으는 영상(풀링)은 상품을 팔지 않고, 상품 파는 영상(키)은 내 상품으로 고민을 해결해 보여 줘요.</div>" + roles) + "</div>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"recommend\"" + (busy || !nRole || !hasMat ? " disabled" : "") + ">" + (busy ? "맥이 추천 만드는 중…" : rd ? "이 기준으로 추천 새로 받기" : "이 기준으로 추천 받기") + "</button>" +
    (!hasMat ? "<span class=\"lead\" style=\"margin:0\">켠 재료가 비어 있어요.</span>" : !nRole ? "<span class=\"lead\" style=\"margin:0\">편 수가 0이에요.</span>" : "") + "</div></section>";
}
function recCritAct(k){
  var c = recCrit(), o = { order: c.set ? c.order.slice() : undefined, off: Object.assign({}, c.off), use: Object.assign({}, c.use), favFirst: c.favFirst, minRatio: c.minRatio };
  if(k === "reset"){ setS({ recCrit: null }); return }
  var p = k.split(":");
  if(p[0] === "role"){ var rs = Object.assign({}, S().roles); rs[p[1]] = Math.max(0, Math.min(8, (rs[p[1]] || 0) + +p[2])); setS({ roles: rs }); return }
  if(p[0] === "use") o.use[p[1]] = !o.use[p[1]];
  if(p[0] === "favFirst") o.favFirst = !o.favFirst;
  if(p[0] === "minRatio") o.minRatio = +p[1];
  if(p[0] === "off") o.off[p[1]] = !o.off[p[1]];
  if(p[0] === "up" || p[0] === "down"){ o.order = c.order.slice(); var i = o.order.indexOf(p[1]), j = p[0] === "up" ? i - 1 : i + 1; if(j >= 0 && j < o.order.length){ o.order[i] = o.order[j]; o.order[j] = p[1] } }
  setS({ recCrit: o });
}
/* 맥에 보낼 기준 — 쉬운 말 이름까지 같이 보낸다 */
function recCritParams(){
  var c = recCrit(), r = 0;
  return { use: c.use, favFirst: c.favFirst, minRatio: c.minRatio,
    priority: c.order.filter(function(id){ return !c.off[id] }).map(function(id){ var x = CRIT.filter(function(k){ return k.id === id })[0]; return { id: id, name: x.name, rank: ++r } }),
    off: CRIT.filter(function(x){ return c.off[x.id] }).map(function(x){ return x.name }) };
}
