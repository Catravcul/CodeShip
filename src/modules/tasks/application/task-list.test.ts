import { describe, expect, it } from "vitest";
import { collectTasks, groupTasks, routeTo, TASK_GROUPS, type TaskFacts } from "./task-list";

const facts = (o: Partial<TaskFacts> = {}): TaskFacts => ({
  chores: [],
  asteroids: [],
  expeditionTarget: "bennu",
  landedOn: null,
  mission: null,
  nanoFaults: [],
  nanoActions: [],
  fabricable: [],
  refinable: [],
  bioToTune: [],
  credits: 0,
  refuel: false,
  repairs: [],
  ...o,
});
const bennu = { id: "bennu", name: "Bennu", persuaded: false, next: "sonda" as const, subjugated: false, level: 0, nextLevel: undefined };

describe("task list: every task of the game, grouped, with where it is done (docs/design/habitaculo.md §Tareas)", () => {
  it("HAB-05 board chores keep their category and their machine on the ring", () => {
    const t = collectTasks(facts({ chores: [{ id: "c1", title: "Regar", detail: "Lechuga", category: "plantas", station: "huerto" }] }));
    expect(t).toEqual([{ id: "c1", group: "plantas", title: "Regar", detail: "Lechuga", place: { vehicle: "nodriza", spot: "anillo", station: "huerto" }, chore: "c1" }]);
  });

  it("HAB-05 the subjugation phases are flight tasks done at the right place: probe from the bridge, lander, suit", () => {
    const p1 = collectTasks(facts({ asteroids: [bennu] })).find((x) => x.id === "fase-bennu")!;
    expect(p1).toMatchObject({ group: "vuelo", place: { vehicle: "nodriza", spot: "puente", page: "sonda" } });
    expect(p1.title).toMatch(/sonda.*Bennu.*fase 1 de 3/);
    const p2 = collectTasks(facts({ asteroids: [{ ...bennu, next: "nave" }] })).find((x) => x.id === "fase-bennu")!;
    expect(p2.place).toEqual({ vehicle: "modulo", spot: "asiento" });
    expect(p2.title).toMatch(/Aterriza.*fase 2 de 3/);
    const landed = collectTasks(facts({ asteroids: [{ ...bennu, next: "nave" }], landedOn: "bennu" })).find((x) => x.id === "fase-bennu")!;
    expect(landed.place).toEqual({ vehicle: "modulo", spot: "mente" });
    const p3 = collectTasks(facts({ asteroids: [{ ...bennu, next: "traje" }], landedOn: "bennu" })).find((x) => x.id === "fase-bennu")!;
    expect(p3.place).toEqual({ vehicle: "modulo", spot: "escotilla" });
    const lv = collectTasks(facts({ asteroids: [{ ...bennu, next: undefined, subjugated: true, level: 1, nextLevel: 2 }] })).find((x) => x.id === "fase-bennu")!;
    expect(lv.title).toMatch(/nivel 2/);
    expect(collectTasks(facts({ asteroids: [{ ...bennu, next: undefined, subjugated: true, level: 4 }] })).some((x) => x.id === "fase-bennu")).toBe(false);
  });

  it("HAB-05 a phase on another asteroid starts with a trip programmed on the bridge's map", () => {
    const ryugu = { ...bennu, id: "ryugu", name: "Ryugu", next: "nave" as const };
    const t = collectTasks(facts({ asteroids: [bennu, ryugu] }));
    expect(t.find((x) => x.id === "viaje-ryugu")).toMatchObject({ group: "viajes", place: { vehicle: "nodriza", spot: "puente", page: "nav", target: "ryugu" } });
    // The current target needs no trip; a persuaded one is not listed.
    expect(t.some((x) => x.id === "viaje-bennu")).toBe(false);
    expect(collectTasks(facts({ asteroids: [{ ...ryugu, persuaded: true, subjugated: true, level: 4, next: undefined }] })).some((x) => x.id.endsWith("ryugu"))).toBe(false);
  });

  it("HAB-05 Nevaeh's mission, nano_net faults, station work, imports, biosystems, refuelling and repairs all appear", () => {
    const t = collectTasks(
      facts({
        mission: { title: "Persuadir a Bennu", targetId: "bennu", targetName: "Bennu" },
        nanoFaults: [{ id: "f1", what: "un nodo", coreName: "Bennu" }],
        nanoActions: [{ id: "n1", title: "Convertir en núcleo" }],
        fabricable: [{ id: "bp1", name: "Sonda" }],
        refinable: [{ id: "r1", name: "Hierro" }],
        bioToTune: [{ id: "b1", name: "Espirulina" }],
        credits: 500,
        refuel: true,
        repairs: [{ id: "casco", name: "Casco", critical: true }],
      }),
    );
    const at = (id: string) => t.find((x) => x.id === id)!;
    expect(at("mision-bennu")).toMatchObject({ group: "misiones", place: { vehicle: "nodriza", spot: "puente", page: "misiones" } });
    expect(at("nano-f1")).toMatchObject({ group: "misiones", place: { vehicle: "modulo", spot: "asiento" } });
    expect(at("nano-n1").group).toBe("misiones");
    expect(at("fabricar-bp1")).toMatchObject({ group: "estacion", place: { vehicle: "estacion", spot: "pantalla", tab: "planos" } });
    expect(at("refinar-r1").place).toMatchObject({ tab: "materiales" });
    expect(at("bio-b1").place).toMatchObject({ tab: "vida" });
    expect(at("importar").place).toMatchObject({ tab: "importar" });
    expect(at("repostar").place).toMatchObject({ tab: "materiales" });
    expect(at("reparar-casco")).toMatchObject({ group: "nave", place: { vehicle: "estacion", spot: "bahia" } });
    expect(at("reparar-casco").title).toMatch(/crítico/);
    expect(collectTasks(facts({ credits: 0 })).some((x) => x.id === "importar")).toBe(false);
  });

  it("HAB-05 groups come in a fixed order, flight first, and empty groups are left out", () => {
    const t = collectTasks(facts({ asteroids: [bennu], chores: [{ id: "c", title: "Yoga", detail: "", category: "salud", station: "yoga" }], fabricable: [{ id: "x", name: "X" }] }));
    const g = groupTasks(t);
    expect(g.map((x) => x.id)).toEqual(["vuelo", "estacion", "salud"]);
    expect(g[0]!.label).toBe(TASK_GROUPS.find((x) => x.id === "vuelo")!.label);
    expect(TASK_GROUPS[0]!.id).toBe("vuelo");
  });
});

describe("task «ir»: how she gets to the place (HAB-06)", () => {
  const links = { moduloNodriza: true, moduloEstacion: false, nodrizaEstacion: false };
  it("HAB-06 in the same vehicle or through a docked hatch she goes straight there", () => {
    expect(routeTo({ vehicle: "modulo", spot: "asiento" }, { crew: "modulo", links })).toEqual({ kind: "ir", through: ["modulo"] });
    expect(routeTo({ vehicle: "nodriza", spot: "puente", page: "sonda" }, { crew: "modulo", links })).toEqual({ kind: "ir", through: ["modulo", "nodriza"] });
    const viaStation = { moduloNodriza: false, moduloEstacion: true, nodrizaEstacion: true };
    expect(routeTo({ vehicle: "nodriza", spot: "anillo", station: "cocina" }, { crew: "modulo", links: viaStation })).toEqual({ kind: "ir", through: ["modulo", "estacion", "nodriza"] });
  });

  it("HAB-06 out of reach she is sent to what joins the vehicles, with the reason", () => {
    const none = { moduloNodriza: false, moduloEstacion: false, nodrizaEstacion: false };
    const r = routeTo({ vehicle: "nodriza", spot: "anillo", station: "cocina" }, { crew: "modulo", links: none });
    expect(r).toMatchObject({ kind: "bloqueado", via: { vehicle: "modulo", spot: "acople" } });
    if (r.kind === "bloqueado") expect(r.why).toMatch(/Acopla/);
    const s = routeTo({ vehicle: "estacion", spot: "bahia" }, { crew: "nodriza", links: none });
    expect(s).toMatchObject({ kind: "bloqueado", via: { vehicle: "nodriza", spot: "puente", page: "nav" } });
  });
});
