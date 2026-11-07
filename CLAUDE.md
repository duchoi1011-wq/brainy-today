# Brainy 홈 저장소

- 화면 원본은 `src/`, 받침은 `shim.js`. `python3 build.py` 가 `home/` `shortcuts/` `vocab/` 를 만든다 (손으로 고치지 않는다). 올리기 전에 `python3 .github/check_apps.py`.
- 공개 저장소다. 실명·연락처·키는 넣지 않는다 (원본도 "동욱" 으로만).
- 앱 안의 「앱 고치기」가 GitHub Actions(`.github/workflows/brainy-edit.yml`)로 `brainy-edit/<id>` 가지를 만들고, 적용하면 main 에 합쳐진다. **이 맥에서 고치기 전에 `git pull` 부터** — 원격 main 이 앞서 있을 수 있다.
- Brainy 대화는 Supabase Edge Function `supabase/functions/brainy-ai` 가 콘솔 API 로 답하고, 못 하면 맥(볼트 `.claude/scripts/ai_runner.py`)으로 넘긴다. 함수를 고치면 Supabase 에 다시 배포한다.
- 비밀값: Supabase `ANTHROPIC_API_KEY`·`BRAINY_GITHUB_TOKEN`, GitHub Actions `ANTHROPIC_API_KEY`. 값은 어디에도 적지 않는다.
