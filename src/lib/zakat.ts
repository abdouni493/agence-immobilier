/**
 * Business Zakat (زكاة عروض التجارة) for a real-estate agency in Algeria.
 *
 * Rules implemented here:
 *   Total Assets       = bank + cash + receivable commissions + properties for
 *                        sale + trade inventory + other zakatable assets
 *   Net Zakatable      = Total Assets − current liabilities (debts due now)
 *   Nisab              = 85 g of gold. When a gold price per gram is supplied
 *                        the nisab is derived from it, otherwise the manually
 *                        entered (or default) nisab is used.
 *   Zakat              = 0 when Net Zakatable < Nisab, otherwise 2.5 %.
 */

/** Zakat rate on trade goods: 2.5 %. */
export const ZAKAT_RATE = 0.025;

/** Gold weight defining the nisab, in grams. */
export const NISAB_GOLD_GRAMS = 85;

/** Fallback nisab in DZD when no gold price is provided. */
export const DEFAULT_NISAB_DZD = 2_295_000;

export interface ZakatInputs {
  /** Cash held in bank accounts (DZD). */
  bankCash: number;
  /** Cash on hand / in the till (DZD). */
  cashOnHand: number;
  /** Commissions already earned but not yet collected (DZD). */
  receivableCommissions: number;
  /** Value of properties the agency owns for resale (DZD). */
  propertiesForSale: number;
  /** Any other trade inventory (DZD). */
  tradeInventory: number;
  /** Other zakatable assets (DZD). */
  otherAssets: number;
  /** Short-term liabilities / debts due now (DZD). */
  currentLiabilities: number;
  /** Manually entered nisab (DZD). Ignored when `goldPricePerGram` > 0. */
  nisabInput: number;
  /** Current gold price per gram (DZD). 0 / undefined → use `nisabInput`. */
  goldPricePerGram: number;
}

export interface ZakatResult {
  totalAssets: number;
  totalLiabilities: number;
  netWealth: number;
  nisab: number;
  /** True when the nisab was derived from the gold price. */
  nisabFromGold: boolean;
  /** True when net zakatable wealth reaches the nisab. */
  isDue: boolean;
  zakat: number;
}

export const emptyZakatInputs: ZakatInputs = {
  bankCash: 0,
  cashOnHand: 0,
  receivableCommissions: 0,
  propertiesForSale: 0,
  tradeInventory: 0,
  otherAssets: 0,
  currentLiabilities: 0,
  nisabInput: DEFAULT_NISAB_DZD,
  goldPricePerGram: 0,
};

/** Every asset field, in display order. Used by the UI and the totals. */
export const ZAKAT_ASSET_FIELDS = [
  'bankCash',
  'cashOnHand',
  'receivableCommissions',
  'propertiesForSale',
  'tradeInventory',
  'otherAssets',
] as const satisfies readonly (keyof ZakatInputs)[];

/** Parse a user-typed amount. Negative / non-numeric values are rejected. */
export function parseAmount(raw: string): { value: number; error: boolean } {
  if (raw.trim() === '') return { value: 0, error: false };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return { value: 0, error: true };
  return { value, error: false };
}

/** Format a DZD amount with thousands separators and two decimals. */
export function formatDZD(amount: number): string {
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DA`;
}

/** Run the full Zakat computation. Inputs are assumed already validated. */
export function computeZakat(input: ZakatInputs): ZakatResult {
  const totalAssets = ZAKAT_ASSET_FIELDS.reduce((sum, key) => sum + (input[key] || 0), 0);
  const totalLiabilities = input.currentLiabilities || 0;
  const netWealth = totalAssets - totalLiabilities;

  const nisabFromGold = (input.goldPricePerGram || 0) > 0;
  const nisab = nisabFromGold
    ? input.goldPricePerGram * NISAB_GOLD_GRAMS
    : (input.nisabInput || DEFAULT_NISAB_DZD);

  const isDue = netWealth >= nisab && netWealth > 0;

  return {
    totalAssets,
    totalLiabilities,
    netWealth,
    nisab,
    nisabFromGold,
    isDue,
    zakat: isDue ? netWealth * ZAKAT_RATE : 0,
  };
}

/** The Hijri-agnostic accounting year used by the agency: 1 Jan → 31 Dec. */
export function zakatYearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}
