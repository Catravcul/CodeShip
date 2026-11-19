import { C, pz, rep, type ModelDef, type Part } from "./kit";
import { TREE } from "@modules/aerial-sanctuary/data/facts";

/**
 * The tree-buildings' doors and masks, and the island's trees (Berón 2026-11-19: «no consigo ver las puertas,
 * quizás se les debe agregar un marco», «tampoco he visto las mascarillas de oxígeno», «ni los árboles de la isla»).
 */
const CS = (what: string) => `Cold Sanctuary, ${what}`;
const D = TREE.door.value;
const AMBER = 0xd9822b;
const DARK = 0x3a2a1e;

/** The door's frame: two jambs and a lintel round the 7 × 7 m opening in the 1 m acrylic wall, a lamp on top. */
const frame: Part[] = [
  C(-(D.w / 2 + 0.25), (D.h + 0.5) / 2, 0, 0.5, D.h + 0.5, 1.4, AMBER),
  C(D.w / 2 + 0.25, (D.h + 0.5) / 2, 0, 0.5, D.h + 0.5, 1.4, AMBER),
  C(0, D.h + 0.25, 0, D.w + 1, 0.5, 1.4, AMBER),
  C(0, 0.04, 0, D.w, 0.08, 1.4, DARK),
  C(0, D.h + 0.65, 0.75, 1.2, 0.3, 0.2, 0xfff2b0),
];

/** A rack of breathing masks: a board with six masks on their hooks and their bottles below. */
const rack: Part[] = [C(0, 0.9, 0, 1.3, 1.8, 0.08, 0x5a6670), C(0, 0.25, 0.18, 1.3, 0.05, 0.3, 0x5a6670)];
for (let i = 0; i < 6; i++) {
  const x = -0.5 + (i % 3) * 0.5;
  const y = i < 3 ? 1.45 : 1.0;
  rack.push(C(x, y, 0.09, 0.2, 0.15, 0.1, 0x1f8fa3), C(x, y + 0.02, 0.15, 0.17, 0.07, 0.02, 0xbfefff));
  rack.push(C(x, 0.42, 0.18, 0.1, 0.3, 0.1, 0xf2b134));
}

/**
 * A mountain birch of blocks (CubeTree.cs with `birch`: a tall tapering trunk, tiers of long branches rising and
 * opening, a flat platform at each branch's tip where birds and the snow bees can rest), 10 m.
 */
function birch(): Part[] {
  const bark = 0xe9e4d8;
  const leaf = 0x6f9a4a;
  const out: Part[] = [];
  for (let i = 0; i < 10; i++) out.push(C(0, i + 0.5, 0, 0.7 - i * 0.04, 1, 0.7 - i * 0.04, i % 3 === 1 ? 0x3b3a36 : bark));
  const tiers = [3.5, 5.5, 7.5];
  tiers.forEach((y, t) => {
    const len = 3.2 - t * 0.7;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + t * 0.6;
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      out.push(C((dx * len) / 2, y + 0.4, (dz * len) / 2, Math.abs(dx) * len + 0.25, 0.25, Math.abs(dz) * len + 0.25, bark));
      out.push(C(dx * len, y + 0.9, dz * len, 1.6, 0.9, 1.6, leaf));
    }
  });
  out.push(C(0, 10.4, 0, 1.8, 1.2, 1.8, leaf));
  return out;
}

export const EDIFICIO_MODELS: readonly ModelDef[] = [
  // The photobioreactor facade (Cold Sanctuary Fotobio.cs, FotobioSpec): x along the face, +z away from the trunk.
  pz("fotobio-modulo", "maquina", "fotobiorreactores", "Módulo de fotobiorreactor: arpa de 28 tubos de vidrio (Ø 7 cm) con espirulina, 3 × 4 m", 0x2e8a4f, [
    C(0, 0.15, 0, 3.2, 0.3, 0.16, 0x9ea6ad), C(0, 4.45, 0, 3.2, 0.3, 0.16, 0x9ea6ad),
    ...rep(28, (i) => [C(0, 0.3 + (i + 0.5) * 0.14, 0, 3, 0.07, 0.07, 0x2e8a4f)]),
    ...[-1, 1].flatMap((sx) => [C(sx * 1.56, 2.3, 0, 0.08, 4.6, 0.1, 0x9ea6ad), C(sx * 1.56, 0.5, -0.4, 0.1, 0.1, 0.8, 0x9ea6ad), C(sx * 1.56, 4.1, -0.4, 0.1, 0.1, 0.8, 0x9ea6ad)]),
    ...rep(4, (k) => [C(0, 0.8 + k, -0.22, 3, 0.05, 0.04, 0xf2f2e6)]),
  ], "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Fotobio.cs y Assets/Scripts/World/FotobioFacade.cs (FotobioSpec: arpas tipo MELiSSA de Arthrospira, LED detrás)"),
  pz("fotobio-columna", "maquina", "fotobiorreactores", "Bomba, tubería de subida y desgasificador de una columna de fotobiorreactores", 0x5a6470, [
    C(0, 0.3, 0, 0.9, 0.6, 0.5), C(1.7, 23.6, 0, 0.1, 46, 0.1, 0x9ea6ad), C(1.0, 47.6, 0, 0.35, 1.2, 0.35, 0xc7ccd6),
  ], "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Fotobio.cs (bomba abajo, desgasificador arriba)"),
  pz("fotobio-quilla", "maquina", "fotobiorreactores", "Panel plano de fotobiorreactor (2,4 × 2 m) de la quilla bajo la rama, con sus LED a los dos lados", 0x2e8a4f, [
    C(0, 0.04, 0, 2.4, 0.08, 0.1, 0x9ea6ad), C(0, 1.08, 0, 2.4, 2, 0.05, 0x2e8a4f), C(0, 2.12, 0, 2.4, 0.08, 0.1, 0x9ea6ad),
    C(-0.9, 3.31, 0, 0.08, 2.3, 0.08, 0x9ea6ad), C(0.9, 3.31, 0, 0.08, 2.3, 0.08, 0x9ea6ad),
    C(0, 1.08, -0.28, 2.4, 0.04, 0.04, 0xf2f2e6), C(0, 1.08, 0.28, 2.4, 0.04, 0.04, 0xf2f2e6),
  ], "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Fotobio.cs (quillas: FotobioSpec.Keel, 6 paneles de 2,4 × 2 m a 2,4 m bajo la rama)"),
  pz("fotobio-bomba", "maquina", "fotobiorreactores", "Bomba de la quilla de fotobiorreactores", 0x5a6470, [C(0, 0.3, 0, 0.6, 0.6, 0.5), C(0, 0.85, 0, 0.08, 0.5, 0.08, 0x9ea6ad)], "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Fotobio.cs (su bomba)"),
  pz("fotobio-cuadro", "maquina", "fotobiorreactores", "Cuadro de control de los fotobiorreactores (bombas, LED, pH y temperatura)", 0x5a6470, [
    C(0, 0.4, 0, 0.1, 0.8, 0.1), C(0, 1.6, 0, 1.2, 1.6, 0.4), C(-0.3, 1.9, 0.21, 0.4, 0.25, 0.02, 0x66bb6a), C(0.3, 1.5, 0.21, 0.3, 0.6, 0.02, 0xf2f2f2),
  ], "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Fotobio.cs Cuadro_fotobio"),
  pz("marco-puerta-tronco", "edificio", "puertas", "Marco de puerta del tronco (7 × 7 m, el campo que retiene el agua)", AMBER, frame, "ficcion", CS("TreeSpec door 7 × 7 m (Helix.cs); el marco, nuestro para que se vean")),
  pz("perchero-mascaras", "mueble", "mascaras", "Perchero de máscaras de respirar (6, con su botella)", 0x5a6670, rack, "ficcion", CS("BreathingMask.cs / MaskStation Kind.Rack: junto a cada puerta del tronco")),
  pz("estacion-mascaras", "mueble", "mascaras", "Estación de máscaras dentro del agua", 0x5a6670, rack, "ficcion", CS("BreathingMask.cs / MaskStation Kind.Station: dentro del agua, junto a cada puerta")),
  pz("abedul-isla", "naturaleza", "arboles-isla", "Abedul de montaña de la isla (10 m)", 0xe9e4d8, birch(), "real", CS("SampleSceneBuilder.BuildIceFlora: 6 abedules (Betula pubescens subsp. czerepanovii) en la isla, con panales")),
];
