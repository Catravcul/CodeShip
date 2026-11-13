/** One line of the account: what came in or went out, and why. */
export interface Movement {
  readonly credits: number;
  readonly why: string;
}

/**
 * The credits Nevaeh pays for missions, spent on imports from the Sanctuary. 1 crédito = 1 000 US$
 * (game value, so launch prices read in real money). Never goes negative.
 */
export class Wallet {
  private _balance: number;
  private readonly log: Movement[] = [];

  constructor(initial = 0) {
    if (initial < 0) throw new Error("A wallet cannot start in debt");
    this._balance = initial;
  }

  get balance(): number {
    return this._balance;
  }
  get history(): readonly Movement[] {
    return this.log;
  }

  earn(credits: number, why: string): void {
    if (credits < 0) throw new Error("Earn a positive amount");
    this._balance += credits;
    this.log.push({ credits, why });
  }

  canSpend(credits: number): boolean {
    return credits <= this._balance + 1e-9;
  }

  spend(credits: number, why: string): void {
    if (!this.canSpend(credits)) throw new Error(`Not enough credits: ${credits} > ${this._balance}`);
    this._balance -= credits;
    this.log.push({ credits: -credits, why });
  }
}

/** US dollars per crédito (game value). */
export const USD_PER_CREDIT = 1000;
