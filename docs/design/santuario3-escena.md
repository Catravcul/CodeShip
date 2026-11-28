# Santuario 3: la escena (rama `s3-escena`)

> **2026-11-28**: el campus de la montaña es **otra escena** (la nave excavada, con los edificios del santuario 1 tal cual y
> los pisos de entrenamiento), a la que se entra por las compuertas de la cara sur: [montana-hueca.md](montana-hueca.md).

Lo que se juega del santuario aéreo: la decisión de Berón del 2026-11-18 ([santuario3-iniciacion.md](santuario3-iniciacion.md),
arriba del todo) llevada a una escena de Three.js. Casos AER-01 a AER-09 en [casos.md](../qa/casos.md); recorrido PX-45 `s3-recorrido`.

## Qué hay

> **2026-11-25**: la isla de entrenamiento pasó a ser el **Campus de la montaña**, dentro de la montaña hueca de la Isla de las alturas: sus salas están en los pisos de cuatro árboles gigantes. Ver [montana-hueca.md](montana-hueca.md); lo de abajo sobre la isla describe su versión anterior.

- **Inicio.** El 3 se juega desde la pantalla de inicio (`boot.ts` carga `src/aerial-sanctuary.ts`). Su tarjeta dice que los retos de
  los puestos de entrenamiento están «En construcción». Doménica empieza en el helipuerto de la isla de entrenamiento, al empezar la
  iniciación. La partida se guarda sola (ranuras de [partidas.md](partidas.md); `checkAerialState` en `STATE_CHECKS`).
- **Islas.** Cada una con su máquina de navegación:

  | Isla | Qué es | Etiqueta | Fuente |
  | --- | --- | --- | --- |
  | Isla de entrenamiento (x 20…300, z −125…115) | Piscina NBL (62 × 31 × 12 m), centrífuga, nave de maquetas (Destiny y Orion; los simuladores de Dragon y del LM y la robótica, en sus salas), control de misión (12 puestos y pantalla), gimnasio con esterilla, centro médico con cámara hipobárica y helipuerto de 1 D (21 m) | instalaciones **reales**; reunidas en una isla, **licencia** | §1.2 de la iniciación; NASA NBL, SVMF, S-92 |
  | Lanzadera (−560, 0) | El casquete de Cold Sanctuary con su edificio-árbol de agua (Fábrica de cohetes, Control de misión, Garaje, Piso libre, miradores en las puntas) y la corona del Electron a 182 m | **ficción** (con su magia) | Cold Sanctuary `AereoSiteBuilder`, `HelixTower`, `LaunchHeightRule` |
  | Parque energético (−470, 470) | Árbol bajo (Control de energía, Garaje, Taller de paneles), 3 E-33, mareal piloto, 9 mesas solares (7 instaladas por los 50 kW de los pisos), 6 baterías | turbinas, sol y baterías **reales**; el casquete, **ficción** | `EnergyRule`; Ross Island |
  | Muelle aéreo (−230, 210) | El muelle de las alfombras voladoras, apartado por nosotros de (−300, 170) para quedar fuera de los 300 m del Electron (también a escala 1,5) | **ficción** | `AereoLink`, `FlyingCarpet` |
  | Plataforma de tripulación (150, −1300) | Una plataforma como la Odyssey (132,9 × 67 m, cubierta a 22 m) con el Falcon 9 y la Crew Dragon, la torre de acceso y un helipuerto | vehículo **real**; lanzar desde el mar, **licencia** | Sea Launch, SpaceX |
  | Isla de las alturas (1450, 250) | Bioma del aire y las alturas (sustituye a la isla subantártica, Berón 2026-11-20): una montaña de 1600 × 1200 m del Karakórum de Hunza, del río a las nieves (2 400–5 080 m reales, 1 m = 9 m de ladera), con sus 6 cinturones, anillo de cantiles con repisas para trepar, garganta de 160 m y senderos; íbices, markhores, bharales, marmotas, pikas, leopardo, buitres, quebrantahuesos, águila real y más en una cadena alimenticia; la estación de investigación con el censo, la mesa de campo y un helipuerto ([bioma-s3.md](bioma-s3.md)) | especies y cinturones **reales**; la forma de la montaña y cuántos caben, **licencia** | `data/bioma.ts`, `data/bioma-island.ts`, `domain/mountain.ts` |

- **Mandos (2026-11-19, los mismos del santuario 1: `ui/game-pad.ts`).** Los de la Switch: cruceta ↑/↓ zoom, B «Correr» (sprint de
  6,5 m/s; en el agua, crol a 3 m/s), A «Saltar» (50 cm, con su agacharse y amortiguar), X «Trepar» (hasta 2,6 m), «+» Tareas,
  «−» Áreas, captura Vista e inicio los ajustes generales (con «Pantalla de inicio», que guarda antes). Los movimientos son
  `application/free-walk.ts`, compartido con el santuario 1. Del borde de un suelo se cae (como en el santuario 1) si debajo hay
  suelo o agua a 10 m o menos (la plataforma de saltos más alta, World Aquatics); de más alto no se tira (del borde de una isla no
  se salta). Bajo el agua la vista se vuelve verde azulada y nada con su animación. Cada máquina, puesto y simulador tiene el botón
  naranja, el mismo que en el santuario 1 y las naves (2026-11-19): «Reto: …» en los puestos, los simuladores y el lanzamiento,
  que abre el reto (con quien está de turno) o, si hay varios —el simulador de Dragon: su puesto y «Practicar el acople»— o el
  puesto está sin turno, la elección de reto con el motivo; su nombre en la navegación, el ascensor y la esterilla, que
  muestra su tarjeta. El reto se ve con la lente compartida (`reto-focus.ts`: ella y la entrenadora encima de la hoja, sin
  atravesar las paredes de la sala, `framePair`). Las Áreas tienen filtros de categoría (Troncos, Pisos, Instalaciones,
  Exterior: `domain/area-category.ts`) y el alcance compartido: isla → edificio → piso (`domain/area-scope.ts`).
  Lectura propia, la más cercana al santuario 1: «+» abre Tareas porque en el 3 la lista de lo que hay que hacer son las tareas de la iniciación.
- **Moverse.** Gravedad: se anda con el joystick «Moverse» (o WASD) y se mira con «Mirar». En el agua (el mar, la piscina,
  los troncos, ramas y columnas de los árboles) se nada y se sube o baja hacia donde se mira; al salir por una orilla baja se vuelve a andar.
  El mundo son cajas en planta (`domain/walk.ts`): suelos, agua y sólidos. Un paso sube o baja como mucho 0,6 m y en una pared se resbala.
  Donde no hay suelo ni agua no se pasa, salvo la caída de un borde de 10 m o menos (arriba).
- **Ascensor.** El de cada árbol es una cabina estanca dentro del tronco de agua (la magia de `AereoLift`), con su pozo de cristal. Para en
  el andén, en cada nivel, en el techo y, en la lanzadera, en la plataforma. Su tarjeta da un botón por parada; la cabina se ve bajar a por
  ella y subir con ella. Tiempo: `LiftSeconds` de Cold Sanctuary (10 m/s, 1,5 m/s², 4 s de puertas).
- **«Ir».** Tareas y Áreas hacen el camino entero (`domain/route.ts`: el camino más corto por el grafo de cada isla, con los ascensores
  dentro), con la barra del viaje y «Parar». El teletransporte, solo si se elige en sus ajustes. Una tarea de otra isla la lleva a la máquina
  de navegación con un aviso: primero hay que volar ([reglas.md](reglas.md) §3.5). Los ajustes de Tareas y Áreas ofrecen «Isla» en vez de «Vehículo».
- **Escala (§2.4).** «Escala de interiores» (1 o 1,5) agranda en planta **todas** las áreas por igual, también las de Cold
  Sanctuary: cada sala de la isla de entrenamiento sobre su centro, y cada casquete, el muelle y la plataforma del Falcon 9 sobre el
  suyo (`Builder.widen` en `data/layout.ts`). Los datos quedan a tamaño real; las alturas no cambian y las islas no se mueven.
- **Vuelos.** La máquina de navegación abre la ventana de mapa de las islas (`ui/island-nav.ts`, sobre `MapWindow`): su isla «Aquí», cada
  otra con el aparato, el tiempo y la escala. «Volar» la lleva andando al helipuerto y se ve el vuelo entero: el S-92 (280 km/h, 60 m de
  crucero) o la alfombra (30 s, `AereoRule.FlightSeconds`); la cámara gira alrededor con su joystick. `planTrip` pide el menor número de
  tramos y, a igualdad, el menor tiempo: al parque y al muelle (solo alfombras) se va con escala en la lanzadera.
- **Puestos.** Los 13 puestos de la iniciación (§4) son tareas del grupo «Iniciación» con «Ir» a su máquina, y la 14.ª,
  «Lanzamiento», lleva a la torre de la plataforma ([santuario3-lanzamiento.md](santuario3-lanzamiento.md)). Todos tienen su
  reto (ramas `s3-iniciacion-*` y `s3-lanzamiento`). La esterilla del gimnasio abre los ajustes.
- **Aves y turbinas.** Diez aves de `ColdBirds.AirBudget` vuelan al sur de la lanzadera; los albatros llegan hasta el parque. Cada segundo
  cada turbina mira sus aves (`scan`): una a ≤ 200 m del buje la para y se rearma 30 s después de la última.

## Portado y rehecho

| De Cold Sanctuary | En Codeship |
| --- | --- |
| `SiteLineRule.Run`, `AereoRule.LiftSeconds` (grupo 90) | **Portado** con sus pruebas (`domain/lift.ts`) |
| `EnergyRule`, `WindTurbineUnit`, `TidalTurbineUnit` (grupo 101) | **Portado** con sus pruebas (`domain/energy.ts`) |
| `LaunchHeightRule`, `inhabitedBuildingDistance` (grupo 110) | **Portado** con sus pruebas (`domain/launch-height.ts`, `domain/safety.ts`); la regla de altura está **encendida**, porque la decisión pide la magia |
| `HelixTower`, `AereoSiteBuilder`, `LaunchSite` | **Rehecho** como datos (`data/layout.ts`) con las medidas de allí; la geometría de Codeship son cajas fusionadas por material |
| `RocketModel` (torno del Electron) | **Rehecho** con el mismo perfil, sin aletas (pregunta 11 de la iniciación) |
| `AereoLink`, `FlyingCarpet`, `ColdBirds` | **Rehecho**: la alfombra como vuelo con su tiempo; las aves como datos de especie |
| Islas, vuelos en helicóptero, la isla de entrenamiento, la plataforma del Falcon 9 | **Nuevo** (`domain/travel.ts`, `domain/walk.ts`, `domain/route.ts`) |

Cada dato lleva su fuente y su etiqueta (`data/facts.ts`, `data/sources.ts`); `layout.test.ts` lo comprueba.

## Distribución nuestra

Lo que no sale de una fuente y decide esta rama: dónde está cada edificio de la isla de entrenamiento y sus caminos, el helipuerto de la
lanzadera (no lo hay en Cold Sanctuary), la cabina del ascensor junto al tronco (−7, −7) para dejar libre el hueco de llama, la altura de
la torre de acceso de la plataforma, los tiempos de despegue y aterrizaje del helicóptero (20 s cada uno) y la plataforma del Falcon 9 en
(150, −1300), a unos 1,5 km de la corona (la distancia pide ≥ 1,1 km).

## Preguntas de Berón, respondidas (2026-11-18)

1. **§2.6**: reescrita por el coordinador: la gravedad es la real (ingravidez en el espacio, gravedad en la Tierra).
2. **§3.6**: los vuelos entre islas tienen modo manual y por reto. Hecho en `s3-iniciacion-1` ([santuario3-puestos.md](santuario3-puestos.md)).
3. **Escala**: vale para todas las áreas por igual, también las de Cold Sanctuary. Hecho (arriba, «Escala»).
4. **El muelle**: se aparta fuera de los 300 m del Electron. Hecho: (−230, 210), y cuenta como habitado en la prueba de seguridad.
5. **Helipuerto en la lanzadera y plataforma a 182 m**: bien así.
6. **Anillos de las puntas** de los árboles y las aletas del Electron no están (sin cambio).
7. **Entrenadores**: hechos en `s3-iniciacion-1` ([santuario3-puestos.md](santuario3-puestos.md)).
