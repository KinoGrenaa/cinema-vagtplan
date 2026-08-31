import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import { FormEvent, useState } from "react";

import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import EmployeePickerModal from "@/app/components/employees/EmployeePickerModal";
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
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const selectedEmployee =
    employeeOptions.find((employee) => String(employee.id) === selectedUserId) ??
    null;

  function handleClose() {
    setEmployeePickerOpen(false);
    onClose();
  }

  return (
    <BaseModal
      open={open}
      onClose={handleClose}
      title={canCreateForEmployees ? "Opret fravær" : "Ansøg om fravær"}
    >
      <form
        onSubmit={onSubmit}
        className="space-y-4 text-gray-900 dark:text-gray-100"
      >
        {canCreateForEmployees && (
          <div>
            <label className={labelClass}>Medarbejder</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
                {selectedEmployee && !loadingEmployeeOptions ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <EmployeeAvatar
                      name={selectedEmployee.label}
                      profileImage={selectedEmployee.profileImage}
                      className="!h-8 !w-8 !text-xs"
                    />
                    <span className="min-w-0 truncate font-semibold">
                      {selectedEmployee.label}
                    </span>
                  </div>
                ) : (
                  <span className="block truncate font-semibold">
                    {loadingEmployeeOptions
                      ? "Henter medarbejdere..."
                      : employeeOptions.length === 0
                        ? "Ingen aktive medarbejdere fundet"
                        : "Ingen medarbejder valgt"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEmployeePickerOpen(true)}
                disabled={loadingEmployeeOptions || employeeOptions.length === 0}
                className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950"
              >
                {selectedEmployee ? "Skift" : "Vælg medarbejder"}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Hvis fraværet oprettes for en anden medarbejder, kan det ses og
              behandles under Fraværsgodkendelse.
            </p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Fra dato</label>
            <ProjectDatePicker
              value={startDate}
              min={minDate}
              onChange={onSetStartDate}
              ariaLabel={"Vælg fra dato"}
            />
          </div>
          <div>
            <label className={labelClass}>Til dato</label>
            <ProjectDatePicker
              value={endDate}
              min={minDate}
              onChange={onSetEndDate}
              ariaLabel={"Vælg til dato"}
            />
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
            onClick={handleClose}
            className={`rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 ${focusClass}`}
          >
            Annullér
          </button>
          <button
            type="submit"
            disabled={canCreateForEmployees && !selectedUserId}
            className={`rounded-xl bg-gray-950 px-4 py-2 font-semibold text-white transition hover:bg-gray-800 focus-visible:ring-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus-visible:ring-gray-300 ${focusClass}`}
          >
            {canCreateForEmployees ? "Opret fravær" : "Send ansøgning"}
          </button>
        </div>
      </form>
      <EmployeePickerModal
        open={open && employeePickerOpen}
        title="Vælg medarbejder"
        description="Vælg den medarbejder, fraværet skal oprettes for."
        options={employeeOptions.map((employee) => ({
          id: employee.id,
          name: employee.label,
          profileImage: employee.profileImage ?? null,
        }))}
        selectedEmployeeId={selectedEmployee?.id ?? null}
        confirmLabel="Vælg medarbejder"
        emptyText="Ingen aktive medarbejdere fundet."
        onClose={() => setEmployeePickerOpen(false)}
        onConfirm={(employeeId) => {
          onSetSelectedUserId(String(employeeId));
        }}
      />
    </BaseModal>
  );
}
