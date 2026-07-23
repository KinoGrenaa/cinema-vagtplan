import type {
  Cinema,
  CinemaSettingsUpdate,
} from "../../helpers/core/cinemaSettingsTypes";

type CinemaSettingsFeatureTogglesSectionProps = {
  cinema: Cinema;
  saving: boolean;
  updateCinemaSettings: (
    changes: CinemaSettingsUpdate,
  ) => void | Promise<void>;
};

type FeatureToggleProps = {
  title: string;
  description: string;
  active: boolean;
  saving: boolean;
  activeClassName: string;
  onToggle: () => void;
};

function FeatureToggle({
  title,
  description,
  active,
  saving,
  activeClassName,
  onToggle,
}: FeatureToggleProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-slate-700 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
      <button
        type="button"
        aria-pressed={active}
        onClick={onToggle}
        disabled={saving}
        className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950 ${
          active
            ? activeClassName
            : "bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
        }`}
      >
        {active ? "Aktiveret" : "Deaktiveret"}
      </button>
    </div>
  );
}

export default function CinemaSettingsFeatureTogglesSection({
  cinema,
  saving,
  updateCinemaSettings,
}: CinemaSettingsFeatureTogglesSectionProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
          Vagtbytte-funktioner
        </h2>
        <div className="mt-5 space-y-4">
          <FeatureToggle
            title="Tillad vagtpulje"
            description="Medarbejdere kan sende vagter ud i den åbne vagtpulje."
            active={cinema.allowShiftTradePool}
            saving={saving}
            activeClassName="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onToggle={() =>
              void updateCinemaSettings({
                allowShiftTradePool: !cinema.allowShiftTradePool,
              })
            }
          />
          <FeatureToggle
            title="Tillad direkte vagtbytter"
            description="Medarbejdere kan tilbyde vagter direkte til specifikke brugere."
            active={cinema.allowShiftTradeDirect}
            saving={saving}
            activeClassName="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onToggle={() =>
              void updateCinemaSettings({
                allowShiftTradeDirect: !cinema.allowShiftTradeDirect,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
          AI-funktioner
        </h2>
        <div className="mt-5">
          <FeatureToggle
            title="Aktivér AI"
            description="Aktiverer AI-dashboard, AI-analyser og fremtidige AI-funktioner for denne biograf."
            active={cinema.aiEnabled}
            saving={saving}
            activeClassName="bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            onToggle={() =>
              void updateCinemaSettings({
                aiEnabled: !cinema.aiEnabled,
              })
            }
          />
        </div>
      </section>
    </div>
  );
}
