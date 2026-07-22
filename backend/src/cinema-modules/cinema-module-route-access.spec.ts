import {
  getCinemaModuleForRequestPath,
} from './cinema-module-route-access';

describe('cinema module route access', () => {
  it.each([
    ['/shifts', 'SCHEDULE'],
    [
      '/shifts/123',
      'SCHEDULE',
    ],
    [
      '/movie-showings?date=2026-07-22',
      'SCHEDULE',
    ],
    [
      '/shift-planning-drafts/9',
      'SHIFT_PLANNING',
    ],
    [
      '/schedule-templates/4/days',
      'SHIFT_PLANNING',
    ],
    [
      '/day-periods?includeArchived=true',
      'SHIFT_PLANNING',
    ],
    [
      '/job-functions/7',
      'SHIFT_PLANNING',
    ],
    [
      '/time-entries/me',
      'TIME_TRACKING',
    ],
    [
      '/payroll-types',
      'PAYROLL',
    ],
    [
      '/payroll/export/csv',
      'PAYROLL',
    ],
    [
      '/leave-requests',
      'LEAVE',
    ],
    [
      '/shift-trades/pool-count',
      'SHIFT_TRADES',
    ],
    [
      '/staffing-requests/mine',
      'STAFFING_REQUESTS',
    ],
    [
      '/messages/unread-count',
      'MESSAGES',
    ],
    [
      '/employee-documents/user/7',
      'EMPLOYEE_DOCUMENTS',
    ],
    [
      '/staffing-ai/predict',
      'STAFFING_AI',
    ],
    [
      '/ai-learning/feedback',
      'STAFFING_AI',
    ],
  ])(
    'maps %s to %s',
    (path, expectedModule) => {
      expect(
        getCinemaModuleForRequestPath(
          path,
        ),
      ).toBe(expectedModule);
    },
  );

  it.each([
    '/cinema-modules/1',
    '/cinemas',
    '/notifications',
    '/push-subscriptions',
    '/audit-logs',
    '/auth/login',
    '/payroll-report',
    '/messages-old',
  ])(
    'does not map unrelated route %s',
    (path) => {
      expect(
        getCinemaModuleForRequestPath(
          path,
        ),
      ).toBeNull();
    },
  );
});
