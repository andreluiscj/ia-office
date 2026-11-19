# Auditoria das skills novas (2026-10-29)

Lista de origem: `Pasta1.xlsx` (11 skills; 10 instaladas) + Google Maps Scraper Kit. Cada repositório foi baixado e lido no commit abaixo; o script `scripts/instalar-skills.ps1` instala exatamente esses commits.

O que foi conferido em cada um: hooks e `settings.json` que se instalam sozinhos, scripts (`.py`, `.js`, `.sh`, `.ps1`), chamadas de rede, `eval`/código ofuscado, leitura de credenciais (`.ssh`, `.aws`, tokens), comandos `curl | bash`, licença.

| Skill (planilha) | Repositório @ commit | Agente | Resultado |
| --- | --- | --- | --- |
| Context Optimization | muratcankoylan/Agent-Skills-for-Context-Engineering @ 9ff0c99 | — | **Retirada** a pedido do André: segura, mas custa ≈4 mil tokens por chamada. |
| Skill Creator | anthropics/skills @ ca45fc4 | Todos | OK. Oficial da Anthropic. Scripts locais de avaliação. |
| Web Artifacts Builder | anthropics/skills @ ca45fc4 | Todos | OK. Oficial. O script `init-artifact.sh` instala pnpm/Vite/shadcn no projeto quando usado. |
| Theme Factory | anthropics/skills @ ca45fc4 | Leonardo | OK. Oficial, só texto e temas. |
| Superpowers | obra/superpowers @ 2ce8aa1 | Todos | OK. Instaladas 12 de 15 skills. **Fora:** `using-git-worktrees` e `finishing-a-development-branch` (fazem commit/merge, contra a regra "só o André commita") e `diagnosing-superpowers` (só serve ao plugin). O hook de início de sessão do plugin **não** é instalado. O servidor local do `brainstorming` só abre em 127.0.0.1 com chave. |
| Grill Me | mattpocock/skills @ a496f55 | Líder | OK. Atenção: `grill-me` tem `disable-model-invocation: true` (só você chama com `/grill-me`) e apenas redireciona para `grilling`. Por isso o Líder usa `grilling`, em modo autointerrogatório. |
| Find Skills | vercel-labs/skills @ 92a9a34 | Líder | OK. Ensina a usar `npx skills find/add`. Regra do Office: o Líder só pesquisa e sugere; não instala. |
| UI / UX Pro Max | nextlevelbuilder/ui-ux-pro-max-skill @ 28b3b8d | Leonardo | OK. Base de dados CSV + scripts Python locais de busca; sem rede. Pasta de testes do autor é removida na instalação. |
| Impeccable | pbakaus/impeccable @ 5e745ac | Leonardo | OK. Scripts de navegador falam só com `localhost` (servidor auxiliar da própria skill). `modern-screenshot` é biblioteca MIT conhecida. Licença Apache-2.0. |
| Taste Skill | leonxlnx/taste-skill @ 12af471 | Leonardo | OK. Scripts `.mjs` locais (lint/inspeção via Chrome DevTools). Só referencia Google Fonts. Maior skill da lista (~40 KB). |
| Agent Browser | vercel-labs/agent-browser @ tag v0.39.1 | Marina, Luis Felipe | OK. A skill é um atalho para o programa `agent-browser` (npm). Fixado na **0.39.1** (13/10); a 0.41.0 saiu hoje e não foi auditada. O `postinstall` baixa o binário do GitHub Releases oficial da Vercel. |
| Google Maps Scraper Kit | Mahanaicoach/google-maps-scraper-kit @ 656d66d | Marina | OK, com cuidados. Repositório novo (out/2026), mas o código é simples: Python só com biblioteca padrão, fala com o motor em `localhost:8080`, com o Nominatim (OpenStreetMap, para achar coordenadas) e com o site de cada empresa (para achar e-mail). O motor é a imagem Docker `gosom/google-maps-scraper:v1.18.1` (projeto open source conhecido), presa ao 127.0.0.1. O `.claude/settings.json` do kit pré-aprova comandos locais (docker compose, curl localhost, scripts do kit) e só vale dentro da pasta do kit. |

## Cuidados que continuam valendo
- **Termos do Google e LGPD:** raspar o Google Maps pode violar os termos de uso do Google, e o próprio projeto avisa isso. Use com moderação (um job por vez, `depth` baixo). Os dados são de empresas (B2B), mas e-mail e telefone de MEI podem ser dado pessoal: a Marina guarda só o necessário, fora de repositório público, e nunca envia nada sem a sua aprovação.
- Skills que já existiam com o mesmo nome são movidas para `~/.claude/skills-backup-<data>` antes de serem trocadas.

## Rodada 2 (tarde de 29/10): skills de segurança, UX e teste
| Skill | Repositório @ commit | Agente | Resultado |
| --- | --- | --- | --- |
| security-review | getsentry/skills @ d12f250 | Igor, Pedro | OK. Só texto (SKILL.md + 17 guias OWASP, 227 KB, carregados sob demanda). Método de pesquisar o código antes de reportar e só reportar achado de alta confiança. Os `eval(`/`curl \| bash` que aparecem nos guias são exemplos do que procurar. Licença do material: OWASP CC BY-SA. |
| find-bugs | getsentry/skills @ d12f250 | Luis Felipe, Lucas | OK. 1 arquivo de texto (~3 KB). |
| skill-scanner | getsentry/skills @ d12f250 | Pedro | OK. Script Python que só procura padrões suspeitos em skills (rede, shell, ofuscação); não executa o que escaneia. Substitui a `skill-security-auditor`, que nunca foi instalada. |
| frontend-design | anthropics/skills @ ca45fc4 | Leonardo | OK. Oficial, só texto. |
| webapp-testing | anthropics/skills @ ca45fc4 | Leonardo, Luis Felipe | OK. Oficial. `with_server.py` sobe o servidor do projeto e roda o comando que o agente informar (uso esperado). |

Fontes consultadas para as boas práticas: [regras de context engineering para a geração Claude 5](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) e [comparativo de skills de segurança](https://timonweb.com/ai/i-checked-5-security-skills-for-claude-code-only-one-is-worth-installing) (as skills de segurança populares eram cópias umas das outras; a do Sentry é a única com método).
