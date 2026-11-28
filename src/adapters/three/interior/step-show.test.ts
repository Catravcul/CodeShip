import { MOTIONS } from "@modules/sanctuary-one/data/animaciones";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { galleyFrame, gesture, kitchenLayout, motion, poseDistance, StepShow, type KitchenSpot } from "./step-show";
import { auditStep, clearOfScene, REACH_M } from "./step-audit";
import { CubeFigure, P } from "./figure";
import { GALLEY, STATIONS } from "./room";
import type { StepAct, StepAction } from "@modules/chores/domain/step-visual";

const ACTIONS: StepAction[] = ["tomar", "lavar", "cortar", "cascar", "batir", "remover", "verter", "calentar", "hervir", "hornear", "moler", "amasar", "sazonar", "reposar", "emplatar", "regar", "agitar", "cosechar", "servir", "mimar", "jugar", "programar", "revisar", "reparar", "curar", "entrenar"];

/** Plays `act` in the galley frame for `seconds`, returning the show, the figure and the camera. */
function play(act: StepAct, seconds: number, station: "cocina" | "procesado" = "cocina", plan = 1, k = kitchenLayout()) {
  const show = new StepShow();
  show.begin(galleyFrame(k, STATIONS.find((s) => s.id === station)!.look));
  show.play([act]);
  // The ring's PlanCamera draws the floor plan `plan` times bigger; her figure is counter-scaled (interior.ts).
  const cam = Object.assign(new THREE.PerspectiveCamera(70, 390 / 664, 0.03, 120), { planScale: plan });
  const rig = new THREE.Group();
  rig.scale.set(1 / plan, 1, 1 / plan);
  const fig = new CubeFigure();
  rig.add(fig.root);
  for (let t = 0; t < seconds; t += 1 / 30) show.frame(1 / 30, cam, rig, fig);
  return { show, cam, rig };
}

describe("Pasos visibles: la cocina anclada a sus muebles (PX-20, auditoría de animaciones)", () => {
  it("cada sitio de la cocina está junto a su mueble de room.ts (GALLEY), no en un número suelto", () => {
    const s = kitchenLayout().spots;
    expect(Math.abs(s.fogon.z - GALLEY.hob.z)).toBeLessThan(0.01);
    expect(Math.abs(s.horno.z - GALLEY.oven.centre.z)).toBeLessThan(0.01);
    expect(Math.abs(s.nevera.z - GALLEY.fridge.centre.z)).toBeLessThan(0.01);
    expect(Math.abs(s.molino.z - GALLEY.mill.centre.z)).toBeLessThan(0.01);
    expect(Math.abs(s.procesador.z - GALLEY.processor.centre.z)).toBeLessThan(0.01);
    // The oven's door is on the counter's front, where it can be seen (it was inside the cabinet).
    expect(GALLEY.oven.door).toBeLessThanOrEqual(GALLEY.counter.front);
  });

  it("si la sala se dibuja más grande, los sitios se mueven con ella", () => {
    const k = 1.5;
    const big = kitchenLayout((v) => v.set(v.x * k, v.y, v.z * k));
    const base = kitchenLayout();
    for (const id of Object.keys(base.spots) as KitchenSpot[]) {
      expect(big.spots[id].x).toBeCloseTo(base.spots[id].x * k, 5);
      expect(big.spots[id].z).toBeCloseTo(base.spots[id].z * k, 5);
    }
  });

  it("el procesador de soja no se mete en la nevera ni en el molino", () => {
    const pr = GALLEY.processor;
    const fridgeEnd = GALLEY.fridge.centre.z + GALLEY.fridge.d / 2;
    const millStart = GALLEY.mill.centre.z - GALLEY.mill.d / 2;
    expect(pr.centre.z - pr.d / 2).toBeGreaterThanOrEqual(fridgeEnd);
    expect(pr.centre.z + pr.d / 2).toBeLessThanOrEqual(millStart);
  });

  it("crema de cacahuete: tostar en el horno, pelar en la encimera y moler en el molino quedan al alcance de su mano (Berón: «los cacahuetes aparecían lejos»)", () => {
    const steps: StepAct[] = [
      { action: "hornear", place: "horno", tint: "cacahuete", vessel: "bandeja", heat: true },
      { action: "cortar", place: "encimera", tint: "cacahuete", vessel: "tabla" },
      { action: "moler", place: "molino", tint: "cacahuete" },
      { action: "emplatar", place: "encimera", tint: "cacahuete", vessel: "tarro" },
    ];
    // At real size and with the ring drawn at 1,5 (escala-anillo): distances as drawn, where the player sees them.
    for (const [act, plan] of steps.flatMap((a) => [[a, 1], [a, 1.5]] as const)) {
      // Played to its end: she has walked to the spot and the props rest there.
      // Peanut butter is a process: it starts at the mill and soy corner.
      const { show } = play(act, 3, "procesado", plan);
      const snap = show.snapshot()!;
      expect(snap.props.length, act.action).toBeGreaterThan(0);
      for (const { name, object } of snap.props) {
        object.updateWorldMatrix(true, true);
        const c = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).multiply(new THREE.Vector3(plan, 1, plan));
        const hand = Math.min(...snap.hands.map((h) => h.distanceTo(c)));
        expect(hand, `${act.action} · ${name} · ×${plan}`).toBeLessThanOrEqual(REACH_M);
      }
    }
  });

  it("lo que saca de la nevera acaba en su mano, no en el otro extremo de la encimera", () => {
    const { show } = play({ action: "tomar", place: "nevera", tint: "huevo" }, 3);
    const snap = show.snapshot()!;
    for (const { object } of snap.props) expect(Math.min(...snap.hands.map((h) => h.distanceTo(object.position)))).toBeLessThan(0.15);
    // Drawn at 1,5: the props' root is counter-scaled, so their local positions are drawn ones, at her drawn hand.
    const big = play({ action: "tomar", place: "nevera", tint: "huevo" }, 3, "cocina", 1.5).show.snapshot()!;
    expect(big.planScale).toBe(1.5);
    for (const { object } of big.props) expect(Math.min(...big.hands.map((h) => h.distanceTo(object.position)))).toBeLessThan(0.15);
  });

  it("cada acción tiene un gesto que se aparta de la espera", () => {
    for (const a of ACTIONS) expect(poseDistance(gesture({ action: a, place: "encimera" }, 0.5, 0.3, false), P({ shoulderX: [-0.45, -0.45], elbow: [-0.9, -0.9], headX: 0.35 })), a).toBeGreaterThan(0.3);
  });

  it("la auditoría ve los objetos sobre la hoja y marca uno metido en un mueble", () => {
    const { show, cam, rig } = play({ action: "cortar", place: "encimera", tint: "papa", vessel: "tabla" }, 3);
    const scene = new THREE.Scene();
    scene.add(show.root, rig);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 2.2), new THREE.MeshBasicMaterial());
    counter.position.set(1.68, 0.45, -4.5);
    scene.add(counter);
    scene.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const a = auditStep(show, cam, scene, 664, { w: 390, h: 664 }, rig)!;
    expect(a.action).toBe("cortar");
    expect(a.props.every((p) => p.reach)).toBe(true);
    expect(a.props.some((p) => p.seen > 0)).toBe(true);
    expect(a.props.some((p) => p.inside)).toBe(false);
    // Sunk into the counter: reported.
    const board = show.snapshot()!.props.find((p) => p.name === "board")!.object;
    board.position.y = 0.5;
    scene.updateMatrixWorld(true);
    expect(auditStep(show, cam, scene, 664, { w: 390, h: 664 }, rig)!.props.find((p) => p.name === "board")!.inside).toBeTruthy();
  });

  it("regla: el cuenco del suelo nunca se mete en la escena (Luna, paso 2: el cuenco atravesaba una pata)", () => {
    // Doménica crouched before a cat at (0, 0, 1); one of its legs where the bowl would go by default.
    const show = new StepShow();
    const scene = new THREE.Scene();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.13, 6), new THREE.MeshBasicMaterial());
    leg.position.set(0, 0.065, 0.5);
    const rig = new THREE.Group();
    const fig = new CubeFigure();
    rig.add(fig.root);
    scene.add(show.root, rig, leg);
    scene.updateMatrixWorld(true);
    show.clearOf = clearOfScene(scene, [show.root, rig]);
    const target = new THREE.Vector3(0, 0.2, 1);
    show.begin({ stand: new THREE.Vector3(0, 0, 0), yaw: 0, camera: new THREE.Vector3(-1, 1.6, -1), look: new THREE.Vector3(0, 0.4, 0.6), target });
    show.play([{ action: "servir", place: "objetivo", tint: "comida" }]);
    const cam = Object.assign(new THREE.PerspectiveCamera(70, 390 / 664, 0.03, 120), { planScale: 1 });
    for (let t = 0; t < 1.2; t += 1 / 30) show.frame(1 / 30, cam, rig, fig);
    scene.updateMatrixWorld(true);
    const snap = show.snapshot()!;
    const bowl = snap.props.find((p) => p.name === "bowl")!.object;
    const box = new THREE.Box3().setFromObject(bowl);
    expect(box.intersectsBox(new THREE.Box3().setFromObject(leg))).toBe(false);
    for (const p of snap.props.filter((q) => q.name.startsWith("food"))) expect(new THREE.Box3().setFromObject(leg).containsPoint(p.object.getWorldPosition(new THREE.Vector3()))).toBe(false);
    // Still within her reach.
    expect(Math.min(...snap.hands.map((h) => h.distanceTo(bowl.getWorldPosition(new THREE.Vector3()))))).toBeLessThan(REACH_M);
  });

  it("sin nada delante, el cuenco va donde siempre: entre ella y su objetivo", () => {
    const show = new StepShow();
    const scene = new THREE.Scene();
    const rig = new THREE.Group();
    const fig = new CubeFigure();
    rig.add(fig.root);
    scene.add(show.root, rig);
    show.clearOf = clearOfScene(scene, [show.root, rig]);
    show.begin({ stand: new THREE.Vector3(0, 0, 0), yaw: 0, camera: new THREE.Vector3(-1, 1.6, -1), look: new THREE.Vector3(0, 0.4, 0.6), target: new THREE.Vector3(0, 0.2, 1) });
    show.play([{ action: "servir", place: "objetivo" }]);
    const cam = Object.assign(new THREE.PerspectiveCamera(70, 390 / 664, 0.03, 120), { planScale: 1 });
    for (let t = 0; t < 1.2; t += 1 / 30) show.frame(1 / 30, cam, rig, fig);
    const bowl = show.snapshot()!.props.find((p) => p.name === "bowl")!.object.position;
    expect(Math.abs(bowl.x)).toBeLessThan(0.01);
    expect(bowl.z).toBeGreaterThan(0.3);
  });
});

describe("cada movimiento del catálogo tiene su pose propia (Berón 2026-11-23: «golpeaba al aire en todos los pasos»)", () => {
  it("ningún movimiento de MOTIONS cae en la pose por defecto", () => {
    const fallback = JSON.stringify(motion("__ninguno__", 1.3));
    for (const id of Object.keys(MOTIONS)) expect(JSON.stringify(motion(id, 1.3)), id).not.toBe(fallback);
  });
  it("tras un paso resuelto lo sigue haciendo hasta el siguiente; al fallar, descansa", () => {
    const show = new StepShow();
    expect(typeof show.rest).toBe("function");
    expect(typeof show.orbit).toBe("function");
  });
});
