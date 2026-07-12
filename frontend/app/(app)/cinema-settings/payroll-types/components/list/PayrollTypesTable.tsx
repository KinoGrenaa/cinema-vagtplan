import type { PayrollType } from "../../helpers/payrollTypeTypes";

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
        <h2 className="text-2xl font-bold">Lønarter</h2>
        <div className="text-sm text-gray-500">
          {payrollTypes.length} lønarter
        </div>
      </div>
      {loading ? (
        <div>Indlæser...</div>
      ) : payrollTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
          Ingen lønarter oprettet endnu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Farve</th>
                <th className="p-3">Navn</th>
                <th className="p-3">Lønkode</th>
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
                        className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
                      >
                        {payrollType.isActive ? "Deaktiver" : "Aktiver"}
                      </button>
                      {!payrollType.isDefault && (
                        <button
                          onClick={() => onSetDefault(payrollType)}
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Sæt som standard
                        </button>
                      )}
                      <button
                        onClick={() => onRemovePayrollType(payrollType.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
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
