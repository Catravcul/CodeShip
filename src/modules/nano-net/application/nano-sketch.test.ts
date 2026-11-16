import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { convertChore, stageChore } from "./challenges";
import { nanoSketch } from "./nano-sketch";
import { NanoNet } from "../domain/network";

const site = { id: "bennu", name: "101955 Bennu", position: Vec3.ZERO, radiusM: 245, massKg: 7.329e10, muM3S2: 4.89 };
const scene = { core: new Vec3(0, 245, 0), up: Vec3.Y };

describe("nano_net: cada paso bien respondido se ve (PX-20, auditoría de animaciones)", () => {
  it("convertir: un dibujo por paso, todos marcan el núcleo bajo el módulo, y el último saca los primeros nodos", () => {
    const c = convertChore(site);
    const s = nanoSketch(c, scene);
    expect(s).toHaveLength(c.exercises.length);
    for (const st of s) {
      expect(st.caption).toMatch(/^✓ Núcleo: /);
      expect(st.items.some((it) => it.kind === "ring" && it.centre.sub(scene.core).length() < 1e-6)).toBe(true);
    }
    expect(s[s.length - 1]!.items.filter((it) => it.kind === "arrow")).toHaveLength(3);
  });

  it("cada etapa añade lo suyo a su altura real (nodos a 40 m, órbita a 600 m)", () => {
    const net = new NanoNet([]);
    const core = net.plant(site);
    const gen = nanoSketch(stageChore(core, site, "generar"), scene);
    const arrow = gen[0]!.items.find((it) => it.kind === "arrow");
    expect(arrow && arrow.kind === "arrow" && arrow.to.sub(scene.core).dot(Vec3.Y)).toBeCloseTo(40, 5);
    const mov = nanoSketch(stageChore(core, site, "mover"), scene);
    const up = mov[0]!.items.find((it) => it.kind === "arrow");
    expect(up && up.kind === "arrow" && up.to.sub(scene.core).dot(Vec3.Y)).toBeCloseTo(600, 5);
  });
});
