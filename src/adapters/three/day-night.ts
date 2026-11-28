import * as THREE from "three";

/**
 * Day and night in sanctuary 1 (Berón 2026-11-22: «¿actualmente el día y noche están bien marcados en iluminación? Me da
 * la impresión de que no he visto una noche oscura con su luna y estrellas»): the sun crosses the sky from 6 to 20 h
 * (ours: an even day, not the pole's), the sky and the fog go from day blue through a warm dusk to a dark night, the
 * lights dim to a blue moonlight, and at night the stars and a full moon come out. Pure numbers in `skyAt` (tested);
 * the scene's side in DayNight.
 */
export interface SkyState {
  /** The sun's direction (unit vector, y up). */
  readonly sun: { readonly x: number; readonly y: number; readonly z: number };
  /** 0 at night, 1 in full day. */
  readonly day: number;
  /** 0…1, how much of the dusk's warm glow there is (around sunrise and sunset). */
  readonly dusk: number;
  /** The sky's colour (and the fog's). */
  readonly sky: number;
}

const DAY_SKY = new THREE.Color(0xbfd9ea);
const DUSK_SKY = new THREE.Color(0xe39a6f);
const NIGHT_SKY = new THREE.Color(0x050a18);
const SUNRISE = 6;
const SUNSET = 20;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The sky at an hour (0…24). */
export function skyAt(hour: number): SkyState {
  // The sun's arc: up at SUNRISE in the east (+x), highest at midday, down at SUNSET in the west; under the
  // horizon the rest of the night.
  const span = SUNSET - SUNRISE;
  const t = (((hour - SUNRISE) % 24) + 24) % 24;
  const a = t <= span ? (t / span) * Math.PI : Math.PI + ((t - span) / (24 - span)) * Math.PI;
  const elev = Math.sin(a) * 0.95;
  const sun = { x: Math.cos(a), y: elev, z: 0.35 };
  const n = Math.hypot(sun.x, sun.y, sun.z);
  const day = smooth(-0.08, 0.22, elev);
  const dusk = Math.max(0, 1 - Math.abs(elev) / 0.25) * (elev > -0.2 ? 1 : 0);
  const c = NIGHT_SKY.clone().lerp(DAY_SKY, day).lerp(DUSK_SKY, dusk * 0.55);
  return { sun: { x: sun.x / n, y: sun.y / n, z: sun.z / n }, day, dusk, sky: c.getHex() };
}

/** The scene's sky: lights, background, fog, stars and the moon, set from the hour each frame. */
export class DayNight {
  private readonly stars: THREE.Points;
  private readonly moon: THREE.Group;
  private readonly moonLight: THREE.DirectionalLight;
  /** The sky's colour now (the under-water view starts from it). */
  sky = DAY_SKY.getHex();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly hemi: THREE.HemisphereLight,
    private readonly sun: THREE.DirectionalLight,
  ) {
    // Some 2500 stars on a far sphere (seeded: the same sky every night), a few brighter.
    const N = 2500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    let seed = 12345;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      // Only the upper sky and a little under the horizon.
      const y = Math.abs(u) * 0.98 + 0.02;
      pos.set([Math.cos(th) * r * 3800, y * 3800, Math.sin(th) * r * 3800], i * 3);
      const b = 0.55 + rnd() * 0.45;
      const warm = rnd() < 0.15 ? 0.85 : 1;
      col.set([b * warm, b * (warm < 1 ? 0.9 : 1), b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.name = "estrellas";
    this.stars.renderOrder = -1;
    scene.add(this.stars);
    // The moon: a pale disc with a soft halo, opposite the sun.
    this.moon = new THREE.Group();
    this.moon.name = "luna";
    const face = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.MeshBasicMaterial({ color: 0xf4f0e0, fog: false, transparent: true }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ color: 0xbcd2ff, fog: false, transparent: true, opacity: 0.12, depthWrite: false }));
    this.moon.add(halo, face);
    scene.add(this.moon);
    this.moonLight = new THREE.DirectionalLight(0x9fb7ff, 0);
    scene.add(this.moonLight);
  }

  /** The sky at this hour, round the camera (stars and moon move with it: they are far). */
  update(hour: number, camera: THREE.Camera): void {
    const s = skyAt(hour);
    this.sky = s.sky;
    this.sun.position.set(s.sun.x * 400, s.sun.y * 400, s.sun.z * 400);
    this.sun.intensity = 1.6 * s.day;
    this.sun.color.setHex(0xffffff).lerp(new THREE.Color(0xffb27a), s.dusk * 0.7);
    this.hemi.intensity = 0.12 + 1.28 * s.day;
    this.hemi.color.setHex(0xeef6ff).lerp(new THREE.Color(0x6d7fb0), 1 - s.day);
    const night = 1 - s.day;
    this.moonLight.intensity = 0.45 * night;
    this.moonLight.position.set(-s.sun.x * 400, Math.max(0.3, -s.sun.y) * 400, -s.sun.z * 400);
    const starsMat = this.stars.material as THREE.PointsMaterial;
    starsMat.opacity = Math.max(0, night * 1.1 - 0.1);
    this.stars.visible = starsMat.opacity > 0.01;
    this.stars.position.copy(camera.position);
    const m = new THREE.Vector3(-s.sun.x, Math.max(0.25, -s.sun.y), -s.sun.z).normalize().multiplyScalar(3500);
    this.moon.position.copy(camera.position).add(m);
    this.moon.visible = night > 0.05;
    for (const c of this.moon.children) ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = c === this.moon.children[0] ? 0.12 * night : night;
  }
}
