import { BadRequestException } from '@nestjs/common';
import {
  parseRequiredIntegerInRange,
  parseRequiredPositiveInteger,
} from '../../common/query-validation';
import type { UpdateCinemaSettingsData } from './cinema-settings-flow';

const BOOLEAN_FIELDS = [
  'allowShiftTradePool',
  'allowShiftTradeDirect',
  'aiEnabled',
  'requireNoteForClockInDeviation',
  'requireNoteForClockOutDeviation',
  'requireNoteForManualEntry',
  'payrollOvertimeEnabled',
  'plannedOvertimeEnabled',
  'dailyOvertimeEnabled',
  'weeklyOvertimeEnabled',
] as const;

const PAYROLL_PERIOD_MODELS = new Set([
  'CALENDAR_MONTH',
  'FIXED_DAY_TO_DAY',
  'BIWEEKLY',
]);

const PAYROLL_PAYOUT_RULES = new Set([
  'LAST_WEEKDAY_OF_MONTH',
  'FIXED_DAY_OF_MONTH',
]);

type UnknownRecord = Record<string, unknown>;

function requireObject(
  value: unknown,
  message: string,
): UnknownRecord {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new BadRequestException(message);
  }

  return value as UnknownRecord;
}

function normalizeOptionalName(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Biografnavn skal være tekst');
  }

  const name = value.trim();

  if (!name) {
    throw new BadRequestException('Biografnavn mangler');
  }

  if (name.length > 200) {
    throw new BadRequestException(
      'Biografnavn må højst være 200 tegn',
    );
  }

  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new BadRequestException(
      'Biografnavn indeholder ugyldige tegn',
    );
  }

  return name;
}

function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(
      `${fieldName} skal være true eller false`,
    );
  }

  return value;
}

function normalizeOptionalInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  return parseRequiredIntegerInRange(
    value,
    minimum,
    maximum,
    message,
  );
}

function normalizeOptionalNonNegativeInteger(
  value: unknown,
  maximum: number,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new BadRequestException(
      message,
    );
  }

  return value;
}

function normalizeOptionalThreshold(
  value: unknown,
  maximum: number,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new BadRequestException(message);
  }

  return value;
}

function normalizeOptionalEnum(
  value: unknown,
  allowedValues: ReadonlySet<string>,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string' ||
    !allowedValues.has(value)
  ) {
    throw new BadRequestException(message);
  }

  return value;
}

function normalizeAnchorDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Lønperiodens ankerværdi skal være en gyldig dato',
    );
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new BadRequestException(
      'Lønperiodens ankerværdi skal være en gyldig dato',
    );
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
    throw new BadRequestException(
      'Lønperiodens ankerværdi skal være en gyldig dato',
    );
  }

  return date;
}

export function parseCinemaControllerId(value: unknown) {
  return parseRequiredPositiveInteger(
    value,
    'Ugyldigt biograf-id',
  );
}

export function normalizeCreateCinemaBody(value: unknown) {
  const body = requireObject(
    value,
    'Biografen skal have et gyldigt input',
  );

  return {
    name: normalizeOptionalName(body.name),
  };
}

export function normalizeCinemaSettingsBody(
  value: unknown,
): UpdateCinemaSettingsData {
  const body = requireObject(
    value,
    'Biografindstillingerne skal have et gyldigt input',
  );

  const result: UpdateCinemaSettingsData = {
    name: normalizeOptionalName(body.name),
    logoUrl:
      body.logoUrl === undefined
        ? undefined
        : body.logoUrl === null
          ? null
          : typeof body.logoUrl === 'string'
            ? body.logoUrl
            : (() => {
                throw new BadRequestException(
                  'Logo-adresse skal være tekst eller tom',
                );
              })(),
    leaveRequestMinimumNoticeDays:
      normalizeOptionalNonNegativeInteger(
        body.leaveRequestMinimumNoticeDays,
        3650,
        'Minimum varsel for fravær skal være mellem 0 og 3650 hele kalenderdage',
      ),
    clockInDeviationToleranceMinutes:
      normalizeOptionalInteger(
        body.clockInDeviationToleranceMinutes,
        0,
        1440,
        'Tolerance for indstempling skal være mellem 0 og 1440 minutter',
      ),
    clockOutDeviationToleranceMinutes:
      normalizeOptionalInteger(
        body.clockOutDeviationToleranceMinutes,
        0,
        1440,
        'Tolerance for udstempling skal være mellem 0 og 1440 minutter',
      ),
    automaticTimeRegistrationEnabled:
      normalizeOptionalBoolean(
        body.automaticTimeRegistrationEnabled,
        'automaticTimeRegistrationEnabled',
      ),
    automaticTimeRegistrationMethod:
      normalizeOptionalEnum(
        body.automaticTimeRegistrationMethod,
        new Set([
          'PLANNED_SHIFT',
          'FIXED_MINUTES',
        ]),
        'Metode for automatisk tidsregistrering skal v\u00e6re gyldig',
      ) as UpdateCinemaSettingsData['automaticTimeRegistrationMethod'],
    automaticTimeRegistrationMinutes:
      normalizeOptionalInteger(
        body.automaticTimeRegistrationMinutes,
        0,
        1440,
        'Automatisk arbejdstid skal v\u00e6re mellem 0 og 1440 minutter',
      ),
    dailyOvertimeThreshold: normalizeOptionalThreshold(
      body.dailyOvertimeThreshold,
      24,
      'Daglig overtidsgrænse skal være mellem 0 og 24 timer',
    ),
    weeklyOvertimeThreshold: normalizeOptionalThreshold(
      body.weeklyOvertimeThreshold,
      168,
      'Ugentlig overtidsgrænse skal være mellem 0 og 168 timer',
    ),
    payrollPeriodModel: normalizeOptionalEnum(
      body.payrollPeriodModel,
      PAYROLL_PERIOD_MODELS,
      'Lønperiodemodel skal være gyldig',
    ) as UpdateCinemaSettingsData['payrollPeriodModel'],
    payrollPeriodStartDay: normalizeOptionalInteger(
      body.payrollPeriodStartDay,
      1,
      31,
      'Lønperiodens startdag skal være mellem 1 og 31',
    ),
    payrollPeriodEndDay: normalizeOptionalInteger(
      body.payrollPeriodEndDay,
      1,
      31,
      'Lønperiodens slutdag skal være mellem 1 og 31',
    ),
    payrollPeriodAnchorDate: normalizeAnchorDate(
      body.payrollPeriodAnchorDate,
    ),
    payrollPayoutRule: normalizeOptionalEnum(
      body.payrollPayoutRule,
      PAYROLL_PAYOUT_RULES,
      'Lønudbetalingsregel skal være gyldig',
    ) as UpdateCinemaSettingsData['payrollPayoutRule'],
    payrollPayoutDay: normalizeOptionalInteger(
      body.payrollPayoutDay,
      1,
      31,
      'Lønudbetalingsdag skal være mellem 1 og 31',
    ),
  };

  for (const field of BOOLEAN_FIELDS) {
    result[field] = normalizeOptionalBoolean(
      body[field],
      field,
    ) as never;
  }

  return result;
}
