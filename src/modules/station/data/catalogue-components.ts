import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { FIXED_SYSTEMS } from "@modules/ship/data/equipment";
import { PROBE_EQUIPMENT } from "@modules/ship/data/probe";
import type { Equipment } from "@modules/ship/domain/equipment";
import { NODRIZA } from "@modules/mothership/data/mothership";
import { electricThrusterById } from "@modules/mothership/data/thrusters";
import { Mothership } from "@modules/mothership/domain/mothership";
import type { CatalogueComponent, VehicleStatus } from "../domain/vehicle-catalogue";

/**
 * Components of the vehicle catalogue (docs/design/naves-reales.md) that the ship catalogue did not
 * have. Masses copied from the source, or derived from it (the note shows the working). Checked
 * 2026-11-16. Their blueprints are made in blueprints.ts (`catalogueComponentBlueprint`).
 */
export const VEHICLE_SRC = {
  raptor: "https://en.wikipedia.org/wiki/SpaceX_Raptor",
  starship: "https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)",
  starshipHls: "https://en.wikipedia.org/wiki/Starship_HLS",
  gateway: "https://en.wikipedia.org/wiki/Lunar_Gateway",
  gatewayPause: "https://www.nasaspaceflight.com/2026/03/nasa-moon-base-pivots-gateway/",
  sr1: "https://www.nasa.gov/?p=1006637",
  sr1News: "https://world-nuclear-news.org/articles/nasa-aims-for-nuclear-powered-mars-mission-in-2028",
  dst: "https://en.wikipedia.org/wiki/Deep_Space_Transport",
  transitHab: "https://ntrs.nasa.gov/citations/20230002033",
  nautilus: "https://en.wikipedia.org/wiki/Nautilus-X",
  vastRoadmap: "https://vastspace.com/roadmap",
  vastHaven2: "https://www.vastspace.com/updates/vast-announces-haven-2-its-proposed-space-station-designed-to-succeed-the-international-space-station-iss",
  haven1: "https://en.wikipedia.org/wiki/Haven-1",
  haven1Delay: "https://payloadspace.com/vast-delays-haven-1-launch-to-2027/",
  bishop: "https://en.wikipedia.org/wiki/Nanoracks_Bishop_Airlock",
  lm: "https://en.wikipedia.org/wiki/Apollo_Lunar_Module",
  blueMoon: "https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft)",
  blueMoonStatus: "https://newspaceeconomy.ca/2026/10/11/what-is-blue-origins-blue-moon-lunar-lander-and-how-will-it-support-nasas-artemis-program/",
  sev: "https://www.nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf",
  philae: "https://en.wikipedia.org/wiki/Philae_(spacecraft)",
  hera: "https://en.wikipedia.org/wiki/Hera_(space_mission)",
  juventas: "https://www.heramission.space/hera-mission-juventas-cubesat",
  dart: "https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test",
  osirisRex: "https://en.wikipedia.org/wiki/OSIRIS-REx",
  hayabusa2: "https://en.wikipedia.org/wiki/Hayabusa2",
  psyche: "https://en.wikipedia.org/wiki/Psyche_(spacecraft)",
  issFacts: "https://www.nasa.gov/international-space-station/space-station-facts-and-figures/",
  issEclss: "https://en.wikipedia.org/wiki/ISS_ECLSS",
  eclssNasa: "https://www.nasa.gov/wp-content/uploads/2025/08/g-657270-59-hp-environmental-control-and-life-support-system-eclss.pdf",
  eclssMarshall: "https://www.nasa.gov/centers/marshall/pdf/174687main_eclss_facts.pdf",
  water98: "https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf",
  crewBalance: "https://ntrs.nasa.gov/api/citations/20190027563/downloads/20190027563.pdf",
  tiangong: "https://en.wikipedia.org/wiki/Tiangong_space_station",
  harmony: "https://en.wikipedia.org/wiki/Harmony_(ISS_module)",
  tranquility: "https://en.wikipedia.org/wiki/Tranquility_(ISS_module)",
  issHabitat: "https://ntrs.nasa.gov/api/citations/20100042177/downloads/20100042177.pdf",
  harnack: "https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf",
} as const;
const S = VEHICLE_SRC;

/** Head mass of the catalogue's thrusters (the blueprint makes the head; the PPU is part of the body). */
const headKg = (id: string) => electricThrusterById(id)!.thrusterMassKg;
/** ROSA Diamond wing in the ship catalogue (equipment.ts): 36 kg, 3,3 kW; DART flew two of them. */
const ROSA_WING_KG = 36;
/** Ascent stage pair of silver-zinc batteries in the ship catalogue (2 × 57 kg). */
const LM_BATTERIES_KG = 114;

const c = (id: string, name: string, kind: CatalogueComponent["kind"], status: VehicleStatus, kg: number, source: string, note: string, more: string[] = []): CatalogueComponent => ({
  id,
  name,
  kind,
  status,
  massKg: { value: Math.round(kg * 100) / 100, source, note },
  sources: [source, ...more],
});

const RAPTOR_KG = 1630;
const STARSHIP_EMPTY_KG = 85000;
const PPE_DRY_KG = 2500;
const DART_DRY_KG = 610 - 60 - 50;
const LM_DRY_KG = 4280;
const SR1_KG = 12000;

/** The game's mothership as built (dry): rings, reactor and the rest of the budget (mothership.ts). */
const nodriza = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
const X3_COUNT = NODRIZA.propulsion.fitted.reduce((n, f) => n + (f.thruster.id === "hall-x3" ? f.count : 0), 0);
const REACTOR_KG = NODRIZA.otherItems.find((i) => i.id === "energia")!.kg;
export const NODRIZA_COUNTS = { x3: X3_COUNT, dryKg: Math.round(nodriza.dryMassKg) } as const;

const sumKg = (list: readonly Equipment[]) => list.reduce((m, e) => m + e.massKg, 0);

/** The lander's fixed systems (structure, docking system, legs, avionics, radio, life support, thermal) as one kit. */
const FIXED_KG = sumKg(FIXED_SYSTEMS);

/** The probe's parts, as they are in probe.ts (a Juventas-type bus, the MPS-120XW, MASCOT's battery, anchors). */
const PROBE_STATUS: Readonly<Record<string, VehicleStatus>> = { "bus-6u-xl": "volado", "mps-120xw": "en-desarrollo", "bateria-200wh": "volado", anclas: "concepto" };
const PROBE_COMPONENTS: CatalogueComponent[] = PROBE_EQUIPMENT.map((e) => ({
  id: e.id,
  name: e.name,
  kind: e.kind === "bateria" ? "energia" : e.kind === "avionica" ? "motor" : "estructura",
  status: PROBE_STATUS[e.id] ?? "inventado",
  massKg: { value: e.massKg, source: e.sources[0] ?? S.juventas, note: e.basis },
  sources: [...e.sources],
}));

export const CATALOGUE_COMPONENTS: readonly CatalogueComponent[] = [
  // Starship
  c("raptor-2", "Motor Raptor 2 (metano y oxígeno, 2,26 MN)", "motor", "volado", RAPTOR_KG, S.raptor, "Copiado: 1630 kg en seco. Vuela en los vuelos de prueba de Starship"),
  c("raptor-vacio", "Motor Raptor de vacío (RVac)", "motor", "volado", RAPTOR_KG, S.raptor, "La fuente no da la masa del RVac: se toma la del Raptor 2 (1630 kg)"),
  c("starship-casco", "Casco de Starship (acero inoxidable, tanques, cabina, escudo térmico)", "estructura", "en-desarrollo", STARSHIP_EMPTY_KG - 6 * RAPTOR_KG, S.starship, "Derivado: 85 t en vacío (bloque 2) − 6 Raptor de 1630 kg"),
  // Gateway (paused) and SR-1 Freedom
  c("ppe-cuerpo", "Cuerpo del PPE del Gateway (alas ROSA de 60 kW, 4 Hall BHT-6000, xenón vacío)", "estructura", "pausado", PPE_DRY_KG - 3 * headKg("hall-aeps"), S.gateway, "Derivado: 5 t al lanzar, la mitad propelente (≈ 2,5 t en seco) − 3 cabezales AEPS de 50 kg", [S.gatewayPause]),
  c("halo-modulo", "Módulo habitable HALO del Gateway", "habitat", "pausado", 8000, S.gateway, "La fuente da 8–9 t según la configuración; tomamos el extremo bajo", [S.gatewayPause]),
  c("sr1-cuerpo", "Cuerpo de SR-1 Freedom (reactor de 20 kWe con Brayton, bus del PPE, helicópteros SkyFall)", "energia", "en-desarrollo", SR1_KG - headKg("hall-aeps"), S.sr1, "Derivado: unos 12 000 kg en total − un cabezal AEPS de 50 kg. La NASA no publica el desglose ni cuántos AEPS lleva", [S.sr1News]),
  // Deep Space Transport (concept)
  c("dst-habitat", "Hábitat del Deep Space Transport (8,4 × 11,7 m)", "habitat", "concepto", 21900, S.dst, "Copiado: unos 21,9 t", [S.transitHab]),
  c("dst-sep", "Etapa eléctrica solar del Deep Space Transport, con su xenón", "energia", "concepto", 24000, S.dst, "Copiado: unos 24 t con el xenón"),
  // Landers
  c("lm-cuerpo", "Módulo lunar Apolo sin sus baterías de ascenso (etapas de ascenso y descenso en seco)", "estructura", "volado", LM_DRY_KG - LM_BATTERIES_KG, S.lm, "Derivado: 4280 kg en seco (versión estándar) − las dos baterías de plata-zinc de 57 kg que ya están en el catálogo"),
  c("philae", "Philae (aterrizador de Rosetta)", "estructura", "volado", 100, S.philae, "Copiado: unos 100 kg al lanzar"),
  c("modulo-sistemas-fijos", "Sistemas fijos del módulo de aterrizaje (estructura, NDS, patas, aviónica, radio, soporte vital, térmico)", "estructura", "inventado", FIXED_KG, "https://en.wikipedia.org/wiki/Apollo_Lunar_Module", "Suma de FIXED_SYSTEMS (ship/data/equipment.ts), cada uno con su fuente"),
  // Probes
  c("juventas", "Juventas (cubesat 6U-XL de Hera)", "electronica", "volado", 12, S.juventas, "Copiado: unos 12 kg con su propelente", [S.hera]),
  c("dart-cuerpo", "Cuerpo de DART (estructura, 12 propulsores de hidracina, cámara DRACO, antena RLSA)", "estructura", "volado", DART_DRY_KG - headKg("ionico-next-c") - 2 * ROSA_WING_KG, S.dart, "Derivado: 610 kg al lanzar − 60 kg de xenón − 50 kg de hidracina = 500 kg en seco; menos el cabezal del NEXT-C (14 kg) y dos alas ROSA (36 kg cada una)"),
  c("osiris-rex-cuerpo", "OSIRIS-REx en seco (con el brazo TAGSAM y la cápsula de retorno)", "estructura", "volado", 880, S.osirisRex, "Copiado: 880 kg en seco"),
  c("hayabusa2-cuerpo", "Hayabusa2 en seco (4 motores iónicos μ10, cuerno de muestras, MASCOT y MINERVA-II)", "estructura", "volado", 490, S.hayabusa2, "Copiado: 490 kg en seco"),
  c("psyche-cuerpo", "Psyche en seco (4 Hall SPT-140, alas de 20 kW a 1 UA)", "estructura", "volado", 1648, S.psyche, "Copiado: 1648 kg en seco"),
  ...PROBE_COMPONENTS,
  // Stations
  c("haven-1-modulo", "Haven-1 (módulo único de Vast)", "habitat", "en-desarrollo", 14000, S.haven1, "Copiado: 14 000 kg", [S.haven1Delay]),
  c("bishop", "Esclusa Bishop de Nanoracks (campana sin escotillas propias)", "habitat", "volado", 1059, S.bishop, "Copiado: 1059 kg"),
  // The game's mothership
  c("anillo-codeship", "Anillo de 1 g de la nodriza (llanta, módulo habitable, cubierta de cultivo, agua)", "habitat", "inventado", nodriza.habRingMassKg, "https://en.wikipedia.org/wiki/B330", "Presupuesto de la nodriza (mothership/data/mothership.ts): cascos como el B330, sustrato, agua y llanta"),
  c("reactor-2mwe", "Reactor de fisión de 2 MWe con 4 Brayton y radiadores", "energia", "concepto", REACTOR_KG, S.harnack, "2000 kWe × 19 kg/kWe (estudio de la NASA; ningún reactor así ha volado)"),
  c("nodriza-espina", "Espina, nodo, cojinetes y fuentes de potencia de la nodriza", "estructura", "inventado", nodriza.dryMassKg - 2 * nodriza.habRingMassKg - REACTOR_KG - X3_COUNT * headKg("hall-x3"), "https://en.wikipedia.org/wiki/Unity_(ISS_module)", "Derivado: masa seca de la nodriza − los dos anillos − el reactor − los cabezales X3"),
];

export const catalogueComponentById = (id: string): CatalogueComponent | undefined => CATALOGUE_COMPONENTS.find((x) => x.id === id);
