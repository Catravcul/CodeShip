/**
 * Times a piece of per-frame work (pose updates, for the experience suite's numbers): the mean and
 * the worst sample since the last `reset`, in milliseconds. The clock is injected so tests are exact.
 */
export class FrameTimer {
  private total = 0;
  private n = 0;
  private worst = 0;
  /** The last samples, for the median (a busy machine's stalls inflate the mean and the worst). */
  private readonly recent: number[] = [];

  constructor(private readonly clock: () => number = () => performance.now()) {}

  time<T>(work: () => T): T {
    const t0 = this.clock();
    const out = work();
    const ms = this.clock() - t0;
    this.total += ms;
    this.n++;
    if (ms > this.worst) this.worst = ms;
    this.recent.push(ms);
    if (this.recent.length > FrameTimer.KEEP) this.recent.shift();
    return out;
  }

  get samples(): number {
    return this.n;
  }
  get meanMs(): number {
    return this.n ? this.total / this.n : 0;
  }
  get maxMs(): number {
    return this.worst;
  }
  /** Median of the last samples (up to `KEEP`). */
  get medianMs(): number {
    if (!this.recent.length) return 0;
    const a = [...this.recent].sort((x, y) => x - y);
    return a[Math.floor(a.length / 2)]!;
  }

  static readonly KEEP = 1200;

  reset(): void {
    this.total = 0;
    this.n = 0;
    this.worst = 0;
    this.recent.length = 0;
  }
}
