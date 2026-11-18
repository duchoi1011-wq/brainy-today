/* ── ＋ 새 브랜드 — 질문에 답하고, 정리를 보고, 그 정리로 브랜드를 만든다 ──
   2026-11-18 동욱: "콘텐츠 기획 앱에 새 브랜드를 생성하면 그에 맞는 회사 브랜드가 뭔지를 묻는 정리란을 묻고 정리하는 페이지를 추가해".
   질문은 볼트 「콘텐츠 기획 앱/브랜드 질문.json」(ct.data/brandq.def)이 정본 — 코드에 질문을 적지 않는다.
   답은 ct.set/_newbrand {answers:{id:글}, doc, at} 에 바로 저장(다른 기기에서 이어 씀). 「이 정리로 브랜드 만들기」 = 맥 cmd brief
   (params.name · params.doc = 정리 글 + 붙인 기획서, params.answers) → 맥이 브랜드.json 「확인 전」 초안을 만든다. */
function nbDef(){ return RAW["brandq.def"] || { steps: [] } }
function nbAll(){ var out = []; nbDef().steps.forEach(function(st){ st.qs.forEach(function(q){ out.push({ st: st, q: q }) }) }); return out }
function nbState(){ return SETS._newbrand || { answers: {} } }
function nbAns(id){ return String((nbState().answers || {})[id] || "").trim() }
function nbSave(patch){ SETS._newbrand = Object.assign({}, nbState(), patch, { updatedAt: new Date().toISOString() }); saveSet("_newbrand") }
/* 정리 글 — 맥이 프로필로 옮길 때 그대로 읽는 글 (질문 · 답 · 어느 칸인지) */
function nbSummaryText(){
  var s = nbState(), L = ["# 새 브랜드 정리 (앱 질문지 답)", ""];
  nbDef().steps.forEach(function(st){
    L.push("## " + st.name);
    st.qs.forEach(function(q){ var a = nbAns(q.id); L.push("- " + q.q + (q.field ? " [" + q.field + "]" : "") + ": " + (a ? a.replace(/\n/g, " / ") : "(비움)")) });
    L.push("");
  });
  if(String(s.doc || "").trim()) L.push("## 붙인 기획서", "", String(s.doc).trim().slice(0, 50000));
  return L.join("\n");
}
function viewNewBrand(){
  var def = nbDef(), all = nbAll(), s = nbState();
  if(!def.steps.length) return "<section class=\"card\"><p class=\"empty\">질문지를 아직 못 받았어요. 맥 동기화가 켜져 있으면 곧 떠요.</p></section>";
  var done = all.filter(function(x){ return nbAns(x.q.id) }).length, need = all.filter(function(x){ return x.q.need && !nbAns(x.q.id) });
  var busy = openCmd("brief"), firstOpen = (def.steps.filter(function(st){ return st.qs.some(function(q){ return q.need && !nbAns(q.id) }) })[0] || def.steps[0]).id;
  var h = "<section class=\"card\"><div class=\"card-h\"><h3>＋ 새 브랜드</h3><span class=\"n\">답한 것 " + done + "/" + all.length + "</span></div>" +
    "<p class=\"lead\">질문에 답하면 아래 「정리」에 모이고, 「이 정리로 브랜드 만들기」를 누르면 맥의 Claude가 브랜드 프로필 초안을 만들어 브랜드 목록에 「확인 전」으로 올려요. 모르는 칸은 비워 두세요 — 지어내지 않고 되물어요. 쓰는 대로 저장돼서 다른 기기에서 이어 써도 돼요. 맨 위에 골라진 브랜드(" + esc((B() || {}).name || "") + ")와 상관없이 새 브랜드를 따로 만들어요.</p>" +
    (need.length ? "<p class=\"note\">꼭 답할 것 ★ " + need.length + "개 남음 — " + need.map(function(x){ return "「" + esc(x.st.name) + "」" }).filter(function(v, i, a){ return a.indexOf(v) === i }).join(" ") + "</p>" : "<p class=\"note\">★ 꼭 답할 것을 다 채웠어요. 아래 정리를 보고 만들면 돼요.</p>") + "</section>";
  def.steps.forEach(function(st, i){
    var n = st.qs.filter(function(q){ return nbAns(q.id) }).length, open = (ui.wOpen || {})["nb:" + st.id];
    if(open == null) open = st.id === firstOpen;
    h += "<section class=\"card\"><details class=\"wbox\" data-wbox=\"nb:" + st.id + "\"" + (open ? " open" : "") + "><summary><b><span class=\"num muted\">" + (i + 1) + "</span> " + esc(st.name) + "</b><span class=\"wsum\">" + esc(st.what) + " · <span class=\"num\">" + n + "/" + st.qs.length + "</span></span></summary><div class=\"wbody\">" +
      st.qs.map(function(q){ var v = (ui.nbDraft && ui.nbDraft[q.id] != null) ? ui.nbDraft[q.id] : nbAns(q.id);
        return "<label class=\"nbq\"><span>" + (q.need ? "<b class=\"up\">★</b> " : "") + esc(q.q) + "</span>" +
          (q.line ? "<input type=\"text\" id=\"nbq-" + esc(q.id) + "\" data-nbq=\"" + esc(q.id) + "\" value=\"" + esc(v) + "\" placeholder=\"" + esc(q.ex || "") + "\">"
                  : "<textarea rows=\"3\" id=\"nbq-" + esc(q.id) + "\" data-nbq=\"" + esc(q.id) + "\" placeholder=\"" + esc(q.ex || "") + "\">" + esc(v) + "</textarea>") + "</label>" }).join("") +
      "</div></details></section>";
  });
  h += "<section class=\"card\"><details class=\"wbox\" data-wbox=\"nb:doc\"" + ((ui.wOpen || {})["nb:doc"] ? " open" : "") + "><summary><b>기획서가 있으면 붙이기</b><span class=\"wsum\">" + (String(s.doc || "").trim() ? fmt(String(s.doc).length) + "자 붙임" : "선택") + "</span></summary><div class=\"wbody\">" +
    "<p class=\"lead\">회사 소개서 · 채널 기획서 글을 붙이거나 파일(.md · .txt)을 고르면, 정리와 함께 Claude가 읽어요.</p>" +
    "<textarea id=\"nb-doc\" rows=\"6\" placeholder=\"기획서 내용을 여기에 붙여 넣으세요\">" + esc(s.doc || "") + "</textarea>" +
    "<div class=\"acts\"><input type=\"file\" id=\"nb-file\" accept=\".md,.txt,text/plain,text/markdown\" style=\"font-size:13px;max-width:70%\"></div></div></details></section>";
  /* 정리 — 단계마다 답을 한눈에 */
  h += "<section class=\"card\"><div class=\"card-h\"><h3>정리</h3><span class=\"n\">" + esc(nbAns("name") || "이름 아직") + "</span></div><dl class=\"kv\">" +
    def.steps.map(function(st){ var rows = st.qs.filter(function(q){ return nbAns(q.id) });
      return "<dt>" + esc(st.name) + "</dt><dd>" + (rows.length ? rows.map(function(q){ return "<div><span class=\"muted\">" + esc(q.q.replace(/\s*\(.*?\)\s*$/, "").replace(/[?？]$/, "")) + "</span> — " + esc(nbAns(q.id)).replace(/\n/g, "<br>") + "</div>" }).join("")
        : "<span class=\"muted\">아직 비어 있어요</span>") + (st.qs.some(function(q){ return q.need && !nbAns(q.id) }) ? " <span class=\"tag p\">★ 남음</span>" : "") + "</dd>" }).join("") + "</dl>" +
    "<div class=\"acts\"><button class=\"btn primary\" data-act=\"nbmake\"" + (need.length || busy ? " disabled" : "") + ">" + (busy ? "맥이 만드는 중…" : "이 정리로 브랜드 만들기") + "</button>" +
    "<button class=\"btn\" data-act=\"nbcopy\">정리 글 복사</button>" + (done || String(s.doc || "").trim() ? "<button class=\"btn\" data-act=\"nbclear\">새로 시작</button>" : "") + "</div>" +
    (need.length ? "<p class=\"it-d\">★ 칸을 다 채우면 눌러져요.</p>" : "") + "</section>";
  return h;
}
function nbAct(name){
  if(name === "nbmake"){
    var nm = nbAns("name"); if(!nm) return true;
    send("brief", "새 브랜드 「" + nm + "」 질문지 정리로 프로필 초안 만들기", { name: nm, doc: nbSummaryText(), answers: nbState().answers || {} });
    toast("맥에 보냈어요 — 초안이 되면 브랜드 목록에 「확인 전」으로 떠요"); return true;
  }
  if(name === "nbcopy"){ var t = nbSummaryText(); try{ navigator.clipboard.writeText(t).then(function(){ toast("정리 글을 복사했어요") }, function(){ alert(t) }) }catch(e){ alert(t) } return true }   // 복사가 안 되면 글을 띄운다
  if(name === "nbclear"){ if(confirm("답한 것과 붙인 기획서를 모두 지우고 새로 시작할까요?")){ ui.nbDraft = {}; SETS._newbrand = { answers: {}, updatedAt: new Date().toISOString() }; saveSet("_newbrand"); render() } return true }
  return false;
}
/* 쓰는 중엔 화면 값(ui.nbDraft)만, 칸을 떠날 때(change) 저장 — 다시 그려도 쓰던 글이 남는다 */
function nbInput(el){ ui.nbDraft = Object.assign({}, ui.nbDraft); ui.nbDraft[el.dataset.nbq] = el.value }
function nbChange(el){ var a = Object.assign({}, nbState().answers); var v = el.value.trim(); if(v) a[el.dataset.nbq] = el.value; else delete a[el.dataset.nbq]; nbSave({ answers: a }); setTimeout(render, 0) }   // 다음 칸으로 커서가 옮겨 간 뒤 그린다 — 칸마다 id(nbq-…)가 있어 render 가 그 칸에 커서를 돌려준다 (2026-11-18 검증: Tab 뒤 친 글이 사라짐)
