import type { Cinema } from "../helpers/cinemaSettingsTypes";

type CinemaSettingsFeatureTogglesSectionProps = {
  cinema: Cinema;
  saving: boolean;
  updateCinemaSettings: (updatedCinema: Cinema) => void | Promise<void>;
};

export default function CinemaSettingsFeatureTogglesSection({
  cinema,
  saving,
  updateCinemaSettings,
}: CinemaSettingsFeatureTogglesSectionProps) {
  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-2xl font-bold">Vagtbytte-funktioner</h2>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <div className="font-semibold">Tillad vagtpulje</div>

              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Medarbejdere kan sende vagter ud i den åbne vagtpulje.
              </div>
            </div>

            <button
              onClick={() =>
                updateCinemaSettings({
                  ...cinema,
                  allowShiftTradePool: !cinema.allowShiftTradePool,
                })
              }
              disabled={saving}
              className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                cinema.allowShiftTradePool
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              {cinema.allowShiftTradePool ? "Aktiveret" : "Deaktiveret"}
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <div className="font-semibold">Tillad direkte vagtbytter</div>

              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Medarbejdere kan tilbyde vagter direkte til specifikke brugere.
              </div>
            </div>

            <button
              onClick={() =>
                updateCinemaSettings({
                  ...cinema,
                  allowShiftTradeDirect: !cinema.allowShiftTradeDirect,
                })
              }
              disabled={saving}
              className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                cinema.allowShiftTradeDirect
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              {cinema.allowShiftTradeDirect ? "Aktiveret" : "Deaktiveret"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-2xl font-bold">AI-funktioner</h2>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div>
            <div className="font-semibold">Aktivér AI</div>

            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Aktiverer AI-dashboard, AI-analyser og fremtidige AI-funktioner
              for denne biograf.
            </div>
          </div>

          <button
            onClick={() =>
              updateCinemaSettings({
                ...cinema,
                aiEnabled: !cinema.aiEnabled,
              })
            }
            disabled={saving}
            className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              cinema.aiEnabled
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            {cinema.aiEnabled ? "Aktiveret" : "Deaktiveret"}
          </button>
        </div>
      </section>
    </>
  );
}
