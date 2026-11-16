# Catálogo de especies

Berón (2026-11-16): «Los animales no aparecen desde el principio. Al principio está Doménica sola y puede ir
añadiéndolos». Pide un catálogo extenso, con los dos tipos de caracol, y una descripción breve de cada especie
que luego se pueda ampliar con lo que aporta y sus precauciones.

## Partida nueva: Doménica sola

| Antes | Ahora |
| --- | --- |
| 4 gatos, 2 perros y 4 gallinas creados en `main.ts` | Ninguno: llegan desde el catálogo |
| Acuario con 40 medakas y 12 caracoles | Tanque sin peces ni caracoles: solo ceratófilo y biofiltro (el bucle de plantas y bacterias sigue) |
| Tareas de animales desde el principio | Solo «Limpiar el cristal del acuario» (tiene algas aunque esté vacío); cada tarea de animales aparece cuando llega su animal |

No hay partidas guardadas (CV-16): recargar empieza de cero, así que no hace falta migrar nada.

Todo funciona con cero animales: familias, bienestar (la Compañía no sube hasta que haya familia), tareas,
acuario (sin peces no hay hambre ni «Dar de comer», y el estado dice «sin peces (adóptalos en el catálogo)»).
Lo prueba VID-30. Los recorridos que necesitan animales (PX-01, PX-02, PX-13 y PX-20) los adoptan antes con
toques de jugador: «Tareas» → «Catálogo de especies» → ficha → «Adoptar» (`tools/experiencia/catalogo.mjs`).

## Dónde se abre

- **Terminal del catálogo** en la cubierta de cultivo, a la izquierda del acuario, con su estantería de
  terrarios (`ring-module.ts`, puesto `catalogo`; a 2 m de todo, HAB-08). Su botón dice «Catálogo de
  especies» y, si hay tareas de las colonias, «Catálogo de especies: N tareas».
- **Lista de tareas**: un botón «Catálogo de especies» bajo su cabecera.

No es un reto: usa el aspecto de la hoja de retos (fondo oscuro, morado, chips), pero no tiene pasos ni
duelo, y se cierra con ✕.

## Qué tiene

**55 especies y variantes** en 10 grupos (`src/modules/adoption/data/catalog.ts`):

| Grupo | Fichas |
| --- | --- |
| Mascotas | Gato común, siamés, Maine Coon; chihuahua, perro mestizo; ratón |
| Aves | Gallina, Leghorn blanca, sedosa (se pone clueca); codorniz japonesa |
| Peces | Medaka, himedaka, medaka Hd-rR; pez cebra, xifo, tilapia, pez ciego, fúndulo, pez sapo |
| Caracoles | **Biomphalaria** (y su línea albina) y **nerita** |
| Crustáceos | Gamba roja, gamba amano, ʻōpaeʻula; anfípodo, cochinilla de agua, dafnia, copépodo, artemia |
| Insectos | Grillo, grillo de dos manchas, polilla, mosca, mosca soldado, gusano de seda, tenebrio, supergusano, cucaracha, abeja |
| Fauna del suelo | Lombriz roja, lombriz común, colémbolo (y el cultivo de ensayo ISO 11267), cochinilla, cochinilla bola |
| Otros acuáticos | Tardígrado, medusa luna, calamar bobtail, granadero |
| Plantas | Ceratófilo y cultivos (a bordo desde el principio) |
| Microbios | Bacterias nitrificantes (a bordo) y las del reactor |

Están las 33 especies del santuario (`sanctuary/data/species.ts`) y 13 más (`adoption/data/species-extra.ts`:
gato, perro, gallina, codorniz, ratón, fúndulo, pez sapo, gamba amano, ʻōpaeʻula, cochinilla bola, grillo de
dos manchas, supergusano y lombriz común), cada una con su fuente.

Cada ficha (`CatalogEntry`, `adoption/domain/entry.ts`):

- **Nombre** común y científico, variante si la hay, e **icono** dibujado en SVG (`ui/species-icon.ts`): su
  silueta con sus colores, luz de arriba a la izquierda, sombra y un fondo difuminado de agua, tierra u hojas.
- **Descripción** breve.
- **Dónde puede vivir**: cada área del santuario con `fit()` (cabe / no cabe y por qué, en castellano) y si el
  bucle de esa área queda cerrado (`loopStatus`).
- **Aporta** y **Precauciones**, campos separados para ampliarlos.
- **Vuelo espacial**: ha volado, solo en fases latentes, voló con problemas o nunca ha volado, con su
  **fuente**.
- **Cómo llega**: importada (cuántos, kg vivos, contenedor, comida del viaje) o por **eclosión** (huevos,
  quistes o fases latentes que se incuban unos días).

Los dos caracoles, lado a lado:

| | Biomphalaria | Nerita |
| --- | --- | --- |
| Vuelo | Voló en el C.E.B.A.S. (STS-89, STS-90) y en Omegahab; se aparearon en órbita | Nunca ha volado |
| Precaución | Hospeda el esquistosoma en la naturaleza: solo líneas limpias de laboratorio | Sus huevos no eclosionan en agua dulce: nunca se multiplica de más |
| Aporta | Cría solo y repone la población del tanque | El mejor limpiacristales; raspa algas duras |

## Adoptar

`AdoptionOps` (`adoption/application/adoption-ops.ts`) valida en este orden (`check`):

1. No hay otro pedido de la misma ficha en camino.
2. Hay un **área construida** donde cabe (`fit`) y cuyo bucle queda cerrado con ella (`loopStatus`; vale si el
   recién llegado pone el papel que faltaba). Ahora están construidos el jardín del anillo (el hub: la
   tripulación come, así que cuenta como consumidor) y el acuario del anillo.
3. Hay créditos para el viaje.

Las reglas son generales: salen de la gravedad, la luz, el agua y la temperatura de cada área, no del anillo.
Si la nave cambia (por ejemplo, una nodriza ingrávida), los animales sin datos en ingravidez (perros, gallinas,
gatos) dejan de caber solos, con su motivo, sin tocar el catálogo.

**Importar** usa el sistema de importación con su tránsito real (Hohmann, `importQuote`): el envío pesa los
animales, su contenedor y su comida del viaje (`shipmentKg`), va en el lanzador más barato (Starship, a su
precio objetivo, `LIVE_LAUNCHER` en `sanctuary-life.ts`) y tarda unas 25 h de la estación, ~25 min reales.
**Eclosión** no cuesta créditos: los días de incubación pasan con los días de a bordo.

Al llegar (`AdoptionPorts.arrive`, en `sanctuary-life.ts`):

- Gatos, perros y gallinas entran en el hábitat con nombre (Luna, Coco, Clara, Yema…), con su modelo y su
  color. De las gallinas, la sedosa (o la segunda del trío) se pone clueca.
- Peces y caracoles van al tanque (`RingAquarium.stock`): el primer pez da nombre al banco y llega con hambre;
  un segundo pez distinto lo convierte en «los peces». En 3D, cada grupo se tiñe con su color.
- Las colonias (crustáceos, insectos, suelo…) van a un terrario de la estantería del terminal.

Sale el aviso «Han llegado … al acuario del anillo» y las tareas de esa especie aparecen. El reto de amistad
queda disponible: el de gatos, perros y gallinas es el de siempre; el banco y los caracoles tienen cada uno
su programa de amistad; las colonias tienen dos tareas propias en el terminal (`amistad-especie` y luego
`ayuda-especie`, 10 días de ayuda).

## QA

| Caso | Qué | Dónde |
| --- | --- | --- |
| VID-30 | Partida nueva sin animales; todo funciona con cero | `adoption-ops.test.ts`, `aquarium.test.ts` |
| VID-31 | El catálogo: 55 fichas, los 33 del santuario, los dos caracoles, campos completos | `catalog.test.ts` |
| VID-32 | Adoptar: validaciones, pedido con tránsito real, eclosión, llegada y colonias | `adoption-ops.test.ts`, `import-ops.test.ts` |
| CV-20 | Dos comidas al día con los relojes del viaje y del tiempo acelerado | `comidas.test.ts` |
| PX-27 | Recorrido `catalogo`: partida nueva, catálogo, los dos caracoles, adoptar, llegar, amistad, dos comidas | `tools/experiencia/catalogo.mjs` |

## Preguntas abiertas

- **Precio del transporte de animales vivos:** usa el precio objetivo de Starship ($100/kg). ¿Otro lanzador, o
  un recargo por carga viva?
- **Colonias:** viven en los terrarios del terminal, no dentro del acuario aunque sean acuáticas (gambas).
- **Áreas del santuario por construir** (cueva, esfera, insectario…): las fichas ya dicen si caben, pero en el
  juego aún no se construyen, así que lo que solo cabe allí sale «No cabe en ningún área construida».
- **Peces que no son medaka** comparten el único banco del tanque.
