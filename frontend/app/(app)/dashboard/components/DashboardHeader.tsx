type DashboardHeaderProps = {
  firstName: string;
};

export default function DashboardHeader({ firstName }: DashboardHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-3xl font-bold">Velkommen, {firstName}</h1>

      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Her er dagens overblik for biografen.
      </p>
    </section>
  );
}
