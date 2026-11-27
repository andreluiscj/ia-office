// Obsidian: detecta se está instalado, quais cofres ele conhece e guarda o cofre que o Office abre.
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { getMeta, setMeta } from "./db";

const cfgDir = () => platform() === "win32" ? join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "obsidian")
  : platform() === "darwin" ? join(homedir(), "Library", "Application Support", "obsidian") : join(homedir(), ".config", "obsidian");

const exePaths = () => platform() === "win32"
  ? [join(process.env.LOCALAPPDATA ?? "", "Programs", "Obsidian", "Obsidian.exe"), join(process.env.ProgramFiles ?? "", "Obsidian", "Obsidian.exe")]
  : platform() === "darwin" ? ["/Applications/Obsidian.app"] : ["/usr/bin/obsidian", "/opt/Obsidian/obsidian", "/var/lib/flatpak/app/md.obsidian.Obsidian"];

const norm = (p: string) => resolve(p).replace(/[\/]+$/, "").toLowerCase();

/** Cofres que o próprio Obsidian conhece (obsidian.json). */
function registered(): { path: string; open: boolean }[] {
  try {
    const j = JSON.parse(readFileSync(join(cfgDir(), "obsidian.json"), "utf8"));
    return Object.values<any>(j.vaults ?? {}).filter(v => typeof v?.path === "string").map(v => ({ path: v.path, open: !!v.open }));
  } catch { return []; }
}

export function obsidianStatus() {
  const vaults = registered();
  const installed = exePaths().some(p => p && existsSync(p)) || existsSync(join(cfgDir(), "obsidian.json"));
  const saved = getMeta("obsidian_vault");
  const vault = saved ?? vaults.find(v => v.open)?.path ?? vaults[0]?.path ?? null;
  // o Obsidian só abre pastas que estão dentro de um cofre que ele conhece
  const known = !!vault && vaults.some(v => norm(vault) === norm(v.path) || norm(vault).startsWith(norm(v.path) + (platform() === "win32" ? "\\" : "/")));
  return { installed, vault, known, vaults: vaults.map(v => v.path) };
}

export function setObsidianVault(path: string) {
  const p = resolve(String(path ?? "").trim().replace(/^"(.*)"$/, "$1"));
  try { if (!statSync(p).isDirectory()) return { error: "That is not a folder." }; } catch { return { error: "Folder not found." }; }
  setMeta("obsidian_vault", p);
  return { ok: true, ...obsidianStatus() };
}
