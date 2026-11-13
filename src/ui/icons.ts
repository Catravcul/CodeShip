/** Line icons for the root menus (docs/design/ux-acciones.md §Iconos), 24×24, drawn with currentColor. */
const svg = (body: string) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  /** Camera / view: an eye. */
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  /** The root: a seed with three shoots. */
  root: svg('<circle cx="12" cy="17" r="3"/><path d="M12 14V4M12 9l-5-4M12 9l5-4"/>'),
  /** Stand up from the pilot seat (to the cabin). */
  standUp: svg('<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 10h8M9 21l3-7 3 7"/><path d="M19 9l2-2-2-2" />'),
  /** Landing assist: a craft over the ground. */
  land: svg('<path d="M12 3v9M8 8l4 4 4-4"/><path d="M3 20h18"/><path d="M7 16h10"/>'),
  /** Docking assist: two rings meeting. */
  dock: svg('<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/>'),
  /** Time warp. */
  warp: svg('<path d="M4 6l7 6-7 6zM13 6l7 6-7 6z"/>'),
  /** Centre the view. */
  center: svg('<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  /** Tasks. */
  tasks: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
} as const;
