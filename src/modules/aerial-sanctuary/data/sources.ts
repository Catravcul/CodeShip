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
  centrifuge: "Inspiration4: perfiles de lanzamiento, reentrada, amerizaje y aborto copiados de vuelos de Crew Dragon, en Gx (sobre el pecho) en la centrífuga del NASTAR: https://inspiration4.com/blog/inspiration4-crew-completes-centrifuge-training/",
  tsf18: "TechInsider, «Карусель для героев: центрифуга ЦФ-18»: brazo de 18 m, carga del pecho a la espalda, prueba estándar de ~1 min a 4 g subiendo 0,1 g/s, lámpara roja y parada si pierde el conocimiento: https://www.techinsider.ru/technologies/11540-karusel-dlya-geroev-kruzhenie/",
  dragonReentry: "AP (phys.org, 2020-08-02), regreso del Demo-2: de 28 000 km/h a unos 560 km/h y 24 km/h al amerizar, con 4 a 5 g en la reentrada: https://phys.org/news/2020-08-america-crewed-spaceship-decade-splashdown.pdf",
  zeroG: "ESA, Airbus A310 Zero-G: 31 parábolas, unos 20 s de ingravidez cada una, 1,8 g unos 20 s al entrar y al salir, subida a unos 50°; cada ciclo unos 3 min (1 min de parábola y 2 de descanso) y 8 min tras cada cinco; zona de ensayo de 20 × 5 × 2,3 m; 46,4 m de largo, 43,9 m de envergadura, fuselaje de 5,6 m: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Airbus_A310_Zero-G",
  blueIce: "Wikipedia, Union Glacier Blue-Ice Runway: pista de hielo azul de 3000 × 50 m (Il-76, Boeing 757 y 767); el viento barre la nieve y deja hielo de unos 917 kg/m³: https://en.wikipedia.org/wiki/Union_Glacier_Blue-Ice_Runway",
  ansmet: "Wikipedia, ANSMET: equipos de 4–10 en motos de nieve a unos 30 m, de 5 a 7 semanas; cada meteorito con su GPS y su número en una bolsa de teflón estéril, congelado hasta Johnson: https://en.wikipedia.org/wiki/ANSMET; ANSMET 2015, «How to collect a meteorite» (GPS, etiqueta de aluminio con su número, foto con el contador, el libro, la bolsa con pinzas estériles, cinta y bandera; unos 2 min por muestra): https://caslabs.case.edu/ansmet/2015/01/15/status-update-and-how-to-collect-a-meteorite/",
  happyCamper: "NASA, «Happy Camper School» (escuela de supervivencia de campo del programa antártico de EE. UU., McMurdo, 2011): 2 días, tienda de montaña y tienda piramidal Scott con buenos anclajes de nieve, muro de bloques de nieve contra el viento, zanja techada con bloques, agua hervida para comer, y radio de HF con dos antenas de 10 m hasta el Polo Sur, a 1360 km: https://science.nasa.gov/blogs/notes-from-the-field/2011/12/02/happy-camper-school/",
  csaRobotics: "CSA, Robotics Training Centre (Longueuil): la estación de robótica es igual que la de la ISS: un portátil, dos mandos (traslación y giro) y tres pantallas con las cámaras del brazo, en una maqueta a 3/4 del laboratorio Destiny; luego siguen en Houston: https://asc-csa.gc.ca/eng/iss/robotics/robotics-training-centre.asp",
  aleRunway: "ALE, «Blue ice airfields»: la pista de Union Glacier está a unos 9 km del campamento; se va en furgonetas 4×4 adaptadas y vehículos de orugas: https://antarctic-logistics.com/blue-ice-airfields/",
  unionCamp: "Wikipedia, Union Glacier Camp: junto a la pista; dos comedores con calefacción, tiendas dobles, 160 personas en verano: https://en.wikipedia.org/wiki/Union_Glacier_Camp",
  pyramidTent: "Australian Antarctic Division, «Polar pyramid tents»: unos 30 kg, para dos o tres (cuatro en emergencia): https://www.antarctica.gov.au/antarctic-operations/field/tents-shelters-and-huts/tents/polar-pyramid-tents/",
  tsf18Gondola: "TechInsider (ЦФ-18): la cabina, para una o dos personas, va en un anillo sujeto con cardanes a la horquilla del extremo del brazo, y puede girar dentro del anillo; sala redonda y vacía; 305 t de metal; no da las medidas de la cabina: https://www.techinsider.ru/technologies/11540-karusel-dlya-geroev-kruzhenie/",
  robotics: "Codeship, docs/design/brazo-robotico.md (Canadarm2: CSA y NASA; la captura de un Cygnus, NG-19) y Space Center Houston, «How NASA uses virtual reality to train astronauts» (Generic Robotics Trainer y VR Lab): https://spacecenter.org/how-nasa-uses-virtual-reality-to-train-astronauts",
  moonFacts: "NASA, Moon Fact Sheet (NSSDCA): gravedad en la superficie 1,62 m/s²: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
  apollo11Landing: "NASA, Apollo 11 Lunar Surface Journal, «The First Lunar Landing»: Armstrong pasa a P66 (aterrizaje a mano) a unos 500 ft y toca con unos 45 s de propelente: https://www.nasa.gov/history/alsj/a11/a11.landing.html",
  lmGear: "NASA TN D-6850, The Apollo LM landing gear subsystem: diseñado para tocar a un máximo de 10 ft/s (3,05 m/s) en vertical y 4 ft/s (1,22 m/s) en horizontal: https://www.nasa.gov/wp-content/uploads/static/history/alsj/tnD6850LMLandingGearSubsytem.pdf",
  training: "NASA, ficha de formación de astronautas (natación, T-38, cámaras hipobáricas): https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf",
  dragonTraining: "Wired y Axiom (Ax-4): simuladores de Dragon en Hawthorne y diálogo con su control de misión: https://wirednews.pages.dev/story/spacex-astronaut-training-sims",
  rossIsland: "Ross Island: 3 Enercon E-33 de 330 kW, rotor de 33 m, buje a 37 m, 7,9 m/s de media (Antarctica NZ): https://www.antarcticanz.govt.nz/media/news/new-turbines-for-the-windiest-continent",
  seals: "Onoufriou et al., 2019: trauma grave en focas a 5,6 m/s (IC 95 % 4,4–6,6): https://tethys.pnnl.gov/publications/empirical-determination-severe-trauma-seals-collisions-tidal-turbine-blade",
  csRoster: "Cold Sanctuary, Assets/Scripts/Progression/WorkRoster.cs (jornada desde el 2026-11-05: entrenamiento 8–9 y 14–15, tareas 9–11, 12–14 y 15–16, comida 11–12) y Professions.cs (los oficios)",
  csPeople: "Cold Sanctuary, docs/personajes/*.md (aspecto atestiguado por sus fotos; estaturas estimadas allí) y Assets/Scripts/Avatar/CubeHair.cs",
  nasaApply: "NASA, Become an astronaut: ciudadanía de EE. UU., máster STEM (o doctorado, título médico o escuela de pilotos de pruebas), experiencia o horas al mando de reactores, el reconocimiento de larga duración y dos rondas de entrevistas en Johnson: https://www.nasa.gov/humans-in-space/astronauts/become-an-astronaut",
  faaHypoxia: "FAA, AC 61-107B (Aircraft Operations at Altitudes Above 25,000 Feet), tiempo de consciencia útil: 18 000 pies 20–30 min, 25 000 pies 3–5 min, 30 000 pies 1–2 min: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-107B.pdf",
  pensacola: "DVIDS 2022: los candidatos de la NASA en el Naval Survival Training Institute de Pensacola (salir del amerizaje, balsa, rescate e izado): https://www.dvidshub.net/news/421286/astronaut-candidates-train-naval-air-station-pensacola",
  nblSheet: "NASA, ficha del NBL: buzos de apoyo, el traje lastrado hasta la flotabilidad neutra, agua a 28–31 °C: https://www.nasa.gov/centers/johnson/pdf/167748main_FS_NBL508c.pdf",
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
