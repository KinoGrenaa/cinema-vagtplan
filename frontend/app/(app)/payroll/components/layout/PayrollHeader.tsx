"use client";

import { useState } from "react";

import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import EmployeePickerModal from "@/app/components/employees/EmployeePickerModal";
import { formatDateDK } from "@/app/utils/dateTime";

import { describePayrollModel } from "../../utils";

type PayrollHeaderUser = {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImage?: string | null;
};

function getPayrollUserName(user: PayrollHeaderUser) {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return fullName || user.email || `Medarbejder #${user.id}`;
}

type PayrollHeaderProps = {
  adjustmentCount: number;
  cinemaSettings: Parameters<typeof describePayrollModel>[0];
  endDate: string;
  loading: boolean;
  pendingCount: number;
  showAdvancedFilters: boolean;
  startDate: string;
  userId: string;
  users: PayrollHeaderUser[];
  onApplyCurrentPayrollPeriod: () => void;
  onNextPayrollPeriod: () => void;
  onPreviousPayrollPeriod: () => void;
  onRefreshPayroll: () => void;
  onSetEndDate: (value: string) => void;
  onSetStartDate: (value: string) => void;
  onSetUserId: (value: string) => void;
  onToggleAdvancedFilters: () => void;
};

const secondaryButtonClass =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900";

const primaryButtonClass =
  "rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900";

export default function PayrollHeader({
  adjustmentCount,
  cinemaSettings,
  endDate,
  loading,
  pendingCount,
  showAdvancedFilters,
  startDate,
  userId,
  users,
  onApplyCurrentPayrollPeriod,
  onNextPayrollPeriod,
  onPreviousPayrollPeriod,
  onRefreshPayroll,
  onSetEndDate,
  onSetStartDate,
  onSetUserId,
  onToggleAdvancedFilters,
}: PayrollHeaderProps) {
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);

  const selectedUser =
    users.find((user) => String(user.id) === userId) ?? null;
  const selectedUserName = selectedUser
    ? getPayrollUserName(selectedUser)
    : null;

  const employeeOptions = users
    .map((user) => ({
      id: Number(user.id),
      name: getPayrollUserName(user),
      profileImage: user.profileImage ?? null,
      detail: user.email ?? undefined,
    }))
    .filter((user) => Number.isInteger(user.id) && user.id > 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Løn
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Gennemgå timer, håndter afvigelser og klargør lønperioden til
            eksport.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              {describePayrollModel(cinemaSettings)}
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {pendingCount} afventer godkendelse
              </span>
            )}
            {adjustmentCount > 0 && (
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                {adjustmentCount} efterregulering
                {adjustmentCount === 1 ? "" : "er"}
              </span>
            )}
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40 xl:w-auto xl:min-w-[420px]">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Valgt lønperiode
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatDateDK(startDate)} → {formatDateDK(endDate)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPreviousPayrollPeriod}
              className={secondaryButtonClass}
            >
              Forrige
            </button>
            <button
              type="button"
              onClick={onApplyCurrentPayrollPeriod}
              className={primaryButtonClass}
            >
              Aktuel
            </button>
            <button
              type="button"
              onClick={onNextPayrollPeriod}
              className={secondaryButtonClass}
            >
              Næste
            </button>
            <button
              type="button"
              onClick={onToggleAdvancedFilters}
              className={secondaryButtonClass}
              aria-expanded={showAdvancedFilters}
            >
              {showAdvancedFilters ? "Skjul filter" : "Filter"}
            </button>
          </div>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Avanceret filter
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Brug kun dette, hvis du skal se en anden periode eller én
              medarbejder.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Startdato
              </label>
              <ProjectDatePicker
                value={startDate}
                onChange={onSetStartDate}
                clearable
                ariaLabel={"V\u00e6lg startdato"}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Slutdato
              </label>
              <ProjectDatePicker
                value={endDate}
                onChange={onSetEndDate}
                clearable
                ariaLabel={"V\u00e6lg slutdato"}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Medarbejder
              </label>

              <div className="flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
                  {selectedUser && selectedUserName ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <EmployeeAvatar
                        name={selectedUserName}
                        profileImage={selectedUser.profileImage}
                        className="!h-8 !w-8 !text-xs"
                      />
                      <span className="min-w-0 truncate font-semibold">
                        {selectedUserName}
                      </span>
                    </div>
                  ) : (
                    <span className="truncate font-semibold">
                      Alle medarbejdere
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEmployeePickerOpen(true)}
                  disabled={employeeOptions.length === 0}
                  className={secondaryButtonClass}
                >
                  {selectedUser ? "Skift" : "Vælg"}
                </button>
              </div>

              {selectedUser && (
                <button
                  type="button"
                  onClick={() => onSetUserId("")}
                  className="mt-2 text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300"
                >
                  Vis alle medarbejdere
                </button>
              )}
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onRefreshPayroll}
                disabled={loading}
                className={`w-full ${primaryButtonClass}`}
              >
                {loading ? "Henter..." : "Opdater"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EmployeePickerModal
        open={employeePickerOpen}
        title="Vælg medarbejder"
        description="Vælg den medarbejder, lønrapporten skal filtreres til."
        options={employeeOptions}
        selectedEmployeeId={
          selectedUser ? Number(selectedUser.id) : null
        }
        confirmLabel="Vælg medarbejder"
        emptyText="Ingen medarbejdere kan vælges."
        onClose={() => setEmployeePickerOpen(false)}
        onConfirm={(employeeId) => {
          onSetUserId(String(employeeId));
        }}
      />
    </section>
  );
}
