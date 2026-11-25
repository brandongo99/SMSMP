const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const { createApp } = require("./app");
const { createInfobipClient } = require("./infobip");
const { createWhatsAppClient } = require("./whatsapp");

const requiredVariables = [
  "INFOBIP_BASE_URL",
  "INFOBIP_SMS_API_KEY",
  "INFOBIP_SENDER",
];
const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(`Faltan variables de entorno: ${missingVariables.join(", ")}`);
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(process.env.INFOBIP_BASE_URL);
  if (baseUrl.protocol !== "https:") throw new Error();
} catch {
  console.error("INFOBIP_BASE_URL debe ser una URL HTTPS válida.");
  process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const defaultNotificationMessage =
  process.env.DEFAULT_NOTIFICATION_MESSAGE ||
  "Bienvenida a Mujer MP. Tu espacio para cuidarte y encontrar apoyo. Descarga la app en tu celular: https://mpvirtual.mp.gob.gt/backend/mobile/store-mujer";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT debe ser un número entre 1 y 65535.");
  process.exit(1);
}

const sendSms = createInfobipClient({
  baseUrl: baseUrl.toString(),
  apiKey: process.env.INFOBIP_SMS_API_KEY,
  sender: process.env.INFOBIP_SENDER,
});

const sendWhatsAppTemplate =
  process.env.INFOBIP_WHATSAPP_SENDER?.trim() &&
  process.env.INFOBIP_WHATSAPP_API_KEY?.trim()
    ? createWhatsAppClient({
        baseUrl: baseUrl.toString(),
        apiKey: process.env.INFOBIP_WHATSAPP_API_KEY,
        sender: process.env.INFOBIP_WHATSAPP_SENDER,
        templateId: process.env.INFOBIP_WHATSAPP_TEMPLATE_ID,
      })
    : undefined;

const app = createApp({
  sendSms,
  sendWhatsAppTemplate,
  internalApiKey: process.env.INTERNAL_API_KEY?.trim(),
  whatsappTemplateName: process.env.INFOBIP_WHATSAPP_TEMPLATE_NAME,
  whatsappTemplateLanguage:
    process.env.INFOBIP_WHATSAPP_TEMPLATE_LANGUAGE || "es",
  defaultNotificationMessage,
});

app.listen(port, host, () => {
  console.log(`API de notificaciones escuchando en http://${host}:${port}`);
});
