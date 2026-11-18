/* ── 씨앗 단어 넣는 곳 — 정체성(콘텐츠 축마다) · 판매 상품(상품마다) 한 가지 방식 ──
   2026-11-18 동욱: "채널 정체성도 상품 단어처럼 상세 단어 지정하게 해도 좋아. 키워드에서 상세 단어를 뽑아오는 워크플로우를 홈과 키워드에서 다 편하게",
   "단어가 너무 난잡하게 여러 개 나오는 것 · 상품과 판매 단어가 계속 많이 나오는 게 — 펼치기 접기".
   넣는 곳 key: 「정체성」(축 없이) · 「정체성:<축>」 · 「상품:<상품>」. 씨앗 = ct.set seeds [{kind, word, axis?, product?}] — 맥(content_app.py seeds)은 kind·word 만 쓰고 axis 는 그대로 둔다.
   한 곳(축 · 상품)마다 SEED_MAX 개까지. */
function seedTargets(){
  var p = profNow();
  return [{ key: "정체성", label: "정체성 · 축 없이" }].concat(((p.identity || {}).axes || []).map(function(a){ return { key: "정체성:" + a, label: "정체성 · " + a } }),
    (p.products || []).map(function(x){ return { key: "상품:" + x.name, label: "🛒 " + x.name } }));
}
function seedsAt(key){
  var ax = key.indexOf("정체성:") === 0 ? key.slice(4) : null, axes = (profNow().identity || {}).axes || [];
  return seedsOf().filter(function(x){
    if(key.indexOf("상품:") === 0) return x.kind === "상품" && x.product === key.slice(3);
    if(x.kind !== "정체성") return false;
    return ax != null ? x.axis === ax : !x.axis || axes.indexOf(x.axis) < 0;   // 지운 축의 단어는 「축 없이」로
  });
}
function seedFor(key, word){ return key.indexOf("상품:") === 0 ? { kind: "상품", word: word, product: key.slice(3) } : key.indexOf("정체성:") === 0 ? { kind: "정체성", word: word, axis: key.slice(4) } : { kind: "정체성", word: word } }
/* 넣기 — 넣었으면 true. 같은 단어는 한 번만, 한 곳에 SEED_MAX 개까지 */
function addSeed(key, word){
  var w = String(word || "").replace(/\s+/g, "").slice(0, 20), all = seedsOf();
  if(!w) return false;
  if(all.some(function(x){ return x.word === w })){ toast("「" + w + "」은 이미 씨앗 단어예요"); return false }
  if(seedsAt(key).length >= SEED_MAX){ alert("한 곳에 " + SEED_MAX + "개까지예요. 하나 빼고 넣으세요."); return false }
  setS({ seeds: all.concat([seedFor(key, w)]) }); toast("「" + w + "」 넣었어요 — 맥이 연관 검색어를 받아요");
  return true;
}
/* 단어 상자 하나 — 머리(이름 · 개수 · 앞 단어 몇 개) + 접힌 몸통(단어 줄 · 넣기). 펼친 상자는 ui.wOpen 에 기억 */
function wordBoxHtml(key, head, body){
  var list = seedsAt(key), open = (ui.wOpen || {})[key];
  return "<details class=\"wbox\" data-wbox=\"" + esc(key) + "\"" + (open ? " open" : "") + "><summary>" + head +
    "<span class=\"wsum\"><span class=\"num\">" + list.length + "/" + SEED_MAX + "</span> " + (list.length ? list.slice(0, 4).map(function(x){ return esc(x.word) }).join(" · ") + (list.length > 4 ? " …" : "") : "<span class=\"muted\">아직 없음</span>") + "</span></summary>" +
    "<div class=\"wbody\">" + body + "</div></details>";
}
function wordListHtml(key, hint){
  var s = S(), list = seedsAt(key);
  return "<div class=\"list pwords\">" + (list.map(function(x){ return seedRowHtml(x, s) }).join("") || "<p class=\"empty\">아직 단어가 없어요.</p>") + "</div>" + seedAddHtml(key, list.length, hint);
}
/* 브랜드 탭 — 채널 정체성: 콘텐츠 축마다 상자 */
function identityBoxesHtml(){
  var axes = (profNow().identity || {}).axes || [], loose = seedsAt("정체성");
  return "<h4><span class=\"tag i\">정체성</span> 정체성 세부 단어</h4>" +
    "<p class=\"lead\">콘텐츠 축마다 그 축을 말하는 단어를 넣어요. 이 단어들의 연관 검색어가 사람 모으는 영상의 재료가 돼요. 축은 아래 「콘텐츠 축」에서 고치고 더해요.</p>" +
    axes.map(function(a, i){ return wordBoxHtml("정체성:" + a, "<span class=\"tag i\">축 " + (i + 1) + "</span> <b>" + esc(a) + "</b> ", wordListHtml("정체성:" + a, "「" + a + "」 단어 넣기")) }).join("") +
    (loose.length || !axes.length ? wordBoxHtml("정체성", "<span class=\"tag i\">축 없이</span> ", wordListHtml("정체성", "정체성 단어 넣기") + (axes.length ? "<p class=\"it-d\" style=\"margin-top:6px\">축을 정하지 않은 단어예요. 축 상자에 다시 넣으면 정리돼요.</p>" : "")) : "");
}
/* 넣을 곳 고르기 — 키워드 줄 · 단어 후보 · 키워드에서 가져오기가 모두 같은 칩을 쓴다 */
function seedPickHtml(word){
  var has = seedsOf().filter(function(x){ return x.word === String(word).replace(/\s+/g, "") })[0];
  if(has) return "<div class=\"spick\"><span class=\"tag ok\">이미 씨앗 단어 · " + esc(has.kind === "상품" ? "🛒 " + has.product : "정체성" + (has.axis ? " · " + has.axis : "")) + "</span></div>";
  return "<div class=\"spick\"><span class=\"it-d\">어디에 넣을까요?</span> " + seedTargets().map(function(t){
    return "<button class=\"chip\" data-act=\"seedto\" data-key=\"" + esc(t.key) + "\" data-w=\"" + esc(word) + "\"" + (seedsAt(t.key).length >= SEED_MAX ? " disabled title=\"꽉 찼어요\"" : "") + ">＋ " + esc(t.label) + "</button>" }).join("") + "</div>";
}
/* 브랜드 탭 — 키워드에서 세부 단어 가져오기: ★ 키워드 · Claude 키워드 추천 · 씨앗마다 상위 키워드 중 아직 씨앗이 아닌 말 */
function kwPullHtml(){
  var s = S(), all = scored(), have = {}; seedsOf().forEach(function(x){ have[x.word] = 1 });
  var pool = [], seen = {};
  function add(x, why){ var w = String(x.kw).replace(/\s+/g, ""); if(have[w] || seen[w]) return; seen[w] = 1; pool.push({ x: x, why: why }) }
  all.filter(function(x){ return s.pin[x.kw] }).forEach(function(x){ add(x, "★") });
  (typeof kwRecs === "function" ? kwRecs() : []).forEach(function(r){ var x = all.filter(function(y){ return y.kw === r.kw })[0]; if(x) add(x, "Claude 추천") });
  seedsOf().forEach(function(sd){ seedItems(sd.word).filter(function(x){ return kwShown(x, sd.word) }).slice(0, 3).forEach(function(x){ add(x, "「" + sd.word + "」 상위") }) });
  if(!pool.length) return "";
  var more = ui.pullMore || 8;
  return "<details class=\"wbox\"" + (ui.pullOpen ? " open" : "") + " data-wbox=\"_pull\"><summary><b>키워드에서 세부 단어 가져오기</b><span class=\"wsum\">★ · Claude 추천 · 씨앗마다 상위 말 " + pool.length + "개</span></summary><div class=\"wbody\">" +
    "<p class=\"it-d\">키워드 탭에서 찾은 말 중 씨앗 단어로 삼을 만한 말이에요. 넣을 곳(정체성 축 · 상품)을 누르면 씨앗 단어가 되고, 맥이 그 말로 다시 연관 검색어를 받아요.</p><div class=\"list\">" +
    pool.slice(0, more).map(function(o){ return "<div class=\"it\"><div class=\"it-m\"><div class=\"it-h\"><b>" + esc(o.x.kw) + "</b> <span class=\"tag\">" + esc(o.why) + "</span> <span class=\"num muted\">월 " + fmt(o.x.total) + "</span></div>" + (ui.kwSeed === o.x.kw ? seedPickHtml(o.x.kw) : "") + "</div><button class=\"btn sm\" data-act=\"kwseed\" data-kw=\"" + esc(o.x.kw) + "\" aria-expanded=\"" + (ui.kwSeed === o.x.kw) + "\">" + (ui.kwSeed === o.x.kw ? "닫기" : "＋ 넣기") + "</button></div>" }).join("") + "</div>" +
    (pool.length > more ? "<div class=\"acts\"><button class=\"btn sm\" data-ui=\"pullMore=" + (more + 12) + "\">더 보기 (" + (pool.length - more) + "개)</button></div>" : "") + "</div></details>";
}
