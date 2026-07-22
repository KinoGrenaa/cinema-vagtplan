import { formatDateDK } from "@/app/utils/dateTime";
import type {
  PayrollAdjustment,
  PayrollEmployee,
} from "../../types";
import { formatDateTime } from "../../utils";

type PayrollAdjustmentEmployee = Pick<
  PayrollEmployee,
  "userId" | "name" | "email"
> & {
  payrollAdjustments: PayrollAdjustment[];
};

type PayrollAdjustmentsSectionProps = {
  employees: PayrollAdjustmentEmployee[];
};

function formatSignedHoursAsTime(
  hoursValue: number,
) {
  const sign = hoursValue >= 0 ? "+" : "-";
  const absoluteMinutes = Math.round(
    Math.abs(hoursValue) * 60,
  );
  const hours = Math.floor(
    absoluteMinutes / 60,
  );
  const minutes = absoluteMinutes % 60;

  return `${sign}${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(2, "0")}`;
}

function formatHoursAsTime(
  hoursValue: number,
) {
  const absoluteMinutes = Math.round(
    Math.abs(hoursValue) * 60,
  );
  const hours = Math.floor(
    absoluteMinutes / 60,
  );
  const minutes = absoluteMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(2, "0")}`;
}

function formatAdjustmentReason(
  reason: string,
) {
  switch (reason) {
    case "EDIT_AFTER_EXPORT":
      return "Rettet efter eksport";
    case "APPROVAL_AFTER_EXPORT":
      return "Godkendt efter eksport";
    case "UNAPPROVAL_AFTER_EXPORT":
      return "Godkendelse fjernet efter eksport";
    case "VOID_AFTER_EXPORT":
      return "Annulleret efter eksport";
    case "MANUAL_ENTRY_IN_EXPORTED_PERIOD":
      return "Manuel registrering i eksporteret periode";
    default:
      return "Efterregulering";
  }
}

function formatOriginalPayrollPeriod(
  adjustment: PayrollAdjustment,
) {
  return `${formatDateDK(
    adjustment.originalPayrollPeriodStartDate,
  )}–${formatDateDK(
    adjustment.originalPayrollPeriodEndDate,
  )}`;
}

export default function PayrollAdjustmentsSection({
  employees,
}: PayrollAdjustmentsSectionProps) {
  if (employees.length === 0) {
    return null;
  }

  const adjustmentCount = employees.reduce(
    (sum, employee) =>
      sum +
      employee.payrollAdjustments.length,
    0,
  );
  const totalAdjustmentHours =
    employees.reduce(
      (employeeSum, employee) =>
        employeeSum +
        employee.payrollAdjustments.reduce(
          (adjustmentSum, adjustment) =>
            adjustmentSum +
            adjustment.hours,
          0,
        ),
      0,
    );

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900/70 dark:bg-gray-900">
      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Efterreguleringer i denne
              lønperiode
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
              Timerne stammer fra
              registreringer, der blev
              godkendt eller rettet efter en
              tidligere lønperiode var
              eksporteret. De medtages i den
              valgte lønkørsel.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
              {adjustmentCount}{" "}
              {adjustmentCount === 1
                ? "efterregulering"
                : "efterreguleringer"}
            </span>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
              Samlet{" "}
              {formatSignedHoursAsTime(
                totalAdjustmentHours,
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {employees.map((employee) => (
          <div
            key={employee.userId}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40"
          >
            <div className="mb-3">
              <div className="font-bold text-gray-900 dark:text-gray-100">
                {employee.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {employee.email}
              </div>
            </div>

            <div className="space-y-3">
              {employee.payrollAdjustments.map(
                (adjustment) => (
                  <div
                    key={adjustment.id}
                    className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Efterregulering{" "}
                          {formatSignedHoursAsTime(
                            adjustment.hours,
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          {formatAdjustmentReason(
                            adjustment.reason,
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Fra{" "}
                          {formatHoursAsTime(
                            adjustment.exportedHours,
                          )}{" "}
                          til{" "}
                          {formatHoursAsTime(
                            adjustment.adjustedHours,
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Oprindelig lønperiode:{" "}
                          {formatOriginalPayrollPeriod(
                            adjustment,
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                        Oprettet:{" "}
                        {formatDateTime(
                          adjustment.createdAt,
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
