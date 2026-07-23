import BaseModal from "@/app/components/modals/BaseModal";

import { getPeriodText } from "../../helpers/core/leaveRequestHelpers";
import type { LeaveRequest } from "../../helpers/core/leaveRequestTypes";

type LeaveRequestsCancelModalProps = {
  requestToCancel: LeaveRequest | null;
  onClose: () => void;
  onConfirm: (requestId: number) => void | Promise<void>;
};

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function LeaveRequestsCancelModal({
  requestToCancel,
  onClose,
  onConfirm,
}: LeaveRequestsCancelModalProps) {
  return (
    <BaseModal
      open={Boolean(requestToCancel)}
      onClose={onClose}
      title="Annullér fraværsansøgning"
    >
      {requestToCancel && (
        <div className="space-y-4 text-gray-900 dark:text-gray-100">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Du er ved at annullere denne fraværsansøgning:
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
            <div className="font-semibold text-gray-950 dark:text-white">
              {getPeriodText(requestToCancel)}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Årsag: {requestToCancel.reason || "-"}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Er du sikker?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 ${focusClass}`}
            >
              Fortryd
            </button>
            <button
              type="button"
              onClick={() => onConfirm(requestToCancel.id)}
              className={`rounded-xl bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 ${focusClass}`}
            >
              Annullér ansøgning
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
