type DashboardConnectivityNoticeProps = {
  isOnline: boolean;
  autoRefreshEnabled: boolean;
};

export default function DashboardConnectivityNotice({
  isOnline,
  autoRefreshEnabled,
}: DashboardConnectivityNoticeProps) {
  if (isOnline) {
    return null;
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Ingen netværksforbindelse
      </p>
      <h2 className="mt-1 text-lg font-bold">
        De senest hentede oplysninger vises fortsat
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900 dark:text-amber-100/90">
        Dashboardet kan ikke hente nye data, mens forbindelsen er afbrudt.
        {autoRefreshEnabled
          ? " Det prøver automatisk igen, når forbindelsen vender tilbage."
          : " Opdater manuelt, når forbindelsen er tilbage, eller slå automatisk opdatering til."}
      </p>
    </section>
  );
}
