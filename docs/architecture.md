# Arquitectura de Codeship (mapa para retomar)

Léelo antes de explorar el código. Reglas de diseño: [design/reglas.md](design/reglas.md) (edificios y pisos: [design/edificios-y-pisos.md](design/edificios-y-pisos.md); la montaña hueca del 3: [design/montana-hueca.md](design/montana-hueca.md)). Cambios recientes:
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
| 3 Santuario Aéreo | `src/aerial-sanctuary.ts` | Islas de Cold Sanctuary + isla de entrenamiento real; iniciación de Doménica; la Isla de las alturas con su bioma (`src/s3-biome.ts`) |
| (dentro del 1) Microcosmos | `src/microcosmos-academia.ts` (su arte: `adapters/three/academia-art.ts`) | La Academia de Platón, cargada al entrar por la máquina de simulación ([design/microcosmos.md](design/microcosmos.md)) |
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
src/ui/                 HUD: menú árbol (root-menu), ventanas de mapa (map-window), tareas, áreas, retos (duel-view),
                        mandos de la Switch de todos los niveles (game-pad sobre action-pad), botón naranja (interaction)
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
| `aerial-sanctuary` | Santuario 3: islas, edificios-árbol con ascensor, `walk.ts` (andar/nadar en cajas), vuelos, puestos; el bioma: `bioma.ts` (cadena alimenticia genérica, el bioma como `BiomeDef`), `mountain.ts` (montaña como función de altura), `bioma-crowd.ts`, `abeja.ts` y `data/pupa-abeja.ts` (la pupa del centro), `data/carbonifero.ts` (el bosque del Carbonífero), `larvas-lago.ts` (las larvas del lago) |
| `sanctuary-one` | Santuario 1: catálogo de modelos por categoría (`data/models/`), pisos amueblados (`data/floors/`; edificios de hoy `TOWERS` y guardados `TOWERS_AMPLIOS` en `data/site.ts`), reglas de cambios a gran escala (`data/overrides.ts`), reglas de organización de edificios y pisos (`domain/organizacion.ts`; la cima con castillos: `data/castillos.ts`, toboganes `domain/tobogan.ts`, guerra de almohadas `domain/guerra-almohadas.ts`, en juego `src/s1-castillos.ts`), paisaje, jornada y rutas (alfombras), rejilla del paseo, población; retos (`data/retos.ts`, `application/challenges.ts`), misiones (`data/misiones.ts`, `domain/workday-missions.ts`), trepar/saltar (`domain/climb.ts`), animales vivos (`application/wildlife.ts` sobre `fauna`; datos: `data/ciclos-de-vida.ts`, `data/etograma.ts`, `data/rasgos.ts`) |
| `qa-vivo` | Lista de lo creado y su revisión en vivo con fecha (`data/revisado.ts`, genera [qa/revision-en-vivo.md](qa/revision-en-vivo.md)) |
| `microcosmos` | Microcosmos de la máquina de simulación: el lugar con fuentes (`data/academia.ts`), mundo andable a escala de insecto y rutas (`application/mundo.ts`), días y ciclo de vida (`domain/vida.ts`), historia por pasos (`domain/historia.ts`) |
| `fauna` | Compartido entre santuarios ([design/fauna.md](design/fauna.md)): ciclos de vida, etograma, deseos, depredación por stats, deambular, cuerpos articulados (`domain/`) plantas como comida contable (`domain/forage.ts`: luz, calor, crecimiento logístico, pastoreo) y la cadena alimenticia viva (`application/ecosystem.ts`, con el gancho `Forage` para quien cuenta la comida). Sin datos de ningún santuario: cada uno pasa sus especies |
| `trazos` | Compartido ([design/retos-trazos.md](design/retos-trazos.md)): retos que se dibujan con el dedo como una varita mágica. Glifos de las fórmulas con su orden de trazo (`data/glyphs.ts`), comprobación del trazo (`domain/trace.ts`), compuestos reales con su aspecto y su molécula (`data/compounds.ts`); la pantalla, `ui/trace-view.ts` (`openTraceChallenge`). Los usa el santuario 3 (`aerial-sanctuary/data/retos-trazos.ts`) |
| `settings`, `saves`, `story`, `body` | Ajustes (en la esterilla), partidas, historia, posturas |

## Patrones

- **Datos con fuente:** cada número real lleva fuente y etiqueta (`fact()` en `aerial-sanctuary/data/sources.ts`, `Reality` en `core/reality.ts`).
- **Mundo andable:** `aerial-sanctuary/domain/walk.ts` (suelos, agua, sólidos en planta; paso de 0,6 m; `dropTo` para caer de un borde; `grounds`: un terreno como función de altura y pendiente, el de la Isla de las alturas). Lo usan los santuarios 3 y 1, y los dos se mueven con `aerial-sanctuary/application/free-walk.ts` (andar, correr, nadar, saltar, trepar, caer); poses y vista bajo el agua en `adapters/three/walk-look.ts`.
- **Mandos compartidos:** un solo mando de la Switch para todos los niveles, `ui/game-pad.ts`: cada escena donde ella se mueve lo toma (`GamePad.use(root, escena, {zoom, plus, view, moves…})`) al entrar y lo suelta al salir; `GamePad.share` pone lo común de un juego (Áreas y ajustes en `main.ts`). Sus botones orbitan los joysticks (`action-pad.css`, reglas.md §5.1). Botón naranja y elección de reto: `ui/interaction.ts` (`offerReto`, `chooseReto`), con la palabra del reto de `modules/chores/domain/palabra.ts` (`retoWord`, §5.2); en las tarjetas de máquina (santuario 3 y naves) `ui/machine-panel.ts` pasa sus botones `RETO_ACTS` por `chooseReto`. Foco del reto en todos los niveles: `adapters/three/interior/reto-focus.ts` (`sheetLens`, `retoFrame`/`focusReto`, `retoVisual`, `framePair`). Alcance de Áreas: `AreaMap.scopes` (cada nivel su jerarquía). Pantalla de carga de cada nivel: `ui/loading-screen.ts` con los dibujos de `ui/loading-pictures.ts` (tipados por `LevelId`, §5.3); cada juego llama a `doneLoading()` en su primer fotograma. Tabla por nivel: [design/ux-acciones.md](design/ux-acciones.md).
- **Retos:** `ChoreRun` sobre `Exercise` de `mind-duel`; la hoja es `ui/duel-view.ts`; mientras está abierta solo se ven la hoja y la escena. En el santuario 3 los retos se dibujan: `ui/trace-view.ts` ocupa el sitio de la hoja ([design/retos-trazos.md](design/retos-trazos.md)).
- **Ventanas de mapa:** Navegación, Áreas e inicio usan `ui/map-window.ts` (mapa 3D que se gira y amplía con el dedo).
- **Escala de interiores:** los datos son reales; la capa de presentación amplía en planta (`core/scale.ts`).

## Relación con Cold Sanctuary

Repositorio `videnacry/Cold-Sanctuary` (Unity, solo `.cs` y docs). Codeship porta sus reglas como dominio puro con
pruebas y sus escenas como datos (`SampleSceneBuilder*.cs` → `data/layout.ts`), citando el archivo de origen.
