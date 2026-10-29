# Teste pequeno: o Office cria um site sozinho (preparado, não rodado)

Objetivo: ver o Office trabalhando de ponta a ponta sem você intervir, e conferir se **todos os agentes chamaram skills** e quanto isso custou em tokens.

## Antes de rodar (uma vez)
1. `powershell -ExecutionPolicy Bypass -File scripts\instalar-skills.ps1`
2. Docker Desktop aberto e `cd C:\Projetos\google-maps-scraper-kit ; docker compose up -d`
3. Na pasta do Office: `bun run hooks:install ; bun run agentes:aplicar`
4. Crie a pasta do teste: `mkdir C:\Projetos\teste-site-pme ; cd C:\Projetos\teste-site-pme ; git init`
5. Abra o Office no navegador (aba Skills aberta) e rode `claude --office` dentro de `C:\Projetos\teste-site-pme`.

## Pedido para colar no Líder
```
Teste autônomo pequeno. Não me pergunte nada, salvo questão crítica.
1. Marina: encontre 10 empresas de "clínica odontológica em Montes Claros MG" (depth 3, sem redes sociais) e classifique em A/B/C. Salve em .empresa/leads/.
2. Escolha UM lead classe A (sem site).
3. Leonardo: crie uma landing page de uma página para esse lead em ./site (HTML/CSS ou Vite, o que for mais simples), com nome, serviços genéricos, telefone, endereço, mapa e botão de WhatsApp. Sem dados inventados além de textos genéricos.
4. Luis Felipe testa no navegador (desktop e celular), Lucas revisa.
5. Entregue: caminho do site, print, lista de leads e a tabela SKILLS INVOCADAS de cada agente.
Nada de enviar mensagem para a empresa, commit ou deploy.
```

## O que conferir no fim
| Item | Onde ver | Passou se |
| --- | --- | --- |
| Toda tarefa chamou skill | Aba Skills do Office (usos por agente) | Cada agente que trabalhou tem uma skill da função + `verification-before-completion` |
| A trava funcionou | Relatório do Líder | Nenhuma entrega aceita sem `SKILLS INVOCADAS` |
| Leads | `.empresa/leads/*.csv` | 10 linhas (ou o que o Maps devolveu), cada uma com classe e motivo |
| Site | `./site` aberto no navegador | Abre, funciona no celular, sem texto em inglês ou dado inventado |
| Nada saiu do PC | Relatório da Marina | "nada foi enviado" |
| Custo | Barra de uso do Office | Anote os tokens totais para comparar com os testes antigos (benchmarks.md) |
