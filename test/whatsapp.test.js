const test = require("node:test");
const assert = require("node:assert/strict");
const { createWhatsAppClient } = require("../src/whatsapp");

test("envía una plantilla de WhatsApp mediante Infobip", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (options.method !== "POST") {
      return new Response(
        JSON.stringify({
          name: "notificacion_url",
          language: "es",
          status: "APPROVED",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ messages: [{ id: "wamid.test" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const send = createWhatsAppClient({
    baseUrl: "https://example.api.infobip.com/",
    apiKey: "secret-key",
    sender: "+50255550000",
    templateId: "template-id",
    fetchImpl,
  });

  const result = await send({
    recipients: ["50250414742"],
    templateName: "notificacion_url",
    languageCode: "es",
    placeholders: ["https://example.com/a/123"],
    buttons: [],
  });

  assert.equal(requests.length, 2);
  assert.equal(
    requests[0].url,
    "https://example.api.infobip.com/whatsapp/2/senders/50255550000/templates/template-id",
  );
  assert.equal(
    requests[1].url,
    "https://example.api.infobip.com/whatsapp/1/message/template",
  );
  assert.equal(requests[1].options.headers.Authorization, "App secret-key");

  const message = JSON.parse(requests[1].options.body).messages[0];
  assert.equal(message.from, "50255550000");
  assert.equal(message.to, "50250414742");
  assert.equal(message.content.templateName, "notificacion_url");
  assert.deepEqual(message.content.templateData.body.placeholders, [
    "https://example.com/a/123",
  ]);
  assert.equal(result.messages[0].id, "wamid.test");
});

test("no envía cuando la plantilla todavía no está aprobada", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(
      JSON.stringify({ name: "mp_mujer", language: "es", status: "PENDING" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const send = createWhatsAppClient({
    baseUrl: "https://example.api.infobip.com",
    apiKey: "secret-key",
    sender: "12079526362",
    templateId: "1164159739637488",
    fetchImpl,
  });

  await assert.rejects(
    send({
      recipients: ["50250414742"],
      templateName: "mp_mujer",
      languageCode: "es",
      placeholders: [],
      buttons: [],
    }),
    /Estado actual: PENDING/,
  );
  assert.equal(requests.length, 1);
  assert.notEqual(requests[0].options.method, "POST");
});
