import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { AMBIENT, ambientOpacity, ambientVisible } from "@modules/notices/domain/notices";

interface Note {
  readonly text: string;
  readonly el: HTMLElement;
  readonly where: () => THREE.Vector3 | undefined;
  readonly born: number;
}

/** At most this many life-aboard labels at once (the oldest goes). */
const MAX_NOTES = 4;

/**
 * Life-aboard notices («Pepa le ladra a Nube») as small HUD-style labels floating where it happens,
 * shown only while that spot is in view (docs/design/ingravidez.md, «Avisos»). They never take the
 * player's toast (H24).
 */
export class AmbientNotices {
  private readonly el: HTMLElement;
  private readonly notes: Note[] = [];
  private readonly v = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "amb-notes";
    root.appendChild(this.el);
  }

  /** Something happened at `where` (a function: the animal may move while the label shows). */
  add(text: string, where: () => THREE.Vector3 | undefined, now: number): void {
    const same = this.notes.find((n) => n.text === text);
    if (same) this.drop(same);
    const el = document.createElement("div");
    el.className = "amb-note";
    el.textContent = text;
    this.el.appendChild(el);
    this.notes.push({ text, el, where, born: now });
    while (this.notes.length > MAX_NOTES) this.drop(this.notes[0]!);
  }

  clear(): void {
    while (this.notes.length) this.drop(this.notes[0]!);
  }

  /** Place the labels on screen: only those whose spot is in view (and `sameSpace` as the camera). */
  update(camera: THREE.PerspectiveCamera, sameSpace: (p: THREE.Vector3) => boolean, now: number): void {
    const cam = camera.position;
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const view = { position: new Vec3(cam.x, cam.y, cam.z), forward: new Vec3(fwd.x, fwd.y, fwd.z), up: new Vec3(up.x, up.y, up.z), fovY: THREE.MathUtils.degToRad(camera.fov), aspect: camera.aspect };
    for (const n of [...this.notes]) {
      const age = now - n.born;
      if (age >= AMBIENT.seconds) {
        this.drop(n);
        continue;
      }
      const p = n.where();
      const seen = !!p && ambientVisible(view, new Vec3(p.x, p.y, p.z), sameSpace(p));
      n.el.classList.toggle("on", seen);
      if (!seen || !p) continue;
      this.v.copy(p).project(camera);
      n.el.style.left = `${((this.v.x + 1) / 2) * 100}%`;
      n.el.style.top = `${((1 - this.v.y) / 2) * 100}%`;
      n.el.style.opacity = String(ambientOpacity(age));
    }
  }

  private drop(n: Note): void {
    n.el.remove();
    this.notes.splice(this.notes.indexOf(n), 1);
  }
}
