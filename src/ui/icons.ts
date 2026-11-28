/** Line icons for the root menus (docs/design/ux-acciones.md §Iconos), 24×24, drawn with currentColor. */
const svg = (body: string) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  /** A treasure chest (the pillow war, s1-castillos.ts). */
  chest: svg('<rect x="3" y="10" width="18" height="10" rx="1"/><path d="M3 10a9 5 0 0 1 18 0"/><path d="M3 14h18M12 12v4"/>'),
  /** Camera / view: an eye. */
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  /** The root: a seed with three shoots. */
  root: svg('<circle cx="12" cy="17" r="3"/><path d="M12 14V4M12 9l-5-4M12 9l5-4"/>'),
  /** Stand up from the pilot seat (to the cabin). */
  standUp: svg('<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 10h8M9 21l3-7 3 7"/><path d="M19 9l2-2-2-2" />'),
  /** Landing assist: a craft over the ground. */
  land: svg('<path d="M12 3v9M8 8l4 4 4-4"/><path d="M3 20h18"/><path d="M7 16h10"/>'),
  /** Dock: two rings meeting. */
  dock: svg('<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/>'),
  /** Undock: two rings apart, pushed away from each other. */
  undock: svg('<circle cx="5.5" cy="12" r="3.5"/><circle cx="18.5" cy="12" r="3.5"/><path d="M10 12h4M10.5 9.5L9 12l1.5 2.5M13.5 9.5L15 12l-1.5 2.5"/>'),
  /** Time warp. */
  warp: svg('<path d="M4 6l7 6-7 6zM13 6l7 6-7 6z"/>'),
  /** Centre the view. */
  center: svg('<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  /** Tasks. */
  tasks: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
  /** Settings: a gear (the task list's own settings, docs/design/viaje-a-una-tarea.md). */
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  /** Close a window or the menu: an X. */
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  /** Areas of a vehicle: three compartments joined. */
  areas: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="8.5" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h4M12 10v4"/>'),
  /** A trip: a dotted path to a target. */
  route: svg('<circle cx="5" cy="18" r="2"/><path d="M7 16l2-2M11 12l2-2M15 8l2-2"/><circle cx="19" cy="5" r="2.5"/>'),
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
  /** The medical kit: a cross in a case. */
  medical: svg('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M9 6V4h6v2M12 10v6M9 13h6"/>'),
  mat: svg('<rect x="3" y="9" width="14" height="6" rx="1"/><circle cx="19" cy="12" r="3"/>'),
  /** Hangar and ship bay: a craft under a roof. */
  hangar: svg('<path d="M2 10l10-6 10 6"/><path d="M4 9v11h16V9"/><path d="M8 17l4-6 4 6z"/>'),
  /** A machine or console. */
  machine: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  /** Suits and airlock. */
  suit: svg('<circle cx="12" cy="6" r="3.5"/><path d="M6 21v-7a6 6 0 0 1 12 0v7M9 21v-4M15 21v-4"/>'),
  /** Something to look at. */
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  /** A code challenge at hand (the orange interaction button, Berón 2026-11-19): code braces with a spark. */
  reto: svg('<path d="M8 5c-2 0-2.5 1-2.5 3v1.5C5.5 11 4.5 12 3 12c1.5 0 2.5 1 2.5 2.5V16c0 2 .5 3 2.5 3"/><path d="M16 5c2 0 2.5 1 2.5 3v1.5c0 1.5 1 2.5 2.5 2.5-1.5 0-2.5 1-2.5 2.5V16c0 2-.5 3-2.5 3"/><path d="M12 8.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>'),
  /** A flying carpet: a waving rug with its fringes, and the air under it. */
  carpet: svg('<path d="M3 9c3-2 6 2 9 0s6-2 9 0v5c-3-2-6 2-9 0s-6-2-9 0z"/><path d="M3 9v5M21 9v5"/><path d="M6 19c2-1 4 1 6 0s4-1 6 0"/>'),
  /** The workday's missions: a calendar page with a clock. */
  missions: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="3"/><path d="M12 14v1.5l1 1"/>'),
} as const;
