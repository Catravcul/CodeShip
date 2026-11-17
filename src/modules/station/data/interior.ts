import { GEAR_SRC } from "@modules/wellness/data/gear";
import { Vec3 } from "@core/math/vec3";
import type { Face, Fixture, InteriorVolume, StationInteriorPlan } from "../domain/interior";
import type { InstalledEquipment, StationOutfit } from "../domain/outfit";
import type { PressurisedModule, StationLayout } from "../domain/structure";
import { GROWTH_SOURCES, startingOutfit } from "./outfit";
import { REALITY_NAME } from "@core/reality";
import { ISS_SOURCES, issModule } from "./iss";
import { rackSpec } from "@modules/life-support/data/eclss-machines";
import type { RackKind } from "@modules/life-support/domain/eclss";
import { POLANA_LAYOUT, STRUCTURE_SOURCES } from "./structure";
import { eclssFixtures, type RackPlacement } from "./eclss-placement";
import { backWallFixture, COMPARTMENT_SOURCES, CREW_QUARTER, OWN_BUNK, wallCompartment } from "./compartments";

// --- Sources -------------------------------------------------------------------
export const INTERIOR_SOURCES = {
  localVertical: "NASA-STD-3001 Vol. 2, V2 8007 (orientación coherente respecto a una vertical local), V2 8010 (códigos de ubicación) y V2 8011 (ayudas para orientarse): https://www.nasa.gov/reference/8-0-architecture-vol-2",
  rackCodes: "Códigos de ubicación de bastidores de la ISS (LAB1O1, LAB1S2, LAB1P4: módulo, cara y bahía): https://gipoc.grc.nasa.gov/pims/pimsdocs/public/ISS%20Handbook/hb_vib_equipment_Inc68_POSSUM_SAMS_Photos_2023.pdf",
  destiny: "Destiny: 8,5 × 4,3 m, 24 bastidores, seis en cada cara: https://en.wikipedia.org/wiki/Destiny_(ISS_module)",
  ispr: "Bastidor ISPR: unos 2 m de alto, 1,05 m de ancho y 0,86 m de fondo: https://en.wikipedia.org/wiki/International_Standard_Payload_Rack",
  cbm: "Mecanismo de atraque común (CBM): paso cuadrado de 50 pulgadas (1,27 m): https://en.wikipedia.org/wiki/Common_Berthing_Mechanism",
  quest: ISS_SOURCES.quest,
  bishop: ISS_SOURCES.bishop,
  msg: "Guantera MSG de Destiny: 255 L de volumen de trabajo, puertos de guantes de 40 cm: https://en.wikipedia.org/wiki/Microgravity_Science_Glovebox",
  crewQuarters: "Camarotes de la ISS (Node 2), unos 2 m³ cada uno: https://ntrs.nasa.gov/citations/20080013462",
  uwms: "Aseo UWMS (Universal Waste Management System), en la ISS desde 2020: https://en.wikipedia.org/wiki/Space_toilet",
  exercise: "Ejercicio en la ISS: CEVIS de 25–350 W, ARED hasta 272 kg: https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884",
  destinyIss: ISS_SOURCES.destiny,
  orion: "Orion: volante de inercia para el ejercicio en una cápsula pequeña: https://en.wikipedia.org/wiki/Orion_(spacecraft)",
  iss: "ISS: 916 m³ presurizados en total: https://en.wikipedia.org/wiki/International_Space_Station",
  shuttleBay: "Bodega del transbordador: 18,3 × 4,6 m, sin presurizar, con las puertas abiertas en órbita: https://en.wikipedia.org/wiki/Space_Shuttle_orbiter",
  harmony: "Harmony (Nodo 2 de la ISS): 70 m³ habitables y los camarotes de cuatro astronautas: https://en.wikipedia.org/wiki/Harmony_(ISS_module)",
  tranquility: "Tranquility (Nodo 3 de la ISS): el aseo y las máquinas de ejercicio (T2, ARED) están en un nodo: https://en.wikipedia.org/wiki/Tranquility_(ISS_module)",
  haven1: "Haven-1 (Vast): 10,1 m de largo, 4,4 m de diámetro, 45 m³ habitables para cuatro personas: https://en.wikipedia.org/wiki/Haven-1",
  axiomHab: "Axiom Hab One: unos 11 m de largo y 4,2 m de diámetro, camarotes para cuatro tripulantes: https://thespacebucket.com/the-exact-design-of-axioms-commercial-space-station/",
  starlab: "Starlab: módulo habitable de 8 m de diámetro, 450 m³ presurizados para cuatro personas: https://en.wikipedia.org/wiki/Starlab_Space",
} as const;

const S = INTERIOR_SOURCES;

/**
 * Free aisle of each kind of module, half-widths (across, up), m: what is left of the module's diameter
 * once the racks line the four walls. The labs' 2 × 2 m is the real aisle between ISPR racks 0,86 m
 * deep; the nodes' 2,4 m passage and the airlock's are game values.
 */
const AISLE = {
  nodo: { x: 1.2, y: 1.2, basis: "Pasillo de 2,4 × 2,4 m dentro de un nodo de 4,4–4,57 m (valor de juego)", source: STRUCTURE_SOURCES.unity },
  laboratorio: { x: 1.0, y: 1.0, basis: "Pasillo de 2 × 2 m entre bastidores ISPR de 0,86 m de fondo, como en Destiny y Kibo", source: S.destiny },
  fabrica: { x: 1.0, y: 1.0, basis: "Pasillo de 2 × 2 m entre bastidores ISPR, como en Columbus", source: GROWTH_SOURCES.columbus },
  esclusa: { x: 0.95, y: 0.95, basis: "Esclusa de equipo y de tripulación de Quest como un solo pasillo de 1,9 m (valor de juego)", source: S.quest },
  habitat: { x: 1.0, y: 1.0, basis: "Pasillo de 2 × 2 m entre los camarotes (valor de juego)", source: S.axiomHab },
  planta: { x: 1.0, y: 1.0, basis: "Valor de juego: pasillo de 2 × 2 m entre bastidores ISPR, como en Columbus", source: GROWTH_SOURCES.columbus },
  agricola: { x: 2.2, y: 2.2, basis: "Valor de juego: nave de 4,4 × 4,4 m entre las paredes de cultivo, dentro de los 6,7 m de diámetro del B330", source: GROWTH_SOURCES.b330 },
} as const;
type AisleKind = keyof typeof AISLE;

/** Depth of an ISPR rack, m. */
const RACK_DEPTH = 0.86;
/** Width of an ISPR rack, m. */
const RACK_WIDTH = 1.05;

/** CBM hatchway, 1,27 m square. */
const CBM_HALF = 1.27 / 2;
/** IDSS passage, 800 mm across. */
const IDSS_HALF = 0.4;

type Axis = "x" | "y" | "z";
const unit = (k: Axis, s = 1) => new Vec3(k === "x" ? s : 0, k === "y" ? s : 0, k === "z" ? s : 0);
const axisOf = (v: Vec3): Axis => (Math.abs(v.x) >= Math.abs(v.y) && Math.abs(v.x) >= Math.abs(v.z) ? "x" : Math.abs(v.y) >= Math.abs(v.z) ? "y" : "z");

/**
 * Where a piece of equipment stands: its rack bays on one long wall of its module. Along z the walls
 * are port and starboard; along x forward and aft. Bays count from the end nearest the node it hangs on.
 */
function rackFixture(e: InstalledEquipment, vol: InteriorVolume, racksPerSide: number, from: number): Fixture {
  const k = vol.half.x > vol.half.z ? "x" : "z";
  const len = 2 * vol.half[k];
  const pitch = len / racksPerSide;
  const sign = Math.sign(vol.centre[k] - from) || 1;
  const start = vol.centre[k] - sign * vol.half[k];
  const along = start + sign * (e.place.first + e.place.count / 2) * pitch;
  const width = pitch * e.place.count - (pitch - RACK_WIDTH);
  const h = 2 * vol.half.y - 0.1;
  const face: Face = k === "z" ? (e.place.side === 0 ? "babor" : "estribor") : e.place.side === 0 ? "proa" : "popa";
  const at = k === "z" ? new Vec3(vol.centre.x + (e.place.side === 0 ? -vol.half.x : vol.half.x), vol.centre.y, along) : new Vec3(along, vol.centre.y, e.place.side === 0 ? vol.centre.z - vol.half.z : vol.centre.z + vol.half.z);
  const size = k === "z" ? new Vec3(RACK_DEPTH, h, width) : new Vec3(width, h, RACK_DEPTH);
  const label = e.spec.status && e.spec.status !== "real" ? ` · ${REALITY_NAME[e.spec.status]}` : "";
  return {
    id: e.spec.id,
    label: e.spec.name,
    volume: vol.id,
    face,
    at,
    size,
    action: e.spec.rack ? { kind: "info" } : { kind: "panel", panel: e.spec.panel },
    ...(e.spec.machine ? { machine: e.spec.machine } : {}),
    ...(e.spec.rack ? { rack: e.spec.rack } : {}),
    info: `${e.spec.info}${label ? ` (${label.slice(3)})` : ""}`,
    source: e.spec.basis.source,
  };
}

/** A module's free aisle between two points on its axis. */
function aisleOf(m: PressurisedModule, code: string, kind: AisleKind, volKind: InteriorVolume["kind"] = kind): InteriorVolume {
  const k = axisOf(m.to.sub(m.from));
  const a = AISLE[kind];
  const centre = m.from.add(m.to).scale(0.5);
  const len = Math.abs(m.to[k] - m.from[k]) / 2;
  const half = k === "z" ? new Vec3(a.x, a.y, len) : k === "x" ? new Vec3(len, a.y, a.x) : new Vec3(a.x, len, a.y);
  return { id: m.id, code, label: m.label, kind: volKind, centre, half, pressurised: true, basis: a.basis, source: a.source ?? m.source };
}

/**
 * The hatch between a module and the one it hangs on: a CBM passage along `k` from just inside the
 * parent's aisle (`inner`, measured on that axis) to just inside the child (`outer`).
 */
function cbmHatch(id: string, label: string, centreOn: Vec3, k: Axis, inner: number, outer: number, needs?: "presion" | "traje"): InteriorVolume {
  const lo = Math.min(inner, outer);
  const hi = Math.max(inner, outer);
  const c = new Vec3(k === "x" ? (lo + hi) / 2 : centreOn.x, k === "y" ? (lo + hi) / 2 : centreOn.y, k === "z" ? (lo + hi) / 2 : centreOn.z);
  const half = new Vec3(k === "x" ? (hi - lo) / 2 : CBM_HALF, k === "y" ? (hi - lo) / 2 : CBM_HALF, k === "z" ? (hi - lo) / 2 : CBM_HALF);
  return { id, code: "ESC", label, kind: "escotilla", centre: c, half, through: k, pressurised: true, ...(needs ? { needs } : {}), basis: "Escotilla CBM de 1,27 m de lado, como entre los módulos de la ISS", source: S.cbm };
}

/** Parent of a berth: the module it is on (`nodo-3-popa` → `nodo-3`, `x-extremo` → `x`). */
const berthParent = (id: string) => id.slice(0, id.lastIndexOf("-"));

/**
 * Builds the interior of the ISS's US segment from the structure and the outfit (docs/design/estacion-real.md):
 * Unity, Destiny and Harmony along z; Tranquility and Quest on Unity's sides and Kibo and Columbus on
 * Harmony's, along x; then whatever the station grew. Crew areas where they are on the ISS: the galley
 * in Unity, the cabins in Harmony, hygiene and exercise in Tranquility. All at real size; the
 * presentation layer draws it bigger.
 */
export function stationInteriorPlan(layout: StationLayout = POLANA_LAYOUT, outfit: StationOutfit = startingOutfit()): StationInteriorPlan {
  const mod = (id: string) => {
    const m = layout.modules.find((x) => x.id === id);
    if (!m) throw new Error(`No module ${id}`);
    return m;
  };
  const code = (id: string) => outfit.module(id)?.code ?? id.toUpperCase();
  const u = aisleOf(mod("nodo-1"), code("nodo-1"), "nodo");
  const lab = aisleOf(mod("destiny"), code("destiny"), "laboratorio");
  const h2 = aisleOf(mod("nodo-2"), code("nodo-2"), "nodo");
  const n3 = aisleOf(mod("nodo-3"), code("nodo-3"), "nodo");
  const quest = aisleOf(mod("quest"), code("quest"), "esclusa");
  const col = aisleOf(mod("columbus"), code("columbus"), "fabrica");
  const kibo = aisleOf(mod("kibo"), code("kibo"), "laboratorio");
  const idaSonda = mod("ida-sonda");
  const idaNodriza = mod("ida-nodriza");
  const N = AISLE.nodo;
  const zEnd = (v: InteriorVolume, s: 1 | -1) => v.centre.z + s * v.half.z;
  const xEnd = (v: InteriorVolume, s: 1 | -1) => v.centre.x + s * v.half.x;
  const h2Mid = h2.centre.z;

  const volumes: InteriorVolume[] = [
    u,
    lab,
    h2,
    n3,
    quest,
    col,
    kibo,
    // Along the stack: Unity – Destiny – Harmony.
    { ...cbmHatch("escotilla-nodo1-destiny", "Escotilla Unity – Destiny", u.centre, "z", zEnd(u, -1) + 0.5, zEnd(u, -1) - 0.5) },
    { ...cbmHatch("escotilla-destiny-nodo2", "Escotilla Destiny – Harmony", lab.centre, "z", zEnd(lab, -1) + 0.5, zEnd(lab, -1) - 0.5) },
    // Off the nodes' sides: from just inside the node's aisle to just inside the module.
    cbmHatch("escotilla-nodo1-nodo3", "Escotilla Unity – Tranquility", u.centre, "x", -(N.x - 0.3), xEnd(n3, 1) - 0.5),
    cbmHatch("escotilla-nodo1-quest", "Escotilla Unity – Quest", u.centre, "x", N.x - 0.3, xEnd(quest, -1) + 0.5, "presion"),
    cbmHatch("escotilla-nodo2-columbus", "Escotilla Harmony – Columbus", h2.centre, "x", N.x - 0.3, xEnd(col, -1) + 0.5),
    cbmHatch("escotilla-nodo2-kibo", "Escotilla Harmony – Kibo", h2.centre, "x", -(N.x - 0.3), xEnd(kibo, 1) - 0.5),
    {
      id: "tunel-sonda",
      code: "IDA3",
      label: "IDA de cenit del módulo de aterrizaje",
      kind: "escotilla",
      centre: new Vec3(0, (N.y - 0.2 + idaSonda.to.y) / 2, h2Mid),
      half: new Vec3(IDSS_HALF, (idaSonda.to.y - (N.y - 0.2)) / 2, IDSS_HALF),
      through: "y",
      pressurised: true,
      basis: "Paso IDSS de 800 mm, por el techo de Harmony",
      source: STRUCTURE_SOURCES.nds,
    },
    {
      id: "tunel-nodriza",
      code: "IDA2",
      label: "IDA de proa de la nave nodriza",
      kind: "escotilla",
      centre: new Vec3(0, 0, (idaNodriza.to.z + zEnd(h2, -1) + 0.4) / 2),
      half: new Vec3(IDSS_HALF, IDSS_HALF, (zEnd(h2, -1) + 0.4 - idaNodriza.to.z) / 2),
      through: "z",
      pressurised: true,
      basis: "Paso IDSS de 800 mm, por proa de Harmony",
      source: STRUCTURE_SOURCES.nds,
    },
  ];

  // --- Compartments one floats into (docs/design/compartimentos.md) ---------------------------
  // Harmony's four crew quarters, one on each face of one rack bay, like the ISS's; the bay by Destiny is ours.
  const CQ = CREW_QUARTER;
  const C = COMPARTMENT_SOURCES;
  const cqZ = h2.centre.z - h2.half.z + 0.82 * 2 * h2.half.z;
  const quarters = (["estribor", "babor", "techo", "suelo"] as const).map((face, i) =>
    wallCompartment({
      id: `camarote-${i + 1}`,
      code: `CQ${i + 1}`,
      label: `Camarote ${i + 1}`,
      aisle: h2,
      face,
      along: cqZ,
      size: { w: CQ.widthM, h: CQ.heightM, d: CQ.depthM },
      door: { w: CQ.doorWidthM, h: CQ.doorHeightM },
      basis: "Camarote de la ISS: 2,1 m³ dentro (NASA); 1,05 × 2 m de un hueco de bastidor y 1 m de fondo (derivado). La puerta plegable (0,8 × 1,8 m) es valor de juego",
      source: C.crewQuarters,
    }),
  );
  // The Cupola under Tranquility: 2,95 m across and 1,5 m tall; the room is the square inscribed in its circle (derived).
  const cupolaSide = Math.floor((issModule("cupula").diameterM / Math.SQRT2) * 100) / 100;
  const cupola = wallCompartment({
    id: "cupola",
    code: "CUP1",
    label: "Cupola",
    aisle: n3,
    face: "suelo",
    along: xEnd(n3, 1) - 0.5 * 2 * n3.half.x,
    size: { w: cupolaSide, h: cupolaSide, d: issModule("cupula").lengthM },
    door: { w: 1.27, h: 1.27 },
    basis: `Cupola: 2,95 m de diámetro y 1,5 m de alto (real); dentro, el cuadrado inscrito de ${cupolaSide.toLocaleString("es-ES")} m de lado (derivado). El vestíbulo CBM queda dentro del hueco de bastidores (distribución nuestra)`,
    source: ISS_SOURCES.cupola,
  });
  // The Bishop on Tranquility's port end: a bell 2,014 m across and 1,8 m tall, 3,99 m³; the room is the box inside it (derived).
  const bishop = wallCompartment({
    id: "bishop",
    code: "BSH1",
    label: "Bishop",
    aisle: n3,
    face: "babor",
    along: n3.centre.z,
    size: { w: 1.4, h: 1.4, d: 1.6 },
    door: { w: 1.27, h: 1.27 },
    basis: "Bishop: 2,014 m de diámetro, 1,8 m de alto y 3,99 m³ (real); dentro, una caja de 1,4 × 1,4 × 1,6 m (3,1 m³, derivado). Se pasa por la escotilla CBM de Tranquility",
    source: ISS_SOURCES.bishop,
  });
  for (const c of [...quarters, cupola, bishop]) volumes.push(c.room, c.doorway);

  // --- Fixtures --------------------------------------------------------------
  const along = (v: InteriorVolume, f: number) => {
    const k = v.half.x > v.half.z ? "x" : "z";
    return v.centre[k] - v.half[k] + f * 2 * v.half[k];
  };
  const n3x = (f: number) => xEnd(n3, 1) - f * 2 * n3.half.x; // from Unity (0) to the Bishop (1)
  /**
   * A life-support rack of eclss-real (docs/design/soporte-vital.md) where the ISS has it, at its real size: `f` runs
   * along the module like `along` (Tranquility: from Unity to the Bishop), side 0 port/forward, 1 starboard/aft.
   */
  const eclss = (kind: RackKind, vol: InteriorVolume, side: RackPlacement["side"], at: number): Fixture => {
    const k = vol.half.x > vol.half.z ? "x" : "z";
    return eclssFixtures(vol, [{ rack: kind, side, along: at - vol.centre[k] }])[0]!;
  };
  const fixtures: Fixture[] = [
    // Harmony: the two IDAs and the four crew quarters (one fixture), like on the ISS.
    { id: "salir-sonda", label: "Escotilla del módulo (IDA de cenit)", volume: "nodo-2", face: "techo", at: new Vec3(0, N.y, h2Mid), size: new Vec3(0.8, 0.1, 0.8), action: { kind: "salir", to: "sonda" }, info: "Escotilla IDSS en el cenit de Harmony, como el IDA-3: por aquí vuelves a la cabina del módulo de aterrizaje", source: STRUCTURE_SOURCES.nds },
    { id: "salir-nodriza", label: "Escotilla de la nodriza (IDA de proa)", volume: "nodo-2", face: "proa", at: new Vec3(0, 0, zEnd(h2, -1)), size: new Vec3(0.8, 0.8, 0.1), action: { kind: "salir", to: "nodriza" }, info: "Escotilla IDSS en la proa de Harmony, como el IDA-2 donde atracaba el transbordador: por aquí se pasa a la nodriza atracada", source: STRUCTURE_SOURCES.nds },
    // Inside each crew quarter, its sleeping bag on the back wall (the laptop and the light are drawn beside it).
    ...quarters.map(({ room }, i) =>
      backWallFixture(room, (["estribor", "babor", "techo", "suelo"] as const)[i]!, {
        id: `saco-${i + 1}`,
        label: `saco-${i + 1}` === OWN_BUNK ? "Tu saco de dormir" : `Saco de dormir · camarote ${i + 1}`,
        size: { w: 0.7, h: 1.8, d: 0.12 },
        action: { kind: "tripulacion", area: "camarotes" },
        info: "Camarote de Harmony: 2,1 m³, saco de dormir sujeto a la pared, luz regulable, portátil y su propio ventilador",
        source: C.crewQuarters,
      }),
    ),
    { id: "cbm-nadir-nodo2", label: "CBM de nadir de Harmony", volume: "nodo-2", face: "suelo", at: new Vec3(0, -N.y, h2Mid), size: new Vec3(1.27, 0.1, 1.27), action: { kind: "info" }, info: "Puerto CBM de los cargueros (Dragon de carga, Cygnus, HTV), como en la ISS: aquí llegan los kits importados", source: ISS_SOURCES.harmony },
    // Unity: the galley and the table, the lander's CBM (the ship bay) and the yoga mat.
    { id: "cocina", label: "Cocina y mesa", volume: "nodo-1", face: "estribor", at: new Vec3(N.x, 0.1, along(u, 0.15)), size: new Vec3(rackSpec("galeria").size.d, rackSpec("galeria").size.h, rackSpec("galeria").size.w), action: { kind: "tripulacion", area: "cocina" }, info: "La cocina de la ISS está en Unity: calentador de comida, grifo de agua caliente y fría y la mesa con cinchas y velcro. Cocina con la despensa de la estación", source: STRUCTURE_SOURCES.unity, rack: "galeria" },
    { id: "cbm-nadir-nodo1", label: "CBM de nadir de Unity", volume: "nodo-1", face: "suelo", at: new Vec3(0, -N.y, 0), size: new Vec3(1.27, 0.1, 1.27), action: { kind: "info" }, info: "Puerto CBM de nadir de Unity, donde atracan los Cygnus: Canadarm2 atraca aquí el módulo de aterrizaje (licencia: el LM no lleva CBM). La escotilla está cerrada: el módulo se usa desde su IDA", source: ISS_SOURCES.unity },
    { id: "consola-bahia", label: "Portátil de carga de Unity", volume: "nodo-1", face: "babor", at: new Vec3(-N.x, 0, along(u, 0.8)), size: new Vec3(0.3, 0.5, 0.6), action: { kind: "bahia", panels: ["importar"] }, info: "Portátil de Unity junto al CBM de nadir, donde atracan los cargueros: la bahía (revisa y cambia las piezas del módulo de aterrizaje y de la nodriza atracados) y los pedidos que llegan importados", source: C.referenceGuide },
    { id: "pma1", label: "Escotilla de popa (PMA-1)", volume: "nodo-1", face: "popa", at: new Vec3(0, 0, zEnd(u, 1)), size: new Vec3(1.0, 1.0, 0.1), action: { kind: "info" }, info: "Por el PMA-1 se pasa al segmento ruso (Zarya y Zvezda), que no está en el juego", source: ISS_SOURCES.unity },
    // Destiny: the window, the coolant pumps (ITCS, like the lab's) and the life-support laptop (the other racks come from the outfit).
    eclss("itcs", lab, 0, along(lab, 0.3)),
    eclss("consola", lab, "techo", along(lab, 0.15)),
    // The yoga mat by the CEVIS's place in Destiny (the ISS's exercise bike flew in the US Lab; the T2 and the ARED are
    // in Tranquility): strapped to the starboard wall, with foot loops, as a 0 g mat has to be. Moved here from Unity's
    // ceiling, where she could not be seen on it (Berón, 2026-11-17: «la esterilla no funciona en la estación»).
    { id: "esterilla", label: "Esterilla de yoga", volume: "destiny", face: "estribor", at: new Vec3(lab.centre.x + lab.half.x, 0, along(lab, 0.26)), size: new Vec3(0.05, 1.8, 0.6), action: { kind: "tripulacion", area: "esterilla" }, info: "Esterilla sujeta a la pared con cintas y lazos para los pies, en Destiny junto a la CEVIS: yoga sobre ella y, sentada en loto, los ajustes generales", source: S.exercise, gear: "esterilla" },
    // The CEVIS, in Destiny as on the ISS (the US Lab), by the starboard wall near Unity.
    { id: "cevis", label: "Bicicleta CEVIS", volume: "destiny", face: "estribor", at: new Vec3(lab.centre.x + lab.half.x, 0, along(lab, 0.85)), size: new Vec3(0.86, 1.2, 1.0), action: { kind: "tripulacion", area: "ejercicio" }, info: "La CEVIS de la ISS en Destiny: sin sillín, las zapatillas enganchadas a los pedales y las manos en el manillar (25–350 W)", source: GEAR_SRC.cevis, gear: "cevis" },
    { id: "ventana-destiny", label: "Ventana de Destiny", volume: "destiny", face: "suelo", at: new Vec3(0, -AISLE.laboratorio.y, along(lab, 0.5)), size: new Vec3(0.6, 0.1, 0.6), action: { kind: "info" }, info: "Ventana de calidad óptica de 51 cm que mira a la Tierra", source: ISS_SOURCES.destiny },
    // Tranquility: hygiene, exercise, the life-support rack bays, the Cupola and the Bishop.
    { id: "aseo", label: "Aseo (WHC)", volume: "nodo-3", face: "proa", at: new Vec3(n3x(0.15), 0, n3.centre.z - n3.half.z), size: new Vec3(1.0, 1.9, 0.75), action: { kind: "tripulacion", area: "aseo" }, info: "El WHC de Tranquility, con el UWMS desde 2020: el aire arrastra lo que en la Tierra cae", source: ISS_SOURCES.tranquility, gear: "whc" },
    // The T2 and the ARED, each its own machine, in Tranquility as on the ISS: the T2 across the deck, the ARED by the aft wall.
    { id: "ared", label: "ARED (pesas)", volume: "nodo-3", face: "popa", at: new Vec3(n3x(0.2), 0, n3.centre.z + n3.half.z), size: new Vec3(1.6, 1.9, 0.6), action: { kind: "tripulacion", area: "ejercicio" }, info: "El ARED de Tranquility: barra en un brazo con bisagra y dos cilindros de vacío, hasta 272 kg de carga sin gravedad", source: GEAR_SRC.ared, gear: "ared" },
    { id: "t2", label: "Cinta T2", volume: "nodo-3", face: "suelo", at: new Vec3(n3x(0.32), -n3.half.y, n3.centre.z), size: new Vec3(0.8, 0.3, 1.9), action: { kind: "tripulacion", area: "ejercicio" }, info: "La T2 (COLBERT) de Tranquility: cinta con arnés de hombros y cintura y dos gomas a cada lado que te tiran contra la banda", source: GEAR_SRC.t2, gear: "t2" },
    // The Cupola's robotic workstation (RWS), on its aft wall: the arm, the outside cameras, the catalogue and assembly, the Bishop.
    { id: "cupula", label: "Puesto robótico (RWS)", volume: "cupola", face: "popa", at: new Vec3(cupola.room.centre.x, cupola.room.centre.y, cupola.room.centre.z + cupola.room.half.z), size: new Vec3(1.2, 0.9, 0.35), action: { kind: "brazo" }, info: "Puesto robótico de la Cupola: los dos mandos de Canadarm2, portátiles y las cámaras de fuera bajo siete ventanas. Desde aquí se atraca el módulo, se monta lo del catálogo y se suelta la Bishop", source: C.rws },
    // The life-support racks of Tranquility (ESA: ARS, OGS, WRS 1 and 2) and its fire post, with eclss-real's data and kit.
    eclss("wrs", n3, 0, n3x(0.82)),
    eclss("ogs", n3, 1, n3x(0.77)),
    eclss("ar", n3, "techo", n3x(0.85)),
    eclss("incendios", n3, "techo", n3x(0.3)),
    // Inside the Bishop: the plate the payloads are fixed to before Canadarm2 takes it out (released from the Cupola).
    backWallFixture(bishop.room, "babor", { id: "bishop", label: "Placa de cargas de la Bishop", size: { w: 1.0, h: 1.0, d: 0.1 }, action: { kind: "bishop" }, info: "Dentro de la Bishop (1059 kg, 3,99 m³): aquí se sujetan la sonda o los cubesats; luego Canadarm2 la saca desde el puesto robótico de la Cupola, los suelta y la vuelve a atracar", source: ISS_SOURCES.bishop }),
    // Quest: the suits and the EVA hatch.
    { id: "trajes", label: "Trajes y esclusa", volume: "quest", face: "proa", at: new Vec3(along(quest, 0.35), 0, quest.centre.z - quest.half.z), size: new Vec3(1.2, 1.7, 0.4), action: { kind: "esclusa" }, info: "Esclusa de equipo de Quest: los trajes, sus baterías y el agua de sus mochilas", source: S.quest },
    { id: "escotilla-eva", label: "Escotilla EVA", volume: "quest", face: "estribor", at: new Vec3(xEnd(quest, 1), 0, quest.centre.z), size: new Vec3(0.1, 1.0, 1.0), action: { kind: "info" }, info: "Escotilla EVA de Quest. Salir de paseo por fuera de la estación está en pendientes", source: S.quest },
    // Kibo: the airlock to the exposed platform, where the parts racks are.
    { id: "esclusa-kibo", label: "Esclusa de Kibo · plataforma expuesta", volume: "kibo", face: "babor", at: new Vec3(xEnd(kibo, -1), 0, kibo.centre.z), size: new Vec3(0.1, 0.9, 0.9), action: { kind: "info" }, info: "Esclusa de experimentos de Kibo: solo para cargas, una persona no cabe. La carga sale en su mesa deslizante y el brazo JEMRMS la lleva a la plataforma expuesta (JEM-EF, 12 puertos); se maneja desde la consola del JEMRMS", source: ISS_SOURCES.kibo },
    { id: "consola-jemrms", label: "Consola del JEMRMS", volume: "kibo", face: "proa", at: new Vec3(along(kibo, 0.12), 0, kibo.centre.z - kibo.half.z), size: new Vec3(1.05, 1.2, 0.5), action: { kind: "panel", panel: "hangar" }, info: "Consola del brazo de Kibo (JEMRMS) junto a su esclusa: el inventario de la plataforma expuesta, el catálogo de vehículos y su montaje", source: ISS_SOURCES.kibo },
    // Rack slots for the species catalogue (adapters/three/interior/rack-slots.ts): the Aquatic Habitat flew in
    // Kibo (JAXA, medaka, 2012) and the catalogue is a laptop on the rack beside it.
    { id: "rack-acuatico", label: "Hábitat acuático (AQH)", volume: "kibo", face: "popa", at: new Vec3(along(kibo, 0.3), 0, kibo.centre.z + kibo.half.z), size: new Vec3(1.05, 2.0, 0.86), action: { kind: "info" }, info: "El Aquatic Habitat de JAXA, en Kibo como en la ISS: dos tanques de 0,7 L, pulmón artificial y biofiltro; aquí vivieron medakas hasta 90 días. Se llena con lo que se adopta en el catálogo", source: "https://iss.jaxa.jp/en/kiboexp/pm/aqh", gear: "aqh" },
    { id: "rack-catalogo", label: "Catálogo de especies", volume: "kibo", face: "popa", at: new Vec3(along(kibo, 0.62), 0, kibo.centre.z + kibo.half.z), size: new Vec3(1.05, 2.0, 0.86), action: { kind: "consola", id: "catalogo" }, info: "Portátil del catálogo de especies junto al hábitat acuático: solo especies reales en hábitats reales", source: S.ispr },
  ];

  // --- Modules berthed as the station grows --------------------------------------------------
  const used = outfit.usedBerths();
  for (const m of outfit.modules) {
    if (!m.spec || m.spec.kind === "hangar" || !m.berth) continue;
    const pm = layout.modules.find((x) => x.id === m.id);
    const berth = outfit.berths.find((b) => b.id === m.berth);
    if (!pm || !berth) continue;
    const k = axisOf(berth.normal);
    if (k === "y") continue;
    const kind: AisleKind = m.spec.kind;
    const v = aisleOf(pm, m.code, kind);
    volumes.push({ ...v, label: m.label });
    const parent = volumes.find((x) => x.id === berthParent(berth.id));
    const s = Math.sign(berth.normal[k]);
    // From just inside the parent's aisle (across it if it hangs on its side) to just inside the module.
    const inner = parent ? parent.centre[k] + s * (parent.half[k] - (axisOf(parent.half) === k || parent.half[k] > 2 ? 0.5 : 0.3)) : berth.position[k] - s * 0.5;
    const outer = berth.position[k] + s * 0.5;
    volumes.push(cbmHatch(`escotilla-${m.id}`, `Escotilla ${berth.label.replace(/, puerto de \w+$/, "")} – ${m.label}`, berth.position, k, inner, outer));
    if (m.spec.endPort && !used.has(`${m.id}-extremo`)) {
      const end = pm.to;
      fixtures.push({ id: `puerto-${m.id}`, label: "Puerto libre", volume: m.id, face: k === "z" ? (s > 0 ? "popa" : "proa") : s > 0 ? "estribor" : "babor", at: new Vec3(k === "x" ? end.x : v.centre.x, 0, k === "z" ? end.z : v.centre.z), size: k === "x" ? new Vec3(0.1, 1.27, 1.27) : new Vec3(1.27, 1.27, 0.1), action: { kind: "info" }, info: "Puerto CBM cerrado en el extremo: aquí se puede atracar otro módulo", source: S.cbm });
    }
  }
  // Tranquility's capped ports, while nothing is berthed there (Leonardo and BEAM are not modelled).
  for (const b of outfit.berths.filter((x) => x.id.startsWith("nodo-3-") && !used.has(x.id))) {
    const fore = b.normal.z < 0;
    fixtures.push({ id: `puerto-${b.id}`, label: "Puerto CBM libre", volume: "nodo-3", face: fore ? "proa" : "popa", at: new Vec3(b.position.x, 0, n3.centre.z + (fore ? -1 : 1) * n3.half.z), size: new Vec3(1.27, 1.27, 0.1), action: { kind: "info" }, info: `Puerto CBM cerrado (${fore ? "el de Leonardo en la ISS" : "el de BEAM en la ISS"}): aquí se atraca un módulo nuevo (Planos → Módulos)`, source: ISS_SOURCES.tranquility });
  }
  // Equipment in every module's rack bays.
  for (const e of outfit.equipment) {
    const vol = volumes.find((v) => v.id === e.moduleId);
    const om = outfit.module(e.moduleId);
    const pm = layout.modules.find((x) => x.id === e.moduleId);
    if (vol && om && pm) fixtures.push(rackFixture(e, vol, om.racksPerSide, pm.from[vol.half.x > vol.half.z ? "x" : "z"]));
  }

  fixtures.push(...doorFixtures(volumes));
  return {
    volumes,
    fixtures,
    solids: [],
    entries: {
      sonda: { at: new Vec3(0, N.y - 0.6, h2Mid), facing: new Vec3(0, 0, 1) },
      nodriza: { at: new Vec3(0, 0, zEnd(h2, -1) + 0.9), facing: new Vec3(0, 0, 1) },
    },
    storage: { rackSlots: [], cradles: [], crate: new Vec3(0.9, 0.9, 0.9) },
  };
}

/**
 * Each hatch between two areas, seen from each side: a door fixture on that side's bulkhead that names
 * where it leads (docs/design/estacion-tripulacion.md, «Puertas»). The docking tunnels have their
 * own hatches (`salir-*`).
 */
function doorFixtures(volumes: readonly InteriorVolume[]): Fixture[] {
  const out: Fixture[] = [];
  for (const h of volumes) {
    if (h.kind !== "escotilla" || !h.through || h.id.startsWith("tunel") || h.id.startsWith("paso-")) continue;
    const k = h.through;
    const axis = new Vec3(k === "x" ? 1 : 0, 0, k === "z" ? 1 : 0);
    const sideOf = (s: number) => {
      const p = h.centre.add(axis.scale(s * (h.half[k] + 0.3)));
      return volumes.find((v) => v.kind !== "escotilla" && Math.abs(p.x - v.centre.x) <= v.half.x && Math.abs(p.y - v.centre.y) <= v.half.y && Math.abs(p.z - v.centre.z) <= v.half.z);
    };
    const a = sideOf(-1);
    const b = sideOf(1);
    // A compartment's opening has no door to tap: she floats in (docs/design/compartimentos.md).
    if (!a || !b || a.kind === "compartimento" || b.kind === "compartimento") continue;
    for (const [from, to, s] of [[a, b, -1], [b, a, 1]] as const) {
      // Seen from `from`, the hatch is on its wall toward `to`.
      const face: Face = k === "z" ? (s < 0 ? "popa" : "proa") : s < 0 ? "estribor" : "babor";
      const side = h.half.y;
      out.push({
        id: `puerta-${h.id}-${from.id}`,
        label: `Escotilla · ${to.label}`,
        volume: from.id,
        face,
        // On its own side of the hatchway, so the two sides of one hatch never compete for her (in the
        // short airlock, on the bulkhead itself: the suits sit between its two hatches).
        at: h.centre.add(axis.scale(from.kind === "esclusa" ? 0 : s * h.half[k])),
        size: k === "z" ? new Vec3(2 * side, 2 * side, 0.1) : new Vec3(0.1, 2 * side, 2 * side),
        action: { kind: "puerta", to: to.id, hatch: h.id },
        info: `${h.label}: de ${from.label} a ${to.label}`,
        source: h.source ?? S.cbm,
      });
    }
  }
  return out;
}

/** The old game hangar (20 × 14 × 20 m), now in the backlog (docs/pendientes.md). */
export const OLD_HANGAR_HALF = new Vec3(10, 7, 10);

/** Numbers behind dropping the hangar (docs/design/interiores.md §5): air mass and load on a wall. */
export function hangarPressureCase(half: Vec3 = OLD_HANGAR_HALF, cabinKPa = 101.3, airKgM3 = 1.19): { volumeM3: number; airKg: number; wallLoadMN: number } {
  const h = half;
  const volumeM3 = 8 * h.x * h.y * h.z;
  // Biggest wall: the fore/aft or side wall (both 20 × 14 m here).
  const wallM2 = 4 * Math.max(h.x * h.y, h.z * h.y, h.x * h.z);
  return { volumeM3, airKg: volumeM3 * airKgM3, wallLoadMN: (cabinKPa * 1000 * wallM2) / 1e6 };
}

export const POLANA_INTERIOR = stationInteriorPlan();
