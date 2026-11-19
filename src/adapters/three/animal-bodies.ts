import * as THREE from "three";
import { bodyPlan, gaitHz, jointAngle, type BodyKind, type BodyPart } from "@modules/sanctuary-one/domain/animal-body";
import type { ModelDef } from "@modules/sanctuary-one/data/catalog";

/**
 * The animals of a species drawn as jointed cube bodies (domain/animal-body.ts): one InstancedMesh per body part,
 * each copy posed every frame from its place, heading and the time of its gait. A herd of 30 is ~10 draw calls.
 */
export class AnimalHerd {
  readonly meshes: THREE.InstancedMesh[] = [];
  private readonly parts: readonly BodyPart[];
  private readonly size: THREE.Vector3;
  private readonly hz: number;
  private static readonly unit = new THREE.BoxGeometry(1, 1, 1);

  constructor(
    readonly d: ModelDef,
    count: number,
    tint?: number,
  ) {
    this.parts = bodyPlan(d.shape, d.id)!;
    this.size = new THREE.Vector3(d.size.x, d.size.y, d.size.z);
    this.hz = gaitHz(d.shape as BodyKind, Math.max(d.size.z, d.size.y));
    for (const p of this.parts) {
      const m = new THREE.InstancedMesh(AnimalHerd.unit, new THREE.MeshStandardMaterial({ color: p.color ?? tint ?? d.color, roughness: 0.9, metalness: 0 }), count);
      m.name = `animal-${d.id}-${p.name}`;
      m.userData = { category: d.category, group: d.group, model: d.id };
      m.frustumCulled = false;
      this.meshes.push(m);
    }
  }

  static has(d: ModelDef): boolean {
    return d.category === "animal" && !!bodyPlan(d.shape, d.id);
  }

  private static readonly B = new THREE.Matrix4();
  private static readonly J = new THREE.Matrix4();
  private static readonly M = new THREE.Matrix4();
  private static readonly q = new THREE.Quaternion();
  private static readonly v = new THREE.Vector3();
  private static readonly s = new THREE.Vector3();
  private static readonly axes = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

  /** Pose copy `i`: at (x, y, z) heading `yaw`, `t` seconds into its gait, moving or resting; `scale` its size. */
  pose(i: number, x: number, y: number, z: number, yaw: number, t: number, moving: boolean, scale = 1): void {
    const { B, J, M, q, v, s, axes } = AnimalHerd;
    q.setFromAxisAngle(axes.y, yaw);
    B.compose(v.set(x, y, z), q, s.set(scale, scale, scale));
    const S = this.size;
    this.parts.forEach((p, k) => {
      // Body → joint → its swing → the cube about the joint.
      J.makeTranslation(p.pivot[0] * S.x, p.pivot[1] * S.y, p.pivot[2] * S.z);
      M.multiplyMatrices(B, J);
      const a = jointAngle(p, t, this.hz, moving);
      if (a) M.multiply(J.makeRotationAxis(axes[p.swing!.axis], a));
      M.multiply(J.makeTranslation(p.box[0] * S.x, p.box[1] * S.y, p.box[2] * S.z));
      M.multiply(J.makeScale(p.box[3] * S.x, p.box[4] * S.y, p.box[5] * S.z));
      this.meshes[k]!.setMatrixAt(i, M);
    });
  }

  commit(): void {
    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
  }
}
