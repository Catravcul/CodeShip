/**
 * The animals' bodies of cubes with joints (Berón 2026-11-19: «en Cold Sanctuary existía un modelo de crear
 * personas y animales con cubos y recrear sus articulaciones, lo podemos traer?»). Cold Sanctuary's `CubeBody`
 * builds one cube per `BodyPart` on a plan per body type (biped, quadruped, fish, bird) and wires its `CreatureRig`.
 * Here the same idea, better fitted to three.js: every part hangs from a JOINT (its pivot), so a leg swings from the
 * shoulder and a fluke beats from the tail stock; each part of a species is one InstancedMesh, so a herd costs a
 * handful of draw calls. Plans are per real anatomy (a seal's hind flippers, a walrus's tusks, an orca's dorsal fin,
 * a reindeer's antlers), in fractions of the model's true size (x width, y height, z length, +z forward).
 *
 * Pure: the parts, and each joint's angle at a moment of its gait.
 */
export type BodyKind = "cuadrupedo" | "pinnipedo" | "cetaceo" | "pinguino" | "ave";

export interface BodyPart {
  readonly name: string;
  /** The joint, in fractions of the size: x across, y up from the ground, z forward from the middle. */
  readonly pivot: readonly [number, number, number];
  /** The cube about the joint: centre offset and size, in fractions of the size. */
  readonly box: readonly [number, number, number, number, number, number];
  /** Its colour; undefined = the species' own. */
  readonly color?: number;
  /** How the joint moves: about which axis, how far (rad) and in which phase of the gait (rad). */
  readonly swing?: { readonly axis: "x" | "y" | "z"; readonly amp: number; readonly phase: number };
}

const P = (name: string, pivot: [number, number, number], box: [number, number, number, number, number, number], extra: Omit<BodyPart, "name" | "pivot" | "box"> = {}): BodyPart => ({ name, pivot, box, ...extra });

const BLACK = 0x1a1a1a;
const WHITE = 0xf4f4f0;
const HORN = 0xd8cfb8;

/**
 * The animals of the heights (sanctuary 3's air biome, docs/design/bioma-s3.md): their legs, tails and silhouettes by
 * id, from their sources (Wikipedia and ADW species pages): the ibex's scimitar horns curving back and its beard, the
 * markhor's tall corkscrew horns and its long ruff, the bharal's horns sweeping out sideways and its black flank stripe,
 * the marmot's long tail, the large-eared pika's round ears, the woolly flying squirrel's gliding membrane and bushy
 * tail, the snow leopard's thick tail almost as long as its body, the fox's brush.
 */
const LEG_H: Readonly<Record<string, number>> = { marmota: 0.28, pika: 0.2, ardilla: 0.3, leopardo: 0.4, zorro: 0.42 };
/** Tail length and width (fractions of the size). */
const TAIL: Readonly<Record<string, readonly [number, number]>> = { leopardo: [0.75, 0.16], marmota: [0.3, 0.14], ardilla: [0.55, 0.22], zorro: [0.38, 0.18], pika: [0.01, 0.05] };
const DARK = 0x2e2620;
const HIGH_PARTS: Readonly<Record<string, (legH: number, bodyH: number) => BodyPart[]>> = {
  ibice: (L, B) => [
    P("orejas", [0, L + B * 0.98, 0.36], [0, 0.04, 0, 0.45, 0.05, 0.04]),
    // Scimitar horns: up from the crown, then back over the neck.
    P("cuerno-izq", [-0.1, L + B * 1.02, 0.38], [0, 0.12, -0.04, 0.07, 0.26, 0.07], { color: 0x5a4a38 }),
    P("cuerno-der", [0.1, L + B * 1.02, 0.38], [0, 0.12, -0.04, 0.07, 0.26, 0.07], { color: 0x5a4a38 }),
    P("cuerno-izq-punta", [-0.1, L + B * 1.02, 0.38], [0, 0.26, -0.2, 0.06, 0.1, 0.26], { color: 0x5a4a38 }),
    P("cuerno-der-punta", [0.1, L + B * 1.02, 0.38], [0, 0.26, -0.2, 0.06, 0.1, 0.26], { color: 0x5a4a38 }),
    P("barba", [0, L + B * 0.72, 0.5], [0, -0.06, 0.02, 0.12, 0.12, 0.05], { color: DARK }),
  ],
  markhor: (L, B) => [
    P("orejas", [0, L + B * 0.98, 0.36], [0, 0.04, 0, 0.45, 0.05, 0.04]),
    // Corkscrew horns, tall and twisting: stacked turns, each offset (ADW: «flaring, corkscrew-like horns»).
    ...[0, 1, 2, 3].flatMap((k) => [
      P(`espiral-izq-${k}`, [-0.12, L + B * 1.02, 0.36], [(k % 2 ? -0.05 : 0.02), 0.07 + k * 0.1, -0.02, 0.08, 0.1, 0.08], { color: 0x6a5a44 }),
      P(`espiral-der-${k}`, [0.12, L + B * 1.02, 0.36], [(k % 2 ? 0.05 : -0.02), 0.07 + k * 0.1, -0.02, 0.08, 0.1, 0.08], { color: 0x6a5a44 }),
    ]),
    P("melena", [0, L + B * 0.55, 0.3], [0, -0.12, 0, 0.4, 0.4, 0.2], { color: 0xd8ccb4 }),
  ],
  bharal: (L, B) => [
    P("orejas", [0, L + B * 0.98, 0.36], [0, 0.04, 0, 0.45, 0.05, 0.04]),
    // Horns sweeping out to the sides and back.
    P("cuerno-izq", [-0.12, L + B * 1.0, 0.38], [-0.2, 0.04, -0.06, 0.4, 0.07, 0.08], { color: 0x6a6258 }),
    P("cuerno-der", [0.12, L + B * 1.0, 0.38], [0.2, 0.04, -0.06, 0.4, 0.07, 0.08], { color: 0x6a6258 }),
    P("franja-izq", [-0.5, L + B * 0.15, 0], [0, 0, 0, 0.02, 0.06, 0.85], { color: BLACK }),
    P("franja-der", [0.5, L + B * 0.15, 0], [0, 0, 0, 0.02, 0.06, 0.85], { color: BLACK }),
  ],
  marmota: (L, B) => [P("orejas", [0, L + B * 1.0, 0.36], [0, 0.03, 0, 0.45, 0.06, 0.05])],
  pika: (L, B) => [P("orejas", [0, L + B * 1.05, 0.34], [0, 0.08, -0.02, 0.6, 0.2, 0.06])],
  ardilla: (L, B) => [
    P("orejas", [0, L + B * 1.0, 0.36], [0, 0.04, 0, 0.4, 0.08, 0.04]),
    // The gliding membrane between fore and hind legs.
    P("membrana", [0, L + B * 0.3, 0], [0, 0, -0.02, 1.9, 0.04, 0.6], { color: 0x9a948c }),
  ],
  leopardo: (L, B) => [P("orejas", [0, L + B * 0.98, 0.36], [0, 0.03, 0, 0.4, 0.05, 0.04]), P("manchas", [0, L + B, -0.05], [0, 0, 0, 0.7, 0.02, 0.6], { color: 0x6a6660 })],
  zorro: (L, B) => [P("orejas", [0, L + B * 1.0, 0.36], [0, 0.06, 0, 0.45, 0.12, 0.04], { color: DARK }), P("punta-cola", [0, L + B * 0.75, -0.38], [0, -0.02, -0.42, 0.18, 0.08, 0.08], { color: WHITE })],
};

/** A four-legged mammal: trunk, neck and head forward, four legs from shoulders and hips (diagonal pairs), tail. */
function quadruped(id: string): BodyPart[] {
  const legH = id === "buey-almizclero" ? 0.38 : id === "oso-polar" || id === "osezno" ? 0.42 : id === "liebre-artica" ? 0.35 : LEG_H[id] ?? 0.5;
  const bodyH = 0.92 - legH - 0.12;
  const parts: BodyPart[] = [
    P("tronco", [0, legH, 0], [0, bodyH / 2, -0.03, 1, bodyH, 0.7]),
    P("cuello", [0, legH + bodyH * 0.7, 0.3], [0, 0.04, 0.06, 0.55, bodyH * 0.6, 0.18], { swing: { axis: "x", amp: 0.06, phase: 0 } }),
    P("cabeza", [0, legH + bodyH * 0.85, 0.38], [0, 0, 0.08, 0.6, 0.22, 0.2], { swing: { axis: "x", amp: 0.1, phase: 1.2 } }),
    P("hocico", [0, legH + bodyH * 0.8, 0.5], [0, -0.02, 0.03, 0.3, 0.1, 0.08]),
    P("nariz", [0, legH + bodyH * 0.82, 0.55], [0, 0, 0, 0.12, 0.05, 0.02], { color: BLACK }),
  ];
  const legs: [string, number, number, number][] = [
    ["pata-del-izq", -0.3, 0.27, 0],
    ["pata-del-der", 0.3, 0.27, Math.PI],
    ["pata-tras-izq", -0.3, -0.3, Math.PI],
    ["pata-tras-der", 0.3, -0.3, 0],
  ];
  const hind = id === "liebre-artica" ? 1.35 : 1;
  for (const [n, x, z, ph] of legs) {
    const h = z < 0 ? hind : 1;
    parts.push(P(n, [x, legH + 0.02, z], [0, (-legH * h) / 2, 0, 0.26, legH * h + 0.02, 0.1], { swing: { axis: "x", amp: 0.5, phase: ph } }));
  }
  const tail = TAIL[id];
  parts.push(P("cola", [0, legH + bodyH * 0.75, -0.38], [0, -0.02, -0.06, tail ? tail[1] : 0.12, 0.08, id === "zorro-artico" ? 0.3 : id.includes("lobo") || id.includes("malamute") ? 0.22 : tail ? tail[0] : 0.07], { swing: { axis: "y", amp: 0.35, phase: 0.6 } }));
  const own = HIGH_PARTS[id];
  if (own) {
    parts.push(...own(legH, bodyH));
    return parts;
  }
  // Each species' own silhouette (CubeBody.Differentiate): ears, antlers, horns, the muskox's skirt.
  if (id === "liebre-artica") parts.push(P("orejas", [0, legH + bodyH * 1.05, 0.4], [0, 0.12, -0.02, 0.4, 0.24, 0.04]));
  else if (id === "reno") {
    parts.push(P("asta-izq", [-0.2, legH + bodyH * 1.05, 0.4], [-0.15, 0.14, 0.02, 0.06, 0.28, 0.12], { color: HORN }));
    parts.push(P("asta-der", [0.2, legH + bodyH * 1.05, 0.4], [0.15, 0.14, 0.02, 0.06, 0.28, 0.12], { color: HORN }));
  } else if (id === "buey-almizclero") {
    parts.push(P("cuernos", [0, legH + bodyH * 0.98, 0.42], [0, 0, 0, 0.95, 0.07, 0.06], { color: HORN }));
    parts.push(P("falda", [0, legH, 0], [0, -0.06, -0.02, 1.02, 0.2, 0.72]));
  } else parts.push(P("orejas", [0, legH + bodyH * 0.98, 0.36], [0, 0.04, 0, 0.5, id.includes("zorro") || id.includes("lobo") || id.includes("malamute") ? 0.1 : 0.05, 0.04]));
  return parts;
}

/** A seal or walrus: a long tapering body on the belly, fore-flippers under the chest, hind flippers behind. */
function pinniped(id: string): BodyPart[] {
  const parts: BodyPart[] = [
    P("pecho", [0, 0, 0.1], [0, 0.42, 0.05, 1, 0.85, 0.45]),
    P("vientre", [0, 0, -0.18], [0, 0.32, -0.05, 0.85, 0.62, 0.3], { swing: { axis: "y", amp: 0.12, phase: 0.5 } }),
    P("cabeza", [0, 0.5, 0.32], [0, 0.05, 0.08, 0.55, 0.45, 0.17], { swing: { axis: "x", amp: 0.12, phase: 1 } }),
    P("hocico", [0, 0.5, 0.45], [0, 0, 0.03, 0.32, 0.22, 0.06]),
    P("aleta-izq", [-0.42, 0.15, 0.1], [-0.1, -0.08, 0, 0.3, 0.12, 0.14], { swing: { axis: "z", amp: 0.3, phase: 0 } }),
    P("aleta-der", [0.42, 0.15, 0.1], [0.1, -0.08, 0, 0.3, 0.12, 0.14], { swing: { axis: "z", amp: 0.3, phase: Math.PI } }),
    P("aletas-traseras", [0, 0.15, -0.33], [0, 0, -0.08, 0.7, 0.1, 0.16], { swing: { axis: "y", amp: 0.4, phase: 0 } }),
  ];
  if (id === "morsa") {
    parts.push(P("colmillos", [0, 0.4, 0.5], [0, -0.15, 0.01, 0.22, 0.32, 0.02], { color: HORN }));
    parts.push(P("bigote", [0, 0.48, 0.49], [0, 0, 0.01, 0.4, 0.12, 0.02], { color: 0xc9a27a }));
  }
  return parts;
}

/** A whale or orca: three body segments, the flukes beating up and down, pectoral fins and the dorsal fin. */
function cetacean(id: string): BodyPart[] {
  const orca = id === "orca";
  const parts: BodyPart[] = [
    P("cabeza", [0, 0.5, 0.3], [0, 0, 0.1, 0.85, 0.85, 0.22]),
    P("cuerpo", [0, 0.5, 0], [0, 0, 0.05, 1, 1, 0.4]),
    P("pedunculo", [0, 0.5, -0.15], [0, 0, -0.12, 0.45, 0.55, 0.28], { swing: { axis: "x", amp: 0.15, phase: 0 } }),
    P("cola", [0, 0.5, -0.4], [0, 0, -0.05, 1.3, 0.08, 0.12], { swing: { axis: "x", amp: 0.35, phase: 0.9 } }),
    P("aleta-pec-izq", [-0.45, 0.35, 0.2], [-0.25, -0.05, -0.04, 0.5, 0.06, 0.1], { swing: { axis: "z", amp: 0.15, phase: 0 }, ...(orca ? {} : { color: 0xb8c0c8 }) }),
    P("aleta-pec-der", [0.45, 0.35, 0.2], [0.25, -0.05, -0.04, 0.5, 0.06, 0.1], { swing: { axis: "z", amp: 0.15, phase: Math.PI }, ...(orca ? {} : { color: 0xb8c0c8 }) }),
    P("dorsal", [0, 0.95, 0], [0, orca ? 0.35 : 0.06, -0.02, 0.08, orca ? 0.7 : 0.12, orca ? 0.08 : 0.06]),
  ];
  if (orca) {
    parts.push(P("vientre", [0, 0.2, 0.1], [0, -0.04, 0, 0.8, 0.12, 0.38], { color: WHITE }));
    parts.push(P("parche-izq", [-0.43, 0.65, 0.3], [0, 0, 0.02, 0.02, 0.18, 0.08], { color: WHITE }));
    parts.push(P("parche-der", [0.43, 0.65, 0.3], [0, 0, 0.02, 0.02, 0.18, 0.08], { color: WHITE }));
  } else parts.push(P("pliegues", [0, 0.1, 0.18], [0, -0.04, 0, 0.75, 0.1, 0.3], { color: 0xc9ccd0 }));
  return parts;
}

/** A penguin: upright body with the white belly, head and beak, flippers that flap, feet. */
function penguin(id: string): BodyPart[] {
  const emperor = id === "pinguino-emperador";
  const chick = id === "polluelo-pinguino";
  // The gentoo: orange-red bill and the white band over the crown from eye to eye (ADW, Pygoscelis papua).
  const gentoo = id === "papua";
  return [
    P("cuerpo", [0, 0.1, 0], [0, 0.3, 0, 1, 0.62, 0.9], { swing: { axis: "z", amp: 0.08, phase: 0 } }),
    P("pecho", [0, 0.1, 0.38], [0, 0.28, 0.02, 0.82, 0.55, 0.12], { color: chick ? 0x9a9aa2 : WHITE, swing: { axis: "z", amp: 0.08, phase: 0 } }),
    P("cabeza", [0, 0.72, 0], [0, 0.09, 0.03, 0.75, 0.2, 0.75], { swing: { axis: "y", amp: 0.2, phase: 1.5 } }),
    P("pico", [0, 0.8, 0.4], [0, 0, 0.12, 0.2, 0.06, 0.35], { color: emperor ? 0xe08a2a : gentoo ? 0xe0502a : BLACK }),
    ...(gentoo ? [P("banda", [0, 0.86, 0], [0, 0, 0.02, 0.8, 0.05, 0.5], { color: WHITE })] : []),
    ...(emperor ? [P("mancha", [0, 0.72, 0.2], [0, 0, 0.2, 0.85, 0.12, 0.3], { color: 0xf2c94c })] : []),
    P("aleta-izq", [-0.5, 0.6, 0], [-0.05, -0.2, 0, 0.12, 0.42, 0.45], { swing: { axis: "z", amp: 0.35, phase: 0 } }),
    P("aleta-der", [0.5, 0.6, 0], [0.05, -0.2, 0, 0.12, 0.42, 0.45], { swing: { axis: "z", amp: 0.35, phase: Math.PI } }),
    P("pie-izq", [-0.2, 0.1, 0.1], [0, -0.05, 0.1, 0.3, 0.06, 0.45], { color: 0xd88a8a, swing: { axis: "x", amp: 0.3, phase: 0 } }),
    P("pie-der", [0.2, 0.1, 0.1], [0, -0.05, 0.1, 0.3, 0.06, 0.45], { color: 0xd88a8a, swing: { axis: "x", amp: 0.3, phase: Math.PI } }),
  ];
}

/**
 * A flying bird (the snow petrel): body, head and beak, long wings flapping, tail. Size x is the wingspan. The birds of
 * the heights by id, from their sources: the bearded vulture's rusty body, pale head and long wedge tail; the griffon's
 * pale body and dark flight feathers; the golden eagle's golden nape; the chough's yellow bill; the snow pigeon's dark
 * head; the bar-headed goose's white head with its two black bars and orange bill; the wallcreeper's crimson wings.
 */
const BIRD: Readonly<Record<string, { body?: number; head?: number; beak?: number; tail?: number; tips?: number; nape?: number; bars?: boolean }>> = {
  quebrantahuesos: { body: 0xd89a5a, head: 0xe8dcc0, tail: 0.45 },
  buitre: { tips: 0x3a3028, beak: 0x9a9088 },
  aguila: { nape: 0xc8a050, beak: 0x3a3a3a },
  chova: { beak: 0xe8c830 },
  paloma: { head: 0x4a4a50, tips: 0x5a5a60 },
  ansar: { head: WHITE, beak: 0xe8a040, bars: true },
  treparriscos: { tips: 0xc8283c },
  cernicalo: { head: 0x8a9096 },
};
function bird(id = ""): BodyPart[] {
  const v = BIRD[id] ?? {};
  const parts = [
    P("cuerpo", [0, 0.5, 0], [0, 0, 0, 0.22, 0.8, 0.7], v.body !== undefined ? { color: v.body } : {}),
    P("cabeza", [0, 0.6, 0.35], [0, 0.05, 0.1, 0.18, 0.7, 0.3], v.head !== undefined ? { color: v.head } : {}),
    P("pico", [0, 0.6, 0.6], [0, 0, 0.06, 0.06, 0.2, 0.15], { color: v.beak ?? BLACK }),
    P("ala-izq", [-0.1, 0.6, 0.05], [-0.22, 0, 0, 0.44, 0.15, 0.45], { swing: { axis: "z", amp: 0.7, phase: 0 } }),
    P("ala-der", [0.1, 0.6, 0.05], [0.22, 0, 0, 0.44, 0.15, 0.45], { swing: { axis: "z", amp: 0.7, phase: Math.PI } }),
    P("cola", [0, 0.5, -0.32], [0, 0, -0.1, 0.15, 0.2, v.tail ?? 0.25]),
  ];
  if (v.tips !== undefined) {
    parts.push(P("remeras-izq", [-0.1, 0.6, 0.05], [-0.4, 0, -0.05, 0.1, 0.16, 0.3], { color: v.tips, swing: { axis: "z", amp: 0.7, phase: 0 } }));
    parts.push(P("remeras-der", [0.1, 0.6, 0.05], [0.4, 0, -0.05, 0.1, 0.16, 0.3], { color: v.tips, swing: { axis: "z", amp: 0.7, phase: Math.PI } }));
  }
  if (v.nape !== undefined) parts.push(P("nuca", [0, 0.6, 0.3], [0, 0.3, 0, 0.19, 0.2, 0.12], { color: v.nape }));
  if (v.bars) parts.push(P("barras", [0, 0.6, 0.35], [0, 0.38, 0.06, 0.19, 0.08, 0.2], { color: BLACK }));
  return parts;
}

/** The parts of a model's body by its shape, or undefined if it has no jointed body. */
export function bodyPlan(shape: string, id: string): readonly BodyPart[] | undefined {
  switch (shape) {
    case "cuadrupedo":
      return quadruped(id);
    case "pinnipedo":
      return pinniped(id);
    case "cetaceo":
      return cetacean(id);
    case "pinguino":
      return penguin(id);
    case "ave":
      return bird(id);
    default:
      return undefined;
  }
}

/** Gait cycles a second at a walk (a swim stroke, a wingbeat): quick for small animals, slow for whales. */
export function gaitHz(kind: BodyKind, lengthM: number): number {
  if (kind === "ave") return 3;
  if (kind === "cetaceo") return 0.35;
  return Math.max(0.6, Math.min(2.4, 1.6 / Math.sqrt(Math.max(0.2, lengthM))));
}

/**
 * The joint's angle at time `t` (s): the full swing while it moves, a slow breath-sized sway while it rests (a tail,
 * a head looking round). Flippers and wings flap in their own phase.
 */
export function jointAngle(p: BodyPart, t: number, hz: number, moving: boolean): number {
  if (!p.swing) return 0;
  const w = 2 * Math.PI * hz * t + p.swing.phase;
  return moving ? Math.sin(w) * p.swing.amp : Math.sin(w * 0.25) * p.swing.amp * 0.25;
}
