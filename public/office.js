// Office: o andar da empresa em pixel art.
// Como um escritório de verdade: salas privativas (Líder, Arquiteto, Segurança, Code Review) e sala de reunião
// no fundo, um salão aberto com ilhas de mesas por equipe, copa e uma área comum com sofás.
// Quem recebe uma tarefa caminha até a própria mesa; quem está livre vai para a área comum.
import { ago, esc, shortName, live, renderUsage } from "./common.js";

const canvas = document.getElementById("office");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const tipEl = document.getElementById("tip");
const detailEl = document.getElementById("detail");
const bannerEl = document.getElementById("banner");

// ---------------------------------------------------------------- mapa
const T = 16;                 // tamanho do tile em pixels do mundo
const MW = 40, MH = 20;       // mapa em tiles
const WORLD_W = MW * T, WORLD_H = MH * T;

const COLORS = { working: "#5ee07a", waiting: "#ffcc4d", idle: "#7aa2c8", done: "#9a8fb0" };
const LABEL = { working: "Trabalhando", waiting: "Esperando você", idle: "Disponível", done: "Concluiu" };
const FLOOR_BY_SETOR = {
  diretoria: ["#8c5a46", "#80523f"], produto: ["#c8a06a", "#bf9762"], engenharia: ["#8fa3b8", "#879bb0"],
  qualidade: ["#b98a8a", "#b08282"], operacoes: ["#9fb08a", "#97a882"], reuniao: ["#8b8da0", "#83859a"],
};

// Mapa de bloqueios: 0 livre, 1 parede, 2 móvel, 3 vidro
const grid = Array.from({ length: MH }, () => new Array(MW).fill(0));
const block = (x, y, v = 2) => { if (x >= 0 && y >= 0 && x < MW && y < MH) grid[y][x] = v; };
const rect = (x0, y0, x1, y1, v = 2) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) block(x, y, v); };

// paredes externas
rect(0, 0, MW - 1, 0, 1); rect(0, MH - 1, MW - 1, MH - 1, 1);
rect(0, 0, 0, MH - 1, 1); rect(MW - 1, 0, MW - 1, MH - 1, 1);

// fileira de salas no fundo (y 1..5) com frente de vidro em y 6
const ROOMS = [
  { owner: "diretor", x0: 1, x1: 8, door: 6 },
  { owner: "empresa-arquiteto", x0: 10, x1: 15, door: 13 },
  { owner: "empresa-seguranca", x0: 17, x1: 22, door: 20 },
  { owner: "empresa-revisor", x0: 24, x1: 29, door: 27 },
  { owner: "reuniao", x0: 31, x1: 38, door: 34, meeting: true },
];
rect(1, 6, MW - 2, 6, 3);
for (const x of [9, 16, 23, 30]) rect(x, 1, x, 6, 1);
for (const r of ROOMS) block(r.door, 6, 0);

// lugares de trabalho (cadeiras). owner = id do funcionário; null = mesa livre
const SEATS = [];
const seat = (owner, x, y, dir, kind, extra = {}) => {
  const s = { owner, x, y, dir, sit: true, desk: true, kind, who: null, ...extra };
  SEATS.push(s); return s;
};

// salas privativas: mesa de 3 tiles, cadeira atrás dela
for (const r of ROOMS) {
  if (r.meeting) continue;
  const cx = r.owner === "diretor" ? 3 : Math.floor((r.x0 + r.x1) / 2);
  r.desk = { x: cx - 1, y: 3, w: 3 };
  rect(cx - 1, 3, cx + 1, 3);
  r.seat = seat(r.owner, cx, 2, "down", "private", { room: r });
  r.shelf = { x: r.x0, y: 1 }; r.plant = { x: r.x1, y: 1 };
  block(r.shelf.x, r.shelf.y); block(r.plant.x, r.plant.y);
}
// sofá da Diretoria
const DIR_SOFA = { x: 7, y: 4, w: 2 }; rect(7, 4, 8, 4);
// sala de reunião
const MEETING = ROOMS[4];
MEETING.table = { x: 32, y: 3, w: 6, h: 2 }; rect(32, 3, 37, 4);
block(31, 1); rect(38, 1, 38, 3); // planta e quadro branco

// salão aberto: ilhas de 4 mesas (2 de frente para 2) com divisória
const CLUSTERS = [
  { key: "eng", label: "Engenharia e Testes", xs: [4, 6], top: 9, color: "#4a90e2",
    owners: ["empresa-backend", "empresa-frontend", "empresa-qa", null] },
  { key: "prod", label: "Mesas livres", xs: [11, 13], top: 9, color: "#9aa0b4", owners: [null, null, null, null] },
  { key: "hot", label: "Terceirizados", xs: [18, 20], top: 9, color: "#9aa0b4", owners: [null, null, null, null] },
];
for (const c of CLUSTERS) {
  const [a, b] = c.xs;
  rect(a - 1, c.top + 1, b + 1, c.top + 2);
  const kind = c.key === "hot" ? "hot" : "cluster";
  c.seats = [
    seat(c.owners[0], a, c.top, "down", kind, { cluster: c, row: 0 }),
    seat(c.owners[1], b, c.top, "down", kind, { cluster: c, row: 0 }),
    seat(c.owners[2], a, c.top + 3, "up", kind, { cluster: c, row: 1 }),
    seat(c.owners[3], b, c.top + 3, "up", kind, { cluster: c, row: 1 }),
  ];
}
const HOT_SEATS = CLUSTERS[2].seats;

// copa, estantes e impressora no salão
const ELEVATOR = { x: 1, y: 15 };
const furniture = {
  counter: { x: 12, y: 18, w: 5, h: 1 },
  bistro: { x: 20, y: 16, w: 1, h: 1 },
  shelves: { x: 2, y: 18, w: 3, h: 1 },
  printer: { x: 7, y: 18, w: 1, h: 1 },
  // área comum
  sofaTop: { x: 28, y: 9, w: 4, h: 1 }, sofaBottom: { x: 28, y: 12, w: 4, h: 1 },
  coffeeTable: { x: 29, y: 10, w: 2, h: 2 },
  armL: { x: 27, y: 10, w: 1, h: 1 }, armR: { x: 32, y: 11, w: 1, h: 1 },
  pingpong: { x: 34, y: 14, w: 3, h: 2 },
  beanTable: { x: 29, y: 16, w: 1, h: 1 },
};
for (const f of Object.values(furniture)) rect(f.x, f.y, f.x + f.w - 1, f.y + f.h - 1);
const plants = [{ x: 1, y: 8 }, { x: 23, y: 8 }, { x: 1, y: 18 }, { x: 23, y: 18 }, { x: 25, y: 9 }, { x: 25, y: 12 }, { x: 25, y: 15 }, { x: 26, y: 18 }, { x: 38, y: 18 }];
for (const p of plants) block(p.x, p.y);
const cooler = { x: 38, y: 16 }; block(cooler.x, cooler.y);

// lugares de quem está livre (dir = para onde olha)
const SPOTS = [
  ...[13, 14, 15].map(x => ({ x, y: 17, dir: "down", kind: "cafe" })),
  { x: 19, y: 16, dir: "right", kind: "cafe" }, { x: 21, y: 16, dir: "left", kind: "cafe" },
  ...[28, 29, 30, 31].map(x => ({ x, y: 9, dir: "down", sit: true, kind: "sofa" })),
  ...[28, 29, 30, 31].map(x => ({ x, y: 12, dir: "up", sit: true, kind: "sofa" })),
  { x: 27, y: 10, dir: "right", sit: true, kind: "sofa" }, { x: 32, y: 11, dir: "left", sit: true, kind: "sofa" },
  { x: 28, y: 16, dir: "right", sit: true, kind: "puff" }, { x: 30, y: 16, dir: "left", sit: true, kind: "puff" },
  ...[33, 34, 35, 36].map(x => ({ x, y: 2, dir: "down", sit: true, kind: "reuniao" })),
  ...[32, 37].map(x => ({ x, y: 5, dir: "up", sit: true, kind: "reuniao" })),
  { x: 33, y: 14, dir: "right", kind: "pingpong" }, { x: 37, y: 15, dir: "left", kind: "pingpong" },
  { x: 37, y: 16, dir: "right", kind: "agua" }, { x: 37, y: 2, dir: "right", kind: "quadro" }, { x: 38, y: 9, dir: "right", kind: "janela" }, { x: 38, y: 12, dir: "right", kind: "janela" },
].map(s => ({ ...s, who: null }));

const walkable = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && grid[y][x] === 0;

/** Caminho mais curto (BFS em 4 direções) até o tile de destino, que pode ser um assento. */
function findPath(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  const prev = new Map(), key = (x, y) => y * MW + x;
  const q = [[sx, sy]]; prev.set(key(sx, sy), null);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k)) continue;
      const goal = nx === tx && ny === ty;
      if (!goal && !walkable(nx, ny)) continue;
      prev.set(k, [x, y]);
      if (goal) {
        const path = []; let cur = [nx, ny];
        while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift({ x: cur[0], y: cur[1] }); cur = prev.get(key(cur[0], cur[1])); }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return [];
}

// ---------------------------------------------------------------- desenho estático (pré-renderizado)
const bg = document.createElement("canvas"); bg.width = WORLD_W; bg.height = WORLD_H;
const fg = document.createElement("canvas"); fg.width = WORLD_W; fg.height = WORLD_H;
const objects = [];   // móveis desenhados por profundidade (ordenados com as pessoas)

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
  return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

let roster = null;   // preenchido no primeiro refresh
const memberById = id => roster?.funcionarios.find(f => f.id === id);
function roomSetor(r) {
  if (r.meeting) return "reuniao";
  if (r.owner === "diretor") return "diretoria";
  return memberById(r.owner)?.setor ?? "produto";
}

function renderStatic() {
  const b = bg.getContext("2d"), f = fg.getContext("2d");
  b.clearRect(0, 0, WORLD_W, WORLD_H); f.clearRect(0, 0, WORLD_W, WORLD_H); objects.length = 0;
  const P = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

  // pisos
  for (let y = 7; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const px = x * T, py = y * T;
    if (y === 7 || x === 25 || x === 24) {           // corredor
      P(b, px, py, T, T, "#cdbfa6"); P(b, px, py, T, 1, "#bfb096"); P(b, px, py, 1, T, "#bfb096");
    } else if (x < 24) {                              // carpete do salão
      P(b, px, py, T, T, (x + y) % 2 ? "#5f6984" : "#5a647e");
      if ((x * 7 + y * 3) % 5 === 0) P(b, px + 5, py + 9, 2, 1, "#6a7592");
    } else {                                          // madeira da área comum
      P(b, px, py, T, T, (x + (y % 2) * 2) % 4 < 2 ? "#a8794b" : "#a07246");
      P(b, px, py + T - 1, T, 1, "#8a6038"); if ((x + y) % 4 === 0) P(b, px + T - 1, py, 1, T, "#8a6038");
    }
  }
  // salas
  for (const r of ROOMS) {
    const [c1, c2] = FLOOR_BY_SETOR[roomSetor(r)];
    for (let y = 1; y <= 5; y++) for (let x = r.x0; x <= r.x1; x++) P(b, x * T, y * T, T, T, (x + y) % 2 ? c1 : c2);
    if (r.desk) P(b, (r.desk.x) * T - 4, 1 * T + 6, r.desk.w * T + 8, 3 * T - 6, shade(c1, -0.12));
  }
  // tapetes
  const rug = (x, y, w, h, c1, c2) => { P(b, x * T + 4, y * T + 4, w * T - 8, h * T - 8, c1); P(b, x * T + 8, y * T + 8, w * T - 16, h * T - 16, c2); };
  rug(26, 8, 8, 6, "#3d5a80", "#4a6a94");
  rug(27, 15, 5, 3, "#6b3e5c", "#7b4a6b");
  for (const c of CLUSTERS) { const [a, bb] = c.xs; P(b, (a - 1) * T - 4, c.top * T - 4, (bb - a + 3) * T + 8, 4 * T + 8, "rgba(0,0,0,0.10)"); }

  // paredes e vidro
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const v = grid[y][x], px = x * T, py = y * T;
    if (v === 1) {
      const floorBelow = y + 1 < MH && grid[y + 1][x] !== 1 && grid[y + 1][x] !== 3;
      P(b, px, py, T, T, "#2e2a3d"); P(b, px, py, T, 3, "#48425e");
      if (floorBelow) { P(b, px, py + 6, T, T - 6, "#5b5577"); P(b, px, py + T - 3, T, 3, "#3a354d"); }
    } else if (v === 3) {
      P(b, px, py + 2, T, T - 4, "#9fd0e8"); P(b, px, py + 2, T, 2, "#3a354d"); P(b, px, py + T - 4, T, 2, "#3a354d");
      P(b, px + 3, py + 5, 2, 4, "#e4f6ff"); P(b, px + 7, py + 5, 1, 3, "#e4f6ff");
      if (x % 3 === 0) P(b, px + T - 1, py + 2, 1, T - 4, "#3a354d");
    }
  }
  // portas
  for (const r of ROOMS) {
    const px = r.door * T, py = 6 * T;
    P(b, px, py, T, T, "#cdbfa6"); P(b, px - 1, py, 2, T, "#3a2a20"); P(b, px + T - 1, py, 2, T, "#3a2a20");
  }
  // elevador
  P(b, 0, ELEVATOR.y * T, T, 2 * T, "#8d97a6"); P(b, 2, ELEVATOR.y * T + 2, T - 6, 2 * T - 4, "#b8c0cc");
  P(b, T / 2 - 1, ELEVATOR.y * T + 2, 1, 2 * T - 4, "#5e6675"); P(b, T - 4, ELEVATOR.y * T + 14, 2, 3, "#ffcc4d");
  // janelas
  for (const r of ROOMS) for (let x = r.x0 + 1; x < r.x1; x += 3) { P(b, x * T + 2, 3, 2 * T - 4, 8, "#8ecae6"); P(b, x * T + 3, 4, 4, 2, "#d6f1ff"); }
  for (const y of [8, 10, 12, 14]) { P(b, (MW - 1) * T + 3, y * T + 1, 10, T + 6, "#8ecae6"); P(b, (MW - 1) * T + 4, y * T + 3, 3, 5, "#d6f1ff"); }
  for (const x of [4, 9, 18, 28, 34]) { P(b, x * T + 2, (MH - 1) * T + 6, 2 * T - 4, 7, "#8ecae6"); P(b, x * T + 3, (MH - 1) * T + 7, 4, 2, "#d6f1ff"); }
  // quadro branco na sala de reunião
  { const wx = 38 * T + 3; P(b, wx, 1 * T + 2, 10, 3 * T, "#000"); P(b, wx + 1, 1 * T + 3, 8, 3 * T - 2, "#f2eee3");
    P(b, wx + 3, 1 * T + 8, 1, 14, "#4a90e2"); P(b, wx + 5, 1 * T + 6, 1, 22, "#e8664a"); P(b, wx + 3, 2 * T + 14, 4, 6, "#3f9b4b"); }

  // ---- móveis
  const obj = (x, y, w, h, draw, extra = {}) => { draw(f); objects.push({ x, y, w, h, bottom: y + h, ...extra }); };
  // cadeiras
  const chair = (tx, ty, col, dir = "down") => {
    const x = tx * T, y = ty * T;
    if (dir === "down") { P(b, x + 2, y - 2, 12, 9, "#000"); P(b, x + 3, y - 1, 10, 7, col); P(b, x + 3, y + 8, 10, 5, shade(col, -0.25)); }
    else { P(b, x + 3, y + 3, 10, 9, "#000"); P(b, x + 4, y + 4, 8, 7, shade(col, -0.2)); }
  };
  for (const s of SEATS) chair(s.x, s.y, s.owner === "diretor" ? "#4a2f22" : s.kind === "hot" ? "#4d5262" : "#4d4566", s.dir);
  for (const sp of SPOTS) if (sp.kind === "reuniao") chair(sp.x, sp.y, "#5a4a6a", sp.dir);

  // mesas das salas privativas (o monitor é dinâmico)
  for (const r of ROOMS) {
    if (!r.desk) continue;
    const x = r.desk.x * T, y = r.desk.y * T, w = 3 * T, dir = r.owner === "diretor";
    obj(x, y - 2, w, T + 2, c => {
      P(c, x, y - 2, w, 12, "#000");
      P(c, x + 1, y - 1, w - 2, 7, dir ? "#6b3e26" : "#b07a43");
      P(c, x + 1, y + 6, w - 2, 3, dir ? "#4e2c1b" : "#7a5230");
      P(c, x + 2, y + 10, 3, 5, "#4a2f1a"); P(c, x + w - 5, y + 10, 3, 5, "#4a2f1a");
      P(c, x + 4, y + 1, 4, 3, "#e8eef5"); P(c, x + w - 12, y + 1, 8, 4, "#f2eee3");
    }, { seat: r.seat });
    shelfAt(f, r.shelf.x, r.shelf.y, obj);
    plantAt(f, r.plant.x, r.plant.y, obj);
  }
  plantAt(f, 31, 1, obj);
  // sofá da Diretoria
  { const x = DIR_SOFA.x * T, y = DIR_SOFA.y * T, w = DIR_SOFA.w * T;
    obj(x, y, w, T, c => { P(c, x, y - 2, w, T + 2, "#000"); P(c, x + 1, y - 1, w - 2, 5, "#8a3f3a"); P(c, x + 1, y + 4, w - 2, 10, "#b5544d"); P(c, x + 3, y + 5, 7, 4, "#d9605c"); P(c, x + w - 10, y + 5, 7, 4, "#d9605c"); }); }
  // mesa de reunião
  { const fu = MEETING.table, x = fu.x * T, y = fu.y * T, w = fu.w * T, h = fu.h * T;
    obj(x, y, w, h, c => {
      P(c, x + 2, y + 2, w - 4, h - 4, "#000"); P(c, x + 3, y + 3, w - 6, h - 10, "#8a5a36"); P(c, x + 3, y + h - 7, w - 6, 4, "#6b4428");
      for (const k of [0, 1, 2, 3]) P(c, x + 14 + k * 20, y + 10, 8, 6, "#f2eee3");
      P(c, x + w / 2 - 3, y + 16, 6, 4, "#3f9b4b");
    }); }
  // ilhas de mesas: desenhadas a cada quadro (monitores acendem)
  for (const c of CLUSTERS) {
    const [a, bb] = c.xs;
    objects.push({ x: a * T - 8, y: (c.top + 1) * T - 2, w: (bb - a) * T + 32, h: 2 * T + 2, bottom: (c.top + 3) * T - 1, cluster: c });
  }
  // copa
  { const fu = furniture.counter, x = fu.x * T, y = fu.y * T, w = fu.w * T;
    obj(x, y, w, T, c => {
      P(c, x, y + 1, w, T - 1, "#000"); P(c, x + 1, y + 2, w - 2, 5, "#e8e2d6"); P(c, x + 1, y + 7, w - 2, T - 8, "#6b4a33");
      P(c, x + 6, y - 7, 10, 12, "#2b2b35"); P(c, x + 8, y - 5, 6, 3, "#e8664a"); P(c, x + 9, y, 4, 2, "#d0d0d8");
      P(c, x + 24, y - 3, 14, 7, "#c9c3dc"); P(c, x + 26, y - 2, 10, 4, "#1d1d28");
      P(c, x + 48, y + 2, 3, 3, "#f2eee3"); P(c, x + 54, y + 2, 3, 3, "#f2eee3"); P(c, x + 62, y + 1, 8, 4, "#3f9b4b");
    }); }
  { const fu = furniture.bistro, x = fu.x * T, y = fu.y * T;
    obj(x, y, T, T, c => { P(c, x + 2, y + 2, 12, 8, "#000"); P(c, x + 3, y + 3, 10, 6, "#e8e2d6"); P(c, x + 7, y + 10, 2, 5, "#2b2b35"); P(c, x + 5, y + 4, 3, 3, "#7a4e38"); }); }
  for (let k = 0; k < furniture.shelves.w; k++) shelfAt(f, furniture.shelves.x + k, furniture.shelves.y, obj);
  { const x = furniture.printer.x * T, y = furniture.printer.y * T;
    obj(x, y, T, T, c => { P(c, x + 1, y + 1, 14, 14, "#000"); P(c, x + 2, y + 2, 12, 12, "#d0d0d8"); P(c, x + 3, y + 3, 10, 3, "#8d97a6"); P(c, x + 4, y + 8, 8, 2, "#f2eee3"); P(c, x + 11, y + 11, 2, 2, "#5ee07a"); }); }
  // sofás da área comum: o assento fica no fundo; o encosto de baixo fica na frente de quem senta
  { const fu = furniture.sofaTop, x = fu.x * T, y = fu.y * T, w = fu.w * T;
    P(b, x, y - 4, w, T + 4, "#000"); P(b, x + 1, y - 3, w - 2, 7, "#c0504d"); P(b, x + 1, y + 4, w - 2, 11, "#d9605c"); }
  { const fu = furniture.sofaBottom, x = fu.x * T, y = fu.y * T, w = fu.w * T;
    P(b, x, y, w, T, "#000"); P(b, x + 1, y + 1, w - 2, T - 2, "#d9605c");
    objects.push({ x, y: y + 9, w, h: 7, bottom: y + T + 6 });
    P(f, x, y + 9, w, 7, "#000"); P(f, x + 1, y + 10, w - 2, 5, "#c0504d"); }
  for (const [fu, side] of [[furniture.armL, "right"], [furniture.armR, "left"]]) {
    const x = fu.x * T, y = fu.y * T;
    P(b, x, y, T, T, "#000"); P(b, x + 1, y + 1, T - 2, T - 2, "#d9605c"); P(b, side === "right" ? x + 1 : x + T - 6, y + 1, 5, T - 2, "#c0504d");
  }
  for (const sp of SPOTS) if (sp.kind === "puff") { const x = sp.x * T, y = sp.y * T; P(b, x + 2, y + 4, 12, 11, "#000"); P(b, x + 3, y + 5, 10, 9, sp.x < 29 ? "#ffcc4d" : "#5ee07a"); }
  { const fu = furniture.coffeeTable, x = fu.x * T, y = fu.y * T;
    obj(x, y + 4, 2 * T, 2 * T - 4, c => { P(c, x + 2, y + 4, 2 * T - 4, 2 * T - 8, "#000"); P(c, x + 3, y + 5, 2 * T - 6, 2 * T - 12, "#7a5230"); P(c, x + 10, y + 10, 4, 3, "#f2eee3"); P(c, x + 18, y + 14, 6, 4, "#4a90e2"); }); }
  { const fu = furniture.beanTable, x = fu.x * T, y = fu.y * T;
    obj(x, y, T, T, c => { P(c, x + 2, y + 4, 12, 9, "#000"); P(c, x + 3, y + 5, 10, 7, "#7a5230"); P(c, x + 6, y + 6, 4, 3, "#f2eee3"); }); }
  // pingue-pongue
  { const fu = furniture.pingpong, x = fu.x * T, y = fu.y * T, w = fu.w * T, h = fu.h * T;
    obj(x, y, w, h, c => { P(c, x + 1, y + 2, w - 2, h - 4, "#000"); P(c, x + 2, y + 3, w - 4, h - 8, "#2a7d4f"); P(c, x + w / 2 - 1, y + 3, 2, h - 8, "#f2eee3"); P(c, x + 2, y + h / 2 - 1, w - 4, 1, "#f2eee3"); P(c, x + 3, y + h - 5, 3, 4, "#333"); P(c, x + w - 6, y + h - 5, 3, 4, "#333"); }, { pingpong: true }); }
  for (const p of plants) plantAt(f, p.x, p.y, obj);
  { const x = cooler.x * T, y = cooler.y * T;
    obj(x, y, T, T, c => { P(c, x + 4, y - 6, 8, 7, "#9fd3ff"); P(c, x + 3, y + 1, 10, 14, "#e8eef5"); P(c, x + 6, y + 5, 2, 2, "#4a90e2"); P(c, x + 9, y + 5, 2, 2, "#e8664a"); }); }
}

function shelfAt(f, tx, ty, obj) {
  const sx = tx * T, sy = ty * T;
  obj(sx, sy, T, T, c => {
    c.fillStyle = "#5a3a20"; c.fillRect(sx + 1, sy, T - 2, T);
    c.fillStyle = "#3a2414"; c.fillRect(sx + 2, sy + 1, T - 4, T - 2);
    for (const [yy, cols] of [[2, ["#e8664a", "#4a90e2", "#ffcc4d"]], [8, ["#6cc04a", "#9b5de5", "#f2eee3"]]])
      cols.forEach((col, k) => { c.fillStyle = col; c.fillRect(sx + 3 + k * 3, sy + yy, 2, 5); });
  });
}

function plantAt(f, tx, ty, obj) {
  const x = tx * T, y = ty * T;
  obj(x, y, T, T, c => {
    const P = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
    P(4, 9, 8, 7, "#b5562f"); P(3, 8, 10, 2, "#8f3f1f");
    P(5, 0, 6, 9, "#3f9b4b"); P(2, 3, 4, 5, "#2f7d3a"); P(10, 2, 4, 5, "#2f7d3a"); P(6, -3, 4, 4, "#5cbf6a");
  });
}

// ---------------------------------------------------------------- pessoas
const people = new Map();      // key -> pessoa
let data = null, clockSkew = 0;
const tileCenter = (tx, ty) => ({ x: tx * T + T / 2, y: ty * T + T - 3 });

function makePerson(key, kind, look, start) {
  const p = {
    key, kind, look, d: null, x: 0, y: 0, tx: start.x, ty: start.y, path: [], dir: "down", sit: false,
    goal: null, spot: null, wanderAt: 0, walkPhase: 0, leaving: false, seed: [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7),
    bubble: null,
  };
  const c = tileCenter(start.x, start.y); p.x = c.x; p.y = c.y;
  people.set(key, p);
  return p;
}

function releaseSpot(p) { if (p.spot) { p.spot.who = null; p.spot = null; } }

function goTo(p, target, { instant = false } = {}) {
  p.goal = target;
  if (instant) {
    const c = tileCenter(target.x, target.y); p.x = c.x; p.y = c.y; p.tx = target.x; p.ty = target.y;
    p.path = []; p.sit = !!target.sit; p.dir = target.dir ?? "down";
    return;
  }
  p.sit = false;
  p.path = findPath(p.tx, p.ty, target.x, target.y);
}

function pickSpot(p, avoid) {
  const free = SPOTS.filter(s => !s.who && s !== avoid);
  if (!free.length) return null;
  // prefere lugares perto de outras pessoas (puxar conversa) mas com variedade
  const s = free[Math.floor(Math.random() * free.length)];
  releaseSpot(p); s.who = p.key; p.spot = s;
  return s;
}

function busyOf(p) {
  if (p.kind === "diretor") return p.d.sessions.length > 0;
  if (p.kind === "member") return p.d.status === "working";
  return p.d?.status === "working";
}

/** Mesa de trabalho: a própria; se não tiver (agente novo), uma mesa livre. */
function workSeat(p) {
  if (p.seat) return p.seat;
  let s = SEATS.find(x => x.owner === p.key);
  if (!s) {
    const present = new Set(["diretor", ...(data?.funcionarios ?? []).map(f => f.id)]);
    s = SEATS.find(x => !x.who && (x.owner === null || !present.has(x.owner)));
    if (s) s.who = p.key;
  }
  p.seat = s ?? null;
  return p.seat;
}

function decide(p, now, first) {
  if (p.leaving) return;
  const busy = busyOf(p);
  if (p.kind === "freelancer") {
    if (busy && !p.spot) {
      const seat = HOT_SEATS.find(s => !s.who) ?? SEATS.find(s => !s.who && s.owner === null);
      if (seat) { seat.who = p.key; p.spot = seat; goTo(p, seat); }
    } else if (!busy) {
      releaseSpot(p); p.leaving = true; goTo(p, ELEVATOR);
    }
    return;
  }
  if (busy) {
    const s = workSeat(p);
    if (s && p.goal !== s) { releaseSpot(p); goTo(p, s, { instant: first }); }
    return;
  }
  // mesa emprestada (livre ou de alguém que saiu do quadro) volta a ficar livre
  if (p.seat && p.seat.owner !== p.key) { p.seat.who = null; p.seat = null; }
  const atDesk = !!p.goal?.desk;
  if (!p.goal || atDesk || (now > p.wanderAt && !p.path.length)) {
    if (!atDesk && p.goal && Math.random() < 0.45) { p.wanderAt = now + 6000 + Math.random() * 10000; return; }
    const s = pickSpot(p, p.spot);
    if (s) goTo(p, s, { instant: first });
    p.wanderAt = now + 9000 + Math.random() * 16000;
  }
}

function syncPeople(first) {
  const now = performance.now();
  const dir = data.diretor;
  let p = people.get("diretor");
  if (!p) p = makePerson("diretor", "diretor", { cor: dir.cor, cabelo: dir.cabelo, pele: dir.pele }, ROOMS[0].seat);
  p.d = dir;
  for (const f of data.funcionarios) {
    let m = people.get(f.id);
    if (!m) m = makePerson(f.id, "member", { cor: f.cor, cabelo: f.cabelo, pele: f.pele }, SEATS.find(s => s.owner === f.id) ?? ELEVATOR);
    m.d = f;
  }
  const freeKeys = new Set(data.freelancers.map(f => f.id));
  for (const f of data.freelancers) {
    let m = people.get(f.id);
    if (!m && f.status === "working") m = makePerson(f.id, "freelancer", { cor: "#9aa0b4", cabelo: "#000", pele: "#7b7b8b" }, ELEVATOR);
    if (m) m.d = f;
  }
  for (const m of people.values()) {
    if (m.kind === "freelancer" && !freeKeys.has(m.key)) m.d = { ...(m.d ?? {}), status: "gone" };
    decide(m, now, first);
  }
}

function update(dt, now) {
  for (const p of [...people.values()]) {
    if (!p.path.length) {
      if (p.leaving && p.tx === ELEVATOR.x && p.ty === ELEVATOR.y) { people.delete(p.key); continue; }
      if (data && !p.leaving) decide(p, now, false);
      continue;
    }
    const next = p.path[0], c = tileCenter(next.x, next.y);
    const dx = c.x - p.x, dy = c.y - p.y, dist = Math.hypot(dx, dy);
    const step = 42 * dt;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    p.walkPhase += step;
    if (dist <= step) {
      p.x = c.x; p.y = c.y; p.tx = next.x; p.ty = next.y; p.path.shift();
      if (!p.path.length && p.goal) { p.sit = !!p.goal.sit; p.dir = p.goal.dir ?? p.dir; }
    } else { p.x += dx / dist * step; p.y += dy / dist * step; }
  }
}


// ---------------------------------------------------------------- sprites
function px(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

function drawPerson(p, t) {
  const walking = p.path.length > 0;
  const frame = walking ? Math.floor(p.walkPhase / 5) % 4 : 0;
  const bob = walking && (frame === 1 || frame === 3) ? -1 : 0;
  const sitDrop = p.sit ? 4 : 0;
  const x = Math.round(p.x - 6), y = Math.round(p.y - 20 + bob + sitDrop);
  const { cor: shirt, cabelo: hair, pele: skin } = p.look;
  const pants = "#2e3148", shoes = "#1d1d28";
  const robot = p.kind === "freelancer";
  const working = busyOf(p) && p.sit;

  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(Math.round(p.x - 5), Math.round(p.y - 1), 10, 3);

  // pernas
  if (!p.sit) {
    const l = frame === 1 ? -1 : frame === 3 ? 1 : 0;
    if (p.dir === "left" || p.dir === "right") {
      px(x + 3 + l, y + 16, 3, 4, pants); px(x + 6 - l, y + 16, 3, 4, shade(pants, -0.2));
      px(x + 3 + l, y + 19, 3, 1, shoes); px(x + 6 - l, y + 19, 3, 1, shoes);
    } else {
      px(x + 3, y + 16 + (l < 0 ? -1 : 0), 3, 4, pants); px(x + 6, y + 16 + (l > 0 ? -1 : 0), 3, 4, pants);
      px(x + 3, y + 19 + (l < 0 ? -1 : 0), 3, 1, shoes); px(x + 6, y + 19 + (l > 0 ? -1 : 0), 3, 1, shoes);
    }
  } else {
    px(x + 3, y + 16, 6, 2, pants);
  }

  if (robot) {
    const col = busyOf(p) ? "#5ee07a" : "#9aa0b4";
    px(x + 5, y - 2, 1, 2, "#7b7b8b"); px(x + 4, y - 4, 3, 2, Math.floor(t / 300) % 2 ? col : "#555");
    px(x + 2, y, 8, 8, "#b8c0cc"); px(x + 3, y + 3, 6, 3, "#1d1d28");
    if (p.dir !== "up") px(x + 3 + (Math.floor(t / 120) % 6), y + 3, 1, 3, col);
    px(x + 1, y + 8, 10, 8, "#8d97a6"); px(x + 5, y + 10, 2, 2, col);
    px(x, y + 9, 1, 5, "#7b7b8b"); px(x + 11, y + 9, 1, 5, "#7b7b8b");
    return;
  }

  // tronco e braços
  const armSwing = walking ? (frame === 1 ? 1 : frame === 3 ? -1 : 0) : 0;
  px(x + 1, y + 9, 10, 8, shirt);
  if (p.kind === "diretor" && p.dir !== "up") { px(x + 5, y + 9, 2, 2, "#f2eee3"); px(x + 5, y + 11, 2, 4, "#1d1d28"); }
  else if (p.dir !== "up") px(x + 5, y + 9, 2, 1, "#f2eee3");
  const arm = shade(shirt, -0.3);
  if (p.dir === "left" || p.dir === "right") {
    const ax = p.dir === "right" ? x + 5 : x + 5;
    px(ax + armSwing, y + 10, 2, 5, arm); px(ax + armSwing, y + 15, 2, 1, skin);
  } else if (working) {
    const k = Math.floor(t / 110 + p.seed) % 2;
    px(x, y + 10, 1, 4, arm); px(x + 11, y + 10, 1, 4, arm);
    px(x - 1, y + 14 - k, 2, 2, skin); px(x + 11, y + 13 + k, 2, 2, skin);
  } else {
    px(x, y + 10 + armSwing, 1, 5, arm); px(x + 11, y + 10 - armSwing, 1, 5, arm);
    px(x, y + 15 + armSwing, 1, 1, skin); px(x + 11, y + 15 - armSwing, 1, 1, skin);
  }

  // cabeça
  if (p.dir === "up") {
    px(x + 2, y, 8, 9, hair); px(x + 1, y + 1, 10, 6, hair);
  } else if (p.dir === "left" || p.dir === "right") {
    const r = p.dir === "right";
    px(x + 2, y + 2, 8, 7, skin);
    px(x + 2, y, 8, 3, hair); px(r ? x + 2 : x + 6, y + 1, 4, 5, hair);
    px(r ? x + 8 : x + 3, y + 4, 1, 2, "#1d1d28");
    px(r ? x + 10 : x + 1, y + 5, 1, 2, skin);
  } else {
    px(x + 2, y, 8, 3, hair); px(x + 1, y + 1, 10, 3, hair);
    px(x + 2, y + 3, 8, 6, skin);
    px(x + 1, y + 3, 1, 3, hair); px(x + 10, y + 3, 1, 3, hair);
    const blink = (Math.floor(t / 150) + p.seed) % 41 === 0;
    if (!blink) { px(x + 4, y + 5, 1, 2, "#1d1d28"); px(x + 7, y + 5, 1, 2, "#1d1d28"); }
    if (p.kind === "diretor" && p.d?.sessions.some(s => s.status === "waiting")) px(x + 5, y + 8, 2, 1, shade(skin, -0.45));
  }
}

const workerAt = s => [...people.values()].find(q => q.goal === s && q.sit && !q.path.length && busyOf(q));

function drawMonitor(s, t) {
  const p = workerAt(s);
  const x = s.x * T + 1, y = (s.y + 1) * T - 8;
  px(x - 1, y - 1, 16, 11, "#000");
  px(x, y, 14, 9, p ? "#d9d9e6" : "#a9a9b8");
  px(x + 5, y + 9, 4, 2, "#555");
  if (p) px(x + 6, y + 3, 2, 2, Math.floor(t / 250) % 2 ? p.look.cor : shade(p.look.cor, 0.5));
}

/** Ilha de 4 mesas com divisória colorida da equipe. */
function drawCluster(c, t) {
  const [a, b] = c.xs, x = a * T - 8, w = (b - a) * T + 32, y = (c.top + 1) * T - 2, h = 2 * T + 2;
  px(x, y, w, h, "#000");
  px(x + 1, y + 1, w - 2, T - 1, "#b07a43");               // fileira de cima
  px(x + 1, y + T + 2, w - 2, T - 4, "#b07a43");           // fileira de baixo
  px(x + 1, y + 2 * T - 2, w - 2, 3, "#7a5230");           // borda da frente
  px(x + 1, y + T - 2, w - 2, 4, c.color);                 // divisória
  px(x + 1, y + T - 2, w - 2, 1, shade(c.color, 0.35));
  for (const s of c.seats) {
    const p = workerAt(s) ?? (c.key === "hot" ? null : null);
    const on = !!p, col = p ? p.look.cor : "#5ee07a";
    if (s.row === 0) {                                     // monitor virado para baixo (vemos a tela)
      const mx = s.x * T + 1, my = (c.top + 1) * T - 6;
      px(mx - 1, my - 1, 16, 11, "#000"); px(mx, my, 14, 9, on ? "#d9d9e6" : "#a9a9b8");
      if (on) px(mx + 6, my + 3, 2, 2, Math.floor(t / 250 + s.x) % 2 ? col : shade(col, 0.5));
      px(mx + 1, (c.top + 1) * T + 6, 6, 3, "#e8eef5");    // teclado
    } else {                                               // monitor de costas
      const mx = s.x * T + 1, my = (c.top + 2) * T + 1;
      px(mx - 1, my - 1, 16, 9, "#000"); px(mx, my, 14, 7, "#3a3a48");
      if (on) px(mx + 1, my, 12, 1, shade(col, 0.4));
      px(mx + 9, (c.top + 2) * T + 9, 5, 3, "#f2eee3");    // papéis
    }
  }
}

// ---------------------------------------------------------------- câmera (zoom e arrastar)
const view = { scale: 2, ox: 0, oy: 0, fitted: false };
let dpr = 1, cw = 0, ch = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  cw = stage.clientWidth;
  ch = Math.max(360, Math.min(window.innerHeight - stage.getBoundingClientRect().top - 52, cw * WORLD_H / WORLD_W + 8));
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
  if (!view.fitted) fit();
  clampView();
}
function fit() {
  view.scale = Math.min(cw / WORLD_W, ch / WORLD_H);
  view.ox = (cw - WORLD_W * view.scale) / 2; view.oy = (ch - WORLD_H * view.scale) / 2;
}
function clampView() {
  const w = WORLD_W * view.scale, h = WORLD_H * view.scale;
  view.ox = w <= cw ? (cw - w) / 2 : Math.min(0, Math.max(cw - w, view.ox));
  view.oy = h <= ch ? (ch - h) / 2 : Math.min(0, Math.max(ch - h, view.oy));
}
function zoomAt(f, sx, sy) {
  const min = Math.min(cw / WORLD_W, ch / WORLD_H), max = 6;
  const ns = Math.max(min, Math.min(max, view.scale * f));
  view.ox = sx - (sx - view.ox) * (ns / view.scale); view.oy = sy - (sy - view.oy) * (ns / view.scale);
  view.scale = ns; view.fitted = true; clampView();
}
const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale });
const toScreen = (wx, wy) => ({ x: wx * view.scale + view.ox, y: wy * view.scale + view.oy });

// ---------------------------------------------------------------- textos e balões (em pixels de tela)
function label(str, sx, sy, { size = 15, color = "#f2eee3", bg = null, font = "Pixelify Sans", align = "center" } = {}) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${size * dpr}px "${font}", monospace`; ctx.textAlign = align; ctx.textBaseline = "bottom";
  const w = ctx.measureText(str).width;
  if (bg) {
    const bx = align === "center" ? sx * dpr - w / 2 : sx * dpr;
    ctx.fillStyle = "#000"; ctx.fillRect(bx - 4 * dpr, sy * dpr - size * dpr - 1 * dpr, w + 8 * dpr, size * dpr + 3 * dpr);
    ctx.fillStyle = bg; ctx.fillRect(bx - 3 * dpr, sy * dpr - size * dpr, w + 6 * dpr, size * dpr + 1 * dpr);
  } else { ctx.fillStyle = "#000"; ctx.fillText(str, sx * dpr + dpr, sy * dpr + dpr); }
  ctx.fillStyle = color; ctx.fillText(str, sx * dpr, sy * dpr);
  ctx.restore();
  return w / dpr;
}
const textW = (str, size) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = `${size * dpr}px "Pixelify Sans", monospace`; const w = ctx.measureText(str).width / dpr; ctx.restore(); return w; };

function bubbleFor(p, t) {
  if (p.kind === "diretor" && p.d?.sessions.some(s => s.status === "waiting")) return { text: "!", bg: "#ffcc4d", color: "#1b1a26" };
  if (busyOf(p) && p.sit) {
    const tool = p.kind === "member" ? p.d.active[0]?.current_tool : p.d.current_tool;
    if (tool && Math.floor((t + p.seed) / 3000) % 3 === 0) return { text: shortName(tool), bg: "#f2eee3", color: "#1b1a26" };
    return null;
  }
  if (!p.path.length && p.spot) {
    const cyc = Math.floor((t + p.seed * 7) / 2500) % 6;
    if (p.spot.kind === "cafe" && cyc === 0) return { text: "☕", bg: "#f2eee3", color: "#1b1a26" };
    if ((p.spot.kind === "sofa" || p.spot.kind === "reuniao") && cyc === 1) {
      const near = [...people.values()].some(o => o !== p && !o.path.length && Math.abs(o.tx - p.tx) + Math.abs(o.ty - p.ty) <= 2);
      if (near) return { text: "...", bg: "#f2eee3", color: "#1b1a26" };
    }
  }
  return null;
}

// ---------------------------------------------------------------- quadro
let hover = null, selected = null;

function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#15141e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const s = view.scale * dpr;
  ctx.setTransform(s, 0, 0, s, view.ox * dpr, view.oy * dpr);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);

  // móveis + pessoas, do fundo para a frente
  const items = objects.map(o => ({ k: o.bottom, o }));
  for (const p of people.values()) items.push({ k: p.y - (p.sit ? 6 : 0), p });
  items.sort((a, b) => a.k - b.k);
  for (const it of items) {
    if (it.p) { drawPerson(it.p, t); continue; }
    const o = it.o;
    if (o.cluster) { drawCluster(o.cluster, t); continue; }
    ctx.drawImage(fg, o.x, o.y - 8, o.w, o.h + 8, o.x, o.y - 8, o.w, o.h + 8);
    if (o.seat) drawMonitor(o.seat, t);
    if (o.pingpong) {
      const [a, b] = SPOTS.filter(s => s.kind === "pingpong");
      const pa = a.who && people.get(a.who), pb = b.who && people.get(b.who);
      if (pa && pb && !pa.path.length && !pb.path.length) {
        const f = (t / 700) % 2, k = f < 1 ? f : 2 - f;
        const bx = o.x + 4 + k * (o.w - 8), by = o.y + 8 + Math.sin(k * Math.PI) * -6 + k * 10;
        px(bx, by, 2, 2, "#ffffff");
      }
    }
  }

  // conexões: Diretor -> quem está trabalhando
  const dir = people.get("diretor");
  const links = [...people.values()].filter(p => p !== dir && busyOf(p) && p.sit && !p.path.length);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (dir && busyOf(dir)) {
    const a = toScreen(dir.x, dir.y - 14);
    links.forEach((p, i) => {
      const b = toScreen(p.x, p.y - 14);
      ctx.strokeStyle = p.look.cor; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t / 40;
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 30 - i * 4;
      ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      const f = ((t / 1600) + i * 0.17) % 1, q = 1 - f;
      const dx = q * q * a.x + 2 * q * f * mx + f * f * b.x, dy = q * q * a.y + 2 * q * f * my + f * f * b.y;
      ctx.fillStyle = "#fff"; ctx.fillRect(dx - 2, dy - 2, 4, 4);
    });
  }

  // conversas entre agentes: linha dourada de quem mandou para quem recebeu (some em 25 s)
  const nowMs = Date.now() - clockSkew;
  (data?.links ?? []).forEach((l, i) => {
    const pa = people.get(l.from), pb = people.get(l.to);
    if (!pa || !pb) return;
    const age = (nowMs - l.ts) / 1000;
    if (age > 25) return;
    const a = toScreen(pa.x, pa.y - 16), b = toScreen(pb.x, pb.y - 16);
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 50 - (i % 4) * 8;
    ctx.globalAlpha = Math.max(0.25, 1 - age / 25);
    ctx.strokeStyle = "#ffcc4d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
    // envelope viajando do remetente ao destinatário
    const f = ((t / 1400) + i * 0.23) % 1, q = 1 - f;
    const ex = q * q * a.x + 2 * q * f * mx + f * f * b.x, ey = q * q * a.y + 2 * q * f * my + f * f * b.y;
    ctx.fillStyle = "#fffaf0"; ctx.fillRect(ex - 6, ey - 4, 12, 8);
    ctx.strokeStyle = "#1b1a26"; ctx.lineWidth = 1.5; ctx.strokeRect(ex - 6, ey - 4, 12, 8);
    ctx.beginPath(); ctx.moveTo(ex - 6, ey - 4); ctx.lineTo(ex, ey + 1); ctx.lineTo(ex + 6, ey - 4); ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // placas das salas e das áreas
  const z = view.scale, plate = Math.max(10, Math.min(15, z * 5));
  for (const r of ROOMS) {
    const m = memberById(r.owner);
    const name = r.meeting ? "Sala de reunião" : r.owner === "diretor" ? `${data?.diretor.nome ?? "Claude"} · Líder` : m ? `${m.nome} · ${m.cargo}` : "";
    const pos = toScreen((r.x0 + r.x1 + 1) / 2 * T, T - 1);
    if (z >= 1.4) label(name, pos.x, pos.y, { size: plate, color: "#f2eee3" });
  }
  if (z >= 1.4) {
    const area = (txt, wx, wy, size = Math.max(10, z * 4.2), color = "#e9d8a6") => { const p = toScreen(wx, wy); label(txt, p.x, p.y, { size, font: "Silkscreen", color }); };
    for (const c of CLUSTERS) area(c.label.toUpperCase(), (c.xs[0] + c.xs[1] + 1) / 2 * T, (c.top + 4) * T + 13, Math.max(9, z * 3.4), "#c9d3ea");
    area("ÁREA COMUM", 32.5 * T, MH * T - 3);
    area("COPA", 14.5 * T, MH * T - 3);
  }
  const ep = toScreen(1 * T + 2, (ELEVATOR.y + 2) * T + 10); if (z >= 1.8) label("elevador", ep.x, ep.y, { size: 11, color: "#e9e4f5", align: "left" });

  // nomes e balões sobre as pessoas
  // etiquetas que se encostariam sobem um degrau
  const placed = [];
  const sorted = [...people.values()].sort((a, b) => b.y - a.y);
  for (const p of sorted) {
    const head = toScreen(p.x, p.y - 22 + (p.sit ? 4 : 0));
    const name = p.kind === "freelancer" ? p.d?.name ?? "terceirizado" : p.d.nome;
    const st = p.kind === "diretor" ? p.d.status : p.kind === "member" ? p.d.status : (busyOf(p) ? "working" : "done");
    if (z >= 1.6 || hover === p.key || selected === p.key) {
      const w = textW(name, 12) + 10;
      let ty = head.y - 2;
      for (let k = 0; k < 6; k++) {
        const hit = placed.some(r => Math.abs(r.x - head.x) < (r.w + w) / 2 && Math.abs(r.y - ty) < 17);
        if (!hit) break; ty -= 17;
      }
      placed.push({ x: head.x, y: ty, w });
      if (ty !== head.y - 2) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(head.x, ty, 1, head.y - ty); }
      label(name, head.x, ty, { size: 12, color: hover === p.key || selected === p.key ? "#ffcc4d" : "#f2eee3", bg: "rgba(21,20,30,0.85)" });
      ctx.fillStyle = "#000"; ctx.fillRect(head.x - 3, head.y - 2, 7, 7);
      ctx.fillStyle = COLORS[st] ?? "#888"; ctx.fillRect(head.x - 2, head.y - 1, 5, 5);
    }
    const bub = bubbleFor(p, t);
    if (bub) label(bub.text, head.x + 16, head.y - 18, { size: 12, color: bub.color, bg: bub.bg });
    if (selected === p.key) {
      const f = toScreen(p.x, p.y);
      ctx.strokeStyle = "#ffcc4d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, 9 * z, 3.5 * z, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- interação
function personAt(sx, sy) {
  const w = toWorld(sx, sy);
  let best = null, bd = 1e9;
  for (const p of people.values()) {
    const dx = w.x - p.x, dy = w.y - (p.y - 10);
    if (Math.abs(dx) < 8 && Math.abs(dy) < 13) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p; } }
  }
  return best;
}

let drag = null;
canvas.addEventListener("pointerdown", e => {
  drag = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", e => {
  const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) { view.ox = drag.ox + dx; view.oy = drag.oy + dy; view.fitted = true; clampView(); canvas.classList.add("dragging"); }
  }
  const p = personAt(sx, sy);
  hover = p?.key ?? null;
  canvas.style.cursor = drag?.moved ? "grabbing" : p ? "pointer" : "grab";
  if (p && !drag?.moved) {
    tipEl.hidden = false;
    tipEl.innerHTML = tipHtml(p);
    tipEl.style.left = `${Math.min(sx + 16, cw - tipEl.offsetWidth - 8)}px`;
    tipEl.style.top = `${Math.max(8, sy - tipEl.offsetHeight - 12)}px`;
  } else tipEl.hidden = true;
});
canvas.addEventListener("pointerup", e => {
  const r = canvas.getBoundingClientRect();
  if (drag && !drag.moved) { const p = personAt(e.clientX - r.left, e.clientY - r.top); selected = p?.key ?? null; renderDetail(p); }
  drag = null; canvas.classList.remove("dragging");
});
canvas.addEventListener("pointerleave", () => { hover = null; tipEl.hidden = true; });
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
document.getElementById("zoomIn").onclick = () => zoomAt(1.25, cw / 2, ch / 2);
document.getElementById("zoomOut").onclick = () => zoomAt(1 / 1.25, cw / 2, ch / 2);
document.getElementById("zoomFit").onclick = () => { view.fitted = false; fit(); };

function statusOf(p) {
  if (p.kind === "freelancer") return busyOf(p) ? "working" : "done";
  return p.d.status;
}
function whereOf(p) {
  if (p.path.length) return busyOf(p) ? "indo para a sala" : "andando";
  if (p.sit && p.goal?.desk) return p.goal.kind === "private" ? "na própria sala" : p.goal.kind === "hot" ? "nas mesas livres" : "na própria mesa";
  const k = p.spot?.kind;
  return { cafe: "na copa", sofa: "no sofá", puff: "nos pufes", reuniao: "na sala de reunião", quadro: "no quadro branco", pingpong: "no pingue-pongue", agua: "no bebedouro", janela: "na janela" }[k] ?? "na área comum";
}
function tipHtml(p) {
  const st = statusOf(p);
  const role = p.kind === "diretor" ? "Líder" : p.kind === "member" ? p.d.cargo : "terceirizado";
  const name = p.kind === "freelancer" ? p.d?.name : p.d.nome;
  const proj = p.kind === "member" ? p.d.active.map(a => a.project).join(", ") : p.kind === "diretor" ? [...new Set(p.d.sessions.map(s => s.project))].join(", ") : p.d?.project;
  return `<b>${esc(name)}</b> · ${esc(role)}<br><span style="color:${COLORS[st]}">${LABEL[st] ?? st}</span> · ${esc(whereOf(p))}${proj ? `<br>${esc(proj)}` : ""}`;
}

const MODEL_COLORS = { opus: "#d97757", sonnet: "#7aa2c8", haiku: "#6cc04a", fable: "#9b5de5" };
const modelName = m => m ? m.charAt(0).toUpperCase() + m.slice(1) : "";
function modelsHtml(d) {
  const now = d.model_now ? `<dt>Modelo agora</dt><dd><b style="color:${MODEL_COLORS[d.model_now] ?? "#fff"}">${esc(modelName(d.model_now))}</b></dd>` : "";
  const list = d.models ?? [];
  const bars = list.length
    ? `<div class="models">${list.map(m => `<div class="m"><span>${esc(modelName(m.model))}</span><span class="bar"><i style="width:${m.pct}%;background:${MODEL_COLORS[m.model] ?? "#a49fbd"}"></i></span><span>${m.pct}%</span></div>`).join("")}</div>`
    : '<span class="muted">sem dados ainda</span>';
  return { now, bars };
}

const chips = list => list?.length
  ? `<div class="chips">${list.map(x => `<span class="chip" title="${esc(x.name)}">${esc(shortName(x.name))} <b>${x.count}</b></span>`).join("")}</div>`
  : '<span class="muted">nenhuma ainda</span>';

function renderDetail(p) {
  if (!p) { detailEl.hidden = true; selected = null; return; }
  const now = Date.now() - clockSkew;
  const st = statusOf(p);
  const pill = `<span class="pill" style="background:${COLORS[st]}">${esc(p.kind === "diretor" && st === "idle" ? "Sem projeto" : LABEL[st] ?? st)}</span>`;
  let body = "";
  if (p.kind === "diretor") {
    body = `<h3>${esc(p.d.nome)} · Líder</h3>
      <dl class="kv"><dt>Status</dt><dd>${pill}</dd><dt>Onde está</dt><dd>${esc(whereOf(p))}</dd>
      ${modelsHtml(p.d).now}
      <dt>Função</dt><dd>Sessão principal do Claude Code. Recebe seus pedidos, delega para a equipe e entrega o resultado.</dd></dl>
      <p class="muted" style="margin:14px 0 6px">Uso por modelo</p>${modelsHtml(p.d).bars}
      <p class="muted" style="margin:14px 0 6px">Projetos em andamento</p>
      ${p.d.sessions.length ? p.d.sessions.map(x => `<div class="chip" style="margin-bottom:6px">${esc(x.project)} · ${esc(LABEL[x.status] ?? x.status)}${x.task ? `<br><span class="muted">${esc(x.task)}</span>` : ""}</div>`).join("") : '<span class="muted">nenhum</span>'}`;
  } else if (p.kind === "member") {
    const f = p.d;
    body = `<h3>${esc(f.nome)} · ${esc(f.cargo)}</h3>
      <dl class="kv">
        <dt>Status</dt><dd>${pill}</dd>
        ${modelsHtml(f).now}
        <dt>Onde está</dt><dd>${esc(whereOf(p))}</dd>
        <dt>Setor</dt><dd>${esc(data.setores.find(x => x.id === f.setor)?.nome ?? f.setor)}</dd>
        <dt>Função</dt><dd>${esc(f.resumo)}</dd>
        ${f.active.map(a => `<dt>Agora</dt><dd>${esc(a.project)}${a.task ? ": " + esc(a.task) : ""}${a.current_tool ? `<br><span class="muted">usando ${esc(shortName(a.current_tool))}</span>` : ""}</dd>`).join("")}
        ${!f.active.length && f.last ? `<dt>Último trabalho</dt><dd>há ${ago(f.last.ts, now)} em ${esc(f.last.project)}${f.last.task ? ": " + esc(f.last.task) : ""}</dd>` : ""}
        <dt>Tarefas (7 dias)</dt><dd>${f.tasks7d}</dd>
        <dt>Agente</dt><dd><code>${esc(f.id)}</code></dd>
      </dl>
      <p class="muted" style="margin:14px 0 6px">Uso por modelo</p>${modelsHtml(f).bars}
      <p class="muted" style="margin:14px 0 6px">Skills mais usadas</p>${chips(f.skills)}
      <p class="muted" style="margin:14px 0 6px">Ferramentas mais usadas</p>${chips(f.tools)}`;
  } else {
    const f = p.d ?? {};
    body = `<h3>${esc(f.name)} · terceirizado</h3>
      <dl class="kv"><dt>Status</dt><dd>${pill}</dd><dt>Projeto</dt><dd>${esc(f.project)}</dd>
      ${f.task ? `<dt>Tarefa</dt><dd>${esc(f.task)}</dd>` : ""}${f.current_tool ? `<dt>Usando</dt><dd>${esc(shortName(f.current_tool))}</dd>` : ""}</dl>
      <p class="hint">Subagente que não faz parte do quadro da empresa (por exemplo, os embutidos do Claude Code).</p>`;
  }
  detailEl.hidden = false;
  detailEl.innerHTML = `<button class="close" aria-label="Fechar">×</button>${body}`;
  detailEl.querySelector(".close").onclick = () => { selected = null; detailEl.hidden = true; };
}

// ---------------------------------------------------------------- dados
function hookStatus(h) {
  if (!h?.lastHook) return "Os hooks ainda não mandaram nenhum evento: abra uma sessão nova do Claude Code.";
  return `Último sinal do Claude Code: há ${ago(h.lastHook.ts, Date.now() - clockSkew)}.`;
}
function renderBanner() {
  const d = data.diretor;
  const working = data.funcionarios.filter(f => f.status === "working");
  const projects = [...new Set(d.sessions.map(s => s.project))];
  bannerEl.hidden = false;
  bannerEl.innerHTML = !d.sessions.length && !working.length
    ? `<b>Nenhum projeto rodando.</b> A equipe está na área comum e na copa. ${hookStatus(data.health)}`
    : `<b>${working.length} de ${data.funcionarios.length} funcionários trabalhando.</b> ${projects.length ? `Projetos ativos: ${projects.map(esc).join(", ")}.` : ""}`;
}

// Barra de uso: os mesmos limites de Configurações › Uso do Claude (sessão de 5 h e semana).
const usageEl = document.getElementById("usage");

let firstSync = true;
async function refresh() {
  try {
    data = await (await fetch("/api/company")).json();
    clockSkew = Date.now() - data.now;
    if (!roster) { roster = { funcionarios: data.funcionarios }; renderStatic(); }
    renderBanner();
    renderUsage(usageEl, data.usage, clockSkew);
    syncPeople(firstSync); firstSync = false;
    if (selected) { const p = people.get(selected); if (p) renderDetail(p); }
  } catch (err) { console.error(err); }
}

// ---------------------------------------------------------------- início
document.getElementById("legend").innerHTML = ["working", "waiting", "idle"]
  .map(k => `<span><i class="dot" style="background:${COLORS[k]}"></i>${LABEL[k]}</span>`).join("")
  + `<span><i class="dot" style="background:#fff"></i>Tarefa do Líder</span>`
  + `<span><i class="dot" style="background:#ffcc4d"></i>Agentes conversando</span>`;
const connEl = document.getElementById("conn");
renderStatic();
resize();
window.addEventListener("resize", resize);
live(refresh, ok => { connEl.className = `conn ${ok ? "on" : "off"}`; connEl.textContent = ok ? "ao vivo" : "reconectando"; });

let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(loop);
})(last);
