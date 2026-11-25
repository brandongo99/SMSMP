const WHATSAPP_E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]{1,512}$/;
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:_[A-Z]{2})?$/;

function validateWhatsAppRequest(
  body,
  { defaultTemplateName, defaultLanguageCode = "es" } = {},
) {
  const errors = [];
  const rawRecipients = typeof body?.to === "string" ? [body.to] : body?.to;
  const templateName = body?.templateName ?? defaultTemplateName;

  if (!Array.isArray(rawRecipients) || rawRecipients.length === 0) {
    errors.push('"to" debe ser un número o un arreglo de números.');
  } else {
    if (rawRecipients.length > 100) {
      errors.push('"to" admite un máximo de 100 números por solicitud.');
    }

    if (
      rawRecipients.some(
        (number) =>
          typeof number !== "string" || !WHATSAPP_E164_PATTERN.test(number),
      )
    ) {
      errors.push(
        'Todos los números deben usar formato E.164, por ejemplo "+50250414742".',
      );
    }
  }

  if (
    typeof templateName !== "string" ||
    !TEMPLATE_NAME_PATTERN.test(templateName)
  ) {
    errors.push(
      '"templateName" es obligatorio y solo admite minúsculas, números y guiones bajos.',
    );
  }

  const languageCode = body?.languageCode ?? defaultLanguageCode;
  if (
    typeof languageCode !== "string" ||
    !LANGUAGE_CODE_PATTERN.test(languageCode)
  ) {
    errors.push('"languageCode" debe tener un formato como "es" o "es_MX".');
  }

  const placeholders = body?.placeholders ?? [];
  if (
    !Array.isArray(placeholders) ||
    placeholders.some((value) => typeof value !== "string")
  ) {
    errors.push('"placeholders" debe ser un arreglo de textos.');
  }

  const buttons = body?.buttons ?? [];
  if (
    !Array.isArray(buttons) ||
    buttons.some(
      (button) =>
        !button ||
        typeof button !== "object" ||
        !["URL", "QUICK_REPLY"].includes(button.type) ||
        typeof button.parameter !== "string" ||
        button.parameter.length === 0,
    )
  ) {
    errors.push(
      '"buttons" debe contener botones URL o QUICK_REPLY con un parámetro.',
    );
  }

  return {
    errors,
    recipients: Array.isArray(rawRecipients)
      ? [...new Set(rawRecipients)].map((number) => number.replace(/^\+/, ""))
      : [],
    templateName,
    languageCode,
    placeholders: Array.isArray(placeholders) ? placeholders : [],
    buttons: Array.isArray(buttons) ? buttons : [],
  };
}

module.exports = { validateWhatsAppRequest };
