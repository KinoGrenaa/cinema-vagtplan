import BaseModal from "@/app/components/modals/BaseModal";
import { getPeriodText } from "../helpers/leaveRequestHelpers";
import type { LeaveRequest } from "../helpers/leaveRequestTypes";

type LeaveRequestsCancelModalProps = {
  requestToCancel: LeaveRequest | null;
  onClose: () => void;
  onConfirm: (requestId: number) => void | Promise<void>;
};

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
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Du er ved at annullere denne fraværsansøgning:
          </p>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="font-semibold">{getPeriodText(requestToCancel)}</div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Årsag: {requestToCancel.reason || "-"}
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Er du sikker?
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Fortryd
            </button>

            <button
              type="button"
              onClick={() => onConfirm(requestToCancel.id)}
              className="rounded-xl bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
            >
              Annullér ansøgning
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
