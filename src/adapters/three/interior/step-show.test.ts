import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { galleyFrame, gesture, kitchenLayout, poseDistance, StepShow, type KitchenSpot } from "./step-show";
import { auditStep, REACH_M } from "./step-audit";
import { CubeFigure, P } from "./figure";
import { GALLEY, STATIONS } from "./room";
import type { StepAct, StepAction } from "@modules/chores/domain/step-visual";

const ACTIONS: StepAction[] = ["tomar", "lavar", "cortar", "cascar", "batir", "remover", "verter", "calentar", "hervir", "hornear", "moler", "amasar", "sazonar", "reposar", "emplatar", "regar", "agitar", "cosechar", "servir", "mimar", "jugar", "programar", "revisar", "reparar", "curar", "entrenar"];

/** Plays `act` in the galley frame for `seconds`, returning the show, the figure and the camera. */
function play(act: StepAct, seconds: number, station: "cocina" | "procesado" = "cocina", k = kitchenLayout()) {
  const show = new StepShow();
  show.begin(galleyFrame(k, STATIONS.find((s) => s.id === station)!.look));
  show.play([act]);
  const cam = new THREE.PerspectiveCamera(70, 390 / 664, 0.03, 120);
  const rig = new THREE.Group();
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
    for (const act of steps) {
      // Played to its end: she has walked to the spot and the props rest there.
      // Peanut butter is a process: it starts at the mill and soy corner.
      const { show } = play(act, 3, "procesado");
      const snap = show.snapshot()!;
      expect(snap.props.length, act.action).toBeGreaterThan(0);
      for (const { name, object } of snap.props) {
        const c = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
        const hand = Math.min(...snap.hands.map((h) => h.distanceTo(c)));
        expect(hand, `${act.action} · ${name}`).toBeLessThanOrEqual(REACH_M);
      }
    }
  });

  it("lo que saca de la nevera acaba en su mano, no en el otro extremo de la encimera", () => {
    const { show } = play({ action: "tomar", place: "nevera", tint: "huevo" }, 3);
    const snap = show.snapshot()!;
    for (const { object } of snap.props) expect(Math.min(...snap.hands.map((h) => h.distanceTo(object.position)))).toBeLessThan(0.15);
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
});
