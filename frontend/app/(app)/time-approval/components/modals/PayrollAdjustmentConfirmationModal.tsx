import type { TimeEntry } from "../../types";
import {
  formatDateTime,
} from "../../utils";

export type PayrollPeriodInfo = {
  id: number;
  startDate: string;
  endDate: string;
};

export type PayrollApprovalConflict = {
  code?: string;
  title?: string;
  message?: string;
  originalPayrollPeriod?:
    | PayrollPeriodInfo
    | null;
  adjustmentPayrollPeriod?:
    | PayrollPeriodInfo
    | null;
};

export type PayrollAdjustmentEditData = {
  clockIn: string;
  clockOut?: string | null;
  adminNote: string;
};

export type PayrollAdjustmentConfirmation =
  | {
      entry: TimeEntry;
      details:
        PayrollApprovalConflict;
      action: "APPROVE";
    }
  | {
      entry: TimeEntry;
      details:
        PayrollApprovalConflict;
      action: "EDIT";
      editData:
        PayrollAdjustmentEditData;
    }
  | {
      entryId: number;
      details:
        PayrollApprovalConflict;
      action: "UNAPPROVE";
    }
  | {
      entryId: number;
      adminNote: string;
      details:
        PayrollApprovalConflict;
      action: "VOID";
    };

type PayrollAdjustmentConfirmationModalProps =
  {
    confirmation:
      | PayrollAdjustmentConfirmation
      | null;
    loading: boolean;
    onCancel: () => void;
    onConfirm: () =>
      | void
      | Promise<void>;
  };

function formatPayrollPeriod(
  period?:
    | PayrollPeriodInfo
    | null,
) {
  if (!period) return "-";

  return `${formatDateTime(
    period.startDate,
  )} – ${formatDateTime(
    period.endDate,
  )}`;
}

export default function PayrollAdjustmentConfirmationModal({
  confirmation,
  loading,
  onCancel,
  onConfirm,
}: PayrollAdjustmentConfirmationModalProps) {
  if (!confirmation) {
    return null;
  }

  const isEdit =
    confirmation.action === "EDIT";
  const isUnapprove =
    confirmation.action ===
    "UNAPPROVE";
  const isVoid =
    confirmation.action === "VOID";

  const description = isVoid
    ? "Denne godkendte tidsregistrering er allerede med i en eksporteret lønperiode."
    : isUnapprove
      ? "Denne tidsregistrering er allerede med i en eksporteret lønperiode."
      : isEdit
        ? "Denne tidsregistrering er allerede med i en eksporteret lønperiode."
        : "Denne tidsregistrering tilhører en lønperiode, der allerede er eksporteret.";

  const consequence = isVoid
    ? "Hvis du fortsætter, afvises registreringen, og de eksporterede timer modregnes som en efterregulering."
    : isUnapprove
      ? "Hvis du fortsætter, fjernes godkendelsen, og de eksporterede timer modregnes som en efterregulering."
      : isEdit
        ? "Hvis du fortsætter, gemmes rettelsen og oprettes som en efterregulering."
        : "Hvis du fortsætter, bliver registreringen markeret som efterregulering.";

  const confirmText = loading
    ? isVoid
      ? "Afviser..."
      : isUnapprove
        ? "Fjerner godkendelse..."
        : isEdit
          ? "Gemmer..."
          : "Godkender..."
    : isVoid
      ? "Afvis og opret modregning"
      : isUnapprove
        ? "Fjern godkendelse og opret modregning"
        : isEdit
          ? "Gem rettelse som efterregulering"
          : "Godkend som efterregulering";

  const destructive =
    isUnapprove || isVoid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
        <h2 className="text-xl font-semibold text-gray-950 dark:text-white">
          Lønperioden er allerede
          eksporteret
        </h2>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>

        <div className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Oprindelig lønperiode
            </p>

            <p className="mt-1 text-sm font-medium text-gray-950 dark:text-white">
              {formatPayrollPeriod(
                confirmation.details
                  .originalPayrollPeriod,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Efterreguleres i
              lønperioden
            </p>

            <p className="mt-1 text-sm font-medium text-gray-950 dark:text-white">
              {formatPayrollPeriod(
                confirmation.details
                  .adjustmentPayrollPeriod,
              )}
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
          {consequence}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          >
            Annuller
          </button>

          <button
            type="button"
            onClick={() =>
              void onConfirm()
            }
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed dark:focus-visible:ring-offset-gray-900 ${
              destructive
                ? "bg-red-700 hover:bg-red-800 focus-visible:ring-red-600 disabled:bg-red-200 disabled:text-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:disabled:bg-red-950 dark:disabled:text-red-400"
                : "bg-green-700 hover:bg-green-800 focus-visible:ring-green-600 disabled:bg-green-200 disabled:text-green-700 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400 dark:disabled:bg-green-950 dark:disabled:text-green-400"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
