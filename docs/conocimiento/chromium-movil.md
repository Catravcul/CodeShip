# Chromium, móvil y navegador sin GPU

### Sin GPU (SwiftShader) la escena va a 2–6 fps y el juego entero va más lento que el reloj de pared

- **Síntoma:** un viaje de «75 s» tarda varios minutos en un recorrido de Playwright en el contenedor;
  las esperas por tiempo fallan.
- **Medido:** la rama `jugabilidad-ux` (`docs/testing.md`) midió 2–6 fps con Chromium por software
  (`--use-angle=swiftshader`) en el contenedor. **Medido (código):** `main.ts` limita el paso del
  fotograma a `Math.min(dt, 0,1)`, así que por debajo de 10 fps cada segundo de pared avanza solo
  fps × 0,1 s de juego: a 4 fps, 0,4 s. El tope de 75 s de un viaje se cuenta en ese tiempo, no en el de
  pared (≈ 190 s a 4 fps).
- **Cómo se evita:** en los recorridos, esperar a un estado del juego (`window.codeship…`, un texto en
  pantalla), nunca un número de segundos. Los presupuestos de fotograma solo se aplican con GPU real.
- **Dónde:** `src/main.ts` (bucle), `docs/testing.md` de `jugabilidad-ux`; relacionado con B-02.

### La vista de retos (HUD o panel) se lee de `localStorage` una vez, al crear `DuelView`

- **Síntoma:** escribir `codeship.retos-ui` en `localStorage` desde una prueba con la página ya
  cargada no cambia la vista; el botón «Vista HUD» sí la cambia al momento.
- **Medido (código):** 2026-11-13. El constructor de `DuelView` pone la clase `ui-compact` en `body`
  según `localStorage`; después solo la cambia `setCompactUi` (el botón). Sin recargar, un valor
  escrito por fuera no llega a la clase.
- **Cómo se evita:** en Playwright, `addInitScript` para fijar el valor antes de cargar, o recargar; en
  el juego, cambiar siempre por `setCompactUi`.
- **Dónde:** `src/ui/duel-view.ts`; caso UI-01.

### En modo privado `localStorage` puede lanzar

- **Hipótesis:** Safari en modo privado (antiguo) lanza al escribir en `localStorage`.
- **Cómo se evita:** todo acceso va en `try/catch` y el ajuste vale solo para la sesión, como en
  `compactUi`/`setCompactUi`.
- **Dónde:** `src/ui/duel-view.ts`.

### El perfil de referencia es iPhone 13 con la CPU ×4

- **Medido:** rama `jugabilidad-ux`: Playwright con el perfil iPhone 13 y
  `Emulation.setCPUThrottlingRate` ×4 por CDP. Las capturas del repo usan iPhone 13 y 1280 × 800.
- **Cómo se evita:** los run logs dicen el perfil; un número de rendimiento sin perfil no vale.
- **Dónde:** `docs/testing.md` y `tools/experiencia/lib.mjs` de `jugabilidad-ux`; plantilla de run log.
