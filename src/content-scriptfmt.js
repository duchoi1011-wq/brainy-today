/* ── 대본 글 모양 — 제목 크기 · 밑줄 · 장면 번호로 핵심이 한눈에 ──
   2026-11-28 동욱: "기획앱의 대본이든 촬영실의 대본이든 글씨 제목 크기와 밑줄 등으로 핵심 등을 파악하기 좋게 대본을 바꿔.
   특히 이번 모솔 대본 같은 경우 요약할 때는 그렇게 하는 게 더 필요하지. 대본으로 줄줄 이어지는 것도 제목 등 필요 체크 부분은 그렇게".
   대본.json 글(맥 content-production 이 쓰는 마크다운 비슷한 글)을 그대로 읽어 모양만 입힌다 — 글은 고치지 않는다.
   같은 규칙이 촬영실에도 있다: edit-mixer/app/js/script-fmt.js — 읽는 표시를 바꾸면 둘 다. 한 줄 전체 【…】 도 제목, ( … ) 도 화면 지시.
   읽는 표시: # · ## · ### 제목(끝의 「· 약 N초」는 시간 칩) · 「- 이름: 내용」(이름 굵게, 「꼭」「핵심」이 든 이름은 내용에 밑줄) · 들여 쓴 「  - 」 하위 줄 ·
   한 줄 전체가 [ … ] 이면 화면·그래픽 지시 칩 · **굵게** · __밑줄__ · ==형광==. 요약(summary)은 「- 1. 역할: 한 줄 · 약 N초」 줄을 번호·역할(밑줄)·시간으로. */
function sfInline(s){
  return plainWords(esc(s))
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<u class=\"sf-u\">$1</u>")
    .replace(/==([^=]+)==/g, "<mark class=\"sf-mark\">$1</mark>")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1");
}
function sfTime(t){ var m = String(t).match(/^(.*?)\s*·\s*(약\s*\d+\s*초|\d+\s*초)\s*$/); return m ? { t: m[1], sec: m[2] } : { t: t, sec: "" } }
function scriptFmt(text){
  var out = [], list = 0;
  function close(){ while(list > 0){ out.push("</ul>"); list-- } }
  String(text || "").split("\n").forEach(function(raw){
    var line = raw.replace(/\s+$/, ""), m;
    if(!line.trim()){ close(); return }
    if((m = line.match(/^(#{1,4})\s+(.*)$/))){ close(); var tm = sfTime(m[2]), lv = Math.min(m[1].length + 1, 5);
      out.push("<h" + lv + " class=\"sf-h sf-h" + m[1].length + "\">" + sfInline(tm.t) + (tm.sec ? " <span class=\"sf-sec\">" + esc(tm.sec) + "</span>" : "") + "</h" + lv + ">"); return }
    if((m = line.match(/^\s*【(.+)】\s*$/))){ close(); var tm2 = sfTime(m[1]); out.push("<h4 class=\"sf-h sf-h3\">" + sfInline(tm2.t) + (tm2.sec ? " <span class=\"sf-sec\">" + esc(tm2.sec) + "</span>" : "") + "</h4>"); return }   // 【장면 제목】 (촬영실 스토리보드 글)
    if((m = line.match(/^\s*[\[(]([^\])]+)[\])]\s*$/))){ close(); out.push("<div class=\"sf-cue\">🎬 " + sfInline(m[1]) + "</div>"); return }   // 화면·그래픽 지시 (예: [MG-1: 인트로 …] · (말 없음 — MG-1))
    if((m = line.match(/^(\s*)[-*]\s+(.*)$/))){
      var depth = m[1].length >= 2 ? 2 : 1;
      while(list < depth){ out.push("<ul class=\"sf-ul\">"); list++ } while(list > depth){ out.push("</ul>"); list-- }
      var kv = depth === 1 && m[2].match(/^([^:：「」]{1,12})[:：]\s*(.*)$/);   // 「이름: 내용」은 맨 앞 줄만 — 하위 줄(말할 요점 속 「그래서 오늘 결심: …」)은 그대로
      if(kv){ var key = /꼭|핵심|한 줄/.test(kv[1]);
        out.push("<li class=\"sf-kv" + (key ? " sf-key" : "") + "\"><b class=\"sf-k\">" + esc(kv[1]) + "</b> " + (kv[2] ? (key ? "<u class=\"sf-u\">" + sfInline(kv[2]) + "</u>" : sfInline(kv[2])) : "") + "</li>") }
      else out.push("<li>" + sfInline(m[2]) + "</li>");
      return }
    close(); out.push("<p class=\"sf-p\">" + sfInline(line) + "</p>");
  });
  close();
  return "<div class=\"sf\">" + out.join("") + "</div>";
}
/* 요약 — 「- 1. 훅: 모솔이라고 말했더니 … · 약 10초」 줄마다 번호 · 역할(밑줄) · 한 줄 · 시간. 그 모양이 아닌 줄은 scriptFmt 그대로 */
function summaryFmt(text){
  var lines = String(text || "").split("\n").filter(function(l){ return l.trim() }), rows = [], rest = [];
  lines.forEach(function(l){ var m = l.match(/^\s*[-*]?\s*(\d+)[.)]\s*(.*)$/); if(!m){ rest.push(l); return }
    var tm = sfTime(m[2]), kv = tm.t.match(/^([^:：]{1,14})[:：]\s*(.*)$/);
    rows.push("<div class=\"sf-row\"><span class=\"sf-n\">" + esc(m[1]) + "</span><div class=\"sf-what\">" + (kv ? "<u class=\"sf-u sf-role\">" + sfInline(kv[1]) + "</u> " + sfInline(kv[2]) : "<b>" + sfInline(tm.t) + "</b>") + "</div>" + (tm.sec ? "<span class=\"sf-sec\">" + esc(tm.sec) + "</span>" : "") + "</div>") });
  return (rows.length ? "<div class=\"sf-sum\">" + rows.join("") + "</div>" : "") + (rest.length ? scriptFmt(rest.join("\n")) : "");
}
