# Registro de QA

Estado y evidencia por caso de [casos.md](casos.md). **Sin evidencia no hay «probado»**: una fila solo
pasa a `Probado` con un run log de [runs/](runs/) y el commit contra el que se midió. Un `FAIL` se
anota como hallazgo en [hallazgos.md](hallazgos.md) y, si es un fallo, como `B-nn` en casos.md.
Se actualiza en el mismo commit que cambia el caso o que añade su run log.

Estados:

- `Probado (suite)`: run log de una ejecución de su suite de Vitest (los CV), con commit.
- `Probado (en vivo)`: run log de una partida jugada (a mano o con un recorrido PX), con commit, perfil y
  capturas.
- `Parcial`: el run log cubre una parte; la fila dice cuál.
- `FAIL`: la última ejecución falló (o un `.fails` sigue fallando como se espera); con su `B-nn`.
- `Solo test`: lo cubren tests que pasan en la suite completa, pero nadie lo ha jugado con run log.
- `Sin probar` · `No aplica` · `Retirado`.

Mantenerlo por debajo de 40 KB: si crece, la columna de evidencia guarda solo la última ejecución por
caso y las anteriores quedan en sus run logs.

## Interruptor «solo real» (2026-11-16)

Con `REAL_ONLY` (src/core/realism.ts, [pendientes.md](../pendientes.md)) la nodriza es una Starship sin
anillos, huerto, animales ni acuario. Los recorridos que juegan esa nave de ficción (**PX-01, PX-02, PX-13,
PX-14, PX-16, PX-20, PX-23, PX-25 y PX-27**) pasan al backlog: `npm run experiencia` los omite y `EXPERIENCIA_FICCION=1`
los juega con `?ficcion`. Su estado de abajo es el de la última ejecución con la nave de anillos. El recorrido
de la nave real es **PX-28** (`starship`); PX-03 y PX-04/05 leen la radio y auditan la Starship cuando no hay anillo.

## Estado por caso

| ID | Estado | Fecha | Commit | Evidencia / run |
|---|---|---|---|---|
| 2026-11-16 19:44 | PX-28 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1944-PX-28.md) |
| 2026-11-16 19:39 | PX-28 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1939-PX-28.md) |
| 2026-11-16 19:32 | PX-28 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1932-PX-28.md) |
| 2026-11-16 19:25 | PX-28 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1925-PX-28.md) |
| VUE-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-09 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-10 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-11 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-09 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-10 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-11 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-12 | Sin probar | | | Adaptador; lo juega PX-36 |
| NAV-13 | Sin probar | | | Adaptador; lo juegan PX-36 y PX-28 |
| NAV-14 | Solo test | | | `starship.test.ts` (verde en la suite completa); lo juega PX-28 |
| NAV-15 | Solo test | | | `panels.test.ts`, `mothership-equipment.test.ts` (verdes en la suite completa); lo juegan PX-28 y PX-36 |
| NAV-16 | Solo test | | | `dock-trip.test.ts` (verde en la suite completa); lo juega PX-36 |
| NAV-17 | Sin probar | | | Adaptador; lo juegan PX-07, PX-16 y PX-36 |
| NAV-18 | Sin probar | | | Adaptador; lo juega PX-07 |
| SON-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SUB-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SUB-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SUB-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SUB-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NIV-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NIV-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NIV-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NIV-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IRA-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IRA-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IRA-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IRA-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IRA-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); capturas `embestida-*` con Playwright (iPhone 13 y 1280×800, sin errores de página) |
| EST-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-45 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-09 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EST-20 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-21 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-22 | Retirado | 2026-11-16 | | La estación es la ISS, sin hangar ([estacion-real.md](../design/estacion-real.md)); lo sustituye EST-44 |
| EST-23 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-24 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-25 | Probado (en vivo) | 2026-11-16 | `ee051ea` | [run](runs/2026-11-16-1500-PX-16.md): PX-16 y `dry-dock.test.ts` |
| EST-26 | Solo test | | | `dry-dock.test.ts` (verde en la suite completa) |
| EST-28 | Solo test | | | `vehicle-catalogue.test.ts` |
| EST-29 | Solo test | | | `vehicle-yard.test.ts`; en vivo, PX-24 |
| EST-30 | Solo test | | | `vehicle-catalogue.test.ts` |
| EST-50 | Solo test | | | `component-supply.test.ts` |
| EST-51 | Solo test | | | `compartments.test.ts`, `crew-areas.test.ts`, `interior.test.ts`; jugado en PX-35 |
| EST-52 | Solo test | | | `compartments.test.ts`; jugado en PX-35, PX-33 y PX-04 |
| EST-53 | Solo test | | | `arm.test.ts`, `arm-chores.test.ts`; lo juega PX-39 |
| EST-54 | Solo test | | | `arm.test.ts`, `cargo-resupply.test.ts`; lo juega PX-39 |
| EST-55 | Solo test | | | `exterior-work.test.ts`; lo juega PX-39 |
| EST-27 | Probado (en vivo) | 2026-11-16 | `ee051ea` | [run](runs/2026-11-16-1500-PX-16.md): PX-16, `dock-trip.test.ts` y `journey-world.test.ts` |
| EST-41 | Probado (en vivo) | 2026-11-16 | `ba77230` | [run](runs/2026-11-16-2011-PX-29.md): `cargo-airlock.test.ts` y PX-29 |
| EST-42 | Probado (en vivo) | 2026-11-16 | `ba77230` | [run](runs/2026-11-16-2011-PX-29.md): `iss.test.ts`, `structure.test.ts`, `interior.test.ts` y PX-29 |
| EST-43 | Solo test | | | `outfit.test.ts` |
| EST-44 | Probado (en vivo) | 2026-11-16 | `ba77230` | [run](runs/2026-11-16-2011-PX-29.md): `hangar-berth.test.ts`, PX-12 y PX-29 |
| EST-05 | Parcial | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): suite OK; en vivo solo la tarjeta del almacén lleno (`hc-almacen-mobile.png`) |
| REF-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| REF-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| REF-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| REF-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| REF-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-09 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-10 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-11 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-12 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-13 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-14 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-15 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-16 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SV-17 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-10 | Solo test | | | `component-imports.test.ts` |
| IMP-11 | Solo test | | | `component-imports.test.ts` |
| VID-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VID-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| VID-09 | Solo test | | | `kitchen-visuals.test.ts`; jugado en PX-01 |
| VID-10 | Solo test | | | `step-visuals.test.ts`; jugado en PX-01 |
| VID-11 | Solo test | | | `aquarium.test.ts`, `aquarium-ops.test.ts`; jugado en PX-13 |
| VID-12 | Solo test | | | `aquarium.test.ts`, `aquarium-ops.test.ts`; jugado en PX-13 |
| VID-13 | Solo test | | | `aquarium.test.ts`, `aquarium-ops.test.ts`; jugado en PX-13 |
| VID-20 | Solo test | | | `crew-member.test.ts` y los CV de relojes (verdes en la suite completa); sin run log jugado |
| VID-24 | Solo test | | | `body-solver.test.ts`, `asana-player.test.ts`, `figure.test.ts`; jugado en PX-23 |
| VID-30 | Solo test | | | `adoption-ops.test.ts`, `aquarium.test.ts`; jugado en PX-27 |
| VID-31 | Solo test | | | `catalog.test.ts`; jugado en PX-27 |
| VID-32 | Solo test | | | `adoption-ops.test.ts`, `import-ops.test.ts`; jugado en PX-27 |
| VID-33 | Solo test | | | `sleep.test.ts`; jugado en PX-35 y PX-20 |
| VID-40 | Probado (en vivo) | 2026-11-17 | `1e45fe6` | [run](runs/2026-11-17-0459-PX-28-PX-31-PX-35-PX-37-PX-20.md): PX-20 133/133 pasos y PX-37 OK; `space-galley-visuals.test.ts` |
| EVA-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-04 | Solo test | | | `quest-eva.test.ts`; lo juega PX-39 |
| EVA-05 | Solo test | | | `eva.test.ts` (verde en la suite completa) |
| ING-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| ING-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| ING-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| ING-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); capturas `flechas-*` |
| ING-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| ING-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| ING-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| ING-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| NNT-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NNT-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NNT-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| MIS-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| MIS-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| MIS-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-01 | Sin probar | | | Sin test: es un adaptador del DOM |
| UI-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-06 | Probado (en vivo) | 2026-11-17 | `1e45fe6` | [run](runs/2026-11-17-0459-PX-28-PX-31-PX-35-PX-37-PX-20.md): PX-37 OK |
| HAB-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| HAB-12 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-15 lo juega |
| HAB-13 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-15 lo juega |
| HAB-14 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-15 lo juega |
| HAB-20 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-14 lo juega |
| HAB-21 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-14 lo juega |
| HAB-22 | Sin probar | | | Sin test: es un adaptador; el recorrido PX-14 lo juega |
| HAB-23 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-24 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-25 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-26 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-27 | Solo test | | | `crew-station.test.ts` verde; recorrido PX-32 pendiente de run log |
| HAB-36 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-37 | Sin probar | | | Adaptador; lo juega PX-36 |
| HAB-38 | Sin probar | | | Adaptador; lo juega PX-36 |
| HAB-39 | Solo test | | | `journey.test.ts` (verde en la suite completa); lo juegan PX-16 y PX-36 |
| HAB-28 | Solo test | | | `compartments.test.ts`, `starship-interior.test.ts`; jugado en PX-35 |
| HAB-30 | Probado (en vivo) | 2026-11-17 | `1e45fe6` | [run](runs/2026-11-17-0459-PX-28-PX-31-PX-35-PX-37-PX-20.md): PX-37 OK; `crew-areas.test.ts` |
| HAB-31 | Probado (en vivo) | 2026-11-17 | `1e45fe6` | [run](runs/2026-11-17-0459-PX-28-PX-31-PX-35-PX-37-PX-20.md): PX-37 OK |
| CV-01 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-02 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK · **HC-01** cerrado |
| CV-03 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **B-01** arreglado |
| CV-04 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **B-01** arreglado |
| CV-05 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK · **HC-02** cerrado; captura `hc-almacen-mobile.png` |
| CV-06 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-07 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK sin `.fails` · **B-02** arreglado |
| CV-08 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK · **HC-03** cerrado; en vivo `hc-viaje-amenaza-mobile.png` |
| CV-09 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-10 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK · **HC-04** cerrado |
| CV-11 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-12 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-13 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-14 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-15 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK · **HC-05** cerrado; botón bloqueado en `hc-pedido-sin-creditos-mobile.png` |
| CV-16 | No aplica | | | No hay partidas guardadas (**HC-06**) |
| CV-17 | Probado (suite) | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): OK · **HC-03** cerrado: el aviso dura 5 s reales en el tramo ×60 |
| CV-20 | Solo test | | | `comidas.test.ts` (verde en la suite completa) |
| PX-01 | Probado (en vivo) | 2026-11-16 | `1c1b689` | [run](runs/2026-11-16-1923-PX-01-PX-02-PX-13-PX-27.md): 54 OK |
| PX-02 | FAIL | 2026-11-16 | `1c1b689` | [run](runs/2026-11-16-1923-PX-01-PX-02-PX-13-PX-27.md): 28 OK, 1 FALLA |
| PX-03 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 18 OK |
| PX-04 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 33 OK |
| PX-05 | Probado (en vivo) | 2026-11-14 | `cb310e1` | [run](runs/2026-11-14-1626-PX-01-PX-02-PX-04-PX-05-PX-10-PX-11.md): 25 OK |
| PX-06 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 22 OK |
| PX-07 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 20 OK |
| PX-08 | Probado (en vivo) | 2026-11-17 | `cac133c` | [run](runs/2026-11-17-0244-PX-08-PX-09.md): 7 OK |
| PX-09 | Probado (en vivo) | 2026-11-17 | `cac133c` | [run](runs/2026-11-17-0244-PX-08-PX-09.md): 10 OK |
| PX-10 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 27 OK |
| PX-11 | Probado (en vivo) | 2026-11-17 | `a16e7fb` | [run](runs/2026-11-17-0143-PX-04-PX-08-PX-09-PX-11-PX-15-PX-20.md): 27 OK |
| PX-12 | Probado (en vivo) | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 34 OK |
| PX-13 | Probado (en vivo) | 2026-11-16 | `1c1b689` | [run](runs/2026-11-16-1923-PX-01-PX-02-PX-13-PX-27.md): 42 OK |
| PX-14 | Probado (en vivo) | 2026-11-17 | `d9ffc9f` | [run](runs/2026-11-17-0616-PX-14-PX-16.md): 34 OK |
| PX-15 | Probado (en vivo) | 2026-11-17 | `ee5f964` | [run](runs/2026-11-17-0352-PX-03-PX-04-PX-07-PX-12-PX-15-PX-24-PX-28-PX-29-PX-31-PX-32-PX-33-PX-20-PX-30-PX-36.md): 61 OK |
| PX-16 | Probado (en vivo) | 2026-11-17 | `8ee6cc7` | [run](runs/2026-11-17-0910-PX-16.md): 32 OK |
| PX-23 | Probado (en vivo) | 2026-11-16 | `e3b90f0` | [run](runs/2026-11-16-1521-PX-01-PX-02-PX-23.md): 62 OK |
| PX-24 | Probado (en vivo) | 2026-11-17 | `81f7379` | [run](runs/2026-11-17-0435-PX-04-PX-12-PX-24-PX-28-PX-29-PX-31-PX-33-PX-35-PX-20.md): 12 OK |
| PX-20 | Probado (en vivo) | 2026-11-17 | `dd6cdcb` | [run](runs/2026-11-17-0551-PX-37-PX-20.md): 179 OK |
| PX-25 | Probado (en vivo) | 2026-11-16 | `9de20b8` | [run](runs/2026-11-16-2058-PX-25.md): 41 OK |
| PX-30 | Probado (en vivo) | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 45 OK |
| PX-32 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 21 OK |
| PX-31 | Probado (en vivo) | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 24 OK |
| PX-27 | Probado (en vivo) | 2026-11-16 | `1c1b689` | [run](runs/2026-11-16-1952-PX-27.md): 28 OK |
| PX-28 | Probado (en vivo) | 2026-11-17 | `55edab9` | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md): 36 OK |
| PX-29 | Probado (en vivo) | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 52 OK |
| PX-33 | Probado (en vivo) | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 25 OK |
| PX-36 | Probado (en vivo) | 2026-11-17 | `b731a63` | [run](runs/2026-11-17-0850-PX-36.md): 34 OK |
| PX-35 | Probado (en vivo) | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 44 OK |
| PX-37 | Probado (en vivo) | 2026-11-17 | `e563a15` | [run](runs/2026-11-17-0635-PX-10-PX-12-PX-28-PX-29-PX-32-PX-35-PX-37-PX-36.md): 26 OK |
| PX-39 | FAIL | 2026-11-17 | `db785a0` | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md): 62 OK, 2 FALLA |

## Última ejecución por run log

La más reciente arriba.

| Fecha | Casos | Modo | Resultado | Run |
|---|---|---|---|---|
| 2026-11-17 09:32 | PX-12, PX-29, PX-31, PX-33, PX-35, PX-30, PX-39 | Experiencia (Playwright) | 6/7 recorridos bien | [run](runs/2026-11-17-0932-PX-12-PX-29-PX-31-PX-33-PX-35-PX-30-PX-39.md) |
| 2026-11-17 09:10 | PX-16 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-17-0910-PX-16.md) |
| 2026-11-17 08:50 | PX-36 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-17-0850-PX-36.md) |
| 2026-11-17 07:40 | PX-03, PX-04, PX-06, PX-07, PX-10, PX-12, PX-28, PX-31, PX-32, PX-36 | Experiencia (Playwright) | 9/10 recorridos bien | [run](runs/2026-11-17-0740-PX-03-PX-04-PX-06-PX-07-PX-10-PX-12-PX-28-PX-31-PX-32-PX-36.md) |
| 2026-11-17 06:35 | PX-10, PX-12, PX-28, PX-29, PX-32, PX-35, PX-37, PX-36 | Experiencia (Playwright) | 8/8 recorridos bien | [run](runs/2026-11-17-0635-PX-10-PX-12-PX-28-PX-29-PX-32-PX-35-PX-37-PX-36.md) |
| 2026-11-17 06:16 | PX-14, PX-16 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-17-0616-PX-14-PX-16.md) |
| 2026-11-17 05:55 | PX-14, PX-16 | Experiencia (Playwright) | 0/2 recorridos bien | [run](runs/2026-11-17-0555-PX-14-PX-16.md) |
| 2026-11-17 05:51 | PX-37, PX-20 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-17-0551-PX-37-PX-20.md) |
| 2026-11-17 05:44 | PX-28, PX-35, PX-36 | Experiencia (Playwright) | 3/3 recorridos bien | [run](runs/2026-11-17-0544-PX-28-PX-35-PX-36.md) |
| 2026-11-17 05:39 | PX-10, PX-12, PX-33, PX-30 | Experiencia (Playwright) | 4/4 recorridos bien | [run](runs/2026-11-17-0539-PX-10-PX-12-PX-33-PX-30.md) |
| 2026-11-17 05:16 | PX-10, PX-12, PX-28, PX-29, PX-31, PX-32, PX-35, PX-36 | Experiencia (Playwright) | 7/8 recorridos bien | [run](runs/2026-11-17-0516-PX-10-PX-12-PX-28-PX-29-PX-31-PX-32-PX-35-PX-36.md) |
| 2026-11-17 04:59 | PX-28, PX-31, PX-35, PX-37, PX-20 | Experiencia (Playwright) | 5/5 recorridos bien | [run](runs/2026-11-17-0459-PX-28-PX-31-PX-35-PX-37-PX-20.md) |
| 2026-11-17 04:53 | PX-20 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-17-0453-PX-20.md) |
| 2026-11-17 04:35 | PX-04, PX-12, PX-24, PX-28, PX-29, PX-31, PX-33, PX-35, PX-20 | Experiencia (Playwright) | 8/9 recorridos bien | [run](runs/2026-11-17-0435-PX-04-PX-12-PX-24-PX-28-PX-29-PX-31-PX-33-PX-35-PX-20.md) |
| 2026-11-17 04:08 | PX-32 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-17-0408-PX-32.md) |
| 2026-11-17 03:59 | PX-30 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-17-0359-PX-30.md) |
| 2026-11-17 03:52 | PX-03, PX-04, PX-07, PX-12, PX-15, PX-24, PX-28, PX-29, PX-31, PX-32, PX-33, PX-20, PX-30, PX-36 | Experiencia (Playwright) | 13/14 recorridos bien | [run](runs/2026-11-17-0352-PX-03-PX-04-PX-07-PX-12-PX-15-PX-24-PX-28-PX-29-PX-31-PX-32-PX-33-PX-20-PX-30-PX-36.md) |
| 2026-11-17 03:52 | PX-30 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-17-0352-PX-30.md) |
| 2026-11-17 03:37 | PX-32 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-17-0337-PX-32.md) |
| 2026-11-17 03:00 | PX-10, PX-12, PX-24, PX-28, PX-29, PX-31, PX-32, PX-33, PX-35, PX-20, PX-30 | Experiencia (Playwright) | 9/11 recorridos bien | [run](runs/2026-11-17-0300-PX-10-PX-12-PX-24-PX-28-PX-29-PX-31-PX-32-PX-33-PX-35-PX-20-PX-30.md) |
| 2026-11-17 02:57 | PX-06, PX-10, PX-28, PX-31, PX-32, PX-36 | Experiencia (Playwright) | 2/6 recorridos bien | [run](runs/2026-11-17-0257-PX-06-PX-10-PX-28-PX-31-PX-32-PX-36.md) |
| 2026-11-17 02:44 | PX-08, PX-09 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-17-0244-PX-08-PX-09.md) |
| 2026-11-17 02:35 | PX-36 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-17-0235-PX-36.md) |
| 2026-11-17 02:39 | PX-09 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-17-0239-PX-09.md) |
| 2026-11-17 02:04 | PX-03, PX-07, PX-09, PX-10, PX-28, PX-31, PX-32, PX-20 | Experiencia (Playwright) | 7/8 recorridos bien | [run](runs/2026-11-17-0204-PX-03-PX-07-PX-09-PX-10-PX-28-PX-31-PX-32-PX-20.md) |
| 2026-11-17 01:43 | PX-04, PX-08, PX-09, PX-11, PX-15, PX-20 | Experiencia (Playwright) | 6/6 recorridos bien | [run](runs/2026-11-17-0143-PX-04-PX-08-PX-09-PX-11-PX-15-PX-20.md) |
| 2026-11-17 01:40 | PX-33, PX-30 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-17-0140-PX-33-PX-30.md) |
| 2026-11-17 01:31 | PX-04, PX-12 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-17-0131-PX-04-PX-12.md) |
| 2026-11-17 01:24 | PX-03, PX-07, PX-10, PX-28, PX-31, PX-32 | Experiencia (Playwright) | 6/6 recorridos bien | [run](runs/2026-11-17-0124-PX-03-PX-07-PX-10-PX-28-PX-31-PX-32.md) |
| 2026-11-17 01:24 | PX-12, PX-28, PX-29, PX-30 | Experiencia (Playwright) | 4/4 recorridos bien | [run](runs/2026-11-17-0124-PX-12-PX-28-PX-29-PX-30.md) |
| 2026-11-17 01:16 | PX-24, PX-31, PX-33, PX-20 | Experiencia (Playwright) | 4/4 recorridos bien | [run](runs/2026-11-17-0116-PX-24-PX-31-PX-33-PX-20.md) |
| 2026-11-17 01:11 | PX-33 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-17-0111-PX-33.md) |
| 2026-11-16 23:05 | PX-31 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2305-PX-31.md) |
| 2026-11-16 22:39 | PX-03, PX-07, PX-09, PX-10, PX-12, PX-24, PX-28, PX-29, PX-31 | Experiencia (Playwright) | 8/9 recorridos bien | [run](runs/2026-11-16-2239-PX-03-PX-07-PX-09-PX-10-PX-12-PX-24-PX-28-PX-29-PX-31.md) |
| 2026-11-16 22:23 | PX-07, PX-09, PX-10, PX-24, PX-31 | Experiencia (Playwright) | 3/5 recorridos bien | [run](runs/2026-11-16-2223-PX-07-PX-09-PX-10-PX-24-PX-31.md) |
| 2026-11-16 21:17 | PX-04, PX-12, PX-28, PX-29, PX-30 | Experiencia (Playwright) | 5/5 recorridos bien | [run](runs/2026-11-16-2117-PX-04-PX-12-PX-28-PX-29-PX-30.md) |
| 2026-11-16 20:58 | PX-25 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2058-PX-25.md) |
| 2026-11-16 20:46 | PX-03, PX-06, PX-28, PX-30 | Experiencia (Playwright) | 4/4 recorridos bien | [run](runs/2026-11-16-2046-PX-03-PX-06-PX-28-PX-30.md) |
| 2026-11-16 20:34 | PX-06, PX-10, PX-12, PX-15 | Experiencia (Playwright) | 4/4 recorridos bien | [run](runs/2026-11-16-2034-PX-06-PX-10-PX-12-PX-15.md) |
| 2026-11-16 20:24 | PX-03, PX-04, PX-06, PX-10, PX-12, PX-15 | Experiencia (Playwright) | 4/6 recorridos bien | [run](runs/2026-11-16-2024-PX-03-PX-04-PX-06-PX-10-PX-12-PX-15.md) |
| 2026-11-16 20:21 | PX-12 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2021-PX-12.md) |
| 2026-11-16 20:19 | PX-28 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2019-PX-28.md) |
| 2026-11-16 20:19 | PX-30 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2019-PX-30.md) |
| 2026-11-16 20:16 | PX-28 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-2016-PX-28.md) |
| 2026-11-16 20:11 | PX-29 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2011-PX-29.md) |
| 2026-11-16 20:11 | PX-28 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-2011-PX-28.md) |
| 2026-11-16 20:09 | PX-28 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-2009-PX-28.md) |
| 2026-11-16 20:05 | PX-03 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-2005-PX-03.md) |
| 2026-11-16 19:57 | PX-12, PX-29 | Experiencia (Playwright) | 1/2 recorridos bien | [run](runs/2026-11-16-1957-PX-12-PX-29.md) |
| 2026-11-16 19:52 | PX-03, PX-04, PX-06, PX-10, PX-12, PX-15 | Experiencia (Playwright) | 1/6 recorridos bien | [run](runs/2026-11-16-1952-PX-03-PX-04-PX-06-PX-10-PX-12-PX-15.md) |
| 2026-11-16 19:52 | PX-27 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1952-PX-27.md) |
| 2026-11-16 19:35 | PX-04, PX-12, PX-29 | Experiencia (Playwright) | 2/3 recorridos bien | [run](runs/2026-11-16-1935-PX-04-PX-12-PX-29.md) |
| 2026-11-16 19:24 | PX-12, PX-29 | Experiencia (Playwright) | 0/2 recorridos bien | [run](runs/2026-11-16-1924-PX-12-PX-29.md) |
| 2026-11-16 19:23 | PX-01, PX-02, PX-13, PX-27 | Experiencia (Playwright) | 2/4 recorridos bien | [run](runs/2026-11-16-1923-PX-01-PX-02-PX-13-PX-27.md) |
| 2026-11-16 19:06 | PX-01, PX-02 | Experiencia (Playwright) | 1/2 recorridos bien | [run](runs/2026-11-16-1906-PX-01-PX-02.md) |
| 2026-11-16 18:55 | PX-15 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1855-PX-15.md) |
| 2026-11-16 18:53 | PX-13, PX-27 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-16-1853-PX-13-PX-27.md) |
| 2026-11-16 18:46 | PX-20 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1846-PX-20.md) |
| 2026-11-16 18:38 | PX-13 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1838-PX-13.md) |
| 2026-11-16 18:35 | PX-14, PX-15, PX-25 | Experiencia (Playwright) | 2/3 recorridos bien | [run](runs/2026-11-16-1835-PX-14-PX-15-PX-25.md) |
| 2026-11-16 18:26 | PX-13, PX-27 | Experiencia (Playwright) | 1/2 recorridos bien | [run](runs/2026-11-16-1826-PX-13-PX-27.md) |
| 2026-11-16 18:21 | PX-25 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1821-PX-25.md) |
| 2026-11-16 18:16 | PX-12 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1816-PX-12.md) |
| 2026-11-16 18:08 | PX-27 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1808-PX-27.md) |
| 2026-11-16 18:05 | PX-04, PX-12 | Experiencia (Playwright) | 1/2 recorridos bien | [run](runs/2026-11-16-1805-PX-04-PX-12.md) |
| 2026-11-16 18:00 | PX-24 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1800-PX-24.md) |
| 2026-11-16 17:59 | PX-24 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1759-PX-24.md) |
| 2026-11-16 17:02 | PX-20 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1702-PX-20.md) |
| 2026-11-16 15:36 | PX-02, PX-10, PX-14 | Experiencia (Playwright) | 3/3 recorridos bien | [run](runs/2026-11-16-1536-PX-02-PX-10-PX-14.md) |
| 2026-11-16 15:21 | PX-01, PX-02, PX-23 | Experiencia (Playwright) | 2/3 recorridos bien | [run](runs/2026-11-16-1521-PX-01-PX-02-PX-23.md) |
| 2026-11-16 15:19 | PX-14, PX-16 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-16-1519-PX-14-PX-16.md) |
| 2026-11-16 15:00 | PX-02, PX-10, PX-11 | Experiencia (Playwright) | 2/3 recorridos bien | [run](runs/2026-11-16-1500-PX-02-PX-10-PX-11.md) |
| 2026-11-16 15:00 | PX-16 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1500-PX-16.md) |
| 2026-11-16 14:57 | PX-12 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1457-PX-12.md) |
| 2026-11-16 14:49 | PX-12 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-16-1449-PX-12.md) |
| 2026-11-16 14:47 | PX-01, PX-23 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-16-1447-PX-01-PX-23.md) |
| 2026-11-16 14:43 | PX-02, PX-11 | Experiencia (Playwright) | 0/2 recorridos bien | [run](runs/2026-11-16-1443-PX-02-PX-11.md) |
| 2026-11-16 14:30 | PX-12, PX-14, PX-16 | Experiencia (Playwright) | 2/3 recorridos bien | [run](runs/2026-11-16-1430-PX-12-PX-14-PX-16.md) |
| 2026-11-16 14:20 | PX-16 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-16-1420-PX-16.md) |
| 2026-11-16 14:10 | PX-01, PX-02, PX-10, PX-11, PX-13 | Experiencia (Playwright) | 3/5 recorridos bien | [run](runs/2026-11-16-1410-PX-01-PX-02-PX-10-PX-11-PX-13.md) |
| 2026-11-14 19:25 | PX-02, PX-10, PX-12, PX-14, PX-15 | Experiencia (Playwright) | 4/5 recorridos bien | [run](runs/2026-11-14-1925-PX-02-PX-10-PX-12-PX-14-PX-15.md) |
| 2026-11-14 18:38 | PX-02, PX-10, PX-15 | Experiencia (Playwright) | 2/3 recorridos bien | [run](runs/2026-11-14-1838-PX-02-PX-10-PX-15.md) |
| 2026-11-14 18:22 | PX-02, PX-04, PX-10, PX-12, PX-15 | Experiencia (Playwright) | 3/5 recorridos bien | [run](runs/2026-11-14-1822-PX-02-PX-04-PX-10-PX-12-PX-15.md) |
| 2026-11-14 18:19 | PX-04, PX-13 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-14-1819-PX-04-PX-13.md) |
| 2026-11-14 18:06 | PX-04, PX-10, PX-12 | Experiencia (Playwright) | 3/3 recorridos bien | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md) |
| 2026-11-14 18:00 | PX-12 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-14-1800-PX-12.md) |
| 2026-11-14 16:26 | PX-01, PX-02, PX-04, PX-05, PX-10, PX-11 | Experiencia (Playwright) | 6/6 recorridos bien | [run](runs/2026-11-14-1626-PX-01-PX-02-PX-04-PX-05-PX-10-PX-11.md) |
| 2026-11-13 17:13 | PX-01, PX-02, PX-03, PX-04, PX-05, PX-06, PX-07, PX-08, PX-09, PX-10, PX-11 | Experiencia (Playwright) | 11/11 recorridos bien | [run](runs/2026-11-13-1713-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09-PX-10-PX-11.md) |
| 2026-11-13 16:45 | PX-01, PX-02, PX-03, PX-04, PX-05, PX-06, PX-07, PX-08, PX-09 | Experiencia (Playwright) | 9/9 recorridos bien | [run](runs/2026-11-13-1645-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09.md) |
| 2026-11-13 16:32 | PX-02, PX-07, PX-08, PX-09 | Experiencia (Playwright) | 4/4 recorridos bien | [run](runs/2026-11-13-1632-PX-02-PX-07-PX-08-PX-09.md) |
| 2026-11-13 15:55 | PX-01, PX-02, PX-03, PX-04, PX-05, PX-06, PX-07, PX-08, PX-09 | Experiencia (Playwright) | 9/9 recorridos bien | [run](runs/2026-11-13-1555-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09.md) |
| 2026-11-13 15:46 | PX-01, PX-02, PX-03, PX-04, PX-05, PX-06 | Experiencia (Playwright) | 5/6 recorridos bien | [run](runs/2026-11-13-1546-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06.md) |
| 2026-11-13 15:38 | PX-05 | Experiencia (Playwright) | 0/1 recorridos bien | [run](runs/2026-11-13-1538-PX-05.md) |
| 2026-11-13 15:37 | PX-05 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-13-1537-PX-05.md) |
| 2026-11-13 15:32 | PX-01, PX-05 | Experiencia (Playwright) | 1/2 recorridos bien | [run](runs/2026-11-13-1532-PX-01-PX-05.md) |
| 2026-11-13 15:14 | PX-01, PX-02, PX-03, PX-04, PX-05, PX-06 | Experiencia (Playwright) | 4/6 recorridos bien | [run](runs/2026-11-13-1514-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06.md) |
| 2026-11-13 14:55 | PX-01, PX-02, PX-03, PX-04, PX-05 | Experiencia (Playwright) | 4/5 recorridos bien | [run](runs/2026-11-13-1455-PX-01-PX-02-PX-03-PX-04-PX-05.md) |
| 2026-11-13 14:15 | PX-01, PX-03 | Experiencia (Playwright) | 2/2 recorridos bien | [run](runs/2026-11-13-1415-PX-01-PX-03.md) |
| 2026-11-13 14:06 | PX-01 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-13-1406-PX-01.md) |
| 2026-11-13 12:00 | CV-01 a CV-17, EST-05 (decisiones HC-01 a HC-05 y B-02) | Vitest (`npx vitest run src/qa`) y Playwright iPhone 13 | 32 OK · 0 `.fails`; en vivo 3 capturas sin errores de página | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md) |
| 2026-11-13 11:11 | PX-01 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-13-1111-PX-01.md) |
| 2026-11-13 11:00 | PX-01, PX-02, PX-03, PX-04, PX-05 | Experiencia (Playwright) | 5/5 recorridos bien | [run](runs/2026-11-13-1100-PX-01-PX-02-PX-03-PX-04-PX-05.md) |
| 2026-11-13 10:41 | PX-01, PX-02, PX-03, PX-04, PX-05 | Experiencia (Playwright) | 3/5 recorridos bien | [run](runs/2026-11-13-1041-PX-01-PX-02-PX-03-PX-04-PX-05.md) |
| 2026-11-13 10:18 | CV-01 a CV-15 | Vitest (`npx vitest run src/qa`) | 24 OK · 1 `.fails` esperado (CV-07, B-02) | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md) |
