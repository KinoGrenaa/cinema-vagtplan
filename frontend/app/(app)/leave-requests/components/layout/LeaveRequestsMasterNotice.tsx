export default function LeaveRequestsMasterNotice() {
  return (
    <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-950 shadow-sm transition-colors dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
      <h2 className="text-lg font-semibold text-yellow-950 dark:text-yellow-100">
        Denne side er til egne fraværsansøgninger
      </h2>
      <p className="mt-2 text-sm text-yellow-900 dark:text-yellow-200">
        MASTER-brugere skal oprette og behandle fravær via
        Fraværsgodkendelse for den aktive biograf.
      </p>
    </div>
  );
}
