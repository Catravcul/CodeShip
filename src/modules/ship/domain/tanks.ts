import type { PressurantLine, Propellant, RealTank, TankBuild, TankSpec } from "./components";

const r2 = (v: number) => Math.round(v * 100) / 100;
const es = (v: number, d = 2) => v.toLocaleString("es-ES", { maximumFractionDigits: d });

/**
 * Helium bottle volume a bipropellant pair needs, litres. Isothermal blowdown of the bottle into the
 * tanks: the gas that leaves the bottle (from `bottleKgM3` down to the regulated `tankKgM3`) must
 * fill the whole tank volume at the regulated pressure. Real-gas densities come from the caller.
 */
export function heliumBottleL(tankVolumeL: number, tankKgM3: number, bottleKgM3: number): number {
  if (bottleKgM3 <= tankKgM3) throw new RangeError("The bottle must hold denser gas than the tanks");
  return (tankVolumeL * tankKgM3) / (bottleKgM3 - tankKgM3);
}

/** The helium line for a pair: the lightest catalogue bottle that holds enough, filled to its MEOP. */
export function pressurantFor(
  tankVolumeL: number,
  bottles: readonly RealTank[],
  gas: { readonly tankKgM3: number; readonly bottleKgM3: number; readonly hardwareKg: number },
): PressurantLine {
  const neededL = heliumBottleL(tankVolumeL, gas.tankKgM3, gas.bottleKgM3);
  const bottle = [...bottles].filter((b) => b.volumeL >= neededL).sort((a, b) => a.massKg - b.massKg)[0];
  if (!bottle) throw new RangeError(`No bottle holds ${neededL.toFixed(1)} L`);
  const heliumKg = r2((bottle.volumeL / 1000) * gas.bottleKgM3);
  return {
    bottle,
    heliumKg,
    hardwareKg: gas.hardwareKg,
    neededL: r2(neededL),
    basis: `${es(tankVolumeL, 1)} L de tanques × ${es(gas.tankKgM3, 4)} kg/m³ ÷ (${es(gas.bottleKgM3, 3)} − ${es(gas.tankKgM3, 4)}) kg/m³ = ${es(neededL, 1)} L de botella; la más ligera que basta es la ${bottle.id} (${es(bottle.volumeL, 1)} L), llena: ${es(heliumKg)} kg de helio`,
  };
}

/** Capacity and dry mass of a tank slot from real tanks: whole kg of propellant, tank and helium masses summed. */
export function tankSpecOf(propellant: Propellant, densityKgM3: number, build: TankBuild): TankSpec {
  const { tank, count, fillFraction, pressurant } = build;
  const capacityKg = Math.floor(((count * tank.volumeL) / 1000) * densityKgM3 * fillFraction);
  const line = pressurant ? pressurant.bottle.massKg + pressurant.heliumKg + pressurant.hardwareKg : 0;
  return { propellant, capacityKg, dryMassKg: r2(count * tank.massKg + line), build };
}

/** Total tank volume of a slot, litres. */
export const buildVolumeL = (b: TankBuild): number => b.count * b.tank.volumeL;
