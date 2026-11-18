# Santuario 3 (aéreo): la iniciación de Doménica y la pantalla de inicio

Petición de Berón (2026-11-18), resumida:

- investigar de verdad cómo se selecciona, se inicia y se entrena a un astronauta, para diseñar con eso la iniciación y el entrenamiento de Doménica;
- una pantalla de inicio para elegir nivel: «Santuario 3» (aéreo) o «Santuario 6» (espacio, el juego de ahora), con el modelo de la ventana de Navegación;
- traer el santuario aéreo de Cold Sanctuary, con toda la lógica que se pueda, y hacer allí la iniciación.

**Este documento no cambia el juego.** Propone y deja las preguntas para Berón (§6). Etiquetas: **real**, **en desarrollo**, **licencia** (estudiado pero no hecho, o real en otro sitio) y **ficción** ([reglas.md](reglas.md) §1).

## Decisión de Berón (2026-11-18 08:18) — manda sobre §3.2 y §4 donde difieran

- **Las áreas que existen en Cold Sanctuary se recrean con toda su magia**: edificios-árbol con sus áreas, alfombras mágicas, submarinos y demás. No se apagan tras `REAL_ONLY`.
- **Aparte hay una isla de entrenamiento** (natural o artificial, la que convenga) **donde todo es real**: todas las instalaciones de formación de §1.2, con datos y fuentes.
- **Se viaja entre islas** desde la máquina de navegación de cada isla: la misma ventana de Navegación del puente, con el plano tridimensional de cada isla y su botón descriptivo.
- **El mismo modelo de ventana** (mapa 3D arriba, opciones con descripción y botón debajo) sirve para elegir santuario en la pantalla de inicio, para viajar entre islas, para Navegación en el espacio, para Áreas y, más adelante, para misiones.
- En la Tierra hay gravedad: el santuario 3 se anda (y se nada donde haya agua).
- **De la órbita a Bennu (08:22):** la Dragon se acopla a la nodriza en órbita baja y la nodriza hace el viaje real hasta Bennu.
- **Entrenadores (08:22):** se recrean los personajes de Cold Sanctuary con sus horarios; se turnan el papel de entrenador según su jornada.

## Respuestas cortas

- **Formación real**:
  - NASA: unos **2 años** de candidato.
  - ESA: **1 año** de formación básica.
  - JAXA: **más de 1 año** (unos 2 en el plan).
  - Tripulaciones comerciales: **meses**.

  Todas pasan por lo mismo: sistemas de la nave, paseo espacial bajo el agua, robótica, aviones o simuladores, supervivencia, medicina y, en la NASA, ruso y geología.
- **Lo que miraban para saber qué mando usar**:
  - Dragon: tres pantallas táctiles, con una fila de botones físicos para las órdenes críticas y el blanco de acople en la misma pantalla que los mandos.
  - LM: la escala LPD grabada en la ventana, más el ángulo que daba el DSKY, los punteros cruzados y las cintas de altura.
  - En los dos casos, cientos de horas de simulador.
- **Cold Sanctuary**:
  - Datos reales que se pueden traer: el cohete Electron, las distancias de seguridad de la FAA y el DoD, el diluvio, el deflector, la trinchera, los depósitos, el parque eólico de Ross Island y las aves antárticas.
  - Ficción que choca con las reglas: las alfombras voladoras, los edificios-árbol con tronco de agua por el que se nada, el submarino que entra por los troncos, la máquina de virtualización y el dragón de drones.
- **El escollo grande**:
  - El cohete de la lanzadera es un **Electron, que no lleva personas** (carga útil máxima de 300 kg).
  - Un Falcon 9 con Dragon pediría más de **1 km** de distancia de seguridad: no cabe en el mapa de ±600 m de Cold Sanctuary.
  - El lanzamiento final hacia el santuario 6 lo tiene que decidir Berón (§6, pregunta 2).

---

## 1. Selección y formación reales

### 1.1 Selección

| Agencia | Requisitos y números | Etiqueta | Fuente |
| --- | --- | --- | --- |
| NASA | Ciudadanía estadounidense y máster STEM (o dos años de doctorado, título médico o escuela de pilotos de pruebas). Tres años de experiencia, o 750 h al mando de reactores. Superar el **reconocimiento médico de vuelo de larga duración**. Dos rondas de entrevistas en Johnson | real | [NASA, Become an astronaut](https://nasa.gov/humans-in-space/astronauts/become-an-astronaut) |
| NASA, clase de 2025 | Más de 8000 solicitudes; formación de casi 2 años | real | [NASA 2025](https://www.nasa.gov/centers-and-facilities/johnson/nasas-2025-astronaut-candidates-shaping-artemis-exploration) |
| ESA, clase de 2022 | Más de 22 500 solicitudes; un año de formación básica en el EAC (Colonia), de abril de 2023 a abril de 2024 | real | [ESA, graduación](https://www.esa.int/Newsroom/Press_Releases/ESA_s_astronaut_class_of_2022_graduate) |
| JAXA, 2023 | Suwa y Yoneda, seleccionados en febrero de 2023 (la primera selección en 14 años) y certificados en octubre de 2024. Inglés, ruso, pilotaje de avionetas, ciencia, ingeniería, medicina y forma física | real | [Euronews](https://www.euronews.com/next/2024/02/01/meet-the-japanese-space-agencys-first-new-astronaut-recruits-in-more-than-a-decade), [Japan Times](https://japantimes.co.jp/news/2024/10/23/japan/jaxa-astronauts) |
| Primera prueba de la NASA | Nadar 3 largos de 25 m sin parar, otros 3 con mono de vuelo y zapatillas, y 10 min flotando con el mono | real | [NASA, ficha de formación](https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf) |

### 1.2 Puestos de formación

| Qué se entrena | Instalación real | Equipo y medidas reales | Duración | Etiqueta | Fuente |
| --- | --- | --- | --- | --- | --- |
| **Paseo espacial (EVA)** | NBL, Sonny Carter Training Facility (Houston) | Piscina de 62 × 31 × 12 m y unos 23 000 m³ (6,2 M galones), a 28–31 °C. Maquetas a escala real de los módulos de la ISS, de Dragon y de Cygnus. Los buzos respiran aire enriquecido | Sesiones largas a lo largo de los 2 años | real | [Wikipedia NBL](https://en.wikipedia.org/wiki/Neutral_Buoyancy_Laboratory), [NASA, ficha NBL](https://www.nasa.gov/centers/johnson/pdf/167748main_FS_NBL508c.pdf) |
| EVA (Europa) | NBF del EAC (Colonia) | Piscina octogonal de 22 × 17 m y 10 m de fondo, con 3,7 M litros | Dentro del año básico | real | [ESA, NBF](https://www.esa.int/About_Us/EAC/Refreshing_the_Neutral_Buoyancy_Facility), [Wikipedia](https://en.wikipedia.org/wiki/Neutral_buoyancy_pool) |
| EVA (Rusia y Japón) | Hidrolaboratorio de la Ciudad de las Estrellas; WETS de Tsukuba | Hidrolaboratorio: Ø 23 m y 12 m de fondo. WETS: Ø 16 m y 10,5 m, **cerrado en 2011** | — | real | [Wikipedia](https://en.wikipedia.org/wiki/Neutral_buoyancy_pool) |
| **Superficie lunar** | LUNA, de la ESA y el DLR (Colonia) | 700 m² de suelo lunar simulado con unas 750 t de regolito (900 t al terminar), simulador solar de sombras polares y descarga de peso a 1/6 g. Al lado, el hábitat FLEXHab | Abierta el 25-09-2024; plena en 2026 | real / **en desarrollo** (la descarga de peso) | [DLR](https://www.dlr.de/en/latest/news/2024/training-facility-for-astronautical-and-robotic-missions-to-the-moon) |
| **Sistemas de la ISS y vida a bordo** | SVMF, edificio 9 de Johnson | Maquetas del laboratorio estadounidense, los nodos, el PMM y la esclusa; Service Module, Soyuz y FGB de fidelidad media; Orion. Suelo de cojinetes de aire (PABF) y simulador de gravedad parcial. Se entrena: emergencias, mantenimiento, foto y TV, estiba, esclusa y cargas científicas | Todo el periodo | real | [NASA SVMF](https://www.nasa.gov/johnson/space-vehicle-mockup-facility) |
| **Robótica y SAFER** | Virtual Reality Lab de Johnson | Mochila SAFER de rescate en EVA, brazo robótico y manejo de masas de menos de 500 lb con un robot de tendones; programa DOUG | — | real | [Space Center Houston](https://spacecenter.org/how-nasa-uses-virtual-reality-to-train-astronauts) |
| **Aviones T-38** | Ellington Field (Houston) | T-38 biplaza. Los pilotos vuelan 15 h al mes; los demás, al menos 4 h | Todo el periodo | real | [NASA, ficha de formación](https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf) |
| **Supervivencia en agua** | Naval Survival Training Institute (Pensacola, 2022). Escuela de Supervivencia de la USAF (Fairchild) para Dragon y Starliner | Salir de un amerizaje simulado, montar la balsa, rescatar a un compañero e izarse al vehículo de rescate. Viento, olas y lluvia simulados. También hay una sesión con tormenta en el NBL | 1 semana (Pensacola) | real | [DVIDS](https://www.dvidshub.net/news/421286/astronaut-candidates-train-naval-air-station-pensacola), [USAF](https://www.aetc.af.mil/News/Article-Display/Article/1082482/nasa-astronauts-train-with-sere-for-space-mission), [NASA, verano](https://nasa.gov/centers-and-facilities/johnson/summer-training-catching-up-with-nasas-astronaut-candidates) |
| **Cámara hipobárica** | Sonny Carter (Houston) | Cámaras de baja y alta presión y sus emergencias | — | real | [NASA, ficha](https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf), [NASA, verano](https://nasa.gov/centers-and-facilities/johnson/summer-training-catching-up-with-nasas-astronaut-candidates) |
| **Vuelo parabólico** | NASA: «avión modificado». Europa: A310 Zero-G de Novespace (Burdeos) | NASA: unos 20 s de ingravidez por parábola, hasta 40 al día. A310: 31 parábolas de unos 20 s, con 1,8 g al entrar y al salir, y también parábolas lunares (0,16 g) y marcianas (0,38 g). Zona de ensayo de 20 × 5 × 2,3 m | 1 vuelo, unas 2–3 h | real | [NASA, ficha](https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf), [ESA A310](https://www.esa.int/Our_Activities/Human_Spaceflight/Research/Airbus_A310_Zero-G) |
| **Centrífuga** | NASTAR Center (Pensilvania), para Inspiration4. TsF-18 en la Ciudad de las Estrellas | Perfiles de lanzamiento, reentrada, amerizaje y aborto, copiados de vuelos de Dragon. Los cazas cargan **Gz** (hacia los pies); la centrífuga, **Gx** (sobre el pecho, cuesta respirar). Brazo de la TsF-18: 18 m (**a confirmar**) | 1–2 días | real | [Inspiration4](https://inspiration4.com/blog/inspiration4-crew-completes-centrifuge-training/) |
| **Geología** | Aula en Johnson; campo en Río Grande del Norte (Nuevo México) e Islandia | Trabajo de campo con los equipos de Artemis | Semanas sueltas | real | [NASA, verano](https://nasa.gov/centers-and-facilities/johnson/summer-training-catching-up-with-nasas-astronaut-candidates) |
| Geología antártica | ANSMET (meteoritos en hielo azul) | Equipos de 4–10 personas, de 5 a 7 semanas en el hielo; motos de nieve separadas 30 m; más de 20 000 meteoritos desde 1976. Fueron Don Pettit (2006–07) y Serena Auñón-Chancellor (2010–11) | 5–7 semanas | real | [Wikipedia ANSMET](https://en.wikipedia.org/wiki/ANSMET) |
| **Ruso** | Johnson y Ciudad de las Estrellas | Clases intensivas; requisito para graduarse | Todo el periodo | real | [NASA, ficha](https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf) |
| Otros | Ellington | Vuelos en el WB-57 | — | real | [NASA, verano](https://nasa.gov/centers-and-facilities/johnson/summer-training-catching-up-with-nasas-astronaut-candidates) |
| **Tripulación de Dragon** | Sede de SpaceX en Hawthorne | Un simulador de cabina de dos plazas y otro a escala real (asientos, paneles, programa de vuelo y soporte vital), donde se encadenan fallos cada vez más difíciles. Se ensaya el lanzamiento, las maniobras, el acople, la pantalla táctil, las anomalías, el diálogo con su control de misión, entrar y salir, los trajes y misiones completas | Meses | real | [Wired](https://wirednews.pages.dev/story/spacex-astronaut-training-sims), [Axiom Ax-4](https://axiomspace.com/mission-blog/ax4-spacex-training) |
| **Tripulaciones privadas (Axiom)** | Johnson (ISS), Hawthorne (Dragon) y EAC (Columbus) | Más corta que la profesional: no hacen el mantenimiento de la ESA | Meses | real | [ESA, Axiom en el EAC](https://m.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Axiom_astronauts_to_train_at_the_European_Astronaut_Centre) |
| Después de la formación básica | — | La formación para una misión larga añade 2–3 años | 2–3 años | real | [NASA, ficha](https://www.nasa.gov/centers/johnson/pdf/606877main_FS-2011-11-057-JSC-astro_trng.pdf) |

## 2. Qué miraban las tripulaciones para elegir el mando

- **Crew Dragon** (real):
  - **Tres pantallas táctiles** con la trayectoria y los mandos. Debajo, **dos filas de botones físicos bajo una tapa transparente** que ejecutan lo elegido en la pantalla. Un botón propio apaga un incendio y un tirador bajo la pantalla central (EJECT) arma el escape. Fuente: [Wired](https://wirednews.pages.dev/story/spacex-astronaut-training-sims).
  - Para pilotar a mano, **el blanco de acople y los mandos están en la misma pantalla**: se mira el blanco donde se vuela. Hurley probó el pilotaje manual cerca de la ISS para comprobar que la nave respondía como el simulador ([TechCrunch](https://techcrunch.com/?p=1983603), [Space.com](https://www.space.com/spacex-crew-dragon-touchscreen-astronaut-thoughts.html)).
- **Apolo LM** (real; detalle y fuentes en [cabina-lm.md](cabina-lm.md)):
  - El comandante, de pie, miraba por su ventana triangular, que llevaba grabada la escala del **LPD** en los dos cristales.
  - El ordenador (P64) daba en el DSKY el ángulo LPD (47° hacia los 2000 ft en el Apolo 11). Él alineaba las dos marcas y veía dónde iba a posarse; con el mando lo corría adelante, atrás o a los lados. Fuente: [Apollo11Space](https://apollo11space.com/what-is-the-grid-pattern-in-the-lunar-modules-window-understanding-the-landing-point-designator-lpd).
  - La velocidad horizontal salía en los **punteros cruzados**; la altura y su ritmo, en las **cintas**. Para acoplar usaba el **COAS** por la ventana de arriba.
  - Simulador: el **LLTV** de Ellington, que compensaba 5/6 de su peso con un turbofán. Armstrong hizo con él más de 30 vuelos y 50–60 aterrizajes, y dijo que el LM «volaba muy parecido» ([NASA](https://www.nasa.gov/history/50-years-ago-the-lunar-landing-training-vehicle)).

**Para el juego**:

- Codeship ya tiene el LPD y el COAS ([cabina-lm.md](cabina-lm.md)).
- En el simulador del §4 conviene que Dragon tenga sus tres pantallas, los botones bajo la tapa y el tirador.
- El blanco de acople va en la misma pantalla que los mandos.

---

## 3. Inventario del Santuario Aéreo de Cold Sanctuary

Leído en `origin/master` de Cold Sanctuary (`8218d4aa`, 2026-11-12):

- **Documentos**: `docs/world-topology-and-planes.md` §3, `docs/sitio-nuclear.md` §23, `docs/lanzadera-de-cohetes.md` y `docs/energia.md`.
- **Constructor**: `Assets/Editor/SampleSceneBuilder.Aereo.cs`, `.Launch.cs` y `.Energy.cs`.
- **Lógica**: en `Assets/Scripts/World/`, `AereoLink.cs` (con `AereoRule`), `AereoBase`, `AereoGate`, `AereoLift`, `AereoLiftStop`, `LaunchSite.cs` (con `LaunchHeightRule`), `ElevatedElement`, `RocketModel`, `EnergyRule`, `EnergySite`, `WindTurbineUnit`, `SolarArray`, `FloorEnergy` y `DroneDragon`; las aves están en `SnowPetrelLife.cs` (`ColdBirds.AirBudget`).
- **Pruebas**: `LaunchSiteTest` (grupo 90), `EnergyTest` (101) y `AereoTest` (110).

Santuarios de Cold Sanctuary: 1 Terrestre, 2 Marino, 3 **Aéreo**, 4 Subterráneo y 5 Núcleo. El espacio sería el 6.

### 3.1 Qué hay

| Pieza | Qué es en Cold Sanctuary (medidas) | Depende de | ¿Real? | En Codeship |
| --- | --- | --- | --- | --- |
| **Sitio** | Escena aparte que se carga sobre el mismo mar polar, a unos 78° S. Lanzadera en (−560, 0), parque en (−470, 470) y muelle aéreo en (−300, 170). Mapa de ±600 m | `SeaRule`, sol y viento de `EnergyRule` | El clima y el sol de 78° S, **reales**; el sitio, **ficción** del mundo compartido | **Se trae como datos**: coordenadas, mar y sol. La escena de Codeship no necesita el santuario 1 debajo |
| **Casquetes artificiales** | Lanzadera: 110 × 110 m. Parque: 240 × 240 m. Hielo armado de 1,5 m, pretil de 1,2 m, 4 tendones al fondo, radar de hielo y sonar de quillas | `BuildArtificialCap`, `IcebergRule` | **Licencia o ficción**: no existe ninguna plataforma de lanzamiento de hielo | **Se cambia por una plataforma marina** como la Odyssey de Sea Launch (**real**: antigua plataforma petrolífera, 36 lanzamientos entre 1999 y 2014, lastrada a 22 m y vacía durante la carga y el lanzamiento, con la gente a 5 km; [Wikipedia](https://en.wikipedia.org/wiki/Sea_Launch)) |
| **Edificio-árbol** (`HelixTower`) | Tronco de agua de 20 m con pared de acrílico, pisos de 32 × 32 m cada 22 m, puertas de 7 × 7 m. Se nada por el tronco y se sube con máscara | `TreeSpec`, `ArbolCampos` | **Ficción** de Cold Sanctuary | **Sin tronco de agua ni nadar.** Los pisos de 32 × 32 m sirven: torre de entrenamiento con ascensor real. Si conserva la forma de árbol, la decide Berón (§6, pregunta 4) |
| **Regla de altura** (`LaunchHeightRule`) | Plataforma ≥ máx(lo más alto del santuario, techo de las aves de 152 m) + 30 m, unos **192 m** hoy. Si algo crece, la sube y alarga los pilares (`Validate`, `RaiseTo`) | `ElevatedElement`, `BirdBehavior` | El dato de las aves es **real** (FAA/USDA: el 72 % de los choques, por debajo de 152 m). **Ninguna plataforma real está en alto** | Se porta como función pura y probada, **apagada tras `REAL_ONLY`**. En lo real, la plataforma va al nivel del mar y protege la distancia |
| **Distancia de seguridad** | 20 % del propulsante en TNT; K40 = 15,87 m·kg^-1/3 (unos 8 kPa); +50 % por cascotes. Electron: 2 t de TNT → 201 m → **300 m** | — | **Real** (FAA 14 CFR 420; DoD/NDIA) | **Se porta tal cual** (`inhabitedBuildingDistance(propellantKg)`). Falcon 9 (549 t al despegar; unas 520 t de propulsante, **estimación nuestra**) → unas 104 t de TNT → **~750 m**, y con cascotes **~1,1 km** |
| **Corona de lanzamiento** | Losa de 24 × 24 × 2 m con hueco de llama de 4 × 4 m. Deflector de acero a 45° y trinchera de 4 × 4 m hacia el oeste. Diluvio con depósito, bajante y 8 rociadores. Cubeta de 1,5 m, escudo contra cascotes de 10 m, torre umbilical de 22 m y 4 pilares de 3 × 3 m | `LaunchSite` | Las piezas son **reales**; las medidas, **del juego** | Datos y modelo, en la plataforma marina |
| **Cohete** (`RocketModel`) | Electron de 18 m y Ø 1,2 m, RP-1 y LOX. Malla de revolución con 9 toberas, faldón, interetapa, segunda etapa y cofia, y **4 aletas** | — | **Real** (18 m, Ø 1,2 m, 13 t, hasta 300 kg a LEO; [Wikipedia](https://en.wikipedia.org/wiki/Electron_rocket)). **No lleva personas**. Las aletas no salen en las fotos (**a comprobar**) | Se porta el perfil del torno. Sirve para lanzar **carga** (§4, puesto 10), no a ella |
| **Depósitos y polvorín** | Esferas de LOX y RP-1 a más de 80 m entre sí, con cubetas; polvorín de las cargas de separación | — | Separación **real** | Datos |
| **Fábrica de cohetes** (P1) | Etapas en cunas, carga útil, grúa puente | — | **Real** (integración horizontal) | Se porta; es el puesto de la carga útil |
| **Control de misión** (P2) | 12 puestos en 3 filas, pantalla de 16 × 5 m; misiones de telemetría y meteorología, seguridad, iceberg y vaciado | `WorkRoster`, `Iceberg` | **Real** como sala genérica | Se porta. Sus misiones pasan a ser **retos de código** ([reglas.md](reglas.md) §4.1) |
| Tanque de virtualización del área | Entrada a la simulación por meditación | `VirtualizationMachine`, microcosmos | **Ficción** | **Fuera.** En su lugar, simuladores reales (§4, puesto 8) |
| Garaje (P5) y submarino de obra | El submarino entra por el fondo abierto de los troncos | `ConstructionSubmarine` | **Ficción** | Fuera. La carga llega en barco y la sube una grúa (**real**, como Sea Launch) |
| **Ascensor** (`AereoLift`) | Paradas en el andén, en cada piso, en el techo y en la plataforma. 10 m/s, 1,5 m/s² y 4 s de puertas (valores del juego). `LiftSeconds(subida)` | `SiteLineRule.Run` | **Real** | **Se porta la lógica y su prueba.** En Codeship el viaje **se ve**, sin fundido a negro ([reglas.md](reglas.md) §3.1) |
| **Muelle aéreo** (`AereoLink`) | Se llega en **alfombra voladora**: 30 s de vuelo, carga aditiva y trabajadores ocultos | `FlyingCarpet`, `CarpetPad` | **Ficción** (las alfombras) | **Helipuerto.** El helicóptero es lo real para llegar a una plataforma en el mar. El vuelo se ve y puede ser un reto. Pregunta 5 |
| **Parque energético** | 3 turbinas de 330 kW (las de Ross Island, rotor de 33 m, buje a 37 m); mareal piloto de 2 × Ø 10 m; mesas solares de 36 módulos (14,4 kWp); 6 × 5 MWh de baterías; silo de arena de 30 MWh; cable con un 2 % de pérdida (estimación); los pisos piden 50 kW | `EnergyRule`, `EnergySite`, `FloorEnergy` | Turbinas, sol y baterías **reales**; el reparto y la pérdida, **del juego** | **Datos para más adelante.** Daría la energía de la base de entrenamiento; no es necesario para la iniciación |
| **Seguridad de aves** | La turbina para si hay un ave a ≤ 200 m y rearma a los 30 s; pala negra; mareal con la punta a ≤ 5 m/s y sonar con parada a 50 m | `WindTurbineUnit` | Medidas **reales**; las distancias, **del juego** y razonadas | Se porta con el parque |
| Figuras aterradoras y habituación | 4 figuras ocultas; habituación del 10 % por salida | `EnergySite` | **Modelo del juego** | Apagadas tras `REAL_ONLY` |
| **Dragón de drones** | 48 drones, vuelo de 45 s | `DroneDragon` | **Adorno** (ninguna fuente dice que ahuyente aves) | Apagado tras `REAL_ONLY` |
| **Fauna fría** | 10 aves (2 págalos polares, 4 petreles dameros, 2 albatros viajeros, 2 charranes árticos) con nidos y bancos de peces y kril, 220 m al sur | `ColdBirds.AirBudget`, `FoodChain` | **Real** (especies que viven allí) | Se porta como datos de especie, con sus fuentes de Cold Sanctuary. Son animales salvajes de la Tierra, no animales a bordo: la regla de los animales no volados no se aplica |
| Icebergs | Seguimiento por radar y sonar; remolque; vaciado | `IcebergRule` | Remolcar icebergs es **real** (Terranova) | Más adelante, como reto de Control de misión |
| Microcosmos «Hawthorne 2008» | Pueblo del microcosmos de un personaje famoso | `CivicBuilder.Famosos` | Ficción sobre una persona real | **No se trae.** De Hawthorne solo se usa lo público: allí se entrena a las tripulaciones de Dragon |

### 3.2 Cómo se trae sin inventar excepciones

- **Lógica pura a TypeScript**: `AereoRule.LiftSeconds`, `TripSeconds`, la distancia de seguridad, `LaunchHeightRule` (apagada), las reglas de las turbinas y `ColdBirds`. Va a un módulo `src/modules/aerial-sanctuary/` (`domain/`, `data/` con `Sourced<T>`).
- **Pruebas**: cada `TestProbe.Check` de los grupos 90, 101 y 110 que no dependa de Unity pasa a una prueba de Vitest con el mismo texto.
- **Lo ficticio queda apagado tras `REAL_ONLY`** y se apunta en [pendientes.md](../pendientes.md): árbol con agua, alfombras, submarino, virtualización, dragón y figuras. Ninguna excepción: si Berón quiere alguna pieza, se etiqueta **ficción** y se pregunta (§6).
- **La gravedad**: Codeship ya tiene `AREA_MOTION` con «gravedad» y «agua» (`src/core/realism.ts`). El santuario 3 está en la Tierra: su valor sería «gravedad», y el de la piscina, «agua». Hoy la regla §2.6 dice que no hay áreas con gravedad «de momento»: hay que confirmarlo (pregunta 1).

---

## 4. Propuesta: el Santuario 3 como iniciación de Doménica

**Idea**: el Santuario Aéreo es la base de entrenamiento de Doménica antes de subir.

- En una plataforma marina con su torre de entrenamiento, la lanzadera, el control de misión, una piscina de flotabilidad neutra y un helipuerto.
- Los aviones (T-38 y vuelo parabólico) salen de una pista fuera del mapa: el helipuerto lleva hasta ella (pregunta 8).
- Cada puesto copia uno real (§1). Cada paso es un **reto de código con su animación en el sitio** ([reglas.md](reglas.md) §4).
- Las cifras van en la hoja del reto, con su fuente.

### 4.1 Puestos y retos

Los conceptos de código siguen [indice-de-estudio.md](../research/indice-de-estudio.md).

| # | Puesto (sitio en S3) | Copia de | Retos de código (concepto) | Animación |
| --- | --- | --- | --- | --- |
| 1 | **Llegada y selección** (helipuerto → andén → sala de entrevistas en la torre, piso 3) | Requisitos y entrevistas de la NASA | Comprobar si una solicitud cumple los requisitos reales (condicionales: título, años u horas de vuelo) | Ella baja del helicóptero, sube en el ascensor y se sienta ante el tribunal |
| 2 | **Centro médico** (torre, piso 3) | Reconocimiento médico de larga duración | Ordenar las pruebas del reconocimiento (secuencia); leer constantes y marcar las que salen de rango, con forma y color ([reglas.md](reglas.md) §5.6) | Toma de tensión, ECG con electrodos, báscula |
| 3 | **Prueba de natación y supervivencia en agua** (piscina) | Prueba de la NASA; Pensacola y Fairchild | Contar largos y tiempo (bucles: 3 × 25 m, otros 3 con mono, 10 min flotando); procedimiento tras amerizar: salir, balsa, rescate, izado | Nada, se pone el mono, olas y lluvia simuladas, sube a la balsa y la izan |
| 4 | **Cámara hipobárica** (torre, piso 3) | Cámaras de Sonny Carter | Bajar la presión por etapas y reconocer los síntomas de hipoxia (variables y condicionales); ponerse la máscara de O₂ a tiempo | Cámara con ventanillas; ella, con máscara y lista |
| 5 | **Centrífuga** (edificio en la plataforma) | NASTAR y perfiles de Dragon | Programar el perfil (listas de tramos de g en el tiempo): lanzamiento, reentrada, amerizaje y aborto; distinguir Gx de Gz | La góndola gira; se la ve apretada contra el asiento |
| 6 | **Vuelo parabólico** (helipuerto → pista fuera del mapa) | A310 Zero-G | Contar las 31 parábolas y sus fases (1,8 g, unos 20 s a 0 g, 1,8 g) con un bucle; probar un objeto suelto en 0 g | Cabina acolchada de 20 × 5 × 2,3 m; ella flota |
| 7 | **Piscina de flotabilidad neutra** (edificio en la plataforma) | NBF de la ESA: 22 × 17 × 10 m, 3,7 M L (la NBL de 62 × 31 m no cabe en una plataforma) | Lastrar el traje hasta la flotabilidad neutra (operaciones: pesos y flotadores); ponerse el EMU con la **cadena de retos que ya existe** en [paseo-espacial.md](paseo-espacial.md); recorrer la maqueta | Bajo el agua, con buzos de apoyo, sobre una maqueta de un módulo de la ISS |
| 8 | **Simuladores** (torre, piso 4) | Simuladores de Dragon en Hawthorne; LMS y LLTV del Apolo | Ensayos encadenados: lanzamiento, aborto, acople manual y fallos cada vez más difíciles (funciones y eventos). Se **reutilizan** la cabina del LM ([cabina-lm.md](cabina-lm.md)) y el puente de la Starship, en modo simulador | Ella sentada en la cabina de Dragon (3 pantallas, botones bajo la tapa, tirador EJECT) o de pie en la del LM |
| 9 | **Robótica** (control de misión, puesto robótico) | Generic Robotics Trainer y VR Lab | Los retos de captura y movimiento del brazo de [brazo-robotico.md](brazo-robotico.md), en simulador | Manos en los dos mandos; el brazo en pantalla |
| 10 | **Control de misión: lanzamiento de un Electron** (piso 2 y plataforma) | Rocket Lab y Sea Launch | Cuenta atrás (bucle), condiciones de lanzamiento (viento en altura, techo de nubes) y evacuar la plataforma a la distancia de la regla (300 m para Electron). La carga, de hasta 300 kg, puede ser un cubesat como **Juventas** (12 kg) | Ella en su puesto; en la pantalla grande, el diluvio y el despegue |
| 11 | **Geología: meteoritos en hielo azul** (islas y glaciar) | ANSMET, Islandia y Nuevo México | Buscar meteoritos en el hielo (recorrido en cuadrícula con motos de nieve separadas 30 m) y clasificarlos por tipo (C, S, M de [asteroides.md](../research/asteroides.md)) | Moto de nieve, bolsa estéril y pinzas |
| 12 | **Supervivencia en frío** (isla) | Supervivencia de invierno de las tripulaciones de Soyuz (**fuente a buscar**) | Refugio, calor y señales (composición) | Refugio de nieve y bengala |
| 13 | **Integración y lanzamiento** (plataforma de tripulación) | Crew Dragon: traje, brazo de acceso y cuenta atrás | Ponerse el traje, comprobar fugas, cuenta atrás y ascenso por etapas | Pasarela, asiento, despegue con vista real hacia el santuario 6 |

### 4.2 Secuencia

**1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 → 11 → 12 → 8 → 10 → 13.**

- Primero lo médico y lo físico, como en la NASA. Después las destrezas: EVA, robótica, geología y supervivencia. Los simuladores de misión van al final, cuando ya se sabe todo.
- El puesto 10 (ver despegar un Electron desde el control de misión) prepara el 13 (despegar ella).
- **Ritmo propuesto**: un puesto por día de juego (24 min reales), es decir, unas 13 jornadas. Los datos reales (2 años) se dicen en la hoja; el tiempo se comprime, como en el resto del juego.
- **Al terminar**: se lanza al santuario 6 y empieza la partida de ahora. Cómo se sube depende de la pregunta 2.

---

## 5. Pantalla de inicio y mapa de niveles

### 5.1 Cómo se ve (móvil, 390 × 664)

| Parte | Qué tiene |
| --- | --- |
| Cabecera | «Codeship» · [+] [−] [Cenital], como en Navegación |
| Mapa 3D (arriba, ~45 % de la altura) | Los santuarios en un eje vertical de **profundidad = peligro**, como en `docs/world-topology-and-planes.md` §3 de Cold Sanctuary: Núcleo (5) y Subterráneo (4) abajo, Marino (2), Terrestre (1) en el centro y Aéreo (3) encima; el Espacio (6) arriba, con la órbita. Cada uno, un nodo sobre su tallo encima del plano de referencia, como los asteroides en `nav-map.ts`. Jugables: 3 y 6. Los demás, apagados con la etiqueta «En Cold Sanctuary». Una línea discontinua une 3 con 6: es el lanzamiento |
| Lista (abajo) | Una fila por nivel jugable con su descripción, su estado (sin empezar, en curso con el puesto n.º, terminado) y **Jugar**. «Santuario 3 · Aéreo: la iniciación de Doménica» y «Santuario 6 · Espacio: la nodriza, la estación y los asteroides» |
| Ficha | Al tocar un nodo o una fila: qué es, qué es real y qué es ficción, y de dónde viene en Cold Sanctuary |

- Objetivos de toque de al menos 44 px; los fallos y estados se marcan con forma y color ([reglas.md](reglas.md) §5.5–5.6).
- Mientras no exista el santuario 3, sale «En construcción» y solo se juega el 6.

### 5.2 Reutilizar el modelo de Navegación

`NavMap` (`src/ui/nav-map.ts`) ya separa:

- el **lienzo** con proyección 3D (`yaw`, `elevation`, `zoom`, tallos sobre el plano y `pickAt`);
- las **fichas** (`chips`) y la **tarjeta** (`card`).

Propuesta:

1. Sacar de ahí un `MapWindow` genérico: lienzo, giro y zoom, nodos con posición 3D, nombre, estado y HTML de ficha, y una lista debajo. Con pruebas de la proyección y de `placeNodes`.
2. `NavMap` (asteroides), `AreasWindow` (compartimentos) y el nuevo **`LevelMap`** (santuarios) son tres modelos sobre esa ventana. Más tarde, las misiones.
3. Los datos de los niveles van en `src/modules/levels/data/levels.ts`: id, número de Cold Sanctuary, nombre, posición en el eje, jugable o no, descripción y fuente.
4. Arranque: `main.ts` enseña `LevelMap` antes de crear la escena. «Jugar 6» hace lo de ahora; «Jugar 3» carga la escena aérea. `?nivel=3|6` lo salta (pruebas y recorridos), y el último nivel jugado se guarda en los ajustes.

**Control del mapa**:

- [reglas.md](reglas.md) §5.7 permite girar y ampliar con el dedo el mapa de Navegación y el de Áreas.
- `nav-map.ts` todavía gira con el joystick «Girar». La pantalla de inicio seguiría lo mismo que esos dos mapas.
- ¿Entra en la excepción del dedo? Es la pregunta 9.

### 5.2.1 Hecho en `inicio-niveles` (fase 1)

- **`MapWindow`** (`src/ui/map-window.ts`): el lienzo con el giro con el dedo, el pellizco, el joystick «Girar», +, − y «Cenital»; tocar para elegir; la lista de opciones (descripción y botón de 44 px, las bloqueadas con su motivo y un candado ⊘) y el engranaje de ajustes cuando la ventana los tiene. Su lógica sin DOM (proyección, toque más cercano, selección y bloqueo) está en `map-window-model.ts`, con pruebas.
- **Navegación** (`nav-map.ts`) y **Áreas** (`areas-window.ts`) usan esa ventana y se ven igual que antes.
- **Pantalla de inicio** (`src/ui/start-screen.ts`, entrada `src/boot.ts`): sale en cada carga, antes de crear la escena y sin menú árbol. El mapa pone los seis santuarios en el eje profundidad = peligro y la lista los ordena igual, de arriba abajo: 6, 3, 1, 2, 4 y 5. Solo el 6 se juega; el 3 se elige y dice «En construcción: iniciación y entrenamiento de Doménica»; los demás, «Próximamente». Datos en `src/modules/levels/data/levels.ts`, con su fuente.
- **«Continuar»**: si hay una partida guardada (`localStorage` `codeship.partida`, con el nivel y la fecha), el botón de su nivel dice «Continuar». Todavía nada guarda partidas (docs/qa HC-06): hoy no sale nunca en una partida real.
- No hay `?nivel=` para saltar el inicio: los recorridos entran tocando el 6 o «Continuar» (`enterGame` en `tools/experiencia/lib.mjs`). Recorrido PX-44.

### 5.3 Plan por ramas

Cada rama lleva sus pruebas, su recorrido PX (desde PX-44), sus capturas en el móvil y su fila en `docs/qa`.

| Fase | Rama | Qué | Recorrido |
| --- | --- | --- | --- |
| 1 | `inicio-niveles` | `MapWindow` sacado de `NavMap` sin cambiar nada de Navegación ni de Áreas (sus recorridos siguen en verde). `LevelMap` y `levels.ts`. Inicio con 3 «en construcción» y 6 jugable | PX-44 `inicio`: elegir el 6 y llegar a la partida de ahora |
| 2 | `s3-logica` | Módulo `aerial-sanctuary`: ascensor, distancia de seguridad, regla de altura (apagada), aves y datos del cohete, con fuentes y etiquetas. Pruebas portadas de los grupos 90, 101 y 110 | Solo pruebas |
| 3 | `s3-escena` | Hecha ([santuario3-escena.md](santuario3-escena.md)): las islas de Cold Sanctuary con su magia (edificios-árbol de agua con ascensor visible, corona con el Electron, parque energético con aves, muelle de alfombras), la isla de entrenamiento real (NBL, centrífuga, maquetas, control de misión, gimnasio, centro médico, helipuerto), la plataforma del Falcon 9 en el mar, una máquina de navegación por isla y vuelos a la vista. `AREA_MOTION`: «gravedad» y «agua». El 3 se juega y se guarda | PX-45 `s3-recorrido`: helipuerto → navegación → vuelo → ascensor → plataforma, sin teletransporte |
| 4 | `s3-iniciacion-1` | Hecha ([santuario3-puestos.md](santuario3-puestos.md)): puestos 1–4 y 7 (selección, medicina, agua, hipobárica, piscina) con su animación en el sitio, reutilizando los pasos del EMU; las entrenadoras de Cold Sanctuary con su jornada; vuelos entre islas manual y por reto; escala para todas las áreas; el muelle fuera de los 300 m | PX-46 `s3-iniciacion` |
| 5 | `s3-iniciacion-2` | Hecha ([santuario3-puestos.md](santuario3-puestos.md)): puestos 5, 6, 8, 9, 11 y 12 (centrífuga que gira con ella en la góndola, A310 Zero-G desde la pista de hielo azul de un glaciar al que se va en helicóptero, simulador de Dragon con el acople a mano de la Starship y el alunizaje a mano en la cabina del LM, robótica con el reto del Canadarm2, meteoritos de ANSMET, supervivencia en frío); sin sustituta fuera del turno (el puesto espera y la tarjeta dice cuándo empieza el siguiente) y salida anticipada de las entrenadoras | PX-47 `s3-iniciacion-2` |
| 6 | `s3-lanzamiento` | Puestos 10 y 13; el paso del 3 al 6 y la partida del 6 desde el lanzamiento | PX-48 `iniciacion-completa` |
| 7 (opcional) | `s3-energia` | Parque energético y seguridad de aves | Por asignar (PX-49 es `s3-detalle`: [santuario3-detalle.md](santuario3-detalle.md)) |

Las fases 1 y 2 no dependen de las preguntas y pueden empezar ya. La 3 necesita las respuestas 1, 4, 5 y 6; la 6, la 2 y la 3.

---

## 6. Preguntas para Berón

1. **Gravedad.** El santuario 3 está en la Tierra. ¿Activamos «gravedad» (andar con joystick) y «agua» (la piscina) en `AREA_MOTION`, aunque §2.6 diga que «de momento» todo es ingravidez? Recomendamos que sí, solo en el santuario 3.
2. **¿En qué sube ella?** El Electron de la lanzadera no lleva personas. Opciones:
   - **A.** Crew Dragon en Falcon 9 desde una plataforma de tripulación a unos 1,1 km (la regla de distancia), en el mismo mar. El vehículo es **real**; lanzar un Falcon 9 desde el mar sería **licencia**.
   - **B.** Starship desde una plataforma marina, como las Phobos y Deimos que SpaceX compró y luego abandonó (**fuente a buscar**). Sería **licencia**, a muchos km.
   - **C.** Volar a un sitio real (LC-39A) y lanzar desde allí, fuera del santuario.

   Recomendamos **A**: el Electron se queda como lanzador de carga y su lanzamiento es el puesto 10.
3. **De la órbita baja al cinturón.** El santuario 6 empieza junto a Bennu, con la Starship. ¿Dragon se acopla a la Starship en órbita baja y el viaje al cinturón se cuenta con su tiempo real (meses) en un resumen? ¿O el santuario 6 empieza en órbita terrestre? La regla §3.4 pide trayectorias reales.
4. **Edificios-árbol.** ¿La torre de entrenamiento conserva la forma de árbol de Cold Sanctuary, sin tronco de agua (forma etiquetada **ficción**, función real), o es un edificio corriente?
5. **Alfombras.** ¿Cambiamos el muelle aéreo por un helipuerto, con el vuelo visible y como reto?
6. **Plataforma en alto.** La regla de altura de Cold Sanctuary pone la plataforma a unos 192 m. ¿En Codeship va al nivel del mar, como las reales, con la regla apagada?
7. **Personajes.** ¿Kushal, el protagonista de Cold Sanctuary, aparece en la iniciación (visita o llamada) o hay instructores nuevos?
8. ~~**Aviones.** El T-38 y el A310 necesitan una pista de kilómetros que no cabe en ±600 m. ¿Salen de una pista de hielo fuera del mapa (como las de McMurdo), a la que se llega en helicóptero?~~ Respondida (2026-11-18): sí; el A310 sale de una pista de hielo azul en un glaciar fuera de las islas, en helicóptero ([santuario3-puestos.md](santuario3-puestos.md), «El glaciar»).
9. ~~**Mapa del inicio.** ¿Se gira con el dedo, como Navegación y Áreas en §5.7, o con el joystick, como hace hoy `nav-map.ts`?~~ Respondida por la decisión de Berón (arriba): es la misma ventana de mapa, que se gira con el dedo y también con su joystick ([reglas.md](reglas.md) §5.7).
10. **Duración y saltos.** ¿Unas 13 jornadas está bien? ¿Se puede jugar el 6 sin terminar el 3?
11. **Cold Sanctuary.** El `RocketModel` pone 4 aletas al Electron. ¿Lo comprobamos y avisamos allí?
