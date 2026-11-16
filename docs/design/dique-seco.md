# Dique seco: la nodriza en la estación

> **Desde 2026-11-16 la estación es la ISS** ([estacion-real.md](estacion-real.md)): la nodriza atraca en el IDA de proa de Harmony, como el transbordador. El dique seco solo se dibuja con `?ficcion` y está en [pendientes.md](../pendientes.md).

Petición de Berón (2026-11-16):

1. «La nave nodriza debería poder entrar al hangar, ¿no? ¿Cómo funciona en la vida real?»
2. «La opción de viaje o teletransporte sería ideal en el modal de tareas en vez de en la esterilla».
3. «En el viaje por reto se supone que está la opción de ver el trayecto haciéndose, ya sea por la nave, la sonda o lo que sea».
4. «Me imagino que la nodriza está hecha para viajes largos y el módulo de aterrizaje solo para aterrizar, ¿no? Entonces debería ser la nodriza la que viaje a la estación».

Respuesta corta: en la vida real **no hay hangares presurizados para naves grandes**. Las naves grandes se
atracan a un puerto y se sujetan con un brazo o con una estructura abierta, al vacío, y se trabaja en ellas
con robots y paseos espaciales. Así que la nodriza entra en un **dique seco orbital**: una celosía abierta
con brazos, focos y umbilicales, a su medida. El hangar presurizado sigue siendo para el módulo y las naves
pequeñas.

## Cómo se hace en la vida real

### Atraque con brazo (berthing) y puertos de acople (docking) en la ISS

- **Docking**: la nave llega sola hasta el puerto y lo engancha (Soyuz, Crew Dragon, Starliner en los IDA
  con la norma IDSS). Es lo que ya hacen el módulo y la nodriza en el juego.
- **Berthing**: la nave se para a unos metros, **Canadarm2** la agarra y la coloca en un puerto **CBM**,
  y 16 pernos motorizados la aprietan. Así llegaban HTV, el Dragon de carga y Cygnus. El brazo mide 17 m,
  tiene dos efectores de enganche y mueve hasta **116 000 kg**.
- La pieza que sujeta todo es la **celosía integrada (ITS)**: una viga abierta de unos **109 m**, al
  vacío, con un carro que lleva el brazo a lo largo de ella. Nada de eso está presurizado.

### ¿Por qué no hay hangares presurizados para naves grandes?

- Las naves están hechas para el vacío: radiadores, mantas térmicas, propulsores y paneles no esperan aire
  por fuera. Presurizar alrededor no les aporta nada que un brazo y un traje no den.
- **Masa**. Una pared presurizada trabaja a tracción: σ = p · r / t. Cuanto más grande el radio, más
  gruesa la pared, y la superficie crece con el cuadrado. Lo calculamos para la nodriza (abajo).
- **Aire**. Llenarlo cuesta miles de toneladas y cada vez que se abre la puerta hay que bombearlo o
  perderlo. La ISS entera tiene unos 916 m³ presurizados.
- **La puerta**. Haría falta una compuerta de más de 100 m que selle a una atmósfera.

### Diques y astilleros orbitales en conceptos serios

- **Celosías y estructuras abiertas.** La NASA estudia montar en órbita grandes celosías con robots
  (ensamblaje de estructuras reticuladas). Un «space dock» de verdad es eso: un marco abierto alrededor de
  la nave, con brazos que la sujetan y la recorren.
- **Servicio en órbita.** **MEV-1** de Northrop Grumman se acopló en 2020 a Intelsat 901 (un satélite que
  no estaba hecho para eso) y le dio cinco años más. **OSAM-1** (NASA) iba a agarrar Landsat 7 con brazos,
  abrirle el depósito y repostarlo, y a montar estructura con el robot SPIDER. Se canceló el 1 de marzo de
  2024 tras unos 2 000 M$: el servicio robótico es posible, pero caro y difícil.
- **Orbital Reef** (Blue Origin y Sierra Space): estación comercial con puertos para naves visitantes,
  también al vacío.

### O'Neill y el toro de Stanford: atracar en el eje

En las colonias que giran, las naves atracan en el **eje de giro**, donde no hay gravedad ni velocidad
lateral. El toro de Stanford (NASA SP-413) tiene un cubo de 130 m en el eje y, en su polo, un **módulo de
atraque que no gira**, de 15 × 60 m. El cilindro de O'Neill hace lo mismo en sus tapas. La nodriza ya
copia esa idea: su puerto está en la proa, en el eje, y los anillos giran detrás. El dique la sujeta por
la espina, que no gira.

## Decisión: un dique seco abierto, a la medida de la nodriza

| | Hangar presurizado (estación) | Dique seco (nuevo) |
|---|---|---|
| Para | El módulo de aterrizaje (5 × 3 × 3 m, 680 kg) y naves pequeñas | La nodriza (152,7 m, anillos de 57 m de radio, ~877 t) |
| Tamaño | 20 × 14 × 20 m | Celosía cuadrada de **128 × 128 × 143 m** |
| Aire | Sí, con esclusa | No: al vacío, como la celosía de la ISS |
| Cómo entra | El brazo de la estación la mete desde su puerto (como Canadarm2) | Se acerca por el eje del puerto, entra en el marco y engancha la proa al IDA |
| Qué la sujeta | La cuna del hangar | El puerto IDSS de la proa y **ocho brazos** que se cierran sobre la espina |

El dique (`modules/station/domain/dry-dock.ts`, datos en `station/data/dry-dock.ts`) se calcula de la
nodriza tal como queda atracada en el puerto axial del Nodo 2:

- **Marco**: cuatro largueros en las esquinas y aros cuadrados a **64,2 m** del eje (57 m de los anillos,
  6 m de holgura porque giran y 1,2 m de media viga). Va de 16 m detrás de la proa (libre del puerto del
  módulo en el Nodo 2 y del puerto del módulo en la propia nodriza) hasta 6 m detrás de la cola.
- **Brazos**: cuatro en cada tramo de espina sin nada que sobresalga y de al menos 8 m. Salen dos tramos:
  entre el anillo gemelo y los radiadores, y entre los propulsores y el escudo. Allí hay aros.
- **Umbilicales**: energía, datos y xenón desde el primer aro hasta la espina junto a la esclusa.
- **Focos**: uno en cada esquina de cada aro, apuntando a la nave. Se encienden cuando la nodriza viene y
  se quedan encendidos con ella dentro.
- **Unión con la estación**: dos puntales desde la cara de proa de la celosía, a 20 m del centro.

Los tests (`dry-dock.test.ts`, EST-25) comprueban que el marco contiene la nave, que ninguna viga pasa a
menos de 5 m de ella, que los brazos llegan a la espina sin cruzar un anillo ni un radiador, que el camino
del módulo a su puerto (nadir del Nodo 2) queda a más de 15 m y que nada choca con las alas ni los
radiadores de la estación.

El dique es solo estructura y dibujo. No es un obstáculo para las rutas (decisión abierta 3).

### ¿Y un hangar presurizado de verdad? Posible, pero carísimo (EST-26)

Un cilindro de Kevlar 49 alrededor de la nodriza: radio de 66 m y 165 m de largo. El Kevlar 49 aguanta
3 600 MPa y pesa 1 440 kg/m³, y se usa con el factor 4 de los módulos hinchables de la NASA:

| Presión | Volumen | Pared | Tela | Aire | Total | Comparación |
|---|---|---|---|---|---|---|
| 101,3 kPa (1 atm) | 2,26 millones de m³ | 7,4 mm | 1 025 t | 2 702 t | **3 727 t** | 4,3 veces la nodriza, unas 9 ISS (~420 t) |
| 34 kPa (1/3 atm) | 2,26 millones de m³ | 2,5 mm | 344 t | 907 t | **1 251 t** | 1,4 veces la nodriza, 3 ISS |

Y eso sin la protección contra micrometeoritos, sin aislamiento térmico, sin la compuerta de 130 m ni sus
juntas, y sin las bombas para recuperar el aire cada vez que entra o sale. Como comparación, el Bigelow B330
pesa unos 20 t por 330 m³ de casco con todo eso. A unos 1 500 $/kg (Falcon Heavy a órbita baja), solo
lanzar la tela y el aire costaría entre 1 900 y 5 600 millones de dólares.

Es **plausible** como obra gigante, pero no aporta nada que el dique abierto no dé: la nodriza está hecha
para el vacío y el trabajo de fuera ya se hace con brazos, robots y trajes. Los números salen de
`pressurisedEnclosure` (σ = p · r / t, aire como gas ideal a 295 K).

## La nodriza viaja; el módulo aterriza

- **En el mapa** (puente o consola NAV del anillo), la estación siempre la vuela la nodriza, lleve el
  módulo o no. Si el módulo está posado en un asteroide o acoplado en la estación, la nodriza va sola y él
  se queda donde está. A un asteroide la nodriza sigue yendo solo con el módulo a bordo: aparca y el módulo
  baja (`Navigator.carrierFlies`).
- **En «Ir a una tarea» (viaje)**, para llegar a la estación se va a una consola de navegación (la del
  anillo o la del puente) y la nodriza hace su viaje comprimido y entra en el dique seco. Después se cruza
  la espina, la escotilla de atraque y los saltos de la estación. **El módulo ya no vuela a la estación.**
  Solo vuelve a la nodriza, desde un asteroide o desde donde se quedó (`journey-world.ts`, EST-27).
- Los tiempos salen de datos reales: el plan de empuje continuo de los propulsores de la nodriza
  (`planContinuousBurn`, su empuje y su masa), comprimido en el presupuesto de tiempo real de los viajes
  (`legBudgets`, tope de 75 s), y unos 5 s del atraque, que va a la cámara rápida de la nodriza. Desde el
  arranque del juego (junto a Bennu) el vuelo dura 15 s.
- El reto de programar el viaje de la nodriza a la estación termina en «entrar en el dique seco por el eje
  del puerto a 0,10 m/s» y «cerrar los ganchos IDSS y los brazos del dique».

## Verlo

- **Ver trayecto** (todas las naves: nodriza, módulo y sonda). Mientras una nave vuela sola con un plan
  cargado, la ficha de viaje tiene «Ver trayecto». En un viaje a una tarea está en la barra del viaje, porque
  la ficha se oculta allí para no repetirla. Pone la pantalla entera en una cámara que sigue a la nave
  desde atrás, con el destino al fondo. La ruta planificada se dibuja en cian con un anillo verde donde
  termina. Se ocultan los paneles de la sala y quedan «Parar», la ficha y «×». La ruta es la que se cargó al
  despegar (`Navigator.route`; para la sonda y los aterrizajes se guarda al empezar). Antes era una
  ventanita «Ver» que solo seguía a la nave; ahora es la misma vista para todas.
- **Desde la estación**:
  - La escotilla de la nodriza tiene «Mirar el dique por la ventanilla». Las escotillas de la ISS tienen
    una.
  - La consola del hangar tiene «Cámaras del dique seco».
  - Las dos abren la vista de fuera a pantalla completa (arrastrar la gira). Una línea dice qué hay:
    «brazos cerrados en la espina, umbilicales de energía, datos y xenón conectados» o «Dique vacío».

## Viaje o teletransporte: en la lista de tareas

El ajuste `taskTravel` sale de la esterilla y pasa a un interruptor **Viaje / Teletransporte** arriba de
la lista de tareas. Se guarda igual en `codeship.ajustes` y es su único sitio. El aviso del teletransporte
ahora dice «Teletransporte (elegido en Tareas)».

## Fuentes

Están en `DRY_DOCK_SOURCES` (`src/modules/station/data/dry-dock.ts`).

- CBM: https://en.wikipedia.org/wiki/Common_Berthing_Mechanism
- Canadarm2 (ASC): https://asc-csa.gc.ca/eng/iss/canadarm2/about.asp
- Docking frente a berthing (ISS National Lab): https://issnationallab.org/?p=36525
- Celosía de la ISS: https://www.nasa.gov/image-article/integrated-truss-structure-diagram/
- MEV-1 e Intelsat 901: https://www.nasaspaceflight.com/2020/02/northrop-grumman-history-mission-extension-vehicle-docks-satellite/
- OSAM-1: https://en.wikipedia.org/wiki/OSAM-1
- Orbital Reef: https://www.blueorigin.com/news/orbital-reef-commercial-space-station
- Toro de Stanford: https://en.wikipedia.org/wiki/Stanford_torus
- Ensamblaje de grandes celosías (NASA): https://ntrs.nasa.gov/api/citations/20160007719/downloads/20160007719.pdf
- B330: https://en.wikipedia.org/wiki/B330
- Kevlar: https://en.wikipedia.org/wiki/Kevlar

## Preguntas abiertas para el diseñador

1. **El módulo y la estación.** El módulo ya no vuela a la estación en «Ir» ni en el mapa. Pilotado a mano
   todavía puede acoplarse en su puerto (y el brazo meterlo en el hangar). ¿Lo dejamos así o lo quitamos
   del todo? Entonces el módulo viajaría siempre dentro de la nodriza o en el hangar.
2. **El módulo en el hangar.** Si la nodriza lleva el módulo acoplado al entrar en el dique, el módulo
   sigue en el puerto de ella. ¿Queremos que el brazo lo pase al hangar presurizado al llegar?
3. **El dique y las rutas.** El marco se dibuja y se calcula, pero las rutas del módulo y de la sonda no lo
   esquivan (solo la esfera de la estación). ¿Lo añadimos como obstáculo de vigas?
4. **Ver trayecto a pantalla completa.** Tapa la sala y su HUD mientras está abierto. ¿Preferís la
   ventanita de antes en una esquina? Es un solo valor (`TripPreview.full`).
