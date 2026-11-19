import { describe, expect, it } from "vitest";
import { ICON_CATALOG } from "./icon-catalog";
import { ICON } from "./icons";

/** Every .ts file under src (not tests nor icons.ts), with its text (Vite's glob, so no Node types are needed). */
const RAW = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts", "!/src/ui/icons.ts"], { query: "?raw", import: "default", eager: true });
const sources = () => Object.entries(RAW).map(([file, text]) => ({ file: file.slice(1), text }));

describe("the icon catalog", () => {
  const files = sources();
  it("lists every icon, and only those", () => {
    expect(Object.keys(ICON_CATALOG).sort()).toEqual(Object.keys(ICON).sort());
  });
  it("says exactly which files use each icon, so a free one is really free", () => {
    for (const [k, e] of Object.entries(ICON_CATALOG)) {
      const used = files.filter((f) => new RegExp(`ICON\\.${k}\\b`).test(f.text)).map((f) => f.file).sort();
      expect([...new Set(e.usedIn.map((u) => u.file))].sort(), k).toEqual(used);
    }
  });
});
