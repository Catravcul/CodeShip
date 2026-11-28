# Naves reales: auditoría, hangares, sustitutos y soporte vital

Pregunta de Berón (2026-11-16): «¿La nave nodriza es real? Para las naves, la base es que sean reales o que ya estén en desarrollo para un lanzamiento futuro. Por lo que dices, ¿el hangar no es real? ¿O existen hangares en estaciones reales? Si es así, ¿para qué sirven?».

Después añadió: «Creía que ya habíamos investigado las naves, también los componentes. Se supone que tenemos un catálogo de naves, módulos de aterrizaje, sondas y estaciones, y que las recreamos con los componentes que se consiguen con los planos». Y también: «Nuestro catálogo tiene que describir cómo son por fuera y por dentro. Vamos a reconstruir la nave y la estación desde cero, con el soporte vital real de la tripulación. Después, sobre esa base, veremos cómo añadir las personalizaciones más de ficción que irán creando el santuario espacial».

Esta investigación **amplía** la de [componentes-de-nave.md](componentes-de-nave.md) y [../design/componentes.md](../design/componentes.md). No la sustituye. La propuesta y el plan de reconstrucción están en [../design/naves-reales.md](../design/naves-reales.md). El catálogo en código está en `src/modules/station/data/vehicle-catalogue.ts`, con estado, fuentes y receta de piezas de cada vehículo.

Datos consultados el **16 de noviembre de 2026**. Convenciones, como en componentes.md: «copiado» es el número tal cual lo da la fuente, «derivado» es una cuenta con números copiados (se enseña la cuenta) y «estimación» es un número razonado sin fuente directa.

## Respuestas cortas

- **¿La nodriza es real?** No. Está **inventada**, aunque use componentes reales. Ningún vehículo real, ni que haya volado ni en desarrollo, tiene gravedad artificial. Lo más cercano es la estación giratoria de **Vast**, un paso de su hoja de ruta previsto para 2035 que ni siquiera tiene programa.
- **¿El hangar es real?** No. **Ninguna estación, de las que han existido ni de las previstas, ha tenido un hangar que encierre una nave**, ni presurizado ni abierto. Lo que sí existe:
  - **esclusas de carga**: Bishop y la esclusa de Kibo en la ISS, la esclusa de carga de Mengtian en Tiangong y las dos esclusas científicas de Skylab;
  - **plataformas expuestas**: la Exposed Facility de Kibo y los 59 adaptadores de Tiangong;
  - **atraque con brazo** en un puerto CBM;
  - la **bodega del transbordador**, que era una bahía de vehículo, no de estación.

  Se usan para soltar cubesats, sacar experimentos al vacío, tirar basura, salir de paseo espacial y mover cargas. Para dar servicio a otras naves se hace que la nave visitante atraque (Xuntian atracará en Tiangong para que la reparen).
- **¿Y el resto?** De lo que hay en el juego, los craft (nodriza, Explorer, sonda), la estación como conjunto, el hangar de 20 × 14 × 20 m, el dique seco y los anillos de 1 g son **inventados**. La mayoría de los componentes son **reales y han volado** (§1).

## 1. Auditoría: qué es real

Clases: **(a)** real y ha volado (o vuela ahora); **(b)** real y en desarrollo, con programa financiado y fecha; **(b′)** hardware construido con el programa en pausa; **(c)** solo concepto o prueba en tierra; **(d)** inventado.

### 1.1 Naves y estación del juego

| Elemento | Clase | Por qué | Fuente |
| --- | --- | --- | --- |
| **Nodriza** (espina de 152 m, anillos de 112 m, ~877 t) | **(d)** | Diseño del juego. Los cascos imitan al B330, los módulos de la espina a Quest, el PMM y Destiny, y el reactor sale de un estudio de la NASA | [nave-nodriza.md](../design/nave-nodriza.md) |
| Anillos de 1 g que giran en sentidos contrarios | **(d)** | No hay ningún anillo así en desarrollo. Nautilus-X (c) y la estación de Vast (c) son lo más parecido | [Nautilus-X](https://en.wikipedia.org/wiki/Nautilus-X), [Vast](https://vastspace.com/roadmap) |
| **Explorer** (módulo de aterrizaje) | **(d)** | Hecha de piezas (a). Pesa **1166 kg en seco** según `Ship.create`, no los ~680 kg que todavía dicen `hangar-craft.ts` y gravedad.md | [componentes.md](../design/componentes.md) |
| **Sonda** (`ship/data/probe.ts`) | **(d)** | Bus de Juventas (a), MPS-120XW (b: en producción, sin vuelo), batería de MASCOT (a) y anclas (c). Pesa 16 kg en seco | [probe.ts](../../src/modules/ship/data/probe.ts) |
| ~~**Sonda de prospección** (plano de 30 kg)~~ | — | Quitado: la sonda es Juventas (12 kg, real), [modulo-lunar-juventas.md](../design/modulo-lunar-juventas.md) | `ship/data/probe.ts` |
| **Estación** (Nueva Polana) | **(d)** | Conjunto del juego hecho de módulos (a) | [estacion.md](../design/estacion.md) |
| Nodo 1 y Nodo 2 | (a) | Nodo Unity de la ISS | [Unity](https://en.wikipedia.org/wiki/Unity_(ISS_module)) |
| Módulo habitable | (b′) | HALO del Gateway: construido y en pausa desde marzo de 2026 | [NSF](https://www.nasaspaceflight.com/2026/03/nasa-moon-base-pivots-gateway/) |
| Módulo de fabricación | (a) | Destiny | [Destiny](https://en.wikipedia.org/wiki/Destiny_(ISS_module)) |
| Módulo de la planta | (a) | Columbus | [Columbus](https://en.wikipedia.org/wiki/Columbus_(ISS_module)) |
| Módulo agrícola | (c) | B330 de Bigelow, que nunca voló (sí volaron Genesis I y II y BEAM) | [B330](https://en.wikipedia.org/wiki/B330) |
| Adaptadores IDA y norma IDSS | (a) | ISS | [IDA](https://en.wikipedia.org/wiki/International_Docking_Adapter) |
| Alas, iROSA y radiadores EATCS | (a) | ISS | [ISS](https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station) |
| **Hangar** de 20 × 14 × 20 m | **(d)** | Ninguna estación tiene uno (§2). Los documentos tampoco coinciden: estacion.md e interiores.md dicen «sin presión», y dique-seco.md lo llama «presurizado, con esclusa» | [estacion.md](../design/estacion.md), [dique-seco.md](../design/dique-seco.md) |
| **Dique seco** de 128 × 128 × 143 m | **(d)** | Basado en la celosía de la ISS (a) y en estudios de montaje con robots (c) | [dique-seco.md](../design/dique-seco.md) |
| Celosía de 88 m | (d) sobre (a) | Imita la ITS de la ISS (94 m) | [NASA](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/) |

### 1.2 Componentes

| Componente | Clase | Nota |
| --- | --- | --- |
| Motores químicos: R-4D-11, R-4D-15 HiPAT, ArianeGroup 400N y 10N, R-42, AJ10-190, MR-104H, MR-107S, MR-80B, MR-106L, MR-111G, MR-107T, R-1E, HPGP 22N y 5N | (a) | Todos con vuelos ([thrusters.ts](../../src/modules/ship/data/thrusters.ts)) |
| Tanques de titanio de Northrop Grumman y OST 25/0 | (a) | Modelos de catálogo que han volado ([tanks.ts](../../src/modules/ship/data/tanks.ts)) |
| Cabinas de Al-Li 2195, Al 2219 y Ti-6Al-4V | (a) | Orion, el depósito externo del transbordador, Apolo |
| Cabina de acero de hierro y níquel | (d) | Variante de juego para hacerla con la roca |
| Cabina de CFRP | (c) | El Composite Crew Module de la NASA fue un artículo de prueba en tierra |
| Alas rígidas de GaAs, ROSA, MMRTG, baterías de ion-litio y de plata-zinc | (a) | |
| Escudos Whipple | (a) | |
| Sistema de acople NDS (IDSS) | (a) | |
| **X3** (Hall de 100 kW) | **(c)** | Probado en tierra (Hall et al. 2019). No tiene programa de vuelo |
| **AEPS** (Hall de 12 kW) | (b) | Unidades de vuelo entregadas para el PPE. Ahora irá en SR-1 Freedom, a finales de 2028 |
| NEXT-C | (a) | Voló en DART (2021) |
| **VASIMR VX-200** | **(c)** | Solo en tierra |
| **Reactor de 2 MWe** | **(c)** | Estudio de la NASA (Harnack et al. 2022). El reactor espacial real más cercano es el de **20 kWe** de SR-1 Freedom (b) |
| Kilopower de 10 kWe | (c) | KRUSTY se probó en tierra en 2018 |
| Impresora de metal de la ESA, soldadura en el espacio (Savitskaya, 1984) | (a) | |
| Reactor de carbonilo, celda de compuestos, MELiSSA | (c) | En tierra o en estudio |

## 2. Hangares en estaciones reales

**Conclusión.** Ninguna estación ha encerrado nunca una nave, ni con presión ni sin ella. Las naves **atracan** en un puerto, solas (docking) o con el brazo (berthing), y el trabajo de fuera se hace con brazos, robots y paseos espaciales. Lo que sí existe son bahías pequeñas para **cargas**:

| Estación | Qué tiene | Tamaño | Para qué sirve | Fuente |
| --- | --- | --- | --- | --- |
| **ISS: esclusa Bishop** (Nanoracks, 2020) | Campana sin escotillas propias. El brazo la saca del puerto de Tranquility con la carga dentro | 1059 kg, 2,0 × 1,8 m, **3,99 m³** presurizados | Soltar cubesats y satélites pequeños, sacar cargas al vacío y **tirar basura**, que se quema al entrar en la atmósfera. Para cada salida: se cierra la escotilla, una bomba recupera el aire del vestíbulo, se sueltan los pernos del CBM y el brazo la lleva a su sitio | [Wikipedia](https://en.wikipedia.org/wiki/Nanoracks_Bishop_Airlock) |
| **ISS: Kibo** (JAXA) | Esclusa de experimentos en el módulo presurizado, **Exposed Facility** (4 × 5,6 × 5 m, 4 t, 12 puertos) y brazo JEMRMS de 10 m con un brazo fino de 2,2 m | | Sacar experimentos al vacío y cambiarlos con el brazo. Desde esta esclusa también se sueltan cubesats con el J-SSOD (la página citada no lo detalla) | [Kibo](https://en.wikipedia.org/wiki/Kibo_(ISS_module)) |
| **ISS: atraque con brazo** | Canadarm2 (17 m) captura la nave y la pone en un CBM | Hasta 116 t | Por ahí entraban las naves de carga (HTV, Dragon, Cygnus) | [dique-seco.md](../design/dique-seco.md) |
| **Transbordador espacial** (vehículo, no estación) | Bodega **sin presión** | **18,3 × 4,6 m**, 24,4 t a LEO | Llevar y recuperar satélites, dar servicio al Hubble y llevar Spacelab. Es lo más parecido a un hangar que ha volado, y estaba en la nave | [Orbiter](https://en.wikipedia.org/wiki/Space_Shuttle_orbiter) |
| **Tiangong** | Esclusa de EVA en Wentian. **Esclusa de carga** en Mengtian, con un brazo que saca los experimentos. **22 + 37** adaptadores fuera. Brazos de 10 m y 5 m | ~100 t | Experimentos expuestos y lanzamiento de microsatélites. Xuntian (2027) volará cerca y **atracará** para que la reparen y la reposten | [Tiangong](https://en.wikipedia.org/wiki/Tiangong_space_station) |
| **Mir** | Esclusa de Kvant-2 con escotilla de 1 m, puertos APAS de Kristall pensados para Buran (los usó el transbordador), brazos Lyappa para cambiar los módulos de puerto | | Paseos espaciales, guardar la mochila Ikar y atraque. **No tenía hangar** | [Mir](https://en.wikipedia.org/wiki/Mir) |
| **Skylab** | Airlock Module (17,4 m³) para los paseos espaciales y **dos esclusas científicas** | | Experimentos que asomaban al vacío. La que miraba al Sol quedó tapada por la sombrilla | [Skylab](https://en.wikipedia.org/wiki/Skylab) |
| **Haven-2** (Vast, en desarrollo) | Brazo, atraque de naves, **esclusas de EVA y de cargas** y alojamiento de cargas fuera | | Lo mismo que la ISS, en comercial | [Vast](https://www.vastspace.com/updates/vast-announces-haven-2-its-proposed-space-station-designed-to-succeed-the-international-space-station-iss) |
| **Axiom Station** (en desarrollo) | Módulo esclusa a finales de los años 2020 y brazo de tipo Canadarm3 en Hab-2 | PPTM en 2028, Hab-1 en 2029 | Paseos espaciales y cargas | [Axiom](https://en.wikipedia.org/wiki/Axiom_Station) |
| **Starlab** (Voyager y Airbus, en desarrollo) | Brazo grande para la carga y las cargas de fuera | 8 m de diámetro, ~450 m³, en Starship no antes de 2029 | Cargas externas | [Starlab](https://en.wikipedia.org/wiki/Starlab_Space_Station) |
| **Orbital Reef** (Blue Origin y Sierra Space) | Puertos para Dragon, Soyuz, Dream Chaser y Starliner. La fuente no describe ningún hangar | 830 m³ | | [Orbital Reef](https://en.wikipedia.org/wiki/Orbital_Reef) |
| **Gateway** (en pausa) | Puertos de atraque | | | [NSF](https://www.nasaspaceflight.com/2026/03/nasa-moon-base-pivots-gateway/) |
| **Voyager Station** (Gateway Foundation / Above) | Rueda giratoria de gravedad lunar para 280 huéspedes y 112 tripulantes. **No tiene financiación anunciada** y la fuente no menciona hangares | | Concepto | [Voyager Station](https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/Voyager_Station) |

**Para el juego.** El hangar puede convertirse en lo que existe: una **esclusa de carga tipo Bishop** para las sondas, que caben (Juventas mide 37 × 23 × 10 cm), una **plataforma expuesta tipo JEM-EF** para los estantes de piezas, y el **atraque con brazo en un CBM** para el módulo de aterrizaje, como un Cygnus. Si se quiere conservar un hangar, hay que marcarlo como licencia. dique-seco.md ya calculó cuánto costaría presurizar uno grande.

## 3. Sustitutos reales, papel por papel

Todos están en el catálogo (`vehicle-catalogue.ts`) con su receta de piezas.

### 3.1 La nodriza: nave de viaje largo con gravedad

**Ningún vehículo real ni en desarrollo tiene gravedad artificial** (el test EST-30 lo comprueba en los datos).

| Candidata | Clase | Masa | Tamaño | Propulsión | Tripulación | Gravedad | Estado y fecha | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Starship** (y su HLS) | (b) | 85 t en vacío (bloque 2), 1500 t de propelente | 52,1 × 9 m, 614 m³ | 3 Raptor + 3 RVac, metano y oxígeno (380 s en vacío) | Hasta 100 (objetivo); HLS 2–4 | Ninguna | 14 vuelos de prueba hasta octubre de 2026. El alunizaje tripulado pasa a Artemis IV (2028). Sin vuelo tripulado | [Starship](https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)), [HLS](https://en.wikipedia.org/wiki/Starship_HLS) |
| **Gateway PPE + HALO** | (b′) | PPE 5 t al lanzar (la mitad propelente); HALO 8–9 t | | Eléctrica solar: 3 AEPS de 12 kW + 4 BHT-6000 | 4 con Orion | Ninguna | La NASA lo **pausó el 24 de marzo de 2026**. HALO está construido. El PPE pasa a SR-1 | [Gateway](https://en.wikipedia.org/wiki/Lunar_Gateway), [NSF](https://www.nasaspaceflight.com/2026/03/nasa-moon-base-pivots-gateway/) |
| **SR-1 Freedom** | (b) | ~12 t | | Reactor de **20 kWe** con Brayton (HALEU) + 48 kW del PPE; AEPS | Sin tripulación | Ninguna | **Finales de 2028**, ventana de Marte. Lleva 3 helicópteros (SkyFall) | [NASA](https://www.nasa.gov/?p=1006637), [WNN](https://world-nuclear-news.org/articles/nasa-aims-for-nuclear-powered-mars-mission-in-2028) |
| **Deep Space Transport** | (c) | ~100 t con Orion: hábitat 21,9 t, eléctrica con xenón 24 t, química 16 t, carga 26,5 t | Hábitat de 8,4 × 11,7 m | Eléctrica solar + química | 4, hasta 1000 días | Ninguna | Estudio de 2017–2019, nunca presupuestado. El hábitat de tránsito sigue en estudio (41–43 t, NASA 2023) | [DST](https://en.wikipedia.org/wiki/Deep_Space_Transport), [NTRS](https://ntrs.nasa.gov/citations/20230002033) |
| **Nautilus-X** | (c) | — | — | — | 6, de 1 a 24 meses | **Centrífuga** de gravedad parcial | Cancelado en los dibujos (2011). Coste previsto: 3700 M$. Demostrador en la ISS: 83–143 M$ | [Nautilus-X](https://en.wikipedia.org/wiki/Nautilus-X) |
| **Estación de gravedad de Vast** | (c) | — | Haven-2 en línea | — | 40; 2160 m³ presurizados | **Giro de punta a punta a 3,5 rpm** | Hoja de ruta para 2035. Vast tiene 500 M$ privados (marzo de 2026), pero ningún programa para esta estación | [Vast](https://vastspace.com/roadmap) |
| **Orbital Reef** | (b) | — | 830 m³ | — | 6–10 | Ninguna | Estación en órbita baja, no una nave de viaje | [Orbital Reef](https://en.wikipedia.org/wiki/Orbital_Reef) |

**Cuánto da 3,5 rpm** (cuenta nuestra): ω = 3,5 × 2π/60 = 0,367 rad/s. Para tener 1 g haría falta un radio de 9,81/ω² ≈ **73 m**. Si los ~110 m que cita un resumen de la enciclopedia son la eslora completa (radio ~55 m), los extremos tendrían unos **0,75 g**. Vast no publica la cifra.

**Δv de Starship** (cuenta nuestra, con 100 t de carga): 380 s × 9,81 × ln((85 + 100 + 1500)/(85 + 100)) ≈ **8,2 km/s**. Es el doble que la nodriza (4,1 km/s) y con un empuje enorme, pero para llenar 1500 t de metano y oxígeno hace falta repostar en órbita. La planta de propelente de la estación ya hace oxígeno, y metano por Sabatier ([estacion.md](../design/estacion.md)).

### 3.2 El módulo de aterrizaje

| Candidato | Clase | Masa | Tamaño | Tripulación | Estado | Fuente |
| --- | --- | --- | --- | --- | --- | --- |
| **Módulo lunar Apolo** | (a) | 4280 kg en seco (15 200 kg al lanzar); etapa de ascenso de 2150 kg en seco | 7,04 m de alto, 9,4 m con patas; cabina de 6,7 m³ | 2 | Seis alunizajes (1969–1972) | [LM](https://en.wikipedia.org/wiki/Apollo_Lunar_Module) |
| **Starship HLS** | (b) | (ver arriba) | 52,3 × 9 m | 2–4 | Artemis IV, 2028 | [HLS](https://en.wikipedia.org/wiki/Starship_HLS) |
| **Blue Moon MK1** | (b) | 21,35 t con propelente; 3 t de carga | 8,05 × 3,08 m | Sin tripulación | No antes de finales de 2026. New Glenn tiene que volver a volar tras la avería del 28 de mayo de 2026 | [Blue Moon](https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft)) |
| **Blue Moon MK2** | (b) | >45 t al lanzar, ~16 t en seco | 16 m | 4 (2 en Artemis V) | Demostración en 2027 y Artemis V en 2030 (posiblemente años 2030) | [Blue Moon](https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft)) |
| **MMSEV / SEV** | (c) | — | — | 2 (4 en emergencia), 14 días | Concepto de la NASA para asteroides cercanos: suitports y brazos. **Es el papel exacto de la Explorer** | [NASA](https://www.nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf) |
| **Philae** | (a) | ~100 kg | 1 × 1 × 0,8 m | — | Cometa 67P, 2014. Los arpones no dispararon | [Philae](https://en.wikipedia.org/wiki/Philae_(spacecraft)) |

Ningún módulo tripulado para cuerpos pequeños está en desarrollo. La Explorer seguirá siendo (d) a menos que se cambie por el módulo lunar (a), que pesa 3,7 veces más, o por el SEV (c).

### 3.3 La sonda

| Candidata | Clase | Masa | Propulsión | Estado | Fuente |
| --- | --- | --- | --- | --- | --- |
| **Juventas** | (a) en vuelo | ~12 kg | Gas frío | Viaja en Hera, que llegó a Didymos en octubre y noviembre de 2026. Soltará sus cubesats en noviembre e intentará posarse en Dimorfo al final | [Hera](https://en.wikipedia.org/wiki/Hera_(space_mission)) |
| **LICIACube** | (a) | 14 kg | | Acompañó a DART (2022) | [DART](https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test) |
| **DART** | (a) | 610 kg al lanzar (60 kg de xenón y 50 de hidracina) | NEXT-C, dos ROSA (6,6 kW) | Chocó contra Dimorfo el 26-9-2022 | [DART](https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test) |
| **OSIRIS-REx / APEX** | (a) | 880 kg en seco | Hidracina; TAGSAM de 3,35 m | 121,6 g de Bennu (2023). Llega a Apophis en abril de 2029 | [OSIRIS-REx](https://en.wikipedia.org/wiki/OSIRIS-REx) |
| **Hayabusa2** | (a) | 490 kg en seco | 4 μ10 (28 mN, 3000 s) | 5,4 g de Ryugu (2020). Llega a 1998 KY26 en 2031 | [Hayabusa2](https://en.wikipedia.org/wiki/Hayabusa2) |
| **Psyche** | (a) | 1648 kg en seco | 4 SPT-140 (Hall) | Pasó por Marte el 15-5-2026. Llega en agosto de 2029 | [Psyche](https://en.wikipedia.org/wiki/Psyche_(spacecraft)) |

**Recomendación:** la sonda del juego ya es casi una Juventas. Cambiarla por una Juventas real no pierde nada de juego, y la deja en (a).

### 3.4 Módulos de estación

| Base | Clase | Datos | Fuente |
| --- | --- | --- | --- |
| **ISS** (USOS y segmento ruso) | (a) | 419 725 kg; 109 m de punta a punta; 1005 m³ presurizados y 388 m³ habitables; 7 tripulantes; 75–90 kW | [NASA](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/) |
| **Tiangong** | (a) | ~100 t, tres módulos de ~23 t; 3 tripulantes (6 en los relevos) | [Tiangong](https://en.wikipedia.org/wiki/Tiangong_space_station) |
| **Haven-1** | (b) | 14 t; 10,1 × 4,4 m; 45 m³ habitables y 80 presurizados; 4 tripulantes; **primer trimestre de 2027** en Falcon 9 | [Haven-1](https://en.wikipedia.org/wiki/Haven-1), [Payload](https://payloadspace.com/vast-delays-haven-1-launch-to-2027/) |
| **Haven-2** | (b), dinero privado | Primer módulo en 2028; 4 módulos en 2030 (500 m³ y 8 tripulantes); 9 en 2032 (1160 m³ y 12) | [Vast](https://vastspace.com/roadmap) |
| **Axiom** | (b) | PPTM en 2028 y Hab-1 en 2029 (11 × 4,2 m) | [Axiom](https://en.wikipedia.org/wiki/Axiom_Station) |
| **Starlab** | (b) | Un solo lanzamiento en Starship, no antes de 2029; 8 m de diámetro, ~450 m³, 4 tripulantes; revisión crítica de diseño en febrero de 2026 | [Starlab](https://en.wikipedia.org/wiki/Starlab_Space_Station) |
| **Fase 2 de las estaciones comerciales (NASA)** | — | Sin adjudicar. La NASA sigue con su plan de apoyar al menos una estación libre (junio de 2026) | [SpacePolicyOnline](https://spacepolicyonline.com/news/nasa-agrees-with-industry-keep-cld-program-as-is/) |

## 4. Cómo son por dentro y por fuera, y su soporte vital

Las descripciones están en `VehicleEntry.look` (exterior, interior, soporte vital e imágenes) para las opciones de nodriza y para todas las estaciones. Aquí va lo que hace falta para reconstruir.

### 4.1 ISS: la base mejor documentada

- **Exterior.** Celosía de 94 m (109 m de punta a punta) y 8 alas de 73 m de envergadura que dan 75–90 kW. Radiadores. Módulos presurizados que ocupan 67 m. Canadarm2 de 17 m. Hasta 8 naves atracadas a la vez ([NASA](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/)).
- **Interior.** 1005 m³ presurizados y 388 m³ habitables. **Seis camarotes** (cuatro en [Harmony](https://en.wikipedia.org/wiki/Harmony_(ISS_module)) y dos en Zvezda). **Dos baños** ([Tranquility](https://en.wikipedia.org/wiki/Tranquility_(ISS_module)) y Zvezda). **Un gimnasio**: cinta T2, ARED de pesas y bicicleta CEVIS. Cocina en Unity y Zvezda. Cupola. Laboratorios con bastidores ISPR (Destiny, Columbus y Kibo). Entre los módulos estadounidenses hay escotillas CBM cuadradas, y las naves atracan en los IDA. Vista general del hábitat: [NTRS 20100042177](https://ntrs.nasa.gov/api/citations/20100042177/downloads/20100042177.pdf).
- **Soporte vital (ECLSS)** ([ISS ECLSS](https://en.wikipedia.org/wiki/ISS_ECLSS), [NASA 2025](https://www.nasa.gov/wp-content/uploads/2025/08/g-657270-59-hp-environmental-control-and-life-support-system-eclss.pdf), [Marshall](https://www.nasa.gov/centers/marshall/pdf/174687main_eclss_facts.pdf)):
  - **O₂**: el **OGA** hace oxígeno por electrólisis del agua, **2,3–9 kg/día** en continuo y **5,4 kg/día** en ciclo. El Elektron ruso hace lo mismo. Hay velas de oxígeno (SFOG) de reserva: una por persona y día.
  - **CO₂**: el **CDRA** (en Destiny y Tranquility) y el **Vozdukh** ruso. El **Sabatier** (desde 2010) convierte cerca del **50 %** del CO₂ en agua y metano. El **ACLS** de la ESA regenera oxígeno para 3 personas y ahorra 400 L de agua al año.
  - **Agua**: el **UPA** destila la orina (pensado para 9 kg/día, seis personas; recupera el 85 % de diseño, el 70 % en uso). El **WPA** trata el resto. Con el **procesador de salmuera (BPA)**, la recuperación total llegó al **98 %** en junio de 2023; antes era del 93–94 % ([phys.org](https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf)). El sistema ahorra **2760 kg al año** para seis personas.
  - Filtro de **trazas** (TCCS), detección y extinción de incendios. Cabina a **101,3 kPa**.
  - **Calor**: lazos de amoníaco hacia radiadores de hasta 70 kW.
  - **Basura**: se va en las naves de carga o por la Bishop.
  - **Radiación**: no hay refugio dedicado.

### 4.2 Lo que gasta una persona al día

`CREW_DAILY` en `vehicle-catalogue.ts`; cada valor lleva su fuente.

| Concepto | Por persona y día | Fuente |
| --- | --- | --- |
| O₂ metabólico | **0,89 kg** | Modelo MetMan de la NASA, en [NTRS 20190027563](https://ntrs.nasa.gov/api/citations/20190027563/downloads/20190027563.pdf) |
| CO₂ | **1,08 kg** | Ídem |
| Comida envasada | **2,39 kg** (0,43 kg de envase) | BVAD, tabla 4-53 (valor de la ISS), citado en ídem |
| Agua (bebida, comida, higiene) | **~3,8 L** (1 galón); se beben ~1,9 L | [NASA 2025](https://www.nasa.gov/wp-content/uploads/2025/08/g-657270-59-hp-environmental-control-and-life-support-system-eclss.pdf) |
| Agua de orina | 1,4–2 kg | BVAD, tabla 4-38, citado en NTRS 20190027563 |

**Reabastecimiento** (cuentas nuestras con esos números):

- **Agua**: con el 98 % de recuperación, una persona pierde unos 3,8 × 0,02 ≈ **0,08 L al día**, unos 28 L al año. Sin recuperar, serían 1,4 t al año.
- **Oxígeno**: con el OGA, no hay que llevar O₂. Basta con el agua que se electroliza (0,89 kg de O₂ salen de ~1 kg de agua), y gran parte de esa agua vuelve por el Sabatier.
- **Comida**: no se recicla. Cuatro personas durante un año necesitan **2,39 × 4 × 365 ≈ 3,5 t**. Es lo que el huerto (fase 3 del plan) podría reducir.

### 4.3 Las otras bases

- **Starship.** Por fuera: cilindro de acero de 9 m con aletas y escudo de losetas. El HLS va sin aletas, con motores de aterrizaje en el costado. Por dentro: 614 m³, sin distribución tripulada publicada; el HLS tiene ascensor. Soporte vital: **sin publicar**. Habría que instalar uno como el de la ISS.
- **HALO + PPE.** Dos cilindros. El PPE tiene alas ROSA de 60 kW. HALO tiene literas para 4 en visitas de hasta 30 días con Orion. La fuente no detalla su soporte vital.
- **Haven-1.** Por fuera: un cilindro de 10,1 × 4,4 m con alas solares y ventana grande. Por dentro: 45 m³ para 4. Visitas de dos semanas, hasta 30 días con el Dragon: no es un sistema regenerativo completo.
- **Haven-2.** Módulos de 16 m alrededor de un núcleo de 7 m, cúpula de 3,8 m, dos ventanas de 1,1 m por módulo, brazo y esclusas.
- **Módulo lunar.** Por fuera: descenso dorado octogonal y ascenso anguloso. Por dentro: cabina de 6,7 m³ para dos de pie. Soporte vital **abierto**: O₂ en tanques, CO₂ con hidróxido de litio y calor por sublimador de agua.

## Fuentes

Las de cada vehículo y componente están en `VEHICLE_SRC` (`src/modules/station/data/catalogue-components.ts`). Las principales:

- Starship: https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft) · HLS: https://en.wikipedia.org/wiki/Starship_HLS · Raptor: https://en.wikipedia.org/wiki/SpaceX_Raptor
- Pausa del Gateway: https://www.nasaspaceflight.com/2026/03/nasa-moon-base-pivots-gateway/ · Gateway: https://en.wikipedia.org/wiki/Lunar_Gateway
- SR-1 Freedom: https://www.nasa.gov/?p=1006637 · https://world-nuclear-news.org/articles/nasa-aims-for-nuclear-powered-mars-mission-in-2028
- Deep Space Transport: https://en.wikipedia.org/wiki/Deep_Space_Transport · Hábitat de tránsito: https://ntrs.nasa.gov/citations/20230002033
- Nautilus-X: https://en.wikipedia.org/wiki/Nautilus-X
- Vast: https://vastspace.com/roadmap · https://www.vastspace.com/updates/vast-announces-haven-2-its-proposed-space-station-designed-to-succeed-the-international-space-station-iss · Haven-1: https://en.wikipedia.org/wiki/Haven-1 · retraso: https://payloadspace.com/vast-delays-haven-1-launch-to-2027/
- Axiom: https://en.wikipedia.org/wiki/Axiom_Station · Starlab: https://en.wikipedia.org/wiki/Starlab_Space_Station · Orbital Reef: https://en.wikipedia.org/wiki/Orbital_Reef · Estaciones comerciales de la NASA: https://spacepolicyonline.com/news/nasa-agrees-with-industry-keep-cld-program-as-is/
- Bishop: https://en.wikipedia.org/wiki/Nanoracks_Bishop_Airlock · Kibo: https://en.wikipedia.org/wiki/Kibo_(ISS_module) · Tiangong: https://en.wikipedia.org/wiki/Tiangong_space_station · Mir: https://en.wikipedia.org/wiki/Mir · Skylab: https://en.wikipedia.org/wiki/Skylab · Transbordador: https://en.wikipedia.org/wiki/Space_Shuttle_orbiter
- Módulo lunar: https://en.wikipedia.org/wiki/Apollo_Lunar_Module · Blue Moon: https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft) · estado de Blue Moon: https://newspaceeconomy.ca/2026/10/11/what-is-blue-origins-blue-moon-lunar-lander-and-how-will-it-support-nasas-artemis-program/ · SEV: https://www.nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf · Philae: https://en.wikipedia.org/wiki/Philae_(spacecraft)
- Hera y Juventas: https://en.wikipedia.org/wiki/Hera_(space_mission) · https://www.heramission.space/hera-mission-juventas-cubesat · DART: https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test · OSIRIS-REx: https://en.wikipedia.org/wiki/OSIRIS-REx · Hayabusa2: https://en.wikipedia.org/wiki/Hayabusa2 · Psyche: https://en.wikipedia.org/wiki/Psyche_(spacecraft)
- ISS: https://www.nasa.gov/international-space-station/space-station-facts-and-figures/ · ECLSS: https://en.wikipedia.org/wiki/ISS_ECLSS · https://www.nasa.gov/wp-content/uploads/2025/08/g-657270-59-hp-environmental-control-and-life-support-system-eclss.pdf · https://www.nasa.gov/centers/marshall/pdf/174687main_eclss_facts.pdf · 98 %: https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf · balance por persona: https://ntrs.nasa.gov/api/citations/20190027563/downloads/20190027563.pdf
