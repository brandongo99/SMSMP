const path = require("node:path");
const ExcelJS = require("exceljs");

async function createTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mujer MP";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Numeros", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "telefono", key: "telefono", width: 18 },
    { header: "instrucciones", key: "instrucciones", width: 54 },
  ];

  worksheet.getCell("B2").value =
    "Escribe 8 dígitos, sin +502, espacios ni guiones. Una fila por número.";

  const header = worksheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF17213B" },
  };

  for (let row = 2; row <= 501; row += 1) {
    const cell = worksheet.getCell(`A${row}`);
    cell.numFmt = "00000000";
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF7D6" },
    };
    cell.dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [10000000, 99999999],
      showErrorMessage: true,
      errorTitle: "Número inválido",
      error: "Escribe exactamente 8 dígitos, sin +502, espacios ni guiones.",
    };
  }

  worksheet.autoFilter = "A1:B1";
  worksheet.getCell("B2").alignment = { wrapText: true, vertical: "top" };
  worksheet.getRow(2).height = 36;

  const outputPath = path.join(__dirname, "..", "public", "plantilla_numeros.xlsx");
  await workbook.xlsx.writeFile(outputPath);
}

createTemplate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
