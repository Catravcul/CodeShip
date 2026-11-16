import { Vec3 } from "@core/math/vec3";
import type { PressurisedModule, StationLayout, StationPortSpec, StructurePart } from "../domain/structure";
import type { BerthSpec } from "../domain/outfit";
import { EXPOSED_FACILITY, ISS_OUTSIDE, ISS_SOURCES, issModule } from "./iss";

// --- Sources -------------------------------------------------------------------
export const STRUCTURE_SOURCES = {
  unity: ISS_SOURCES.unity,
  harmony: ISS_SOURCES.harmony,
  /** HALO stays as a reference for the mothership's and the backlog's habitats. */
  halo: "HALO (Habitation and Logistics Outpost) del Gateway lunar: 6,1 m de largo y 3 m de diámetro, dos puertos axiales y hasta dos radiales: https://handwiki.org/wiki/Astronomy:Habitation_and_Logistics_Outpost",
  ida: ISS_SOURCES.ida,
  nds: "NASA Docking System (norma IDSS): paso de 800 mm; lo usan Crew Dragon y Starliner en los IDA: https://en.wikipedia.org/wiki/NASA_Docking_System",
  saw: ISS_SOURCES.saw,
  eatcs: ISS_SOURCES.eatcs,
  facts: ISS_SOURCES.facts,
  kibo: ISS_SOURCES.kibo,
} as const;

const S = STRUCTURE_SOURCES;
const src = (s: string) => s.split(": ").pop()!;

/*
 * The ISS's US segment (docs/design/estacion-real.md). Body frame: x along the truss (starboard),
 * y zenith, z aft (forward is −z). Unity is at the origin; the stack runs forward through Destiny to
 * Harmony; Tranquility (with the Cupola under it and the Bishop at its end) is on Unity's port side and
 * Quest on its starboard side; Kibo and Columbus are on Harmony's port and starboard sides, as on the
 * real station. Sizes are the real ones (data/iss.ts).
 */
const M = (id: string) => issModule(id);
const R = (id: string) => M(id).diameterM / 2;
const L = (id: string) => M(id).lengthM;

const UNITY_HALF = L("nodo-1") / 2;
const DESTINY_TO = -UNITY_HALF - L("destiny");
const HARMONY_TO = DESTINY_TO - L("nodo-2");
const HARMONY_MID = (DESTINY_TO + HARMONY_TO) / 2;
const NODE3_TO = -R("nodo-1") - L("nodo-3");
const NODE3_MID = (-R("nodo-1") + NODE3_TO) / 2;
const IDA_H = 1.1;
const IDA_R = 1.2;

const mod = (id: string, kind: PressurisedModule["kind"], from: Vec3, to: Vec3, basis: string): PressurisedModule => ({ id, label: M(id).name, kind, from, to, radiusM: R(id), basis, source: M(id).source });

const MODULES: PressurisedModule[] = [
  mod("nodo-1", "nodo", new Vec3(0, 0, UNITY_HALF), new Vec3(0, 0, -UNITY_HALF), "Unity: 5,47 × 4,57 m"),
  mod("destiny", "laboratorio", new Vec3(0, 0, -UNITY_HALF), new Vec3(0, 0, DESTINY_TO), "Destiny: 8,5 × 4,3 m, en la proa de Unity"),
  mod("nodo-2", "nodo", new Vec3(0, 0, DESTINY_TO), new Vec3(0, 0, HARMONY_TO), "Harmony: 6,7 × 4,4 m, en la proa de Destiny"),
  mod("nodo-3", "nodo", new Vec3(-R("nodo-1"), 0, 0), new Vec3(NODE3_TO, 0, 0), "Tranquility: 6,706 × 4,48 m, en el puerto de babor de Unity"),
  mod("cupula", "cupula", new Vec3(NODE3_MID, -R("nodo-3"), 0), new Vec3(NODE3_MID, -R("nodo-3") - L("cupula"), 0), "Cupola: 1,5 × 2,95 m, en el nadir de Tranquility"),
  mod("bishop", "carga", new Vec3(NODE3_TO, 0, 0), new Vec3(NODE3_TO - L("bishop"), 0, 0), "Bishop: 1,8 × 2,014 m, en el puerto de babor de Tranquility"),
  mod("quest", "esclusa", new Vec3(R("nodo-1"), 0, 0), new Vec3(R("nodo-1") + L("quest"), 0, 0), "Quest: 5,5 × 4 m, en el puerto de estribor de Unity"),
  mod("columbus", "fabrica", new Vec3(R("nodo-2"), 0, HARMONY_MID), new Vec3(R("nodo-2") + L("columbus"), 0, HARMONY_MID), "Columbus: 6,871 × 4,477 m, en el puerto de estribor de Harmony"),
  mod("kibo", "laboratorio", new Vec3(-R("nodo-2"), 0, HARMONY_MID), new Vec3(-R("nodo-2") - L("kibo"), 0, HARMONY_MID), "Kibo: 11,19 × 4,39 m, en el puerto de babor de Harmony"),
  {
    id: "ida-sonda",
    label: "IDA de cenit (módulo de aterrizaje)",
    kind: "adaptador",
    from: new Vec3(0, R("nodo-2"), HARMONY_MID),
    to: new Vec3(0, R("nodo-2") + IDA_H, HARMONY_MID),
    radiusM: IDA_R,
    basis: "Como el IDA-3 en el cenit de Harmony (norma IDSS). Sin el PMA de debajo, para no alargar (distribución nuestra)",
    source: src(S.ida),
  },
  {
    id: "ida-nodriza",
    label: "IDA de proa (nave nodriza)",
    kind: "adaptador",
    from: new Vec3(0, 0, HARMONY_TO),
    to: new Vec3(0, 0, HARMONY_TO - IDA_H),
    radiusM: IDA_R,
    basis: "Como el IDA-2 en la proa de Harmony, donde atracaba el transbordador (norma IDSS). Sin el PMA de debajo (distribución nuestra)",
    source: src(S.ida),
  },
];

// --- Outside the pressure hull --------------------------------------------------
/** The truss sits on Destiny's zenith (S0 on its mounting struts). */
const TRUSS_Y = 5.5;
const TRUSS_HALF = 2.25;
const TRUSS_Z = -UNITY_HALF - L("destiny") / 2;
const TRUSS_HALF_LEN = ISS_OUTSIDE.trussLengthM / 2;
const WING_LEN = ISS_OUTSIDE.wingLengthM;
const WING_W = ISS_OUTSIDE.wingWidthM;
/** Two photovoltaic modules per side (like P4/P6 and S4/S6), each with a wing up and a wing down: 8 wings. */
const WING_XS = [34.5, 48.5];
const RAD_LEN = 23;

const wing = (side: 1 | -1, k: number, up: 1 | -1): StructurePart => ({
  id: `ala-${side > 0 ? "estribor" : "babor"}-${k + 1}-${up > 0 ? "arriba" : "abajo"}`,
  label: "Ala solar",
  kind: "solar",
  // The keep-out box covers the whole sweep of the wing as it turns on its long axis.
  centre: new Vec3(side * WING_XS[k]!, TRUSS_Y + up * (TRUSS_HALF + WING_LEN / 2), TRUSS_Z),
  half: new Vec3(WING_W / 2, WING_LEN / 2, WING_W / 2),
  basis: "Ala solar de la ISS: 35 × 12 m, unos 31 kW; ocho alas, dos módulos por lado",
  source: src(S.saw),
});

const radiator = (side: 1 | -1, k: number): StructurePart => ({
  id: `radiador-${side > 0 ? "estribor" : "babor"}-${k + 1}`,
  label: "Radiador",
  kind: "radiador",
  centre: new Vec3(side * (11 + 4 * k), TRUSS_Y, TRUSS_Z + TRUSS_HALF + RAD_LEN / 2),
  half: new Vec3(1.7, 0.5, RAD_LEN / 2),
  basis: "Tres radiadores por lado en S1 y P1, como el EATCS de la ISS (real); paneles de 23 × 3,4 m: tamaño aproximado (valor de juego)",
  source: src(S.eatcs),
});

const EF = EXPOSED_FACILITY;
const KIBO_END = -R("nodo-2") - L("kibo");

const PARTS: StructurePart[] = [
  { id: "celosia", label: "Celosía integrada", kind: "celosia", centre: new Vec3(0, TRUSS_Y, TRUSS_Z), half: new Vec3(TRUSS_HALF_LEN, TRUSS_HALF, TRUSS_HALF), basis: "Celosía integrada de la ISS: 94 m de largo (real); 4,5 m de sección (valor de juego)", source: src(S.facts) },
  ...([1, -1] as const).flatMap((side) => [0, 1].flatMap((k) => [wing(side, k, 1), wing(side, k, -1)])),
  ...([1, -1] as const).flatMap((side) => [0, 1, 2].map((k) => radiator(side, k))),
  {
    id: "jem-ef",
    label: "Plataforma expuesta de Kibo (JEM-EF)",
    kind: "plataforma",
    centre: new Vec3(KIBO_END - EF.lengthM / 2, 0, HARMONY_MID),
    half: new Vec3(EF.lengthM / 2, EF.heightM / 2, EF.widthM / 2),
    basis: "Exposed Facility de Kibo: 4 × 5,6 × 5 m, 4000 kg, 12 puertos: aquí van los estantes de piezas",
    source: src(S.kibo),
  },
];

/**
 * Two IDSS ports on Harmony, as on the ISS: the zenith one (IDA-3) for the lander and the forward one
 * (IDA-2, where the Space Shuttle docked) for the mothership, which lies ahead of the station.
 */
const PORTS: StationPortSpec[] = [
  { id: "estacion-puerto-sonda", name: "Estación (IDA de cenit, módulo)", user: "sonda", position: new Vec3(0, R("nodo-2") + IDA_H, HARMONY_MID), normal: new Vec3(0, 1, 0), forward: new Vec3(0, 0, -1) },
  { id: "estacion-puerto-nodriza", name: "Estación (IDA de proa, nodriza)", user: "nodriza", position: new Vec3(0, 0, HARMONY_TO - IDA_H), normal: new Vec3(0, 0, -1), forward: new Vec3(0, -1, 0) },
];

export const POLANA_LAYOUT: StationLayout = { modules: MODULES, parts: PARTS, ports: PORTS };

/** Where Canadarm2 berths the lander: Unity's nadir CBM, where the Cygnus freighters berth (real). */
export const LANDER_CBM = { position: new Vec3(0, -R("nodo-1"), 0), normal: new Vec3(0, -1, 0), source: src(ISS_SOURCES.unity) };

/** Where the Bishop sits and the arm takes it to release its payload (station frame). */
export const BISHOP_BERTH = { position: new Vec3(NODE3_TO, 0, 0), normal: new Vec3(-1, 0, 0) };

/** Canadarm2's base: the Mobile Base System on the truss rails. */
export const ARM_BASE = new Vec3(0, TRUSS_Y - TRUSS_HALF, TRUSS_Z);

/**
 * Free CBM ports for new modules: Tranquility's aft port (BEAM's, real) and forward port (Leonardo's,
 * real). Neither BEAM nor Leonardo is modelled, so the station grows there.
 */
export const POLANA_BERTHS: readonly BerthSpec[] = [
  { id: "nodo-3-popa", label: "Tranquility, puerto de popa", position: new Vec3(NODE3_MID, 0, R("nodo-3")), normal: new Vec3(0, 0, 1) },
  { id: "nodo-3-proa", label: "Tranquility, puerto de proa", position: new Vec3(NODE3_MID, 0, -R("nodo-3")), normal: new Vec3(0, 0, -1) },
];
