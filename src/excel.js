const ExcelJS = require("exceljs");

const MAX_IMPORT_ROWS = 2_000;

function getCellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value.result !== undefined) return String(value.result ?? "");
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if (value.text !== undefined) return String(value.text);
  }
  return String(value);
}

function normalizeGuatemalaNumber(value) {
  const compact = getCellText(value).trim().replace(/[\s()-]/g, "");
  if (!compact) return null;

  const localNumber = compact.startsWith("+502")
    ? compact.slice(4)
    : compact.startsWith("502") && compact.length === 11
      ? compact.slice(3)
      : compact;

  return /^\d{8}$/.test(localNumber) ? `+502${localNumber}` : null;
}

async function extractGuatemalaNumbers(buffer) {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    const error = new Error("El archivo no es un libro de Excel válido.");
    error.statusCode = 400;
    throw error;
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    const error = new Error("El archivo no contiene hojas de cálculo.");
    error.statusCode = 400;
    throw error;
  }

  let phoneColumn;
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = getCellText(cell.value).trim().toLowerCase();
    if (["telefono", "teléfono", "numero", "número"].includes(header)) {
      phoneColumn = columnNumber;
    }
  });

  if (!phoneColumn) {
    const error = new Error(
      'La primera fila debe contener una columna llamada "telefono".',
    );
    error.statusCode = 400;
    throw error;
  }

  const numbers = [];
  const seen = new Set();
  const invalidRows = [];
  let duplicateCount = 0;
  let processedRows = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const rawValue = worksheet.getCell(rowNumber, phoneColumn).value;
    const displayValue = getCellText(rawValue).trim();
    if (!displayValue) continue;

    processedRows += 1;
    if (processedRows > MAX_IMPORT_ROWS) {
      const error = new Error(
        `El archivo admite un máximo de ${MAX_IMPORT_ROWS} números.`,
      );
      error.statusCode = 400;
      throw error;
    }

    const normalized = normalizeGuatemalaNumber(rawValue);
    if (!normalized) {
      invalidRows.push({ row: rowNumber, value: displayValue.slice(0, 40) });
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalized);
    numbers.push(normalized);
  }

  if (numbers.length === 0) {
    const error = new Error("El archivo no contiene números válidos.");
    error.statusCode = 400;
    throw error;
  }

  return {
    numbers,
    validCount: numbers.length,
    invalidCount: invalidRows.length,
    duplicateCount,
    invalidRows: invalidRows.slice(0, 20),
  };
}

module.exports = { extractGuatemalaNumbers, normalizeGuatemalaNumber };
