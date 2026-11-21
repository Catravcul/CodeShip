import { cs, S1_SOURCES as S } from "../sources";
import { ANALISIS, CULTIVO, MOLECULAR, SINTESIS, type Block } from "../models/ciencias";
import { ENTRENAMIENTO_FLOORS } from "./entrenamiento";
import { SERVICIOS_FLOORS } from "./servicios";
import { carpetKeepOut, packFloor, ringLength, ringPoint, type FloorPlan, type Placed } from "./kit";

/**
 * The floors of the buildings for the people there are now (Berón 2026-11-21: «muy pocas veces van a coincidir todos
 * en el mismo piso… se recortarían pisos… revisar si existen otros pisos que se puedan hacer más pequeños retirando
 * maquinaria o pisos pequeños que se puedan fusionar»): where two floors did one job they are one, with less machinery.
 * Each keeps its source's positions where it can (the roomy floors are still in their files, for TOWERS_AMPLIOS).
 * Frame as everywhere: metres from the centre, x across, z away from the trunk (its face at z = −size.z/2).
 */
const PI = Math.PI;
const D = (deg: number) => (deg * PI) / 180;
const P = (model: string, x: number, z: number, rot?: number, name?: string): Placed => ({ model, x, z, ...(rot ? { rot } : {}), ...(name ? { name } : {}) });
const plan = (list: readonly FloorPlan[], id: string): FloorPlan => list.find((f) => f.id === id)!;
const shift = (items: readonly Placed[], dx: number, dz: number): Placed[] => items.map((it) => ({ ...it, x: it.x + dx, z: it.z + dz }));

/**
 * The gym, one floor (gym + cardio were two): of Cold Sanctuary's 30 plate machines (FurnishGym, 3 of each of 10) one of
 * each type in their two columns, the free weights for two at once, and a cardio corner where the other plate machines
 * and racks stood. The central aisle (x 1,5…4,5) stays clear from the door to the far wall.
 */
function gym(): FloorPlan {
  const types = ["gym-press-pecho", "gym-press-hombros", "gym-jalon", "gym-remo", "gym-prensa", "gym-extension", "gym-curl-femoral", "gym-hip-thrust", "gym-gemelos", "gym-curl-biceps"];
  const NAMES = ["Press de pecho", "Press de hombros", "Jalón al pecho", "Remo sentado", "Prensa de piernas", "Extensión de cuádriceps", "Curl femoral", "Hip thrust", "Gemelos", "Curl de bíceps"];
  const rowZ = [11.3, 7.9, 4.05, -0.1, -3.8];
  const rowTypes = [[0, 1], [2, 3], [4, 8], [5, 6], [7, 9]] as const;
  // FurnishGym's first and fourth places of each row (the first of each type).
  const rowX = [[-16.5, -7.5], [-16.4, -6.9], [-16.1, -5.0], [-16.35, -6.5], [-16.25, -6.0]];
  const items: Placed[] = [P("suelo-caucho-piso", 0, 0)];
  for (let row = 0; row < 5; row++)
    for (let j = 0; j < 2; j++) {
      const t = rowTypes[row]![j]!;
      items.push(P(types[t]!, rowX[row]![j]!, rowZ[row]!, 0, NAMES[t]));
    }
  // Free weights (FurnishGym's, the first of each).
  items.push(P("gym-estante-mancuernas", 6, 11.6), P("gym-banco-fid", 4.5, 7.5), P("gym-banco-fid", 7.6, 7.5));
  items.push(P("gym-jaula", 5.3, 2.5), P("gym-arbol-discos", 8.1, 2.5), P("gym-press-banca", 5.3, -2.5, PI));
  items.push(P("gym-smith", 6, -8), P("gym-plataforma", 12.5, -8), P("gym-soporte-barras", 17.1, -8));
  // Cardio (FurnishGymCardio, its first of each kind), 2 m between machines.
  [9.5, 12.4, 15.3].forEach((x, i) => items.push(P("gym-cinta", x, 11, 0, `Cinta ${i + 1}`)));
  items.push(P("gym-eliptica", 10, 6.9, 0, "Elíptica 1"), P("gym-eliptica", 12.9, 6.9, 0, "Elíptica 2"), P("gym-escaladora", 15.8, 6.9));
  items.push(P("gym-bici", 10.75, 2.7), P("gym-bici", 12.9, 2.7), P("gym-bici-reclinada", 15.8, 2.7));
  items.push(P("gym-remo-ergometro", 10, -1.5), P("gym-remo-ergometro", 12.9, -1.5), P("gym-esterilla", 15.6, -1.5), P("gym-esterilla", 17.1, -1.5));
  items.push(P("gym-silla-romana", 9.5, -11.4), P("gym-hiperextensiones", 15.5, -11.4));
  items.push(P("gym-fuente", -15.4, -10.5), P("gym-toallas", 0, -10.5));
  return { id: "gimnasio", size: { x: 36, z: 26 }, items, source: `${S.csGym}; ${cs("Training", "FurnishGymCardio")}; uno de cada tipo (Berón 2026-11-21: el gimnasio en un solo piso)` };
}

/** Calistenia and parkour side by side on one floor (they were two small floors): each room at its real size. */
function calisthenicsParkour(): FloorPlan {
  const cal = plan(ENTRENAMIENTO_FLOORS, "calistenia");
  const pk = plan(ENTRENAMIENTO_FLOORS, "parkour");
  return {
    id: "calistenia-parkour",
    size: { x: 34, z: 16 },
    items: [...shift(cal.items, -7, 0), ...shift(pk.items, 10, 0)],
    source: `${cal.source}; ${pk.source}; juntas en un piso (Berón 2026-11-21)`,
  };
}

/** Beds round the ring (Hospital.cs RingBeds), as servicios.ts lays them. */
function ringBeds(fs: number, counts: readonly [string, number][]): Placed[] {
  const out: Placed[] = [];
  let s = 1.55;
  let n = 1;
  for (const [label, count] of counts) {
    let placed = 0;
    for (; s < ringLength(fs) && placed < count; s += 3.2) {
      const p = ringPoint(fs, s, 2.6);
      if (p.corner || (Math.abs(p.x) < 4.6 && Math.abs(p.z) > fs / 2 - 2)) continue;
      out.push(P("hospital-cama", p.x, p.z, p.yaw, `Cama ${n++} (${label})`));
      placed++;
    }
  }
  return out;
}

/**
 * The hospital, one floor (it was three with the vet's): Cold Sanctuary's ground floor (BuildHospital: emergencies,
 * consulting rooms, lab, X-ray and ultrasound, delivery rooms) on the left as it was, and on the right half of its
 * first floor (2 theatres of 4, 3 ICU beds of 6, 2 isolation rooms of 4); the ward's beds on the ring.
 */
function hospital(): FloorPlan {
  const items: Placed[] = [P("hospital-suelo", 0, 0), P("aseos-3", -14, 12.3, PI), P("hospital-silla-examen", -13.6, 5.6, D(90))];
  items.push(P("hospital-camilla", -6.3, 5.6, D(90)), P("hospital-camilla", -9.8, 1.4, D(90)), P("hospital-camilla", -9.8, -2.6, D(90)));
  items.push(P("hospital-botiquin", -15.4, -6.4, D(-90)), P("hospital-lavamanos", -6.4, 12.3, PI), P("hospital-lavabotas", -10.2, 9, PI));
  items.push(P("hospital-laboratorio", -13.4, -10.6, PI), P("hospital-analizador", -9.25, -10.6, PI), P("hospital-banco-sangre", -3.4, -10.6));
  items.push(P("hospital-triaje", -14, 8.6, PI, "Triaje 1"), P("hospital-triaje", -6.4, 9, PI, "Triaje 2"), P("hospital-triaje", -2.3, 5.6, D(90), "Triaje 3"));
  items.push(P("hospital-mesa-medico", -10.1, 5.6, PI), P("hospital-consulta", -13.6, 1.4, PI, "Consulta 1"), P("hospital-consulta", -5.6, 1.4, PI, "Consulta 2"), P("hospital-consulta", -13.6, -2.6, PI, "Consulta 3"), P("hospital-telemedicina", -5.6, -2.6, PI));
  items.push(P("hospital-carro-parada", -12, -6.6, D(-90)), P("hospital-carro-parada", -6.4, -6.6, D(-90)));
  // Isolation and the PPE at the far end, beyond the toilets.
  items.push(P("hospital-aislamiento", -16.8, 16.4, 0, "Aislamiento 1"), P("hospital-aislamiento", -11.4, 16.4, 0, "Aislamiento 2"), P("hospital-epi", -7.6, 15.6, D(-90)));
  // The right half: waiting room and pharmacy, imaging, two delivery rooms, two theatres and the ICU.
  items.push(P("hospital-espera", 5.6, 11.2), P("hospital-farmacia", 3.5, 17.5));
  items.push(P("zona-rayos-x", 4.8, 4.6), P("zona-ecografia", 4.8, 0.2), P("hospital-camilla", 5.4, 0.4));
  items.push(P("hospital-paritorio", 5.8, -5.3, 0, "Paritorio 1"), P("hospital-paritorio", 5.8, -11.4, 0, "Paritorio 2"));
  items.push(P("hospital-quirofano", 14.5, 2.5, 0, "Quirófano 1"), P("hospital-quirofano", 14.5, -8.5, 0, "Quirófano 2"));
  items.push(P("hospital-lavado-quirurgico", 14.5, -3), P("hospital-autoclave", 14.5, -16.5), P("hospital-planta-oxigeno", 18, 10.5, PI));
  [9.4, 13.2, 17].forEach((x, i) => items.push(P("hospital-uci", x, 15.5, 0, `UCI ${i + 1}`)));
  items.push(P("hospital-control-uci", 13, 11));
  const ring = ringBeds(40, [["observación de urgencias", 6], ["maternidad", 6], ["recuperación postquirúrgica", 4], ["hospitalización", 8]]);
  return { id: "hospital", size: { x: 40, z: 38 }, items, ring, source: `${cs("Hospital", "BuildHospital (planta baja y la mitad de la planta 1)")}; un solo piso (Berón 2026-11-21)` };
}

/**
 * Cría and the cultured meat, one floor of 26 × 40 m (they were two of 26 × 20): the cría by the trunk as it was, the
 * lab behind it (both feed the animals); one set of toilets.
 */
function criaCulturedMeat(): FloorPlan {
  const cria = plan(SERVICIOS_FLOORS, "cria");
  const meat = plan(SERVICIOS_FLOORS, "carne-cultivada");
  return {
    id: "cria-carne-cultivada",
    size: { x: 26, z: 40 },
    items: [...shift(cria.items, 0, -10), ...shift(meat.items.filter((it) => it.model !== "aseos-1"), 0, 10)],
    source: `${cria.source}; ${meat.source}; juntos en un piso (Berón 2026-11-21)`,
  };
}

/** The blocks of a list, each as many times as asked (once when not). */
function expand(list: readonly Block[], counts: Readonly<Record<string, number>>): [string, number, number][] {
  return list.flatMap(([id, , w, d]) => Array.from({ length: counts[id] ?? 1 }, () => [id, w, d] as [string, number, number]));
}

const LAB = { x: 32, z: 20 } as const;
const labToilets: Placed = { model: "aseos-1", x: -LAB.x / 2 + 2.1, z: LAB.z / 2 - 0.9, rot: PI };

/** One lab packed as Cold Sanctuary packs them (Research.cs PackFloor), from two lists with fewer of each. */
function lab(id: string, lists: readonly (readonly Block[])[], counts: Readonly<Record<string, number>>, what: string): FloorPlan {
  const blocks = lists.flatMap((l) => expand(l, counts)).filter(([b]) => (counts[b] ?? 1) > 0);
  const items: Placed[] = [{ model: "lab-suelo", x: 0, z: 0 }, ...packFloor(LAB, blocks, carpetKeepOut(LAB)), labToilets];
  return { id, size: LAB, items, source: cs("Research", `${what} (PackFloor), en un piso (Berón 2026-11-21)`) };
}

export const REDUCIDOS_FLOORS: readonly FloorPlan[] = [
  gym(),
  calisthenicsParkour(),
  hospital(),
  criaCulturedMeat(),
  lab("quimica", [SINTESIS, ANALISIS], { "q-campana": 3, "q-rotavapor": 2, "q-ducha": 1, "q-cuaderno": 2, "q-hplc": 2, "q-puesto-analisis": 1, "q-rmn-sobremesa": 0, "q-hornos": 0 }, "FurnishSynthesis y FurnishAnalysis"),
  lab("biologia", [CULTIVO, MOLECULAR], { "b-cabina": 2, "b-incubador": 2, "b-microscopio": 1, "b-fluorescencia": 1, "b-centrifuga": 2, "b-biorreactor-mesa": 1, "b-congelador": 1, "b-prepcr": 2, "b-extraccion": 2, "b-termociclador": 2, "b-nevera": 1, "b-puesto-datos": 2, "b-lavamanos": 1, "b-autoclave": 1, "b-dewar": 1 }, "FurnishCulture y FurnishMolecular"),
];
