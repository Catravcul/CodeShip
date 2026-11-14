import { DOMENICA_HAIR } from "./ui/portraits";
import { settings } from "./ui/settings-store";
import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { IVA, ivaStep, type IvaEvent, type IvaState, type IvaWorld } from "@modules/gravity/domain/iva";
import { HopGraph } from "@modules/gravity/domain/hops";
import { stationHandrails, stationPortals } from "@modules/station/data/handrails";
import type { CraftSpec, MachineId } from "@modules/station/domain/blueprint";
import type { PortUser } from "@modules/station/domain/structure";
import { faceToward, type Fixture, type StationInterior, type StationPanel } from "@modules/station/domain/interior";
import { buildStationRooms, crateModel, probeModel, type StationRooms } from "./adapters/three/interior/station-rooms";
import { CubeFigure } from "./adapters/three/interior/figure";
import { Walker } from "./adapters/input/walker";
import { HopControl } from "./adapters/three/interior/hop-control";
import { buildRails, FloatingBody, motionLabel } from "./adapters/three/interior/zero-g-body";
import "./ui/station-interior.css";

const PANEL_NAME: Readonly<Record<StationPanel, string>> = { materiales: "Materiales", planos: "Planos", fabricacion: "Fabricación", hangar: "Hangar", propelente: "Planta de propelente", vida: "Vida" };
const FACE_LABEL = { suelo: "el suelo", techo: "el techo", babor: "babor", estribor: "estribor", proa: "proa", popa: "popa" } as const;
/** Body margin from the walls while floating, m. */
const BODY = 0.3;
/** Game value: seconds to empty or fill the airlock (on the ISS it takes hours with the prebreathe). */
const CYCLE_S = 2.5;
const CABIN_KPA = 101.3;
/** Game value: the cabin air drifts aft at 0,1 m/s (ventilation, within NASA-STD-3001 V2 6107's 0,08–0,61 m/s). */
const AIR = new Vec3(0, 0, 0.1);
const num = (x: number, d = 2) => x.toFixed(d).replace(".", ",");

export interface StationInteriorDeps {
  /** Machines working right now (their lamps glow). */
  busy(): ReadonlySet<MachineId>;
  /** Spare parts by id and the crafts kept in the hangar. */
  store(): { parts: readonly [string, number][]; crafts: readonly CraftSpec[] };
  partName(id: string): string;
  /** Open a tab of the station's task screen. */
  openPanel(panel: StationPanel): void;
  /** Open the ship bay (its console in node 2, or B). */
  openBay(): void;
  /** Leave through a docking hatch; returns why not, if she cannot. */
  leave(to: PortUser): string | void;
}

/**
 * Inside the station: Doménica floats (the station does not spin) through node 2, the habitat,
 * node 1, the fabrication module and, suited, the hangar. Same handrail movement as the mothership's
 * spine; machines open their tab of the station screen (docs/design/interiores.md §5).
 */
export class StationInteriorMode {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.03, 2500);
  private rooms: StationRooms;
  private readonly walker: Walker;
  private readonly avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
  private readonly suit = new CubeFigure(0xf2f2f2, 0xe9ecef);
  private readonly rig = new THREE.Group();
  private readonly ui: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly actBtn: HTMLButtonElement;
  private readonly viewBtn: HTMLButtonElement;
  private readonly toast: HTMLElement;
  private readonly keys = new Set<string>();
  private p = Vec3.ZERO;
  /** How she moves about: holding rails, pushing off, gliding (docs/design/ingravidez.md). */
  private iva: IvaState = { position: Vec3.ZERO, velocity: Vec3.ZERO, motion: { kind: "deriva" } };
  private graph!: RailGraph;
  private hops!: HopGraph;
  private hopsSuited = false;
  private world!: IvaWorld;
  private railMesh: THREE.Group | null = null;
  private readonly body: FloatingBody;
  private readonly hop: HopControl;
  private yaw = 0;
  private pitch = 0;
  /** First person unless the settings say otherwise; the eye toggles it for the visit. */
  private thirdPerson = settings.value.walkView === "tercera";
  private toastUntil = 0;
  private storeKey = "";
  private hudKey = "";
  private near: Fixture | undefined;
  private tap: { id: number; x: number; y: number; t: number } | null = null;
  /** Airlock: emptied with her suited (outer hatch open) or at cabin pressure; `cycling` counts down. */
  suited = false;
  private cycling = 0;
  /** Which port she came in by (the hatch that takes her back). */
  from: PortUser = "sonda";
  active = false;

  constructor(
    root: HTMLElement,
    public interior: StationInterior,
    private readonly deps: StationInteriorDeps,
  ) {
    this.scene.background = new THREE.Color(0x05070c);
    this.rooms = buildStationRooms(interior.plan);
    this.scene.add(this.rooms.group);
    this.hop = new HopControl(root, this.scene);
    this.buildRails();
    this.avatar.pose("float");
    this.suit.pose("float");
    this.rig.add(this.avatar.root, this.suit.root);
    this.scene.add(this.rig);
    this.body = new FloatingBody(this.rig);
    this.walker = new Walker(root, { move: "sti-move", look: "sti-look", moveLabel: "Mover" });
    this.walker.arrowsLook = false;
    this.ui = document.createElement("div");
    this.ui.className = "sti-ui hidden";
    this.ui.innerHTML = `<div class="sti-hud"></div><button class="sti-tasks">Tareas</button><button class="sti-view"></button><button class="sti-back">Salir</button>
      <button class="sti-act hidden"></button><div class="sti-toast"></div>`;
    root.appendChild(this.ui);
    this.hud = this.ui.querySelector(".sti-hud")!;
    this.actBtn = this.ui.querySelector(".sti-act")!;
    this.viewBtn = this.ui.querySelector(".sti-view")!;
    this.toast = this.ui.querySelector(".sti-toast")!;
    this.ui.querySelector(".sti-tasks")!.addEventListener("click", () => this.deps.openPanel("materiales"));
    this.ui.querySelector(".sti-back")!.addEventListener("click", () => {
      if (this.suited) return this.say("Primero vuelve a la esclusa y quítate el traje");
      // «Salir» goes back through the hatch she came in by: the only way out is a docked vehicle.
      const why = this.deps.leave(this.from);
      if (why) this.say(why);
    });
    this.viewBtn.addEventListener("click", () => {
      this.thirdPerson = !this.thirdPerson;
      this.syncView();
    });
    this.syncView();
    this.actBtn.addEventListener("click", () => this.near && this.use(this.near, true));
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (e.code === "Enter" && !e.repeat && this.near) this.use(this.near, true);
      if (e.code === "KeyB" && !e.repeat && !this.suited) this.deps.openBay();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    // A short tap on a machine or rack uses it (dragging looks around).
    root.addEventListener("pointerdown", (e) => {
      if (!this.active || (e.target as HTMLElement).tagName !== "CANVAS") return;
      this.tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    });
    window.addEventListener("pointerup", (e) => {
      const t = this.tap;
      this.tap = null;
      if (!this.active || !t || t.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 || performance.now() - t.t > 450) return;
      this.pick(e.clientX, e.clientY);
    });
  }

  /**
   * The station grew (a module berthed, equipment installed or swapped): build the rooms again from
   * the new interior. She stays where she is.
   */
  rebuild(interior: StationInterior): void {
    this.scene.remove(this.rooms.group);
    this.rooms.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.interior = interior;
    this.rooms = buildStationRooms(interior.plan);
    this.scene.add(this.rooms.group);
    this.storeKey = "";
    this.near = undefined;
    this.buildRails();
    // Hold on to the nearest landing point of the new layout.
    this.iva = this.holdNearest(this.iva.position);
    this.p = this.iva.position;
  }

  /** Handrails of the current layout (every module corridor gets its rows; docs/design/ingravidez.md). */
  private buildRails(): void {
    if (this.railMesh) {
      this.scene.remove(this.railMesh);
      this.railMesh.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
    }
    const plan = this.interior.plan;
    this.graph = new RailGraph(stationHandrails(plan));
    this.railMesh = buildRails(this.graph.rails);
    this.scene.add(this.railMesh);
    this.world = {
      graph: this.graph,
      fits: (q) => this.interior.fits(q, BODY, this.suited),
      air: (q) => (this.interior.pressurisedAt(q, this.suited) ? AIR : Vec3.ZERO),
      portals: plan.volumes.filter((v) => v.kind === "escotilla" || v.kind === "esclusa").map((v) => v.centre),
    };
    this.buildHops();
  }

  /** Landing points and hops (docs/design/ingravidez.md, «Fase C: flechas»); what fits depends on the suit, so rebuilt with it. */
  private buildHops(): void {
    this.hops = new HopGraph(this.graph, (q) => this.interior.fits(q, BODY, this.suited), stationPortals(this.interior.plan));
    this.hopsSuited = this.suited;
    this.hop.setGraph(this.hops);
    this.hop.onArrive = (id) => {
      const f = this.hops.points.find((p) => p.id === id)?.poi;
      if (f) this.say(`${this.interior.fixture(f)?.label ?? f}: ya estás aquí`);
    };
  }

  /** Hop by herself to a fixture's grab point (for the experience suite and the HUD). */
  goToFixture(id: string): boolean {
    const at = this.hops.poiPoint(id);
    return !!at && this.hop.goTo(at.id);
  }

  /** Holding the landing point nearest to p. */
  private holdNearest(p: Vec3): IvaState {
    const q = this.hops.nearest(p);
    if (!q) return { position: p, velocity: Vec3.ZERO, motion: { kind: "deriva" } };
    return { position: q.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: q.rail, t: q.t, hands: 0 } };
  }

  /** Come in through the hatch of the port the ship is docked at. */
  enter(from: PortUser): void {
    this.thirdPerson = settings.value.walkView === "tercera";
    this.syncView();
    const e = this.interior.plan.entries[from];
    this.from = from;
    this.iva = this.holdNearest(e.at);
    this.p = this.iva.position;
    this.body.reset();
    this.suited = false;
    this.cycling = 0;
    this.yaw = Math.atan2(-e.facing.x, -e.facing.z);
    this.pitch = from === "sonda" ? 0.05 : 0;
    this.resume();
    this.say(from === "sonda" ? "Entras desde el módulo de aterrizaje por el suelo del Nodo 2. Aquí no hay gravedad: el techo es «arriba» en toda la estación" : "Entras desde la nodriza por proa del Nodo 2. Aquí no hay gravedad: el techo es «arriba»");
  }

  /** Show it again after the station screen (same place). */
  resume(): void {
    this.active = true;
    this.walker.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-station-interior");
    this.resize();
  }

  /** Hide it (to open the station screen, or to leave). */
  suspend(): void {
    this.active = false;
    this.walker.enabled = false;
    this.ui.classList.add("hidden");
    this.hop.hide();
    document.body.classList.remove("in-station-interior");
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    if (!this.active) return;
    const look = this.walker.look(dt);
    this.yaw += look.yaw;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + look.pitch));
    if (this.cycling > 0) {
      this.cycling = Math.max(0, this.cycling - dt);
      if (this.cycling === 0) this.say(this.suited ? "Esclusa vacía: abre la escotilla exterior y pasa al hangar" : "Esclusa a presión: ya puedes quitarte el casco y volver al módulo");
    }
    this.moveAbout(dt);
    // Holding a thing's grab point shows its action; elsewhere, the nearest thing within reach.
    const held = this.hop.holding(this.iva)?.poi;
    this.near = this.cycling > 0 ? undefined : held ? this.interior.fixture(held) : this.interior.fixtureNear(this.p);
    this.syncAction();
    this.syncMachines();
    this.syncStore();
    this.placeCamera();
    this.fadeSigns();
    this.renderHud();
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  /** Rails only: the arrows hop from landing point to landing point (docs/design/ingravidez.md, «Fase C: flechas»). */
  private moveAbout(dt: number): void {
    if (this.hopsSuited !== this.suited) this.buildHops();
    const fwd = this.lookDir();
    const right = new Vec3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const intent = this.hop.update(this.iva, { forward: fwd, right }, this.active && this.cycling === 0, dt, this.camera.position);
    const r = ivaStep(this.iva, intent, this.world, dt);
    this.iva = r.state;
    this.p = r.state.position;
    for (const e of r.events) this.tell(e);
  }

  private tell(e: IvaEvent): void {
    // Hops (the arrows) say their speed on the HUD line, not in a notice.
    if (e.kind === "pared") this.say("Te paras contra la pared con las manos: desde aquí también puedes impulsarte");
    else if (e.kind === "golpe") this.say(`¡Golpe contra la pared a ${num(e.speed, 1)} m/s! Rebotas`);
    else if (e.kind === "deriva") this.say("A la deriva: no llegas a nada. Solo te mueve el aire de la ventilación, muy despacio", 5);
    else if (e.kind === "sin-impulso")
      this.say(e.why === "en-vuelo" ? "En el aire no puedes cambiar de rumbo: espera al próximo asidero" : e.why === "contra-la-pared" ? "No puedes empujarte hacia la pared que sujetas" : "No hay nada en lo que apoyarse: el aire te llevará a una pared");
  }

  private lookDir(): Vec3 {
    return new Vec3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  private actionLabel(f: Fixture): string {
    const a = f.action;
    if (a.kind === "panel") return `${f.label}: abrir ${PANEL_NAME[a.panel]}`;
    if (a.kind === "salir") return a.to === "sonda" ? "Volver al módulo de aterrizaje" : "Pasar a la nodriza";
    if (a.kind === "bahia") return "Abrir la bahía de la nave";
    if (a.kind === "esclusa") return this.suited ? "Llenar la esclusa y quitarse el traje" : "Ponerse el traje y vaciar la esclusa";
    return `${f.label}: ¿qué es?`;
  }

  private syncAction(): void {
    const f = this.near;
    this.actBtn.classList.toggle("hidden", !f);
    if (!f) return;
    const label = this.actionLabel(f);
    if (this.actBtn.textContent !== label) this.actBtn.textContent = label;
    this.actBtn.classList.toggle("info", f.action.kind === "info");
  }

  /** Use a fixture: from the context button (`close`) or by tapping it from further away. */
  use(f: Fixture, close: boolean): void {
    const a = f.action;
    if (a.kind === "panel") {
      this.say(`${f.label} · ${this.interior.locationCode(f)}`);
      return this.deps.openPanel(a.panel);
    }
    if (a.kind === "info") return this.say(`${f.label} (${this.interior.locationCode(f)}): ${f.info}`, 6);
    if (a.kind === "bahia") return this.deps.openBay();
    if (!close) return this.say(`${f.label}: acércate para usarla`);
    if (a.kind === "salir") {
      if (this.suited) return this.say("Con el traje no: vuelve a la esclusa");
      const why = this.deps.leave(a.to);
      return void (why && this.say(why));
    }
    // Airlock: only from inside it.
    if (this.interior.volumeAt(this.p)?.kind !== "esclusa") return this.say("Entra en la esclusa para cambiarte");
    this.suited = !this.suited;
    this.cycling = CYCLE_S;
    this.say(this.suited ? "Traje puesto. Vaciando la esclusa… (en la ISS, el traje y la prerrespiración llevan horas)" : "Llenando la esclusa…", 4);
  }

  private pick(x: number, y: number): void {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.rooms.pickables, false)[0];
    const id = hit?.object.userData.fixture as string | undefined;
    const f = id ? this.interior.fixture(id) : undefined;
    if (!f || !hit || hit.distance > 25) return;
    if (this.near?.id === f.id) return this.use(f, true);
    // Far away: she hops there by herself, hop after hop (docs/design/ingravidez.md, «Fase D»).
    const at = this.hops.poiPoint(f.id);
    if (at && this.cycling === 0 && this.hop.goTo(at.id)) return this.say(`Saltas hasta: ${f.label}`);
    if (hit.distance <= 12) this.use(f, false);
  }

  private syncMachines(): void {
    const busy = this.deps.busy();
    const t = performance.now() / 1000;
    for (const [id, lamp] of this.rooms.lamps) {
      const m = lamp.material as THREE.MeshBasicMaterial;
      if (!m.userData.base) m.userData.base = m.color.getHex();
      const on = busy.has(id);
      // Idle: the window stays dimly lit; working: it glows and flickers.
      m.color.setHex(m.userData.base).multiplyScalar(on ? 0.7 + 0.3 * Math.sin(t * 6 + id.length) : 0.28);
    }
  }

  private syncStore(): void {
    const { parts, crafts } = this.deps.store();
    const key = JSON.stringify([parts, crafts.map((c) => c.id)]);
    if (key === this.storeKey) return;
    this.storeKey = key;
    const g = this.rooms.store;
    g.clear();
    const { crates, probes } = this.interior.stow(parts, crafts);
    const size = this.interior.plan.storage.crate;
    const seen = new Set<string>();
    for (const c of crates) {
      const m = crateModel(size, seen.has(c.partId) ? undefined : this.deps.partName(c.partId));
      seen.add(c.partId);
      m.position.set(c.at.x, c.at.y, c.at.z);
      m.traverse((o) => (o.userData.fixture = c.at.x < 0 ? "estante-babor" : "estante-estribor"));
      g.add(m);
    }
    for (const p of probes) {
      const m = probeModel(p.craft.name);
      m.position.set(p.at.x, p.at.y, p.at.z);
      m.traverse((o) => (o.userData.fixture = "cunas"));
      g.add(m);
    }
    this.rooms.pickables.splice(0, this.rooms.pickables.length);
    this.rooms.signs.splice(0, this.rooms.signs.length);
    this.rooms.group.traverse((o) => {
      if (o.userData.fixture && !(o instanceof THREE.Sprite)) this.rooms.pickables.push(o);
      if (o instanceof THREE.Sprite) this.rooms.signs.push(o);
    });
  }

  private syncView(): void {
    this.viewBtn.textContent = this.thirdPerson ? "Vista 3ª" : "Vista 1ª";
  }

  private placeCamera(): void {
    const dir = this.lookDir();
    const p = new THREE.Vector3(this.p.x, this.p.y, this.p.z);
    const third = this.thirdPerson;
    this.rig.visible = third;
    this.avatar.root.visible = !this.suited;
    this.suit.root.visible = this.suited;
    this.body.update(this.suited ? this.suit : this.avatar, this.iva, this.graph, new THREE.Vector3(dir.x, dir.y, dir.z), 1 / 60);
    this.camera.up.set(0, 1, 0);
    // Third person: follow her body as drawn (when it fits), so a hand on a rail does not push her off screen.
    if (third) {
      const c = this.body.centre();
      if (this.interior.fits(new Vec3(c.x, c.y, c.z), 0.1, this.suited)) p.copy(c);
    }
    if (!third) {
      this.camera.position.copy(p);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      return;
    }
    const d3 = new THREE.Vector3(dir.x, dir.y, dir.z);
    const cam = new THREE.Vector3();
    // In the hangar she can be seen from further back; in a narrow aisle the camera may not fit behind her.
    const far = this.interior.volumeAt(this.p)?.kind === "hangar" ? 4 : 2.4;
    // Pull the camera back from her head until it would leave the space she is in (never through a wall).
    // In flight, from a little higher, so her stretched-out body reads from the side.
    const mk = this.iva.motion.kind;
    const lift = mk === "planeo" || mk === "impulso" || mk === "agarrando" || mk === "salto" ? 0.6 : 0;
    // Back along the view and toward the middle of the aisle (the roomiest line, where the rails are
    // not): from a rail in a corner the camera still fits behind her (docs/design/ingravidez.md).
    const vol = this.interior.volumeAt(this.p);
    const toMid = new THREE.Vector3(0, 0.3, 0);
    if (vol && vol.kind !== "hangar") {
      const long = vol.half.x >= vol.half.y && vol.half.x >= vol.half.z ? "x" : vol.half.z >= vol.half.y ? "z" : "y";
      toMid.set(vol.centre.x - p.x, vol.centre.y - p.y, vol.centre.z - p.z);
      toMid[long] = 0;
      if (toMid.lengthSq() < 0.01) toMid.set(0, 0.3, 0);
      else toMid.multiplyScalar(0.8);
    }
    const at = (k: number) => new THREE.Vector3().copy(p).addScaledVector(d3, -k).addScaledVector(toMid, Math.min(1, k / 1.2)).add(new THREE.Vector3(0, (lift * k) / far, 0));
    let d = 0;
    for (let k = 0.1; k <= far + 1e-6; k += 0.1) {
      const q = at(k);
      if (!this.interior.fits(new Vec3(q.x, q.y, q.z), 0.08, this.suited)) break;
      d = k;
    }
    cam.copy(at(d));
    if (d < 1.1) {
      // Too tight to see her from behind: look through her eyes until there is room.
      this.rig.visible = false;
      this.camera.position.copy(p);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      return;
    }
    this.camera.position.copy(cam);
    this.camera.lookAt(p.clone().addScaledVector(d3, 1.2));
  }

  /** Labels too close to the camera would fill the screen: hide them until there is some distance. */
  private fadeSigns(): void {
    const cam = this.camera.position;
    const w = new THREE.Vector3();
    for (const s of this.rooms.signs) {
      s.getWorldPosition(w);
      const d = w.distanceTo(cam);
      s.visible = d > Math.max(1.0, 4 * s.scale.y) && d < 40 * s.scale.y;
    }
  }

  private renderHud(): void {
    const v = this.interior.volumeAt(this.p);
    const looking = FACE_LABEL[faceToward(this.lookDir())];
    const lock = v?.kind === "esclusa";
    const kpa = lock ? (this.suited ? (this.cycling / CYCLE_S) * CABIN_KPA : (1 - this.cycling / CYCLE_S) * CABIN_KPA) : this.interior.pressurisedAt(this.p, this.suited) ? CABIN_KPA : 0;
    const air = kpa > 1 ? `${Math.round(kpa)} kPa de aire` : "vacío";
    const suit = this.suited ? " · con traje" : "";
    const html = `<div class="sti-title">${v ? `${v.code} · ${v.label}` : "Estación"}</div>
      <div>Mirando hacia ${looking} · el techo es «arriba»</div>
      <div class="sti-grav">0 g: la estación no gira · ${air}${suit}</div><div class="sti-move-line">${motionLabel(this.iva, this.near && this.hop.holding(this.iva)?.poi === this.near.id ? { poi: this.near.label } : {})}</div>${this.near ? `<div class="sti-near">${this.near.label} · ${this.interior.locationCode(this.near)}</div>` : ""}`;
    if (html !== this.hudKey) {
      this.hudKey = html;
      this.hud.innerHTML = html;
    }
  }

  private say(text: string, seconds = 3.5): void {
    this.toast.textContent = text;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + seconds * 1000;
  }
}
