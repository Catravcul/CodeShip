# Cabina del LM: el puesto real del comandante como vista de pilotaje

Encargo de Berón (2026-11-17): «ahora mismo estamos trabajando en una base realista para las naves, así que
si la cabina realista es con ventanas triangulares y tal se debe hacer así». Y la regla de siempre: **reglas
generales sin excepciones**.

Antes, al pilotar se veía una cápsula genérica con una ventana grande (`cockpit.ts`, licencia para aterrizar
a ojo). Ya no existe. La vista de pilotaje es la cabina del LM que se recorre a pie
([modulo-lunar-juventas.md](modulo-lunar-juventas.md), «Cabina»), vista desde el puesto del comandante, de pie.
Es el mismo modelo (`buildLmCabin`, `src/adapters/three/lm-cabin.ts`) y pasa por la misma capa de presentación.

Código:
- datos con fuente: `src/modules/lander-cabin/data/crew-station.ts` (puesto, ventanas, paneles, mandos);
- modelo: `src/adapters/three/lm-cabin.ts`;
- instrumentos vivos: `src/adapters/three/lm-instruments.ts`;
- vista de vuelo: `src/adapters/three/flight-view.ts`.

## Fuentes

- Grumman, [LM News Reference](https://www.nasa.gov/wp-content/uploads/static/history/alsj//LM04_Lunar_Module_ppLV1-17.pdf),
  «Crew compartment». Da el tamaño de la cabina, la distancia entre puestos, las ventanas, dónde va cada panel,
  los mandos, los reposabrazos y las sujeciones.
- [Paneles del LM](https://apollo11guide.com/Apollo11ManualFree/LunarLander/Lunar_Module_Control_Panel_1.htm)
  (manual del Apolo 11). Da qué lleva cada panel.
- NASA [TN D-6722](https://www.nasa.gov/wp-content/uploads/static/history/alsj/tnD6722LMDisplayControl.pdf),
  LM displays and controls. Dice que las matrices de avisos son rojas en el panel 1 y ámbar en el 2.

## El puesto

| Dato | Valor | Etiqueta |
|---|---|---|
| Cabina | cilindro de 92 in (2,34 m) de diámetro y 42 in (1,07 m) de fondo | real |
| Puestos | comandante a la izquierda, piloto a la derecha, 44 in (1,12 m) entre ejes | real |
| Suelo de los puestos | 36 × 55 in | real |
| Ventanas delanteras | dos triángulos de ~2 ft² (0,186 m²), inclinados hacia abajo y a los lados | real |
| Forma de la ventana | triángulo rectángulo de 0,66 × 0,56 m, ancho arriba, con la punta abajo y por fuera | estimación (fotos) |
| Ventana de acople | ~80 in² (0,052 m²) sobre el comandante, algo por delante de su cabeza | real; forma 0,32 × 0,16 m estimada |
| De pie | sin asientos: cables de sujeción a la cadera, reposabrazos, velcro en las botas | real |
| Mandos | en cada puesto, el controlador de actitud (ACA, mano derecha) y el de empuje y traslación (TTCA, mano izquierda) | real |
| Ojo | 1,45 m, Doménica de pie (`walk-room.ts`) | del juego |

La ventana es un **hueco de verdad** en la pared delantera: el comandante ve el espacio, el asteroide y la
nodriza a través de ella. Lleva grabada la escala del **LPD** (designador del punto de aterrizaje). El
comandante alineaba esa escala, marcada en los dos cristales, con el ángulo que daba el DSKY.

## Los paneles

| Panel | Dónde | Qué lleva |
|---|---|---|
| 1 | a la altura de los ojos, por dentro del comandante | FDAI, X-pointer, cintas ALT/ALT RATE, temporizadores, empuje, T/W, propelente y avisos rojos |
| 2 | igual, por dentro del piloto | FDAI, X-pointer, RCS, ECS y avisos ámbar |
| 3 | en medio, abajo | radar de encuentro, estabilización y control, temporizador de eventos |
| 4 | en medio, más abajo, sobre la escotilla | DSKY |
| 5 | a la cintura, delante del comandante | temporizador de misión, arranque y parada del motor |
| 6 | a la cintura, delante del piloto | AGS (DEDA) |
| 8 | a la izquierda del comandante | pirotecnia, tren, audio, interruptor del COAS |
| 11 | a la izquierda, arriba | disyuntores (cinco filas) |
| 12, 14 | a la derecha del piloto | comunicaciones, potencia eléctrica |
| 16 | a la derecha, arriba | disyuntores (cuatro filas) |

Las fuentes dicen qué lleva cada panel y dónde está, pero no su tamaño. Las medidas son estimaciones sacadas
de las fotos y están en `LM_PANELS`.

Encima de la ventana de acople va el **COAS** (crewman optical alignment sight): una retícula que el
comandante alineaba con la diana del otro vehículo para acoplar.

## Instrumentos: el HUD en los instrumentos reales

Los números del HUD de vuelo siguen ahí (en un móvil hacen falta), y ahora cada línea lleva el nombre del
instrumento que da ese número en la cabina. Los instrumentos se dibujan con los mismos números
(`lmReading`, cinco veces por segundo; las bolas, en cada fotograma):

| HUD | Instrumento real | En la cabina |
|---|---|---|
| m a la superficie | cinta ALT (panel 1) | cinta ALT |
| m/s acercándose o alejándose | cinta ALT RATE | cinta ALT RT; registro 2 del DSKY |
| Panza x° del suelo | FDAI (bola, «8-ball») | las dos bolas giran con la actitud respecto a la vertical local |
| vel. nave x · z | X-pointer | agujas de velocidad lateral y hacia delante (escala ×1 hasta 2 m/s, ×10 por encima) |
| Δv y masa | indicador T/W | — |
| % de propelente | PRPLNT QTY | barra del panel 1 |
| propulsores | THRUST | barra del panel 1 |
| programa de aterrizaje | DSKY, PROG 64 (fase de aproximación), Verb 16 Noun 60 | registros: velocidad hacia delante, ALT RATE, altura |
| casco, propelente bajo, inclinación al posarse | avisos y MASTER ALARM | matriz roja del panel 1, ámbar del 2 |
| anclada | luz LUNAR CONTACT | se enciende |
| tiempo | MISSION TIMER (panel 5) | horas:minutos:segundos |

## Capa de presentación, sin casos especiales

- La cabina se guarda a tamaño real y la dibuja la capa general de [nodriza-starship.md](nodriza-starship.md),
  «Capa de presentación»:
  - con «Escala de interiores», todo el plano y las máquinas se dibujan k veces más grandes;
  - con «Separación», `spreadLayout` abre el plano por un solo factor (`CABIN_SPREAD`).
- Los paneles y las ventanas se colocan con ese mismo factor, como los puestos.
- Lo que toca el cuerpo se queda a tamaño real alrededor de donde ella está: reposabrazos, cables, ACA y TTCA.
- Las alturas son reales.
- La vista de pilotaje pone la cámara en el ojo del comandante dentro de ese mismo modelo: no hay otra cabina.

Consecuencia que conviene que vea Berón: la distancia del ojo a la ventana también se abre. Con «Real» y «Real»,
la ventana queda a 0,55 m y llena ~60° de la vista. Con «Cómoda» y «Amplia» (lo de por defecto), queda a ~1,9 m
y llena ~30°: la vista es más pequeña, como cualquier otra máquina con la separación amplia.

## Cámaras

- **Cabina**: el ojo del comandante, mirando por su ventana. Se gira la cabeza para ver los paneles.
- **Acople**: la misma cabeza, echada hacia atrás para mirar por la ventana del techo con el COAS delante. Arriba
  de la pantalla queda la parte de atrás de la cabina, como la veía él. Antes era una cámara junto al puerto.
- **Ventana (LPD)** (2026-11-17, Berón: «¿en la vida real se pilota mirando por esas ventanas triangulares? Son tan
  pequeñas que no sé pilotar»). Sí: en el Apollo el comandante hacía la aproximación final de pie, con el ojo pegado
  a su ventana triangular. En P64 el ordenador decía un número y él lo leía en la escala LPD (Landing Point
  Designator) grabada en el cristal: ese era el punto adonde bajaba el programa, y con la palanca lo movía. En P66
  volaba a mano mirando fuera, con el indicador de cruz (velocidad horizontal) y las cintas de altura y velocidad
  de bajada, mientras el LMP le cantaba los números. La cámara pone el ojo en la escala LPD, de modo que la ventana
  llena la pantalla del móvil; los indicadores X/Y/Z, el de cruz y la oferta «Aterrizar con un programa» siguen
  encima. Es la última del ciclo de cámaras, para no cambiar el orden de las demás. Fuentes: [Apollo Lunar
  Surface Journal, aterrizaje del Apollo 11](https://www.hq.nasa.gov/alsj/a11/a11.landing.html) (P64, LPD, P66).
- Ventral, trasera, exterior y nodriza no cambian: son las cámaras exteriores que las ventanas no sustituyen.
- La etiqueta de la cámara va en la columna de contexto. Antes flotaba bajo el centro y tapaba la ficha del viaje,
  la palanca «Mirar» y los avisos (B-03).

## Mandos: el interruptor de acople y Manual / Automático (Berón, 2026-11-17)

Berón: «Veo el mensaje de que está acoplado y no puede volar; está el botón de vista y abajo un botón que no sé
para qué es. Si no sirve, pon un botón de icono de acoplar o desacoplar como interruptor, que se muestre al estar
en la posición y el sitio correctos y que muestre el icono contrario al estado actual».

- El botón que no se entendía era la **raíz** de iconos: acoplado, solo plegaba «Centrar la vista». Se quita ese
  icono (centrar es un doble toque en «Mirar», o V) y la raíz ya no sale cuando no queda nada dentro.
- Bajo el ojo va el **interruptor de acople**, siempre con el icono de lo contrario del estado:
  - acoplado: «Desacoplar», dos anillos separándose; los muelles la separan a 0,08 m/s;
  - libre dentro de la esfera de 200 m de un puerto: «Acoplar», dos anillos juntos. El asistente lo lleva al
    contacto («Acoplando: tocar para parar»). Los 200 m son la esfera de exclusión de la ISS, donde solo entra un
    vehículo en su aproximación final ([NASA, SSC24-P3-06](https://ntrs.nasa.gov/api/citations/20240009200/downloads/SSC24-P3-06.pdf));
  - en otro sitio no sale. K hace lo mismo con teclado.
- El aviso de acoplado dice dónde está el interruptor y que la escotilla está detrás del puesto.
- El **puesto del comandante** ofrece **Manual** (pilotar de pie) y **Automático**. Automático lista los destinos
  cercanos a la nodriza ([modulo-lunar-juventas.md](modulo-lunar-juventas.md), «Destinos cercanos»): la estación,
  si está al lado, y el asteroide junto al que está aparcada. El puerto donde ya está acoplado no sale; uno que
  ahora no se puede sale apagado, con su porqué. Al elegir uno se abre el reto del viaje del propio LM (nunca lo
  lleva la nodriza); resuelto, se desacopla si hace falta y su piloto automático lo lleva. A un puerto acaba con
  el asistente de acople; a un asteroide, a 300 m sobre él, para posarlo a mano o por programa.
- Desacoplar y el asistente ya no están en el puesto: son el interruptor de la vista de vuelo.

## Juventas no tiene cabina

Juventas es un CubeSat de 12 kg y se pilota a distancia desde su consola en el puente de la nave, con su propia
cámara (`probe-mode.ts`). Nunca ha usado la cápsula. Su consola lo dice:
- el título: «… · a distancia · …»;
- la línea de la cámara: «sin cabina: mando a distancia desde la consola de la nodriza».

## Qué queda abierto

- La pared delantera es plana. En el LM las ventanas estaban inclinadas hacia abajo y hacia fuera, y eso daba
  más vista del suelo.
- Los paneles son caras dibujadas, con interruptores en relieve solo en 3, 6, 8, 11, 12, 14 y 16. Los
  interruptores no se pueden tocar (los mandos siguen en los iconos y las cruces).
- El piloto (LMP) no tiene vista propia. Su puesto lleva la consola de la mente, que es ficción.
