# Componentes de nave reales

**Para el juego:** las mejoras son piezas reales y cambian masa, empuje e impulso específico. Valores copiados el 11 de noviembre de 2026; "—" significa que la fuente no lo da.

## Propulsión principal

| Componente | Empuje (vacío) | Isp vacío (s) | Masa | Propelente | Fuente |
| --- | --- | --- | --- | --- | --- |
| Aerojet Rocketdyne R-4D (en el juego) | 490 N | 312 | 3,6 kg | MMH/NTO | [Wikipedia](https://en.wikipedia.org/wiki/R-4D) |
| RL10B-2 | 110,1 kN | 465,5 | 301 kg; 4,15 m de largo | LOX/LH2 | [Wikipedia](https://en.wikipedia.org/wiki/RL10) |
| RL10C-1-1 | 105,98 kN | 453,8 | 188 kg | LOX/LH2 | [Wikipedia](https://en.wikipedia.org/wiki/RL10) |
| Merlin 1D Vacuum | 981 kN | 348 | — | LOX/RP-1 | [Wikipedia](https://en.wikipedia.org/wiki/Merlin_(rocket_engine)) |

## Propulsión eléctrica

| Componente | Empuje | Isp (s) | Potencia | Masa | Fuente |
| --- | --- | --- | --- | --- | --- |
| NASA NEXT (iónico, xenón) | 237 mN | 4170 (1320 a 0,5 kW) | 6,9 kW | — | [Wikipedia](https://en.wikipedia.org/wiki/NASA_Evolutionary_Xenon_Thruster) |
| SPT-100 (Hall, xenón) | 80 mN | 1600 | 1350 W | 4 kg | [Wikipedia](https://en.wikipedia.org/wiki/SPT-100) |
| SPT-100D | 112 mN | 2200 | 2500 W | 4,7 kg | [Wikipedia](https://en.wikipedia.org/wiki/SPT-100) |

## Control de actitud

| Componente | Empuje | Isp (s) | Masa | Propelente | Fuente |
| --- | --- | --- | --- | --- | --- |
| MR-106L (en el juego) | 22 N nominal (10–34 N) | 228–235 | 0,59 kg | Hidracina | [SatCatalog](https://satcatalog.com/component/mr-106l-22n) |
| SpaceX Draco | 400 N | 300 | — | NTO/MMH | [Wikipedia](https://en.wikipedia.org/wiki/SpaceX_Draco) |
| Ruedas de reacción | Wikipedia no da cifras típicas | | | | [Wikipedia](https://en.wikipedia.org/wiki/Reaction_wheel) |

## Energía

| Componente | Potencia | Masa | Notas | Fuente |
| --- | --- | --- | --- | --- |
| MMRTG (radioisótopos) | 125 W al inicio, unos 100 W tras 14 años | 45 kg | 66,83 cm de largo; plutonio-238 | [Wikipedia](https://en.wikipedia.org/wiki/Multi-mission_radioisotope_thermoelectric_generator) |
| ROSA (panel enrollable) | — por panel | 325 kg (prueba en la ISS) | 20 % más ligero y una cuarta parte del volumen que paneles rígidos | [Wikipedia](https://en.wikipedia.org/wiki/Roll_Out_Solar_Array) |

## Cómo afecta al juego

- Motor químico (R-4D, RL10): empuje alto, consumo alto; maniobras rápidas cerca del asteroide.
- Eléctrico (NEXT, SPT-100): empuje diminuto pero Isp diez veces mayor; viajes largos entre asteroides. Exige energía, así que depende de paneles o MMRTG.
- Cambiar una pieza recalcula masa, inercia y delta-v en `src/modules/ship`.

## Pendiente

- Datos de hojas de fabricante para ruedas de reacción, rastreadores de estrellas, tanques y cascos, que Wikipedia no da.
- Revisar el catálogo del borrador ([legado/](legado/)) pieza a pieza y quedarse solo con las que tengan especificaciones citables.
