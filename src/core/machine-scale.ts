/**
 * How much bigger than real the walkable interiors and their machines are drawn, so they read on a
 * phone's camera (docs/design/estacion-tripulacion.md, «Escala»). The data keeps the real sizes with
 * their sources; only what is drawn and walked through is scaled. The designer suggested ~1,5×
 * (2026-11-14); it is the one number to change (shared with the bridge's scale when it lands).
 */
export const MACHINE_SCALE = 1.5;
