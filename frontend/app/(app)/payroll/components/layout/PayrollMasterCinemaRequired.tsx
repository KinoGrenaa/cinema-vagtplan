import PermissionGuard from "@/app/components/access/PermissionGuard";

type PayrollMasterCinemaRequiredProps = {
  onChooseCinema: () => void;
};

export default function PayrollMasterCinemaRequired({
  onChooseCinema,
}: PayrollMasterCinemaRequiredProps) {
  return (
    <PermissionGuard permission="canManagePayroll">
      <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold text-amber-950 dark:text-amber-100">
                  Ingen aktiv biograf valgt
                </h1>
                <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/80">
                  Vælg en biograf i MASTER-panelet, før du kan se eller
                  administrere løn.
                </p>
              </div>

              <button
                type="button"
                onClick={onChooseCinema}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Vælg biograf
              </button>
            </div>
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
