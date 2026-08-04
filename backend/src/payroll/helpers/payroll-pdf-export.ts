import PDFDocument from 'pdfkit';

export function buildPayrollPdfExport(
  report: any,
  startDate: string,
  endDate: string,
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
  });

  doc.on('data', (chunk) => chunks.push(chunk));

  doc.fontSize(20).text('Lønrapport', {
    align: 'center',
  });

  doc.moveDown();

  doc.fontSize(11).text(`Periode: ${startDate} til ${endDate}`);
  doc.text(`Eksporteret: ${new Date().toLocaleString('da-DK')}`);
  doc.text(`Lønmodel: ${report.payrollMode ?? 'Ikke angivet'}`);
  doc.text(`Grundløn i alt: ${(report.basePayAmount ?? 0).toFixed(2)} kr.`);
  doc.text(`Tillæg i alt: ${(report.supplementAmount ?? 0).toFixed(2)} kr.`);
  doc.text(`Efterregulering i alt: ${(report.adjustmentAmount ?? 0).toFixed(2)} kr.`);
  doc.text(`Beregnet beløb i alt: ${(report.totalAmount ?? 0).toFixed(2)} kr.`);

  doc.moveDown();

  for (const employee of report.employees) {
    doc.fontSize(14).text(employee.name, {
      underline: true,
    });

    doc.fontSize(10).text(employee.email);

    if (employee.employeeNumber) {
      doc.text(`Medarbejdernummer: ${employee.employeeNumber}`);
    }

    if (employee.payrollEmployeeId) {
      doc.text(`Løn medarbejder ID: ${employee.payrollEmployeeId}`);
    }

    doc.text(`Timer i alt: ${employee.totalHours.toFixed(2)}`);
    doc.text(`Grundløn: ${(employee.basePayAmount ?? 0).toFixed(2)} kr.`);
    doc.text(`Tillæg: ${(employee.supplementAmount ?? 0).toFixed(2)} kr.`);
    doc.text(`Efterregulering: ${(employee.adjustmentAmount ?? 0).toFixed(2)} kr.`);
    doc.text(`Beløb i alt: ${(employee.totalAmount ?? 0).toFixed(2)} kr.`);

    doc.moveDown(0.5);

    for (const entry of employee.entries) {
      doc
        .fontSize(9)
        .text(
          `${entry.date} | ${entry.hours.toFixed(2)} timer | ${entry.jobFunction} | ${entry.payrollName} | ${entry.exportCode} | ${(entry.calculatedAmount ?? 0).toFixed(2)} kr. | ${entry.status}`,
        );

      if (entry.note || entry.adminNote) {
        doc.fontSize(8).text(`Note: ${entry.adminNote || entry.note}`);
      }
    }

    doc.moveDown();
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
