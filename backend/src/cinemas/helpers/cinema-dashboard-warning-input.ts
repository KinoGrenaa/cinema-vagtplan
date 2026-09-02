import { BadRequestException } from '@nestjs/common';

export type DashboardWarningTypeInput =
  | 'UNASSIGNED_SHIFT'
  | 'STAFFING_LOAD';

export type DashboardWarningDecisionActionInput =
  | 'IGNORED'
  | 'REOPENED';

export type DashboardWarningDecisionInput = {
  warningKey: string;
  warningType: DashboardWarningTypeInput;
  localDate: string;
  action: DashboardWarningDecisionActionInput;
  note: string | null;
};

type UnknownRecord = Record<string, unknown>;

function requireObject(value: unknown): UnknownRecord {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new BadRequestException(
      'Advarselsbeslutningen skal have et gyldigt input',
    );
  }

  return value as UnknownRecord;
}

export function normalizeDashboardWarningDate(
  value: unknown,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Advarselsdatoen er ugyldig');
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new BadRequestException('Advarselsdatoen er ugyldig');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('Advarselsdatoen er ugyldig');
  }

  return value;
}

function normalizeWarningType(value: unknown): DashboardWarningTypeInput {
  if (value === 'UNASSIGNED_SHIFT' || value === 'STAFFING_LOAD') {
    return value;
  }

  throw new BadRequestException('Advarselstypen er ugyldig');
}

function normalizeAction(value: unknown): DashboardWarningDecisionActionInput {
  if (value === 'IGNORED' || value === 'REOPENED') {
    return value;
  }

  throw new BadRequestException('Advarselshandlingen er ugyldig');
}

function normalizeWarningKey(
  value: unknown,
  warningType: DashboardWarningTypeInput,
) {
  if (typeof value !== 'string' || value.length > 160) {
    throw new BadRequestException('Advarselsnøglen er ugyldig');
  }

  const valid =
    warningType === 'UNASSIGNED_SHIFT'
      ? /^UNASSIGNED_SHIFT:[1-9]\d*:\d{4}-\d{2}-\d{2}$/.test(value)
      : /^STAFFING_LOAD:\d{4}-\d{2}-\d{2}:v[1-9]\d*$/.test(value);

  if (!valid) {
    throw new BadRequestException('Advarselsnøglen er ugyldig');
  }

  return value;
}

function normalizeNote(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Begrundelsen skal være tekst');
  }

  const note = value.trim();

  if (note.length > 500) {
    throw new BadRequestException('Begrundelsen må højst være 500 tegn');
  }

  return note || null;
}

export function normalizeDashboardWarningDecisionBody(
  value: unknown,
): DashboardWarningDecisionInput {
  const body = requireObject(value);
  const warningType = normalizeWarningType(body.warningType);
  const localDate = normalizeDashboardWarningDate(body.localDate);
  const warningKey = normalizeWarningKey(body.warningKey, warningType);
  const action = normalizeAction(body.action);

  if (
    warningType === 'UNASSIGNED_SHIFT' &&
    !warningKey.endsWith(`:${localDate}`)
  ) {
    throw new BadRequestException(
      'Vagtadvarslen matcher ikke den valgte dato',
    );
  }

  if (
    warningType === 'STAFFING_LOAD' &&
    !warningKey.startsWith(`STAFFING_LOAD:${localDate}:`)
  ) {
    throw new BadRequestException(
      'Belastningsadvarslen matcher ikke den valgte dato',
    );
  }

  return {
    warningKey,
    warningType,
    localDate,
    action,
    note: normalizeNote(body.note),
  };
}

export function normalizeDashboardWarningRange(
  startDate: unknown,
  endDate: unknown,
) {
  const start = normalizeDashboardWarningDate(startDate);
  const end = normalizeDashboardWarningDate(endDate);
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);

  if (endMs < startMs) {
    throw new BadRequestException(
      'Slutdato skal være samme dag eller efter startdato',
    );
  }

  const days = Math.floor((endMs - startMs) / 86400000) + 1;

  if (days > 30) {
    throw new BadRequestException('Advarselsperioden må højst være 30 dage');
  }

  return { startDate: start, endDate: end };
}
