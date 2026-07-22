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
    <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Medarbejderdokumenter
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Upload, find og administrer
            biografspecifikke dokumenter
            for den valgte medarbejder.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
            {employeeCount}{" "}
            {employeeCount === 1
              ? "medarbejder"
              : "medarbejdere"}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200">
            {selectedEmployeeName
              ? `${documentCount} dokumenter for ${selectedEmployeeName}`
              : "Vælg en medarbejder"}
          </span>
        </div>
      </div>
    </header>
  );
}
