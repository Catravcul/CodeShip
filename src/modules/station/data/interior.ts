import { Vec3 } from "@core/math/vec3";
import type { Box, Face, Fixture, InteriorVolume, StationInteriorPlan } from "../domain/interior";
import type { InstalledEquipment, StationOutfit } from "../domain/outfit";
import type { PressurisedModule, StationLayout } from "../domain/structure";
import { GROWTH_SOURCES, startingOutfit } from "./outfit";
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
  /** HALO is 3 m across: a 1,6 × 1,9 m passage, ~0,55–0,7 m of outfitting round it (widened so the third-person camera fits, docs/design/ingravidez.md). */
  habitat: { x: 0.8, y: 0.95, basis: "Valor de juego: pasillo de 1,6 × 1,9 m dentro de los 3 m de diámetro del HALO (ensanchado para la cámara en tercera persona)", source: STRUCTURE_SOURCES.halo },
  /** Destiny-sized: a 2 × 2 m passage between ISPR racks 0,86 m deep on the four faces. */
  fabrica: { x: 1.0, y: 1.0, basis: "Valor de juego: pasillo de 2 × 2 m entre bastidores ISPR de 0,86 m de fondo, como en Destiny", source: S.destiny },
  /** Columbus is 4,48 m across: the same 2 × 2 m passage between its ISPR racks. */
  planta: { x: 1.0, y: 1.0, basis: "Valor de juego: pasillo de 2 × 2 m entre bastidores ISPR, como en Columbus", source: GROWTH_SOURCES.columbus },
  /** B330 is 6,7 m across: a 4,4 m square hall between the crop walls. */
  agricola: { x: 2.2, y: 2.2, basis: "Valor de juego: nave de 4,4 × 4,4 m entre las paredes de cultivo, dentro de los 6,7 m de diámetro del B330", source: GROWTH_SOURCES.b330 },
} as const;

/** Depth of an ISPR rack, m. */
const RACK_DEPTH = 0.86;
/** Width of an ISPR rack, m. */
const RACK_WIDTH = 1.05;

/** CBM hatchway, 1,27 m square. */
const CBM_HALF = 1.27 / 2;
/** IDSS passage, 800 mm across. */
const IDSS_HALF = 0.4;
/** Airlock crew lock (game value, the crew half of a Quest-like airlock) and its outer EVA hatch. */
const LOCK = { len: 2.1, x: 0.85, y: 0.95, hatchHalf: 0.5 };

const span = (m: PressurisedModule) => ({ min: Math.min(m.from.z, m.to.z), max: Math.max(m.from.z, m.to.z) });

/**
 * Where a piece of equipment stands: its rack bays on one long wall of its module. Along z the walls
 * are port and starboard; along x (modules on node 1's side ports) forward and aft. Bays count from
 * the end nearest node 1.
 */
function rackFixture(e: InstalledEquipment, vol: InteriorVolume, racksPerSide: number): Fixture {
  const k = vol.half.x > vol.half.z ? "x" : "z";
  const len = 2 * vol.half[k];
  const pitch = len / racksPerSide;
  const sign = Math.sign(vol.centre[k] || 1);
  const start = vol.centre[k] - sign * vol.half[k];
  const along = start + sign * (e.place.first + e.place.count / 2) * pitch;
  const width = pitch * e.place.count - (pitch - RACK_WIDTH);
  const h = 2 * vol.half.y - 0.1;
  const face: Face = k === "z" ? (e.place.side === 0 ? "babor" : "estribor") : e.place.side === 0 ? "proa" : "popa";
  const at = k === "z" ? new Vec3(e.place.side === 0 ? -vol.half.x : vol.half.x, vol.centre.y, along) : new Vec3(along, vol.centre.y, e.place.side === 0 ? vol.centre.z - vol.half.z : vol.centre.z + vol.half.z);
  const size = k === "z" ? new Vec3(RACK_DEPTH, h, width) : new Vec3(width, h, RACK_DEPTH);
  return {
    id: e.spec.id,
    label: e.spec.name,
    volume: vol.id,
    face,
    at,
    size,
    action: { kind: "panel", panel: e.spec.panel },
    ...(e.spec.machine ? { machine: e.spec.machine } : {}),
    info: e.spec.info,
    source: e.spec.basis.source,
  };
}

/**
 * Builds the interior from the station's structure and outfit: the pressurised stack along z (node 2
 * with the docking adapters, the habitat, node 1, the fabrication module), the modules berthed on
 * node 1's side ports (along x), an airlock and the hangar. The machines stand in the rack bays the
 * outfit gives them.
 */
export function stationInteriorPlan(layout: StationLayout = POLANA_LAYOUT, outfit: StationOutfit = startingOutfit()): StationInteriorPlan {
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

  const aisle = (id: string, code: string, label: string, kind: keyof typeof AISLE, z: { min: number; max: number }): InteriorVolume => ({
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
    aisle("fabrica", outfit.module("fabrica")?.code ?? "FAB1", "Módulo de fabricación", "fabrica", fab),
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
      label: "Adaptador de atraque del módulo de aterrizaje",
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
    fx({ id: "salir-sonda", label: "Escotilla del módulo", volume: "nodo-2", face: "suelo", at: new Vec3(0, -N.y, n2Mid), size: new Vec3(0.8, 0.1, 0.8), action: { kind: "salir", to: "sonda" }, info: "Escotilla IDSS: por aquí vuelves a la cabina del módulo de aterrizaje", source: STRUCTURE_SOURCES.nds }),
    fx({ id: "salir-nodriza", label: "Escotilla de la nodriza", volume: "nodo-2", face: "proa", at: new Vec3(0, 0, n2.min), size: new Vec3(0.8, 0.8, 0.1), action: { kind: "salir", to: "nodriza" }, info: "Escotilla IDSS: por aquí se pasa a la nodriza atracada", source: STRUCTURE_SOURCES.nds }),
    // The ship bay's console, by the two docking hatches: the docked ships seen by the hangar cameras.
    fx({ id: "consola-bahia", label: "Consola de la bahía", volume: "nodo-2", face: "babor", at: new Vec3(-N.x, 0.1, n2Mid - 0.95), size: new Vec3(0.1, 0.8, 1.1), action: { kind: "bahia" }, info: "Bahía de la nave: aquí se revisan y se cambian las piezas del módulo de aterrizaje y de la nodriza atracados" }),
    fx({ id: "carga-nodo2", label: "Bolsas de carga", volume: "nodo-2", face: "techo", at: new Vec3(0, N.y, n2Mid + 1.2), size: new Vec3(1.6, 0.6, 1.2), action: { kind: "info" }, info: "Bolsas de carga atadas al techo, como en los nodos de la ISS" }),
    // Habitat (HALO-like), zigzagging from wall to wall so each thing is 2 m from the next (HAB-08):
    // exercise and hygiene by node 1, the galley with its table in the middle, the crew quarters at the quiet end.
    fx({ id: "ejercicio", label: "Ejercicio", volume: "habitat", face: "estribor", at: new Vec3(H.x, 0, habZ(0.12)), size: new Vec3(0.6, 1.5, 1.3), action: { kind: "info" }, info: "Bicicleta sin sillín como la CEVIS (25–350 W) y un volante de inercia como el de Orion: en ingravidez hay que hacer ejercicio cada día", source: S.exercise }),
    fx({ id: "aseo", label: "Aseo", volume: "habitat", face: "babor", at: new Vec3(-H.x, 0, habZ(0.38)), size: new Vec3(0.7, 1.6, 1.0), action: { kind: "info" }, info: "Aseo cerrado con un UWMS, el de la ISS desde 2020: el aire arrastra lo que en la Tierra cae", source: S.uwms }),
    fx({ id: "cocina", label: "Cocina y mesa", volume: "habitat", face: "estribor", at: new Vec3(H.x, 0.2, habZ(0.62)), size: new Vec3(0.6, 1.2, 1.3), action: { kind: "info" }, info: "Calentador de comida y grifo de agua caliente y fría, como en la ISS, y una mesa con cinchas y velcro como la del nodo Unity: aquí solo se calienta; para cocinar está la nodriza, a 1 g", source: STRUCTURE_SOURCES.unity }),
    fx({ id: "camarote-babor", label: "Camarotes y botiquín", volume: "habitat", face: "babor", at: new Vec3(-H.x, 0, habZ(0.88)), size: new Vec3(0.75, 1.7, 1.4), action: { kind: "info" }, info: "Dos camarotes para visitas (~1,8 m³ cada uno, como los ~2 m³ de la ISS: saco de dormir sujeto a la pared, luz, ventilación y portátil) y el botiquín con su monitor (lo mínimo de un CHeCS). La enfermería está en la nodriza", source: S.crewQuarters }),
    fx({ id: "esclusa-carga", label: "Esclusa de carga", volume: "fabrica", face: "techo", at: new Vec3(0, F.y, fabZ(0.92)), size: new Vec3(1.0, 0.5, 1.0), action: { kind: "panel", panel: "hangar" }, info: "Esclusa de carga como la Bishop de la ISS: pasa las piezas fabricadas al hangar sin vaciar el módulo", source: S.bishop }),
    // Airlock and hangar.
    fx({ id: "trajes", label: "Trajes y esclusa", volume: "esclusa", face: "estribor", at: new Vec3(LOCK.x, 0, (lock.min + lock.max) / 2), size: new Vec3(0.4, 1.7, 1.2), action: { kind: "esclusa" }, info: "Dos trajes, como en la esclusa Quest. El hangar está al vacío: hay que vaciar la esclusa para pasar", source: S.quest }),
    fx({ id: "consola-hangar", label: "Consola del hangar", volume: "hangar", face: "proa", at: new Vec3(-2.2, 0.6, lock.max + 0.1), size: new Vec3(0.7, 0.5, 0.1), action: { kind: "panel", panel: "hangar" }, info: "Lista de naves, sondas y piezas guardadas" }),
    fx({ id: "estante-babor", label: "Piezas de repuesto", volume: "hangar", face: "babor", at: new Vec3(-(hz.x - rackDepth), hc.y - hz.y / 2, (rackZ.min + rackZ.max) / 2), size: new Vec3(rackDepth, hz.y, rackZ.max - rackZ.min), action: { kind: "panel", panel: "hangar" }, info: "Estantes de piezas de repuesto: se montan en la bahía de la nave" }),
    fx({ id: "estante-estribor", label: "Piezas de repuesto", volume: "hangar", face: "estribor", at: new Vec3(hz.x - rackDepth, hc.y - hz.y / 2, (rackZ.min + rackZ.max) / 2), size: new Vec3(rackDepth, hz.y, rackZ.max - rackZ.min), action: { kind: "panel", panel: "hangar" }, info: "Estantes de piezas de repuesto: se montan en la bahía de la nave" }),
    fx({ id: "cunas", label: "Sondas fabricadas", volume: "hangar", face: "suelo", at: new Vec3(0, hc.y - hz.y + 2.4, hc.z + 1), size: new Vec3(12, 2.4, 9), action: { kind: "panel", panel: "hangar" }, info: "Cunas de las sondas construidas en la estación" }),
    fx({ id: "puerta-hangar", label: "Puerta del hangar", volume: "hangar", face: "popa", at: new Vec3(0, 0, hangar.max - 0.2), size: new Vec3(16, 11, 0.1), action: { kind: "info" }, info: "La puerta mira a popa y está abierta: el hangar no tiene aire, como la bodega del transbordador", source: S.shuttleBay }),
  ];

  // --- Modules berthed on the side ports (along x) ---------------------------------------
  const used = outfit.usedBerths();
  const CAP = new Vec3(0.1, 1.27, 1.27);
  for (const m of outfit.modules) {
    if (!m.spec || m.spec.kind === "hangar" || !m.berth) continue;
    const pm = layout.modules.find((x) => x.id === m.id);
    const berth = outfit.berths.find((b) => b.id === m.berth);
    if (!pm || !berth) continue;
    const kind = m.spec.kind;
    const a = AISLE[kind];
    const s = Math.sign(berth.normal.x) || 1;
    const x0 = pm.from.x;
    const x1 = pm.to.x;
    volumes.push({ id: m.id, code: m.code, label: m.label, kind, centre: new Vec3((x0 + x1) / 2, 0, 0), half: new Vec3(Math.abs(x1 - x0) / 2, a.y, a.x), pressurised: true, basis: a.basis, source: a.source });
    // The hatch: from node 1's aisle through the CBM to the module, or across the joint between two modules.
    const fromNode = berth.id.startsWith("nodo-1");
    const inner = fromNode ? N.x - 0.3 : Math.abs(x0) - 0.5;
    const outer = Math.abs(x0) + 0.5;
    volumes.push({
      id: `escotilla-${m.id}`,
      code: "ESC",
      label: `Escotilla ${berth.label.replace(/, puerto de \w+$/, "")} – ${m.label}`,
      kind: "escotilla",
      centre: new Vec3((s * (inner + outer)) / 2, 0, 0),
      half: new Vec3((outer - inner) / 2, CBM_HALF, CBM_HALF),
      through: "x",
      pressurised: true,
      basis: "Escotilla CBM de 1,27 m de lado, como entre los módulos de la ISS",
      source: S.cbm,
    });
    if (m.spec.endPort && !used.has(`${m.id}-extremo`))
      fixtures.push({ id: `puerto-${m.id}`, label: "Puerto libre", volume: m.id, face: s > 0 ? "estribor" : "babor", at: new Vec3(x1, 0, 0), size: CAP, action: { kind: "info" }, info: "Puerto CBM cerrado en el extremo: aquí se puede atracar otro módulo", source: S.cbm });
  }
  // Node 1's capped radial ports, while nothing is berthed there.
  if (!used.has("nodo-1-babor")) fixtures.push({ id: "puerto-babor", label: "Puerto radial libre", volume: "nodo-1", face: "babor", at: new Vec3(-N.x, 0, 0), size: CAP, action: { kind: "info" }, info: "Puerto CBM cerrado: como Unity, este nodo tiene seis puertos; aquí se atraca un módulo nuevo (Planos → Módulos)", source: STRUCTURE_SOURCES.unity });
  if (!used.has("nodo-1-estribor")) fixtures.push({ id: "puerto-estribor", label: "Puerto radial libre", volume: "nodo-1", face: "estribor", at: new Vec3(N.x, 0, 0), size: CAP, action: { kind: "info" }, info: "Puerto CBM cerrado, con su tapa: aquí se atraca un módulo nuevo (Planos → Módulos)", source: S.cbm });
  // Equipment in every module's rack bays.
  for (const e of outfit.equipment) {
    const vol = volumes.find((v) => v.id === e.moduleId);
    const om = outfit.module(e.moduleId);
    if (vol && om) fixtures.push(rackFixture(e, vol, om.racksPerSide));
  }

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
