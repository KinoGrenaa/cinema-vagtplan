import { formatPayrollCsvRows } from './payroll-export';

export function buildPayrollCsvExport(report: any) {
  const rows = [
    [
      'Medarbejder',
      'Medarbejdernummer',
      'Løn medarbejder ID',
      'Email',
      'Dato',
      'Ind',
      'Ud',
      'Timer',
      'Arbejdstype',
      'Lønart',
      'Eksportkode',
      'Løntype',
      'Status',
      'Note',
      'Admin note',
      'Låst',
      'Låst op af MASTER',
    ],
  ];

  for (const employee of report.employees) {
    for (const entry of employee.entries) {
      rows.push([
        employee.name,
        employee.employeeNumber || '',
        employee.payrollEmployeeId || '',
        employee.email,
        entry.date,
        entry.clockIn,
        entry.clockOut,
        entry.hours.toString().replace('.', ','),
        entry.workType,
        entry.payrollCode,
        entry.exportCode,
        entry.payrollName,
        entry.status,
        entry.note || '',
        entry.adminNote || '',
        entry.payrollLocked ? 'Ja' : 'Nej',
        entry.payrollUnlockedByMaster ? 'Ja' : 'Nej',
      ]);
    }
  }

  return formatPayrollCsvRows(rows);
}
