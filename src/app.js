const express = require("express");
const path = require("node:path");
const multer = require("multer");
const { validateSmsRequest } = require("./validation");
const { validateWhatsAppRequest } = require("./whatsapp-validation");
const { extractGuatemalaNumbers } = require("./excel");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

function createApp({
  sendSms,
  sendWhatsAppTemplate,
  internalApiKey,
  whatsappTemplateName,
  whatsappTemplateLanguage,
  defaultNotificationMessage,
}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/ui-config", (_request, response) => {
    response.json({
      whatsappTemplateName,
      whatsappTemplateLanguage,
      defaultNotificationMessage,
      countryCode: "+502",
      maxBatchSize: 100,
    });
  });

  app.use("/api", (request, response, next) => {
    if (!internalApiKey || request.get("x-api-key") === internalApiKey) {
      return next();
    }

    return response.status(401).json({
      ok: false,
      error: "API key interna inválida.",
    });
  });

  app.post("/api/sms", async (request, response, next) => {
    const { errors, recipients, message } = validateSmsRequest(request.body);

    if (errors.length > 0) {
      return response.status(400).json({ ok: false, errors });
    }

    try {
      const result = await sendSms({ recipients, message });
      return response.status(200).json({ ok: true, result });
    } catch (error) {
      return next(error);
    }
  });

  app.post(
    "/api/import/numbers",
    upload.single("file"),
    async (request, response, next) => {
      if (!request.file) {
        return response.status(400).json({
          ok: false,
          error: "Selecciona un archivo .xlsx.",
        });
      }

      if (!request.file.originalname.toLowerCase().endsWith(".xlsx")) {
        return response.status(400).json({
          ok: false,
          error: "El archivo debe tener extensión .xlsx.",
        });
      }

      try {
        const result = await extractGuatemalaNumbers(request.file.buffer);
        return response.json({ ok: true, result });
      } catch (error) {
        return next(error);
      }
    },
  );

  app.post("/api/whatsapp", async (request, response, next) => {
    if (!sendWhatsAppTemplate) {
      return response.status(503).json({
        ok: false,
        error: "WhatsApp de Infobip todavía no está configurado.",
      });
    }

    const {
      errors,
      recipients,
      templateName,
      languageCode,
      placeholders,
      buttons,
    } = validateWhatsAppRequest(request.body, {
      defaultTemplateName: whatsappTemplateName,
      defaultLanguageCode: whatsappTemplateLanguage,
    });

    if (errors.length > 0) {
      return response.status(400).json({ ok: false, errors });
    }

    try {
      const result = await sendWhatsAppTemplate({
        recipients,
        templateName,
        languageCode,
        placeholders,
        buttons,
      });
      return response.status(200).json({ ok: true, result });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
      return response.status(400).json({
        ok: false,
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "El archivo supera el límite de 2 MB."
            : "No fue posible procesar el archivo cargado.",
      });
    }

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      return response.status(400).json({
        ok: false,
        errors: ["El cuerpo de la solicitud no contiene JSON válido."],
      });
    }

    if (
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode < 600
    ) {
      return response.status(error.statusCode).json({
        ok: false,
        error: error.message,
      });
    }

    if (error.status) {
      return response.status(502).json({
        ok: false,
        error: error.message,
        providerStatus: error.status,
        details: error.details,
      });
    }

    console.error(error);
    return response.status(502).json({
      ok: false,
      error: `No fue posible comunicarse con ${error.provider || "el proveedor"}.`,
    });
  });

  return app;
}

module.exports = { createApp };
