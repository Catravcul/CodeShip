import { S1_SOURCES as S } from "../sources";
import { C, CHROME, IRON, PAD, WOOD, m, pz, type ModelDef } from "./kit";

/** The first models: the gym's floor 0, the animals and the people. */
export const BASE_MODELS: readonly ModelDef[] = [
  // ── Gym, floor 0: plate-loaded machines (10 types; footprints of real machines, docs/gimnasio-maquinas.md) ──
  m("gym-press-pecho", "maquina", "gimnasio-placas", "Press de pecho", 1.4, 1.48, 1.1, IRON, "maquina", "real", `${S.gymMachines}: Life Fitness Insignia`),
  m("gym-press-hombros", "maquina", "gimnasio-placas", "Press de hombros", 1.45, 1.55, 1.47, IRON, "maquina", "real", `${S.gymMachines}: Precor Vitality`),
  m("gym-jalon", "maquina", "gimnasio-placas", "Jalón al pecho (espalda)", 1.4, 1.85, 1.52, IRON, "maquina", "real", `${S.gymMachines}: Life Fitness Axiom`),
  m("gym-remo", "maquina", "gimnasio-placas", "Remo sentado", 1.22, 1.78, 1.42, IRON, "maquina", "real", `${S.gymMachines}: Precor Vitality`),
  m("gym-prensa", "maquina", "gimnasio-placas", "Prensa de piernas 45°", 1.15, 1.52, 2.12, IRON, "maquina", "real", `${S.gymMachines}: Force USA`),
  m("gym-extension", "maquina", "gimnasio-placas", "Extensión de cuádriceps", 1.37, 1.8, 1.37, IRON, "maquina", "real", `${S.gymMachines}: Body-Solid Pro Select`),
  m("gym-curl-femoral", "maquina", "gimnasio-placas", "Curl femoral tumbado", 0.64, 0.69, 1.57, IRON, "maquina", "real", `${S.gymMachines}: Body-Solid Powerline`),
  m("gym-hip-thrust", "maquina", "gimnasio-placas", "Hip thrust (glúteos)", 1.52, 0.89, 1.57, IRON, "maquina", "real", `${S.gymMachines}: Nautilus Glute Drive`),
  m("gym-gemelos", "maquina", "gimnasio-placas", "Gemelos sentado", 0.6, 1.0, 1.22, IRON, "maquina", "real", `${S.gymMachines}: Titan`),
  m("gym-curl-biceps", "maquina", "gimnasio-placas", "Curl de bíceps y tríceps", 1.23, 1.4, 1.34, IRON, "maquina", "real", `${S.gymMachines}: Hoist HD-3100`),
  // ── Gym, floor 0: free weights (docs/entrenamiento-areas.md §3.2) ──
  m("gym-estante-mancuernas", "mueble", "gimnasio-peso-libre", "Estante de mancuernas (pares de 2 a 40 kg)", 2.3, 0.95, 0.7, IRON, "caja", "real", `${S.csGym}; estante real de 1,5–2,3 × 0,5–0,85 × 0,85–1,0 m`),
  m("gym-banco-fid", "mueble", "gimnasio-peso-libre", "Banco regulable FID (0–85°)", 0.71, 0.79, 1.4, PAD, "banco", "real", `${S.csGym}; Body-Solid FID46: 191 × 71 × 79 cm`),
  m("gym-jaula", "maquina", "gimnasio-peso-libre", "Jaula de sentadillas (power rack)", 2.2, 2.3, 1.4, IRON, "jaula", "real", `${S.csGym}; caja de 1,2–1,3 × 1,2–1,5 × 2,1–2,3 m con barra de 2,2 m`),
  m("gym-press-banca", "maquina", "gimnasio-peso-libre", "Press de banca plano olímpico", 2.2, 1.3, 1.7, PAD, "banco", "real", `${S.csGym}; Life Fitness: 130 × 132 × 130 cm, área de uso 191 × 305 cm`),
  m("gym-press-inclinado", "maquina", "gimnasio-peso-libre", "Press de banca inclinado", 2.2, 1.4, 1.7, PAD, "banco", "real", S.csGym),
  m("gym-smith", "maquina", "gimnasio-peso-libre", "Máquina Smith", 2.0, 2.2, 1.5, CHROME, "maquina", "real", `${S.csGym}; Smith: 137–145 × 178 × 211–230 cm`),
  m("gym-plataforma", "mueble", "gimnasio-peso-libre", "Plataforma de peso muerto (madera y caucho)", 2.4, 0.05, 2.4, 0xcca36b, "caja", "real", `${S.csGym}; plataforma de halterofilia de 8 × 8 ft`),
  m("gym-arbol-discos", "utensilio", "gimnasio-peso-libre", "Árbol de discos", 0.6, 1.3, 0.6, IRON, "caja", "real", S.csGym),
  m("gym-soporte-barras", "utensilio", "gimnasio-peso-libre", "Soporte de barras olímpicas", 0.6, 1.2, 0.6, IRON, "caja", "real", S.csGym),
  m("gym-fuente", "mueble", "gimnasio-servicios", "Fuente de agua", 0.5, 1.05, 0.4, CHROME, "caja", "real", `${S.csGym} (Fuente_de_agua: 0,5 × 1 × 0,4 m)`),
  m("gym-toallas", "mueble", "gimnasio-servicios", "Toallas", 0.8, 1.32, 0.4, WOOD, "caja", "real", `${S.csGym} (Toallas: mueble de 0,8 × 1,2 × 0,4 m)`),
  m("gym-suelo-caucho", "mueble", "gimnasio-servicios", "Suelo de caucho", 1, 0.02, 1, 0x2e2e33, "caja", "real", S.csGym),
  // A carpet park at each tree-building's crown and foot (Berón 2026-11-19: «deberían haber parqueaderos de alfombras en
  // las copas y pies de los árbol-edificio»): a deck with four painted bays, a carpet resting in three, and the sign.
  pz("parqueadero-alfombras", "mueble", "transporte", "Parqueadero de alfombras voladoras (4 plazas)", 0x6f5a48, [
    C(0, 0.03, 0, 8.4, 0.06, 6.0, 0x6f5a48),
    ...[-3.0, -1.0, 1.0, 3.0].flatMap((x) => [C(x - 0.95, 0.065, 0, 0.06, 0.01, 5.0, 0xe8e0c8), C(x + 0.95, 0.065, 0, 0.06, 0.01, 5.0, 0xe8e0c8)]),
    ...[[-3.0, 0x9a3b3b], [-1.0, 0x2f7f8f], [3.0, 0x7a5a9a]].flatMap(([x, c]) => [C(x as number, 0.1, 0, 1.5, 0.04, 2.6, c as number), C(x as number, 0.1, -1.36, 1.5, 0.03, 0.12, 0xe8d8a8), C(x as number, 0.1, 1.36, 1.5, 0.03, 0.12, 0xe8d8a8)]),
    C(-4.0, 1.1, -2.8, 0.08, 2.2, 0.08, 0x4a4f57),
    C(-4.0, 2.0, -2.8, 0.7, 0.5, 0.04, 0x2f7f8f),
  ], "ficcion", `${S.csGym} (GymCarpetSpot, Alfombras_Santuario); el parqueadero en copa y pie, nuestro`),
  // A floor's carpet station (Berón 2026-11-20: «una estación de alfombras por cada piso»; Cold Sanctuary's carpet area,
  // ~7 × 4 m with two carpets): a pad with its border, two berths and the post with its sign. The two carpets float
  // over it, waving, and a lit orrery hangs above (drawn by the scene, adapters/three/carpet-stations.ts).
  pz("estacion-alfombras", "mueble", "transporte", "Estación de alfombras voladoras (2 plazas)", 0x2f6f7f, [
    C(0, 0.02, 0, 7.6, 0.04, 4.4, 0x24414a),
    C(0, 0.045, -2.15, 7.6, 0.01, 0.1, 0xffcf5a), C(0, 0.045, 2.15, 7.6, 0.01, 0.1, 0xffcf5a),
    C(-3.75, 0.045, 0, 0.1, 0.01, 4.4, 0xffcf5a), C(3.75, 0.045, 0, 0.1, 0.01, 4.4, 0xffcf5a),
    ...[-1.6, 1.6].flatMap((x) => [C(x - 0.95, 0.05, 0, 0.06, 0.01, 3.0, 0xe8e0c8), C(x + 0.95, 0.05, 0, 0.06, 0.01, 3.0, 0xe8e0c8)]),
    C(3.4, 1.1, -1.9, 0.08, 2.2, 0.08, 0x4a4f57),
    C(3.4, 2.0, -1.9, 0.7, 0.5, 0.04, 0x2f7f8f),
  ], "ficcion", `${S.csGym} (GymCarpetSpot, Alfombras_Santuario: un área de alfombras por piso)`),
  m("alfombras-zona", "mueble", "transporte", "Zona de alfombras voladoras (7,6 × 4,4 m)", 7.6, 0.03, 4.4, 0x9a3b3b, "caja", "ficcion", `${S.csGym} (GymCarpetSpot)`),

  // ── Animals (adults, true size: body length along z, height to the top along y) ──
  m("oso-polar", "animal", "fauna-tierra", "Oso polar", 0.9, 1.5, 2.5, 0xf2efe6, "cuadrupedo", "real", S.polarBear),
  m("lobo-artico", "animal", "fauna-tierra", "Lobo ártico", 0.35, 0.75, 1.4, 0xe8e6df, "cuadrupedo", "real", S.arcticWolf),
  m("zorro-artico", "animal", "fauna-tierra", "Zorro ártico", 0.18, 0.3, 0.6, 0xf5f5f2, "cuadrupedo", "real", S.arcticFox),
  m("liebre-artica", "animal", "fauna-tierra", "Liebre ártica", 0.2, 0.3, 0.6, 0xf7f7f4, "cuadrupedo", "real", S.arcticHare),
  m("reno", "animal", "fauna-tierra", "Reno", 0.5, 1.2, 1.9, 0x8a7560, "cuadrupedo", "real", S.reindeer),
  m("buey-almizclero", "animal", "fauna-tierra", "Buey almizclero", 0.9, 1.3, 2.1, 0x4a3b2f, "cuadrupedo", "real", S.muskox),
  m("foca", "animal", "fauna-marina", "Foca de Weddell", 0.7, 0.6, 3.0, 0x5d6670, "pinnipedo", "real", S.sealWeddell),
  m("morsa", "animal", "fauna-marina", "Morsa", 1.2, 1.0, 3.0, 0x9a6f55, "pinnipedo", "real", S.walrus),
  m("orca", "animal", "fauna-marina", "Orca", 1.6, 1.8, 8.0, 0x15161a, "cetaceo", "real", S.orca),
  m("delfin", "animal", "fauna-marina", "Delfín mular", 0.6, 0.6, 2.8, 0x6f7f8e, "cetaceo", "real", S.dolphin),
  m("ballena", "animal", "fauna-marina", "Ballena jorobada", 3.0, 3.0, 15.0, 0x3b4450, "cetaceo", "real", S.humpback),
  m("pinguino", "animal", "fauna-aves", "Pingüino de Adelia", 0.3, 0.7, 0.3, 0x1c1c22, "pinguino", "real", S.adelie),
  m("pinguino-emperador", "animal", "fauna-aves", "Pingüino emperador", 0.45, 1.15, 0.45, 0x22232a, "pinguino", "real", S.emperor),
  m("petrel-niveo", "animal", "fauna-aves", "Petrel níveo", 0.85, 0.2, 0.35, 0xfafafa, "ave", "real", S.snowPetrel),

  // ── People: one model each, drawn as the cube figure (CubeFigure) at true height ──
  m("persona", "persona", "personal", "Persona del santuario", 0.45, 1.7, 0.3, 0xe0b48c, "figura", "real", S.human),
];
