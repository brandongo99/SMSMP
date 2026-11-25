function createInfobipClient({ baseUrl, apiKey, sender, fetchImpl = fetch }) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return async function sendSms({ recipients, message }) {
    const response = await fetchImpl(`${normalizedBaseUrl}/sms/3/messages`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            sender,
            destinations: recipients.map((to) => ({ to })),
            content: { text: message },
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const rawBody = await response.text();
    let data;

    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = { message: rawBody };
    }

    if (!response.ok) {
      const error = new Error("Infobip rechazó la solicitud.");
      error.status = response.status;
      error.details = data;
      error.provider = "Infobip";
      throw error;
    }

    return data;
  };
}

module.exports = { createInfobipClient };
