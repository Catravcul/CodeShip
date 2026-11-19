import type { Rect } from "../domain/walk";
import type { IslandPad } from "../domain/travel";
import type { AreaDef, IslandDef, MachineDef, Prop } from "./layout";
import type { Reality } from "@core/reality";
import { wallWithGaps } from "../domain/walk";
import { fact } from "./sources";

/**
 * THE BIOME'S ISLAND (docs/design/bioma-s3.md): a small subantarctic island like Bird Island off South Georgia, where
 * the British Antarctic Survey keeps a research station among fur seals, albatrosses and penguins. Tussac slopes, moss
 * banks and lichen rocks inland, a beach for the seals, a gentoo colony on the point, kelp in the sea, and the field
 * station with its census board. Its place in the sanctuary's sea is ours; its parts copy the real island's.
 */
export const BIOME_ISLAND = {
  centre: fact({ x: 760, z: 230 }, "licencia", "nuestro: en el mar del santuario 3, a ~470 m de la isla de entrenamiento"),
  half: fact({ x: 150, z: 100 }, "licencia", "nuestro: unos 300 × 200 m (Bird Island mide 4,8 × 0,8 km; aquí, lo que cabe en el móvil)"),
  station: fact({ x: 12, z: 6, y: 3.2 }, "licencia", "Wikipedia, Bird Island (South Georgia): estación del British Antarctic Survey para 4–10 personas que estudia los albatros, los lobos marinos y los pingüinos; su planta es nuestra"),
};

/** The shore's radius over the ellipse's, at angle `a` (rad): a cove and two points (ours). */
export const shoreAt = (a: number): number => 1 + 0.07 * Math.sin(3 * a + 0.6) + 0.05 * Math.sin(5 * a + 1.7);

/** The zones of the island, in its own frame (m from its centre, before the presentation's scale). */
export const BIOME_ZONES: readonly { id: string; label: string; desc: string; reality: Reality; r: Rect; point: { x: number; z: number } }[] = [
  { id: "estacion", label: "Estación de investigación", desc: "Una cabaña de campo como la de Bird Island: dentro, el tablón del censo con cada especie, sus etapas, qué come y lo último que ha pasado", reality: "licencia", r: { x0: -14, x1: 14, z0: -14, z1: 14 }, point: { x: 0, z: -5 } },
  { id: "playa", label: "Playa de los lobos marinos", desc: "Grava y arena al sur: los lobos marinos, los elefantes marinos y a veces una foca leopardo salen aquí a parir, mudar y descansar", reality: "licencia", r: { x0: -70, x1: 70, z0: -96, z1: -62 }, point: { x: 0, z: -70 } },
  { id: "colonia", label: "Colonia de pingüinos papúa", desc: "En la punta este, sobre guijarros: nidos de piedras, pollos en guardería; los picovainas y los págalos rondan", reality: "licencia", r: { x0: 90, x1: 150, z0: -40, z1: 30 }, point: { x: 98, z: -4 } },
  { id: "tussac", label: "Ladera de tussac", desc: "Matas de tussac de 2 m sobre sus pedestales, con nidos de albatros viajero y bisbitas", reality: "licencia", r: { x0: -150, x1: -20, z0: -55, z1: 60 }, point: { x: -40, z: 0 } },
  { id: "musgo", label: "Bancos de musgo y liquen", desc: "Al norte, en la parte fría: bancos de musgo, hierba pilosa antártica, rocas con liquen; colémbolos y mosquitos sin alas en el suelo; petreles dameros en las rocas", reality: "licencia", r: { x0: -40, x1: 90, z0: 30, z1: 98 }, point: { x: 20, z: 40 } },
  { id: "kelp", label: "Orilla del kelp", desc: "Al oeste el bosque de kelp gigante: kril, peces linterna, peces de hielo y, más hondo, la austromerluza y el calamar", reality: "licencia", r: { x0: -175, x1: -135, z0: -70, z1: 40 }, point: { x: -132, z: -20 } },
];

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

/** Builds the island at presentation scale `k` (the plan widened about its centre, §2.4); returns its definition. */
export function buildBiomeIsland(b: IslandBuilder, k: number, helideckM: number): IslandDef {
  const C = BIOME_ISLAND.centre.value;
  const H = BIOME_ISLAND.half.value;
  const P = (x: number, z: number) => ({ x: C.x + x * k, z: C.z + z * k });
  const R = (r: Rect): Rect => ({ x0: C.x + r.x0 * k, x1: C.x + r.x1 * k, z0: C.z + r.z0 * k, z1: C.z + r.z1 * k });
  // The ground: strips 8 m deep, each as wide as the shore lets it be at both of its edges.
  const strip = 8;
  for (let z = -H.z * 1.12; z < H.z * 1.12; z += strip) {
    let half = Infinity;
    for (const zz of [z, z + strip]) half = Math.min(half, halfWidthAt(zz));
    if (half <= 2) continue;
    const xs = spanAt(z, z + strip);
    b.floor("bioma:isla", 0, R({ x0: xs[0], x1: xs[1], z0: z, z1: z + strip }));
  }
  // The field station: a hut with its door to the south, the census board on its north wall.
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
  // Walls keep their true thickness and height; only their place is widened.
  for (const w of walls) {
    const c = P((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2);
    const sx = (w.x1 - w.x0) * (w.x1 - w.x0 > 1 ? k : 1);
    const sz = (w.z1 - w.z0) * (w.z1 - w.z0 > 1 ? k : 1);
    b.block("cabana", { x0: c.x - sx / 2, x1: c.x + sx / 2, z0: c.z - sz / 2, z1: c.z + sz / 2, y0: w.y0, y1: w.y1 });
  }
  b.floor("bioma:estacion", 0.02, R({ x0: -hx + 0.1, x1: hx - 0.1, z0: -hz + 0.1, z1: hz - 0.1 }));
  b.block("cabana-techo", { ...R({ x0: -hx - 0.4, x1: hx + 0.4, z0: -hz - 0.4, z1: hz + 0.4 }), y0: st.y, y1: st.y + 0.25 }, false);
  // The census board stands against the north wall; she reads it from 1,5 m in front.
  const board = P(0, hz - 0.4);
  b.block("tablon", { x0: board.x - 1.2, x1: board.x + 1.2, z0: board.z - 0.08, z1: board.z + 0.08, y0: 0.9, y1: 2.2 }, false);
  // The helipad, east of the hut.
  const hd = helideckM / 2;
  const pad = P(40, 0);
  const padR = { x0: pad.x - hd, x1: pad.x + hd, z0: pad.z - hd, z1: pad.z + hd };
  b.floor("bioma:helipuerto", 0.05, padR);
  b.props.push({ kind: "helideck", x: pad.x, y: 0.05, z: pad.z, size: { x: hd * 2, y: 0.1, z: hd * 2 } });

  // The way: helipad → hut → each zone.
  const padMid = b.point("bioma:helipuerto:centro", pad.x, 0.05, pad.z);
  const padEdge = b.point("bioma:helipuerto:borde", pad.x - hd + 1.5, 0.05, pad.z);
  const outside = P(0, -hz - 3);
  const doorOut = b.point("bioma:estacion:puerta", outside.x, 0, outside.z);
  const inside = P(0, hz - 2);
  const census = b.point("bioma:estacion:censo", inside.x, 0.02, inside.z);
  const doorIn = P(0, -hz + 0.8);
  const doorInP = b.point("bioma:estacion:dentro", doorIn.x, 0.02, doorIn.z);
  b.link(padMid, padEdge, doorOut, doorInP, census);
  for (const z of BIOME_ZONES) {
    const r = R(z.r);
    const isle = z.id === "estacion" ? census : b.point(`bioma:${z.id}`, P(z.point.x, z.point.z).x, 0, P(z.point.x, z.point.z).z);
    if (z.id !== "estacion") b.link(doorOut, isle);
    b.area({ id: `bioma:${z.id}`, island: "bioma", label: z.label, desc: z.desc, reality: z.reality, centre: { x: (r.x0 + r.x1) / 2, y: 4, z: (r.z0 + r.z1) / 2 }, half: { x: (r.x1 - r.x0) / 2, y: 4, z: (r.z1 - r.z0) / 2 }, point: isle });
  }
  b.area({ id: "bioma:isla", island: "bioma", label: "Isla subantártica", desc: "Una isla como Bird Island (Georgia del Sur): una cadena alimenticia viva de plantas, invertebrados, peces, aves y focas", reality: "licencia", centre: { x: C.x, y: 4, z: C.z }, half: { x: H.x * k, y: 4, z: H.z * k }, point: doorOut });
  const kiosk = P(40 - hd / k - 2.5, -4);
  b.machine({ id: "nav-bioma", kind: "navegacion", island: "bioma", area: "bioma:helipuerto", label: "Máquina de navegación", what: "El mapa de las islas: helicóptero a la isla de entrenamiento", x: kiosk.x, y: 0, z: kiosk.z }, padEdge);
  b.block("kiosco", { x0: kiosk.x - 1.7 - 0.5, x1: kiosk.x - 1.7 + 0.5, z0: kiosk.z - 0.5, z1: kiosk.z + 0.5, y0: 0, y1: 1.3 });
  b.props.push({ kind: "nav-machine", x: kiosk.x - 1.7, y: 0, z: kiosk.z, rot: Math.PI / 2 });
  const padAt: IslandPad = { island: "bioma", at: { x: pad.x, y: 0.05, z: pad.z }, crafts: ["helicoptero"] };
  return {
    id: "bioma", name: "Isla subantártica",
    desc: "Un bioma vivo como el de Georgia del Sur: tussac, musgo, liquen y kelp; kril y peces; pingüinos, albatros, petreles, págalos y focas que nacen, comen, cazan y mueren. El censo, en la estación de investigación",
    reality: "licencia", source: BIOME_ISLAND.station.source,
    rect: { x0: C.x - H.x * 1.12 * k, x1: C.x + H.x * 1.12 * k, z0: C.z - H.z * 1.12 * k, z1: C.z + H.z * 1.12 * k },
    deckY: 0, pad: padAt, arrival: "bioma:helipuerto:centro", nav: "m:nav-bioma",
  };
}

/** Half the island's width (local m) at depth `z`. */
function halfWidthAt(z: number): number {
  const s = spanAt(z, z);
  return (s[1] - s[0]) / 2;
}

/** The island's extent in x (local m) over the band z0…z1: inside the shore at both edges. */
export function spanAt(z0: number, z1: number): [number, number] {
  const H = BIOME_ISLAND.half.value;
  let lo = -Infinity;
  let hi = Infinity;
  for (const z of [z0, z1]) {
    // March along the shore: the extent where the radius at each angle covers (x, z).
    let a = 0;
    let b = 0;
    for (let x = 0; x <= H.x * 1.2; x += 1) if (inside(x, z)) a = x;
    for (let x = 0; x >= -H.x * 1.2; x -= 1) if (inside(x, z)) b = x;
    lo = Math.max(lo, b);
    hi = Math.min(hi, a);
  }
  return [lo, hi];
}

/** Is local (x, z) on the island? */
export function inside(x: number, z: number): boolean {
  const H = BIOME_ISLAND.half.value;
  const a = Math.atan2(z / H.z, x / H.x);
  return Math.hypot(x / H.x, z / H.z) <= shoreAt(a);
}
