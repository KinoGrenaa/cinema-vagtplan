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
    { header: 'Arbejdstype', key: 'workType', width: 20 },
    { header: 'Lønart', key: 'payrollCode', width: 16 },
    { header: 'Eksportkode', key: 'exportCode', width: 16 },
    { header: 'Løntype', key: 'payrollName', width: 20 },
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
        workType: entry.workType,
        payrollCode: entry.payrollCode,
        exportCode: entry.exportCode,
        payrollName: entry.payrollName,
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

  return workbook.xlsx.writeBuffer();
}
