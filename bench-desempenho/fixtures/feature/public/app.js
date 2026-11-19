const list = document.getElementById("list");
const form = document.getElementById("form");
const titleInput = document.getElementById("title");

async function load() {
  const tasks = await (await fetch("/api/tasks")).json();
  list.replaceChildren();
  for (const t of tasks) {
    const li = document.createElement("li");
    if (t.done) li.className = "done";
    const box = document.createElement("input");
    box.type = "checkbox"; box.checked = t.done;
    box.addEventListener("change", async () => {
      await fetch(`/api/tasks/${t.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ done: box.checked }) });
      load();
    });
    const text = document.createElement("span");
    text.textContent = t.title;
    const del = document.createElement("button");
    del.textContent = "Excluir";
    del.addEventListener("click", async () => { await fetch(`/api/tasks/${t.id}`, { method: "DELETE" }); load(); });
    li.append(box, text, del);
    list.append(li);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: titleInput.value }) });
  titleInput.value = "";
  load();
});
load();
