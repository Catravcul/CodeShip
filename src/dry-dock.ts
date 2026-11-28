import * as THREE from "three";
import type { DryDock } from "@modules/station/domain/dry-dock";
import { DryDockModel } from "./adapters/three/dry-dock-model";
import { DockView } from "./adapters/three/dock-view";

/**
 * The station's dry dock (docs/design/dique-seco.md): its model in the space scene, kept on the
 * station's pose, with the arms and floodlights following the mothership; and its cameras, opened
 * from the hangar console or the window of the mothership's docking hatch.
 */
export class DryDockStage {
  readonly model: DryDockModel;
  readonly view: DockView;

  constructor(
    root: HTMLElement,
    scene: THREE.Scene,
    private readonly station: THREE.Object3D,
    private readonly dock: DryDock,
    private readonly facts: { berthed(): boolean; approaching(): boolean; shipName: string },
  ) {
    this.model = new DryDockModel(dock);
    scene.add(this.model.root);
    // Centre of the cradle in the station's frame: the frame runs along −z from node 2.
    const mid = (dock.beams[0]!.from.z + dock.beams[0]!.to.z) / 2;
    this.view = new DockView(root, station, new THREE.Vector3(0, 0, mid), dock.halfWidthM * 4.4);
  }

  /** Open the cameras: `from` names where she watches from. */
  open(from: "hangar" | "ventanilla"): void {
    this.view.show(from === "hangar" ? "Dique seco · cámaras del hangar" : "Dique seco · por la ventanilla de la escotilla");
  }

  get viewing(): boolean {
    return this.view.open;
  }

  /** Each frame: follow the station, move the arms and lights, and say what the dock holds. */
  update(dtS: number): void {
    this.model.root.position.copy(this.station.position);
    this.model.root.quaternion.copy(this.station.quaternion);
    const berthed = this.facts.berthed();
    const coming = this.facts.approaching();
    this.model.update(dtS, berthed, coming);
    if (!this.view.open) return;
    const L = Math.round(this.dock.toM - this.dock.fromM);
    const W = Math.round(2 * this.dock.halfWidthM);
    this.view.say(
      berthed
        ? `${this.facts.shipName} está en el dique: ${this.model.holding > 0.95 ? "brazos cerrados en la espina, umbilicales de energía, datos y xenón conectados" : "los brazos se cierran sobre la espina"}. Celosía abierta de ${W} × ${W} × ${L} m, sin presurizar`
        : coming
          ? `${this.facts.shipName} viene hacia el dique: focos encendidos`
          : `Dique vacío: celosía abierta de ${W} × ${W} × ${L} m para la nodriza, al vacío como la celosía de la ISS`,
    );
    this.view.aim();
  }
}
