// Computes the final price of a store order.
export function total(items) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

// Applies a percentage discount (0 to 100) to the total.
export function discount(amount, pct) {
  return amount - amount * pct / 100;
}
