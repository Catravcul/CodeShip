import * as THREE from "three";
import { CameraStick } from "../input/camera-stick";

/**
 * The dry dock's cameras (docs/design/dique-seco.md): from the hangar console or the window of the
 * mothership's docking hatch, the outside of the station seen full screen: the open truss cradle and,
 * when she is in, the mothership held by its arms. The camera joystick turns the view round the dock. A DOM frame
 * carries the title, a line of status and «×».
 */
export class DockView {
  readonly camera = new THREE.PerspectiveCamera(55, 1, 1, 2e5);
  private readonly frame: HTMLElement;
  private readonly title: HTMLElement;
  private readonly status: HTMLElement;
  private yaw = 0.75;
  private pitch = 0.32;
  private readonly camStick: CameraStick;
  /** Takes the joystick's turn first (true: taken), e.g. to turn round what an arm challenge frames. */
  steer?: (yaw: number, pitch: number) => boolean;
  open = false;
  onClose?: () => void;

  constructor(
    root: HTMLElement,
    /** The station's frame in the world (its model's root). */
    private readonly station: THREE.Object3D,
    /** Centre of the dock (station frame) and how far out the camera sits, m. */
    private readonly centre: THREE.Vector3,
    private readonly distanceM: number,
    label = "Cámaras del dique seco",
  ) {
    this.frame = document.createElement("div");
    this.frame.className = "dock-view";
    this.frame.setAttribute("role", "dialog");
    this.frame.setAttribute("aria-label", label);
    this.frame.innerHTML = `<div class="dv-head"><b class="dv-title"></b><button class="dv-close" aria-label="Cerrar la vista de fuera">×</button></div><p class="dv-status"></p>`;
    root.appendChild(this.frame);
    this.title = this.frame.querySelector(".dv-title")!;
    this.status = this.frame.querySelector(".dv-status")!;
    this.frame.querySelector(".dv-close")!.addEventListener("click", () => this.close());
    // Its camera joystick turns the view (reglas.md §5.7: never a drag on the screen); it stays during an arm
    // challenge, in the scene above the sheet, where `steer` may take the turn (station-outside.ts).
    this.camStick = new CameraStick(root, "dock-look", (yaw, pitch) => {
      if (this.steer?.(yaw, pitch)) return;
      this.turn(yaw, pitch);
    }, { duringChallenge: true });
  }

  show(title: string): void {
    this.title.textContent = title;
    this.open = true;
    this.frame.classList.add("on");
    this.camStick.show(true);
    document.body.classList.add("in-dock-view");
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.frame.classList.remove("on");
    this.camStick.show(false);
    document.body.classList.remove("in-dock-view");
    this.onClose?.();
  }

  /** Turn the view round the dock (radians; + yaw turns left, + pitch looks from higher). */
  turn(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - dPitch));
  }

  /** The line under the title (who is in the dock, what holds her). */
  say(text: string): void {
    if (this.status.textContent !== text) this.status.textContent = text;
  }

  /** Place the camera round the dock (station frame turned into the world) for this frame. */
  aim(): void {
    this.station.updateMatrixWorld();
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.distanceM);
    const eye = this.station.localToWorld(this.centre.clone().add(off));
    const at = this.station.localToWorld(this.centre.clone());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.station.getWorldQuaternion(new THREE.Quaternion()));
    this.camera.position.copy(eye);
    this.camera.up.copy(up);
    this.camera.lookAt(at);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
