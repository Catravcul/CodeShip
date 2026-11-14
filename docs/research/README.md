# Investigación de Codeship

Investigación documentada con fuentes para diseñar el juego. Revisada el 11 de noviembre de 2026.

| Documento | Contenido |
| --- | --- |
| [duelo-de-codigo.md](duelo-de-codigo.md) | Cómo se juega el enfrentamiento de código en móvil y qué enseñar en la era de la IA |
| [indice-de-estudio.md](indice-de-estudio.md) | Progresión de conceptos por niveles, de variables a funciones y más allá |
| [asteroides.md](asteroides.md) | Asteroides reales, clases espectrales y recursos que contienen |
| [componentes-de-nave.md](componentes-de-nave.md) | Motores, propulsores y energía reales con sus especificaciones |
| [fuentes-de-datos.md](fuentes-de-datos.md) | APIs y servidores MCP para traer datos reales al juego |
| [agua-y-fauna-en-ingravidez.md](agua-y-fauna-en-ingravidez.md) | Agua en microgravedad, nadar, agua como reserva y escudo, peces e insectos que han volado, fauna abisal y de cueva, estaciones con agua (santuario espacial) |
| [sistema-solar.md](sistema-solar.md) | Zona inicial (familia de Nueva Polana), Sol y planetas vistos desde allí, densidad real del cinturón y rendimiento |

## Qué había del borrador anterior

Buscamos en la copia de OneDrive, en las ramas del repo y en los repos `codeshipApi`, `CodeshipFS`, `CodeshipNet`, `CodeShipStore` y `session-codeship`. Se encontró esto, copiado sin cambios en [`legado/`](legado/):

- **Índice de estudio** (`src/domain/holistic-cast/js`, archivo sin extensión): árbol de 257 líneas de temas de JavaScript (declaración de variables, tipos de datos y sus métodos, funciones, control de flujo). Sin fuentes ni orden de niveles.
- **Catálogo de componentes** (`models/*.js` y `models/protective-system`): unos 120 componentes reales por categoría (comunicación, soporte vital, navegación, energía, propulsión, protección). Los nombres son reales, pero precios y especificaciones no tienen fuente y muchos son redondeos.
- **Tipos de asteroide** (`src/domain/asteroids/types.js`): tipos C, S y M con porcentajes de composición sin fuente.
- `src/domain/asdf.md` solo contiene un prompt para generar código; no es investigación.

No apareció ninguna investigación con fuentes de asteroides, naves ni del índice de estudio, así que se ha hecho de nuevo en estos documentos.

## Regla para datos del juego

Todo valor real que entre en el código lleva su fuente (`sources` en componentes, `Sourced<T>` en asteroides). Si una fuente da un rango, se guarda el rango o se elige el extremo conservador y se anota.
