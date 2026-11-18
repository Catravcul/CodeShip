# Santuario 1: el santuario de hielo de Cold Sanctuary (rama `santuario1`)

Pedido de Berón (2026-11-18): migrar el santuario 1 de Cold Sanctuary a Codeship. Primero el entorno 3D (edificios,
pisos, áreas, animales, personas, utensilios), con los modelos **categorizados para poder hacer cambios a gran escala**;
después las misiones de jornada ([misiones-y-jornada.md](misiones-y-jornada.md) §3).

Se entra desde la pantalla de inicio: nivel 1, «Santuario Terrestre» (`boot.ts` carga `src/sanctuary-one.ts`).

## Qué es en Cold Sanctuary

El «Mesocosmos» de `Assets/Editor/SampleSceneBuilder*.cs` (~16 000 líneas en 50 archivos): banquisa de 6 casquetes
(lóbulos circulares) y una isla de tierra, una laguna central con fauna marina, y **edificios-árbol** (`HelixTower`):
un tronco de agua de 20 m por el que se nada, con los pisos en molinete alrededor (un nivel cada 22 m, dos pisos por
nivel, primer piso a 64 m) y puntas al final de ramas de agua. Su magia se conserva (reglas.md §1.2).

## Arquitectura (código)

| Pieza | Archivo | Qué |
| --- | --- | --- |
| Fuentes | `src/modules/sanctuary-one/data/sources.ts` | Cada número con su archivo de Cold Sanctuary o su ficha real |
| **Catálogo de modelos** | `data/catalog.ts` | Una entrada por modelo: `category` (máquina, mueble, utensilio, animal, persona…), `group` (p. ej. `gimnasio-placas`, `fauna-marina`), tamaño real, color, forma, realidad y fuente |
| Sitio | `data/site.ts` | Lóbulos, laguna, torres con sus pisos en orden, nidos de fauna y personal |
| Pisos amueblados | `data/floors.ts` | Cada piso portado: lista de `{modelo, x, z, giro}` en el marco del piso, copiada posición a posición de su `Furnish*` |
| Población | `domain/population.ts` | `PopulationPlan` portado (3 animales por humano, 70/22/8 % por nivel trófico, mínimos viables) |
| Disposición | `data/layout.ts` | Convierte todo en mundo andable (`walk.ts` del santuario 3: suelos, agua, sólidos) e instancias |
| Dibujo | `src/adapters/three/s1-models.ts` | **Un `InstancedMesh` por modelo**; `style(categoría, {visible, color, group})` cambia todos a la vez |
| Escena | `src/sanctuary-one.ts` | Andar con gravedad, nadar en el mar y por los troncos, vista 1ª/3ª |

**Cambios a gran escala:** cambiar una entrada del catálogo cambia todas sus copias; `style()` oculta o recolorea una
categoría o un grupo entero; un piso nuevo es una lista de datos en `floors.ts` y una línea `furnish` en `site.ts`.

## Estado (2026-11-18)

| Parte | Estado |
| --- | --- |
| Casquetes de hielo, isla de tierra, mar y laguna | Hecho (rejilla de 5 m; Cold Sanctuary usa 2,5 m) |
| 6 edificios-árbol (Servicios, Entrenamiento, Ciencias, Producción, Árbol de los Campos, Residencia) con troncos, puertas, pisos, ramas y puntas | Hecho: 44 pisos con su nombre, vacíos salvo el gimnasio |
| Piso 0 del gimnasio: 30 máquinas de placas, peso libre, fuente, toallas, zona de alfombras | Hecho, con huellas de fabricante |
| Fauna: 13 especies en sus nidos, con el reparto de `PopulationPlan` | Hecho (cuerpos sencillos a tamaño real, quietos) |
| Personal: 29 personas de `WorkdayDirector.Staff` | En el hub, quietas, con su nombre |
| Resto de pisos (restaurante, hospital, cría, yoga, cardio, calistenia, aula, laboratorios, residencia…) | Pendiente: uno por uno desde su `Furnish*` |
| Árboles y flora, icebergs, sitio nuclear, parque energético, alfombras, submarinos | Pendiente |
| Áreas (ventana), Tareas, ajustes en la esterilla, guardado | Pendiente |
| Misiones de jornada | Diseño en [misiones-y-jornada.md](misiones-y-jornada.md) §3 |

## Distribución nuestra (no sale de Cold Sanctuary)

- El marco de cada piso: centro del cuadrado, −z hacia fuera del tronco. Cold Sanctuary elige sus puertas
  (`pickDoors`); aquí la puerta de cada piso está siempre a 5 m del eje de su cara.
- El personal en dos corros en el hub hasta que llegue la jornada.
- La colonia de petreles níveos en el casquete Norte salvaje (Cold Sanctuary no les da nido en la lista).
- Todo el personal vive en el santuario 1 (Cold Sanctuary reparte casas entre santuarios).
- Doménica empieza en la puerta del gimnasio, el primer piso amueblado.

## Siguiente

1. Pisos del Entrenamiento (cardio, calistenia, yoga) y del restaurante, con su equipo.
2. Ventana de Áreas con «Ir» (recorrido entero: andar y nadar por el tronco).
3. Portar `WorkRoster` y la modal de misiones.
