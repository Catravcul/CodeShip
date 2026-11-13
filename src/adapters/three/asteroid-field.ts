import * as THREE from "three";
import type { Region } from "@modules/celestial/domain/region";
import { chooseLod, pixelsPerRadian } from "@modules/celestial/domain/lod";
import { generateAsteroidShape } from "../../content/asteroid-shape";
import { seededRandom } from "../../content/random";
import { buildAsteroidMesh } from "./asteroid-mesh";
import { memberShapeParams } from "../../content/start-region";

/** Grey level that makes a body of geometric albedo p look right next to Bennu (0x3b ≈ albedo 0.044). */
export function albedoColour(albedo: number, type: string): THREE.Color {
  const k = Math.min(1, (0x3b / 255) * Math.sqrt(albedo / 0.044));
  return type === "S" ? new THREE.Color(k * 1.08, k * 0.95, k * 0.82) : new THREE.Color(k, k * 0.97, k * 0.93);
}

const VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float aDiameter;
  attribute float aVisible;
  attribute vec3 aColour;
  uniform float uPxPerRad;
  uniform vec3 uSunDir;
  varying vec3 vColour;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    float dist = length(mv.xyz);
    float px = aDiameter / dist * uPxPerRad;
    // Phase: how much of the lit half faces the camera.
    float lit = 0.5 * (1.0 + dot(normalize(cameraPosition - world.xyz), uSunDir));
    // Sub-pixel rocks keep a 1.5 px dot but get dimmer with their real (tiny) area.
    float area = clamp(px * px / 2.25, 0.0, 1.0);
    vColour = aColour * (0.4 + 3.0 * lit) * mix(0.35, 1.0, area);
    gl_Position = aVisible > 0.5 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = clamp(px, 1.5, 9.0);
    #include <logdepthbuf_vertex>
  }`;
const FRAG = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  varying vec3 vColour;
  void main() {
    #include <logdepthbuf_fragment>
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(vColour, smoothstep(1.0, 0.5, r));
  }`;

/** Coma (a soft additive shell) and a dust tail away from the Sun, for a comet's nucleus. */
function cometGlow(at: { x: number; y: number; z: number }, radiusM: number, sunDir: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.set(at.x, at.y, at.z);
  const coma = new THREE.Mesh(
    new THREE.SphereGeometry(radiusM * 2.4, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }),
  );
  const len = radiusM * 9;
  const tailGeo = new THREE.ConeGeometry(radiusM * 1.8, len, 24, 1, true);
  tailGeo.translate(0, -len / 2, 0);
  tailGeo.rotateX(Math.PI);
  const tail = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir.clone().normalize().negate());
  g.add(coma, tail);
  return g;
}

const PROTOTYPES = 4;
const MAX_MESHES_PER_PROTOTYPE = 160;

/**
 * The region's asteroids. Catalogued members get full meshes (a few, always near enough to need
 * them). The thousands of procedural rocks are drawn as points (impostors with size from their true
 * angular size and brightness from albedo and phase); only those that would cover more than a few
 * pixels are swapped for instanced meshes. 142 Polana is drawn far away at its compressed size.
 */
export class AsteroidField {
  readonly group = new THREE.Group();
  private readonly members: { mesh: THREE.Group; spin: number }[] = [];
  private readonly instanced: THREE.InstancedMesh[] = [];
  private readonly visible: Float32Array;
  private readonly visibleAttr: THREE.BufferAttribute;
  private readonly pointMat: THREE.ShaderMaterial;
  private readonly rockQuat: THREE.Quaternion[] = [];
  private readonly rockScale: THREE.Vector3[] = [];
  private readonly neighbour: THREE.Group[] = [];
  private frame = 0;
  private readonly labelLayer: HTMLElement;
  private readonly labels: { el: HTMLElement; name: string; pos: THREE.Vector3; radius: number }[] = [];
  meshCount = 0;

  constructor(
    private readonly region: Region,
    sunDir: THREE.Vector3,
    root: HTMLElement,
  ) {
    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "sky-labels";
    root.appendChild(this.labelLayer);
    // Catalogued members (all but the target, which main.ts draws with its landing surface).
    for (const a of region.asteroids.slice(1)) {
      const albedo = (a.data as { albedo?: { value: number } }).albedo?.value ?? 0.05;
      // Same parameters as the surface the ship lands on (content/start-region.ts).
      const mesh = buildAsteroidMesh(memberShapeParams(a.data), albedoColour(albedo, "C"), 150);
      mesh.position.set(a.position.x, a.position.y, a.position.z);
      this.group.add(mesh);
      // An active comet: a faint coma and a dust tail pointing away from the Sun (docs/design/importacion.md).
      if (a.data.kind === "cometa") this.group.add(cometGlow(a.position, a.meanRadiusM, sunDir));
      this.members.push({ mesh, spin: a.spinRadS });
      const el = document.createElement("div");
      el.className = "sky-label body";
      this.labelLayer.appendChild(el);
      this.labels.push({ el, name: a.data.name, pos: mesh.position.clone(), radius: a.meanRadiusM });
    }

    // Far neighbour (142 Polana): drawn nearer and smaller with the same angular size.
    for (const n of region.neighbours) {
      const d = n.asteroid.data.dimensionsM.value;
      const dist = n.asteroid.position.length();
      const k = 6e5 / dist;
      const mesh = buildAsteroidMesh({ seed: 142, size: { x: d.x * k, y: d.y * k, z: d.z * k }, detail: 3, ridge: 0.02, roughness: 0.12, craters: 30 }, albedoColour(n.albedo.value, "C"), 0);
      mesh.userData.dir = new THREE.Vector3(n.asteroid.position.x, n.asteroid.position.y, n.asteroid.position.z).normalize().multiplyScalar(6e5);
      this.group.add(mesh);
      this.neighbour.push(mesh);
    }

    // Procedural rocks: one point each, plus instanced meshes for the near ones.
    const rocks = region.rocks;
    const pos = new Float32Array(rocks.length * 3);
    const diam = new Float32Array(rocks.length);
    const col = new Float32Array(rocks.length * 3);
    this.visible = new Float32Array(rocks.length).fill(1);
    rocks.forEach((r, i) => {
      pos.set([r.position.x, r.position.y, r.position.z], i * 3);
      diam[i] = r.radiusM * 2;
      const c = albedoColour(r.albedo, r.spectralType);
      col.set([c.r, c.g, c.b], i * 3);
      const rnd = seededRandom(r.seed);
      this.rockQuat.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3)));
      this.rockScale.push(new THREE.Vector3(r.radiusM * (0.9 + rnd() * 0.3), r.radiusM * (0.6 + rnd() * 0.3), r.radiusM * (0.75 + rnd() * 0.3)));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aDiameter", new THREE.BufferAttribute(diam, 1));
    geo.setAttribute("aColour", new THREE.BufferAttribute(col, 3));
    this.visibleAttr = new THREE.BufferAttribute(this.visible, 1);
    geo.setAttribute("aVisible", this.visibleAttr);
    this.pointMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uPxPerRad: { value: 500 }, uSunDir: { value: sunDir.clone().normalize() } },
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, this.pointMat);
    points.frustumCulled = false;
    points.renderOrder = -5;
    this.group.add(points);

    const mat = new THREE.MeshStandardMaterial({ roughness: 0.97, metalness: 0, flatShading: true });
    for (let k = 0; k < PROTOTYPES; k++) {
      const shape = generateAsteroidShape({ seed: 900 + k, size: { x: 2, y: 2, z: 2 }, detail: 2, ridge: 0, roughness: 0.22, craters: 4 });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(shape.positions, 3));
      g.setIndex(new THREE.BufferAttribute(shape.indices, 1));
      g.computeVertexNormals();
      const im = new THREE.InstancedMesh(g, mat, MAX_MESHES_PER_PROTOTYPE);
      im.count = 0;
      im.frustumCulled = false;
      this.instanced.push(im);
      this.group.add(im);
    }
  }

  /** Names and distances of the catalogued asteroids, so the pilot can tell them apart. */
  private placeLabels(camera: THREE.PerspectiveCamera, show: boolean): void {
    this.labelLayer.classList.toggle("hidden", !show);
    if (!show) return;
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      v.copy(l.pos).project(camera);
      const dist = l.pos.distanceTo(camera.position) - l.radius;
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) {
        l.el.style.display = "none";
        continue;
      }
      l.el.style.display = "block";
      l.el.textContent = `${l.name} · ${(dist / 1000).toFixed(1).replace(".", ",")} km`;
      l.el.style.transform = `translate(${((v.x + 1) / 2) * window.innerWidth}px, ${((1 - v.y) / 2) * window.innerHeight}px)`;
    }
  }

  update(camera: THREE.PerspectiveCamera, heightPx: number, simTimeS: number, labels = true): void {
    this.placeLabels(camera, labels);
    for (const m of this.members) m.mesh.rotation.y = m.spin * simTimeS;
    for (const n of this.neighbour) n.position.copy(camera.position).add(n.userData.dir as THREE.Vector3);
    const ppr = pixelsPerRadian(camera.fov, heightPx);
    this.pointMat.uniforms.uPxPerRad!.value = ppr;
    // LOD choice every few frames is plenty at flight speeds.
    if (this.frame++ % 4 !== 0) return;
    const counts = new Array<number>(PROTOTYPES).fill(0);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const cam = camera.position;
    let changed = false;
    this.region.rocks.forEach((r, i) => {
      p.set(r.position.x, r.position.y, r.position.z);
      const k = r.seed % PROTOTYPES;
      const asMesh = chooseLod(r.radiusM * 2, p.distanceTo(cam), ppr) === "mesh" && counts[k]! < MAX_MESHES_PER_PROTOTYPE;
      if (asMesh) {
        m.compose(p, this.rockQuat[i]!, this.rockScale[i]!);
        const im = this.instanced[k]!;
        im.setMatrixAt(counts[k]!, m);
        im.setColorAt(counts[k]!, albedoColour(r.albedo, r.spectralType));
        counts[k]!++;
      }
      const vis = asMesh ? 0 : 1;
      if (this.visible[i] !== vis) {
        this.visible[i] = vis;
        changed = true;
      }
    });
    this.instanced.forEach((im, k) => {
      im.count = counts[k]!;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });
    this.meshCount = counts.reduce((a, b) => a + b, 0);
    if (changed) this.visibleAttr.needsUpdate = true;
  }
}
