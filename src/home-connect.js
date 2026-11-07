  /* ---------- 🔌 연결 — 클라우드 Brainy가 맥을 거치지 않고 바깥 서비스에 바로 (build.py 가 끼운다)
     서비스 하나 = CONN 의 칸 하나: 이름·권한(scope)·할 수 있는 것·load(읽어 오기)·ctx(대화 데이터)·tools(대화 도구).
     새 서비스는 같은 모양으로 칸만 더하면 기록 탭 「🔌 연결」·Brainy 대화에 자동으로 붙는다.
     구글 서비스는 브라우저 구글 로그인(OAuth)으로 받은 1시간짜리 열쇠를 이 기기에만 둔다 (Supabase 에 안 올림).
     설정(구글 OAuth 클라이언트 ID — 비밀값 아님)은 docs config/connect. 볼트 쓰기는 그대로 맥의 Brainy. */
  var CONN_KEY = "bh.conn.";
  var CONN = {
    gcal: {
      name: "구글 캘린더", icon: "📅", google: true, api: "Google Calendar API",
      scope: "https://www.googleapis.com/auth/calendar.events",
      what: "일정 읽기·추가·수정 — Brainy 대화와 아침 계획의 시간 있는 줄",
      load: gcalLoad, ctx: gcalCtx, tools: gcalTools, view: gcalView
    }
    // 예) gtasks: { name: "구글 할 일", icon: "☑️", google: true, api: "Google Tasks API", scope: "https://www.googleapis.com/auth/tasks", what: "…", load: …, ctx: …, tools: … }
  };
  var CONN_RULE = "3-1. 구글 캘린더처럼 「연결」된 서비스는 맥을 거치지 않고 바로 쓴다. 일정은 데이터의 '구글 캘린더' 목록으로 답하고, 동욱이 일정을 넣거나 고쳐 달라고 분명히 하면 calendar_add·calendar_update 도구로 바로 한다(run_command로 보내지 않는다). 데이터에 '연결 안 됨'이나 '다시 연결 필요'로 나오면 기록 탭 「🔌 연결」에서 연결하면 된다고 안내한다.";
  S.connData = {}; S.connAt = {}; S.connCfg = {}; S.connMsg = null; S.connBusy = {};

  function gClientId() { return String(((S.connCfg || {}).google || {}).clientId || "").trim(); }
  function connRaw(k) { try { return JSON.parse(localStorage.getItem(CONN_KEY + k) || "null"); } catch (e) { return null; } }
  function connTok(k) { var t = connRaw(k); return t && t.token && t.exp > Date.now() + 60000 ? t : null; }
  function connOn(k) { return !!connTok(k); }
  function connState(k) { return connOn(k) ? "on" : connRaw(k) ? "old" : "off"; }
  function connLabel(k) { var s = connState(k); return s === "on" ? "연결됨" : s === "old" ? "다시 연결 필요" : "연결 안 됨"; }

  var gisP = null;
  function gisReady() { return !!(window.google && google.accounts && google.accounts.oauth2); }
  function gisLoad() {
    if (gisReady()) return Promise.resolve();
    if (gisP) return gisP;
    gisP = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { gisP = null; rej(new Error("구글 로그인 창을 불러오지 못했어요")); };
      document.head.appendChild(s);
    });
    return gisP;
  }
  // 구글 로그인 창은 버튼을 누른 그 순간에 열어야 막히지 않는다 — 로그인 코드는 미리 불러 둔다
  function connStart(k) {
    var c = CONN[k], id = gClientId(); if (!c || !id) return;
    if (!gisReady()) { S.connMsg = { k: k, t: "구글 로그인을 준비하는 중이에요. 잠시 뒤 다시 눌러 주세요." }; gisLoad().then(render, function (e) { S.connMsg = { k: k, t: e.message, err: true }; render(); }); render(); return; }
    var tc = google.accounts.oauth2.initTokenClient({
      client_id: id, scope: c.scope, prompt: connRaw(k) ? "" : "consent",
      callback: function (r) {
        if (!r || r.error || !r.access_token) { S.connMsg = { k: k, t: "연결하지 못했어요" + (r && r.error ? " (" + r.error + ")" : ""), err: true }; render(); return; }
        if (!google.accounts.oauth2.hasGrantedAllScopes(r, c.scope)) { S.connMsg = { k: k, t: "권한 화면에서 " + c.name + " 항목에 체크하고 다시 연결해 주세요.", err: true }; render(); return; }
        try { localStorage.setItem(CONN_KEY + k, JSON.stringify({ token: r.access_token, exp: Date.now() + (+r.expires_in || 3600) * 1000 })); } catch (e) {}
        S.connMsg = { k: k, t: "연결됐어요 ✓ 이제 Brainy 대화에서 바로 써요." }; connLoad(k); render();
      },
      error_callback: function (e) { S.connMsg = { k: k, t: e && e.type === "popup_closed" ? "로그인 창이 닫혔어요. 다시 눌러 주세요." : "구글 로그인 창을 열지 못했어요 — 이 브라우저의 팝업 차단을 꺼 주세요.", err: true }; render(); }
    });
    tc.requestAccessToken();
  }
  function connOff(k) {
    var t = connTok(k); try { localStorage.removeItem(CONN_KEY + k); } catch (e) {}
    S.connData[k] = null; S.connMsg = { k: k, t: "연결을 끊었어요." };
    if (t && gisReady()) google.accounts.oauth2.revoke(t.token, function () {});
    render();
  }
  function connLoad(k) {
    var c = CONN[k]; if (!c || !connOn(k) || S.connBusy[k]) return Promise.resolve();
    S.connBusy[k] = true;
    return c.load().then(function (d) { S.connBusy[k] = false; S.connData[k] = d; S.connAt[k] = Date.now(); softRender(); }, function (e) { S.connBusy[k] = false; S.connMsg = { k: k, t: e.message, err: true }; softRender(); });
  }
  function connLoadAll() { Object.keys(CONN).forEach(function (k) { if (!S.connAt[k] || Date.now() - S.connAt[k] > 60000) connLoad(k); }); }
  function connTools() { var out = []; Object.keys(CONN).forEach(function (k) { if (connOn(k) && CONN[k].tools) out = out.concat(CONN[k].tools()); }); return out; }
  function connCtx() {
    return Object.keys(CONN).map(function (k) {
      var c = CONN[k];
      if (connOn(k) && S.connData[k]) return c.ctx(S.connData[k]);
      return "## " + c.name + ": " + connLabel(k) + " — 쓰려면 기록 탭 「🔌 연결」에서 연결해야 한다고 안내한다.";
    }).join("\n");
  }
  function gFetch(k, url, opt) {
    var c = CONN[k], t = connTok(k);
    if (!t) return Promise.reject(new Error(c.name + " 연결 시간이 지났어요 — 기록 탭 「🔌 연결」에서 「다시 연결」을 눌러 주세요"));
    opt = opt || {}; opt.headers = { Authorization: "Bearer " + t.token, "Content-Type": "application/json" };
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { try { localStorage.setItem(CONN_KEY + k, JSON.stringify({ token: "", exp: 0 })); } catch (e) {} softRender(); throw new Error(c.name + " 연결 시간이 지났어요 — 기록 탭 「🔌 연결」에서 「다시 연결」을 눌러 주세요"); }
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(c.name + ": " + ((j.error && j.error.message) || "응답 " + r.status)); return j; });
    });
  }

  /* --- 구글 캘린더 (기본 캘린더 · 한국 시각) --- */
  var GCAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  function hmOk(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim()); return m && +m[1] < 24 && +m[2] < 60 ? pad(+m[1]) + ":" + m[2] : ""; }
  function hmMin(s) { return +s.slice(0, 2) * 60 + +s.slice(3); }
  function minHm(n) { n = Math.max(0, Math.min(23 * 60 + 59, n)); return pad(Math.floor(n / 60)) + ":" + pad(n % 60); }
  function dayAfter(d) { return ymd(new Date(new Date(d + "T12:00:00").getTime() + 86400000)); }
  function gcalLoad() {
    var from = new Date(NOW.getTime() - 86400000), to = new Date(NOW.getTime() + 14 * 86400000);
    return gFetch("gcal", GCAL + "?singleEvents=true&orderBy=startTime&maxResults=150&timeMin=" + encodeURIComponent(from.toISOString()) + "&timeMax=" + encodeURIComponent(to.toISOString())).then(function (j) {
      return (j.items || []).filter(function (e) { return e.status !== "cancelled" && e.start; }).map(function (e) {
        var p = (e.extendedProperties && e.extendedProperties.private) || {};
        return { id: e.id, title: e.summary || "(제목 없음)", start: e.start.dateTime || e.start.date, end: (e.end && (e.end.dateTime || e.end.date)) || "", allDay: !e.start.dateTime, where: e.location || "", note: clip(e.description || "", 200), brainy: p.brainy || "" };
      });
    });
  }
  function gcalDay(e) { return e.allDay ? e.start : ymd(new Date(e.start)); }
  function gcalHm(iso) { var d = new Date(iso); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function gcalWhen(e) { return gcalDay(e) + (e.allDay ? " 종일" : " " + gcalHm(e.start) + (e.end ? "–" + gcalHm(e.end) : "")); }
  function gcalCtx(list) {
    return "## 구글 캘린더 (연결됨 · 어제~14일 뒤 · 고칠 때는 id): " + JSON.stringify(list.map(function (e) { var o = { id: e.id, when: gcalWhen(e), title: e.title }; if (e.where) o.where = e.where; if (e.note) o.note = e.note; return o; }));
  }
  // 도구 입력 → 구글 일정 모양. old 가 있으면(고치기) 빠진 날짜·시간은 원래 것을 쓴다
  function gcalBody(i, old) {
    var b = {};
    if (i.title != null) b.summary = String(i.title);
    if (i.where != null) b.location = String(i.where);
    if (i.note != null) b.description = String(i.note);
    var d = String(i.date || "").trim(), s = hmOk(i.start), e = hmOk(i.end);
    if (!d && !s && !e && i.allDay == null) return b;
    var o = old || null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) d = o ? gcalDay(o) : TODAY;
    if (i.allDay === true || (!s && !e && o && o.allDay)) { b.start = { date: d }; b.end = { date: dayAfter(d) }; return b; }
    var os = o && !o.allDay ? gcalHm(o.start) : "", len = o && !o.allDay && o.end ? Math.max(15, (new Date(o.end) - new Date(o.start)) / 60000) : 60;
    s = s || os || "09:00"; e = e && hmMin(e) > hmMin(s) ? e : minHm(hmMin(s) + len);
    b.start = { dateTime: d + "T" + s + ":00+09:00", timeZone: "Asia/Seoul" }; b.end = { dateTime: d + "T" + e + ":00+09:00", timeZone: "Asia/Seoul" };
    return b;
  }
  function gcalAdd(i, tag) {
    var b = gcalBody(Object.assign({}, i, hmOk(i.start) ? {} : { allDay: true }), null);
    b.extendedProperties = { private: { brainy: tag || "chat" } };
    return gFetch("gcal", GCAL, { method: "POST", body: JSON.stringify(b) });
  }
  function gcalTools() {
    var when = { date: { type: "string", description: "YYYY-MM-DD" }, start: { type: "string", description: "HH:MM (24시, 한국 시각)" }, end: { type: "string", description: "HH:MM — 모르면 비움(1시간)" }, allDay: { type: "boolean" }, where: { type: "string" }, note: { type: "string" } };
    return [
      { name: "calendar_add", description: "동욱의 구글 캘린더에 일정을 하나 넣는다 (맥을 거치지 않고 바로). 동욱이 넣어 달라고 분명히 했을 때만. 시간이 없으면 종일 일정. 같은 일정이 데이터의 '구글 캘린더'에 이미 있으면 넣지 말고 calendar_update로 고친다.", inputSchema: { type: "object", properties: Object.assign({ title: { type: "string" } }, when), required: ["title", "date"] },
        execute: function (i) {
          if (!String(i.title || "").trim()) throw new Error("title 비어 있음");
          return gcalAdd(i).then(function (ev) { act("📅 캘린더에 넣음 · " + String(i.date || "") + " " + (hmOk(i.start) || "종일") + " " + clip(String(i.title), 30)); connLoad("gcal"); return "ok · id " + ev.id; });
        } },
      { name: "calendar_update", description: "동욱의 구글 캘린더 일정 하나를 고친다 (제목·날짜·시간·장소·메모). id는 데이터의 '구글 캘린더' 목록에 있다. 바꿀 칸만 넣는다. 일정 지우기는 하지 않는다.", inputSchema: { type: "object", properties: Object.assign({ id: { type: "string" }, title: { type: "string" } }, when), required: ["id"] },
        execute: function (i) {
          var id = String(i.id || ""), old = (S.connData.gcal || []).filter(function (e) { return e.id === id; })[0];
          if (!id) throw new Error("id 비어 있음");
          var b = gcalBody(i, old); if (!Object.keys(b).length) throw new Error("바꿀 칸이 없어요");
          return gFetch("gcal", GCAL + "/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(b) }).then(function (ev) { act("📅 캘린더 고침 · " + clip(ev.summary || (old && old.title) || id, 30)); connLoad("gcal"); return "ok"; });
        } }
    ];
  }
  function gcalView(list) {
    var days = {}; list.forEach(function (e) { var d = gcalDay(e); if (d >= TODAY) (days[d] = days[d] || []).push(e); });
    var ks = Object.keys(days).sort().slice(0, 3);
    if (!ks.length) return '<p class="small muted">앞으로 14일 동안 일정이 없어요.</p>';
    return ks.map(function (d) { return '<p class="small"><b>' + (d === TODAY ? "오늘" : esc(md(d))) + "</b> " + days[d].map(function (e) { return esc((e.allDay ? "" : gcalHm(e.start) + " ") + e.title); }).join(" · ") + "</p>"; }).join("");
  }

  /* --- 아침 계획의 시간 있는 줄 → 구글 캘린더 (이미 넣은 줄은 다시 안 넣는다) --- */
  function moCalRows(mo) {
    var src = (mo.final || []).some(function (r) { return r && r.time; }) ? mo.final : (mo.rows || []);
    var out = [];
    src.forEach(function (r) {
      var m = /(\d{1,2}):(\d{2})(?:\s*[-–~]\s*(\d{1,2}):(\d{2}))?/.exec(String((r && r.time) || ""));
      if (!m || !r.what) return;
      out.push({ what: String(r.what), task: r.task || "", s: hmOk(m[1] + ":" + m[2]), e: m[3] ? hmOk(m[3] + ":" + m[4]) : "" });
    });
    out.forEach(function (r, n) { if (!r.e) { var nx = out[n + 1]; r.e = nx && hmMin(nx.s) > hmMin(r.s) ? nx.s : minHm(hmMin(r.s) + 60); } r.tag = "am:" + mo.date + ":" + r.s + ":" + clip(r.what, 40); });
    return out.filter(function (r) { return r.s; });
  }
  function moCalLeft(mo) { var have = {}; (S.connData.gcal || []).forEach(function (e) { if (e.brainy) have[e.brainy] = 1; }); return moCalRows(mo).filter(function (r) { return !have[r.tag]; }); }
  function moCalPush(mo) {
    if (!connOn("gcal") || !mo) return Promise.resolve(0);
    S.moCalBusy = true; render();
    return gcalLoad().then(function (list) {
      S.connData.gcal = list; var rows = moCalLeft(mo), chain = Promise.resolve();
      rows.forEach(function (r) { chain = chain.then(function () { return gcalAdd({ title: r.what, date: mo.date, start: r.s, end: r.e, note: r.task ? "태스크: " + r.task + "\n(Brainy 아침 계획)" : "(Brainy 아침 계획)" }, r.tag); }); });
      return chain.then(function () { return rows.length; });
    }).then(function (n) { S.moCalBusy = false; S.moCalMsg = { t: n ? "📅 캘린더에 " + n + "개 넣었어요" : "📅 캘린더에 이미 다 들어가 있어요" }; connLoad("gcal"); render(); return n; },
      function (e) { S.moCalBusy = false; S.moCalMsg = { t: e.message, err: true }; render(); return 0; });
  }
  function moCalLine(mo) {
    var rows = moCalRows(mo); if (!rows.length) return "";
    var h = "";
    if (connOn("gcal")) {
      var left = S.connData.gcal ? moCalLeft(mo).length : rows.length;
      h += '<div class="progress-row"><span class="small muted">📅 시간 있는 줄 ' + rows.length + "개 · " + (left ? "캘린더에 아직 " + left + "개" : "캘린더에 다 들어감 ✓") + "</span>" + (left ? '<button class="btn quiet" data-act="mocal"' + (S.moCalBusy ? " disabled" : "") + ">" + (S.moCalBusy ? "넣는 중…" : "캘린더에 넣기") + "</button>" : "") + "</div>";
    } else h += '<div class="progress-row"><span class="small muted">📅 구글 캘린더를 연결하면 시간 있는 줄 ' + rows.length + "개가 바로 들어가요</span>" + '<button class="btn quiet" data-act="goconn">' + (connRaw("gcal") ? "다시 연결" : "연결 안내") + "</button></div>";
    if (S.moCalMsg) h += '<p class="small"' + (S.moCalMsg.err ? ' style="color:var(--warn)"' : ' style="color:var(--good)"') + ">" + esc(S.moCalMsg.t) + "</p>";
    return h;
  }

  /* --- 기록 탭 「🔌 연결」 --- */
  function viewConnect() {
    var h = '<section class="card"><h2>🔌 연결 — 맥 없이 Brainy가 바로 쓰는 서비스</h2><p class="small muted">여기 연결한 서비스는 맥이 꺼져 있어도 Brainy 대화와 아침 계획에서 바로 읽고 써요. 볼트(옵시디언) 쓰기는 지금처럼 맥의 Brainy가 해요. 연결 열쇠는 이 기기에만 두고, 기기마다 한 번씩 연결해요.</p></section>';
    var gid = gClientId(), canWrite = S.db && !S.readOnly;
    Object.keys(CONN).forEach(function (k) {
      var c = CONN[k], st = connState(k), data = S.connData[k];
      h += '<section class="card"><div class="progress-row"><h2>' + c.icon + " " + esc(c.name) + '</h2><span class="pill' + (st === "on" ? " good" : st === "old" ? " warn" : "") + '">' + connLabel(k) + "</span></div>";
      h += '<p class="small muted">' + esc(c.what) + "</p>";
      if (c.google && !gid) h += '<p class="notice">먼저 아래 「처음 한 번 — 동욱이 직접 할 것」 1~5단계로 구글 클라이언트 ID를 넣어 주세요.</p>';
      else {
        h += '<div class="row end">' + (st !== "off" ? '<button class="btn quiet" data-act="connoff" data-k="' + k + '">끊기</button>' : "") + (st === "on" ? '<button class="btn" data-act="connload" data-k="' + k + '"' + (S.connBusy[k] ? " disabled" : "") + ">" + (S.connBusy[k] ? "불러오는 중…" : "새로고침") + "</button>" : '<button class="btn primary" data-act="connstart" data-k="' + k + '">' + (st === "old" ? "다시 연결" : esc(c.name) + " 연결") + "</button>") + "</div>";
        if (st === "old") h += '<p class="small muted">구글 열쇠는 1시간마다 끝나요. 「다시 연결」을 누르면 보통 창이 잠깐 떴다 닫혀요.</p>';
      }
      if (S.connMsg && S.connMsg.k === k) h += '<p class="small"' + (S.connMsg.err ? ' style="color:var(--warn)"' : ' style="color:var(--good)"') + ">" + esc(S.connMsg.t) + "</p>";
      if (st === "on" && data && c.view) h += c.view(data);
      h += "</section>";
    });
    // 처음 한 번 — 구글 로그인 준비 (동욱이 직접)
    var origin = location.origin;
    h += '<section class="card"><details class="fold"' + (gid ? "" : " open") + "><summary>처음 한 번 — 동욱이 직접 할 것 (구글, 컴퓨터에서 10분)</summary><div class=\"md\"><ol>" +
      "<li>컴퓨터에서 Google Cloud 콘솔(console.cloud.google.com)에 내 구글 계정으로 들어가 새 프로젝트를 만들어요. 이름은 아무거나(예: Brainy).</li>" +
      "<li>「API 및 서비스 → 라이브러리」에서 <b>" + Object.keys(CONN).filter(function (k) { return CONN[k].google; }).map(function (k) { return esc(CONN[k].api); }).join(", ") + "</b>를 찾아 「사용」을 눌러요.</li>" +
      "<li>「OAuth 동의 화면」: 사용자 유형 「외부」 → 앱 이름 Brainy, 이메일은 내 것 → 「테스트 사용자」에 내 구글 계정을 넣어요. 게시(앱 확인)는 안 해도 돼요.</li>" +
      "<li>「사용자 인증 정보 → 만들기 → OAuth 클라이언트 ID」: 유형 「웹 애플리케이션」, 「승인된 자바스크립트 원본」에 <b>" + esc(origin) + "</b> 를 넣고 만들어요.</li>" +
      "<li>만들어진 <b>클라이언트 ID</b>(…apps.googleusercontent.com로 끝나요)를 아래 칸에 붙여 넣고 저장해요. 「클라이언트 보안 비밀」은 필요 없으니 넣지 마세요.</li>" +
      "<li>위의 「연결」을 누르고 구글에 로그인 → 「Google에서 확인하지 않은 앱」이 뜨면 「고급 → Brainy(으)로 이동」 → 권한에 체크하고 「계속」.</li>" +
      "<li>폰·맥 등 기기마다 6번을 한 번씩 해요. 1시간이 지나면 「다시 연결」만 누르면 돼요.</li></ol></div>" +
      '<label class="small muted" for="conn-gid">구글 OAuth 클라이언트 ID</label><input id="conn-gid" type="text" autocomplete="off" spellcheck="false" placeholder="1234…apps.googleusercontent.com" value="' + esc(gid) + '"' + (canWrite ? "" : " disabled") + ' style="width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)">' +
      '<div class="row end"><button class="btn" data-act="conngid"' + (canWrite ? "" : " disabled") + ">저장</button></div>" + (S.connGidMsg ? '<p class="small"' + (S.connGidMsg.err ? ' style="color:var(--warn)"' : ' style="color:var(--good)"') + ">" + esc(S.connGidMsg.t) + "</p>" : "") + "</details></section>";
    return h;
  }
  function connGidSave() {
    var el = document.getElementById("conn-gid"), v = el ? String(el.value || "").trim() : "";
    if (v && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(v)) { S.connGidMsg = { t: "클라이언트 ID는 …apps.googleusercontent.com 으로 끝나요. 「클라이언트 보안 비밀」이 아닌지 확인해 주세요.", err: true }; render(); return; }
    S.db.doc("config/connect").set(Object.assign({}, S.connCfg || {}, { google: { clientId: v }, at: new Date().toISOString() })).then(function () { S.connGidMsg = { t: v ? "저장했어요 — 이제 위의 「연결」을 눌러 주세요" : "지웠어요" }; if (v) gisLoad().catch(function () {}); render(); }, function (e) { S.connGidMsg = { t: "저장하지 못했어요 — " + e.message, err: true }; render(); });
  }
  function connClick(act, t) {
    var k = t.getAttribute("data-k");
    if (act === "connstart") { connStart(k); return true; }
    if (act === "connoff") { connOff(k); return true; }
    if (act === "connload") { S.connAt[k] = 0; connLoad(k); render(); return true; }
    if (act === "conngid") { connGidSave(); return true; }
    if (act === "goconn") { S.tab = "notes"; S.noteView = "con"; try { localStorage.setItem("brainy-tab", "notes"); localStorage.setItem("brainy-nview", "con"); } catch (e) {} render(); window.scrollTo(0, 0); return true; }
    if (act === "mocal") { moCalPush(S.morning); return true; }
    return false;
  }

