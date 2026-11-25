const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("http://127.0.0.1:3000");
  await page.waitForLoadState("networkidle");

  await page.getByRole("heading", { name: "Una lista. Dos canales." }).waitFor();
  if (!(await page.getByRole("button", { name: "Enviar por WhatsApp" }).isDisabled())) {
    throw new Error("El botón de WhatsApp debe iniciar deshabilitado.");
  }
  if (!(await page.getByRole("button", { name: "Enviar por SMS" }).isDisabled())) {
    throw new Error("El botón de SMS debe iniciar deshabilitado.");
  }
  if ((await page.locator("#template-name").textContent()) !== "mp_mujer") {
    throw new Error("No se mostró la plantilla configurada.");
  }
  if (!(await page.locator("#message-preview-text").textContent()).includes("Bienvenida a Mujer MP")) {
    throw new Error("No se mostró la vista previa del mensaje.");
  }
  await page.screenshot({ path: "/tmp/mujer-mp-ui-desktop.png", fullPage: true });

  await page.locator("#api-key").fill("test-ui-key");
  await page.locator("#numbers-file").setInputFiles(
    path.resolve("public/plantilla_numeros.xlsx"),
  );
  await page.waitForTimeout(1500);
  const fileError = (await page.locator("#file-error").textContent()).trim();
  if (fileError !== "El archivo no contiene números válidos.") {
    throw new Error(`Error inesperado al cargar la plantilla vacía: ${fileError || "sin mensaje"}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/mujer-mp-ui-mobile.png", fullPage: true });

  if (pageErrors.length > 0) {
    throw new Error(`Errores de JavaScript: ${pageErrors.join(" | ")}`);
  }

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
