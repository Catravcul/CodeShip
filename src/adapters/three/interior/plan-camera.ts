import * as THREE from "three";

/**
 * A camera that draws a room built at real size `k` times bigger on the floor plan (x and z), heights
 * unchanged (src/core/scale.ts, docs/design/escala.md «El anillo»). Everything stays in real metres (the
 * walking, the stations, the animals' wandering, the chore framing); only the view changes: with the
 * camera at real point p turned R, the view is R⁻¹ · S · T(−p) with S = (k, 1, k), as if the room had been
 * built k times bigger and the eye stood at S·p.
 *
 * `matrixWorld` stays the real one (positions, directions, raycasts against real geometry);
 * `matrixWorldInverse`, which the renderer, `Vector3.project` and frustum culling use, is the drawn one.
 * Lighting is done in view space, so a light's reach is in drawn metres (`scaleLights`).
 *
 * A thing that should keep its real size (a character, an animal, a plant) and turns only about y gets
 * `planCounterScale(k)` as its own scale: S commutes with a turn about y, so it is drawn at real size where
 * it stands.
 */
export class PlanCamera extends THREE.PerspectiveCamera {
  /** Floor-plan scale; 1 draws the room as built. */
  planScale = 1;
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly m = new THREE.Matrix4();

  override updateMatrixWorld(force?: boolean): void {
    super.updateMatrixWorld(force);
    this.applyPlan();
  }

  override updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void {
    super.updateWorldMatrix(updateParents, updateChildren);
    this.applyPlan();
  }

  /**
   * Aim at a real point as it is drawn: the turn is taken from the drawn direction, so the point shows where
   * it is aimed (the chore framing, the third-person camera and `faceTowards` aim with real points).
   */
  override lookAt(x: number | THREE.Vector3, y?: number, z?: number): void {
    const t = x instanceof THREE.Vector3 ? this.p.copy(x) : this.p.set(x, y ?? 0, z ?? 0);
    const k = this.planScale;
    const o = this.position;
    super.lookAt(o.x + k * (t.x - o.x), t.y, o.z + k * (t.z - o.z));
  }

  /** The drawn eye position (real x and z times the plan scale). */
  drawnPosition(out = new THREE.Vector3()): THREE.Vector3 {
    this.matrixWorld.decompose(this.p, this.q, this.s);
    return out.set(this.p.x * this.planScale, this.p.y, this.p.z * this.planScale);
  }

  private applyPlan(): void {
    const k = this.planScale;
    if (k === 1) return;
    this.matrixWorld.decompose(this.p, this.q, this.s);
    // R⁻¹ · S · T(−p)
    this.matrixWorldInverse.makeRotationFromQuaternion(this.q).transpose();
    this.matrixWorldInverse.multiply(this.m.makeScale(k, 1, k));
    this.matrixWorldInverse.multiply(this.m.makeTranslation(-this.p.x, -this.p.y, -this.p.z));
  }
}

/** The scale that keeps a thing at real size under a plan drawn `k` times bigger. */
export const planCounterScale = (k: number): THREE.Vector3 => new THREE.Vector3(1 / k, 1, 1 / k);
