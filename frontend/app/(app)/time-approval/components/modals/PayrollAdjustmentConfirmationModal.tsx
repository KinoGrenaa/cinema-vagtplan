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

export type PayrollAdjustmentConfirmation =
  | {
      entry: TimeEntry;
      details: PayrollApprovalConflict;
      action: "APPROVE";
    }
  | {
      entry: TimeEntry;
      details: PayrollApprovalConflict;
      action: "EDIT";
      editData: PayrollAdjustmentEditData;
    }
  | {
      entryId: number;
      details: PayrollApprovalConflict;
      action: "UNAPPROVE";
    }
  | {
      entryId: number;
      adminNote: string;
      details: PayrollApprovalConflict;
      action: "VOID";
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
  const isUnapprove = confirmation.action === "UNAPPROVE";
  const isVoid = confirmation.action === "VOID";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">
          Lønperioden er allerede eksporteret
        </h2>

        <p className="mt-3 text-sm text-slate-600">{description}</p>

        <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Oprindelig lønperiode
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatPayrollPeriod(
                confirmation.details.originalPayrollPeriod,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Efterreguleres i lønperioden
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatPayrollPeriod(
                confirmation.details.adjustmentPayrollPeriod,
              )}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-700">{consequence}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={
              isUnapprove || isVoid
                ? "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                : "rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
