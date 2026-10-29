# Sua equipe de agentes

Cada agente do Office é **um arquivo só**, em `company/agents/`. Tudo sobre ele fica ali: nome, cargo, aparência no escritório e todo o conhecimento (as instruções que ele segue).

| Arquivo | Papel |
|---|---|
| `agents/empresa-lider.md` | Líder (sessão principal do `claude --office`) |
| `agents/empresa-arquiteto.md` | Arquiteto e pesquisador |
| `agents/empresa-backend.md` | Backend e dados |
| `agents/empresa-frontend.md` | Frontend e UX |
| `agents/empresa-qa.md` | QA e testes |
| `agents/empresa-seguranca.md` | Segurança |
| `agents/empresa-revisor.md` | Code review |
| `agents/empresa-marketing.md` | Marketing e prospecção de leads (PMEs) |

Configuração geral em `empresa.json`: nome da empresa, **seu nome** (`usuario`; se ficar vazio, usa o `user.name` do Git) e os setores.

## Como editar um agente

1. Abra o arquivo dele em qualquer editor.
2. Mude o que quiser:
   - **Topo do arquivo, bloco "Como o agente aparece no Office"**: `nome`, `cargo`, `setor`, `resumo` e as cores (`cor` da roupa, `cabelo`, `pele`).
   - **Bloco "Configuração do Claude Code"**: `description` (quando o Claude chama esse agente), `model` (`sonnet`, `opus`, `haiku` ou `inherit`), `color`, `disallowedTools`. Não mude o `name`: é o id do agente.
   - **Texto abaixo do segundo `---`**: o conhecimento do agente. Escreva regras, padrões do seu time, tecnologias preferidas, o que ele pode ou não fazer.
3. Rode `bun run agentes:aplicar` (ou só abra `claude --office`, que aplica sozinho).

O Office mostra o nome novo na hora; o Claude Code passa a usar as instruções novas na próxima sessão.

## Nomes que se atualizam sozinhos

Nos textos você pode escrever marcadores que viram o nome atual de cada um:

`{{usuario}}` `{{empresa}}` `{{lider}}` `{{arquiteto}}` `{{backend}}` `{{frontend}}` `{{qa}}` `{{seguranca}}` `{{revisor}}` `{{marketing}}`

Assim, se você trocar o nome do Arquiteto de "Joaquim" para "Marina" no arquivo dele, todos os outros agentes passam a chamá-la de Marina, sem precisar editar mais nada.

Para ver a equipe atual e onde está cada arquivo: `bun run agentes`.

> Edite sempre os arquivos daqui (`company/agents`). Os arquivos em `~/.claude/agents` são gerados a partir deles e são sobrescritos ao aplicar.
