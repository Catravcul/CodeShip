import type { Vec3 } from "@core/math/vec3";
import type { Rock } from "@modules/celestial/domain/region";
import type { DestinationInfo, Navigator } from "@modules/navigation/application/navigator";
import { targetDistance, targetPosition, targetRadius, type NavTarget } from "@modules/navigation/domain/nav-target";
import { duration, num } from "@modules/navigation/application/trip-chore";
import { dockCardHtml } from "./nav-dock-card";
import "./nav-map.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const km = (m: number) => (Math.abs(m) >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);
/** 9,13 × 10¹² */
function sci(v: number): string {
  const e = Math.floor(Math.log10(v));
  const sup = String(e).replace(/./g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]!);
  return `${num(v / 10 ** e, 2)} × 10${sup}`;
}

const MATERIAL: Record<string, string> = {
  "Water (in hydrated minerals)": "Agua (en minerales hidratados)",
  Water: "Agua",
  Carbon: "Carbono",
  "Iron-nickel": "Hierro-níquel",
  "Platinum-group metals": "Metales del grupo del platino",
  "Iron (in magnetite and Fe-Ni sulfides)": "Hierro (en magnetita y sulfuros de Fe-Ni)",
  "Nickel (in Fe-Ni sulfides)": "Níquel (en sulfuros de Fe-Ni)",
  "Silicates (phyllosilicates)": "Silicatos (filosilicatos)",
  "Nitrogen (in ammonium salts and organics)": "Nitrógeno (en sales de amonio y orgánicos)",
};
const CONCEPT = ["", "secuencia", "variables", "tipos de datos", "operaciones", "condicionales", "bucles", "funciones", "listas y objetos", "eventos", "composición"];

export interface NavMapDeps {
  readonly nav: Navigator;
  readonly title: string;
  readonly boundaryRadiusM: number;
  readonly rocks: readonly Rock[];
  shipPosition(): Vec3;
  /** Nose direction, world frame. */
  shipNose(): Vec3;
  /** Where the mothership is, if there is one. */
  carrierPosition?(): Vec3;
  /** Program the trip to the selected target (closes the map and opens the challenges). */
  onProgram(): void;
}

/** How a target stands in Nevaeh's missions (modules/missions), for the marks on the map. */
export interface MissionMark {
  readonly kind: "principal" | "secundaria";
  readonly state: "activa" | "hecha" | "bloqueada" | "pendiente";
  readonly title?: string;
  readonly why?: string;
  readonly reward?: string;
}
const MARK_TEXT: Record<MissionMark["state"], string> = { activa: "activa", hecha: "hecha", bloqueada: "más adelante", pendiente: "pendiente" };

interface Projected {
  x: number;
  y: number;
  gy: number;
}

/**
 * Navigation map of the region, mobile first: a 3D-orbit schematic (each body on a stalk over the
 * reference plane, drag to turn it), a row of destinations and a data card for the one picked.
 */
export class NavMap {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly chips: HTMLElement;
  private readonly card: HTMLElement;
  private yaw = 0.35;
  private elevation = 0.95;
  private zoom = 1;
  private picked: NavTarget | undefined;
  private note = "";
  private drag: { id: number; x: number; y: number; moved: number } | null = null;
  private screen: { t: NavTarget; x: number; y: number }[] = [];
  private chipsHtml = "";
  private readonly home: HTMLElement;
  /** Set by main: the mission mark of a target (Nevaeh's main missions and side missions). */
  missionMark?: (targetId: string) => MissionMark | undefined;
  /** Set by main: the subjugation block of an asteroid's card (stages, trust, next step), as HTML. */
  rapportMark?: (targetId: string) => string;
  /** Set by main: an asteroid's subjugation level and what it is doing (net core, packages, trip, chase). */
  levelMark?: (targetId: string) => MapLevelMark | undefined;
  /** Set by main: open the mission log. */
  onMissions?: () => void;

  constructor(
    root: HTMLElement,
    private readonly deps: NavMapDeps,
  ) {
    this.home = root;
    this.el = document.createElement("div");
    this.el.className = "nav-map hidden";
    this.el.innerHTML = `
      <div class="nav-head"><div class="nav-title">${esc(deps.title)}</div>
        <div class="nav-tools"><button data-act="zin" aria-label="Acercar">+</button><button data-act="zout" aria-label="Alejar">−</button><button data-act="view">Cenital</button><button class="missions" data-act="missions">Misiones</button><button class="x" data-act="close" aria-label="Cerrar mapa">×</button></div></div>
      <div class="nav-body"><div class="nav-canvas"><canvas></canvas><div class="nav-hint">Arrastra para girar · toca un destino</div></div>
        <div class="nav-side"><div class="nav-chips"></div><div class="nav-card"></div></div></div>`;
    root.appendChild(this.el);
    this.canvas = this.el.querySelector("canvas")!;
    this.chips = this.el.querySelector(".nav-chips")!;
    this.card = this.el.querySelector(".nav-card")!;
    this.el.addEventListener("click", (e) => this.onClick(e));
    this.canvas.addEventListener("pointerdown", (e) => {
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.yaw += dx * 0.008;
      this.elevation = Math.max(0.2, Math.min(Math.PI / 2, this.elevation + dy * 0.006));
      this.draw();
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      if (this.drag.moved < 8) this.pickAt(e.clientX, e.clientY);
      this.drag = null;
    });
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.setZoom(this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    });
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  /** Rendered inside a panel (the mothership's flight deck) rather than as the full-screen overlay. */
  get embedded(): boolean {
    return this.el.classList.contains("embedded");
  }

  /**
   * Move the map into `host` (a deck panel) or, with no host, back to its overlay. The same map,
   * state and actions either way; embedded it fills its host and leaves the cockpit HUD alone.
   */
  mount(host?: HTMLElement): void {
    const target = host ?? this.home;
    if (this.el.parentElement !== target) target.appendChild(this.el);
    this.el.classList.toggle("embedded", !!host);
    if (host) document.body.classList.remove("in-map");
    else if (this.visible) document.body.classList.add("in-map");
    this.refresh();
  }

  open(): void {
    this.el.classList.remove("hidden");
    if (!this.embedded) document.body.classList.add("in-map");
    this.picked ??= this.deps.nav.target;
    this.note = "";
    this.refresh();
  }

  /** Open the map with one target picked (from the mission log). */
  show(targetId: string): void {
    const t = this.deps.nav.targets.find((x) => x.id === targetId);
    if (t) this.picked = t;
    this.open();
  }

  close(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-map");
  }

  onClose?: () => void;

  /** Rebuild the chips and the card (after a pick or a change of target) and redraw. */
  refresh(): void {
    if (!this.visible) return;
    this.renderChips();
    this.renderCard();
    this.draw();
  }

  /** Follow the ship while open: redraw and update distances, without rebuilding the card under the finger. */
  tick(): void {
    if (!this.visible) return;
    this.renderChips();
    this.draw();
  }

  private setZoom(z: number): void {
    this.zoom = Math.max(0.6, Math.min(12, z));
    this.draw();
  }

  private onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!t) return;
    const nav = this.deps.nav;
    switch (t.dataset.act) {
      case "close":
        this.close();
        this.onClose?.();
        return;
      case "zin":
        return this.setZoom(this.zoom * 1.5);
      case "zout":
        return this.setZoom(this.zoom / 1.5);
      case "view":
        this.elevation = this.elevation > 1.5 ? 0.95 : Math.PI / 2;
        t.textContent = this.elevation > 1.5 ? "Inclinada" : "Cenital";
        return this.draw();
      case "missions":
        return this.onMissions?.();
      case "pick":
        this.picked = nav.targets.find((x) => x.id === t.dataset.id);
        this.note = "";
        return this.refresh();
      case "select":
      case "program": {
        if (!this.picked) return;
        const r = nav.select(this.picked.id);
        if (!r.ok) {
          this.note = r.reason ?? "";
          return this.refresh();
        }
        if (t.dataset.act === "select") {
          this.note = "Destino fijado: vuela a mano o programa el viaje";
          return this.refresh();
        }
        const can = nav.canProgram();
        if (!can.ok) {
          this.note = can.reason ?? "";
          return this.refresh();
        }
        // Embedded in a deck panel the map stays put under the challenge sheet.
        if (!this.embedded) this.close();
        this.deps.onProgram();
        return;
      }
    }
  }

  private renderChips(): void {
    const nav = this.deps.nav;
    const ship = this.deps.shipPosition();
    const html = nav.targets
      .map((t) => {
        const m = this.missionMark?.(t.id);
        const cls = `${t === this.picked ? "on" : ""} ${t === nav.target ? "target" : ""} ${m ? `m-${m.kind} m-${m.state}` : ""}`;
        const mark = m ? `<i class="mark" title="${m.kind === "principal" ? "Misión de Nevaeh" : "Misión secundaria"}">${m.state === "hecha" ? "✓" : m.kind === "principal" ? "N" : ""}</i>` : "";
        return `<button class="nav-chip ${cls}" data-act="pick" data-id="${esc(t.id)}"><b>${mark}${esc(t.name)}</b><span></span></button>`;
      })
      .join("");
    if (this.chipsHtml !== html) {
      this.chipsHtml = html;
      this.chips.innerHTML = html;
    }
    nav.targets.forEach((t, i) => {
      const span = this.chips.children[i]?.querySelector("span");
      const text = km(targetDistance(t, ship));
      if (span && span.textContent !== text) span.textContent = text;
    });
  }

  private renderCard(): void {
    const t = this.picked;
    if (!t) {
      this.card.innerHTML = "";
      return;
    }
    this.card.innerHTML = t.kind === "dock" ? dockCardHtml(this.deps.nav.dockDestination(t), this.note) : cardHtml(this.deps.nav.destination(t), this.note, this.missionMark?.(t.id), this.rapportMark?.(t.id));
  }

  private pickAt(cx: number, cy: number): void {
    const r = this.canvas.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    let best: { t: NavTarget; d: number } | undefined;
    for (const s of this.screen) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < 32 && (!best || d < best.d)) best = { t: s.t, d };
    }
    if (best) {
      this.picked = best.t;
      this.note = "";
      this.refresh();
    }
  }

  private draw(): void {
    const c = this.canvas;
    const w = c.clientWidth, h = c.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const R = this.deps.boundaryRadiusM;
    const s = ((0.46 * Math.min(w, h)) / R) * this.zoom;
    const cx = w / 2, cy = h / 2;
    const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
    const sinE = Math.sin(this.elevation), cosE = Math.cos(this.elevation);
    const ship = this.deps.shipPosition();
    // Centred on the region when zoomed out, on the ship when zoomed in.
    const k = Math.min(1, (this.zoom - 1) / 2);
    const o = { x: ship.x * Math.max(0, k), y: ship.y * Math.max(0, k), z: ship.z * Math.max(0, k) };
    const P = (p: { x: number; y: number; z: number }): Projected => {
      const x = p.x - o.x, y = p.y - o.y, z = p.z - o.z;
      const xr = x * cosY - z * sinY;
      const zr = x * sinY + z * cosY;
      return { x: cx + xr * s, y: cy + (zr * sinE - y * cosE) * s, gy: cy + zr * sinE * s };
    };

    // Reference plane: the flyable sphere's equator and range rings every 5 km.
    g.lineWidth = 1;
    for (let r = 5000; r <= R; r += 5000) {
      g.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const p = P({ x: Math.cos(a) * r + o.x, y: o.y, z: Math.sin(a) * r + o.z });
        if (i === 0) g.moveTo(p.x, p.gy);
        else g.lineTo(p.x, p.gy);
      }
      g.strokeStyle = r === R ? "#ffb34766" : "#7fdcff22";
      g.setLineDash(r === R ? [] : [4, 6]);
      g.stroke();
    }
    g.setLineDash([]);

    // Procedural rocks, faint.
    g.fillStyle = "#9aa4ae";
    for (const r of this.deps.rocks) {
      const p = P(r.position);
      if (p.x < -4 || p.y < -4 || p.x > w + 4 || p.y > h + 4) continue;
      const rad = Math.max(0.6, r.radiusM * s);
      g.globalAlpha = r.radiusM > 80 ? 0.4 : 0.18;
      g.beginPath();
      g.arc(p.x, p.y, rad, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    // The planned route to the target.
    const nav = this.deps.nav;
    const trip = nav.trip();
    const shipP = P(ship);
    // A dock trip aims at the port and stops `handoverM` short; an asteroid trip stops above the surface.
    const centre = trip.dock ? trip.dock.port.port.position : targetPosition(nav.target);
    const stopM = trip.dock?.handoverM ?? nav.approachM;
    const lastW = trip.waypoints[trip.waypoints.length - 1] ?? ship;
    const toC = centre.sub(lastW);
    const arrival = lastW.add(toC.normalize().scale(Math.max(0, toC.length() - (centre.sub(ship).length() - trip.heightM) - stopM)));
    g.setLineDash([6, 5]);
    g.lineWidth = 1.5;
    if (trip.carrier) {
      // The mothership's hop (amber), then the probe's last stretch (cyan).
      const c = trip.carrier;
      g.beginPath();
      const c0 = P(c.from);
      g.moveTo(c0.x, c0.y);
      for (const wpt of c.path) {
        const p = P(wpt);
        g.lineTo(p.x, p.y);
      }
      g.strokeStyle = "#ffb347cc";
      g.stroke();
      if (!c.berthAt) {
        const toC = centre.sub(c.parking);
        const end = c.parking.add(toC.normalize().scale(Math.max(0, toC.length() - targetRadius(nav.target) - nav.approachM)));
        const a = P(c.parking), b = P(end);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.strokeStyle = "#7fdcffcc";
        g.stroke();
      }
    } else {
      g.beginPath();
      g.moveTo(shipP.x, shipP.y);
      for (const wpt of [...trip.waypoints, arrival]) {
        const p = P(wpt);
        g.lineTo(p.x, p.y);
      }
      g.strokeStyle = "#7fdcffcc";
      g.stroke();
    }
    g.setLineDash([]);
    const carrier = this.deps.carrierPosition?.();
    // The mothership as a destination («Volver a la nodriza») is drawn with the targets.
    if (carrier && !nav.targets.some((t) => t.kind === "dock" && !t.carrierPort)) {
      const m = P(carrier);
      g.fillStyle = "#ffb347";
      g.fillRect(m.x - 5, m.y - 5, 10, 10);
      g.fillText("Nodriza", m.x + 9, m.y + 16);
    }

    // Catalogued asteroids on stalks.
    this.screen = [];
    g.font = "12px ui-monospace, Menlo, monospace";
    for (const t of nav.targets) {
      const p = P(targetPosition(t));
      const target = t === nav.target;
      const picked = t === this.picked;
      g.strokeStyle = "#ffffff33";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(p.x, p.gy);
      g.lineTo(p.x, p.y);
      g.stroke();
      g.beginPath();
      g.ellipse(p.x, p.gy, 4, 4 * sinE, 0, 0, Math.PI * 2);
      g.stroke();
      const rad = Math.max(5, targetRadius(t) * s);
      g.beginPath();
      if (t.kind === "dock") {
        // Structures: a diamond, gold for a station, amber for the mothership.
        g.moveTo(p.x, p.y - rad - 2);
        g.lineTo(p.x + rad + 2, p.y);
        g.lineTo(p.x, p.y + rad + 2);
        g.lineTo(p.x - rad - 2, p.y);
        g.closePath();
        g.fillStyle = target ? "#58d6ff" : t.carrierPort ? "#ffd27f" : "#ffb347";
      } else {
        g.arc(p.x, p.y, rad, 0, Math.PI * 2);
        g.fillStyle = target ? "#58d6ff" : "#a99f92";
      }
      g.fill();
      if (picked || target) {
        g.beginPath();
        g.arc(p.x, p.y, rad + 5, 0, Math.PI * 2);
        g.strokeStyle = target ? "#58d6ff" : "#ffd23f";
        g.lineWidth = 2;
        g.stroke();
      }
      const m = this.missionMark?.(t.id);
      if (m) drawMark(g, p.x, p.y, rad, m);
      g.fillStyle = target ? "#bff0ff" : "#e6dfd3";
      g.fillText(t.name, p.x + rad + 7, p.y + 4);
      const lm = t.kind === "asteroid" ? this.levelMark?.(t.id) : undefined;
      // Narrow screens: the line under the name only for the picked one, the target and a chaser (the badge always).
      if (lm) drawLevel(g, p, rad, lm, lm.goal ? P(lm.goal) : undefined, w >= 600 || picked || target || lm.tone === "persigue");
      this.screen.push({ t, x: p.x, y: p.y });
    }

    // The ship: stalk, marker and nose.
    g.strokeStyle = "#ffd23f88";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(shipP.x, shipP.gy);
    g.lineTo(shipP.x, shipP.y);
    g.stroke();
    const nose = P(ship.add(this.deps.shipNose().scale(18 / s)));
    const ang = Math.atan2(nose.y - shipP.y, nose.x - shipP.x);
    g.save();
    g.translate(shipP.x, shipP.y);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(9, 0);
    g.lineTo(-6, 6);
    g.lineTo(-3, 0);
    g.lineTo(-6, -6);
    g.closePath();
    g.fillStyle = "#ffd23f";
    g.fill();
    g.restore();
    g.fillStyle = "#ffd23f";
    g.fillText("Nave", shipP.x + 10, shipP.y - 8);

    // Scale bar.
    const bar = 1000 * s >= 30 ? 1000 : 5000;
    g.strokeStyle = "#d8f6ff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(14, h - 16);
    g.lineTo(14 + bar * s, h - 16);
    g.stroke();
    g.fillStyle = "#d8f6ff";
    g.fillText(km(bar), 14, h - 22);
  }
}

/** What the map shows of a subjugated (or angry, moving) asteroid. */
export interface MapLevelMark {
  readonly level: number;
  readonly tone: "obedece" | "red" | "nave" | "estacion" | "viaje" | "aparcado" | "persigue" | "vuelve";
  readonly short: string;
  readonly goal?: { x: number; y: number; z: number };
}

const LEVEL_TONE: Record<MapLevelMark["tone"], string> = {
  obedece: "#7dffb0",
  red: "#b48cff",
  nave: "#ffd27f",
  estacion: "#ffb347",
  viaje: "#58d6ff",
  aparcado: "#ffd27f",
  persigue: "#ff6b5a",
  vuelve: "#9aa4ae",
};

/** Level badge (a hexagon with the level), what it is doing under its name, and a dashed line to where it is heading. */
function drawLevel(g: CanvasRenderingContext2D, p: Projected, rad: number, m: MapLevelMark, goal: Projected | undefined, text: boolean): void {
  const c = LEVEL_TONE[m.tone];
  g.save();
  if (goal) {
    g.setLineDash([3, 4]);
    g.strokeStyle = c;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(goal.x, goal.y);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.arc(goal.x, goal.y, 3, 0, Math.PI * 2);
    g.fillStyle = c;
    g.fill();
  }
  if (m.level > 0) {
    const x = p.x - rad - 9, y = p.y - rad - 4, r = 8;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      if (i === 0) g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
      else g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    g.closePath();
    g.fillStyle = c;
    g.fill();
    g.fillStyle = "#1a1000";
    g.font = "bold 10px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.fillText(String(m.level), x, y + 3.5);
  }
  if (m.tone === "persigue") {
    g.beginPath();
    g.arc(p.x, p.y, rad + 8, 0, Math.PI * 2);
    g.strokeStyle = c;
    g.lineWidth = 2;
    g.stroke();
  }
  if (text) {
    g.textAlign = "left";
    g.font = "11px ui-monospace, Menlo, monospace";
    g.fillStyle = c;
    g.fillText(m.short, p.x + rad + 7, p.y + 17);
  }
  g.restore();
}

/** Nevaeh's mark: a gold dashed ring and an «N» diamond for a main mission; a small tick for a side mission done. */
function drawMark(g: CanvasRenderingContext2D, x: number, y: number, rad: number, m: MissionMark): void {
  const done = m.state === "hecha";
  if (m.kind === "principal") {
    g.save();
    g.beginPath();
    g.arc(x, y, rad + 10, 0, Math.PI * 2);
    g.setLineDash(done ? [] : [5, 4]);
    g.strokeStyle = done ? "#7dffb0aa" : m.state === "activa" ? "#ffcf5a" : "#ffcf5a66";
    g.lineWidth = m.state === "activa" ? 2.5 : 1.5;
    g.stroke();
    const dy = y - rad - 20;
    g.beginPath();
    g.moveTo(x, dy - 9);
    g.lineTo(x + 8, dy);
    g.lineTo(x, dy + 9);
    g.lineTo(x - 8, dy);
    g.closePath();
    g.fillStyle = done ? "#7dffb0" : "#ffcf5a";
    g.fill();
    g.fillStyle = "#1a1000";
    g.font = "bold 10px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.fillText(done ? "✓" : "N", x, dy + 3.5);
    g.restore();
  } else if (done) {
    g.save();
    g.fillStyle = "#7dffb0";
    g.font = "bold 12px ui-monospace, Menlo, monospace";
    g.fillText("✓", x - rad - 12, y + 4);
    g.restore();
  }
}

function missionHtml(m: MissionMark): string {
  const head = m.kind === "principal" ? `<b>◆ Misión de Nevaeh</b> · ${MARK_TEXT[m.state]}` : `<b>Misión secundaria</b> · ${m.state === "hecha" ? "subyugado" : "sin subyugar"}`;
  return `<div class="card-mission ${m.kind} ${m.state}">${head}${m.why ? `<p>${esc(m.why)}</p>` : ""}${m.reward ? `<small>Recompensa: ${esc(m.reward)}</small>` : ""}</div>`;
}

function carrierLine(i: DestinationInfo): string {
  const c = i.trip.carrier!;
  const f = c.facts;
  const dv = c.plan.deltaVMS;
  return `nodriza ${km(c.plan.distanceM)} · Δv ${num(dv, dv < 10 ? 2 : 0)} m/s · ${num(f.propellantKg)} kg de xenón · ${duration(c.plan.totalS)}<br><small>aparca a ${km(f.parkingM)}; el módulo sigue ${km(Math.max(0, f.parkingM - f.approachM))} con su motor</small>`;
}

function cardHtml(i: DestinationInfo, note: string, mission?: MissionMark, rapport = ""): string {
  const a = i.target.body;
  const d = a.data;
  const dims = d.dimensionsM.value;
  const albedo = (d as { albedo?: { value: number } }).albedo?.value;
  const inferred = /inferred/i.test(d.spectralType.note ?? "");
  const rotMeasured = d.rotationPeriodH.source !== "game value";
  const massAssumed = /assum/i.test(`${d.massKg.note ?? ""}${d.densityKgM3.note ?? ""}`);
  const p = i.trip.plan;
  const res = d.composition
    .map((c) => `<li>${esc(MATERIAL[c.material] ?? c.material)}: ${num(c.massFraction.value[0] * 100, 1)}–${num(c.massFraction.value[1] * 100, 1)} %</li>`)
    .join("");
  const badges = `${i.selected ? `<span class="badge target">Destino actual</span>` : ""}${i.persuaded ? `<span class="badge ok">Subyugado</span>` : ""}`;
  return `
    <div class="card-name">${esc(d.name)} ${badges}</div>
    ${mission ? missionHtml(mission) : ""}${rapport}
    <dl>
      <dt>Tipo espectral</dt><dd>${esc(d.spectralType.value)}${inferred ? ` <small>inferido del albedo${albedo ? ` ${num(albedo, 3)}` : ""}; sin espectro</small>` : ""}</dd>
      <dt>Tamaño</dt><dd>${num(dims.x / 1000, 2)} × ${num(dims.y / 1000, 2)} × ${num(dims.z / 1000, 2)} km <small>diámetro ${num((a.meanRadiusM * 2) / 1000, 2)} km</small></dd>
      <dt>Rotación</dt><dd>${num(d.rotationPeriodH.value, 2)} h <small>${rotMeasured ? "medida" : "sin medir: valor de juego"}</small></dd>
      <dt>Masa</dt><dd>${sci(a.massKg)} kg <small>${massAssumed ? "con la densidad de Bennu (supuesta)" : "medida"}</small></dd>
      <dt>Superficie</dt><dd>g ${num(i.surfaceGravityMS2 * 1e6, 1)} µm/s² · escape ${num(i.escapeMS, 2)} m/s</dd>
      <dt>Distancia</dt><dd>${km(i.trip.heightM)} a la superficie</dd>
      <dt>Recursos</dt><dd><ul>${res || "<li>sin datos</li>"}</ul><small>riqueza ${num(i.richness * 100)} %</small></dd>
      <dt>Duelo</dt><dd>dificultad ${num(i.duel.difficulty * 100)} % · ${i.duel.persuasionGoal} ideas · paciencia ${i.duel.patience} <small>hasta ${CONCEPT[i.duel.maxConcept]}</small></dd>
      <dt>Viaje</dt><dd>${i.trip.carrier ? carrierLine(i) : p.feasible ? `${km(p.distanceM)}${i.trip.waypoints.length ? ` (${i.trip.waypoints.length} desvío${i.trip.waypoints.length > 1 ? "s" : ""})` : ""} · crucero ${num(p.cruiseMS)} m/s · Δv ${num(p.deltaVMS)} m/s · ${duration(p.totalS)}` : "sin combustible para el viaje"}</dd>
    </dl>
    <a class="card-src" href="${esc(d.meanRadiusM.source)}" target="_blank" rel="noopener">Fuente de los datos</a>
    ${note ? `<div class="card-note">${esc(note)}</div>` : ""}
    <div class="card-actions">
      ${i.selected ? "" : `<button data-act="select">Fijar destino</button>`}
      <button class="primary" data-act="program">Programar viaje</button>
    </div>`;
}
