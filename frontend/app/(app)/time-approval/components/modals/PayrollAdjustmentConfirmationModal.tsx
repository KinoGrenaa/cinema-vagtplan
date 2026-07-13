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

export type PayrollAdjustmentEditData = {
  clockIn: string;
  clockOut?: string | null;
  adminNote: string;
};

export type PayrollAdjustmentConfirmation = {
  entry: TimeEntry;
  details: PayrollApprovalConflict;
  action: "APPROVE" | "EDIT";
  editData?: PayrollAdjustmentEditData;
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

  const isEdit = confirmation.action === "EDIT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Lønperioden er allerede eksporteret
        </h2>

        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          {isEdit
            ? "Denne tidsregistrering er allerede med i en eksporteret lønperiode."
            : "Denne tidsregistrering tilhører en lønperiode, der allerede er eksporteret."}
        </p>

        <div className="mt-5 space-y-4 rounded-xl bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <div>
            <div className="font-semibold text-amber-950 dark:text-amber-100">
              Oprindelig lønperiode
            </div>
            <div className="mt-1 text-amber-900 dark:text-amber-200">
              {formatPayrollPeriod(
                confirmation.details.originalPayrollPeriod,
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold text-amber-950 dark:text-amber-100">
              Efterreguleres i lønperioden
            </div>
            <div className="mt-1 text-amber-900 dark:text-amber-200">
              {formatPayrollPeriod(
                confirmation.details.adjustmentPayrollPeriod,
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          {isEdit
            ? "Hvis du fortsætter, gemmes rettelsen og oprettes som en efterregulering."
            : "Hvis du fortsætter, bliver registreringen markeret som efterregulering."}
        </p>

        <div className="mt-6 flex justify-end gap-2">
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
            {loading
              ? isEdit
                ? "Gemmer..."
                : "Godkender..."
              : isEdit
                ? "Gem rettelse som efterregulering"
                : "Godkend som efterregulering"}
          </button>
        </div>
      </div>
    </div>
  );
}
