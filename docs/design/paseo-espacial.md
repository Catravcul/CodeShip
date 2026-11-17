# Paseo espacial: desde Quest y por Bennu

Hay dos paseos, cada uno con su procedimiento real:

- **Desde Quest**, en la estación: el EMU de la ISS, la prerrespiración ISLE, la esclusa de tripulación y los asideros. Por aquí pasan los cambios de piezas de fuera de la estación. Ver «Desde Quest».
- **Desde el módulo lunar**, sobre Bennu: el traje A7LB de Apolo con su PLSS y la escotilla delantera. Ver «Desde el módulo lunar» y el resto del documento.

## Desde Quest (la estación)

Petición de Berón (2026-11-17): «Haz el brazo robótico y el paseo espacial reflejando la realidad». Los datos están en `src/modules/eva/data/station-eva.ts`.

### Cómo se juega

1. **Se planea en el portátil de carga de Unity.** Cambiar las alas, los radiadores o los escudos de la estación no se hace en la bahía: el portátil planea el paseo («Paseo planeado: ve a los trajes de Quest») y la tarea sale en la lista. Solo hay un paseo planeado a la vez.
2. **Los trajes de Quest: «Ponerse el EMU y prerrespirar (ISLE)».** El reto pide ordenar los pasos reales:
   1. la prenda de refrigeración (LCVG);
   2. el pantalón;
   3. entrar por debajo en el torso rígido;
   4. guantes y casco;
   5. la prueba de fugas en el módulo del pecho.

   Hay una trampa, y después la pregunta de cuánto dura el ISLE: 160 min. Cada paso se anima en sus manos junto a los trajes.
3. **ISLE: 160 min de reloj de a bordo** (60 de mascarilla y unos 100 en el traje). La tarjeta cuenta lo que queda. Con el reloj de a bordo (1 h por minuto real) son unos 3 minutos.
4. **Despresurizar la esclusa** (15 min de a bordo, valor de juego). Después la escotilla EVA dice «Salir por la escotilla EVA».
5. **Fuera**:
   - **El HUD del EMU**: oxígeno que queda, CO₂ (METOX), batería, tiempo fuera y cable.
   - **Los mandos**: «◀ Atrás» y «Avanzar ▶» (mantener pulsado: mano sobre mano por los asideros amarillos), «Enganchar el cable aquí» en cada anclaje, «Pies en el APFR», «Trabajar» y «Entrar en Quest».
   - **El cable de seguridad** es de 85 ft (25,9 m). La ruta a las alas mide unos 27 m, así que hay que cambiarlo de anclaje en S1. Al volver se desengancha solo al pasar.
   - **Mientras está fuera** solo se ven la escena y su HUD. Lo que dice el juego sale en su línea, sobre los mandos.
6. **El trabajo** es otro reto: primero la pregunta del margen de oxígeno (lo que queda menos 30 min de reserva) y luego el orden de los pasos reales del sitio, cada uno animado (Canadarm2 le trae la pieza, el cable de equipo, la llave PGT, llevar, comprobar):
   - **alas**: como las iROSA;
   - **radiadores**: como el lazo de amoníaco del EATCS;
   - **escudos**: como el paseo del 30 de marzo de 2017.

   Al acabar, la pieza nueva sale del hangar y la vieja vuelve a él.
7. **Volver**: «Entrar en Quest», represurizar (15 min, valor de juego) y «Quitarse el EMU», que recarga oxígeno, agua y batería.

El oxígeno del EMU se gasta con el reloj de a bordo: un paseo típico de 6 h 27 min deja menos de 2 h. Con menos de 30 min de margen, el HUD pide volver.

### Datos

| Dato | Valor | Etiqueta | Fuente |
| --- | --- | --- | --- |
| ISLE | 60 min de mascarilla + unos 100 en el traje (50 de ejercicio suave, 50 de reposo) | real | [Space.com, STS-134](https://www.space.com/11776-shuttle-astronauts-spacewalk-hokey-pokey-endeavour.html) |
| Esclusa a 10,2 psia, EMU a 4,3 psia | 70,3 kPa / 29,6 kPa | real | [NASA OCHMO](https://www.nasa.gov/sites/default/files/atoms/files/dcs_technical_brief_ochmo.pdf) |
| Paseo típico | 6 h 27 min, de pie en un APFR sobre una WIF | real | [Space.com, iROSA](https://www.space.com/space-exploration/international-space-station/1-more-step-nasa-astronauts-conduct-6-5-hour-spacewalk-to-prep-iss-for-solar-array-upgrade) |
| Cable de seguridad, ganchos, PGT | 85 ft = 25,9 m | real | [NASA 2014](https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf) |
| Despresurizar y represurizar | 15 min cada una | valor de juego | la fuente no da el tiempo |
| Avance por los asideros | 0,5 m/s | valor de juego | — |
| Rutas y anclajes (Quest → S0 → S1 → S3 → S4; S1; Tranquility) | — | distribución nuestra | — |

### Arquitectura

- `QuestEva` (`src/modules/eva/domain/quest-eva.ts`) recorre estas fases: dentro, traje, prerrespirando, listo, despresurizando, fuera, represurizando y en la esclusa. Lleva también el cable con su anclaje, el APFR y los consumibles del EMU con el reloj de a bordo.
- `donningChore` y `jobChore` están en `src/modules/eva/application/station-eva-chores.ts`.
- `src/station-eva.ts` monta la escena fuera: asideros, anclajes, APFR, la figura con el EMU, el cable, la cámara (nunca dentro de la estación ni detrás de ella), el HUD y la auditoría en vivo (`StationEva.audit`).
- La tarjeta de la escotilla EVA y la de los trajes vienen de `StationEva.actions`. La acción «esclusa» de `station-interior.ts` delega en ella.

### Piezas de fuera de las naves

Como en la ISS, una pieza de fuera no se cambia en la bahía: se cambia fuera, en un paseo (o con el brazo). El portátil de carga de Unity la **planea** (`ExteriorWork.planVehicle`) y el cambio se hace al terminar el trabajo del paseo; la pieza sale del hangar entonces y la vieja vuelve a él.

| Pieza | Desde | Sitio de trabajo | Real |
| --- | --- | --- | --- |
| Del módulo lunar: motor, RCS, tanques, energía, batería, escudo | Quest; Canadarm2 trae la pieza desde la JEM-EF | junto al módulo, en su IDA de cenit (por el costado de Destiny y sobre Harmony) o en el CBM de Unity (por debajo de Quest) | **licencia**: nadie ha cambiado piezas de un módulo de aterrizaje en órbita; se hace como los ORU de la ISS ([ORU](https://en.wikipedia.org/wiki/Orbital_replacement_unit)) |
| Motores de la Starship | la esclusa de la Starship, con la nave atracada | faldón de popa, a 50 m de la escotilla con dos cambios de anclaje | **licencia**: ninguna nave ha cambiado un motor en órbita |
| Energía auxiliar de la Starship (alas ROSA) | la esclusa de la Starship | paneles del casco, junto a la esclusa | como las iROSA de la ISS; la esclusa del HLS está **en desarrollo** |
| Cabina del módulo, blindaje de la Starship | la bahía | dentro | por dentro |

### Desde la esclusa de la Starship

La Starship lleva su **esclusa de tripulación** en la cubierta 3, como el HLS (**en desarrollo**: Axiom probó sus trajes AxEMU en maquetas del HLS en 2024, atados a un sistema junto a su esclusa; [Axiom Space](https://axiomspace.com/news/first-artemis-iii-integrated-test-complete)). Es un solo puesto, «Esclusa (trajes y escotilla)»: ahí se viste, prerrespira, despresuriza y sale al casco. Los trajes y el protocolo del HLS no están publicados, así que el juego usa el **EMU y el ISLE de la ISS** (dicho en la ficha del puesto).

El paseo desde la Starship se hace **con ella atracada** en el IDA de proa: la escena es la de la estación, con la Starship en su puerto. Todo lo demás es el paseo de Quest (`StationEva` con otra base, `EvaBase`): cable de 25,9 m con anclajes en el casco, APFR, el reto del trabajo y la vuelta.

## Desde el módulo lunar (Bennu)

Petición de Berón: «Añade la posibilidad de salir de la nave y caminar por el asteroide». Dentro de la nave Doménica va sin traje porque la cabina está presurizada. Para salir necesita un traje espacial: es una actividad extravehicular (EVA).

## Cómo se juega

1. Con la nave **anclada**, aparece el botón **Salir de la nave** en la barra de cabina.
2. **Ponerse el traje** es una cadena de tres retos de código con el motor de tareas (`ChoreRun`). Sigue el procedimiento de Apolo: el módulo lunar no tiene esclusa, se vacía toda la cabina y no hace falta prerrespirar, porque la cabina ya va a 33 kPa de oxígeno puro.
   - Ordenar la preparación: ponerse la mochila PLSS con el OPS encima, conectar las mangueras, cerrar el casco y los guantes y comprobar fugas, vaciar la cabina por la válvula de la escotilla y salir de espaldas al porche por la escotilla delantera. Hay un bloque trampa: «abrir la escotilla sin casco».
   - Completar el bucle que infla el traje hasta su presión de trabajo: 25,5 kPa, la del A7LB.
   - reparar el fallo de `saltar(1.5)`, que supera la velocidad de escape.
   Con dos fallos la preparación se cancela y Doménica sigue dentro.
3. Fuera, la cámara va en tercera persona detrás de Doménica, con el traje blanco, el visor dorado y la mochila de soporte vital (sin SAFER: Apolo no lo llevaba). Se ven la nave posada, el cable de seguridad desde la escotilla, nubecillas de polvo al avanzar y una lámpara en el casco.
4. **Controles**:
   - el mando **Moverse** o WASD sirven para avanzar agarrada al regolito;
   - el joystick de cámara, las flechas o Q/E mueven la cámara (nunca arrastrar la pantalla, reglas.md §5.7);
   - **Impulso** o Espacio sirven para soltarse con un empujón suave; flotando no hay propulsores: vuelve con el cable;
   - **Recoger cable** (R) activa el torno de la escotilla, que la trae de vuelta;
   - **Tomar muestra** (Intro) aparece junto a una muestra;
   - **Volver a la nave** (B) la mete dentro si está junto a la escotilla. Si está lejos, vuelve sola recogiendo cable y entra al llegar.
5. **HUD**: oxígeno primario (tiempo restante), filtro de CO₂, batería, distancia a la nave y longitud del cable, estado (agarrada, flotando o **a la deriva**), gravedad local, velocidad de escape y muestras recogidas.

Hay cuatro muestras alrededor de la nave, dentro del alcance del cable. Cada una enseña un hallazgo real de la muestra de OSIRIS-REx.

## Física: por qué no se puede caminar

Los valores salen de la masa y la forma reales de Bennu, con el mismo modelo de gravedad que usa el vuelo: masa puntual y la superficie generada (`asteroidSurfaceFn`).

| Magnitud | Valor en el juego | Comprobación |
| --- | --- | --- |
| μ = G·M | 6,6743·10⁻¹¹ × 7,329·10¹⁰ = 4,89 m³/s² | masa de [Wikipedia](https://en.wikipedia.org/wiki/101955_Bennu) |
| Gravedad a 282,5 m (radio ecuatorial, sin giro) | 61,5 µm/s² | Wikipedia: «6.27 micro-g (61.5 μm/s²)». Hay un test |
| Gravedad en el polo norte (zona de aterrizaje) | ≈ 69–82 µm/s² según la altura del terreno | el HUD muestra la del sitio |
| Velocidad de escape a 245 m | √(2μ/r) ≈ 0,20 m/s | Wikipedia: «20 cm/s». Hay un test |
| Giro | 4,296 h, ω = 4,06·10⁻⁴ rad/s | Wikipedia |

- **Un paso normal (≈1,4 m/s) es siete veces la velocidad de escape.** Por eso Doménica no camina: avanza a gatas, **agarrada** a las rocas, a 0,15 m/s (valor de juego). Mientras se agarra, la superficie la sujeta y su posición sigue la forma real del terreno. Nunca puede quedar por debajo del suelo.
- **Soltarse** (Impulso) la empuja a 0,04 m/s (valor de juego: el traje limita el empujón). Con 80 µm/s² sube unos 10 m y tarda unos 16 minutos en volver a caer. Es física real, y por eso conviene no soltarse lejos del cable.
- La simulación usa el **marco giratorio** del asteroide, con gravedad, aceleración centrífuga y de Coriolis. En el ecuador el giro ya la lleva a 0,11 m/s: un empujón de 0,15 m/s hacia donde gira el asteroide basta para escapar, y hay un test que lo comprueba. En los polos, donde aterriza la nave, es mucho más seguro.
- **A la deriva**: si su energía en el marco inercial es positiva (½v² − μ/r > 0), el HUD avisa en rojo. El **cable** de 25,9 m frena su velocidad hacia fuera al tensarse. Con el **torno** vuelve al suelo.
- Si vuelve al suelo a menos de 0,3 m/s se agarra. Si llega más rápido rebota poco: el regolito suelto, casi sin cohesión, absorbe el golpe (valores de juego: restitución 0,2 y conserva el 50 % de la velocidad tangencial).
- La nave posada es un obstáculo: Doménica no la atraviesa al moverse y la cámara evita el casco y las alas.

## Traje, mochila y cable (datos con fuente)

El traje del paseo por Bennu es el **A7LB de Apolo con su PLSS** (`APOLLO_A7LB`):

| Elemento | Valor | Fuente |
| --- | --- | --- |
| A7LB: soporte vital primario | 7 h | [Wikipedia, A7L](https://en.wikipedia.org/wiki/Apollo/Skylab_A7L) |
| OPS (oxígeno de emergencia) | unos 30 min | [Wikipedia, PLSS](https://en.wikipedia.org/wiki/Primary_life_support_system) |
| A7LB: presión | 3,7 psi = 25,5 kPa | Wikipedia, A7L |
| A7LB: masa (traje de EVA completo de Apolo 15–17) | 96,2 kg | Wikipedia, A7L |
| Filtro de CO₂ | cartucho de LiOH de 1,42 kg | Wikipedia, PLSS (las 7 h: **supuesto**) |

Los datos del EMU siguen aquí porque son los del paseo desde Quest:

| Elemento | Valor | Fuente |
| --- | --- | --- |
| EMU: soporte vital primario | 8 h (480 min) | [Wikipedia, EMU](https://en.wikipedia.org/wiki/Extravehicular_Mobility_Unit) |
| EMU: soporte vital de reserva | 30 min (oxígeno secundario a 6000 psi) | Wikipedia, EMU; [NASA 2014](https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf) |
| EMU: presión de trabajo | 4,3 psi = 29,6 kPa de O₂ | Wikipedia, EMU |
| EMU: masa total en la ISS | 144,7 kg | Wikipedia, EMU |
| Metabolismo de diseño | 290 W de media, 580 W como máximo | NASA 2014 |
| Filtro de CO₂ | cartucho METOX | NASA 2014 (sin horas: dimensionado a 8,5 h, **supuesto**) |
| Batería | Li-ion | NASA 2014 (sin capacidad: 8,5 h, **supuesto**) |
| Cable de seguridad | 85 ft = 25,9 m (también hay de 55 ft) | NASA 2014 |
| SAFER (del EMU, no del A7LB) | 24 propulsores de N₂, 3,56 N cada uno, Δv 3,05 m/s, 37,7 kg | [Wikipedia, SAFER](https://en.wikipedia.org/wiki/Simplified_Aid_For_EVA_Rescue); [nota de la NASA (STS-64)](https://mailman.amsat.org/hyperkitty/list/sarex@amsat.org/thread/G5ZE64VCGDIWIY5TPJHNYJPU35RAO2NH/) |

- Masa total sobre Bennu: Doménica (58 kg, `CrewMember`) + A7LB (96,2 kg) = 154,2 kg. **Sin SAFER**: es de 1994 y el traje de Apolo no lo llevaba (docs/design/reglas.md: solo procesos reales). Flotando no tiene propulsores: el cable y el torno la traen de vuelta.
- **Consumo**: el oxígeno y el filtro de CO₂ se gastan según el esfuerzo, como múltiplo del metabolismo de diseño: 0,6 en reposo y 1,3 a gatas (valores de juego dentro de 290–580 W). La batería se gasta a ritmo constante. Con menos de 30 min de margen el traje pide volver. Al agotar el primario pasa a la reserva y vuelve sola.
- El tiempo pasa en tiempo real: 8 h de traje dan para todo un paseo.

## Muestras de regolito

Cada muestra son 30 g (valor de juego; OSIRIS-REx trajo 121,6 g en total). Los hallazgos son de [Wikipedia](https://en.wikipedia.org/wiki/101955_Bennu):

- **Roca hidratada**: filosilicatos ricos en magnesio que guardan agua.
- **Grano oscuro**: carbonatos, magnetita y sulfuros.
- **Costra blanca**: fosfatos de magnesio y sodio en vetas y costras (inesperado).
- **Polvo fino**: 14 de los 20 aminoácidos de las proteínas y las 5 nucleobases.

## Arquitectura

- `src/modules/eva/data/`: `suit.ts` (EMU, SAFER, cable, todo `Sourced`), `samples.ts` y `suit-up.ts` (la cadena de retos).
- `src/modules/eva/domain/`: `suit.ts` (consumibles) y `surface-motion.ts` (`EvaBody`: agarrada o flotando sobre la forma real, cable, torno, SAFER, rebote y deriva). No depende del motor.
- `src/modules/eva/application/eva.ts`: caso de uso `Eva`. Solo deja salir con `flight.landed`; gestiona la preparación, la salida junto a la escotilla, las muestras, la vuelta y los eventos.
- Adaptadores: `src/adapters/three/eva/suit-figure.ts` (variante de `CubeFigure`) y `src/eva-mode.ts` (escena, cámara, mandos, HUD). `Walker` acepta otras clases de mando para tener su propio par.
- Tests: `suit.test.ts`, `surface-motion.test.ts` y `eva.test.ts` (30 tests).

## Preguntas abiertas para Berón

1. **Prerrespiración**: resuelta. Desde Quest se hace el ISLE real (160 min de a bordo). Desde el módulo lunar no hace falta, como en Apolo.
2. **Tiempo**: desde Quest, el traje se gasta con el reloj de a bordo. Sobre Bennu sigue en tiempo real: ¿lo pasamos también al reloj de a bordo?
6. **El SAFER con el A7LB**: resuelto, quitado (Apolo no lo llevaba).
7. **Valores de juego desde Quest**: los 15 min de despresurizar y represurizar, y el avance de 0,5 m/s por los asideros.
3. **Muestras**: ahora solo se cuentan. ¿Van a la bodega (`expedition.cargo`), al laboratorio de a bordo o a una misión de Nevaeh?
4. ¿Prefieres que se mueva así, a gatas y con impulsos, o con botas o anclas (por ejemplo, clavar estacas en el regolito, aunque casi no tiene cohesión)?
5. Las rocas grandes de la malla son solo visuales: el suelo del paseo es la forma generada, sin ellas.
