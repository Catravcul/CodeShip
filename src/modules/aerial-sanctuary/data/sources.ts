import type { Reality } from "@core/reality";

/**
 * Where every number of sanctuary 3 comes from (docs/design/santuario3-iniciacion.md; Berón, 2026-11-18).
 * Cold Sanctuary is read at origin/master 8218d4aa (2026-11-12): its Santuario Aéreo keeps all its magic in
 * Codeship (reglas.md §1.2), so its game values come with it and say so. The training island is real.
 */
export const S3_SOURCES = {
  csAereo: "Cold Sanctuary, docs/sitio-nuclear.md §23 y Assets/Scripts/World/AereoLink.cs (AereoRule: vuelo de 30 s, ascensor de 10 m/s, 1,5 m/s² y 4 s de puertas, valores del juego)",
  csBuilder: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Aereo.cs, .Launch.cs y .Energy.cs (coordenadas: lanzadera en (−560, 0), parque en (−470, 470), muelle aéreo en (−300, 170); casquetes de 110 y 240 m)",
  csTree: "Cold Sanctuary, Assets/Scripts/World/TreeSpec.cs (HelixTower: tronco de agua de 20 m con pared de acrílico de 1 m, pisos de 32 × 32 m, un nivel cada 22 m, puertas de 7 × 7 m)",
  csLaunch: "Cold Sanctuary, Assets/Scripts/World/LaunchSite.cs (LaunchHeightRule y la corona: losa de 24 × 24 × 2 m, hueco de 4 × 4 m, deflector a 45°, trinchera de 4 × 4 m, diluvio, cubeta, escudo de 10 m, torre umbilical de 22 m, 4 pilares de 3 × 3 m)",
  csLine: "Cold Sanctuary, Assets/Scripts/World/SiteLine.cs (SiteLineRule.Run: tramo con aceleración y crucero)",
  csEnergy: "Cold Sanctuary, Assets/Scripts/World/EnergyRule.cs y docs/energia.md",
  csBirds: "Cold Sanctuary, Assets/Scripts/World/SnowPetrelLife.cs (ColdBirds.AirBudget) y docs/fauna-fria-santuarios.md",
  csCarpet: "Cold Sanctuary, Assets/Scripts/World/FlyingCarpet.cs (alfombra: 18 m/s, crucero 26 m/s) y CarpetPad.cs",
  faaIbd: "FAA, 14 CFR 420 (distancia de edificio habitado, K40) y DoD/NDIA: el 20 % del propulsante como TNT y 15,87 m·kg^-1/3; +50 % por cascotes (regla de Cold Sanctuary, docs/lanzadera-de-cohetes.md)",
  birdBand: "FAA/USDA, choques con aves: el ~72 % por debajo de 152 m (500 pies), citado en Cold Sanctuary, docs/lanzadera-de-cohetes.md",
  electron: "Wikipedia, Electron (cohete): 18 m, Ø 1,2 m, 13,0 t, 300 kg a LEO, 9 motores Rutherford, RP-1 y LOX: https://en.wikipedia.org/wiki/Electron_rocket",
  falcon9: "Wikipedia, Falcon 9 (Block 5): 70 m, Ø 3,7 m, 549 t al despegar; propulsante 395 700 kg en la primera etapa y 92 670 kg en la segunda; 9 Merlin 1D y 1 MVac: https://en.wikipedia.org/wiki/Falcon_9",
  dragon: "Wikipedia, Dragon 2: 8,1 m con el maletero, Ø 4 m, 12 500 kg al lanzar, 4 tripulantes: https://en.wikipedia.org/wiki/SpaceX_Dragon_2",
  odyssey: "Wikipedia, Odyssey (plataforma de Sea Launch): 132,9 × 67 m, 30 000 t vacía y 50 600 t lastrada, 68 personas; 36 lanzamientos (1999–2014) con la gente a 5 km: https://en.wikipedia.org/wiki/Odyssey_(launch_platform), https://en.wikipedia.org/wiki/Sea_Launch",
  s92: "Wikipedia, Sikorsky S-92: 20,88 m de largo, rotor de 17,17 m, 4,70 m de alto, crucero de 280 km/h, 19 pasajeros; lleva tripulaciones a plataformas en el mar: https://en.wikipedia.org/wiki/Sikorsky_S-92",
  nbl: "Wikipedia, Neutral Buoyancy Laboratory: piscina de 62 × 31 × 12 m y 23 000 m³ (6,2 M galones), maquetas a escala real de la ISS, Dragon y Cygnus: https://en.wikipedia.org/wiki/Neutral_Buoyancy_Laboratory",
  svmf: "NASA, Space Vehicle Mockup Facility (edificio 9 de Johnson): maquetas del laboratorio, los nodos y la esclusa: https://www.nasa.gov/johnson/space-vehicle-mockup-facility",
  centrifuge: "docs/design/santuario3-iniciacion.md §1.2: centrífugas NASTAR y TsF-18 (brazo de 18 m, a confirmar); perfiles de Dragon (Inspiration4): https://inspiration4.com/blog/inspiration4-crew-completes-centrifuge-training/",
  training: "NASA, ficha de formación de astronautas (natación, T-38, cámaras hipobáricas): https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf",
  dragonTraining: "Wired y Axiom (Ax-4): simuladores de Dragon en Hawthorne y diálogo con su control de misión: https://wirednews.pages.dev/story/spacex-astronaut-training-sims",
  rossIsland: "Ross Island: 3 Enercon E-33 de 330 kW, rotor de 33 m, buje a 37 m, 7,9 m/s de media (Antarctica NZ): https://www.antarcticanz.govt.nz/media/news/new-turbines-for-the-windiest-continent",
  seals: "Onoufriou et al., 2019: trauma grave en focas a 5,6 m/s (IC 95 % 4,4–6,6): https://tethys.pnnl.gov/publications/empirical-determination-severe-trauma-seals-collisions-tidal-turbine-blade",
  csRoster: "Cold Sanctuary, Assets/Scripts/Progression/WorkRoster.cs (jornada desde el 2026-11-05: entrenamiento 8–9 y 14–15, tareas 9–11, 12–14 y 15–16, comida 11–12; la Magnate, si no hay nadie libre) y Professions.cs",
  csPeople: "Cold Sanctuary, docs/personajes/*.md (aspecto atestiguado por sus fotos; estaturas estimadas allí) y Assets/Scripts/Avatar/CubeHair.cs",
  nasaApply: "NASA, Become an astronaut: ciudadanía de EE. UU., máster STEM (o doctorado, título médico o escuela de pilotos de pruebas), experiencia o horas al mando de reactores, el reconocimiento de larga duración y dos rondas de entrevistas en Johnson: https://www.nasa.gov/humans-in-space/astronauts/become-an-astronaut",
  faaHypoxia: "FAA, AC 61-107B (Aircraft Operations at Altitudes Above 25,000 Feet), tiempo de consciencia útil: 18 000 pies 20–30 min, 25 000 pies 3–5 min, 30 000 pies 1–2 min: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-107B.pdf",
  pensacola: "DVIDS 2022: los candidatos de la NASA en el Naval Survival Training Institute de Pensacola (salir del amerizaje, balsa, rescate e izado): https://www.dvidshub.net/news/421286/astronaut-candidates-train-naval-air-station-pensacola",
  nblSheet: "NASA, ficha del NBL: buzos de apoyo, el traje lastrado hasta la flotabilidad neutra, agua a 28–31 °C: https://www.nasa.gov/centers/johnson/pdf/167748main_FS_NBL508c.pdf",
  nblPodcast: "NASA, Houston We Have a Podcast, «Neutral Buoyancy» (2018): la sala de control en el piso alto, con ventanas sobre la piscina y tres puestos (vídeo, director de la prueba, ECS), el controlador de la prueba en la sala de al lado; cada astronauta con dos buzos de seguridad, uno de utilidad y uno de cámara; el soporte de vestirse colgado de la grúa; cámaras hiperbárica e hipobárica bajo el suelo: https://www.nasa.gov/podcasts/houston-we-have-a-podcast/neutral-buoyancy/",
  nblCranes: "NASA, ficha del NBL (FS-NBL-508c): dos grúas puente de 10 t y cuatro grúas de pluma de 1,6 t alrededor de la piscina (las de pluma bajan y suben a los astronautas con traje); cámara hiperbárica completa; cámaras fijas y de mano: https://www.nasa.gov/centers/johnson/pdf/167748main_FS_NBL508c.pdf",
  nblPage: "NASA, Neutral Buoyancy Laboratory: varias salas de control integradas, buceo con aire y nitrox, cámara hiperbárica en el sitio, varias grúas: https://www.nasa.gov/johnson/neutral-buoyancy-laboratory/",
  svmfPage: "NASA, Space Vehicle Mockup Facility: maquetas del laboratorio, los nodos, el PMM y la esclusa; maqueta de Orion; suelo de cojinetes de aire de precisión (PABF); entrenadores de tareas e interfaces de bastidor: https://www.nasa.gov/johnson/space-vehicle-mockup-facility",
  svmfWiki: "Wikipedia, Space Vehicle Mockup Facility: maquetas a escala 1:1, grúas puente para instalarlas y la puerta industrial del extremo norte: https://en.wikipedia.org/wiki/Space_Vehicle_Mockup_Facility",
  orion: "Wikipedia, Orion (nave): módulo de tripulación de Ø 5,02 m y 3,30 m de alto: https://en.wikipedia.org/wiki/Orion_(spacecraft)",
  mocrRows: "Manned Space Operations, «Positions»: las cuatro filas de la sala de control (FLIGHT en la tercera, CAPCOM en la segunda): https://www.mannedspaceops.org/history/positions/",
  fcr1: "NASASpaceflight (2006), «NASA's newest flight control room»: la FCR-1 pasa de 16 a 20 consolas; la «trinchera» en la primera fila; la pantalla grande al frente: https://www.nasaspaceflight.com/2006/10/nasas-newest-flight-control-room/",
  mccRestore: "NASA, restauración del control de misión Apolo: cinco pantallas grandes de retroproyección que ocupan el frente y nueve pequeñas encima (relojes y cifras), consolas de CRT: https://www.nasa.gov/johnson/history/apollo-mcc-restoration/",
  altitudeChamber: "JBSA (2016), «Take flight in a steel box»: alumnos sentados a los dos lados largos, frente a frente; cada asiento con su panel de tres conectores de máscara de O₂; ventana reforzada en un extremo; tres operadores fuera en sillas altas ante el panel; esclusa pequeña tras una puerta de acero; palanca roja de descarga: https://www.jbsa.mil/News/News/Article/462700/take-flight-in-a-steel-box-no-passport-required/",
  ascr: "NASA, Astronaut Strength, Conditioning and Rehabilitation: el gimnasio de los astronautas, la piscina, la sala de entrenamiento con el material de ejercicio de a bordo y las consultas: https://nasa.gov/directorates/esdmd/hhp/astronaut-strength-conditioning-and-rehabilitation",
  mets: "NAVAIR, Modular Egress Training Simulator (METS, «helo dunker»): cabina que se hunde y vuelca, con salidas que copian las del helicóptero: https://www.navair.navy.mil/product/Modular-Egress-Training-Simulator-METS-Trainer",
  heliport: "FAA, AC 150/5390-2D (Heliport Design): TLOF y FATO marcadas en blanco, la «H», luces verdes del perímetro, manga de viento iluminada, peso máximo marcado: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_150_5390_2D_Heliports.pdf",
  snellen: "Optotipo de Snellen, a 20 pies (6,1 m): https://en.wikipedia.org/wiki/Snellen_chart",
  tussock: "Wikipedia, Poa flabellata (tussac): la hierba en matas de 2 m de las islas subantárticas: https://en.wikipedia.org/wiki/Poa_flabellata",
  quest: "Wikipedia, Quest Joint Airlock: 5,5 m de largo, Ø 4,0 m: https://en.wikipedia.org/wiki/Quest_Joint_Airlock",
  unity: "Wikipedia, Unity (módulo de la ISS): 5,47 m de largo, Ø 4,57 m: https://en.wikipedia.org/wiki/Unity_(ISS_module)",
  cygnus: "Wikipedia, Cygnus (nave): versión mejorada de 6,39 m y Ø 3,07 m: https://en.wikipedia.org/wiki/Cygnus_(spacecraft)",
  columbus: "Wikipedia, Columbus (módulo de la ISS): 6,9 m de largo, Ø 4,5 m: https://en.wikipedia.org/wiki/Columbus_(ISS_module)",
  kibo: "Wikipedia, Kibo (módulo de la ISS): módulo presurizado de 11,2 m, Ø 4,4 m: https://en.wikipedia.org/wiki/Kibo_(ISS_module)",
  generic: "Equipo corriente de su clase (medidas de catálogo, aproximadas); el modelo exacto no está publicado",
  ours: "Codeship, docs/design/santuario3-escena.md: distribución nuestra (no hay plano publicado)",
} as const;

/** A number of sanctuary 3 with its label and its source (reglas.md §1.1). */
export interface Fact<T = number> {
  readonly value: T;
  readonly reality: Reality;
  readonly source: string;
  readonly note?: string;
}

export const fact = <T>(value: T, reality: Reality, source: string, note?: string): Fact<T> => ({ value, reality, source, ...(note ? { note } : {}) });
