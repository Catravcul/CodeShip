import type { Mothership } from "@modules/mothership/domain/mothership";
import type { Alignment, DockingLimits } from "@modules/mothership/domain/docking";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import type { Received } from "@modules/story/domain/mailbox";
import type { AutopilotPhase } from "@modules/navigation/application/autopilot";
import type { TripStatus } from "@modules/navigation/application/navigator";
import type { MissionLog } from "@modules/missions/domain/mission";

/**
 * View-models for the mothership's flight deck (docs/design/cabina-nodriza.md): each display page
 * computed from the live domain objects, so the UI only lays numbers out and never makes them up.
 * Plain functions over read-only views of the other modules.
 */

/** Alert levels, quietest first. The deck is "quiet/dark": only non-nominal items get colour. */
export type Level = "nominal" | "advisory" | "caution" | "warning";

export interface Alert {
  readonly level: Level;
  readonly panel: PanelId;
  readonly text: string;
}

export type PanelId = "nav" | "prop" | "power" | "life" | "dock" | "comms";

/** Trip progress as the navigator reports it (Navigator.progress()). */
export interface TripProgress {
  readonly vehicle: "carrier" | "probe";
  readonly phase: AutopilotPhase;
  readonly remainingM: number;
  readonly etaS: number;
  readonly speedMS: number;
  readonly fraction: number;
}

// --- Propulsion ----------------------------------------------------------------

export interface PropulsionPanel {
  readonly thrusterName: string;
  readonly thrusterCount: number;
  /** How many are firing now (all of them during the burn and the braking of a hop, none otherwise). */
  readonly firing: number;
  readonly thrustPerThrusterN: number;
  readonly totalThrustN: number;
  /** Thrust being produced right now, N. */
  readonly thrustNowN: number;
  readonly ispS: number;
  readonly powerPerThrusterKw: number;
  /** Xenon flow of one thruster at this point, mg/s (ṁ = F / (Isp·g₀)). */
  readonly flowPerThrusterMgS: number;
  readonly xenonKg: number;
  readonly xenonCapacityKg: number;
  readonly xenonFraction: number;
  /** Δv left with the xenon on board (Tsiolkovsky), m/s. */
  readonly deltaVMs: number;
  readonly massT: number;
  readonly dryMassT: number;
  /** Acceleration with every thruster on, mm/s². */
  readonly accelMmS2: number;
  /** Days of full thrust the xenon on board lasts. */
  readonly burnDaysLeft: number;
  readonly sources: readonly string[];
  readonly note?: string;
}

/** Whether the mothership's thrusters are on: during a hop's burn and braking, not while it flips. */
export function thrustersFiring(trip: TripProgress | undefined): boolean {
  return !!trip && trip.vehicle === "carrier" && (trip.phase === "burn" || trip.phase === "brake");
}

export function propulsionPanel(m: Mothership, trip?: TripProgress): PropulsionPanel {
  // The fitted mix: per-unit figures are averages over the units the reactor can fire.
  const d = m.drive;
  const n = d.firingUnits;
  const types = [...new Map(d.mounts.filter((x) => x.fitted > 0).map((x) => [x.thruster.id, x.thruster])).values()];
  const per = (v: number) => (n > 0 ? v / n : 0);
  const firing = thrustersFiring(trip) ? n : 0;
  const mdot = per(d.massFlowKgS); // kg/s per thruster
  return {
    thrusterName: types.map((t) => t.name).join(" + ") || "sin propulsores",
    thrusterCount: n,
    firing,
    thrustPerThrusterN: per(d.thrustN),
    totalThrustN: m.thrustN,
    thrustNowN: firing * per(d.thrustN),
    ispS: d.ispS,
    powerPerThrusterKw: per(d.powerKw),
    flowPerThrusterMgS: mdot * 1e6,
    xenonKg: m.propellantKg,
    xenonCapacityKg: m.spec.propellantCapacityKg,
    xenonFraction: m.propellantKg / m.spec.propellantCapacityKg,
    deltaVMs: m.deltaV(),
    massT: m.massKg / 1000,
    dryMassT: m.dryMassKg / 1000,
    accelMmS2: m.accelerationMs2 * 1000,
    burnDaysLeft: d.massFlowKgS > 0 ? m.propellantKg / d.massFlowKgS / 86400 : Infinity,
    sources: types.flatMap((t) => t.sources),
    note: types.map((t) => t.note).filter(Boolean).join(" ") || undefined,
  };
}

// --- Power and thermal -------------------------------------------------------------

export interface PowerPanel {
  readonly electricKw: number;
  readonly thermalKw: number;
  readonly efficiency: number;
  /** Electric power going to the thrusters now, kW. */
  readonly thrusterLoadKw: number;
  /** Electric power left for everything else (ship, rings, life support), kW. */
  readonly marginKw: number;
  /** What the whole thruster array would draw, kW. */
  readonly thrusterArrayKw: number;
  readonly wasteHeatKw: number;
  readonly radiatorAreaM2: number;
  /** Heat each square metre of radiator must reject, kW/m². */
  readonly radiatorFluxKwM2: number;
  readonly specificMassKgPerKw: number;
  readonly sources: readonly string[];
}

export function powerPanel(m: Mothership, trip?: TripProgress): PowerPanel {
  const p = m.spec.power;
  const load = thrustersFiring(trip) ? m.thrusterPowerKw : 0;
  return {
    electricKw: p.electricKw.value,
    thermalKw: p.electricKw.value / p.conversionEfficiency.value,
    efficiency: p.conversionEfficiency.value,
    thrusterLoadKw: load,
    marginKw: p.electricKw.value - load,
    thrusterArrayKw: m.thrusterPowerKw,
    wasteHeatKw: m.wasteHeatKw,
    radiatorAreaM2: p.radiatorAreaM2.value,
    radiatorFluxKwM2: m.wasteHeatKw / p.radiatorAreaM2.value,
    specificMassKgPerKw: p.specificMassKgPerKw.value,
    sources: [...new Set([p.electricKw.source, p.conversionEfficiency.source, p.radiatorAreaM2.source])],
  };
}

// --- Life support and habitat ----------------------------------------------------

/** What the life panel reads from the habitat (Habitat satisfies it). */
export interface HabitatView {
  readonly crew: { readonly name: string; readonly wellbeing: number; readonly satiety: number; readonly fitness: number; readonly microgravityDays: number };
  readonly plants: readonly { readonly alive: boolean; readonly readyToHarvest: boolean; readonly isBed: boolean; readonly areaM2: number }[];
  readonly animals: readonly unknown[];
  readonly machines: readonly { readonly working: boolean }[];
  readonly sustainability: { readonly ratio: number };
}

export interface LifePanel {
  readonly ringRpm: number;
  readonly ringCruiseRpm: number;
  readonly ringRadiusM: number;
  /** Gravity on the ring floor now, g. */
  readonly floorG: number;
  readonly rimSpeedMs: number;
  readonly spinFraction: number;
  readonly spinningUp: boolean;
  readonly crewName: string;
  readonly wellbeing: number;
  readonly satiety: number;
  readonly fitness: number;
  readonly microgravityDays: number;
  readonly plantsAlive: number;
  readonly plantsReady: number;
  readonly growingAreaM2: number;
  /** Share of everyone's food the growing area covers (1 = self-sufficient). */
  readonly foodRatio: number;
  readonly animals: number;
  readonly machinesWorking: number;
  readonly machinesTotal: number;
}

export function lifePanel(ring: SpinRing, h: HabitatView): LifePanel {
  const alive = h.plants.filter((p) => p.alive);
  return {
    ringRpm: ring.rpm,
    ringCruiseRpm: ring.spec.rpm,
    ringRadiusM: ring.spec.floorRadiusM,
    floorG: ring.gravityG(ring.spec.floorRadiusM),
    rimSpeedMs: ring.rimSpeedMs,
    spinFraction: ring.spinFraction,
    spinningUp: ring.spinningUp,
    crewName: h.crew.name,
    wellbeing: h.crew.wellbeing,
    satiety: h.crew.satiety,
    fitness: h.crew.fitness,
    microgravityDays: h.crew.microgravityDays,
    plantsAlive: alive.length,
    plantsReady: alive.filter((p) => p.readyToHarvest).length,
    growingAreaM2: alive.reduce((s, p) => s + p.areaM2, 0),
    foodRatio: h.sustainability.ratio,
    animals: h.animals.length,
    machinesWorking: h.machines.filter((m) => m.working).length,
    machinesTotal: h.machines.length,
  };
}

// --- Docking -------------------------------------------------------------------

/** What the docking panel reads (the Docking use case plus the probe's range to the port). */
export interface DockingView {
  readonly docked: boolean;
  readonly assist: boolean;
  readonly lastFailures: readonly string[];
  readonly limits: DockingLimits;
  alignment(): Alignment;
  /** The port the probe is on or flying to (the mothership's or a station's), if there are several. */
  current?(): { readonly name: string };
}

export interface DockCheck {
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly limit: string;
  readonly ok: boolean;
}

/** The probe as the docking page lists it. */
export interface ProbeView {
  readonly name: string;
  /** 0..1 */
  readonly hullIntegrity: number;
  readonly propellants: readonly { readonly label: string; readonly kg: number; readonly capacityKg: number }[];
}

export interface DockingPanel {
  readonly probe?: ProbeView;
  /** Name of the port the read-out refers to. */
  readonly portName?: string;
  readonly docked: boolean;
  readonly assist: boolean;
  readonly rangeM: number;
  /** Contact checks against the IDSS limits (empty while docked). */
  readonly checks: readonly DockCheck[];
  readonly lastFailures: readonly string[];
  readonly sources: readonly string[];
}

export function dockingPanel(d: DockingView, rangeM: number, probe?: ProbeView): DockingPanel {
  const l = d.limits;
  const portName = d.current?.().name;
  if (d.docked) return { probe, portName, docked: true, assist: false, rangeM: 0, checks: [], lastFailures: [], sources: l.sources };
  const a = d.alignment();
  const checks: DockCheck[] = [
    { label: "Cierre", value: a.closingMs, unit: "m/s", limit: `${l.closingMinMs}–${l.closingMaxMs}`, ok: a.closingMs >= l.closingMinMs && a.closingMs <= l.closingMaxMs },
    { label: "Desvío lateral", value: a.lateralM, unit: "m", limit: `≤ ${l.lateralMisalignM}`, ok: a.lateralM <= l.lateralMisalignM },
    { label: "Inclinación", value: a.misalignDeg, unit: "°", limit: `≤ ${l.angularMisalignDeg}`, ok: a.misalignDeg <= l.angularMisalignDeg },
    { label: "Alabeo", value: Math.abs(a.rollDeg), unit: "°", limit: `≤ ${l.rollMisalignDeg}`, ok: Math.abs(a.rollDeg) <= l.rollMisalignDeg },
  ];
  return { probe, portName, docked: false, assist: d.assist, rangeM, checks, lastFailures: d.lastFailures, sources: l.sources };
}

// --- Comms ----------------------------------------------------------------------

export interface CommsLine {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly day: number;
  readonly read: boolean;
  readonly call: boolean;
  /** A mission waiting to be done. */
  readonly missionPending: boolean;
}

/** Nevaeh's mission chain as the radio page sums it up (from modules/missions). */
export interface MissionsSummary {
  /** The main mission to fly now, if one is playable. */
  readonly active?: { readonly title: string; readonly targetId: string; readonly targetName: string; readonly chapter: string };
  readonly mainDone: number;
  readonly mainTotal: number;
  readonly sideDone: number;
  readonly sideTotal: number;
}

export function missionsSummary(log: MissionLog): MissionsSummary {
  const a = log.active;
  const side = log.sideCount;
  return {
    ...(a ? { active: { title: a.title, targetId: a.target.id, targetName: a.target.name, chapter: a.chapterTitle } } : {}),
    mainDone: log.mainDone,
    mainTotal: log.main.length,
    sideDone: side.done,
    sideTotal: side.total,
  };
}

export interface CommsPanel {
  readonly missions?: MissionsSummary;
  readonly unread: number;
  readonly pendingMissions: number;
  /** Newest first. */
  readonly letters: readonly CommsLine[];
}

export function commsPanel(received: readonly Received[], missions?: MissionsSummary): CommsPanel {
  const letters = received
    .map((r) => ({
      id: r.letter.id,
      from: r.letter.from,
      subject: r.letter.subject,
      day: r.day,
      read: r.read,
      call: r.letter.channel === "llamada",
      missionPending: !!r.letter.mission && !r.missionDone,
    }))
    .reverse();
  return { ...(missions ? { missions } : {}), unread: letters.filter((l) => !l.read).length, pendingMissions: letters.filter((l) => l.missionPending).length, letters };
}

// --- Navigation -------------------------------------------------------------------

export interface NavPanel {
  readonly targetName: string;
  readonly status: TripStatus;
  readonly trip?: TripProgress;
}

export function navPanel(targetName: string, status: TripStatus, trip?: TripProgress): NavPanel {
  return { targetName, status, trip };
}

// --- Caution and warning ---------------------------------------------------------

/** Game thresholds for the deck's alerts (not from a standard; tuned to be rare). */
export const DECK_THRESHOLDS = {
  xenonCaution: 0.2,
  xenonWarning: 0.05,
  wellbeingCaution: 0.35,
  foodCaution: 0.8,
} as const;

/**
 * The deck's caution and warning list, most severe first. Following the "quiet/dark" idea of the
 * Orion/Artemis displays, a nominal ship shows an empty list.
 */
export function alerts(p: { prop: PropulsionPanel; life: LifePanel; dock: DockingPanel; comms: CommsPanel; nav: NavPanel }): Alert[] {
  const out: Alert[] = [];
  const T = DECK_THRESHOLDS;
  if (p.prop.xenonFraction < T.xenonWarning) out.push({ level: "warning", panel: "prop", text: "Xenón casi agotado" });
  else if (p.prop.xenonFraction < T.xenonCaution) out.push({ level: "caution", panel: "prop", text: "Xenón bajo" });
  const broken = p.life.machinesTotal - p.life.machinesWorking;
  if (broken > 0) out.push({ level: "caution", panel: "life", text: `${broken} máquina${broken > 1 ? "s" : ""} averiada${broken > 1 ? "s" : ""}` });
  if (p.life.wellbeing < T.wellbeingCaution) out.push({ level: "caution", panel: "life", text: `${p.life.crewName}: bienestar bajo` });
  if (p.life.foodRatio < T.foodCaution) out.push({ level: "advisory", panel: "life", text: "El huerto no cubre la comida" });
  if (p.life.spinFraction < 0.999) out.push({ level: "advisory", panel: "life", text: p.life.spinningUp ? "Anillos acelerando" : "Anillos frenando" });
  if (!p.dock.docked) out.push({ level: "advisory", panel: "dock", text: "Sonda fuera" });
  if (p.dock.probe && p.dock.probe.hullIntegrity < 0.5) out.push({ level: "caution", panel: "dock", text: "Casco de la sonda dañado" });
  if (p.nav.status === "failed") out.push({ level: "caution", panel: "nav", text: "Plan de viaje rechazado" });
  if (p.comms.unread > 0) out.push({ level: "advisory", panel: "comms", text: `${p.comms.unread} mensaje${p.comms.unread > 1 ? "s" : ""} sin leer` });
  const rank: Record<Level, number> = { warning: 0, caution: 1, advisory: 2, nominal: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Worst level of the alerts that belong to one panel (for the colour of its frame). */
export function panelLevel(list: readonly Alert[], panel: PanelId): Level {
  return list.find((a) => a.panel === panel)?.level ?? "nominal";
}
