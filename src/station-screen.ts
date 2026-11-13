import type { Vec3 } from "@core/math/vec3";
import type { Ship } from "@modules/ship/domain/ship";
import type { Expedition } from "@modules/expedition/application/expedition";
import type { StationOps, StationSession } from "@modules/station/application/station-ops";
import type { RefuelOps, RefuelStatus } from "@modules/station/application/refuel";
import type { BioOps, BioStatus, Larder } from "@modules/station/application/bio-ops";
import { overallSelfSufficiency, type GaugeRow } from "@modules/station/domain/bioreactor";
import { MACHINE_NAME, type BlueprintKind, type MachineId } from "@modules/station/domain/blueprint";
import { MODULE_KIND_NAME } from "@modules/station/domain/outfit";
import { equipmentById, stationComponentById } from "@modules/station/data/outfit";
import type { Amounts } from "@modules/station/domain/materials";
import { MATERIALS, cargoMaterial, materialInfo, materialName } from "@modules/station/data/materials";
import { fmtKg } from "@modules/station/application/challenges";
import { partById } from "@modules/ship/data/parts";
import { electricThrusterById } from "@modules/mothership/data/thrusters";
import { StationScene } from "./adapters/three/station-model";
import type { DuelView, SessionText } from "./ui/duel-view";
import type { ImportOps } from "@modules/imports/application/import-ops";
import { IMPORT_GOODS } from "@modules/imports/data/goods";
import { LAUNCHERS, TRANSFER_STAGE } from "@modules/imports/data/launchers";
import { IMPORT_SRC } from "@modules/imports/data/sources";
import { TOW_DIAMETERS_M } from "@modules/imports/data/craft";
import { COMET_SRC } from "@modules/celestial/data/comets";
import { USD_PER_CREDIT } from "@modules/imports/domain/wallet";
import "./ui/station-growth.css";
import "./ui/station-life.css";
import "./ui/imports.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`);
const hrs = (h: number) => (h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1).replace(".", ",")} h`);
const qty = (id: string, n: number) => (materialInfo(id)?.unit === "kits" ? `${Math.round(n)} ${Math.round(n) === 1 ? "kit" : "kits"}` : `${fmtKg(n)} kg`);
const short = (n: string) => n.replace(/^Aerojet Rocketdyne /, "").replace(/\s*\(.*\)$/, "");

export type StationTab = "materiales" | "planos" | "fabricacion" | "hangar" | "importar" | "vida";
/** Places inside a tab the screen can open at: the propellant plant and the refuelling card (both in Materiales). */
export type StationFocus = "propelente" | "repostar";
const TABS: readonly [StationTab, string][] = [
  ["materiales", "Materiales"],
  ["planos", "Planos"],
  ["fabricacion", "Fabricación"],
  ["hangar", "Hangar"],
  ["importar", "Importar"],
  ["vida", "Vida"],
];
const MACHINE = MACHINE_NAME;
const PLAN_KINDS: readonly [BlueprintKind, string][] = [
  ["modulo", "Módulos"],
  ["equipo", "Equipo"],
  ["componente", "Componentes"],
];
const kw = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString("es-ES")} kW`;
type ChoreMode = "refinar" | "fabricar" | "repostar" | "importar" | "ajustar";
const kwh = (v: number) => `${fmtKg(v)} kWh`;
const STAGE: Readonly<Record<string, string>> = { bruto: "Roca de la bodega (sin refinar)", refinado: "Refinados", importado: "Importados (no se pueden hacer aquí)", biologico: "Biológicos (cultivos y biorreactores)" };
const BIO_STATE: Readonly<Record<string, string>> = { parado: "Parado", "en-marcha": "En marcha", desajustado: "Desajustado" };
const pct = (v: number) => `${Math.round(v * 100)} %`;
const gN = (kg = 0) => `${(Math.round(kg * 1e5) / 100).toLocaleString("es-ES")} g N`;
const perDayQty = (kgPerHour: number) => {
  const d = kgPerHour * 24;
  return d >= 1 ? `${fmtKg(d)} kg` : `${fmtKg(d * 1000)} g`;
};
const gaugeQty = (r: GaugeRow, v: number) => (r.unit === "kcal/día" ? `${Math.round(v).toLocaleString("es-ES")} kcal` : r.unit === "kg N/día" ? `${fmtKg(v * 1000)} g N` : `${fmtKg(v)} kg`);

const text = (title: string, mode: ChoreMode): SessionText => ({
  title,
  progress: "Pasos",
  lives: "Intentos",
  order: mode === "refinar" ? "Ordena el proceso" : mode === "repostar" ? "Ordena el repostaje" : mode === "importar" ? "Ordena el viaje" : mode === "ajustar" ? "Ordena la ronda" : "Ordena la fabricación",
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
  /** Which kind of blueprint the Planos tab shows. */
  planKind: BlueprintKind = "componente";
  active = false;
  /** The chore open in the sheet, if any (exposed for automated checks). */
  session: StationSession | null = null;
  private key = "";
  private refreshAt = 0;
  private toastUntil = 0;
  private drag: { id: number; x: number; moved: boolean } | null = null;
  onExit?: () => void;
  /** Open the ship bay (from the hangar tab); set by main. */
  onBay?: () => void;

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
    /** Orders to the Sanctuary and the station's own import sources (tab «Importar»). */
    readonly imports?: ImportOps,
    /** The living machines and the self-sufficiency gauge (Vida). */
    readonly bio?: BioOps,
    /** The mothership's larder, when she is berthed here (food from the crops goes there). */
    private readonly larder: () => Larder | undefined = () => undefined,
  ) {
    this.view = new StationScene(ship.design);
    this.ui = document.createElement("div");
    this.ui.className = "st-ui hidden";
    this.ui.innerHTML = `<div class="st-head"><b>${esc(ops.station.site.name)}</b><span class="st-sub"></span></div><button class="bay-back st-back">Volver</button>
      <div class="st-panel"><div class="st-tabs${bio ? " six" : ""}" role="tablist">${TABS.filter(([id]) => id !== "vida" || bio).map(([id, label]) => `<button role="tab" data-tab="${id}">${label}</button>`).join("")}</div><div class="st-body"></div></div><div class="bay-toast st-toast"></div>`;
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
    const html = this.tab === "materiales" ? this.materials() : this.tab === "planos" ? this.plans() : this.tab === "fabricacion" ? this.queue() : this.tab === "importar" ? this.importTab() : this.tab === "vida" ? this.life() : this.hangar();
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
    const groups = (["bruto", "refinado", "importado", "biologico"] as const)
      .map((stage) => {
        const rows = MATERIALS.filter((m) => m.stage === stage && !m.propellant)
          .map((m) => ({ m, n: st.stock.amount(m.id) }))
          .filter((r) => r.n > 0.005 || stage !== "bruto");
        if (!rows.length || (stage === "biologico" && rows.every((r) => r.n <= 0.005))) return "";
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
      .map(({ process: p, scale, canRun, locked }) => {
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
          ${locked ? `<div class="st-lock">${esc(locked)}</div>` : ""}
          ${canRun ? `<div class="st-io">${ins} → ${outs}${k < 1 ? ` (lote al ${Math.round(k * 100)} %)` : ""}</div>` : `<div class="st-io miss">${machine === "planta" ? "Faltan materiales" : "Falta roca"}: ${Object.entries(p.inputs).map(([id, n]) => `${qty(id, n)} ${esc(materialName(id).toLowerCase())}`).join(" + ")} por lote</div>`}
          <button class="st-btn" data-refine="${esc(p.id)}" ${canRun ? "" : "disabled"}>${locked ? "Bloqueado" : machine === "planta" ? "Producir" : "Refinar"}</button></div>`;
      })
      .join("");
    return `${this.refuelCards()}${this.storeCard()}${hold}${groups}<div class="bay-sec">Refinería · cada lote es una cadena de retos</div>${cards("refineria")}
      <div class="bay-sec" id="st-propelente">Planta de propelente</div>
      <p class="st-dim">Del agua salen hidrógeno y oxígeno; del nitrógeno de la roca, amoníaco, hidracina y NTO. El nitrógeno es escaso: una bodega de Bennu trae poco más de 1 kg. El MMH, el LMP-103S, el helio y el xenón no se pueden hacer aquí y llegan importados.</p>
      ${cards("planta")}<div class="bay-sec">Depósitos de propelente</div>${tanks}`;
  }

  /** The store's capacity, used and total, and «Almacén lleno» (HC-02 in docs/qa). */
  private storeCard(): string {
    const stock = this.ops.station.stock;
    const cap = stock.capacityKg;
    if (!Number.isFinite(cap)) return "";
    const used = stock.usedKg;
    const t = (kg: number) => `${(kg / 1000).toFixed(1).replace(".", ",")} t`;
    const share = Math.min(1, used / Math.max(1, cap));
    return `<div class="st-card st-store"><div class="st-row"><b>Almacén</b><span>${t(used)} de ${t(cap)}</span></div>
      <div class="bay-bar"><span>${Math.round(share * 100)} %</span><i style="width:${Math.round(share * 100)}%"></i></div>
      ${stock.full ? `<div class="st-lock">Almacén lleno: la extracción, los paquetes y los lotes esperan. Refina o gasta material, o monta otro módulo</div>` : ""}
      ${this.reservedLine()}
      <small>Cada módulo trae bastidores de almacén del tamaño de un ISPR de la ISS (700 kg y 1,571 m³ cada uno); el hangar guarda roca a granel</small></div>`;
  }

  /** What the store keeps for propellant (HC-04), one short line. */
  private reservedLine(): string {
    const r = this.ops.station.stock.reservations();
    if (!r.length) return "";
    return `<small class="st-reserve">Reservado para propelente: ${r.map((x) => `${esc(materialName(x.material).toLowerCase())} ${qty(x.material, x.kg)}`).join(", ")} (la planta tiene prioridad; el abono usa lo que sobra)</small>`;
  }

  /** «Repostar»: one card per craft docked at the station, at the top of Materiales. */
  private refuelCards(): string {
    if (!this.refuel) return "";
    const docked = this.refuel.all().filter((s) => s.docked);
    if (!docked.length) return `<div class="bay-sec" id="st-repostar">Repostar</div><p class="st-dim">Para repostar, acopla el módulo de aterrizaje o atraca la nodriza en un puerto de la estación.</p>`;
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

  /** Planos: grouped by kind (modules, equipment, components), each locked one saying what unlocks it. */
  private plans(): string {
    const all = this.ops.plans();
    const o = this.ops.station.outfit;
    const plans = all.filter((p) => p.kind === this.planKind);
    const seg = `<div class="st-seg" role="tablist">${PLAN_KINDS.map(([k, label]) => {
      const n = all.filter((p) => p.kind === k && p.canBuild).length;
      return `<button role="tab" data-plan-kind="${k}" class="${k === this.planKind ? "on" : ""}">${label}${n ? ` <i>${n}</i>` : ""}</button>`;
    }).join("")}</div>`;
    const free = o ? o.capacityKw - o.drawKw : 0;
    const summary = o
      ? `<div class="st-power"><span>Energía <b>${kw(o.drawKw)}</b> de ${kw(o.capacityKw)}</span><span>Puertos libres <b>${o.berths.filter((b) => !o.usedBerths().has(b.id)).length}</b></span><span>Bastidores libres <b>${o.modules.reduce((n, m) => n + o.freeRacks(m.id), 0)}</b></span><i style="width:${Math.round(Math.min(1, o.drawKw / Math.max(1e-9, o.capacityKw)) * 100)}%" class="${free < 0.1 * o.capacityKw ? "low" : ""}"></i></div>`
      : "";
    const intro: Readonly<Record<BlueprintKind, string>> = {
      modulo: "Módulos nuevos: se atracan en un puerto libre y la estación crece.",
      equipo: "Máquinas para los bastidores de los módulos: cada una desbloquea componentes nuevos. Las mejoras sustituyen a la máquina que mejoran.",
      componente: "Piezas para el módulo de aterrizaje, la nodriza y la estación. Cada una necesita su máquina.",
    };
    const card = (p: (typeof plans)[number]) => {
      const bp = p.blueprint;
      const pr = bp.product;
      const extra: string[] = [];
      if (pr.kind === "module") {
        const m = pr.module;
        extra.push(m.kind === "hangar" ? `+${fmtKg(m.hangarExtraM ?? 0)} m de hangar` : `${fmtKg(m.lengthM)} × ${fmtKg(m.diameterM)} m · ${2 * m.racksPerSide} bastidores${m.endPort ? " · puerto en el extremo" : ""}`, `${kw(m.powerKw)}`);
      } else if (pr.kind === "equipment") {
        const e = pr.equipment;
        extra.push(`${e.racks} ${e.racks === 1 ? "bastidor" : "bastidores"} en un ${e.fitsIn.map((k) => MODULE_KIND_NAME[k]).join(" o ")}`, kw(e.powerKw));
        if (e.upgrades) extra.push(`sustituye a ${esc(equipmentById(e.upgrades)?.name ?? e.upgrades)}`);
        if (e.rate && e.rate > 1) extra.push(`${e.rate} veces más rápida`);
      } else if (pr.kind === "part" && stationComponentById(pr.partId)) extra.push("para la estación: se monta en la bahía, pestaña Estación");
      const need =
        (bp.requires ? `<span class="st-chip ${o && !o.has(bp.requires) ? "miss" : "ok"}">Necesita ${esc(o?.name(bp.requires) ?? bp.requires)}</span>` : "") +
        (bp.requiresModule ? `<span class="st-chip ${o && !o.hasModule(bp.requiresModule) ? "miss" : "ok"}">Necesita el módulo agrícola</span>` : "");
      const verb = pr.kind === "module" ? "Construir" : pr.kind === "equipment" ? "Montar" : "Fabricar";
      const btn = p.built ? `<span class="st-have">Ya está en la estación</span>` : `<button class="st-btn" data-build="${esc(bp.id)}" ${p.canBuild ? "" : "disabled"}>${p.canBuild ? verb : p.locked ? "Bloqueado" : "Faltan materiales"}</button>`;
      return `<div class="st-card ${p.canBuild ? "" : "locked"}${p.built ? " built" : ""}"><div class="st-row"><b>${esc(bp.name)}</b><span>${fmtKg(bp.massKg)} kg · ${hrs(bp.hours)}</span></div>
        ${extra.length ? `<div class="st-io">${extra.join(" · ")}</div>` : ""}
        ${p.locked && !p.built ? `<div class="st-lock">${esc(p.locked)}</div>` : ""}
        <small>${esc(MACHINE[bp.machine])} · ${esc(bp.process.value)} · <a href="${esc(bp.process.source)}" target="_blank" rel="noopener">fuente</a></small>
        <div class="st-chips">${need}${p.built ? "" : this.chips(bp.inputs, p.missing)}</div>
        <div class="st-row">${p.inHangar ? `<span class="st-have">${p.inHangar} en el hangar</span>` : "<span></span>"}${btn}</div></div>`;
    };
    const ready = plans.filter((p) => p.canBuild);
    const short = plans.filter((p) => !p.canBuild && !p.locked && !p.built);
    const locked = plans.filter((p) => p.locked && !p.built);
    const built = plans.filter((p) => p.built);
    const sec = (title: string, list: typeof plans, cls = "") => (list.length ? `<div class="bay-sec ${cls}">${title}</div>${list.map(card).join("")}` : "");
    return `${seg}${summary}<p class="st-dim">${intro[this.planKind]} ${ready.length} de ${plans.length} se pueden hacer ya.</p>
      ${sec("Se pueden hacer", ready, "ok")}${sec("Faltan materiales", short)}${sec("Bloqueados · primero hay que construir lo que piden", locked)}${sec("Ya en la estación", built)}`;
  }

  private queue(): string {
    const st = this.ops.station;
    const o = st.outfit;
    // Machines that do not exist yet (no equipment, nothing queued) stay out of the list.
    const shown = (m: MachineId) => !o || st.queue(m).length > 0 || ["fundicion", "repostaje", "refineria", "impresora", "planta"].includes(m) || o.equipment.some((e) => e.spec.machine === m);
    return (Object.keys(MACHINE) as MachineId[])
      .filter(shown)
      .map((m) => {
        const jobs = st.queue(m);
        const rows = jobs
          .map((j, i) => {
            const done = 1 - j.hoursLeft / Math.max(1e-9, j.hoursTotal);
            if (i === 0 && j.hoursLeft <= 1e-9) return `<div class="st-job run"><div class="st-row"><b>${esc(j.label)}</b><span>hecho</span></div><div class="st-lock">Almacén lleno: el lote espera en la máquina</div></div>`;
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
        return `<div class="st-mat"><b>${esc(c.name)}</b><span>${c.kind === "nave" ? "nave nodriza" : c.kind === "remolcador" ? "remolcador" : c.kind === "lanzador" ? "lanzador de masas" : c.id === "explorador" ? "módulo de aterrizaje" : "sonda"}</span><small>${esc(where)}${c.massKg ? ` · ${fmtKg(c.massKg)} kg` : ""}</small></div>`;
      })
      .join("");
    const parts = h.partList();
    const partRows = parts
      .map(([id, n]) => {
        const p = partById(id);
        const drive = electricThrusterById(id);
        const sc = stationComponentById(id);
        return `<div class="st-mat"><b>${esc(p ? short(p.name) : drive ? `Propulsor ${drive.shortName}` : sc ? sc.name : id)}</b><span>× ${n}</span><small>${drive ? "Se monta en la bahía, pestaña Nodriza, con la nodriza atracada aquí" : sc ? "Se monta en la bahía, pestaña Estación" : "Se monta en la bahía de la nave"}</small></div>`;
      })
      .join("");
    const bay = this.onBay ? `<button class="st-btn" data-bay>Abrir la bahía de la nave</button>` : "";
    return `${bay}<div class="bay-sec">Naves y sondas</div>${crafts}
      <div class="bay-sec">Piezas de repuesto</div>${partRows || `<p class="st-dim">No hay piezas. Fabrícalas en Planos; al cambiar una pieza en la bahía, la vieja vuelve aquí.</p>`}`;
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (t.closest("a") || this.duel.visible) return;
    if (t.closest("[data-unload]")) return this.unload();
    if (t.closest("[data-bay]")) return this.onBay?.();
    const r = t.closest<HTMLElement>("[data-refine]");
    if (r) return this.start(this.ops.startRefining(r.dataset.refine!), "refinar");
    const k = t.closest<HTMLElement>("[data-plan-kind]");
    if (k) {
      this.planKind = k.dataset.planKind as BlueprintKind;
      this.key = "";
      this.render();
      this.panel.scrollTop = 0;
      return;
    }
    const b = t.closest<HTMLElement>("[data-build]");
    if (b) return this.start(this.ops.startFabrication(b.dataset.build!), "fabricar");
    const tune = t.closest<HTMLElement>("[data-tune]");
    if (tune && this.bio) return this.start(this.bio.startTuning(tune.dataset.tune!), "ajustar");
    if (t.closest("[data-larder]")) return this.shipFood();
    if (t.closest("[data-ammonia]") && this.bio) {
      this.bio.ammoniaFertiliser = !this.bio.ammoniaFertiliser;
      this.key = "";
      return this.render();
    }
    const f = t.closest<HTMLElement>("[data-refuel]");
    if (f && this.refuel) return this.start(this.refuel.startRefuel(f.dataset.refuel!), "repostar");
    if (this.imports) this.onImportClick(t);
  }

  // --- Importar --------------------------------------------------------------

  /** The order being put together in the Importar tab: units per material. */
  order: Record<string, number> = {};
  launcherId = "falcon-heavy";
  /** Body and boulder size picked for the tug, and the body picked for a mass driver. */
  towBody = "";
  towDiameterM = 1;
  driverBody = "";

  private onImportClick(t: HTMLElement): void {
    const im = this.imports!;
    const rerender = () => {
      this.key = "";
      this.render();
    };
    const plus = t.closest<HTMLElement>("[data-good-plus]");
    const minus = t.closest<HTMLElement>("[data-good-minus]");
    if (plus || minus) {
      const id = (plus ?? minus)!.dataset[plus ? "goodPlus" : "goodMinus"]!;
      const g = IMPORT_GOODS.find((x) => x.id === id)!;
      this.order[id] = Math.max(0, (this.order[id] ?? 0) + (plus ? g.step : -g.step));
      return rerender();
    }
    const l = t.closest<HTMLElement>("[data-launcher]");
    if (l) {
      this.launcherId = l.dataset.launcher!;
      return rerender();
    }
    if (t.closest("[data-order]")) {
      const goods = Object.fromEntries(Object.entries(this.order).filter(([, n]) => n > 0));
      return this.start(im.startOrder(goods, this.launcherId, this.orderLabel(goods)), "importar");
    }
    const tb = t.closest<HTMLElement>("[data-tow-body]");
    if (tb) {
      this.towBody = tb.dataset.towBody!;
      return rerender();
    }
    const td = t.closest<HTMLElement>("[data-tow-d]");
    if (td) {
      this.towDiameterM = Number(td.dataset.towD);
      return rerender();
    }
    if (t.closest("[data-tow]")) return this.start(im.startTow(this.towBody, this.towDiameterM), "importar");
    const db = t.closest<HTMLElement>("[data-driver-body]");
    if (db) {
      this.driverBody = db.dataset.driverBody!;
      return rerender();
    }
    if (t.closest("[data-install]")) return this.start(im.startInstall(this.driverBody), "importar");
  }

  private orderLabel(goods: Amounts): string {
    return Object.entries(goods)
      .map(([id, n]) => `${qty(id, n)} de ${materialName(id).toLowerCase()}`)
      .join(", ");
  }

  private importTab(): string {
    const im = this.imports;
    if (!im) return `<p class="st-dim">Sin radio con el Santuario.</p>`;
    const es = (v: number, d = 0) => v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
    const src = (u: string, label = "fuente") => (u.startsWith("http") ? ` · <a href="${esc(u)}" target="_blank" rel="noopener">${label}</a>` : "");
    const w = im.wallet;
    const last = w.history.slice(-3).reverse();
    const wallet = `<div class="st-card"><div class="st-row"><b>Créditos</b><span class="im-credits">${es(w.balance)}</span></div>
      <small>Nevaeh paga cada misión. 1 crédito = ${es(USD_PER_CREDIT)} US$ (valor de juego).</small>
      ${last.length ? `<div class="st-chips">${last.map((m) => `<span class="st-chip ${m.credits >= 0 ? "ok" : "miss"}">${m.credits >= 0 ? "+" : ""}${es(m.credits)} · ${esc(m.why)}</span>`).join("")}</div>` : ""}</div>`;

    const goods = Object.fromEntries(Object.entries(this.order).filter(([, n]) => n > 0));
    const seg = `<div class="st-seg im-seg" role="tablist">${LAUNCHERS.map((l) => `<button role="tab" data-launcher="${l.id}" class="${l.id === this.launcherId ? "on" : ""}">${esc(l.name.replace(" (objetivo)", "*"))}</button>`).join("")}</div>`;
    const rows = IMPORT_GOODS.map((g) => {
      const n = this.order[g.id] ?? 0;
      return `<div class="im-good"><span><b>${esc(materialName(g.id))}</b><small>${g.id === "kit" ? `${g.kgPerUnit} kg cada uno · ` : ""}en almacén ${qty(g.id, this.ops.station.stock.amount(g.id))}</small></span>
        <button class="im-step" data-good-minus="${g.id}" aria-label="Menos" ${n ? "" : "disabled"}>−</button><b class="im-n">${qty(g.id, n)}</b><button class="im-step" data-good-plus="${g.id}" aria-label="Más">+</button></div>`;
    }).join("");
    const l = LAUNCHERS.find((x) => x.id === this.launcherId)!;
    const q = im.quote(Object.keys(goods).length ? goods : { kit: 1 }, this.launcherId);
    const empty = !Object.keys(goods).length;
    const why = empty ? "Añade algo al pedido" : im.orderBlocker(goods, this.launcherId);
    const au = this.ops.station && q.transfer;
    const breakdown = `<div class="st-card im-quote"><div class="st-row"><b>${empty ? "Ejemplo: 1 kit" : "Tu pedido"}</b><span>${es(q.massKg, 1)} kg</span></div>
      <div class="im-line"><span>Δv desde la órbita baja</span><b>${es(au.departMs / 1000, 2)} + ${es(au.arriveMs / 1000, 2)} km/s</b></div>
      <small>Hohmann de la Tierra (1 UA) a la región: encendido de salida en LEO y de llegada para igualar la órbita${src(IMPORT_SRC.hohmann)}${src(IMPORT_SRC.oberth, "Oberth")}</small>
      <div class="im-line"><span>Ecuación del cohete</span><b>× ${es(q.leoKgPerKg, 1)} kg en LEO por kg</b></div>
      <small>Dos etapas que se sueltan al vaciarse, Isp ${TRANSFER_STAGE.ispS.value} s (Raptor Vacuum) y tanques del ${es(TRANSFER_STAGE.tankage.value * 100)} % (valor de juego)${src(IMPORT_SRC.rocketEquation)}${src(TRANSFER_STAGE.ispS.source, "Raptor")}</small>
      <div class="im-line"><span>Lanzamiento a LEO</span><b>${es(q.leoKg)} kg × ${es(q.usdPerKgLeo)} US$/kg</b></div>
      <small>${esc(l.usdPerKg.note ?? "")}${src(l.usdPerKg.source)}</small>
      <div class="im-line total"><span>Coste</span><b>${es(q.credits)} créditos</b></div>
      <div class="im-line"><span>Viaje</span><b>${es(q.transitDays)} días → ${hrs(q.gameHours)} de estación</b></div>
      <small>Un día real de transferencia es una hora del reloj de la estación (valor de juego).</small>
      <button class="st-btn" data-order ${why ? "disabled" : ""}>${why ? esc(why) : "Pedir por radio a Nevaeh"}</button></div>`;

    const pending = im.deliveries.pending
      .map((d) => {
        const done = 1 - d.hoursLeft / Math.max(1e-9, d.hoursTotal);
        const from = d.source === "santuario" ? "Santuario" : d.source === "remolcador" ? "Remolcador" : "Lanzador";
        if (d.waiting) return `<div class="st-job run"><div class="st-row"><b>${esc(d.label)}</b><span>${from} · en el buzón</span></div><div class="st-lock">Almacén lleno: espera a que haya sitio</div></div>`;
        return `<div class="st-job run"><div class="st-row"><b>${esc(d.label)}</b><span>${from} · quedan ${hrs(d.hoursLeft)}</span></div><div class="bay-bar"><span>${Math.round(done * 100)} %</span><i style="width:${Math.round(done * 100)}%"></i></div></div>`;
      })
      .slice(0, 8)
      .join("");

    const sources = im.sources();
    const pick = (attr: string, sel: string) =>
      `<div class="st-chips">${sources.map((b) => `<button class="st-chip im-pick ${b.id === sel ? "on" : ""}" data-${attr}="${esc(b.id)}">${esc(b.name)}${b.comet ? " ☄" : ""}</button>`).join("")}</div>`;
    if (!sources.some((b) => b.id === this.towBody)) this.towBody = sources[0]?.id ?? "";
    if (!sources.some((b) => b.id === this.driverBody)) this.driverBody = sources[0]?.id ?? "";
    const noSources = `<p class="st-dim">No hay cuerpos catalogados a mano.</p>`;
    let tug: string;
    if (im.tow) {
      const t = im.tow;
      tug = `<div class="st-io">Fuera: trae una roca de ${es(t.plan.boulderKg)} kg de ${esc(t.bodyName)} · quedan ${hrs(t.delivery.hoursLeft)}</div>`;
    } else if (!im.tug) tug = `<p class="st-dim">Construye el remolcador en Planos → Componentes (necesita la impresora de metal grande).</p>`;
    else if (!sources.length) tug = noSources;
    else {
      const p = im.towPlan(this.towBody, this.towDiameterM);
      const block = im.towBlocker(this.towBody, this.towDiameterM);
      const dseg = `<div class="st-seg im-seg">${TOW_DIAMETERS_M.map((d) => `<button data-tow-d="${d}" class="${d === this.towDiameterM ? "on" : ""}">Roca de ${String(d).replace(".", ",")} m</button>`).join("")}</div>`;
      tug = `${pick("tow-body", this.towBody)}${dseg}
        <div class="im-line"><span>Roca</span><b>${es(p.boulderKg)} kg</b></div>
        <div class="im-line"><span>Empuje</span><b>${es(p.thrustN, 2)} N</b></div>
        <div class="im-line"><span>Ida · captura · vuelta</span><b>${hrs(p.out.hours)} · ${hrs(p.captureHours)} · ${hrs(p.back.hours)}</b></div>
        <div class="im-line"><span>Xenón</span><b>${es(p.xenonKg, 2)} kg</b></div>
        <button class="st-btn" data-tow ${block ? "disabled" : ""}>${block ? esc(block) : "Remolcar"}</button>`;
    }
    const installed = im.drivers
      .map((d) => `<div class="st-job run"><div class="st-row"><b>${esc(d.bodyName)}</b><span>${d.launched} paquetes</span></div><div class="bay-bar"><span>llenando el cubo</span><i style="width:${Math.round(d.progress * 100)}%"></i></div></div>`)
      .join("");
    let driver = installed;
    if (im.driverCraft) {
      if (!sources.length) driver += noSources;
      else {
        const block = im.installBlocker(this.driverBody);
        driver += `${pick("driver-body", this.driverBody)}<button class="st-btn" data-install ${block ? "disabled" : ""}>${block ? esc(block) : "Montar el lanzador"}</button>`;
      }
    } else if (!im.drivers.length) driver += `<p class="st-dim">Construye un lanzador de masas en Planos → Componentes (necesita la soldadora por haz de electrones).</p>`;
    return `${wallet}
      <div class="bay-sec">Pedir al Santuario por radio</div>
      <p class="st-dim">Nevaeh lo lanza desde la Tierra. Casi todo lo que se paga es propelente: cada kilo necesita muchos en la órbita baja.</p>
      ${seg}${rows}${breakdown}
      ${pending ? `<div class="bay-sec">En camino</div>${pending}` : ""}
      <div class="bay-sec">Fuentes propias</div>
      <p class="st-dim">Funcionan con cualquier asteroide o cometa, sin subyugarlo: lentas y modestas, pero no cuestan créditos.</p>
      <div class="st-card"><div class="st-row"><b>Remolcador SEP</b><span>40 kW · Isp 3 000 s</span></div>
        <small>Como el estudio de Keck de 2012 (roca de ~7 m y ~500 t en 6–10 años) y la opción B de ARM (una roca de hasta 4 m)${src(IMPORT_SRC.keck, "Keck")}${src(IMPORT_SRC.arm, "ARM")}</small>${tug}</div>
      <div class="st-card"><div class="st-row"><b>Lanzador de masas</b><span>112 m/s · 10,5 kg</span></div>
        <small>Como el Mass Driver Two de O'Neill (5 000 m/s²) y los cubos de 10,5 kg de su lanzador lunar; un paquete cada 8 h (valor de juego)${src(IMPORT_SRC.massDriver)}${src(IMPORT_SRC.massDriverAmes, "Ames 1977")}</small>${driver}</div>
      <p class="st-dim">Los cometas traen hielo de agua y de CO₂; el CO y otros volátiles se evaporan antes de poder guardarlos${src(COMET_SRC.gasProduction)}.</p>`;
  }

  /** Vida: the self-sufficiency gauge, the larder, nitrogen and each living machine. */
  private life(): string {
    const bio = this.bio;
    if (!bio) return "";
    const rows = bio.gauge();
    const all = overallSelfSufficiency(rows);
    const gauge = rows
      .map((r) => {
        const low = r.share < 0.5;
        const imp = r.imported > 1e-6 ? ` · <em>${gaugeQty(r, r.imported)} ${esc(r.rest)}</em>` : "";
        return `<div class="lf-row"><div class="st-row"><b>${esc(r.label)}</b><span>${pct(r.share)} local</span></div>
          <div class="bay-bar ${low ? "low" : ""}"><span>${gaugeQty(r, r.local)} de ${gaugeQty(r, r.need)}${r.unit === "kg" ? "" : " al día"}</span><i style="width:${Math.round(r.share * 100)}%"></i></div>
          <small>${esc(r.note)}${imp}</small></div>`;
      })
      .join("");
    const larder = this.larder();
    const food = bio.forLarder();
    const foodCard = `<div class="st-card"><div class="st-row"><b>Despensa de la nodriza</b><span>${larder ? "atracada" : "no atracada"}</span></div>
      ${food.length ? `<div class="st-chips">${food.map((f) => `<span class="st-chip ok">${f.units.toLocaleString("es-ES")} ${esc(f.unit.label)}</span>`).join("")}</div>` : `<small>Aún no hay cosecha en el almacén.</small>`}
      <button class="st-btn" data-larder ${larder && food.length ? "" : "disabled"}>${larder ? "Enviar a la despensa" : "Atraca la nodriza para enviarla"}</button></div>`;
    const n = rows.find((r) => r.id === "nitrogeno")!;
    const nh3 = this.ops.station.stock.amount("amoniaco");
    const nitrogen = `<div class="st-card"><div class="st-row"><b>Nitrógeno: el bucle no lo cierra</b><span>${pct(n.share)} local</span></div>
      <small>El bucle solo devuelve el nitrógeno que traen los residuos (${gN(bio.lab.process("bucle")?.outputs.fertilizante)} por hora) y los campos comen ${gN(bio.lab.process("cultivo")?.inputs.fertilizante)} por hora: el resto llega como fertilizante importado (${fmtKg(this.ops.station.stock.amount("fertilizante"))} kg N en el almacén). El amoníaco de los cometas (pestaña Importar) o el de la planta de propelente lo cubre: cada 17 kg de amoníaco llevan 14 kg de nitrógeno.${bio.iceCo2KgPerDay > 0 ? ` El hielo de CO₂ de cometa da a los campos ${fmtKg(bio.iceCo2KgPerDay)} kg de CO₂ al día.` : ""}</small>
      <div class="st-row"><span>Amoníaco en el almacén: ${fmtKg(nh3)} kg${this.ops.station.stock.reservedKg("amoniaco") > 0 ? ` · ${fmtKg(this.ops.station.stock.reservedKg("amoniaco"))} kg reservados para propelente: el abono usa ${fmtKg(bio.ammoniaForFertiliser)} kg` : ""}</span><button class="st-btn lf-toggle ${bio.ammoniaFertiliser ? "on" : ""}" data-ammonia>${bio.ammoniaFertiliser ? "Abonando con amoníaco" : "Abonar con amoníaco"}</button></div></div>`;
    const cards = bio.status().map((s) => this.bioCard(s)).join("");
    return `<div class="lf-head"><div class="lf-big"><div class="lf-pct">${pct(all)}</div><div class="lf-cap">autosuficiente</div></div><small>Media de oxígeno, comida, agua y resina hechos aquí. Cada fila: lo local frente a lo que se necesita.</small></div>
      <div class="bay-sec">Autosuficiencia · al ritmo de ahora</div><div class="st-card lf-gauge">${gauge}</div>
      ${foodCard}${nitrogen}<div class="bay-sec">Máquinas vivas · cada ajuste es una cadena de retos</div>${cards}`;
  }

  private bioCard(s: BioStatus): string {
    const p = s.process;
    const flow = (a: Readonly<Record<string, number>>) =>
      Object.entries(a)
        .map(([id, n]) => `${perDayQty(n)} ${esc(materialName(id).toLowerCase())}`)
        .join(" + ");
    const state = s.installed ? BIO_STATE[s.state]! : "Sin montar";
    const left = s.state === "en-marcha" ? `<div class="bay-bar"><span>ajustado: quedan ${hrs(s.hoursLeft)}</span><i style="width:${Math.round((s.hoursLeft / 240) * 100)}%"></i></div>` : "";
    const speed = s.installed && s.state !== "parado" ? `<div class="st-io ${s.run.short ? "miss" : ""}">Rinde al ${pct(s.run.k)}${s.run.short ? ` · le falta ${esc(materialName(s.run.short).toLowerCase())}` : ""} · ${kw(s.powerKw)}</div>` : "";
    const why = this.bio?.tuneBlocker(p.id);
    const verb = s.state === "parado" ? "Poner en marcha" : "Ajustar";
    return `<div class="st-card lf-bio ${s.installed ? "" : "locked"}"><div class="st-row"><b>${esc(p.name)}</b><span class="lf-state ${s.installed ? s.state : "off"}">${state}</span></div>
      <small>${esc(p.organism)}</small>
      <div class="st-io">Al día: ${flow(p.inputs)} → ${flow(p.outputs)}</div>${left}${speed}
      <small>${esc(p.basis.value)}${p.basis.note ? ` · ${esc(p.basis.note)}` : ""} · <a href="${esc(p.basis.source)}" target="_blank" rel="noopener">fuente</a></small>
      ${why ? `<div class="st-lock">${esc(why)}</div>` : `<button class="st-btn" data-tune="${esc(p.id)}">${verb}</button>`}</div>`;
  }

  /** Crops to the mothership's larder. */
  private shipFood(): void {
    const larder = this.larder();
    if (!this.bio || !larder) return;
    const sent = this.bio.shipToLarder(larder);
    this.say(sent.length ? `A la despensa: ${sent.map((x) => `${x.units.toLocaleString("es-ES")} ${x.unit.label}`).join(", ")}` : "No hay nada que enviar");
    this.key = "";
    this.render();
  }

  unload(): void {
    const { stored, ignored, left } = this.ops.station.unload(this.expedition.unloadCargo(), cargoMaterial);
    // What does not fit stays in the lander's hold (HC-02).
    this.expedition.cargo.push(...left);
    const kg = Object.values(stored).reduce((s, n) => s + n, 0);
    this.say(`${fmtKg(kg)} kg descargados${left.length ? " · Almacén lleno: el resto sigue en la bodega" : ""}${ignored.length ? ` · sin uso: ${ignored.join(", ")}` : ""}`);
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
        if (mode === "ajustar") {
          this.say("Ajustado: rinde al 100 % durante 240 h");
          this.show("vida");
        } else if (session.refused) {
          this.say(session.refused);
          this.show(mode === "importar" ? "importar" : "fabricacion");
        } else if (mode === "importar") {
          this.say("Hecho: mira «En camino»");
          this.show("importar");
        } else {
          this.say(mode === "refinar" ? "Lote en marcha: mira Fabricación" : mode === "repostar" ? "Trasvasando propelente: mira Fabricación" : "En marcha: mira Fabricación");
          this.show("fabricacion");
        }
      } else if (run.status === "failed") this.say(mode === "ajustar" ? "No salió: sigue como estaba" : mode === "importar" ? "No salió: inténtalo otra vez" : mode === "repostar" ? "No salió: el propelente sigue en el almacén" : "No salió: los materiales siguen en el almacén");
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

  /** A short note on the screen's toast (an import arrived…). */
  notice(msg: string): void {
    if (this.active) this.say(msg);
  }

  private say(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + 3000;
  }
}
