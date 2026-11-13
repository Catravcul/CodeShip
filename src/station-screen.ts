import type { Vec3 } from "@core/math/vec3";
import type { Ship } from "@modules/ship/domain/ship";
import type { Expedition } from "@modules/expedition/application/expedition";
import type { StationOps, StationSession } from "@modules/station/application/station-ops";
import type { RefuelOps, RefuelStatus } from "@modules/station/application/refuel";
import type { MachineId } from "@modules/station/domain/blueprint";
import type { Amounts } from "@modules/station/domain/materials";
import { MATERIALS, cargoMaterial, materialInfo, materialName } from "@modules/station/data/materials";
import { fmtKg } from "@modules/station/application/challenges";
import { partById } from "@modules/ship/data/parts";
import { electricThrusterById } from "@modules/mothership/data/thrusters";
import { StationScene } from "./adapters/three/station-model";
import type { DuelView, SessionText } from "./ui/duel-view";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`);
const hrs = (h: number) => (h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1).replace(".", ",")} h`);
const qty = (id: string, n: number) => (materialInfo(id)?.unit === "kits" ? `${Math.round(n)} ${Math.round(n) === 1 ? "kit" : "kits"}` : `${fmtKg(n)} kg`);
const short = (n: string) => n.replace(/^Aerojet Rocketdyne /, "").replace(/\s*\(.*\)$/, "");

export type StationTab = "materiales" | "planos" | "fabricacion" | "hangar";
/** Places inside a tab the screen can open at: the propellant plant and the refuelling card (both in Materiales). */
export type StationFocus = "propelente" | "repostar";
const TABS: readonly [StationTab, string][] = [
  ["materiales", "Materiales"],
  ["planos", "Planos"],
  ["fabricacion", "Fabricación"],
  ["hangar", "Hangar"],
];
const MACHINE: Readonly<Record<MachineId, string>> = { refineria: "Refinería", fundicion: "Fundición", impresora: "Impresora 3D de metal", planta: "Planta de propelente", repostaje: "Línea de repostaje" };
type ChoreMode = "refinar" | "fabricar" | "repostar";
const kwh = (v: number) => `${fmtKg(v)} kWh`;
const STAGE: Readonly<Record<string, string>> = { bruto: "Roca de la bodega (sin refinar)", refinado: "Refinados", importado: "Importados (no se pueden hacer aquí)" };

const text = (title: string, mode: ChoreMode): SessionText => ({
  title,
  progress: "Pasos",
  lives: "Intentos",
  order: mode === "refinar" ? "Ordena el proceso" : mode === "repostar" ? "Ordena el repostaje" : "Ordena la fabricación",
  submit: "Hacerlo",
  ok: "Bien hecho",
  bad: "Así no: inténtalo otra vez",
  sheet: true,
});

/**
 * The space station screen: the hangar in 3D (the ship parked, the machines lit while they work, the
 * spare parts and probes) and a panel with four tabs: materials and refinery, blueprints, the
 * fabrication queues and the hangar. Refining and fabricating open their code challenges in the
 * shared challenge sheet.
 */
export class StationScreen {
  readonly view: StationScene;
  private readonly ui: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly sub: HTMLElement;
  private readonly toast: HTMLElement;
  tab: StationTab = "materiales";
  active = false;
  /** The chore open in the sheet, if any (exposed for automated checks). */
  session: StationSession | null = null;
  private key = "";
  private refreshAt = 0;
  private toastUntil = 0;
  private drag: { id: number; x: number; moved: boolean } | null = null;
  onExit?: () => void;

  constructor(
    root: HTMLElement,
    readonly ops: StationOps,
    private readonly ship: Ship,
    private readonly expedition: Expedition,
    private readonly duel: DuelView,
    /** Where the ship is now (for the distance and docking). */
    private readonly shipPosition: () => Vec3,
    /** Where a craft that is out flying is (mothership, the Explorer), if known. */
    private readonly craftPosition: (id: string) => Vec3 | undefined = () => undefined,
    /** The refuelling line for docked craft (Materiales, «Repostar»). */
    readonly refuel?: RefuelOps,
  ) {
    this.view = new StationScene(ship.design);
    this.ui = document.createElement("div");
    this.ui.className = "st-ui hidden";
    this.ui.innerHTML = `<div class="st-head"><b>${esc(ops.station.site.name)}</b><span class="st-sub"></span></div><button class="bay-back st-back">Volver</button>
      <div class="st-panel"><div class="st-tabs" role="tablist">${TABS.map(([id, label]) => `<button role="tab" data-tab="${id}">${label}</button>`).join("")}</div><div class="st-body"></div></div><div class="bay-toast st-toast"></div>`;
    root.appendChild(this.ui);
    this.panel = this.ui.querySelector(".st-body")!;
    this.sub = this.ui.querySelector(".st-sub")!;
    this.toast = this.ui.querySelector(".st-toast")!;
    this.ui.querySelector(".st-back")!.addEventListener("click", () => this.exit());
    this.ui.querySelector(".st-tabs")!.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]");
      if (t) this.show(t.dataset.tab as StationTab);
    });
    this.panel.addEventListener("click", (e) => this.onClick(e));
    root.addEventListener("pointerdown", (e) => {
      if (!this.active || this.duel.visible || (e.target as HTMLElement).closest("button, .st-panel, .duel")) return;
      this.drag = { id: e.pointerId, x: e.clientX, moved: false };
    });
    window.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.view.orbit(-(e.clientX - d.x) * 0.006, 0);
      d.x = e.clientX;
    });
    window.addEventListener("pointerup", () => (this.drag = null));
    window.addEventListener("keydown", (e) => {
      if (this.active && !this.duel.visible && e.code === "Escape") this.exit();
    });
  }

  get scene() {
    return this.view.scene;
  }
  get camera() {
    return this.view.camera;
  }
  /** True while a station chore is open in the challenge sheet. */
  get busy(): boolean {
    return this.session !== null;
  }

  /** Close enough to dock (otherwise the screen is a remote/test access from the cockpit). */
  get alongside(): boolean {
    return this.ops.station.isAlongside(this.shipPosition());
  }

  /** Open the screen at a tab, or at the plant or the refuelling card (both in Materiales). */
  enter(tab: StationTab | StationFocus = this.tab): void {
    this.active = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-station");
    const focus = tab === "propelente" || tab === "repostar" ? tab : undefined;
    this.show(focus ? "materiales" : (tab as StationTab));
    if (focus) this.panel.querySelector(`#st-${focus}`)?.scrollIntoView({ block: "start" });
    this.layout();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.ui.classList.add("hidden");
    document.body.classList.remove("in-station");
    this.onExit?.();
  }

  show(tab: StationTab): void {
    this.tab = tab;
    for (const b of this.ui.querySelectorAll<HTMLElement>("[data-tab]")) b.classList.toggle("on", b.dataset.tab === tab);
    this.key = "";
    this.render();
    this.panel.scrollTop = 0;
  }

  resize(): void {
    this.layout();
  }

  private layout(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const landscape = w > h;
    if (this.duel.visible) this.view.setInset(landscape ? { right: Math.min(480, w * 0.46), bottom: 0 } : { right: 0, bottom: h * 0.62 });
    else this.view.setInset(landscape ? { right: Math.min(440, w * 0.44), bottom: 0 } : { right: 0, bottom: Math.round(h * 0.58) });
  }

  update(dt: number): void {
    if (!this.active) return;
    const st = this.ops.station;
    const busy = new Set(st.queue().map((j) => j.machine));
    this.view.setStore(st.hangar.partList(), st.hangar.crafts.filter((c) => c.kind === "sonda").length);
    this.view.update(dt, this.ship.design, busy, this.alongside);
    if (performance.now() > this.refreshAt) this.render();
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  private render(): void {
    if (!this.active) return;
    this.refreshAt = performance.now() + 400;
    const st = this.ops.station;
    const d = st.distanceTo(this.shipPosition());
    const subText = this.alongside ? `Atracada · a ${km(d)}` : `A ${km(d)} · acceso remoto de prueba`;
    if (this.sub.textContent !== subText) this.sub.textContent = subText;
    const html = this.tab === "materiales" ? this.materials() : this.tab === "planos" ? this.plans() : this.tab === "fabricacion" ? this.queue() : this.hangar();
    if (html === this.key) return;
    this.key = html;
    this.panel.innerHTML = html;
  }

  private chips(inputs: Amounts, missing: Amounts): string {
    return Object.entries(inputs)
      .map(([id, n]) => {
        const short = missing[id];
        return `<span class="st-chip ${short ? "miss" : "ok"}">${esc(materialName(id))} ${qty(id, n)}${short ? ` · faltan ${qty(id, short)}` : ""}</span>`;
      })
      .join("");
  }

  private materials(): string {
    const st = this.ops.station;
    const cargo = this.expedition.cargo;
    const cargoKg = cargo.reduce((s, c) => s + c.kg, 0);
    const hold = cargoKg
      ? `<div class="st-card"><div class="st-row"><b>Bodega de la nave</b><span>${fmtKg(cargoKg)} kg</span></div>
         <div class="st-chips">${cargo.map((c) => `<span class="st-chip">${esc(materialName(cargoMaterial(c.material) ?? c.material))} ${fmtKg(c.kg)} kg</span>`).join("")}</div>
         <button class="st-btn" data-unload>Descargar la bodega en la estación</button></div>`
      : `<p class="st-dim">La bodega está vacía. Persuade un asteroide: su roca llena la bodega y aquí se descarga.</p>`;
    const groups = (["bruto", "refinado", "importado"] as const)
      .map((stage) => {
        const rows = MATERIALS.filter((m) => m.stage === stage && !m.propellant)
          .map((m) => ({ m, n: st.stock.amount(m.id) }))
          .filter((r) => r.n > 0.005 || stage !== "bruto");
        if (!rows.length) return "";
        return `<div class="bay-sec">${STAGE[stage]}</div>${rows
          .map(
            ({ m, n }) =>
              `<div class="st-mat ${n > 0.005 ? "" : "zero"}"><b>${esc(m.name)}</b><span>${qty(m.id, n)}</span><small>${esc(m.note)}${m.source ? ` · <a href="${esc(m.source)}" target="_blank" rel="noopener">fuente</a>` : ""}</small></div>`,
          )
          .join("")}`;
      })
      .join("");
    const tanks = MATERIALS.filter((m) => m.propellant)
      .map((m) => {
        const n = st.stock.amount(m.id);
        return `<div class="st-mat ${n > 0.005 ? "" : "zero"}"><b>${esc(m.name)}</b><span>${qty(m.id, n)}</span><small>${m.stage === "importado" ? "Importado · " : "Se hace aquí · "}${esc(m.note)}${m.source ? ` · <a href="${esc(m.source)}" target="_blank" rel="noopener">fuente</a>` : ""}</small></div>`;
      })
      .join("");
    const cards = (machine: MachineId) => this.ops
      .refining()
      .filter(({ process: p }) => p.machine === machine)
      .map(({ process: p, scale, canRun }) => {
        // What one run would be: the batch the store allows, or a full one when it allows none.
        const k = canRun ? Math.min(1, scale) : 1;
        const ins = Object.entries(p.inputs)
          .map(([id, n]) => `${qty(id, n * k)} ${esc(materialName(id).toLowerCase())}`)
          .join(" + ");
        const outs = Object.entries(p.outputs)
          .map(([id, n]) => `${qty(id, n * k)} ${esc(materialName(id).toLowerCase())}`)
          .join(" + ");
        return `<div class="st-card"><div class="st-row"><b>${esc(p.name)}</b><span>${hrs(p.hours * k)}</span></div>
          <small>${esc(p.process.value)} · <a href="${esc(p.process.source)}" target="_blank" rel="noopener">fuente</a></small>
          ${p.energyKwh ? `<small>Energía: ${kwh(p.energyKwh.value * k)} ${canRun ? "por este lote" : "por lote"} · ${esc(p.energyKwh.note ?? "")} · <a href="${esc(p.energyKwh.source)}" target="_blank" rel="noopener">fuente</a></small>` : p.process.note ? `<small>${esc(p.process.note)}</small>` : ""}
          ${canRun ? `<div class="st-io">${ins} → ${outs}${k < 1 ? ` (lote al ${Math.round(k * 100)} %)` : ""}</div>` : `<div class="st-io miss">${machine === "planta" ? "Faltan materiales" : "Falta roca"}: ${Object.entries(p.inputs).map(([id, n]) => `${qty(id, n)} ${esc(materialName(id).toLowerCase())}`).join(" + ")} por lote</div>`}
          <button class="st-btn" data-refine="${esc(p.id)}" ${canRun ? "" : "disabled"}>${machine === "planta" ? "Producir" : "Refinar"}</button></div>`;
      })
      .join("");
    return `${this.refuelCards()}${hold}${groups}<div class="bay-sec">Refinería · cada lote es una cadena de retos</div>${cards("refineria")}
      <div class="bay-sec" id="st-propelente">Planta de propelente</div>
      <p class="st-dim">Del agua salen hidrógeno y oxígeno; del nitrógeno de la roca, amoníaco, hidracina y NTO. El nitrógeno es escaso: una bodega de Bennu trae poco más de 1 kg. El MMH, el LMP-103S, el helio y el xenón no se pueden hacer aquí y llegan importados.</p>
      ${cards("planta")}<div class="bay-sec">Depósitos de propelente</div>${tanks}`;
  }

  /** «Repostar»: one card per craft docked at the station, at the top of Materiales. */
  private refuelCards(): string {
    if (!this.refuel) return "";
    const docked = this.refuel.all().filter((s) => s.docked);
    if (!docked.length) return `<div class="bay-sec" id="st-repostar">Repostar</div><p class="st-dim">Para repostar, atraca la sonda o la nodriza en un puerto de la estación.</p>`;
    return `<div class="bay-sec" id="st-repostar">Repostar · naves atracadas</div>${docked.map((s) => this.refuelCard(s)).join("")}`;
  }

  private refuelCard(s: RefuelStatus): string {
    const lines = s.plan
      .map((p) => {
        const l = p.line;
        const full = l.capacityKg > 0 ? l.onBoardKg / l.capacityKg : 1;
        const what = p.roomKg <= 0.0005 ? (s.jobs.length && l.onBoardKg < l.capacityKg - 0.0005 ? "en camino" : "lleno") : p.loadKg > 0 ? `carga ${fmtKg(p.loadKg)} kg` : "sin existencias";
        const short = p.shortOf ? ` · falta ${esc(materialName(p.shortOf).toLowerCase())}` : "";
        return `<div class="st-fuel"><div class="st-row"><b>${esc(l.label)}</b><span>${fmtKg(l.onBoardKg)} / ${fmtKg(l.capacityKg)} kg</span></div><div class="bay-bar"><span>${esc(what)}${short}</span><i style="width:${Math.round(full * 100)}%"></i></div></div>`;
      })
      .join("");
    const takes = Object.entries(s.takes)
      .filter(([, n]) => n > 0.0005)
      .map(([id, n]) => `<span class="st-chip ok">${esc(materialName(id))} ${qty(id, n)}</span>`)
      .join("");
    const job = s.jobs[0];
    const running = job && this.ops.station.running(job);
    const status = job ? `<div class="st-io">${running ? `Trasvasando: quedan ${hrs(job.hoursLeft)}` : "Trasvase en cola"}</div>` : "";
    return `<div class="st-card st-refuel"><div class="st-row"><b>${esc(s.target.name)}</b><span>atracada</span></div>${lines}${status}
      ${takes ? `<small>Sale del almacén:</small><div class="st-chips">${takes}</div>` : ""}
      <button class="st-btn" data-refuel="${esc(s.target.id)}" ${s.canStart ? "" : "disabled"}>${s.canStart ? `Repostar · ${hrs(s.hours)}` : s.loadKg > 0 ? "Repostar" : job ? "Repostando" : s.plan.every((p) => p.roomKg <= 0.0005) ? "Tanques llenos" : "Sin propelente en el almacén"}</button></div>`;
  }

  private plans(): string {
    const plans = this.ops.plans();
    const ready = plans.filter((p) => p.canBuild);
    const card = (p: (typeof plans)[number]) => {
      const bp = p.blueprint;
      return `<div class="st-card ${p.canBuild ? "" : "locked"}"><div class="st-row"><b>${esc(bp.name)}</b><span>${fmtKg(bp.massKg)} kg · ${hrs(bp.hours)}</span></div>
        <small>${esc(MACHINE[bp.machine])} · ${esc(bp.process.value)} · <a href="${esc(bp.process.source)}" target="_blank" rel="noopener">fuente</a></small>
        <div class="st-chips">${this.chips(bp.inputs, p.missing)}</div>
        <div class="st-row">${p.inHangar ? `<span class="st-have">${p.inHangar} en el hangar</span>` : "<span></span>"}<button class="st-btn" data-build="${esc(bp.id)}" ${p.canBuild ? "" : "disabled"}>${p.canBuild ? "Fabricar" : "Faltan materiales"}</button></div></div>`;
    };
    return `<p class="st-dim">${ready.length} de ${plans.length} planos se pueden fabricar ya. Fabricar consume los materiales.</p>
      ${ready.length ? `<div class="bay-sec ok">Se pueden fabricar</div>${ready.map(card).join("")}` : ""}
      <div class="bay-sec">Faltan materiales</div>${plans.filter((p) => !p.canBuild).map(card).join("")}`;
  }

  private queue(): string {
    const st = this.ops.station;
    return (Object.keys(MACHINE) as MachineId[])
      .map((m) => {
        const jobs = st.queue(m);
        const rows = jobs
          .map((j, i) => {
            const done = 1 - j.hoursLeft / Math.max(1e-9, j.hoursTotal);
            return `<div class="st-job ${i === 0 ? "run" : ""}"><div class="st-row"><b>${esc(j.label)}</b><span>${i === 0 ? `quedan ${hrs(j.hoursLeft)}` : "en cola"}</span></div><div class="bay-bar"><span>${Math.round(done * 100)} %</span><i style="width:${Math.round(done * 100)}%"></i></div></div>`;
          })
          .join("");
        return `<div class="bay-sec">${MACHINE[m]}</div>${rows || `<p class="st-dim">Parada: sin trabajos</p>`}`;
      })
      .join("");
  }

  private hangar(): string {
    const h = this.ops.station.hangar;
    const crafts = h.crafts
      .map((c) => {
        const at = this.craftPosition(c.id);
        const where = at ? (this.ops.station.isAlongside(at) ? "atracada en la estación" : `fuera, a ${km(this.ops.station.distanceTo(at))}`) : c.docked ? "en el hangar" : "fuera";
        return `<div class="st-mat"><b>${esc(c.name)}</b><span>${c.kind === "nave" ? "nave nodriza" : "sonda"}</span><small>${esc(where)}${c.massKg ? ` · ${fmtKg(c.massKg)} kg` : ""}</small></div>`;
      })
      .join("");
    const parts = h.partList();
    const partRows = parts
      .map(([id, n]) => {
        const p = partById(id);
        const drive = electricThrusterById(id);
        return `<div class="st-mat"><b>${esc(p ? short(p.name) : drive ? `Propulsor ${drive.shortName}` : id)}</b><span>× ${n}</span><small>${drive ? "Se monta en la bahía, pestaña Nodriza, con la sonda acoplada" : "Se monta en la bahía de la nave"}</small></div>`;
      })
      .join("");
    return `<div class="bay-sec">Naves y sondas</div>${crafts}
      <div class="bay-sec">Piezas de repuesto</div>${partRows || `<p class="st-dim">No hay piezas. Fabrícalas en Planos; al cambiar una pieza en la bahía, la vieja vuelve aquí.</p>`}`;
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (t.closest("a") || this.duel.visible) return;
    if (t.closest("[data-unload]")) return this.unload();
    const r = t.closest<HTMLElement>("[data-refine]");
    if (r) return this.start(this.ops.startRefining(r.dataset.refine!), "refinar");
    const b = t.closest<HTMLElement>("[data-build]");
    if (b) return this.start(this.ops.startFabrication(b.dataset.build!), "fabricar");
    const f = t.closest<HTMLElement>("[data-refuel]");
    if (f && this.refuel) return this.start(this.refuel.startRefuel(f.dataset.refuel!), "repostar");
  }

  unload(): void {
    const { stored, ignored } = this.ops.station.unload(this.expedition.unloadCargo(), cargoMaterial);
    const kg = Object.values(stored).reduce((s, n) => s + n, 0);
    this.say(`${fmtKg(kg)} kg descargados${ignored.length ? ` · sin uso: ${ignored.join(", ")}` : ""}`);
    this.key = "";
    this.render();
  }

  /** Open a station chore in the challenge sheet; the job is queued when the chain is solved. */
  start(session: StationSession, mode: ChoreMode): void {
    const run = session.run;
    this.session = session;
    const prevClose = this.duel.onClose;
    this.duel.onClose = () => {
      this.duel.onClose = prevClose;
      this.session = null;
      this.layout();
      if (run.status === "done") {
        this.say(mode === "refinar" ? "Lote en marcha: mira Fabricación" : mode === "repostar" ? "Trasvasando propelente: mira Fabricación" : "En marcha: mira Fabricación");
        this.show("fabricacion");
      } else if (run.status === "failed") this.say(mode === "repostar" ? "No salió: el propelente sigue en el almacén" : "No salió: los materiales siguen en el almacén");
      this.key = "";
      this.render();
    };
    this.duel.show(
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
      text(session.chore.title, mode),
      (a) => ({ ok: session.answer(a) }),
    );
    this.layout();
  }

  private say(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + 3000;
  }
}
