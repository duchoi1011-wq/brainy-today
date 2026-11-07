  /* ---------- 「로그」 버튼 → 세 앱(Brainy 홈·맥 단축키·체화 단어장)이 같이 보는 기록 (logs) 에도 한 줄 ----------
     원래 저장(checks·inbox·tasklog·명령)은 그대로 하고, 같은 내용을 shim 의 BRAINY.log 로 한 번 더 남긴다. */
  var LOG_ACT = { savenote: 1, answer: 1, tlsave: 1, mosend: 1, mofollow: 1, anssend: 1, lglog: 1, fdlog: 1 };
  function logTap(t, act) {
    if (!LOG_ACT[act] || !window.BRAINY || !window.BRAINY.log || !S.db || S.readOnly) return;
    var where = "", tx = "";
    if (act === "savenote") { where = "지금 떠오른 것"; tx = S.note; }
    else if (act === "answer") { var q = t.getAttribute("data-q"), qp = t.closest(".q") && t.closest(".q").querySelector("p"); where = "Brainy 질문" + (qp ? " · " + clip(qp.textContent, 40) : ""); tx = S.drafts[q]; }
    else if (act === "tlsave") { var tt = t.getAttribute("data-title"); where = "태스크 · " + tt; tx = S.tlDraft[tt]; }
    else if (act === "mosend") { where = "아침 제안 · 고쳐 올리기"; tx = S.moDraft; }
    else if (act === "mofollow") { where = "아침 제안"; tx = S.moDraft; }
    else if (act === "lglog") { var ln = t.getAttribute("data-n"); where = "결산 대기 · " + ln; tx = S.lgQ[ln]; }
    else if (act === "anssend") {
      var sc = t.getAttribute("data-scope"), st = ansState(sc), rr = (S.reports || []).filter(function (x) { return "rp:" + x.id === sc; })[0];
      where = "점검 결과" + (rr ? " · " + (rr.title || rr.kind) : "");
      tx = ansPicked(sc).map(function (n) { var x = st.sel[n]; return n + " " + (x.v || "지시") + (String(x.note || "").trim() ? " — " + String(x.note).trim() : ""); }).concat(String(st.all || "").trim() ? [String(st.all).trim()] : []).join("\n");
    }
    else if (act === "fdlog") {
      var fk = t.getAttribute("data-key"), it = todayList().filter(function (x) { return x.key === fk; })[0], parts = [];
      document.querySelectorAll('[data-fd][data-k="' + fk + '"]').forEach(function (fe) { if (String(fe.value || "").trim()) parts.push(fe.value.trim()); });
      where = "오늘 체크 · " + ((it && it.label) || fk); tx = parts.join("\n");
    }
    tx = String(tx || "").trim(); if (!tx) return;
    window.BRAINY.log(where, tx);
  }
