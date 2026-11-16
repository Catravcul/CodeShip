# Pendientes: lo que el interruptor «solo real» apaga

Decisión de Berón (2026-11-16): «empezamos de cero con naves y procesos reales». Con la corrección de las
19:54, la regla vale **solo para los interiores y los vehículos**: naves, estación, compartimentos y vida a
bordo. El juego de los asteroides **sigue igual**: duelos de mente, ira, ataques y persecución, viajes por
sí mismos, niveles de subyugación, nano_net. Las importaciones y los demás sistemas que no son interiores
también siguen.

El interruptor es `REAL_ONLY` en [`src/core/realism.ts`](../src/core/realism.ts) (encendido por defecto).
Con `?ficcion` en la URL se apaga y vuelve la nave de anillos tal como estaba: sirve para desarrollar y para
los recorridos marcados como ficción. **No se ha borrado código.** El dominio no lee el interruptor, así que
todos sus tests se siguen ejecutando.

Cada entrada dice qué era, dónde está el código y cómo podría volver. Las fases son las de
[naves-reales.md §3](design/naves-reales.md#3-plan-de-reconstrucción-desde-cero); las áreas del santuario,
las de [santuario-espacial.md](design/santuario-espacial.md).

## Lo que está apagado

| Qué | Qué era | Código | Cómo podría volver |
| --- | --- | --- | --- |
| **Anillos de gravedad, radio y ascensor** | Dos anillos de 56 m que giran en sentidos contrarios a 4 rpm (1 g en el suelo), con un radio y un ascensor desde el eje. Ningún vehículo real ni en desarrollo tiene gravedad artificial | `src/modules/gravity/domain/spin-gravity.ts`, `gravity/data/ring.ts`, `src/interior.ts`, `src/adapters/three/interior/zones.ts`, `spoke.ts`, `src/adapters/three/mothership-model.ts`, `habitat/data/ring-module.ts`, `mothership/data/mothership.ts` (`NODRIZA`) | **Licencia** en la fase 3 (`centrifuga`: centrífuga corta como la de Nautilus-X para la ISS) y en la fase 4 (`anillos`: anillo pequeño con la hoja de ruta de Vast, 3,5 rpm en 2035). El anillo de 56 m y 877 t sería **ficción de escala**. `MothershipSpec.ring` ya es opcional: un anillo vuelve como pieza que se añade a la Starship |
| **Cubierta de cultivo** | 18 × 18 m con once bancales de 15 m² de suelo artificial y cuatro higueras, a 1 g | `src/adapters/three/interior/farm-deck.ts`, `plant-model.ts`, `garden/` (bancales y árboles), `life-support/data/machines.ts` (bastidores, molino, soja, biorreactor) | Fase 2 (`vida-real`): cultivo **real** en microgravedad con Veggie y APH (0,13–0,2 m² cada una, [estacion.md](design/estacion.md)). La cubierta grande vuelve con la gravedad de la fase 4 |
| **Animales sin vuelo y sus familias** | Gatas (Luna, Nube), gallinas (Clara, Yema, Pinta), perros (Coco, Pepa), la gallina clueca que adopta | `pets/`, `poultry/`, `family/`, `adapters/three/interior/cat-model.ts`, `dog-model.ts`, `hen-model.ts`, `kitchen/data/stores.ts` (piensos) | Ninguno ha vivido en microgravedad de larga duración (las gallinas no comen ni beben sin gravedad). Vuelven con la gravedad (fase 4) como **ficción** o como **licencia** si hay datos de un anillo; antes, ninguno |
| **Acuario y áreas del santuario** | El acuario del anillo con medakas y caracoles, sus lecciones y amistades; las áreas y biomas del santuario | `sanctuary/` (dominio, datos, `aquarium-ops.ts`), `adapters/three/interior/aquarium-model.ts`, `src/ui/aquarium-text.ts` | La medaka **ha volado** (Aquatic Habitat de Kibo): el acuario puede volver como **real** en la fase 2 (`vida-real`), en microgravedad y en su caja cerrada. Las demás áreas, en la fase 5 (`santuario-acuario`, `santuario-rio`, `santuario-biomas`), cada una con su etiqueta |
| **Cocina con productos frescos** | Recetas de Cold Sanctuary con huevos, fresas, higos y tubérculos del huerto | `kitchen/data/recipes.ts`, `kitchen/data/stores.ts` | Ahora se cocina como en la ISS: rehidratar y calentar (`kitchen/data/iss-food.ts`). Las recetas frescas vuelven con el huerto real (Veggie da lechuga y mizuna) en la fase 2 |
| **Interior de la nodriza de anillos** | Espina con esclusa, almacén y taller; puente; anillo con el módulo habitable | `src/interior.ts`, `src/adapters/three/interior/zones.ts`, `gravity/data/spine.ts` | Sustituido por el interior de la Starship (`mothership/data/starship-interior.ts`, «distribución nuestra»). La espina no vuelve: era parte de la nave inventada |
| **Propulsión eléctrica nuclear de la nodriza** | 18 propulsores Hall X3 con un reactor de 2 MWe; propulsores intercambiables en la bahía | `mothership/domain/propulsion.ts`, `mothership/data/thrusters.ts`, `application/drive-refit.ts` | Sigue disponible con `?ficcion`. Vuelve como **licencia** si se elige la pila eléctrica (opción B de naves-reales.md) o como una etapa eléctrica que se acopla a la Starship |

## La estación (rama estacion-real)

La estación es ahora el segmento estadounidense de la ISS ([estacion-real.md](design/estacion-real.md)).
Lo que no es real queda en el código, sin cablear salvo con `?ficcion`:

| Qué | Qué era | Código | Cómo podría volver |
| --- | --- | --- | --- |
| **Hangar sin presión** | Caja de 20 × 14 × 20 m con estantes, cunas y el brazo que metía el módulo | `station/data/interior.ts` (`OLD_HANGAR_HALF`, `hangarPressureCase`), `adapters/three/interior/station-rooms.ts` (estantes y cáscara de la esclusa, si vuelve un volumen `hangar`) | Lo sustituyen la Bishop, la JEM-EF y el CBM de Unity. Un hangar vuelve como **licencia** si un módulo inflable de carga (tipo B330) se usa como bodega |
| **Dique seco** | Celosía de 128 × 128 × 143 m con brazos para la nodriza de anillos | `station/data/dry-dock.ts`, `src/dry-dock.ts`, `adapters/three/dry-dock-model.ts` | La Starship atraca en el IDA de proa de Harmony, como el transbordador. El dique vuelve con `?ficcion` |
| **Ampliación del hangar** | 10 m más de hangar sin puerto | `station/data/outfit.ts` (`MOD_HANGAR`) | Con el hangar |
| **Módulos de la nave de anillos** | Segundo módulo de fabricación, módulo de la planta, módulo agrícola de 16,9 m | `station/data/outfit.ts` (`MOD_FAB2`, `MOD_PLANT`, `MOD_FARM`, `BACKLOG_BLUEPRINT_IDS`) | Los módulos tipo Haven-2 y Axiom Hab-1 (en desarrollo) ocupan su sitio. El agrícola vuelve con el cultivo real de la fase 2 |
| **Campos de cultivo y laboratorio bio** | Bancales de 60 m² en el módulo agrícola, biorreactores | `EQ_CROPS`, `BIO_BLUEPRINTS` | Fase 2 (`vida-real`): Veggie y APH |
| **Paseo espacial desde Quest** | — | La escotilla EVA de Quest solo informa | Con el paseo espacial de la estación |
| **Recoger un satélite suelto con el brazo** | — | `CargoAirlock.retrieve` | Ya está, como **licencia** dicha en la tarjeta: en la ISS nunca se ha hecho |
| **`HANGAR_SIZE` en el catálogo** | El montaje del catálogo de naves pregunta si un vehículo cabe en el hangar | `station/data/hangar-craft.ts` | Debería preguntar si cabe en el CBM o si el brazo lo mueve |

## Lo que **no** está apagado (corrección de las 19:54)

- El duelo de mente de los asteroides y sus tres fases.
- La ira, los ataques, la persecución y el modo de supervivencia de la estación.
- Los asteroides que viajan solos, los niveles de subyugación y el nivel 4.
- La nano_net.
- Las importaciones (Santuario, remolcador, lanzador de masas) y lo demás que no es un interior.
- La refinería, la fundición y la planta de propelente de la estación: están en Columbus como **licencia**
  (no existen en órbita), porque el juego de los asteroides las necesita.

## Recorridos apagados

Juegan la nave de anillos; se omiten salvo con `EXPERIENCIA_FICCION=1`, que los juega con `?ficcion`
(nota en [qa/registro.md](qa/registro.md)):

- PX-01: cocina, huerto y gallinero.
- PX-02: anillo y espina.
- PX-13: acuario.
- PX-14: viaje del anillo a la estación.
- PX-16: la nodriza al dique, desde el anillo.
- PX-20: animaciones de las tareas del anillo.
- PX-23: yoga en el anillo.

El recorrido real que los sustituye en la nave es **PX-25** (`starship`).

## Lo que falta en la nave real (siguiente trabajo)

- **Soporte vital real** (rama `eclss-real`): OGA, CDRA, Sabatier, WRS y TCCS como máquinas de la Starship.
- **El viaje real de «Ir» dentro de la Starship.** De momento llega saltando por los asideros dentro de la
  nave y se teletransporta entre vehículos cuando la tarea está en la nodriza. El planificador de viajes
  (`journey.ts`) aún conoce el anillo y la espina, no las cubiertas.
- **El módulo lunar Apolo** como módulo de aterrizaje (rama `catalogo-montaje`). Hasta entonces se acopla la Explorer.
- **El dique seco** dibuja la nodriza de anillos con `?ficcion`. Con la Starship su cuna es la misma celosía,
  sin medidas propias todavía.
