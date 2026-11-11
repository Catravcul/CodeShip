/** Immutable 3D vector. Domain-only: no rendering library depends on it or vice versa. */
export class Vec3 {
  static readonly ZERO = new Vec3(0, 0, 0);
  static readonly X = new Vec3(1, 0, 0);
  static readonly Y = new Vec3(0, 1, 0);
  static readonly Z = new Vec3(0, 0, 1);

  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
  ) {}

  add(o: Vec3): Vec3 {
    return new Vec3(this.x + o.x, this.y + o.y, this.z + o.z);
  }
  sub(o: Vec3): Vec3 {
    return new Vec3(this.x - o.x, this.y - o.y, this.z - o.z);
  }
  scale(k: number): Vec3 {
    return new Vec3(this.x * k, this.y * k, this.z * k);
  }
  /** Component-wise product. */
  mul(o: Vec3): Vec3 {
    return new Vec3(this.x * o.x, this.y * o.y, this.z * o.z);
  }
  /** Component-wise division. */
  div(o: Vec3): Vec3 {
    return new Vec3(this.x / o.x, this.y / o.y, this.z / o.z);
  }
  dot(o: Vec3): number {
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }
  cross(o: Vec3): Vec3 {
    return new Vec3(this.y * o.z - this.z * o.y, this.z * o.x - this.x * o.z, this.x * o.y - this.y * o.x);
  }
  length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }
  normalize(): Vec3 {
    const l = this.length();
    return l === 0 ? Vec3.ZERO : this.scale(1 / l);
  }
}
