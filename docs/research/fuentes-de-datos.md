# Fuentes de datos y herramientas

**Recomendación:** usar la API SBDB de JPL como fuente principal de asteroides, mediante un script que genere los catálogos del juego con la referencia de cada valor. El servidor MCP de NASA sirve para consultas puntuales durante el desarrollo.

## API SBDB de JPL (asteroides y cometas)

- Un objeto: `GET https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=Eros&phys-par=1`. Con `phys-par=1` devuelve parámetros físicos; cada uno trae `value`, `sigma`, `units` y `ref` (la referencia bibliográfica). [Documentación](https://ssd-api.jpl.nasa.gov/doc/sbdb.html)
- Muchos objetos filtrados: `GET https://ssd-api.jpl.nasa.gov/sbdb_query.api` con `fields` y `sb-cdata`. Campos físicos: `diameter` (km), `extent`, `GM`, `density`, `rot_per` (h), `pole`, `albedo`, `spec_T` (Tholen), `spec_B` (SMASSII), `H`, `G`. [Documentación](https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html), [filtros](https://ssd-api.jpl.nasa.gov/doc/sbdb_filter.html)
- Filtro de ejemplo (todos los que tienen diámetro conocido): `sb-cdata={"AND":["diameter|DF"]}`, codificado en la URL. Operadores: `EQ, NE, LT, GT, LE, GE, RG, RE, DF, ND`.
- La documentación no menciona clave de API ni límites de uso.

Uso propuesto: un script `scripts/fetch-asteroids.mjs` que descargue los asteroides elegidos y escriba `src/modules/celestial/data/*.json` con valor, incertidumbre y referencia. Así el juego no depende de la red en tiempo de ejecución. Ahora mismo la red de este entorno de Claude no permite `ssd-api.jpl.nasa.gov`; se puede añadir cuando se escriba el script.

## Servidor MCP de NASA (comunitario)

- Paquete `@programcomputer/nasa-mcp-server`, licencia ISC. Su README avisa de que no está afiliado a NASA. Requiere Node 22 o superior.
- Incluye APIs de NASA (NEO, APOD, etc.) y de JPL SSD (SBDB, aproximaciones, Sentry, Scout, NHATS, Horizons). La mayoría de herramientas no necesitan clave; `NASA_API_KEY` es gratuita en [api.nasa.gov](https://api.nasa.gov/) y `DEMO_KEY` vale para uso ligero.
- Instalación en Claude Code: `claude mcp add --env NASA_API_KEY=TU_CLAVE --scope user nasa -- npx -y @programcomputer/nasa-mcp-server@latest`
- [README](https://cdn.jsdelivr.net/gh/programcomputer/nasa-mcp-server@main/README.md)

No hay un conector oficial de NASA en el directorio de conectores de Claude (búsqueda del 11 de noviembre de 2026).

## Componentes de nave

No existe una API pública de componentes. Fuentes: Wikipedia para especificaciones generales, [SatCatalog](https://www.satcatalog.com/) para componentes de satélite (avisa de que se muda a SatBase) y las hojas de datos de los fabricantes (por ejemplo, L3Harris/Aerojet Rocketdyne para motores).

## Educación

Para el diseño de retos: los informes de Parsons de ITiCSE, los estándares CSTA y el K-12 CS Framework citados en [duelo-de-codigo.md](duelo-de-codigo.md) e [indice-de-estudio.md](indice-de-estudio.md).
