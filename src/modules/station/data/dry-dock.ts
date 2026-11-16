import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Mothership } from "@modules/mothership/domain/mothership";
import { NODRIZA, NODRIZA_NOSE_PORT } from "@modules/mothership/data/mothership";
import { dryDockFor, type BerthedCraft, type DryDock, type Fabric } from "../domain/dry-dock";
import { POLANA_LAYOUT } from "./structure";

// --- Sources (docs/design/dique-seco.md) ------------------------------------------
export const DRY_DOCK_SOURCES = {
  cbm: "Common Berthing Mechanism de la ISS: el brazo coloca la nave y 16 pernos motorizados la sujetan; así atracan HTV, Dragon de carga y Cygnus: https://en.wikipedia.org/wiki/Common_Berthing_Mechanism",
  canadarm2: "Canadarm2 (ASC): 17 m, dos efectores de enganche, mueve hasta 116 000 kg: https://asc-csa.gc.ca/eng/iss/canadarm2/about.asp",
  berthing: "Docking frente a berthing en la ISS (ISS National Lab): https://issnationallab.org/?p=36525",
  truss: "Estructura integrada de celosía de la ISS (ITS), unos 109 m, con el carro móvil del brazo: https://www.nasa.gov/image-article/integrated-truss-structure-diagram/",
  mev: "MEV-1 de Northrop Grumman se acopla a Intelsat 901 en 2020 y le da cinco años más de servicio: https://www.nasaspaceflight.com/2020/02/northrop-grumman-history-mission-extension-vehicle-docks-satellite/",
  osam1: "OSAM-1 (NASA): repostar Landsat 7 con brazos y montar estructura con SPIDER; cancelada el 1-3-2024 tras unos 2 000 M$: https://en.wikipedia.org/wiki/OSAM-1",
  orbitalReef: "Orbital Reef (Blue Origin y Sierra Space): estación comercial con puertos para naves visitantes: https://www.blueorigin.com/news/orbital-reef-commercial-space-station",
  stanford: "Toro de Stanford (NASA SP-413, 1975): las naves atracan en un módulo que no gira, de 15 × 60 m, en el polo del cubo (eje de giro): https://en.wikipedia.org/wiki/Stanford_torus",
  truss1992: "Ensamblaje en órbita de grandes celosías (NASA): https://ntrs.nasa.gov/api/citations/20160007719/downloads/20160007719.pdf",
  b330: "Bigelow B330: módulo hinchable de unos 20 t y 330 m³: https://en.wikipedia.org/wiki/B330",
  kevlar: "Kevlar 49: 3 600 MPa de tracción y 1 440 kg/m³: https://en.wikipedia.org/wiki/Kevlar",
} as const;

/** Kevlar 49 with the 4:1 factor of NASA's inflatable modules (TransHab, BEAM). */
export const KEVLAR_SOFTGOODS: Fabric = { name: "Kevlar 49 (factor 4)", tensileMPa: 3600, densityKgM3: 1440, safetyFactor: 4 };

const port = POLANA_LAYOUT.ports.find((p) => p.user === "nodriza")!;
const l = NODRIZA.layout;
const noseZ = NODRIZA_NOSE_PORT.position.z;
const d = (bodyZ: number) => bodyZ - noseZ;
const shieldOf = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
const ringR = NODRIZA.ring.floorRadiusM + 1;
const podR = Math.max(...NODRIZA.propulsion.mounts.map((m) => 7.5 + m.faceHeightM / 2 + 0.5));

/**
 * The mothership berthed at node 2's axial port, as the station sees it: nose on the port, spine along
 * the port's normal. Rings (floor radius + 1 m of hull), radiator wings, thruster pods and the shield
 * stick out; everything else is the 1,5 m spine and its modules.
 */
export const BERTHED_MOTHERSHIP: BerthedCraft = {
  name: "Nodriza",
  nose: port.position,
  axis: port.normal,
  lengthM: d(l.spine.toZ),
  reachM: ringR,
  spineRadiusM: l.spine.radiusM,
  bulges: [
    { id: "nodo", fromM: 0, toM: d(l.nodeZ) + 2, radiusM: l.nodeRadiusM },
    ...l.spineModules.map((m) => ({ id: m.id, fromM: d(m.fromZ), toM: d(m.toZ), radiusM: m.radiusM })),
    { id: "anillo", fromM: d(l.habRingZ - NODRIZA.ring.widthM / 2), toM: d(l.habRingZ + NODRIZA.ring.widthM / 2), radiusM: ringR },
    { id: "anillo-gemelo", fromM: d(l.twinRingZ - NODRIZA.ring.widthM / 2), toM: d(l.twinRingZ + NODRIZA.ring.widthM / 2), radiusM: ringR },
    { id: "radiadores", fromM: d(l.radiator.fromZ), toM: d(l.radiator.toZ), radiusM: l.radiator.innerX + Math.max(l.radiator.spanM, l.radiator.spanAftM) },
    { id: "propulsores", fromM: d(l.thrusterZ - 2), toM: d(l.thrusterZ + 2), radiusM: podR },
    { id: "escudo", fromM: d(l.shield.farZ - 4), toM: d(l.shield.nearZ), radiusM: shieldOf.shieldRadiusAt(l.shield.farZ) },
  ],
};

const truss = POLANA_LAYOUT.parts.find((p) => p.kind === "celosia")!;
/** Two struts from the station's truss, 20 m either side of the middle, on its forward face. */
const ANCHORS = [1, -1].map((s) => new Vec3(s * 20, truss.centre.y, truss.centre.z - truss.half.z));

/** Game value: the frame starts 16 m along the ship, clear of the lander's port on node 2 and of the ship's own lander port. */
export const DRY_DOCK_FROM_M = 16;

/** The station's dry dock, sized for the mothership (station frame, metres). */
export const POLANA_DRY_DOCK: DryDock = dryDockFor(BERTHED_MOTHERSHIP, { fromM: DRY_DOCK_FROM_M, up: Vec3.Y, anchors: ANCHORS });
