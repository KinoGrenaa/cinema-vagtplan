type CinemaSettingsHeaderSectionProps = {
  cinemaName: string;
};

export default function CinemaSettingsHeaderSection({
  cinemaName,
}: CinemaSettingsHeaderSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-3xl font-bold">Biograf indstillinger</h1>

      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Administrer funktioner og regler for hele biografen.
      </p>

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {cinemaName}
      </p>
    </div>
  );
}
