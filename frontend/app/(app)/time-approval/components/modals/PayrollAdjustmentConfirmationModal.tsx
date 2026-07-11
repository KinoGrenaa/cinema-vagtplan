import { formatDateTime } from "../../utils";
import type { TimeEntry } from "../../types";

export type PayrollPeriodInfo = {
  id: number;
  startDate: string;
  endDate: string;
};

export type PayrollApprovalConflict = {
  code?: string;
  title?: string;
  message?: string;
  originalPayrollPeriod?: PayrollPeriodInfo | null;
  adjustmentPayrollPeriod?: PayrollPeriodInfo | null;
};

export type PayrollAdjustmentConfirmation = {
  entry: TimeEntry;
  details: PayrollApprovalConflict;
};

type PayrollAdjustmentConfirmationModalProps = {
  confirmation: PayrollAdjustmentConfirmation | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

function formatPayrollPeriod(period?: PayrollPeriodInfo | null) {
  if (!period) return "-";

  return `${formatDateTime(period.startDate)} – ${formatDateTime(
    period.endDate,
  )}`;
}

export default function PayrollAdjustmentConfirmationModal({
  confirmation,
  loading,
  onCancel,
  onConfirm,
}: PayrollAdjustmentConfirmationModalProps) {
  if (!confirmation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-xl font-bold">
          Lønperioden er allerede eksporteret
        </h2>

        <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-200">
          <p>
            Denne tidsregistrering tilhører en lønperiode, der allerede er
            eksporteret.
          </p>

          <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
            <div className="font-semibold">Oprindelig lønperiode</div>
            <div>
              {formatPayrollPeriod(
                confirmation.details.originalPayrollPeriod,
              )}
            </div>
          </div>

          <div className="rounded-xl bg-orange-50 p-3 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
            <div className="font-semibold">
              Efterreguleres i lønperioden
            </div>
            <div>
              {formatPayrollPeriod(
                confirmation.details.adjustmentPayrollPeriod,
              )}
            </div>
          </div>

          <p>
            Hvis du fortsætter, bliver registreringen markeret som
            efterregulering.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Annuller
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Godkender..." : "Godkend som efterregulering"}
          </button>
        </div>
      </div>
    </div>
  );
}
