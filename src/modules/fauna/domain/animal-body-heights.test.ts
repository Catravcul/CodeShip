import { describe, expect, it } from "vitest";
import { bodyPlan } from "./animal-body";

describe("the bodies of the heights (sanctuary 3's air biome)", () => {
  it("each wild goat has its own horns; the flying squirrel its membrane; the snow leopard its long tail", () => {
    const names = (id: string) => bodyPlan("cuadrupedo", id)!.map((p) => p.name);
    expect(names("ibice")).toContain("cuerno-izq-punta");
    expect(names("ibice")).toContain("barba");
    expect(names("markhor").filter((n) => n.startsWith("espiral")).length).toBe(8);
    expect(names("bharal")).toContain("franja-izq");
    expect(names("ardilla")).toContain("membrana");
    const tail = (id: string) => bodyPlan("cuadrupedo", id)!.find((p) => p.name === "cola")!.box[5];
    expect(tail("leopardo")).toBeGreaterThan(tail("marmota"));
    expect(tail("marmota")).toBeGreaterThan(tail("pika"));
  });

  it("birds by id: the griffon's dark flight feathers, the goose's black bars; other birds keep the old plan", () => {
    expect(bodyPlan("ave", "buitre")!.map((p) => p.name)).toContain("remeras-izq");
    expect(bodyPlan("ave", "ansar")!.map((p) => p.name)).toContain("barras");
    expect(bodyPlan("ave", "petrel-nival")!.map((p) => p.name)).toEqual(["cuerpo", "cabeza", "pico", "ala-izq", "ala-der", "cola"]);
    // An animal of sanctuary 1 is untouched (a reindeer keeps its antlers and ears).
    expect(bodyPlan("cuadrupedo", "reno")!.map((p) => p.name)).toContain("asta-izq");
  });
});
