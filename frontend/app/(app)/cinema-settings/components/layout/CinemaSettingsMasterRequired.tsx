import Link from "next/link";

export default function CinemaSettingsMasterRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-7 text-center shadow-sm dark:border-amber-900/70 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
          !
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
          Biograf skal vælges
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          MASTER-brugere skal først vælge en biograf i MASTER-panelet.
        </p>
        <Link
          href="/master"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-offset-slate-900"
        >
          Gå til MASTER-panel
        </Link>
      </section>
    </main>
  );
}
