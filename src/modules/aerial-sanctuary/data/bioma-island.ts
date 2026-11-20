import type { Ground, Rect } from "../domain/walk";
import type { IslandPad } from "../domain/travel";
import type { AreaDef, IslandDef, MachineDef, Prop } from "./layout";
import type { Reality } from "@core/reality";
import { wallWithGaps } from "../domain/walk";
import { altitudeOf, beltOf, heightAt, landRadius, walkableAt, type Belt, type MountainDef } from "../domain/mountain";
import { BELT_ALTITUDES } from "./bioma";
import { fact } from "./sources";

/**
 * THE AIR ISLAND (docs/design/bioma-s3.md): sanctuary 3's biome is the air and the heights (Berón, 2026-11-20), so its
 * island is ONE GIANT MOUNTAIN like a valley side of the Hunza Karakoram (Gilgit-Baltistán), from a river beach at the
 * sea to the snows: artemisia steppe, a blue pine forest, juniper and birch at the tree line, alpine meadows with their
 * marmots, scree with pikas, a ring of cliffs where the ibex stand and the griffons nest, a deep gorge cut to the sea
 * for the markhor and the bearded vulture, the snowcock's ridge and the snowfield. The research hut by the shore keeps
 * the census. The real belts (Eberhardt et al. 2007, Batura valley) are compressed to fit: 1 m of the island stands for
 * `altitudePerM` m of the real slope (licencia). The terrain keeps its true size (it is already giant); only the hut and
 * its helipad widen with the presentation's scale, as every building of the sanctuary.
 */
const BATURA = "Eberhardt, Dickoré y Miehe 2007, Erdkunde 61(1): 93–112 (cinturones del valle de Batura, Hunza)";

export const BIOME_ISLAND = {
  centre: fact({ x: 1450, z: 250 }, "licencia", "nuestro: en el mar del santuario 3, al este de la isla de entrenamiento y al sur del glaciar; sustituye a la isla subantártica (Berón, 2026-11-20)"),
  station: fact({ x: 12, z: 6, y: 3.2 }, "licencia", "una cabaña de campo como las de los equipos del Snow Leopard Trust y del WWF-Pakistán en Khunjerab (cámaras, censos y nidos); su planta es nuestra"),
};

/** The belts (real altitudes, Batura valley) with the words on the census and in Áreas. */
export const BELTS: readonly Belt[] = [
  { id: "submontano", label: "Estepa submontana", from: BELT_ALTITUDES.submontano, to: BELT_ALTITUDES.montano },
  { id: "montano", label: "Bosque montano", from: BELT_ALTITUDES.montano, to: BELT_ALTITUDES.subalpino },
  { id: "subalpino", label: "Límite del bosque (subalpino)", from: BELT_ALTITUDES.subalpino, to: BELT_ALTITUDES.alpino },
  { id: "alpino", label: "Pradera alpina", from: BELT_ALTITUDES.alpino, to: BELT_ALTITUDES.subnival },
  { id: "subnival", label: "Pedreras y crestas (subnival)", from: BELT_ALTITUDES.subnival, to: BELT_ALTITUDES.nival },
  { id: "nival", label: "Nieves perpetuas (nival)", from: BELT_ALTITUDES.nival, to: 8000 },
];

/** The trails up the mountain (local m): from the hut by the shore, the gorge and the meadows to the snows. */
const TRAILS = [
  // The main trail: hut → forest edge → tree line → meadow → col → snowfield.
  [{ x: -150, z: -476 }, { x: -250, z: -400 }, { x: -200, z: -300 }, { x: -60, z: -300 }, { x: -20, z: -250 }, { x: 60, z: -190 }, { x: 200, z: -120 }, { x: 290, z: -140 }, { x: 348, z: -24 }, { x: 356, z: 4 }, { x: 312, z: 72 }, { x: 243, z: 113 }],
  // Through the forest down to the river in the gorge.
  [{ x: -200, z: -300 }, { x: -330, z: -200 }, { x: -504, z: -148 }, { x: -716, z: 52 }, { x: -640, z: 72 }],
  // Through the juniper to the gorge's lookout.
  [{ x: 60, z: -190 }, { x: -80, z: -110 }, { x: -200, z: -40 }, { x: -300, z: 40 }, { x: -355, z: 92 }],
  // Over the meadow and the scree to the foot of the cliffs.
  [{ x: 290, z: -140 }, { x: 120, z: -44 }],
  // Along the shore to the steppe.
  [{ x: -150, z: -476 }, { x: 100, z: -520 }],
];

/**
 * The mountain's shape (domain/mountain.ts), as data. Ours (licencia), of the order of the Karakoram: a summit 520 m
 * above the sea (5 080 m real), cliffs 90 m high (800 m real: the Batura and Hunza walls are higher), a gorge 160 m deep
 * at the lookout (the Hunza gorge is ~1 km deep).
 */
export const MOUNTAIN = fact<MountainDef>(
  {
    half: { x: 800, z: 600 },
    peak: { x: 120, z: 180 },
    cliffs: [{ d: 0, h: 520 }, { d: 120, h: 400 }, { d: 175, h: 338 }, { d: 225, h: 245 }, { d: 380, h: 195 }, { d: 560, h: 95 }, { d: 690, h: 32 }, { d: 800, h: 10 }, { d: 950, h: 8 }],
    ridge: [{ d: 0, h: 520 }, { d: 60, h: 440 }, { d: 100, h: 350 }, { d: 140, h: 330 }, { d: 300, h: 250 }, { d: 460, h: 150 }, { d: 600, h: 62 }, { d: 720, h: 18 }, { d: 900, h: 8 }],
    ridgeAt: -0.5,
    ridgeWidth: 0.3,
    roughShore: 3,
    roughTop: 16,
    flats: [{ x: -150, z: -470, r: 45, h: 6 }],
    gorge: [{ x: -900, z: 40, floor: 0.6 }, { x: -600, z: 80, floor: 5 }, { x: -380, z: 160, floor: 18 }, { x: -200, z: 250, floor: 35 }, { x: -40, z: 340, floor: 60 }],
    gorgeFloorHalf: 8,
    trails: TRAILS,
    baseAltitudeM: 2400,
    altitudePerM: 9,
    walkSlope: 0.66,
  },
  "licencia",
  `nuestro, del orden del Karakórum de Hunza: ${BATURA}; cumbre de 5 080 m, garganta y anillo de cantiles comprimidos (1 m de la isla = 9 m de ladera real)`,
);

export interface BiomeZone {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly reality: Reality;
  /** Its place (local m) and how far it reaches. */
  readonly point: { readonly x: number; readonly z: number };
  readonly r: number;
}

/** The zones of the island, in its own frame (local m from its centre), each on a trail. */
export const BIOME_ZONES: readonly BiomeZone[] = [
  { id: "estacion", label: "Estación de investigación", desc: "Una cabaña de campo junto al río: dentro, el tablón del censo con cada especie, su cinturón, qué come y lo último que ha pasado; y las fichas del trabajo de campo", reality: "licencia", point: { x: -150, z: -470 }, r: 40 },
  { id: "estepa", label: "Estepa de artemisa", desc: "Las laderas secas de abajo: artemisa, efedra y gramíneas, el hámster y el ratón de campo; el zorro y el cernícalo cazan aquí", reality: "real", point: { x: 100, z: -520 }, r: 90 },
  { id: "rio", label: "Río de la garganta", desc: "Donde la garganta se abre al mar: espino amarillo en la grava del río, palomas nivales y chovas bebiendo", reality: "real", point: { x: -640, z: 72 }, r: 70 },
  { id: "bosque", label: "Bosque de pino azul", desc: "Pino azul y pícea del Himalaya en la ladera umbría: la ardilla voladora lanuda planea de árbol en árbol al anochecer", reality: "real", point: { x: -330, z: -200 }, r: 110 },
  { id: "enebral", label: "Enebral y abedules", desc: "El límite del bosque: enebros, abedules y sauces; el markhor baja aquí a ramonear", reality: "real", point: { x: -20, z: -250 }, r: 80 },
  { id: "garganta", label: "Mirador de la garganta", desc: "El borde de una garganta de 160 m: markhores en sus paredes, el quebrantahuesos dejando caer huesos sobre las losas, treparriscos en la roca", reality: "real", point: { x: -355, z: 92 }, r: 90 },
  { id: "pradera", label: "Pradera de las marmotas", desc: "Pradera alpina de juncias y plantas en cojín: colonias de marmotas de cola larga (duermen de septiembre a abril), bharales pastando y el águila real", reality: "real", point: { x: 290, z: -140 }, r: 90 },
  { id: "pedrera", label: "Pedrera de las pikas", desc: "Un cono de piedras al pie de los cantiles: las pikas entre las grietas con su heno, la amapola azul", reality: "real", point: { x: 190, z: -84 }, r: 45 },
  { id: "farallon", label: "Farallón de los íbices", desc: "El anillo de cantiles: íbices en las repisas, la colonia de buitres del Himalaya y las térmicas que los suben. Repisas para trepar (X)", reality: "real", point: { x: 120, z: -44 }, r: 70 },
  { id: "cresta", label: "Collado de la perdiz nival", desc: "La cresta subnival: saussureas lanudas, la perdiz nival que baja corriendo y planea ladera abajo; por aquí pasa el ánsar indio", reality: "real", point: { x: 312, z: 72 }, r: 70 },
  { id: "nieves", label: "Campo de nieve", desc: "La nieve bajo la cumbre: líquenes en la roca, colémbolos y arañas saltarinas que viven de lo que sube el viento", reality: "licencia", point: { x: 243, z: 113 }, r: 70 },
];

/** Climbing ledges up the farallón (local m: the foot of the cliff and the way up). */
const LEDGES = { foot: { x: 120, z: -44 }, count: 9, rise: 2.3, width: 3.2 };

/** The research hut's middle (local m), on the levelled flat by the shore. */
export const HUT_AT = { x: -165, z: -470 } as const;
/** The flat's height: the hut's floor. */
export const HUT_Y = (): number => MOUNTAIN.value.flats[0]!.h!;
/** A point of the hut's own plan (m from its middle), in the world at presentation scale `k` (the hut widens, §2.4). */
export function hutPoint(k: number, x: number, z: number): { x: number; z: number } {
  const C = BIOME_ISLAND.centre.value;
  return { x: C.x + HUT_AT.x + x * k, z: C.z + HUT_AT.z + z * k };
}

/** The island's ground (world m, true size: the mountain is not widened). */
export function biomeGround(def: MountainDef = MOUNTAIN.value): Ground {
  const C = BIOME_ISLAND.centre.value;
  const R = 1.2;
  return {
    id: "bioma",
    x0: C.x - def.half.x * R,
    x1: C.x + def.half.x * R,
    z0: C.z - def.half.z * R,
    z1: C.z + def.half.z * R,
    heightAt: (x, z) => (landRadius(def, x - C.x, z - C.z) < 1.05 ? heightAt(def, x - C.x, z - C.z) : undefined),
    walkable: (x, z) => walkableAt(def, x - C.x, z - C.z),
    areaAt: (x, z) => zoneAt(x - C.x, z - C.z)?.id ?? "bioma:isla",
  };
}

/** The zone of local (x, z), if any (the nearest within its reach). */
export function zoneAt(x: number, z: number): { id: string; zone: BiomeZone } | undefined {
  let best: BiomeZone | undefined;
  let bd = Infinity;
  for (const zn of BIOME_ZONES) {
    const d = Math.hypot(x - zn.point.x, z - zn.point.z) / zn.r;
    if (d < 1 && d < bd) [best, bd] = [zn, d];
  }
  return best && { id: `bioma:${best.id}`, zone: best };
}

/** Real altitude and belt of local (x, z). */
export function beltAt(x: number, z: number, def: MountainDef = MOUNTAIN.value): { altitude: number; belt: Belt } {
  const altitude = altitudeOf(def, heightAt(def, x, z));
  return { altitude, belt: beltOf(BELTS, altitude) };
}

/** The builder of the layout (data/layout.ts), as much of it as the island needs. */
export interface IslandBuilder {
  floor(area: string, y: number, r: Rect, id?: string): void;
  block(look: string, s: Rect & { y0: number; y1: number }, solid?: boolean): void;
  point(id: string, x: number, y: number, z: number): string;
  link(...ids: string[]): void;
  area(a: AreaDef): void;
  machine(m: Omit<MachineDef, "point">, link: string): string;
  readonly props: Prop[];
  readonly solids: (Rect & { y0: number; y1: number })[];
}

/** Builds the island at presentation scale `k` (only its buildings widened, §2.4); returns its definition and its ground. */
export function buildBiomeIsland(b: IslandBuilder, k: number, helideckM: number): IslandDef & { ground: Ground } {
  const C = BIOME_ISLAND.centre.value;
  const M = MOUNTAIN.value;
  const ground = biomeGround(M);
  const H = (x: number, z: number) => heightAt(M, x, z);
  const W = (x: number, z: number) => ({ x: C.x + x, z: C.z + z });
  // The hut stands on the levelled flat by the shore; its walls widen with k about its own middle.
  const hutY = HUT_Y();
  const P = (x: number, z: number) => hutPoint(k, x, z);
  const R = (r: Rect): Rect => {
    const a = P(r.x0, r.z0);
    const c = P(r.x1, r.z1);
    return { x0: a.x, x1: c.x, z0: a.z, z1: c.z };
  };
  const st = BIOME_ISLAND.station.value;
  const hx = st.x / 2;
  const hz = st.z / 2;
  const door = 1.2;
  const walls = [
    ...wallWithGaps({ axis: "x", at: -hz, from: -hx, to: hx, y0: 0, y1: st.y, thick: 0.2, gaps: [{ from: -door / 2, to: door / 2, y1: 2.1 }] }),
    ...wallWithGaps({ axis: "x", at: hz, from: -hx, to: hx, y0: 0, y1: st.y, thick: 0.2 }),
    ...wallWithGaps({ axis: "z", at: -hx, from: -hz, to: hz, y0: 0, y1: st.y, thick: 0.2 }),
    ...wallWithGaps({ axis: "z", at: hx, from: -hz, to: hz, y0: 0, y1: st.y, thick: 0.2 }),
  ];
  for (const w of walls) {
    const c = P((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2);
    const sx = (w.x1 - w.x0) * (w.x1 - w.x0 > 1 ? k : 1);
    const sz = (w.z1 - w.z0) * (w.z1 - w.z0 > 1 ? k : 1);
    b.block("cabana", { x0: c.x - sx / 2, x1: c.x + sx / 2, z0: c.z - sz / 2, z1: c.z + sz / 2, y0: hutY + w.y0, y1: hutY + w.y1 });
  }
  b.floor("bioma:estacion", hutY + 0.02, R({ x0: -hx + 0.1, x1: hx - 0.1, z0: -hz + 0.1, z1: hz - 0.1 }));
  b.block("cabana-techo", { ...R({ x0: -hx - 0.4, x1: hx + 0.4, z0: -hz - 0.4, z1: hz + 0.4 }), y0: hutY + st.y, y1: hutY + st.y + 0.25 }, false);
  const board = P(0, hz - 0.4);
  b.block("tablon", { x0: board.x - 1.2, x1: board.x + 1.2, z0: board.z - 0.08, z1: board.z + 0.08, y0: hutY + 0.9, y1: hutY + 2.2 }, false);
  // The helipad, east of the hut on the same flat.
  const hd = helideckM / 2;
  const pad = W(-118, -470);
  b.floor("bioma:helipuerto", hutY + 0.05, { x0: pad.x - hd, x1: pad.x + hd, z0: pad.z - hd, z1: pad.z + hd });
  b.props.push({ kind: "helideck", x: pad.x, y: hutY + 0.05, z: pad.z, size: { x: hd * 2, y: 0.1, z: hd * 2 } });

  // The way: helipad → hut → the trails, a point at each bend; each zone on its trail.
  const padMid = b.point("bioma:helipuerto:centro", pad.x, hutY + 0.05, pad.z);
  const padEdge = b.point("bioma:helipuerto:borde", pad.x - hd + 1.5, hutY + 0.05, pad.z);
  const outside = P(0, -hz - 3);
  const doorOut = b.point("bioma:estacion:puerta", outside.x, hutY, outside.z);
  const inside = P(0, hz - 2);
  const census = b.point("bioma:estacion:censo", inside.x, hutY + 0.02, inside.z);
  const doorIn = P(0, -hz + 0.8);
  const doorInP = b.point("bioma:estacion:dentro", doorIn.x, hutY + 0.02, doorIn.z);
  b.link(padMid, padEdge, doorOut, doorInP, census);
  const ids = new Map<string, string>();
  const at = (p: { x: number; z: number }, name: string) => {
    const key = `${p.x},${p.z}`;
    let id = ids.get(key);
    if (!id) {
      const w = W(p.x, p.z);
      id = b.point(`bioma:${name}`, w.x, H(p.x, p.z), w.z);
      ids.set(key, id);
    }
    return id;
  };
  TRAILS.forEach((t, ti) => {
    const pts = t.map((p, i) => at(p, `sendero-${ti}-${i}`));
    for (let i = 1; i < pts.length; i++) b.link(pts[i - 1]!, pts[i]!);
  });
  b.link(doorOut, at(TRAILS[0]![0]!, "sendero-0-0"));
  for (const z of BIOME_ZONES) {
    const p = z.id === "estacion" ? census : at(z.point, z.id);
    // The scree lies on the meadow's trail to the cliffs.
    if (z.id === "pedrera") b.link(at(TRAILS[3]![0]!, ""), p, at(TRAILS[3]![1]!, ""));
    const w = W(z.point.x, z.point.z);
    const y = H(z.point.x, z.point.z);
    const { belt, altitude } = beltAt(z.point.x, z.point.z, M);
    b.area({ id: `bioma:${z.id}`, island: "bioma", label: z.label, desc: `${z.desc} (${Math.round(altitude / 10) * 10} m reales: ${belt.label.toLowerCase()})`, reality: z.reality, centre: { x: w.x, y: y + 4, z: w.z }, half: { x: z.r, y: 40, z: z.r }, point: p, belt: { id: belt.id, label: belt.label } });
  }
  // The climbing ledges up the farallón (the way up runs north, up the cliff): each a climb (X) above the one below
  // and reaching back over it, so from the back of one she reaches the front of the next.
  const f = LEDGES.foot;
  let y = H(f.x, f.z);
  let s = 0;
  let prev: number | undefined;
  for (let i = 0; i < LEDGES.count; i++) {
    y += LEDGES.rise;
    // Up the cliff until the rock is just below the ledge's height: the ledge juts from the wall there.
    while (H(f.x, f.z + s) < y - 0.6 && s < 80) s += 0.25;
    const z0 = Math.min(s - 1.2, (prev ?? s) + 0.3);
    const r = { x0: C.x + f.x - LEDGES.width / 2, x1: C.x + f.x + LEDGES.width / 2, z0: C.z + f.z + z0, z1: C.z + f.z + s + 0.4 };
    b.floor("bioma:farallon", y, r, `bioma:repisa-${i + 1}`);
    b.block("repisa", { ...r, y0: y - 0.8, y1: y }, false);
    prev = s;
  }
  const rect = { x0: C.x - M.half.x * 1.15, x1: C.x + M.half.x * 1.15, z0: C.z - M.half.z * 1.15, z1: C.z + M.half.z * 1.15 };
  b.area({ id: "bioma:isla", island: "bioma", label: "Isla de las alturas", desc: "Una montaña entera del Karakórum, del río a las nieves: estepa, bosque, praderas, pedreras, cantiles y una garganta; una cadena alimenticia viva de plantas, insectos, roedores, cabras, aves rapaces y el leopardo de las nieves", reality: "licencia", centre: { x: C.x, y: 200, z: C.z }, half: { x: (rect.x1 - rect.x0) / 2, y: 300, z: (rect.z1 - rect.z0) / 2 }, point: doorOut });
  const kiosk = { x: pad.x - hd - 2.5, z: pad.z - 4 };
  b.machine({ id: "nav-bioma", kind: "navegacion", island: "bioma", area: "bioma:helipuerto", label: "Máquina de navegación", what: "El mapa de las islas: helicóptero a la isla de entrenamiento", x: kiosk.x, y: hutY, z: kiosk.z }, padEdge);
  b.block("kiosco", { x0: kiosk.x - 1.7 - 0.5, x1: kiosk.x - 1.7 + 0.5, z0: kiosk.z - 0.5, z1: kiosk.z + 0.5, y0: hutY, y1: hutY + 1.3 });
  b.props.push({ kind: "nav-machine", x: kiosk.x - 1.7, y: hutY, z: kiosk.z, rot: Math.PI / 2 });
  const padAt: IslandPad = { island: "bioma", at: { x: pad.x, y: hutY + 0.05, z: pad.z }, crafts: ["helicoptero"] };
  return {
    id: "bioma", name: "Isla de las alturas",
    desc: "El bioma del aire y las alturas: una montaña del Karakórum del río a las nieves, con íbices y markhores en los cantiles, buitres en las térmicas, marmotas y pikas en las praderas y el leopardo de las nieves. El censo, en la estación de investigación",
    reality: "licencia", source: MOUNTAIN.source,
    rect, deckY: hutY, pad: padAt, arrival: "bioma:helipuerto:centro", nav: "m:nav-bioma",
    ground,
  };
}

/** Is local (x, z) on the island (above the sea)? */
export function inside(x: number, z: number): boolean {
  return landRadius(MOUNTAIN.value, x, z) < 0.99;
}
