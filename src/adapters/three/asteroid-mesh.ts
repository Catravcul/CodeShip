import * as THREE from "three";
import { generateAsteroidShape, type AsteroidShapeParams } from "../../content/asteroid-shape";
import { seededRandom } from "../../content/random";

/** Builds the render mesh of an asteroid: the generated body plus scattered boulders. */
export function buildAsteroidMesh(params: AsteroidShapeParams, colour: THREE.ColorRepresentation, boulderCount = 400): THREE.Group {
  const group = new THREE.Group();
  const shape = generateAsteroidShape(params);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(shape.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(shape.indices, 1));
  geometry.computeVertexNormals();

  // Subtle per-vertex albedo variation so the surface does not look like plastic.
  const rnd = seededRandom(params.seed + 1);
  const base = new THREE.Color(colour);
  const colours = new Float32Array(shape.positions.length);
  for (let i = 0; i < colours.length; i += 3) {
    const k = 0.8 + rnd() * 0.35;
    colours[i] = base.r * k;
    colours[i + 1] = base.g * k;
    colours[i + 2] = base.b * k;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, flatShading: true });
  group.add(new THREE.Mesh(geometry, material));

  // Boulders resting on the surface (Bennu is strewn with them, some tens of metres across).
  const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
  const count = boulderCount;
  const boulders = new THREE.InstancedMesh(boulderGeo, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = shape.positions;
  for (let i = 0; i < count; i++) {
    const v = Math.floor(rnd() * (pos.length / 3)) * 3;
    const p = new THREE.Vector3(pos[v], pos[v + 1], pos[v + 2]);
    const size = 1.5 + Math.pow(rnd(), 4) * 22;
    q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
    m.compose(p, q, new THREE.Vector3(size, size * (0.6 + rnd() * 0.5), size * (0.7 + rnd() * 0.4)));
    boulders.setMatrixAt(i, m);
    boulders.setColorAt(i, base.clone().multiplyScalar(0.7 + rnd() * 0.5));
  }
  if (count > 0) group.add(boulders);
  return group;
}
