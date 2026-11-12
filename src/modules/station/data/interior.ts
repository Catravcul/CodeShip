import { Vec3 } from "@core/math/vec3";
import type { Box, Fixture, InteriorVolume, StationInteriorPlan } from "../domain/interior";
import type { PressurisedModule, StationLayout } from "../domain/structure";
import { SRC } from "./sources";
import { POLANA_LAYOUT, STRUCTURE_SOURCES } from "./structure";

// --- Sources -------------------------------------------------------------------
export const INTERIOR_SOURCES = {
  localVertical: "NASA-STD-3001 Vol. 2, V2 8007 (orientación coherente respecto a una vertical local), V2 8010 (códigos de ubicación) y V2 8011 (ayudas para orientarse): https://www.nasa.gov/reference/8-0-architecture-vol-2",
  rackCodes: "Códigos de ubicación de bastidores de la ISS (LAB1O1, LAB1S2, LAB1P4: módulo, cara y bahía): https://gipoc.grc.nasa.gov/pims/pimsdocs/public/ISS%20Handbook/hb_vib_equipment_Inc68_POSSUM_SAMS_Photos_2023.pdf",
  destiny: "Destiny: 8,5 × 4,3 m, 24 bastidores, seis en cada cara: https://en.wikipedia.org/wiki/Destiny_(ISS_module)",
  ispr: "Bastidor ISPR: unos 2 m de alto, 1,05 m de ancho y 0,86 m de fondo: https://en.wikipedia.org/wiki/International_Standard_Payload_Rack",
  cbm: "Mecanismo de atraque común (CBM): paso cuadrado de 50 pulgadas (1,27 m): https://en.wikipedia.org/wiki/Common_Berthing_Mechanism",
  quest: "Esclusa Quest de la ISS: 5,5 × 4 m, 34 m³; esclusa de tripulación con dos trajes y esclusa de equipo: https://en.wikipedia.org/wiki/Quest_Joint_Airlock",
  bishop: "Esclusa Bishop de la ISS (2020): campana de 4 m³ que saca cargas al vacío: https://en.wikipedia.org/wiki/Bishop_Airlock_Module",
  msg: "Guantera MSG de Destiny: 255 L de volumen de trabajo, puertos de guantes de 40 cm: https://en.wikipedia.org/wiki/Microgravity_Science_Glovebox",
  crewQuarters: "Camarotes de la ISS (Node 2), unos 2 m³ cada uno: https://ntrs.nasa.gov/citations/20080013462",
  uwms: "Aseo UWMS (Universal Waste Management System), en la ISS desde 2020: https://en.wikipedia.org/wiki/Space_toilet",
  exercise: "Ejercicio en la ISS: CEVIS de 25–350 W, ARED hasta 272 kg: https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884",
  orion: "Orion: volante de inercia para el ejercicio en una cápsula pequeña: https://en.wikipedia.org/wiki/Orion_(spacecraft)",
  iss: "ISS: 916 m³ presurizados en total: https://en.wikipedia.org/wiki/International_Space_Station",
  shuttleBay: "Bodega del transbordador: 18,3 × 4,6 m, sin presurizar, con las puertas abiertas en órbita: https://en.wikipedia.org/wiki/Space_Shuttle_orbiter",
} as const;

const S = INTERIOR_SOURCES;

/**
 * Free aisle of each kind of module, half-widths (across x, up y), m. Game values: what is left of the
 * module's diameter once the racks (or the habitat's outfitting) line the four walls.
 */
const AISLE = {
  /** Unity is 4,57 m across: a 2,4 m square passage between stowage racks. */
  nodo: { x: 1.2, y: 1.2, basis: "Valor de juego: pasillo de 2,4 × 2,4 m dentro de un nodo de 4,57 m como Unity", source: STRUCTURE_SOURCES.unity },
  /** HALO is 3 m across: a 1,2 × 1,7 m passage, ~0,75 m of outfitting on each side. */
  habitat: { x: 0.6, y: 0.85, basis: "Valor de juego: pasillo de 1,2 × 1,7 m dentro de los 3 m de diámetro del HALO", source: STRUCTURE_SOURCES.halo },
  /** Destiny-sized: a 2 × 2 m passage between ISPR racks 0,86 m deep on the four faces. */
  fabrica: { x: 1.0, y: 1.0, basis: "Valor de juego: pasillo de 2 × 2 m entre bastidores ISPR de 0,86 m de fondo, como en Destiny", source: S.destiny },
} as const;

/** CBM hatchway, 1,27 m square. */
const CBM_HALF = 1.27 / 2;
/** IDSS passage, 800 mm across. */
const IDSS_HALF = 0.4;
/** Airlock crew lock (game value, the crew half of a Quest-like airlock) and its outer EVA hatch. */
const LOCK = { len: 2.1, x: 0.85, y: 0.95, hatchHalf: 0.5 };

const span = (m: PressurisedModule) => ({ min: Math.min(m.from.z, m.to.z), max: Math.max(m.from.z, m.to.z) });

/**
 * Builds the interior from the station's structure: the pressurised stack along z (node 2 with the
 * docking adapters, the habitat, node 1, the fabrication module), an airlock and the hangar.
 */
export function stationInteriorPlan(layout: StationLayout = POLANA_LAYOUT): StationInteriorPlan {
  const mod = (id: string) => {
    const m = layout.modules.find((x) => x.id === id);
    if (!m) throw new Error(`No module ${id}`);
    return m;
  };
  const hangarPart = layout.parts.find((p) => p.kind === "hangar")!;
  const n1 = span(mod("nodo-1"));
  const hab = span(mod("habitat"));
  const n2 = span(mod("nodo-2"));
  const fab = span(mod("fabrica"));
  const idaSonda = mod("ida-sonda");
  const idaNodriza = mod("ida-nodriza");
  const n2Mid = (n2.min + n2.max) / 2;
  const lock = { min: fab.max, max: fab.max + LOCK.len };
  const hangar = { min: hangarPart.centre.z - hangarPart.half.z, max: hangarPart.centre.z + hangarPart.half.z };

  const aisle = (id: string, code: string, label: string, kind: "nodo" | "habitat" | "fabrica", z: { min: number; max: number }): InteriorVolume => ({
    id,
    code,
    label,
    kind,
    centre: new Vec3(0, 0, (z.min + z.max) / 2),
    half: new Vec3(AISLE[kind].x, AISLE[kind].y, (z.max - z.min) / 2),
    pressurised: true,
    basis: AISLE[kind].basis,
    source: AISLE[kind].source,
  });
  const hatch = (id: string, label: string, z: number, half: number, needs?: "presion" | "traje"): InteriorVolume => ({
    id,
    code: "ESC",
    label,
    kind: "escotilla",
    centre: new Vec3(0, 0, z),
    half: new Vec3(half, half, 0.5),
    through: "z",
    pressurised: needs !== "traje",
    ...(needs ? { needs } : {}),
    basis: half === CBM_HALF ? "Escotilla CBM de 1,27 m de lado, como entre los módulos de la ISS" : "Valor de juego: escotilla EVA de 1 m",
    source: half === CBM_HALF ? S.cbm : S.quest,
  });

  const volumes: InteriorVolume[] = [
    aisle("nodo-2", "NOD2", "Nodo 2 (atraque)", "nodo", n2),
    aisle("habitat", "HAB1", "Módulo habitable", "habitat", hab),
    aisle("nodo-1", "NOD1", "Nodo 1", "nodo", n1),
    aisle("fabrica", "FAB1", "Módulo de fabricación", "fabrica", fab),
    {
      id: "esclusa",
      code: "ESC1",
      label: "Esclusa",
      kind: "esclusa",
      centre: new Vec3(0, 0, (lock.min + lock.max) / 2),
      half: new Vec3(LOCK.x, LOCK.y, LOCK.len / 2),
      pressurised: true,
      basis: "Valor de juego: la esclusa de tripulación de una esclusa como Quest, de 2,1 m",
      source: S.quest,
    },
    {
      id: "hangar",
      code: "HNG1",
      label: "Hangar (sin presión)",
      kind: "hangar",
      centre: hangarPart.centre,
      half: hangarPart.half.sub(new Vec3(0.2, 0.2, 0.2)),
      pressurised: false,
      basis: "Hangar abierto al vacío, como la bodega del transbordador: presurizar 20 × 14 × 20 m costaría 6,7 t de aire y empujaría 28 MN cada pared de 20 × 14 m (41 MN el suelo de 20 × 20 m)",
      source: S.shuttleBay,
    },
    hatch("escotilla-hab-nodo2", "Escotilla Nodo 2 – Módulo habitable", n2.max, CBM_HALF),
    hatch("escotilla-nodo1-hab", "Escotilla Módulo habitable – Nodo 1", n1.min, CBM_HALF),
    hatch("escotilla-nodo1-fab", "Escotilla Nodo 1 – Fabricación", n1.max, CBM_HALF),
    hatch("escotilla-fab-esclusa", "Escotilla interior de la esclusa", lock.min, CBM_HALF, "presion"),
    hatch("escotilla-esclusa-hangar", "Escotilla exterior de la esclusa", lock.max, LOCK.hatchHalf, "traje"),
    {
      id: "tunel-sonda",
      code: "IDA1",
      label: "Adaptador de atraque de la sonda",
      kind: "escotilla",
      centre: new Vec3(0, (idaSonda.to.y - AISLE.nodo.y + 0.2) / 2, n2Mid),
      half: new Vec3(IDSS_HALF, (-AISLE.nodo.y + 0.2 - idaSonda.to.y) / 2, IDSS_HALF),
      through: "y",
      pressurised: true,
      basis: "Paso IDSS de 800 mm, por el suelo del Nodo 2",
      source: STRUCTURE_SOURCES.nds,
    },
    {
      id: "tunel-nodriza",
      code: "IDA2",
      label: "Adaptador de atraque de la nodriza",
      kind: "escotilla",
      centre: new Vec3(0, 0, (idaNodriza.to.z + n2.min + 0.4) / 2),
      half: new Vec3(IDSS_HALF, IDSS_HALF, (n2.min + 0.4 - idaNodriza.to.z) / 2),
      through: "z",
      pressurised: true,
      basis: "Paso IDSS de 800 mm, por proa del Nodo 2",
      source: STRUCTURE_SOURCES.nds,
    },
  ];

  const hz = hangarPart.half;
  const hc = hangarPart.centre;
  // The airlock sticks into the hangar from its fore wall; racks line the port and starboard walls.
  const rackDepth = 1.2;
  const rackZ = { min: lock.max + 1.5, max: hangar.max - 2.5 };
  const solids: (Box & { volume: string })[] = [
    { volume: "hangar", centre: new Vec3(0, 0, (lock.min + lock.max) / 2), half: new Vec3(LOCK.x + 0.2, LOCK.y + 0.2, LOCK.len / 2) },
    ...[-1, 1].map((side) => ({
      volume: "hangar",
      centre: new Vec3(side * (hz.x - rackDepth / 2), hc.y - hz.y / 2, (rackZ.min + rackZ.max) / 2),
      half: new Vec3(rackDepth / 2, hz.y / 2, (rackZ.max - rackZ.min) / 2),
    })),
  ];

  const rackSlots: Vec3[] = [];
  const perRow = 6;
  // Fill the middle shelf (in reach) first, port then starboard, then the bottom and top ones.
  for (const shelf of [1, 0, 2])
    for (const side of [-1, 1])
      for (let i = 0; i < perRow; i++)
        rackSlots.push(new Vec3(side * (hz.x - rackDepth / 2), hc.y - hz.y + 1 + shelf * 2.1, rackZ.min + 1 + (i * (rackZ.max - rackZ.min - 2)) / (perRow - 1)));
  const cradles: Vec3[] = [];
  for (const z of [hc.z - 2, hc.z + 4]) for (const x of [-4.5, 0, 4.5]) cradles.push(new Vec3(x, hc.y - hz.y + 1.2, z));

  // --- Fixtures --------------------------------------------------------------
  const N = AISLE.nodo;
  const H = AISLE.habitat;
  const F = AISLE.fabrica;
  const habZ = (f: number) => hab.max - f * (hab.max - hab.min); // f from the node 1 end (0) to node 2 (1)
  const fabZ = (f: number) => fab.min + f * (fab.max - fab.min);
  const fx = (f: Fixture): Fixture => f;
  const fixtures: Fixture[] = [
    // Node 2: the two docking hatches.
    fx({ id: "salir-sonda", label: "Escotilla de la sonda", volume: "nodo-2", face: "suelo", at: new Vec3(0, -N.y, n2Mid), size: new Vec3(0.8, 0.1, 0.8), action: { kind: "salir", to: "sonda" }, info: "Escotilla IDSS: por aquí vuelves a la cabina de la sonda", source: STRUCTURE_SOURCES.nds }),
    fx({ id: "salir-nodriza", label: "Escotilla de la nodriza", volume: "nodo-2", face: "proa", at: new Vec3(0, 0, n2.min), size: new Vec3(0.8, 0.8, 0.1), action: { kind: "salir", to: "nodriza" }, info: "Escotilla IDSS: por aquí se pasa a la nodriza atracada", source: STRUCTURE_SOURCES.nds }),
    fx({ id: "carga-nodo2", label: "Bolsas de carga", volume: "nodo-2", face: "techo", at: new Vec3(0, N.y, n2Mid + 1.2), size: new Vec3(1.6, 0.6, 1.2), action: { kind: "info" }, info: "Bolsas de carga atadas al techo, como en los nodos de la ISS" }),
    // Habitat (HALO-like): exercise and hygiene by node 1, galley and table in the middle, crew quarters at the quiet end.
    fx({ id: "ejercicio", label: "Ejercicio", volume: "habitat", face: "estribor", at: new Vec3(H.x, 0, habZ(0.17)), size: new Vec3(0.6, 1.5, 1.3), action: { kind: "info" }, info: "Bicicleta sin sillín como la CEVIS (25–350 W) y un volante de inercia como el de Orion: en ingravidez hay que hacer ejercicio cada día", source: S.exercise }),
    fx({ id: "aseo", label: "Aseo", volume: "habitat", face: "babor", at: new Vec3(-H.x, 0, habZ(0.17)), size: new Vec3(0.7, 1.6, 1.0), action: { kind: "info" }, info: "Aseo cerrado con un UWMS, el de la ISS desde 2020: el aire arrastra lo que en la Tierra cae", source: S.uwms }),
    fx({ id: "cocina", label: "Cocina", volume: "habitat", face: "estribor", at: new Vec3(H.x, 0.2, habZ(0.48)), size: new Vec3(0.6, 1.2, 1.3), action: { kind: "info" }, info: "Calentador de comida y grifo de agua caliente y fría, como en la ISS: aquí solo se calienta; para cocinar está la nodriza, a 1 g" }),
    fx({ id: "mesa", label: "Mesa", volume: "habitat", face: "suelo", at: new Vec3(0, -H.y + 0.35, habZ(0.48)), size: new Vec3(0.9, 0.06, 0.6), action: { kind: "info" }, info: "Mesa con cinchas y velcro para sujetar las bolsas de comida, como la del nodo Unity de la ISS", source: STRUCTURE_SOURCES.unity }),
    fx({ id: "botiquin", label: "Botiquín", volume: "habitat", face: "techo", at: new Vec3(0, H.y, habZ(0.33)), size: new Vec3(0.9, 0.4, 0.5), action: { kind: "info" }, info: "Botiquín y monitor (lo mínimo de un CHeCS). La enfermería está en la nodriza" }),
    fx({ id: "camarote-babor", label: "Camarote", volume: "habitat", face: "babor", at: new Vec3(-H.x, 0, habZ(0.8)), size: new Vec3(0.75, 1.7, 1.4), action: { kind: "info" }, info: "Camarote para visitas (~1,8 m³, como los ~2 m³ de la ISS): saco de dormir sujeto a la pared, luz, ventilación y portátil", source: S.crewQuarters }),
    fx({ id: "camarote-estribor", label: "Camarote", volume: "habitat", face: "estribor", at: new Vec3(H.x, 0, habZ(0.8)), size: new Vec3(0.75, 1.7, 1.4), action: { kind: "info" }, info: "Segundo camarote para visitas, en el extremo tranquilo del módulo, lejos del aseo y de la cocina", source: S.crewQuarters }),
    // Node 1: free radial ports.
    fx({ id: "puerto-babor", label: "Puerto radial libre", volume: "nodo-1", face: "babor", at: new Vec3(-N.x, 0, 0), size: new Vec3(0.1, 1.27, 1.27), action: { kind: "info" }, info: "Puerto CBM cerrado: como Unity, este nodo tiene seis puertos y quedan libres para crecer", source: STRUCTURE_SOURCES.unity }),
    fx({ id: "puerto-estribor", label: "Puerto radial libre", volume: "nodo-1", face: "estribor", at: new Vec3(N.x, 0, 0), size: new Vec3(0.1, 1.27, 1.27), action: { kind: "info" }, info: "Puerto CBM cerrado, con su tapa", source: S.cbm }),
    // Fabrication module (Destiny-sized): the machines in ISPR-sized racks.
    fx({ id: "refineria", label: "Refinería", volume: "fabrica", face: "babor", at: new Vec3(-F.x, 0, fabZ(0.2)), size: new Vec3(0.86, 1.9, 1.05), action: { kind: "panel", panel: "materiales" }, machine: "refineria", info: "Horno sellado de la refinería: saca el agua de la roca y separa el hierro y el níquel", source: SRC.thermalExtraction }),
    fx({ id: "guantera", label: "Guantera", volume: "fabrica", face: "estribor", at: new Vec3(F.x, 0, fabZ(0.2)), size: new Vec3(0.86, 1.9, 1.05), action: { kind: "panel", panel: "materiales" }, info: "Guantera como la MSG (255 L, puertos de 40 cm): aquí se miran las muestras de roca sin que el polvo flote por el módulo", source: S.msg }),
    fx({ id: "fundicion", label: "Fundición", volume: "fabrica", face: "babor", at: new Vec3(-F.x, 0, fabZ(0.5)), size: new Vec3(0.86, 1.9, 1.05), action: { kind: "panel", panel: "fabricacion" }, machine: "fundicion", info: "Fundición: funde y cuela el metal refinado; su cola de trabajos está en Fabricación", source: SRC.mre }),
    fx({ id: "impresora", label: "Impresora 3D de metal", volume: "fabrica", face: "estribor", at: new Vec3(F.x, 0, fabZ(0.5)), size: new Vec3(0.86, 1.9, 1.05), action: { kind: "panel", panel: "planos" }, machine: "impresora", info: "Impresora de metal como la de la ESA en la ISS (acero, 2024): imprime lo que digan los planos", source: SRC.metalPrinter }),
    fx({ id: "esclusa-carga", label: "Esclusa de carga", volume: "fabrica", face: "techo", at: new Vec3(0, F.y, fabZ(0.82)), size: new Vec3(1.0, 0.5, 1.0), action: { kind: "panel", panel: "hangar" }, info: "Esclusa de carga como la Bishop de la ISS: pasa las piezas fabricadas al hangar sin vaciar el módulo", source: S.bishop }),
    // Airlock and hangar.
    fx({ id: "trajes", label: "Trajes y esclusa", volume: "esclusa", face: "estribor", at: new Vec3(LOCK.x, 0, (lock.min + lock.max) / 2), size: new Vec3(0.4, 1.7, 1.2), action: { kind: "esclusa" }, info: "Dos trajes, como en la esclusa Quest. El hangar está al vacío: hay que vaciar la esclusa para pasar", source: S.quest }),
    fx({ id: "consola-hangar", label: "Consola del hangar", volume: "hangar", face: "proa", at: new Vec3(1.0, 0.6, lock.max + 0.1), size: new Vec3(0.7, 0.5, 0.1), action: { kind: "panel", panel: "hangar" }, info: "Lista de naves, sondas y piezas guardadas" }),
    fx({ id: "estante-babor", label: "Piezas de repuesto", volume: "hangar", face: "babor", at: new Vec3(-(hz.x - rackDepth), hc.y - hz.y / 2, (rackZ.min + rackZ.max) / 2), size: new Vec3(rackDepth, hz.y, rackZ.max - rackZ.min), action: { kind: "panel", panel: "hangar" }, info: "Estantes de piezas de repuesto: se montan en la bahía de la nave" }),
    fx({ id: "estante-estribor", label: "Piezas de repuesto", volume: "hangar", face: "estribor", at: new Vec3(hz.x - rackDepth, hc.y - hz.y / 2, (rackZ.min + rackZ.max) / 2), size: new Vec3(rackDepth, hz.y, rackZ.max - rackZ.min), action: { kind: "panel", panel: "hangar" }, info: "Estantes de piezas de repuesto: se montan en la bahía de la nave" }),
    fx({ id: "cunas", label: "Sondas fabricadas", volume: "hangar", face: "suelo", at: new Vec3(0, hc.y - hz.y + 2.4, hc.z + 1), size: new Vec3(12, 2.4, 9), action: { kind: "panel", panel: "hangar" }, info: "Cunas de las sondas construidas en la estación" }),
    fx({ id: "puerta-hangar", label: "Puerta del hangar", volume: "hangar", face: "popa", at: new Vec3(0, 0, hangar.max - 0.2), size: new Vec3(16, 11, 0.1), action: { kind: "info" }, info: "La puerta mira a popa y está abierta: el hangar no tiene aire, como la bodega del transbordador", source: S.shuttleBay }),
  ];

  return {
    volumes,
    fixtures,
    solids,
    entries: {
      sonda: { at: new Vec3(0, -N.y + 0.6, n2Mid), facing: new Vec3(0, 0, 1) },
      nodriza: { at: new Vec3(0, 0, n2.min + 0.9), facing: new Vec3(0, 0, 1) },
    },
    storage: { rackSlots, cradles, crate: new Vec3(0.9, 0.9, 0.9) },
  };
}

/** Numbers behind the hangar decision (docs/design/interiores.md §5): air mass and load on a wall. */
export function hangarPressureCase(layout: StationLayout = POLANA_LAYOUT, cabinKPa = 101.3, airKgM3 = 1.19): { volumeM3: number; airKg: number; wallLoadMN: number } {
  const h = layout.parts.find((p) => p.kind === "hangar")!.half;
  const volumeM3 = 8 * h.x * h.y * h.z;
  // Biggest wall: the fore/aft or side wall (both 20 × 14 m here).
  const wallM2 = 4 * Math.max(h.x * h.y, h.z * h.y, h.x * h.z);
  return { volumeM3, airKg: volumeM3 * airKgM3, wallLoadMN: (cabinKPa * 1000 * wallM2) / 1e6 };
}

export const POLANA_INTERIOR = stationInteriorPlan();
