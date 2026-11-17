/* ── 점수 기준 (참고용) — 키워드 점수·레퍼런스 점수를 매길 때만 쓰는 비중 ──
   2026-11-17 동욱: "비율·믹서 탭은 없애고 참고 수준으로 너가 가지고 있어. 믹서는 점수를 매기는 기준으로 필요할 때만."
   화면에서 고치는 곳은 없다. 비중은 볼트 「콘텐츠 기획 앱/믹서.json」(ct.data/mixer.def)의 브랜드 템플릿 값이 정본 — 바꿔야 하면 Claude 가 그 파일을 고친다. */
function mixTpl(){
  var d = RAW["mixer.def"] || { templates: [] }, id = (SETS[cur] || {}).template || (B() && B().template) || "base";
  return d.templates.filter(function(t){ return t.id === id })[0] || d.templates[0] || { id: id, name: id, values: {} };
}
function M(){ return Object.assign({}, mixTpl().values, (SETS[cur] || {}).mixer || {}) }   // 지금 적용되는 비중
function wsum(pairs){   // [[가중치, 0~100 점수], …] → 가중 평균
  var w = 0, t = 0; pairs.forEach(function(p){ w += p[0]; t += p[0] * p[1] }); return w ? t / w : 0;
}
