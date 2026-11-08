  /* ── 칸 안 대화: 직접 쓰는 칸마다 「💬 Brainy와 대화」 — 그 칸 바로 아래에서 이어진다 (build.py 가 끼움) ── */
  function icCtx(key) {
    var k = key.split(":")[0], rest = key.slice(k.length + 1), d = curDay();
    if (k === "q") { var q = (((S.main || {}).brainy || {}).questions || []).filter(function (x) { return x.id === rest; })[0]; return "오늘 탭 「Brainy 질문」 칸 — 결산 때 Brainy가 한 질문: 「" + (q ? q.text : rest) + "」. 동욱의 답을 듣고 필요하면 앱 도구로 바로 반영한다."; }
    if (k === "memo") return "기록 탭 「지금 떠오른 것」 메모 칸 — 동욱이 쓰던 메모를 같이 다듬거나 정리한다. 남기라고 하면 add_note 로 남긴다.";
    if (k === "tl") { var th = findTask(rest); return "태스크 「" + rest + "」 기록 칸 — 동욱이 이 태스크에 한 일·정한 것·막힌 것을 이야기한다. 태스크 노트: " + (th ? clip(th.task.body, 5000) : "(없음)"); }
    if (k === "fd") return "오늘 쓰기 「" + labelOf(rest) + "」 칸 (key " + rest + ") — 지금 적힌 것: " + clip(JSON.stringify(((d.notes || {})[rest]) || {}), 4000) + ". 동욱이 이 칸 글을 같이 쓰거나 다듬자고 하면 write_today 로 그 칸에 바로 적는다.";
    if (k === "ans") { var r = (S.reports || []).filter(function (x) { return x.id === rest; })[0]; return "기록 탭 「점검 결과」 칸 — " + (r ? (r.title || "") + " " + (r.date || "") + ": " + clip(JSON.stringify({ lines: r.lines, items: r.items }), 5000) : rest) + ". 항목을 어떻게 할지 동욱과 이야기하고, 정해지면 run_command 로 보낸다."; }
    return "";
  }
  function icId(key, i) { return "icm-" + key.replace(/[^\w가-힣-]/g, "_") + "-" + i; }
  function icHtml(key, own) {
    var th = S.ic[key] || [], busy = !!S.icBusy[key];
    if (!th.length && !own) return "";
    var h = '<div class="ic">' + th.map(function (m, i) { return '<div class="lgm ' + m.r + '" id="' + esc(icId(key, i)) + '">' + (m.r === "ai" ? "<b>Brainy</b> " : "") + esc(m.t || (m.pending ? "생각하는 중…" : "")) + "</div>"; }).join("");
    h += '<div class="lgask"><textarea class="grow" data-icq="' + esc(key) + '" rows="1" placeholder="' + (th.length ? "이어서 Brainy에게…" : "💬 이 칸 Brainy와 이야기 — 예: 같이 정리해 줘") + '"' + (busy ? " disabled" : "") + ">" + esc(S.icQ[key] || "") + '</textarea><button class="btn" data-act="icsend" data-k="' + esc(key) + '"' + (busy ? " disabled" : "") + ">" + (busy ? "…" : th.length ? "보내기" : "💬 대화") + "</button></div>";
    return h + "</div>";
  }
  function icTalk(key, text) {
    text = String(text || "").trim(); if (!text || S.icBusy[key]) return;
    var th = S.ic[key] = S.ic[key] || [];
    if (!S.sample || S.sampleOff) { th.push({ r: "warn", t: "지금은 Brainy와 대화할 수 없어요." }); render(); return; }
    var hist = th.filter(function (m) { return (m.r === "me" || m.r === "ai") && m.t; }).slice(-10).map(function (m) { return { role: m.r === "me" ? "user" : "assistant", content: m.t }; });
    th.push({ r: "me", t: text }); var ai = { r: "ai", t: "", pending: true }; th.push(ai); S.icQ[key] = ""; S.icBusy[key] = true;
    // 제안·점검 카드의 대화는 「Brainy 대화」 칸에 쌓인다 — 답이 보이게 그 칸을 연다
    var tk = key === "mo" ? "mo/t" : key.indexOf("ans:rp:") === 0 ? key.slice(4) + "/t" : null; if (tk) S.thOpen[tk] = true;
    render();
    var rules = chatRules() + "\n\n=== 지금 이 대화 ===\n" + icCtx(key) + "\n앱 화면의 그 칸 바로 아래에서 나누는 짧은 대화다. 3~5줄, 마크다운 기호 없이, 해요체. 기록·반영을 원하면 앱 도구로 바로 하고 무엇을 했는지 한 줄로 말한다.";
    var elId = icId(key, th.length - 1);
    var opts = { cache: false, onText: function (u) { ai.t = u.text; ai.pending = false; var el = document.getElementById(elId); if (el) el.innerHTML = "<b>Brainy</b> " + esc(u.text); } };
    if (S.toolsOK) opts.tools = chatTools();
    S.sample([{ role: "user", content: rules }].concat(hist).concat([{ role: "user", content: text }]), opts)
      .then(function (r) { ai.t = (r && r.text) || ai.t; }, function (e) { ai.t = (e && e.text) || "답을 받지 못했어요. 다시 보내 주세요."; })
      .then(function () { ai.pending = false; S.icBusy[key] = false; render(); });
  }
  /* ── 긴 할 일 줄을 「짧은 제목 — 설명」으로 나눠 보이기 (볼트 규칙: 완료 기준·결산 줄은 짧은 제목 — 설명) ── */
  function stepSplit(s) {
    var x = String(s || "").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    var i = x.indexOf(" — "), t = i > 0 ? x.slice(0, i) : x, d = i > 0 ? x.slice(i + 3) : "";
    if (t.length > 30) { var j = t.slice(6).search(/ · | \(|: | → /); if (j >= 0) { j += 6; d = t.slice(j).replace(/^ · |^: |^ → /, "").trim() + (d ? " — " + d : ""); t = t.slice(0, j); } }
    if (t.length > 34) { d = "…" + t.slice(32) + (d ? " — " + d : ""); t = t.slice(0, 32) + "…"; }
    return { t: t, d: d };
  }
  function stepHtml(s, cls) { var p = stepSplit(s); return '<b class="' + (cls || "") + '">' + esc(p.t) + "</b>" + (p.d ? '<span class="sd" title="' + esc(p.d) + '">' + esc(clip(p.d, 110)) + "</span>" : ""); }
