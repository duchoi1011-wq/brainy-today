/* Brainy 홈 — claude.ai 밖에서 돌리기 위한 받침.
   앱 코드는 window.claude.use("db"|"mcp"|"sample"|"downloads") 를 그대로 쓰고,
   여기서 db 를 Supabase `docs` 표(실시간)로 바꿔 준다. 로그인 = Supabase Auth, 데이터는 주인 계정만(RLS). */
(function () {
  "use strict";
  var SB_URL = "https://ttvslsnnkwzfpvswxowe.supabase.co";
  var SB_KEY = "sb_publishable_MQ2J5s-lyDG9ftsZpWMZuQ_jPuCC31q"; // 공개용 키
  // 같은 주소 아래 앱 셋(Brainy 홈 · 맥 단축키 · 체화 단어장)이 이 받침을 같이 쓴다. 앱마다 자기 컬렉션만 읽는다.
  var APP = window.BRAINY_APP || { key: "home", name: "Brainy 홈", icon: "icon.svg" };
  var OTHER = ["ai", "ai_out", "sc.data", "sc.marks", "additions", "requests", "vo.data", "vo.ids", "progress", "ctx", "mac"]; // 홈이 안 읽는 것 (mac = 맥 동기화 신호, 새로고침 버튼이 따로 본다)
  function mine(coll) { return APP.colls ? APP.colls.indexOf(coll) >= 0 : OTHER.indexOf(coll) < 0; }
  function inList(a) { return "(" + a.map(function (x) { return '"' + x + '"'; }).join(",") + ")"; }
  var CACHE_KEY = "brainy-docs-v1" + (APP.key === "home" ? "" : ":" + APP.key);
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

  // 통째로 받기는 처음과 10분에 한 번(지워진 문서까지 맞추려고). 그 사이 다시 볼 때는 바뀐 것만 받는다.
  var lastAt = "", lastFull = 0, FULL_EVERY = 10 * 60 * 1000;
  function bump(at) { if (at && at > lastAt) lastAt = at; }
  function scoped(q) { return APP.colls ? q.filter("coll", "in", inList(APP.colls)) : q.not("coll", "in", inList(OTHER)); }
  function loadAll() {
    return scoped(sb.from("docs").select("path,data,updated_at")).then(function (r) {
      if (r.error) throw r.error;
      var next = {};
      (r.data || []).forEach(function (x) { next[x.path] = x.data; bump(x.updated_at); });
      Object.keys(pending).forEach(function (p) { if (pending[p] > 0 && docs[p] !== undefined) next[p] = docs[p]; });
      docs = next; state.live = true; lastFull = Date.now(); saveCache(); notifyAll(false);
    });
  }
  function loadDelta() {
    if (!lastAt || Date.now() - lastFull > FULL_EVERY) return loadAll();
    return scoped(sb.from("docs").select("path,data,updated_at").gt("updated_at", lastAt)).then(function (r) {
      if (r.error) throw r.error;
      var changed = [];
      (r.data || []).forEach(function (x) {
        bump(x.updated_at);
        if (pending[x.path] > 0 || JSON.stringify(docs[x.path]) === JSON.stringify(x.data)) return;
        docs[x.path] = x.data; changed.push(x.path);
      });
      if (changed.length) { saveCache(); changed.forEach(notify); }
    });
  }
  var chan = null;
  function subscribe() {
    if (chan) sb.removeChannel(chan);
    var first = true;
    chan = sb.channel("brainy-docs").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, function (p) {
      var path = (p.new && p.new.path) || (p.old && p.old.path); if (!path) return;
      if (path === MAC_PATH || path.indexOf("cmd/") === 0) bsEvent(path, p);
      if (path.indexOf("ai_out/") === 0) { if (p.new && p.new.data) aiOut(path.slice(7), p.new.data); else aiPoll(path.slice(7)); return; }
      if (!mine(collOf(path))) return;            // 다른 앱 것·내가 보낸 질문 — 이 화면 데이터가 아니다
      if (pending[path] > 0) return;             // 내가 방금 쓴 것의 메아리 — 화면 값이 더 새롭다
      if (p.eventType === "DELETE") { if (docs[path] === undefined) return; delete docs[path]; }
      else if (p.new.data === undefined || (p.errors && p.errors.length)) {   // 문서가 커서 실시간 알림에 본문이 빠짐 — 따로 읽는다
        sb.from("docs").select("data").eq("path", path).maybeSingle().then(function (r) { if (r.data && !(pending[path] > 0)) { docs[path] = r.data.data; saveCache(); notify(path); } });
        return;
      }
      else { bump(p.new.updated_at); if (JSON.stringify(docs[path]) === JSON.stringify(p.new.data)) return; docs[path] = p.new.data; }
      saveCache(); notify(path);
    }).subscribe(function (st) {
      setDot(st === "SUBSCRIBED" ? "on" : (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") ? "off" : "");
      if (st === "SUBSCRIBED") { if (!first) loadDelta().catch(function () {}); first = false; }
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
  /* ---------- Brainy 대화 (sample) — 질문을 Supabase 에 두면 맥의 Claude(구독)가 집어서 답을 흘려보낸다 ---------- */
  var aiWait = {};   // id -> {opts, json, text, at, resolve, reject, timers}
  var READ_TOOL = /^(get_|search_)/;  // 결과가 필요한 읽기 도구는 Brainy 가 볼트를 직접 읽는다 (맥: 파일, 클라우드: notes 표)
  var HANDOFF = "맥의 Brainy에게 넘기는 중";   // supabase/functions/brainy-ai 와 같은 글
  // 질문은 먼저 클라우드 Brainy(Supabase Edge Function + 콘솔 API)가 받는다. 못 받으면 status "요청" 으로 맥에 넘긴다.
  function aiCloud(id, req) {
    function toMac() {
      sb.from("docs").update({ data: Object.assign({}, req, { status: "요청" }) }).eq("path", "ai/" + id).eq("data->>status", "클라우드").then(function () {}, function () {});
    }
    sb.functions.invoke("brainy-ai", { body: { id: id } }).then(function (r) {
      var st = r.error && r.error.context && r.error.context.status;
      if (r.error && st !== 409) toMac();   // 409 = 이미 집었다
    }, toMac);
  }
  function toJpeg(blob) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  function aiFail(id, code, msg, text) {
    var w = aiWait[id]; if (!w) return;
    delete aiWait[id]; w.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    var e = err(code, msg); e.text = text != null ? text : w.text; w.reject(e);
  }
  function aiPoll(id) {
    sb.from("docs").select("data").eq("path", "ai_out/" + id).maybeSingle().then(function (r) { if (r.data) aiOut(id, r.data.data); });
  }
  function aiOut(id, o) {
    var w = aiWait[id]; if (!w || !o) return;
    if (o.updatedAt && w.at && o.updatedAt <= w.at && o.status === w.status) return;
    w.at = o.updatedAt; w.status = o.status; w.seen = true; w.via = o.via || "mac";
    if (o.via === "cloud" && o.doing === HANDOFF && !w.handed) {   // 클라우드가 못 받아 맥으로 넘겼다 — 맥도 꺼져 있으면 여기서 알린다
      w.handed = true;
      w.timers.push(setTimeout(function () { if (w.via === "cloud" && !w.text) aiFail(id, "unavailable", "답할 곳이 없어요", "⚠ 지금은 Brainy가 답할 수 없어요 — 클라우드 Brainy(콘솔 API 키)를 쓸 수 없고 맥도 꺼져 있어요. 잠시 뒤 다시 보내 주세요."); }, 25000));
    }
    if (o.doing && !o.text && !w.text && o.doing !== w.doing && w.opts.onText && !w.json) {   // 글 쓰기 전 — 지금 하는 일을 잠깐 보여 준다
      w.doing = o.doing; try { w.opts.onText({ text: "⋯ " + o.doing, delta: "" }); } catch (e) {}
    }
    if ((o.status === "쓰는 중" || o.status === "끝") && typeof o.text === "string" && o.text !== w.text) {
      var prev = w.text; w.text = o.text;
      if (w.opts.onText && !w.json) { try { w.opts.onText({ text: o.text, delta: o.text.indexOf(prev) === 0 ? o.text.slice(prev.length) : o.text }); } catch (e) {} }
    }
    if (o.status === "오류") { aiFail(id, "unavailable", o.error || "맥에서 답하지 못했어요", (w.text ? w.text + "\n\n" : "") + "⚠ " + (o.error || "맥에서 답하지 못했어요")); return; }
    if (o.status === "취소") { aiFail(id, "cancelled", "멈췄어요"); return; }
    if (o.status !== "끝") return;
    delete aiWait[id]; w.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    sb.from("docs").delete().eq("path", "ai_out/" + id).then(function () {}, function () {});
    // 앱 도구 실행 (체크·기록·식단·태스크 로그 …) — 페이지가 준 도구를 그대로 부른다
    var tools = {}; (w.opts.tools || []).forEach(function (t) { tools[t.name] = t; });
    var notes = [], chain = Promise.resolve();
    (Array.isArray(o.actions) ? o.actions : []).forEach(function (a) {
      chain = chain.then(function () {
        var t = a && tools[a.name];
        if (!t) { notes.push("모르는 도구: " + (a && a.name)); return; }
        return Promise.resolve().then(function () { return t.execute(a.input || {}); }).catch(function (e) { notes.push((a.name) + " 실패 — " + (e && e.message || e)); });
      });
    });
    if (o.actionError) notes.push(o.actionError);
    chain.then(function () {
      var text = o.text || "";
      if (notes.length) text += "\n\n⚠ " + notes.join("\n⚠ ");
      if (w.json) {
        var s = text.trim(), m = s.match(/[\[{][\s\S]*[\]}]/);
        try { w.resolve(JSON.parse(m ? m[0] : s)); } catch (e) { var x = err("invalid_json", "답을 읽지 못했어요"); x.text = text; w.reject(x); }
      } else w.resolve({ text: text, truncated: false });
    });
  }
  function ask(input, opts, json) {
    opts = opts || {};
    return ready.then(function () {
      if (opts.signal && opts.signal.aborted) throw err("cancelled", "멈췄어요");
      var imgs = (opts.images || []).slice(0, 5);
      return Promise.all(imgs.map(toJpeg)).then(function (list) {
        var id = "a" + Date.now().toString(36) + rid().slice(0, 6);
        var req = {
          status: "클라우드", input: input, json: !!json, tier: opts.modelTier || "default", createdAt: new Date().toISOString(),
          tools: (opts.tools || []).filter(function (t) { return !READ_TOOL.test(t.name); }).map(function (t) { return { name: t.name, description: t.description || "", inputSchema: t.inputSchema || {} }; }),
          images: list.filter(Boolean)
        };
        return new Promise(function (resolve, reject) {
          var w = aiWait[id] = { opts: opts, json: !!json, text: "", at: "", resolve: resolve, reject: reject, timers: [], seen: false };
          w.timers.push(setTimeout(function () { if (!w.seen) aiFail(id, "unavailable", "맥이 답하지 않아요", "⚠ Brainy가 답하지 않아요 — 인터넷을 확인하고 다시 보내 주세요."); }, 25000));
          w.timers.push(setTimeout(function () { aiFail(id, "unavailable", "너무 오래 걸려요", (w.text ? w.text + "\n\n" : "") + "⚠ 답이 너무 오래 걸려 멈췄어요. 다시 보내 주세요."); }, 9 * 60 * 1000));
          w.timers.push(setInterval(function () { aiPoll(id); }, 1500));   // 실시간 알림을 놓쳐도 받도록
          if (opts.signal) opts.signal.addEventListener("abort", function () {
            sb.from("docs").upsert({ path: "ai/" + id, coll: "ai", id: id, data: { status: "취소" } }).then(function () {}, function () {});
            aiFail(id, "cancelled", "멈췄어요");
          });
          sb.from("docs").upsert({ path: "ai/" + id, coll: "ai", id: id, data: req }).then(function (r) {
            if (r.error) aiFail(id, "unavailable", r.error.message, "⚠ 질문을 보내지 못했어요 — 인터넷을 확인해 주세요.");
            else aiCloud(id, req);
          }, function () { aiFail(id, "unavailable", "보내지 못했어요", "⚠ 질문을 보내지 못했어요 — 인터넷을 확인해 주세요."); });
        });
      });
    });
  }
  var sample = function (input, opts) { return ask(input, opts, false); };
  sample.json = function (input, opts) { return ask(input, opts, true); };
  sample.limits = function () { return Promise.resolve({ tools: true, images: { maxCount: 5 } }); };

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
    var h = '<div class="gbox"><img src="' + APP.icon + '" alt="" width="56" height="56"><h1>' + APP.name + '</h1>';
    if (mode === "wait") h += '<p class="gsub">' + (msg || "불러오는 중…") + "</p>";
    else if (mode === "owner") h += '<p class="gsub">이 계정은 주인으로 등록되지 않았어요.</p><button class="btn" id="g-out">로그아웃</button>';
    // 진짜 <form> 으로 내야 브라우저·아이폰 키체인이 비밀번호를 저장하고 다음에 알아서 채워 준다
    else h += '<p class="gsub">' + (APP.sub || "볼트와 바로 이어지는 내 하루") + '</p><form id="g-form" method="post" action="#" autocomplete="on" style="display:grid;gap:10px">' +
      '<label for="g-em">이메일</label><input id="g-em" name="username" type="email" autocomplete="username" inputmode="email" autocapitalize="off" required>' +
      '<label for="g-pw">비밀번호</label><input id="g-pw" name="password" type="password" autocomplete="current-password" required>' +
      '<button class="btn primary" id="g-go" type="submit">로그인</button></form><p class="gerr" id="g-err">' + (msg || "") + '</p>' +
      '<p class="gsub" style="font-size:12px;margin:0">한 번 로그인하면 이 기기에서는 계속 로그인돼 있어요.</p>';
    gate.innerHTML = h + "</div>";
    var out = document.getElementById("g-out"); if (out) out.onclick = function () { sb.auth.signOut(); };
    var form = document.getElementById("g-form"), go = document.getElementById("g-go");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var em = document.getElementById("g-em").value.trim(), pw = document.getElementById("g-pw").value, er = document.getElementById("g-err");
        if (!em || !pw) { er.textContent = "이메일과 비밀번호를 넣어 주세요."; return; }
        go.disabled = true; er.textContent = "";
        sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) { go.disabled = false; if (r.error) er.textContent = "로그인 실패 — 이메일이나 비밀번호를 확인해 주세요."; });
      });
    }
  }
  function hideGate() { if (gate) gate.hidden = true; }
  function setDot(s) { var d = document.getElementById("rtdot"); if (d) { d.className = s; d.title = s === "on" ? "실시간 연결됨" : s === "off" ? "연결이 끊겼어요 — 다시 잇는 중" : "연결 중"; } }


  /* ---------- 새로고침 버튼 (세 앱 공통 · 2026-11-11 동욱) ----------
     누르면 (a) Supabase 를 통째로 다시 읽어 화면을 최신으로 + (b) 「밀린 것 반영」 cmd 한 장 → 맥이 켜져 있으면 cmd_runner 가 집는다.
     「마지막 동기화」= 맥 동기화가 마지막으로 돈 시각 (mac/main.seenAt, 맥이 30초마다 적음). 90초 넘게 없으면 맥 꺼짐.
     scope 는 지금 "밀린 것" — 나중에 "전체"(중간 결산 전체)로 넓힐 자리. 맥에서만 되는 일이 안 되면 따로 표시하지 않는다. */
  var MAC_PATH = "mac/main", MAC_FRESH = 90 * 1000, BS_SCOPE = "밀린 것";
  var bs = { mac: null, cmd: null, busy: false, err: "", el: null, txt: null, tip: null, tipT: 0, read: false };
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function hm(iso) { var d = new Date(iso || ""); return isNaN(d) ? "" : p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function macOn() { return !!(bs.mac && Date.now() - Date.parse(bs.mac.seenAt || 0) < MAC_FRESH); }
  function bsOpen(c) { return !!c && /보내는 중|처리 중|맥 대기/.test(c.status || ""); }
  function bsRecent(c, ms) { return !!c && !bsOpen(c) && Date.now() - Date.parse(c.doneAt || c.createdAt || 0) < ms; }
  function bsMount() {
    if (bs.el || !document.body) return;
    var b = document.createElement("button");
    b.id = "bsync"; b.type = "button"; b.hidden = true;
    var dot = document.getElementById("rtdot") || document.createElement("span");
    dot.id = "rtdot"; dot.setAttribute("aria-hidden", "true");
    var ic = document.createElement("span"); ic.className = "bs-ic"; ic.setAttribute("aria-hidden", "true"); ic.textContent = "↻";
    var tx = document.createElement("span"); tx.className = "bs-tx";
    b.appendChild(dot); b.appendChild(ic); b.appendChild(tx);
    var tip = document.createElement("div"); tip.id = "bsync-tip"; tip.hidden = true; tip.setAttribute("role", "status");
    b.addEventListener("click", bsPress);
    document.body.appendChild(b); document.body.appendChild(tip);
    bs.el = b; bs.txt = tx; bs.tip = tip;
  }
  function bsShow(on) { bsMount(); if (bs.el) bs.el.hidden = !on; if (!on && bs.tip) bs.tip.hidden = true; }
  function bsSay(msg, ms) {
    bsMount(); if (!bs.tip) return;
    clearTimeout(bs.tipT); bs.tip.textContent = msg; bs.tip.hidden = !msg;
    if (msg) bs.tipT = setTimeout(function () { bs.tip.hidden = true; }, ms || 7000);
  }
  function bsPaint() {
    bsMount(); if (!bs.el) return;
    var c = bs.cmd, on = macOn(), last = bs.mac && bs.mac.seenAt ? hm(bs.mac.seenAt) : "", t, busy = false;
    if (bs.busy) { t = "읽는 중…"; busy = true; }
    else if (bsOpen(c) && on) {
      var st = c.steps || {}; busy = true;
      t = st.total ? "반영 " + (st.n || 0) + "/" + st.total + (st.now ? " · " + st.now : "") : c.status === "보내는 중" ? "반영 대기" : "반영 중";
    }
    else if (bsOpen(c)) t = "맥 꺼짐 · 켜지면 반영";
    else if (bsRecent(c, 10 * 60 * 1000) && c.status === "끝") t = "반영 끝 " + hm(c.doneAt);
    else if (bsRecent(c, 10 * 60 * 1000) && c.status === "멈춤") t = "반영 멈춤";
    else if (bs.err) t = bs.err;
    else t = last ? "동기화 " + last + (on ? "" : " · 맥 꺼짐") : bs.read ? "맥 신호 없음" : "동기화";
    bs.txt.textContent = t;
    bs.el.classList.toggle("busy", busy);
    bs.el.classList.toggle("macoff", !!bs.read && !on);
    var full = "새로고침 — 다시 읽고 밀린 것 반영 · 마지막 동기화 " + (last || "모름") + " · 맥 " + (on ? "켜짐" : "꺼짐");
    bs.el.setAttribute("aria-label", full); bs.el.title = full;
  }
  function bsCmd(row) { return row ? Object.assign({ id: row.id }, row.data) : null; }
  function bsRead() {
    if (!sb || !uid) return Promise.resolve();
    return Promise.all([
      sb.from("docs").select("data").eq("path", MAC_PATH).maybeSingle(),
      sb.from("docs").select("id,data").eq("coll", "cmd").eq("data->>from", "refresh").order("updated_at", { ascending: false }).limit(1)
    ]).then(function (r) {
      if (!r[0].error) bs.mac = r[0].data ? r[0].data.data : null;
      if (!r[1].error) bs.cmd = bsCmd(r[1].data && r[1].data[0]);
      bs.read = true; bsPaint();
    }, function () {});
  }
  function bsEvent(path, p) {
    var d = p.new && p.new.data;
    if (path === MAC_PATH) { if (d) { bs.mac = d; bsPaint(); } else if (p.eventType !== "DELETE") bsRead(); return; }
    if (!d) { if (bs.cmd && path === "cmd/" + bs.cmd.id && p.eventType !== "DELETE") bsRead(); return; }
    if (d.from !== "refresh") return;
    var id = path.slice(4);
    if (bs.cmd && bs.cmd.id !== id && String(d.createdAt || "") < String(bs.cmd.createdAt || "")) return;
    var was = bs.cmd && bs.cmd.id === id ? bs.cmd.status : "";
    bs.cmd = Object.assign({ id: id }, d); bsPaint();
    if (was && was !== d.status && (d.status === "끝" || d.status === "멈춤")) bsSay((d.status === "끝" ? "반영 끝 — " : "반영 멈춤 — ") + String(d.result || "").split("\n")[0].slice(0, 90), 10000);
  }
  function bsPress() {
    if (bs.busy || !sb || !uid) return;
    bs.busy = true; bs.err = ""; bsPaint();
    var a = (state.live ? loadAll() : Promise.resolve()).then(function () { return true; }, function () { return false; });
    var b = bsRead().then(function () {
      if (bsOpen(bs.cmd)) return "이미 요청함";
      var id = "c" + Date.now().toString(36), at = new Date().toISOString();
      var data = { text: "밀린 것 반영 (새로고침 버튼)", scope: BS_SCOPE, from: "refresh", app: APP.key, createdAt: at, sentAt: at, status: "보내는 중", result: "" };
      bs.cmd = Object.assign({ id: id }, data);
      return sb.from("docs").upsert({ path: "cmd/" + id, coll: "cmd", id: id, data: data }).then(function (r) { if (r.error) throw r.error; return "보냄"; });
    });
    Promise.all([a, b]).then(function (r) {
      bs.busy = false; bsPaint();
      var on = macOn();
      bsSay((r[0] ? "다시 읽었어요" : "다시 읽기 실패 — 인터넷 확인") + " · " +
        (r[1] === "이미 요청함" ? (on ? "밀린 것 반영이 이미 도는 중이에요" : "반영 요청이 이미 기다리는 중 — 맥이 켜지면 해요")
          : on ? "밀린 것 반영을 맥에 보냈어요" : "맥이 꺼져 있어요 — 켜지면 밀린 것을 반영해요"));
    }, function () {
      bs.busy = false; bs.err = "못 보냄"; bsPaint(); bsSay("반영 요청을 못 보냈어요 — 인터넷을 확인하고 다시 눌러 주세요");
      setTimeout(function () { bs.err = ""; bsPaint(); }, 15000);
    });
  }
  // 맥 신호가 끊긴 걸 시간으로도 알아챈다 — 낡았으면 「맥 꺼짐」이라 하기 전에 한 번 더 직접 읽는다 (실시간 알림을 놓쳐도 틀리지 않게, 2026-11-12)
  setInterval(function () { if (bs.el && !bs.el.hidden) { if (bs.read && !macOn()) bsRead(); else bsPaint(); } }, 30000);

  /* ---------- 시작 ---------- */
  var uid;
  function start(ses) {
    var id = ses ? ses.user.id : null;
    if (id === uid) return; uid = id;
    if (!ses) {
      state.live = false; docs = {}; try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      if (chan) { sb.removeChannel(chan); chan = null; }
      bsShow(false); showGate("login"); return;
    }
    // 지난번 화면을 먼저 보여 주고(바로 뜸) 최신으로 바꾼다
    try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); if (c && typeof c === "object") { docs = c; state.cached = true; notifyAll(true); hideGate(); } } catch (e) {}
    if (!state.cached) showGate("wait");
    sb.from("owners").select("user_id").eq("user_id", id).maybeSingle().then(function (o) {
      if (o.error) throw o.error;
      if (!o.data) { docs = {}; try { localStorage.removeItem(CACHE_KEY); } catch (e) {} showGate("owner"); return; }
      return loadAll().then(function () { hideGate(); subscribe(); readyResolve(); bsShow(true); bsRead(); });
    }).catch(function () { if (!state.cached) showGate("wait", "연결이 안 돼요 — 인터넷을 확인하고 새로고침해 주세요."); else readyResolve(); });
  }
  var dbReady = new Promise(function (resolve) {
    if (!sb) { resolve(null); return; }
    var done = false;
    listen({ kind: "coll", coll: "__boot__", cb: function () { if (!done) { done = true; resolve(db); } } });
  });
  if (sb) {
    sb.auth.onAuthStateChange(function (ev, ses) { if (ev !== "TOKEN_REFRESHED") setTimeout(function () { start(ses); }, 0); });
    // 볼 때마다 최신으로: 화면이 다시 보이면 앱이 새 버전인지, 날짜가 바뀌었는지 보고, 데이터는 Supabase 에서 통째로 다시 읽는다
    var loadedDay = new Date().toDateString(), lastFresh = 0;
    function fresh() {
      if (document.visibilityState !== "visible") return;
      if (new Date().toDateString() !== loadedDay) { location.reload(); return; }   // 날짜가 바뀌면 오늘로
      checkVersion();
      if (uid && state.live && Date.now() - lastFresh > 3000) { lastFresh = Date.now(); loadDelta().catch(function () {}); bsRead(); }
    }
    function checkVersion() {
      var mine = window.BRAINY_VERSION; if (!mine) return;
      fetch("version.txt?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (v) {
        v = String(v || "").trim(); if (!v || v === mine) return;
        var tried = ""; try { tried = sessionStorage.getItem("brainy-ver") || ""; } catch (e) {}
        if (tried === v) return;                                  // 한 번만 (캐시 때문에 같은 판이 오면 되풀이하지 않는다)
        try { sessionStorage.setItem("brainy-ver", v); } catch (e) {}
        location.replace(location.pathname + "?v=" + encodeURIComponent(v) + location.hash);
      }).catch(function () {});
    }
    document.addEventListener("visibilitychange", fresh);
    window.addEventListener("focus", fresh);
    window.addEventListener("pageshow", function (e) { if (e.persisted) fresh(); });
    setTimeout(checkVersion, 4000);
  } else document.addEventListener("DOMContentLoaded", function () { showGate("wait", "라이브러리를 못 불러왔어요 — 새로고침해 주세요."); });

  window.claude = {
    use: function (name) {
      if (name === "db") return dbReady;
      if (name === "mcp") return dbReady.then(function (d) { return d ? mcp : null; });
      if (name === "downloads") return Promise.resolve(downloads);
      if (name === "sample") return dbReady.then(function (d) { return d ? sample : null; });
      return Promise.resolve(null);
    }
  };
  window.BRAINY = { signOut: function () { return sb.auth.signOut(); }, oldApp: OLD_APP, reload: loadAll, delta: loadDelta, refresh: bsPress };
})();
