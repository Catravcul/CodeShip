# Fauna compartida (`src/modules/fauna`)

Lo que hace vivir a los animales de cualquier santuario. Viene de Cold Sanctuary (Berón 2026-11-19: «quizás se puede
importar lógica de cold-sanctuary para recrear animales inteligentes»). El santuario 1 lo usa y el 3 lo reutiliza para
su bioma con cadena alimenticia. No lleva datos de ningún santuario: cada uno pasa sus especies con fuente.

| Pieza | Qué hace | De Cold Sanctuary |
|---|---|---|
| `domain/life-cycle.ts` | Etapas (cría, joven, adulto, anciano), crecimiento desde el tamaño al nacer, edad en una familia. `lifeAt`: muere de viejo y su sitio espera a la próxima época de partos | `StageProfile.cs`, `Reproduction.cs` (Calendar) |
| `domain/ethogram.ts` | Lo que hace en calma, según su especie: quieto, pacer, pasear, patrullar, apiñarse, seguir a la madre | `Ethogram.cs` |
| `domain/desires.ts` | Hambre y cansancio. Gana el deseo más fuerte (comer = el hambre, descansar = el cansancio, seguir 0,35, hábitos 0,2, volver 0,12 × lejanía); el miedo es un reflejo que gana a todo | `DesireCatalog.cs`, `ThreatResponder.cs` |
| `domain/predation.ts` | Quién caza a quién por stats: poder = masa, fuerza, coraza, agilidad + arma; defensa = masa, fuerza, coraza; la manada suma (`packFactor`). Solo caza en su medio (tierra, agua, ambos, aire) y lo que come (`eats`) | `Predation.cs` |
| `domain/roam.ts` | Deambular por su territorio, función pura del tiempo | — |
| `domain/animal-body.ts` | Cuerpos de cubos articulados | `Physiognomy` |
| `application/ecosystem.ts` | Una ronda de decisiones para todos: huye de lo que teme y puede cazarlo; con hambre busca presas a su alcance (`rangeM`), las caza a toda velocidad hasta atraparlas o cansarse (`CHASE_S`), acierta como la especie real (`huntSuccess`) y devora; si falla, descansa. Las crías van con su madre. Un observador (la jugadora) asusta a los tímidos y nadie lo caza. Devuelve intenciones y presas cazadas; quien lo usa mueve y dibuja | `Animal.cs`, `Forager.cs` |

**Cómo lo usa un santuario:** sus datos de especies (`Traits` con fuente, `LifeCycle`, `SpeciesEthogram`, nombres para
los verbos) y un adaptador que llama a `Ecosystem.step` unas 4 veces por segundo y mueve los cuerpos hacia `to` a
`speed`. Ejemplo: `sanctuary-one/application/wildlife.ts` (cuando una presa muere, su sitio espera a la siguiente
época de partos de su especie).

**Pendiente:** celo y cortejo (`mate`), cuidar a otros (`tend`), percepción por sentidos y legibilidad, plantas como
comida contable (el 3 con su bioma).
