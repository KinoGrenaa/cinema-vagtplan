import ExcelJS from 'exceljs';

export function buildPayrollXlsxExport(report: any) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payroll');

  sheet.columns = [
    { header: 'Medarbejder', key: 'employee', width: 30 },
    { header: 'Medarbejdernummer', key: 'employeeNumber', width: 20 },
    { header: 'Løn medarbejder ID', key: 'payrollEmployeeId', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Dato', key: 'date', width: 15 },
    { header: 'Ind', key: 'clockIn', width: 25 },
    { header: 'Ud', key: 'clockOut', width: 25 },
    { header: 'Timer', key: 'hours', width: 12 },
    { header: 'Jobfunktion', key: 'jobFunction', width: 20 },
    { header: 'Intern kode', key: 'payrollCode', width: 16 },
    { header: 'Eksportkode', key: 'exportCode', width: 16 },
    { header: 'Eksportnavn', key: 'payrollName', width: 20 },
    { header: 'Grundløn', key: 'basePayAmount', width: 14 },
    { header: 'Tillæg', key: 'supplementAmount', width: 14 },
    { header: 'Beregnet beløb', key: 'calculatedAmount', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Note', key: 'note', width: 30 },
    { header: 'Admin note', key: 'adminNote', width: 30 },
    { header: 'Låst', key: 'locked', width: 12 },
    { header: 'Låst op af MASTER', key: 'unlockedByMaster', width: 20 },
  ];

  for (const employee of report.employees) {
    for (const entry of employee.entries) {
      sheet.addRow({
        employee: employee.name,
        employeeNumber: employee.employeeNumber || '',
        payrollEmployeeId: employee.payrollEmployeeId || '',
        email: employee.email,
        date: entry.date,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        hours: entry.hours,
        jobFunction: entry.jobFunction,
        payrollCode: entry.payrollCode,
        exportCode: entry.exportCode,
        payrollName: entry.payrollName,
        basePayAmount: entry.basePayAmount ?? 0,
        supplementAmount: entry.supplementAmount ?? 0,
        calculatedAmount: entry.calculatedAmount ?? 0,
        status: entry.status,
        note: entry.note || '',
        adminNote: entry.adminNote || '',
        locked: entry.payrollLocked ? 'Ja' : 'Nej',
        unlockedByMaster: entry.payrollUnlockedByMaster ? 'Ja' : 'Nej',
      });
    }
  }

  sheet.getRow(1).font = {
    bold: true,
  };


  const calculationSheet = workbook.addWorksheet('Lønberegning');
  calculationSheet.columns = [
    { header: 'Tidsregistrering', key: 'timeEntryId', width: 18 },
    { header: 'Linjetype', key: 'lineType', width: 18 },
    { header: 'Fra', key: 'segmentStart', width: 24 },
    { header: 'Til', key: 'segmentEnd', width: 24 },
    { header: 'Minutter', key: 'minutes', width: 12 },
    { header: 'Sats', key: 'rate', width: 14 },
    { header: 'Procent', key: 'percentage', width: 12 },
    { header: 'Beløb', key: 'roundedAmount', width: 14 },
    { header: 'Eksportkode', key: 'exportCode', width: 16 },
  ];
  for (const line of report.payrollCalculation?.lines ?? []) {
    calculationSheet.addRow({
      timeEntryId: line.timeEntryId ?? '',
      lineType: line.lineType,
      segmentStart:
        line.segmentStart instanceof Date
          ? line.segmentStart.toISOString()
          : String(line.segmentStart ?? ''),
      segmentEnd:
        line.segmentEnd instanceof Date
          ? line.segmentEnd.toISOString()
          : String(line.segmentEnd ?? ''),
      minutes: line.minutes,
      rate: line.rate === null || line.rate === undefined ? '' : Number(line.rate),
      percentage:
        line.percentage === null || line.percentage === undefined
          ? ''
          : Number(line.percentage),
      roundedAmount: Number(line.roundedAmount ?? 0),
      exportCode:
        line.payrollType?.exportCode || line.payrollType?.payrollCode || '',
    });
  }
  calculationSheet.getRow(1).font = { bold: true };
  calculationSheet.addRow([]);
  calculationSheet.addRow({
    lineType: 'TOTAL',
    minutes: report.payrollCalculation?.totalMinutes ?? 0,
    roundedAmount: report.totalAmount ?? 0,
  });

  return workbook.xlsx.writeBuffer();
}
