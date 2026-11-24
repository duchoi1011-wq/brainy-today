/* ── 「배운 것」 탭 — 볼트 「C-<강의> 실습 학습 노트」의 단원 목록과 단원 본문 (build.py 가 course.html 에 끼움) ──
   본문은 노트의 마크다운 그대로 온다 (c.note.units[].body). 아래 mdHtml 이 표·코드 블록·목록·인용·굵게·코드만 그린다.
   노트가 없는 강의는 빈 안내 — 칸 하나를 끝낼 때마다 Brainy가 노트에 단원을 하나씩 더한다. */
function mdHtml(src){
  const L = String(src || "").split("\n"), out = [];
  let i = 0;
  const isBlock = l => /^```/.test(l.trim()) || /^#{1,6}\s/.test(l) || /^\|/.test(l) || /^>\s?/.test(l) || /^\s*([-*]|\d+[.)])\s/.test(l);
  while (i < L.length) {
    const l = L[i];
    if (/^```/.test(l.trim())) {
      const buf = []; i++;
      while (i < L.length && !/^```/.test(L[i].trim())) buf.push(L[i++]);
      i++; out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`); continue;
    }
    const hm = l.match(/^(#{1,6})\s+(.*)$/);
    if (hm) { out.push(`<${hm[1].length >= 5 ? "h5" : "h4"}>${inline(hm[2])}</${hm[1].length >= 5 ? "h5" : "h4"}>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < L.length && /^\|/.test(L[i])) rows.push(L[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(x => x.trim());
      const body = rows.filter((r, k) => !(k === 1 && /^\|?\s*:?-/.test(r)));
      const [head, ...rest] = body.map(cells);
      out.push(`<div class="tbl"><table><thead><tr>${head.map(x => `<th>${inline(x)}</th>`).join("")}</tr></thead><tbody>${rest.map(r => `<tr>${r.map(x => `<td>${inline(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < L.length && /^>\s?/.test(L[i])) buf.push(L[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${buf.map(inline).join("<br>")}</blockquote>`); continue;
    }
    if (/^\s*([-*]|\d+[.)])\s/.test(l)) {
      const ordered = /^\s*\d/.test(l), items = [];
      while (i < L.length && (/^\s*([-*]|\d+[.)])\s/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
        const m = L[i].match(/^(\s*)(?:[-*]|\d+[.)])\s+(.*)$/);
        if (m) items.push({ d: m[1].length >= 2 ? 1 : 0, t: m[2] }); else items[items.length - 1].t += " " + L[i].trim();
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map(it => `<li${it.d ? ' style="margin-left:18px;list-style-type:circle"' : ""}>${inline(it.t)}</li>`).join("")}</${tag}>`); continue;
    }
    if (!l.trim()) { i++; continue; }
    const buf = [];
    while (i < L.length && L[i].trim() && !isBlock(L[i])) buf.push(L[i++]);
    out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}
function renderNotes(c){
  const n = c.note, name = `C-${c.name} 실습 학습 노트`;
  if (!n || !(n.units || []).length) {
    return `<section class="card"><h2>배운 것</h2>
      <p>${esc(c.name)} 강의는 아직 배운 것 노트가 없어요.</p>
      <p class="small muted" style="margin-top:6px">실습 칸 하나를 끝낼 때마다 Brainy가 볼트 「${esc(name)}」에 단원 하나를 더해요. 더해지면 여기에 저절로 보여요.</p></section>`;
  }
  const units = n.units.slice().sort((a, b) => a.n - b.n);
  const have = new Set(units.map(u => u.n));
  let h = `<section class="card"><h2>단원 목록 · ${units.length}개</h2><p class="small muted" style="margin-bottom:6px">실습 칸마다 무엇을 배웠는지 모은 볼트 노트예요. 누르면 그 단원으로 가요.</p><div class="ulist">` +
    (n.list.length ? n.list : units.map(u => ({ n: u.n, cell: u.title, state: "" }))).map(r => {
      const ok = have.has(r.n);
      return `<button type="button" class="cell ${ok ? "done" : "todo"}"${ok ? ` data-unit="${r.n}"` : " disabled"}><span class="ct"><b>단원 ${esc(r.n)} · ${inline(r.cell)}</b>${r.state ? `<span>${esc(r.state.replace(/`/g, ""))}</span>` : ""}</span><span class="tags">${ok ? `<span class="pill">읽기</span>` : `<span class="pill">아직 본문 없음</span>`}</span></button>`;
    }).join("") + `</div></section>`;
  units.forEach((u, k) => {
    h += `<section class="card"><details class="fold unit" id="unit-${u.n}"${k === 0 ? " open" : ""}><summary><b>단원 ${u.n}. ${inline(u.title)}</b></summary>
      ${u.src ? `<p class="src">${inline(u.src)}</p>` : ""}<div class="md">${mdHtml(u.body)}</div></details></section>`;
  });
  return h;
}
