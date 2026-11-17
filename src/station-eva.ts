import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { StepAct } from "@modules/chores/domain/step-visual";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { donningChore, jobChore } from "@modules/eva/application/station-eva-chores";
import { EVA_JOBS, EVA_ROUTES, PREBREATHE_MIN, QUEST_EVA, type EvaSite } from "@modules/eva/data/station-eva";
import { EMU, SAFETY_TETHER_M } from "@modules/eva/data/suit";
import { QuestEva } from "@modules/eva/domain/quest-eva";
import type { ExteriorWork } from "@modules/robotics/application/exterior-work";
import { GRAPPLE_FIXTURES } from "@modules/robotics/data/robotics";
import { insideStation } from "@modules/robotics/domain/clearance";
import { POLANA_LAYOUT } from "@modules/station/data/structure";
import type { Fixture } from "@modules/station/domain/interior";
import { P } from "./adapters/three/interior/figure";
import { SuitFigure } from "./adapters/three/eva/suit-figure";
import { oruBox, sceneLabel } from "./adapters/three/robotics-models";
import type { StationAction, StationInteriorMode } from "./station-interior";
import type { StationOutside } from "./station-outside";
import type { DuelView, SessionText } from "./ui/duel-view";
import "./ui/robotics.css";

/**
 * A spacewalk from Quest (docs/design/paseo-espacial.md, «Desde Quest»): planned when a part outside the station
 * has to be changed, it is played as on the ISS. In Quest's equipment lock she puts on the EMU (a challenge, each
 * step at the suits) and prebreathes with the ISLE protocol on the board clock; the crew lock is depressed; out
 * through the EVA hatch on the 85 ft safety tether she goes hand over hand along the yellow handrails to the
 * worksite, swapping the tether at an anchor when it runs out, puts her feet in the APFR and does the job (a
 * challenge, each step acted out there: Canadarm2 brings the part, the pistol-grip tool…), then back in.
 * Her EMU's oxygen, CO₂ filter and battery run on the same clock.
 */
const TEXT: SessionText = { title: "", progress: "Pasos", lives: "Intentos", order: "Ordena los pasos", submit: "Hacerlo", ok: "Paso hecho", bad: "Así no: inténtalo otra vez", sheet: true };

const v3 = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const V = (p: THREE.Vector3) => new Vec3(p.x, p.y, p.z);
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(Math.floor(min % 60)).padStart(2, "0")} min`;
const pct = (k: number) => `${Math.round(k * 100)} %`;

/** Outward from the station's nearest surface at `p` (station frame): her «up» on the handrails. */
function outward(p: THREE.Vector3): THREE.Vector3 {
  let best = Infinity;
  const n = new THREE.Vector3(0, 1, 0);
  for (const m of POLANA_LAYOUT.modules) {
    const a = v3(m.from);
    const ab = v3(m.to).sub(a);
    const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
    const c = a.clone().addScaledVector(ab, t);
    const d = p.distanceTo(c) - m.radiusM;
    if (d < best && p.distanceTo(c) > 1e-6) {
      best = d;
      n.copy(p).sub(c).normalize();
    }
  }
  for (const part of POLANA_LAYOUT.parts) {
    const c = v3(part.centre);
    const h = v3(part.half);
    const q = new THREE.Vector3(Math.max(c.x - h.x, Math.min(c.x + h.x, p.x)), Math.max(c.y - h.y, Math.min(c.y + h.y, p.y)), Math.max(c.z - h.z, Math.min(c.z + h.z, p.z)));
    const d = p.distanceTo(q);
    if (d < best && d > 1e-6) {
      best = d;
      n.copy(p).sub(q).normalize();
    }
  }
  return n;
}

/** What a job's step does, from its words: the arm brings the part, a tether, the pistol-grip tool, carry, check. */
type WorkMove = "brazo" | "atar" | "llave" | "llevar" | "comprobar";
function workMove(step: string): WorkMove {
  if (/Canadarm2/.test(step)) return "brazo";
  if (/atar|cable de equipo|bolsa/.test(step)) return "atar";
  if (/llave|apretar|pernos|cierres|acoples|válvulas|encajar/.test(step)) return "llave";
  if (/comprobar|desenrollar/.test(step)) return "comprobar";
  return "llevar";
}

export interface StationEvaDeps {
  readonly root: HTMLElement;
  readonly scene: THREE.Scene;
  /** The station's model root (its frame in the world). */
  readonly station: THREE.Object3D;
  readonly duel: DuelView;
  readonly inside: StationInteriorMode;
  readonly outside: StationOutside;
  readonly work: ExteriorWork;
  /** Fit the planned station component (from the hangar); what to say. */
  fitComponent(componentId: string): string;
  say(text: string, seconds?: number): void;
}

export interface EvaAudit {
  readonly site: string;
  readonly move: string;
  readonly playing: boolean;
  /** Her figure and the part on screen above the sheet and not hidden (fractions of sample points). */
  readonly figureSeen: number;
  readonly propSeen: number;
  /** From her nearest hand to the part, m. */
  readonly handToProp: number;
  /** Her or the part inside the station: «what · where». */
  readonly through: readonly string[];
  readonly gesture: boolean;
}

export class StationEva {
  readonly eva = new QuestEva(EMU, { prebreatheMin: PREBREATHE_MIN, depressMin: QUEST_EVA.depressMin.value, repressMin: QUEST_EVA.repressMin.value }, SAFETY_TETHER_M.value);
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2e5);
  /** The chore open in the sheet (the experience suite's answer key). */
  session: { chore: Chore; run: ChoreRun } | null = null;
  active = false;
  private readonly root = new THREE.Group();
  private readonly figure = new SuitFigure();
  private readonly rails = new THREE.Group();
  private readonly tether: THREE.Line;
  private readonly apfr = new THREE.Group();
  private readonly pgt = new THREE.Group();
  private readonly part = oruBox(0.9, 0xd9b24a, "Pieza nueva");
  private readonly label = sceneLabel("Doménica · EMU (NASA)");
  private readonly hud: HTMLElement;
  private site: EvaSite | null = null;
  private dir = 0;
  private yaw = 0;
  private pitch = 0.35;
  private drag: { x: number; y: number } | null = null;
  private crawlPhase = 0;
  private jobDone = false;
  private working: { move: WorkMove; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null;
  private lastMove: WorkMove | "" = "";
  private readonly posNow = new THREE.Vector3();
  private readonly eyeNow = new THREE.Vector3();

  constructor(private readonly d: StationEvaDeps) {
    this.root.visible = false;
    d.scene.add(this.root);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    this.tether = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf4f4f4 }));
    this.tether.name = "Cable de seguridad";
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.4), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.5 }));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.5 }));
    post.position.y = -0.45;
    this.apfr.add(plate, post);
    this.apfr.name = "APFR";
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2f36 }));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.24), new THREE.MeshStandardMaterial({ color: 0x56606e, metalness: 0.6 }));
    head.position.set(0, 0.1, 0.06);
    this.pgt.add(grip, head);
    this.pgt.name = "Llave PGT";
    this.part.visible = false;
    this.root.add(this.figure.root, this.rails, this.tether, this.apfr, this.pgt, this.part, this.label);
    this.hud = document.createElement("div");
    this.hud.className = "eva-st hidden";
    this.hud.setAttribute("aria-label", "Paseo espacial");
    this.hud.innerHTML = `<div class="es-hud"></div><p class="es-line"></p><div class="es-ctl"></div>`;
    d.root.appendChild(this.hud);
    const ctl = this.hud.querySelector<HTMLElement>(".es-ctl")!;
    ctl.addEventListener("pointerdown", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-es]")?.dataset.es;
      if (b === "atras") this.dir = -1;
      if (b === "avanzar") this.dir = 1;
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) ctl.addEventListener(ev, () => (this.dir = 0));
    ctl.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-es]")?.dataset.es;
      if (b) this.button(b);
    });
    window.addEventListener("pointerdown", (e) => {
      if (this.active && !(e.target as HTMLElement).closest?.(".es-ctl, .duel")) this.drag = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("pointermove", (e) => {
      if (!this.drag || !this.active) return;
      this.yaw -= (e.clientX - this.drag.x) * 0.006;
      this.pitch = Math.max(-1.2, Math.min(1.3, this.pitch + (e.clientY - this.drag.y) * 0.004));
      this.drag = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("pointerup", () => (this.drag = null));
  }

  /** In the suit (from donning to taking it off). */
  get suited(): boolean {
    return this.eva.phase !== "dentro";
  }

  /** The planned spacewalk's site. */
  private planned(): { site: EvaSite; id: string } | undefined {
    const j = this.d.work.evaJob;
    return j?.site ? { site: j.site, id: j.id } : undefined;
  }

  /** Quest's suits and EVA hatch (station-interior.ts `airlock`). */
  actions(f: Fixture): StationAction[] {
    const e = this.eva;
    const job = this.planned();
    if (f.id === "escotilla-eva") {
      if (e.phase === "fuera") return [{ id: "salir", label: "Salir por la escotilla EVA", enabled: !!job, ...(job ? {} : { why: "No hay trabajo planeado fuera" }) }];
      const why = e.phase === "despresurizando" ? `La esclusa se vacía: quedan ${Math.ceil(e.minutesLeft)} min` : e.phase === "represurizando" ? `La esclusa se llena: quedan ${Math.ceil(e.minutesLeft)} min` : "Cerrada: la esclusa de tripulación tiene aire (se abre con la esclusa vacía)";
      return [{ id: "salir", label: "Salir por la escotilla EVA", enabled: false, why }];
    }
    switch (e.phase) {
      case "dentro":
        return [{ id: "eva:traje", label: "Ponerse el EMU y prerrespirar (ISLE)", enabled: !!job, ...(job ? {} : { why: "No hay ningún paseo planeado: un cambio de pieza de fuera (alas, radiadores, escudos) se planea en el portátil de carga de Unity" }) }];
      case "traje":
      case "prerrespirando":
        return [{ id: "nada", label: "Prerrespirando (ISLE)", enabled: false, why: `Ejercicio suave dentro del traje: quedan ${Math.ceil(e.minutesLeft)} min de reloj de a bordo` }];
      case "listo":
        return [{ id: "despresurizar", label: "Despresurizar la esclusa de tripulación", enabled: true }, { id: "quitar", label: "Quitarse el EMU", enabled: true }];
      case "despresurizando":
        return [{ id: "nada", label: "Vaciando la esclusa", enabled: false, why: `Quedan ${Math.ceil(e.minutesLeft)} min` }];
      case "fuera":
        return [{ id: "nada", label: "La esclusa está vacía", enabled: false, why: "La escotilla EVA da al vacío: sal por ella" }];
      case "represurizando":
        return [{ id: "nada", label: "Llenando la esclusa", enabled: false, why: `Quedan ${Math.ceil(e.minutesLeft)} min` }];
      case "en-esclusa":
        return [{ id: "quitar", label: "Quitarse el EMU", enabled: true }];
    }
  }

  act(f: Fixture, id: string): void {
    if (id === "eva:traje") return void this.startDonning();
    if (id === "despresurizar") {
      const why = this.eva.depress();
      return this.d.say(why ?? `La esclusa de tripulación baja de 10,2 psi al vacío: ${QUEST_EVA.depressMin.value} min de reloj de a bordo. El EMU ya va con su propio oxígeno`, 6);
    }
    if (id === "quitar") {
      const why = this.eva.doff();
      this.d.inside.suited = this.suited;
      return this.d.say(why ?? "EMU fuera y a recargar: oxígeno, agua y batería otra vez llenos", 5);
    }
    if (id === "salir") return this.goOut();
    void f;
  }

  /** The task list's spacewalk (at Quest's suits). */
  taskFacts(): { id: string; title: string; detail: string; category: "estacion"; area: string }[] {
    const j = this.d.work.evaJob;
    return j ? [{ id: j.id, title: j.title, detail: `Quest · ${EVA_JOBS[j.site!].how}`, category: "estacion", area: "trajes" }] : [];
  }

  /** «Ir» to the spacewalk: at the suits, the donning starts. */
  startChore(id: string): boolean {
    if (!id.startsWith("eva:")) return false;
    if (this.eva.phase === "dentro") this.startDonning();
    else this.d.say(`Paseo en marcha: ${this.eva.phase === "prerrespirando" ? `prerrespirando, quedan ${Math.ceil(this.eva.minutesLeft)} min` : this.eva.phase}`, 5);
    return true;
  }

  /** The EMU on, at the suits: each step acted out there; then the ISLE starts on the board clock. */
  private startDonning(): void {
    if (this.d.duel.visible || !this.planned()) return;
    const chore = donningChore();
    const acts: StepAct[][] = [
      [{ action: "revisar", place: "objetivo" }, { action: "gesto", place: "objetivo" }, { action: "gesto", place: "objetivo" }, { action: "revisar", place: "objetivo" }, { action: "programar", place: "objetivo" }],
      [{ action: "entrenar", place: "objetivo" }],
    ];
    const visual = this.d.inside.stepVisual("trajes", (i) => acts[i] ?? []);
    this.openSheet(chore, visual, (ok) => {
      if (!ok) return this.d.say("No salió: sigues sin traje", 5);
      this.eva.suitUp();
      this.eva.prebreathe();
      this.d.inside.suited = true;
      this.d.say(`EMU puesto. Prerrespiración ISLE: ${QUEST_EVA.maskMin.value} min de mascarilla y ${QUEST_EVA.inSuitMin.value} min en el traje con ejercicio suave (${PREBREATHE_MIN} min de reloj de a bordo)`, 8);
    });
  }

  private openSheet(chore: Chore, visual: { stepDone(i: number): void; partDone?(i: number, p: number): void; clear(): void } | undefined, done: (ok: boolean) => void): void {
    const run = new ChoreRun(chore);
    this.session = { chore, run };
    const prev = this.d.duel.onClose;
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.d.duel.onRightPick = undefined;
      visual?.clear();
      this.session = null;
      done(run.status === "done");
    };
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
      { ...TEXT, title: chore.title },
      (ans: Answer) => {
        const index = run.step;
        const ok = run.submit(ans);
        if (ok) visual?.stepDone(index);
        return { ok };
      },
    );
    if (visual?.partDone)
      this.d.duel.onRightPick = (id, slot) => {
        if (run.current?.id === id) visual.partDone?.(run.step, slot);
      };
  }

  /** Out through the EVA hatch, hooked to it, on the planned job's handrail route. */
  private goOut(): void {
    const job = this.planned();
    if (!job) return;
    const why = this.eva.egress(EVA_ROUTES[job.site]);
    if (why) return this.d.say(why, 5);
    this.site = job.site;
    this.jobDone = false;
    this.buildRoute();
    this.d.inside.suspend();
    this.active = true;
    this.root.visible = true;
    this.hud.classList.remove("hidden");
    document.body.classList.add("in-station-eva");
    this.eyeNow.set(0, 0, 0);
    this.d.say("Fuera. El cable de seguridad de 85 pies va enganchado a la escotilla; el de cintura, al asidero. Avanza mano sobre mano", 7);
  }

  /** Back in: the hatch closes, the crew lock fills, she is in Quest. */
  private goIn(): void {
    const why = this.eva.ingress();
    if (why) return this.d.say(why, 4);
    this.active = false;
    this.root.visible = false;
    this.hud.classList.add("hidden");
    document.body.classList.remove("in-station-eva");
    this.d.inside.resume();
    this.d.inside.placeAt("escotilla-eva");
    this.d.inside.suited = true;
    this.d.say(`Dentro de Quest: escotilla cerrada, la esclusa se llena (${QUEST_EVA.repressMin.value} min). Fuera: ${hm(this.eva.outsideMin)}`, 7);
  }

  /** The yellow handrails along the route and the anchors. */
  private buildRoute(): void {
    for (const c of [...this.rails.children]) this.rails.remove(c);
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6 });
    const r = this.eva.route;
    for (let i = 1; i < r.length; i++) {
      const a = v3(r[i - 1]!.at);
      const b = v3(r[i]!.at);
      const na = outward(a);
      const nb = outward(b);
      const pa = a.clone().addScaledVector(na, -0.3);
      const pb = b.clone().addScaledVector(nb, -0.3);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, pa.distanceTo(pb), 6), yellow);
      m.position.copy(pa).add(pb).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
      m.name = "Asidero";
      this.rails.add(m);
    }
    r.forEach((p, i) => {
      if (!p.anchor) return;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), new THREE.MeshStandardMaterial({ color: 0xff7a3a, emissive: 0x331100 }));
      ring.position.copy(v3(p.at)).addScaledVector(outward(v3(p.at)), -0.25);
      ring.name = i === 0 ? "Anclaje de la escotilla" : `Anclaje · ${p.label}`;
      this.rails.add(ring);
      const s = sceneLabel(i === 0 ? "Anclaje · escotilla EVA" : `Anclaje · ${p.label}`, 0.032);
      s.position.copy(ring.position).addScaledVector(outward(v3(p.at)), 0.6);
      this.rails.add(s);
    });
    const end = v3(r[r.length - 1]!.at);
    const n = outward(end);
    this.apfr.position.copy(end).addScaledVector(n, -0.2);
    this.apfr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const site = sceneLabel(`Sitio de trabajo · ${r[r.length - 1]!.label}`, 0.032);
    site.position.copy(end).addScaledVector(n, 1.8);
    this.rails.add(site);
    this.part.visible = false;
  }

  private button(b: string): void {
    const e = this.eva;
    if (b === "enganchar") return this.d.say(e.swapTether() ?? `Cable de seguridad enganchado aquí: ${e.route[e.anchor]!.label}. Puedes alejarte otros ${SAFETY_TETHER_M.value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} m`, 5);
    if (b === "pies") return this.d.say(e.setFeet(!e.feetIn) ?? (e.feetIn ? "Pies en el APFR, sobre su interfaz del sitio de trabajo: las manos quedan libres" : "Pies fuera del APFR"), 4);
    if (b === "trabajar") return this.startJob();
    if (b === "entrar") return this.goIn();
  }

  /** The job at the worksite: a challenge whose steps play there. */
  private startJob(): void {
    if (!this.site || this.d.duel.visible) return;
    if (!this.eva.feetIn) return this.d.say("Primero los pies en el APFR", 4);
    if (this.jobDone) return this.d.say("Trabajo hecho: vuelve a Quest", 4);
    const chore = jobChore(this.site, { o2H: this.eva.suit.timeLeftS / 3600 });
    const job = EVA_JOBS[this.site];
    const moves = (i: number): WorkMove[] => {
      const ex = chore.exercises[i];
      if (!ex || ex.kind === "choice") return ["comprobar"];
      return ex.solution.map((id) => workMove(ex.blocks.find((x) => x.id === id)?.pseudo ?? ""));
    };
    let picked = { index: -1, n: 0 };
    const queue: WorkMove[] = [];
    this.playQueue = queue;
    this.openSheet(
      chore,
      {
        stepDone: (i) => {
          queue.push(...moves(i).slice(picked.index === i ? picked.n : 0));
          picked = { index: -1, n: 0 };
        },
        partDone: (i, p) => {
          const m = moves(i)[p];
          if (m) queue.push(m);
          picked = { index: i, n: p + 1 };
        },
        clear: () => {
          queue.length = 0;
          this.working = null;
          this.figure.pose("stand");
        },
      },
      (ok) => {
        if (!ok) return this.d.say("No salió: la pieza sigue como estaba. Puedes intentarlo otra vez", 5);
        this.jobDone = true;
        const j = this.d.work.job(`eva:${this.site}`);
        this.d.work.complete(`eva:${this.site}`);
        const said = j?.componentId ? this.d.fitComponent(j.componentId) : job.title;
        this.d.say(`${said}. Recoge las herramientas y vuelve a Quest`, 7);
      },
    );
  }
  private playQueue: WorkMove[] = [];

  /** Board hours pass. */
  tick(hours: number): void {
    const before = this.eva.phase;
    this.eva.tick(hours * 60, this.active && (this.dir !== 0 || !!this.working));
    const now = this.eva.phase;
    if (before !== now) {
      if (now === "listo") this.d.say("Prerrespiración terminada: ya puedes despresurizar la esclusa de tripulación", 6);
      if (now === "fuera" && before === "despresurizando") this.d.say("Esclusa vacía: la escotilla EVA se puede abrir", 6);
      if (now === "en-esclusa") this.d.say("Esclusa a presión: quítate el EMU en los trajes", 6);
    }
    this.d.inside.suited = this.suited;
    if (this.active && this.eva.suit.status === "volver") this.line = "⚠ Queda poco margen de oxígeno: vuelve a Quest";
  }
  private line = "";

  /** Each frame while outside. */
  update(dt: number): void {
    if (!this.active) return;
    const e = this.eva;
    this.root.position.copy(this.d.station.position);
    this.root.quaternion.copy(this.d.station.quaternion);
    if (this.dir && !this.d.duel.visible) {
      const why = e.move(this.dir * QUEST_EVA.translateMs.value * dt);
      if (why) this.line = why;
      this.crawlPhase += dt * 4;
    }
    const p = v3(e.position());
    const n = outward(p);
    const head = v3(e.heading());
    this.posNow.lerp(p, this.posNow.lengthSq() === 0 ? 1 : 0.3);
    this.placeFigure(n, head, dt);
    this.playWork(dt);
    // The safety tether from its anchor to her waist.
    const anchor = v3(e.route[e.anchor]!.at).addScaledVector(outward(v3(e.route[e.anchor]!.at)), -0.25);
    const g = this.tether.geometry as THREE.BufferGeometry;
    g.setFromPoints([anchor, this.figure.root.position.clone().addScaledVector(n, 0.2)]);
    this.label.position.copy(this.figure.root.position).addScaledVector(n, 2.2);
    this.frameCamera(n, head);
    this.renderHud();
  }

  /** Her body: along the handrail, facing the hull, or standing in the APFR facing the work. */
  private placeFigure(n: THREE.Vector3, head: THREE.Vector3, dt: number): void {
    const f = this.figure;
    const e = this.eva;
    if (e.feetIn) {
      f.root.position.copy(this.apfr.position).addScaledVector(n, 0.05);
      const fwd = head.clone().projectOnPlane(n).normalize();
      f.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(n, fwd).normalize(), n, fwd));
      if (!this.working) f.poseAngles(P({ shoulderX: [-0.6, -0.6], elbow: [-0.6, -0.6] }));
      this.pgt.visible = true;
    } else {
      // Lying along the rail: head toward where she goes, front to the hull, hands on the rail.
      const along = this.dir < 0 ? head.clone().negate() : head.clone();
      const up = along.clone().projectOnPlane(n).normalize();
      const front = n.clone().negate();
      const right = new THREE.Vector3().crossVectors(up, front).normalize();
      f.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, front));
      f.root.position.copy(this.posNow).addScaledVector(up, -0.9).addScaledVector(n, 0.1);
      const s = Math.sin(this.crawlPhase) * (this.dir ? 0.35 : 0);
      f.poseAngles(P({ headX: -0.5, shoulderX: [-2.7 + s, -2.7 - s], shoulderZ: [0.15, -0.15], elbow: [-0.3, -0.3], hip: [0.05, 0.05], knee: [0.2, 0.25] }));
      this.pgt.visible = false;
    }
    f.update(dt, 6);
    this.root.updateMatrixWorld(true);
    if (this.pgt.visible) {
      const h = f.handWorld(1, new THREE.Vector3());
      this.pgt.position.copy(this.root.worldToLocal(h));
      this.pgt.quaternion.copy(f.root.quaternion);
    }
  }

  /** The job's step on stage: Canadarm2 brings the part, she tethers it, the PGT turns, she checks. */
  private playWork(dt: number): void {
    const f = this.figure;
    if (!this.working && this.playQueue.length) {
      const move = this.playQueue.shift()!;
      const n = outward(this.apfr.position);
      const front = this.apfr.position.clone().addScaledVector(n, 1.0).add(this.toWork().multiplyScalar(0.7));
      const ef = v3(GRAPPLE_FIXTURES.find((g) => g.id === "jem-ef")!.at);
      const from = move === "brazo" ? ef.clone().add(new THREE.Vector3(0, 1.5, 0)) : this.part.position.clone();
      const to = move === "brazo" ? front.clone().addScaledVector(this.toWork(), 0.4).addScaledVector(n, 0.3) : front;
      this.part.visible = true;
      if (move === "brazo") this.part.position.copy(from);
      this.working = { move, t: 0, dur: move === "brazo" ? 3.6 : 2.4, from, to };
      this.lastMove = move;
    }
    const a = this.working;
    if (!a) return;
    a.t = Math.min(a.dur, a.t + dt);
    const k = a.t / a.dur;
    const e = k * k * (3 - 2 * k);
    this.part.position.lerpVectors(a.from, a.to, e);
    if (a.move === "brazo") this.d.outside.armShow.reachTo(this.part.position.clone().add(new THREE.Vector3(0, 0.6, 0)));
    const wob = Math.sin(a.t * 10) * 0.25;
    const pose = {
      brazo: P({ headX: -0.3, shoulderX: [-1.6, -0.6], elbow: [-0.3, -0.6] }),
      atar: P({ torso: 0.2, shoulderX: [-1.3 + wob, -1.3 - wob], elbow: [-0.9, -0.9] }),
      llave: P({ torso: 0.25, shoulderX: [-0.9, -1.5 + wob], elbow: [-0.9, -0.4] }),
      llevar: P({ torso: 0.1, shoulderX: [-1.5, -1.5], elbow: [-0.5, -0.5] }),
      comprobar: P({ headX: 0.3, shoulderX: [-1.0, -0.4], elbow: [-1.4, -0.3] }),
    }[a.move];
    f.poseAngles(pose);
    if (a.t >= a.dur) this.working = null;
  }

  /** From her APFR toward the work (along the route's last leg). */
  private toWork(): THREE.Vector3 {
    return v3(this.eva.heading()).projectOnPlane(outward(this.apfr.position)).normalize();
  }

  /** Behind and above her, turned by dragging; in a challenge, framed in the strip above the sheet. */
  private frameCamera(n: THREE.Vector3, head: THREE.Vector3): void {
    const at = this.eva.feetIn ? this.apfr.position.clone().addScaledVector(n, 1.0).addScaledVector(this.toWork(), 0.5) : this.figure.root.position.clone().addScaledVector(n, 0.3);
    const back = head.clone().negate();
    const side = new THREE.Vector3().crossVectors(n, back).normalize();
    const rot = new THREE.Quaternion().setFromAxisAngle(n, this.yaw);
    const off = back.multiplyScalar(Math.cos(this.pitch)).addScaledVector(n, Math.sin(this.pitch) + 0.2).addScaledVector(side, 0.35).applyQuaternion(rot).normalize().multiplyScalar(this.d.duel.visible ? 3.6 : 4.5);
    let eye = at.clone().add(off);
    // Never inside the station: pull in along the line until it is clear.
    for (let i = 0; i < 8 && insideStation(V(eye), POLANA_LAYOUT, -0.3); i++) eye = at.clone().addScaledVector(off, 1 - (i + 1) * 0.11);
    this.eyeNow.lerp(eye, this.eyeNow.lengthSq() === 0 ? 1 : 0.15);
    this.root.updateMatrixWorld(true);
    const c = this.camera;
    c.position.copy(this.root.localToWorld(this.eyeNow.clone()));
    c.up.copy(n).applyQuaternion(this.root.quaternion);
    c.lookAt(this.root.localToWorld(at.clone()));
    const canvas = document.querySelector("canvas")?.getBoundingClientRect();
    const W = canvas?.width ?? innerWidth;
    const H = canvas?.height ?? innerHeight;
    const sheet = [...document.querySelectorAll<HTMLElement>(".duel.sheet")].find((x) => !x.classList.contains("hidden"))?.getBoundingClientRect();
    const top = sheet && sheet.top > 60 ? sheet.top : H;
    c.aspect = W / H;
    if (top < H) c.setViewOffset(W, H, 0, (H - top) / 2, W, H);
    else c.clearViewOffset();
    c.updateProjectionMatrix();
  }

  private hudKey = "";
  private renderHud(): void {
    const e = this.eva;
    const s = e.suit;
    const o2Min = (s.timeLeftS / 60) | 0;
    const low = s.status !== "nominal";
    const cells = [
      `<span class="${low ? "low" : ""}">O₂ ${hm(o2Min)}${low ? " ⚠" : ""}</span>`,
      `<span>CO₂ (METOX) ${pct(s.co2Scrubber)}</span>`,
      `<span>Batería ${pct(s.battery)}</span>`,
      `<span>Fuera ${hm(e.outsideMin)}</span>`,
      `<span>Cable ${e.tetherOut.toLocaleString("es-ES", { maximumFractionDigits: 1 })} / ${SAFETY_TETHER_M.value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} m</span>`,
    ].join("");
    const at = e.atPoint;
    const canHook = at !== undefined && !!e.route[at]?.anchor && at !== e.anchor;
    const b = (id: string, label: string, on = true, primary = false) => `<button data-es="${id}" ${on ? "" : "disabled"} class="${primary ? "primary" : ""}">${label}</button>`;
    const ctl = [
      e.feetIn ? "" : b("atras", "◀ Atrás", !e.atHatch),
      e.feetIn ? "" : b("avanzar", "Avanzar ▶", !e.atWorksite),
      canHook ? b("enganchar", "Enganchar el cable aquí", true, true) : "",
      e.atWorksite ? b("pies", e.feetIn ? "Sacar los pies del APFR" : "Pies en el APFR", true, !e.feetIn && !this.jobDone) : "",
      e.feetIn && !this.jobDone ? b("trabajar", `Trabajar: ${EVA_JOBS[this.site!].title.toLowerCase()}`, true, true) : "",
      e.atHatch ? b("entrar", "Entrar en Quest", true, this.jobDone) : "",
    ].join("");
    const where = at !== undefined ? e.route[at]!.label : `${e.s.toLocaleString("es-ES", { maximumFractionDigits: 0 })} de ${e.length.toLocaleString("es-ES", { maximumFractionDigits: 0 })} m de asideros`;
    const line = this.line || where;
    const key = cells + ctl + line;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.hud.querySelector(".es-hud")!.innerHTML = cells;
    this.hud.querySelector(".es-line")!.textContent = line;
    // Rebuilding the buttons under a held finger would drop the hold: only when they change.
    const c = this.hud.querySelector(".es-ctl")!;
    if (c.getAttribute("data-k") !== ctl) {
      c.innerHTML = ctl;
      c.setAttribute("data-k", ctl);
    }
    this.line = "";
  }

  /** The live audit of the job's step on stage (tools/experiencia/brazo-eva.mjs). */
  audit(sheetTop: number): EvaAudit | undefined {
    if (!this.active) return undefined;
    const canvas = document.querySelector("canvas")?.getBoundingClientRect();
    const size = { w: canvas?.width ?? innerWidth, h: canvas?.height ?? innerHeight };
    this.root.updateMatrixWorld(true);
    const seen = (o: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(o);
      if (box.isEmpty()) return 0;
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3()).multiplyScalar(0.35);
      const pts = [c, ...[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d) => c.clone().add(new THREE.Vector3(d[0]! * s.x, d[1]! * s.y, d[2]! * s.z)))];
      const solids: THREE.Object3D[] = [];
      const own = new Set<THREE.Object3D>();
      o.traverse((x) => own.add(x));
      this.d.station.traverse((x) => {
        const m = x as THREE.Mesh;
        if (m.isMesh && !own.has(m)) solids.push(m);
      });
      const ray = new THREE.Raycaster();
      let n = 0;
      for (const p of pts) {
        const q = p.clone().project(this.camera);
        const x = ((q.x + 1) / 2) * size.w;
        const y = ((1 - q.y) / 2) * size.h;
        if (q.z > 1 || x < 0 || x > size.w || y < 0 || y > sheetTop) continue;
        ray.set(this.camera.position, p.clone().sub(this.camera.position).normalize());
        ray.far = this.camera.position.distanceTo(p) - 0.05;
        if (!ray.intersectObjects(solids, false).length) n++;
      }
      return Math.round((n / pts.length) * 100) / 100;
    };
    const hands = [0, 1].map((i) => this.root.worldToLocal(this.figure.handWorld(i as 0 | 1, new THREE.Vector3())));
    const partBox = new THREE.Box3().setFromObject(this.part).applyMatrix4(this.root.matrixWorld.clone().invert());
    const handToProp = this.part.visible ? Math.min(...hands.map((h) => partBox.distanceToPoint(h))) : 0;
    const through: string[] = [];
    const check = (what: string, p: THREE.Vector3) => {
      const w = insideStation(V(p), POLANA_LAYOUT, 0.1);
      if (w) through.push(`${what} · ${w}`);
    };
    check("Doménica", this.figure.root.position.clone().addScaledVector(outward(this.figure.root.position), 0.3));
    for (const h of hands) check("mano", h);
    if (this.part.visible) check("pieza", partBox.getCenter(new THREE.Vector3()));
    return {
      site: this.site ?? "",
      move: this.lastMove,
      playing: !!this.working,
      figureSeen: seen(this.figure.root),
      propSeen: this.part.visible ? seen(this.part) : 1,
      handToProp: Math.round(handToProp * 100) / 100,
      through: [...new Set(through)],
      gesture: true,
    };
  }
}
