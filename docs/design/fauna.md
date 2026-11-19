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
| `domain/mating.ts` | Celo: solo adultos y solo en su época real (partos − gestación, con implantación diferida: el oso se aparea en abril para parir en diciembre). Sexo fijo por animal. Deseo «aparearse» (peso 0,6): busca al del otro sexo en celo, cortejan `COURT_S` con la conducta real de su especie y la hembra queda preñada. Rivalidad: dos machos libres junto a la misma hembra se enfrentan `RIVAL_S` como su especie (choques de cabezas, colmillos, boxeo); gana el más fuerte por stats con algo de suerte y el otro se aleja y queda fuera del celo `BEATEN_S` | `EstrusState.cs`, deseo `mate` |
| `domain/roam.ts` | Deambular por su territorio, función pura del tiempo | — |
| `domain/animal-body.ts` | Cuerpos de cubos articulados | `Physiognomy` |
| `application/ecosystem.ts` | Una ronda de decisiones para todos: huye de lo que teme y puede cazarlo; con hambre busca presas a su alcance (`rangeM`), las caza a toda velocidad hasta atraparlas o cansarse (`CHASE_S`), acierta como la especie real (`huntSuccess`) y devora; si falla, descansa. Las crías van con su madre. Un observador (la jugadora) asusta a los tímidos y nadie lo caza. Devuelve intenciones, presas cazadas y apareamientos; quien lo usa mueve y dibuja | `Animal.cs`, `Forager.cs` |

**Cómo lo usa un santuario:** sus datos de especies (`Traits` con fuente, `LifeCycle`, `SpeciesEthogram`, nombres para
los verbos) y un adaptador que llama a `Ecosystem.step` unas 4 veces por segundo y mueve los cuerpos hacia `to` a
`speed`. Ejemplo: `sanctuary-one/application/wildlife.ts` (cuando una presa muere, su sitio espera a la siguiente
época de partos de su especie).

En el santuario 1 un sitio vacío (muerto de viejo o cazado) solo se llena en la época de partos si una hembra de su
especie se apareó y lleva la cría; si no, espera otra temporada.

**Pendiente:** cuidar a otros (`tend`), percepción por sentidos y legibilidad, plantas como
comida contable (el 3 con su bioma).
