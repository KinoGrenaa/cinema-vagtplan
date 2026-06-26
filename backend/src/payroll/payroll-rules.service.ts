import { Injectable } from '@nestjs/common';

import { calculatePayrollSegments } from './helpers/payroll-segment-calculator';
import type { PayrollSegment } from './helpers/payroll-rule-types';

export type { EmploymentType, PayrollSegment } from './helpers/payroll-rule-types';

@Injectable()
export class PayrollRulesService {
  calculateSegments(timeEntry: any): PayrollSegment[] {
    return calculatePayrollSegments(timeEntry);
  }
}
