const test = require("node:test");
const assert = require("node:assert/strict");
const { createInfobipClient } = require("../src/infobip");

test("construye la solicitud oficial de Infobip sin exponer la API key", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({ messages: [{ messageId: "test-id" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const sendSms = createInfobipClient({
    baseUrl: "https://example.api.infobip.com/",
    apiKey: "secret-key",
    sender: "ServiceSMS",
    fetchImpl,
  });

  const result = await sendSms({
    recipients: ["+50250414742"],
    message: "Hola",
  });

  assert.equal(request.url, "https://example.api.infobip.com/sms/3/messages");
  assert.equal(request.options.headers.Authorization, "App secret-key");
  assert.deepEqual(JSON.parse(request.options.body), {
    messages: [
      {
        sender: "ServiceSMS",
        destinations: [{ to: "+50250414742" }],
        content: { text: "Hola" },
      },
    ],
  });
  assert.equal(result.messages[0].messageId, "test-id");
});
