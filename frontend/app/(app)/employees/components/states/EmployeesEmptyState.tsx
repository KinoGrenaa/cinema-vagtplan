export function EmployeesEmptyState() {
  return (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
      <div className="mb-2 text-4xl"></div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Ingen medarbejdere fundet
      </h2>
      <p className="mt-2">Der blev ikke fundet nogen medarbejdere.</p>
    </div>
  );
}

export function EmployeesMasterCinemaPlaceholder() {
  return (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
      Medarbejderlisten vises, når der er valgt en aktiv biograf.
    </div>
  );
}
