/**
 * Decimal-safe monetary arithmetic and currency formatting utilities.
 * Uses integer subunits (cents) to avoid floating-point errors (e.g. 0.1 + 0.2 === 0.30000000000000004).
 */

export function toSubunits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromSubunits(subunits: number): number {
  return Math.round(subunits) / 100;
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  const q = Math.max(0, Number(quantity) || 0);
  const pSub = toSubunits(Number(unitPrice) || 0);
  const totalSub = Math.round(q * pSub);
  return fromSubunits(totalSub);
}

export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  taxRatePercent: number = 0
): { subtotal: number; taxAmount: number; total: number } {
  let subtotalSub = 0;
  for (const item of items) {
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice);
    subtotalSub += toSubunits(lineTotal);
  }

  const taxRate = Math.max(0, Number(taxRatePercent) || 0);
  const taxAmountSub = Math.round((subtotalSub * taxRate) / 100);
  const totalSub = subtotalSub + taxAmountSub;

  return {
    subtotal: fromSubunits(subtotalSub),
    taxAmount: fromSubunits(taxAmountSub),
    total: fromSubunits(totalSub),
  };
}

export function calculateRemainingBalance(total: number, paidAmount: number): number {
  const totalSub = toSubunits(Number(total) || 0);
  const paidSub = toSubunits(Number(paidAmount) || 0);
  const remainingSub = Math.max(0, totalSub - paidSub);
  return fromSubunits(remainingSub);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function sumAmounts(amounts: number[]): number {
  const sumSub = amounts.reduce((acc, curr) => acc + toSubunits(Number(curr) || 0), 0);
  return fromSubunits(sumSub);
}
