# Relevo entre sesiones y agentes

Para seguir el trabajo sin perder nada cuando una sesión se acaba o se reparte entre agentes. Con esto, `CLAUDE.md`
y los `docs/` del proyecto, una sesión nueva puede continuar sin explorar el código otra vez.

## Cuándo se escribe

- Cuando la sesión pasa de **~400k tokens**, o antes de que se corte.
- Al terminar una tarea larga sin acabar todo lo pedido.
- Cada agente que trabajó en un worktree escribe el suyo antes de cerrar.

## Antes de escribirlo: cerrar procesos

Un relevo no hereda procesos. Antes de escribirlo, la sesión que se va:

1. **Para todo lo que dejó corriendo**: `vite` / `npm run dev`, `vite preview`, Playwright, vigilantes (`--watch`),
   tareas en segundo plano. Comprueba que no queda ninguno (`jobs`, `ps aux | grep -E "vite|node|playwright"`).
2. Anota en el relevo qué había arrancado y cómo se vuelve a arrancar (el comando, no el proceso).
3. Deja el árbol limpio: todo en commits y empujado a su rama, o dicho en el relevo qué queda sin commit y por qué.

La sesión nueva arranca sus propios procesos con esos comandos; nunca da por hecho que algo sigue en marcha.

## Qué lleva (plantilla)

Se escribe al final de este archivo, en una sección con la fecha, y se borran los relevos ya terminados.

```md
## Relevo AAAA-MM-DD HH:MM — <tema>

- **Rama / worktree:** `<rama>` (PR #n hacia `integracion`, o sin PR)
- **Pedido de Berón:** <en sus palabras, o el enlace a la lista de docs/design/<sistema>.md>
- **Hecho:** <lo terminado, con commits o PR>
- **Pendiente:** <lista corta, en orden>
- **Decisiones de Berón:** <lo que dijo y cambia cómo se hace>
- **Cómo seguir:** <comandos: pruebas que tocan, cómo levantar y revisar en vivo>
- **Procesos:** ninguno corriendo (o: estaba `npm run dev`; se vuelve a arrancar con `npm run dev`)
- **Ojo:** <trampas encontradas, lo que no funcionó>
```

## Varios agentes a la vez (worktrees)

Solo para tareas **independientes** (sistemas o edificios distintos): cada agente empieza de cero y relee el
contexto, así que repartir ahorra tiempo, no tokens.

1. La sesión principal reparte: una tarea por agente, con su rama `tema` desde `integracion` y su worktree
   (`git worktree add ../codeship-<tema> -b <tema> integracion`).
2. Cada agente trabaja solo en su worktree, corre las pruebas de lo suyo, abre su PR hacia `integracion` y escribe
   su relevo (cerrando antes sus procesos).
3. La sesión principal revisa el CI de cada PR, lo fusiona; la web de pruebas se publica sola
   (`.github/workflows/pages.yml`) y se revisa en vivo.
4. Al fusionar, se borra el worktree y la rama: `git worktree remove ../codeship-<tema>` y `git branch -d <tema>`.

Dos agentes nunca tocan el mismo archivo a la vez; si hace falta, uno espera al PR del otro.

## Relevo 2026-11-24 02:00 — retos, microcosmos, máquinas de simulación

- **Rama / worktree:** todo fusionado en `integracion` (PR #18 a #21); este relevo, rama `relevo-1124`.
- **Pedido de Berón:** listas 13.ª y 14.ª de [design/santuario1.md](design/santuario1.md) (#110–#120) y
  [design/microcosmos.md](design/microcosmos.md).
- **Hecho:** máquina de simulación y retos de área en equipo (#18); microcosmos de la Academia de Platón (#19);
  diálogos como retos y 2.ª tanda de retos propios (#20); todos los objetos con reto propio, embrión de pulpo y una
  máquina por piso con todos los microcosmos (#21).
- **Pendiente:** otros santuarios (pedido de Berón sin detallar); más microcosmos con el mismo patrón; propuestos en
  microcosmos.md (noche con lámparas, fauna).
- **Decisiones de Berón:** recompensa para todos los que participan en un reto de equipo; el embrión del globo es un
  pulpo; cada piso con su máquina, y cualquier máquina lleva a todos los microcosmos.
- **Cómo seguir:** `npx vitest run src/modules/sanctuary-one src/modules/microcosmos`; en vivo: `npx vite build --base=./`,
  `npx vite preview --port 4173`, Playwright con Chrome del sistema (`--use-angle=swiftshader`); ganchos en
  `window.codeshipS1` (`microAt`, `micro.teleport`, `simAt`, `retoAt`).
- **Procesos:** ninguno corriendo.
- **Ojo:** las capturas con `clip` de Playwright cambian el viewport y la cámara: capturar entero y recortar. Los botones
  del pad son `position:fixed` (`offsetParent` null). El paso «Player experience» del CI tarda mucho: se fusiona con
  pruebas unitarias, tipos, arquitectura, docs y build en verde.
