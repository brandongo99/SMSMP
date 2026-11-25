const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

function validateSmsRequest(body) {
  const errors = [];
  const recipients = typeof body?.to === "string" ? [body.to] : body?.to;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    errors.push('"to" debe ser un número o un arreglo de números.');
  } else {
    if (recipients.length > 100) {
      errors.push('"to" admite un máximo de 100 números por solicitud.');
    }

    const invalidNumbers = recipients.filter(
      (number) => typeof number !== "string" || !E164_PATTERN.test(number),
    );

    if (invalidNumbers.length > 0) {
      errors.push(
        'Todos los números deben usar formato E.164, por ejemplo "+50250414742".',
      );
    }
  }

  if (typeof body?.message !== "string" || body.message.trim().length === 0) {
    errors.push('"message" es obligatorio y no puede estar vacío.');
  } else if (body.message.length > 4096) {
    errors.push('"message" no puede superar 4096 caracteres.');
  }

  return {
    errors,
    recipients: Array.isArray(recipients) ? [...new Set(recipients)] : [],
    message: typeof body?.message === "string" ? body.message.trim() : "",
  };
}

module.exports = { validateSmsRequest };
