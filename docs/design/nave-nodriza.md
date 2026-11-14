# La nave nodriza y el módulo de aterrizaje

Decisión de Berón (2026-11-12): un anillo de 56 m que gira encima de una nave de 3 × 2 × 5 m y ~680 kg no tiene sentido físico, porque un anillo así pesa cientos de toneladas ([gravedad.md](gravedad.md), «Licencia: la masa»). A partir de ahora hay dos naves:

- **La nodriza** es grande. Lleva los dos anillos de 1 g que giran en sentidos contrarios, el módulo habitable, la cubierta de cultivo y los camarotes. Va de asteroide en asteroide con motores eléctricos y se queda aparcada a cierta distancia del objetivo.
- **El módulo** es la Explorer de siempre: un módulo ligero con patas que vuela el último tramo, se posa, sirve para el duelo y para el paseo espacial, y vuelve a acoplarse. Su cabina solo sirve para salidas cortas.

Código: `src/modules/mothership/` (dominio, datos y caso de uso del acople, con tests), `src/adapters/three/mothership-model.ts` (maqueta 3D).

## Cómo se juega

1. La partida empieza con el módulo **acoplado** bajo el nodo delantero de la nodriza, a 1,36 km de la superficie de Bennu y mirando hacia él.
2. **Entrar en la nave de viaje** (antes «Ir al interior») solo aparece con el módulo acoplado. Doménica entra flotando por la escotilla del final de la espina; de ahí al anillo por el eje y el radio. La misma escotilla baja al módulo (**Bajar al módulo de aterrizaje**) y, con la nodriza atracada en la estación, pasa a ella (**Pasar a la estación**). Ver [accesos.md](accesos.md).
3. **Desacoplar** (botón o tecla K): se abren los ganchos y los muelles separan el módulo a 0,08 m/s. Desde ahí se vuela a Bennu y se aterriza, se hace el duelo o el paseo espacial igual que antes.
4. Para volver, el botón **Acople: auto/manual** (o K) activa el **asistente de acople**, que funciona igual que el de aterrizaje. Primero gira el módulo hasta la actitud del puerto, luego la centra en su eje y se acerca frenando, para tocar a unos 0,07 m/s. También se puede acoplar a mano: el cartel muestra la distancia al puerto, la velocidad de cierre, el desvío lateral y la inclinación, con ✓ o ✗ según el límite IDSS. La cámara **Acople** mira hacia arriba desde el puerto dorsal, como la ventana superior del módulo lunar Apolo.
5. Si el contacto no cumple los límites, los ganchos no cierran: el módulo rebota y el cartel dice por qué («demasiado rápido: 0,30 m/s (máx. 0,10)»). Por encima de 0,3 m/s el golpe daña el casco (ajuste de juego).
6. Si se tarda mucho, el tiempo acelerado (×10, ×50) funciona mientras el asistente vuela, porque el piloto no toca los mandos.

### Mientras el módulo está fuera

- Doménica está en el módulo, **sin gravedad**. Cuenta como ingravidez, con el mismo efecto en la salud de siempre ([gravedad.md](gravedad.md), «Salud»).
- Las **tareas del hábitat no se pueden hacer**: las plantas, los animales y las máquinas están en la nodriza. La vida a bordo sigue su curso (las plantas crecen, los animales comen de sus comederos) y las tareas se acumulan hasta que vuelve. Así se ve en el juego que irse tiene un coste. Lo más sencillo era no permitir tareas «a distancia». Más adelante se puede añadir la radio desde el módulo.
- En la **bahía de la nave** hay dos pestañas: **Módulo** (casco, motor, RCS, tanques, alas) y **Nodriza** (máquinas, cubierta de cultivo, despensa, sobre la maqueta de la nodriza a escala 1:10). Las piezas del módulo se pueden reparar siempre. Los sistemas de la nodriza solo se pueden ver mientras el módulo está fuera: para trabajar en ellos hay que estar acoplada.

### Cámaras

| Cámara | Qué muestra |
| --- | --- |
| Cabina, ventral, trasera, exterior | Como antes, ahora sin anillo encima del módulo |
| **Acople** | Desde el puerto dorsal hacia arriba: la cruz de blanco, el anillo guía y las luces de aproximación (verde a babor, roja a estribor) |
| **Nodriza** | Lejos, desde el lado del Sol: el módulo y la nodriza juntos (sustituye a la antigua cámara «Anillo») |

## La nodriza

### Forma

La espina mide 152 m y no gira. Su eje es z, y la proa (−z) mira a Bennu al empezar.

| Parte | Dónde | Notas |
| --- | --- | --- |
| Nodo delantero con el puerto de acople | z = −70 m; puerto en su panza | Como el nodo Unity de la ISS. El módulo cuelga debajo, por delante de los anillos, y desde la cabina ve Bennu sin estorbos |
| Anillo habitable | z = −42 m, radio 56 m, ancho 18 m | El módulo (18 × 4 × 2,6 m) y la cubierta de cultivo (18 × 18 × 7 m) en el suelo, con depósitos de agua al otro lado para equilibrarlo |
| Anillo gemelo | z = −20 m | Gira al revés con camarotes, almacenes y depósitos de agua |
| Módulos de la espina | z = −65,5 a −46 m: esclusa, almacén y taller | Como Quest, Leonardo (PMM) y Destiny de la ISS ([interiores.md](interiores.md)) |
| Radiadores | dos alas trapezoidales de z = +4 a +50 m, 22 m de ancho delante y 8 m detrás: 690 m² de planta cada una | Paneles de dos caras: 1380 m² de planta radian los 2760 m² del estudio. De canto respecto al reactor y dentro de su sombra |
| Reactor y escudo de sombra | z = +74 m; escudo cónico de z = +70,5 a +72 m | Sombra de 35° de semiángulo (valor de juego) que cubre los anillos, los radiadores, los propulsores y los módulos (test) |
| Propulsores (al empezar, 18 X3) | dos módulos (dorsal y ventral) de 7,5 × 3,4 m, z = +54 m | Empujan hacia proa. Se pueden cambiar: ver «Propulsores intercambiables» |

Los anillos son una **llanta de celosía** con un pasillo presurizado y segmentos presurizados encima. No son un toro cerrado: un toro presurizado de 56 m de radio, 18 m de ancho y 7 m de alto tendría unos 44 000 m³ por anillo y pesaría miles de toneladas.

### Propulsión: eléctrica nuclear

| Valor | Cifra | Fuente |
| --- | --- | --- |
| Propulsor | **X3**, de efecto Hall con tres canales anidados (NASA / Universidad de Michigan) | [Hall et al. 2019](https://ntrs.nasa.gov/citations/20190004993), [PEPL](https://pepl.engin.umich.edu/project/x3-nested-channel-hall-thruster) |
| Empuje por propulsor | **5,4 N** a 99 kW y 400 V (el máximo medido) | Hall et al. 2019 |
| Isp | 1800–2650 s según el punto de trabajo; usamos **2250 s** | Estimación nuestra para el punto de 5,4 N: P·η = F·g₀·Isp/2 con η ≈ 0,6 (el artículo da 0,54–0,67) |
| Propelente | xenón | Hall et al. 2019 |
| Número al empezar | 18, 9 por módulo (1,78 MW) | Valor nuestro, cabe en los 1,8 MW libres del reactor |
| Masa por unidad | 230 kg el propulsor + 150 kg la fuente de potencia | [PEPL](https://pepl.engin.umich.edu/project/x3-nested-channel-hall-thruster) (Ø80 cm × 20 cm, 230 kg); la fuente es una estimación (~1,5 kg/kW) |
| Energía | reactor de fisión con 4 turbinas Brayton, **2 MWe**, 33,7 % de rendimiento | [Harnack et al. 2022 (NASA, ASCEND)](https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf) |
| Masa específica del sistema de energía | **19 kg/kWe** (90 %: 18–23) | Harnack et al. 2022 |
| Radiadores | **2760 m²** (90 %: 2300–3500) | Harnack et al. 2022 |
| Calor que hay que tirar | 3,9 MW | 2 MWe × (1/0,337 − 1) |
| Emisividad de los radiadores | 0,9 (mínimo 0,8) | Harnack et al. 2022 |
| Temperatura media de los radiadores | **≈ 409 K** | Nuestra, con Stefan–Boltzmann: 3,93 MW / (0,9 · σ · 2760 m²). Queda por encima de la entrada del compresor (357 K, mismo estudio), así que los 2760 m² son área que radia; ver [interiores.md](interiores.md) |

Resultado, calculado en `Mothership` y comprobado en los tests:

- Empuje total **97 N**, aceleración **0,11 mm/s²** con la nodriza llena.
- Δv con 150 t de xenón: **4,1 km/s**. El módulo tiene 0,94 km/s.
- Un cambio de 1 km/s quema 39 t de xenón y lleva **102 días** de empuje continuo.

**Lo que no es real:** ningún reactor espacial de esta potencia ha volado. Los de 2 MWe son estudios de NASA para misiones tripuladas a Marte. El X3 se ha probado en tierra, pero nunca ha volado. Es la opción más honesta para una nave de cientos de toneladas que tiene que hacer varios km/s.

**«Viaja más rápido».** La nodriza no acelera más que el módulo: acelera unas 6000 veces menos. Lo que sí hace es llegar a otros asteroides, porque tiene 4 km/s de Δv y lleva consigo la gravedad, el huerto y los camarotes. El módulo, con 0,94 km/s y una cabina para salidas cortas, no podría. Los saltos entre asteroides de la familia duran meses, y el juego tendrá que comprimir ese tiempo (lo decide el mapa de navegación).

### Propulsores intercambiables

Petición de Berón (2026-11-12): «que se puedan cambiar los propulsores». Ahora son piezas, como el motor y los RCS del módulo.

**Montajes.** La nodriza tiene dos módulos de propulsores en la popa, uno encima de la espina (`dorsal`) y otro debajo (`ventral`). Cada módulo tiene una cara de 7,5 × 3,4 m (valor de juego, el de la maqueta) y lleva **varias unidades de un solo tipo**. Los cabezales van en una rejilla cuadrada con un paso de 1,25 diámetros (regla de juego: sitio para los chorros y los cables). Por eso caben 21 X3, 55 AEPS, 24 NEXT-C o 10 VX-200 por módulo.

**El reactor manda.** De los 2000 kWe, **200 kW** son para el resto de la nave: luces del huerto, soporte vital, motores de los anillos (valor de juego; como referencia, los 8 paneles de la ISS dan 75–90 kW, [NASA](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/)). Quedan **1800 kW** para propulsión. Se encienden unidades enteras, una de cada módulo por turno para que la nave no tuerza, mientras quepan en esos 1800 kW. Las que sobran están **paradas**: pesan y no empujan (`drivePlan`, en `domain/propulsion.ts`). El empuje, la Isp efectiva (empuje total ÷ g₀ ÷ caudal total), la aceleración, el Δv, los días de empuje y el xenón de cada maniobra salen de las unidades que encienden. La masa de los propulsores sale de las montadas.

| Propulsor | Empuje | Isp | Potencia | Masa (propulsor + fuente) | Ø | Propelente | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **X3** (Hall de 3 canales, NASA / U. Michigan) | 5,4 N | 2250 s (estimada) | 99 kW | 230 + 150 kg (fuente estimada) | 0,80 m | xenón; también kriptón | [Hall et al. 2019](https://ntrs.nasa.gov/citations/20190004993), [PEPL](https://pepl.engin.umich.edu/project/x3-nested-channel-hall-thruster) |
| **AEPS / HERMeS** (Hall de 12,5 kW, PPE del Gateway) | 589 mN | 2800 s | 13,3 kW (con la fuente) | <50 + ~50 kg | 0,516 m | xenón | [Jackson et al. 2018](https://ntrs.nasa.gov/api/citations/20180003521/downloads/20180003521.pdf) (tabla 1, §3.1–3.3); [Cassady et al. 2022](https://ntrs.nasa.gov/api/citations/20220007037/downloads/SP2022_438_CASSADY.pdf) (ETU-1: 608 mN, 2882 s) |
| **NEXT-C** (iónico de rejillas, voló en DART) | 235 mN | 4155 s | 7,33 kW (entrada a la fuente) | <14 + <36 kg | 0,70 m | xenón | [Ficha L3Harris 2022](https://arsuppliernet.l3harris.com/sites/default/files/documents/NEXT-C_Data_sheet_01_2022_FINAL_DIGITAL.pdf), [ficha NASA 2021](https://ntrs.nasa.gov/api/citations/20210024276/downloads/NEXT-C_FactSheet_11_1_21_rev4%20(1).pdf) |
| **VASIMR VX-200** (Ad Astra) · **experimental** | 5,8 N | 4900 s | 212 kW de continua (200 kW de RF) | 500 (estimación) + 128 kg | 1,2 m (valor de juego) | **argón** (kriptón solo en la etapa helicón) | [Longmier et al. 2014, JPP](https://www.adastrarocket.com/technical-papers-archives/Ben-JPP-2014.pdf) |

Notas sobre los números:

- La Isp del X3 es nuestra: el artículo da 1800–2650 s según el punto, y para el de 5,4 N la estimamos con P·η = F·g₀·Isp/2 y η ≈ 0,6. Los 99 kW son de descarga; no contamos las pérdidas de su fuente.
- Los 128 kg del VX-200 son sus generadores de RF, con las masas específicas del artículo (0,85 kg/kW × 48 kW + 0,506 kg/kW × 172 kW). El artículo no da la masa del motor ni del imán superconductor: los 500 kg son una estimación nuestra.
- Un test comprueba que en todos el rendimiento F·g₀·Isp / 2P queda entre 0,4 y 0,8 (sale 0,60–0,66).

**Qué cambia al cambiar** (con el xenón lleno, ambos módulos llenos de cada tipo; calculado por `Mothership` y comprobado en los tests):

| Montaje | Encienden | Empuje | Potencia | Isp | Aceleración | Δv | 1 km/s cuesta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 × 9 X3 (el de salida) | 18 de 18 | 97,2 N | 1782 kW | 2250 s | 0,111 mm/s² | 4,14 km/s | 102 días, 38,8 t de xenón |
| 2 × 21 X3 | 18 de 42 | 97,2 N | 1782 kW | 2250 s | 0,110 mm/s² | 4,10 km/s | 103 días (24 X3 parados, 9 t muertas) |
| 2 × 55 AEPS | 110 de 110 | 64,8 N | 1463 kW | 2800 s | 0,074 mm/s² | 5,13 km/s | 154 días, 31,5 t |
| 2 × 24 NEXT-C | 48 de 48 | 11,3 N | 352 kW | 4155 s | 0,013 mm/s² | 7,69 km/s | 884 días, 21,1 t |

La lección es la de verdad: con la misma potencia, más Isp da menos empuje. El AEPS y el NEXT-C gastan menos xenón, pero tardan mucho más. Los NEXT-C no llegan a usar el reactor porque no caben más en los módulos.

**VASIMR.** Se puede fabricar, pero no montar: usa argón, y la nodriza lleva xenón. La bahía lo enseña bloqueado con ese motivo. Si algún día hay tanques de argón, el dominio ya lo admite (`propulsion.propellant`).

**En el juego.** Los propulsores se fabrican en la estación ([estacion.md](estacion.md), «Planos») y esperan en el hangar. En la bahía, pestaña **Nodriza**, cada módulo es una pieza («Módulo de propulsores dorsal: 9 × X3») con su ficha: el modelo con su fuente, cuántos hay y cuántos encienden, y lo que hace toda la nave (empuje, reactor, aceleración, Δv, lo que cuesta 1 km/s). Las acciones son **añadir uno**, **quitar uno** o **montar n de otro tipo**, con tantos como haya en el hangar y quepan. Solo se puede hacer con el módulo acoplado, y solo con piezas del hangar. Las que salen vuelven al hangar.

Cada cambio es una cadena de retos (`driveRefitChore`, en `application/drive-refit.ts`), como los del módulo (`swapChore`):

1. **Completar** la línea nueva del código de la nave: el empuje real del propulsor (`+ propulsores.dorsal = 6 × AEPS(___ N, 13,3 kW, Isp 2800 s)`).
2. **Predecir** cuántos podrán encenderse a la vez: 1800 kW libres, encendiendo de uno en uno mientras quepan. Con 2 × 21 X3, la respuesta es 18, no 42.
3. **Predecir** el Δv nuevo con Tsiolkovsky y la Isp de la mezcla.
4. **Ordenar** el montaje: cerrar el xenón, desconectar las fuentes, desmontar, montar, conectar el cátodo, encendido de prueba.

Si se fallan los retos, no cambia nada. Al acabar, la maqueta de la bahía y la de la nodriza en el espacio enseñan los cabezales nuevos en su rejilla.

Capturas (`docs/screenshots/propulsores-*-{mobile,desktop}.png`): 1 el plano del X3 en la estación, 2 la ficha del módulo dorsal, 3 sus acciones (VASIMR bloqueado por el propelente), 4 el primer reto del cambio a 6 AEPS, 5 el módulo ya con los AEPS (52,1 N en total, los 9 X3 en el hangar).

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
| 18 X3 con sus fuentes de potencia | 6,8 | Se calcula con lo montado: 18 × (230 kg [PEPL] + 150 kg de fuente, estimación) |
| Doménica y los animales | 0,1 | |
| **En seco** | **726** | Más que la ISS (~420 t) |
| Xenón | 150 | Valor de juego |
| **Llena** | **876** | |

### Dónde aparca

A **1350 m** de la superficie del objetivo (`parkingDistanceM`), del lado desde el que llega. Es un valor de juego, porque la zona de vuelo está comprimida. La referencia real es Hayabusa2, que esperaba en su «home position», a unos 20 km de Ryugu, y bajaba desde allí ([Wikipedia](https://en.wikipedia.org/wiki/Hayabusa2)). `Mothership.parkingPoint(spec, objetivo, desde)` calcula el punto. Así el mapa de navegación puede llevar la nodriza a otro asteroide y dejarla aparcada. Para el mapa, «acoplar con la nodriza» es `docking.assist = true` con la nodriza como destino.

Una regla de juego, como con las rocas de la zona: el módulo **no atraviesa** la nodriza (`Mothership.keepOut`). Se anula la velocidad hacia la estructura a menos de 4 m de ella, salvo cerca del puerto, donde manda el contacto del acople.

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

`judgeContact` (dominio) los comprueba cuando las caras de los dos puertos se tocan y devuelve la lista de lo que falla, en español. Si el contacto cae fuera del anillo guía (más de 0,6 m del eje), el módulo choca con el nodo.

### El módulo

- **Puerto dorsal** encima del casco, detrás de la cúpula (`ShipDesign.dockingPort`). Así el módulo cuelga bajo el nodo, con el morro hacia delante, como el módulo lunar Apolo, que se acoplaba por su escotilla superior.
- Ya no lleva anillo: `ShipDesign.ring` ha desaparecido. La masa de vuelo (≈ 680 kg) vuelve a ser coherente con la nave que se ve.
- El asistente de acople (`dockingCommand`) es una función pura del estado y de la autoridad de los RCS (par y aceleración por eje). El ordenador de vuelo lo llama a 120 Hz cuando el piloto no toca los mandos (`FlightComputer.autopilot`). En los tests acopla desde 80 m de distancia, desviado y girado 25°, en unos 3 minutos y gastando 1,3 kg de hidracina. Desde 1,5 km tarda unos 14 minutos y gasta 5,6 kg. Ajustes de juego en `DOCKING_ASSIST`: 0,07 m/s al contacto, los últimos 2 m a esa velocidad, como mucho 5 m/s y un perfil de frenado que cuenta con el 30 % de los RCS.

## Preguntas para Berón

1. **«Más rápida».** ¿Te vale una nodriza que va lejos pero despacio (meses entre asteroides, con el tiempo comprimido), o quieres que de verdad acelere más? Para eso haría falta una etapa química o nuclear-térmica, a cambio de mucho menos Δv. Ejemplo: un NERVA de ~330 kN y 840 s de Isp.
2. **Xenón.** 150 t son unos dos años de la producción mundial. ¿Lo cambiamos por kriptón (más barato, Isp algo mayor y menos empuje por kW) o por argón? Así el asteroide persuadido podría dar propelente.
3. **La cabina del módulo.** 680 kg sigue siendo poco para una nave tripulada (la etapa de ascenso del módulo lunar Apolo pesaba ~2,2 t en seco). ¿Subimos la masa del módulo, aunque los RCS empujen menos, o lo dejamos como licencia?
4. **Tareas a distancia.** ¿Quieres que algunas tareas (radio, cartas, vigilar el cultivo de carne) se puedan hacer desde el módulo?
5. **Dónde aparca.** 1,35 km es muy cerca para una nave de 877 t; Hayabusa2 esperaba a 20 km. ¿La alejamos cuando el mapa de navegación tenga distancias reales?
