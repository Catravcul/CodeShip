import { cs } from "../sources";
import type { FloorPlan, Placed } from "./kit";

/**
 * The Entrenamiento floors after the gym (Cold Sanctuary's SampleSceneBuilder.cs: «cada centro lleva los pisos que
 * necesita para todos los miembros», TrainingCentres.FloorsFor with its 30 people): cardio, calistenia, and 8 small
 * yoga floors (one class each). Floor plan 36 × 26 m. The martial arts, the ballet studios, the music rooms and the classrooms are their own
 * (smaller) floors since 2026-11-20: floors/musica-aulas.ts.
 */
const SIZE = { x: 36, z: 26 } as const;
const P = (model: string, x: number, z: number, rot?: number, name?: string): Placed => ({ model, x, z, ...(rot ? { rot } : {}), ...(name ? { name } : {}) });
const PI = Math.PI;

function cardio(): FloorPlan {
  const items: Placed[] = [P("suelo-caucho-piso", 0, 0)];
  [-16.55, -13.65, -10.75, -7.85, -4.95, -2.05].forEach((x, i) => items.push(P("gym-cinta", x, -10.95, 0, `Cinta ${i + 1}`)));
  [-16.6, -13.85, -11.1, -8.35].forEach((x, i) => items.push(P("gym-eliptica", x, -6.825, 0, `Elíptica ${i + 1}`)));
  items.push(P("gym-escaladora", -5.575, -7.1), P("gym-escaladora", -2.775, -7.1));
  const c3 = [-16.7, -14.1, -11.5, -8.9];
  c3.forEach((x) => items.push(P("gym-bici", x, -3.15)));
  items.push(P("gym-bici-reclinada", -6.25, -2.95), P("gym-bici-reclinada", -3.55, -2.95));
  c3.forEach((x) => items.push(P("gym-remo-ergometro", x, 1.05)));
  for (const z of [10.5, 6.5, 2.5]) for (const x of [4.5, 7.5, 10.5, 13.5]) items.push(P("gym-esterilla", x, z));
  items.push(P("gym-silla-romana", 4.5, -2.5), P("gym-silla-romana", 7.5, -2.5));
  items.push(P("gym-banco-declinado", 10.5, -2.8), P("gym-banco-declinado", 13.1, -2.8));
  items.push(P("gym-hiperextensiones", 4.5, -7), P("gym-hiperextensiones", 7.5, -7));
  items.push(P("gym-portico-sacos", 12.5, -7), P("gym-estanteria-material", 6, -11.2), P("gym-espalderas-2", 12.5, -11.5, PI));
  return { id: "cardio", size: SIZE, items, source: cs("Training", "FurnishGymCardio") };
}

/**
 * Calistenia, parkour and crossfit, each its own small floor (Berón 2026-11-20: «una clase por piso», revisión de
 * realismo #63): Cold Sanctuary's FurnishCalisthenics zones, each moved about its own middle, at their real size (a
 * street-workout park of ~20 × 12 m, an indoor parkour room of ~14 × 16 m, a crossfit box of ~16 × 25 m).
 */
function calisthenics(): FloorPlan {
  const items: Placed[] = [P("suelo-caucho-calistenia", 0, 0)];
  const at = (m: string, x: number, z: number, rot?: number) => items.push(P(m, x + 8, z - 4.3, rot));
  at("cal-dominadas", -15.1, 10), at("cal-monkey-bars", -9.4, 10), at("cal-anillas", -4.1, 10), at("cal-paralelas-bajas", 0.2, 10);
  at("cal-paralelas", -16, 4.9), at("cal-fondos-v", -12.6, 4.9), at("cal-barras-bajas", -9, 4.9), at("cal-bandera", -3.8, 5), at("gym-espalderas-3", 0.9, 4.95, PI / 2);
  return { id: "calistenia", size: { x: 20, z: 16 }, items, source: cs("Training", "FurnishCalisthenics (zona de calistenia, piso propio)") };
}

function parkour(): FloorPlan {
  const items: Placed[] = [P("suelo-parkour", 0, 0)];
  // Turned round (the tall walls at the far end, away from the door).
  const at = (m: string, x: number, z: number, rot?: number) => items.push(P(m, x + 11.2, 1.5 - (z + 5.7), rot));
  at("pk-muro-alto", -15.5, -11.6), at("pk-muro-medio", -11, -11.6), at("pk-lache", -7.6, -10.8);
  at("pk-cajon", -11, -5.5), at("pk-cajon", -7.8, -5.5), at("pk-barandilla-05", -16.4, -1.1), at("pk-barandilla-10", -14.9, -1.1);
  // The precision blocks run along the right wall (across they stood in the way in).
  at("pk-bloques", -6.3, -1.7, PI / 2);
  return { id: "parkour", size: { x: 14, z: 16 }, items, source: cs("Training", "FurnishCalisthenics (zona de parkour, piso propio)") };
}

function crossfit(): FloorPlan {
  const items: Placed[] = [P("suelo-crossfit", 0, 0)];
  const at = (m: string, x: number, z: number, rot?: number) => items.push(P(m, x - 10, z, rot));
  at("gym-cesped-trineo", 4, -1), at("cf-trineo", 3.5, -9.3), at("cf-trineo", 4.5, -9.3);
  for (const z of [-9.9, -5.4, -0.9]) at("cf-plataforma", 8.15, z);
  for (const x of [11.7, 14.3]) at("gym-remo-ergometro", x, -10.8), at("gym-assault-bike", x, -6.95), at("gym-skierg", x, -3.65);
  at("cf-kettlebells", 16.9, -7), at("cf-rig", 12.5, 6), at("cf-ghd", 8.2, 3.5), at("cf-ghd", 8.2, 7.5);
  at("cf-bumpers", 16.5, 2), at("cf-cajones-pliometricos", 16.5, 4.5), at("cf-balones", 16.5, 7), at("gym-soporte-barras", 16.5, 9.5);
  at("cf-cajon-61", 6.5, 11.1), at("cf-cajon-61", 9, 11.1);
  return { id: "crossfit", size: { x: 16, z: 25 }, items, source: cs("Training", "FurnishCalisthenics (box de crossfit, piso propio)") };
}

/** A yoga hall's floor plan (one class: 8 students and the teacher), m. */
const YOGA_SIZE = { x: 14, z: 16 } as const;

/**
 * One yoga floor, one class (Berón 2026-11-20: «parece que un mismo piso da para dos clases, quizás falta allí la
 * separación en pisos pequeños»): Cold Sanctuary's BuildYogaHall, its occidental hall or its traditional one, each on
 * its own small floor. Seen from the door (+z away from it): two rows of 4 mats 3 m apart and 2 m between the rows
 * (CarpetPad: ≥ 2 m), the teacher's platform before them and the altar at the far wall; the traditional hall's kund
 * by the door, to the left, out of the way in.
 */
function yoga(style: "hatha" | "ashtanga", hall: "occidental" | "tradicional", n: number): FloorPlan {
  const items: Placed[] = [];
  const ash = style === "ashtanga";
  const trad = hall === "tradicional";
  items.push(P(trad ? "yoga-suelo-tierra" : "yoga-suelo-madera", 0, 0));
  for (const z of [1.4, -2.4]) for (const x of [-4.5, -1.5, 1.5, 4.5]) items.push(P(trad ? "yoga-durrie" : "yoga-esterilla", x, z));
  items.push(P(trad ? "yoga-tarima-tradicional" : "yoga-tarima-occidental", 0, 4.6));
  if (trad) {
    if (ash) items.push(P("yoga-patanjali", -2.2, 7.2), P("yoga-adiyogi", 1.8, 7.3));
    else items.push(P("yoga-linga", 0, 7.2));
    for (let a = -3; a <= 3; a++) {
      const ang = (a * 20 * PI) / 180;
      items.push(P("yoga-lampara-aceite", (ash ? -0.2 : 0) + Math.sin(ang) * 3, 7.2 - Math.cos(ang) * 1));
    }
    items.push(P("yoga-kund", -3.6, -6.1));
  } else {
    items.push(P(ash ? "yoga-ganesha" : "yoga-buda", 0, 7.3));
    items.push(P(ash ? "yoga-estante-ashtanga" : "yoga-estante-hatha", 4.6, 7.6, PI));
  }
  return { id: `yoga-${style}-${hall}-${n}`, size: YOGA_SIZE, items, source: cs("Yoga", `BuildYogaHall (${style}, sala ${hall}, piso ${n}); una clase por piso`) };
}

export const ENTRENAMIENTO_FLOORS: readonly FloorPlan[] = [
  cardio(),
  calisthenics(),
  parkour(),
  crossfit(),
  ...(["hatha", "ashtanga"] as const).flatMap((st) => [1, 2].flatMap((n) => (["occidental", "tradicional"] as const).map((h) => yoga(st, h, n)))),
];
