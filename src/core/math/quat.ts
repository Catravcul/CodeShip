import { Vec3 } from "./vec3";

/** Immutable unit quaternion for orientation (body frame -> world frame). */
export class Quat {
  static readonly IDENTITY = new Quat(1, 0, 0, 0);

  constructor(
    readonly w: number,
    readonly x: number,
    readonly y: number,
    readonly z: number,
  ) {}

  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    const a = axis.normalize();
    const s = Math.sin(angle / 2);
    return new Quat(Math.cos(angle / 2), a.x * s, a.y * s, a.z * s);
  }

  /** Hamilton product: (this * o) applies o first, then this. */
  multiply(o: Quat): Quat {
    return new Quat(
      this.w * o.w - this.x * o.x - this.y * o.y - this.z * o.z,
      this.w * o.x + this.x * o.w + this.y * o.z - this.z * o.y,
      this.w * o.y - this.x * o.z + this.y * o.w + this.z * o.x,
      this.w * o.z + this.x * o.y - this.y * o.x + this.z * o.w,
    );
  }

  conjugate(): Quat {
    return new Quat(this.w, -this.x, -this.y, -this.z);
  }

  normalize(): Quat {
    const n = Math.hypot(this.w, this.x, this.y, this.z);
    return new Quat(this.w / n, this.x / n, this.y / n, this.z / n);
  }

  /** Rotates a vector from body frame to world frame. */
  rotate(v: Vec3): Vec3 {
    const u = new Vec3(this.x, this.y, this.z);
    const t = u.cross(v).scale(2);
    return v.add(t.scale(this.w)).add(u.cross(t));
  }

  /** Advances orientation by a body-frame angular velocity (rad/s) over dt seconds. Exact for constant ω. */
  integrate(omegaBody: Vec3, dt: number): Quat {
    const angle = omegaBody.length() * dt;
    if (angle === 0) return this;
    return this.multiply(Quat.fromAxisAngle(omegaBody, angle)).normalize();
  }
}
