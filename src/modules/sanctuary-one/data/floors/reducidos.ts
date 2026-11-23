import { cs, S1_SOURCES as S } from "../sources";
import { ANALISIS, CULTIVO, MOLECULAR, SINTESIS, type Block } from "../models/ciencias";
import { ENTRENAMIENTO_FLOORS } from "./entrenamiento";
import { SERVICIOS_FLOORS } from "./servicios";
import { FLOOR_SIZE, carpetKeepOut, composed, gridIn, packFloor, ringLength, ringPoint, turned, type FloorPlan, type Placed } from "./kit";
import { MUSICA_AULAS_FLOORS } from "./musica-aulas";
import { PRODUCCION_FLOORS } from "./produccion";

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
 * The gym, the whole floor (Berón 2026-11-22: «en el gym antes había máquinas de cada tipo de músculo, área de
 * ejercicios libres, abdominales, spinner y cintas… por lo menos debe haber 2 de cada tipo… 3 de algunos»): of Cold
 * Sanctuary's plate machines (FurnishGym, 3 of each of 10) two of each type and three of the most used, the free
 * weights, abs and stretching, and the cardio with its spinning bikes; each zone laid evenly (gridIn), the central
 * aisle (|x| < 2) clear from the door to the carpet at the far end, 2 m free along the open edges to jump off.
 */
function gym(): FloorPlan {
  const M = (model: string, n: number, name: string) => Array.from({ length: n }, (_, i) => ({ model, name: `${name} ${i + 1}` }));
  const machines = [
    ...M("gym-press-pecho", 3, "Press de pecho"), ...M("gym-press-hombros", 2, "Press de hombros"), ...M("gym-jalon", 3, "Jalón al pecho"), ...M("gym-remo", 2, "Remo sentado"),
    ...M("gym-prensa", 3, "Prensa de piernas"), ...M("gym-extension", 2, "Extensión de cuádriceps"), ...M("gym-curl-femoral", 2, "Curl femoral"), ...M("gym-hip-thrust", 2, "Hip thrust"),
    ...M("gym-gemelos", 2, "Gemelos"), ...M("gym-curl-biceps", 3, "Curl de bíceps"),
  ];
  const abs = [...M("gym-esterilla", 4, "Esterilla"), ...M("gym-silla-romana", 2, "Silla romana"), ...M("gym-banco-declinado", 2, "Banco de abdominales"), ...M("gym-hiperextensiones", 2, "Hiperextensiones"), { model: "gym-espalderas-3", name: "Espalderas" }, { model: "gym-estanteria-material", name: "Material" }];
  const cardio = [
    ...M("gym-cinta", 4, "Cinta"), ...M("gym-eliptica", 3, "Elíptica"), ...M("gym-bici", 4, "Bici de spinning"), ...M("gym-bici-reclinada", 2, "Bici reclinada"),
    ...M("gym-escaladora", 2, "Escaladora"), ...M("gym-remo-ergometro", 3, "Remo ergómetro"), { model: "gym-assault-bike", name: "Assault bike" }, { model: "gym-skierg", name: "SkiErg" },
  ];
  const free = [
    ...M("gym-estante-mancuernas", 2, "Mancuernas"), ...M("gym-banco-fid", 4, "Banco regulable"), ...M("gym-jaula", 2, "Jaula de sentadillas"), ...M("gym-press-banca", 2, "Press de banca"),
    { model: "gym-press-inclinado", name: "Press inclinado" }, ...M("gym-smith", 2, "Smith"), ...M("gym-plataforma", 2, "Plataforma de peso muerto"), ...M("gym-arbol-discos", 2, "Discos"), { model: "gym-soporte-barras", name: "Barras" },
  ];
  const items: Placed[] = [
    P("suelo-caucho-gimnasio", 0, 0),
    ...gridIn(machines, { x0: -18, x1: -2.5, z0: -17, z1: 4 }, 4),
    ...gridIn(abs, { x0: -18, x1: -5, z0: 5, z1: 17 }, 4),
    ...gridIn(cardio, { x0: 2.5, x1: 18, z0: -17, z1: -1 }, 5),
    ...gridIn(free, { x0: 2.5, x1: 18, z0: 0, z1: 15 }, 5),
    P("gym-fuente", -3.6, -18.4), P("gym-toallas", 3.6, -18.4),
  ];
  return { id: "gimnasio", size: { x: 40, z: 40 }, items, source: `${S.csGym}; ${cs("Training", "FurnishGymCardio")}; dos o tres de cada tipo, el gimnasio ocupa su piso (Berón 2026-11-22)` };
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

/**
 * The assembly hall with the watch on its trunk side (Berón 2026-11-22: «la sala de guardia… creo que se puede juntar a
 * la de asambleas»): the hall as it was, and in front of it an operations room as a coastguard's (MRCC) is laid out,
 * 4 operator desks facing the video wall, the watch officer's desk behind them, and the instruments in a row on the
 * other side of the door, 1,2 m at least between any two.
 */
function assemblyGuard(): FloorPlan {
  const hall = plan(SERVICIOS_FLOORS, "asambleas");
  const z = -14.2;
  const items: Placed[] = [...hall.items];
  items.push(P("guardia-muro-video", -13, -10.6, 0, "Muro de vídeo de la guardia"));
  [-17.5, -14.5, -11.5, -8.5].forEach((x, i) => items.push(P("guardia-consola", x, z, 0, `Puesto de guardia ${i + 1}`)));
  items.push(P("guardia-respaldo", -13, -17.6, 0, "Puesto del jefe de guardia"));
  items.push(P("guardia-radar", 6, z, 0), P("guardia-carta-hielo", 10.6, z), P("guardia-sismografo", 15, z), P("guardia-mareografo", 17.2, -17.6));
  items.push(P("guardia-radio", 6, -17.9), P("guardia-tablero", 10.6, -18.1));
  return { id: "asambleas-guardia", size: hall.size, items, source: `${hall.source}; ${cs("GuardRoom", "FurnishGuardRoom")}; la guardia como un centro de salvamento marítimo (MRCC), juntas en un piso (Berón 2026-11-22)` };
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

/** Half the floor across (x) and away from the trunk (z), and its quarters: where the rooms of a shared floor go. */
const HX = FLOOR_SIZE.x / 2;
const HZ = FLOOR_SIZE.z / 2;
const left = { x0: -HX, x1: 0, z0: -HZ, z1: HZ };
const right = { x0: 0, x1: HX, z0: -HZ, z1: HZ };
const front = { x0: -HX, x1: HX, z0: -HZ, z1: 0 };
const back = { x0: -HX, x1: HX, z0: 0, z1: HZ };

/** A room the other way round (its far end by the trunk): its things mirrored across x and turned half round. */
const facedBack = (p: FloorPlan): FloorPlan => ({ ...p, items: p.items.map((it) => ({ ...it, x: -it.x, z: -it.z, rot: (it.rot ?? 0) + PI })) });
const chem = (): FloorPlan => lab("quimica", [SINTESIS, ANALISIS], { "q-campana": 3, "q-rotavapor": 2, "q-ducha": 1, "q-cuaderno": 2, "q-hplc": 2, "q-puesto-analisis": 1, "q-rmn-sobremesa": 0, "q-hornos": 0 }, "FurnishSynthesis y FurnishAnalysis");
const bio = (): FloorPlan => lab("biologia", [CULTIVO, MOLECULAR], { "b-cabina": 2, "b-incubador": 2, "b-microscopio": 1, "b-fluorescencia": 1, "b-centrifuga": 2, "b-biorreactor-mesa": 1, "b-congelador": 1, "b-prepcr": 2, "b-extraccion": 2, "b-termociclador": 2, "b-nevera": 1, "b-puesto-datos": 2, "b-lavamanos": 1, "b-autoclave": 1, "b-dewar": 1 }, "FurnishCulture y FurnishMolecular");

/**
 * The training tower's rooms two to a floor, each spread over its half (Berón 2026-11-22: «hacer más espacio entre
 * máquinas y muebles o unir pisos, quizás el de CrossFit se podría unir al de calistenia, y en el aula seguramente
 * vendría bien mayor espacio entre pupitres»).
 */
function shared(): FloorPlan[] {
  const e = (id: string) => plan(ENTRENAMIENTO_FLOORS, id);
  const m = (id: string) => plan(MUSICA_AULAS_FLOORS, id);
  const cp = calisthenicsParkour();
  const q = (x0: number, x1: number, z0: number, z1: number) => ({ x0, x1, z0, z1 });
  return [
    composed("funcional", [{ plan: cp, ...front }, { plan: turned(e("crossfit")), ...back }], `${cp.source}; ${e("crossfit").source}; crossfit con calistenia y parkour (Berón 2026-11-22)`),
    gym(),
    // The fighting arts together (Berón 2026-11-22: the dojo out of the gym), one to a quarter.
    composed("combate", [{ plan: m("dojo-judo"), ...q(-HX, 0, -HZ, 0) }, { plan: m("dojo-karate"), ...q(0, HX, -HZ, 0) }, { plan: m("dojo-kickboxing"), ...q(-HX, 0, 0, HZ) }, { plan: m("dojo-mma"), ...q(0, HX, 0, HZ) }], `${m("dojo-judo").source}; ${m("dojo-karate").source}; ${m("dojo-kickboxing").source}; ${m("dojo-mma").source}; las artes de combate en un piso (2026-11-22)`),
    // Yoga and music at the front; at the back the dance, ballet beside the social dances (Berón 2026-11-22: «el área
    // de baile podría fusionarse con el ballet»), their mirror walls in the middle so the far edge stays open to jump.
    composed("salas", [{ plan: e("yoga-hatha-occidental-1"), ...q(-HX, 0, -HZ, 0) }, { plan: m("musica-ensayo"), ...q(0, HX, -HZ, 0) }, { plan: facedBack(m("ballet-grande")), ...q(-HX, 0, 0, HZ) }, { plan: facedBack(m("baile-latino")), ...q(0, HX, 0, HZ) }], `${e("yoga-hatha-occidental-1").source}; ${m("musica-ensayo").source}; ${m("ballet-grande").source}; ${m("baile-latino").source}; yoga, música y baile (Berón 2026-11-22)`),
    // The workshops by affinity, front and back (Berón 2026-11-22: «las áreas del taller… se ven muy vacías»): the
    // mechanics with the submarine they keep, the textile studio with the vertical farm (fibres and dye plants).
    composed("mecanica-garaje", [{ plan: plan(PRODUCCION_FLOORS, "mecanica"), ...front }, { plan: plan(PRODUCCION_FLOORS, "garaje-submarino"), ...back }], `${plan(PRODUCCION_FLOORS, "mecanica").source}; ${plan(PRODUCCION_FLOORS, "garaje-submarino").source}; la mecánica con el garaje del submarino (2026-11-22)`),
    composed("textil-huerto", [{ plan: plan(PRODUCCION_FLOORS, "textil"), ...front }, { plan: plan(PRODUCCION_FLOORS, "huerto-vertical-1"), ...back }], `${plan(PRODUCCION_FLOORS, "textil").source}; ${plan(PRODUCCION_FLOORS, "huerto-vertical-1").source}; el textil con el huerto vertical (2026-11-22)`),
    // The chemistry lab faced the other way, so its clear aisle (where the carpet lands) meets the trunk's door.
    composed("laboratorios", [{ plan: facedBack(chem()), ...front }, { plan: bio(), ...back }], `${chem().source}; ${bio().source}; química y biología en un piso (2026-11-22)`),
  ];
}

/**
 * The simulation machine of the floors whose area has its challenges (data/simulacion.ts SIM_RETOS; Berón 2026-11-23),
 * and of the assembly's, the door to the microcosm: placed where it leaves the room's own things alone.
 */
const SIM_AT: Readonly<Record<string, { x: number; z: number; rot?: number }>> = {
  salas: { x: 0, z: 0 },
  "asambleas-guardia": { x: 16.5, z: -14, rot: PI },
};
const withSim = (p: FloorPlan): FloorPlan => {
  const at = SIM_AT[p.id];
  return at ? { ...p, items: [...p.items, P("simulador", at.x, at.z, at.rot ?? 0, "Máquina de simulación")] } : p;
};

export const REDUCIDOS_FLOORS: readonly FloorPlan[] = [...shared(), hospital(), criaCulturedMeat(), assemblyGuard()].map(withSim);
