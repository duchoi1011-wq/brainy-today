# Brainy 홈 저장소

세 앱(Brainy 홈 · 맥 단축키 · 체화 단어장)의 웹앱 저장소. 공개 저장소다 — 실명·연락처·키·볼트 노트 내용은 넣지 않는다 (원본에도 "동욱" 으로만).

## 구조 — 어디를 고치나

- **화면 원본은 `src/` 가 그대로 앱이다.** `src/brainy-home.html` · `src/shortcuts.html` · `src/vocab.html`. 역할별로 나눈 파일(`home-ic.js` · `home-today.js` · `sc-course.js` · `vocab-review.js` · `vocab-lec.js`)은 원본의 `/*@include 파일*/` 자리에 끼워진다. 앱마다 Brainy 연결(`sc-brainy.js` · `vo-brainy.js`)과 대화창(`brainy-chat.js`)은 빌드가 뒤에 붙인다.
- **`build.py` 는 조립만 한다** — 원본에 머리말(로그인 화면·받침 `shim.js`·아이콘)을 붙여 `home/` `shortcuts/` `vocab/` 의 `index.html` 을 만든다. 이 세 폴더는 손으로 고치지 않는다.
- **덧대기(`patch()`) 0개가 기준이다** (2026-11-12 109+27+3개를 원본에 합침). 고칠 땐 원본을 직접 고친다. `patch()` 를 쓰면 빌드 끝에 경고가 뜬다.
- **내용은 볼트가 정본이다 — 코드에 목록을 넣지 않는다.**
  - 맥 단축키 목록·묶음·작업 모드: 볼트 `4_Outputs/단축키 앱/단축키 데이터.json` → Supabase `sc.data/main`. 강의: `강의 순서.json` → `sc.data/course`.
  - 체화 단어장 용어·외국어: 볼트 위키 표 → `vo.data/main`. 강의 용어: `4_Outputs/체화 단어장/강의 용어.json` → `vo.data/lec`.
  - 맥의 동기화(볼트 `.claude/scripts/app_data.py`)가 몇 초 안에 올린다. 「앱 고치기」(GitHub)처럼 볼트에 손이 안 닿으면 코드에 내용을 박지 말고 요약에 「볼트에도 반영할 것: …」을 적는다.
  - 맥 단축키의 클로드 코드 목록은 앱을 점검·고칠 때마다 지금 클로드 코드와 맞춘다 — 볼트 데이터와 위키 「맥 핵심 단축키」 5-1의 「클로드 코드 최신화 날짜」를 같이 고친다 (2026-11-09 동욱).
- 표시·진도·기록은 Supabase `docs` 표 (로그인한 주인만, RLS). 표 구조·RLS·`supabase/`·`.github/` 는 부탁 없이 바꾸지 않는다.

## 순서

1. 시작: `git pull` — 앱 안 「앱 고치기」가 GitHub Actions(`.github/workflows/brainy-edit.yml`)로 먼저 올렸을 수 있다.
2. 끝: `python3 build.py` → `python3 .github/check_apps.py` → 실제 화면(데스크톱·폰 너비)에서 확인.
3. Brainy 대화는 Supabase Edge Function `supabase/functions/brainy-ai` 가 답하고, 못 하면 맥(볼트 `.claude/scripts/ai_runner.py`)으로 넘긴다. 함수를 고치면 Supabase 에 다시 배포한다.
4. 비밀값: Supabase `ANTHROPIC_API_KEY`·`BRAINY_GITHUB_TOKEN`, GitHub Actions `ANTHROPIC_API_KEY`. 값은 어디에도 적지 않는다.
