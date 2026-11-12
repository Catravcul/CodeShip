import type { Propellant, ThrusterModel } from "@modules/ship/domain/components";
import type { ShipDesign } from "@modules/ship/domain/ship";
import { feeds, isEmptyPart, type PartSlot } from "@modules/ship/domain/refit";
import { partOptions } from "@modules/ship/data/parts";
import { PROPELLANT_DENSITY, tankVolumeM3 } from "@modules/ship/data/propellants";
import { REGION_SUN_AU } from "@modules/ship/data/equipment";
import { equipmentMassKg, equipmentOf, isEquipmentSlot, wallArealDensityKgM2, type Equipment, type EquipmentSlot } from "@modules/ship/domain/equipment";
import { powerBudget, type PowerBudget } from "@modules/ship/domain/power";
import { criticalDiameterCm, debrisDamageFactor } from "@modules/ship/domain/mmod";
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
  readonly dryMassKg: number;
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

/** Spec lines every piece of equipment shows: mass, power, materials, flight history and how it was worked out. */
function equipmentSpecs(e: Equipment): Spec[] {
  return [
    { label: "Pieza", value: e.name, ...(e.sources[0] ? { source: e.sources[0] } : {}) },
    { label: "Masa", value: `${num(e.massKg, 1)} kg` },
    ...(e.storageWh ? [{ label: "Energía", value: `${num(e.storageWh / 1000, 1)} kWh${e.rechargeable === false ? " (no se recarga)" : ""}` }] : []),
    { label: "Materiales", value: e.materials, more: true },
    ...(e.size ? [{ label: "Tamaño", value: e.size, more: true }] : []),
    { label: "Ha volado", value: e.flight, more: true },
    { label: "Cómo se calcula", value: e.basis, more: true },
  ];
}

const hours = (h: number) => (h === Infinity ? "sin límite" : h >= 48 ? `${num(h / 24, 1)} días` : `${num(h, 1)} h`);

/** Bay warnings for the power budget (game thresholds: a sortie should last a working day). */
export const POWER_TUNING = { sortieHours: 8 } as const;

function powerIssues(b: PowerBudget): Issue[] {
  if (b.netW >= 0) return [];
  if (b.storageWh <= 0) return [{ attention: "critico", text: `Faltan ${num(-b.netW)} W y no hay batería` }];
  if (b.enduranceH < POWER_TUNING.sortieHours) return [{ attention: "aviso", text: `Faltan ${num(-b.netW)} W: la batería dura ${hours(b.enduranceH)}` }];
  return [];
}

function powerSpecs(b: PowerBudget): Spec[] {
  return [
    { label: "Produce", value: `${num(b.producedW)} W a ${num(REGION_SUN_AU.value, 2)} UA del Sol`, source: REGION_SUN_AU.source },
    { label: "Consume", value: `${num(b.drawnW)} W` },
    { label: "Balance", value: b.netW >= 0 ? `Sobran ${num(b.netW)} W` : `Faltan ${num(-b.netW)} W` },
    { label: "Batería", value: `${num(b.storageWh / 1000, 1)} kWh${b.storageWh && !b.rechargeable ? " (no se recarga)" : ""} · dura ${hours(b.enduranceH)}` },
    ...b.lines.map((l) => ({ label: l.name, value: `${l.watts > 0 ? "+" : "−"}${num(Math.abs(l.watts))} W`, more: true })),
  ];
}

const EQUIPMENT_ID: Readonly<Record<Exclude<EquipmentSlot, "cabina">, string>> = { energia: "alas-solares", bateria: "bateria", escudo: "escudo-mmod" };

/** Power source, battery and micrometeoroid shield (the cabin is the hull's entry). */
function equipmentStatus(ship: BayShip): ComponentStatus[] {
  const d = ship.design;
  const budget = powerBudget(d.equipment, REGION_SUN_AU.value);
  const out: ComponentStatus[] = [];
  const source = equipmentOf(d.equipment, "energia");
  if (source)
    out.push(
      status({ id: EQUIPMENT_ID.energia, kind: "energia", name: `Energía · ${source.name}`, slot: "energia", issues: powerIssues(budget), specs: [...powerSpecs(budget), ...equipmentSpecs(source)] }),
    );
  const battery = equipmentOf(d.equipment, "bateria");
  if (battery) {
    const issues: Issue[] = battery.rechargeable === false && budget.netW >= 0 ? [{ attention: "aviso", text: "Es primaria: lo que sobra de la fuente no la recarga" }] : [];
    out.push(status({ id: EQUIPMENT_ID.bateria, kind: "bateria", name: battery.name, slot: "bateria", issues, specs: [{ label: "Dura", value: hours(budget.enduranceH) }, ...equipmentSpecs(battery)] }));
  }
  const shield = equipmentOf(d.equipment, "escudo");
  if (shield) {
    const dc = criticalDiameterCm(d.equipment);
    const k = debrisDamageFactor(d.equipment);
    out.push(
      status({
        id: EQUIPMENT_ID.escudo,
        kind: "escudo",
        name: `Escudo · ${shield.name}`,
        slot: "escudo",
        issues: [],
        specs: [
          { label: "Diámetro crítico", value: `${num(dc * 10, 2)} mm de aluminio a 7 km/s (manual de la NASA)`, source: "https://ntrs.nasa.gov/citations/20090010053" },
          { label: "Daño de las piedras", value: `${pct(k)} del de la cabina de serie sin escudo (regla de juego)` },
          ...equipmentSpecs(shield),
          { label: "Regla de juego", value: "El daño de las piedras de un asteroide enfadado se divide por cuánto más grande es la partícula que para la pared, comparada con la cabina de serie", more: true },
        ],
      }),
    );
  }
  return out;
}

/** Every selectable part of the ship with its state, its problems and its spec sheet. */
export function bayStatus(input: BayInput): ComponentStatus[] {
  const { ship } = input;
  const d = ship.design;
  const out: ComponentStatus[] = [];
  const hull = ship.hullIntegrity;
  const cabin = equipmentOf(d.equipment, "cabina");
  const fixed = d.equipment.filter((e) => !isEquipmentSlot(e.kind));
  out.push(
    status({
      id: "casco",
      kind: "casco",
      name: cabin ? `${d.hull.name} · ${cabin.name}` : d.hull.name,
      health: hull,
      ...(cabin ? { slot: "cabina" as const } : {}),
      issues: byIntegrity(hull) === "ok" ? [] : [{ attention: byIntegrity(hull), text: `Casco al ${pct(hull)}` }],
      specs: [
        ...(cabin ? equipmentSpecs(cabin) : []),
        ...(cabin?.wall ? [{ label: "Pared", value: `${num(cabin.wall.thicknessMm, 2)} mm de ${cabin.wall.material} (${num(wallArealDensityKgM2(cabin.wall), 1)} kg/m²)` }] : []),
        { label: "Medidas exteriores", value: `${num(d.hull.size.x)} × ${num(d.hull.size.y)} × ${num(d.hull.size.z)} m (valor de juego)`, more: true },
        { label: "Masa en seco", value: `${num(ship.dryMassKg)} kg: la suma de todas las piezas` },
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
  out.push(...equipmentStatus(ship));
  out.push(
    status({
      id: "sistemas-fijos",
      kind: "sistemas",
      name: "Estructura y sistemas fijos",
      issues: [],
      specs: [
        { label: "Masa", value: `${num(equipmentMassKg(fixed))} kg en total` },
        ...fixed.map((e) => ({ label: e.name, value: `${num(e.massKg)} kg${e.powerW ? ` · ${num(-e.powerW)} W` : ""}`, ...(e.sources[0] ? { source: e.sources[0] } : {}) })),
        ...fixed.map((e) => ({ label: `${e.name}: cómo se calcula`, value: `${e.basis}. ${e.materials}. ${e.flight}`, more: true })),
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

/** One line for a piece of equipment in the bay's swap list: mass and what it does. */
export function equipmentSummary(e: Equipment): string {
  const parts = [`${num(e.massKg, 1)} kg`];
  if (e.powerW > 0) parts.push(`${num(e.powerW)} W${e.solar ? " a 1 UA" : ""}`);
  if (e.storageWh) parts.push(`${num(e.storageWh / 1000, 1)} kWh${e.rechargeable === false ? " sin recarga" : ""}`);
  if (e.wall) parts.push(`pared de ${num(e.wall.thicknessMm, 2)} mm`);
  if (e.bumper) parts.push(`parachoques de ${num(e.bumper.thicknessCm * 10, 2)} mm a ${e.bumper.standoffCm} cm`);
  return parts.join(" · ");
}

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
        const what =
          p.kind === "tank"
            ? `${p.spec.capacityKg} kg de ${PROP_NAME[p.spec.propellant]}`
            : p.kind === "equipment"
              ? equipmentSummary(p.equipment)
              : `${num(p.model.thrustN)} N · Isp ${p.model.ispS} s · ${num(p.model.dryMassKg, 2)} kg · ${PROP_NAME[p.model.propellant]}`;
        if (isEmptyPart(p)) return { kind: "cambiar", label: c.slot === "energia" ? "Quitar la fuente: solo batería" : "Quitar el escudo", detail: supply ? "La pieza que sale va al hangar" : "Deja el hueco vacío", slot: c.slot!, partId: p.id };
        const n = supply ? supply.count(p.id) : 1;
        if (n > 0) return { kind: "cambiar", label: `Montar ${short(p.name)}`, detail: supply ? `${what} · ${n} en el hangar` : what, slot: c.slot!, partId: p.id };
        return { kind: "cambiar", locked: true, label: `Montar ${short(p.name)}`, detail: `${what} · no hay en el hangar: fabrícala en la estación`, slot: c.slot!, partId: p.id };
      })
    : [];
  // Parts in the hangar first, the ones still to build after.
  swaps.sort((a, b) => Number(!!a.locked) - Number(!!b.locked));
  return [...tasks, ...swaps];
}
