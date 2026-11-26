import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarpetStation } from "@modules/sanctuary-one/data/alfombras";
import { model } from "@modules/sanctuary-one/data/catalog";

/** How many stations nearby are drawn alive (their carpets and their orrery): the rest show only their pads. */
const ALIVE = 8;
const RUG = { w: 1.5, l: 2.6, over: 0.11, wave: 0.045 } as const;
/** The orrery over the pad (Berón 2026-11-20: «que baje la mitad… lo mismo para el orrery»), m. */
const ORRERY_Y = 1.7;
const RUG_COLORS = [0x9a3b3b, 0x2f7f8f, 0x7a5a9a, 0xb07a2a] as const;

/**
 * The life of the carpet stations nearby (Berón 2026-11-20: «quizás deberían moverse en ondas sobre el mismo lugar como
 * una serpiente flotando pero tan cerca del suelo como para que no sea apreciable… en los microcosmos para que el
 * portal resalte se pone un objeto 3D espacial… algo similar intangible que vuela sobre la estación»): over each of the
 * nearest pads two carpets float a hand's breadth up, a slow wave running along them, and above it a lit orrery (a sun
 * with its two orbits and a moon) turns and bobs; it is only light, she walks through it.
 */
/**
 * Sanctuary 1's station (catalogue model `estacion-alfombras`: the pad with its yellow border, its two berths and the
 * post with its sign), one geometry of its parts in their colours. Sanctuary 1 places it as a catalogue instance; other
 * levels (sanctuary 3's hollow mountain) ask the view to draw it on every station (`pads`).
 */
export function stationPadGeometry(): THREE.BufferGeometry {
  const d = model("estacion-alfombras");
  const parts = (d.parts ?? []).map(([cx, cy, cz, sx, sy, sz, c]) => {
    const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    g.translate(cx, cy, cz);
    const col = new THREE.Color(c ?? d.color);
    const a = new Float32Array(g.attributes.position!.count * 3);
    for (let i = 0; i < a.length; i += 3) [a[i], a[i + 1], a[i + 2]] = [col.r, col.g, col.b];
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    return g;
  });
  return mergeGeometries(parts);
}

/**
 * Every level's carpet stations (sanctuary 1 and sanctuary 3's hollow mountain share it: docs/design/santuario1.md
 * #47, montana-hueca.md).
 */
export class CarpetStationsView {
  private readonly slots: { g: THREE.Group; rugs: THREE.Mesh[]; orrery: THREE.Group; moon: THREE.Object3D; base: Float32Array[]; at?: CarpetStation }[] = [];
  private pickT = 0;

  constructor(
    scene: THREE.Scene,
    private readonly stations: readonly CarpetStation[],
    o: { readonly pads?: boolean } = {},
  ) {
    if (o.pads && stations.length) {
      const pads = new THREE.InstancedMesh(stationPadGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 }), stations.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      stations.forEach((st, i) => {
        q.setFromAxisAngle(up, Math.atan2(st.out.x, st.out.z));
        m4.compose(new THREE.Vector3(st.x, st.y + 0.005, st.z), q, new THREE.Vector3(1, 1, 1));
        pads.setMatrixAt(i, m4);
      });
      pads.name = "estaciones-alfombras";
      scene.add(pads);
    }
    const sun = new THREE.SphereGeometry(0.32, 16, 12);
    const orbitA = new THREE.TorusGeometry(0.8, 0.03, 6, 48);
    const orbitB = new THREE.TorusGeometry(1.15, 0.025, 6, 56);
    const moonG = new THREE.SphereGeometry(0.11, 10, 8);
    const gold = new THREE.MeshBasicMaterial({ color: 0xffd27f });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < ALIVE; i++) {
      const g = new THREE.Group();
      g.visible = false;
      g.name = `estacion-viva-${i}`;
      const rugs: THREE.Mesh[] = [];
      const base: Float32Array[] = [];
      for (const [k, x] of [-1.6, 1.6].entries()) {
        const geo = new THREE.PlaneGeometry(RUG.w, RUG.l, 4, 16);
        geo.rotateX(-Math.PI / 2);
        const rug = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: RUG_COLORS[(i + k) % RUG_COLORS.length], roughness: 0.95, side: THREE.DoubleSide }));
        rug.position.set(x, RUG.over, 0);
        g.add(rug);
        rugs.push(rug);
        base.push(Float32Array.from(geo.attributes.position!.array as ArrayLike<number>));
      }
      const orrery = new THREE.Group();
      orrery.add(new THREE.Mesh(sun, gold));
      const a = new THREE.Mesh(orbitA, cyan);
      a.rotation.x = Math.PI / 2.3;
      const b = new THREE.Mesh(orbitB, cyan);
      b.rotation.set(Math.PI / 2, 0.5, 0);
      const moon = new THREE.Mesh(moonG, gold);
      orrery.add(a, b, moon);
      orrery.position.y = ORRERY_Y;
      g.add(orrery);
      scene.add(g);
      this.slots.push({ g, rugs, orrery, moon, base });
    }
  }

  /** One frame: who is near (twice a second), then the carpets' wave and the orrery's turn. */
  update(dt: number, t: number, x: number, y: number, z: number): void {
    this.pickT -= dt;
    if (this.pickT <= 0) {
      this.pickT = 0.5;
      const near = [...this.stations].sort((p, q) => Math.hypot(p.x - x, (p.y - y) * 0.5, p.z - z) - Math.hypot(q.x - x, (q.y - y) * 0.5, q.z - z)).slice(0, ALIVE);
      this.slots.forEach((s, i) => {
        const st = near[i];
        s.at = st;
        s.g.visible = !!st;
        if (!st) return;
        s.g.position.set(st.x, st.y, st.z);
        s.g.rotation.y = Math.atan2(st.out.x, st.out.z);
        for (const r of s.rugs) r.visible = true;
      });
    }
    for (const [i, s] of this.slots.entries()) {
      if (!s.g.visible) continue;
      s.orrery.position.y = ORRERY_Y + Math.sin(t * 1.3 + i) * 0.15;
      s.orrery.rotation.y = t * 0.6;
      s.moon.position.set(Math.cos(t * 1.7) * 1.15, Math.sin(t * 1.7) * 0.35, Math.sin(t * 1.7) * 1.15);
      if (!s.rugs[0]!.visible) continue;
      // A slow wave along each carpet, a few centimetres: it floats, it is not a sheet on the floor.
      s.rugs.forEach((r, k) => {
        const pos = r.geometry.attributes.position!;
        const b = s.base[k]!;
        for (let v = 0; v < pos.count; v++) pos.setY(v, b[v * 3 + 1]! + Math.sin(t * 2.2 + b[v * 3 + 2]! * 2.4 + k) * RUG.wave);
        pos.needsUpdate = true;
      });
    }
  }
}
