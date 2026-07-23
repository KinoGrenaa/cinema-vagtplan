type CinemaSettingsHeaderSectionProps = {
  cinemaName: string;
};

export default function CinemaSettingsHeaderSection({
  cinemaName,
}: CinemaSettingsHeaderSectionProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Biografindstillinger
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Administrer funktioner og regler for hele biografen.
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
          {cinemaName}
        </span>
      </div>
    </header>
  );
}
