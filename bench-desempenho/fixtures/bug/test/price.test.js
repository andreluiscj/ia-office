import test from "node:test";
import assert from "node:assert/strict";
import { total, discount } from "../src/price.js";

test("total soma preço x quantidade", () => {
  assert.equal(total([{ price: 10, qty: 2 }, { price: 5 }]), 25);
});
test("total de lista vazia é 0", () => {
  assert.equal(total([]), 0);
});
test("discount aplica percentual", () => {
  assert.equal(discount(200, 10), 180);
});
