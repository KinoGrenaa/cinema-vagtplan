import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

describe('manual time entry payroll type wiring', () => {
  it('assigns the system payroll type only when no shift is selected', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        'time-entry-manual-entry-flow.ts',
      ),
      'utf8',
    );

    expect(source).toContain(
      'ensureManualEntryPayrollType',
    );
    expect(source).toContain(
      'data.shiftId',
    );
    expect(source).toContain(
      'manualEntryPayrollType?.id',
    );
    expect(source).toContain(
      'shift?.jobFunction?.defaultPayrollExportCodeId',
    );
  });
});
