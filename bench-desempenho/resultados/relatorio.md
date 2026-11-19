# Desempenho: Office × Claude Code Sonnet comum

_Rodado em 2026-10-29 · 3 rodada(s) por tarefa e lado · modelo: Sonnet nos dois lados._

| Tarefa | Lado | Aceite total | Checagens passadas | Tempo | Custo | Tokens | Arquivos alterados | Subagentes | Chamadas de skill |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B. Ticket de feature (API + tela + testes + docs) | Claude Code Sonnet | 0/3 | 84% | 194s | $0.32 | 334k | 6.0 | 0.0 | 0.0 |
| B. Ticket de feature (API + tela + testes + docs) | Office | 2/3 | 86% | 138s | $0.54 | 875k | 6.3 | 0.7 | 3.3 |

## Resumo

| Métrica | Claude Code Sonnet | Office | Diferença |
|---|---:|---:|---:|
| Entregas 100% aceitas | 0/3 | 2/3 | – |
| Qualidade (checagens passadas) | 84% | 86% | – |
| Tempo médio | 194s | 138s | -29% |
| Custo médio | $0.32 | $0.54 | +70% |
| Tokens médios | 334k | 875k | +162% |
| Skills chamadas por tarefa | 0.0 | 3.3 | – |

## Rodadas

| Tarefa | Lado | # | Aceite | Checagens | Tempo | Custo | Skills chamadas | Modelos | Checagens que falharam |
|---|---|---:|---|---:|---:|---:|---|---|---|
| B. Ticket de feature (API + tela + testes + docs) | plain | 1 | não | 25/44 | 105s | $0.34 | nenhuma | claude-sonnet-5-5 | PATCH com due inválido => 400; PATCH com tags inválidas => 400; PATCH done continua funcionando; 404 em PATCH e DELETE de id inexistente; listagem no formato { items, page, limit, total }; padrão: página 1, 10 itens; terceira página traz o resto (total 27 => 7 itens); páginas em ordem crescente de id, sem repetir nem pular; page=0, page=abc, limit=0, limit=51 => 400; limit=50 aceito; filtro ?tag= (total filtrado correto: 1 + 12 = 13); filtro ?tag= ignora maiúsculas; filtro ?done=true (1 tarefa feita); filtro ?done=false; ?done=talvez => 400; ?overdue=true traz só pendentes vencidas (3); filtros combinados + paginação (12 ímpares: página 2 de 5 => 5 itens, total 12); DELETE continua 204 e reduz o total; pelo menos 10 testes no total (5 originais + 5 novos) |
| B. Ticket de feature (API + tela + testes + docs) | office | 1 | não | 26/44 | 127s | $0.49 | writing-plans, verification-before-completion | claude-sonnet-5-5 | PATCH com due inválido => 400; PATCH com tags inválidas => 400; PATCH done continua funcionando; 404 em PATCH e DELETE de id inexistente; listagem no formato { items, page, limit, total }; padrão: página 1, 10 itens; terceira página traz o resto (total 27 => 7 itens); páginas em ordem crescente de id, sem repetir nem pular; page=0, page=abc, limit=0, limit=51 => 400; limit=50 aceito; filtro ?tag= (total filtrado correto: 1 + 12 = 13); filtro ?tag= ignora maiúsculas; filtro ?done=true (1 tarefa feita); filtro ?done=false; ?done=talvez => 400; ?overdue=true traz só pendentes vencidas (3); filtros combinados + paginação (12 ímpares: página 2 de 5 => 5 itens, total 12); DELETE continua 204 e reduz o total |
| B. Ticket de feature (API + tela + testes + docs) | plain | 2 | não | 43/44 | 83s | $0.25 | nenhuma | claude-sonnet-5-5 | pelo menos 10 testes no total (5 originais + 5 novos) |
| B. Ticket de feature (API + tela + testes + docs) | office | 2 | sim | 44/44 | 119s | $0.53 | writing-plans, test-driven-development, verification-before-completion, verification-before-completion | claude-sonnet-5-5 |  |
| B. Ticket de feature (API + tela + testes + docs) | plain | 3 | não | 43/44 | 395s | $0.36 | nenhuma | claude-sonnet-5-5 | pelo menos 10 testes no total (5 originais + 5 novos) |
| B. Ticket de feature (API + tela + testes + docs) | office | 3 | sim | 44/44 | 168s | $0.59 | writing-plans, test-driven-development, verification-before-completion, verification-before-completion | claude-sonnet-5-5 |  |

## Como ler

- Aceite = teste independente que nenhum dos lados vê (`acceptance-*.mjs`).
- Custo = preço de tabela (`total_cost_usd`); em plano Pro/Max aparece como uso do plano.
- Tokens = entrada + cache + saída, somados de todos os modelos e subagentes.
- Skills = chamadas reais da ferramenta Skill, contadas no registro da sessão (skills pré-carregadas não entram nessa conta).
- Poucas rodadas: use como indício, não como prova. Rode mais com `--runs 5`.
- Os arquivos gerados ficam nas pastas temporárias de cada rodada (coluna dir em `resultados.json`); o registro bruto está em `resultados/*.jsonl`.
