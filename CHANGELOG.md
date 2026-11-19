# Changelog

Lo nuevo arriba. Una línea por cambio visible o de arquitectura, con su documento. El historial anterior al
2026-11-18 está en git y en `docs/design/`.

## 2026-11-19

- **Tarjetas de máquina en el móvil**: suben por encima del «−» / «+» redondos del joystick de mirar, que ahora están encima de él. [docs/design/reglas.md](docs/design/reglas.md)
- **Santuario 1, 2.ª lista**: mandos con todos los botones de la Switch (zoom en la cruceta); Áreas con Automático,
  cada edificio por su nombre y cada casquete, el edificio dibujado; cada persona con su cara, pelo, ropa y estatura
  (de Cold Sanctuary); el personal hace los pasos de su trabajo; los retos enfocan la animación; catálogo de iconos
  (`ui/icon-catalog.ts`). [docs/design/santuario1.md](docs/design/santuario1.md)

- **Santuario 1, pedidos del 19-nov**: botón naranja de interacción (también en las naves) con retos reales en
  máquinas, plantas y animales; ventana Misiones con la jornada y recompensas; Áreas en esferas con filtros y ajustes
  santuario/casquete/edificio; mandos estilo Switch (correr, saltar, trepar); alfombras voladoras, mascarillas y marcos
  en cada puerta, abedules en la isla; animales de cubos articulados; restaurante con equipo real por oficio, utensilios
  e ingredientes. [docs/design/santuario1.md](docs/design/santuario1.md)

## 2026-11-18

- **Santuario 1 completo (entorno)**: todos los pisos que Cold Sanctuary amuebla (Entrenamiento, Servicios con anillos,
  Ciencias, Producción, Árbol de los Campos, Residencia), frutales y bancales en las puntas, casquetes silvestres,
  tundra, icebergs, animales que merodean, el personal siguiendo la jornada por rutas reales, reloj y ventana de Áreas
  con «Ir». Cambios a gran escala en un archivo (`overrides.ts`). [docs/design/santuario1.md](docs/design/santuario1.md)
- **Santuario 3, fase 6 (rama `s3-lanzamiento`)**: el puesto 10 (un Electron en la pantalla del control de misión, con
  Luciana) y el 13 (el traje de la Crew Dragon, con Irosene); su día de lanzamiento en la plataforma (torre, brazo y sala
  blanca, cuenta atrás, ascenso por etapas, cita con la Starship por reto o a mano), y la partida del 3 que pasa a ser del 6
  con el crucero a Bennu. [docs/design/santuario3-lanzamiento.md](docs/design/santuario3-lanzamiento.md)
- Santuario 3: Dragon y el LM en sus propias salas (Hawthorne, LMS del edificio 5), el Il-76MDK en vez del A310, robótica como
  el centro de la CSA y el puesto 3 en la piscina de supervivencia, todo con fuentes (rama `s3-px45`).
  [docs/design/santuario3-puestos.md](docs/design/santuario3-puestos.md)
- **Santuario 1 (rama `santuario1`)**: el santuario de hielo de Cold Sanctuary se juega desde el nivel 1 de la pantalla
  de inicio. Casquetes, isla de tierra, laguna, 6 edificios-árbol con 44 pisos, el piso 0 del gimnasio amueblado, 13
  especies con el reparto de `PopulationPlan` y el personal. Catálogo de modelos por categoría y grupo para cambios a
  gran escala. [docs/design/santuario1.md](docs/design/santuario1.md)
- **Documentación para retomar**: `CLAUDE.md`, [docs/architecture.md](docs/architecture.md), este changelog y
  [docs/design/misiones-y-jornada.md](docs/design/misiones-y-jornada.md) (misiones antiguas y jornada de Cold Sanctuary).
- Santuario 3: umbral en las puertas, equipo en seis mallas y PX-45 al día (rama `s3-detalle`).
