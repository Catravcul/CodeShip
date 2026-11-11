import { seededRandom, valueNoise3 } from "./random";

export interface AsteroidShapeParams {
  seed: number;
  /** Extents in metres: x, y (spin axis), z. */
  size: { x: number; y: number; z: number };
  /** Icosphere subdivisions; 5 gives ~10k vertices. */
  detail: number;
  /** Equatorial ridge strength, 0..0.2. Bennu and Ryugu are "spinning tops". */
  ridge: number;
  /** Large-scale lumpiness, 0..0.3. */
  roughness: number;
  craters: number;
}

export interface ShapeMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

/** Unit icosphere with shared vertices. */
function icosphere(detail: number): { v: number[][]; f: number[][] } {
  const t = (1 + Math.sqrt(5)) / 2;
  const v: number[][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(normalize);
  let f = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let d = 0; d < detail; d++) {
    const cache = new Map<string, number>();
    const mid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let i = cache.get(key);
      if (i === undefined) {
        const p = v[a]!, q = v[b]!;
        i = v.push(normalize([(p[0]! + q[0]!) / 2, (p[1]! + q[1]!) / 2, (p[2]! + q[2]!) / 2])) - 1;
        cache.set(key, i);
      }
      return i;
    };
    f = f.flatMap(([a, b, c]) => {
      const ab = mid(a!, b!), bc = mid(b!, c!), ca = mid(c!, a!);
      return [[a!, ab, ca], [b!, bc, ab], [c!, ca, bc], [ab, bc, ca]];
    });
  }
  return { v, f };
}

function normalize(p: number[]): number[] {
  const l = Math.hypot(p[0]!, p[1]!, p[2]!);
  return [p[0]! / l, p[1]! / l, p[2]! / l];
}

type ShapeRadius = (x: number, y: number, z: number) => number;

/** Radius multiplier (≈1) for a unit direction, before scaling to the asteroid's extents. */
function shapeRadiusFn(p: AsteroidShapeParams): ShapeRadius {
  const rnd = seededRandom(p.seed);
  const noise = valueNoise3(p.seed);
  const craters = Array.from({ length: p.craters }, () => {
    const dir = normalize([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    const radius = 0.05 + Math.pow(rnd(), 3) * 0.3; // many small, few large (angular radius, rad)
    return { dir, radius, depth: radius * (0.25 + rnd() * 0.15) };
  });
  return (x, y, z) => {
    let r = 1;
    // Equatorial ridge: smooth bulge around y = 0 and slightly flattened poles (no crease at the equator).
    r += p.ridge * Math.exp(-((y / 0.28) ** 2)) - p.ridge * 0.4 * y * y;
    // Fractal lumps.
    let amp = p.roughness, freq = 1.4;
    for (let o = 0; o < 5; o++) {
      r += amp * noise(x * freq + 11, y * freq + 7, z * freq + 3);
      amp *= 0.5;
      freq *= 2.1;
    }
    // Craters: parabolic bowl inside, soft raised rim just outside.
    for (const c of craters) {
      const ang = Math.acos(Math.min(1, x * c.dir[0]! + y * c.dir[1]! + z * c.dir[2]!));
      const d = ang / c.radius;
      if (d < 1) r -= c.depth * (1 - d * d);
      else if (d < 1.5) r += c.depth * 0.25 * Math.sin(((d - 1) / 0.5) * Math.PI);
    }
    return r;
  };
}

/**
 * Procedural rubble-pile asteroid: ellipsoid scaled to real extents, equatorial ridge,
 * fractal lumps and bowl-shaped craters with raised rims. Deterministic for a given seed.
 */
export function generateAsteroidShape(p: AsteroidShapeParams): ShapeMesh {
  const { v, f } = icosphere(p.detail);
  const radius = shapeRadiusFn(p);
  const positions = new Float32Array(v.length * 3);
  v.forEach((n, i) => {
    const [x, y, z] = n as [number, number, number];
    const r = radius(x, y, z);
    positions[i * 3] = x * r * (p.size.x / 2);
    positions[i * 3 + 1] = y * r * (p.size.y / 2);
    positions[i * 3 + 2] = z * r * (p.size.z / 2);
  });
  return { positions, indices: Uint32Array.from(f.flat()) };
}

/**
 * Same surface as the mesh, as a function: distance from the centre to the surface along the
 * ray through a point given in the asteroid's own frame. Lets the simulation land on the real shape.
 */
export function asteroidSurfaceFn(p: AsteroidShapeParams): (local: { x: number; y: number; z: number }) => number {
  const radius = shapeRadiusFn(p);
  const hx = p.size.x / 2, hy = p.size.y / 2, hz = p.size.z / 2;
  return ({ x, y, z }) => {
    const [ux, uy, uz] = normalize([x / hx, y / hy, z / hz]) as [number, number, number];
    const r = radius(ux, uy, uz);
    return Math.hypot(ux * r * hx, uy * r * hy, uz * r * hz);
  };
}
