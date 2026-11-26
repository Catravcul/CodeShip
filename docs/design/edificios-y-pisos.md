# Edificios y pisos: reglas indexadas

Índice único de las reglas de los edificios-árbol y sus pisos. Se aplican igual en el santuario 1 (edificios-árbol
sobre el mar) y en el santuario 3 (árboles gigantes de la [montaña hueca](montana-hueca.md)). El texto completo de
cada regla está en [reglas.md](reglas.md) §2; aquí, su número, en qué consiste y dónde se comprueba.

| # | Regla | Santuario 1 | Santuario 3 |
|---|---|---|---|
| E1 | **Separación**: 2 m entre elementos con los que se interactúa; escala de interiores ×1,5 (reglas §2.4–2.5) | `reglas.test.ts` | `fixtures.test.ts` |
| E2 | **Los pisos nacen del tronco**: 2 por nivel, en lados opuestos, pegados a su cara (reglas §2.7) | `site.ts` | `montana.test.ts` («dos por nivel en lados opuestos») |
| E3 | **Molinete**: cada nivel girado 90° respecto al de abajo; ningún piso encima del siguiente (§2.7) | `site.ts` | `montana.test.ts` |
| E4 | **Paso entre niveles**: al menos 22 m, y más si la sala de abajo y la piscina lo piden (sala + 4 m + hondo) | `site.ts` | `GIANT.levelGap`, `montana.test.ts` |
| E5 | **Sin patas**: los sostienen tornapuntas diagonales al tronco (§2.7) | `floors/kit.ts` | bloques «riostra» |
| E6 | **Un piso por actividad**; los que hacen lo mismo se juntan; pisos **mixtos** por afinidad (§2.7b, §2.9, §2.13) | `organizacion.ts` | `GIANT_TREES` (gimnasio + trajes, Dragon + LM, robótica + control) |
| E7 | **Cima**: lo que no cabe en un piso va a la copa, sola en su nivel (§2.13) | `organizacion.ts` | NBL y centrífuga; `montana.test.ts` («la cima sola arriba») |
| E8 | **Maquinaria repartida**: ningún punto a más de 6 m de algo, fuera del borde, la puerta y el rellano (§2.10) | `reglas.test.ts` | `campus-fixtures.ts` |
| E9 | **Una clase por piso** (§2.11) | `site.ts` | aulas y biblioteca en pisos propios |
| E10 | **Estación de alfombras** en cada piso, pie y copa, como apéndice del borde; vuelos por carriles libres que no tocan nada (§2.8) | `reglas.test.ts` | `montana.test.ts` («cada vuelo… sin tocar nada») |
| E11 | **Pisos de edificios distintos nunca se cruzan** (§2.7) | `mapa.test.ts` | `layout.test.ts` |
| E12 | **Bajo el techo** (solo santuario 3): cada tronco llega al techo y lo sostiene; ningún piso ni sala lo toca (6 m de holgura) | — | `montana.test.ts` |
| E13 | **Pisos sin paredes ni tejado; borde abierto**: desde cada lado que no da al tronco se tira al piso de abajo, al suelo o al agua; sin límite de caída dentro de un edificio (§2.10) | `caidas.test.ts` | `caidas.test.ts` (`dropLimit`) |
| E14 | **Paso de puertas y cuevas**: el mayor vehículo o animal + 2 m a cada lado y por encima, calculado de los datos (si crece la fauna, crece el paso) | `paso.ts`, `reglas.test.ts` | `CAVE_PASSAGE`, `montana.test.ts` |
| E15 | **Los árboles parecen árboles**: corteza, ramas, hojas, frutos y flores; la copa sobre los pisos y bajo el techo, sólida para los carriles de alfombras | — (edificios-árbol con pisos) | `crownOf`, `montana.test.ts` («parece un árbol») |
| E16 | **Centro libre** (solo santuario 3): nada en 45 m alrededor del centro del hueco, del lago al techo | — | `CENTRE_FREE_M`, `montana.test.ts` |

Al añadir una regla de edificios, se añade aquí con su número y su prueba.

## Comparación con Cold Sanctuary

En Cold Sanctuary (Unity) los pisos de los edificios-árbol son tablados sin barandilla (`Deck`, `InclinedStair`) con un
borde libre de 2,5 m «para tirarse» (`docs/areas/rediseno-pisos-arboles.md`, `edificio-arbol.md`); las primeras zonas
elevadas llevaban una barandilla de 1 m (`construcciones-elevadas.md`), que el rediseño quitó. Codeship sigue el
rediseño: sin paredes, sin tejado y sin barandilla (E13), con los mismos 2,5 m de borde libre (E8). Lo que Codeship añade
y Cold Sanctuary no tiene: el paso medido de la fauna (E14), las estaciones de alfombras (E10) y, en el santuario 3, el
techo y el centro libre (E12, E16).
