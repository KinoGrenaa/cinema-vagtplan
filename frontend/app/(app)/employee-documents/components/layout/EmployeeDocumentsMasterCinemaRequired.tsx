import Link from "next/link";

export default function EmployeeDocumentsMasterCinemaRequired() {
  return (
    <section
      className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm transition-colors dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
      role="status"
      aria-labelledby="employee-documents-cinema-required-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="employee-documents-cinema-required-title"
            className="text-base font-bold"
          >
            Biograf mangler
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
            Vælg først en biograf i MASTER-panelet, før du administrerer
            medarbejderdokumenter.
          </p>
        </div>

        <Link
          href="/master"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-950"
        >
          Gå til MASTER-panel
        </Link>
      </div>
    </section>
  );
}
