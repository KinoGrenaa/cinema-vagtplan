import Link from "next/link";

export default function StaffingRequestsMasterCinemaRequired() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/35">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Ingen aktiv biograf valgt
      </p>
      <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
        Vælg en biograf for at administrere bemandingen
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-300">
        Som MASTER skal du vælge en aktiv biograf, før
        bemandingsforespørgsler kan vises eller behandles.
      </p>
      <Link
        href="/master"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:active:bg-blue-600 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
      >
        Vælg biograf
      </Link>
    </section>
  );
}
