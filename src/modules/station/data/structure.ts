import { Vec3 } from "@core/math/vec3";
import type { PressurisedModule, StationLayout, StationPortSpec, StructurePart } from "../domain/structure";

// --- Sources -------------------------------------------------------------------
export const STRUCTURE_SOURCES = {
  unity: "Nodo Unity de la ISS: 5,47 m de largo y 4,57 m de diámetro, seis puertos de atraque: https://en.wikipedia.org/wiki/Unity_(ISS_module)",
  halo: "HALO (Habitation and Logistics Outpost) del Gateway lunar: 6,1 m de largo y 3 m de diámetro, dos puertos axiales y hasta dos radiales: https://handwiki.org/wiki/Astronomy:Habitation_and_Logistics_Outpost",
  ida: "Adaptador de atraque internacional (IDA) de la ISS: 110 cm de alto, 240 cm de diámetro exterior, norma IDSS: https://en.wikipedia.org/wiki/International_Docking_Adapter",
  nds: "NASA Docking System (norma IDSS): paso de 800 mm; lo usan Crew Dragon y Starliner en los IDA: https://en.wikipedia.org/wiki/NASA_Docking_System",
  saw: "Alas solares de la ISS: 35 m × 12 m extendidas, casi 31 kW cada una, giran sobre su eje largo (BGA): https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station",
  eatcs: "Sistema de control térmico externo de la ISS (EATCS): radiadores que expulsan hasta 70 kW: https://en.wikipedia.org/wiki/External_Active_Thermal_Control_System",
} as const;

const S = STRUCTURE_SOURCES;

// --- Pressurised stack along z (forward is −z) -------------------------------------
// Node 1 at the centre, like Unity: 5.47 m × 4.57 m.
const NODE1_HALF = 5.47 / 2;
const HAB_LEN = 6.1;
const NODE2_LEN = 5.47;
const FAB_LEN = 8.5;
const IDA_H = 1.1;
const IDA_R = 1.2;

const NODE2_FROM = -NODE1_HALF - HAB_LEN;
const NODE2_TO = NODE2_FROM - NODE2_LEN;
const NODE2_MID = (NODE2_FROM + NODE2_TO) / 2;
const NODE_R = 4.57 / 2;

const MODULES: PressurisedModule[] = [
  { id: "nodo-1", label: "Nodo 1", kind: "nodo", from: new Vec3(0, 0, -NODE1_HALF), to: new Vec3(0, 0, NODE1_HALF), radiusM: NODE_R, basis: "Como el nodo Unity de la ISS", source: S.unity },
  { id: "habitat", label: "Módulo habitable", kind: "habitat", from: new Vec3(0, 0, -NODE1_HALF), to: new Vec3(0, 0, NODE2_FROM), radiusM: 1.5, basis: "Como el HALO del Gateway lunar", source: S.halo },
  { id: "nodo-2", label: "Nodo 2 (atraque)", kind: "nodo", from: new Vec3(0, 0, NODE2_FROM), to: new Vec3(0, 0, NODE2_TO), radiusM: NODE_R, basis: "Otro nodo como Unity, con los dos puertos de atraque", source: S.unity },
  { id: "ida-sonda", label: "Adaptador de atraque del módulo de aterrizaje", kind: "adaptador", from: new Vec3(0, -NODE_R, NODE2_MID), to: new Vec3(0, -NODE_R - IDA_H, NODE2_MID), radiusM: IDA_R, basis: "Como un IDA de la ISS (norma IDSS)", source: S.ida },
  { id: "ida-nodriza", label: "Adaptador de atraque de la nodriza", kind: "adaptador", from: new Vec3(0, 0, NODE2_TO), to: new Vec3(0, 0, NODE2_TO - IDA_H), radiusM: IDA_R, basis: "Como un IDA de la ISS (norma IDSS)", source: S.ida },
  {
    id: "fabrica",
    label: "Módulo de fabricación (refinería, fundición e impresora)",
    kind: "fabrica",
    from: new Vec3(0, 0, NODE1_HALF),
    to: new Vec3(0, 0, NODE1_HALF + FAB_LEN),
    radiusM: 2.15,
    basis: "Valor de juego: del tamaño del laboratorio Destiny de la ISS (8,5 × 4,3 m)",
  },
];

// --- Outside the pressure hull --------------------------------------------------
const TRUSS_Y = 6;
const TRUSS_HALF = 2.25;
const TRUSS_Z = 6;
/** ISS solar array wing, extended. */
const WING_LEN = 35;
const WING_W = 12;
const WING_X = 38;
const RAD_LEN = 23;
const HANGAR_FROM = NODE1_HALF + FAB_LEN;

const wing = (side: 1 | -1, up: 1 | -1): StructurePart => ({
  id: `ala-${side > 0 ? "estribor" : "babor"}-${up > 0 ? "arriba" : "abajo"}`,
  label: "Ala solar",
  kind: "solar",
  // The keep-out box covers the whole sweep of the wing as it turns on its long axis.
  centre: new Vec3(side * WING_X, TRUSS_Y + up * (TRUSS_HALF + WING_LEN / 2), TRUSS_Z),
  half: new Vec3(WING_W / 2, WING_LEN / 2, WING_W / 2),
  basis: "Como un ala solar de la ISS: 35 × 12 m, unos 31 kW",
  source: S.saw,
});

const radiator = (side: 1 | -1): StructurePart => ({
  id: `radiador-${side > 0 ? "estribor" : "babor"}`,
  label: "Radiador",
  kind: "radiador",
  centre: new Vec3(side * 16, TRUSS_Y, TRUSS_Z + TRUSS_HALF + RAD_LEN / 2),
  half: new Vec3(1.7, 0.5, RAD_LEN / 2),
  basis: "Valor de juego: paneles de 23 × 3,4 m, como los radiadores de la ISS",
  source: S.eatcs,
});

const PARTS: StructurePart[] = [
  { id: "celosia", label: "Celosía", kind: "celosia", centre: new Vec3(0, TRUSS_Y, TRUSS_Z), half: new Vec3(WING_X + WING_W / 2, TRUSS_HALF, TRUSS_HALF), basis: "Valor de juego: viga de 4,5 m de sección como la celosía de la ISS" },
  wing(1, 1),
  wing(1, -1),
  wing(-1, 1),
  wing(-1, -1),
  radiator(1),
  radiator(-1),
  { id: "hangar", label: "Hangar", kind: "hangar", centre: new Vec3(0, 0, HANGAR_FROM + 10), half: new Vec3(10, 7, 10), basis: "Valor de juego: guarda las naves y sondas; la puerta mira a popa" },
];

/**
 * Two IDSS ports on node 2, like the ISS's IDAs on Harmony: one below (nadir) for the probe and one
 * ahead (axial) for the mothership's nose, so the mothership lies ahead of the station, clear of the
 * wings and the radiators.
 */
const PORTS: StationPortSpec[] = [
  { id: "estacion-puerto-sonda", name: "Estación (puerto del módulo)", user: "sonda", position: new Vec3(0, -NODE_R - IDA_H, NODE2_MID), normal: new Vec3(0, -1, 0), forward: new Vec3(0, 0, -1) },
  { id: "estacion-puerto-nodriza", name: "Estación (puerto de la nodriza)", user: "nodriza", position: new Vec3(0, 0, NODE2_TO - IDA_H), normal: new Vec3(0, 0, -1), forward: new Vec3(0, -1, 0) },
];

export const POLANA_LAYOUT: StationLayout = { modules: MODULES, parts: PARTS, ports: PORTS };
