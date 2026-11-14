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
  /** A hatch: a square door with a wheel. */
  door: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v-2M12 17.5v-2M8.5 12h-2M17.5 12h-2"/>'),
  /** A hatch that is shut: the door with a padlock. */
  locked: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9a2 2 0 0 1 4 0v2"/>'),
  /** Galley: a bowl and steam. */
  food: svg('<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>'),
  /** Crew cabin: a sleeping bag. */
  bed: svg('<rect x="7" y="2" width="10" height="20" rx="4"/><circle cx="12" cy="6.5" r="2"/><path d="M8 11h8"/>'),
  /** Hygiene: a water drop. */
  wash: svg('<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>'),
  /** Exercise: a dumbbell. */
  exercise: svg('<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>'),
  /** Yoga mat: a rolled mat. */
  mat: svg('<rect x="3" y="9" width="14" height="6" rx="1"/><circle cx="19" cy="12" r="3"/>'),
  /** Hangar and ship bay: a craft under a roof. */
  hangar: svg('<path d="M2 10l10-6 10 6"/><path d="M4 9v11h16V9"/><path d="M8 17l4-6 4 6z"/>'),
  /** A machine or console. */
  machine: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  /** Suits and airlock. */
  suit: svg('<circle cx="12" cy="6" r="3.5"/><path d="M6 21v-7a6 6 0 0 1 12 0v7M9 21v-4M15 21v-4"/>'),
  /** Something to look at. */
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
} as const;
