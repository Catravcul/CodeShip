/**
 * The free band above (or between) the sheet's blocks, measured (Berón 2026-11-23: the HUD and panel views leave
 * different room): the tallest screen-wide stretch no block of the sheet covers, in px from the top.
 */
export function sheetBand(): { top: number; bottom: number } | undefined {
  // The drawn challenge (trace-view.ts) takes the sheet's place in sanctuary 3: measured the same way.
  const d = document.querySelector(".trace:not(.hidden)") ?? document.querySelector(".duel:not(.hidden)");
  if (!d) return undefined;
  const h = window.innerHeight;
  const blocks = [...d.querySelectorAll<HTMLElement>(":scope > *, :scope > * > *")].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 40 && r.height > 8 && r.bottom > 0 && r.top < h);
  const cuts = [0, h];
  for (const r of blocks) cuts.push(Math.max(0, r.top), Math.min(h, r.bottom));
  const ys = [...new Set(cuts)].sort((a, b) => a - b);
  let best = { top: 0, bottom: 0 };
  for (let i = 0; i + 1 < ys.length; i++) {
    const mid = (ys[i]! + ys[i + 1]!) / 2;
    if (blocks.some((r) => r.top <= mid && r.bottom >= mid)) continue;
    // Join the free stretches that touch.
    let j = i;
    while (j + 2 < ys.length && !blocks.some((r) => r.top <= (ys[j + 1]! + ys[j + 2]!) / 2 && r.bottom >= (ys[j + 1]! + ys[j + 2]!) / 2)) j++;
    // The stage is shown above the sheet (or between its head and its body): a band starting in the top half.
    if (ys[i]! < h * 0.5 && ys[j + 1]! - ys[i]! > best.bottom - best.top) best = { top: ys[i]!, bottom: ys[j + 1]! };
  }
  return best.bottom - best.top > 80 ? best : undefined;
}
