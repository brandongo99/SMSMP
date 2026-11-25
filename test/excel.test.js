const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeGuatemalaNumber } = require("../src/excel");

test("agrega el código de Guatemala a números de ocho dígitos", () => {
  assert.equal(normalizeGuatemalaNumber("50414742"), "+50250414742");
});

test("acepta números que ya incluyen el código de Guatemala", () => {
  assert.equal(normalizeGuatemalaNumber("+502 5041-4742"), "+50250414742");
});

test("rechaza números con una longitud incorrecta", () => {
  assert.equal(normalizeGuatemalaNumber("1234"), null);
});
