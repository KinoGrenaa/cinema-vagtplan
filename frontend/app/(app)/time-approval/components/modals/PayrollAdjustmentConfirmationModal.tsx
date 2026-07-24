"use client";

import type {
  PayrollPeriodSummary,
  TimeEntry,
} from "../../types";

export type PayrollPeriodInfo =
  PayrollPeriodSummary;

export type PayrollApprovalConflict = {
  code?: string;
  title?: string;
  message?: string;
  originalPayrollPeriod?:
    PayrollPeriodInfo | null;
  adjustmentPayrollPeriod?:
    PayrollPeriodInfo | null;
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
      entry: TimeEntry;
      details:
        PayrollApprovalConflict;
      action: "UNAPPROVE";
    }
  | {
      entry: TimeEntry;
      adminNote: string;
      details:
        PayrollApprovalConflict;
      action: "VOID";
    };

type Props = {
  confirmation:
    PayrollAdjustmentConfirmation | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm:
    () => void | Promise<void>;
};

const dateFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Europe/Copenhagen",
    },
  );

const timeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Copenhagen",
    },
  );

function formatPayrollPeriod(
  period?:
    PayrollPeriodInfo | null,
) {
  if (!period) {
    return "Ikke fastlagt endnu";
  }

  return `${dateFormatter.format(
    new Date(period.startDate),
  )} – ${dateFormatter.format(
    new Date(period.endDate),
  )}`;
}

function getActionContent(
  action:
    PayrollAdjustmentConfirmation["action"],
  loading: boolean,
) {
  if (action === "VOID") {
    return {
      consequence:
        "Registreringen afvises, og de allerede eksporterede timer modregnes som en efterregulering.",
      confirmText: loading
        ? "Afviser..."
        : "Afvis og opret modregning",
      buttonClass:
        "bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600 disabled:bg-red-200 disabled:text-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400 dark:disabled:bg-red-950 dark:disabled:text-red-400",
    };
  }

  if (action === "UNAPPROVE") {
    return {
      consequence:
        "Godkendelsen fjernes, og de allerede eksporterede timer modregnes som en efterregulering.",
      confirmText: loading
        ? "Fjerner godkendelse..."
        : "Fjern godkendelse og opret modregning",
      buttonClass:
        "bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600 disabled:bg-red-200 disabled:text-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400 dark:disabled:bg-red-950 dark:disabled:text-red-400",
    };
  }

  if (action === "EDIT") {
    return {
      consequence:
        "Rettelsen gemmes, og forskellen føres som en efterregulering.",
      confirmText: loading
        ? "Gemmer..."
        : "Gem rettelse som efterregulering",
      buttonClass:
        "bg-blue-700 hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-blue-600 disabled:bg-blue-200 disabled:text-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:disabled:bg-blue-950 dark:disabled:text-blue-400",
    };
  }

  return {
    consequence:
      "Godkendelsen registreres som en efterregulering i en senere lønperiode.",
    confirmText: loading
      ? "Godkender..."
      : "Godkend som efterregulering",
    buttonClass:
      "bg-green-700 hover:bg-green-800 active:bg-green-900 focus-visible:ring-green-600 disabled:bg-green-200 disabled:text-green-700 dark:bg-green-600 dark:hover:bg-green-500 dark:active:bg-green-400 dark:focus-visible:ring-green-400 dark:disabled:bg-green-950 dark:disabled:text-green-400",
  };
}

export default function PayrollAdjustmentConfirmationModal({
  confirmation,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  if (!confirmation) {
    return null;
  }

  const context =
    confirmation.entry
      .payrollExportContext;
  const originalPeriod =
    confirmation.details
      .originalPayrollPeriod ??
    context?.originalPayrollPeriod ??
    null;
  const adjustmentPeriod =
    confirmation.details
      .adjustmentPayrollPeriod ??
    context?.adjustmentPayrollPeriod ??
    null;
  const actionContent =
    getActionContent(
      confirmation.action,
      loading,
    );
  const employeeName =
    `${confirmation.entry.user.firstName} ` +
    confirmation.entry.user.lastName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payroll-adjustment-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl dark:border-amber-800 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl dark:bg-amber-950/60"
          >
            ⚠
          </div>

          <div>
            <h2
              id="payroll-adjustment-title"
              className="text-xl font-bold text-gray-950 dark:text-white"
            >
              Lønperioden er allerede
              eksporteret
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Kontrollér perioderne, før
              du fortsætter. Handlingen
              påvirker en allerede
              eksporteret løn.
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/70 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-gray-600 dark:text-gray-300">
              Medarbejder
            </dt>
            <dd className="mt-1 font-medium text-gray-950 dark:text-white">
              {employeeName}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-600 dark:text-gray-300">
              Registrering
            </dt>
            <dd className="mt-1 font-medium text-gray-950 dark:text-white">
              {timeFormatter.format(
                new Date(
                  confirmation.entry
                    .clockIn,
                ),
              )}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-600 dark:text-gray-300">
              Oprindelig lønperiode
            </dt>
            <dd className="mt-1 font-medium text-gray-950 dark:text-white">
              {formatPayrollPeriod(
                originalPeriod,
              )}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-600 dark:text-gray-300">
              Efterreguleres i
            </dt>
            <dd className="mt-1 font-medium text-gray-950 dark:text-white">
              {formatPayrollPeriod(
                adjustmentPeriod,
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
          {actionContent.consequence}
        </div>

        {context
          ?.hasPendingAdjustment && (
          <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
            Der findes allerede en
            ventende efterregulering på
            registreringen.
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>

          <button
            type="button"
            onClick={() =>
              void onConfirm()
            }
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed dark:focus-visible:ring-offset-gray-900 ${actionContent.buttonClass}`}
          >
            {actionContent.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
