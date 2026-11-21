# Codeship

Juego Three.js + TypeScript (móvil primero) del mismo mundo que Cold Sanctuary (`videnacry/Cold-Sanctuary`, Unity).
El diseñador es Berón; escribe en español: responder en español, corto.

## Antes de trabajar (ahorra tokens: leer esto en vez de explorar)

1. [docs/architecture.md](docs/architecture.md): mapa del código, comandos y patrones.
2. [docs/design/reglas.md](docs/design/reglas.md): reglas de diseño sin excepciones; su lista se revisa en cada rama.
3. [CHANGELOG.md](CHANGELOG.md): qué cambió últimamente. Añade una línea al terminar algo visible.
4. El documento de diseño del sistema que toques (`docs/design/<sistema>.md`).

## Cómo se trabaja aquí

- Rama por tema desde `integracion`; se fusiona en `integracion` y se publica en la web de pruebas
  (`npx vite build --base=./` → rama `gh-pages`, https://catravcul.github.io/CodeShip/; lo hace solo
  `.github/workflows/pages.yml` en cada push a `integracion`). Solo Berón la usa: siempre lo último.
- TDD en `domain/` y `application/`; cada dato real con fuente y etiqueta (real, en desarrollo, licencia, ficción).
- Correr solo las pruebas de lo tocado; `npx tsc --noEmit` y `npm run lint:arch` antes de publicar.
- Revisar en vivo con Playwright (iPhone 13) lo que se ve; capturas a `docs/screenshots/` solo si se van a enseñar.
- Al cambiar un sistema, actualizar su `docs/design/*.md`. Mantener este archivo corto.
