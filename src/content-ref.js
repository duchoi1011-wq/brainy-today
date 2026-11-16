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
    "<div class=\"ref-m\"><a class=\"t\" href=\"" + esc(x.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(x.title) + "</a>" +
    "<div class=\"it-d\">" + esc(x.channel) + " · 구독 " + esc(x.subs || "—") + " · 조회 " + (g ? fmt(g.now) + (g.pct > 0 ? " <span class=\"up\">(+" + g.pct + "%)</span>" : "") : esc(x.views || "—")) + " · " + esc(x.len) + " · " + esc(x.published) + "</div>" +
    "<div><span class=\"tag fill\">" + esc(x.role) + "</span> <span class=\"tag\" style=\"border-color:var(--accent);color:var(--accent)\">믹서 " + refScore(x) + "점</span> <span class=\"tag p\">" + esc(x.product) + "</span> <span class=\"tag\">" + esc(x.form) + "</span> " +
    "<span class=\"tag " + bd[1] + "\">" + (x.ratio != null ? "조회÷구독 " + x.ratio + "배 · " : "") + bd[0] + "</span> " +
    (o != null ? "<span class=\"tag " + (o >= 3 ? "ok" : "") + "\">채널 평소의 " + o + "배</span> " : "") + (dv ? "<span class=\"tag " + (dv > 0 ? "ok" : "") + "\">하루 +" + fmt(dv) + "</span> " : "") +
    (x.buyer ? "<span class=\"tag " + (x.buyer === "✓" ? "ok" : "") + "\">구매자 " + x.buyer + "</span> " : "") +
    (/Great|Good/.test(x.vtPerf) ? "<span class=\"tag ok\">뷰트랩 " + esc(x.vtPerf) + "</span> " : "") +
    (x.ad ? "<span class=\"tag\">광고 추정</span> " : "") + (proof ? "" : "<span class=\"tag\">성과 근거 ✕</span>") + "</div>" +
    (x.apply ? "<div class=\"apply\"><b>적용</b> " + esc(x.apply) + "</div>" : "") +
    "<details><summary>구성 · 다시 본 구간 · 댓글</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
    "<dt>레퍼런스</dt><dd>" + esc(x.refLine) + "</dd><dt>구성</dt><dd>" + esc(x.structure) + "</dd><dt>파동</dt><dd>" + esc(x.wave) + "</dd><dt>댓글</dt><dd>" + esc(x.comments) + "</dd>" +
    "<dt>구매 결</dt><dd>" + esc(x.buyerNote) + "</dd><dt>검색어</dt><dd>" + esc(x.query) + " · " + x.round + "회차 " + esc(x.date) + " · 시트 " + x.row + "행</dd></dl></details></div></div>";
}
function viewRef(){
  var b = B(), r = part("ref"); if(!b) return "<p class=\"empty\">브랜드를 먼저 고르세요.</p>";
  var live = part("live"), chan = part("chan");
  var h = "<div class=\"chips\"><button class=\"chip" + (ui.refView === "videos" ? " on" : "") + "\" data-ui=\"refView=videos\">레퍼런스 영상<span>" + (r ? r.items.length : 0) + "</span></button>" +
    "<button class=\"chip" + (ui.refView === "chans" ? " on" : "") + "\" data-ui=\"refView=chans\">레퍼런스 채널<span>" + ((b.channels || []).length) + "</span></button>" +
    "<button class=\"chip dash\" data-act=\"refresh\"" + (openCmd("refresh") || !r || !r.items.length ? " disabled" : "") + ">↻ 지금 최신화</button></div>" +
    "<p class=\"lead\">반응 최신화 " + (live ? day(live.updatedAt) : "아직 안 함") + " · 채널 새 영상 " + (chan ? day(chan.updatedAt) : "아직 안 함") + "</p>";
  if(ui.refView === "chans") return h + chansHtml(b, chan);
  if(!r) return h + "<p class=\"empty\">아직 레퍼런스가 없어요. 키워드 탭에서 조사를 돌리면 채워져요.</p>";
  var list = r.items.filter(function(x){
    return (ui.refRole === "all" || x.role === ui.refRole) && (ui.refForm === "all" || x.form === ui.refForm) &&
      (!ui.refBuyer || (x.buyer === "✓" && isProof(x)));
  });
  var by = { mix: function(a, c){ return refScore(c) - refScore(a) }, ratio: function(a, c){ return (c.ratio || 0) - (a.ratio || 0) }, out: function(a, c){ return (outlier(c) || 0) - (outlier(a) || 0) }, grow: function(a, c){ return ((growth(c) || {}).pct || 0) - ((growth(a) || {}).pct || 0) }, date: function(a, c){ return c.row - a.row } }[ui.refSort];
  list.sort(by);
  function chip(key, val, label){ return "<button class=\"chip" + (ui[key] === val ? " on" : "") + "\" data-ui=\"" + key + "=" + val + "\">" + label + "</button>" }
  h += "<section class=\"card\"><div class=\"card-h\"><h3>잘 되는 콘텐츠</h3><span class=\"n\">" + list.length + " / " + r.items.length + "</span></div>" +
    "<div class=\"chips\">" + chip("refRole", "all", "역할 전체") + chip("refRole", "풀링", "풀링") + chip("refRole", "신뢰", "신뢰") + chip("refRole", "키", "키") + "</div>" +
    "<div class=\"chips\" style=\"margin-top:6px\">" + chip("refForm", "all", "형식 전체") + chip("refForm", "숏폼", "숏폼") + chip("refForm", "미드폼", "미드폼") +
    "<button class=\"chip" + (ui.refBuyer ? " on" : "") + "\" data-ui=\"refBuyer=" + !ui.refBuyer + "\">구매자 ✓ · 성과 근거만</button></div>" +
    "<div class=\"chips\" style=\"margin-top:6px\">" + chip("refSort", "mix", "믹서 점수순") + chip("refSort", "ratio", "조회÷구독순") + chip("refSort", "out", "채널 평소 대비순") + chip("refSort", "grow", "요즘 조회 늘어난 순") + chip("refSort", "date", "최근 조사순") + "</div>" +
    (ui.refSort === "out" ? "<p class=\"lead\" style=\"margin-top:8px\">채널 평소 = 그 채널 일반 영상 최근 30개의 가운데 조회수예요. 쇼츠는 일반 영상과 견주게 돼 배수가 크게 나올 수 있어요.</p>" : "") +
    "<div style=\"margin-top:6px\">" + (list.slice(0, ui.refMore).map(refCard).join("") || "<p class=\"empty\">조건에 맞는 레퍼런스가 없어요.</p>") + "</div>" +
    (list.length > ui.refMore ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"refMore=" + (ui.refMore + 30) + "\">더 보기 (" + (list.length - ui.refMore) + "개 남음)</button></div>" : "") + "</section>";
  return h + weekdayHtml(r.items);
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
          "<div class=\"it-d\">" + esc(c.take) + "</div>" +
          (now ? "<details><summary>새 영상 " + now.videos.length + "개 · " + esc(now.at) + "</summary><div class=\"list\">" + now.videos.map(function(v){
              return "<div class=\"it\"><div class=\"it-m\"><a href=\"https://www.youtube.com/watch?v=" + esc(v.id) + "\" target=\"_blank\" rel=\"noopener\">" + esc(v.title) + "</a>" +
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
