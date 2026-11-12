import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import type { Mailbox } from "@modules/story/domain/mailbox";
import type { Navigator } from "@modules/navigation/application/navigator";
import { duration, num } from "@modules/navigation/application/trip-chore";
import {
  alerts,
  commsPanel,
  dockingPanel,
  lifePanel,
  missionsSummary,
  navPanel,
  panelLevel,
  powerPanel,
  propulsionPanel,
  type Alert,
  type CommsPanel,
  type DockingPanel,
  type DockingView,
  type HabitatView,
  type LifePanel,
  type NavPanel,
  type PanelId,
  type PowerPanel,
  type ProbeView,
  type PropulsionPanel,
} from "@modules/flight-deck/application/panels";
import type { MissionLog } from "@modules/missions/domain/mission";
import type { NavMap } from "./ui/nav-map";
import "./ui/flight-deck.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pct = (f: number) => `${num(f * 100)} %`;
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);
const bar = (f: number, cls = "") => `<div class="fd-bar ${cls}"><i style="width:${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%"></i></div>`;
/** Narrow or short screens: the deck becomes a grid of tiles and one panel at a time goes full screen. */
const COMPACT = "(max-width: 760px), (max-height: 520px)";

const PANELS: readonly [PanelId, string, string][] = [
  ["nav", "Navegación", "NAV"],
  ["prop", "Propulsión", "PROP"],
  ["power", "Energía y calor", "EPS/TCS"],
  ["life", "Vida y hábitat", "ECLSS"],
  ["dock", "Acople", "DOCK"],
  ["comms", "Radio y misiones", "COMM"],
];
const TRIP: Record<string, string> = {
  idle: "Sin viaje programado",
  programming: "Programando el viaje",
  carrier: "La nodriza viaja",
  autopilot: "La sonda sigue sola",
  arrived: "Llegada",
  manual: "Mando manual",
  failed: "El plan no compila",
};
const PHASE: Record<string, string> = { burn: "acelerando", flip: "dando la vuelta", brake: "frenando", coast: "crucero", orient: "orientando", aim: "apuntando", arrived: "llegada" };
const LEVEL: Record<string, string> = { warning: "Aviso", caution: "Precaución", advisory: "Nota" };

export interface FlightDeckDeps {
  readonly mothership: Mothership;
  readonly ring: SpinRing;
  readonly habitat: HabitatView & { readonly mailbox?: Mailbox };
  readonly docking: DockingView;
  readonly nav: Navigator;
  readonly map: NavMap;
  /** Distance from the probe to the mothership's port, m. */
  probeRangeM(): number;
  probe(): ProbeView;
  /** Nevaeh's missions (modules/missions) and the shared mission log overlay that opens them. */
  readonly missions?: MissionLog;
  openMissions?(): void;
}

interface Views {
  nav: NavPanel;
  prop: PropulsionPanel;
  power: PowerPanel;
  life: LifePanel;
  dock: DockingPanel;
  comms: CommsPanel;
  alerts: Alert[];
}

/**
 * The mothership's flight deck (docs/design/cabina-nodriza.md): a forward window on the 3D scene, a
 * status bar always on top and six display pages (navigation, propulsion, power/thermal, life,
 * docking, radio) fed by the flight-deck view-models. Wide screens show all six at once and each
 * one works in place; on a phone they are tiles and a tap opens one full screen. The navigation
 * page is the same NavMap as the cockpit overlay, mounted in the panel.
 */
export class FlightDeck {
  readonly camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 2e6);
  private readonly ui: HTMLElement;
  private readonly status: HTMLElement;
  private readonly bodies = new Map<PanelId, HTMLElement>();
  private readonly sections = new Map<PanelId, HTMLElement>();
  private readonly mapHost: HTMLElement;
  private readonly window: HTMLElement;
  private maxed: PanelId | null = null;
  private letter: string | null = null;
  private refreshAt = 0;
  private html = new Map<string, string>();
  private lastStatus = "";
  active = false;
  /** Where Doménica came from: the hub of the interior or the probe's cockpit. */
  from: "interior" | "cabina" = "interior";
  /** Leave the deck, back to `to`. Set by main. */
  onExit?: (to: "interior" | "cabina", why?: string) => void;

  constructor(
    root: HTMLElement,
    private readonly deps: FlightDeckDeps,
  ) {
    this.ui = document.createElement("div");
    this.ui.className = "fd hidden";
    this.ui.innerHTML = `
      <div class="fd-status"><b class="fd-title">Puente · ${esc(deps.mothership.name)}</b><div class="fd-items"></div><div class="fd-alerts"></div><button class="fd-exit">Volver</button></div>
      <div class="fd-window" aria-hidden="true"><span>Ventana de proa</span></div>
      <div class="fd-console">${PANELS.map(
        ([id, label, code]) => `<section class="fd-panel" data-panel="${id}" style="grid-area:${id}">
          <header><button class="fd-back" data-back aria-label="Volver al puente">‹</button><span class="fd-code">${code}</span><b>${label}</b><button class="fd-max" data-max aria-label="Ampliar ${label}">⤢</button></header>
          <div class="fd-body"></div></section>`,
      ).join("")}</div>`;
    root.appendChild(this.ui);
    this.status = this.ui.querySelector(".fd-status")!;
    this.window = this.ui.querySelector(".fd-window")!;
    for (const [id] of PANELS) {
      const s = this.ui.querySelector<HTMLElement>(`[data-panel="${id}"]`)!;
      this.sections.set(id, s);
      this.bodies.set(id, s.querySelector(".fd-body")!);
    }
    this.mapHost = document.createElement("div");
    this.mapHost.className = "fd-map";
    this.ui.addEventListener("click", (e) => this.onClick(e));
    this.ui.querySelector(".fd-exit")!.addEventListener("click", () => this.leave(this.from));
    // Capture phase: runs before the overlays' own Escape (mission log, challenge sheet) closes them.
    window.addEventListener(
      "keydown",
      (e) => {
        if (!this.active || e.repeat || e.code !== "Escape") return;
        const over = document.body.classList;
        if (over.contains("in-missions") || over.contains("in-duel")) return;
        if (this.maxed) this.restore();
        else this.leave(this.from);
      },
      true,
    );
    matchMedia(COMPACT).addEventListener("change", () => this.active && this.layoutMap());
  }

  private get compact(): boolean {
    return matchMedia(COMPACT).matches;
  }

  enter(from: "interior" | "cabina"): void {
    this.restore();
    this.from = from;
    this.active = true;
    this.letter = null;
    this.html.clear();
    this.lastStatus = this.deps.nav.status;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-deck");
    this.resize();
    this.render();
    this.layoutMap();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.restore();
    this.deps.map.close();
    this.deps.map.mount();
    this.ui.classList.add("hidden");
    document.body.classList.remove("in-deck");
  }

  private leave(to: "interior" | "cabina", why?: string): void {
    this.exit();
    this.onExit?.(to, why);
  }

  /** M or «Mapa» while on the deck: the navigation page full screen, or back to the deck. */
  toggleNav(): void {
    if (this.maxed === "nav") this.restore();
    else this.maximize("nav");
  }

  get maximized(): PanelId | null {
    return this.maxed;
  }

  /** Show one target on the navigation page (the mission log's «Ver en el mapa»). */
  showTarget(targetId: string): void {
    if (this.maxed !== "nav") this.maximize("nav");
    this.deps.map.show(targetId);
  }

  maximize(id: PanelId): void {
    if (this.maxed) this.sections.get(this.maxed)!.classList.remove("max");
    this.maxed = id;
    this.sections.get(id)!.classList.add("max");
    this.ui.classList.add("has-max");
    this.html.clear();
    this.render();
    this.layoutMap();
  }

  restore(): void {
    if (!this.maxed) return;
    this.sections.get(this.maxed)!.classList.remove("max");
    this.ui.classList.remove("has-max");
    this.maxed = null;
    this.letter = null;
    this.html.clear();
    this.render();
    this.layoutMap();
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** The live map sits in the navigation panel whenever that panel is big enough to use it. */
  private layoutMap(): void {
    const map = this.deps.map;
    const show = this.active && (!this.compact || this.maxed === "nav");
    if (show) {
      const body = this.bodies.get("nav")!;
      if (this.mapHost.parentElement !== body) {
        body.innerHTML = "";
        body.appendChild(this.mapHost);
        this.html.delete("nav");
      }
      map.mount(this.mapHost);
      map.open();
    } else {
      map.close();
      map.mount();
      this.mapHost.remove();
      this.html.delete("nav");
    }
    this.render();
  }

  private onClick(e: Event): void {
    const el = e.target as HTMLElement;
    const section = el.closest<HTMLElement>(".fd-panel");
    const id = section?.dataset.panel as PanelId | undefined;
    if (el.closest("[data-back]")) return this.letter ? this.closeLetter() : this.restore();
    if (el.closest("[data-max]") && id) return this.maxed === id ? this.restore() : this.maximize(id);
    if (el.closest("[data-missions]")) return this.deps.openMissions?.();
    const onMap = el.closest<HTMLElement>("[data-showmap]");
    if (onMap) return this.showTarget(onMap.dataset.showmap!);
    const alert = el.closest<HTMLElement>("[data-alert]");
    if (alert) return this.maximize(alert.dataset.alert as PanelId);
    const letter = el.closest<HTMLElement>("[data-letter]");
    if (letter) {
      this.letter = letter.dataset.letter!;
      this.deps.habitat.mailbox?.read(this.letter);
      if (id && this.maxed !== id) return this.maximize(id);
      this.html.clear();
      return this.render();
    }
    // A tap on a tile (phone grid) opens it full screen.
    if (id && !this.maxed && this.compact) this.maximize(id);
  }

  private closeLetter(): void {
    this.letter = null;
    this.html.clear();
    this.render();
  }

  /** Each frame while active. */
  update(_dt: number): void {
    const m = this.deps.mothership;
    // Camera at the forward node, looking out along the bow (−z) like the deck's window.
    const l = m.spec.layout;
    const eye = m.toWorld(new Vec3(0, 1.2, l.nodeZ - l.nodeRadiusM - 1.5));
    // A little above the bow axis, so the docked probe under the node stays at the sill.
    const ahead = m.toWorld(new Vec3(0, 90, l.nodeZ - 1000));
    const up = m.orientation.rotate(Vec3.Y);
    this.camera.position.set(eye.x, eye.y, eye.z);
    this.camera.up.set(up.x, up.y, up.z);
    this.camera.lookAt(ahead.x, ahead.y, ahead.z);
    // Centre the view on the window strip rather than on the whole screen.
    const win = this.window.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    if (win.height > 0) this.camera.setViewOffset(W, H, 0, H / 2 - (win.top + win.height / 2), W, H);
    else this.camera.clearViewOffset();
    const st = this.deps.nav.status;
    // At the parking point the probe undocks and flies on: the pilot goes down to it.
    if (this.lastStatus === "carrier" && st === "autopilot") {
      this.lastStatus = st;
      return this.leave("cabina", "La nodriza ha aparcado: bajas a la sonda, que sigue sola hacia el destino");
    }
    this.lastStatus = st;
    const now = performance.now();
    if (now < this.refreshAt) return;
    this.refreshAt = now + 250;
    this.render();
  }

  private views(): Views {
    const d = this.deps;
    const trip = d.nav.progress();
    const prop = propulsionPanel(d.mothership, trip);
    const power = powerPanel(d.mothership, trip);
    const life = lifePanel(d.ring, d.habitat);
    const dock = dockingPanel(d.docking, d.probeRangeM(), d.probe());
    const comms = commsPanel(d.habitat.mailbox?.received ?? [], d.missions ? missionsSummary(d.missions) : undefined);
    const nav = navPanel(d.nav.target.name, d.nav.status, trip);
    return { nav, prop, power, life, dock, comms, alerts: alerts({ prop, life, dock, comms, nav }) };
  }

  private set(el: HTMLElement, key: string, html: string): void {
    if (this.html.get(key) === html) return;
    this.html.set(key, html);
    // Keep an open «Fuentes» open across the live refresh.
    const open = [...el.querySelectorAll("details")].map((d) => d.open);
    el.innerHTML = html;
    el.querySelectorAll("details").forEach((d, i) => (d.open = open[i] ?? false));
  }

  private render(): void {
    if (!this.active) return;
    const v = this.views();
    const items = this.status.querySelector<HTMLElement>(".fd-items")!;
    this.set(
      items,
      "items",
      [
        ["Δv", `${num(v.prop.deltaVMs / 1000, 2)} km/s`],
        ["Xe", pct(v.prop.xenonFraction)],
        ["Empuje", `${num(v.prop.thrustNowN, 1)} N`],
        ["Red", `${num(v.power.electricKw / 1000, 1)} MWe`],
        ["Anillo", `${num(v.life.floorG, 2)} g`],
        ["Sonda", v.dock.docked ? "acoplada" : "fuera"],
      ]
        .map(([k, x]) => `<span><small>${k}</small>${x}</span>`)
        .join(""),
    );
    this.set(
      this.status.querySelector<HTMLElement>(".fd-alerts")!,
      "alerts",
      v.alerts.length
        ? v.alerts.map((a) => `<button class="fd-alert ${a.level}" data-alert="${a.panel}" title="${LEVEL[a.level]}">${esc(a.text)}</button>`).join("")
        : `<span class="fd-quiet">Sin avisos</span>`,
    );
    for (const [id] of PANELS) this.sections.get(id)!.dataset.level = panelLevel(v.alerts, id);
    const full = (id: PanelId) => !this.compact || this.maxed === id;
    if (!this.mapHost.isConnected) this.set(this.bodies.get("nav")!, "nav", this.navHtml(v.nav));
    else this.updateMapStrip(v.nav);
    this.set(this.bodies.get("prop")!, "prop", this.propHtml(v.prop, full("prop")));
    this.set(this.bodies.get("power")!, "power", this.powerHtml(v.power, full("power")));
    this.set(this.bodies.get("life")!, "life", this.lifeHtml(v.life, full("life")));
    this.set(this.bodies.get("dock")!, "dock", this.dockHtml(v.dock, full("dock")));
    this.set(this.bodies.get("comms")!, "comms", this.commsHtml(v.comms, full("comms")));
  }

  // --- Pages -------------------------------------------------------------------

  private tripLine(n: NavPanel): string {
    const t = n.trip;
    if (!t) return TRIP[n.status] ?? n.status;
    return `${t.vehicle === "carrier" ? "Nodriza" : "Sonda"} ${PHASE[t.phase] ?? t.phase} · ${num(t.speedMS, t.speedMS < 1 ? 2 : 1)} m/s · faltan ${km(t.remainingM)} · ${duration(t.etaS)}`;
  }

  /** Tile (phone grid): destination and trip, no map. */
  private navHtml(n: NavPanel): string {
    return `<div class="fd-big">${esc(n.targetName)}</div><div class="fd-line">${esc(this.tripLine(n))}</div>${n.trip ? bar(n.trip.fraction, "nav") : ""}<div class="fd-hint">Toca para abrir el mapa y programar el viaje</div>`;
  }

  /** With the map mounted: a one-line trip strip under it. */
  private updateMapStrip(n: NavPanel): void {
    let strip = this.mapHost.querySelector<HTMLElement>(".fd-strip");
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "fd-strip";
      this.mapHost.appendChild(strip);
    }
    const text = `${n.targetName} · ${this.tripLine(n)}`;
    if (strip.textContent !== text) strip.textContent = text;
    strip.classList.toggle("on", !!n.trip || n.status !== "idle");
  }

  private propHtml(p: PropulsionPanel, full: boolean): string {
    const dots = Array.from({ length: p.thrusterCount }, (_, i) => `<i class="${i < p.firing ? "on" : ""}"></i>`);
    const half = Math.ceil(p.thrusterCount / 2);
    const array = `<div class="fd-thrusters" aria-label="${p.firing} de ${p.thrusterCount} propulsores encendidos"><div>${dots.slice(0, half).join("")}</div><div>${dots.slice(half).join("")}</div></div>`;
    const head = `${array}<div class="fd-kv"><span>Encendidos</span><b>${p.firing} / ${p.thrusterCount}</b><span>Empuje</span><b>${num(p.thrustNowN, 1)} N <small>de ${num(p.totalThrustN, 1)}</small></b><span>Δv restante</span><b>${num(p.deltaVMs)} m/s</b><span>Xenón</span><b>${num(p.xenonKg / 1000, 1)} t <small>${pct(p.xenonFraction)}</small></b></div>${bar(p.xenonFraction, "xe")}`;
    if (!full) return head;
    return `${head}<div class="fd-kv">
      <span>Propulsor</span><b>${esc(p.thrusterName)}</b>
      <span>Cada uno</span><b>${num(p.thrustPerThrusterN, 1)} N · ${num(p.powerPerThrusterKw)} kW · Isp ${num(p.ispS)} s</b>
      <span>Caudal de xenón</span><b>${num(p.flowPerThrusterMgS)} mg/s por propulsor</b>
      <span>Masa</span><b>${num(p.massT)} t <small>en seco ${num(p.dryMassT)} t</small></b>
      <span>Aceleración</span><b>${num(p.accelMmS2, 3)} mm/s²</b>
      <span>Autonomía</span><b>${num(p.burnDaysLeft)} días de empuje continuo</b></div>
      ${p.note ? `<p class="fd-note">${esc(p.note)}</p>` : ""}${this.sources(p.sources)}`;
  }

  private powerHtml(p: PowerPanel, full: boolean): string {
    const load = p.thrusterLoadKw / p.electricKw;
    const split = `<div class="fd-split"><i class="thr" style="width:${(load * 100).toFixed(1)}%"></i><i class="rest" style="width:${((1 - load) * 100).toFixed(1)}%"></i></div>
      <div class="fd-legend"><span class="thr">Propulsores ${num(p.thrusterLoadKw)} kW</span><span class="rest">Resto de la nave ${num(p.marginKw)} kW</span></div>`;
    const head = `<div class="fd-kv"><span>Reactor</span><b>${num(p.electricKw / 1000, 1)} MWe <small>${num(p.thermalKw / 1000, 1)} MWt</small></b><span>Calor a radiar</span><b>${num(p.wasteHeatKw / 1000, 2)} MW</b></div>${split}`;
    if (!full) return head;
    return `${head}<div class="fd-kv">
      <span>Conversión</span><b>Brayton, ${pct(p.efficiency)}</b>
      <span>Radiadores</span><b>${num(p.radiatorAreaM2)} m² · ${num(p.radiatorFluxKwM2, 2)} kW/m²</b>
      <span>Matriz de propulsores</span><b>${num(p.thrusterArrayKw)} kW con los 18 encendidos</b>
      <span>Masa específica</span><b>${num(p.specificMassKgPerKw)} kg/kWe</b></div>${this.sources(p.sources)}`;
  }

  private lifeHtml(l: LifePanel, full: boolean): string {
    const head = `<div class="fd-kv"><span>Anillo</span><b>${num(l.ringRpm, 2)} rpm · ${num(l.floorG, 2)} g</b><span>${esc(l.crewName)}</span><b>bienestar ${pct(l.wellbeing)}</b><span>Huerto</span><b>${l.plantsAlive} plantas · ${l.plantsReady} para cosechar</b><span>Máquinas</span><b>${l.machinesWorking} / ${l.machinesTotal} en marcha</b></div>`;
    if (!full) return head;
    return `${head}${bar(l.wellbeing, "life")}<div class="fd-kv">
      <span>Giro</span><b>${pct(l.spinFraction)} de ${num(l.ringCruiseRpm)} rpm${l.spinningUp ? " · acelerando" : ""}</b>
      <span>Radio del suelo</span><b>${num(l.ringRadiusM)} m · llanta a ${num(l.rimSpeedMs, 1)} m/s</b>
      <span>Saciedad</span><b>${pct(Math.min(1, l.satiety))}</b>
      <span>Forma física</span><b>${pct(l.fitness)}</b>
      <span>Días sin gravedad</span><b>${num(l.microgravityDays, 1)}</b>
      <span>Superficie de cultivo</span><b>${num(l.growingAreaM2)} m² · cubre ${pct(l.foodRatio)} de la comida</b>
      <span>Animales</span><b>${l.animals}</b></div>`;
  }

  private dockHtml(d: DockingPanel, full: boolean): string {
    const probe = d.probe;
    const state = d.docked
      ? `<div class="fd-big ok">Acoplada · ganchos cerrados</div>${d.portName ? `<div class="fd-line">${esc(d.portName)}</div>` : ""}`
      : `<div class="fd-big">Sonda a ${km(d.rangeM)}</div><div class="fd-line">${d.portName ? `Puerto: ${esc(d.portName)} · ` : ""}${d.assist ? "Asistente de acople activo" : "Vuelo manual"}</div>`;
    const checks = d.checks.length
      ? `<table class="fd-checks">${d.checks.map((c) => `<tr class="${c.ok ? "ok" : "bad"}"><td>${c.label}</td><td>${num(c.value, 2)} ${c.unit}</td><td><small>${c.limit}</small></td><td>${c.ok ? "✓" : "✗"}</td></tr>`).join("")}</table>`
      : "";
    const head = `${state}${probe ? `<div class="fd-kv"><span>${esc(probe.name)}</span><b>casco ${pct(probe.hullIntegrity)}</b></div>` : ""}`;
    if (!full) return head;
    const fails = d.lastFailures.length ? `<p class="fd-note">Último contacto: ${esc(d.lastFailures.join(" · "))}</p>` : "";
    const tanks = probe ? `<div class="fd-kv">${probe.propellants.map((t) => `<span>${esc(t.label)}</span><b>${num(t.kg)} / ${num(t.capacityKg)} kg</b>`).join("")}</div>` : "";
    return `${head}${tanks}${checks}${fails}<p class="fd-hint">Límites de contacto del estándar IDSS. La sonda se acopla y desacopla desde su cabina (K).</p>${this.sources(d.sources)}`;
  }

  private commsHtml(c: CommsPanel, full: boolean): string {
    const box = this.deps.habitat.mailbox;
    if (full && this.letter && box) {
      const r = box.received.find((x) => x.letter.id === this.letter);
      if (r) {
        const l = r.letter;
        const mission = l.mission ? `<p class="fd-note">${r.missionDone ? "✓ Misión hecha" : `<b>${esc(l.mission.title)}</b><br>${esc(l.mission.where)}`}</p>` : "";
        return `<button class="fd-link" data-back>‹ Todos los mensajes</button><div class="fd-big">${esc(l.subject)}</div><div class="fd-line">${l.channel === "llamada" ? `Llamada de ${esc(l.from)}` : `De ${esc(l.from)}`} · día ${num(r.day, 1)}</div>
          <div class="fd-letter">${l.body.map((p) => `<p>${esc(p)}</p>`).join("")}${l.example ? `<pre>${esc(l.example.pseudo)}\n${esc(l.example.js)}</pre>` : ""}${l.postscripts.map((p) => `<p><small>${esc(p)}</small></p>`).join("")}</div>${mission}`;
      }
    }
    const list = (full ? c.letters : c.letters.slice(0, 3))
      .map((l) => `<button class="fd-msg ${l.read ? "" : "new"}" data-letter="${esc(l.id)}"><b>${esc(l.subject)}</b><small>${l.call ? "Llamada" : "Carta"} de ${esc(l.from)} · día ${num(l.day, 1)}${l.missionPending ? " · misión" : ""}</small></button>`)
      .join("");
    const m = c.missions;
    const missions = m
      ? `<div class="fd-mission">${m.active ? `<small>${esc(m.active.chapter)}</small><b>${esc(m.active.title)}</b><span>Objetivo: ${esc(m.active.targetName)}</span>` : `<b>Sin misión principal activa</b>`}
          <span>Principales ${m.mainDone} / ${m.mainTotal} · secundarias ${m.sideDone} / ${m.sideTotal}</span>
          ${full ? `<div class="fd-actions"><button data-missions>Registro de misiones</button>${m.active ? `<button data-showmap="${esc(m.active.targetId)}">Ver en el mapa</button>` : ""}</div>` : ""}</div>`
      : "";
    return `${missions}<div class="fd-kv"><span>Sin leer</span><b>${c.unread}</b><span>Cartas con misión</span><b>${c.pendingMissions}</b></div><div class="fd-msgs">${list || `<span class="fd-quiet">Sin mensajes</span>`}</div>`;
  }

  private sources(list: readonly string[]): string {
    const link = (s: string) => {
      const url = s.match(/https?:\/\/\S+/)?.[0];
      const label = s.replace(/:\s*https?:\/\/\S+/, "");
      return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : esc(label);
    };
    return list.length ? `<details class="fd-src"><summary>Fuentes</summary>${list.map((s) => `<div>${link(s)}</div>`).join("")}</details>` : "";
  }
}
