# Brainy 홈 저장소

여섯 앱(Brainy 홈 · 맥 단축키 · 체화 단어장 · 강의 실습 · 광고 실습 · 콘텐츠 기획)의 웹앱 저장소. 공개 저장소다 — 실명·연락처·키·볼트 노트 내용은 넣지 않는다 (원본에도 "동욱" 으로만).

## 구조 — 어디를 고치나

- **화면 원본은 `src/` 가 그대로 앱이다.** `src/brainy-home.html` · `src/shortcuts.html` · `src/vocab.html` · `src/content.html`. 역할별로 나눈 파일(`home-ic.js` · `home-today.js` · `sc-course.js` · `vocab-review.js` · `vocab-lec.js`)은 원본의 `/*@include 파일*/` 자리에 끼워진다. 앱마다 Brainy 연결(`sc-brainy.js` · `vo-brainy.js`)과 대화창(`brainy-chat.js`)은 빌드가 뒤에 붙인다.
- **`build.py` 는 조립만 한다** — 원본에 머리말(로그인 화면·받침 `shim.js`·아이콘)을 붙여 `home/` `shortcuts/` `vocab/` 의 `index.html` 을 만들고, **콘텐츠 기획은 옆 저장소 `../content-plan`(주소 `/content-plan/`, 저장소 duchoi1011-wq/content-plan)에 조립한다** (2026-11-17 동욱: 맥에 설치한 Brainy 홈 앱에 섞여 열려 따로 웹앱으로). 그 저장소도 함께 커밋·푸시한다. `content/` 는 새 주소로 넘기기만 한다. 이 폴더들은 손으로 고치지 않는다.
- **덧대기(`patch()`) 0개가 기준이다** (2026-11-12 109+27+3개를 원본에 합침). 고칠 땐 원본을 직접 고친다. `patch()` 를 쓰면 빌드 끝에 경고가 뜬다.
- **내용은 볼트가 정본이다 — 코드에 목록을 넣지 않는다.**
  - 맥 단축키 목록·묶음·작업 모드: 볼트 `4_Outputs/단축키 앱/단축키 데이터.json` → Supabase `sc.data/main`. 강의: `강의 순서.json` → `sc.data/course`.
  - 체화 단어장 용어·외국어: 볼트 위키 표 → `vo.data/main`. 강의 용어: `4_Outputs/체화 단어장/강의 용어.json` → `vo.data/lec`.
  - 강의 실습(`src/course.html` + `course-now.js` 지금 · `course-map.js` 지도 · `course-detail.js` 칸 자세히 · `course-notes.js` 배운 것 · `course-memo.js` 내 메모 · `course-brainy.js`, 2026-11-24): 볼트 `3_Action/33_카드/C-<강의> 수강·실습 분류.md` · `C-<강의> 실습 학습 노트.md` · 그 지도를 잇는 `32_태스크` → 맥 동기화(`course_app.py`) → `cr.data/main`. 앱이 쓰는 건 `cr.memo/<강의 id>-<칸 번호표>`(칸마다 메모 문서 하나 — 스냅숏이 저장을 부르면 안 됨)뿐 — ✅ 는 앱이 안 바꾼다(course-practice 스킬이 볼트 카드에). 「Brainy와 이 칸 하기」= `BRAINY_CHAT.fill` 로 대화창을 채움, 대화는 맥에서(`where: mac`).
  - 맥의 동기화(볼트 `.claude/scripts/app_data.py`)가 몇 초 안에 올린다. 「앱 고치기」(GitHub)처럼 볼트에 손이 안 닿으면 코드에 내용을 박지 말고 요약에 「볼트에도 반영할 것: …」을 적는다.
  - 맥 단축키의 클로드 코드 목록은 앱을 점검·고칠 때마다 지금 클로드 코드와 맞춘다 — 볼트 데이터와 위키 「맥 핵심 단축키」 5-1의 「클로드 코드 최신화 날짜」를 같이 고친다 (2026-11-09 동욱).
  - 광고 실습(`src/ad.html` → `ad/`, 2026-11-24 claude.ai 아티팩트에서 옮김): 볼트 `4_Outputs/광고 실습 앱/광고 실습 계획.json`(원칙·전략판·주차·용어·숫자 칸 + 태스크 번호·이름) + 그 이름의 `32_태스크` 노트 → 맥 동기화(`ad_app.py`) → `ad.data/main`. 앱이 쓰는 건 `taskwork/ad-<번호>`(status · steps · log)뿐 — 맥의 `task_sync.py` 가 노트 status·체크·로그와 허브·데일리 노트·실행 로그에 넣는다. 상태의 정본은 태스크 노트. 「교과서」 화면(2026-11-27)은 같은 노트의 「## 한눈에·외울 것·더보기·확인 문제」를 요약집처럼 보여 주고(`ad_app.py` 가 `book` 으로 싣는다), 과마다 「Brainy에게 묻기」는 `src/ad-brainy.js`(지금 과 내용을 ctx 로) → 공통 대화창으로 바로 보낸다.
  - 콘텐츠 기획(`src/content.html` + `content-kw.js` 점수·후보 · `content-ref.js` 레퍼런스·채널 · `content-plan.js` 추천·대본·📚 소재와 출처(`소재.json` → `.source`, 「소재 찾기」 = cmd kind source → content-source 스킬) · `content-brandrefs.js` 브랜드 레퍼런스 채널(브랜드 탭 아래 — 2026-11-16 참고 탭은 없앰, 잘된 영상·가져온 구성은 대본에 붙는다) · `content-claude.js` ⚙ Claude 모드(앱 대화 위치·일마다 모델 — 정본 볼트 `Claude 모드.json`, 고른 값 `ct.set/_claude`, 맥 cmd_runner·ai_runner 가 읽음) · `content-mixer.js` 판정 믹서 — 조절값 정의·템플릿은 볼트 `믹서.json` → `ct.data/mixer.def`, 점수 비중을 코드에 적지 않는다): 볼트 `4_Outputs/콘텐츠 기획 앱/<브랜드>/*.json` → `ct.data/<브랜드>[.kw·.trend·.ref·.live·.chan·.rec·.script]`. 앱이 쓰는 것은 `ct.set/<브랜드>`(비율·고정·고른 추천)와 `cmd`(`from: "content"` — 맥의 Claude가 콘텐츠 스킬 셋을 돌림)뿐. 점수 식을 바꾸면 `content-kw.js` 머리말과 화면의 「점수 계산」 글을 같이 고친다.
- 표시·진도·기록은 Supabase `docs` 표 (로그인한 주인만, RLS). 표 구조·RLS·`supabase/`·`.github/` 는 부탁 없이 바꾸지 않는다.

## 검증

- 앱을 고치면 완성이라고 말하기 전에 검증 에이전트 `app-verifier`(~/.claude/agents)를 부른다. 판정 기준은 볼트 `4_Outputs/앱 검증 지침.md`(모든 앱 공통) + 앱별 지침(콘텐츠 기획 = `4_Outputs/콘텐츠 기획 앱/검증 지침.md`). 동욱이 새로 말한 요구는 거기에 먼저 적고 나서 고친다.

## 순서

1. 시작: `git pull` — 앱 안 「앱 고치기」가 GitHub Actions(`.github/workflows/brainy-edit.yml`)로 먼저 올렸을 수 있다.
2. 끝: `python3 build.py` → `python3 .github/check_apps.py` → 실제 화면(데스크톱·폰 너비)에서 확인. **check_apps.py 결과를 `| tail` 로 잘라 `&&` 로 커밋·푸시를 잇지 않는다** — 파이프는 실패를 삼켜 문법 오류 판이 올라간다(2026-11-18 2분간 콘텐츠 기획이 깨진 채 배포). `check_apps.py && git commit …` 처럼 그대로 잇는다.
3. Brainy 대화는 Supabase Edge Function `supabase/functions/brainy-ai` 가 답하고, 못 하면 맥(볼트 `.claude/scripts/ai_runner.py`)으로 넘긴다. 함수를 고치면 Supabase 에 다시 배포한다.
4. 비밀값: Supabase `ANTHROPIC_API_KEY`·`BRAINY_GITHUB_TOKEN`, GitHub Actions `ANTHROPIC_API_KEY`. 값은 어디에도 적지 않는다.
