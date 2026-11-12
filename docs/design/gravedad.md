# Gravedad a bordo: el anillo giratorio

Petición de Berón (2026-11-12): en una nave real no hay gravedad; solo se consigue haciendo girar un anillo o un cilindro. El hábitat y la cubierta de cultivo van en un anillo que gira. La cabina, la bahía y el eje central no giran y allí se flota.

## La física

Un suelo que gira empuja hacia fuera todo lo que lleva encima. Ese empuje es la única «gravedad» posible a bordo:

**a = ω² r**

Aquí ω es la velocidad angular en rad/s (rpm × 2π / 60) y r es la distancia al eje. De la fórmula salen todas las consecuencias del juego:

- **Baja con la altura.** A media altura del radio la gravedad es la mitad, y en el eje es 0. La diferencia entre los pies y la cabeza (el **gradiente**) es h / R, sea cual sea la velocidad de giro.
- **Coriolis.** Todo lo que se mueve dentro del anillo nota además −2ω×v. Si caminas en el sentido del giro pesas más, y si caminas en contra pesas menos. Al subir por un radio te empuja hacia un lado. Lo que se suelta cae desviado.
- **Mareo.** Si giras la cabeza dentro de un sistema que rota, los canales semicirculares del oído reciben aceleraciones cruzadas. Por eso hay un límite de rpm.

Código: `src/modules/gravity/domain/spin-gravity.ts` (`SpinRing`, `checkComfort`, con tests). Datos: `src/modules/gravity/data/ring.ts`.

## Límites de comodidad (con fuentes)

| Autor | rpm máx. | g | Velocidad del borde mín. | Gradiente | Fuente |
| --- | --- | --- | --- | --- | --- |
| Hill y Schnitzer (1962) | 4 | 0,035–1 g | 6 m/s | — | Hall 1999, tabla 1 |
| Gilruth (1969) | 6 (2 «óptimo») | 0,3–0,9 g | — | 8 % | Hall 1999 |
| Gordon y Gervais (1969) | 6 | 0,2–1 g | 7 m/s | 8 % | Hall 1999 |
| Stone (1973) | 6,4 | 0,1–1 g | 10,2 m/s | 25 % | Hall 1999 |
| Cramer (1985) | 3 | 0,1–1 g | 7 m/s | 0,03 g | Hall 1999 |
| Globus y Hall (2017) | 4 (quizá 6) para residentes | 1 g | — | — | NSS Journal |
| NASA SP-413, toro de Stanford (1977) | 1 | 0,9–1 g | — | — | SP-413, cap. 3 |

Globus y Hall repasan los experimentos de la sala giratoria de Pensacola (Graybiel, 1960) y concluyen que a 4 rpm se vive bien tras uno o dos días de adaptación. Advierten que hay pocos datos: pocos sujetos, radios pequeños y casi todo medido en tierra. SP-413 fue mucho más prudente: 1 rpm, con lo que el toro necesitó unos 830 m de radio.

- Hall, T. W. (1999), «Inhabiting Artificial Gravity», AIAA-99-4524: https://spacearchitect.org/pubs/AIAA-99-4524.pdf
- Globus, A. y Hall, T. W. (2017), «Space Settlement Population Rotation Tolerance»: https://nss.org/wp-content/uploads/NSS-JOURNAL-Space-Settlement-Population-Rotation-Tolerance.pdf
- NASA SP-413 (1977), «Space Settlements: A Design Study», cap. 3: https://settlement.nss.org/75SummerStudy/Chapt3.html
- O'Neill, G. K. (1974), «The Colonization of Space», *Physics Today* 27(9): sus cilindros van por parejas que giran en sentido contrario para no acumular momento angular.

## El anillo de la Codeship

| Valor | Cifra | De dónde sale |
| --- | --- | --- |
| Radio del suelo | **56 m** | 1 g a 4 rpm exige 55,9 m (a = ω²r) |
| Giro | **4 rpm** (ω = 0,419 rad/s) | Máximo de Hill y Schnitzer y de Globus y Hall |
| Gravedad en el suelo | **1,00 g** (9,83 m/s²) | — |
| Bajo el «cielo» de la cubierta de cultivo (7 m) | 0,875 g | ω²(R − 7) |
| Cabeza de Doménica (1,6 m) | 0,97 g: gradiente del 2,9 % (0,029 g) | Cumple el 8 % de Gilruth y Gordon, y por poco el 0,03 g de Cramer |
| Velocidad del borde | 23,5 m/s | Cumple los 10,2 m/s de Stone |
| Caminar a 1,2 m/s | +10 % de peso a favor del giro, −10 % en contra | (1 ± v/ωR)² |
| Ancho | 18 m (el de la cubierta de cultivo) | — |
| Anillos | **dos gemelos que giran en sentido contrario** | Como los cilindros de O'Neill: el momento angular total es cero y la nave maniobra como si no girara nada |

**Qué cumple:** Hill y Schnitzer, Gordon y Gervais, Stone y Globus y Hall. **Qué no cumple:** Cramer (3 rpm), Gilruth (pide como mucho 0,9 g) y SP-413 (1 rpm). El test `ring.test.ts` lo comprueba.

**Alternativas descartadas:**
- 1 g a 2 rpm, que es lo cómodo sin adaptación, exige un anillo de **224 m** de radio.
- Con ataduras (dos módulos unidos por un cable, como hizo el Gemini 11 en 1966 con 30 m de cable y unos 0,00015 g) el radio sale barato. Pero hay que recoger el cable para maniobrar y para posarse, y entonces el hábitat se queda sin gravedad mientras dura el duelo en el asteroide.
- Bajar a una fracción de g (0,5 g a 3 rpm con 50 m) haría más cómodo el giro. A cambio se pierde la gravedad terrestre, y nadie sabe aún si una gravedad parcial basta para la salud.

Se eligió **1 g a 4 rpm con 56 m**. Es el límite alto, defendido por Globus y Hall, y deja el anillo lo bastante pequeño para posarse en Bennu. **Pregunta para Berón:** ¿prefieres 0,5 g a 3 rpm, más cómodo, o un anillo de 224 m a 2 rpm?

## Forma de la nave

- El **casco** (3 × 2 × 5 m, con la cabina delante y el tren debajo) es el cuerpo que toca el suelo. Las patas, el alcance de contacto, el asistente de aterrizaje y los brazos de palanca de los RCS siguen usando `hull.size`, y nada de eso cambia.
- Del techo del casco sale un **mástil** (el eje que no gira) con los dos anillos apilados. El de abajo lleva el hábitat y la cubierta de cultivo, y su gemelo de arriba lleva almacenes, agua y camarotes. Giran en sentidos contrarios alrededor del eje vertical del casco (+y), así que quedan **paralelos al suelo** al posarse. Un anillo alrededor de la espina (eje +z, como la Hermes de *The Martian*) chocaría con el asteroide al aterrizar de panza. El borde inferior del anillo queda unos 10 m sobre el suelo, más los ~6 m que baja Bennu a 56 m del punto de contacto por su curvatura. El modelo de contacto no comprueba los anillos (licencia, ver abajo).
- Cámaras: la **exterior** (16 m) muestra el casco, el mástil y los anillos girando por encima. La nueva cámara **Anillo** se aleja a 230 m para verlos enteros. La **trasera** los ve girar en lo alto, y desde la cabina se ven por el cristal al mirar arriba.
- `ShipDesign.ring` guarda los datos del anillo (`CODESHIP_RING`).

### Licencia: la masa

El anillo y su cubierta de cultivo son enormes. Solo la tierra de los bancales pesa unas 40 t (120 m² × 0,3 m × ~1,2 t/m³), y el conjunto andaría por **cientos de toneladas**. Con los motores reales de la Explorer (un R-4D de 490 N y RCS de 22 N), una nave así tardaría minutos en girar 90° y no podría aterrizar con el control que tiene el juego.

Por ahora **el vuelo usa solo la masa del casco** (≈ 680 kg) y no cuenta la inercia de los anillos. El giro de los anillos no afecta al vuelo porque los dos se anulan; eso sí es real. La masa es la parte que no cuadra. Opciones para Berón:

1. **Motores mayores** y reales (un RL10 de ~110 kN de motor principal y R-4D como RCS, como el módulo de servicio Apollo). El vuelo sería más lento y pesado.
2. **Nave nodriza y módulo de aterrizaje.** El anillo se queda en órbita y la Explorer baja sola. Así lo haría una misión real, pero cambia el bucle de juego.
3. **Mantener la licencia** (lo que hay ahora), documentada.

## Zonas del interior

| Zona | Gravedad | Cómo se mueve Doménica |
| --- | --- | --- |
| Anillo (módulo y cubierta de cultivo) | 1,00 g en los pies, 0,97 g en la cabeza | Camina como antes |
| Radio (ascensor de 52 m) | Baja con la altura: 0,82 g a 46 m del eje, 0,47 g a 26 m… | ▲▼ o R/F; carteles con la gravedad cada 10 m |
| Nudo del eje (aún gira) | 0,018 g a 1 m del eje | Flota y nota una pequeña deriva hacia fuera, más Coriolis |
| Espina (no gira, tras el cojinete) | 0 g | Flota: mando *Flotar* en la dirección de la mirada, ▲▼ (R/F, Espacio/Mayús); el pasamanos frena la deriva |
| Cabina | 0 g | Se llega por la escotilla al final de la espina |

- El **ascensor** va despacio a propósito. A 2 m/s, Coriolis empuja de lado 2ωv = 1,7 m/s² (0,17 g), y el HUD lo muestra. Por eso el viaje dura medio minuto.
- Si se elige una tarea desde el eje, Doménica baja sola por el radio y luego camina.
- **Lanzar pelota** (botón en el anillo): la pelota sigue la trayectoria exacta. Vista desde fuera, va en línea recta mientras el suelo gira por debajo. Cuando cae, el juego dice a cuántos centímetros ha caído del punto donde caería sin giro: a 4 m/s en el sentido del giro cae unos 50 cm antes. Un tenedor que se cae de la mesa (0,9 m) aterriza **11 cm** hacia atrás del giro, a cualquier velocidad de giro si el radio es el mismo: Δ ≈ (2h)^1,5 / (3√R).
- La **postura neutra** al flotar (brazos hacia delante, caderas y rodillas dobladas) es la que describe la norma de diseño de la NASA, NASA-STD-3000.

## Salud: tiempo en ingravidez

En microgravedad los huesos pierden de media **entre el 1 y el 1,5 % de su densidad al mes** (NASA, https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/), además de músculo. En el juego el efecto es pequeño: fuera del anillo la **forma** de Doménica baja un poco más deprisa, 0,05 al día a 0 g (ajuste de juego, proporcional a 1 − g). El HUD cuenta los días que pasa en ingravidez. Pilotar desde la cabina cuenta como ingravidez, y el yoga en el anillo lo compensa.

## Pendiente

- Decidir la masa (ver «Licencia»).
- Que el anillo pueda pararse (`SpinRing.spinDown`, ya probado): por una avería, o para atracar. Entonces todo el interior flotaría.
- Cámaras exteriores en la bahía de la nave y en el EVA mostrando el anillo.
