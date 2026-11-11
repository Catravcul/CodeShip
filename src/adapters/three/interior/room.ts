import * as THREE from "three";

export const ROOM = { halfW: 2, halfL: 4, height: 2.6 } as const;

/** Station anchor points the player walks to (floor position + where to look). */
export interface Station {
  readonly id: "huerto" | "cocina" | "yoga" | "panel" | "gatos";
  readonly label: string;
  readonly stand: THREE.Vector3;
  readonly look: THREE.Vector3;
}

export const STATIONS: readonly Station[] = [
  { id: "huerto", label: "Huerto", stand: new THREE.Vector3(-0.7, 0, -1.4), look: new THREE.Vector3(-1.7, 1.0, -1.4) },
  { id: "cocina", label: "Cocina", stand: new THREE.Vector3(0.7, 0, -1.6), look: new THREE.Vector3(1.7, 0.95, -1.6) },
  { id: "panel", label: "Mente de la nave", stand: new THREE.Vector3(-0.4, 0, 1.4), look: new THREE.Vector3(1.95, 1.4, 1.4) },
  { id: "yoga", label: "Esterilla de yoga", stand: new THREE.Vector3(0, 0, 1.2), look: new THREE.Vector3(0, 0.6, 2.4) },
  { id: "gatos", label: "Rincón de los gatos", stand: new THREE.Vector3(-0.6, 0, 2.2), look: new THREE.Vector3(-1.5, 0.2, 3.2) },
];

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });

function boxAt(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}

/** Positions of the pots on the garden shelf, in order. */
export const POT_SLOTS = [-2.4, -1.9, -1.4, -0.9, -0.4].map((z) => new THREE.Vector3(-1.7, 0.86, z));

/** The habitat module: shell, garden shelf with grow lights, galley, yoga mat, cat corner and the ship-mind panel. */
export function buildRoom(): { group: THREE.Group; panel: THREE.Mesh } {
  const g = new THREE.Group();
  const { halfW, halfL, height } = ROOM;
  const wall = mat(0xc9ced6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfL * 2), mat(0x5d6672));
  floor.rotation.x = -Math.PI / 2;
  const ceiling = floor.clone();
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  ceiling.material = mat(0xdfe3e8);
  g.add(floor, ceiling);
  g.add(boxAt(0.05, height, halfL * 2, wall, -halfW, height / 2, 0), boxAt(0.05, height, halfL * 2, wall, halfW, height / 2, 0));
  g.add(boxAt(halfW * 2, height, 0.05, wall, 0, height / 2, -halfL), boxAt(halfW * 2, height, 0.05, wall, 0, height / 2, halfL));
  // Handrails along the walls (crewed spacecraft look).
  const rail = mat(0xe8c547, { metalness: 0.4 });
  for (const x of [-halfW + 0.08, halfW - 0.08]) g.add(boxAt(0.03, 0.03, halfL * 1.8, rail, x, 1.25, 0));
  // Ceiling light panels.
  for (const z of [-2.5, 0, 2.5]) {
    g.add(boxAt(1.2, 0.02, 0.5, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 1.2 }), 0, height - 0.01, z));
    const l = new THREE.PointLight(0xfff3e0, 6, 6, 1.6);
    l.position.set(0, height - 0.2, z);
    g.add(l);
  }
  g.add(new THREE.HemisphereLight(0xe8eef8, 0x404650, 0.9));
  // Cockpit hatch.
  g.add(boxAt(0.9, 1.9, 0.06, mat(0x7c8796, { metalness: 0.5 }), 0, 0.95, -halfL + 0.04));
  g.add(boxAt(0.5, 0.5, 0.02, new THREE.MeshStandardMaterial({ color: 0x050812, emissive: 0x0a1630 }), 0, 1.45, -halfL + 0.08));

  // Garden: shelf, grow-light bar (Veggie used red, blue and green LEDs).
  g.add(boxAt(0.45, 0.04, 2.6, mat(0xf0f0f0), -1.72, 0.84, -1.4));
  g.add(boxAt(0.45, 0.84, 0.04, mat(0xf0f0f0), -1.72, 0.42, -2.7), boxAt(0.45, 0.84, 0.04, mat(0xf0f0f0), -1.72, 0.42, -0.1));
  g.add(boxAt(0.3, 0.03, 2.5, new THREE.MeshStandardMaterial({ color: 0xff66cc, emissive: 0xd23ad6, emissiveIntensity: 2 }), -1.72, 1.75, -1.4));
  const grow = new THREE.PointLight(0xe060ff, 4, 2.2, 1.5);
  grow.position.set(-1.6, 1.6, -1.4);
  g.add(grow);

  // Galley: counter, hob, cupboards.
  g.add(boxAt(0.6, 0.9, 2.2, mat(0x8a96a6), 1.68, 0.45, -1.6));
  g.add(boxAt(0.62, 0.04, 2.22, mat(0xeeeeee), 1.68, 0.92, -1.6));
  g.add(boxAt(0.4, 0.01, 0.4, new THREE.MeshStandardMaterial({ color: 0x111111 }), 1.68, 0.945, -2.1));
  for (const [dx, dz] of [[-0.08, -0.08], [0.08, 0.08]] as const)
    g.add(boxAt(0.12, 0.003, 0.12, new THREE.MeshStandardMaterial({ color: 0x441111, emissive: 0x991a0a, emissiveIntensity: 0.6 }), 1.68 + dx, 0.952, -2.1 + dz));
  g.add(boxAt(0.4, 0.5, 2.2, mat(0x9aa6b6), 1.78, 1.85, -1.6));

  // Yoga mat, across the room so postures are seen in profile.
  g.add(boxAt(1.85, 0.008, 0.65, mat(0x5aa56e), 0, 0.004, 2.4));

  // Cat corner: bed, bowls, scratching post.
  const bed = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 8, 20), mat(0xb08a6a));
  bed.rotation.x = Math.PI / 2;
  bed.position.set(-1.5, 0.08, 3.3);
  g.add(bed, boxAt(0.14, 0.05, 0.14, mat(0x3a7bd5), -1.0, 0.025, 3.6), boxAt(0.14, 0.05, 0.14, mat(0xd5823a), -0.75, 0.025, 3.6));
  g.add(boxAt(0.12, 0.8, 0.12, mat(0xc8a878), -1.75, 0.4, 2.4));

  // Ship-mind panel: a screen showing the ship's class as code.
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  panel.position.set(halfW - 0.04, 1.4, 1.4);
  panel.rotation.y = -Math.PI / 2;
  g.add(panel, boxAt(0.03, 1.0, 1.5, mat(0x30343c), halfW - 0.02, 1.4, 1.4));
  return { group: g, panel };
}

/** Draws code lines onto the panel (ship class with real values). */
export function drawPanel(panel: THREE.Mesh, title: string, lines: readonly string[], hull: number): void {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 660;
  const x = c.getContext("2d")!;
  x.fillStyle = "#07101c";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#7fdcff";
  x.font = "bold 40px monospace";
  x.fillText(title, 36, 64);
  x.font = "28px monospace";
  lines.forEach((l, i) => {
    x.fillStyle = "#c6f0ff";
    x.fillText(l, 36, 130 + i * 52);
  });
  x.fillStyle = hull < 0.999 ? "#ffb347" : "#7dffb0";
  x.font = "bold 34px monospace";
  x.fillText(`casco = ${Math.round(hull * 100)} %`, 36, 130 + lines.length * 52 + 30);
  const m = panel.material as THREE.MeshBasicMaterial;
  m.map?.dispose();
  m.map = new THREE.CanvasTexture(c);
  m.map.colorSpace = THREE.SRGBColorSpace;
  m.needsUpdate = true;
}
