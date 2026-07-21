export const CURRENCY_SYMBOL = '₱'

export function formatCurrency(value) {
  return `${CURRENCY_SYMBOL}${Number(value || 0).toFixed(2)}`
}
