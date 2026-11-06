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


def emit(out_dir, title, short, theme, gate_vars, icons, app, manifest, css=""):
    """head 를 붙여 out_dir/index.html 을 쓴다. 판 번호(version.txt)는 화면·받침 코드가 바뀌면 달라진다 —
    앱은 볼 때마다 version.txt 와 견주어 새 판이면 스스로 새로 고친다."""
    global body
    d = root / out_dir
    d.mkdir(exist_ok=True)
    up = "" if out_dir == "." else "../"
    page = HEAD.format(title=title, short=short, theme_light=theme[0], theme_dark=theme[1], icons=icons,
                       gate_vars=gate_vars, css=css, app=app, up=up)
    b = body  # 공개 저장소에 올라가는 코드 — 실명은 원본에도 넣지 않는다
    page = page + b + "\n</body>\n</html>\n"
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
      '''" 기준 · 쓴 건 몇 초 안에 볼트로 들어가요" : "Brainy 홈") + ' · <a class="more" href="shortcuts/" style="display:inline">맥 단축키</a> · <a class="more" href="vocab/" style="display:inline">체화 단어장</a> · <button class="more" data-brainy="out" style="display:inline">로그아웃</button></p>';''')
patch('''h += '<p class="notice">이 화면에서는 Claude에게 물을 수 없어요. Claude 앱이나 claude.ai에서 열어 주세요.</p>';''',
      '''h += '<p class="notice">지금은 Brainy와 대화할 수 없어요. 새로고침해 보고, 그래도 안 되면 맥이 켜져 있는지 확인해 주세요.</p>';''')
# 위키 탭의 '단어장에서 학습하기' → 새 체화 단어장 (같은 주소 아래)
patch('''href="' + esc(v.url) + '" target="_blank" rel="noopener"''', '''href="vocab/"''', 2)

# 4) Brainy 대화·태스크 작업실 — 이제 맥의 Claude(볼트를 열어 둔 채)가 답한다 (shim.js sample → ai_runner.py)
#    읽기 도구(get_project 등)는 맥 Claude 가 볼트를 직접 읽는 걸로 대신하고, 볼트 반영도 시키면 바로 한다 (2026-11-06 동욱)
patch('''" 프로젝트·태스크·카드 세부는 get_project, 위키는 search_wiki, 메모는 get_recent_notes, 다른 날 기록은 get_day를 먼저 불러 확인한다."''',
      '''" 데이터에 없는 세부(프로젝트 허브·태스크 노트·카드·위키·다른 날 기록·메모)는 볼트 파일을 직접 읽어 확인한다."''')
patch('''"3. 옵시디언 볼트·Todoist·캘린더에 반영할 일(결산, 🗳 결산 대기 답, 아침 계획 응, 태스크 고치기, /log 등)은 동욱이 분명히 시키면 run_command로 맥의 Brainy에게 보낸다. 직접 쓰는 척하지 않는다. 🗳 결산 대기 목록은 데이터의 '결산 대기'에 있다."''',
      '''"3. 동욱이 분명히 시키면 볼트에 바로 반영한다. 태스크 고치기(기한·상태·완료 기준)·노트에 넣기처럼 금방 끝나는 건 네가 직접 고치고 어디를 고쳤는지 한 줄로 알린다. 결산·🗳 결산 대기 답·아침 계획 응·/log처럼 오래 걸리거나 캘린더가 필요한 일은 run_command로 맥의 Brainy에게 보낸다(몇 분 뒤 기록 탭 '명령'에 결과). 🗳 결산 대기 목록은 데이터의 '결산 대기'에 있다."''')
patch('''"5. 볼트(옵시디언)는 여기서 직접 바꾸지 않는다. 체크·로그·산출물은 앱에 저장되고 1~2분 안에 맥의 Brainy가 태스크 노트로 자동 반영한다.",''',
      '''"5. 체크·로그·산출물·다음 한 걸음은 도구로 앱에 저장하면 잠시 뒤 맥의 Brainy가 태스크 노트로 자동 반영한다. 동욱이 기한·상태·완료 기준 문구·본문처럼 도구로 안 되는 걸 고치라고 분명히 시키면, 태스크 노트(3_Action/32_태스크/T-<태스크 이름>.md)를 action-update 규칙대로 직접 고치고 무엇을 고쳤는지 한 줄로 알린다.",''')
patch("생각하는 중… (처음 한 번은 Claude 사용 허락을 물어요)", "맥의 Brainy가 생각하는 중… (보통 5~15초)", 2)
patch('''autoSync("tw:" + title, "태스크 기록 반영: " + title + " (자동 — 작업실 체크·로그·산출물)", 90000);''',
      '''autoSync("tw:" + title, "태스크 기록 반영: " + title + " (자동 — 작업실 체크·로그·산출물)", 15000);''')

emit(".", "Brainy 홈", "Brainy 홈", ("#eef0ec", "#101513"),
     "--g-bg:var(--bg);--g-fg:var(--ink);--g-mut:var(--muted);--g-card:var(--surface);--g-line:var(--line);--g-acc:var(--accent);--g-acc-ink:var(--accent-ink);--g-warn:var(--warn);--g-ok:var(--good)",
     '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-180.png">',
     '{key: "home", name: "Brainy 홈", icon: "icon.svg", sub: "볼트와 바로 이어지는 내 하루"}',
     '{"name":"Brainy 홈","short_name":"Brainy 홈","start_url":"./","scope":"./","display":"standalone","background_color":"#eef0ec","theme_color":"#1f5e52","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"},{"src":"icon.svg","sizes":"any","type":"image/svg+xml"}]}',
     ".app{padding-top:calc(20px + env(safe-area-inset-top,0px))!important}")

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
      STARTER = D.filter(function(x){ return x.starter });
      repaint(); renderBoard();
      if(current==="fav") renderList("fav"); if(current==="pass") renderList("pass");
    }, function(){});
    DB.doc("sc.marks/main").onSnapshot(function(s){
      var v = s.exists ? s.data() : null;
      if(v && v.marks){ marks = v.marks; save("mk.marks", marks); repaint(); if(current==="fav") renderList("fav"); if(current==="pass") renderList("pass"); }
      else if(Object.keys(marks).length){ DB.doc("sc.marks/main").set({ marks: marks, updatedAt: new Date().toISOString() }).catch(function(){}); }
    }, function(){});
''')
patch('''    if(marks[id]===kind) delete marks[id]; else marks[id]=kind;
    save("mk.marks", marks);''', '''    if(marks[id]===kind) delete marks[id]; else marks[id]=kind;
    save("mk.marks", marks);
    if(DB) DB.doc("sc.marks/main").set({ marks: marks, updatedAt: new Date().toISOString() }).catch(function(){});''')
patch('statusMsg("찾는 중… (처음 한 번은 허용할지 묻는다)");', 'statusMsg("맥의 Brainy가 찾는 중… (보통 10~20초)");')
patch('''<p>볼트 <code>2_LLMWiki/wiki/자기경영/맥 핵심 단축키</code>''',
      '''<p><a href="../" style="color:inherit">← Brainy 홈</a> · <button type="button" data-brainy="out" style="font:inherit;color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer">로그아웃</button></p>
  <p>볼트 <code>2_LLMWiki/wiki/자기경영/맥 핵심 단축키</code>''')
emit("shortcuts", "맥 단축키 핸드북", "맥 단축키", ("#f8f9fa", "#181a1f"),
     "--g-bg:var(--bg);--g-fg:var(--fg);--g-mut:var(--dim);--g-card:var(--surface);--g-line:var(--rule);--g-acc:var(--accent);--g-acc-ink:var(--bg);--g-warn:var(--accent);--g-ok:var(--ok)",
     '<link rel="apple-touch-icon" href="web-icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="web-icon-192.png">\n<link rel="icon" type="image/png" sizes="64x64" href="web-icon-64.png">',
     '{key: "shortcuts", name: "맥 단축키", icon: "web-icon-192.png", sub: "볼트 위키와 같이 늘 최신인 단축키", colls: ["sc.data", "sc.marks", "additions", "requests"]}',
     '{"name":"맥 단축키 핸드북","short_name":"맥 단축키","start_url":"./","scope":"./","display":"standalone","background_color":"#121317","theme_color":"#181a1f","icons":[{"src":"web-icon-192.png","sizes":"192x192","type":"image/png"},{"src":"web-icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}')

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
patch('''<div class="brand"><h1>체화 단어장</h1><small id="sub">위키 연동 단어장</small></div>''',
      '''<div class="brand"><h1>체화 단어장</h1><small id="sub">위키 연동 단어장</small><small class="muted" style="font-size:12px;flex-basis:100%"><a href="../" style="color:inherit">← Brainy 홈</a> · <button type="button" data-brainy="out" style="font:inherit;color:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer">로그아웃</button></small></div>''')
emit("vocab", "체화 단어장", "단어장", ("#EEF1F0", "#0F1314"),
     "--g-bg:var(--bg);--g-fg:var(--ink);--g-mut:var(--muted);--g-card:var(--surface);--g-line:var(--line);--g-acc:var(--accent);--g-acc-ink:var(--accent-ink);--g-warn:var(--accent);--g-ok:var(--l4)",
     '<link rel="apple-touch-icon" href="vocab-icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="vocab-icon-192.png">\n<link rel="icon" type="image/png" sizes="64x64" href="vocab-icon-64.png">',
     '{key: "vocab", name: "체화 단어장", icon: "vocab-icon-192.png", sub: "위키와 단어장 표가 바뀌면 바로 따라오는 단어장", colls: ["vo.data", "progress", "ctx"]}',
     '{"name":"체화 단어장","short_name":"단어장","start_url":"./","scope":"./","display":"standalone","background_color":"#0F1314","theme_color":"#0F1314","icons":[{"src":"vocab-icon-192.png","sizes":"192x192","type":"image/png"},{"src":"vocab-icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}')
