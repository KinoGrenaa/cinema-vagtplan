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
      'Jobfunktion',
      'Intern kode',
      'Eksportkode',
      'Eksportnavn',
      'Grundløn',
      'Tillæg',
      'Beregnet beløb',
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
        entry.jobFunction,
        entry.payrollCode,
        entry.exportCode,
        entry.payrollName,
        String(entry.basePayAmount ?? 0).replace('.', ','),
        String(entry.supplementAmount ?? 0).replace('.', ','),
        String(entry.calculatedAmount ?? 0).replace('.', ','),
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
