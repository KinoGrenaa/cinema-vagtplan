import { BadRequestException } from '@nestjs/common';
import {
  normalizeDashboardWarningDecisionBody,
  normalizeDashboardWarningRange,
} from './cinema-dashboard-warning-input';

describe('cinema dashboard warning input', () => {
  it('normalizes an ignored unassigned shift warning', () => {
    expect(
      normalizeDashboardWarningDecisionBody({
        warningKey: 'UNASSIGNED_SHIFT:42:2026-09-04',
        warningType: 'UNASSIGNED_SHIFT',
        localDate: '2026-09-04',
        action: 'IGNORED',
        note: '  Bevidst ubemandet  ',
      }),
    ).toEqual({
      warningKey: 'UNASSIGNED_SHIFT:42:2026-09-04',
      warningType: 'UNASSIGNED_SHIFT',
      localDate: '2026-09-04',
      action: 'IGNORED',
      note: 'Bevidst ubemandet',
    });
  });

  it('accepts a current load-warning key', () => {
    expect(
      normalizeDashboardWarningDecisionBody({
        warningKey: 'STAFFING_LOAD:2026-09-04:v3',
        warningType: 'STAFFING_LOAD',
        localDate: '2026-09-04',
        action: 'REOPENED',
      }),
    ).toMatchObject({
      warningKey: 'STAFFING_LOAD:2026-09-04:v3',
      note: null,
    });
  });

  it.each([
    { warningKey: 'UNASSIGNED_SHIFT:0', warningType: 'UNASSIGNED_SHIFT', localDate: '2026-09-04', action: 'IGNORED' },
    { warningKey: 'UNASSIGNED_SHIFT:42:2026-09-05', warningType: 'UNASSIGNED_SHIFT', localDate: '2026-09-04', action: 'IGNORED' },
    { warningKey: 'STAFFING_LOAD:2026-09-05:v1', warningType: 'STAFFING_LOAD', localDate: '2026-09-04', action: 'IGNORED' },
    { warningKey: 'UNKNOWN:1', warningType: 'UNKNOWN', localDate: '2026-09-04', action: 'IGNORED' },
    { warningKey: 'UNASSIGNED_SHIFT:1', warningType: 'UNASSIGNED_SHIFT', localDate: '2026-02-30', action: 'IGNORED' },
  ])('rejects invalid decision %p', (body) => {
    expect(() => normalizeDashboardWarningDecisionBody(body)).toThrow(
      BadRequestException,
    );
  });

  it('accepts at most 30 calendar days', () => {
    expect(
      normalizeDashboardWarningRange('2026-09-01', '2026-09-30'),
    ).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(() =>
      normalizeDashboardWarningRange('2026-09-01', '2026-10-01'),
    ).toThrow(BadRequestException);
  });
});
