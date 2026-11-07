#!/usr/bin/env python3
"""claude.ai artifact 원본(src/*.html) → Supabase 로 도는 독립 웹앱 3개.

  src/brainy-home.html → index.html            (Brainy 홈)
  src/shortcuts.html   → shortcuts/index.html  (맥 단축키)
  src/vocab.html       → vocab/index.html      (체화 단어장)

원본 화면 코드는 그대로 두고, 아래 patch 만 끼운다. 원본이 바뀌면 src 를 갈아 끼우고 다시 돌린다.
세 앱은 같은 주소(github.io) 아래라 한 번 로그인하면 셋 다 열린다. 받침 코드 shim.js 하나를 같이 쓴다.
"""
import hashlib
import pathlib
import sys

root = pathlib.Path(__file__).parent
SHIM = (root / "shim.js").read_text(encoding="utf-8")
body = ""


def load(name):
    global body
    lines = (root / "src" / name).read_text(encoding="utf-8").split("\n")
    assert lines[0].startswith("<!doctype html>") and lines[1].startswith("<title>"), name + " 원본 모양이 달라요"
    end = max(i for i, l in enumerate(lines) if l.strip() == "</script>")
    body = "\n".join(lines[2:end + 1])   # <meta claude:…> 부터 앱 스크립트 끝까지


def patch(a, b, n=1):
    global body
    c = body.count(a)
    if c != n:
        sys.exit(f"패치 자리 {c}곳 (기대 {n}): {a[:70]}")
    body = body.replace(a, b)


def patch_between(a, z, b):
    """a 로 시작해 그 뒤 처음 나오는 z 로 끝나는 덩어리를 b 로 바꾼다 (a 는 한 곳뿐이어야)."""
    global body
    c = body.count(a)
    if c != 1:
        sys.exit(f"패치 시작 자리 {c}곳 (기대 1): {a[:70]}")
    i = body.index(a)
    j = body.find(z, i + len(a))
    if j < 0:
        sys.exit(f"패치 끝 자리를 못 찾음: {z[:70]}")
    body = body[:i] + b + body[j + len(z):]


HEAD = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{short}">
<meta name="application-name" content="{short}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="{theme_light}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="{theme_dark}" media="(prefers-color-scheme: dark)">
{icons}
<link rel="manifest" href="manifest.webmanifest">
<title>{title}</title>
<style>
:root{{box-sizing:border-box}}html{{scroll-padding-top:env(safe-area-inset-top,0px)}}
body{{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}}img{{max-width:100%}}[hidden]:not([hidden=until-found i]){{display:none!important}}
/* 폰: 입력칸 글자가 16px보다 작으면 아이폰이 칸을 누를 때 화면을 확대해 버린다 → 왼쪽이 잘리고 아래 탭이 밀림 */
html{{-webkit-text-size-adjust:100%;text-size-adjust:100%}}
html,body{{max-width:100%;overflow-x:clip}}
@media (pointer:coarse){{input,textarea,select{{font-size:16px!important}}}}
:root{{{gate_vars}}}
#gate{{position:fixed;inset:0;z-index:50;background:var(--g-bg);color:var(--g-fg);display:grid;place-items:center;padding:24px;font-family:inherit}}
#gate .gbox{{width:100%;max-width:340px;display:grid;gap:10px;justify-items:stretch}}
#gate img{{border-radius:14px;justify-self:start}}
#gate h1{{font-size:24px;margin:0}}#gate .gsub{{color:var(--g-mut);margin:0 0 8px}}
#gate label{{font-size:13px;color:var(--g-mut);margin-top:4px}}
#gate input{{font:inherit;font-size:16px;color:var(--g-fg);background:var(--g-card);border:1px solid var(--g-line);border-radius:10px;padding:11px 12px;width:100%}}
#gate button{{font:inherit;font-weight:600;cursor:pointer;margin-top:8px;padding:11px 14px;border-radius:999px;border:1px solid var(--g-line);background:var(--g-card);color:var(--g-fg)}}
#gate button[type=submit]{{background:var(--g-acc);border-color:var(--g-acc);color:var(--g-acc-ink)}}
#gate .gerr{{color:var(--g-warn);font-size:13px;min-height:18px}}
#rtdot{{position:fixed;z-index:11;top:calc(8px + env(safe-area-inset-top,0px));right:10px;width:7px;height:7px;border-radius:50%;background:var(--g-line)}}
#rtdot.on{{background:var(--g-ok)}}#rtdot.off{{background:var(--g-warn)}}
{css}
</style>
</head>
<body>
<span id="rtdot" aria-hidden="true"></span>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>window.BRAINY_VERSION = "__VERSION__"; window.BRAINY_APP = {app};</script>
<script src="{up}shim.js?v=__VERSION__"></script>
<script>document.addEventListener("click", function (e) {{ var b = e.target.closest && e.target.closest("[data-brainy=out]"); if (b && confirm("로그아웃할까요?")) window.BRAINY.signOut(); }});</script>
'''


def emit(out_dir, title, short, theme, gate_vars, icons, app, manifest, css="", tail=""):
    """head 를 붙여 out_dir/index.html 을 쓴다. 판 번호(version.txt)는 화면·받침 코드가 바뀌면 달라진다 —
    앱은 볼 때마다 version.txt 와 견주어 새 판이면 스스로 새로 고친다."""
    global body
    d = root / out_dir
    d.mkdir(exist_ok=True)
    up = "../"
    page = HEAD.format(title=title, short=short, theme_light=theme[0], theme_dark=theme[1], icons=icons,
                       gate_vars=gate_vars, css=css, app=app, up=up)
    b = body  # 공개 저장소에 올라가는 코드 — 실명은 원본에도 넣지 않는다
    page = page + b + tail + "\n</body>\n</html>\n"
    ver = hashlib.sha1((page + SHIM).encode("utf-8")).hexdigest()[:10]
    (d / "index.html").write_text(page.replace("__VERSION__", ver), encoding="utf-8")
    (d / "version.txt").write_text(ver + "\n", encoding="utf-8")
    (d / "manifest.webmanifest").write_text(manifest + "\n", encoding="utf-8")
    print(f"{out_dir}/index.html", len(page) // 1024, "KB · 판", ver)


# ═════════════════════════ Brainy 홈 ═════════════════════════
load("brainy-home.html")
# 1) 볼트 반영은 맥 동기화가 몇 초 안에 한다 — Claude 에게 보내는 2분 뒤 자동 명령은 뺀다
patch('autoSync("day", DAY_SYNC, 120000);', '/* 볼트 반영: 맥 동기화(dash_sync.py)가 바로 */')
a = body.index("  function daySyncLine() {"); b = body.index("  function sendCommand(")
body = body[:a] + '''  function vsyncOf(date) { var v = S.vsync; return v && v.date === date ? v : null; }
  function daySyncLine() {
    var v = vsyncOf(TODAY);
    if (v && v.line) return v.line + (v.updatedAt ? " · " + whenKo(v.updatedAt) : "");
    return "쓰는 대로 자동 저장 · 몇 초 안에 볼트 같은 노트로 들어가요 (맥이 켜져 있을 때)";
  }
''' + body[b:]
patch('var syncedAt = day.synced && day.synced[x.key];',
      'var vs_ = vsyncOf(day.date), syncedAt = (vs_ && vs_.synced && vs_.synced[x.key]) || (day.synced && day.synced[x.key]), vrev_ = vs_ && ((vs_.review && vs_.review[x.key]) || (vs_.later && vs_.later[x.key]));')
patch('''(syncedAt ? '<span class="pill good">볼트 반영</span> ' : "") + right''',
      '''(vrev_ ? '<span class="pill warn" title="' + esc(vrev_) + '">볼트 확인</span> ' : syncedAt ? '<span class="pill good">볼트 반영</span> ' : "") + right''')
patch('''if (open && DETAIL[x.key]) h += '<div class="detail">' + vaultFold(x.key)''',
      '''if (open && DETAIL[x.key]) h += '<div class="detail">' + (vrev_ ? '<p class="notice warn">볼트에 못 넣은 칸이 있어요 — ' + esc(vrev_) + '</p>' : "") + vaultFold(x.key)''')
patch('db.doc("config/main").onSnapshot(function (s) { S.cfg = s.exists ? s.data() : {}; softRender(); }, fail);',
      'db.doc("config/main").onSnapshot(function (s) { S.cfg = s.exists ? s.data() : {}; softRender(); }, fail);\n    db.doc("sync/" + TODAY).onSnapshot(function (s) { S.vsync = s.exists ? s.data() : null; softRender(); }, fail);')
patch("앱에서 쓴 건 2분 안에 같은 노트로 들어가요", "앱에서 쓴 건 몇 초 안에 같은 노트로 들어가요")

# 2) Claude 가 해야 하는 명령 — cmd 문서를 "보내는 중"으로 두면 맥 동기화(cmd_runner.py)가 몇 초 안에 이 맥의 Claude 를 깨운다.
#    Claude 가 집으면 "처리 중" → "끝" 으로 바꾼다. ("처리 중"을 앱이 먼저 쓰면 30분 동안 안 집으므로 쓰지 않는다)
patch('''return ref.update({ status: "처리 중", sentAt: new Date().toISOString() }).then(function () { return "보냄 — 맥의 Brainy가 처리하면 결과가 기록 탭 '명령'에 떠요 (보통 몇 분)"; });''',
      '''return ref.update({ status: "보내는 중", sentAt: new Date().toISOString(), result: "" }).then(function () { return "보냄 — 맥의 Brainy가 곧 집어서 처리해요. 결과는 기록 탭 '명령'에 떠요 (맥이 켜져 있을 때 · 보통 몇 분)"; });''')
patch('''S.retrying[id] = false; return S.db.collection("cmd").doc(id).update({ status: "처리 중", result: "", sentAt: new Date().toISOString() });''',
      '''S.retrying[id] = false; return S.db.collection("cmd").doc(id).update({ status: "보내는 중", result: "", sentAt: new Date().toISOString() });''')

# 3) 문구
patch("이 화면에서는 저장소에 연결할 수 없어요. Claude 앱이나 claude.ai에서 열면 데이터와 체크가 나타나요.", "저장소에 연결하지 못했어요. 인터넷을 확인하고 새로고침해 주세요.")
patch('''" 기준 · 체크와 답은 밤 점검 때 Brainy가 볼트로 옮겨요" : "Brainy 홈") + "</p>";''',
      '''" 기준 · 쓴 건 몇 초 안에 볼트로 들어가요" : "Brainy 홈") + ' · <a class="more" href="../shortcuts/" style="display:inline">맥 단축키</a> · <a class="more" href="../vocab/" style="display:inline">체화 단어장</a> · <button class="more" data-brainy="out" style="display:inline">로그아웃</button></p>';''')
patch('''h += '<p class="notice">이 화면에서는 Claude에게 물을 수 없어요. Claude 앱이나 claude.ai에서 열어 주세요.</p>';''',
      '''h += '<p class="notice">지금은 Brainy와 대화할 수 없어요. 새로고침해 보고, 그래도 안 되면 맥이 켜져 있는지 확인해 주세요.</p>';''')
# 위키 탭의 '단어장에서 학습하기' → 새 체화 단어장 (같은 주소 아래)
patch('''href="' + esc(v.url) + '" target="_blank" rel="noopener"''', '''href="../vocab/"''', 2)

# 4) Brainy 대화·태스크 작업실 — 이제 맥의 Claude(볼트를 열어 둔 채)가 답한다 (shim.js sample → ai_runner.py)
#    읽기 도구(get_project 등)는 맥 Claude 가 볼트를 직접 읽는 걸로 대신하고, 볼트 반영도 시키면 바로 한다 (2026-11-06 동욱)
patch('''" 프로젝트·태스크·카드 세부는 get_project, 위키는 search_wiki, 메모는 get_recent_notes, 다른 날 기록은 get_day를 먼저 불러 확인한다."''',
      '''" 데이터에 없는 세부(프로젝트 허브·태스크 노트·카드·위키·다른 날 기록·메모)는 볼트 파일을 직접 읽어 확인한다."''')
patch('''"3. 옵시디언 볼트·Todoist·캘린더에 반영할 일(결산, 🗳 결산 대기 답, 아침 계획 응, 태스크 고치기, /log 등)은 동욱이 분명히 시키면 run_command로 맥의 Brainy에게 보낸다. 직접 쓰는 척하지 않는다. 🗳 결산 대기 목록은 데이터의 '결산 대기'에 있다."''',
      '''"3. 동욱이 분명히 시키면 볼트에 바로 반영한다. 태스크 고치기(기한·상태·완료 기준)·노트에 넣기처럼 금방 끝나는 건 네가 직접 고치고 어디를 고쳤는지 한 줄로 알린다. 결산·🗳 결산 대기 답·아침 계획 응·/log처럼 오래 걸리거나 캘린더가 필요한 일은 run_command로 맥의 Brainy에게 보낸다(몇 분 뒤 기록 탭 '명령'에 결과). 🗳 결산 대기 목록은 데이터의 '결산 대기'에 있다."''')
patch('''"5. 볼트(옵시디언)는 여기서 직접 바꾸지 않는다. 체크·로그·산출물은 앱에 저장되고 1~2분 안에 맥의 Brainy가 태스크 노트로 자동 반영한다.",''',
      '''"5. 체크·로그·산출물·다음 한 걸음은 도구로 앱에 저장하면 잠시 뒤 맥의 Brainy가 태스크 노트로 자동 반영한다. 동욱이 기한·상태·완료 기준 문구·본문처럼 도구로 안 되는 걸 고치라고 분명히 시키면, 태스크 노트(3_Action/32_태스크/T-<태스크 이름>.md)를 action-update 규칙대로 직접 고치고 무엇을 고쳤는지 한 줄로 알린다.",''')
patch("생각하는 중… (처음 한 번은 Claude 사용 허락을 물어요)", "맥의 Brainy가 생각하는 중… (보통 5~15초)", 2)
# 5) 태스크 작업실·태스크 기록 → 노트: 맥 동기화(task_sync.py)가 규칙대로 몇 초 안에 한다. Claude 를 깨우던 명령은 뺀다
#    (예전엔 명령마다 Claude 실행이라 3~4분 · 사용량도 들었다)
patch('''autoSync("tw:" + title, "태스크 기록 반영: " + title + " (자동 — 작업실 체크·로그·산출물)", 90000);''',
      '''/* 노트 반영: 맥 동기화(task_sync.py)가 몇 초 안에 */''')
patch('''      if (!send || !S.mcp || !cmdTriggerId()) { S.tlBusy[title] = false; S.tlMsg[title] = { t: "저장 — 맥이 연결되면 태스크 노트로 들어가요" }; render(); return; }
      return sendCommand("태스크 기록 반영: " + title + "\\n" + tx + "\\n(tasklog id: " + id + ")").then(function () {
        S.tlBusy[title] = false; S.tlMsg[title] = { t: "보냄 — 몇 분 뒤 태스크 노트에 반영돼요" }; return S.db.collection("tasklog").doc(id).update({ status: "보냄" });
      }, function (e) { S.tlBusy[title] = false; S.tlMsg[title] = { t: "기록은 저장됐고, 반영 명령은 못 보냈어요 — " + e.message, err: true }; render(); });''',
      '''      S.tlBusy[title] = false; S.tlMsg[title] = { t: "저장 — 몇 초 안에 태스크 노트 「로그」에 들어가요 (맥이 켜져 있을 때)" }; render();''')
# 6) 대화 저장 · 최근 것만 펼치기 (2026-11-07 동욱: "최근 채팅만 보고 채팅을 펼치기 접기")
#    - Brainy 대화: chat/s0~s11 열두 칸에 돌려 쓴다 (지우지 않고 가장 오래된 칸을 덮어씀) → 앱을 다시 열어도 이어짐
#    - 태스크 작업실 대화: twchat/<태스크> 에 최근 30개
#    - 최근 주고받기 1번만 다 보이고, 이전 대화는 접힘 · 긴 말은 몇 줄만 보이고 「펼치기」
patch('''.bub.ai.wait { color: var(--muted); }''', '''.bub.ai.wait { color: var(--muted); }
.bub.clamp { max-height: 7.4em; overflow: hidden; -webkit-mask-image: linear-gradient(#000 55%, transparent); mask-image: linear-gradient(#000 55%, transparent); }
.bubx { justify-self: start; font: inherit; font-size: 13px; font-weight: 600; color: var(--accent); background: none; border: 0; padding: 0 6px; margin-top: -4px; cursor: pointer; }
.bubx.me { justify-self: end; }
.thr { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); display: grid; gap: 8px; padding: 10px 12px; }
.thr > .h { font: inherit; color: var(--ink); background: none; border: 0; padding: 0; text-align: left; cursor: pointer; display: flex; justify-content: space-between; gap: 10px; font-size: 14px; }''')
patch('''  function renderChat() {''', '''  function bubHtml(key, t, cls, attrs, live) {
    var txt = t.content || "", long = !live && txt.length > 260, open = !!S.exp[key];
    var h = '<div class="bub ' + cls + (long && !open ? " clamp" : "") + '"' + (attrs || "") + ">" + esc(txt) + "</div>";
    if (long) h += '<button class="bubx' + (t.role === "user" ? " me" : "") + '" data-act="bubx" data-k="' + esc(key) + '">' + (open ? "▴ 접기" : "▾ 펼치기") + "</button>";
    return h;
  }
  function slimTurns(turns) { return turns.filter(function (t) { return t.content && !t.pending; }).slice(-30).map(function (t) { return { role: t.role, content: clip(t.content, 6000), acts: t.acts || [], err: t.err || "" }; }); }
  function chatSlot() {
    var have = {}; (S.threads || []).forEach(function (x) { have[x.id] = x; });
    for (var i = 0; i < 12; i++) if (!have["s" + i]) return "s" + i;
    return (S.threads || []).slice().sort(function (a, b) { return (a.updatedAt || "") < (b.updatedAt || "") ? -1 : 1; })[0].id;
  }
  function saveChat() {
    var c = S.chat; if (!S.db || S.readOnly || !c.turns.length) return;
    if (!c.id) { c.id = chatSlot(); c.at = new Date().toISOString(); }
    var first = c.turns.filter(function (t) { return t.role === "user"; })[0];
    c.savedAt = new Date().toISOString();
    S.db.collection("chat").doc(c.id).set({ at: c.at, updatedAt: c.savedAt, project: c.project || null, task: c.task || null, title: clip(first ? first.content : "대화", 40), turns: slimTurns(c.turns) }).catch(function () {});
  }
  function twChatSave(title, r) {
    if (!S.db || S.readOnly) return; r.at = new Date().toISOString();
    S.db.collection("twchat").doc(twSlug(title)).set({ task: title, updatedAt: r.at, turns: slimTurns(r.turns) }).catch(function () {});
  }
  function resumeChat(x) {
    S.chat = { id: x.id, at: x.at, turns: JSON.parse(JSON.stringify(x.turns || [])), busy: false, ctl: null, project: x.project || null, task: x.task || null };
    S.thOpen.chat = false; S.thOpen.past = false;
    document.getElementById("chat-ctx").textContent = S.chat.project ? "보고 있는 프로젝트: " + S.chat.project + " · 볼트 전체도 함께 봐요" : "내 볼트 전체를 보고 답하고, 부탁하면 앱에 적고 체크해요";
  }
  function pastThreads(open) {
    var list = (S.threads || []).filter(function (x) { return x.id !== S.chat.id && (x.turns || []).length; }).slice(0, 11);
    if (!list.length) return "";
    var on = open || !!S.thOpen.past;
    var h = open ? '<p class="small muted" style="margin-top:6px">지난 대화</p>' : '<button class="more" data-act="thtoggle" data-k="past">' + (on ? "▴ 지난 대화 숨기기" : "▾ 지난 대화 " + list.length + "개") + "</button>";
    if (!on) return h;
    return h + list.map(function (x) {
      var k = "thr:" + x.id, op = !!S.thOpen[k], n = Math.ceil(x.turns.length / 2);
      var s = '<div class="thr"><button class="h" data-act="thtoggle" data-k="' + esc(k) + '"><span>' + (op ? "▴ " : "▾ ") + esc(x.title || "대화") + (x.task ? ' <span class="small muted">· ' + esc(x.task) + "</span>" : x.project ? ' <span class="small muted">· ' + esc(x.project) + "</span>" : "") + '</span><span class="small muted" style="white-space:nowrap">' + esc(whenKo(x.updatedAt)) + " · " + n + "번</span></button>";
      if (op) {
        var last = x.turns.slice(-2), base = x.turns.length - last.length;
        s += last.map(function (t, j) { return bubHtml("b:" + x.id + ":" + x.updatedAt + ":" + (base + j), t, t.role === "user" ? "me" : "ai", "", false); }).join("");
        s += '<div class="row end"><button class="btn" data-act="chatresume" data-id="' + esc(x.id) + '">이어서 하기</button></div>';
      }
      return s + "</div>";
    }).join("");
  }
  function renderChat(keep) {
    var box0 = document.getElementById("msgs"), top0 = box0 ? box0.scrollTop : 0;''')
patch('''      if (!S.toolsOK && S.sample) h += '<p class="small muted">이 기기에서는 Brainy가 앱에 직접 적는 기능이 꺼져 있어요. 묻고 답하기만 돼요.</p>';
    }''', '''      if (!S.toolsOK && S.sample) h += '<p class="small muted">이 기기에서는 Brainy가 앱에 직접 적는 기능이 꺼져 있어요. 묻고 답하기만 돼요.</p>';
      h += pastThreads(true);
    } else h += pastThreads(false);''')
patch('''      if (t.role === "user") h += '<div class="bub me">' + esc(t.content) + "</div>";''',
      '''      var bk = "b:" + (S.chat.id || "new") + ":" + (S.chat.at || "") + ":" + i, live = i >= S.chat.turns.length - 2;
      if (t.role === "user") h += bubHtml(bk, t, "me", "", live);''')
patch('''        h += '<div class="bub ai' + (t.content ? "" : " wait") + '" id="bub-' + i + '">' + (t.content ? esc(t.content) : "맥의 Brainy가 생각하는 중… (보통 5~15초)") + "</div>";''',
      '''        h += t.content ? bubHtml(bk, t, "ai", ' id="bub-' + i + '"', live) : '<div class="bub ai wait" id="bub-' + i + '">맥의 Brainy가 생각하는 중… (보통 5~15초)</div>';''')
patch('''btn.setAttribute("data-act", S.chat.busy ? "chatstop" : "chatsend");
    var box = document.getElementById("msgs"); box.scrollTop = box.scrollHeight;''',
      '''btn.setAttribute("data-act", S.chat.busy ? "chatstop" : "chatsend");
    var box = document.getElementById("msgs"); box.scrollTop = keep ? top0 : box.scrollHeight;''')
# 열 때: 6시간 안에 하던 대화(같은 프로젝트)가 있으면 그대로 이어서 보여 준다
patch('''    if (project !== undefined && project !== S.chat.project) { S.chat = { turns: [], busy: false, ctl: null, project: project }; }''',
      '''    if (project !== undefined && project !== S.chat.project) { S.chat = { turns: [], busy: false, ctl: null, project: project }; }
    if (!S.chat.turns.length && !S.chat.task && !q) { var rec = (S.threads || []).filter(function (x) { return (x.project || null) === (S.chat.project || null) && !x.task && (x.turns || []).length && Date.now() - Date.parse(x.updatedAt || 0) < 6 * 3600e3; })[0]; if (rec) resumeChat(rec); }''')
patch('''    S.chat.turns.push({ role: "user", content: q });''',
      '''    S.chat.turns.push({ role: "user", content: q }); S.thOpen.chat = false;''')
patch('''    }).then(function () { S.chat.busy = false; S.chat.ctl = null; renderChat(); render(); });''',
      '''    }).then(function () { S.chat.busy = false; S.chat.ctl = null; saveChat(); renderChat(); render(); });''')
patch('''      .then(function () { ai.pending = false; r.busy = false; r.ctl = null; r.ai = null; render(); });''',
      '''      .then(function () { ai.pending = false; r.busy = false; r.ctl = null; r.ai = null; twChatSave(title, r); render(); });''')
# 작업실 말풍선도 길면 접기 (마지막 답은 다 보임)
patch('''return '<div class="bub ' + (t.role === "user" ? "me" : "ai") + '" style="max-width:100%"' + (isLastAi ? ' id="twout-' + slug + '"' : "") + ">" + esc(t.content || (t.pending ? "생각하는 중…" : "")) + "</div>"''',
      '''return (t.pending && !t.content ? '<div class="bub ai" style="max-width:100%" id="twout-' + slug + '">생각하는 중…</div>' : bubHtml("b:" + slug + ":" + t.role + ":" + (t.content || "").length + ":" + (t.content || "").slice(0, 12), t, t.role === "user" ? "me" : "ai", ' style="max-width:100%"' + (isLastAi ? ' id="twout-' + slug + '"' : ""), isLastAi))''', 2)
patch('''    if (act === "thtoggle") { var tk = t.getAttribute("data-k"); S.thOpen[tk] = !S.thOpen[tk]; if (tk === "chat") renderChat(); else render(); return; }''',
      '''    if (act === "thtoggle") { var tk = t.getAttribute("data-k"); S.thOpen[tk] = !S.thOpen[tk]; if (tk === "chat" || tk === "past" || tk.indexOf("thr:") === 0) renderChat(tk !== "chat"); else render(); return; }
    if (act === "bubx") { var bxk = t.getAttribute("data-k"); S.exp[bxk] = !S.exp[bxk]; if (!sheet.hidden) renderChat(true); else render(); return; }
    if (act === "chatresume") { var rid0 = t.getAttribute("data-id"), th0 = (S.threads || []).filter(function (x) { return x.id === rid0; })[0]; if (th0 && !S.chat.busy) { resumeChat(th0); renderChat(); } return; }''')
patch('''    db.collection("taskwork").onSnapshot(''', '''    db.collection("chat").onSnapshot(function (q) { S.threads = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.updatedAt || "") < (a.updatedAt || "") ? -1 : 1; }); if (!sheet.hidden && !S.chat.busy) renderChat(true); }, fail);
    db.collection("twchat").onSnapshot(function (q) { q.docs.forEach(function (d) { var x = d.data(), r = S.twRun[x.task]; if (!x.task || (r && (r.busy || (r.at || "") >= (x.updatedAt || "")))) return; S.twRun[x.task] = { turns: x.turns || [], at: x.updatedAt }; }); softRender(); }, fail);
    db.collection("taskwork").onSnapshot(''')

emit("home", "Brainy 홈", "Brainy 홈", ("#eef0ec", "#101513"),
     "--g-bg:var(--bg);--g-fg:var(--ink);--g-mut:var(--muted);--g-card:var(--surface);--g-line:var(--line);--g-acc:var(--accent);--g-acc-ink:var(--accent-ink);--g-warn:var(--warn);--g-ok:var(--good)",
     '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-180.png">',
     '{key: "home", name: "Brainy 홈", icon: "icon.svg", sub: "볼트와 바로 이어지는 내 하루"}',
     '{"id":"/brainy-today/home/","name":"Brainy 홈","short_name":"Brainy 홈","start_url":"./","scope":"./","display":"standalone","background_color":"#eef0ec","theme_color":"#1f5e52","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"},{"src":"icon.svg","sizes":"any","type":"image/svg+xml"}]}',
     ".app{padding-top:calc(20px + env(safe-area-inset-top,0px))!important}")

# Brainy 대화창 — 맥 단축키·체화 단어장 안에서 묻기·이 앱 고쳐 달라기 (클라우드 Brainy 의 app_edit_* 도구)
BRAINY_CHAT = "\n" + (root / "src" / "brainy-chat.js").read_text(encoding="utf-8")

# ═════════════════════════ 맥 단축키 ═════════════════════════
load("shortcuts.html")
# 목록은 볼트 `4_Outputs/단축키 앱/단축키 데이터.json` → 맥 동기화(app_data.py) → sc.data/main. 코드 안 목록은 처음 뜰 때만 쓴다.
# ✓패스·★즐겨찾기는 sc.marks/main 에 — 모든 기기에서 같다.
patch('''    DB = d;
''', '''    DB = d;
    DB.doc("sc.data/main").onSnapshot(function(s){
      var v = s.exists ? s.data() : null;
      if(!v || !Array.isArray(v.items) || !v.items.length) return;
      GROUPS = v.groups; D = v.items; MODES = v.modes; PROJECTS = v.projects;
      // 코드에만 있는 것(앱 고치기로 더한 ls · ls -l · ⌘⇧D 등)은 볼트 목록에 없어도 빠지지 않게 — 코드 순서 바로 뒤에 끼운다
      var have = {}; D.forEach(function(x){ have[x.id] = 1 });
      CODE_D.forEach(function(x, j){
        if(have[x.id]) return;
        var at = -1, prev = j ? CODE_D[j-1].id : null;
        D.forEach(function(y, i){ if(y.id === prev) at = i });
        if(at < 0) D.forEach(function(y, i){ if(y.g === x.g) at = i });
        if(at < 0) D.push(x); else D.splice(at + 1, 0, x);
        have[x.id] = 1;
      });
      STARTER = D.filter(function(x){ return x.starter });
      repaint(); renderBoard();
      if(current==="fav") renderList("fav"); if(current==="pass") renderList("pass");
    }, function(){});
    DB.doc("sc.marks/main").onSnapshot(function(s){
      var v = s.exists ? s.data() : null;
      // 이 기기에서 누른 ★·✓ 가 아직 저장소에 안 닿았으면 이 기기 것이 더 새롭다 — 덮지 않고 다시 올린다
      if(load("mk.dirty", 0)){ if(!v || JSON.stringify(v.marks) !== JSON.stringify(marks)) mkPush(); return; }
      if(v && v.marks){
        var add = 0;
        if(!s.metadata.fromCache && !load("mk.restored", false)){   // 한 번만: 저장소에 못 올라가고 이 기기에만 남은 ★ 를 되살린다
          var old = {}; Object.keys(marks).forEach(function(k){ if(marks[k]==="fav") old[k] = 1 });
          (load("mk.favs", []) || []).forEach(function(k){ old[k] = 1 });
          Object.keys(old).forEach(function(k){ if(!v.marks[k]){ v.marks[k] = "fav"; add++ } });
          save("mk.restored", true);
        }
        marks = v.marks; save("mk.marks", marks); repaint(); if(current==="fav") renderList("fav"); if(current==="pass") renderList("pass");
        if(add) mkPush();
      }
      else if(Object.keys(marks).length) mkPush();
    }, function(){});
''')
patch('''var filter = "전체";''', '''var filter = "전체";
function mkPush(){   // ★·✓ 저장 — 저장소에 닿을 때까지 mk.dirty 로 들고 있다 (닿지 못하면 다음에 열 때 다시 올린다)
  var seq = (load("mk.dirty", 0) || 0) + 1; save("mk.dirty", seq);
  if(!DB) return;
  DB.doc("sc.marks/main").set({ marks: marks, updatedAt: new Date().toISOString() })
    .then(function(){ if(load("mk.dirty", 0) === seq) save("mk.dirty", 0); }, function(){});
}''')
patch('''    if(marks[id]===kind) delete marks[id]; else marks[id]=kind;
    save("mk.marks", marks);''', '''    if(marks[id]===kind) delete marks[id]; else marks[id]=kind;
    save("mk.marks", marks);
    mkPush();''')
patch('statusMsg("찾는 중… (처음 한 번은 허용할지 묻는다)");', 'statusMsg("맥의 Brainy가 찾는 중… (보통 10~20초)");')
patch('''<p>볼트 <code>2_LLMWiki/wiki/자기경영/맥 핵심 단축키</code>''',
      '''<p><a href="../home/" style="color:inherit">← Brainy 홈</a> · <button type="button" data-brainy="out" style="font:inherit;color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer">로그아웃</button></p>
  <p>볼트 <code>2_LLMWiki/wiki/자기경영/맥 핵심 단축키</code>''')
# 「강의」 탭: 강의 교안 순서대로 누르고 치는 것 — 볼트 `4_Outputs/단축키 앱/강의 순서.json` → sc.data/course, 진도 → sc.marks/course
patch('''<button id="tab-now" role="tab" aria-selected="true" aria-controls="view-now">지금</button>''',
      '''<button id="tab-now" role="tab" aria-selected="true" aria-controls="view-now">지금</button>
        <button id="tab-course" role="tab" aria-selected="false" aria-controls="view-course">강의</button>''')
patch('''  <div id="view-fav" role="tabpanel" aria-labelledby="tab-fav" hidden></div>''',
      '''  <div id="view-course" role="tabpanel" aria-labelledby="tab-course" hidden></div>
  <div id="view-fav" role="tabpanel" aria-labelledby="tab-fav" hidden></div>''')
patch('''var VIEWS = {now:"view-now", home:"view-home", fav:"view-fav", pass:"view-pass"};''',
      '''var VIEWS = {now:"view-now", course:"view-course", home:"view-home", fav:"view-fav", pass:"view-pass"};''')
patch('''  if(name==="now") renderNow();''', '''  if(name==="now") renderNow();
  if(name==="course") renderCourse();
  save("sc.tab", name);''')
patch('''document.addEventListener("click", function(e){
  var mk = e.target.closest("[data-mark]");''', (root / "src" / "sc-course.js").read_text(encoding="utf-8") + '''
document.addEventListener("click", function(e){
  var mk = e.target.closest("[data-mark]");''')
patch('''renderChips(); renderSections(); renderBoard(); renderNow();
document.getElementById("chips").hidden = true;''', '''renderChips(); renderSections(); renderBoard(); renderNow();
document.getElementById("chips").hidden = true;
var lastTab = load("sc.tab", "now"); if(lastTab !== "now" && VIEWS[lastTab]) show(lastTab);   // 마지막에 보던 탭으로 연다''')
patch('''    DB.doc("sc.marks/main").onSnapshot(function(s){''', '''    DB.doc("sc.data/course").onSnapshot(function(s){
      var v = s.exists ? s.data() : null;
      if(!v || !Array.isArray(v.courses) || !v.courses.length) return;
      COURSE = v; save("sc.course.data", v);
      if(current==="course") renderCourse(); if(current==="fav") renderList("fav");
    }, function(){});
    DB.collection("sc.creq").onSnapshot(function(q){ csSetReqs(q.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); })); }, function(){});
    DB.doc("sc.marks/course").onSnapshot(function(s){
      var v = s.exists ? s.data() : null;
      if(load("sc.course.dirty", 0)){   // 이 기기에서 누른 ★·✓ 가 아직 저장소에 안 닿았다 — 덮지 않고 다시 올린다
        if(!v || JSON.stringify(Object.assign({}, v, { updatedAt: 0 })) !== JSON.stringify(Object.assign({}, CPROG, { updatedAt: 0 }))) csSave();
        return;
      }
      if(v && v.at){ CPROG = { cur: v.cur || "", at: v.at || {}, done: v.done || {}, sd: v.sd || {}, all: !!v.all, cp: v.cp || {}, cf: v.cf || {}, pk: v.pk || {} }; save("sc.course", CPROG); if(current==="course") renderCourse(); if(current==="fav") renderList("fav"); }
      else if(CPROG.cur || Object.keys(CPROG.at).length) csSave();
    }, function(){});
    DB.doc("sc.marks/main").onSnapshot(function(s){''')
patch('''<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gothic+A1''',
      '''<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gothic+A1''')
SC_CSS = (".cs-pick{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.cs-pick .mode b{font-family:var(--f-mono);font-size:.72rem;color:var(--accent)}.cs-pick .mode[aria-pressed=true] b{color:inherit}.cs-pick .n{font-family:var(--f-mono);font-size:.68rem;opacity:.7;margin-left:3px}"
  ".cs-now{scroll-margin-top:130px;background:var(--surface);border:1px solid var(--rule);border-radius:14px;padding:16px 18px 14px;margin-bottom:34px}.cs-now .block-head h2{color:var(--accent)}"
  ".cs-part-l{margin:10px 0 2px;font-family:var(--f-mono);font-size:.66rem;letter-spacing:.06em;color:var(--faint)}.cs-h{margin:0 0 10px;font-family:var(--f-disp);font-size:1.08rem;letter-spacing:-.015em}"
  ".cs-steps{list-style:none;margin:0;padding:0;display:grid;gap:2px}.cs-step{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:10px 4px;border-bottom:1px solid var(--hair)}.cs-step:last-child{border-bottom:0}"
  ".cs-num{width:28px;height:28px;border-radius:50%;border:1px solid var(--cap-line);background:var(--raised);color:var(--dim);font:600 .75rem var(--f-mono);cursor:pointer;padding:0}.cs-step.ok .cs-num{background:var(--ok-dim);color:var(--ok);border-color:transparent}.cs-step.ok .cs-t{color:var(--faint)}"
  ".cs-main{min-width:0;display:grid;gap:6px}.cs-t{font-size:.92rem;font-weight:500}.cs-kind{font-family:var(--f-mono);font-size:.62rem;font-weight:600;letter-spacing:.04em;color:var(--faint);margin-right:8px;white-space:nowrap}"
  ".k-cmd .cs-kind,.k-slash .cs-kind{color:var(--ok)}.k-say .cs-kind{color:var(--accent)}.k-key .cs-kind{color:var(--fg)}"
  ".cs-body{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}.cs-body .combo{justify-content:flex-start}"
  ".cs-code{font-family:var(--f-mono);font-size:.8rem;line-height:1.5;background:var(--bg);border:1px solid var(--rule);border-radius:8px;padding:7px 10px;flex:1 1 220px;min-width:0;overflow-wrap:anywhere;white-space:pre-wrap}.cs-code i{color:var(--faint);font-style:normal}"
  ".k-say .cs-code{font-family:var(--f-body);font-size:.86rem;border-left:3px solid var(--accent)}.cs-path{font-size:.84rem;color:var(--dim);line-height:1.55}"
  ".cs-copy{font:inherit;font-size:.74rem;color:var(--dim);background:none;border:1px solid var(--rule);border-radius:7px;padding:6px 10px;cursor:pointer;white-space:nowrap}.cs-copy:hover{color:var(--fg);border-color:var(--cap-line)}"
  ".cs-why{font-size:.78rem;color:var(--dim);line-height:1.5}.cs-empty{color:var(--faint);font-size:.86rem;margin:4px 0 10px}"
  ".cs-nav{display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap}.cs-src{display:block;margin-top:8px;font-size:.7rem;color:var(--faint)}"
  ".cs-ch{border-bottom:1px solid var(--hair)}.cs-ch>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:10px 4px;font-size:.88rem}.cs-ch>summary::-webkit-details-marker{display:none}"
  ".cs-ch.done .cs-title{color:var(--faint)}.cs-ch.here>summary{color:var(--accent);font-weight:600}.cs-mark{font-size:.75rem;color:var(--ok);text-align:center}.cs-ch.here .cs-mark{color:var(--accent)}"
  ".cs-cnt{display:flex;gap:6px;font-family:var(--f-mono);font-size:.66rem;color:var(--faint)}.cs-cnt i{font-style:normal}.cs-in{padding:2px 0 14px 30px}"
  ".cs-hit{display:grid;gap:5px;width:100%;text-align:left;font:inherit;color:inherit;background:none;border:0;border-bottom:1px solid var(--hair);padding:10px 4px;cursor:pointer}.cs-hit:hover{background:var(--surface)}.cs-hit .combo{justify-content:flex-start}"
  ".cs-seg{display:inline-flex;background:var(--bg);border:1px solid var(--rule);border-radius:10px;padding:3px;gap:3px;margin:0 0 14px}.cs-seg button{font:inherit;font-size:.84rem;color:var(--dim);background:none;border:0;border-radius:7px;padding:7px 13px;cursor:pointer;white-space:nowrap}.cs-seg button[aria-pressed=true]{background:var(--raised);color:var(--fg);font-weight:600;box-shadow:var(--shadow)}"
  ".cs-cheat{display:grid;margin-top:6px}.cs-crow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 14px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--hair)}.cs-crow:last-child{border-bottom:0}"
  ".cs-cbody{display:flex;gap:6px;align-items:center;justify-content:flex-end;min-width:0;flex-wrap:wrap}.cs-cbody .cs-code{flex:0 1 auto;max-width:420px;padding:5px 9px}.cs-crow.ok .cs-t,.cs-crow.ok .cs-code,.cs-crow.ok kbd{opacity:.45}"
  ".cs-sort{display:flex;gap:6px;align-items:center;margin:4px 0 8px;font-size:.78rem;color:var(--faint)}.cs-sort button{font:inherit;font-size:.78rem;color:var(--dim);background:none;border:1px solid var(--rule);border-radius:99px;padding:4px 11px;cursor:pointer}.cs-sort button[aria-pressed=true]{color:var(--bg);background:var(--fg);border-color:var(--fg)}"
  ".cs-goto{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;color:var(--fg);background:var(--accent-dim);border:1px solid transparent;border-radius:12px;padding:12px 14px;margin:8px 0 26px;cursor:pointer}.cs-goto span:first-child{font-size:.74rem;font-weight:700;color:var(--accent);white-space:nowrap}.cs-goto b{flex:1;min-width:0;font-weight:600;font-size:.9rem}.cs-goto .n{font-family:var(--f-mono);font-size:.72rem;color:var(--dim);white-space:nowrap}"
  ".cs-lec{scroll-margin-top:130px}.cs-lec.here .block-head h2{color:var(--accent)}.cs-lec.done .block-head h2{color:var(--faint)}"
  ".cs-basics{margin:-14px 0 30px;border:1px solid var(--rule);border-radius:12px;padding:0 12px;background:var(--surface)}.cs-basics>summary{font-weight:600}.cs-basics .cs-mark{color:var(--ok);font-family:var(--f-mono)}.cs-basics .cs-in{padding:0 0 10px}"
  ".cs-cbody .marks{margin-left:2px}.cs-legend{margin:6px 0 4px;font-size:.78rem;color:var(--dim)}"
  ".cs-chlink{font:inherit;font-size:.7rem;color:var(--faint);background:none;border:0;padding:0 0 0 6px;cursor:pointer;text-decoration:underline;text-underline-offset:2px}.cs-chlink:hover{color:var(--accent)}"
  "@media (max-width:560px){.cs-crow{grid-template-columns:1fr}.cs-cbody{justify-content:flex-start}.cs-cbody .cs-code{flex:1 1 200px;max-width:none}.cs-seg{display:flex}.cs-seg button{flex:1}}"
  "@media (max-width:560px){.tabs{width:100%;overflow-x:auto}.cs-now{padding:14px 12px}.cs-in{padding-left:0}.cs-cnt{display:none}.cs-ch>summary{grid-template-columns:22px 1fr}}")

SC_CSS += (".cs-addbtn{border-style:dashed!important;color:var(--accent)!important}"
           ".cs-add{border:1px solid var(--rule);border-radius:12px;background:var(--surface);padding:12px 14px;margin:0 0 14px}"
           ".cs-addf{display:flex;gap:8px}.cs-addf input{flex:1;min-width:0;font:inherit;font-size:.9rem;padding:9px 11px;border:1px solid var(--rule);border-radius:9px;background:var(--bg);color:var(--fg)}"
           ".cs-sub{font-size:.74rem;color:var(--faint);margin:12px 0 6px}"
           ".cs-lpick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 14px}.cs-lpick label{font-size:.78rem;color:var(--faint)}"
           ".cs-lpick select{flex:1;min-width:0;max-width:100%;font:inherit;font-size:.9rem;padding:9px 10px;border:1px solid var(--accent);border-radius:10px;background:var(--surface);color:var(--fg)}"
           ".cs-req{font-size:.82rem;margin:0 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cs-req span{color:var(--faint)}.cs-req.ok{color:var(--accent)}.cs-req.bad{color:#c0563b}.cs-x{padding:2px 8px}")

emit("shortcuts", "맥 단축키 핸드북", "맥 단축키", ("#f8f9fa", "#181a1f"),
     "--g-bg:var(--bg);--g-fg:var(--fg);--g-mut:var(--dim);--g-card:var(--surface);--g-line:var(--rule);--g-acc:var(--accent);--g-acc-ink:var(--bg);--g-warn:var(--accent);--g-ok:var(--ok)",
     '<link rel="apple-touch-icon" href="sc-icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="sc-icon-192.png">\n<link rel="icon" type="image/png" sizes="64x64" href="sc-icon-64.png">',
     '{key: "shortcuts", name: "맥 단축키", icon: "sc-icon-192.png", sub: "볼트 위키와 같이 늘 최신인 단축키", colls: ["sc.data", "sc.marks", "additions", "requests", "sc.creq"]}',
     '{"id":"/brainy-today/shortcuts/","name":"맥 단축키 핸드북","short_name":"맥 단축키","start_url":"./","scope":"./","display":"standalone","background_color":"#121317","theme_color":"#181a1f","icons":[{"src":"sc-icon-192.png","sizes":"192x192","type":"image/png"},{"src":"sc-icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}', SC_CSS, BRAINY_CHAT)

# ═════════════════════════ 체화 단어장 ═════════════════════════
load("vocab.html")
# 용어는 볼트 위키 「영상 편집 용어 사전」 표, 외국어는 「영어 단어장」「영어·중국어 회화장」 표 → 맥 동기화(app_data.py) → vo.data/main.
# 코드 안 목록은 처음 뜰 때만 쓰고, 볼트가 바뀌면 몇 초 안에 바뀐다. 학습 단계(progress)는 단어 id 로 이어진다.
patch("const DATA = ", "let DATA = ")
patch("const FOREIGN = [", "let FOREIGN = [")
patch("const ALL = DATA.terms", "let ALL = DATA.terms")
patch("const BYID = Object.fromEntries", "let BYID = Object.fromEntries")
patch('''  db.collection("ctx").onSnapshot(snap => {''', '''  db.doc("vo.data/main").onSnapshot(s => {
    const v = s.exists ? s.data() : null;
    if (!v || !Array.isArray(v.terms) || !v.terms.length) return;
    DATA = { terms: v.terms, pairs: Array.isArray(v.pairs) ? v.pairs : DATA.pairs };
    FOREIGN = Array.isArray(v.foreign) ? v.foreign : FOREIGN;
    ALL = DATA.terms.concat(FOREIGN).map(t => ({ ...t, dom: domOf(t.cat) }));
    BYID = Object.fromEntries(ALL.map(t => [t.id, t]));
    TERMS = ALL.filter(t => t.dom === S.domain);
    CATS = DOMAINS[S.domain].filter(c => TERMS.some(t => t.cat === c));
    if (S.queue) S.queue = S.queue.filter(id => BYID[id]);
    render();
  }, () => {});
  db.collection("ctx").onSnapshot(snap => {''')
patch("기록 저장소에 연결되지 않아 이 기기에만 저장돼요. claude.ai에서 열면 모든 기기에서 이어져요.",
      "기록 저장소에 연결되지 않아 이 기기에만 저장돼요. 인터넷을 확인하고 새로고침해 주세요.")
patch("/memory-check로 단어를 넣으면 다음 업데이트 때 여기에도 들어와요.",
      "/memory-check로 단어를 넣으면 몇 초 안에 여기에도 들어와요 (맥이 켜져 있을 때).")
# 10분 복습(간격 반복) — 첫 화면. 카드 내용(ctx)은 맥이 미리 만들어 둔다(card_gen.py), 영어 결과는 볼트 표로(app_data.py)
patch('''      <a href="#home" data-v="home">홈</a>''', '''      <a href="#review" data-v="review">복습</a>
      <a href="#home" data-v="home">홈</a>''')
patch('''const view = () => (location.hash || "#home").slice(1);''', '''const view = () => (location.hash || "#review").slice(1);''')
patch('''main.innerHTML = v === "learn" ? renderLearn()''', '''main.innerHTML = v === "review" ? renderReview() : v === "learn" ? renderLearn()''')
patch('''if (dm) { setDomain(dm.dataset.dom); location.hash = "home"; render(); return; }''', '''if (dm) { setDomain(dm.dataset.dom); if (view() !== "review") location.hash = "review"; render(); return; }''')
patch("\ninit();\n", "\n" + (root / "src" / "vocab-review.js").read_text(encoding="utf-8") + "\ninit();\n")
# 강의 — 강의(챕터)별 용어 정리 (2026-11-07 동욱: "강의별 용어정리도 단축키처럼"). 볼트 「강의 용어.json」 → vo.data/lec, 표시 → vo.marks/lec
patch('''      <a href="#review" data-v="review">복습</a>''', '''      <a href="#review" data-v="review">복습</a>
      <a href="#lec" data-v="lec">강의</a>
      <a href="#field" data-v="field">분야</a>''')
# 설명하기는 뺀다 (2026-11-07 동욱: "설명하기는 굳이 필요 없을 것 같아") — ③ 소화는 복습에서 2주 넘게 떠올리면
patch('''      <a href="#talk" data-v="talk">설명하기</a>\n''', "")
patch('''<button class="btn" data-go="talk" data-id="${t.id}">설명하기</button>''', "")
patch('''장면이 그려진 단어는 설명하기에서 내 말로 풀어 보세요.''', '''장면이 그려진 단어는 복습에서 이어 가요.''')
patch(" 설명하기는 그 단어로 영어 문장을 만드는 연습이에요.", "")
patch("설명하기를 통과한 체화할 단어가 여기 올라와요.", "복습에서 2주 넘게 떠올린(③ 소화) 체화할 단어가 여기 올라와요.")
patch("체화할 단어를 설명하기에서 통과하면 여기 나타나요.", "체화할 단어를 복습에서 2주 넘게 떠올리면(③ 소화) 여기 나타나요.")
patch('''"이 분야는 모두 소화 이상이에요. 설명하기나 실행하기로 가 보세요."''', '''"이 분야는 모두 소화 이상이에요. 실행하기로 가 보세요."''')
patch('''<a class="btn primary" href="#talk" style="text-align:center;text-decoration:none">설명하기로</a>''', '''<a class="btn primary" href="#review" style="text-align:center;text-decoration:none">복습으로</a>''')
patch('''main.innerHTML = v === "review" ? renderReview() :''', '''main.innerHTML = v === "lec" ? renderLec() : v === "field" ? renderField() : v === "review" ? renderReview() :''')
patch("\ninit();\n", "\n" + (root / "src" / "vocab-lec.js").read_text(encoding="utf-8") + "\ninit();\n")
patch('''  db.collection("ctx").onSnapshot(snap => {''', '''  db.doc("vo.data/lec").onSnapshot(s => { const v = s.exists ? s.data() : null; if (v && Array.isArray(v.courses)) { LEC = v; lsPut("vo.lec", v); if (view() === "lec") render(); } }, () => {});
  db.doc("vo.marks/lec").onSnapshot(s => { const v = s.exists ? s.data() : null; if (v) { LM = { ...v, ok: v.ok || {}, fav: v.fav || {}, pk: v.pk || {} }; lsPut("vo.lecm", LM); if (view() === "lec") render(); } }, () => {});
  db.collection("ctx").onSnapshot(snap => {''')
patch("</style>\n\n<div class=\"wrap\">", """.lc-pick{margin:4px 0 12px}.lc-pick .chip b{font-family:var(--f-mono);font-size:11px;color:var(--accent)}.lc-pick .chip.on b{color:inherit}.chips .chip span{font-family:var(--f-mono);font-weight:500;font-size:11px;opacity:.75;margin-left:3px}
.lc-sel{display:flex;gap:8px;align-items:center;margin:0 0 10px}.lc-sel label{font-size:13px;color:var(--muted)}
.lc-sel select{flex:1;min-width:0;font:inherit;font-size:15px;padding:10px 11px;border:1px solid var(--accent);border-radius:10px;background:var(--surface);color:var(--ink)}
.lc-card{margin-bottom:12px;padding:14px 16px}.lc-card h3{margin:2px 0 6px;font-size:16px}
.lc-h{all:unset;cursor:pointer;display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%}
.lc-part{font-family:var(--f-mono);font-size:12px;color:var(--muted);margin:18px 2px 6px}
.lc-nav{display:flex;justify-content:space-between;gap:8px;margin:4px 0 16px}
.lt{display:flex;gap:10px;padding:11px 0;border-top:1px solid var(--line)}.lt:first-of-type{border-top:0}.lt.ok .lt-m{opacity:.5}
.lt-m{all:unset;cursor:pointer;flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.lt-h b{font-weight:700;font-size:15px}.lt-h small{margin-left:6px;color:var(--muted);font-size:12px}.lt-h .pill{margin-left:6px;font-size:11px}
.lt-d{font-size:14px;line-height:1.5}.lt-ex{font-size:13px;color:var(--muted)}.lt-src{font-family:var(--f-mono);font-size:11px;color:var(--muted)}.lt-go{font-size:12px;color:var(--accent);font-weight:600}
.lc-card .meta{gap:8px}.lc-study{padding:8px 14px;font-size:14px}
.lc-bar{height:4px;border-radius:2px;background:var(--line);margin:0 0 12px;overflow:hidden}.lc-bar i{display:block;height:100%;background:var(--accent)}
.lc-flash{cursor:pointer;min-height:180px}.lc-gr{margin-top:12px}.lc-gr .btn{flex:1}
.lt-mk{display:flex;gap:6px;align-items:flex-start}.lt-mk .mk{width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font-size:15px;cursor:pointer}
.lt-mk .mk.ok[aria-pressed=true]{background:var(--l4);border-color:var(--l4);color:#fff}.lt-mk .mk.fav[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
</style>

<div class=\"wrap\">""")
patch("<b>/log</b>를 돌리면 Claude가 이 기록을 읽어 위키 「이해도 기록」에 올릴 후보로 보여 드리고, 확인한 것만 반영돼요.",
      "<b>/log</b>를 돌리면 Claude가 이 기록을 읽어 위키 「이해도 기록」에 올릴 후보로 보여 드리고, 확인한 것만 반영돼요. Brainy 대화·태스크 작업실에서 익힌 용어를 실제로 쓰면 ④ 실행으로 저절로 올라가요.")
patch('''<div class="brand"><h1>체화 단어장</h1><small id="sub">위키 연동 단어장</small></div>''',
      '''<div class="brand"><h1>체화 단어장</h1><small id="sub">위키 연동 단어장</small><small class="muted" style="font-size:12px;flex-basis:100%"><a href="../home/" style="color:inherit">← Brainy 홈</a> · <button type="button" data-brainy="out" style="font:inherit;color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer">로그아웃</button></small></div>''')
emit("vocab", "체화 단어장", "단어장", ("#EEF1F0", "#0F1314"),
     "--g-bg:var(--bg);--g-fg:var(--ink);--g-mut:var(--muted);--g-card:var(--surface);--g-line:var(--line);--g-acc:var(--accent);--g-acc-ink:var(--accent-ink);--g-warn:var(--accent);--g-ok:var(--l4)",
     '<link rel="apple-touch-icon" href="vo-icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="vo-icon-192.png">\n<link rel="icon" type="image/png" sizes="64x64" href="vo-icon-64.png">',
     '{key: "vocab", name: "체화 단어장", icon: "vo-icon-192.png", sub: "위키와 단어장 표가 바뀌면 바로 따라오는 단어장", colls: ["vo.data", "vo.marks", "progress", "ctx"]}',
     '{"id":"/brainy-today/vocab/","name":"체화 단어장","short_name":"단어장","start_url":"./","scope":"./","display":"standalone","background_color":"#0F1314","theme_color":"#0F1314","icons":[{"src":"vo-icon-192.png","sizes":"192x192","type":"image/png"},{"src":"vo-icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}', "", BRAINY_CHAT)

# ═════════════════════════ 옛 주소 /brainy-today/ → home/ ═════════════════════════
# 예전엔 Brainy 홈이 맨 위 주소에 있어서 그 앱 범위가 단축키·단어장까지 덮었다 (같은 앱 창으로 열림).
# 이제 세 앱은 home/ · shortcuts/ · vocab/ 로 나란히 서고, 맨 위 주소는 home/ 으로 넘기기만 한다.
redirect = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brainy 홈</title><meta http-equiv="refresh" content="0; url=home/">
<script>location.replace("home/" + location.search + location.hash);</script></head>
<body style="font-family:-apple-system,sans-serif;padding:24px">
<p><a href="home/">Brainy 홈</a> · <a href="shortcuts/">맥 단축키</a> · <a href="vocab/">체화 단어장</a></p></body></html>
"""
(root / "index.html").write_text(redirect, encoding="utf-8")
# 열려 있던 옛 화면이 version.txt 를 보고 스스로 새로 고치면 → 이 넘김 페이지 → home/
(root / "version.txt").write_text(hashlib.sha1(redirect.encode()).hexdigest()[:10] + "\n", encoding="utf-8")
print("index.html → home/ 넘김")
