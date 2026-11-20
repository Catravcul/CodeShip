import type { Sourced } from "@core/units";

/**
 * Exercise corner of the habitat module: the ISS countermeasure devices and the NASA "Sprint"
 * protocol (high intensity, lower volume) that flew on the ISS. On the ring there is 1 g, so the
 * machines are the Earth versions: the treadmill needs no harness and bungees, the bike no straps.
 * See docs/design/interiores.md.
 */

const SPRINT = "English, K. L. et al. (2020), «High intensity training during spaceflight: results from the NASA Sprint Study», npj Microgravity 6:21: https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884";
const TANAKA = "Tanaka, H., Monahan, K. D., Seals, D. R. (2001), «Age-predicted maximal heart rate revisited», J. Am. Coll. Cardiol. 37(1):153–156: https://doi.org/10.1016/S0735-1097(00)01054-8";

export type DeviceId = "cinta" | "bicicleta" | "fuerza";

/** A machine of the exercise corner and the range it works in (the ISS device it copies). */
export interface ExerciseDevice {
  readonly id: DeviceId;
  readonly name: string;
  /** The ISS device it is modelled on. */
  readonly reference: string;
  readonly range: Sourced<{ readonly min: number; readonly max: number; readonly unit: string }>;
  /** What changes at 1 g on the ring. */
  readonly onTheRing: string;
}

export const DEVICES: Readonly<Record<DeviceId, ExerciseDevice>> = {
  cinta: {
    id: "cinta",
    name: "Cinta de correr",
    reference: "T2 (COLBERT), una Woodway Path modificada",
    range: { value: { min: 2.4, max: 19.3, unit: "km/h" }, source: SPRINT },
    onTheRing: "En la ISS un arnés de hombros y cintura con gomas sujeta a la corredora; en el anillo la sujeta su peso",
  },
  bicicleta: {
    id: "bicicleta",
    name: "Bicicleta ergométrica",
    reference: "CEVIS (Cycle Ergometer with Vibration Isolation and Stabilization)",
    range: { value: { min: 25, max: 350, unit: "W" }, source: SPRINT, note: "A 30–120 rpm" },
    onTheRing: "En la ISS se pedalea con zapatillas enganchadas y correas; en el anillo basta el sillín",
  },
  fuerza: {
    id: "fuerza",
    name: "Máquina de fuerza",
    reference: "ARED (Advanced Resistive Exercise Device), cilindros de vacío con volante de inercia",
    range: { value: { min: 11, max: 272, unit: "kg" }, source: SPRINT, note: "Carga constante" },
    onTheRing: "En el anillo podría ser una barra con discos; se queda la ARED porque no pesa lo que levanta",
  },
};

/** One workout of the Sprint protocol. */
export interface Workout {
  readonly id: string;
  readonly name: string;
  readonly device: DeviceId;
  readonly kind: "intervalos" | "continuo" | "fuerza";
  /** Repetitions × length: intervals of `workS` seconds, or sets of `reps` repetitions. */
  readonly sets: Sourced<{ readonly count: number; readonly workS?: number; readonly reps?: number }>;
}

export const WORKOUTS: readonly Workout[] = [
  { id: "intervalos-4x4", name: "Intervalos 4 × 4 min en la cinta", device: "cinta", kind: "intervalos", sets: { value: { count: 4, workS: 240 }, source: SPRINT } },
  { id: "intervalos-8x30", name: "Intervalos 8 × 30 s en la bicicleta", device: "bicicleta", kind: "intervalos", sets: { value: { count: 8, workS: 30 }, source: SPRINT } },
  { id: "continuo-30", name: "30 min continuos en la bicicleta", device: "bicicleta", kind: "continuo", sets: { value: { count: 1, workS: 1800 }, source: SPRINT, note: "Al 75 % del VO2 pico" } },
  { id: "fuerza-4x8", name: "Fuerza 4 × 8", device: "fuerza", kind: "fuerza", sets: { value: { count: 4, reps: 8 }, source: SPRINT, note: "Volumen moderado; la cuarta serie, casi al máximo" } },
];

/** Hours a week: the Sprint program against the standard ISS program it was compared with. */
export const WEEKLY_HOURS: Sourced<{ readonly sprint: number; readonly standard: readonly [number, number] }> = {
  value: { sprint: 6, standard: [9, 10] },
  source: SPRINT,
};

/** Interval target: mean peak heart rate above 90 % of the maximum in Sprint's intervals. */
export const INTERVAL_HR_FRACTION: Sourced<number> = { value: 0.9, source: SPRINT, note: "«mean, peak heart rates for all intervals performed were >90% HRmax»" };

/** Age-predicted maximum heart rate, beats per minute: 208 − 0.7 × age. */
export const maxHeartRate: Sourced<(age: number) => number> = { value: (age) => 208 - 0.7 * age, source: TANAKA };
