type DashboardHeaderProps = {
  firstName: string;
};

export default function DashboardHeader({
  firstName,
}: DashboardHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
        Velkommen, {firstName}
      </h1>

      <p className="mt-2 text-gray-600 dark:text-gray-300">
        Her er dagens overblik for biografen.
      </p>
    </section>
  );
}
