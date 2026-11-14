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

## Estado por caso

| ID | Estado | Fecha | Commit | Evidencia / run |
|---|---|---|---|---|
| VUE-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| VUE-09 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
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
| EST-20 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-21 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-22 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-23 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-24 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): PX-12 y la suite |
| EST-05 | Parcial | 2026-11-13 | `c21eebe` | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md): suite OK; en vivo solo la tarjeta del almacén lleno (`hc-almacen-mobile.png`) |
| REF-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| REF-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| REF-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| BIO-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| IMP-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
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
| EVA-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
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
| HAB-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-07 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| HAB-08 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-02 lo juega |
| HAB-20 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-14 lo juega |
| HAB-21 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); el recorrido PX-14 lo juega |
| HAB-22 | Sin probar | | | Sin test: es un adaptador; el recorrido PX-14 lo juega |
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
| PX-01 | Probado (en vivo) | 2026-11-14 | `cb310e1` | [run](runs/2026-11-14-1626-PX-01-PX-02-PX-04-PX-05-PX-10-PX-11.md): 49 OK |
| PX-02 | Probado (en vivo) | 2026-11-14 | `cb310e1` | [run](runs/2026-11-14-1626-PX-01-PX-02-PX-04-PX-05-PX-10-PX-11.md): 29 OK |
| PX-03 | Probado (en vivo) | 2026-11-13 | `f59ae5a` | [run](runs/2026-11-13-1713-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09-PX-10-PX-11.md): 14 OK |
| PX-04 | Probado (en vivo) | 2026-11-14 | `603b891` | [run](runs/2026-11-14-1819-PX-04-PX-13.md): 27 OK |
| PX-05 | Probado (en vivo) | 2026-11-14 | `cb310e1` | [run](runs/2026-11-14-1626-PX-01-PX-02-PX-04-PX-05-PX-10-PX-11.md): 25 OK |
| PX-06 | Probado (en vivo) | 2026-11-13 | `f59ae5a` | [run](runs/2026-11-13-1713-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09-PX-10-PX-11.md): 20 OK |
| PX-07 | Probado (en vivo) | 2026-11-13 | `f59ae5a` | [run](runs/2026-11-13-1713-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09-PX-10-PX-11.md): 13 OK |
| PX-08 | Probado (en vivo) | 2026-11-13 | `f59ae5a` | [run](runs/2026-11-13-1713-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09-PX-10-PX-11.md): 7 OK |
| PX-09 | Probado (en vivo) | 2026-11-13 | `f59ae5a` | [run](runs/2026-11-13-1713-PX-01-PX-02-PX-03-PX-04-PX-05-PX-06-PX-07-PX-08-PX-09-PX-10-PX-11.md): 9 OK |
| PX-10 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): 21 OK |
| PX-11 | Probado (en vivo) | 2026-11-14 | `cb310e1` | [run](runs/2026-11-14-1626-PX-01-PX-02-PX-04-PX-05-PX-10-PX-11.md): 21 OK |
| PX-12 | Probado (en vivo) | 2026-11-14 | `f1df8fc` | [run](runs/2026-11-14-1806-PX-04-PX-10-PX-12.md): 23 OK |
| PX-13 | Probado (en vivo) | 2026-11-14 | `603b891` | [run](runs/2026-11-14-1819-PX-04-PX-13.md): 25 OK |
| PX-14 | Sin probar | | | Recorrido nuevo |

## Última ejecución por run log

La más reciente arriba.

| Fecha | Casos | Modo | Resultado | Run |
|---|---|---|---|---|
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
| 2026-11-13 11:11 | PX-01 | Experiencia (Playwright) | 1/1 recorridos bien | [run](runs/2026-11-13-1111-PX-01.md) |
| 2026-11-13 11:00 | PX-01, PX-02, PX-03, PX-04, PX-05 | Experiencia (Playwright) | 5/5 recorridos bien | [run](runs/2026-11-13-1100-PX-01-PX-02-PX-03-PX-04-PX-05.md) |
| 2026-11-13 12:00 | CV-01 a CV-17, EST-05 (decisiones HC-01 a HC-05 y B-02) | Vitest (`npx vitest run src/qa`) y Playwright iPhone 13 | 32 OK · 0 `.fails`; en vivo 3 capturas sin errores de página | [run](runs/2026-11-13-1200-hc-decisiones-vitest.md) |
| 2026-11-13 10:41 | PX-01, PX-02, PX-03, PX-04, PX-05 | Experiencia (Playwright) | 3/5 recorridos bien | [run](runs/2026-11-13-1041-PX-01-PX-02-PX-03-PX-04-PX-05.md) |
| 2026-11-13 10:18 | CV-01 a CV-15 | Vitest (`npx vitest run src/qa`) | 24 OK · 1 `.fails` esperado (CV-07, B-02) | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md) |
