# <IDs> · <AAAA-MM-DD HH:MM> · <modo> · <perfil>

Nombre del fichero: `AAAA-MM-DD-HHMM-<área o recorrido>-<modo>.md` (modo: `vitest`, `en-vivo`, `px`).

Commit: <sha corto, el que se midió> · Rama: <rama> · Ejecutor: <persona o agente>
Perfil: <Vitest en Node N (CPU) | navegador, dispositivo o emulación (iPhone 13, CPU ×4), GPU real o SwiftShader>
Recorrido / casos: <IDs y qué se jugó o qué suite se corrió>
Preparación: <estado puesto por código (`window.codeship…`, `demoTier`, `setLevel`) o «ninguna»>
Acción a mitad (casos con carrera): <qué se hizo, en qué momento del otro proceso (fase del viaje, segundos, nivel de ira); «no reproducido» si no llegaron a cruzarse>
Resultado: OK | FAIL | Parcial · <n OK, n FAIL, n .fails esperados>
Rendimiento: <duración de la suite; o fps mediana y p95, fotogramas > 33 ms, tareas largas/min, memoria JS, llamadas de dibujo; «informativo» con GPU por software>
Evidencia: <salida, capturas `docs/screenshots/…` o carpeta del informe PX>
Hallazgos: <H1, H2… (en hallazgos.md) o «-»>

## Salida

```
<salida tal cual, sin colores>
```

## Notas

<lo que no cabe arriba: qué se vio que no es fallo, qué quedó sin probar y por qué>
