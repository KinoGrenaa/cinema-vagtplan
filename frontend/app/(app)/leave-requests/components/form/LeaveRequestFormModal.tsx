import { FormEvent, useRef } from "react";
import { Calendar } from "lucide-react";

import BaseModal from "@/app/components/modals/BaseModal";
import type { LeaveRequestEmployeeOption } from "../../hooks/form/useLeaveRequestEmployeeOptions";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 dark:disabled:bg-gray-900 dark:disabled:text-gray-500";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

type LeaveRequestFormModalProps = {
  allDay: boolean;
  canCreateForEmployees: boolean;
  employeeOptions: LeaveRequestEmployeeOption[];
  endDate: string;
  endTime: string;
  loadingEmployeeOptions: boolean;
  minDate: string;
  open: boolean;
  reason: string;
  selectedUserId: string;
  startDate: string;
  startTime: string;
  onClose: () => void;
  onSetAllDay: (value: boolean) => void;
  onSetEndDate: (value: string) => void;
  onSetEndTime: (value: string) => void;
  onSetReason: (value: string) => void;
  onSetSelectedUserId: (value: string) => void;
  onSetStartDate: (value: string) => void;
  onSetStartTime: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;

  input.focus();
  if (typeof input.showPicker === "function") {
    input.showPicker();
  }
}

export default function LeaveRequestFormModal({
  allDay,
  canCreateForEmployees,
  employeeOptions,
  endDate,
  endTime,
  loadingEmployeeOptions,
  minDate,
  open,
  reason,
  selectedUserId,
  startDate,
  startTime,
  onClose,
  onSetAllDay,
  onSetEndDate,
  onSetEndTime,
  onSetReason,
  onSetSelectedUserId,
  onSetStartDate,
  onSetStartTime,
  onSubmit,
}: LeaveRequestFormModalProps) {
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={canCreateForEmployees ? "Opret fravær" : "Ansøg om fravær"}
    >
      <form
        onSubmit={onSubmit}
        className="space-y-4 text-gray-900 dark:text-gray-100"
      >
        {canCreateForEmployees && (
          <div>
            <label className={labelClass}>Medarbejder</label>
            <select
              className={inputClass}
              value={selectedUserId}
              onChange={(event) => onSetSelectedUserId(event.target.value)}
              disabled={loadingEmployeeOptions || employeeOptions.length === 0}
              required
            >
              {loadingEmployeeOptions ? (
                <option value="">Henter medarbejdere...</option>
              ) : employeeOptions.length === 0 ? (
                <option value="">Ingen aktive medarbejdere fundet</option>
              ) : (
                employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.label}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Hvis fraværet oprettes for en anden medarbejder, kan det ses og
              behandles under Fraværsgodkendelse.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Fra dato</label>
            <div className="relative">
              <input
                ref={startDateInputRef}
                type="date"
                min={minDate}
                className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                value={startDate}
                onChange={(event) => onSetStartDate(event.target.value)}
              />
              <button
                type="button"
                aria-label="Åbn kalender for fra dato"
                onClick={() => openDatePicker(startDateInputRef.current)}
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:focus-visible:ring-blue-400"
              >
                <Calendar size={18} />
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Til dato</label>
            <div className="relative">
              <input
                ref={endDateInputRef}
                type="date"
                min={minDate}
                className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                value={endDate}
                onChange={(event) => onSetEndDate(event.target.value)}
              />
              <button
                type="button"
                aria-label="Åbn kalender for til dato"
                onClick={() => openDatePicker(endDateInputRef.current)}
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:focus-visible:ring-blue-400"
              >
                <Calendar size={18} />
              </button>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(event) => onSetAllDay(event.target.checked)}
            className="h-4 w-4 accent-blue-600 dark:accent-blue-500"
          />
          Hele dagen
        </label>

        {!allDay && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Fra tidspunkt</label>
              <input
                type="time"
                className={inputClass}
                value={startTime}
                onChange={(event) => onSetStartTime(event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Til tidspunkt</label>
              <input
                type="time"
                className={inputClass}
                value={endTime}
                onChange={(event) => onSetEndTime(event.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Årsag</label>
          <input
            className={inputClass}
            value={reason}
            onChange={(event) => onSetReason(event.target.value)}
            placeholder="Valgfrit"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 ${focusClass}`}
          >
            Annullér
          </button>
          <button
            type="submit"
            className={`rounded-xl bg-gray-950 px-4 py-2 font-semibold text-white transition hover:bg-gray-800 focus-visible:ring-gray-600 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus-visible:ring-gray-300 ${focusClass}`}
          >
            {canCreateForEmployees ? "Opret fravær" : "Send ansøgning"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
