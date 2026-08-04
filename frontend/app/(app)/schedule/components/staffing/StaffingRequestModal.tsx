"use client";

import type { FormEvent } from "react";

import BaseModal from "@/app/components/modals/BaseModal";
import type { Shift, User, JobFunction } from "../../../../../../shared/types";

export type StaffingRequestType =
  | "EXTRA_SHIFT"
  | "EMERGENCY"
  | "REPLACEMENT"
  | "OVERTIME";

export type StaffingTargetMode = "ALL" | "USER";

const STAFFING_REQUEST_TYPES: {
  value: StaffingRequestType;
  label: string;
}[] = [
  { value: "EMERGENCY", label: "Akut" },
  { value: "EXTRA_SHIFT", label: "Ekstra vagt" },
  { value: "REPLACEMENT", label: "Erstatning" },
  { value: "OVERTIME", label: "Overarbejde" },
];

const STAFFING_PRIORITIES = [
  { value: 1, label: "Lav" },
  { value: 2, label: "Normal" },
  { value: 3, label: "Høj" },
  { value: 4, label: "Meget høj" },
  { value: 5, label: "Akut" },
];

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

type StaffingRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  shifts: Shift[];
  jobFunctions: JobFunction[];
  staffingTargetUsers: User[];
  selectedShift: Shift | null;
  selectedShiftId: number | null;
  onShiftChange: (shift: Shift | null) => void;
  targetMode: StaffingTargetMode;
  onTargetModeChange: (mode: StaffingTargetMode) => void;
  targetUserId: number;
  onTargetUserIdChange: (userId: number) => void;
  requestType: StaffingRequestType;
  onRequestTypeChange: (type: StaffingRequestType) => void;
  priority: number;
  onPriorityChange: (priority: number) => void;
  message: string;
  onMessageChange: (message: string) => void;
  startTime: string;
  onStartTimeChange: (value: string) => void;
  endTime: string;
  onEndTimeChange: (value: string) => void;
  jobFunctionId: number;
  onJobFunctionIdChange: (value: number) => void;
  getShiftOptionText: (shift: Shift) => string;
  getUserDisplayName: (user: User) => string;
};

export default function StaffingRequestModal({
  open,
  onClose,
  onSubmit,
  shifts,
  jobFunctions,
  staffingTargetUsers,
  selectedShift,
  selectedShiftId,
  onShiftChange,
  targetMode,
  onTargetModeChange,
  targetUserId,
  onTargetUserIdChange,
  requestType,
  onRequestTypeChange,
  priority,
  onPriorityChange,
  message,
  onMessageChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  jobFunctionId,
  onJobFunctionIdChange,
  getShiftOptionText,
  getUserDisplayName,
}: StaffingRequestModalProps) {
  return (
    <BaseModal
      open={open}
      title="Send bemandingsforespørgsel"
      width="xl"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-100">
          Send en forespørgsel fra vagtplanen. Svarene håndteres i
          bemandingsindbakken.
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Vagt eller behov
          </label>
          <select
            value={selectedShiftId ?? ""}
            onChange={(event) => {
              const nextShiftId = event.target.value
                ? Number(event.target.value)
                : null;
              const nextShift = nextShiftId
                ? shifts.find((shift) => shift.id === nextShiftId) ?? null
                : null;
              onShiftChange(nextShift);
            }}
            className={fieldClass}
          >
            <option value="">Intet konkret vagtkort / bemandingsbehov</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {getShiftOptionText(shift)}
              </option>
            ))}
          </select>
        </div>

        {selectedShift ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="font-semibold">Koblet til vagt</div>
            <div className="mt-1 text-gray-700 dark:text-gray-300">
              {getShiftOptionText(selectedShift)}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Fra</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => onStartTimeChange(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Til</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) => onEndTimeChange(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Jobfunktion
              </label>
              <select
                value={jobFunctionId}
                onChange={(event) =>
                  onJobFunctionIdChange(Number(event.target.value))
                }
                className={fieldClass}
              >
                <option value={0}>Vælg jobfunktion</option>
                {jobFunctions.map((jobFunction) => (
                  <option key={jobFunction.id} value={jobFunction.id}>
                    {jobFunction.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">Målgruppe</label>
            <select
              value={targetMode}
              onChange={(event) =>
                onTargetModeChange(event.target.value as StaffingTargetMode)
              }
              className={fieldClass}
            >
              <option value="ALL">Alle medarbejdere</option>
              <option value="USER">Bestemt medarbejder</option>
            </select>
          </div>

          {targetMode === "USER" && (
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Medarbejder
              </label>
              <select
                value={targetUserId}
                onChange={(event) =>
                  onTargetUserIdChange(Number(event.target.value))
                }
                className={fieldClass}
              >
                <option value={0}>Vælg medarbejder</option>
                {staffingTargetUsers.map((targetUser) => (
                  <option key={targetUser.id} value={targetUser.id}>
                    {getUserDisplayName(targetUser)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">Type</label>
            <select
              value={requestType}
              onChange={(event) =>
                onRequestTypeChange(event.target.value as StaffingRequestType)
              }
              className={fieldClass}
            >
              {STAFFING_REQUEST_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Prioritet</label>
            <select
              value={priority}
              onChange={(event) => onPriorityChange(Number(event.target.value))}
              className={fieldClass}
            >
              {STAFFING_PRIORITIES.map((nextPriority) => (
                <option key={nextPriority.value} value={nextPriority.value}>
                  {nextPriority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Besked</label>
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            className="min-h-32 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10"
            placeholder="Skriv hvad medarbejderne skal tage stilling til"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-200 px-5 py-2 font-semibold text-gray-900 transition hover:bg-gray-300 active:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>
          <button
            type="submit"
            className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Send forespørgsel
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
