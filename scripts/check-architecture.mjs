// Fails if domain or application code imports a rendering/input library or an adapter.
// Keeps the hexagonal rule enforceable in CI: the game's rules must not depend on Three.js or the DOM.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [/from\s+["']three/, /from\s+["'][./]*.*adapters\//, /from\s+["'][./]*.*\/ui\//, /\bdocument\./, /\bwindow\./];
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".ts") && (/[\\/](domain|application)[\\/]/.test(p) || p.startsWith("src/core"))) files.push(p);
  }
};
walk("src/modules");
// src/core is the shared kernel and must stay engine-free too.
walk("src/core");

const violations = files.flatMap((f) =>
  readFileSync(f, "utf8")
    .split("\n")
    .map((line, i) => ({ f, i: i + 1, line }))
    .filter(({ line }) => FORBIDDEN.some((r) => r.test(line))),
);
for (const v of violations) console.error(`${v.f}:${v.i}  ${v.line.trim()}`);
if (violations.length) {
  console.error(`\n${violations.length} architecture violation(s): domain/application must not depend on adapters, UI, Three.js or the DOM.`);
  process.exit(1);
}
console.log(`Architecture OK (${files.length} domain/application files checked).`);
