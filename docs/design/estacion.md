# Estación espacial: materiales, planos, fabricación y hangar

Petición de Berón (2026-11-12): «Las piezas nuevas se fabrican con los recursos obtenidos. Tenemos planos y, cuando tenemos los recursos necesarios, podemos construirlas. Podría haber una estación espacial con la maquinaria para crear componentes, y allí se guardarían también todas nuestras sondas y naves».

## Cómo se juega

```
Persuadir un asteroide → la bodega se llena con su roca real → Descargar en la estación
      → Refinería (cadena de retos + horas de máquina) → materiales refinados
      → Planos: Fabricar (cadena de retos + horas) → la pieza o la sonda llega al hangar
      → Bahía de la nave: montar la pieza (necesita tenerla en el hangar; la vieja vuelve al hangar)
```

## Cómo se llega

- **Estación Nueva Polana**, aparcada a unos 1,2 km de Bennu, a 0,9 km del punto de salida. Se ve por la ventana izquierda de la cabina: celosía con paneles solares, dos módulos, la torre de la refinería y el hangar con la puerta iluminada. Posición, tamaño y distancia son **valores de juego** (`POLANA_STATION` en `modules/station/data/station.ts`).
- **Botón «Estación · 0,9 km»** en la barra de vuelo de la cabina. Por ahora abre la estación **desde cualquier sitio** (acceso remoto de prueba, para probar sin volar hasta allí). A menos de 400 m la cabecera dice **Atracada** y la sonda aparece aparcada en el hangar 3D. Con el mapa de navegación, la estación es un destino más: `StationSite` tiene `id`, `name`, `position`, `radiusM` y `dockingRangeM`, y `Station.isAlongside(p)` dice si una nave está atracada.
- **Volver** o Esc regresan a la cabina. Mientras tanto la sonda queda sin órdenes, igual que en la bahía.

## La pantalla

En el móvil, arriba se ve el hangar en 3D y abajo hay un panel con cuatro pestañas. En horizontal, el panel va a la derecha. El hangar muestra la sonda (si está atracada), las tres máquinas, que se encienden mientras trabajan, el estante de piezas de repuesto y las sondas fabricadas. Se gira arrastrando.

| Pestaña | Qué hay |
| --- | --- |
| **Materiales** | La bodega de la nave y el botón **Descargar la bodega en la estación**. Debajo, el almacén: roca sin refinar, refinados e importados, cada uno con su nota y su fuente. Al final está la **refinería**: cada proceso con lo que entra y lo que sale en el lote posible, y el botón **Refinar**. |
| **Planos** | Lo que se puede fabricar ya y lo que no. Cada plano indica su máquina, el proceso real con su fuente, la masa y las horas. Los materiales salen en verde si hay suficientes y en rojo con lo que falta («faltan 4,1 kg»). También dice cuántas piezas iguales hay en el hangar. |
| **Fabricación** | La cola de cada máquina (refinería, fundición e impresora 3D de metal), con barra de progreso y las horas que quedan. Cada máquina hace un trabajo detrás de otro, y las tres trabajan a la vez. |
| **Hangar** | Las naves y sondas: la **nodriza**, el **Explorer** y las sondas fabricadas, con dónde está cada una. Debajo, las piezas de repuesto. |

Las horas de máquina corren con el mismo reloj que la vida a bordo, un día de juego cada 40 s (`STATION_TUNING.hoursPerSecond`).

## Materiales: de la roca de Bennu al almacén

Hasta ahora, Bennu solo declaraba agua y carbono. Ahora declara también la roca que forma el resto de su masa, que es lo que llena la bodega:

| En la bodega (500 kg) | Fracción | Fuente |
| --- | --- | --- |
| Agua en minerales hidratados | 1–6,2 % | [Wikipedia: Bennu](https://en.wikipedia.org/wiki/101955_Bennu) |
| Carbono | 4,5–4,7 % | Muestra devuelta ([Lauretta et al. 2024](https://arxiv.org/abs/2404.12536), tabla 4) |
| Hierro (en magnetita y sulfuros de Fe-Ni) | 18,3 % | Condritas CI ([Lodders 2003](https://ui.adsabs.harvard.edu/abs/2003ApJ...591.1220L/abstract), tabla 3: 182 800 ppm), porque la muestra de Bennu es de tipo CI |
| Níquel (en sulfuros de Fe-Ni) | 1,06 % | Lodders 2003: 10 640 ppm |
| Silicatos (filosilicatos) | 55–65 % | Lauretta et al. 2024: ≈80 % del volumen son serpentina y esmectita. La fracción en masa es lo que queda tras restar lo demás (estimación de juego) |

Los miembros pequeños de la familia de Nueva Polana usan la misma composición, marcada como «asumida igual a la de Bennu». La roca común (hierro ligado, níquel y silicatos) **no cuenta para la riqueza** (`resourceRichness`), así que el duelo con Bennu es igual de difícil que antes. Hay un test que lo comprueba.

Los **kits importados** (electrónica, válvulas y el lecho catalizador S-405 de iridio sobre alúmina) aún no se pueden hacer con roca. La estación empieza con 6. Se basa en la idea de arrancar la industria espacial con un sistema «subreplicante» abastecido desde la Tierra ([Metzger et al. 2013](https://arxiv.org/abs/1612.03238)).

## Refinería

Cada lote es una cadena de retos. Primero hay que **predecir cuánto sale** con la proporción real del proceso. Después viene **un reto por paso**, y los pasos con un valor real (las temperaturas) piden ese valor. Si falta roca para un lote entero, se refina el lote parcial que permita el almacén (mínimo 10 %).

| Proceso | Lote (valores de juego) | Pasos y valores reales | Fuentes |
| --- | --- | --- | --- |
| Extracción térmica del agua | 20 kg de agua hidratada → 18 kg de agua · 6 h | Triturar, hornear en vacío y condensar en la trampa fría | [Pohl y Britt 2024](https://doaj.org/article/198ccfc372ab4952abdfa1e23f2e25cb) (deshidratación de serpentinas), [Metzger, Zacny y Morrison](https://arxiv.org/abs/2306.03776) (extracción térmica de volátiles) |
| Reducción y proceso carbonilo | 100 kg de hierro en mineral + 6 kg de níquel en mineral + 4 kg de carbono → 80 kg de hierro + 4,8 kg de níquel · 12 h | Ni + 4 CO → Ni(CO)₄ a **50–60 °C**; se descompone a **220–250 °C**. Los carbonilos de Fe y Ni se separan por destilación | [Proceso Mond](https://en.wikipedia.org/wiki/Mond_process), [U. de Arizona para la NASA](https://ntrs.nasa.gov/citations/19910015913) (carbonilos de metal meteorítico) |
| Electrólisis de regolito fundido | 100 kg de silicatos → 30 kg de oxígeno + 55 kg de cerámica de escoria + 3 kg de hierro · 16 h | Fundir **a unos 1600 °C**. El oxígeno sale en el ánodo y el hierro y el silicio, en el cátodo | [Sirk, Sadoway y Sibille 2010](https://ntrs.nasa.gov/citations/20110008535), [Muscatello 2017](https://ntrs.nasa.gov/citations/20170001458) |

Ninguna refinería produce más masa de la que entra (hay un test).

## Planos

Hay un plano para **cada pieza del catálogo** (`ALL_PARTS`) y dos tanques nuevos que solo se fabrican en la estación (MMH/NTO de 450 kg e hidracina de 120 kg). También hay uno para la **sonda de prospección** (30 kg, valor de juego), que se guarda en el hangar.

- **Material** = masa de la pieza ÷ rendimiento (0,8, valor de juego: viruta, soportes y descartes), repartido según la receta del tipo de pieza. Más los kits.
- **Motores bipropelentes** (R-4D): 50 % de níquel, 40 % de hierro, 10 % de cerámica y 2 kits. Se hacen en la **impresora 3D de metal**, por láser y capa a capa, como la [impresora de metal de la ESA en la ISS](https://www.tomshardware.com/3d-printing/scientists-print-3d-metal-parts-in-space-for-the-first-time-a-key-ability-for-long-distance-long-duration-missions) (primera pieza de acero inoxidable en agosto de 2024).
- **Propulsores de hidracina** (MR-104H y RCS): 60 % de hierro, 30 % de níquel y 10 % de cerámica. Llevan un kit con el catalizador [S-405](https://en.wikipedia.org/wiki/Monopropellant_rocket). El RCS se fabrica como **juego de 24**, porque al cambiarlo se cambian los 24, y necesita 2 kits más.
- **Tanques**: un forro de hierro envuelto en fibra de carbono ([COPV](https://en.wikipedia.org/wiki/Composite_overwrapped_pressure_vessel)), con 85 % de hierro, 15 % de carbono y 1 kit. Se hacen en la **fundición**.
- **Propulsores de la nodriza** (X3, AEPS, NEXT-C y VASIMR VX-200; datos y fuentes en [nave-nodriza.md](nave-nodriza.md), «Propulsores intercambiables»). Se imprime **solo el cabezal**, con su masa real (230, 50, 14 y 500 kg). La fuente de potencia, el cátodo y el control de flujo de xenón llegan en kits importados: 3 kits, 6 para el X3 (su fuente es de 100 kW) y 10 para el VX-200 (imán superconductor y generadores de RF). Recetas de juego: Hall, 70 % de hierro (circuito magnético), 20 % de cerámica (canal) y 10 % de níquel; iónico, 50 % de hierro, 30 % de carbono (rejillas), 10 % de cerámica y 10 % de níquel; VASIMR, 50 % de hierro, 20 % de níquel, 20 % de cerámica y 10 % de carbono. Horas: 12 + ½ por kg (127 h el X3). Un X3 pide 287,5 kg de material: hace falta refinar mucho Bennu. El VX-200 se puede fabricar, pero no montar, porque usa argón (ver la pregunta abierta).
- Las horas son valores de juego: unas 6 + 5 por kg en la impresora y unas 4 + ½ por kg en la fundición.

Al empezar se puede fabricar un tanque o el MR-104H, pero no el juego de 24 MR-107T. Con una carga de Bennu, un lote de carbonilo y uno de electrólisis ya alcanza (hay un test que lo comprueba). El níquel es escaso (≈1 % de la roca) y es lo que limita los motores.

**Retos de fabricar** (`fabricationChore`):

1. **Predecir** el material: `material = masaPieza / rendimiento`, con la masa real de la pieza. Los errores típicos son multiplicar o sumar.
2. **Predecir** lo que quedará en el almacén del material que más se usa, con los números reales del almacén (`almacen.hierro = 30 kg; almacen.hierro = almacen.hierro − 13,81 kg`).
3. **Ordenar** los pasos del plano.

Si se resuelven, se toman los materiales y el trabajo entra en la cola. Si se fallan, no se gasta nada.

## Bahía de la nave: las piezas salen del hangar

`bayActions` recibe ahora el hangar (`PartSupply`). Una pieza que está en el hangar se ofrece como siempre, con «n en el hangar». Si no está, sale **bloqueada** y la bahía dice «no hay en el hangar: fabrícala en la estación». Al montarla, la pieza sale del hangar y **la vieja vuelve a él**, así que se puede volver a cambiar. Sin hangar (por ejemplo en los tests antiguos), todo sigue siendo libre como antes.

Los **propulsores de la nodriza** siguen la misma regla en la pestaña **Nodriza**, y además solo con la sonda acoplada. Cada módulo de propulsores (dorsal y ventral) ofrece añadir uno, quitar uno o montar n de otro tipo, con los que haya en el hangar. Los que salen vuelven al hangar (`applyDriveRefit`). En la pestaña Hangar de la estación aparecen como «Propulsor X3 × 9».

## Arquitectura

- `modules/station/domain`: `MaterialStock`, `Blueprint`, `RefineProcess`, `STATION_TUNING`, `Hangar` y `Station` (descargar, refinar, fabricar, colas por máquina y `tick(horas)`).
- `modules/station/application`: `StationOps` (planos con lo que falta, refinería, sesiones de retos) y `challenges.ts` (`fabricationChore` y `refineChore`, que reutilizan `ChoreRun`, `stepChain` y `DuelView`).
- `modules/station/data`: materiales y mapa desde la carga, procesos, planos, estación y fuentes.
- Adaptadores: `adapters/three/station-model.ts` (`StationModel` en la región y `StationScene` dentro del hangar) y `src/station-screen.ts` (pestañas y retos).
- Cambios en archivos compartidos: Bennu y Nueva Polana (composición), `resources.ts` (pesos), `Expedition.unloadCargo()`, `bay.ts` (`PartSupply`), `ship-bay.ts` (consume del hangar), `start-region.ts` (sin rocas sobre la estación), `parts.ts` (dos tanques nuevos) y `main.ts`.

## Capturas

`docs/screenshots/estacion-*-{desktop,mobile}.png`, de 0 (cabina y estación vista por la ventana) a 7 (bahía con pieza disponible y pieza bloqueada). La sonda se coloca junto a la estación por código, porque aún no hay piloto automático.

## Preguntas abiertas para Berón

- **¿Acceso solo atracado?** Hoy el botón abre la estación desde cualquier sitio. ¿Lo limitamos a estar atracado (a menos de 400 m) cuando haya mapa o piloto automático? ¿Y las piezas del hangar solo se montan estando allí, o la nodriza lleva un almacén propio?
- **Kits importados.** ¿Cómo se consiguen más: comercio con el santuario, misiones de Nevaeh o, más adelante, fabricar electrónica?
- **Usos del agua y del oxígeno.** Se acumulan, pero aún no sirven para nada. ¿Rellenan el soporte vital de la nodriza, o hacen propelente (H₂/O₂ con un motor nuevo)? ¿Se repone el pienso o el medio de cultivo con carbono?
- **Sondas.** La sonda fabricada se queda en el hangar. ¿Qué hace: prospectar asteroides antes del duelo, transportar carga, servir de nodo de la nano_net?
- **Montaje fallido.** Si se fallan los retos de fabricar, no se pierde material. ¿Queremos que se pierda una parte (desecho)?
- **Propulsores de la nodriza.** ¿Damos a la nodriza tanques de argón o de kriptón para que el VASIMR (y el X3 con kriptón) sirvan de algo, o quitamos el plano del VX-200 hasta entonces? ¿Mezclar tipos en un mismo módulo? ¿Encender a media potencia (los Hall se pueden regular) en vez de solo unidades enteras?
- **Colisión con la estación.** La estación aún no es un obstáculo físico para la sonda ni tiene puerto de atraque propio, como el de la nodriza.
