# Ramas, worktrees y fusiones

### Las fusiones chocan sobre todo en `src/main.ts`

- **Síntoma:** casi cada `Merge integracion en <rama>` resuelve conflictos a mano en `main.ts`.
- **Medido:** 2026-11-13, sobre las 34 fusiones de la historia: en 22 las dos ramas habían tocado
  `src/main.ts` desde su base común; después `src/ui/style.css` (8), `chores/domain/chore.ts` (5),
  `README.md` (5), `ui/nav-map.ts` e `interior.ts` (4). Cálculo: `git merge-base` de los dos padres y
  ficheros cambiados en ambos lados.
- **Cómo se evita:** el cableado nuevo va en su propio fichero de pegamento (`src/<proceso>.ts`, como
  `subjugation-levels.ts` o `wrath-mode.ts`) y en `main.ts` queda una línea; la lógica entre procesos va
  en funciones puras con test (`frameClocks`). Fusionar `integracion` en la rama a menudo.
- **Dónde:** `src/main.ts`; [entrelazamiento.md](../qa/entrelazamiento.md).

### Un worktree comparte `node_modules` con un enlace, y git lo ignora

- **Medido:** 2026-11-13, `git check-ignore -v node_modules` en un worktree con
  `ln -s /home/user/codeship/node_modules node_modules`: lo ignora la línea `node_modules` (sin barra
  final) de `.gitignore`. Con `node_modules/` no ignoraría un enlace.
- **Cómo se evita:** no cambiar esa línea a `node_modules/`; no commitear el enlace.
- **Dónde:** `.gitignore`.

### Antes de fusionar, los casos de las áreas tocadas y los CV que las cruzan

- **Hipótesis:** los choques entre procesos aparecen al fusionar dos ramas que tocan el mismo estado
  compartido (por ejemplo, `viajes-retos` y `niveles-subyugacion` juntaron la cámara rápida con los
  paquetes de nivel y nadie vio B-01 hasta los CV).
- **Cómo se evita:** el paso «antes de fusionar» de [docs/qa/README.md](../qa/README.md).
- **Dónde:** `c93f1cd` (fusión de `viajes-retos`), B-01.
