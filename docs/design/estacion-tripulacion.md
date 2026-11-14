# Estación: tripulación, puertas, hangar y escala

Respuesta al informe de Berón tras jugar la estación en el móvil (2026-11-14): la alimentación y el
descanso seguían en la nave; la interfaz era la vieja y las puertas solo mostraban «?»; el hangar
estaba vacío; la lista de tareas del hangar era la vieja; los espacios eran pequeños. La auditoría
está en [hallazgos.md](../qa/hallazgos.md) (H33 a H45).

## Interfaz: la misma que la nodriza y el módulo

- **Vista en primera persona por defecto.** El ojo de los iconos de raíz cambia a tercera.
- **Iconos de raíz** arriba a la derecha (`RootMenu`): el ojo y Tareas fijos. Se quitan los botones de
  texto «Tareas», «Vista 3ª» y «Salir». Se sale por las escotillas de atraque, que son máquinas.
- **Tarjeta de lo que tienes delante** (`.cab-machine`, como en el habitáculo y el puente). Lleva un
  icono, el nombre, una línea de qué es y sus acciones, y debajo, en ámbar, por qué una acción está
  apagada. Ya no hay píldora de acción única ni «¿qué es?». Lo que solo se mira enseña su ficha sin
  botón.
- **Estado arriba a la izquierda** en tres líneas cortas: módulo, presión y hacia dónde mira, y cómo se
  mueve.
- Movimiento en 0 g como en la espina: asideros, saltos con flechas y tocar una cosa lejana para ir
  saltando hasta ella. Cada cosa tiene su asidero.

## Puertas

Cada escotilla entre dos zonas es una puerta **en cada lado**. Se llama `Escotilla · <la zona del otro
lado>`, lleva un icono de puerta y la acción «Entrar en <zona>», que la lleva saltando al otro lado.
Sobre el marco amarillo hay un cartel `→ <zona>`. Una puerta cerrada lleva un candado y dice por qué y
qué la abre:

| Puerta | Cerrada cuando | Dice |
|---|---|---|
| Esclusa → hangar | Sin traje o con la esclusa a presión | «al otro lado está el hangar, al vacío. Se abre con el traje puesto y la esclusa vacía («Trajes y esclusa»)» |
| Esclusa → fabricación | Con la esclusa vacía | «Llénala y quítate el traje en «Trajes y esclusa»» |
| Escotilla del módulo | El módulo está en el hangar o no está atracado | «el módulo está en el hangar. Sácalo a su puerto en la consola del hangar» |
| Escotilla de la nodriza | La nodriza no está atracada | «la nodriza no está atracada en este puerto» |

Los dos lados de una escotilla están a 1,5 m. Cuentan como una sola puerta para la regla de 2 m,
porque solo se ve la tarjeta del lado en el que está ella.

## Zonas de la tripulación en la estación

| Zona | Dónde | Qué hace | Tamaño y referencia |
|---|---|---|---|
| Cocina y mesa | Módulo habitable, estribor | Platos con la despensa de la estación, con el mismo motor de tareas que la nodriza (`Habitat`). Envía «Víveres para la nodriza» si está atracada | Calentador y agua como en la ISS y una mesa como la de Unity |
| Camarotes | Módulo habitable, babor | «Dormir en un camarote» calma (`CrewMember.rest`) | Cuatro camarotes de unos 2 m³, como los de Harmony (ISS) o los de Axiom Hab One |
| Aseo | Módulo habitable, babor | «Asearse» | UWMS de la ISS |
| Ejercicio | Nodo 1, suelo | Entrenamientos (CEVIS y volante de inercia) | En la ISS el ejercicio está en un nodo, Tranquility |
| Esterilla de yoga | Nodo 1, suelo | «Sentarse en loto: ajustes» y yoga | Como la esterilla del módulo y de la nodriza |

**Referencias de tamaño.**

- Módulo habitable: el HALO del Gateway mide 6,1 × 3 m. Haven-1 (Vast) mide 10,1 × 4,4 m y tiene 45 m³
  habitables para cuatro. Axiom Hab One mide unos 11 × 4,2 m y tiene camarotes para cuatro. Starlab
  tiene 8 m de diámetro y 450 m³ presurizados.
- Por personas, la estación (unos 120 m³ presurizados entre dos nodos, el habitable y fabricación)
  está entre Haven-1 y Starlab. Para una o dos personas basta con el HALO más un nodo.
- Por eso el casco no crece: se dibuja más grande (ver Escala).

**Fuentes.**

- Harmony: https://en.wikipedia.org/wiki/Harmony_(ISS_module)
- Tranquility: https://en.wikipedia.org/wiki/Tranquility_(ISS_module)
- Haven-1: https://en.wikipedia.org/wiki/Haven-1
- Axiom Hab One: https://thespacebucket.com/the-exact-design-of-axioms-commercial-space-station/
- Starlab: https://en.wikipedia.org/wiki/Starlab_Space
- Camarotes de la ISS: https://ntrs.nasa.gov/citations/20080013462
- HALO: ver `STRUCTURE_SOURCES.halo`

Todas están en `INTERIOR_SOURCES` (`src/modules/station/data/interior.ts`).

### Qué vive dónde

| | Estación | Nodriza |
|---|---|---|
| Despensa | Propia (`STATION_LARDER`: harina, cacahuetes, patatas, carne cultivada; sin huevos porque no hay gallinas). La llenan sus cultivos (pestaña Vida) | Propia, para los viajes: huerto, gallinas, animales y biorreactor de carne |
| Cocinar, yoga, ejercicio | Sí, en sus zonas, sobre la despensa de la estación | Sí, en el anillo a 1 g |
| Dormir | Camarotes | Camarotes del anillo |
| Enfermería, animales | No: siguen en la nodriza | Sí |
| Doménica | La misma persona: un solo `CrewMember` compartido | |

Los cultivos de la estación (Vida → «Enviar a la despensa») van a la despensa **de la estación**. Antes
iban a la nodriza. Con la nodriza atracada, la cocina envía la mitad de cada cosa como víveres para el
viaje (`TRIP_STORES_SHARE`, valor de juego).

## Hangar: ¿qué entra?

El hangar mide 20 × 14 × 20 m (`HANGAR_SIZE`, de la estructura).

| Nave | Medidas | Masa | ¿Cabe? |
|---|---|---|---|
| Módulo de aterrizaje | Casco de 3 × 2 × 5 m y patas de ~1 m: 5 × 3 × 3 m | ~680 kg | Sí, con un metro de margen por cada lado |
| Nodriza | 152 m de eslora y anillos de 112 m de diámetro (56 m de radio de suelo) | ~877 t | No: es 7,6 veces más larga que el lado mayor del hangar y 1 290 veces más pesada que el módulo |

**Decisión.**

- La nodriza atraca **fuera**, en el adaptador de proa del Nodo 2, como hasta ahora.
- El módulo **entra**. Desde la consola del hangar, «Meter el módulo en el hangar» hace que el brazo de
  la estación lo saque de su puerto y lo deje en un bastidor a media altura del hangar, delante de las
  consolas. Es como Canadarm2 cuando lleva un Dragon o un HTV de su punto de captura a su puerto.
  «Sacar el módulo a su puerto» lo devuelve.
- Mientras está dentro, su escotilla en el Nodo 2 está cerrada y dice por qué.
- «Ir» a una tarea del módulo lo devuelve solo al puerto.
- **Bahía de la nave**: su consola está ahora en el hangar, junto al módulo. Antes estaba en el Nodo 2.
  Ahí se revisan y cambian las piezas del módulo y las de la nodriza atracada fuera.

Tests: `hangar-berth.test.ts` (EST-22).

## Tareas

- El icono Tareas y la consola del hangar abren **la lista global** (`TaskBoard`) con «Ir».
- Se quita la lista vieja que abría el botón «Tareas» de la estación (la pestaña Materiales) y la del
  hangar (la pestaña Hangar). La pestaña Hangar queda como «Inventario» en la consola.
- Las tareas de la estación entran en la lista: cocinar, yoga y ejercicio, con el id `est-…`.
- «Ir»:
  - Dentro de la estación, va saltando hasta la máquina y la abre o empieza la tarea al llegar.
  - Desde otro vehículo, entra y aparece junto a la máquina, como la cabina del módulo.
  - Con el traje en el hangar, la tarea la lleva igualmente.

## Escala

- `MACHINE_SCALE` (`src/core/machine-scale.ts`) vale 1,5, como sugirió el diseñador. Es el único número
  que hay que cambiar. La rama `puente-real` define la escala global, pero aún no está publicada. Al
  unirlas, que esta constante lea la suya.
- Los datos guardan los tamaños reales, con sus fuentes y sus tests. `scaleInteriorPlan` dibuja el
  interior 1,5 veces mayor: módulos, escotillas, máquinas y hangar. Doménica y los asideros no crecen.
- Los pasillos del Nodo 1 pasan de 2,4 m a 3,6 m. El módulo habitable pasa de 1,6 × 1,9 m a
  2,4 × 2,85 m.
- La regla de 2 m entre interactuables se comprueba en la escala jugada. Mide centros y asideros
  (`crew-areas.test.ts` y `spacing.test.ts`). Hay dos excepciones: las máquinas vecinas en bastidores
  ISPR y los dos lados de una misma escotilla.

## Para santuario-fauna

Los biomas y las grandes zonas naturales son suyos.

- Queda sitio en los dos puertos radiales libres del Nodo 1, a babor y a estribor (`POLANA_BERTHS`).
  Cada puerto CBM ya tiene la puerta generada.
- Un módulo atracado ahí recibe solo su escotilla con nombre («Escotilla · <módulo>»), su pasillo y sus
  asideros.
- Para un bioma basta añadir un tipo de módulo en `outfit` con su `AISLE`, que se escala igual.

## Preguntas abiertas para el diseñador

1. **Cocinar en 0 g.** La cocina de la estación ofrece las mismas recetas que la nodriza, salvo las
   que no permite su despensa. En la ISS solo se calienta y se rehidrata. ¿Filtramos las recetas de
   sartén, o vale un horno cerrado como valor de juego?
2. **Cuánto se cruza.** A 1,5× cruzar la estación saltando lleva más tiempo. «Ir» desde fuera aparece
   junto a la máquina, pero desde dentro va saltando. ¿Queremos un tirón más rápido, como el de 1,5 m/s
   de la espina (H13)?
3. **El módulo en el hangar visto desde fuera.** En la vista de vuelo el módulo sigue dibujado en su
   puerto. Moverlo fuera con el brazo pide tocar el acople, y lo lleva la rama `estacion-atraque`.
