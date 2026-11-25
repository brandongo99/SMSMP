const crypto = require("node:crypto");

function createWhatsAppClient({
  baseUrl,
  apiKey,
  sender,
  templateId,
  fetchImpl = fetch,
}) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedSender = sender.replace(/^\+/, "");
  const endpoint = `${normalizedBaseUrl}/whatsapp/1/message/template`;
  const templateEndpoint = templateId
    ? `${normalizedBaseUrl}/whatsapp/2/senders/${encodeURIComponent(normalizedSender)}/templates/${encodeURIComponent(templateId)}`
    : null;

  async function ensureTemplateIsApproved(templateName, languageCode) {
    if (!templateEndpoint) {
      const error = new Error(
        "Configura INFOBIP_WHATSAPP_TEMPLATE_ID para validar la plantilla antes de enviar.",
      );
      error.statusCode = 503;
      throw error;
    }

    const response = await fetchImpl(templateEndpoint, {
      headers: {
        Authorization: `App ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const rawBody = await response.text();
    let template;

    try {
      template = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      template = { message: rawBody };
    }

    if (!response.ok) {
      const error = new Error(
        response.status === 404
          ? "La plantilla de WhatsApp configurada no existe en Infobip."
          : "No fue posible verificar la plantilla de WhatsApp en Infobip.",
      );
      error.status = response.status;
      error.details = template;
      error.provider = "Infobip";
      throw error;
    }

    if (template?.name !== templateName || template?.language !== languageCode) {
      const error = new Error(
        `La plantilla configurada no coincide con ${templateName} (${languageCode}).`,
      );
      error.statusCode = 409;
      throw error;
    }

    if (template?.status !== "APPROVED") {
      const status = template?.status || "DESCONOCIDO";
      const error = new Error(
        `La plantilla de WhatsApp "${templateName}" no está aprobada. Estado actual: ${status}.`,
      );
      error.statusCode = 409;
      throw error;
    }
  }

  return async function sendWhatsAppTemplate({
    recipients,
    templateName,
    languageCode,
    placeholders,
    buttons,
  }) {
    await ensureTemplateIsApproved(templateName, languageCode);

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: recipients.map((to) => {
          const templateData = {
            body: { placeholders },
          };

          if (buttons.length > 0) {
            templateData.buttons = buttons;
          }

          return {
            from: normalizedSender,
            to,
            messageId: crypto.randomUUID(),
            content: {
              templateName,
              templateData,
              language: languageCode,
            },
          };
        }),
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
      const error = new Error("Infobip rechazó la notificación de WhatsApp.");
      error.status = response.status;
      error.details = data;
      error.provider = "Infobip";
      throw error;
    }

    return data;
  };
}

module.exports = { createWhatsAppClient };
