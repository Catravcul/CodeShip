import { cs } from "../sources";
import type { FloorPlan, Placed } from "./kit";

/**
 * The Entrenamiento floors after the gym (Cold Sanctuary's SampleSceneBuilder.cs: «cada centro lleva los pisos que
 * necesita para todos los miembros», TrainingCentres.FloorsFor with its 30 people): cardio, calistenia, 2 + 2 of
 * yoga, 2 of ballet and 2 of dojo (in works), 2 of aula, the concert floor and 2 of studios. Floor plan 36 × 26 m.
 */
const SIZE = { x: 36, z: 26 } as const;
const P = (model: string, x: number, z: number, rot?: number, name?: string): Placed => ({ model, x, z, ...(rot ? { rot } : {}), ...(name ? { name } : {}) });
const PI = Math.PI;
/** Toilets against the +z edge, −x corner (Aseos(…, (−s.x/2 + 3,1 | 2,1, …, s.y/2 − 0,8 | 0,9), 180°)). */
const toilets3 = P("aseos-3", -18 + 3.1, 13 - 0.8, PI);
const toilets1 = P("aseos-1", -18 + 2.1, 13 - 0.9, PI);

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

function calisthenics(): FloorPlan {
  const items: Placed[] = [P("suelo-caucho-piso", 0, 0)];
  // Calistenia (x −17…1, z 2,6…12).
  items.push(P("cal-dominadas", -15.1, 10), P("cal-monkey-bars", -9.4, 10), P("cal-anillas", -4.1, 10), P("cal-paralelas-bajas", 0.2, 10));
  items.push(P("cal-paralelas", -16, 4.9), P("cal-fondos-v", -12.6, 4.9), P("cal-barras-bajas", -9, 4.9), P("cal-bandera", -3.8, 5), P("gym-espalderas-3", 0.9, 4.95, PI / 2));
  // Parkour (x −17…−5,4, z −12…0,6).
  items.push(P("pk-muro-alto", -15.5, -11.6), P("pk-muro-medio", -11, -11.6), P("pk-lache", -7.6, -10.8));
  items.push(P("pk-cajon", -11, -5.5), P("pk-cajon", -7.8, -5.5), P("pk-barandilla-05", -16.4, -1.1), P("pk-barandilla-10", -14.9, -1.1), P("pk-bloques", -9.3, -1));
  // Crossfit (x 3…17).
  items.push(P("gym-cesped-trineo", 4, -1), P("cf-trineo", 3.5, -9.3), P("cf-trineo", 4.5, -9.3));
  for (const z of [-9.9, -5.4, -0.9]) items.push(P("cf-plataforma", 8.15, z));
  for (const x of [11.7, 14.3]) items.push(P("gym-remo-ergometro", x, -10.8), P("gym-assault-bike", x, -6.95), P("gym-skierg", x, -3.65));
  items.push(P("cf-kettlebells", 16.9, -7), P("cf-rig", 12.5, 6), P("cf-ghd", 8.2, 3.5), P("cf-ghd", 8.2, 7.5));
  items.push(P("cf-bumpers", 16.5, 2), P("cf-cajones-pliometricos", 16.5, 4.5), P("cf-balones", 16.5, 7), P("gym-soporte-barras", 16.5, 9.5));
  items.push(P("cf-cajon-61", 6.5, 11.1), P("cf-cajon-61", 9, 11.1));
  return { id: "calistenia", size: SIZE, items, source: cs("Training", "FurnishCalisthenics") };
}

/** One yoga floor: the occidental hall at x −9 and the traditional at x +9 (BuildYogaHall), 8 mats each round the teacher. */
function yoga(style: "hatha" | "ashtanga", n: number): FloorPlan {
  const items: Placed[] = [];
  const ash = style === "ashtanga";
  for (const [cx, trad] of [[-9, false], [9, true]] as const) {
    items.push(P(trad ? "yoga-suelo-tierra" : "yoga-suelo-madera", cx, 0));
    for (const z of [-5, 0, 5]) for (const sx of [-1, 1]) items.push(P(trad ? "yoga-durrie" : "yoga-esterilla", cx + sx * 5.5, z, PI / 2));
    items.push(P(trad ? "yoga-durrie" : "yoga-esterilla", cx, 5.1), P(trad ? "yoga-durrie" : "yoga-esterilla", cx, -5.1));
    items.push(P(trad ? "yoga-tarima-tradicional" : "yoga-tarima-occidental", cx, 0));
    if (trad) {
      if (ash) items.push(P("yoga-patanjali", cx - 3, 11), P("yoga-adiyogi", cx + 1.5, 11));
      else items.push(P("yoga-linga", cx, 10.6));
      for (let a = -3; a <= 3; a++) {
        const ang = (a * 20 * PI) / 180;
        items.push(P("yoga-lampara-aceite", cx + (ash ? -0.75 : 0) + Math.sin(ang) * 2.2 * 1.4, 10.6 - Math.cos(ang) * 2.2 * 0.8));
      }
      items.push(P("yoga-kund", cx, -10.5));
    } else {
      items.push(P(ash ? "yoga-ganesha" : "yoga-buda", cx, 11));
      items.push(P(ash ? "yoga-estante-ashtanga" : "yoga-estante-hatha", cx + 4, 11, PI));
    }
  }
  items.push(toilets3);
  return { id: `yoga-${style}-${n}`, size: SIZE, items, source: cs("Yoga", `FurnishYogaFloors (${style}, piso ${n})`) };
}

/** A floor in works (Obras.cs PrepareSite): the scaffold and the day's material; its finish (group «obra-acabado») waits hidden. */
function works(kind: "ballet" | "dojo", n: number): FloorPlan {
  const items: Placed[] = [P("obra-andamio", 18 - 1.4, -13 + 1), P("obra-material", 0.9, -5)];
  if (kind === "ballet") items.push(P("ballet-suelo", 0, 3.2), P("ballet-espejo-barras", 0, 3.2), P("ballet-piano", -6, -2.3), P("ballet-vestuario", 7.2, -5.9));
  else items.push(P("dojo-corcho", 4.3, 0), P("dojo-jaula-mma", 5.8, -4.6), P("dojo-ring", 5.5, 3.6), P("dojo-tatami", -4.6, 3.1), P("dojo-sacos", -6.5, -5.2), P("dojo-vestuario", -2.2, -6.5));
  return { id: `${kind}-${n}`, size: SIZE, items, source: cs("Obras", `PrepareSite y Finished${kind === "ballet" ? "Ballet" : "Dojo"}`) };
}

/** Aula (FurnishAulaFloor): a group of 6 per 6 seats, up to 4; 30 people → 24 on the first floor and 6 on the second. */
function aula(n: number, seats: number): FloorPlan {
  const groups = Math.min(4, Math.max(1, Math.ceil(seats / 6)));
  const ax = -18 * 0.47;
  const lx = 18 * 0.25;
  const lx2 = 18 * 0.58;
  const items: Placed[] = [P("aula-suelo", 0, 0), P("aula-tarima", ax, -13 + 2.3)];
  for (let r = 0; r < groups; r++) items.push(P("aula-pupitres-6", ax, -13 + 6.2 + r * 3.4, 0, `Fila ${r + 1}`));
  const tables = [[lx, -8], [lx2, -8], [lx, -2], [lx2, -2]] as const;
  for (let t = 0; t < groups; t++) items.push(P("aula-mesa-estudio", tables[t]![0], tables[t]![1]));
  items.push(P("aula-biblioteca", 18 - 2.2, -13 + 8.5), P("puesto-ordenador", lx, -13 + 16.5), P("puesto-ordenador", lx2, -13 + 16.5), toilets1);
  return { id: `aula-${n}`, size: SIZE, items, source: cs("Informatica", `FurnishAulaFloor (piso ${n}, ${seats} plazas)`) };
}

function concerts(): FloorPlan {
  const items: Placed[] = [P("aula-suelo", 0, 0), P("mus-escenario-grande", -10, -13 + 3.4)];
  for (let r = 0; r < 5; r++) items.push(P("mus-fila-10", -8, -3.6 + r * 2.8));
  items.push(P("mus-escenario-pequeno", 10.5, -7.9), P("mus-fila-8", 10.5, -1.2), P("mus-fila-8", 10.5, 1.6), P("mus-sala-sonica-grande", 10.5, -2.2));
  items.push(P("mus-banco-tecnico", 5.5, 13 - 2.2), toilets1);
  return { id: "musica-conciertos", size: SIZE, items, source: cs("Musica", "FurnishConcertFloor") };
}

function studios(index: number): FloorPlan {
  const X = (c: number) => -13.35 + c * 8.9;
  const items: Placed[] = [P("aula-suelo", 0, 0)];
  for (let c = 0; c < 4; c++) items.push(P("mus-banda", X(c), -13 + 7.7, 0, `Banda ${index * 4 + c + 1}`));
  for (let st = 0; st < 2; st++) items.push(P("mus-control", X(st * 2), -13 + 16.9), P("mus-cabina", X(st * 2 + 1), -13 + 16.9));
  items.push(toilets1);
  return { id: `musica-estudios-${index + 1}`, size: SIZE, items, source: cs("Musica", `FurnishStudioFloor (${index + 1})`) };
}

export const ENTRENAMIENTO_FLOORS: readonly FloorPlan[] = [
  cardio(),
  calisthenics(),
  yoga("hatha", 1),
  yoga("hatha", 2),
  yoga("ashtanga", 1),
  yoga("ashtanga", 2),
  works("ballet", 1),
  works("ballet", 2),
  works("dojo", 1),
  works("dojo", 2),
  aula(1, 24),
  aula(2, 6),
  concerts(),
  studios(0),
  studios(1),
];
