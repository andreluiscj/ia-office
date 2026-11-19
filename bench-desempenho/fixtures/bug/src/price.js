// Cálculos de preço da loja.
export function total(items) {
  return items.reduce((sum, it) => sum + it.price * (it.qty ?? 1), 0);
}

// Aplica desconto percentual (pct de 0 a 100) sobre um valor.
export function discount(amount, pct) {
  return amount - (amount * pct) / 100;
}
