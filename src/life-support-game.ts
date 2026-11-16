import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import { ECLSS_MACHINES, ECLSS_RACKS, failureMode } from "@modules/life-support/data/eclss-machines";
import { eclssChore, eclssChores, failureOfChore } from "@modules/life-support/application/eclss-chores";
import { CrewExposure } from "@modules/life-support/domain/crew-effects";
import type { EclssMachineId, RackKind } from "@modules/life-support/domain/eclss";
import { CO2_LIMITS, LifeSupport, type LifeSupportConfig, type Readout } from "@modules/life-support/domain/life-support";
import { shelter } from "@modules/life-support/domain/radiation-shelter";
import { resupply } from "@modules/life-support/domain/resupply";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import type { Fixture } from "@modules/station/domain/interior";
import { PART_OF_FAILURE, type EclssRackModel, type RackState } from "./adapters/three/eclss-racks";
import type { DuelView, SessionText } from "./ui/duel-view";
import type { StationAction } from "./station-interior";
import "./ui/life-support.css";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const num = (v: number, d = 1) => v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

const rackOf = (m: EclssMachineId): RackKind => ECLSS_RACKS.find((r) => r.machines.includes(m))!.kind;
const fixtureOf = (m: EclssMachineId) => `sv-${rackOf(m)}`;

const TEXT = (c: Chore): SessionText => ({
  title: c.title,
  progress: "Pasos",
  lives: "Intentos",
  order: "Ordena el procedimiento",
  submit: "Hacerlo",
  ok: "Paso hecho",
  bad: "Así no: revisa el procedimiento",
  sheet: true,
});

export interface LifeSupportGameDeps {
  readonly duel: DuelView;
  say(text: string, seconds?: number): void;
  /** The 3D rack of a fixture, where its repair's steps are acted out. */
  rack(fixtureId: string): EclssRackModel | undefined;
  /** Frame a point of the scene above the challenge sheet while the repair is open, and stop. */
  frame?(at: { x: number; y: number; z: number }): void;
  unframe?(): void;
  openTasks(): void;
}

/**
 * The real life support in play (docs/design/soporte-vital.md): one `LifeSupport` for the vehicle that
 * hosts the racks (the station for now), stepped on the station's clock; its racks' cards (actions and
 * HUD readout), its failures as tasks of the global list, and what the air and water do to Doménica.
 */
export class LifeSupportGame {
  readonly system: LifeSupport;
  readonly exposure: CrewExposure;
  /** The repair open in the sheet (the experience suite reads its answer key here). */
  session: { chore: Chore; run: ChoreRun } | null = null;
  private symptomKey = "";

  constructor(
    private readonly d: LifeSupportGameDeps,
    config: LifeSupportConfig,
    bodyKg: number,
  ) {
    this.system = new LifeSupport(ECLSS_MACHINES, config, { randomFailures: true, graceDays: 2 });
    this.exposure = new CrewExposure(bodyKg);
  }

  /** Board hours of the host's clock. */
  tick(hours: number): void {
    if (hours <= 0) return;
    for (const e of this.system.advance(hours)) {
      if (e.kind === "alarma-co2") this.d.say(`Alarma de CO₂: ${num(e.mmHg)} mmHg (más de ${num(CO2_LIMITS.alarm.value)}). Revisa el CDRA en el bastidor de aire`, 8);
      if (e.kind === "co2-normal") this.d.say(`CO₂ normal otra vez: ${num(e.mmHg)} mmHg`, 5);
      if (e.kind === "averia") this.d.say(`Soporte vital: ${e.failure.symptom}`, 7);
      if (e.kind === "sin-agua") this.d.say("Se acabó el agua potable: Doménica empezará a deshidratarse", 7);
      if (e.kind === "sin-comida") this.d.say("Se acabó la comida envasada: hace falta un reabastecimiento", 7);
    }
    const r = this.system.readout();
    this.exposure.update(hours, { ...r });
    const now = this.exposure.symptoms(r);
    const key = now.map((s) => s.id).join(",");
    if (key !== this.symptomKey) {
      this.symptomKey = key;
      if (now.length) this.d.say(`Doménica: ${now.map((s) => `${s.name.toLowerCase()} (${s.why})`).join(", ")}`, 6);
    }
  }

  /** Board time passes for the experience suite (and a dev check): `hours` at once. */
  advance(hours: number): void {
    this.tick(hours);
  }

  private rackKind(f: Fixture): RackKind | undefined {
    return f.action.kind === "soporte-vital" ? f.action.rack : undefined;
  }

  private choresAt(kind: RackKind): Chore[] {
    const machines = ECLSS_RACKS.find((r) => r.kind === kind)?.machines ?? [];
    return eclssChores(this.system).filter((c) => kind === "consola" || machines.includes(c.machine as EclssMachineId));
  }

  /** A rack's card buttons: its repairs (the console has all of them), or what it is for. */
  actions(f: Fixture): StationAction[] {
    const kind = this.rackKind(f);
    if (!kind) return [];
    const chores = this.choresAt(kind).slice(0, 3);
    const out: StationAction[] = chores.map((c) => {
      const spare = failureMode(failureOfChore(c.id)!)!.spare;
      const ok = this.system.spares(spare.id) > 0;
      return { id: `chore:${c.id}`, label: c.title, enabled: ok, ...(ok ? {} : { why: `Falta el repuesto: ${spare.name}. Llega con el reabastecimiento` }) };
    });
    if (kind === "consola") out.push({ id: "tareas", label: "Todas las tareas", enabled: true });
    if (kind === "refugio") out.push({ id: "refugio", label: "Resguardarse", enabled: true });
    return out;
  }

  act(f: Fixture, id: string): void {
    if (id.startsWith("chore:")) return void this.startChore(id.slice(6));
    if (id === "tareas") return this.d.openTasks();
    if (id === "refugio") {
      const s = shelter(this.system.readout().waterKg);
      return this.d.say(`Refugio: ${num(s.reduction * 100, 0)} % menos dosis en una tormenta solar con el agua de a bordo${s.ready ? "" : ` (hacen falta ${num(s.neededKg, 0)} kg de agua)`}`, 6);
    }
    void f;
  }

  /** Lamp and broken part of a rack. */
  rackState(f: Fixture): { state: RackState; broken?: string } {
    const kind = this.rackKind(f);
    const machines = ECLSS_RACKS.find((r) => r.kind === kind)?.machines ?? [];
    const r = this.system.readout();
    const fail = this.system.active().find((x) => machines.includes(x.machine));
    if (kind === "consola") return { state: r.co2State === "alarma" ? "averia" : this.system.active().length || r.co2State === "aviso" ? "aviso" : "ok" };
    if (fail) return { state: fail.capacity === 0 ? "averia" : "aviso", ...(PART_OF_FAILURE[fail.id] ? { broken: PART_OF_FAILURE[fail.id] } : {}) };
    if (machines.some((m) => !this.system.working(m))) return { state: "apagado" };
    return { state: "ok" };
  }

  /** The HUD readout on a rack's card (only while she looks at it, or at the console). */
  readout(f: Fixture): string | undefined {
    const kind = this.rackKind(f);
    if (!kind) return undefined;
    const r = this.system.readout();
    const trend = r.co2TrendMmHgH > 0.005 ? " ↑" : r.co2TrendMmHgH < -0.005 ? " ↓" : "";
    const cell = (label: string, value: string, level = "ok", id = "") => `<div class="sv-cell ${level}"${id ? ` data-sv="${id}"` : ""}><span>${label}</span><b>${value}</b></div>`;
    const cells = [
      cell("ppO₂", `${num(r.ppO2KPa)} kPa`, r.o2State, "o2"),
      cell("ppCO₂", `${num(r.ppCO2MmHg)} mmHg${trend}`, r.co2State, "co2"),
      cell("Agua", `${num(r.waterKg, 0)} L`, r.waterKg < 50 ? "alarma" : "ok", "agua"),
      cell("Comida", `${num(r.foodDays, 0)} días`, r.foodDays < 14 ? "aviso" : "ok", "comida"),
      cell("Energía", `${num(r.powerW / 1000)} kW`, "ok", "energia"),
    ];
    const machines = ECLSS_RACKS.find((x) => x.kind === kind)?.machines ?? [];
    const level = (m: Readout["machines"][number]) => (m.working ? (m.capacity < 1 ? "aviso" : "ok") : "alarma");
    // The console: every machine as a short chip, and a line only for those that are not well.
    const chips = kind === "consola" ? `<ul class="sv-chips">${r.machines.map((m) => `<li class="${level(m)}">${esc(m.short)}</li>`).join("")}</ul>` : "";
    const lines = (kind === "consola" ? r.machines.filter((m) => level(m) !== "ok") : r.machines.filter((m) => machines.includes(m.id))).map(
      (m) => `<li class="${m.working ? (m.capacity < 1 ? "aviso" : "ok") : "alarma"}">${esc(m.short)} · ${m.working ? (m.capacity < 1 ? `al ${num(m.capacity * 100, 0)} %` : "en marcha") : "parado"}${m.why ? ` · ${esc(m.why)}` : ""}</li>`,
    );
    const extra = kind === "consola" ? this.consoleLines(r) : [];
    const sym = this.exposure.symptoms(r);
    const health = sym.length ? `<p class="sv-health" data-sv="salud">Doménica: ${sym.map((s) => `${esc(s.name.toLowerCase())} (${esc(s.why)})`).join(", ")}</p>` : "";
    const alarm = r.co2State === "alarma" ? `<p class="sv-alarm" data-sv="alarma">ALARMA CO₂ · más de ${num(CO2_LIMITS.alarm.value)} mmHg</p>` : "";
    return `${alarm}<div class="sv-grid">${cells.join("")}</div>${health}${chips}<ul class="sv-machines">${[...lines, ...extra].join("")}</ul>`;
  }

  private consoleLines(r: Readout): string[] {
    const s = shelter(r.waterKg);
    const year = resupply(this.system.config.crew, 365, ECLSS_MACHINES);
    return [
      `<li class="${r.cabinC > 27 ? "aviso" : "ok"}">Agua recuperada ${num(r.waterRecovery * 100, 0)} % · cabina ${num(r.cabinC, 0)} °C · calor ${num(r.heatW / 1000)} kW</li>`,
      `<li class="${s.ready ? "ok" : "aviso"}">Tanques: O₂ ${num(r.o2TankKg, 0)} kg, N₂ ${num(r.n2TankKg, 0)} kg · refugio de agua: ${num(s.reduction * 100, 0)} % menos dosis</li>`,
      `<li class="ok">Por año: ${num(year.foodKg, 0)} kg de comida y ${num(year.waterLossKg + year.waterForO2Kg, 0)} kg de agua</li>`,
    ];
  }

  /** Tasks of the global list: one per active failure, done at its rack. */
  taskFacts(): { id: string; title: string; detail: string; category: "estacion"; area: string }[] {
    return eclssChores(this.system).map((c) => ({ id: c.id, title: c.title, detail: `Soporte vital · ${c.exercises.length} retos`, category: "estacion", area: fixtureOf(c.machine as EclssMachineId) }));
  }

  /** Starts a life-support chore if `id` is one (false otherwise, so another owner can take it). */
  startChore(id: string): boolean {
    const failureId = failureOfChore(id);
    const f = failureId && this.system.active().find((x) => x.id === failureId);
    if (!f) return false;
    if (this.d.duel.visible) return true;
    if (this.system.spares(f.spare.id) <= 0) {
      this.d.say(`Falta el repuesto: ${f.spare.name}`, 5);
      return true;
    }
    const chore = eclssChore(f);
    const air = this.system.readout();
    // Ill (CO₂, hypoxia, thirst, heat) she has one try less (game value; NASA links CO₂ and dehydration to worse concentration).
    const run = new ChoreRun(chore, Math.max(1, 2 - this.exposure.mistakePenalty(air)));
    this.session = { chore, run };
    const visual = this.visual(f.id, fixtureOf(f.machine), f.steps.length);
    const model = this.d.rack(fixtureOf(f.machine));
    if (model) this.d.frame?.(model.focus(PART_OF_FAILURE[f.id] ?? ""));
    const prev = this.d.duel.onClose;
    const prevPick = this.d.duel.onRightPick;
    this.d.duel.onRightPick = (exId, slot) => {
      if (run.current?.id === exId && run.step === 0) visual.partDone?.(0, slot);
    };
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.d.duel.onRightPick = prevPick;
      this.d.unframe?.();
      this.session = null;
      if (run.status === "done") {
        this.system.repair(f.id);
        visual.finish();
        this.d.say(`${f.machine.toUpperCase()}: ${f.spare.name.toLowerCase()} cambiado. Vuelve a funcionar`, 6);
      } else visual.clear();
    };
    if (air.co2State !== "ok" || this.exposure.mistakePenalty(air)) this.d.say(`Con ${this.exposure.symptoms(air)[0]?.name.toLowerCase() ?? "este aire"} te concentras peor: un intento menos`, 5);
    this.d.duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      TEXT(chore),
      (ans: Answer) => {
        const index = run.step;
        const ok = run.submit(ans);
        if (ok) visual.stepDone(index);
        return { ok };
      },
    );
    return true;
  }

  /**
   * The repair acted out on its rack (the StepVisual port): the procedure lights one lamp per block as it
   * is placed (or all at once), the broken part flashes as it is changed; the value check finishes it.
   */
  private visual(failureId: string, fixtureId: string, blocks: number): StepVisual {
    const model = this.d.rack(fixtureId);
    const v = model?.repairVisual(PART_OF_FAILURE[failureId] ?? "", blocks);
    const lit = new Set<number>();
    return {
      stepDone: (index) => {
        if (!v) return;
        if (index === 0) for (let i = 0; i < blocks; i++) if (!lit.has(i)) v.stepDone(i);
      },
      partDone: (index, part) => {
        if (index !== 0 || !v) return;
        lit.add(part);
        v.stepDone(part);
      },
      finish: () => {
        v?.finish();
        // The lit lamps stay a moment, then the rack is as before.
        setTimeout(() => v?.clear(), 2500);
      },
      clear: () => v?.clear(),
    };
  }
}
