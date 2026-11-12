# Paseo espacial por Bennu

Petición de Berón: «Añade la posibilidad de salir de la nave y caminar por el asteroide». Dentro de la nave Doménica va sin traje porque la cabina está presurizada. Para salir necesita un traje espacial: es una actividad extravehicular (EVA).

## Cómo se juega

1. Con la nave **anclada**, aparece el botón **Salir de la nave** en la barra de cabina.
2. **Ponerse el traje** es una cadena de tres retos de código con el motor de tareas (`ChoreRun`):
   - ordenar la preparación: prerrespirar oxígeno, ponerse el traje y el casco, comprobar fugas, despresurizar la esclusa y abrir la escotilla (hay un bloque trampa: «abrir la escotilla sin casco»);
   - completar el bucle que infla el traje hasta su presión de trabajo, 29,6 kPa;
   - reparar el fallo de `saltar(1.5)`, que supera la velocidad de escape.
   Con dos fallos la preparación se cancela y Doménica sigue dentro.
3. Fuera, la cámara va en tercera persona detrás de Doménica, con el EMU blanco, el visor dorado, la mochila de soporte vital y el SAFER. Se ven la nave posada, el cable de seguridad desde la escotilla, nubecillas de polvo al avanzar y una lámpara en el casco.
4. **Controles**:
   - el mando **Moverse** o WASD sirven para avanzar agarrada al regolito o, si va flotando, para disparar el SAFER en horizontal;
   - el mando **Mirar**, las flechas, Q/E o arrastrar mueven la cámara;
   - **Impulso** o Espacio sirven para soltarse con un empujón suave; flotando, **Subir** (Espacio) y **Bajar** (F) disparan el SAFER;
   - **Recoger cable** (R) activa el torno de la escotilla, que la trae de vuelta;
   - **Tomar muestra** (Intro) aparece junto a una muestra;
   - **Volver a la nave** (B) la mete dentro si está junto a la escotilla. Si está lejos, vuelve sola recogiendo cable y entra al llegar.
5. **HUD**: oxígeno primario (tiempo restante), filtro de CO₂, batería, Δv del SAFER, distancia a la nave y longitud del cable, estado (agarrada, flotando o **a la deriva**), gravedad local, velocidad de escape y muestras recogidas.

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
- **Soltarse** (Impulso) la empuja a 0,04 m/s (valor de juego: el traje limita el empujón). Con 80 µm/s² sube unos 10 m y tarda unos 16 minutos en volver a caer. Es física real, y por eso conviene bajar con el SAFER.
- La simulación usa el **marco giratorio** del asteroide, con gravedad, aceleración centrífuga y de Coriolis. En el ecuador el giro ya la lleva a 0,11 m/s: un empujón de 0,15 m/s hacia donde gira el asteroide basta para escapar, y hay un test que lo comprueba. En los polos, donde aterriza la nave, es mucho más seguro.
- **A la deriva**: si su energía en el marco inercial es positiva (½v² − μ/r > 0), el HUD avisa en rojo. El **cable** de 25,9 m frena su velocidad hacia fuera al tensarse. Con el **torno** o con el **SAFER** vuelve al suelo.
- Si vuelve al suelo a menos de 0,3 m/s se agarra. Si llega más rápido rebota poco: el regolito suelto, casi sin cohesión, absorbe el golpe (valores de juego: restitución 0,2 y conserva el 50 % de la velocidad tangencial).
- La nave posada es un obstáculo: Doménica no la atraviesa al moverse y la cámara evita el casco y las alas.

## Traje, mochila y cable (datos con fuente)

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
| SAFER | 24 propulsores de N₂, 3,56 N cada uno, Δv 3,05 m/s, 37,7 kg | [Wikipedia, SAFER](https://en.wikipedia.org/wiki/Simplified_Aid_For_EVA_Rescue); [nota de la NASA (STS-64)](https://mailman.amsat.org/hyperkitty/list/sarex@amsat.org/thread/G5ZE64VCGDIWIY5TPJHNYJPU35RAO2NH/) |

- Masa total: Doménica (58 kg, `CrewMember`) + EMU (144,7 kg) + SAFER (37,7 kg) = 240,4 kg. Con 4 propulsores por eje (**supuesto**: 24 propulsores para 6 sentidos), el empuje es 4 × 3,56 N = 14,2 N y da **0,059 m/s²**. En unos 3 s supera la velocidad de escape, así que hay que pulsar con cuidado.
- **Consumo**: el oxígeno y el filtro de CO₂ se gastan según el esfuerzo, como múltiplo del metabolismo de diseño: 0,6 en reposo, 1,3 a gatas y 0,9 con el SAFER (valores de juego dentro de 290–580 W). La batería se gasta a ritmo constante. Con menos de 30 min de margen el traje pide volver. Al agotar el primario pasa a la reserva y vuelve sola.
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

1. **Prerrespiración**: en la ISS dura horas (o una noche de «campout»). Aquí se resume en un reto. ¿Debería costar tiempo de juego, por ejemplo 40 min acelerados, o bajar la presión de la cabina?
2. **Tiempo**: 8 h de traje en tiempo real casi nunca se agotan. ¿Comprimimos el tiempo fuera para que el oxígeno importe?
3. **Muestras**: ahora solo se cuentan. ¿Van a la bodega (`expedition.cargo`), al laboratorio de a bordo o a una misión de Nevaeh?
4. ¿Prefieres que se mueva así, a gatas y con impulsos, o con botas o anclas (por ejemplo, clavar estacas en el regolito, aunque casi no tiene cohesión)?
5. Las rocas grandes de la malla son solo visuales: el suelo del paseo es la forma generada, sin ellas.
