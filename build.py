#!/usr/bin/env python3
"""src/brainy-home.html (claude.ai artifact 원본) → index.html (Supabase 로 도는 독립 웹앱).
원본 화면 코드는 그대로 두고, 아래 PATCH 만 끼운다. 원본이 바뀌면 src 를 갈아 끼우고 다시 돌린다."""
import pathlib, sys
root = pathlib.Path(__file__).parent
src = (root / "src" / "brainy-home.html").read_text(encoding="utf-8")
lines = src.split("\n")
assert lines[0].startswith("<!doctype html>") and lines[1].startswith("<title>"), "원본 모양이 달라요"
end = max(i for i, l in enumerate(lines) if l.strip() == "</script>")
body = "\n".join(lines[2:end + 1])   # <meta claude:…> 부터 앱 스크립트 끝까지

def patch(a, b, n=1):
    global body
    c = body.count(a)
    if c != n:
        sys.exit(f"패치 자리 {c}곳 (기대 {n}): {a[:70]}")
    body = body.replace(a, b)

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
      '''" 기준 · 쓴 건 몇 초 안에 볼트로 들어가요" : "Brainy 홈") + ' · <button class="more" data-brainy="out" style="display:inline">로그아웃</button></p>';''')
patch('''h += '<p class="notice">이 화면에서는 Claude에게 물을 수 없어요. Claude 앱이나 claude.ai에서 열어 주세요.</p>';''',
      '''h += '<p class="notice">Brainy와 대화하기는 아직 이 앱에 없어요. 지금은 claude.ai의 Brainy 홈에서 할 수 있어요.</p><a class="btn" href="' + window.BRAINY.oldApp + '" target="_blank" rel="noopener">claude.ai Brainy 홈 열기</a>';''')

head = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Brainy 홈">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef0ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#101513" media="(prefers-color-scheme: dark)">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<title>Brainy 홈</title>
<style>
:root{box-sizing:border-box}html{scroll-padding-top:env(safe-area-inset-top,0px)}
body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}
.app{padding-top:calc(20px + env(safe-area-inset-top,0px))!important}
/* 폰: 입력칸 글자가 16px보다 작으면 아이폰이 칸을 누를 때 화면을 확대해 버린다 → 왼쪽이 잘리고 아래 탭이 밀림 */
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
html,body{max-width:100%;overflow-x:clip}
@media (pointer:coarse){input,textarea,select{font-size:16px!important}}
#gate{position:fixed;inset:0;z-index:50;background:var(--bg);display:grid;place-items:center;padding:24px}
#gate .gbox{width:100%;max-width:340px;display:grid;gap:10px;justify-items:stretch}
#gate img{border-radius:14px;justify-self:start}
#gate h1{font-size:24px}#gate .gsub{color:var(--muted);margin-bottom:8px}
#gate label{font-size:13px;color:var(--muted);margin-top:4px}
#gate input{font:inherit;font-size:16px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 12px;width:100%}
#gate .btn{justify-content:center;margin-top:8px;padding:11px 14px}
#gate .gerr{color:var(--warn);font-size:13px;min-height:18px}
#rtdot{position:fixed;z-index:11;top:calc(8px + env(safe-area-inset-top,0px));right:10px;width:7px;height:7px;border-radius:50%;background:var(--line)}
#rtdot.on{background:var(--good)}#rtdot.off{background:var(--warn)}
</style>
</head>
<body>
<span id="rtdot" aria-hidden="true"></span>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="shim.js"></script>
<script>document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-brainy=out]"); if (b && confirm("로그아웃할까요?")) window.BRAINY.signOut(); });</script>
'''
body = body  # 공개 저장소에 올라가는 코드 — 실명은 원본에도 넣지 않는다
(root / "index.html").write_text(head + body + "\n</body>\n</html>\n", encoding="utf-8")
print("index.html", len(head + body) // 1024, "KB")
