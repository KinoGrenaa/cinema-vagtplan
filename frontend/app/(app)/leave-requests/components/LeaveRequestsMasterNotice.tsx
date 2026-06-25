export default function LeaveRequestsMasterNotice() {
  return (
    <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
      <h2 className="text-lg font-semibold">
        Denne side er til egne fraværsansøgninger
      </h2>
      <p className="mt-2 text-sm">
        MASTER-brugere skal oprette og behandle fravær via
        Fraværsgodkendelse for den aktive biograf.
      </p>
    </div>
  );
}
