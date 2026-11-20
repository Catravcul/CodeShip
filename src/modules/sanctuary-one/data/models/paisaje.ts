import { C, m, pz, type ModelDef } from "./kit";

/**
 * The landscape models (SampleSceneBuilder.WildCaps.cs, Territorio.cs, Icebergs.cs): what polar fauna really uses on
 * the wild caps (pressure ridge, snowdrift, rock outcrop, wind scour with lichen), the tundra's plants on the land
 * island, and the two icebergs (a tenth above water, the keel down to the shallow bottom).
 */
const WC = (what: string) => `Cold Sanctuary, Assets/Editor/SampleSceneBuilder.WildCaps.cs ${what}`;
const IB = (what: string) => `Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Icebergs.cs ${what}`;
const TU = (what: string) => `Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Territorio.cs ${what} (docs/territorio-polar.md)`;
const ICE = 0xdbedf7;
const DEEP = 0x8cbfd9;

/** A tabular iceberg w × d with h above water (one tenth of its height) and its keel to `keel` m below. */
const berg = (w: number, d: number, h: number, keel: number) => [C(0, h / 2, 0, w, h, d, ICE), C(w * 0.2, h + 2.5, -d * 0.1, w * 0.4, 5, d * 0.5, ICE), C(0, -keel / 2, 0, w * 0.95, keel, d * 0.95, DEEP)];

export const PAISAJE_MODELS: readonly ModelDef[] = [
  m("cresta-presion", "naturaleza", "hielo-silvestre", "Placa de una cresta de presión (abrigo del oso y del zorro)", 3, 2, 0.9, 0xb8dbf2, "caja", "real", WC("cresta de presión")),
  { ...m("ventisquero", "naturaleza", "hielo-silvestre", "Ventisquero a sotavento (guarida de la osa)", 8, 0.5, 18, 0xf0f5fa, "caja", "real", WC("ventisquero")), walkThrough: true },
  m("roca-nunatak", "naturaleza", "roca", "Afloramiento de roca (nunatak: nido y posadero del petrel)", 4, 3, 4, 0x5c5754, "caja", "real", WC("afloramiento de roca")),
  m("roca-nunatak-alta", "naturaleza", "roca", "Peña mayor del afloramiento (5 m)", 4.5, 5, 4, 0x5c5754, "caja", "real", WC("afloramiento de roca, la mayor")),
  { ...m("liquen-viento", "naturaleza", "flora-tundra", "Hueco de viento con liquen a la vista", 4, 0.03, 7, 0x9a9a6a, "caja", "real", WC("hueco de viento y liquen")), walkThrough: true },
  { ...m("descansadero", "naturaleza", "hielo-silvestre", "Descansadero de la orilla (foca y morsa)", 9, 0.4, 3.2, 0xf0f5fa, "caja", "real", WC("descansadero")), walkThrough: true },
  { ...m("tundra-musgo", "naturaleza", "flora-tundra", "Colchón de musgo y liquen de la tundra", 3, 0.08, 3, 0x7a8a4a, "caja", "real", TU("tundra")), walkThrough: true },
  { ...m("tundra-sauce", "naturaleza", "flora-tundra", "Sauce ártico (Salix arctica, rastrero)", 1.2, 0.15, 1.2, 0x6a8a3a, "arbol", "real", TU("tundra: Salix arctica")), walkThrough: true },
  { ...m("tundra-dryas", "naturaleza", "flora-tundra", "Dríada de ocho pétalos en flor (Dryas octopetala)", 0.8, 0.12, 0.8, 0xe8e0a0, "arbol", "real", TU("tundra: Dryas octopetala")), walkThrough: true },
  { ...m("tundra-algodon", "naturaleza", "flora-tundra", "Algodón ártico (Eriophorum)", 0.6, 0.3, 0.6, 0xf2f2ea, "arbol", "real", TU("tundra: charcas con Eriophorum")), walkThrough: true },
  { ...m("tundra-charca", "naturaleza", "flora-tundra", "Charca de tundra", 6, 0.02, 4, 0x5a8fae, "cilindro", "real", TU("charcas")), walkThrough: true },
  // The caps' own surface (Berón 2026-11-20: «¿los casquetes son realistas?»), docs/design/santuario1.md §Casquetes: wind-cut
  // snow ridges along the wind (sastrugi, 10–50 cm), hummocks of broken ice on the edges, and the cracks of the shore.
  { ...pz("sastrugi", "naturaleza", "hielo-casquete", "Sastrugi (crestas de nieve talladas por el viento)", 0xf6f9fb, [C(0, 0.1, 0, 0.9, 0.2, 4.2), C(0.1, 0.24, -0.4, 0.55, 0.1, 2.8), C(-0.1, 0.31, -0.8, 0.3, 0.06, 1.4)], "real", "Sastrugi: crestas de 0,1–0,5 m alineadas con el viento dominante (Filhol y Sturm 2015, «Snow bedforms: a review, new data, and a formation model», J. Geophys. Res. Earth Surf.)"), walkThrough: true },
  pz("hummock", "naturaleza", "hielo-casquete", "Montículo de hielo roto (hummock) cubierto de nieve", 0xd4e7f2, [C(0, 0.35, 0, 2.6, 0.7, 2.2, 0xd4e7f2), C(0.3, 0.85, 0.2, 1.4, 0.5, 1.2, 0xc4dff0), C(-0.5, 0.6, -0.5, 1.0, 0.6, 0.9, 0xb8d8ec), C(0.1, 0.72, 0.1, 2.2, 0.06, 1.8, 0xf6f9fb)], "real", "Hummocks: bloques de hielo roto de 0,5–2 m apilados por la presión (WMO Sea-Ice Nomenclature, «hummock»)"),
  { ...m("grieta-marea", "naturaleza", "hielo-casquete", "Grieta de marea (el hielo fijo se rompe donde sube y baja con la marea)", 1.2, 0.02, 14, 0x2e5a6e, "caja", "real", "Tide crack: grieta paralela a la costa del hielo fijo (WMO Sea-Ice Nomenclature, «tide crack»)"), walkThrough: true },
  pz("iceberg-varado", "terreno", "icebergs", "Iceberg tabular varado (80 × 60 m, 240 m de alto, un décimo fuera)", ICE, berg(80, 60, 24, 40), "real", IB("Iceberg_varado (−500, −500)")),
  pz("iceberg-deriva", "terreno", "icebergs", "Iceberg tabular a la deriva (100 × 70 m, 300 m de alto)", ICE, berg(100, 70, 30, 40), "real", IB("Iceberg_deriva (540, 200) → (520, −260)")),
];
