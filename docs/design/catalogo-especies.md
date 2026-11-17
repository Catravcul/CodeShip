# Catálogo de especies

Berón (2026-11-16): «Los animales no aparecen desde el principio. Al principio está Doménica sola y puede ir
añadiéndolos». Pide un catálogo extenso, con los dos tipos de caracol, y una descripción breve de cada especie
que luego se pueda ampliar con lo que aporta y sus precauciones.

Después, la decisión de diseño del mismo día: «Partimos de cero con naves y procesos reales. Lo único de
ficción que queda es entrar en la mente de los asteroides; el resto pasa al backlog». La nodriza será una
Starship ingrávida; los anillos de gravedad y la cubierta de cultivo quedan desconectados. Por eso:

- Solo se adoptan especies **reales** (que han volado o vivido en microgravedad), y solo en **hábitats
  reales** que hayan volado con ellas.
- Todo lo demás sigue en el catálogo, con su ficha completa, como **«Pendiente»** y sin botón de adoptar.
- El terminal del catálogo y el tanque van en **ranuras de rack** genéricas, no en el anillo.

## Partida nueva: Doménica sola

| Antes | Ahora |
| --- | --- |
| 4 gatos, 2 perros y 4 gallinas creados en `main.ts` | Ninguno |
| Acuario con 40 medakas y 12 caracoles | Tanque sin peces ni caracoles (el filtro y las plantas siguen) |
| Tareas de animales desde el principio | Solo «Limpiar el cristal del acuario» (tiene algas aunque esté vacío); cada tarea de animales aparece cuando llega su animal |

No hay partidas guardadas (CV-16): recargar empieza de cero, así que no hace falta migrar nada.

Todo funciona con cero animales: familias, bienestar (la Compañía no sube hasta que haya familia), tareas y
acuario (sin peces no hay hambre ni «Dar de comer», y el estado dice «sin peces (adóptalos en el catálogo)»).
Lo prueba VID-30. Los recorridos que necesitan animales (PX-13 y PX-20) los adoptan antes con toques de
jugador en el portátil o el terminal del catálogo → ficha → «Adoptar» (`tools/experiencia/catalogo.mjs`). PX-01 ya no
programa la puerta del gallinero (las gallinas están pendientes) y PX-02 no oye ladrar a un perro.

## Dónde se abre

- **El portátil del bastidor de los animales** (reglas.md §2.3: una ventana de gestión se abre desde una
  máquina del compartimento donde se hace eso). Berón, 2026-11-17: el catálogo «es solo una pared». Ahora es
  un bastidor ISPR con un portátil en su brazo, a la altura del pecho, con el catálogo en pantalla (cabecera
  verde y la lista de especies con el color de su icono), y debajo las taquillas de comida y material de los
  hábitats (`catalog-laptop.ts`, equipo `catalogo` de `gear.ts`). Es un HP ZBook 15, el portátil de a bordo
  de la ISS ([HP](https://www.hp.com/us-en/shop/tech-takes/hp-zbooks-at-zero-gs)); unos 38 × 26 × 2,6 cm
  cerrado (medida nuestra de su ficha). Etiqueta: real en Kibo; licencia en la Starship.
  - **Estación**: en Kibo, en el bastidor de al lado del AQH (los animales de JAXA vivieron en Kibo).
  - **Starship** (paridad, reglas.md §6.0): en la pared de popa de la cubierta 2, con la estantería de las
    colonias al lado (sin la consola de pie que tiene el anillo de ficción). El portátil queda a la izquierda
    del centro del bastidor para no cruzarse con los asideros de la pared.
  - Al llegar a él, ella mira la pantalla un poco por debajo, para que se vea encima de su tarjeta.
  Su botón dice «Abrir el catálogo de especies» y, si hay tareas de las colonias, «Catálogo de especies: N tareas».
- **Lista de tareas**: no tiene botón del catálogo (Berón, 2026-11-17; reglas.md §2.3): adoptar no es una
  tarea y el catálogo solo se abre en su máquina. Lo prueba VID-51.

No es un reto: usa el aspecto de la hoja de retos (fondo oscuro, morado, chips), pero no tiene pasos ni
duelo, y se cierra con ✕.

**La llegada cuenta en vivo** (Berón, 2026-11-17: no cambiaba hasta volver a abrirlo). Con el catálogo
abierto, cada fotograma redibuja solo los textos de lo que viene: el distintivo de la lista («En camino · N h»)
y la ficha («En camino: llega en N h de a bordo (m:ss reales)»; un día de a bordo son 24 minutos reales, así
que una hora de a bordo es un minuto real). No se rehace la hoja, así que los toques y el desplazamiento no se
pierden; al llegar, la hoja se vuelve a dibujar (`SpeciesCatalog.tick`, VID-49).

## Ranuras de rack

`src/adapters/three/interior/rack-slots.ts` define dos ranuras genéricas, `rack-catalogo` (terminal y
estantería) y `rack-acuatico` (el tanque). Cada interior las aloja con un `RackHost`, que da su sitio y el
puesto que las abre. Los interiores de la Starship y de la ISS solo tienen que dar su propio `RackHost`.
Mientras no llegan, `RING_RACK_HOST` usa los sitios actuales del anillo (el acuario y el catálogo de la
cubierta de cultivo). Nada más del catálogo depende del anillo.

## Hábitats reales

`src/modules/adoption/data/rack-habitats.ts`. Cada uno es un área para `fit()` y `loopStatus()` (0 g, su luz,
su agua, su temperatura y lo que hacen sus máquinas) con la lista de especies con las que voló (`accepts`) y
su capacidad.

| Hábitat | Como el real | Especies | Capacidad |
| --- | --- | --- | --- |
| Hábitat acuático | [Aquatic Habitat de JAXA](https://iss.jaxa.jp/en/kiboexp/pm/aqh) en el Kibo: dos acuarios de 150 × 70 × 70 mm (0,7 L), circuito cerrado de 3,2 L, 25–30 °C, LED de día y noche, filtro de bacterias, hasta 90 días ([medakas en 2012](https://www.sciencedaily.com/releases/2012/07/120725183634.htm)) | Medaka (y sus líneas), pez cebra; caracol *Biomphalaria*, que voló en el acuario cerrado C.E.B.A.S. | 16 (valor de juego) |
| Hábitat de roedores | [Rodent Habitat de la NASA](https://spaceflight101.com/iss/?p=600) en la ISS: hasta diez ratones en dos lados, barritas de comida y agua para todo el estudio, luz con temporizador, sin control térmico (el aire de la cabina) | Ratón | 10 |

No hay hábitat de insectos: el único con fuente es la Vented Fly Box de la NASA, para *Drosophila*, que no
está en el catálogo. Los grillos, gusanos de seda, tardígrados y artemias son reales, pero quedan pendientes
hasta tener un hábitat con fuente.

Los envíos se ajustan a estos hábitats: 8 medakas (4 por acuario, como las cuatro de IML-2), 4 peces cebra
(como los de Tiangong) y 4 caracoles.

## Qué tiene

**55 especies y variantes** en 10 grupos (`src/modules/adoption/data/catalog.ts`). **34 son reales** y **7 se
pueden adoptar hoy**: medaka, himedaka, medaka Hd-rR, pez cebra, *Biomphalaria*, su línea albina y ratón.

| Grupo | Fichas |
| --- | --- |
| Mascotas | Gato común, siamés, Maine Coon; chihuahua, perro mestizo; ratón |
| Aves | Gallina, Leghorn blanca, sedosa; codorniz japonesa |
| Peces | Medaka, himedaka, medaka Hd-rR; pez cebra, xifo, tilapia, pez ciego, fúndulo, pez sapo |
| Caracoles | **Biomphalaria** (y su línea albina) y **nerita** |
| Crustáceos | Gamba roja, gamba amano, ʻōpaeʻula; anfípodo, cochinilla de agua, dafnia, copépodo, artemia |
| Insectos | Grillo, grillo de dos manchas, polilla, mosca, mosca soldado, gusano de seda, tenebrio, supergusano, cucaracha, abeja |
| Fauna del suelo | Lombriz roja, lombriz común, colémbolo (y el cultivo de ensayo ISO 11267), cochinilla, cochinilla bola |
| Otros acuáticos | Tardígrado, medusa luna, calamar bobtail, granadero |
| Plantas | Ceratófilo y cultivos |
| Microbios | Bacterias nitrificantes, euglena y las bacterias del hidrógeno |

Están las 33 especies del santuario (`sanctuary/data/fauna.ts`) y 13 más (`adoption/data/species-extra.ts`:
gato, perro, gallina, codorniz, ratón, fúndulo, pez sapo, gamba amano, ʻōpaeʻula, cochinilla bola, grillo de
dos manchas, supergusano y lombriz común), cada una con su fuente.

**Real** (`CatalogEntry.real`) es todo lo que tiene un vuelo en su ficha (ha volado, solo sus fases latentes,
o voló y no se valió). Las gallinas no: solo volaron huevos fecundados (STS-29), nunca adultas. Gatos y perros
son reales (Félicette, Belka y Strelka), pero no hay un hábitat real para ellos, así que también salen
pendientes.

Cada ficha (`CatalogEntry`, `adoption/domain/entry.ts`):

- **Nombre** común y científico, variante si la hay, e **icono** dibujado en SVG (`ui/species-icon.ts`): su
  silueta con sus colores, luz de arriba a la izquierda, sombra y un fondo difuminado de agua, tierra u hojas.
- **Descripción** breve.
- **Dónde puede vivir**: cada hábitat real con `fit()` (cabe / no cabe y por qué, en castellano), si voló en
  uno así, si el bucle queda cerrado (`loopStatus`) y la ficha del hardware con su fuente.
- **Aporta** y **Precauciones**, campos separados para ampliarlos.
- **Vuelo espacial**: ha volado, solo en fases latentes, voló con problemas o nunca ha volado, con su
  **fuente**.
- **Cómo llega**: importada (cuántos, kg vivos, contenedor, comida del viaje) o por **eclosión** (huevos,
  quistes o fases latentes que se incuban unos días).

Los dos caracoles, lado a lado:

| | Biomphalaria | Nerita |
| --- | --- | --- |
| Vuelo | Voló en el C.E.B.A.S. (STS-89, STS-90) y en Omegahab; se aparearon en órbita | Nunca ha volado |
| En el juego | Se adopta en el hábitat acuático | Pendiente: nunca ha vivido en ingravidez |
| Precaución | Hospeda el esquistosoma en la naturaleza: solo líneas limpias de laboratorio | Sus huevos no eclosionan en agua dulce: nunca se multiplica de más |
| Aporta | Cría solo y repone la población del tanque | El mejor limpiacristales; raspa algas duras |

## Adoptar

`AdoptionOps` (`adoption/application/adoption-ops.ts`) valida en este orden (`check`):

1. Es real; si no, «Pendiente: nunca ha vivido en ingravidez».
2. Hay un hábitat real que voló con ella; si no, «Pendiente: aún no hay a bordo un hábitat real probado con ella».
3. No hay otro pedido de la misma ficha en camino.
4. Cabe en ese hábitat (`fit`) y su bucle queda cerrado (`loopStatus`; vale si el recién llegado pone el papel
   que faltaba; las máquinas del hábitat ponen productor y descomponedor).
5. Queda sitio (capacidad del hábitat, contando lo que viene de camino).
6. Hay créditos para el viaje.

**Importar** usa el sistema de importación con su tránsito real (Hohmann, `importQuote`): el envío pesa los
animales, su contenedor y su comida del viaje (`shipmentKg`), va en el lanzador más barato (Starship, a su
precio objetivo, `LIVE_LAUNCHER` en `sanctuary-life.ts`) y tarda unas 25 h de la estación, ~25 min reales.
**Eclosión** no cuesta créditos: los días de incubación pasan con los días de a bordo.

Al llegar (`AdoptionPorts.arrive`, en `sanctuary-life.ts`):

- Peces y caracoles van al tanque (`RingAquarium.stock`): el primer pez da nombre al banco y llega con hambre;
  un segundo pez distinto lo convierte en «los peces». En 3D, cada grupo se tiñe con su color.
- Los ratones van a un hábitat de la estantería del terminal y tienen dos tareas propias en el terminal
  (`amistad-especie` y luego `ayuda-especie`, 10 días de ayuda).
- El código para gatos, perros y gallinas (entran en el hábitat con nombre) sigue, por si un día tienen un
  hábitat real.

Sale el aviso «Han llegado … al hábitat acuático» y aparecen las tareas de esa especie. El banco y los
caracoles tienen cada uno su programa de amistad.

## QA

| Caso | Qué | Dónde |
| --- | --- | --- |
| VID-30 | Partida nueva sin animales; todo funciona con cero | `adoption-ops.test.ts`, `aquarium.test.ts` |
| VID-31 | El catálogo: 55 fichas, los 33 del santuario, los dos caracoles, campos completos, «real» y los hábitats reales | `catalog.test.ts` |
| VID-32 | Adoptar: solo reales en hábitats reales, «pendiente», capacidad, bucle, pedido con tránsito real, llegada y colonias | `adoption-ops.test.ts`, `import-ops.test.ts` |
| CV-20 | Dos comidas al día con los relojes del viaje y del tiempo acelerado | `comidas.test.ts` |
| PX-27 | Recorrido `catalogo`: partida nueva, catálogo, los dos caracoles (nerita pendiente), adoptar, llegar, amistad, dos comidas | `tools/experiencia/catalogo.mjs` |

## Preguntas abiertas

- **El tanque en 3D** sigue siendo el modelo de 1 m³ del anillo, y su química está ajustada a ese volumen.
  Un modelo del tamaño del Aquatic Habitat (dos acuarios de 0,7 L en un rack) llega con el interior de la
  Starship.
- **Hábitat de insectos:** ¿añadimos la mosca de la fruta (*Drosophila*) con la Vented Fly Box de la NASA, o
  un hábitat para los grillos de Neurolab?
- **Precio del transporte de animales vivos:** usa el precio objetivo de Starship ($100/kg). ¿Otro lanzador, o
  un recargo por carga viva?
- **Capacidad del hábitat acuático** (16) y número de animales por envío: son valores de juego.
