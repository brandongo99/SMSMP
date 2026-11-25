const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

async function withServer(app, callback) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("POST /api/sms valida y envía la solicitud", async () => {
  let received;
  const app = createApp({
    sendSms: async (payload) => {
      received = payload;
      return { messages: [{ messageId: "test-id" }] };
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: ["+50250414742", "+50255555555"],
        message: "Hola",
      }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.deepEqual(received, {
      recipients: ["+50250414742", "+50255555555"],
      message: "Hola",
    });
  });
});

test("POST /api/sms no llama al proveedor con datos inválidos", async () => {
  let calls = 0;
  const app = createApp({
    sendSms: async () => {
      calls += 1;
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "50414742", message: "Hola" }),
    });

    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  });
});

test("protege los endpoints de envío cuando hay una API key interna", async () => {
  let calls = 0;
  const app = createApp({
    internalApiKey: "internal-secret",
    sendSms: async () => {
      calls += 1;
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "+50250414742", message: "Hola" }),
    });

    assert.equal(response.status, 401);
    assert.equal(calls, 0);
  });
});
