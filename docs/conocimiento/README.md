# Base de conocimiento

Lo que hemos medido sobre Three.js, Chromium en móvil y sin GPU, nuestra simulación y nuestra forma de
trabajar con ramas, y que no se deduce leyendo el código: comportamientos raros, límites, gotchas y
trucos para probar. Sirve para la próxima implementación, no para el historial de una tarea.

| Fichero | Qué va |
|---|---|
| [three.md](three.md) | Three.js: renderizado, varias cámaras, geometrías que se regeneran |
| [chromium-movil.md](chromium-movil.md) | Chromium sin GPU, perfil de móvil, `localStorage`, tiempos de pared |
| [simulacion.md](simulacion.md) | Relojes del juego, topes por llamada, determinismo, almacén |
| [ramas.md](ramas.md) | Worktrees, fusiones y dónde chocan las ramas |

## Dónde va cada cosa

| Si es… | Va a |
|---|---|
| Un comportamiento del motor, del navegador o de nuestra simulación que volverá a morder | Aquí |
| Qué tiene que pasar en el juego (un caso con ID) | [docs/qa/casos.md](../qa/casos.md) |
| Qué estado comparten los procesos y quién lo escribe | [docs/qa/entrelazamiento.md](../qa/entrelazamiento.md) |
| Si un caso está probado, cuándo y contra qué commit | [docs/qa/registro.md](../qa/registro.md) y su run log en [docs/qa/runs/](../qa/runs/) |
| Lo que se vio en una ejecución | [docs/qa/hallazgos.md](../qa/hallazgos.md) (`Hn`) |
| Un fallo pendiente o un hueco sin decidir | Tabla «Bugs y huecos» de [casos.md](../qa/casos.md) (`B-nn`, `HC-nn`) |
| Cómo está diseñada una mecánica, con sus fuentes | [docs/design/](../design/) |
| Datos reales y su procedencia | [docs/research/](../research/) |
| Cómo se corren las pruebas | [docs/qa/README.md](../qa/README.md) (y `docs/testing.md` de la rama `jugabilidad-ux` para los recorridos PX) |

Si una ejecución descubre algo general, se apunta en los dos sitios: el resultado en el registro de QA
y la regla aquí, enlazando al run log o al hallazgo.

## Cómo se escribe una entrada

```markdown
### Título: la regla en una frase

- **Síntoma:** lo que se ve.
- **Medido:** fecha, cómo se comprobó y con qué datos.
- **Cómo se evita:** qué hacer en el código o al probar.
- **Dónde:** fichero, test, caso o run log.
```

Una entrada que no se ha medido lleva **Hipótesis:** en lugar de **Medido:**. «Medido (código)»
quiere decir que se comprobó leyendo el código y haciendo la cuenta, sin ejecutarlo en un navegador.
Si una entrada deja de ser cierta se tacha con la fecha y el motivo, no se borra:
`~~### Título~~ (2026-12-01: ya no, desde …)`.
