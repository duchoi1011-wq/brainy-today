    var canCmd = S.db && !S.readOnly && S.mcp && cmdTriggerId();
    h += morningCard(canCmd);
    var fresh = (S.reports || []).filter(function (r) { return r.status !== "답함" && r.kind !== "morning" && r.date >= ymd(new Date(NOW.getTime() - 3 * 86400000)); });
    var repCmd = function (r) { return lastCmd(function (t) { return t.indexOf("reports/" + r.id + ")") >= 0; }); };
    fresh = fresh.filter(function (r) { var c = repCmd(r); return !(c && c.status === "끝"); });
    if (!m) return h + (fresh.length ? reportCard(fresh[0], true) : "") + emptyMain();
    var b = m.brainy;
    h += '<div class="card brief"><p class="line">' + esc(b.line) + '</p><dl class="kv"><dt>오늘 한 걸음</dt><dd>' + esc(b.next) + "</dd><dt>잘한 것</dt><dd>" + esc(b.good) + "</dd><dt>직면할 것</dt><dd>" + esc(b.confront) + "</dd></dl></div>";
    if (fresh.length) h += '<section class="section"><h2>📋 최근 점검</h2><p class="small muted">예약 점검이 끝나면 자동으로 떠요 · 답이 반영되면 사라져요</p>' + fresh.slice(0, 1).map(function (r, i) {
      var c = repCmd(r);
      if (c && /처리 중|보내는 중/.test(c.status || "")) return '<div class="card brief"><p class="line">' + (REPORT_ICON[r.kind] || "📋") + " " + esc(r.title || "") + ' — 답을 보냈어요</p><p class="small muted">Brainy가 처리하는 중 · 끝나면 이 줄은 사라지고 결과는 기록 탭에 남아요</p></div>';
      return reportCard(r, i === 0);
    }).join("") + "</section>";

    var items = todayItems(), list = todayList(), done = list.filter(function (x) { return items[x.key]; }).length;
    var p = list.length ? Math.round(done / list.length * 100) : 0;
    var day = curDay(), w = S.db && !S.readOnly;
    h += '<section class="section"><div class="progress-row"><div><h2>오늘 체크</h2><p class="small muted">항목을 누르면 여기서 바로 써요 · 칸마다 「로그」 또는 「Brainy와 진행」</p></div><div class="ring" style="--p:' + p + '"><span>' + done + "/" + list.length + "</span></div></div><div class='checks'>" + checkRows(list, day, w, true) + "</div></section>";
    return h;
  }

  /* ---------- 오늘 체크 줄