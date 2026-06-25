"use client";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";

import { EmployeesEmptyState, EmployeesMasterCinemaPlaceholder } from "./components/EmployeesEmptyState";
import EmployeesHeader from "./components/EmployeesHeader";
import EmployeesMasterCinemaNotice from "./components/EmployeesMasterCinemaNotice";
import EmployeesTable from "./components/EmployeesTable";
import { useEmployeesPage } from "./hooks/useEmployeesPage";

export default function EmployeesPage() {
  const {
    users,
    loading,
    needsMasterCinemaSelection,
    updatePermission,
    infoDialog,
  } = useEmployeesPage();

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <EmployeesHeader />

          {needsMasterCinemaSelection && <EmployeesMasterCinemaNotice />}

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            {!needsMasterCinemaSelection && loading && (
              <div className="p-6 text-gray-500 dark:text-gray-400">
                Henter medarbejdere...
              </div>
            )}

            {!needsMasterCinemaSelection && !loading && users.length > 0 && (
              <EmployeesTable
                users={users}
                onPermissionChange={updatePermission}
              />
            )}

            {!needsMasterCinemaSelection && !loading && users.length === 0 && (
              <EmployeesEmptyState />
            )}

            {needsMasterCinemaSelection && <EmployeesMasterCinemaPlaceholder />}
          </section>
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
