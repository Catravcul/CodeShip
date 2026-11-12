import type { Propellant, ThrusterModel } from "@modules/ship/domain/components";
import type { ShipDesign } from "@modules/ship/domain/ship";
import { feeds, type PartSlot } from "@modules/ship/domain/refit";
import { partOptions } from "@modules/ship/data/parts";
import { PROPELLANT_DENSITY, tankVolumeM3 } from "@modules/ship/data/propellants";
import type { Machine } from "@modules/life-support/domain/machine";
import type { Sustainability } from "@modules/life-support/domain/sustainability";
import type { Chore } from "@modules/chores/domain/chore";
import { ATTENTION_TUNING, byIntegrity, byLevel, byMachine, mostUrgentFirst, worst } from "../domain/attention";
import type { ComponentStatus, Issue, Spec } from "../domain/component";

/** What the bay reads from the ship. `Ship` satisfies it. */
export interface BayShip {
  readonly design: ShipDesign;
  readonly hullIntegrity: number;
  readonly massKg: number;
  propellantKg(p: Propellant): number;
  propellantCapacityKg(p: Propellant): number;
  mainDeltaV(): number;
}

/** A farm-deck bed as the bay sees it. `Plant` satisfies it. */
export interface BayBed {
  readonly id: string;
  readonly species: { readonly name: string };
  readonly health: number;
  readonly alive: boolean;
  readonly areaM2: number;
}

/** A store on board (feed, culture medium…) with the amount the ship left with as its capacity. */
export interface BayStore {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly capacity: number;
  readonly unit: string;
}

export interface BayInput {
  readonly ship: BayShip;
  readonly machines: readonly Machine[];
  readonly beds: readonly BayBed[];
  readonly sustainability?: Sustainability;
  readonly stores: readonly BayStore[];
}

const PROP_NAME: Readonly<Record<Propellant, string>> = { "MMH/NTO": "MMH/NTO", Hydrazine: "hidracina" };
const num = (v: number, digits = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const pct = (v: number) => `${Math.round(v * 100)} %`;
const short = (n: string) => n.replace(/^Aerojet Rocketdyne /, "").replace(/\s*\(.*\)$/, "");

function thrusterSpecs(m: ThrusterModel): Spec[] {
  const src = m.sources[0];
  return [
    { label: "Modelo", value: m.name, ...(src ? { source: src } : {}) },
    { label: "Empuje", value: `${num(m.thrustN)} N` },
    { label: "Isp", value: `${m.ispS} s` },
    { label: "Masa", value: `${num(m.dryMassKg, 2)} kg` },
    { label: "Propelente", value: PROP_NAME[m.propellant] },
  ];
}

/** Propellant issues for thrusters that drink `p`. */
function supplyIssues(ship: BayShip, p: Propellant): Issue[] {
  const cap = ship.propellantCapacityKg(p);
  const a = byLevel(cap > 0 ? ship.propellantKg(p) / cap : 0);
  if (a === "ok") return [];
  return [{ attention: a, text: a === "critico" ? `Sin ${PROP_NAME[p]}: no empuja` : `Queda poca ${PROP_NAME[p]} (${pct(ship.propellantKg(p) / cap)})` }];
}

function status(c: Omit<ComponentStatus, "attention">): ComponentStatus {
  return { ...c, attention: worst(c.issues.map((i) => i.attention)) };
}

/** Every selectable part of the ship with its state, its problems and its spec sheet. */
export function bayStatus(input: BayInput): ComponentStatus[] {
  const { ship } = input;
  const d = ship.design;
  const out: ComponentStatus[] = [];
  const hull = ship.hullIntegrity;
  out.push(
    status({
      id: "casco",
      kind: "casco",
      name: d.hull.name,
      health: hull,
      issues: byIntegrity(hull) === "ok" ? [] : [{ attention: byIntegrity(hull), text: `Casco al ${pct(hull)}` }],
      specs: [
        { label: "Medidas", value: `${num(d.hull.size.x)} × ${num(d.hull.size.y)} × ${num(d.hull.size.z)} m (valor de juego)` },
        { label: "Masa del casco", value: `${num(d.hull.dryMassKg)} kg (valor de juego)` },
        { label: "Masa total ahora", value: `${num(ship.massKg)} kg` },
      ],
    }),
  );
  const engine = d.mainEngines[0];
  if (engine) {
    out.push(
      status({
        id: "motor",
        kind: "motor",
        name: `Motor principal ${short(engine.model.name)}`,
        slot: "motor",
        issues: supplyIssues(ship, engine.model.propellant),
        specs: [...thrusterSpecs(engine.model), { label: "Δv que queda", value: `${num(ship.mainDeltaV())} m/s` }],
      }),
    );
  }
  const rcs = d.rcs[0];
  if (rcs) {
    out.push(
      status({
        id: "rcs",
        kind: "rcs",
        name: `RCS: ${d.rcs.length} × ${short(rcs.model.name)}`,
        slot: "rcs",
        issues: supplyIssues(ship, rcs.model.propellant),
        specs: [
          { label: "Propulsores", value: String(d.rcs.length) },
          ...thrusterSpecs(rcs.model),
          { label: "Aceleración al avanzar", value: `${num((2 * rcs.model.thrustN) / ship.massKg, 3)} m/s²` },
        ],
      }),
    );
  }
  // Propellant is pooled per type (the Ship's model), so each tank shows its share of that pool.
  d.tanks.forEach((t, i) => {
    const p = t.spec.propellant;
    const pool = ship.propellantCapacityKg(p);
    const amount = pool > 0 ? (ship.propellantKg(p) * t.spec.capacityKg) / pool : 0;
    const issues: Issue[] = [];
    if (!feeds(d, p)) issues.push({ attention: "aviso", text: `Ningún propulsor usa ${PROP_NAME[p]}: es masa muerta` });
    else issues.push(...supplyIssues(ship, p).map((x) => ({ ...x, text: x.text.replace(": no empuja", "") })));
    out.push(
      status({
        id: `tanque-${i}`,
        kind: "tanque",
        name: `Tanque de ${PROP_NAME[p]}`,
        slot: `tanque-${i}` as PartSlot,
        level: { amount: Math.round(amount * 10) / 10, capacity: t.spec.capacityKg, unit: "kg" },
        issues,
        specs: [
          { label: "Capacidad", value: `${num(t.spec.capacityKg)} kg (valor de juego)` },
          { label: "Masa en vacío", value: `${num(t.spec.dryMassKg)} kg (valor de juego)` },
          { label: "Densidad", value: `${num(PROPELLANT_DENSITY[p].value)} kg/m³`, source: PROPELLANT_DENSITY[p].source },
          { label: "Volumen", value: `${num(tankVolumeM3(p, t.spec.capacityKg), 3)} m³` },
        ],
      }),
    );
  });
  out.push(
    status({
      id: "alas-solares",
      kind: "alas",
      name: "Alas solares",
      issues: [],
      specs: [
        { label: "Medidas", value: "2 alas de 3,2 × 1,4 m (valor de juego)" },
        { label: "Energía", value: "Sin modelo todavía: no limitan nada" },
      ],
    }),
  );
  for (const m of input.machines) {
    const a = byMachine(m.condition, m.working);
    out.push(
      status({
        id: `maquina:${m.id}`,
        kind: "maquina",
        name: m.spec.name,
        health: m.condition,
        issues: a === "ok" ? [] : [{ attention: a, text: m.working ? `Desgastada (${pct(m.condition)})` : `Averiada (${pct(m.condition)}): no funciona` }],
        specs: [{ label: "Basada en", value: m.spec.basis.value, source: m.spec.basis.source }, ...m.spec.settings.map((s) => ({ label: s.name, value: `${num(s.value, 1)}${s.unit ? ` ${s.unit}` : ""}` }))],
      }),
    );
  }
  const sus = input.sustainability;
  const deckIssues: Issue[] = [];
  if (sus && sus.ratio < 1) deckIssues.push({ attention: "aviso", text: `Autosuficiencia ${pct(sus.ratio)}: faltan ${Math.round(sus.neededM2 - sus.areaM2)} m² de cultivo` });
  for (const b of input.beds) {
    if (!b.alive) deckIssues.push({ attention: "aviso", text: `${b.species.name} (${b.id}) se ha perdido` });
    else if (b.health < ATTENTION_TUNING.bedHealthWarnBelow) deckIssues.push({ attention: "aviso", text: `${b.species.name} (${b.id}) al ${pct(b.health)}` });
  }
  out.push(
    status({
      id: "cubierta-cultivo",
      kind: "cubierta",
      name: "Cubierta de cultivo",
      issues: deckIssues,
      specs: [
        { label: "Bancales", value: String(input.beds.length) },
        { label: "Área", value: `${num(input.beds.reduce((s, b) => s + b.areaM2, 0))} m²` },
        ...(sus ? [{ label: "Autosuficiencia", value: `${pct(sus.ratio)} (${num(sus.areaM2)} de ${num(sus.neededM2)} m²)` }] : []),
      ],
    }),
  );
  out.push(
    status({
      id: "despensa",
      kind: "despensa",
      name: "Bodega y despensa",
      issues: input.stores.flatMap((s): Issue[] => {
        const a = byLevel(s.capacity > 0 ? s.amount / s.capacity : 0);
        return a === "ok" ? [] : [{ attention: a, text: a === "critico" ? `Falta ${s.name.toLowerCase()}` : `Queda poco ${s.name.toLowerCase()} (${num(s.amount)} ${s.unit})` }];
      }),
      specs: input.stores.map((s) => ({ label: s.name, value: `${num(s.amount)} de ${num(s.capacity)} ${s.unit}` })),
    }),
  );
  return out;
}

/** Parts that need a look, critical first. */
export const needingAttention = (list: readonly ComponentStatus[]): ComponentStatus[] => mostUrgentFirst(list.filter((c) => c.attention !== "ok"));

/** Something the player can do on a part: a chore already pending, or swapping it for a part that fits. */
export interface BayAction {
  readonly kind: "tarea" | "cambiar";
  /** A swap whose part is not in the hangar yet: it has to be built at the station first. */
  readonly locked?: boolean;
  readonly label: string;
  readonly detail: string;
  readonly choreId?: string;
  readonly slot?: PartSlot;
  readonly partId?: string;
}

const choresFor = (c: ComponentStatus, chores: readonly Chore[]): Chore[] => {
  if (c.kind === "casco") return chores.filter((x) => x.kind === "reparar-nave");
  if (c.kind === "maquina") return chores.filter((x) => x.kind === "reparar-maquina" && `maquina:${x.targetId}` === c.id);
  if (c.kind === "cubierta") return chores.filter((x) => x.targetId?.startsWith("bancal"));
  return [];
};

/** Spare parts available to fit (the station's hangar). `Hangar` satisfies it. */
export interface PartSupply {
  count(partId: string): number;
}

/**
 * What can be done on a part now. Every action is a chain of code challenges. With a part supply,
 * a swap needs that part in the hangar; without one every part on the shelf is free (old behaviour).
 */
export function bayActions(c: ComponentStatus, chores: readonly Chore[], design: ShipDesign, supply?: PartSupply): BayAction[] {
  const tasks = choresFor(c, chores).map((x): BayAction => ({ kind: "tarea", label: x.title, detail: `${x.scenario} · ${x.exercises.length} retos`, choreId: x.id }));
  const swaps = c.slot
    ? partOptions(design, c.slot).map((p): BayAction => {
        const what = p.kind === "tank" ? `${p.spec.capacityKg} kg de ${PROP_NAME[p.spec.propellant]}` : `${num(p.model.thrustN)} N · Isp ${p.model.ispS} s · ${num(p.model.dryMassKg, 2)} kg · ${PROP_NAME[p.model.propellant]}`;
        const n = supply ? supply.count(p.id) : 1;
        if (n > 0) return { kind: "cambiar", label: `Montar ${short(p.name)}`, detail: supply ? `${what} · ${n} en el hangar` : what, slot: c.slot!, partId: p.id };
        return { kind: "cambiar", locked: true, label: `Montar ${short(p.name)}`, detail: `${what} · no hay en el hangar: fabrícala en la estación`, slot: c.slot!, partId: p.id };
      })
    : [];
  // Parts in the hangar first, the ones still to build after.
  swaps.sort((a, b) => Number(!!a.locked) - Number(!!b.locked));
  return [...tasks, ...swaps];
}
