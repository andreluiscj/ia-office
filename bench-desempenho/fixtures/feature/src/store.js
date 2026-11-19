// Armazenamento em memória das tarefas.
let seq = 0;
export function createStore() {
  const tasks = [];
  return {
    all: () => tasks,
    add(data) { const t = { id: ++seq, title: data.title, done: false, createdAt: new Date().toISOString() }; tasks.push(t); return t; },
    find: (id) => tasks.find((t) => t.id === id),
    remove(id) { const i = tasks.findIndex((t) => t.id === id); if (i < 0) return false; tasks.splice(i, 1); return true; },
  };
}
