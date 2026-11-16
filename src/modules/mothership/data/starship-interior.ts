import { Vec3 } from "@core/math/vec3";
import type { Face, Fixture, InteriorVolume, StationInteriorPlan } from "@modules/station/domain/interior";
import { rackSpec } from "@modules/life-support/data/eclss-machines";
import type { RackKind } from "@modules/life-support/domain/eclss";
import { STARSHIP_SRC } from "./starship";

/**
 * Starship's crewed interior, **distribución nuestra** (docs/design/nodriza-starship.md): SpaceX has not
 * published a crewed layout, so we lay out three decks in the payload section with ISS-type racks,
 * hatches and crew areas, inside its 614 m³. True size here; the presentation layer draws it bigger
 * and spreads it if the player wants (src/core/presentation.ts).
 *
 * Interior frame (like the station's, so the same 0 g movement works): +y points to the nose (the
 * decks are stacked like a Starship standing on the Moon: up is the nose), x across, z across. The
 * lander's port is on the hull at deck 3 («popa» wall), the station's on the nose past the flight deck.
 */
const ISS = {
  cbm: "Escotilla CBM de 1,27 m de lado, como entre los módulos de la ISS: https://en.wikipedia.org/wiki/Common_Berthing_Mechanism",
  crewQuarters: "Camarotes de la ISS (Harmony), unos 2,1 m³ cada uno, del tamaño de un bastidor: https://ntrs.nasa.gov/citations/20080013462",
  harmony: "Harmony (Nodo 2 de la ISS): los camarotes de cuatro astronautas: https://en.wikipedia.org/wiki/Harmony_(ISS_module)",
  whc: "Aseo de la ISS (WHC, Waste and Hygiene Compartment) en Tranquility: https://en.wikipedia.org/wiki/Tranquility_(ISS_module)",
  galley: "Cocina de la ISS: dispensador de agua caliente y fría y calentador de comida: https://en.wikipedia.org/wiki/Space_food",
  exercise: "Ejercicio en la ISS: cinta T2, ARED (hasta 272 kg de carga) y bicicleta CEVIS (25–350 W): https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884",
  ispr: STARSHIP_SRC.ispr,
  hls: STARSHIP_SRC.hls,
  idss: STARSHIP_SRC.idss,
} as const;

/** Inner radius of the hull, m: 9 m outside less ~0,3 m of steel, insulation and lining (estimate). */
export const HULL_INNER_RADIUS_M = 4.2;
/** Free aisle of each deck between its racks, half sizes (m): 4 × 2,6 × 4 m. */
const AISLE = new Vec3(2.0, 1.3, 2.0);
/** Floor between decks (structure, ducts, the hatch's frame), m: our value. */
const FLOOR_M = 0.5;
/** Height of a deck, floor to floor, m. */
export const DECK_PITCH_M = 2 * AISLE.y + FLOOR_M;
/** Deck centres along +y (to the nose), from the lowest (3) to the highest (1). */
const DECK_Y = { 3: 0, 2: DECK_PITCH_M, 1: 2 * DECK_PITCH_M } as const;
const CBM_HALF = 1.27 / 2;

/** The three decks: what each holds (its walls). */
export const STARSHIP_DECKS = [
  { id: "cubierta-1", code: "CUB1", label: "Cubierta 1 · cocina y trabajo", deck: 1 },
  { id: "cubierta-2", code: "CUB2", label: "Cubierta 2 · camarotes y aseo", deck: 2 },
  { id: "cubierta-3", code: "CUB3", label: "Cubierta 3 · ejercicio y esclusa", deck: 3 },
] as const;

/** Pressurised volume our three decks take (full hull section, deck pitch each) plus the flight deck in the nose cone, m³. */
export function starshipDeckVolumeM3(): number {
  const deck = Math.PI * HULL_INNER_RADIUS_M ** 2 * DECK_PITCH_M;
  // The flight deck: a 2,5 m cone frustum from the hull's 4,2 m down to ~2,5 m, under the header tanks (our value).
  const flight = (Math.PI * 2.5 * (HULL_INNER_RADIUS_M ** 2 + HULL_INNER_RADIUS_M * 2.5 + 2.5 ** 2)) / 3;
  return 3 * deck + flight;
}

const deckVolume = (d: (typeof STARSHIP_DECKS)[number]): InteriorVolume => ({
  id: d.id,
  code: d.code,
  label: d.label,
  kind: "habitat",
  centre: new Vec3(0, DECK_Y[d.deck], 0),
  half: AISLE,
  pressurised: true,
  basis: "Distribución nuestra: pasillo de 4 × 2,6 × 4 m entre bastidores tipo ISPR, en una cubierta de 8,4 m de diámetro interior",
  source: ISS.ispr,
});

const hatch = (id: string, label: string, y: number): InteriorVolume => ({
  id,
  code: "ESC",
  label,
  kind: "escotilla",
  centre: new Vec3(0, y, 0),
  half: new Vec3(CBM_HALF, FLOOR_M / 2 + 0.05, CBM_HALF),
  through: "y",
  pressurised: true,
  basis: "Escotilla de 1,27 m entre cubiertas (la de la ISS); en Starship su forma no está publicada",
  source: ISS.cbm,
});

type CrewAreaId = "cocina" | "camarotes" | "aseo" | "ejercicio" | "esterilla";

const fx = (f: Omit<Fixture, "action"> & { action: Fixture["action"] }): Fixture => f;
/** A rack-sized machine on a side wall of a deck (its front on the aisle's wall). */
function onWall(id: string, label: string, deck: 1 | 2 | 3, face: Face, size: Vec3, action: Fixture["action"], info: string, source: string, along = 0): Fixture {
  const y = DECK_Y[deck];
  // `along`: off the wall's middle, m (x on the fore and aft walls, z on the side ones).
  const off = face === "proa" || face === "popa" ? new Vec3(along, 0, 0) : new Vec3(0, 0, along);
  const at0 =
    face === "babor" ? new Vec3(-AISLE.x, y, 0) : face === "estribor" ? new Vec3(AISLE.x, y, 0) : face === "proa" ? new Vec3(0, y, -AISLE.z) : face === "popa" ? new Vec3(0, y, AISLE.z) : face === "suelo" ? new Vec3(0, y - AISLE.y, 0) : new Vec3(0, y + AISLE.y, 0);
  return fx({ id, label, volume: `cubierta-${deck}`, face, at: at0.add(off), size, action, info, source });
}

/** A rack's real size in the plan's axes on a wall (width across the wall, depth into it). */
function rackSize(kind: RackKind, face: Face): Vec3 {
  const r = rackSpec(kind).size;
  return face === "proa" || face === "popa" ? new Vec3(r.w, r.h, r.d) : new Vec3(r.d, r.h, r.w);
}

/** An ECLSS rack as a fixture (id `eclss-<kind>`): the life-support wiring gives it actions (eclss-real). */
function rackFixture(kind: RackKind, deck: 1 | 2 | 3, face: Face, along: number): Fixture {
  const r = rackSpec(kind);
  return onWall(`eclss-${kind}`, r.name, deck, face, rackSize(kind, face), { kind: "consola", id: `eclss-${kind}` }, r.info, r.source, along);
}

/** Which ECLSS model each fixture shows (the galley and the work laptop are ECLSS kit too). */
export const ECLSS_MODEL_OF: Readonly<Record<string, RackKind>> = { cocina: "galeria", "puesto-trabajo": "consola", refugio: "refugio", "eclss-wrs": "wrs", "eclss-ogs": "ogs", "eclss-itcs": "itcs", "eclss-ar": "ar", "eclss-incendios": "incendios" };
const crew = (area: CrewAreaId): Fixture["action"] => ({ kind: "tripulacion", area });

/** The plan at true size. */
export function starshipInteriorPlan(): StationInteriorPlan {
  const volumes: InteriorVolume[] = [...STARSHIP_DECKS.map(deckVolume), hatch("escotilla-3-2", "Escotilla Cubierta 3 – Cubierta 2", (DECK_Y[3] + DECK_Y[2]) / 2), hatch("escotilla-2-1", "Escotilla Cubierta 2 – Cubierta 1", (DECK_Y[2] + DECK_Y[1]) / 2)];
  const rack = (depth = 0.86) => ({ x: new Vec3(depth, 2.0, 1.05), z: new Vec3(1.05, 2.0, depth) });
  const fixtures: Fixture[] = [
    // Deck 1: galley, workstations, the mat; up to the flight deck; the nose tunnel to the station.
    onWall("cocina", "Cocina (agua caliente y calentador)", 1, "babor", rack().x, crew("cocina"), "Dispensador de agua caliente y fría para rehidratar y un calentador para las bolsas termoestabilizadas, como la cocina de la ISS", ISS.galley),
    onWall("puesto-trabajo", "Puestos de trabajo", 1, "estribor", new Vec3(0.86, 2.0, 2.1), { kind: "consola", id: "trabajo" }, "Dos portátiles con la lista de tareas y el registro de misiones", ISS.ispr),
    onWall("esterilla", "Esterilla", 1, "popa", new Vec3(1.8, 1.0, 0.05), crew("esterilla"), "Esterilla sujeta a la pared con cintas: estiramientos, yoga y los ajustes", ISS.exercise),
    onWall("subir-cubierta-vuelo", "Escotilla a la cubierta de vuelo", 1, "techo", new Vec3(1.27, 0.1, 1.27), { kind: "consola", id: "cubierta-vuelo" }, "Por aquí se sube a la cubierta de vuelo, bajo los depósitos de cabecera de la proa", ISS.cbm),
    onWall("salir-estacion", "Túnel de proa: a la estación", 1, "proa", new Vec3(0.8, 0.8, 0.1), { kind: "salir", to: "nodriza" }, "El puerto IDSS del morro, como el del HLS: con la nave atracada lleva a la estación", ISS.idss),
    // Deck 2: four crew quarters and the WHC.
    onWall("camarotes", "Camarotes (4)", 2, "babor", new Vec3(1.05, 2.0, 4.0), crew("camarotes"), "Cuatro camarotes de 2,1 m³ en fila, del tamaño de un bastidor, como los de Harmony: saco sujeto a la pared, luz, ventilador y portátil", ISS.crewQuarters),
    onWall("aseo", "Aseo (WHC)", 2, "estribor", rack().x, crew("aseo"), "Aseo con flujo de aire, como el WHC de la ISS: en 0 g el aire arrastra lo que en la Tierra cae", ISS.whc),
    onWall("refugio", rackSpec("refugio").name, 2, "popa", rackSize("refugio", "popa"), { kind: "info" }, rackSpec("refugio").info, rackSpec("refugio").source),
    // Deck 3: exercise (T2, ARED, CEVIS), the airlock and the lander's hatch.
    onWall("t2", "Cinta T2", 3, "suelo", new Vec3(1.0, 0.3, 1.9), crew("ejercicio"), "Cinta de correr con arnés de cintas elásticas que te sujetan contra ella", ISS.exercise),
    onWall("ared", "ARED (pesas)", 3, "babor", rack().x, crew("ejercicio"), "Pesas con cilindros de vacío: hasta 272 kg de carga sin gravedad", ISS.exercise),
    onWall("cevis", "Bicicleta CEVIS", 3, "estribor", new Vec3(0.86, 1.2, 1.0), crew("ejercicio"), "Bicicleta sin asiento: los pies van atados a los pedales (25–350 W)", ISS.exercise),
    onWall("esclusa", "Esclusa (paseo espacial)", 3, "proa", new Vec3(1.2, 2.0, 0.1), { kind: "info" }, "El HLS lleva dos esclusas; las salidas desde la nave están pendientes (docs/pendientes.md)", ISS.hls),
    onWall("salir-modulo", "Escotilla del módulo de aterrizaje", 3, "popa", new Vec3(0.8, 0.8, 0.1), { kind: "salir", to: "sonda" }, "Puerto IDSS del costado (nuestro): el módulo de aterrizaje se acopla aquí", ISS.idss),
    // Life support (branch eclss-real, ECLSS_RACKS): ISPR racks beside the middle fixture of a wall.
    rackFixture("wrs", 2, "proa", 0),
    rackFixture("ogs", 1, "proa", 1.45),
    rackFixture("itcs", 1, "proa", -1.45),
    rackFixture("ar", 3, "proa", 1.45),
    rackFixture("incendios", 3, "proa", -1.45),
    onWall("almacen", "Almacén", 3, "popa", new Vec3(1.05, 2.0, 0.86), { kind: "info" }, "Bolsas de carga y comida del mes, sujetas en los huecos curvos entre los bastidores y el casco", ISS.ispr, -1.45),
  ];
  // The hatches between decks, seen from each side: from below on the ceiling, from above on the floor.
  for (const [h, lower, upper] of [["escotilla-3-2", "cubierta-3", "cubierta-2"], ["escotilla-2-1", "cubierta-2", "cubierta-1"]] as const) {
    const v = volumes.find((x) => x.id === h)!;
    const label = (id: string) => STARSHIP_DECKS.find((d) => d.id === id)!.label;
    for (const [from, to, s] of [[lower, upper, -1], [upper, lower, 1]] as const)
      fixtures.push({
        id: `puerta-${h}-${from}`,
        label: `Escotilla · ${label(to)}`,
        volume: from,
        face: s < 0 ? "techo" : "suelo",
        at: v.centre.add(new Vec3(0, s * v.half.y, 0)),
        size: new Vec3(1.27, 0.1, 1.27),
        action: { kind: "puerta", to, hatch: h },
        info: `${v.label}: de ${label(from)} a ${label(to)}`,
        source: ISS.cbm,
      });
  }
  return {
    volumes,
    fixtures,
    solids: [],
    entries: {
      sonda: { at: new Vec3(0, DECK_Y[3], AISLE.z - 0.7), facing: new Vec3(0, 0, -1) },
      nodriza: { at: new Vec3(0, DECK_Y[1], -AISLE.z + 0.7), facing: new Vec3(0, 0, 1) },
    },
    storage: { rackSlots: [], cradles: [], crate: new Vec3(0.9, 0.9, 0.9) },
  };
}
