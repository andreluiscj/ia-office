// Markdown simples para mostrar textos das skills e do Graphify.
import { esc } from "./common.js";

/** Markdown simples: títulos, listas, código, negrito, itálico, links e tabelas. */
export function md(src) {
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null, code = null, para = [], table = null;
  const endTable = () => {
    if (!table) return;
    const rows = table.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
    out.push(`<div class="tbl-wrap"><table>${rows.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</table></div>`);
    table = null;
  };
  const flush = () => { endTable(); if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of src.split(/\r?\n/)) {
    if (code !== null) { if (/^\s*```/.test(line)) { out.push(`<pre>${esc(code.join("\n"))}</pre>`); code = null; } else code.push(line); continue; }
    if (/^\s*```/.test(line)) { flush(); code = []; continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) { if (!table) { flush(); table = []; } table.push(line); continue; }
    endTable();
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); const n = Math.min(6, h[1].length + 2); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    const li = line.match(/^\s*(?:[-*+]|(\d+)\.)\s+(.*)$/);
    if (li) { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } const tag = li[1] ? "ol" : "ul"; if (list !== tag) { if (list) out.push(`</${list}>`); out.push(`<${tag}>`); list = tag; } out.push(`<li>${inline(li[2])}</li>`); continue; }
    if (!line.trim()) { flush(); continue; }
    if (list) { out.push(`</${list}>`); list = null; }
    para.push(line.trim());
  }
  if (code !== null) out.push(`<pre>${esc(code.join("\n"))}</pre>`);
  flush();
  return out.join("");
}

