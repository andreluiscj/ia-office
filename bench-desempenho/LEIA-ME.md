# Teste de desempenho: Office × Claude Code Sonnet comum

Dois lados, mesmo modelo (Sonnet), mesmo pedido, mesmos testes de aceite:
- **Claude Code Sonnet comum:** sem skills, sem slash commands e sem os agentes `empresa-*`.
- **Office:** `claude --agent empresa-lider` (Líder + equipe + skills pré-carregadas + trava de skills).

Tarefas (cada uma roda do zero numa pasta temporária):
- **A. Bug + testes:** corrigir `discount()` e adicionar testes.
- **B. Ticket de feature:** tags, prazo, filtros e paginação numa API + tela Node.js (44 checagens independentes: contrato, validações, segurança da tela, testes, README, sem dependências).

O que é medido por rodada: aceite (teste independente), tempo, custo, tokens, subagentes, chamadas reais da ferramenta Skill e modelos usados.

## Como rodar (PowerShell)
```
cd C:\Projetos\ia-office\bench-desempenho
bun run.ts --runs 2
```
- Dura em torno de 30 a 60 minutos e deve custar na faixa de US$ 8 a 20 em preço de tabela (no plano Pro/Max conta como uso do plano). Para um teste rápido: `bun run.ts --runs 1 --tasks feature`.
- Deixe o Office ligado (porta 7777) mostra os agentes trabalhando em tempo real.
- Resultado: `resultados\relatorio.md` (cole aqui para eu analisar) e `resultados\resultados.json`.
- Não use o PC para outras sessões do Claude Code durante o teste, para não misturar os números de uso.
