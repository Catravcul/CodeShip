# Misiones de Nevaeh

Continúa [bucle-de-juego.md](bucle-de-juego.md), [nano-net.md](nano-net.md) y [navegacion.md](navegacion.md).

Dirección del diseñador: subyugar todos los asteroides es una misión **secundaria**. La magnate del Santuario Frío, **Nevaeh**, pide por radio que se subyuguen los **más importantes**, y esos quedan **marcados en el mapa**. Según avanza la historia se desbloquean misiones más difíciles: subyugar una **luna** y, al final, un **planeta** (Marte).

## Cómo se juega

```
Carta de Nevaeh (radio) → objetivo marcado en el mapa (rombo «N») → vuela, aterriza, persuade su mente
        ↑                                                                      ↓
  siguiente carta  ←  recompensa a la estación (kits importados)  ←  misión cumplida
```

- **Principales.** Son una cadena. Al empezar solo está activa la primera. Al cumplir una, Nevaeh manda la siguiente carta y la misión nueva queda activa y marcada.
- **Secundarias.** Todos los demás asteroides del mapa. Ninguna es obligatoria. El registro cuenta cuántos llevas subyugados.
- **Cumplir** una misión es persuadir su objetivo en el duelo mental de siempre (`expedition.isPersuaded`). Si persuades un objetivo antes de que Nevaeh lo pida, la misión cuenta en cuanto llega su turno.
- **Capítulos bloqueados.** Las lunas de Marte y Marte ya están escritos en los datos, pero todavía no se pueden jugar. Cuando llega su turno, Nevaeh lo anuncia por carta y la misión sigue **bloqueada**.

## Dónde se ve

| Lugar | Qué muestra |
| --- | --- |
| Puente de la nodriza, página COMM, **Registro de misiones**; y la radio del anillo, **Registro de misiones** | El registro de misiones. En la cabina del módulo de aterrizaje solo queda un aviso en el HUD («Novedad en Misiones · en la nave de viaje») (fase 1 de accesos, [accesos.md](accesos.md)) |
| Mapa (página NAV del puente), botón **Misiones** en la cabecera | El mismo registro, encima del mapa |
| Mapa, lienzo | Anillo dorado discontinuo y rombo «N» sobre los objetivos que Nevaeh ya pidió; un rombo verde con ✓ cuando ya está hecha; un ✓ verde junto a cada secundaria subyugada |
| Mapa, fichas y tarjeta | La marca «N» o ✓ en la ficha; en la tarjeta, el porqué de la misión y su recompensa |
| Aviso dorado arriba (toca para abrir el registro) | «Misión de Nevaeh cumplida…», «Carta de Nevaeh…», «Misión secundaria…» |
| Radio del interior | Las cartas, con la etiqueta «Misión de Nevaeh» |

El registro agrupa las principales por capítulo (Hecha / Activa / Bloqueada). Cada una se despliega y muestra el porqué, los datos reales con su fuente, la recompensa, **Leer la carta** (sin tener que entrar al interior) y **Ver en el mapa**. Las que Nevaeh aún no ha pedido no se marcan en el mapa.

## La cadena

Los números de los asteroides se leen de `modules/celestial/data`, así que el porqué de cada misión no se aparta de lo que muestra el mapa.

| # | Capítulo | Objetivo | Por qué (dato real) | Recompensa (valor de juego) |
| --- | --- | --- | --- | --- |
| 1 | Nueva Polana | 101955 Bennu | Es el asteroide mejor medido: OSIRIS-REx trajo su roca en 2023. Tipo B, 4,5–4,7 % de carbono y ≥ 1 % de agua. Será el primer núcleo de la nano_net. Lo pide la primera carta de la nano_net. | 2 kits |
| 2 | Nueva Polana | 242916 (2006 OS2) | Es el mayor de los seis vecinos del mapa: 2,44 km (NEOWISE), unas 124 veces la masa de Bennu (si tiene su densidad) y rotación medida de 4,72 h | 2 kits |
| 3 | Nueva Polana | 58587 (1997 SK23) | Es el más oscuro de los seis: albedo 0,040 (NEOWISE). Mide 2,31 km y tiene rotación medida de 5,43 h | 3 kits |
| 4 | Las lunas de Marte | Deimos *(bloqueada)* | 16,08 × 11,78 × 10,22 km y 1,44·10¹⁵ kg (unas 20 000 veces Bennu). Es rica en carbono, como los asteroides tipo C. Órbita a 23 458 km, con una vuelta cada 30,3 h | — |
| 5 | Las lunas de Marte | Fobos *(bloqueada)* | 25,90 × 22,60 × 18,32 km y 1,06·10¹⁶ kg. Órbita a 9 375 km, con una vuelta cada 7,65 h. La misión MMX (JAXA) traerá muestras en 2031 | — |
| 6 | Marte | Marte *(bloqueada)* | Radio de 3 389,5 km, 6,42·10²³ kg y 3,72 m/s². El hielo del casquete sur cubriría el planeta con ~11 m de agua | — |

Fuentes: Bennu y la familia de Nueva Polana, como en [navegacion.md](navegacion.md) (Wikipedia/OSIRIS-REx, Lauretta et al. 2024, NEOWISE vía JPL SBDB). [Deimos](https://en.wikipedia.org/wiki/Deimos_(moon)), [Fobos](https://en.wikipedia.org/wiki/Phobos_(moon)) y [Marte](https://en.wikipedia.org/wiki/Mars), consultadas el 2026-11-12.

**Recompensas.** Son kits importados (electrónica, válvulas y lecho catalizador) que van al almacén de la estación: 7 en total sobre los 6 iniciales. Un motor impreso pide de 2 a 4. Es poco a propósito, porque la carga del asteroide persuadido ya es la recompensa principal. Las secundarias no dan kits.

## Código

- `src/modules/missions/domain/mission.ts`: `MissionLog`, la cadena de principales y las secundarias. Avanza con una sola pregunta: «¿está persuadido este objetivo?».
- `src/modules/missions/application/mission-control.ts`: `MissionControl`. Cierra la misión de la carta, entrega la recompensa y publica la siguiente carta en el `Mailbox`.
- `src/modules/missions/data/nevaeh-missions.ts`: las misiones y las cartas.
- `src/ui/mission-log.ts`: el registro «Misiones» y el aviso. `src/ui/nav-map.ts`: las marcas (`missionMark`, `onMissions`, `show(id)`).
- `story/domain/mailbox.ts`: `Mission.goal` admite `"persuadir"` y `targetId`.

## Inventado (para que lo revise el diseñador)

- Que Bennu cuente como la primera misión principal, pedida por la carta «La nano_net necesita un núcleo».
- Lo que dice Nevaeh de 242916: es una reserva de roca para que la red crezca, y ella manda kits desde el santuario por cada misión.
- La sospecha de que el saboteador esconde un repetidor a la sombra de 58587. Y la respuesta en la carta de Deimos: 58587 vio pasar «una nave sin luces» hacia Marte.
- El orden Deimos → Fobos → Marte, y que el bloqueo se explique con «hace falta una nave que llegue a Marte».
- El tono de Nevaeh sobre Marte («nadie ha persuadido nunca una mente tan grande»). No decide si sus intenciones son buenas.
