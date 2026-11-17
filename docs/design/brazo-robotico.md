# Brazo robótico: Canadarm2, la MBS y Dextre

Petición de Berón: «Haz el brazo robótico y el paseo espacial reflejando la realidad». El brazo es el de la ISS: Canadarm2 sobre su base móvil (MBS) y, con él, Dextre. Doménica lo maneja desde el **puesto robótico (RWS) de la Cupola**. Cada trabajo es un reto de código y, en un caso, también mandos reales. El paseo espacial está en [paseo-espacial.md](paseo-espacial.md) («Desde Quest»).

## Datos reales (con fuente)

Todos están en `src/modules/robotics/data/robotics.ts` como `Sourced`.

| Dato | Valor | Etiqueta | Fuente |
| --- | --- | --- | --- |
| Canadarm2: longitud | 17,6 m (la CSA redondea a 17 m) | real | [Wikipedia, MSS](https://en.wikipedia.org/wiki/Mobile_Servicing_System) |
| Canadarm2: masa y diámetro | 1800 kg, 35 cm | real | Wikipedia, MSS |
| Articulaciones | 7: tres en el hombro, una en el codo y tres en la muñeca | real | [CSA, ficha](https://www.asc-csa.gc.ca/eng/iss/canadarm2/data-sheet.asp) |
| Manos | dos LEE iguales, uno en cada punta; tres cables atrapan el vástago del accesorio de agarre | real | [CSA, About Canadarm2](https://asc-csa.gc.ca/eng/iss/canadarm2/about.asp) |
| Carga máxima | 116 000 kg | real | CSA |
| Andar de punta a punta | entre PDGF, que le dan corriente, datos y vídeo | real | CSA |
| MBS | 108 m de raíles, unos 1,5 m/min, 4 PDGF; con el brazo y Dextre, 4900 kg | real | Wikipedia, MSS |
| Dextre | 1662 kg, dos brazos de 3,5 m con 7 articulaciones; mano OTCM | real | [Wikipedia, Dextre](https://en.wikipedia.org/wiki/Dextre) |
| Punto de captura | 10 m | real | [NASA, 2019](https://www.nasa.gov/image-article/spacex-dragon-reaches-capture-point) |
| De la captura a los pernos | 2,5 h (NG-19: captura a las 09:52 UTC) | real | [Spaceflight Now, NG-19](https://spaceflightnow.com/2023/08/04/cygnus-cargo-ship-berthed-at-space-station/) |
| Cygnus al CBM de nadir de Unity; desde tierra tras la captura | — | real | [NASA, Cygnus XL 2026](https://www.nasa.gov/blogs/spacestation/2026/04/13/canadarm2-reaches-out-and-captures-cygnus-xl-cargo-craft/) |
| CBM | 4 pestillos (primera etapa), 16 pernos (segunda) | real | [Wikipedia, CBM](https://en.wikipedia.org/wiki/Common_Berthing_Mechanism) |
| Velocidad de la punta | 0,3 m/s | valor de juego | la fuente no da velocidades |
| Margen del LEE / velocidad de cierre | 0,2 m / 0,05 m/s | valor de juego | no publicados |
| Deriva libre | 0,01 m/s | valor de juego | — |
| Cámara de P1: vida ante la radiación, masa | 288 h de a bordo, 20 kg | valor de juego | el desgaste tiene causa, nunca azar |

La colocación de los PDGF de Destiny y Harmony, del estante de la JEM-EF y de la cámara de P1 es nuestra: la fuente dice que existen, no dónde están exactamente.

## Qué se hace desde el puesto robótico

La tarjeta del RWS de la Cupola ofrece solo lo que toca ahora:

| Trabajo | Cuándo aparece | Reto | Real |
| --- | --- | --- | --- |
| **Capturar el Cygnus (por reto)** | un Cygnus pedido en la cocina espera en el punto de captura | ordenar 8 pasos (esperar a 10 m, deriva libre, acercar el LEE, disparar, llevar al CBM, pestillos, pernos, soltar) con la trampa «capturar con los propulsores encendidos», y la pregunta de la hora de los pernos (09:52 + 2,5 h) | real |
| **Capturar el Cygnus a mano (RHC/THC)** | igual | mandos: seis direcciones del THC y «Disparar». El LEE atrapa a menos de 0,2 m y 0,05 m/s. Después, como en la ISS, el atraque lo hace el control de misión desde tierra | real; margen, valor de juego |
| **Atracar el módulo / Devolverlo a su IDA** | con el módulo en su IDA o en el CBM | ordenar los pasos y la pregunta de la masa frente a los 116 t | **licencia**: el LM no tiene accesorio de agarre ni anillo CBM |
| **Soltar con la Bishop** | con algo sujeto en su placa | ordenar los 6 pasos y encontrar el fallo en el orden | real |
| **Dextre: cambiar la cámara de P1** | cuando la radiación ha quemado sus píxeles | ordenar 8 pasos (andar a la MBS, agarrar a Dextre, la JEM-EF, tomar la cámara, llevarla, sacar la vieja, montar, devolver) y la pregunta de los minutos de la MBS (distancia ÷ 1,5 m/min) | real (Dextre ya cambió una cámara exterior) |

| **Desatracar y soltar el Cygnus** | cuando acaba su estancia: 140 días de a bordo, los del NG-19 | ordenar 6 pasos (cerrar escotillas, agarrarlo, soltar los 16 pernos, abrir los 4 pestillos, llevarlo al punto de suelta, abrir el LEE) con la trampa «abrir los pestillos con los pernos puestos», y la pregunta de los días (216 → 356) | real ([NASA, 22-12-2023](https://www.nasa.gov/blogs/spacestation/2023/12/22/two-spaceships-depart-crew-will-spend-holidays-in-space)) |

Mientras un Cygnus está atracado, la cocina no pide otro y dice cuántos días le quedan: el siguiente vuela cuando el puerto queda libre.

El Cygnus se atraca en el **CBM de nadir de Unity**, como en la ISS. Si el módulo lunar ocupa ese puerto, va al de nadir de Harmony. Mientras un Cygnus ocupa Unity, el módulo no puede atracar ahí.

Al llegar, el Cygnus **no descarga solo**: espera en el punto de captura (`CargoResupply`, evento `punto-captura`) hasta que el brazo lo atraca. El Dragon de carga sigue acoplándose solo, porque en la ISS se acopla por su cuenta en un IDA.

## Cómo se ve cada paso (entorno real)

1. Primero se ven **sus manos en los mandos del RWS**, en la Cupola (el escenario del interior, `stepVisual` con el gesto «programar»).
2. Después se ve **el brazo fuera**, a escala real en el marco de la estación (`src/adapters/three/arm-show.ts`). Cada bloque bien colocado mueve su parte: la MBS rueda, el brazo anda de PDGF en PDGF, el LEE cierra sus cables, los pestillos y pernos del CBM se encienden uno a uno y Dextre usa sus dos manos.
3. La cámara usa la **ventana de la Cupola** si desde ella se ve el sujeto sin nada de la estación en medio y a una distancia en la que cabe en la franja sobre la hoja. Si no, usa la **cámara exterior** con línea limpia más cercana. El rótulo de la vista dice cuál es.
4. **La cámara se gira**: arrastrar sobre la escena encima de la hoja la gira alrededor de lo que enfoca (el encuadre automático sigue siendo el de partida y se vuelve a él en cada reto). El rótulo dice entonces «cámara». Los mandos del THC siguen en pantalla en la captura a mano, como el controlador real.
5. Rótulos en la escena: Canadarm2, la MBS, Dextre, el Cygnus, el CBM y la pieza. Son sprites que no tapa la geometría.

La **auditoría en vivo** (`ArmShow.audit`, `RoboticsGame.audit`) mide tras cada bloque:

- qué fracción del sujeto se ve sobre la hoja sin nada de la estación delante (el brazo, Dextre y lo que sujetan no cuentan como tapa);
- si algún punto de las vigas, del LEE o de lo que sujeta queda dentro de un módulo o de una pieza exterior (`insideStation` en `src/modules/robotics/domain/clearance.ts`);
- cuánto se ha movido la punta o el sujeto, o qué ha cambiado sin moverse (los propulsores que se apagan).

El recorrido PX-39 (`tools/experiencia/brazo-eva.mjs`) escribe las filas en [docs/qa/animaciones-brazo.md](../qa/animaciones-brazo.md).

## Qué se cambia dónde

| Pieza | Dónde | Cómo en la ISS |
| --- | --- | --- |
| Lo de dentro (bastidores, máquinas del ECLSS, impresoras) | portátil de carga de Unity (bahía) o su bastidor | la tripulación por dentro |
| Alas, radiadores y escudos de la estación | el portátil **planea un paseo espacial** desde Quest (`ExteriorWork.planComponent`) | paseos espaciales: iROSA, bomba del EATCS, escudos MMOD |
| Cámara exterior (una ORU pequeña) | Dextre, desde el RWS | Dextre |
| Lo de fuera del módulo lunar | el portátil **planea un paseo desde Quest**; Canadarm2 trae la pieza (`ExteriorWork.planVehicle`) | como un ORU (licencia: nunca se ha hecho con un módulo de aterrizaje) |
| Lo de fuera de la Starship (motores, energía auxiliar) | el portátil **planea un paseo desde la esclusa de la Starship** | licencia o en desarrollo ([paseo-espacial.md](paseo-espacial.md), «Piezas de fuera de las naves») |

La pieza nueva sale del hangar al terminar el trabajo de fuera y la vieja vuelve al hangar (`applyStationRefit`). Si el trabajo falla, nada cambia.

## Arquitectura

- Dominio:
  - `Canadarm2` en `arm.ts`: andar entre PDGF con la mano vacía, rodar la MBS (minutos reales), agarrar y soltar.
  - `VisitingVehicle` en `visiting-vehicle.ts`: va del punto de captura a la deriva libre, la captura, la primera etapa, la segunda y el atraque. No captura con los propulsores encendidos.
  - `ManualCapture` en `manual-capture.ts`.
  - `insideStation` y `segmentClear` en `clearance.ts`.
- Aplicación:
  - `armChore` en `arm-chores.ts`.
  - `ExteriorWork` en `exterior-work.ts`: una EVA planeada a la vez y el desgaste de la cámara.
- Adaptadores:
  - `canadarm-model.ts`: brazo de 7 articulaciones, con dos LEE y la MBS.
  - `robotics-models.ts`: Dextre, Cygnus y los rótulos.
  - `arm-show.ts`: el espectáculo y la auditoría.
  - `src/robotics-game.ts`: la tarjeta del RWS, los retos y el THC.
- `src/robotics-wiring.ts` lo une todo, y `main.ts` solo lo llama.
- Tests: `arm.test.ts`, `arm-chores.test.ts` y `exterior-work.test.ts`. El Cygnus que espera está en `cargo-resupply.test.ts`.

## Decisiones de Berón (resueltas)

1. **El módulo lunar en el CBM** se mantiene como licencia, con su aviso.
2. **Las piezas de fuera del LM y de la Starship** se cambian en un paseo o con el brazo, como en la realidad, nunca en la bahía.
3. **Si un reto falla**, cuesta el tiempo de a bordo que se ha gastado (el reloj corre durante el reto) y nada cambia.
4. **El Cygnus atracado** se desatraca y se suelta con el brazo tras su estancia real (140 días del NG-19).
5. **La cámara** se gira durante los retos del brazo (arrastrar); el encuadre automático es el de partida.

## Preguntas abiertas

1. **Valores de juego**: la velocidad de la punta, el margen del LEE y la vida de la cámara ante la radiación (empieza a 6 h del final para que se vea en una partida).
