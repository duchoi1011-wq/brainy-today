/* ── 브랜드 정보 고치기 — 브랜드 탭의 모든 칸(소개·타깃·첫 질문·훅 규칙·판매 상품·콘텐츠 축·필러·구매자 욕구·역할·단계)을 고치고 더한다 ──
   (2026-11-17 동욱: "모든 부분은 다 수정하거나 추가 지정할 수 있게")
   고친 것은 ct.set/<브랜드> profile 에 바로 쓰이고(Supabase), 맥 동기화가 볼트 브랜드.json 정본에 적는다 → ct.data/<브랜드> 도 따라 바뀐다.
   맥이 받기 전에도 화면이 고친 값으로 보이게 B() 가 profile 을 겹쳐 본다. 레퍼런스 채널·포맷은 볼트 레퍼런스 카드가 정본이라 여기서 고치지 않는다. */
var PROF_TEXT = [["one", "한 줄 소개"], ["target", "타깃"], ["firstQuestion", "첫 질문"], ["hook", "훅 규칙"]];
function lines(v){ return String(v || "").split("\n").map(function(x){ return x.trim() }).filter(Boolean) }
function pairLines(list, a, b){ return (list || []).map(function(x){ return x[a] + (x[b] ? " — " + x[b] : "") }).join("\n") }
function parsePairs(v, a, b){ return lines(v).map(function(x){ var i = x.indexOf("—"); var o = {}; o[a] = (i < 0 ? x : x.slice(0, i)).trim(); o[b] = i < 0 ? "" : x.slice(i + 1).trim(); return o }) }
function profileFormHtml(){
  var b = B(), id = b.identity || {};
  function ta(k, label, val, rows, hint){ return "<label class=\"fld\"><span>" + label + "</span><textarea data-prof=\"" + k + "\" rows=\"" + (rows || 2) + "\" placeholder=\"" + esc(hint || "") + "\">" + esc(val || "") + "</textarea></label>" }
  var h = "<section class=\"card\" id=\"prof-form\"><div class=\"card-h\"><h3>브랜드 정보 고치기</h3><span class=\"n\">" + esc(b.name) + "</span></div>" +
    "<p class=\"lead\">칸을 고치거나 줄을 더해 「저장」을 누르세요. 목록 칸은 한 줄에 하나씩 적어요. 저장하면 바로 앱에 쓰이고, 맥이 볼트 정본(브랜드.json)에도 적어요.</p>";
  PROF_TEXT.forEach(function(f){ h += ta(f[0], f[1], b[f[0]], f[0] === "one" ? 3 : 2) });
  h += "<h4>판매 상품</h4><div id=\"prof-prods\">" + (b.products || []).map(function(p, i){ return prodRowHtml(p, i) }).join("") + "</div>" +
    "<div class=\"acts\"><button class=\"btn sm\" data-act=\"profprod\">＋ 상품 더하기</button></div>";
  h += ta("axes", "콘텐츠 축 (한 줄에 하나)", (id.axes || []).join("\n"), 4) +
    ta("pillars", "필러 (한 줄에 「A — 이름」)", pairLines(id.pillars, "id", "name"), 5, "A — 사람이 안 오는 이유") +
    ta("needs", "구매자 욕구 (한 줄에 하나)", (id.needs || []).join("\n"), 4) +
    ta("roles", "역할 (한 줄에 「이름 — 하는 일」)", pairLines(b.roles, "name", "what"), 3, "풀링 — 사람을 모으기") +
    ta("stages", "단계 (한 줄에 「이름 — 시청자 마음」)", pairLines(b.stages, "name", "what"), 5, "궁금 의문 — 저건 왜 저래?");
  return h + "<div class=\"acts\"><button class=\"btn primary\" data-act=\"profsave\">저장</button><button class=\"btn\" data-act=\"profedit\">그만두기</button></div></section>";
}
function prodRowHtml(p, i){
  return "<div class=\"prow\" data-old=\"" + esc(p.name || "") + "\"><input type=\"text\" data-pf=\"name\" maxlength=\"30\" placeholder=\"상품 이름\" value=\"" + esc(p.name || "") + "\">" +
    "<input type=\"text\" data-pf=\"what\" maxlength=\"120\" placeholder=\"무엇을 파나 (한 줄)\" value=\"" + esc(p.what || "") + "\">" +
    "<button class=\"mk no\" data-act=\"profprodx\" aria-label=\"이 상품 빼기\" title=\"빼기\">✕</button></div>";
}
/* 폼 → profile. 상품 이름을 바꾸면 그 상품의 판매 단어(seeds)·비중(share)도 새 이름으로 옮긴다 */
function profileSave(){
  var b = B(), f = document.getElementById("prof-form"); if(!f) return;
  function v(k){ var el = f.querySelector("[data-prof=\"" + k + "\"]"); return el ? el.value : "" }
  var ren = {}, old = {}; (b.products || []).forEach(function(p){ old[p.name] = p });
  var prods = [].map.call(f.querySelectorAll(".prow"), function(r){
    var nm = r.querySelector("[data-pf=name]").value.trim(), was = r.dataset.old, o = old[was] || {};
    if(was && nm && was !== nm) ren[was] = nm;
    return nm ? Object.assign({}, o, { name: nm, what: r.querySelector("[data-pf=what]").value.trim(), share: o.share != null ? o.share : 5 }) : null;
  }).filter(Boolean);
  var names = prods.map(function(p){ return p.name });
  if(names.length !== new Set(names).size){ alert("같은 이름의 상품이 둘 있어요. 이름을 다르게 적어 주세요."); return }
  var pf = { products: prods, identity: Object.assign({}, b.identity || {}, { axes: lines(v("axes")), pillars: parsePairs(v("pillars"), "id", "name"), needs: lines(v("needs")) }),
    roles: parsePairs(v("roles"), "name", "what"), stages: parsePairs(v("stages"), "name", "what") };
  PROF_TEXT.forEach(function(x){ pf[x[0]] = v(x[0]).trim() });
  var patch = { profile: pf };
  var sd = seedsOf().map(function(x){ return x.kind === "상품" && ren[x.product] ? Object.assign({}, x, { product: ren[x.product] }) : x })
    .filter(function(x){ return x.kind !== "상품" || names.indexOf(x.product) >= 0 });   // 뺀 상품의 판매 단어는 같이 뺀다
  if(JSON.stringify(sd) !== JSON.stringify(seedsOf())) patch.seeds = sd;
  var sh = (SETS[cur] || {}).share; if(sh){ var ns = {}; Object.keys(sh).forEach(function(k){ var nk = ren[k] || k; if(names.indexOf(nk) >= 0) ns[nk] = sh[k] }); patch.share = ns }
  ui.profEdit = false; setS(patch);
}
