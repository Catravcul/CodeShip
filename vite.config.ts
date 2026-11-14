import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@modules": fileURLToPath(new URL("./src/modules", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts", "tools/**/*.test.mjs"], environment: "node" },
});
