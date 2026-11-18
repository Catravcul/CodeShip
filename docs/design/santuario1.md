# Santuario 1: el santuario de hielo de Cold Sanctuary (rama `santuario1`)

Pedido de Berón (2026-11-18): migrar el santuario 1 de Cold Sanctuary a Codeship. Primero el entorno 3D (edificios,
pisos, áreas, animales, personas, utensilios), con los modelos **categorizados para poder hacer cambios a gran escala**;
después las misiones de jornada ([misiones-y-jornada.md](misiones-y-jornada.md) §3). Berón: «que se terminen todas las
tareas y luego lo veo en conjunto y envío una larga lista de arreglos… que involucren a todos los pisos, o los muebles de
todos los pisos o a todos los humanos».

Se entra desde la pantalla de inicio: nivel 1, «Santuario Terrestre» (`boot.ts` carga `src/sanctuary-one.ts`).

## Qué es en Cold Sanctuary

El «Mesocosmos» de `Assets/Editor/SampleSceneBuilder*.cs`: banquisa de casquetes (lóbulos circulares) y una isla de
tierra, una laguna central con fauna marina, y **edificios-árbol** (`HelixTower`): un tronco de agua de 20 m por el que
se nada, con los pisos en molinete alrededor (un nivel cada 22 m, dos pisos por nivel, primer piso a 64 m), puntas al
final de ramas de agua y, en algunos pisos, un **anillo en U** 8 m por encima (Levels.cs `RingDeck`). Su magia se
conserva (reglas.md §1.2).

## Cambios a gran escala

Todo lo que se ve es una **instancia de un modelo del catálogo**, y cada modelo tiene `category` (máquina, mueble,
utensilio, animal, persona, naturaleza, edificio, terreno…) y `group` (p. ej. `gimnasio-placas`, `cocina-franjas`,
`frutales`, `flora-tundra`). Los arreglos se escriben en **un solo archivo**, `src/modules/sanctuary-one/data/overrides.ts`:

| Arreglo de Berón | Regla |
| --- | --- |
| «Todos los animales un 20 % más grandes» | `categoria: { animal: { escala: 1.2 } }` |
| «Las máquinas de placas en otro color» | `grupo: { "gimnasio-placas": { color: 0x335577 } }` |
| «Quita las toallas» | `modelo: { "gym-toallas": { oculto: true } }` |
| «Cambia cada Smith por una jaula» | `modelo: { "gym-smith": { cambiarPor: "gym-jaula" } }` |
| «Más espacio entre los muebles de todos los pisos del Entrenamiento» | `edificio: { entrenamiento: { separacion: 1.2 } }` |
| «Solo en el restaurante» | `piso: { "servicios:piso-1": { separacion: 0.9 } }` (y `piso[…].modelos[id]` para un modelo de ese piso) |
| «Todos los humanos más altos / Kushal con otra ropa» | `personas: { todas: { altura: 1.05 }, nombres: { Kushal: { ropa: 0x884422 } } }` |

Gana la regla más concreta, campo a campo: categoría < grupo < modelo < edificio < piso. Cambiar la entrada del
catálogo (tamaño, piezas, color) cambia todas sus copias; un piso es una lista de datos en `data/floors/<edificio>.ts`.

## Arquitectura (código)

| Pieza | Archivo | Qué |
| --- | --- | --- |
| Catálogo | `data/catalog.ts` + `data/models/*.ts` (base, entrenamiento, servicios, ciencias, produccion, residencia, campos, paisaje) | Una entrada por modelo: categoría, grupo, tamaño real, color, forma (o `parts`: cajas como `KitchenProps.C`), realidad y fuente; `walkThrough` para lo blando (colchón, hierbas) |
| Pisos | `data/floors.ts` + `data/floors/*.ts` | Cada piso: `{modelo, x, z, giro}` en el marco del piso (x a lo ancho, +z lejos del tronco), copiado de su `Furnish*`; `packFloor` = `PackFloor` de Research.cs; `floors/puntas.ts` las puntas |
| Reglas | `data/overrides.ts` | Cambios a gran escala (arriba) |
| Sitio | `data/site.ts` | Lóbulos, laguna, torres con sus pisos (`furnish`), nidos y personal |
| Paisaje | `data/paisaje.ts` | Casquetes silvestres (WildCaps.cs), tundra, icebergs |
| Disposición | `data/layout.ts` | Mundo andable (`walk.ts` del S3), instancias, áreas, puertas por piso (`doorFor`: la más cercana a 5 m con paso libre), anillos, puntas |
| Jornada | `domain/motion.ts`, `data/jornada.ts` | Merodeo de animales, horario de `WorkdayDirector`, rutas reales (puerta → tronco → hielo/mar → tronco → piso) |
| Rejilla | `data/walk-index.ts` | El mundo de paseo por celdas de 32 m (8 000 sólidos): cada paso mira solo alrededor |
| Población | `domain/population.ts` | `PopulationPlan` portado |
| Dibujo | `src/adapters/three/s1-models.ts` | Un `InstancedMesh` por modelo (y color de regla); los animales que merodean se mueven por instancia |
| Escena | `src/sanctuary-one.ts` | Andar/nadar, vista 1ª/3ª, reloj, personal, ventana de Áreas |

## Estado (2026-11-18)

| Parte | Estado |
| --- | --- |
| Casquetes, isla de tierra, mar y laguna | Hecho (rejilla de 5 m; Cold Sanctuary usa 2,5 m) |
| 6 edificios-árbol con troncos, puertas, pisos, ramas, puntas y anillos | Hecho |
| Pisos amueblados | **Todos los que Cold Sanctuary amuebla**: Entrenamiento 16, Servicios 8 (con anillos), Ciencias 5, Producción 6, Árbol de los Campos 4, Residencia 6 (plaza con el ring de almohadas y 30 habitaciones). Los 3 pisos libres de Ciencias siguen libres |
| Ballet y dojo | En obras (andamio y material); su acabado está en el grupo `obra-acabado`, oculto por regla |
| Puntas | Frutales en maceta (uno de cada especie de `FruitCare.All` y otra vuelta); en el Árbol de los Campos, el bancal de su gremio |
| Paisaje | Crestas de presión, ventisqueros, nunataks con liquen y descansaderos en los lóbulos «Bosque»; musgo, sauce ártico, dríada y charcas con algodón ártico en la isla; los dos icebergs con focas y pingüinos |
| Fauna | 13 especies en sus nidos; merodean por su territorio |
| Personal | 29 personas siguen la jornada (8–9 entrenamiento, 9–11 tareas, 11–12 comida, 12–14 tareas, 14–15 entrenamiento, 15–16 tareas, libre, a las 22 a dormir en su cama) por rutas reales |
| Reloj | El día de Cold Sanctuary: 60 min reales (`S1_DAY_REAL_S`); empieza a las 7:48. La hora sale arriba |
| Áreas | Ventana de mapa con todos los pisos, anillos y casquetes; «Ir» la lleva por el camino real (o teletransporte si se eligió en sus ajustes) |
| Misiones de jornada | Diseño en [misiones-y-jornada.md](misiones-y-jornada.md) §3 |

## Simplificaciones (para la lista de arreglos)

- Los equipos de laboratorio, hospital y cocina son cajas o pocas piezas con la huella y la altura reales.
- Las franjas de la cocina son una caja por bloque; no hay baldosas de caída ni la fachada de fotobiorreactores.
- La Mecánica solo tiene sus aseos (como en Cold Sanctuary).
- El Huerto no lleva los seis métodos del mundo (`FurnishWorldGarden`).
- Los techos de alfombras con frutales (Orchards.cs) no están: el techo aquí es solo la plataforma del tronco.
- El iceberg a la deriva está quieto en su punto A.

## Distribución nuestra (no sale de Cold Sanctuary)

- La puerta de cada piso: la más cercana a 5 m del eje de su cara con paso libre (Cold Sanctuary: `pickDoors`).
- El puesto de trabajo de cada persona: reparto fijo por turno sobre 15 pisos de trabajo, hasta portar `WorkRoster`.
- Los pasillos de 1,6 m en el primer huerto vertical (con 2,1 no caben sus extras).
- La colonia de petreles níveos en el casquete Norte salvaje; el viento dominante del suroeste.
- Todo el personal vive en el santuario 1; Doménica empieza en la puerta del gimnasio.

## Siguiente

1. La lista de arreglos de Berón (en `overrides.ts` cuando sean a gran escala).
2. Portar `WorkRoster` y la modal de misiones de jornada.
