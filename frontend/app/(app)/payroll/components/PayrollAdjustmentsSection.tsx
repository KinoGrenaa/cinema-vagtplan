import { formatDateTime } from "../utils";

type PayrollAdjustment = {
  id: number | string;
  hours: number;
  reason: string;
  exportedHours: number;
  adjustedHours: number;
  createdAt?: string | null;
};

type PayrollAdjustmentEmployee = {
  userId: number;
  name: string;
  email: string;
  payrollAdjustments: PayrollAdjustment[];
};

type PayrollAdjustmentsSectionProps = {
  employees: PayrollAdjustmentEmployee[];
};

function formatSignedHoursAsTime(hoursValue: number) {
  const sign = hoursValue >= 0 ? "+" : "-";
  const absoluteMinutes = Math.round(Math.abs(hoursValue) * 60);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

function formatHoursAsTime(hoursValue: number) {
  const absoluteMinutes = Math.round(Math.abs(hoursValue) * 60);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

function formatAdjustmentReason(reason: string) {
  switch (reason) {
    case "EDIT_AFTER_EXPORT":
      return "Rettet efter eksport";
    case "APPROVAL_AFTER_EXPORT":
      return "Godkendt efter eksport";
    case "MANUAL_ENTRY_IN_EXPORTED_PERIOD":
      return "Manuel registrering i eksporteret periode";
    default:
      return "Efterregulering";
  }
}

export default function PayrollAdjustmentsSection({
  employees,
}: PayrollAdjustmentsSectionProps) {
  if (employees.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/60 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Efterreguleringer i denne lønperiode
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Rettelser fra tidligere eller lukkede perioder, som medtages i den
          valgte lønkørsel.
        </p>
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
              {employee.payrollAdjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Efterregulering{" "}
                        {formatSignedHoursAsTime(adjustment.hours)}
                      </div>

                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {formatAdjustmentReason(adjustment.reason)}
                      </div>

                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Fra {formatHoursAsTime(adjustment.exportedHours)} til{" "}
                        {formatHoursAsTime(adjustment.adjustedHours)}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      Oprettet: {formatDateTime(adjustment.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
