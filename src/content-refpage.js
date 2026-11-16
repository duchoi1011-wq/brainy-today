/* ── 참고 탭 — 추천 하나를 대본으로 만들기 전에, 그 채널의 결에 맞는 레퍼런스를 찾아 정리한 참고 페이지 ──
   흐름: 추천 탭에서 고름 → 「참고 페이지 만들기」(맥의 Claude가 채널 결·레퍼런스 채널·내 채널을 뒤져 칸마다 채움) → 여기서 읽고
        모자라면 한 줄 적어 「더 찾기」, 됐으면 「이 참고로 확정」 → 확정한 것만 「대본 초안 만들기」.
   자료는 볼트 `<브랜드>/참고.json` (ct.data/<브랜드>.refpage) — content-production 스킬이 쓴다. 확정 여부는 앱이 ct.set refok 에 둔다
   (스킬이 쓴 status 가 「확정」이면 이미 확정된 것으로 본다). 칸 이름·순서는 스킬이 쓴 slot 값을 그대로 묶는다. */
function pageOf(id){ var p = part("refpage"); return p && p.items ? p.items.filter(function(x){ return x.rec === id })[0] : null }
function pageOk(p){ return p.status === "확정" || !!((SETS[cur] || {}).refok || {})[p.rec] }
function toneHtml(b){
  var t = b.tone; if(!t) return "";
  return "<section class=\"card\"><details><summary>이 채널의 결 — 참고를 고르는 기준</summary>" +
    "<div class=\"list\" style=\"margin-top:6px\">" + (t.rules || []).map(function(r){ return "<div class=\"it\"><div class=\"it-m\">" + esc(r) + "</div></div>" }).join("") + "</div>" +
    "<dl class=\"kv small\" style=\"margin-top:8px\">" + [["쓰는 말", t.words], ["화면", t.screen], ["하지 않는 것", t.avoid]].filter(function(r){ return r[1] }).map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>" }).join("") + "</dl>" +
    (t.todo ? "<p class=\"note\" style=\"margin-top:8px\">" + esc(t.todo) + "</p>" : "") + "<p class=\"lead\" style=\"margin-top:8px\">정본 · <span class=\"mono\">" + esc(t.source || "") + "</span></p></details></section>";
}
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
  h += toneHtml(b);
  items.forEach(function(p){
    var ok = pageOk(p), sm = p.summary || {}, sc = scriptOf(p.rec), groups = {}, order = [];
    (p.refs || []).forEach(function(r){ if(!groups[r.slot]){ groups[r.slot] = []; order.push(r.slot) } groups[r.slot].push(r) });
    h += "<section class=\"card\"><div class=\"card-h\"><h3><span class=\"num muted\">" + esc(p.rec) + "</span> " + esc(p.title) + "</h3><span class=\"n\">" + (p.refs || []).length + "개</span></div>" +
      "<div><span class=\"tag fill\">" + esc(p.role || "") + "</span> <span class=\"tag " + (ok ? "ok" : "p") + "\">" + (ok ? "확정" : esc(p.status || "초안")) + "</span>" + (sc ? " <span class=\"tag ok\">대본 " + esc(sc.status || "있음") + "</span>" : "") + "</div>" +
      "<h4>가져올 것 — 한 장 요약</h4><dl class=\"kv\">" + [["첫 3초 훅", sm.hook], ["구성", sm.structure], ["화면", sm.screen], ["말투", sm.voice], ["CTA", sm.cta]].filter(function(r){ return r[1] })
        .map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>" }).join("") + "</dl>" +
      order.map(function(slot){
        return "<h4>" + esc(slot) + " <span class=\"num muted\">" + groups[slot].length + "</span></h4>" + groups[slot].map(function(r){
          return "<div class=\"ref\">" + (r.vid ? "<a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\"><img loading=\"lazy\" alt=\"\" src=\"https://i.ytimg.com/vi/" + esc(r.vid) + "/mqdefault.jpg\"></a>" : "") +
            "<div class=\"ref-m\"><a class=\"t\" href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(r.title || r.channel) + "</a>" +
            "<div class=\"it-d\">" + [r.title ? r.channel : "", r.published, r.len, r.perf].filter(Boolean).map(esc).join(" · ") + "</div>" +
            (r.take ? "<div class=\"apply\"><b>가져올 것</b> " + esc(r.take) + "</div>" : "") +
            (r.fit ? "<div class=\"it-d\"><b>결에 맞는 이유</b> " + esc(r.fit) + "</div>" : "") +
            "<details><summary>첫 3초 · 구조 · 화면 · 댓글 · 권리</summary><dl class=\"kv small\" style=\"margin-top:6px\">" +
            [["첫 3초 훅", r.hook], ["구조", r.structure], ["화면", r.screen], ["댓글", r.comments], ["권리", r.rights], ["더 본 영상", r.more]].filter(function(x){ return x[1] }).map(function(x){ return "<dt>" + x[0] + "</dt><dd>" + esc(x[1]) + "</dd>" }).join("") +
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
  return h;
}
