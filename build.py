#!/usr/bin/env python3
"""src/ 의 원본 → Supabase 로 도는 독립 웹앱 3개 (조립만 한다).

  src/brainy-home.html → home/index.html       (Brainy 홈)
  src/shortcuts.html   → shortcuts/index.html  (맥 단축키)
  src/vocab.html       → vocab/index.html      (체화 단어장)

원본이 그대로 앱이다 — 여기선 머리말(로그인 화면·받침 shim.js·아이콘)을 붙이고 /*@include 파일*/ 자리에 src/ 의 파일을 끼울 뿐이다.
patch() 덧대기는 0개가 기준 (2026-11-12 모두 원본에 합침). 세 앱은 같은 주소(github.io) 아래라 한 번 로그인하면 셋 다 열린다.
"""
import hashlib
import re
import pathlib
import sys

root = pathlib.Path(__file__).parent
SHIM = (root / "shim.js").read_text(encoding="utf-8")
body = ""
CUR = None
PATCH_N = {}   # 앱마다 덧대기(patch) 수 — 0 이 기준


def load(name):
    global body, CUR
    CUR = name
    lines = (root / "src" / name).read_text(encoding="utf-8").split("\n")
    assert lines[0].startswith("<!doctype html>") and lines[1].startswith("<title>"), name + " 원본 모양이 달라요"
    end = max(i for i, l in enumerate(lines) if l.strip() == "</script>")
    body = "\n".join(lines[2:end + 1])   # <meta claude:…> 부터 앱 스크립트 끝까지


def patch(a, b, n=1):
    global body
    PATCH_N[CUR] = PATCH_N.get(CUR, 0) + 1
    c = body.count(a)
    if c != n:
        sys.exit(f"패치 자리 {c}곳 (기대 {n}): {a[:70]}")
    body = body.replace(a, b)


def patch_between(a, z, b):
    """a 로 시작해 그 뒤 처음 나오는 z 로 끝나는 덩어리를 b 로 바꾼다 (a 는 한 곳뿐이어야)."""
    global body
    PATCH_N[CUR] = PATCH_N.get(CUR, 0) + 1
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
/* 새로고침 버튼 (세 앱 공통, shim.js) — 오른쪽 위 작은 알약: 실시간 점 · ↻ · 마지막 동기화/반영 상태 */
#bsync{{position:fixed;z-index:11;top:calc(8px + env(safe-area-inset-top,0px));right:max(10px,env(safe-area-inset-right,0px));display:inline-flex;align-items:center;gap:6px;max-width:min(62vw,240px);height:30px;padding:0 11px 0 9px;border-radius:999px;border:1px solid var(--g-line);background:var(--g-card);color:var(--g-mut);font:inherit;font-size:12px;font-weight:600;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent}}
#bsync:hover{{color:var(--g-fg)}}#bsync:focus-visible{{outline:2px solid var(--g-acc);outline-offset:2px}}
#bsync .bs-tx{{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}}
#bsync .bs-ic{{font-size:14px;color:var(--g-acc)}}
#bsync.busy{{color:var(--g-fg);border-color:var(--g-acc)}}#bsync.busy .bs-ic{{animation:bsspin 1s linear infinite}}
#bsync.macoff{{border-style:dashed}}
@keyframes bsspin{{to{{transform:rotate(360deg)}}}}
@media (prefers-reduced-motion:reduce){{#bsync.busy .bs-ic{{animation:none}}}}
#rtdot{{flex:none;width:7px;height:7px;border-radius:50%;background:var(--g-line)}}
#rtdot.on{{background:var(--g-ok)}}#rtdot.off{{background:var(--g-warn)}}
#bsync-tip{{position:fixed;z-index:11;top:calc(44px + env(safe-area-inset-top,0px));right:max(10px,env(safe-area-inset-right,0px));max-width:min(86vw,340px);padding:8px 12px;border-radius:12px;border:1px solid var(--g-line);background:var(--g-card);color:var(--g-fg);font-size:13px;line-height:1.45;box-shadow:0 4px 14px rgba(0,0,0,.12)}}
header>.brand{{padding-right:min(46vw,190px)}}
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

def include():
    """원본의 /*@include 파일*/ 자리에 src/ 의 그 파일을 끼운다 (화면 코드를 역할별 파일로 나눠 둔 것)."""
    global body
    def rep(m):
        return (root / "src" / m.group(1)).read_text(encoding="utf-8")
    body = re.sub(r"/\*@include ([\w.-]+)\*/", rep, body)


# ═════════════════════════ Brainy 홈 ═════════════════════════
# 화면은 src/brainy-home.html 이 그대로 원본이다 (2026-11-12 덧대기 109개를 원본에 합침). 고칠 땐 원본을 직접 고친다.
load("brainy-home.html")
include()
emit("home", "Brainy 홈", "Brainy 홈", ("#eef0ec", "#101513"),
     "--g-bg:var(--bg);--g-fg:var(--ink);--g-mut:var(--muted);--g-card:var(--surface);--g-line:var(--line);--g-acc:var(--accent);--g-acc-ink:var(--accent-ink);--g-warn:var(--warn);--g-ok:var(--good)",
     '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-180.png">',
     '{key: "home", name: "Brainy 홈", icon: "icon.svg", sub: "볼트와 바로 이어지는 내 하루"}',
     '{"id":"/brainy-today/home/","name":"Brainy 홈","short_name":"Brainy 홈","start_url":"./","scope":"./","display":"standalone","background_color":"#eef0ec","theme_color":"#1f5e52","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"},{"src":"icon.svg","sizes":"any","type":"image/svg+xml"}]}',
     ".app{padding-top:calc(48px + env(safe-area-inset-top,0px))!important}.plan{display:grid;gap:6px;margin:6px 0 8px}.plh{margin:8px 0 0}.planrow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:var(--ink);background:var(--sunk);border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer}.planrow .ptx{flex:1;min-width:0;line-height:1.45}.planrow .pbox{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--muted);font-size:13px;font-weight:700}.planrow.on .pbox{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}.planrow.on .ptx{color:var(--muted);text-decoration:line-through}")

# Brainy 대화창 — 맥 단축키·체화 단어장 안에서 묻기·이 앱 고쳐 달라기 (클라우드 Brainy 의 app_edit_* 도구)
BRAINY_CHAT = "\n" + (root / "src" / "brainy-chat.js").read_text(encoding="utf-8")
# 앱마다 Brainy 연결 — 지금 앱 상태(ctx)와 앱 도구(✓★·강의 진도 / 단어 단계·화면 열기)
SC_BRAINY = "\n" + (root / "src" / "sc-brainy.js").read_text(encoding="utf-8")
VO_BRAINY = "\n" + (root / "src" / "vo-brainy.js").read_text(encoding="utf-8")

# ═════════════════════════ 맥 단축키 ═════════════════════════
load("shortcuts.html")
include()
SC_CSS = ""
emit("shortcuts", "맥 단축키 핸드북", "맥 단축키", ("#f8f9fa", "#181a1f"),
     "--g-bg:var(--bg);--g-fg:var(--fg);--g-mut:var(--dim);--g-card:var(--surface);--g-line:var(--rule);--g-acc:var(--accent);--g-acc-ink:var(--bg);--g-warn:var(--accent);--g-ok:var(--ok)",
     '<link rel="apple-touch-icon" href="sc-icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="sc-icon-192.png">\n<link rel="icon" type="image/png" sizes="64x64" href="sc-icon-64.png">',
     '{key: "shortcuts", name: "맥 단축키", icon: "sc-icon-192.png", sub: "볼트 위키와 같이 늘 최신인 단축키", colls: ["sc.data", "sc.marks", "additions", "requests", "sc.creq"]}',
     '{"id":"/brainy-today/shortcuts/","name":"맥 단축키 핸드북","short_name":"맥 단축키","start_url":"./","scope":"./","display":"standalone","background_color":"#121317","theme_color":"#181a1f","icons":[{"src":"sc-icon-192.png","sizes":"192x192","type":"image/png"},{"src":"sc-icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}', SC_CSS, SC_BRAINY + BRAINY_CHAT)

# ═════════════════════════ 체화 단어장 ═════════════════════════
load("vocab.html")
include()
emit("vocab", "체화 단어장", "단어장", ("#EEF1F0", "#0F1314"),
     "--g-bg:var(--bg);--g-fg:var(--ink);--g-mut:var(--muted);--g-card:var(--surface);--g-line:var(--line);--g-acc:var(--accent);--g-acc-ink:var(--accent-ink);--g-warn:var(--accent);--g-ok:var(--l4)",
     '<link rel="apple-touch-icon" href="vo-icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="vo-icon-192.png">\n<link rel="icon" type="image/png" sizes="64x64" href="vo-icon-64.png">',
     '{key: "vocab", name: "체화 단어장", icon: "vo-icon-192.png", sub: "위키와 단어장 표가 바뀌면 바로 따라오는 단어장", colls: ["vo.data", "vo.marks", "progress", "ctx"]}',
     '{"id":"/brainy-today/vocab/","name":"체화 단어장","short_name":"단어장","start_url":"./","scope":"./","display":"standalone","background_color":"#0F1314","theme_color":"#0F1314","icons":[{"src":"vo-icon-192.png","sizes":"192x192","type":"image/png"},{"src":"vo-icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}', "", VO_BRAINY + BRAINY_CHAT)

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

# ═════════════════════════ 덧대기 알림 ═════════════════════════
# 2026-11-12 덧대기를 모두 원본(src)에 합쳤다 — 이제 0개가 기준. patch() 를 쓰면 빌드 끝에 알려 준다 (멈추진 않는다).
if PATCH_N:
    print("⚠ 덧대기 " + ", ".join(f"{k} {v}개" for k, v in PATCH_N.items()) + " — 원본(src)에 직접 합칠 수 있는지 먼저 보세요")
