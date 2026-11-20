import { describe, expect, it } from "vitest";
import { dropTo, step, type WalkWorld } from "./walk";

/** A trunk of water open to the sea (Berón 2026-11-19: «los edificios árboles son de agua y están conectados al mar»). */
const W: WalkWorld = {
  floors: [
    { id: "hielo", x0: -50, x1: 50, z0: -50, z1: 50, y: 0, area: "hielo" },
    { id: "piso", x0: 10, x1: 30, z0: -10, z1: 10, y: 12, area: "piso" },
  ],
  waters: [
    { id: "mar", x0: -500, x1: 500, z0: -500, z1: 500, yBottom: -40, yTop: -0.25, area: "mar" },
    { id: "tronco", x0: -10, x1: 10, z0: -10, z1: 10, yBottom: -12, yTop: 60, area: "tronco", open: true },
  ],
  solids: [],
};

describe("troncos de agua abiertos y bordes sin barrera", () => {
  it("nadando desde el mar sube por el tronco: el hielo no la saca dentro del tronco", () => {
    let b = { x: 0, y: -5, z: 0, motion: "agua" as const, area: "mar" } as Parameters<typeof step>[1];
    for (let i = 0; i < 40; i++) b = step(W, b, { dx: 0, dy: 0.5, dz: 0 });
    expect(b.motion).toBe("agua");
    expect(b.y).toBeGreaterThan(10);
  });

  it("desde lo alto de una puerta pasa nadando al piso, sin tocar su suelo", () => {
    const b = step(W, { x: 9.9, y: 14, z: 0, motion: "agua", area: "tronco" }, { dx: 0.4, dz: 0 });
    expect(b).toMatchObject({ motion: "gravedad", area: "piso", y: 12 });
  });

  it("andando sobre el hielo no hay suelo dentro del tronco: cae al agua", () => {
    const b = step(W, { x: -10.2, y: 0, z: 0, motion: "gravedad", area: "hielo" }, { dx: 0.4, dz: 0 });
    expect(b.motion).toBe("agua");
  });

  it("del borde de un piso se puede tirar: cae al suelo o al agua de debajo", () => {
    expect(dropTo(W, 31, 12, 0)).toMatchObject({ motion: "gravedad", area: "hielo", y: 0 });
    expect(dropTo(W, 0, 30, 0)).toMatchObject({ motion: "agua", area: "tronco" });
    expect(dropTo(W, 200, 12, 0)).toMatchObject({ motion: "agua", area: "mar" });
  });
});
