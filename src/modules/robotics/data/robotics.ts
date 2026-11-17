import type { Sourced } from "@core/units";
import type { Reality } from "@core/reality";
import { Vec3 } from "@core/math/vec3";
import { ARM_BASE, BISHOP_BERTH, LANDER_CBM, POLANA_LAYOUT } from "@modules/station/data/structure";

/**
 * Canadarm2, its Mobile Base System and Dextre as they are on the ISS (docs/design/brazo-robotico.md).
 * Every number has its source; what the sources do not give is a game value and says so. Checked 2026-11-17.
 */
export const ROBOTICS_SOURCES = {
  mss: "Mobile Servicing System (Wikipedia): Canadarm2 mide 17,6 m, pesa 1800 kg y tiene 35 cm de diámetro y siete articulaciones motorizadas; un LEE en cada punta con tres cables que atrapan el vástago del accesorio de agarre; anda de punta a punta entre PDGF; mueve hasta 116 000 kg; la base móvil (MBS) tiene cuatro PDGF y recorre 108 m de raíles de la celosía a unos 1,5 m/min; con el brazo y Dextre, 4900 kg; se maneja desde los puestos robóticos (RWS) de Destiny o de la Cupola; los astronautas hacen las capturas de vehículos: https://en.wikipedia.org/wiki/Mobile_Servicing_System",
  csa: "Agencia Espacial Canadiense, «About Canadarm2»: 17 m, hasta 116 000 kg, una «mano» igual en cada punta (Latching End Effector) cuyos cables se tensan para agarrar; anda de punta a punta entre accesorios que le dan corriente, datos y vídeo; captura cargueros como Dragon y HTV: https://asc-csa.gc.ca/eng/iss/canadarm2/about.asp",
  csaSheet: "Agencia Espacial Canadiense, ficha de Canadarm2: siete grados de libertad, como un brazo humano: tres articulaciones en el hombro, una en el codo y tres en la muñeca: https://www.asc-csa.gc.ca/eng/iss/canadarm2/data-sheet.asp",
  dextre: "Dextre (SPDM, Wikipedia): 1662 kg, dos brazos de 3,5 m con siete articulaciones cada uno; en cada mano un OTCM con mandíbulas, llave retráctil, cámara y luces; lo mueve Canadarm2 por el accesorio de agarre de su cabeza; primera tarea el 4 de febrero de 2011; ha cambiado RPCM y una cámara exterior: https://en.wikipedia.org/wiki/Dextre",
  capturePoint: "NASA, 7 de mayo de 2019: «The SpaceX Dragon cargo craft reaches its capture point 10 meters from the International Space Station»: https://www.nasa.gov/image-article/spacex-dragon-reaches-capture-point",
  cygnusXl: "NASA, 13 de abril de 2026: Canadarm2 captura el Cygnus XL en su punto de captura; desde tierra el brazo lo lleva al puerto de nadir de Unity: https://www.nasa.gov/blogs/spacestation/2026/04/13/canadarm2-reaches-out-and-captures-cygnus-xl-cargo-craft/",
  ng19: "Spaceflight Now, NG-19 (4 de agosto de 2023): Canadarm2 agarra el accesorio de la base del Cygnus a las 09:52 UTC; lo atraca en el puerto de nadir de Unity y los pernos motorizados lo fijan dos horas y media después de la captura: https://spaceflightnow.com/2023/08/04/cygnus-cargo-ship-berthed-at-space-station/",
  cbm: "Mecanismo de atraque común (CBM, Wikipedia): el brazo acerca el vehículo, cuatro pestillos de captura lo arriman (primera etapa) y 16 pernos motorizados lo cierran (segunda etapa): https://en.wikipedia.org/wiki/Common_Berthing_Mechanism",
  bishop: "Bishop (Nanoracks, 2020): Canadarm2 la saca del puerto de babor de Tranquility, suelta la carga y la vuelve a atracar: https://en.wikipedia.org/wiki/Nanoracks_Bishop_Airlock",
} as const;

const url = (s: string) => s.split(": ").pop()!;
const S = ROBOTICS_SOURCES;

/** Canadarm2 (SSRMS). */
export const SSRMS = {
  lengthM: { value: 17.6, source: url(S.mss), note: "17,6 m extendido (la CSA redondea a 17 m)" },
  massKg: { value: 1800, source: url(S.mss) },
  diameterM: { value: 0.35, source: url(S.mss) },
  joints: { value: 7, source: url(S.csaSheet), note: "Tres en el hombro, una en el codo, tres en la muñeca" },
  lees: { value: 2, source: url(S.csa), note: "Una «mano» LEE igual en cada punta: cualquiera puede ser la base" },
  maxPayloadKg: { value: 116000, source: url(S.csa) },
  /** Fastest the tip moves here, m/s: not published per load (game value). */
  tipSpeedMs: { value: 0.3, source: url(S.mss), note: "Valor de juego: la fuente no da velocidades" },
} as const satisfies Record<string, Sourced<number>>;

/** The Mobile Base System on the Mobile Transporter. */
export const MBS = {
  railM: { value: 108, source: url(S.mss) },
  speedMPerMin: { value: 1.5, source: url(S.mss), note: "«top speed of about 1.5 meters per minute»" },
  pdgfs: { value: 4, source: url(S.mss), note: "Uno en cada esquina de arriba" },
  massWithArmAndDextreKg: { value: 4900, source: url(S.mss) },
} as const satisfies Record<string, Sourced<number>>;

/** Dextre (Special Purpose Dexterous Manipulator). */
export const DEXTRE = {
  massKg: { value: 1662, source: url(S.dextre) },
  armLengthM: { value: 3.5, source: url(S.dextre) },
  bodyLengthM: { value: 3.5, source: url(S.dextre) },
  jointsPerArm: { value: 7, source: url(S.dextre) },
} as const satisfies Record<string, Sourced<number>>;

/** Free-flyer capture of a cargo vehicle. */
export const CAPTURE = {
  /** Where the vehicle holds for the arm, m from the station. */
  pointM: { value: 10, source: url(S.capturePoint) },
  /** From capture to bolts driven home on the CBM, board hours (NG-19). */
  captureToBoltsH: { value: 2.5, source: url(S.ng19) },
  /** The LEE's snares catch the grapple shaft within this, m (game value: the envelope is not published). */
  envelopeM: { value: 0.2, source: url(S.mss), note: "Valor de juego: la fuente no publica el margen del LEE" },
  /** Tip speed at which the snares still close, m/s (game value). */
  closeSpeedMs: { value: 0.05, source: url(S.mss), note: "Valor de juego" },
  /** What is left of the vehicle's drift once in free drift, m/s (game value). */
  freeDriftMs: { value: 0.01, source: url(S.capturePoint), note: "Valor de juego: en deriva libre el vehículo apenas se mueve" },
  /** First-stage capture latches and second-stage bolts of the CBM. */
  latches: { value: 4, source: url(S.cbm) },
  bolts: { value: 16, source: url(S.cbm) },
} as const satisfies Record<string, Sourced<number>>;

/** A grapple fixture the arm can latch: a PDGF (power, data, video: a base it can walk to) or an FRGF (grab only). */
export interface GrappleFixture {
  readonly id: string;
  readonly label: string;
  readonly kind: "pdgf" | "frgf";
  /** Station frame (x starboard along the truss, y zenith, z aft). MBS ones ride with it (`onMbs`). */
  readonly at: Vec3;
  readonly onMbs?: boolean;
  readonly reality: Reality;
  readonly basis: string;
  readonly source: string;
}

const part = (id: string) => POLANA_LAYOUT.parts.find((p) => p.id === id)!;
const module = (id: string) => POLANA_LAYOUT.modules.find((m) => m.id === id)!;
const mid = (id: string) => {
  const m = module(id);
  return new Vec3((m.from.x + m.to.x) / 2, (m.from.y + m.to.y) / 2, (m.from.z + m.to.z) / 2);
};
const truss = part("celosia");
const ef = part("jem-ef");

/**
 * The station's grapple fixtures in the game (positions: distribución nuestra on the real modules). The ISS has
 * PDGFs on Destiny, Harmony, the MBS (four), Unity and the S1/P1 truss among others; the ones here are the ones
 * the game's jobs use.
 */
export const GRAPPLE_FIXTURES: readonly GrappleFixture[] = [
  { id: "mbs-1", label: "PDGF 1 de la MBS", kind: "pdgf", at: ARM_BASE.add(new Vec3(-2, 0, 0)), onMbs: true, reality: "real", basis: "La MBS tiene cuatro PDGF, uno en cada esquina de arriba", source: url(S.mss) },
  { id: "mbs-3", label: "PDGF 3 de la MBS (Dextre)", kind: "pdgf", at: ARM_BASE.add(new Vec3(2, 0, 0)), onMbs: true, reality: "real", basis: "Dextre vive en un PDGF de la MBS", source: url(S.mss) },
  { id: "lab", label: "PDGF de Destiny", kind: "pdgf", at: mid("destiny").add(new Vec3(0, -module("destiny").radiusM, 0)), reality: "real", basis: "Destiny tiene un PDGF (su posición aquí: distribución nuestra)", source: url(S.mss) },
  { id: "nodo-2", label: "PDGF de Harmony", kind: "pdgf", at: mid("nodo-2").add(new Vec3(module("nodo-2").radiusM, 0, 0)), reality: "real", basis: "Harmony tiene un PDGF (su posición aquí: distribución nuestra)", source: url(S.mss) },
  { id: "bishop", label: "Accesorio de agarre de la Bishop", kind: "frgf", at: BISHOP_BERTH.position.add(new Vec3(-1.9, 0, 0)), reality: "real", basis: "Canadarm2 agarra la Bishop por su accesorio", source: url(S.bishop) },
  { id: "jem-ef", label: "Estante de repuestos de la JEM-EF", kind: "frgf", at: ef.centre.add(new Vec3(0, ef.half.y, 0)), reality: "real", basis: "Las piezas de fuera se guardan en la plataforma expuesta con su accesorio de agarre", source: url(S.dextre) },
];

export const grapple = (id: string): GrappleFixture => {
  const g = GRAPPLE_FIXTURES.find((f) => f.id === id);
  if (!g) throw new Error(`No grapple fixture ${id}`);
  return g;
};

/** Truss rail limits for the MBS (the 108 m of rails, centred on the truss; ours is 94 m long). */
export const RAIL = { minX: -Math.min(MBS.railM.value / 2, truss.half.x - 3), maxX: Math.min(MBS.railM.value / 2, truss.half.x - 3) };

/** Where a captured vehicle is berthed: Unity's nadir CBM (NG-19, Cygnus XL), or Harmony's if the lander is there. */
export const CARGO_CBM = {
  unity: { id: "unity-nadir", label: "CBM de nadir de Unity", position: LANDER_CBM.position, normal: LANDER_CBM.normal, source: url(S.ng19) },
  harmony: { id: "harmony-nadir", label: "CBM de nadir de Harmony", position: mid("nodo-2").add(new Vec3(0, -module("nodo-2").radiusM, 0)), normal: new Vec3(0, -1, 0), source: url(S.cbm) },
} as const;

/** The external camera Dextre swaps (an ORU on the truss, by the S0 segment: distribución nuestra). */
export const CAMERA_ORU = {
  id: "camara-s0",
  label: "Cámara exterior de S1",
  at: truss.centre.add(new Vec3(9, -truss.half.y, truss.half.z)),
  /** Board hours until radiation leaves it with dead pixels (game value: wear has a cause, never chance). */
  lifeH: { value: 24 * 12, source: url(S.dextre), note: "Valor de juego: la radiación del cinturón va quemando píxeles" },
  massKg: { value: 20, source: url(S.dextre), note: "Valor de juego: la masa de la cámara no está publicada" },
} as const;
