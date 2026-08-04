import ExcelJS from 'exceljs';
import { buildPayrollXlsxExport } from './payroll-xlsx-export';

describe('buildPayrollXlsxExport', () => {
  it('skriver og genindlæser en lønfil med den hardenede ExcelJS-kæde', async () => {
    const buffer = await buildPayrollXlsxExport({
      employees: [
        {
          name: 'Test Medarbejder',
          employeeNumber: '42',
          payrollEmployeeId: 'L-42',
          email: 'test@example.com',
          entries: [
            {
              date: '2026-07-29',
              clockIn: '2026-07-29T15:00:00.000Z',
              clockOut: '2026-07-29T20:00:00.000Z',
              hours: 5,
              jobFunction: 'Biografvagt',
              payrollCode: '1000',
              exportCode: 'ORD',
              payrollName: 'Ordinære timer',
              status: 'APPROVED',
              note: 'Testnote',
              adminNote: '',
              payrollLocked: true,
              payrollUnlockedByMaster: false,
            },
          ],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer));

    const sheet = workbook.getWorksheet('Payroll');
    expect(sheet).toBeDefined();
    expect(sheet?.getCell('A1').value).toBe('Medarbejder');
    expect(sheet?.getCell('A2').value).toBe('Test Medarbejder');
    expect(sheet?.getCell('H2').value).toBe(5);

    expect(sheet?.getCell('O1').value).toBe('Beregnet beløb');
    expect(sheet?.getCell('R1').value).toBe('Admin note');
    expect(sheet?.getCell('S1').value).toBe('Låst');
    expect(sheet?.getCell('T1').value).toBe('Låst op af MASTER');
    expect(sheet?.getCell('O2').value).toBe(0);
    expect(sheet?.getCell('R2').value).toBe('');
    expect(sheet?.getCell('S2').value).toBe('Ja');
    expect(sheet?.getCell('T2').value).toBe('Nej');
  });
});
