import * as THREE from "three";
import { seededRandom } from "../../content/random";

export function buildStarfield(radius: number, count = 6000): THREE.Points {
  const rnd = seededRandom(42);
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    positions.set([s * Math.cos(th) * radius, u * radius, s * Math.sin(th) * radius], i * 3);
    const b = 0.35 + Math.pow(rnd(), 6) * 0.65;
    const warm = rnd();
    colours.set([b, b * (0.9 + warm * 0.1), b * (1.05 - warm * 0.2)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
}
