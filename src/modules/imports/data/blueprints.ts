import type { Blueprint } from "@modules/station/domain/blueprint";
import { EQ_BIG_PRINTER, EQ_EBW } from "@modules/station/data/outfit";
import { MASS_DRIVER_CRAFT, TUG_CRAFT } from "./craft";
import { IMPORT_SRC } from "./sources";

/**
 * The station's own import sources, as blueprints in the station's tree (docs/design/importacion.md):
 * both need machines the station has to grow first. Recipes, kits and hours are game values.
 */
export const TUG_BLUEPRINT: Blueprint = {
  id: "plano-remolcador",
  name: TUG_CRAFT.name,
  product: { kind: "craft", craft: TUG_CRAFT },
  machine: "montaje",
  massKg: TUG_CRAFT.massKg,
  // Steel truss and arms from the rock; carbon booms for the wings; the cells, four Hall thrusters' power units and avionics come in kits.
  inputs: { hierro: 2200, niquel: 300, carbono: 600, ceramica: 150, kit: 24 },
  hours: 240,
  process: {
    value: "Remolcador de propulsión eléctrica solar como el del estudio de recuperación de asteroides de Keck (40 kW, Isp 3 000 s), con los brazos de la opción B de ARM",
    source: IMPORT_SRC.keck,
    note: "La estructura y los brazos se imprimen aquí; células, propulsores Hall y aviónica llegan en kits. Receta y horas: valores de juego",
  },
  steps: ["imprime la viga central y los brazos", "lamina los mástiles de las alas", "extiende las mantas de células del kit", "monta los cuatro propulsores Hall", "llena el depósito de xenón", "prueba los brazos con una roca de ensayo"],
  requires: EQ_BIG_PRINTER.id,
};

export const MASS_DRIVER_BLUEPRINT: Blueprint = {
  id: "plano-lanzador-masas",
  name: MASS_DRIVER_CRAFT.name,
  product: { kind: "craft", craft: MASS_DRIVER_CRAFT },
  machine: "soldadora",
  massKg: MASS_DRIVER_CRAFT.massKg,
  // Coil housings and rails of steel, ceramic insulators; the coils' conductor, capacitors and the miner's electronics come in kits.
  inputs: { hierro: 800, niquel: 150, ceramica: 120, carbono: 80, kit: 16 },
  hours: 160,
  process: {
    value: "Acelerador de bobinas como el Mass Driver Two de O'Neill (5 000 m/s² hasta 112 m/s) que lanza cubos de 10,5 kg, con un minero que los llena",
    source: IMPORT_SRC.massDriver,
    note: "Raíles y carcasas de acero soldados aquí; bobinas, condensadores y electrónica llegan en kits. Receta y horas: valores de juego",
  },
  steps: ["suelda los raíles y las carcasas de las bobinas", "monta las bobinas del kit", "monta los condensadores", "monta el minero y la tolva", "dispara un cubo de prueba"],
  requires: EQ_EBW.id,
};

export const IMPORT_BLUEPRINTS: readonly Blueprint[] = [TUG_BLUEPRINT, MASS_DRIVER_BLUEPRINT];
