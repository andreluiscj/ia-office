# Office: agente de marketing + skills obrigatórias (2026-10-29)

## Como aplicar (PowerShell)
Extraia este zip e copie por cima da pasta do Office:
```
Expand-Archive -Force $HOME\Downloads\office-marketing-skills.zip $env:TEMP\oms
Copy-Item -Recurse -Force $env:TEMP\oms\office-marketing-skills\* C:\Projetos\ia-office\
cd C:\Projetos\ia-office
powershell -ExecutionPolicy Bypass -File scripts\instalar-skills.ps1 -SoConferir   # confere antes
powershell -ExecutionPolicy Bypass -File scripts\instalar-skills.ps1               # instala
bun run hooks:install
bun run agentes:aplicar
```

## O que mudou
- `company/agents/empresa-marketing.md` (novo): Marina, Marketing e Prospecção.
- `company/agents/*.md` (7 agentes): Regra nº 1 no topo (sempre invocar skill pela ferramenta Skill, sem interpretação), tabela de skills obrigatórias por situação, `SKILLS INVOCADAS` em todo relatório; o Líder e o Revisor devolvem entrega sem skill.
- `hooks/exigir-skill.ts` (novo) + `scripts/install-hooks.ts`: trava que impede agente da equipe de encerrar a tarefa sem ter chamado skill.
- `scripts/instalar-skills.ps1` (novo): instala as skills da planilha nos commits auditados.
- `company/empresa.json`, `company/README.md`, `public/office.js`: setor Marketing e Vendas e mesa fixa da Marina.
- **Rodada 2 (29/10 tarde):** todos os agentes (inclusive Líder, Arquiteto e Segurança) agora são Sonnet por padrão, com Opus só como exceção justificada; skills pré-carregadas no arquivo de cada agente (`skills:`), primeira ação obrigatória = chamar a skill da função, e pedido do Líder ao especialista já leva essa ordem. Novo `bench-desempenho/` (Office × Claude Code Sonnet comum, tarefas de desenvolvimento).
- `docs/AUDITORIA-SKILLS-2026-10-29.md` e `docs/TESTE-SITE-AUTONOMO.md`.

## Commits (só você roda)
```
git add company/agents/empresa-marketing.md company/empresa.json company/README.md public/office.js
git commit -m "feat: agente de marketing (Marina) para prospectar PMEs" -m "Busca e qualifica leads com a skill google-maps-scraper; nunca envia contato sem aprovação. Mesa fixa no escritório e setor Marketing e Vendas."
git add company/agents/office-ceo.md company/agents/empresa-arquiteto.md company/agents/empresa-backend.md company/agents/empresa-frontend.md company/agents/empresa-qa.md company/agents/empresa-seguranca.md company/agents/empresa-revisor.md hooks/exigir-skill.ts scripts/install-hooks.ts
git commit -m "feat: skills obrigatórias em toda tarefa" -m "Regra nº 1 em todos os agentes (skill da função e verification-before-completion), portão no Líder e no Revisor e hook que barra encerramento sem skill."
git add scripts/instalar-skills.ps1 docs/AUDITORIA-SKILLS-2026-10-29.md docs/TESTE-SITE-AUTONOMO.md
git commit -m "feat: instalador das skills novas com commits auditados" -m "Inclui a auditoria de cada skill e o roteiro do teste de site autônomo."
git push
```

## Commits da rodada 2 (só você roda)
```
git add company/agents scripts hooks
git commit -m "feat: Sonnet como padrão e skills pré-carregadas em todos os agentes" -m "Líder, Arquiteto e Segurança passam a Sonnet (Opus só por exceção). Cada agente pré-carrega verification-before-completion e a skill da função; primeira ação obrigatória é chamar a skill."
git add bench-desempenho
git commit -m "test: benchmark de desempenho Office x Claude Code Sonnet" -m "Duas tarefas (bug com testes, site de PME) com aceite independente; mede tempo, custo, tokens, subagentes e chamadas de skill."
git push
```
Depois de copiar os arquivos: `bun run agentes:aplicar` e então `cd bench-desempenho ; bun run.ts --runs 2`.

## Rodada 3: foco em entrega de desenvolvimento (segura e com boa UX)
- Todos os agentes foram enxugados e reorganizados: Regra nº 1 compacta, tabela de skills reais por situação, bloco "Entrega de qualidade" por função (robustez e segurança no Igor, UX/acessibilidade/segurança de tela no Leonardo, matriz de abuso no Luis Felipe, alta confiança no Pedro, revisão contra o pedido no Lucas, desenho com modelo de ameaça no Joaquim) e um bloco único "Padrões da equipe" no lugar de quatro seções repetidas.
- Líder: Definição de pronto (7 itens) e Fluxo por tamanho; sem subagente em tarefa de código passa a ser falha.
- Pré-carga de skills reduzida às leves (verification, grilling, find-bugs, TDD) para não pesar nos tokens; as pesadas são chamadas sob demanda.
- Instalador: + security-review, find-bugs, skill-scanner (getsentry), frontend-design, webapp-testing (anthropics), todas em commits auditados.
```
git add company/agents scripts/instalar-skills.ps1 docs
git commit -m "feat: agentes enxutos com entrega segura e UX, novas skills de segurança e teste" -m "Regra de skills compacta, bloco de qualidade por função, definição de pronto e fluxo por tamanho no Líder, instalador com security-review, find-bugs, skill-scanner, frontend-design e webapp-testing."
git push
```
Depois: `powershell -ExecutionPolicy Bypass -File scripts\instalar-skills.ps1`, `bun run agentes:aplicar` e `cd bench-desempenho ; bun run.ts --runs 3 --tasks feature` para comparar com a última rodada (Office: 86%, US$ 0,54, 875k tokens).
