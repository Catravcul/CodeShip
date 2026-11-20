import type { Sourced } from "@core/units";
import type { MachineId } from "@modules/life-support/domain/machine";

/** Turning a harvest into an ingredient with a machine. Every step is one code challenge. */
export interface Process {
  readonly id: string;
  readonly name: string;
  readonly machine: MachineId;
  readonly inputs: Readonly<Record<string, number>>;
  readonly outputs: Readonly<Record<string, number>>;
  readonly steps: Sourced<readonly string[]>;
}

export const PROCESSES: readonly Process[] = [
  {
    id: "moler-trigo",
    name: "Moler trigo",
    machine: "molino",
    inputs: { "trigo-apogee": 1 },
    outputs: { harina: 2 },
    steps: { source: "https://es.wikipedia.org/wiki/Harina", value: ["limpia el grano", "ajusta las muelas", "muele el trigo", "tamiza la harina", "guarda la harina"] },
  },
  {
    id: "hacer-tofu",
    name: "Hacer tofu",
    machine: "procesador-soja",
    inputs: { "soja-hoyt": 1 },
    outputs: { tofu: 2 },
    steps: {
      source: "https://es.wikipedia.org/wiki/Tofu",
      note: "Soak, grind, boil, filter (okara stays behind), coagulate with nigari, press.",
      value: ["remoja la soja", "muélela con agua", "hierve la pasta a {100|37|250} °C", "filtra la leche de soja", "cuaja con nigari", "prensa la cuajada"],
    },
  },
  {
    id: "pienso-gallinas",
    name: "Preparar pienso de gallinas",
    machine: "molino",
    inputs: { "trigo-apogee": 1, "soja-hoyt": 1 },
    outputs: { "pienso-gallinas": 6 },
    steps: {
      source: "https://www.merckvetmanual.com/poultry/nutrition-and-management-poultry/management-of-laying-chickens",
      note: "Cereal for energy, soybean for protein and extra calcium for eggshells.",
      value: ["muele el trigo", "muele la soja", "añade calcio de cáscara triturada", "mezcla el pienso", "guárdalo seco"],
    },
  },
  {
    id: "crema-cacahuete",
    name: "Hacer crema de cacahuete",
    machine: "molino",
    inputs: { "cacahuete-georgia-red": 2 },
    outputs: { "crema-cacahuete": 3 },
    steps: {
      source: "https://en.wikipedia.org/wiki/Peanut_butter",
      note: "Roast at 160 °C, loosen the skins with hot air at 138 °C, then a medium and a fine grind; salt goes in after grinding. 100 g of peanuts give about three 32 g portions.",
      value: ["tuesta los cacahuetes a {160|60|300} °C", "afloja la piel con aire a {138|40|250} °C", "quítales la piel", "muélelos en grueso", "muélelos en fino", "añade sal", "envasa la crema"],
    },
  },
];
