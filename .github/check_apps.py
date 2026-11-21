#!/usr/bin/env python3
"""빌드된 네 앱(home·shortcuts·vocab·content)과 shim.js 의 자바스크립트 문법을 node --check 로 검사한다.

  python3 .github/check_apps.py      # 문제 없으면 0, 있으면 1

앱 고치기(GitHub Actions)가 고친 판을 올리기 전에 돌린다. 문법이 깨진 판이 main 으로 가지 않게.
"""
import pathlib
import re
import subprocess
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S | re.I)


def check(label, code):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code)
    p = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
    pathlib.Path(f.name).unlink()
    if p.returncode:
        print(f"✗ {label}\n{(p.stderr or p.stdout)[-800:]}")
        return False
    return True


ok = check("shim.js", (root / "shim.js").read_text(encoding="utf-8"))
for app in ("home", "shortcuts", "vocab", "../content-plan"):   # 콘텐츠 기획은 옆 저장소 content-plan 에 조립된다 (없으면 건너뜀)
    if not (root / app / "index.html").exists():
        # 조립본이 없으면(GitHub Actions 에는 옆 저장소가 없다) 원본을 그 자리에서 끼워 맞춰 본다 — 콘텐츠 기획만 검사 없이 올라가지 않게
        src = (root / "src" / "content.html").read_text(encoding="utf-8")
        src = re.sub(r"/\*@include ([\w.-]+)\*/", lambda m: (root / "src" / m.group(1)).read_text(encoding="utf-8"), src)
        for i, code in enumerate(SCRIPT.findall(src), 1):
            ok = check(f"src/content.html (+content-*.js) 스크립트 {i}", code) and ok
        for tail in ("content-brainy.js", "brainy-chat.js"):
            for i, code in enumerate(SCRIPT.findall((root / "src" / tail).read_text(encoding="utf-8")), 1):
                ok = check(f"src/{tail} 스크립트 {i}", code) and ok
        print(f"- {app} 조립본 없음 — 원본으로 검사")
        continue
    html = (root / app / "index.html").read_text(encoding="utf-8")
    blocks = SCRIPT.findall(html)
    if not blocks:
        print(f"✗ {app}/index.html: 스크립트가 없어요")
        ok = False
    for i, code in enumerate(blocks, 1):
        ok = check(f"{app}/index.html 스크립트 {i}", code) and ok
print("✓ 네 앱 문법 이상 없음" if ok else "문법 오류가 있어요")
sys.exit(0 if ok else 1)
