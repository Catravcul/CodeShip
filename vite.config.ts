import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

/** The build's label (short commit and date), shown in the mat's settings so a player can tell which version runs. */
function buildLabel(): string {
  const git = (cmd: string) => {
    try {
      return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      return "";
    }
  };
  const hash = git("git rev-parse --short HEAD") || "sin-git";
  const date = git("git log -1 --format=%cs") || new Date().toISOString().slice(0, 10);
  return `${hash} · ${date}`;
}

export default defineConfig({
  define: { __BUILD_LABEL__: JSON.stringify(buildLabel()) },
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@modules": fileURLToPath(new URL("./src/modules", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts", "tools/**/*.test.mjs"], environment: "node" },
});
