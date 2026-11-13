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
| NAV-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-05 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NAV-06 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| SON-04 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
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
| EVA-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| EVA-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| ING-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| ING-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NNT-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NNT-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| NNT-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| MIS-01 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| MIS-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| MIS-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-01 | Sin probar | | | Sin test: es un adaptador del DOM |
| UI-02 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| UI-03 | Solo test | | | Tests citados en casos.md (verdes en la suite completa); sin run log jugado |
| CV-01 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-02 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · choque fijado, **HC-01** |
| CV-03 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **B-01** arreglado |
| CV-04 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **B-01** arreglado |
| CV-05 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **HC-02** |
| CV-06 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-07 | FAIL | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): `.fails` como se espera; **B-02** abierto |
| CV-08 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **HC-03** |
| CV-09 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-10 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **HC-04** |
| CV-11 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-12 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-13 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-14 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK |
| CV-15 | Probado (suite) | 2026-11-13 | `99b1cef` | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md): OK · **HC-05** |
| CV-16 | No aplica | | | No hay partidas guardadas (**HC-06**) |
| CV-17 | Probado (suite) | 2026-11-13 | | `embestida.test.ts`: OK · **HC-03** |

## Última ejecución por run log

La más reciente arriba.

| Fecha | Casos | Modo | Resultado | Run |
|---|---|---|---|---|
| 2026-11-13 10:18 | CV-01 a CV-15 | Vitest (`npx vitest run src/qa`) | 24 OK · 1 `.fails` esperado (CV-07, B-02) | [run](runs/2026-11-13-1018-cv-convivencia-vitest.md) |
