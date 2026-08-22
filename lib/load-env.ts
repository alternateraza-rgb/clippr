import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Load .env.local / .env / worker/.env for CLI processes (tsx does not load Next env files). */
export function loadEnvFiles() {
  const root = process.cwd();
  applyEnvFile(resolve(root, ".env.local"));
  applyEnvFile(resolve(root, ".env"));
  applyEnvFile(resolve(root, "worker/.env"));
}

loadEnvFiles();
