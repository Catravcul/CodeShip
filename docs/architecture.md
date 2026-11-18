# Arquitectura de Codeship (mapa para retomar)

Léelo antes de explorar el código. Reglas de diseño: [design/reglas.md](design/reglas.md). Cambios recientes:
[../CHANGELOG.md](../CHANGELOG.md). Pendientes: [pendientes.md](pendientes.md).

## Stack y comandos

Three.js + TypeScript + Vite; Vitest. Monolito modular hexagonal: `domain/` (reglas puras), `application/` (casos de
uso), `data/` (catálogos con fuente); adaptadores (Three.js, entrada, UI) fuera. `npm run lint:arch` impide que el
dominio importe adaptadores.

| Comando | Qué |
| --- | --- |
| `npm test` / `npx vitest run <ruta>` | Pruebas (correr solo las de lo tocado) |
| `npx tsc --noEmit` | Tipos |
| `npm run lint:arch` | Capas |
| `npm run qa:check`, `npm run check:docs` | Catálogo de recorridos PX y documentos-contrato |
| `npm run experiencia` | Recorridos de jugador con Playwright (iPhone 13), `tools/experiencia/` |
| `npx vite build --base=./` | Build para la web de pruebas |

## Entradas

`index.html` → `src/boot.ts`: pantalla de inicio (`ui/start-screen.ts`, niveles en `modules/levels/data/levels.ts`) y,
al elegir, carga dinámica de un juego:

| Nivel | Archivo | Qué |
| --- | --- | --- |
| 6 Espacio | `src/main.ts` | Nodriza (Starship), estación (ISS), módulo (Apollo LM), sonda, asteroides y duelos |
| 3 Santuario Aéreo | `src/aerial-sanctuary.ts` | Islas de Cold Sanctuary + isla de entrenamiento real; iniciación de Doménica |
| 1 Santuario Terrestre | `src/sanctuary-one.ts` | El santuario de hielo de Cold Sanctuary ([design/santuario1.md](design/santuario1.md)) |

Los archivos `src/<proceso>.ts` (bridge, station-*, lander-*, probe-*, eva-mode, wrath-mode…) son pegamento de cada
modo de juego del espacio; `main.ts` los cablea con una línea cada uno (evita conflictos al fusionar:
[conocimiento/ramas.md](conocimiento/ramas.md)).

## Carpetas

```
src/core/               unidades, escala y separación (Cómoda 1,5× / Amplia 2 m), realidad de cada dato, tiempo de a bordo
src/modules/<m>/        dominio por módulo (ver tabla)
src/content/            generadores deterministas (asteroides)
src/adapters/three/     modelos y escenas Three.js (aerial-models, s1-models, starship-model, station-model…)
src/adapters/input/     Walker (joysticks «Moverse»/«Mirar»), teclado
src/adapters/storage/   partidas guardadas
src/ui/                 HUD: menú árbol (root-menu), ventanas de mapa (map-window), tareas, áreas, retos (duel-view)
tools/experiencia/      recorridos PX en vivo; docs/qa/ su catálogo y registro
docs/design/            un documento por sistema; docs/research/ investigación con fuentes
```

## Módulos (`src/modules`)

| Módulo | Qué |
| --- | --- |
| `ship`, `flight`, `navigation`, `mothership`, `flight-deck` | Vehículos reales, vuelo 6DOF, mapa y piloto automático, cabina de la nodriza |
| `station`, `life-support`, `robotics`, `eva`, `lander-cabin` | ISS, ECLSS real con averías con causa, brazo, paseos, cabina del LM |
| `celestial`, `expedition`, `imports` | Asteroides reales (JPL), cometas, sonda, importaciones desde la Tierra |
| `mind-duel`, `subjugation`, `asteroid-wrath`, `nano-net`, `levels` | La ficción: mentes de asteroides, duelo, ira, nano_net |
| `chores`, `tasks`, `missions`, `notices` | Retos de código por pasos, lista de tareas y Áreas, misiones de Nevaeh, avisos |
| `crew`, `wellness`, `medical`, `kitchen` | Necesidades de Doménica, yoga/ejercicio/sueño, protocolos médicos, cocina |
| `habitat`, `garden`, `pets`, `poultry`, `cultured-meat`, `family`, `sanctuary`, `adoption` | Vida a bordo antigua (en pausa tras el reinicio, `REAL_ONLY`) y catálogo de especies |
| `aerial-sanctuary` | Santuario 3: islas, edificios-árbol con ascensor, `walk.ts` (andar/nadar en cajas), vuelos, puestos |
| `sanctuary-one` | Santuario 1: catálogo de modelos por categoría (`data/models/`), pisos amueblados (`data/floors/`), reglas de cambios a gran escala (`data/overrides.ts`), paisaje, jornada y rutas, rejilla del paseo, población |
| `settings`, `saves`, `story`, `body` | Ajustes (en la esterilla), partidas, historia, posturas |

## Patrones

- **Datos con fuente:** cada número real lleva fuente y etiqueta (`fact()` en `aerial-sanctuary/data/sources.ts`, `Reality` en `core/reality.ts`).
- **Mundo andable:** `aerial-sanctuary/domain/walk.ts` (suelos, agua, sólidos en planta; paso de 0,6 m; sin caídas). Lo usan los santuarios 3 y 1.
- **Retos:** `ChoreRun` sobre `Exercise` de `mind-duel`; la hoja es `ui/duel-view.ts`; mientras está abierta solo se ven la hoja y la escena.
- **Ventanas de mapa:** Navegación, Áreas e inicio usan `ui/map-window.ts` (mapa 3D que se gira y amplía con el dedo).
- **Escala de interiores:** los datos son reales; la capa de presentación amplía en planta (`core/scale.ts`).

## Relación con Cold Sanctuary

Repositorio `videnacry/Cold-Sanctuary` (Unity, solo `.cs` y docs). Codeship porta sus reglas como dominio puro con
pruebas y sus escenas como datos (`SampleSceneBuilder*.cs` → `data/layout.ts`), citando el archivo de origen.
