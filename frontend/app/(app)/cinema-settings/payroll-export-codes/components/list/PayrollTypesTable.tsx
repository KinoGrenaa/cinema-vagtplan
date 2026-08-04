import type { PayrollType } from "../../helpers/core/payrollTypeTypes";

type PayrollTypesTableProps = {
  payrollTypes: PayrollType[];
  loading: boolean;
  onToggleActive: (payrollType: PayrollType) => void;
  onSetDefault: (payrollType: PayrollType) => void;
  onRemovePayrollType: (id: number) => void;
};

export function PayrollTypesTable({
  payrollTypes,
  loading,
  onToggleActive,
  onSetDefault,
  onRemovePayrollType,
}: PayrollTypesTableProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Eksportkoder</h2>
        <div className="text-sm text-gray-500">
          {payrollTypes.length} eksportkoder
        </div>
      </div>
      {loading ? (
        <div>Indlæser...</div>
      ) : payrollTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
          Ingen eksportkoder oprettet endnu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b">
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
              {payrollTypes.map((payrollType) => (
                <tr key={payrollType.id} className="border-b">
                  <td className="p-3">
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{
                        backgroundColor: payrollType.color || "#2563eb",
                      }}
                    />
                  </td>
                  <td className="p-3 font-semibold">
                    <div className="flex items-center gap-2">
                      {payrollType.name}
                      {payrollType.isDefault && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          STANDARD
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{payrollType.payrollCode}</td>
                  <td className="p-3">{payrollType.exportCode || "-"}</td>
                  <td className="p-3">
                    {payrollType.description || "-"}
                  </td>
                  <td className="p-3">
                    {payrollType.isActive ? (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        Aktiv
                      </span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                        Inaktiv
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onToggleActive(payrollType)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${payrollType.isActive ? "bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600" : "bg-green-700 hover:bg-green-800 active:bg-green-900 focus-visible:ring-green-600"}`}
                      >
                        {payrollType.isActive ? "Deaktiver" : "Aktiver"}
                      </button>
                      {!payrollType.isDefault && (
                        <button
                          onClick={() => onSetDefault(payrollType)}
                          className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                          Sæt som standard
                        </button>
                      )}
                      <button
                        onClick={() => onRemovePayrollType(payrollType.id)}
                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                      >
                        Slet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
