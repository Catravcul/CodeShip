# Puente real de la nodriza

Berón entró en la sala de control y la vio poco realista. Preguntó si se había investigado cómo son las consolas,
la sala y el mapa, si la sonda se pilota de pie y si los mandos tienen modelo 3D. Este documento recoge la
investigación, la disposición que sale de ella y cómo se dibuja. La escala está en [escala.md](escala.md).

Datos en `src/modules/flight-deck/data/bridge.ts` (`BRIDGE`, `BRIDGE_ERGONOMICS`, `BRIDGE_SOURCES`). Modelo en
`src/adapters/three/interior/bridge-model.ts`, sobre el kit `console-kit.ts` y las pantallas de
`console-screens.ts`. Sala en `src/bridge.ts`, sobre `src/walk-room.ts`.

## Investigación

| Referencia | Qué se toma | Fuente |
| --- | --- | --- |
| ISS, Cupola y la estación de robótica (RWS) | Un puesto aparte para manejar a distancia, junto a una ventana. Lleva un mando de rotación (RHC), uno de traslación (THC), un panel de mando y un portátil, con el vídeo de las cámaras. La Cupola tiene 7 ventanas y la de arriba mide 80 cm. | [Cupola](https://en.wikipedia.org/wiki/Cupola_(ISS_module)), [Canadarm2 y RWS](https://rdataspace.github.io/station_iss/tech/canadarm2-dextre.html) |
| ISS, Destiny | Bastidores ISPR de 1,9 × 1,1 m, seis por pared. Los portátiles son estaciones de trabajo HP (más de 100 a bordo). | [Destiny](https://en.wikipedia.org/wiki/Destiny_(ISS_module)), [HP en la ISS](https://www.digitaltrends.com/computing/astronauts-on-the-iss-are-getting-a-laptop-upgrade-from-hp/) |
| Segmento ruso, TORU y Sokol | Acoplar una Progress a mano desde la estación, con dos mandos (traslación y rotación) y el vídeo de la cámara delantera. Sokol es el traje de lanzamiento, que se ajusta sentado en el asiento. | [TORU](https://en.wikipedia.org/wiki/TORU), [Sokol](https://en.wikipedia.org/wiki/Sokol_space_suit) |
| Crew Dragon | Tres pantallas, la del centro táctil. Debajo hay grupos de botones físicos, casi todos tapados (Commands, Pyros, Displays, Power). | [Engadget](https://www.engadget.com/2018-08-14-spacex-dragon-spacecraft-astronauts.html), [Space.com](https://www.space.com/spacex-crew-dragon-touchscreen-astronaut-thoughts.html) |
| Orion | Cabina de cristal con tres pantallas y un dispositivo de cursor. Tiene un panel de interruptores al lado, un RHC por asiento en la mano derecha y el THC junto a las pantallas. De los ~2 000 interruptores del transbordador quedan 56. | [NASA](https://www.nasa.gov/missions/artemis/orion/how-to-fly-nasas-orion-spacecraft/), [Design News](https://www.designnews.com/aerospace/exclusive-closer-look-nasas-orion-glass-cockpit) |
| Starship HLS | Solo se ha publicado el exterior, las ventanas, una cubierta amplia y el ascensor. No hay planos públicos del puesto de mando, así que no se usa para la disposición. | [Space.com](https://www.space.com/space-exploration/artemis/spacex-and-nasa-show-off-how-starship-will-help-astronauts-land-on-the-moon-images) |
| Control de Houston (MOCR, FCR) | Filas de consolas, cada una de un sistema, frente a una pantalla grande con el mapa y la traza en seno de la órbita. Desde 2006 la FCR 1 tiene las filas al mismo nivel. El FDO lleva la trayectoria. | [MCC](https://en.wikipedia.org/wiki/Christopher_C._Kraft_Jr._Mission_Control_Center), [Flight controller](https://en.wikipedia.org/wiki/Flight_controller), [FDO](https://balettie.com/?p=1457) |
| Sala de control de un submarino | En el centro están los periscopios y las mesas de trazado. Delante, el puesto de gobierno: timonel y planista sentados con mandos de avión. Las consolas de sistemas van a un lado. | [NOVA](https://www.pbs.org/wgbh/nova/subsecrets/spriconhiright.html) |
| Puente integrado (barcos) | Radar, carta electrónica (ECDIS) y piloto automático en un solo entorno. El navegante pasa a supervisar. | [IBS](https://en.wikipedia.org/wiki/Integrated_bridge_system) |
| Estación de tierra de un dron (Predator) | Piloto y operador de sensores sentados ante varias pantallas (cámara, mapa e instrumentos), con palanca y acelerador. | [GCS](https://www.wikiwand.com/en/articles/Ground_control_station) |
| ROV (Nautilus) | Los pilotos se sientan uno junto al otro ante pantallas táctiles, palancas y teclados. El brazo se maneja con una réplica en miniatura. | [Nautilus Live](https://nautiluslive.org/career/rov-pilot) |
| NASA-STD-3000 (MSIS) §9.2.3–9.2.4 | Los puestos se diseñan para la postura neutra en microgravedad. Hacen falta sujeciones de pies o de cintura para vigilar mucho rato o trabajar con las dos manos. La pantalla va a 330–710 mm del ojo (mejor ≥ 510 mm), con menos de 30° entre la mirada y su normal. | [MSIS §9](https://msis.jsc.nasa.gov/sections/section09.htm) |
| Postura neutra (Skylab, STS-57) | Flexión de cuello 24°, cadera 50° y rodilla 50°: el ojo baja y la pantalla va algo por debajo. Cambia mucho entre tripulantes. | [NASA TM-2003-104805](https://ntrs.nasa.gov/api/citations/20040200967/downloads/20040200967.pdf) |
| Altura de trabajo de pie | Para tareas ligeras, 5–10 cm por debajo del codo. | [MSD Prevention](https://www.msdprevention.com/resource-library/standing-workstation-height-manual-tasks) |

### ¿La sonda se pilota de pie?

**No.** Sentada y sujeta, con un mando en cada mano:

- En la ISS, la estación de robótica se usa con los pies en sujeciones.
- Los drones se pilotan sentados con palanca y acelerador, y los ROV, sentados con palancas.
- El MSIS pide sujeción de pies o cintura para vigilar mucho rato y para usar las dos manos. Pilotar la sonda pide las dos cosas.

En ingravidez, «sentada» quiere decir un asiento de sujeción: cinturón y arnés, la barra de pies delante y el
cuerpo en postura neutra. El RHC va en el reposabrazos derecho y el THC en el izquierdo, como en Orion. La
cámara de primera persona baja a 1,2 m.

### ¿Hay modelos 3D de los mandos?

Sí, procedurales:

- RHC: empuñadura de pistola con botón rojo.
- THC: mango en T.
- Fila de interruptores de palanca con su LED.
- Interruptores con tapa roja, como los botones tapados de Dragon.
- Teclado de 3 × 4 con una tecla iluminada.
- Pantallas en marco inclinado con visera.
- Asideros, barras de pies, bandejas de cables con tres mazos y paneles de luz.

## Disposición

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

## Rendimiento

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

## Preguntas abiertas

- La ventana de proa sigue mostrando un cielo genérico.
- La mesa se ve a unos 45° de su normal desde donde ella está, más que los 30° del MSIS para pantallas. Así se
  ve una mesa de trazado en un barco. ¿Se inclina más (hasta parecer una consola) o se queda así?
- ¿Los mandos (RHC, THC, interruptores) deberían poder tocarse uno a uno, o basta con la consola entera?
