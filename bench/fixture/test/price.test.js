import { test } from "node:test";
import assert from "node:assert/strict";
import { total, discount } from "../src/price.js";

test("sums items", () => assert.equal(total([{ price: 10, qty: 2 }, { price: 5, qty: 1 }]), 25));
test("10% discount", () => assert.equal(discount(100, 10), 90));
