# Edificios y pisos: reglas indexadas

Índice único de las reglas de los edificios-árbol y sus pisos. Se aplican igual en el santuario 1 (edificios-árbol
sobre el mar) y en el santuario 3, que desde el 2026-11-28 **tiene los mismos edificios del santuario 1, tal cual**
(el mismo código, `buildTowers`), dentro de la nave excavada en la [montaña](montana-hueca.md), y dos más con sus reglas
para los pisos de entrenamiento: las reglas E1–E11 y E13 se cumplen allí porque son los del santuario 1. El texto completo de
cada regla está en [reglas.md](reglas.md) §2; aquí, su número, en qué consiste y dónde se comprueba.

| # | Regla | Santuario 1 | Santuario 3 |
|---|---|---|---|
| E1 | **Separación**: 2 m entre elementos con los que se interactúa; escala de interiores ×1,5 (reglas §2.4–2.5) | `reglas.test.ts` | `fixtures.test.ts` |
| E2 | **Los pisos nacen del tronco**: 2 por nivel, en lados opuestos, pegados a su cara (reglas §2.7) | `site.ts` | los del santuario 1 (`buildTowers`); `montana.test.ts` («tal cual») |
| E3 | **Molinete**: cada nivel girado 90° respecto al de abajo; ningún piso encima del siguiente (§2.7) | `site.ts` | los del santuario 1 |
| E4 | **Paso entre niveles**: al menos 22 m, y más si la sala de abajo y la piscina lo piden (sala + 4 m + hondo) | `site.ts` | los del santuario 1; las salas de entrenamiento caben en 22 m (`montana.test.ts`) |
| E5 | **Sin patas**: los sostienen tornapuntas diagonales al tronco (§2.7) | `floors/kit.ts` | los del santuario 1 (dibujados por `s1-models.ts`) |
| E6 | **Un piso por actividad**; los que hacen lo mismo se juntan; pisos **mixtos** por afinidad (§2.7b, §2.9, §2.13) | `organizacion.ts` | `TRAINING_TOWERS` (gimnasio + trajes, Dragon + LM, robótica + control); los servicios en el piso del santuario 1 que los hace (`CAMPUS_IN_S1`) |
| E7 | **Cima**: lo que no cabe en un piso va a la copa, sola en su nivel (§2.13) | `organizacion.ts` | los pisos de entrenamiento crecen a la medida de su sala (`TowerSpec.square`): la NBL y la centrífuga caben en un piso |
| E8 | **Maquinaria repartida**: ningún punto a más de 6 m de algo, fuera del borde, la puerta y el rellano (§2.10) | `reglas.test.ts` | los del santuario 1; las salas de entrenamiento con su equipo (`fixtures.test.ts`) |
| E9 | **Una clase por piso** (§2.11) | `site.ts` | aulas y biblioteca en la cima de Ciencias (la del santuario 1) |
| E10 | **Estación de alfombras** en cada piso, pie y copa, como apéndice del borde; vuelos por carriles libres que no tocan nada (§2.8) | `reglas.test.ts` | las del santuario 1 y las de compuertas y Starship; `montana.test.ts` («cada vuelo… sin tocar nada ni el techo») |
| E11 | **Pisos de edificios distintos nunca se cruzan** (§2.7) | `mapa.test.ts` | `layout.test.ts` (las salas no se pisan) |
| E12 | **Bajo el techo** (solo santuario 3): cada edificio con 6 m de aire bajo el techo de la nave y las alfombras por debajo (antes: cada tronco sostenía el techo) | — | `montana.test.ts` («todo cabe bajo el techo») |
| E13 | **Pisos sin paredes ni tejado; borde abierto**: desde cada lado que no da al tronco se tira al piso de abajo, al suelo o al agua; sin límite de caída dentro de un edificio (§2.10) | `caidas.test.ts` | `caidas.test.ts` (`dropLimit`, los pisos de la nave) |
| E14 | **Paso de puertas y compuertas**: el mayor vehículo o animal + 2 m a cada lado y por encima, calculado de los datos (si crece la fauna, crece el paso) | `paso.ts`, `reglas.test.ts` | `GATE_PASSAGE`, `montana.test.ts` |
| E15 | **Los árboles parecen árboles** | — (edificios-árbol con pisos) | sustituida (2026-11-28): los edificios son los del santuario 1, con su tronco de agua y sus pisos de madera |
| E16 | **Centro libre** (solo santuario 3): nada en 45 m alrededor del centro de la nave, del lago al techo, salvo la pupa de la abeja con su galería y su muelle ([pupa-abeja.md](pupa-abeja.md)) | — | `CENTRE_FREE_M`, `montana.test.ts` |

Al añadir una regla de edificios, se añade aquí con su número y su prueba.

## Comparación con Cold Sanctuary

En Cold Sanctuary (Unity) los pisos de los edificios-árbol son tablados sin barandilla (`Deck`, `InclinedStair`) con un
borde libre de 2,5 m «para tirarse» (`docs/areas/rediseno-pisos-arboles.md`, `edificio-arbol.md`); las primeras zonas
elevadas llevaban una barandilla de 1 m (`construcciones-elevadas.md`), que el rediseño quitó. Codeship sigue el
rediseño: sin paredes, sin tejado y sin barandilla (E13), con los mismos 2,5 m de borde libre (E8). Lo que Codeship añade
y Cold Sanctuary no tiene: el paso medido de la fauna (E14), las estaciones de alfombras (E10) y, en el santuario 3, el
techo y el centro libre de la nave (E12, E16).
