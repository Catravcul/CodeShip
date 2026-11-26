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
| `domain/forage.ts` | Plantas como comida contable: horas de luz por latitud y día (modelo CBM de Forsythe 1995), crecimiento del fitoplancton por la temperatura (Eppley 1972), factor de estación (luz × calor), crecimiento logístico, lo que se puede comer sin pasar del margen (`takeable`) y el pastoreo (`graze`). Lo usa el bioma del santuario 3 | `FoodChain.cs` (fuentes) |
| `domain/roam.ts` | Deambular por su territorio, función pura del tiempo | — |
| `domain/animal-body.ts` | Cuerpos de cubos articulados. Siluetas por especie, como datos opcionales y sin cambiar las de antes: altura de patas, cola y partes altas de los cuadrúpedos (`LEG_H`, `TAIL`, `HIGH_PARTS`: íbice, markhor, bharal, marmota, pika, ardilla, leopardo, zorro) y aves por especie (`bodyPlan("ave", id)`: envergadura, cuello, pico y cola de quebrantahuesos, buitre, águila, chova, paloma, ánsar, treparriscos, cernícalo); **insectos** (`bodyPlan("insecto", id)`, santuario 3: cabeza, ojos, antenas, tórax, abdomen con bandas, 6 patas en trípode, 2 o 4 alas que baten con su propio `rate`, élitros; `larva-<id>` y `<id>-ninfa`); sin id, el cuerpo de siempre. El miriápodo (`miriapodo`: placas con lóbulos y dos pares de patas cada una, Arthropleura) y los insectos del Carbonífero (`meganeura`, `meganeuropsis`, `mazothairos` con alitas y pico, `cucaracha` con pronoto y cercos), la ninfa de efímera (branquias, tres colas) y las larvas acuáticas (`larva-tricoptero` en su estuche, `larva-quironomido`) ([carbonifero.md](carbonifero.md), [larvas-lago.md](larvas-lago.md)) | `Physiognomy` |
| `domain/population.ts` | La regla de animales por persona (`ANIMALS_PER_HUMAN`, `allocate`, reparto 70 / 22 / 8 de Cold Sanctuary) con su `PopulationTable`: sin tabla, la del santuario 1 (no cambia); el santuario 3 pasa la suya (`S3_POPULATION`) | `PopulationPlan.cs` |
| `domain/globe-embryo.ts` | El embrión de los globos: etapas, rampas suaves y el reloj por minutos de un ajuste; lo usan el pulpo (santuario 1) y la abeja de la pupa (santuario 3, [pupa-abeja.md](pupa-abeja.md)) | — |
| `application/ecosystem.ts` | Una ronda de decisiones para todos: huye de lo que teme y puede cazarlo; con hambre busca presas a su alcance (`rangeM`), las caza a toda velocidad hasta atraparlas o cansarse (`CHASE_S`), acierta como la especie real (`huntSuccess`) y devora; si falla, descansa. Las crías van con su madre. Un observador (la jugadora) asusta a los tímidos y nadie lo caza. Devuelve intenciones, presas cazadas y apareamientos; con `forage` (opcional) quien cuenta la comida dice cuánto comió cada uno y el hambre baja en proporción (`tickNeeds(…, fed)`); quien lo usa mueve y dibuja | `Animal.cs`, `Forager.cs` |

**Cómo lo usa un santuario:** sus datos de especies (`Traits` con fuente, `LifeCycle`, `SpeciesEthogram`, nombres para
los verbos) y un adaptador que llama a `Ecosystem.step` unas 4 veces por segundo y mueve los cuerpos hacia `to` a
`speed`. Ejemplo: `sanctuary-one/application/wildlife.ts` (cuando una presa muere, su sitio espera a la siguiente
época de partos de su especie).

En el santuario 1 un sitio vacío (muerto de viejo o cazado) solo se llena en la época de partos si una hembra de su
especie se apareó y lleva la cría; si no, espera otra temporada.

**Pendiente:** cuidar a otros (`tend`), percepción por sentidos y legibilidad, plantas como
comida contable (el 3 con su bioma).
