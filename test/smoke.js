// 로그인 없이 네 앱을 띄워 보는 시험대 — Supabase 대신 가짜(fake-supabase.js, 메모리 표)를 끼운다.
//   node test/smoke.js            네 앱 × (컴퓨터 1280 · 폰 390) — 스크립트 오류·가로 넘침이 있으면 1 로 끝난다. 화면은 test/out/ 에 찍힌다
//   node test/smoke.js vocab      한 앱만
// 자료를 넣어 보려면 test/seed.json 에 [{"path":"sc.data/main","data":{…}}, …] (볼트 내용이니 저장소에 올리지 않는다 — .gitignore)
// 다른 시험에서: const T = require('./smoke.js'); const s = await T.serve(); const { page, errs } = await T.open(browser, s.address().port, 'content', { seed, width: 390 })
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..', '..');   // 저장소들이 나란히 있는 곳 (brainy-today · content-plan) const fake = fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8');
const fake = fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8');
const HERE = '/' + path.basename(path.resolve(__dirname, '..')) + '/';
const APPS = { home: HERE + 'home/', shortcuts: HERE + 'shortcuts/', vocab: HERE + 'vocab/', content: '/content-plan/' };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.webmanifest': 'application/json' };
exports.serve = () => new Promise(res => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0, () => res(s)); });
exports.open = async (browser, port, app, { width = 1280, height = 900, seed = [], query = '', nologin = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await page.route('**/*', r => { const u = r.request().url(); if (u.includes('supabase.min.js')) return r.fulfill({ contentType: 'text/javascript', body: `window.__SEED=${JSON.stringify(seed)};window.__NOLOGIN=${nologin};` + fake }); if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  await page.goto(`http://localhost:${port}${APPS[app]}${query}`); await page.waitForTimeout(1200);
  return { page, errs, ctx };
};
if (require.main === module) (async () => {
  const s = await exports.serve(), port = s.address().port, b = await chromium.launch();
  const apps = (process.argv[2] ? [process.argv[2]] : Object.keys(APPS)).filter(a => fs.existsSync(path.join(ROOT, APPS[a], 'index.html')));
  let seed = []; for (const f of ['seed.json', 'seed.example.json']) { try { seed = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')); break; } catch (e) {} }   // seed.json 이 없으면 지어낸 예시 자료(모양만 같다)
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  let bad = 0;
  for (const app of apps) for (const width of [1280, 390]) {
    const { page, errs, ctx } = await exports.open(b, port, app, { width, height: width < 500 ? 800 : 900, seed });
    await page.screenshot({ path: path.join(__dirname, 'out', `${app}-${width}.png`) });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const real = errs.filter(e => !/ERR_FAILED/.test(e));   // 밖으로 나가는 요청(글꼴)은 막아 둔 것
    if (real.length || over > 0) bad++;
    console.log((real.length || over > 0 ? '✗' : '✓'), app, width, '· 오류', real.length, '· 가로 넘침', Math.max(0, over));
    real.slice(0, 6).forEach(e => console.log('   ', e));
    await ctx.close();
  }
  await b.close(); s.close();
  process.exit(bad ? 1 : 0);
})();
