import type {
  JobFunction,
  Shift,
} from "../../../../../../shared/types";
import {
  buildScheduleMovieCoverageWarnings,
  type MovieCoverageShowing,
} from "../../helpers/derived/scheduleMovieCoverageWarnings";

type Props = {
  selectedDate: string;
  movieShowings: MovieCoverageShowing[];
  jobFunctions: JobFunction[];
  shifts: Shift[];
};

export default function ScheduleMovieCoverageWarnings({
  selectedDate,
  movieShowings,
  jobFunctions,
  shifts,
}: Props) {
  const warnings = buildScheduleMovieCoverageWarnings({
    selectedDate,
    movieShowings,
    jobFunctions,
    shifts,
  });

  if (warnings.length === 0) return null;

  return (
    <section className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
      <h2 className="text-lg font-semibold">
        Filmstarter uden automatisk dækning
      </h2>
      <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
        Filmene nedenfor starter uden for alle aktive jobfunktioners valgte
        filmstartstidsrum. De indgår derfor ikke i den automatiske
        vagtberegning. Kontrollér bemandingen manuelt.
      </p>

      <div className="mt-4 space-y-3">
        {warnings.map((warning) => (
          <div
            key={warning.key}
            className="rounded-xl border border-amber-200 bg-white/70 p-4 dark:border-amber-800 dark:bg-gray-950/40"
          >
            <p className="font-medium">{warning.title}</p>
            <p className="mt-1 text-sm">{warning.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
