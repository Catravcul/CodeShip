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

Al añadir una regla de edificios, se añade aquí con su número y su prueba.
