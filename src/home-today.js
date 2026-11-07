    var canCmd = S.db && !S.readOnly && S.mcp && cmdTriggerId();
    h += morningCard(canCmd);
    var fresh = (S.reports || []).filter(function (r) { return r.status !== "답함" && r.kind !== "morning" && r.date >= ymd(new Date(NOW.getTime() - 3 * 86400000)); });
    var repCmd = function (r) { return lastCmd(function (t) { return t.indexOf("reports/" + r.id + ")") >= 0; }); };
    fresh = fresh.filter(function (r) { var c = repCmd(r); return !(c && c.status === "끝"); });
    if (!m) return h + (fresh.length ? reportCard(fresh[0], true) : "") + emptyMain();
    var b = m.brainy;
    h += '<div class="card brief"><p class="line">' + esc(b.line) + '</p><dl class="kv"><dt>오늘 한 걸음</dt><dd>' + esc(b.next) + "</dd><dt>잘한 것</dt><dd>" + esc(b.good) + "</dd><dt>직면할 것</dt><dd>" + esc(b.confront) + "</dd></dl></div>";
    var ans = (S.checks[TODAY] && S.checks[TODAY].answers) || {}, qa = S.qa || (S.qa = {});
    var openQ = (b.questions || []).filter(function (q) { return !ans[q.id] || qa[q.id] || (S.ic["q:" + q.id] || []).length; });
    if (openQ.length) {
      h += '<section class="card"><h2>Brainy 질문</h2>';
      openQ.forEach(function (q) {
        if (qa[q.id]) { h += '<div class="q"><p>' + esc(q.text) + '</p><p class="small' + (qa[q.id].err ? '" style="color:var(--warn)">' : ' muted">') + (qa[q.id].busy ? "Brainy가 바로 반영하는 중…" : esc(qa[q.id].msg)) + "</p></div>"; return; }
        var draft = S.drafts[q.id] != null ? S.drafts[q.id] : (ans[q.id] || "");
        var savedNow = ans[q.id] && ans[q.id] === draft;
        h += '<div class="q"><p>' + esc(q.text) + '</p><textarea id="ans-' + q.id + '" data-q="' + q.id + '" rows="1" placeholder="한 줄이면 돼요"' + (S.db && !S.readOnly ? "" : " disabled") + ">" + esc(draft) + '</textarea><div class="qrow">' + (savedNow ? '<span class="pill good">보냄</span>' : "") + '<button class="btn" data-act="answer" data-q="' + q.id + '"' + (S.db && !S.readOnly && draft.trim() && !savedNow ? "" : " disabled") + '>로그</button><button class="btn primary" data-act="ictalk" data-k="q:' + q.id + '" data-src="ans-' + q.id + '"' + (S.icBusy["q:" + q.id] ? " disabled" : "") + '>💬 Brainy와 대화</button></div>' + icHtml("q:" + q.id) + "</div>";
      });
      h += "</section>";
    }
    if (fresh.length) h += '<section class="section"><h2>📋 최근 점검</h2><p class="small muted">예약 점검이 끝나면 자동으로 떠요 · 답이 반영되면 사라져요</p>' + fresh.slice(0, 1).map(function (r, i) {
      var c = repCmd(r);
      if (c && /처리 중|보내는 중/.test(c.status || "")) return '<div class="card brief"><p class="line">' + (REPORT_ICON[r.kind] || "📋") + " " + esc(r.title || "") + ' — 답을 보냈어요</p><p class="small muted">Brainy가 처리하는 중 · 끝나면 이 줄은 사라지고 결과는 기록 탭에 남아요</p></div>';
      return reportCard(r, i === 0);
    }).join("") + "</section>";

    var items = todayItems(), list = todayList(), done = list.filter(function (x) { return items[x.key]; }).length;
    var p = list.length ? Math.round(done / list.length * 100) : 0;
    var day = curDay(), w = S.db && !S.readOnly;
    h += '<section class="section"><div class="progress-row"><div><h2>오늘 체크</h2><p class="small muted">항목을 누르면 여기서 바로 써요 · 칸마다 Brainy와 대화</p></div><div class="ring" style="--p:' + p + '"><span>' + done + "/" + list.length + "</span></div></div><div class='checks'>" + checkRows(list, day, w, true) + "</div></section>";
    return h;
  }

  /* ---------- 오늘 체크 줄