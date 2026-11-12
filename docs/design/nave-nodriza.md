# La nave nodriza y la sonda

Decisión de Berón (2026-11-12): un anillo de 56 m que gira encima de una nave de 3 × 2 × 5 m y ~680 kg no tiene sentido físico, porque un anillo así pesa cientos de toneladas ([gravedad.md](gravedad.md), «Licencia: la masa»). A partir de ahora hay dos naves:

- **La nodriza** es grande. Lleva los dos anillos de 1 g que giran en sentidos contrarios, el módulo habitable, la cubierta de cultivo y los camarotes. Va de asteroide en asteroide con motores eléctricos y se queda aparcada a cierta distancia del objetivo.
- **La sonda** es la Explorer de siempre: un módulo ligero con patas que vuela el último tramo, se posa, sirve para el duelo y para el paseo espacial, y vuelve a acoplarse. Su cabina solo sirve para salidas cortas.

Código: `src/modules/mothership/` (dominio, datos y caso de uso del acople, con tests), `src/adapters/three/mothership-model.ts` (maqueta 3D).

## Cómo se juega

1. La partida empieza con la sonda **acoplada** bajo el nodo delantero de la nodriza, a 1,36 km de la superficie de Bennu y mirando hacia él.
2. **Ir al interior** solo funciona acoplada. Se entra en el anillo habitable de la nodriza por el eje y el radio, como antes. La escotilla del final de la espina lleva ahora a la cabina de la sonda, a través del puerto de acople.
3. **Desacoplar** (botón o tecla K): se abren los ganchos y los muelles separan la sonda a 0,08 m/s. Desde ahí se vuela a Bennu y se aterriza, se hace el duelo o el paseo espacial igual que antes.
4. Para volver, el botón **Acople: auto/manual** (o K) activa el **asistente de acople**, que funciona igual que el de aterrizaje. Primero gira la sonda hasta la actitud del puerto, luego la centra en su eje y se acerca frenando, para tocar a unos 0,07 m/s. También se puede acoplar a mano: el cartel muestra la distancia al puerto, la velocidad de cierre, el desvío lateral y la inclinación, con ✓ o ✗ según el límite IDSS. La cámara **Acople** mira hacia arriba desde el puerto dorsal, como la ventana superior del módulo lunar Apolo.
5. Si el contacto no cumple los límites, los ganchos no cierran: la sonda rebota y el cartel dice por qué («demasiado rápido: 0,30 m/s (máx. 0,10)»). Por encima de 0,3 m/s el golpe daña el casco (ajuste de juego).
6. Si se tarda mucho, el tiempo acelerado (×10, ×50) funciona mientras el asistente vuela, porque el piloto no toca los mandos.

### Mientras la sonda está fuera

- Doménica está en la sonda, **sin gravedad**. Cuenta como ingravidez, con el mismo efecto en la salud de siempre ([gravedad.md](gravedad.md), «Salud»).
- Las **tareas del hábitat no se pueden hacer**: las plantas, los animales y las máquinas están en la nodriza. La vida a bordo sigue su curso (las plantas crecen, los animales comen de sus comederos) y las tareas se acumulan hasta que vuelve. Así se ve en el juego que irse tiene un coste. Lo más sencillo era no permitir tareas «a distancia». Más adelante se puede añadir la radio desde la sonda.
- En la **bahía de la nave** hay dos pestañas: **Sonda** (casco, motor, RCS, tanques, alas) y **Nodriza** (máquinas, cubierta de cultivo, despensa, sobre la maqueta de la nodriza a escala 1:10). Las piezas de la sonda se pueden reparar siempre. Los sistemas de la nodriza solo se pueden ver mientras la sonda está fuera: para trabajar en ellos hay que estar acoplada.

### Cámaras

| Cámara | Qué muestra |
| --- | --- |
| Cabina, ventral, trasera, exterior | Como antes, ahora sin anillo encima de la sonda |
| **Acople** | Desde el puerto dorsal hacia arriba: la cruz de blanco, el anillo guía y las luces de aproximación (verde a babor, roja a estribor) |
| **Nodriza** | Lejos, desde el lado del Sol: la sonda y la nodriza juntas (sustituye a la antigua cámara «Anillo») |

## La nodriza

### Forma

La espina mide 152 m y no gira. Su eje es z, y la proa (−z) mira a Bennu al empezar.

| Parte | Dónde | Notas |
| --- | --- | --- |
| Nodo delantero con el puerto de acople | z = −70 m; puerto en su panza | Como el nodo Unity de la ISS. La sonda cuelga debajo, por delante de los anillos, y desde la cabina ve Bennu sin estorbos |
| Anillo habitable | z = −42 m, radio 56 m, ancho 18 m | El módulo (12 × 4 × 2,6 m) y la cubierta de cultivo (18 × 18 × 7 m) en el suelo, con depósitos de agua al otro lado para equilibrarlo |
| Anillo gemelo | z = −20 m | Gira al revés con camarotes, almacenes y depósitos de agua |
| Radiadores | dos alas de 24,6 × 56 m (2755 m²) | De canto respecto al reactor |
| Reactor y escudo de sombra | z = +74 m | En el extremo opuesto a la tripulación |
| 18 propulsores X3 | dos módulos de 9, z = +64 m | Empujan hacia proa |

Los anillos son una **llanta de celosía** con un pasillo presurizado y segmentos presurizados encima. No son un toro cerrado: un toro presurizado de 56 m de radio, 18 m de ancho y 7 m de alto tendría unos 44 000 m³ por anillo y pesaría miles de toneladas.

### Propulsión: eléctrica nuclear

| Valor | Cifra | Fuente |
| --- | --- | --- |
| Propulsor | **X3**, de efecto Hall con tres canales anidados (NASA / Universidad de Michigan) | [Hall et al. 2019](https://ntrs.nasa.gov/citations/20190004993), [PEPL](https://pepl.engin.umich.edu/project/x3-nested-channel-hall-thruster) |
| Empuje por propulsor | **5,4 N** a 99 kW y 400 V (el máximo medido) | Hall et al. 2019 |
| Isp | 1800–2650 s según el punto de trabajo; usamos **2250 s** | Estimación nuestra para el punto de 5,4 N: P·η = F·g₀·Isp/2 con η ≈ 0,6 (el artículo da 0,54–0,67) |
| Propelente | xenón | Hall et al. 2019 |
| Número | 18 (1,78 MW) | Valor nuestro, cabe en los 2 MWe |
| Energía | reactor de fisión con 4 turbinas Brayton, **2 MWe**, 33,7 % de rendimiento | [Harnack et al. 2022 (NASA, ASCEND)](https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf) |
| Masa específica del sistema de energía | **19 kg/kWe** (90 %: 18–23) | Harnack et al. 2022 |
| Radiadores | **2760 m²** (90 %: 2300–3500) | Harnack et al. 2022 |
| Calor que hay que tirar | 3,9 MW | 2 MWe × (1/0,337 − 1) |

Resultado, calculado en `Mothership` y comprobado en los tests:

- Empuje total **97 N**, aceleración **0,11 mm/s²** con la nodriza llena.
- Δv con 150 t de xenón: **4,1 km/s**. La sonda tiene 0,94 km/s.
- Un cambio de 1 km/s quema 39 t de xenón y lleva **102 días** de empuje continuo.

**Lo que no es real:** ningún reactor espacial de esta potencia ha volado. Los de 2 MWe son estudios de NASA para misiones tripuladas a Marte. El X3 se ha probado en tierra, pero nunca ha volado. Es la opción más honesta para una nave de cientos de toneladas que tiene que hacer varios km/s.

**«Viaja más rápido».** La nodriza no acelera más que la sonda: acelera unas 6000 veces menos. Lo que sí hace es llegar a otros asteroides, porque tiene 4 km/s de Δv y lleva consigo la gravedad, el huerto y los camarotes. La sonda, con 0,94 km/s y una cabina para salidas cortas, no podría. Los saltos entre asteroides de la familia duran meses, y el juego tendrá que comprimir ese tiempo (lo decide el mapa de navegación).

### Presupuesto de masas (estimaciones)

Cada partida dice de dónde sale en `src/modules/mothership/data/mothership.ts`.

| Partida | t | Cómo se estimó |
| --- | --- | --- |
| Cascos presurizados del módulo y de la cubierta de cultivo | 145 | 2393 m³ × 61 kg/m³, la proporción del módulo hinchable [B330](https://en.wikipedia.org/wiki/B330) (~20 t, 330 m³) |
| Sustrato de los bancales y macetas | 63 | 165 m² × 0,3 m × 1,2 t/m³ (sustrato húmedo, estimación) + 4 macetas de 1 t |
| Agua (reserva y blindaje del módulo) | 60 | Estimación: ~20 cm de agua alrededor del módulo y de las literas |
| Llanta de celosía, pasillo y tres radios | 50 | Estimación: ~110 kg/m en 350 m de llanta; la carga radial es de ~3 MN a 1 g |
| **Anillo habitable** | **318** | |
| **Anillo gemelo** | **318** | Gira al revés con el mismo radio y el mismo giro, así que necesita el mismo momento de inercia para que el momento angular total sea cero (test) |
| Cojinetes y motores de giro | 10 | Estimación |
| Espina (152 m) | 23 | Estimación, ~150 kg/m |
| Nodo de acople | 11,6 | Como el nodo [Unity](https://en.wikipedia.org/wiki/Unity_(ISS_module)) de la ISS |
| Reactor, conversión y radiadores | 38 | 2000 kWe × 19 kg/kWe |
| 18 X3 con sus fuentes de potencia | 7,2 | Estimación: ~250 kg por propulsor y ~150 kg por fuente |
| Doménica y los animales | 0,1 | |
| **En seco** | **727** | Más que la ISS (~420 t) |
| Xenón | 150 | Valor de juego |
| **Llena** | **877** | |

### Dónde aparca

A **1350 m** de la superficie del objetivo (`parkingDistanceM`), del lado desde el que llega. Es un valor de juego, porque la zona de vuelo está comprimida. La referencia real es Hayabusa2, que esperaba en su «home position», a unos 20 km de Ryugu, y bajaba desde allí ([Wikipedia](https://en.wikipedia.org/wiki/Hayabusa2)). `Mothership.parkingPoint(spec, objetivo, desde)` calcula el punto. Así el mapa de navegación puede llevar la nodriza a otro asteroide y dejarla aparcada. Para el mapa, «acoplar con la nodriza» es `docking.assist = true` con la nodriza como destino.

Una regla de juego, como con las rocas de la zona: la sonda **no atraviesa** la nodriza (`Mothership.keepOut`). Se anula la velocidad hacia la estructura a menos de 4 m de ella, salvo cerca del puerto, donde manda el contacto del acople.

## El acople

### Límites de contacto (IDSS)

Son las condiciones iniciales de contacto del estándar internacional de acople, el que usan Crew Dragon, Starliner y los adaptadores IDA de la ISS ([IDSS IDD Rev. F, tabla 3.3.1.1-2](https://ntrs.nasa.gov/citations/20220011643)). Se tienen que cumplir todas a la vez:

| Condición | Límite |
| --- | --- |
| Velocidad de cierre (axial) | **0,05–0,10 m/s** |
| Velocidad lateral | 0,04 m/s |
| Cabeceo/guiñada (suma vectorial) | 0,20 °/s |
| Alabeo | 0,20 °/s |
| Desvío lateral | **0,10 m** |
| Inclinación (cabeceo/guiñada) | **4,0°** |
| Giro (alabeo) | 4,0° |

`judgeContact` (dominio) los comprueba cuando las caras de los dos puertos se tocan y devuelve la lista de lo que falla, en español. Si el contacto cae fuera del anillo guía (más de 0,6 m del eje), la sonda choca con el nodo.

### La sonda

- **Puerto dorsal** encima del casco, detrás de la cúpula (`ShipDesign.dockingPort`). Así la sonda cuelga bajo el nodo, con el morro hacia delante, como el módulo lunar Apolo, que se acoplaba por su escotilla superior.
- Ya no lleva anillo: `ShipDesign.ring` ha desaparecido. La masa de vuelo (≈ 680 kg) vuelve a ser coherente con la nave que se ve.
- El asistente de acople (`dockingCommand`) es una función pura del estado y de la autoridad de los RCS (par y aceleración por eje). El ordenador de vuelo lo llama a 120 Hz cuando el piloto no toca los mandos (`FlightComputer.autopilot`). En los tests acopla desde 80 m de distancia, desviado y girado 25°, en unos 3 minutos y gastando 1,3 kg de hidracina. Desde 1,5 km tarda unos 14 minutos y gasta 5,6 kg. Ajustes de juego en `DOCKING_ASSIST`: 0,07 m/s al contacto, los últimos 2 m a esa velocidad, como mucho 5 m/s y un perfil de frenado que cuenta con el 30 % de los RCS.

## Preguntas para Berón

1. **«Más rápida».** ¿Te vale una nodriza que va lejos pero despacio (meses entre asteroides, con el tiempo comprimido), o quieres que de verdad acelere más? Para eso haría falta una etapa química o nuclear-térmica, a cambio de mucho menos Δv. Ejemplo: un NERVA de ~330 kN y 840 s de Isp.
2. **Xenón.** 150 t son unos dos años de la producción mundial. ¿Lo cambiamos por kriptón (más barato, Isp algo mayor y menos empuje por kW) o por argón? Así el asteroide persuadido podría dar propelente.
3. **La cabina de la sonda.** 680 kg sigue siendo poco para una nave tripulada (la etapa de ascenso del módulo lunar Apolo pesaba ~2,2 t en seco). ¿Subimos la masa de la sonda, aunque los RCS empujen menos, o lo dejamos como licencia?
4. **Tareas a distancia.** ¿Quieres que algunas tareas (radio, cartas, vigilar el cultivo de carne) se puedan hacer desde la sonda?
5. **Dónde aparca.** 1,35 km es muy cerca para una nave de 877 t; Hayabusa2 esperaba a 20 km. ¿La alejamos cuando el mapa de navegación tenga distancias reales?
