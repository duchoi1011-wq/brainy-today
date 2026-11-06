/* Brainy 홈 — claude.ai 밖에서 돌리기 위한 받침.
   앱 코드는 window.claude.use("db"|"mcp"|"sample"|"downloads") 를 그대로 쓰고,
   여기서 db 를 Supabase `docs` 표(실시간)로 바꿔 준다. 로그인 = Supabase Auth, 데이터는 주인 계정만(RLS). */
(function () {
  "use strict";
  var SB_URL = "https://ttvslsnnkwzfpvswxowe.supabase.co";
  var SB_KEY = "sb_publishable_MQ2J5s-lyDG9ftsZpWMZuQ_jPuCC31q"; // 공개용 키
  var CACHE_KEY = "brainy-docs-v1";
  var OLD_APP = "https://claude.ai/artifact/KNwrPxJ79E83vgSTL3447n";
  var sb = window.supabase && window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  /* ---------- 문서 저장소 ---------- */
  var docs = {};            // path -> data
  var subs = [];            // {kind, path|coll, cb, order, dir, lim}
  var state = { cached: false, live: false };
  var pending = {};         // path -> 진행 중인 쓰기 수
  var readyResolve, ready = new Promise(function (r) { readyResolve = r; });

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function collOf(path) { return path.slice(0, path.lastIndexOf("/")); }
  function idOf(path) { return path.slice(path.lastIndexOf("/") + 1); }
  function docSnap(path, fromCache) {
    var d = docs[path];
    return { id: idOf(path), exists: d !== undefined, data: function () { return clone(d); }, metadata: { fromCache: !!fromCache } };
  }
  function collSnap(s, fromCache) {
    var pre = s.coll + "/", list = [];
    Object.keys(docs).forEach(function (p) { if (p.indexOf(pre) === 0 && p.indexOf("/", pre.length) < 0) list.push(p); });
    if (s.order) {
      var f = s.order, sign = s.dir === "desc" ? -1 : 1;
      list = list.filter(function (p) { return docs[p] && docs[p][f] != null; });
      list.sort(function (a, b) { var x = docs[a][f], y = docs[b][f]; return (x < y ? -1 : x > y ? 1 : 0) * sign; });
    } else list.sort();
    if (s.lim) list = list.slice(0, s.lim);
    return { docs: list.map(function (p) { return docSnap(p, fromCache); }), metadata: { fromCache: !!fromCache } };
  }
  function fire(s, fromCache) {
    try { s.cb(s.kind === "doc" ? docSnap(s.path, fromCache) : collSnap(s, fromCache)); } catch (e) { console.error(e); }
  }
  function notify(path) {
    var c = collOf(path);
    subs.forEach(function (s) { if ((s.kind === "doc" && s.path === path) || (s.kind === "coll" && s.coll === c)) fire(s, false); });
  }
  function notifyAll(fromCache) { subs.forEach(function (s) { fire(s, fromCache); }); }
  function listen(s) {
    subs.push(s);
    if (state.live) setTimeout(function () { fire(s, false); }, 0);
    else if (state.cached) setTimeout(function () { fire(s, true); }, 0);
    return function () { var i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
  }
  var saveT;
  function saveCache() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(docs)); }
      catch (e) { try { localStorage.removeItem(CACHE_KEY); } catch (e2) {} }
    }, 1500);
  }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function write(path, data) {
    pending[path] = (pending[path] || 0) + 1;
    docs[path] = clone(data); notify(path); saveCache();
    return sb.from("docs").upsert({ path: path, coll: collOf(path), id: idOf(path), data: data }).then(function (r) {
      pending[path]--;
      if (r.error) throw err(/row-level security|permission|JWT/i.test(r.error.message) ? "permission_denied" : "unavailable", r.error.message);
    }, function (e) { pending[path]--; throw err("unavailable", e && e.message); });
  }
  function ref(path) {
    return {
      id: idOf(path), path: path,
      get: function () { return ready.then(function () { return docSnap(path, false); }); },
      set: function (data) { return write(path, data); },
      update: function (patch) { var cur = clone(docs[path]) || {}; Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; }); return write(path, cur); },
      delete: function () {
        pending[path] = (pending[path] || 0) + 1;
        delete docs[path]; notify(path); saveCache();
        return sb.from("docs").delete().eq("path", path).then(function (r) { pending[path]--; if (r.error) throw err("unavailable", r.error.message); }, function (e) { pending[path]--; throw err("unavailable", e && e.message); });
      },
      onSnapshot: function (cb) { return listen({ kind: "doc", path: path, cb: cb }); }
    };
  }
  function rid() { var a = "abcdefghijklmnopqrstuvwxyz0123456789", s = ""; for (var i = 0; i < 20; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function query(coll, order, dir, lim) {
    return {
      orderBy: function (f, d) { return query(coll, f, d || "asc", lim); },
      limit: function (n) { return query(coll, order, dir, n); },
      doc: function (id) { return ref(coll + "/" + (id || rid())); },
      onSnapshot: function (cb) { return listen({ kind: "coll", coll: coll, cb: cb, order: order, dir: dir, lim: lim }); }
    };
  }
  var db = { doc: ref, collection: function (c) { return query(c); } };

  function loadAll() {
    return sb.from("docs").select("path,data").then(function (r) {
      if (r.error) throw r.error;
      var next = {};
      (r.data || []).forEach(function (x) { next[x.path] = x.data; });
      Object.keys(pending).forEach(function (p) { if (pending[p] > 0 && docs[p] !== undefined) next[p] = docs[p]; });
      docs = next; state.live = true; saveCache(); notifyAll(false);
    });
  }
  var chan = null;
  function subscribe() {
    if (chan) sb.removeChannel(chan);
    var first = true;
    chan = sb.channel("brainy-docs").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, function (p) {
      var path = (p.new && p.new.path) || (p.old && p.old.path); if (!path) return;
      if (pending[path] > 0) return;             // 내가 방금 쓴 것의 메아리 — 화면 값이 더 새롭다
      if (p.eventType === "DELETE") { if (docs[path] === undefined) return; delete docs[path]; }
      else if (p.new.data === undefined || (p.errors && p.errors.length)) {   // 문서가 커서 실시간 알림에 본문이 빠짐 — 따로 읽는다
        sb.from("docs").select("data").eq("path", path).maybeSingle().then(function (r) { if (r.data && !(pending[path] > 0)) { docs[path] = r.data.data; saveCache(); notify(path); } });
        return;
      }
      else { if (JSON.stringify(docs[path]) === JSON.stringify(p.new.data)) return; docs[path] = p.new.data; }
      saveCache(); notify(path);
    }).subscribe(function (st) {
      setDot(st === "SUBSCRIBED" ? "on" : (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") ? "off" : "");
      if (st === "SUBSCRIBED") { if (!first) loadAll().catch(function () {}); first = false; }
    });
  }

  /* ---------- Claude 쪽 (예약 명령·대화) — 이 화면에서는 큐에만 쌓는다 ---------- */
  var mcp = {
    watchTool: function (server, tool, input, handler) { setTimeout(function () { handler({ type: "data", result: { payload: { data: [] }, cache: { storedAt: Date.now() } } }); }, 0); return function () {}; },
    callTool: function (server, tool, input) {
      if (tool === "list_triggers") return Promise.resolve({ payload: { data: [] } });
      if (tool === "fire_trigger") {
        if (window.BRAINY_FIRE) return window.BRAINY_FIRE(input);
        return Promise.resolve({ payload: { queued: true } }); // cmd 문서에 "맥 대기"로 남는다
      }
      return Promise.reject(err("not_in_manifest", "이 화면에서는 쓸 수 없는 기능이에요"));
    }
  };
  var downloads = {
    save: function (o) {
      var data = o.data, blob = data instanceof Blob ? data : new Blob([data], { type: o.mimeType || (typeof data === "string" ? "text/plain;charset=utf-8" : "application/octet-stream") });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename || "download"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return Promise.resolve({ saved: true });
    }
  };

  /* ---------- 로그인 화면 ---------- */
  var gate;
  function showGate(mode, msg) {
    if (!gate) { gate = document.createElement("div"); gate.id = "gate"; document.body.appendChild(gate); }
    gate.hidden = false;
    var h = '<div class="gbox"><img src="icon.svg" alt="" width="56" height="56"><h1>Brainy 홈</h1>';
    if (mode === "wait") h += '<p class="gsub">' + (msg || "불러오는 중…") + "</p>";
    else if (mode === "owner") h += '<p class="gsub">이 계정은 주인으로 등록되지 않았어요.</p><button class="btn" id="g-out">로그아웃</button>';
    else h += '<p class="gsub">볼트와 바로 이어지는 내 하루</p><label for="g-em">이메일</label><input id="g-em" type="email" autocomplete="username" inputmode="email">' +
      '<label for="g-pw">비밀번호</label><input id="g-pw" type="password" autocomplete="current-password">' +
      '<button class="btn primary" id="g-go">로그인</button><p class="gerr" id="g-err">' + (msg || "") + "</p>";
    gate.innerHTML = h + "</div>";
    var out = document.getElementById("g-out"); if (out) out.onclick = function () { sb.auth.signOut(); };
    var go = document.getElementById("g-go");
    if (go) {
      var run = function () {
        var em = document.getElementById("g-em").value.trim(), pw = document.getElementById("g-pw").value, er = document.getElementById("g-err");
        if (!em || !pw) { er.textContent = "이메일과 비밀번호를 넣어 주세요."; return; }
        go.disabled = true; er.textContent = "";
        sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) { go.disabled = false; if (r.error) er.textContent = "로그인 실패 — 이메일이나 비밀번호를 확인해 주세요."; });
      };
      go.onclick = run;
      document.getElementById("g-pw").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) run(); });
    }
  }
  function hideGate() { if (gate) gate.hidden = true; }
  function setDot(s) { var d = document.getElementById("rtdot"); if (d) { d.className = s; d.title = s === "on" ? "실시간 연결됨" : s === "off" ? "연결이 끊겼어요 — 다시 잇는 중" : "연결 중"; } }

  /* ---------- 시작 ---------- */
  var uid;
  function start(ses) {
    var id = ses ? ses.user.id : null;
    if (id === uid) return; uid = id;
    if (!ses) {
      state.live = false; docs = {}; try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      if (chan) { sb.removeChannel(chan); chan = null; }
      showGate("login"); return;
    }
    // 지난번 화면을 먼저 보여 주고(바로 뜸) 최신으로 바꾼다
    try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); if (c && typeof c === "object") { docs = c; state.cached = true; notifyAll(true); hideGate(); } } catch (e) {}
    if (!state.cached) showGate("wait");
    sb.from("owners").select("user_id").eq("user_id", id).maybeSingle().then(function (o) {
      if (o.error) throw o.error;
      if (!o.data) { docs = {}; try { localStorage.removeItem(CACHE_KEY); } catch (e) {} showGate("owner"); return; }
      return loadAll().then(function () { hideGate(); subscribe(); readyResolve(); });
    }).catch(function () { if (!state.cached) showGate("wait", "연결이 안 돼요 — 인터넷을 확인하고 새로고침해 주세요."); else readyResolve(); });
  }
  var dbReady = new Promise(function (resolve) {
    if (!sb) { resolve(null); return; }
    var done = false;
    listen({ kind: "coll", coll: "__boot__", cb: function () { if (!done) { done = true; resolve(db); } } });
  });
  if (sb) {
    sb.auth.onAuthStateChange(function (ev, ses) { if (ev !== "TOKEN_REFRESHED") setTimeout(function () { start(ses); }, 0); });
    var loadedDay = new Date().toDateString(), hiddenAt = 0;
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") { hiddenAt = Date.now(); return; }
      if (new Date().toDateString() !== loadedDay) { location.reload(); return; }   // 날짜가 바뀌면 오늘로
      if (uid && state.live && Date.now() - hiddenAt > 20000) loadAll().catch(function () {});
    });
  } else document.addEventListener("DOMContentLoaded", function () { showGate("wait", "라이브러리를 못 불러왔어요 — 새로고침해 주세요."); });

  window.claude = {
    use: function (name) {
      if (name === "db") return dbReady;
      if (name === "mcp") return dbReady.then(function (d) { return d ? mcp : null; });
      if (name === "downloads") return Promise.resolve(downloads);
      return Promise.resolve(null); // sample 등 — 이 화면에는 없음
    }
  };
  window.BRAINY = { signOut: function () { return sb.auth.signOut(); }, oldApp: OLD_APP, reload: loadAll };
})();
