const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSmsRequest } = require("../src/validation");

test("acepta un número individual", () => {
  const result = validateSmsRequest({
    to: "+50250414742",
    message: "Mensaje de prueba",
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.recipients, ["+50250414742"]);
});

test("acepta una lista y elimina duplicados", () => {
  const result = validateSmsRequest({
    to: ["+50250414742", "+50250414742", "+50255555555"],
    message: "Mensaje de prueba",
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.recipients, ["+50250414742", "+50255555555"]);
});

test("rechaza números que no estén en formato E.164", () => {
  const result = validateSmsRequest({
    to: ["50414742"],
    message: "Mensaje de prueba",
  });

  assert.equal(result.errors.length, 1);
});

test("rechaza mensajes vacíos", () => {
  const result = validateSmsRequest({ to: "+50250414742", message: "  " });

  assert.equal(result.errors.length, 1);
});
