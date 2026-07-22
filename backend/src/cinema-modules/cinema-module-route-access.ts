import type {
  CinemaModuleKey,
} from './cinema-module-catalog';

type CinemaModuleRouteRule = {
  prefix: string;
  moduleKey: CinemaModuleKey;
};

export const CINEMA_MODULE_ROUTE_RULES:
  readonly CinemaModuleRouteRule[] = [
  {
    prefix: '/shift-planning-drafts',
    moduleKey: 'SHIFT_PLANNING',
  },
  {
    prefix: '/month-plans',
    moduleKey: 'SHIFT_PLANNING',
  },
  {
    prefix: '/schedule-templates',
    moduleKey: 'SHIFT_PLANNING',
  },
  {
    prefix: '/day-periods',
    moduleKey: 'SHIFT_PLANNING',
  },
  {
    prefix: '/job-functions',
    moduleKey: 'SHIFT_PLANNING',
  },
  {
    prefix: '/staffing-ai',
    moduleKey: 'STAFFING_AI',
  },
  {
    prefix: '/ai-learning',
    moduleKey: 'STAFFING_AI',
  },
  {
    prefix: '/staffing-requests',
    moduleKey: 'STAFFING_REQUESTS',
  },
  {
    prefix: '/employee-documents',
    moduleKey: 'EMPLOYEE_DOCUMENTS',
  },
  {
    prefix: '/time-entries',
    moduleKey: 'TIME_TRACKING',
  },
  {
    prefix: '/payroll-types',
    moduleKey: 'PAYROLL',
  },
  {
    prefix: '/payroll',
    moduleKey: 'PAYROLL',
  },
  {
    prefix: '/leave-requests',
    moduleKey: 'LEAVE',
  },
  {
    prefix: '/shift-trades',
    moduleKey: 'SHIFT_TRADES',
  },
  {
    prefix: '/messages',
    moduleKey: 'MESSAGES',
  },
  {
    prefix: '/movie-showings',
    moduleKey: 'SCHEDULE',
  },
  {
    prefix: '/shifts',
    moduleKey: 'SCHEDULE',
  },
] as const;

function normalizeRequestPath(
  value: unknown,
) {
  if (typeof value !== 'string') {
    return '/';
  }

  const withoutQuery =
    value.split('?')[0] || '/';
  const normalized =
    withoutQuery.startsWith('/')
      ? withoutQuery
      : `/${withoutQuery}`;

  if (
    normalized.length > 1 &&
    normalized.endsWith('/')
  ) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function matchesRoutePrefix(
  path: string,
  prefix: string,
) {
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`)
  );
}

export function getCinemaModuleForRequestPath(
  value: unknown,
) {
  const path =
    normalizeRequestPath(value);

  return (
    CINEMA_MODULE_ROUTE_RULES.find(
      (rule) =>
        matchesRoutePrefix(
          path,
          rule.prefix,
        ),
    )?.moduleKey ?? null
  );
}
