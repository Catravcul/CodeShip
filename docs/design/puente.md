# Cubierta de vuelo de la Starship (y el puente de la nave de anillos)

> **2026-11-17 · Berón:** «¿Dónde está el control manual de la nodriza? Solo veo el viaje por reto desde la mesa de
> navegación. La zona de pilotaje y propulsión no ofrece pilotar, parece solo informativa, y lo mismo la de acople.
> ¿La sala de navegación de la nodriza es realista? Pedí recrear la nodriza desde cero y esta sala parece la misma».
>
> Tenía razón: la Starship usaba el puente de consolas de la nave de anillos (abajo, «El puente de la nave de
> anillos»), y sus puestos de pilotaje y acople solo abrían páginas de lectura. Ahora la Starship tiene su propia
> cubierta de vuelo, hecha con lo publicado, y cada puesto hace lo que hace su equivalente real.

## La cubierta de vuelo de la Starship

Datos en `src/modules/flight-deck/data/starship-deck.ts` (`STARSHIP_DECK`, `STARSHIP_DECK_SHAPE`,
`STARSHIP_DECK_SOURCES`, `STARSHIP_DECK_BASIS`). Modelo: `buildBridge(k, "starship")` en
`src/adapters/three/interior/bridge-model.ts`. Sala: `BridgeRoom` en `src/bridge.ts` con forma `"starship"`; los
puestos se cablean en `src/flight-deck-seats.ts`; la cámara de acople es `src/ui/dock-camera.ts`.

### Qué está publicado (y qué no)

| Qué | Lo publicado | Etiqueta | Fuente |
| --- | --- | --- | --- |
| Ventanas | El HLS lleva ventanas en el casco; SpaceX ensaya paneles de ventana contra micrometeoritos; los renders de 2025 enseñan a la tripulación sentada junto a una fila de ventanas. El modelo exterior tiene tres en el morro | real (en desarrollo) | [Futurism, 2025-11](https://futurism.com/space/spacex-renders-inside-lunar-lander-starship), [Teslarati, hitos 2025-10-30](https://www.teslarati.com/spacex-checks-off-49-lunar-lander-milestones-in-push-toward-artemis-iii/) |
| Zona de mando | «Unos 600 m³ con camas, suministros y una zona de mando y control» | en desarrollo | [NASASpaceflight, 2025-11](https://www.nasaspaceflight.com/2025/11/starship-block-3-path-moon/) |
| Pantallas y mandos | La NASA dice que las pantallas de la tripulación se están decidiendo con SpaceX; no hay planos ni fotos del puesto | sin publicar | [AmericaSpace, 2023-12](https://www.americaspace.com/2023/12/01/spacexs-new-design-for-lunar-starship-unveiled/) |
| Cabina 1 | Primeras fotos de la NASA (2026-10): paredes acolchadas blancas, aberturas de ventana en el acero | real (en construcción) | [TeslaNorth, 2026-10-23](https://teslanorth.com/2026/10/23/starship-moon-lander-cabin-nasa/) |
| Base real elegida: Crew Dragon | Tres pantallas táctiles con grupos de botones físicos debajo, casi todos tapados | real | [Engadget](https://www.engadget.com/2018-08-14-spacex-dragon-spacecraft-astronauts.html) |
| Pilotar a mano en Dragon | Modo manual para acoplar, aterrizar o abortar desde la pantalla táctil; en la Demo-2 (2020-05-30/31) Hurley lo voló cerca de la ISS con el vídeo del objetivo de acople en la misma pantalla | real | [Space.com](https://www.space.com/spacex-crew-dragon-touchscreen-astronaut-thoughts.html), [Spaceflight Now](https://spaceflightnow.com/2020/05/30/dragon-astronauts-name-their-spacecraft-endeavour-complete-first-manual-flight-test/) |
| Atraque | Waypoint 1 a 150 m, Waypoint 2 a 20 m con espera, 51 min hasta la captura (Demo-1); ganchos IDSS | real | [berthing.ts](../../src/modules/mothership/application/berthing.ts), [IDSS](https://ntrs.nasa.gov/citations/20220011643) |

Como SpaceX no ha publicado el puesto de mando, la **disposición es nuestra** y la cubierta lo dice en cada ficha
(«En desarrollo: pantallas táctiles y botones como los de la Crew Dragon», «Distribución nuestra: …», «Ficción: …»).

### La sala

Un tronco de cono de 2,5 m de alto en el morro, bajo los depósitos de cabecera: del radio interior del casco
(4,2 m) a 2,5 m arriba (el mismo que cuenta `starshipDeckVolumeM3` entre los 614 m³). El suelo es redondo, la
pared se inclina hacia dentro y arriba hay una tapa blanca acolchada, como la Cabina 1. Los puestos van en
corro junto a la pared, cada 45° (radio 2,7 m donde ella se pone, 3,3 m la máquina): así quedan a más de 2 m
unos de otros a tamaño real, y el centro queda libre para moverse.

**Sin gravedad** (Berón, 2026-11-17: ninguna zona tiene gravedad). En la cubierta no se anda y no hay joystick para
moverse: un toque en un puesto (o «Ir» de una tarea) la manda allí **a saltos de asidero en asidero**
(`room-hops.ts`, `WalkRoom` con `zeroG`): cada tramo se parte en saltos iguales de 2,5 m como mucho, y cada salto
es un impulso, un planeo con el cuerpo tendido y un agarre, a la velocidad de los saltos de la estación
(`hopSpeed`, NASA-STD-3000 §8.9.2). En los puestos se sujeta con los pies (o el cinturón en los asientos). El
tiempo que «Ir» calcula por la cubierta es el de esos saltos (`journey-world.ts`, legs `saltos`). El joystick que
queda es el de la cámara.

| Puesto | Dónde | Qué hace (como su equivalente real) |
| --- | --- | --- |
| **Puesto de pilotaje** | Proa, bajo las tres ventanas, sentada | Tres pantallas táctiles (vuelo, trayectoria, sistemas) con botones físicos debajo, como Dragon. Se elige el **destino** (cualquiera: la estación o un asteroide, con su distancia) y se vuela en **Manual** (los encendidos cortos de ±0,1 m/s, «Parar», lo que falta y el Δv gastado, de trayectos-reales) o en **Automático (retos)** (la cadena de retos del viaje). «Pantallas de sistemas» pasa por propulsión, energía y vida en pestañas, como las páginas de Dragon |
| **Puesto de acople** | Proa, estribor, sentada | La cámara del puerto de proa. Atracada: **Desacoplar** (los ganchos se abren y retrocede por el eje hasta el punto de espera 1). En el punto de espera de una estación: **Acoplar a mano (cámara)** o **Acoplar automático (retos)**. Lejos: dice que primero hay que llegar al punto de espera. Durante una maniobra: pararla |
| Mando de la sonda | Proa, babor, sentada | Como antes (lo lleva la rama de los mandos de la sonda) |
| Mesa de navegación | Popa, estribor | El mapa: planificar (**Programar viaje**) y «Ver trayecto». Ya no vuela a mano: la tarjeta dice que eso es del puesto de pilotaje |
| Radio y misiones | Popa, babor | Cartas, llamadas y el registro de misiones |
| Mente del asteroide · nano_net | Babor y estribor | Ficción (el único comportamiento ficticio): el duelo por la sonda y el estado de la red |
| Escotilla de bajada | Popa, en el suelo | Baja a la cubierta 1 (es la escotilla del techo de la cubierta 1); la hoja se abre hacia arriba |

**Fuera las consolas que solo informan.** «Vida y hábitat» y «Energía y calor» eran consolas de pie que solo
abrían una página de lectura: en la Starship ya no están; sus páginas viven en las pantallas del puesto de
pilotaje (sus avisos se ven en su pantalla de sistemas y en su luz). El «Acople» de antes solo leía el puerto del
módulo: ahora acopla y desacopla la Starship. El módulo lunar se suelta y se acopla desde su propia cabina; el
puesto de acople solo lo menciona en una línea de texto.

### Pilotar

- **Manual**: `Navigator.flyByHand` (sin cambios de física). El panel de mandos sale **solo sentada en el puesto
  de pilotaje** (`navMode.handAt`); mientras vuela a mano la ficha del puesto se aparta para no tapar los mandos.
  Atracada en la estación, «Manual» no se puede: primero se desacopla en el puesto de acople.
- **Automático (retos)**: fija el destino y abre la cadena de retos del viaje (`NavigationMode.program`); por
  programa, si está atracada, desatraca y sale sola como la Crew Dragon.
- A una **estación**, a mano, el ordenador la lleva al punto de espera 1 y **se queda allí** (antes atracaba solo).
- **Vuela, no se arrastra** (`CarrierTrip`, `carrier-trip.ts`): primero gira la proa (cuerpo −z, los Raptor detrás)
  hacia la ruta, enciende, va por inercia, da la vuelta de 180° antes de frenar (frena con los motores por delante)
  y al final gira a la actitud del punto 1, con la proa al puerto. Gira a 1°/s (`CARRIER_SLEW_DEG_S`, valor de
  juego, en desarrollo: no se publican los ritmos de la Starship): la vuelta tarda 3 min de juego, 3 s a ×60. Los
  giros cuentan en el tiempo del viaje (`carrierTurnSeconds`). Lejos de una estación se ven los chorros de los
  Raptor de vacío; en los giros y cerca de una estación, los soplos del RCS (nunca los Raptor junto a la ISS).
  Al salir de un puerto retrocede por el eje sin girar y gira después.
- **El estado del viaje solo en el puesto de pilotaje** (reglas §3.8 y §5.9): el tiempo que falta, «Ver trayecto»,
  «Parar» y «Tomar el mando» salen sentada en el puesto de pilotaje (o en sus pantallas de sistemas). En el resto de
  la cubierta y en el interior la vista queda libre. Para la ventana «Trayecto» del menú del HUD (de solo estado)
  hay un modelo de lectura, `tripStatus()` (`TripStatus` en `trip-chip.ts`: vehículo, destino, distancia, tiempo
  real que falta, fase y fracción), sin botones.
- **Cámara solo con joystick** (reglas §5.7): «Ver trayecto» a pantalla completa gira con su joystick «Cámara» (el
  pellizco y la rueda solo acercan); el mapa de la mesa de navegación gira con su joystick «Girar» y un toque elige
  destino.

### Acople

- **A mano**: `ManualBerthing` (`berthing.ts`). La actitud se mantiene en el eje (Dragon la sostiene en modo de
  traslación); ella manda la velocidad de cierre (pasos de 0,05 m/s, hasta 0,5) y la deriva a los lados (pasos de
  0,01 m/s, hasta 0,1) con ◀ ▲ ▼ ▶, y «Parar» lo anula todo. La cámara (un objetivo estrecho de 30° por el eje)
  enseña el módulo de la estación, el puerto y su cruz, y al lado la distancia, el cierre, el desvío y la deriva,
  cada uno con ✓ o ✗. Al tocar, los límites IDSS lo juzgan (0,05–0,10 m/s, menos de 0,10 m del eje, menos de 0,04
  m/s de deriva): si no cogen, dice por qué y retrocede 5 m. Va a ×10 (a ×60 no se puede alinear a ojo; valor de
  juego).
- **Automático (retos)**: `berthChore` (`berth-chore.ts`): la aproximación de la Demo-1 decisión a decisión desde el
  punto 1, donde ya espera: qué se hace primero (alinear con el eje; el distractor es «ir directa a 1 m/s»), cuánto
  se tarda del punto 1 al 2 a 0,07 m/s, qué se espera en el punto 2 (el «adelante» de la estación) y qué condición
  falta para que cojan los ganchos. Son cuatro elecciones cortas de tres opciones, con una línea de código, y el
  reto se llama «Acople por retos»: así caben bajo la escena de la consola en 390×664 sin desplazar, también con
  el «Correcto: cargado» del paso anterior (una ordenación de seis bloques no cabía, y la «Vista panel» de los
  retos no se cambia). Resuelto, `Navigator.berthAuto`
  vuela la aproximación real (51 min de juego).
  **Cada paso se ve en el puesto de acople** (reglas §4.2, `Bridge.dockStepVisual`): ella flota en los anclajes de
  pie delante de la consola (no atraviesa el asiento), vista por encima del hombro derecho; para cada orden pone
  las manos en la pantalla (`programar`) y para cada comprobación mira la cámara (`revisar`) (`BERTH_STEP_ACTS`).
  La pantalla «Cámara de acople» de la consola enseña lo que hace cada bloque (`berthStage`): en el punto 1,
  alineada, acercándose al punto 2 (el puerto crece de 150 a 20 m), la espera del «adelante», hasta el contacto y
  los ganchos cerrados (en verde); cada paso resuelto enseña las suyas (`BERTH_STEP_STAGES`), 2,2 s cada una.
- **Desacoplar**: `Unberthing`: retrocede por el eje a 0,07 m/s hasta el punto 1 (150 m), a ×60.
- **La cámara se controla** (reglas §5.3 y §5.7): la de la Dragon es fija en el eje; las cámaras de fuera de la
  ISS van en cabezas de giro. La nuestra (`DOCK_CAM_HEAD`, nuestra) gira ±20° a los lados y ±15° arriba y abajo a
  15°/s con su joystick «Cámara», en la esquina del vídeo; la imagen y la retícula se desplazan con ella.
  «Vista: eje ⇄ lado» pasa a una vista de lado, a escala: el módulo y su puerto, el eje y la proa de la Starship
  (9 m) a su distancia; ahí el joystick gira la vista alrededor del eje (el desvío visto desde ese lado) y acerca.
  Mientras se acopla a mano, el chip del viaje se aparta: la página ya da la distancia, el contacto y «Parar».
- La aproximación automática se vuela con el RCS: acelera hasta los 0,07 m/s y frena antes de la espera del punto 2
  a 0,01 m/s² (`BERTH_RCS_MS2`, valor de juego), con la actitud en el eje del puerto, como la Dragon.

Las tres maniobras van por el `Navigator` como los viajes: un solo reloj, el chip del viaje con «Ver trayecto» y
«Mando», y solo se ven sentada en el puesto de pilotaje (y en el de acople mientras atraca o desacopla).

### Preguntas abiertas para Berón

- Resuelto (2026-11-17): sin gravedad, a saltos; ×10 en el acople a mano, 1°/s de giro, el estado en el puesto de
  acople y la consola de la red (ficción) se quedan como están.
- La mesa de navegación es nuestra: en una nave real el mapa es una página de las pantallas. ¿La dejamos como mesa
  o la pasamos a una pantalla del puesto de pilotaje?

## El puente de la nave de anillos (ficción, `?ficcion`)

Lo que sigue es el puente de consolas que se hizo para la nave de anillos y que la Starship usaba hasta ahora. Se
queda tal cual tras el interruptor de ficción.

### Investigación

| Referencia | Qué se toma | Fuente |
| --- | --- | --- |
| ISS, Cupola y la estación de robótica (RWS) | Un puesto aparte para manejar a distancia, junto a una ventana. Lleva un mando de rotación (RHC), uno de traslación (THC), un panel de mando y un portátil, con el vídeo de las cámaras. La Cupola tiene 7 ventanas y la de arriba mide 80 cm. | [Cupola](https://en.wikipedia.org/wiki/Cupola_(ISS_module)), [Canadarm2 y RWS](https://rdataspace.github.io/station_iss/tech/canadarm2-dextre.html) |
| ISS, Destiny | Bastidores ISPR de 1,9 × 1,1 m, seis por pared. Los portátiles son estaciones de trabajo HP (más de 100 a bordo). | [Destiny](https://en.wikipedia.org/wiki/Destiny_(ISS_module)), [HP en la ISS](https://www.digitaltrends.com/computing/astronauts-on-the-iss-are-getting-a-laptop-upgrade-from-hp/) |
| Segmento ruso, TORU y Sokol | Acoplar una Progress a mano desde la estación, con dos mandos (traslación y rotación) y el vídeo de la cámara delantera. Sokol es el traje de lanzamiento, que se ajusta sentado en el asiento. | [TORU](https://en.wikipedia.org/wiki/TORU), [Sokol](https://en.wikipedia.org/wiki/Sokol_space_suit) |
| Crew Dragon | Tres pantallas, la del centro táctil. Debajo hay grupos de botones físicos, casi todos tapados (Commands, Pyros, Displays, Power). | [Engadget](https://www.engadget.com/2018-08-14-spacex-dragon-spacecraft-astronauts.html), [Space.com](https://www.space.com/spacex-crew-dragon-touchscreen-astronaut-thoughts.html) |
| Orion | Cabina de cristal con tres pantallas y un dispositivo de cursor. Tiene un panel de interruptores al lado, un RHC por asiento en la mano derecha y el THC junto a las pantallas. De los ~2 000 interruptores del transbordador quedan 56. | [NASA](https://www.nasa.gov/missions/artemis/orion/how-to-fly-nasas-orion-spacecraft/), [Design News](https://www.designnews.com/aerospace/exclusive-closer-look-nasas-orion-glass-cockpit) |
| Starship HLS | Solo se ha publicado el exterior, las ventanas, una cubierta amplia y el ascensor. No hay planos públicos del puesto de mando, así que no se usa para la disposición (la de la Starship, arriba). | [Space.com](https://www.space.com/space-exploration/artemis/spacex-and-nasa-show-off-how-starship-will-help-astronauts-land-on-the-moon-images) |
| Control de Houston (MOCR, FCR) | Filas de consolas, cada una de un sistema, frente a una pantalla grande con el mapa y la traza en seno de la órbita. Desde 2006 la FCR 1 tiene las filas al mismo nivel. El FDO lleva la trayectoria. | [MCC](https://en.wikipedia.org/wiki/Christopher_C._Kraft_Jr._Mission_Control_Center), [Flight controller](https://en.wikipedia.org/wiki/Flight_controller), [FDO](https://balettie.com/?p=1457) |
| Sala de control de un submarino | En el centro están los periscopios y las mesas de trazado. Delante, el puesto de gobierno: timonel y planista sentados con mandos de avión. Las consolas de sistemas van a un lado. | [NOVA](https://www.pbs.org/wgbh/nova/subsecrets/spriconhiright.html) |
| Puente integrado (barcos) | Radar, carta electrónica (ECDIS) y piloto automático en un solo entorno. El navegante pasa a supervisar. | [IBS](https://en.wikipedia.org/wiki/Integrated_bridge_system) |
| Estación de tierra de un dron (Predator) | Piloto y operador de sensores sentados ante varias pantallas (cámara, mapa e instrumentos), con palanca y acelerador. | [GCS](https://www.wikiwand.com/en/articles/Ground_control_station) |
| ROV (Nautilus) | Los pilotos se sientan uno junto al otro ante pantallas táctiles, palancas y teclados. El brazo se maneja con una réplica en miniatura. | [Nautilus Live](https://nautiluslive.org/career/rov-pilot) |
| NASA-STD-3000 (MSIS) §9.2.3–9.2.4 | Los puestos se diseñan para la postura neutra en microgravedad. Hacen falta sujeciones de pies o de cintura para vigilar mucho rato o trabajar con las dos manos. La pantalla va a 330–710 mm del ojo (mejor ≥ 510 mm), con menos de 30° entre la mirada y su normal. | [MSIS §9](https://msis.jsc.nasa.gov/sections/section09.htm) |
| Postura neutra (Skylab, STS-57) | Flexión de cuello 24°, cadera 50° y rodilla 50°: el ojo baja y la pantalla va algo por debajo. Cambia mucho entre tripulantes. | [NASA TM-2003-104805](https://ntrs.nasa.gov/api/citations/20040200967/downloads/20040200967.pdf) |
| Altura de trabajo de pie | Para tareas ligeras, 5–10 cm por debajo del codo. | [MSD Prevention](https://www.msdprevention.com/resource-library/standing-workstation-height-manual-tasks) |

#### ¿La sonda se pilota de pie?

**No.** Sentada y sujeta, con un mando en cada mano:

- En la ISS, la estación de robótica se usa con los pies en sujeciones.
- Los drones se pilotan sentados con palanca y acelerador, y los ROV, sentados con palancas.
- El MSIS pide sujeción de pies o cintura para vigilar mucho rato y para usar las dos manos. Pilotar la sonda pide las dos cosas.

En ingravidez, «sentada» quiere decir un asiento de sujeción: cinturón y arnés, la barra de pies delante y el
cuerpo en postura neutra. El RHC va en el reposabrazos derecho y el THC en el izquierdo, como en Orion. La
cámara de primera persona baja a 1,2 m.

#### ¿Hay modelos 3D de los mandos?

Sí, procedurales:

- RHC: empuñadura de pistola con botón rojo.
- THC: mango en T.
- Fila de interruptores de palanca con su LED.
- Interruptores con tapa roja, como los botones tapados de Dragon.
- Teclado de 3 × 4 con una tecla iluminada.
- Pantallas en marco inclinado con visera.
- Asideros, barras de pies, bandejas de cables con tres mazos y paneles de luz.

### Disposición

| Puesto | Dónde | Cómo | Abre |
| --- | --- | --- | --- |
| Pilotaje y propulsión | Proa, centro, frente a la ventana | Sentada. Tres pantallas (actitud, propulsión, trayectoria), panel de interruptores debajo, RHC y THC | Página PROP |
| Mando de la sonda | Proa, babor | Sentada. Órbita, cámara y actitud de la sonda; RHC y THC | La vista de la sonda |
| Acople | Proa, estribor | De pie con sujeción de pies. Pantalla de puertos y dos mandos pequeños, como TORU | Página DOCK |
| Mesa de navegación | Centro de la sala | De pie. Cristal inclinado 26°, como un tablero de dibujo, con las órbitas de Mercurio a Marte a su radio real (UA), un arco de transferencia y una traza en seno. Tiene una barandilla alrededor y se camina a su alrededor | Página NAV |
| Vida y hábitat, Mente del asteroide | Pared de babor | De pie, consola de sistemas | Su página o ficha |
| Energía y calor, nano_net | Pared de estribor | De pie, consola de sistemas | Su página o ficha |
| Radio y misiones | Popa, babor | De pie, consola de sistemas | Radio y registro de misiones |
| Escotilla a la espina | Popa, centro | Anillo, puerta, volante y panel de presión | Volver a la espina |

Cada consola de sistemas tiene:

- un cuerpo con zócalo y la superficie a 0,95 m;
- una repisa inclinada con interruptores, teclado e interruptores con tapa;
- una pantalla inclinada hacia su ojo (menos de 30° de su normal);
- asideros a los lados y una barra de pies.

Cada pantalla muestra la forma de su página: la retícula de los 18 propulsores, barras de O₂, CO₂ y agua, los
puertos o la red. En la parte de abajo se ven los avisos de esa página. La de la mente muestra las líneas de
fase. Las cifras de verdad están en la página que abre cada consola.

En primera persona, la cámara mira un poco por debajo de la pantalla, unos 9° (unos 5° sentada). Así la máquina
queda en la mitad de arriba del móvil y la ficha no la tapa. Los carteles crecen hasta 28 px de alto. Si dos se
taparían en pantalla, solo se ve el más cercano.

### Rendimiento

Todo se dibuja así:

- Las piezas de la sala van en dos mallas fusionadas: una con luz y otra que brilla. Llevan el color por
  vértice y comparten material.
- Las pantallas están en un solo atlas de lienzo de 2048 × 2048 y se dibujan en una llamada (más otra para la
  pantalla de la escotilla, que se oculta con su pared).
- Las luces de estado son una malla instanciada.
- Hay las mismas dos luces puntuales y la ambiental de antes, sin sombras.

Medido en el iPhone 13 emulado, a 1,5×:

| | Antes | Después |
| --- | --- | --- |
| Llamadas de dibujo, vista desde la escotilla | 28 | 6–23 (según los carteles y el avatar a la vista) |
| Llamadas de dibujo, en una consola | 8 | 8–17 |
| Triángulos | 0,2–1,0 k | 10,4–10,9 k |

El presupuesto es de 600 llamadas y 2 000 k triángulos.

### Preguntas abiertas

- La ventana de proa sigue mostrando un cielo genérico.
- La mesa se ve a unos 45° de su normal desde donde ella está, más que los 30° del MSIS para pantallas. Así se
  ve una mesa de trazado en un barco. ¿Se inclina más (hasta parecer una consola) o se queda así?
- ¿Los mandos (RHC, THC, interruptores) deberían poder tocarse uno a uno, o basta con la consola entera?
