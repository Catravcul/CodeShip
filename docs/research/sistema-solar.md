# Una zona del sistema solar para empezar

Pregunta de Berón (12 de noviembre de 2026): en el espacio no se ven ni los planetas ni el Sol, ¿es normal? ¿Se puede recrear una zona del sistema solar con muchos asteroides para empezar ahí, con el Sol y los planetas del tamaño que tendrían vistos desde allí? ¿La escala real perjudicaría el rendimiento?

**Respuesta corta.** Era a medias normal. Desde el cinturón el Sol se ve como un disco diminuto (0,24°, la mitad que desde la Tierra) pero cegador, y los planetas son puntos como estrellas brillantes. Lo que no era real es que el juego no los dibujaba: el Sol era solo una luz. Ahora el Sol y los ocho planetas se calculan con los elementos orbitales de JPL para la fecha de juego y se dibujan con su tamaño aparente y su brillo reales. El juego empieza en la familia de Nueva Polana, en el cinturón interior: es de donde probablemente viene Bennu. Las distancias entre asteroides se comprimen unas 100.000 veces, porque el cinturón real está casi vacío. La escala real no costaría mucha GPU, pero no se vería distinto y traería problemas de precisión, así que el cielo se pinta con impostores (ver el final).

## Qué se ve desde la zona de juego

La zona está a 2,21 UA del Sol el 12 de noviembre de 2026 (fecha de juego), en la posición de 142 Polana calculada con sus elementos osculadores de JPL SBDB. Desde ahí:

| Cuerpo | Magnitud aparente | Tamaño aparente | Distancia (UA) | Separación del Sol |
| --- | --- | --- | --- | --- |
| Sol | −25,0 | 0,24° (14,5′) | 2,21 | — |
| Venus | −2,6 | 5,9″ | 2,81 | 9° |
| Tierra (baricentro Tierra-Luna) | −1,4 | 6,0″ | 2,94 | 15° |
| Júpiter | −1,4 | 26,6″ | 7,25 | 25° |
| Mercurio | −0,6 | 2,7″ | 2,51 | 1,6° (perdido en el resplandor) |
| Saturno | +0,9 | 16,5″ (sin anillos) | 9,76 | 75° |
| Marte | +2,4 | 2,5″ | 3,81 | 2,4° (perdido en el resplandor) |
| Urano | +6,0 | 3,3″ | 21,24 | 33° |
| Neptuno | +7,8 | 2,3″ | 29,68 | 93° (no se ve a simple vista) |

- El ojo resuelve alrededor de 1′, así que **todos los planetas son puntos**; ninguno llega a medio minuto de arco. En una pantalla de 800 px de alto con 70° de campo, un píxel son unos 6′: el Sol ocupa 2–3 px. Por eso se dibuja con su tamaño real y un **halo de resplandor** (efecto de cámara/ojo, valor de juego) que lo hace leer como cegador.
- Ese día, vista desde Polana, la Tierra está casi detrás del Sol (a 2,94 UA), y Venus, la Tierra y Júpiter quedan a menos de 25° del Sol. Es la geometría real de esa fecha.
- La magnitud de cada planeta se pasa a tamaño y opacidad del punto comprimiendo la escala (una magnitud es ×2,512 de luz y una pantalla no tiene ese rango); los más débiles que 6,5 casi desaparecen y no llevan nombre. Los nombres se pueden ocultar con el botón **Nombres**.

### Cómo se calcula

- **Planetas:** elementos keplerianos medios con sus tasas por siglo, tabla 1 (1800–2050) de E. M. Standish, [Approximate Positions of the Planets (JPL)](https://ssd.jpl.nasa.gov/planets/approx_pos.html). Se resuelve la ecuación de Kepler y se rota al plano de la eclíptica J2000. Prueba: la Tierra queda a 0,983 UA el 1 de enero de 2000 y Júpiter sale en oposición el 10 de enero de 2026 con magnitud −2,7 y 46″, como en el cielo real.
- **Radios:** radio medio volumétrico del [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/); Sol 695.700 km (IAU 2015 B3). UA = 149.597.870,7 km (IAU 2012 B2).
- **Brillo:** fórmulas de fase de [Mallama y Hilton 2018](https://arxiv.org/abs/1808.01973) (las que usa el *Astronomical Almanac*): V = V(1,α) + 5·log₁₀(r·Δ). Simplificaciones: Saturno sin anillos (estuvieron de canto en 2025 y siguen casi así), Urano sin el término de latitud, Marte sin correcciones de rotación. Sol: −26,74 a 1 UA ([NASA Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html)).
- **Orientación:** los ejes del mundo del juego son arbitrarios, así que el cielo se gira entero para poner el Sol a la izquierda y algo arriba de la posición inicial (valor de juego) con el norte de la eclíptica hacia arriba. Los ángulos entre cuerpos se conservan y la luz direccional sale del disco del Sol.
- Código: `src/modules/celestial/domain/orbit.ts`, `sky.ts`, `region.ts` (con tests) y `data/planets.ts`.

## Dónde empezar: opciones con muchos asteroides

| Opción | A favor | En contra |
| --- | --- | --- |
| **Familia de Nueva Polana** (cinturón interior, 2,1–2,5 UA) | Es el origen más probable de Bennu, que ya está en el juego ([Takir et al. 2024](https://www2.boulder.swri.edu/~bottke/Reprints/Takir_2024_Sci_Reports_14_15965_Bennu_New_Polana_Family.pdf); [Bottke et al. 2015](https://astro.troja.mff.cuni.cz/davok/papers/variable_YORP_Icarus2015.pdf)). Asteroides oscuros tipo B/C con agua y carbono, como Bennu. Hay miembros pequeños con diámetro medido. | Tan vacío como el resto del cinturón. |
| Troyanos de Júpiter (5,2 UA) | Muchos objetos, tipos D/P quizá ricos en hielo. | Lejos de Bennu y de la historia; también muy dispersos; Sol más débil (0,1°). |
| Anillos de Saturno | El único sitio del sistema solar donde las rocas están de verdad juntas: hielo de agua, de granos a montañas, en una capa de unos 10 m ([NASA Cassini](https://science.nasa.gov/mission/cassini/science/rings/)). | No son asteroides: no tienen clase espectral ni nombre y son casi todo hielo. Saturno ocuparía medio cielo. Buena zona para más adelante. |

**Elegida: Nueva Polana.** Polana (142) es el cuerpo padre de la familia: 54,8 km, albedo 0,047, tipo B (SMASSII), a = 2,42 UA, y la familia tiene unos 1400 millones de años.

**Licencia de juego:** hoy Bennu es un asteroide cercano a la Tierra (a = 1,13 UA) que salió del cinturón hace mucho. En el juego se coloca en su familia de origen para que el primer objetivo siga siendo Bennu.

### Asteroides reales de la zona

Consulta a [JPL SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html) el 12 de noviembre de 2026: a entre 2,41 y 2,44 UA, i < 3°, albedo < 0,07 (oscuros como la familia) y diámetro < 2,5 km. Diámetro y albedo son de NEOWISE ([Masiero et al. 2014](http://adsabs.harvard.edu/abs/2014ApJ...791..121M)).

| Asteroide | Diámetro | Albedo | Rotación | Distancia en el juego |
| --- | --- | --- | --- | --- |
| 242916 (2006 OS2) | 2,44 km | 0,052 | 4,717 h (LCDB) | 10 km |
| 58587 (1997 SK23) | 2,306 km | 0,040 | 5,43 h (LCDB) | 9,8 km |
| 265900 (2006 BY34) | 1,794 km | 0,050 | valor de juego | 9,8 km |
| 236201 (2005 WF81) | 1,562 km | 0,066 | valor de juego | 10,8 km |
| 417464 (2006 QY64) | 1,319 km | 0,053 | valor de juego | 11,6 km |
| 2009 UF113 | 1,197 km | 0,049 | valor de juego | 13 km |

- Sin espectro medido: la clase C se **infiere** del albedo bajo. Densidad (1190 kg/m³) y composición se **suponen** iguales a las de Bennu, y la masa sale de ahí. La proporción de ejes y la forma son procedurales. Todo queda anotado en `src/modules/celestial/data/nueva-polana.ts`.
- 142 Polana se ve a lo lejos, fuera de la zona de vuelo, a una distancia comprimida de 1500 km (se ve de unos 2°).
- Hay 5000 **rocas procedurales** (no catalogadas) de 8 a 500 m. Su distribución de tamaños es una ley de potencias N(>D) ∝ D^−1,8, un valor de juego más plano que el 2,5 de equilibrio colisional (Dohnanyi 1969) para que haya más rocas grandes visibles. El 90 % son oscuras B/C y el 10 % son intrusas tipo S más claras (también valor de juego). La mitad se agrupan en nubes de escombros alrededor de los asteroides grandes.

## Lo vacío que está el cinturón de verdad

- Hay entre 0,7 y 1,9 millones de asteroides de más de 1 km en un volumen de unos pocos ×10²⁵ km³. La distancia media entre ellos es de unos pocos ×10⁵ km, según la página del proyecto Lucy de SwRI ([Main Belt Density](https://lucy.swri.edu/MainBeltDensity.html)). Haciendo la cuenta (V/N)^(1/3) con esos mismos números sale todavía más, unos 2–3 millones de km. En cualquier caso, son cientos de miles de km o más: desde un asteroide, el vecino de su tamaño no se ve a simple vista.
- Por eso las naves que cruzan el cinturón no tienen que esquivar nada ([Astronomy, diciembre de 2024](https://www.astronomy.com/science/how-do-spacecraft-avoid-collisions-in-the-asteroid-belt/)).

**Lo que comprime el juego:**

| | Real | Juego |
| --- | --- | --- |
| Distancia entre asteroides de 1–2 km | ~10⁵–10⁶ km | 5–10 km (≈100.000 veces menos) |
| Número de cuerpos en una esfera de 40 km | prácticamente 0 | 7 catalogados y 5000 rocas |
| Polana (55 km) | a millones de km | 1500 km |
| Sol, planetas, sus tamaños y brillos | — | reales para la fecha de juego |
| Gravedad de cada asteroide | real | real (los 7 catalogados atraen la nave; las rocas no) |

## Zona de vuelo

- Esfera de 20 km de radio centrada en Bennu (40 km de lado a lado, valor de juego).
- En los últimos 2,5 km, el HUD avisa («Límite de la zona de vuelo a 1,2 km») y un empuje hacia dentro crece hasta 1,2 m/s². Es más que el motor principal (≈0,7 m/s²), así que no se puede salir. Si se pasa el borde, se anula la velocidad hacia fuera. Es una regla de juego, no física, y está probada en `region.test.ts`.
- **Anticolisión (simplificación):** de momento solo se aterriza en Bennu. Con las demás rocas y asteroides, el ordenador de vuelo anula la velocidad de acercamiento al llegar a su casco (1,4 veces el radio medio más 4 m). El contacto real con cada roca queda pendiente.

## Rendimiento: ¿escala real con profundidad logarítmica o impostores?

La escala real no cambiaría la imagen: un Sol de 1,39 millones de km a 330 millones de km ocupa los mismos 0,24° que el impostor. La GPU tampoco notaría mucho (una esfera es una esfera). Los problemas son otros:

1. **Precisión de las posiciones.** La GPU trabaja con float de 32 bits (24 bits de mantisa). A 3,3×10¹¹ m (2,2 UA), el paso mínimo entre dos valores es de unos 33 km: el Sol y los planetas temblarían. El buffer de profundidad logarítmico (ya activado) arregla la **profundidad**, pero no la **posición** de los vértices. Haría falta renderizar relativo a la cámara (origen flotante) y dobles en la simulación.
2. **Cámara y culling.** Habría que estirar el plano lejano a 10¹³ m (Neptuno) y las sombras direccionales tendrían que cubrir distancias absurdas.
3. **Nada que ganar jugando.** Con la zona de vuelo limitada a 40 km, nunca se nota paralaje del Sol ni de los planetas: a esa distancia son direcciones fijas.

Por eso el cielo se pinta con **impostores**: el Sol es un sprite del tamaño angular real con halo, y los planetas son puntos en una esfera a 900 km que viaja con la cámara. Son unos pocos píxeles y unas pocas líneas de cálculo por fotograma. Es la técnica habitual de los simuladores espaciales.

Con los asteroides de la zona se hace lo mismo a pequeña escala (LOD):

- Bennu y los 6 asteroides catalogados tienen malla siempre, porque siempre ocupan muchos píxeles.
- Las 5000 rocas se dibujan como **puntos** en un solo draw call. El tamaño sale de su tamaño angular real y el brillo de su albedo y su fase. Solo las que ocuparían más de 8 px pasan a **mallas instanciadas** (4 formas, hasta 160 de cada una). La decisión (`chooseLod`, en el dominio y con tests) se rehace cada 4 fotogramas y cuesta unos 0,3 ms.
- Polana se dibuja más cerca y más pequeña, con el mismo tamaño angular.

En Chromium sin GPU (SwiftShader) el juego va igual de fluido que antes de añadir la zona (la diferencia está dentro del ruido de medida).

## Pendiente

- Contacto real con las rocas y poder aterrizar en otros asteroides de la zona (por ejemplo, que el objetivo de la expedición sea el asteroide seleccionado).
- Anillos de Saturno como segunda zona.
- Medir rotaciones y formas de los miembros pequeños cuando haya curvas de luz o modelos públicos.
