type SystemErrorLogsAccessStateProps = {
  variant: "loading" | "forbidden";
};

export default function SystemErrorLogsAccessState({
  variant,
}: SystemErrorLogsAccessStateProps) {
  if (variant === "loading") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          Kontrollerer adgang...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm transition-colors dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <h1 className="text-2xl font-bold">
          Ingen adgang
        </h1>

        <p className="mt-2 text-sm text-red-900 dark:text-red-100/90">
          Denne side er kun for globale
          MASTER-brugere.
        </p>
      </div>
    </main>
  );
}
