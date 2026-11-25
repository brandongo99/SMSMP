const fileInput = document.querySelector("#numbers-file");
const apiKeyInput = document.querySelector("#api-key");
const fileError = document.querySelector("#file-error");
const summary = document.querySelector("#summary");
const validCount = document.querySelector("#valid-count");
const duplicateCount = document.querySelector("#duplicate-count");
const invalidCount = document.querySelector("#invalid-count");
const smsMessage = document.querySelector("#sms-message");
const messagePreview = document.querySelector("#message-preview-text");
const templateName = document.querySelector("#template-name");
const characterCount = document.querySelector("#character-count");
const sendWhatsApp = document.querySelector("#send-whatsapp");
const sendSms = document.querySelector("#send-sms");
const sendStatus = document.querySelector("#send-status");

let recipients = [];
let maxBatchSize = 100;

function requestHeaders(extra = {}) {
  const headers = { ...extra };
  const key = apiKeyInput.value.trim();
  if (key) headers["x-api-key"] = key;
  return headers;
}

function setActionsEnabled(enabled) {
  sendWhatsApp.disabled = !enabled;
  sendSms.disabled = !enabled;
}

function setStatus(message, state = "") {
  sendStatus.textContent = message;
  sendStatus.dataset.state = state;
}

function updateMessagePreview() {
  const message = smsMessage.value;
  messagePreview.textContent = message;
  characterCount.textContent = String(message.length);
  sendSms.disabled = recipients.length === 0 || message.trim().length === 0;
}

async function loadConfig() {
  try {
    const response = await fetch("/ui-config");
    if (!response.ok) throw new Error();
    const config = await response.json();
    smsMessage.value = config.defaultNotificationMessage || "";
    templateName.textContent = config.whatsappTemplateName || "sin configurar";
    maxBatchSize = config.maxBatchSize || 100;
    updateMessagePreview();
  } catch {
    setStatus("No fue posible cargar la configuración de la aplicación.", "error");
  }
}

async function importWorkbook() {
  const file = fileInput.files[0];
  recipients = [];
  summary.hidden = true;
  fileError.textContent = "";
  fileInput.removeAttribute("aria-invalid");
  setActionsEnabled(false);
  setStatus("");

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  fileInput.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("/api/import/numbers", {
      method: "POST",
      headers: requestHeaders(),
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      const message =
        response.status === 401
          ? "La clave no coincide. Si cambiaste INTERNAL_API_KEY, reinicia el servidor y vuelve a intentarlo."
          : data.error || "No fue posible leer el archivo.";
      throw new Error(message);
    }

    recipients = data.result.numbers;
    validCount.textContent = String(data.result.validCount);
    duplicateCount.textContent = String(data.result.duplicateCount);
    invalidCount.textContent = String(data.result.invalidCount);
    summary.hidden = false;
    setActionsEnabled(true);
    updateMessagePreview();
    setStatus(`${recipients.length} números listos para enviar.`);
  } catch (error) {
    fileError.textContent = error.message;
    fileInput.setAttribute("aria-invalid", "true");
  } finally {
    fileInput.removeAttribute("aria-busy");
  }
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function providerErrorMessage(data, fallback) {
  const details = data?.details;
  const exception =
    details?.requestError?.serviceException ||
    details?.requestError?.policyException;
  const detailText =
    exception?.text ||
    details?.error?.message ||
    details?.message ||
    (Array.isArray(details?.errors)
      ? details.errors.map((error) => error.message || error.text).filter(Boolean).join(" ")
      : "");
  const detailCode = exception?.messageId || details?.error?.code;
  const status = data?.providerStatus
    ? `HTTP ${data.providerStatus}`
    : "";

  return [data?.error || fallback, detailText, detailCode, status]
    .filter(Boolean)
    .join(" · ");
}

async function sendBatches(channel) {
  if (recipients.length === 0) return;

  const channelLabel = channel === "whatsapp" ? "WhatsApp" : "SMS";
  const confirmed = window.confirm(
    `Se enviarán ${recipients.length} notificaciones por ${channelLabel}. ¿Deseas continuar?`,
  );
  if (!confirmed) return;

  const batches = chunks(recipients, maxBatchSize);
  setActionsEnabled(false);
  document.querySelector(".workspace").setAttribute("aria-busy", "true");

  let sent = 0;
  try {
    for (let index = 0; index < batches.length; index += 1) {
      setStatus(
        `Enviando lote ${index + 1} de ${batches.length} por ${channelLabel}…`,
      );
      const body =
        channel === "whatsapp"
          ? { to: batches[index] }
          : { to: batches[index], message: smsMessage.value.trim() };
      const response = await fetch(`/api/${channel}`, {
        method: "POST",
        headers: requestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.errors?.join(" ") ||
            providerErrorMessage(data, `Falló el lote ${index + 1}.`),
        );
      }
      sent += batches[index].length;
    }

    setStatus(
      channel === "whatsapp"
        ? `${sent} solicitudes fueron recibidas por Infobip. La entrega queda pendiente de confirmación.`
        : `${sent} SMS fueron aceptados por Infobip para procesamiento.`,
      "success",
    );
  } catch (error) {
    setStatus(`${sent} enviadas antes del error. ${error.message}`, "error");
  } finally {
    document.querySelector(".workspace").removeAttribute("aria-busy");
    setActionsEnabled(true);
    updateMessagePreview();
  }
}

fileInput.addEventListener("change", importWorkbook);
apiKeyInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) importWorkbook();
});
smsMessage.addEventListener("input", updateMessagePreview);
sendWhatsApp.addEventListener("click", () => sendBatches("whatsapp"));
sendSms.addEventListener("click", () => sendBatches("sms"));

loadConfig();
