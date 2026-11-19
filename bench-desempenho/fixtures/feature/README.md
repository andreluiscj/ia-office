# Tarefas

Lista de tarefas simples (Node.js 20+, sem dependências).

## Rodar
```
npm start      # http://localhost:3000
npm test
```

## API
| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | /api/tasks | – | 200, lista de tarefas |
| POST | /api/tasks | `{ "title": "..." }` | 201, tarefa criada; 400 sem título |
| PATCH | /api/tasks/:id | `{ "done": true }` | 200; 404 se não existir |
| DELETE | /api/tasks/:id | – | 204; 404 se não existir |

Tarefa: `{ id, title, done, createdAt }`.
