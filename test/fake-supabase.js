/* 시험용 가짜 supabase-js — 메모리 표 하나(docs) + owners. window.__FAKE 로 들여다본다. */
(function () {
  var F = window.__FAKE = { rows: (window.__SEED || []).slice(), log: [], bytes: 0, chans: [], clock: Date.parse("2026-11-21T00:00:00Z") };
  function stamp() { F.clock += 1000; return new Date(F.clock).toISOString().replace("Z", "+00:00"); }
  F.rows.forEach(function (r) { r.updated_at = r.updated_at || stamp(); r.coll = r.path.slice(0, r.path.lastIndexOf("/")); r.id = r.path.slice(r.path.lastIndexOf("/") + 1); });
  function get(row, col) { if (col.indexOf("data->>") === 0) { var v = (row.data || {})[col.slice(7)]; return v == null ? null : String(v); } return row[col]; }
  function parseList(v) { return v.replace(/^\(|\)$/g, "").split(",").map(function (x) { return x.replace(/^"|"$/g, ""); }); }
  function Q(table) { this.t = table; this.f = []; this.op = "select"; this.cols = "*"; }
  Q.prototype.select = function (c) { if (this.op === "select") this.cols = c || "*"; else this.ret = c || "*"; return this; };
  Q.prototype.eq = function (c, v) { this.f.push(function (r) { return get(r, c) === v; }); return this; };
  Q.prototype.gt = function (c, v) { this.f.push(function (r) { return get(r, c) > v; }); return this; };
  Q.prototype.in = function (c, a) { this.f.push(function (r) { return a.indexOf(get(r, c)) >= 0; }); return this; };
  Q.prototype.filter = function (c, op, v) { if (op !== "in") throw new Error("fake: filter " + op); var a = parseList(v); return this.in(c, a); };
  Q.prototype.not = function (c, op, v) { var a = parseList(v); this.f.push(function (r) { return a.indexOf(get(r, c)) < 0; }); return this; };
  Q.prototype.order = function (c, o) { this.ord = [c, o && o.ascending === false ? -1 : 1]; return this; };
  Q.prototype.limit = function (n) { this.lim = n; return this; };
  Q.prototype.range = function (a, b) { this.rng = [a, b]; return this; };
  Q.prototype.maybeSingle = function () { this.single = true; return this; };
  Q.prototype.upsert = function (row) { this.op = "upsert"; this.row = row; return this; };
  Q.prototype.update = function (patch) { this.op = "update"; this.patch = patch; return this; };
  Q.prototype.delete = function () { this.op = "delete"; return this; };
  Q.prototype.run = function () {
    var self = this;
    if (F.fail) return { data: null, error: { message: "fake offline" } };
    if (this.t === "owners") return { data: this.single ? { user_id: "u1" } : [{ user_id: "u1" }], error: null };
    var match = function (r) { return self.f.every(function (fn) { return fn(r); }); };
    if (this.op === "upsert") {
      var i = F.rows.findIndex(function (r) { return r.path === self.row.path; });
      var n = Object.assign({}, JSON.parse(JSON.stringify(self.row)), { updated_at: stamp() });
      if (i >= 0) F.rows[i] = n; else F.rows.push(n);
      F.log.push("upsert " + n.path); F.emit(i >= 0 ? "UPDATE" : "INSERT", n);
      return { data: this.ret ? [{ updated_at: n.updated_at }] : null, error: null };
    }
    if (this.op === "update") { F.rows.filter(match).forEach(function (r) { Object.assign(r, JSON.parse(JSON.stringify(self.patch))); r.updated_at = stamp(); F.log.push("update " + r.path); F.emit("UPDATE", r); }); return { data: null, error: null }; }
    if (this.op === "delete") { var gone = F.rows.filter(match); F.rows = F.rows.filter(function (r) { return !match(r); }); gone.forEach(function (r) { F.log.push("delete " + r.path); F.emit("DELETE", null, r); }); return { data: null, error: null }; }
    var out = F.rows.filter(match);
    if (this.ord) { var c = this.ord[0], s = this.ord[1]; out = out.slice().sort(function (a, b) { return (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * s; }); }
    if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1); else out = out.slice(0, 1000);
    if (this.lim) out = out.slice(0, this.lim);
    var cols = this.cols === "*" ? null : this.cols.split(",");
    out = out.map(function (r) { if (!cols) return JSON.parse(JSON.stringify(r)); var o = {}; cols.forEach(function (k) { o[k] = JSON.parse(JSON.stringify(r[k] === undefined ? null : r[k])); }); return o; });
    var size = JSON.stringify(out).length; F.bytes += size; F.log.push("select " + this.cols + " → " + out.length + "줄 " + size + "B");
    return { data: this.single ? (out[0] || null) : out, error: null };
  };
  Q.prototype.then = function (a, b) { var self = this; return new Promise(function (res) { setTimeout(function () { res(self.run()); }, 5); }).then(a, b); };
  F.emit = function (ev, n, o) {
    F.chans.forEach(function (ch) {
      ch.binds.forEach(function (b) {
        if (b.type !== "postgres_changes") return;
        if (b.opt.event !== "*" && b.opt.event !== ev) return;
        if (b.opt.filter && n) { var m = /^(\w+)=in\.\((.*)\)$/.exec(b.opt.filter); if (!m || m[2].split(",").indexOf(n[m[1]]) < 0) return; }
        var p = { eventType: ev, new: n ? JSON.parse(JSON.stringify(n)) : {}, old: o ? { path: o.path } : {} };
        F.rt = (F.rt || 0) + JSON.stringify(p).length;
        setTimeout(function () { b.cb(p); }, 5);
      });
    });
  };
  // 밖(맥)에서 쓴 것처럼
  F.put = function (path, data) { var r = { path: path, coll: path.slice(0, path.lastIndexOf("/")), id: path.slice(path.lastIndexOf("/") + 1), data: data, updated_at: stamp() }; var i = F.rows.findIndex(function (x) { return x.path === path; }); if (i >= 0) F.rows[i] = r; else F.rows.push(r); F.emit(i >= 0 ? "UPDATE" : "INSERT", r); };
  F.del = function (path, quiet) { var r = F.rows.find(function (x) { return x.path === path; }); F.rows = F.rows.filter(function (x) { return x.path !== path; }); if (r && !quiet) F.emit("DELETE", null, r); };
  window.supabase = { createClient: function () {
    return {
      from: function (t) { return new Q(t); },
      auth: { onAuthStateChange: function (cb) { setTimeout(function () { cb("SIGNED_IN", window.__NOLOGIN ? null : { user: { id: "u1" } }); }, 10); return { data: { subscription: { unsubscribe: function () {} } } }; },
              signOut: function () { return Promise.resolve({}); }, signInWithPassword: function () { return Promise.resolve({ error: { message: "fake" } }); }, getSession: function () { return Promise.resolve({ data: { session: { access_token: "x", user: { id: "u1" } } } }); } },
      channel: function (name) { var ch = { name: name, binds: [], on: function (type, opt, cb) { ch.binds.push({ type: type, opt: opt, cb: cb }); return ch; }, subscribe: function (cb) { F.chans.push(ch); setTimeout(function () { cb && cb("SUBSCRIBED"); }, 10); return ch; }, unsubscribe: function () {}, send: function () { return Promise.resolve(); } }; return ch; },
      removeChannel: function (ch) { F.chans = F.chans.filter(function (x) { return x !== ch; }); },
      functions: { invoke: function () { return Promise.resolve({ data: null, error: { context: { status: 500 } } }); } },
      storage: { from: function () { return { upload: function () { return Promise.resolve({ error: { message: "fake" } }); }, getPublicUrl: function () { return { data: { publicUrl: "" } }; } }; } }
    };
  } };
})();
