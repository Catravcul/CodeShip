# La nodriza es una Starship

> **Estado (2026-11-16):** con el interruptor «solo real» encendido (por defecto, [`src/core/realism.ts`](../../src/core/realism.ts))
> la nave de viaje es una **Starship**, vehículo **en desarrollo**. Con `?ficcion` vuelve la nodriza de anillos
> ([nave-nodriza.md](nave-nodriza.md)). Lo que el interruptor apaga y cómo podría volver está en
> [pendientes.md](../pendientes.md).

Decisión de Berón (2026-11-16): «empezamos de cero con naves y procesos reales». La opción elegida en
[naves-reales.md](naves-reales.md) es la Starship: es el único vehículo con un volumen habitable de cientos de
metros cúbicos que se está construyendo y volando. Lo que SpaceX ha publicado (casco, motores, tanques,
volumen) va con sus cifras y sus fuentes. Lo que no ha publicado (cómo es por dentro una Starship tripulada)
es **distribución nuestra**, y el juego lo dice así.

## Fuentes y cifras

| Qué | Cifra | Fuente |
| --- | --- | --- |
| Casco | 9 m de diámetro, 52,1 m de alto (bloque 2), acero inoxidable con losetas térmicas en la cara de barlovento | [SpaceX Starship (nave)](https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)) |
| Masa en vacío | 85 t (bloque 2) | ídem |
| Propelente | 1500 t: unas 1170 t de oxígeno líquido y 330 t de metano líquido | ídem |
| Volumen presurizado | 614 m³ | ídem |
| Motores | 3 Raptor 2 (nivel del mar) y 3 Raptor de vacío (RVac) | ídem; [Raptor](https://en.wikipedia.org/wiki/SpaceX_Raptor) |
| Raptor de vacío | 2530 kN, Isp ≈ 380 s | [Raptor](https://en.wikipedia.org/wiki/SpaceX_Raptor) |
| Raptor 2 | 2260 kN a nivel del mar, Isp 327 s, 1630 kg | ídem |
| Mezcla | O/F 3,6 en masa | ídem |
| Aletas | dos delanteras y dos traseras, 17 m de envergadura | [SpaceX Starship (nave)](https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)) |
| Versión lunar (HLS) | paneles solares en el casco, dos esclusas, 2–4 tripulantes, puerto de acople en el morro | [Starship HLS](https://en.wikipedia.org/wiki/Starship_HLS) |
| Puerto de acople | IDSS, andrógino, 800 mm de paso | [IDSS (NASA)](https://ntrs.nasa.gov/citations/20220011643) |

Los datos están en [`mothership/data/starship.ts`](../../src/modules/mothership/data/starship.ts) con su fuente
y una nota en cada cifra. Lo que es nuestro también lo dice:

- **La masa del Raptor de vacío** no está publicada: tomamos la del Raptor 2 (1630 kg).
- **El interior** (16 bastidores tipo ISPR de unos 700 kg cargados): estimación nuestra, 11,2 t.
- **La tripulación**: 4, el máximo que se anuncia para el HLS. Doménica es la que se juega.
- **El puerto del módulo de aterrizaje** en la panza, junto a la cubierta 3, es nuestro. El HLS solo tiene el
  del morro, que aquí sirve para atracar en la estación.
- **La potencia eléctrica** de los paneles del HLS no está publicada. El puente lo dice («Sin publicar») en vez
  de inventar una cifra. Los motores son químicos y no gastan electricidad.

## Por fuera

[`adapters/three/starship-model.ts`](../../src/adapters/three/starship-model.ts): un cilindro de 9 m (media
cara de acero, media de losetas negras), la ojiva de 10 m del morro con la franja de los depósitos de
cabecera, las tres ventanas de la cubierta de vuelo, la franja de células solares del HLS, las cuatro aletas,
3 toberas de Raptor 2 (1,3 m) en el centro y 3 de Raptor de vacío (2,4 m) fuera, y los dos puertos IDSS con
sus luces de aproximación. Es procedural y barato: unos cuantos cilindros, una superficie de revolución y
cajas con materiales compartidos. En la bahía de la estación se dibuja la misma maqueta.

## Por dentro: distribución nuestra

[`mothership/data/starship-interior.ts`](../../src/modules/mothership/data/starship-interior.ts). Tres cubiertas
apiladas en la sección de carga, como una Starship de pie en la Luna: **la proa es «arriba»**. Cada cubierta
tiene un pasillo de 4 × 2,6 × 4 m entre bastidores tipo ISPR, con 0,5 m de suelo entre una y otra y una
escotilla de 1,27 m (la CBM de la ISS) en el centro. Con la cubierta de vuelo del morro (un tronco de cono de
2,5 m) suman unos 605 m³ de los 614 publicados.

| Cubierta | Qué hay | Base real |
| --- | --- | --- |
| 1 · cocina y trabajo | cocina (agua caliente y fría, calentador), dos puestos de trabajo (tareas y registro de misiones), la esterilla (yoga y ajustes), la escotilla del techo a la cubierta de vuelo, el túnel del morro a la estación; bastidores OGS e ITCS y el puesto de incendios | cocina de la ISS; bastidores ISPR |
| 2 · camarotes y aseo | cuatro camarotes de 2,1 m³, cuartos en los que se entra (dos a babor y dos a proa; como los de Harmony, distribución nuestra), el aseo con flujo de aire (WHC), el refugio de agua contra tormentas solares; bastidor WRS | Harmony; WHC de Tranquility |
| 3 · ejercicio y esclusa | cinta T2 en el suelo, ARED en una pared, bicicleta CEVIS en la otra, la esclusa de tripulación (trajes y escotilla en un puesto, en desarrollo como la del HLS: los paseos salen de aquí con la nave atracada, [paseo-espacial.md](paseo-espacial.md)), la escotilla del módulo de aterrizaje; bastidor AR, la consola de soporte vital, almacén | ejercicio de la ISS |

El **catálogo de especies** (rama `catalogo-especies`, [catalogo-especies.md](catalogo-especies.md)) tiene sus ranuras
de rack en la Starship: el terminal, con el hábitat de roedores y el estante de las colonias, en la pared de popa de
la cubierta 2, y el **hábitat acuático** (como el AQH de JAXA) en un hueco de bastidor de la pared de popa de la
cubierta 3, que ofrece cuidar lo que se adopta. `StarshipInterior.rack` hace aquí lo que `RING_RACK_HOST` en el anillo.

**Soporte vital propio** ([soporte-vital.md](soporte-vital.md)). Los bastidores se colocan con
`eclssFixtures(cubierta, STARSHIP_ECLSS[n])` en las paredes de babor y estribor, como en la estación; el refugio
de agua es el bastidor `sv-refugio` de la pared de popa de la cubierta 2 («Resguardarse»). La Starship tiene su
propio `LifeSupportGame` con `STARSHIP_LIFE_SUPPORT` (`mothership/data/starship.ts`): Doménica sola, los 614 m³
publicados como aire libre, y agua, comida, tanques y repuestos como la estación (valores de juego: el soporte
vital de Starship no está publicado). Corre con el reloj de la estación; sus averías salen en la lista de tareas
en el grupo «nave» («Starship · Soporte vital…») y «Ir» salta hasta el bastidor. La galería y el portátil de los
puestos de trabajo usan los modelos `galeria` y `consola` del mismo kit.

Se recorre con el mismo motor de 0 g que la estación ([ingravidez.md](ingravidez.md)): asideros, saltos y
escotillas. Las tarjetas de las máquinas son las de siempre, con la clase `sts` para no mezclarse con las de la
estación. Al entrar desde el módulo de aterrizaje se aparece en la cubierta 3; desde la estación, en la 1.
**Primera persona por defecto**, como en todos los interiores.

### La vida a bordo es la de la ISS

- **Comida**: la despensa lleva envases rehidratables, bolsas termoestabilizadas y tortillas
  ([`kitchen/data/iss-food.ts`](../../src/modules/kitchen/data/iss-food.ts)); se cocina rehidratando y calentando.
  No hay productos frescos: el huerto real (Veggie, APH) es de la fase 2.
- **Ejercicio**: los intervalos y la fuerza de siempre, en la T2, el ARED y la CEVIS.
- **Dormir y asearse**: en los camarotes y en el WHC. Dormir es el reto de seis pasos de su camarote ([compartimentos.md](compartimentos.md)).
- **Siempre 0 g**: no hay anillos ([pendientes.md](../pendientes.md)).

## Capa de presentación: escala y separación como ajustes

Corrección de Berón (19:54): los datos van a su tamaño real y el dibujo es un ajuste, no un retoque a mano de
cada sala. [`src/core/presentation.ts`](../../src/core/presentation.ts) lee de los ajustes guardados
(`codeship.ajustes`) dos opciones que se cambian en la esterilla:

- **Escala de interiores**: Real (1×) o Cómoda (1,5×, por defecto). Mueve `WORLD_SCALE`
  ([`src/core/scale.ts`](../../src/core/scale.ts)).
- **Separación**: Real o Amplia (2 m, por defecto). Con «Amplia», `spreadInteriorPlan`
  ([`station/domain/presentation.ts`](../../src/modules/station/domain/presentation.ts)) separa las cosas que se
  usan hasta que queden a 2 m unas de otras: alarga las salas y mueve las máquinas, pero no cambia el tamaño de
  las máquinas. Funciona igual con cualquier plano, no solo con este.

Se aplican al recargar. A tamaño real, el suelo y el techo de una cubierta de 2,6 m quedan a 1,35 m de lo que
hay en las paredes: por eso «Amplia» es el valor por defecto.

## Propulsión, viajes y Δv

[`mothership/domain/mothership.ts`](../../src/modules/mothership/domain/mothership.ts) ya no supone anillos, reactor
ni radiador: son opcionales y la Starship no los lleva. Los motores químicos (`ChemicalDrive`) dan el plan de
empuje: en el crucero entre asteroides encienden los **3 Raptor de vacío** (7,59 MN, Isp 380 s); los Raptor 2
son los de aterrizar y no cuentan. El Δv es el de Tsiolkovsky con los tanques llenos sobre la masa en seco:
unos **10,5 km/s** sin carga (SpaceX da unos 6,9 km/s con 100 t de carga).

Una nave eléctrica empuja todo el camino. La Starship acelera a 4–5 m/s² y gastaría los tanques en un salto,
así que **acelera, va por inercia y frena**
([`navigation/domain/transfer.ts`](../../src/modules/navigation/domain/transfer.ts), `planContinuousBurn` con
velocidad de crucero). La velocidad de crucero es la **real de las operaciones de proximidad**: **40 cm/s**, la de
Hayabusa2 al bajar desde su *home position* ([JAXA, 2018-09-20](https://www.hayabusa2.jaxa.jp/en/topics/20180920e));
OSIRIS-REx llegó a Bennu a 4 cm/s. Un salto de 9 km dura unas 6 h 15 min de juego (6 min reales a ×60) y gasta
0,8 m/s de Δv, unos 340 kg de propelente: los depósitos dan para miles de saltos. Antes era un valor de juego
(media hora de inercia, hasta 500 m/s).

El reto de **programar el viaje** de la nodriza tiene su versión química (`trip-chore.ts`): ordenar orientar,
encender los Raptor de vacío, ir por inercia, dar la vuelta antes de los últimos metros y frenar (el distractor es
«empujar todo el camino»); el Δv es 2 × crucero; el tiempo, 2·v/a más la inercia; el punto de frenar, v²/(2a).
Las páginas de las pantallas del puesto de pilotaje (propulsión, energía y vida) y las tarjetas del mapa dicen «metano y oxígeno» y «Raptor
de vacío» en vez de «xenón» y «propulsores eléctricos».

## Repostar: oxígeno y metano

En la estación, el repostaje de la nodriza tiene dos líneas: **oxígeno líquido** y **metano líquido**, que se
cargan en la proporción de los tanques ([`station/application/refuel.ts`](../../src/modules/station/application/refuel.ts)).
El oxígeno ya se hacía (electrólisis del regolito y del agua, CO₂ de cometa). El metano sale de una máquina
nueva de la planta de propelente: el **reactor de Sabatier** (CO₂ + 4 H₂ → CH₄ + 2 H₂O sobre níquel, el
mismo de la ISS), con el CO₂ de los cometas y el hidrógeno del electrolizador
([`station/data/propellant-processes.ts`](../../src/modules/station/data/propellant-processes.ts)). El ritmo de
trasvase (25 t/h) es un valor de juego: el trasvase en órbita entre Starships está anunciado, no hecho.

## El módulo de aterrizaje y la estación

El módulo de aterrizaje sigue siendo la Explorer (el módulo lunar Apolo llegará con la rama
`catalogo-montaje`). Se acopla al puerto de la panza y entra a la cubierta 3. Con la nodriza atracada en la
estación por el morro, el túnel de la cubierta 1 lleva a ella.

## Lo que falta o queda abierto

- ~~**«Ir» por las cubiertas**~~: hecho (2026-11-17, [viajes.md](viajes.md#trayectos-por-dentro-escotillas-que-se-abren)): el planificador conoce las cubiertas, la escotilla de la cubierta de vuelo y las de atraque, y ella abre cada escotilla.
- ~~**La cubierta de vuelo**~~: rehecha (2026-11-17, [puente.md](puente.md#la-cubierta-de-vuelo-de-la-starship)): una
  sala redonda en el morro, bajo los depósitos de cabecera y junto a las tres ventanas, con el puesto de pilotaje
  (pilotar a mano o por retos a cualquier destino), el de acople (acoplar a mano con la cámara del puerto, por retos,
  y desacoplar) y el de la sonda. El puente de consolas de antes queda solo para la nave de anillos (`?ficcion`).
- **Una sola tripulante jugable** en una nave para cuatro.
- **El dique seco** de la estación tiene la celosía medida para la nave de anillos.
- **La esclusa**: los paseos salen de ella con la nave atracada en la estación; con la nave lejos de la estación aún no hay paseo.

## Código y QA

- Dominio y datos: `mothership/domain/mothership.ts`, `mothership/data/starship.ts`,
  `mothership/data/starship-interior.ts`; presentación: `core/presentation.ts`, `station/domain/presentation.ts`.
- Adaptadores: `src/starship-interior.ts` (interior), `adapters/three/starship-model.ts` (exterior).
- Casos: HAB-23 (interior en 614 m³, alcanzable saltando), HAB-24 (bahía sin cubierta de cultivo), HAB-25
  (escala y separación como ajustes), NAV-08 (motores y Δv), NAV-09 (salto con inercia), REF-04 (repostar
  oxígeno y metano), REF-05 (Sabatier) y el recorrido **PX-28** (`starship`), con capturas en
  `docs/screenshots/starship-*-movil.png`.
