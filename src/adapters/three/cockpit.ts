import * as THREE from "three";

/**
 * First-person cockpit built from code: canopy frame, side pillars and a dashboard.
 * Attached to the camera, so it moves with the pilot's head.
 */
export function buildCockpit(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.8, metalness: 0.2 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x3fd0ff });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    g.add(m);
    return m;
  };

  // Dashboard (front face at z = -0.55, top edge just inside the lower field of view).
  box(1.9, 0.4, 0.5, panel, 0, -0.47, -0.8);
  box(1.9, 0.03, 0.42, frame, 0, -0.26, -0.78, -0.3);
  // Two screens and a row of indicator lights.
  const screen = new THREE.MeshBasicMaterial({ color: 0x0b3a4a });
  box(0.2, 0.075, 0.005, screen, -0.3, -0.33, -0.549);
  box(0.2, 0.075, 0.005, screen, 0.3, -0.33, -0.549);
  box(0.17, 0.004, 0.006, glow, -0.3, -0.32, -0.546);
  box(0.11, 0.004, 0.006, amber, 0.28, -0.34, -0.546);
  for (let i = 0; i < 8; i++) box(0.012, 0.012, 0.005, i % 3 === 0 ? amber : glow, -0.0875 + i * 0.025, -0.33, -0.549);
  // Canopy pillars and top bar, kept to the edges so the view stays clear.
  box(0.07, 1.6, 0.07, frame, -0.98, 0.05, -0.85, 0, 0.2);
  box(0.07, 1.6, 0.07, frame, 0.98, 0.05, -0.85, 0, -0.2);
  box(2.4, 0.09, 0.09, frame, 0, 0.62, -0.85);
  return g;
}
