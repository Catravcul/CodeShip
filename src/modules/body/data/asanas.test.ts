import { describe, expect, it } from "vitest";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { JOINTS } from "../domain/skeleton";
import { ASANAS, ASANA_SEQUENCES, CODESHIP_REACHES, asanaById } from "./asanas";
import { COLD_SANCTUARY_ASANAS } from "./cold-sanctuary-asanas";

describe("Asana data brought over from Cold Sanctuary (scripts/asanas-from-cold-sanctuary.mjs)", () => {
  it("has its five sessions and every posture they use, with unique ids", () => {
    expect(ASANA_SEQUENCES.map((s) => s.id)).toEqual(["saludo-al-sol", "surya-namaskara-a", "ashtanga-primaria", "yoga-namaskar", "upa-yoga-cuello"]);
    expect(new Set(ASANAS.map((a) => a.id)).size).toBe(ASANAS.length);
    for (const s of ASANA_SEQUENCES) for (const step of s.steps) expect(asanaById(step.asana), `${s.id}: ${step.asana}`).toBeDefined();
  });

  it("names only joints the skeleton has, and hands or feet as reach ends", () => {
    for (const a of ASANAS) {
      for (const j of Object.keys(a.joints)) expect(JOINTS as readonly string[], `${a.id}: ${j}`).toContain(j);
      for (const r of a.reaches) expect(["HandLeft", "HandRight", "FootLeft", "FootRight"]).toContain(r.end);
    }
  });

  it("keeps Codeship's additions apart from the generated copy", () => {
    for (const id of Object.keys(CODESHIP_REACHES)) {
      const original = COLD_SANCTUARY_ASANAS.find((a) => a.id === id)!;
      expect(original, id).toBeDefined();
      expect(asanaById(id)!.reaches.length).toBe(original.reaches.length + CODESHIP_REACHES[id]!.length);
    }
  });

  it("every posture of Codeship's yoga sessions is one of these asanas", () => {
    for (const s of YOGA_SEQUENCES) for (const p of s.postures.value) expect(asanaById(p.asana), `${s.id}: ${p.name} → ${p.asana}`).toBeDefined();
  });
});
