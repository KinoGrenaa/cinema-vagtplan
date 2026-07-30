import assert from "node:assert/strict";
import { PassThrough } from "node:stream";

import ExcelJS from "exceljs";

const chunks = [];
const output = new PassThrough();
output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

const finished = new Promise((resolve, reject) => {
  output.once("finish", resolve);
  output.once("error", reject);
});

const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
  stream: output,
  useStyles: true,
  useSharedStrings: true,
});

const sheet = workbook.addWorksheet("Streaming");
sheet.addRow(["Status", "Timer"]).commit();
sheet.addRow(["OK", 5]).commit();

await workbook.commit();
await finished;

const buffer = Buffer.concat(chunks);
assert.ok(buffer.length > 0, "Streaming writer produced an empty XLSX file.");

const reader = new ExcelJS.Workbook();
await reader.xlsx.load(buffer);

const resultSheet = reader.getWorksheet("Streaming");
assert.equal(resultSheet?.getCell("A2").value, "OK");
assert.equal(resultSheet?.getCell("B2").value, 5);

console.log("ExcelJS streaming writer and Archiver compatibility adapter OK.");
