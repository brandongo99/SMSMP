const test = require("node:test");
const assert = require("node:assert/strict");
const { validateWhatsAppRequest } = require("../src/whatsapp-validation");

test("valida una notificación de WhatsApp y normaliza el número", () => {
  const result = validateWhatsAppRequest({
    to: "+50250414742",
    templateName: "notificacion_url",
    languageCode: "es",
    placeholders: ["https://example.com/a/123"],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.recipients, ["50250414742"]);
  assert.deepEqual(result.placeholders, ["https://example.com/a/123"]);
});

test("rechaza nombres de plantilla inválidos", () => {
  const result = validateWhatsAppRequest({
    to: "+50250414742",
    templateName: "Mi Plantilla",
  });

  assert.equal(result.errors.length, 1);
});

test("utiliza la plantilla y el idioma predeterminados", () => {
  const result = validateWhatsAppRequest(
    { to: "+50250414742" },
    {
      defaultTemplateName: "mp_mujer",
      defaultLanguageCode: "es",
    },
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.templateName, "mp_mujer");
  assert.equal(result.languageCode, "es");
});
