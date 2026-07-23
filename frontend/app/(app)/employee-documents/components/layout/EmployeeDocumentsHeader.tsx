type EmployeeDocumentsHeaderProps = {
  employeeCount: number;
  selectedEmployeeName: string | null;
  documentCount: number;
};

export default function EmployeeDocumentsHeader({
  employeeCount,
  selectedEmployeeName,
  documentCount,
}: EmployeeDocumentsHeaderProps) {
  return (
    <header className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-gradient-to-br from-white via-white to-blue-50/80 p-6 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/25 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              Medarbejdere
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 dark:text-white">
              Medarbejderdokumenter
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 md:text-base">
              Upload, find og administrer biografspecifikke dokumenter for den
              valgte medarbejder.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-2 text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
              {employeeCount} {employeeCount === 1 ? "medarbejder" : "medarbejdere"}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 shadow-sm dark:border-blue-900/80 dark:bg-blue-950/45 dark:text-blue-200">
              {selectedEmployeeName
                ? `${documentCount} ${documentCount === 1 ? "dokument" : "dokumenter"} for ${selectedEmployeeName}`
                : "Vælg en medarbejder"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
