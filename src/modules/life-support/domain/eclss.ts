import type { Sourced } from "@core/units";
import type { Realism } from "../data/eclss-sources";

/**
 * Real life support (ECLSS) as the ISS flies it (docs/design/soporte-vital.md). Vehicle-agnostic: the
 * same machines serve the Starship mothership and the ISS-type station; the host only says how many
 * people, how much free air and which stocks it carries.
 */
export type EclssMachineId = "oga" | "sabatier" | "cdra" | "tccs" | "upa" | "wpa" | "bpa" | "itcs" | "incendios" | "galeria";

/**
 * What a host places: one interactable per rack group, as the ISS packages them (docs/design/soporte-vital.md, «Bastidores»).
 * `ar` (CDRA + TCCS), `ogs` (OGA + Sabatier), `wrs` (UPA + WPA + BPA, two racks), `itcs` (pump package),
 * `incendios` (extinguisher and breathing mask on the wall), `galeria` (hot water and food warmer),
 * `refugio` (crew quarters lined with water bags) and `consola` (the life-support laptop).
 */
export type RackKind = "ar" | "ogs" | "wrs" | "itcs" | "incendios" | "galeria" | "refugio" | "consola";

/** A failure mode of a real machine and how it is fixed on orbit. */
export interface FailureMode {
  readonly id: string;
  readonly machine: EclssMachineId;
  /** Short name of what broke ("Lechos de zeolita degradados"). */
  readonly name: string;
  /** What the crew sees (the task's scenario). */
  readonly symptom: string;
  /** Share of its capacity the machine keeps while this is not fixed (0 = stopped). */
  readonly capacity: number;
  /** The orbital replacement unit (ORU) or consumable it takes. */
  readonly spare: { readonly id: string; readonly name: string };
  /** The repair procedure, in order (Spanish imperatives, one per code block). */
  readonly steps: readonly string[];
  /** A real value to restore after the repair (asked as a choice). */
  readonly check: { readonly name: string; readonly value: number; readonly unit: string; readonly wrong: readonly number[] };
  /** Scheduled maintenance (a bed at the end of its life) rather than a fault. */
  readonly maintenance?: boolean;
  /** What causes it and what wears towards it (docs/design/soporte-vital.md, «Averías con causa»). */
  readonly wear: Wear;
  readonly source: string;
}

/**
 * What a failure feeds on: hours running, the CDRA's half-cycles (each one heats and cools the beds and moves
 * the selector valves), hours actually processing, kilograms treated (urine, water, brine) or air blown.
 */
export type WearDriver = "horas" | "ciclos" | "horas-proceso" | "kg-orina" | "kg-agua" | "kg-salmuera" | "m3-aire";

/** How sure a number is (docs/design/naves-reales.md, «Reglas de datos»): measured, our estimate, or a licence. */
export type DataLabel = "real" | "estimacion" | "licencia";

/**
 * The cause model of a failure mode: no dice. A driver accumulates while the machine runs; at `life` the
 * failure happens. From `SERVICE_AT` of its life a preventive maintenance is due, which resets the wear.
 */
export interface Wear {
  readonly driver: WearDriver;
  /** The driver's unit as the card says it ("h de marcha", "medios ciclos", "kg de orina"). */
  readonly unit: string;
  /** Why it happens, as the sources tell it (Spanish, one line). */
  readonly cause: string;
  readonly causeSource: string;
  /** Driver count at which it fails. */
  readonly life: number;
  readonly lifeLabel: DataLabel;
  readonly lifeNote: string;
  /** Share of its life it has used when the game starts (game value: the ISS's machines are not new). */
  readonly startShare: number;
  /** Another mode that makes this one wear faster: its wear share adds to the rate (rate × (1 + share)). */
  readonly worsenedBy?: { readonly failure: string; readonly why: string };
  /** The preventive maintenance: its procedure (the repair's when left out), the spare it takes and where it leaves the wear. */
  readonly service: { readonly name: string; readonly steps?: readonly string[]; readonly usesSpare: boolean; readonly resetTo: number };
}

export interface EclssMachineSpec {
  readonly id: EclssMachineId;
  /** Acronym as on the ISS (OGA, CDRA…). */
  readonly short: string;
  readonly name: string;
  /** What it does, one line. */
  readonly does: string;
  readonly realism: Realism;
  readonly rack: RackKind;
  /** Nominal rate in its own unit (kg of O₂ a day, kg of CO₂ a day…). */
  readonly rate: Sourced<number> & { readonly unit: string };
  /** Power while working, W. */
  readonly powerW: Sourced<number>;
  readonly massKg: Sourced<number>;
  /** It needs the internal coolant loops: without them it shuts down. */
  readonly cooled: boolean;
  readonly failures: readonly FailureMode[];
}

/** A rack group as a host places it: real size, m (ISPR: 2,0 × 1,05 × 0,86), and the machines inside. */
export interface RackSpec {
  readonly kind: RackKind;
  readonly name: string;
  readonly machines: readonly EclssMachineId[];
  /** Real size: width across its front, height and depth into the wall, m. */
  readonly size: { readonly w: number; readonly h: number; readonly d: number };
  /** How many ISPR bays it takes along the wall (0 for things on a wall or a laptop). */
  readonly bays: number;
  readonly info: string;
  readonly source: string;
}
