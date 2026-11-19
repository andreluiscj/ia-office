// Verificação independente da tarefa "site". Uso: node acceptance-site.mjs <pasta>
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
const dados = JSON.parse(readFileSync(join(dir, "dados.json"), "utf8"));
const checks = []; const add = (name, ok) => checks.push({ name, ok: !!ok });
const idx = join(dir, "site", "index.html");
add("site/index.html existe", existsSync(idx));
if (existsSync(idx)) {
  const html = readFileSync(idx, "utf8");
  let all = html;
  const walk = d => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(css|js)$/.test(f.name)) all += "\n" + readFileSync(p, "utf8"); } };
  walk(join(dir, "site"));
  const low = html.toLowerCase();
  add('<html lang="pt-BR">', /<html[^>]*lang=["']pt-br["']/i.test(html));
  add("meta viewport", /<meta[^>]*name=["']viewport["']/i.test(html));
  add("título com o nome da empresa", new RegExp(`<title>[^<]*${dados.nome}`, "i").test(html));
  add("exatamente um <h1>", (html.match(/<h1[\s>]/gi) || []).length === 1);
  add("link tel: com o telefone", /href=["']tel:\+?[\d\s()-]+["']/i.test(html) && html.replace(/\D/g, "").includes(dados.telefone.replace(/\D/g, "")));
  add("botão WhatsApp (wa.me com o número)", html.includes(`wa.me/${dados.whatsapp}`));
  add("endereço presente", html.includes("Uberlândia") && html.includes("Av. Exemplo"));
  add("horário presente", html.includes("8h") && html.includes("18h"));
  add("todos os 5 serviços citados", dados.servicos.every(s => html.includes(s)));
  add("mapa incorporado ou link do Google Maps", /google\.com\/maps|maps\.google|goo\.gl\/maps/i.test(html));
  add("responsivo (media query, grid/flex ou clamp)", /@media|display:\s*(grid|flex)|clamp\(/i.test(all));
  add("imagens com alt", (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length === 0);
  add("sem lorem ipsum nem placeholder", !/lorem ipsum|example\.com|seu nome aqui/i.test(low));
  add("sem depoimentos ou prêmios inventados", !/depoimento|prêmio|premiad|"[^"]{20,}"\s*[—-]\s*[A-Z]/i.test(html));
  add("nota Google correta (4,8 ou 4.8) se citada", !/nota|avalia/i.test(html) || /4[.,]8/.test(html));
  add("tamanho razoável (< 300 KB sem imagens)", statSync(idx).size < 300 * 1024);
}
console.log(JSON.stringify({ passed: checks.every(c => c.ok), checks }));
