export type PayrollPeriodModel =
  | "CALENDAR_MONTH"
  | "FIXED_DAY_TO_DAY"
  | "BIWEEKLY";

export type PayrollPayoutRule =
  | "LAST_WEEKDAY_OF_MONTH"
  | "FIXED_DAY_OF_MONTH";

export type AutomaticTimeRegistrationMethod =
  | "PLANNED_SHIFT"
  | "FIXED_MINUTES";

export type Cinema = {
  id: number;
  name: string;
  logoUrl: string | null;
  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;
  leaveRequestMinimumNoticeDays: number;
  aiEnabled: boolean;
  automaticTimeRegistrationEnabled: boolean;
  automaticTimeRegistrationMethod: AutomaticTimeRegistrationMethod;
  automaticTimeRegistrationMinutes: number;
  automaticTimeRegistrationActiveFrom: string | null;
  automaticTimeRegistrationMethodValidFrom: string | null;
  clockInDeviationToleranceMinutes: number;
  clockOutDeviationToleranceMinutes: number;
  requireNoteForClockInDeviation: boolean;
  requireNoteForClockOutDeviation: boolean;
  requireNoteForManualEntry: boolean;
  payrollOvertimeEnabled: boolean;
  plannedOvertimeEnabled: boolean;
  dailyOvertimeEnabled: boolean;
  weeklyOvertimeEnabled: boolean;
  dailyOvertimeThreshold: number;
  weeklyOvertimeThreshold: number;
  payrollPeriodModel: PayrollPeriodModel;
  payrollPeriodStartDay: number;
  payrollPeriodEndDay: number;
  payrollPeriodAnchorDate: string | null;
  payrollPayoutRule: PayrollPayoutRule;
  payrollPayoutDay: number;
};

export type CinemaSettingsUpdate = Partial<
  Pick<
    Cinema,
    | "allowShiftTradePool"
    | "allowShiftTradeDirect"
    | "leaveRequestMinimumNoticeDays"
    | "aiEnabled"
    | "automaticTimeRegistrationEnabled"
    | "automaticTimeRegistrationMethod"
    | "automaticTimeRegistrationMinutes"
    | "clockInDeviationToleranceMinutes"
    | "clockOutDeviationToleranceMinutes"
    | "requireNoteForClockInDeviation"
    | "requireNoteForClockOutDeviation"
    | "requireNoteForManualEntry"
    | "payrollOvertimeEnabled"
    | "plannedOvertimeEnabled"
    | "dailyOvertimeEnabled"
    | "weeklyOvertimeEnabled"
    | "dailyOvertimeThreshold"
    | "weeklyOvertimeThreshold"
    | "payrollPeriodModel"
    | "payrollPeriodStartDay"
    | "payrollPeriodEndDay"
    | "payrollPeriodAnchorDate"
    | "payrollPayoutRule"
    | "payrollPayoutDay"
  >
>;

export type CurrentUser = {
  id: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
export const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";
export const MASTER_SELECTED_CINEMA_LOGO_URL_KEY =
  "masterSelectedCinemaLogoUrl";

export const CINEMA_DEFAULTS = {
  allowShiftTradePool: false,
  allowShiftTradeDirect: false,
  leaveRequestMinimumNoticeDays: 1,
  aiEnabled: false,
  automaticTimeRegistrationEnabled: false,
  automaticTimeRegistrationMethod:
    "PLANNED_SHIFT" as AutomaticTimeRegistrationMethod,
  automaticTimeRegistrationMinutes: 0,
  automaticTimeRegistrationActiveFrom: null as string | null,
  automaticTimeRegistrationMethodValidFrom: null as string | null,
  clockInDeviationToleranceMinutes: 0,
  clockOutDeviationToleranceMinutes: 0,
  requireNoteForClockInDeviation: true,
  requireNoteForClockOutDeviation: true,
  requireNoteForManualEntry: true,
  payrollOvertimeEnabled: false,
  plannedOvertimeEnabled: true,
  dailyOvertimeEnabled: false,
  weeklyOvertimeEnabled: false,
  dailyOvertimeThreshold: 8,
  weeklyOvertimeThreshold: 37,
  payrollPeriodModel: "CALENDAR_MONTH" as PayrollPeriodModel,
  payrollPeriodStartDay: 1,
  payrollPeriodEndDay: 31,
  payrollPeriodAnchorDate: null as string | null,
  payrollPayoutRule: "LAST_WEEKDAY_OF_MONTH" as PayrollPayoutRule,
  payrollPayoutDay: 0,
};

const PAYROLL_PERIOD_MODELS = new Set<PayrollPeriodModel>([
  "CALENDAR_MONTH",
  "FIXED_DAY_TO_DAY",
  "BIWEEKLY",
]);

const PAYROLL_PAYOUT_RULES = new Set<PayrollPayoutRule>([
  "LAST_WEEKDAY_OF_MONTH",
  "FIXED_DAY_OF_MONTH",
]);

const AUTOMATIC_TIME_REGISTRATION_METHODS =
  new Set<AutomaticTimeRegistrationMethod>([
    "PLANNED_SHIFT",
    "FIXED_MINUTES",
  ]);

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const numericValue =
    typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, numericValue));
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return Math.round(
    normalizeNumber(value, fallback, minimum, maximum),
  );
}

function normalizeAnchorDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const dateValue = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  if (!match) {
    return null;
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
    return null;
  }

  return dateValue;
}

function isPayrollPeriodModel(value: unknown): value is PayrollPeriodModel {
  return (
    typeof value === "string" &&
    PAYROLL_PERIOD_MODELS.has(value as PayrollPeriodModel)
  );
}

function isPayrollPayoutRule(value: unknown): value is PayrollPayoutRule {
  return (
    typeof value === "string" &&
    PAYROLL_PAYOUT_RULES.has(value as PayrollPayoutRule)
  );
}

export function normalizeCinemaSettings(value: unknown): Cinema {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Cinema>)
      : {};

  const payrollPeriodModel = isPayrollPeriodModel(
    source.payrollPeriodModel,
  )
    ? source.payrollPeriodModel
    : CINEMA_DEFAULTS.payrollPeriodModel;

  const payrollPayoutRule = isPayrollPayoutRule(
    source.payrollPayoutRule,
  )
    ? source.payrollPayoutRule
    : CINEMA_DEFAULTS.payrollPayoutRule;

  return {
    id: normalizeInteger(source.id, 0, 0, Number.MAX_SAFE_INTEGER),
    name: typeof source.name === "string" ? source.name : "",
    logoUrl:
      typeof source.logoUrl === "string" ? source.logoUrl : null,
    allowShiftTradePool: normalizeBoolean(
      source.allowShiftTradePool,
      CINEMA_DEFAULTS.allowShiftTradePool,
    ),
    allowShiftTradeDirect: normalizeBoolean(
      source.allowShiftTradeDirect,
      CINEMA_DEFAULTS.allowShiftTradeDirect,
    ),
    aiEnabled: normalizeBoolean(
      source.aiEnabled,
      CINEMA_DEFAULTS.aiEnabled,
    ),
    leaveRequestMinimumNoticeDays:
      normalizeInteger(
        source.leaveRequestMinimumNoticeDays,
        CINEMA_DEFAULTS.leaveRequestMinimumNoticeDays,
        0,
        3650,
      ),
    automaticTimeRegistrationEnabled:
      normalizeBoolean(
        source.automaticTimeRegistrationEnabled,
        CINEMA_DEFAULTS.automaticTimeRegistrationEnabled,
      ),
    automaticTimeRegistrationMethod:
      typeof source.automaticTimeRegistrationMethod === "string" &&
      AUTOMATIC_TIME_REGISTRATION_METHODS.has(
        source.automaticTimeRegistrationMethod as AutomaticTimeRegistrationMethod,
      )
        ? source.automaticTimeRegistrationMethod as AutomaticTimeRegistrationMethod
        : CINEMA_DEFAULTS.automaticTimeRegistrationMethod,
    automaticTimeRegistrationMinutes:
      normalizeInteger(
        source.automaticTimeRegistrationMinutes,
        CINEMA_DEFAULTS.automaticTimeRegistrationMinutes,
        0,
        1440,
      ),
    automaticTimeRegistrationActiveFrom:
      typeof source.automaticTimeRegistrationActiveFrom === "string"
        ? source.automaticTimeRegistrationActiveFrom
        : null,
    automaticTimeRegistrationMethodValidFrom:
      typeof source.automaticTimeRegistrationMethodValidFrom === "string"
        ? source.automaticTimeRegistrationMethodValidFrom
        : null,
    clockInDeviationToleranceMinutes: normalizeInteger(
      source.clockInDeviationToleranceMinutes,
      CINEMA_DEFAULTS.clockInDeviationToleranceMinutes,
      0,
      1440,
    ),
    clockOutDeviationToleranceMinutes: normalizeInteger(
      source.clockOutDeviationToleranceMinutes,
      CINEMA_DEFAULTS.clockOutDeviationToleranceMinutes,
      0,
      1440,
    ),
    requireNoteForClockInDeviation: normalizeBoolean(
      source.requireNoteForClockInDeviation,
      CINEMA_DEFAULTS.requireNoteForClockInDeviation,
    ),
    requireNoteForClockOutDeviation: normalizeBoolean(
      source.requireNoteForClockOutDeviation,
      CINEMA_DEFAULTS.requireNoteForClockOutDeviation,
    ),
    requireNoteForManualEntry: normalizeBoolean(
      source.requireNoteForManualEntry,
      CINEMA_DEFAULTS.requireNoteForManualEntry,
    ),
    payrollOvertimeEnabled: normalizeBoolean(
      source.payrollOvertimeEnabled,
      CINEMA_DEFAULTS.payrollOvertimeEnabled,
    ),
    plannedOvertimeEnabled: normalizeBoolean(
      source.plannedOvertimeEnabled,
      CINEMA_DEFAULTS.plannedOvertimeEnabled,
    ),
    dailyOvertimeEnabled: normalizeBoolean(
      source.dailyOvertimeEnabled,
      CINEMA_DEFAULTS.dailyOvertimeEnabled,
    ),
    weeklyOvertimeEnabled: normalizeBoolean(
      source.weeklyOvertimeEnabled,
      CINEMA_DEFAULTS.weeklyOvertimeEnabled,
    ),
    dailyOvertimeThreshold: normalizeNumber(
      source.dailyOvertimeThreshold,
      CINEMA_DEFAULTS.dailyOvertimeThreshold,
      0,
      24,
    ),
    weeklyOvertimeThreshold: normalizeNumber(
      source.weeklyOvertimeThreshold,
      CINEMA_DEFAULTS.weeklyOvertimeThreshold,
      0,
      168,
    ),
    payrollPeriodModel,
    payrollPeriodStartDay: normalizeInteger(
      source.payrollPeriodStartDay,
      CINEMA_DEFAULTS.payrollPeriodStartDay,
      1,
      31,
    ),
    payrollPeriodEndDay: normalizeInteger(
      source.payrollPeriodEndDay,
      CINEMA_DEFAULTS.payrollPeriodEndDay,
      1,
      31,
    ),
    payrollPeriodAnchorDate: normalizeAnchorDate(
      source.payrollPeriodAnchorDate,
    ),
    payrollPayoutRule,
    payrollPayoutDay:
      payrollPayoutRule === "FIXED_DAY_OF_MONTH"
        ? normalizeInteger(source.payrollPayoutDay, 31, 1, 31)
        : 0,
  };
}

export function normalizeCinemaSettingsUpdate(
  value: CinemaSettingsUpdate,
): CinemaSettingsUpdate {
  const result: CinemaSettingsUpdate = {};

  const booleanFields: Array<
    keyof Pick<
      CinemaSettingsUpdate,
      | "allowShiftTradePool"
      | "allowShiftTradeDirect"
      | "aiEnabled"
      | "automaticTimeRegistrationEnabled"
        | "requireNoteForClockInDeviation"
      | "requireNoteForClockOutDeviation"
      | "requireNoteForManualEntry"
      | "payrollOvertimeEnabled"
      | "plannedOvertimeEnabled"
      | "dailyOvertimeEnabled"
      | "weeklyOvertimeEnabled"
    >
  > = [
    "allowShiftTradePool",
    "allowShiftTradeDirect",
    "aiEnabled",
    "automaticTimeRegistrationEnabled",
    "requireNoteForClockInDeviation",
    "requireNoteForClockOutDeviation",
    "requireNoteForManualEntry",
    "payrollOvertimeEnabled",
    "plannedOvertimeEnabled",
    "dailyOvertimeEnabled",
    "weeklyOvertimeEnabled",
  ];

  for (const field of booleanFields) {
    if (field in value && typeof value[field] === "boolean") {
      result[field] = value[field] as never;
    }
  }

  if (
    "leaveRequestMinimumNoticeDays" in value
  ) {
    result.leaveRequestMinimumNoticeDays =
      normalizeInteger(
        value.leaveRequestMinimumNoticeDays,
        CINEMA_DEFAULTS.leaveRequestMinimumNoticeDays,
        0,
        3650,
      );
  }

  if (
    "automaticTimeRegistrationMethod" in value &&
    value.automaticTimeRegistrationMethod &&
    AUTOMATIC_TIME_REGISTRATION_METHODS.has(
      value.automaticTimeRegistrationMethod,
    )
  ) {
    result.automaticTimeRegistrationMethod =
      value.automaticTimeRegistrationMethod;
  }

  if ("automaticTimeRegistrationMinutes" in value) {
    result.automaticTimeRegistrationMinutes =
      normalizeInteger(
        value.automaticTimeRegistrationMinutes,
        CINEMA_DEFAULTS.automaticTimeRegistrationMinutes,
        0,
        1440,
      );
  }

  if ("clockInDeviationToleranceMinutes" in value) {
    result.clockInDeviationToleranceMinutes = normalizeInteger(
      value.clockInDeviationToleranceMinutes,
      CINEMA_DEFAULTS.clockInDeviationToleranceMinutes,
      0,
      1440,
    );
  }

  if ("clockOutDeviationToleranceMinutes" in value) {
    result.clockOutDeviationToleranceMinutes = normalizeInteger(
      value.clockOutDeviationToleranceMinutes,
      CINEMA_DEFAULTS.clockOutDeviationToleranceMinutes,
      0,
      1440,
    );
  }

  if ("dailyOvertimeThreshold" in value) {
    result.dailyOvertimeThreshold = normalizeNumber(
      value.dailyOvertimeThreshold,
      CINEMA_DEFAULTS.dailyOvertimeThreshold,
      0,
      24,
    );
  }

  if ("weeklyOvertimeThreshold" in value) {
    result.weeklyOvertimeThreshold = normalizeNumber(
      value.weeklyOvertimeThreshold,
      CINEMA_DEFAULTS.weeklyOvertimeThreshold,
      0,
      168,
    );
  }

  if (
    "payrollPeriodModel" in value &&
    isPayrollPeriodModel(value.payrollPeriodModel)
  ) {
    result.payrollPeriodModel = value.payrollPeriodModel;
  }

  if ("payrollPeriodStartDay" in value) {
    result.payrollPeriodStartDay = normalizeInteger(
      value.payrollPeriodStartDay,
      CINEMA_DEFAULTS.payrollPeriodStartDay,
      1,
      31,
    );
  }

  if ("payrollPeriodEndDay" in value) {
    result.payrollPeriodEndDay = normalizeInteger(
      value.payrollPeriodEndDay,
      CINEMA_DEFAULTS.payrollPeriodEndDay,
      1,
      31,
    );
  }

  if ("payrollPeriodAnchorDate" in value) {
    result.payrollPeriodAnchorDate = normalizeAnchorDate(
      value.payrollPeriodAnchorDate,
    );
  }

  if (
    "payrollPayoutRule" in value &&
    isPayrollPayoutRule(value.payrollPayoutRule)
  ) {
    result.payrollPayoutRule = value.payrollPayoutRule;
  }

  if ("payrollPayoutDay" in value) {
    result.payrollPayoutDay = normalizeInteger(
      value.payrollPayoutDay,
      31,
      1,
      31,
    );
  }

  return result;
}
