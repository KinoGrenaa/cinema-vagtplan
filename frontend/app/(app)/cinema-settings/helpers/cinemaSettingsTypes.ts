export type PayrollPeriodModel =
  | "CALENDAR_MONTH"
  | "FIXED_DAY_TO_DAY"
  | "BIWEEKLY";

export type PayrollPayoutRule = "LAST_WEEKDAY_OF_MONTH" | "FIXED_DAY_OF_MONTH";

export type Cinema = {
  id: number;
  name: string;
  logoUrl: string | null;

  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;

  aiEnabled: boolean;

  payrollRulesEnabled: boolean;

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

export type CurrentUser = {
  id: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
export const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";
export const MASTER_SELECTED_CINEMA_LOGO_URL_KEY = "masterSelectedCinemaLogoUrl";

export const CINEMA_DEFAULTS = {
  aiEnabled: false,
  payrollRulesEnabled: false,
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
