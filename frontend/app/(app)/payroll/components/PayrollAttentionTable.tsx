import { formatHours } from "../utils";

type PayrollAttentionEmployee = {
  name: string;
  totalHours: number;
  overtime: number;
  weekend: number;
  night: number;
};

type PayrollAttentionTableProps = {
  overtimeWarnings: PayrollAttentionEmployee[];
};

export default function PayrollAttentionTable({
  overtimeWarnings,
}: PayrollAttentionTableProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-gray-900">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-red-600">
            Registreringer der kræver opmærksomhed
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Medarbejdere med høj belastning eller overtid.
          </p>
        </div>
      </div>

      {overtimeWarnings.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Ingen afvigelser fundet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="pb-3 pr-4">Medarbejder</th>
                <th className="pb-3 pr-4">Totale timer</th>
                <th className="pb-3 pr-4">Overtid</th>
                <th className="pb-3 pr-4">Weekend</th>
                <th className="pb-3 pr-4">Nat</th>
                <th className="pb-3 pr-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {overtimeWarnings.map((employee) => (
                <tr key={employee.name}>
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                    {employee.name}
                  </td>

                  <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                    {formatHours(employee.totalHours)}
                  </td>

                  <td className="py-3 pr-4 font-bold text-red-600">
                    {formatHours(employee.overtime)}
                  </td>

                  <td className="py-3 pr-4 font-bold text-purple-600">
                    {formatHours(employee.weekend)}
                  </td>

                  <td className="py-3 pr-4 font-bold text-blue-600">
                    {formatHours(employee.night)}
                  </td>

                  <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                    {employee.overtime > 0 ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                        EKSTRA TIMER
                      </span>
                    ) : employee.weekend > 10 ? (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        WEEKEND
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        NAT
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
