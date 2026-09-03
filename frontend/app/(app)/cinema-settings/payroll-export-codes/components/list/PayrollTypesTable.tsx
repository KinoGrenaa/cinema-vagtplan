import { useEffect, useState } from "react";

import type { PayrollType } from "../../helpers/core/payrollTypeTypes";
import {
  isManualEntryPayrollType,
} from "../../helpers/core/payrollTypeSystem";

type PayrollTypesTableProps = {
  payrollTypes: PayrollType[];
  loading: boolean;
  onToggleActive: (payrollType: PayrollType) => void;
  onSetDefault: (payrollType: PayrollType) => void;
  onUpdateSystemExportCode: (
    payrollType: PayrollType,
    exportCode: string,
  ) => Promise<void>;
  onRemovePayrollType: (id: number) => void;
};

export function PayrollTypesTable({
  payrollTypes,
  loading,
  onToggleActive,
  onSetDefault,
  onUpdateSystemExportCode,
  onRemovePayrollType,
}: PayrollTypesTableProps) {
  const [systemExportCodes, setSystemExportCodes] =
    useState<Record<number, string>>({});

  useEffect(() => {
    setSystemExportCodes(
      Object.fromEntries(
        payrollTypes
          .filter(isManualEntryPayrollType)
          .map((payrollType) => [
            payrollType.id,
            payrollType.exportCode ?? "",
          ]),
      ),
    );
  }, [payrollTypes]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Eksportkoder
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {payrollTypes.length} eksportkoder
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">
          Indlæser...
        </div>
      ) : payrollTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Ingen eksportkoder oprettet endnu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm text-gray-900 dark:text-gray-100">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                <th className="p-3">Farve</th>
                <th className="p-3">Navn</th>
                <th className="p-3">Intern kode</th>
                <th className="p-3">Eksportkode</th>
                <th className="p-3">Beskrivelse</th>
                <th className="p-3">Status</th>
                <th className="p-3">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {payrollTypes.map((payrollType) => {
                const isSystemType =
                  isManualEntryPayrollType(
                    payrollType,
                  );

                return (
                  <tr
                    key={payrollType.id}
                    className="border-b border-gray-200 last:border-0 dark:border-gray-800"
                  >
                    <td className="p-3">
                      <div
                        className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{
                          backgroundColor:
                            payrollType.color || "#2563eb",
                        }}
                      />
                    </td>
                    <td className="p-3 font-semibold">
                      <div className="flex flex-wrap items-center gap-2">
                        {payrollType.name}
                        {isSystemType && (
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            SYSTEM
                          </span>
                        )}
                        {payrollType.isDefault && (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-300">
                            STANDARD
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {payrollType.payrollCode}
                    </td>
                    <td className="p-3">
                      {isSystemType ? (
                        <div className="min-w-44 space-y-1">
                          <input
                            type="text"
                            value={
                              systemExportCodes[
                                payrollType.id
                              ] ?? ""
                            }
                            onChange={(event) =>
                              setSystemExportCodes(
                                (current) => ({
                                  ...current,
                                  [payrollType.id]:
                                    event.target.value,
                                }),
                              )
                            }
                            placeholder="Ikke angivet"
                            aria-label="Eksportkode til manuel registrering"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
                          />
                        </div>
                      ) : (
                        payrollType.exportCode || "-"
                      )}
                    </td>
                    <td className="p-3">
                      {payrollType.description || "-"}
                    </td>
                    <td className="p-3">
                      {payrollType.isActive ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-300">
                          Aktiv
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                          Inaktiv
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isSystemType ? (
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdateSystemExportCode(
                              payrollType,
                              systemExportCodes[
                                payrollType.id
                              ] ?? "",
                            )
                          }
                          className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                        >
                          Gem eksportkode
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              onToggleActive(
                                payrollType,
                              )
                            }
                            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                              payrollType.isActive
                                ? "bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600 dark:bg-red-700 dark:hover:bg-red-600"
                                : "bg-green-700 hover:bg-green-800 active:bg-green-900 focus-visible:ring-green-600 dark:bg-green-700 dark:hover:bg-green-600"
                            }`}
                          >
                            {payrollType.isActive
                              ? "Deaktiver"
                              : "Aktiver"}
                          </button>
                          {!payrollType.isDefault && (
                            <button
                              onClick={() =>
                                onSetDefault(
                                  payrollType,
                                )
                              }
                              className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                            >
                              Sæt som standard
                            </button>
                          )}
                          <button
                            onClick={() =>
                              onRemovePayrollType(
                                payrollType.id,
                              )
                            }
                            className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900"
                          >
                            Slet
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
