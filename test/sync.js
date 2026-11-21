const assert = require('assert');
const { chromium } = require('playwright'); const R = require('./smoke.js');   // node test/sync.js — 받침(shim.js)이 바뀐 문서만 받는지 · 1000줄 넘는 컬렉션 · 실시간 거르기 · 지움 const assert = require('assert');
(async () => {
  const s = await R.serve(), port = s.address().port, b = await chromium.launch();
  const big = 'x'.repeat(200000);
  const seed = [{ path: 'ct.data/demo', data: { name: '데모', big } }, { path: 'ct.data/demo.kw', data: { big } }, { path: 'ct.set/demo', data: { a: 1 } },
    { path: 'ct.hist/demo.1', data: { big } }, { path: 'cal/2026-11-21', data: { big } }, { path: 'mac/main', data: { seenAt: new Date().toISOString() } }];
  for (let i = 0; i < 2300; i++) seed.push({ path: 'cmd/c' + String(i).padStart(5, '0'), data: { text: 't' + i, from: 'content', createdAt: '2026-11-20T00:00:00Z', status: '끝' } });
  const { page, errs, ctx } = await R.open(b, port, 'content', { seed });
  const F = f => page.evaluate(f);
  await page.waitForTimeout(1500);
  // 1) 처음: 통째로, 1000줄 넘어도 끝까지, 남의 컬렉션은 안 받음
  let st = await F(() => ({ bytes: __FAKE.bytes, keys: Object.keys(JSON.parse(localStorage.getItem('brainy-docs-v1:content'))).length, at: Object.keys(JSON.parse(localStorage.getItem('brainy-docs-v1:content:at') || '{}')).length, log: __FAKE.log.filter(x => /줄/.test(x)).slice(0, 12) }));
  console.log('처음', st.bytes, st.keys, st.at); assert.equal(st.keys, 2303); assert.equal(st.at, 2303);
  // 2) 다시 맞추기: 목록만 + 바뀐 문서만 · 지워진 것 사라짐 · 새 문서 들어옴
  await F(() => { __FAKE.bytes = 0; __FAKE.log = []; const c = __FAKE.chans; __FAKE.chans = [];   // 실시간 끊긴 사이에 바뀐 것처럼
    __FAKE.put('ct.set/demo', { a: 2 }); __FAKE.del('cmd/c00007'); __FAKE.put('ct.data/demo.rec', { r: 1 }); __FAKE.put('ct.hist/demo.2', { big: 'y'.repeat(99999) }); __FAKE.chans = c; });
  await F(() => BRAINY.reload()); await page.waitForTimeout(1800);
  st = await F(() => { const d = JSON.parse(localStorage.getItem('brainy-docs-v1:content')); return { bytes: __FAKE.bytes, set: d['ct.set/demo'], gone: d['cmd/c00007'], rec: d['ct.data/demo.rec'], hist: d['ct.hist/demo.2'], n: Object.keys(d).length, log: __FAKE.log }; });
  console.log('다시', st.bytes, st.log.filter(x => /select/.test(x)));
  assert.deepEqual(st.set, { a: 2 }); assert.equal(st.gone, undefined); assert.deepEqual(st.rec, { r: 1 }); assert.equal(st.hist, undefined); assert.equal(st.n, 2303);
  assert(st.bytes < 250000, '본문을 통째로 받지 않아야');
  // 3) 실시간: 내 컬렉션은 오고, 남의 것(cal)은 안 흘러옴 · 지움은 옴
  await F(() => { __FAKE.rt = 0; __FAKE.put('cal/2026-11-22', { big: 'z'.repeat(50000) }); __FAKE.put('ct.set/demo', { a: 3 }); __FAKE.del('cmd/c00008'); });
  await page.waitForTimeout(1800);
  st = await F(() => { const d = JSON.parse(localStorage.getItem('brainy-docs-v1:content')); return { rt: __FAKE.rt, set: d['ct.set/demo'], gone: d['cmd/c00008'] }; });
  console.log('실시간', st.rt); assert.deepEqual(st.set, { a: 3 }); assert.equal(st.gone, undefined); assert(st.rt < 2000);
  // 4) 앱이 쓴 것: 시각표를 받아 다음 맞추기에서 다시 안 받음
  await F(async () => { const db = await claude.use('db'); await db.doc('ct.set/demo').set({ a: 4, big: 'w'.repeat(60000) }); });
  await page.waitForTimeout(1800);
  await F(() => { __FAKE.bytes = 0; __FAKE.log = []; return BRAINY.reload(); }); await page.waitForTimeout(600);
  st = await F(() => ({ bytes: __FAKE.bytes, log: __FAKE.log }));
  console.log('쓴 뒤 다시', st.bytes, st.log); assert(st.log.every(x => !/path,data/.test(x)));
  console.log('page errors', errs.filter(e => !/ERR_FAILED/.test(e)));
  await b.close(); s.close(); console.log('OK');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
