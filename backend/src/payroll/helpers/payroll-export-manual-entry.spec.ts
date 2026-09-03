import {
  MANUAL_ENTRY_PAYROLL_CODE,
  MANUAL_ENTRY_PAYROLL_NAME,
} from '../../payroll-types/helpers/payroll-type-system';
import { resolvePayrollData } from './payroll-export';

describe('manual entry payroll export', () => {
  it('uses the configured system payroll type when it is linked', () => {
    expect(
      resolvePayrollData({
        payrollType: {
          name: MANUAL_ENTRY_PAYROLL_NAME,
          payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
          exportCode: '901',
        },
        shift: null,
      }),
    ).toEqual({
      payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
      exportCode: '901',
      payrollName: MANUAL_ENTRY_PAYROLL_NAME,
    });
  });

  it('never exposes the old Standard fallback for a no-shift manual entry', () => {
    expect(
      resolvePayrollData({
        payrollType: null,
        shift: null,
      }),
    ).toEqual({
      payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
      exportCode: MANUAL_ENTRY_PAYROLL_CODE,
      payrollName: MANUAL_ENTRY_PAYROLL_NAME,
    });
  });
});
