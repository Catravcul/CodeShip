# Las larvas del lago de la pirámide (santuario 3)

> **2026-11-28**: el lago es el de la nave excavada (40 m de hondo, a nivel del mar del santuario 1): [montana-hueca.md](montana-hueca.md).

Berón, 2026-11-26: el lago de la pirámide aloja larvas acuáticas (ninfas de libélula, efímeras, tricópteros…), todas
visibles al bucear, cada una con su ciclo.

## Dónde está el código

| Archivo | Qué |
| --- | --- |
| `aerial-sanctuary/data/larvas-lago.ts` | `LAKE_LARVAE`: cada especie con su metamorfosis, tamaño real, etapas con sus días reales, qué come, fuente y `ours` |
| `aerial-sanctuary/domain/larvas-lago.ts` | Puro: `stageAt` (etapa y crecimiento del día), `larvaHome` (su sitio en el fondo, lejos de troncos, cubiertas, la pupa y la Starship) y `larvaPose` |
| `fauna/domain/animal-body.ts` | Cuerpos: `libelula-ninfa`, `efimera-ninfa` (branquias y tres colas), `larva-tricoptero` (con su estuche), `larva-quironomido` (roja, segmentada) |
| `adapters/three/s3-carbon.ts` | Las dibuja en el fondo (×400) si la cámara está cerca; `src/s3-biome.ts` pone su etiqueta al bucear |

## Las especies (reales, ×400 como los insectos de Gilgit)

| Larva | Metamorfosis | Etapas (días) | Fuente |
| --- | --- | --- | --- |
| Ninfa de libélula migradora (*Pantala flavescens*) | incompleta | huevo 5 · ninfa 50 · emergencia | Wikipedia *Pantala flavescens* (38–65 días), *Dragonfly* (la máscara) |
| Ninfa de efímera (*Baetis*) | incompleta | huevo 20 · ninfa 90 · subimago 1 · adulto 1 | Wikipedia *Mayfly*, *Baetidae* |
| Larva de tricóptero (Limnephilidae) | completa | huevo 15 · larva 120 · pupa 18 · emergencia | Wikipedia *Caddisfly*, *Limnephilidae* |
| Larva roja de quironómido (*Chironomus*) | completa | huevo 3 · larva 30 · pupa 2 · emergencia | Wikipedia *Chironomus*, *Chironomidae* |

- Cada larva dibujada recorre su ciclo con el reloj de la cadena (huevo diminuto, crece en su etapa, la pupa del
  quironómido y cada adulto que emerge suben a la superficie y salen) y vuelve a empezar con otro huevo.
- Las dibujadas de una especie se reparten por el ciclo (nuestro) para que se vean todas las etapas a la vez.
- El lago está templado todo el año (dentro de la pirámide: ficción): no hay invierno.
- **Por qué no son del Carbonífero**: los tricópteros no existían aún y las ninfas de Meganeura no se conocen; las del
  lago son las de hoy, de la región (×400, como el resto de Gilgit).

`larvas-lago.test.ts`: metamorfosis completa con pupa y la incompleta sin ella, crecimiento sin saltos, en el fondo
y lejos de lo que está en pie, al emerger suben, y se ven varias etapas a la vez. En vivo: PX-51 (bucear junto a ellas; bajo el agua la etiqueta dice la larva más cercana, aunque esté junto a la galería de la pupa). Captura: `docs/screenshots/s3b-lago-larvas-movil.png`.

**Censo** (2026-11-28): el tablón del censo de la nave, en el criadero, lista cada especie con sus larvas dibujadas por
etapa ahora (`larvaeCensus`, probado en `larvas-lago.test.ts`: cada una contada una vez, en el orden de su ciclo).
