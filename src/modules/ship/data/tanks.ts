import type { Propellant, RealTank, TankBuild, TankSpec } from "../domain/components";
import { pressurantFor, tankSpecOf } from "../domain/tanks";
import { FILL, HELIUM_KG_M3, PRESSURANT_HARDWARE_KG, PROPELLANT_DENSITY } from "./propellants";

/**
 * Real propellant and pressurant tanks (docs/design/componentes.md, «Tanques»). Northrop Grumman
 * values are copied from its data-sheet tables in US units and converted here (in³ × 0.0163871 = L,
 * psig × 0.0689476 = bar, lb × 0.45359237 = kg). Checked 2026-11-13.
 */
export const TANK_SRC = {
  ngDiaphragm: "https://northropgrumman.com/space/diaphragm-tanks-data-sheets-sorted-by-volume",
  ngPmd: "https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks/data-sheets-sorted-by-part-number",
  ngPressurant: "https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks/data-sheets-sorted-by-volume",
  ariane: "https://space-propulsion.com/spacecraft-propulsion/bipropellant-tanks/index.html",
  mt: "https://www.mt-aerospace.de/files/mta/tankkatalog/MT-Tankkatalog.pdf",
} as const;

const L = (in3: number) => Math.round(in3 * 0.0163871 * 100) / 100;
const BAR = (psi: number) => Math.round(psi * 0.0689476 * 10) / 10;
const KG = (lb: number) => Math.round(lb * 0.45359237 * 100) / 100;
const NG = "Northrop Grumman";
const TI = "Titanio Ti-6Al-4V";

function ng(id: string, in3: number, psig: number, lb: number, expulsion: RealTank["expulsion"], flight: string, source: string): RealTank {
  const material = expulsion === "diafragma" ? `${TI} con diafragma de elastómero` : expulsion === "PMD" ? `${TI} con dispositivo de tensión superficial (PMD)` : `${TI} monolítico`;
  return { id, maker: NG, volumeL: L(in3), meopBar: BAR(psig), massKg: KG(lb), material, expulsion, flight, source };
}

// --- Bipropellant (PMD: no elastomer touches the NTO) ------------------------------------------
export const NG_80599 = ng("80599-1", 5774, 320, 14.6, "PMD", "Lunar Lander (programa así listado)", TANK_SRC.ngPmd);
export const NG_80546 = ng("80546-1", 7996, 350, 24.2, "PMD", "JWST: el tanque de NTO", TANK_SRC.ngPmd);
export const NG_80433 = ng("80433-1", 12150, 325, 20.0, "PMD", "MESSENGER", TANK_SRC.ngPmd);
export const OST_25_0: RealTank = { id: "OST 25/0", maker: "ArianeGroup", volumeL: 282, meopBar: 22, massKg: 21, material: `${TI} con PMD`, expulsion: "PMD", flight: "Amos 2", source: TANK_SRC.ariane };

// --- Monopropellant (diaphragm, blowdown) -----------------------------------------------------
export const NG_80397 = ng("80397-1", 2300, 320, 10, "diafragma", "Mars Surveyor, Phoenix, InSight", TANK_SRC.ngDiaphragm);
export const NG_80274 = ng("80274-1", 3660, 377, 14.77, "diafragma", "Dawn, MSL, TESS, OCO-2", TANK_SRC.ngDiaphragm);
export const NG_80428 = ng("80428-1", 7261, 417, 29, "diafragma", "New Horizons, Coriolis", TANK_SRC.ngDiaphragm);
export const NG_80325 = ng("80325-1", 11350, 450, 44, "diafragma", "Magellan, Cassini, Hinode", TANK_SRC.ngDiaphragm);
export const NG_80407 = ng("80407-1", 28144, 400, 78, "diafragma", "LRO, X-38", TANK_SRC.ngDiaphragm);
/** PRISMA flew both an HPGP (LMP-103S) and a hydrazine system; the table does not say which used this tank. */
export const NG_80498 = ng("80498-1", 920, 525, 6, "diafragma", "PRISMA (llevaba HPGP y también hidracina)", TANK_SRC.ngDiaphragm);

// --- Helium bottles (filled to 310 bar) ---------------------------------------------------------
export const NG_80586 = ng("80586-1", 2135, 4500, 17.6, "gas", "Lander lunar de Axiom (programa así listado)", TANK_SRC.ngPressurant);
export const NG_80445 = ng("80445-1", 4105, 4500, 23.15, "gas", "MESSENGER", TANK_SRC.ngPressurant);
/** MT Aerospace PVG family: titanium liner wound with T800 carbon fibre (a COPV). 40 L is its small end: 8.5 kg. */
export const PVG_40: RealTank = { id: "PVG 40", maker: "MT Aerospace", volumeL: 40, meopBar: 310, massKg: 8.5, material: "Forro de titanio con fibra de carbono T800 bobinada (COPV)", expulsion: "gas", flight: "Familia PVG 40–75 L: SpaceBus, MTG, Euclid", source: TANK_SRC.mt };
export const HELIUM_BOTTLES: readonly RealTank[] = [NG_80586, PVG_40, NG_80445];

const BLOWDOWN = { fillFraction: FILL.blowdown.value, fillBasis: FILL.blowdown.note };
const PMD_FILL = { fillFraction: FILL.pmd.value, fillBasis: FILL.pmd.note };

/** A bipropellant pair: a fuel tank and an oxidizer tank of the same volume, and its helium line. */
function pair(tank: RealTank): TankSpec {
  const build: TankBuild = {
    tank,
    count: 2,
    ...PMD_FILL,
    pressurant: pressurantFor(2 * tank.volumeL, HELIUM_BOTTLES, { tankKgM3: HELIUM_KG_M3.tank.value, bottleKgM3: HELIUM_KG_M3.bottle.value, hardwareKg: PRESSURANT_HARDWARE_KG }),
  };
  return tankSpecOf("MMH/NTO", PROPELLANT_DENSITY["MMH/NTO"].value, build);
}
const mono = (p: Propellant, tank: RealTank, count = 1): TankSpec => tankSpecOf(p, PROPELLANT_DENSITY[p].value, { tank, count, ...BLOWDOWN });

export const PAIR_80599 = pair(NG_80599);
export const PAIR_80546 = pair(NG_80546);
export const PAIR_80433 = pair(NG_80433);
export const PAIR_OST25 = pair(OST_25_0);
export const N2H4_80397 = mono("Hydrazine", NG_80397);
export const N2H4_80274 = mono("Hydrazine", NG_80274);
export const N2H4_80428 = mono("Hydrazine", NG_80428);
export const N2H4_80325 = mono("Hydrazine", NG_80325);
export const N2H4_80407 = mono("Hydrazine", NG_80407);
export const LMP_80498_X2 = mono("LMP-103S", NG_80498, 2);
export const LMP_80498_X4 = mono("LMP-103S", NG_80498, 4);
