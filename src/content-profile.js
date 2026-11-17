/* ── 브랜드 탭 그 자리에서 고치기 — 브랜드의 모든 칸(이름·채널·소개·타깃·첫 질문·훅 규칙·판매 상품·콘텐츠 축·필러·구매자 욕구·역할·단계)을
   칸마다 ✎ 고치기 · ✕ 빼기 · 넣기로 바로 바꾼다 (2026-11-17 동욱: "처음에 정한 게 기본값이 되는 게 아니라 모든 자체를 수정하고 뺄 수 있게").
   바꾼 것은 ct.set/<브랜드> profile 에 바로 쓰이고(Supabase), 맥 동기화가 볼트 브랜드.json 정본에 적는다 → ct.data/<브랜드> 도 따라 바뀐다.
   맥이 받기 전에도 화면이 바뀐 값으로 보이게 B() 가 profile 을 겹쳐 본다. 레퍼런스 채널·포맷·주제 은행은 볼트 레퍼런스 카드가 정본이라 여기서 고치지 않는다. */
var PROF_KEYS = ["name", "handle", "one", "target", "firstQuestion", "hook", "products", "identity", "roles", "stages"];
/* 목록 칸 — 어디에 있고, 한 줄 글과 어떻게 오가나 (짝 칸은 「앞 — 뒤」로 적는다) */
var PLIST = {
  "identity.axes": { label: "콘텐츠 축", hint: "콘텐츠 축 넣기" },
  "identity.needs": { label: "구매자 욕구", hint: "구매자 욕구 넣기" },
  "identity.pillars": { label: "필러", hint: "A — 사람이 안 오는 이유", pair: ["id", "name"] },
  "roles": { label: "역할", hint: "풀링 — 사람을 모으기", pair: ["name", "what"] },
  "stages": { label: "단계", hint: "궁금 의문 — 저건 왜 저래?", pair: ["name", "what"] }
};
function profNow(){
  var b = B() || {}, o = {};
  PROF_KEYS.forEach(function(k){ if(b[k] != null) o[k] = JSON.parse(JSON.stringify(b[k])) });
  o.identity = o.identity || {}; o.products = o.products || [];
  return o;
}
function pget(o, path){ return path.split(".").reduce(function(a, k){ return a ? a[k] : undefined }, o) }
function pset(o, path, v){ var ks = path.split("."), t = o; ks.slice(0, -1).forEach(function(k){ t = t[k] = t[k] || {} }); t[ks[ks.length - 1]] = v }
function itemText(def, x){ return def.pair ? x[def.pair[0]] + (x[def.pair[1]] ? " — " + x[def.pair[1]] : "") : x }
function itemParse(def, t){ t = t.trim(); if(!def.pair) return t; var i = t.indexOf("—"), o = {}; o[def.pair[0]] = (i < 0 ? t : t.slice(0, i)).trim(); o[def.pair[1]] = i < 0 ? "" : t.slice(i + 1).trim(); return o }
/* 고친 값 저장 — 상품 이름이 바뀌면 그 상품의 판매 단어(seeds)·비중(share)도 따라가고, 뺀 상품의 판매 단어는 같이 뺀다 */
function profSave(p, ren){
  var patch = { profile: p }, names = (p.products || []).map(function(x){ return x.name });
  ren = ren || {};
  var sd = seedsOf().map(function(x){ return x.kind === "상품" && ren[x.product] ? Object.assign({}, x, { product: ren[x.product] }) : x })
    .filter(function(x){ return x.kind !== "상품" || names.indexOf(x.product) >= 0 });
  if(JSON.stringify(sd) !== JSON.stringify(seedsOf())) patch.seeds = sd;
  var sh = (SETS[cur] || {}).share; if(sh){ var ns = {}; Object.keys(sh).forEach(function(k){ var nk = ren[k] || k; if(names.indexOf(nk) >= 0) ns[nk] = sh[k] }); patch.share = ns }
  ui.pedit = ""; ui.pdraft = {}; setS(patch);
}
function draft(key, val){ return (ui.pdraft || {})[key] != null ? ui.pdraft[key] : (val == null ? "" : val) }
function editBtns(key){ return "<button class=\"btn sm primary\" data-act=\"psave\" data-k=\"" + esc(key) + "\">저장</button><button class=\"btn sm\" data-act=\"pcancel\">취소</button>" }
function penBtn(key, label){ return "<button class=\"mk\" data-act=\"pedit\" data-k=\"" + esc(key) + "\" aria-label=\"" + esc(label) + " 고치기\" title=\"고치기\">✎</button>" }
/* 글 칸 하나 — 보기 ↔ 고치기 */
function ptextHtml(key, label, multi){
  var v = profNow()[key] || "";
  if(ui.pedit === key) return "<div class=\"pfield\"><span class=\"pl\">" + esc(label) + "</span>" +
    (multi ? "<textarea data-pin=\"" + key + "\" rows=\"3\">" + esc(draft(key, v)) + "</textarea>" : "<input type=\"text\" data-pin=\"" + key + "\" value=\"" + esc(draft(key, v)) + "\">") +
    "<div class=\"acts\">" + editBtns(key) + "</div></div>";
  return "<div class=\"pfield\"><span class=\"pl\">" + esc(label) + "</span><div class=\"pv\"><span>" + (v ? esc(v) : "<span class=\"muted\">비어 있음</span>") + "</span>" + penBtn(key, label) + "</div></div>";
}
/* 목록 칸 — 줄마다 ✎ · ✕, 맨 아래 넣기 */
function plistHtml(path){
  var def = PLIST[path], list = pget(profNow(), path) || [];
  return "<div class=\"pfield\"><span class=\"pl\">" + esc(def.label) + " <span class=\"num muted\">" + list.length + "</span></span><div class=\"list\">" + list.map(function(x, i){
    var key = path + ":" + i;
    if(ui.pedit === key) return "<div class=\"it\"><div class=\"it-m\"><input type=\"text\" data-pin=\"" + esc(key) + "\" value=\"" + esc(draft(key, itemText(def, x))) + "\"><div class=\"acts\">" + editBtns(key) + "</div></div></div>";
    return "<div class=\"it\"><div class=\"it-m\">" + (def.pair ? "<div><b>" + esc(x[def.pair[0]]) + "</b>" + (x[def.pair[1]] ? " " + esc(x[def.pair[1]]) : "") + "</div>" : "<div>" + esc(x) + "</div>") + "</div>" +
      penBtn(key, def.label) + "<button class=\"mk no\" data-act=\"pdel\" data-k=\"" + esc(key) + "\" aria-label=\"빼기\" title=\"빼기\">✕</button></div>";
  }).join("") + "</div>" +
    "<div class=\"row2\" style=\"margin-top:6px\"><input type=\"text\" data-pin=\"" + esc(path + ":new") + "\" placeholder=\"" + esc(def.hint) + "\" value=\"" + esc(draft(path + ":new", "")) + "\"><button class=\"btn sm\" data-act=\"padd\" data-k=\"" + esc(path) + "\">넣기</button></div></div>";
}
/* 판매 상품 — 이름·설명 ✎, 상품 ✕, 맨 아래 ＋ 상품 더하기. 상품마다 판매 단어(씨앗)가 붙는다 */
function productsHtml(){
  var ps = profNow().products;
  return "<div class=\"list\">" + ps.map(function(p, i){
    var key = "prod:" + i;
    var head = ui.pedit === key ?
      "<div class=\"prow\"><input type=\"text\" data-pin=\"" + key + ":name\" maxlength=\"30\" placeholder=\"상품 이름\" value=\"" + esc(draft(key + ":name", p.name)) + "\">" +
        "<input type=\"text\" data-pin=\"" + key + ":what\" maxlength=\"120\" placeholder=\"무엇을 파나 (한 줄)\" value=\"" + esc(draft(key + ":what", p.what)) + "\"></div><div class=\"acts\">" + editBtns(key) + "</div>"
      : "<div class=\"pv\"><div><div class=\"it-h\"><b>" + esc(p.name) + "</b></div><div class=\"it-d\">" + esc(p.what || "") + "</div></div><span style=\"display:flex;gap:2px\">" + penBtn(key, p.name) +
        "<button class=\"mk no\" data-act=\"pdelprod\" data-i=\"" + i + "\" aria-label=\"" + esc(p.name) + " 빼기\" title=\"상품 빼기\">✕</button></span></div>";
    return "<div class=\"it\"><div class=\"it-m\">" + head + productWordsHtml(p.name) + "</div></div>";
  }).join("") + "</div>" +
    "<h4>＋ 상품 더하기</h4><div class=\"prow\"><input type=\"text\" data-pin=\"prod:new:name\" maxlength=\"30\" placeholder=\"새 상품 이름\" value=\"" + esc(draft("prod:new:name", "")) + "\">" +
    "<input type=\"text\" data-pin=\"prod:new:what\" maxlength=\"120\" placeholder=\"무엇을 파나 (한 줄)\" value=\"" + esc(draft("prod:new:what", "")) + "\"><button class=\"btn sm primary\" data-act=\"paddprod\">더하기</button></div>";
}
function pval(key){ var el = [].filter.call(document.querySelectorAll("[data-pin]"), function(x){ return x.dataset.pin === key })[0]; return el ? el.value.trim() : "" }
function profAct(name, el){
  var k = el && el.dataset.k, p = profNow();
  if(name === "pedit"){ ui.pedit = k; ui.pdraft = {}; render(); var f = [].filter.call(document.querySelectorAll("[data-pin]"), function(x){ return x.dataset.pin.indexOf(k) === 0 })[0]; if(f) f.focus(); return true }
  if(name === "pcancel"){ ui.pedit = ""; ui.pdraft = {}; render(); return true }
  if(name === "psave"){
    if(k.indexOf("prod:") === 0){
      var i = +k.split(":")[1], nm = pval(k + ":name"), old = p.products[i].name, ren = {};
      if(!nm){ alert("상품 이름을 적어 주세요."); return true }
      if(p.products.some(function(x, j){ return j !== i && x.name === nm })){ alert("같은 이름의 상품이 이미 있어요."); return true }
      if(nm !== old) ren[old] = nm;
      p.products[i] = Object.assign({}, p.products[i], { name: nm, what: pval(k + ":what") }); profSave(p, ren); return true;
    }
    if(k.indexOf(":") > 0){ var path = k.split(":")[0], j = +k.split(":")[1], t = pval(k), arr = pget(p, path) || [];
      if(!t){ arr.splice(j, 1) } else arr[j] = itemParse(PLIST[path], t);
      pset(p, path, arr); profSave(p); return true }
    p[k] = pval(k); profSave(p); return true;
  }
  if(name === "pdel"){ var pp = k.split(":")[0], jj = +k.split(":")[1], a2 = pget(p, pp) || [];
    if(!confirm("「" + itemText(PLIST[pp], a2[jj]) + "」을 뺄까요?")) return true;
    a2.splice(jj, 1); pset(p, pp, a2); profSave(p); return true }
  if(name === "padd"){ var t2 = pval(k + ":new"); if(!t2){ alert("넣을 내용을 적어 주세요."); return true }
    var a3 = (pget(p, k) || []).concat([itemParse(PLIST[k], t2)]); pset(p, k, a3); profSave(p); return true }
  if(name === "pdelprod"){ var di = +el.dataset.i, dn = p.products[di].name;
    if(!confirm("「" + dn + "」 상품을 뺄까요? 이 상품의 판매 단어도 같이 빠져요.")) return true;
    p.products.splice(di, 1); profSave(p); return true }
  if(name === "paddprod"){ var nn = pval("prod:new:name"); if(!nn){ alert("새 상품 이름을 적어 주세요."); return true }
    if(p.products.some(function(x){ return x.name === nn })){ alert("같은 이름의 상품이 이미 있어요."); return true }
    p.products.push({ name: nn, what: pval("prod:new:what"), share: 5 }); profSave(p); return true }
  return false;
}
