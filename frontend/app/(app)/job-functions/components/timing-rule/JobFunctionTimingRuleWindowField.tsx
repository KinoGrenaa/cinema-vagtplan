import type { Dispatch, SetStateAction } from "react";
import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";

type Props = {
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleWindowField({
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Filmstarter i beregningen
      </p>

      <label className="mt-3 flex items-start gap-3">
        <input
          type="checkbox"
          checked={timingRuleForm.restrictMovieStartsToWindow}
          onChange={(event) => setTimingRuleForm((current) => ({
            ...current,
            restrictMovieStartsToWindow: event.target.checked,
          }))}
          disabled={timingRuleSaving}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium">
            Brug kun filmstarter i et bestemt tidsrum
          </span>
          <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
            Når dette er slået til, bruges kun film, der starter i tidsrummet
            nedenfor, til at finde første og sidste film. Mødetids- og
            fyraftensforskydninger kan stadig placere vagten uden for
            tidsrummet.
          </span>
        </span>
      </label>

      {timingRuleForm.restrictMovieStartsToWindow ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Filmstarter fra kl.</span>
              <input
                type="time"
                value={timingRuleForm.filmWindowStartMinute}
                onChange={(event) => setTimingRuleForm((current) => ({
                  ...current,
                  filmWindowStartMinute: event.target.value,
                }))}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                disabled={timingRuleSaving}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Filmstarter før kl.</span>
              <input
                type="time"
                value={timingRuleForm.filmWindowEndMinute}
                onChange={(event) => setTimingRuleForm((current) => ({
                  ...current,
                  filmWindowEndMinute: event.target.value,
                }))}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                disabled={timingRuleSaving}
                required
              />
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Er sluttidspunktet lig med eller tidligere end starttidspunktet,
            fortsætter tidsrummet efter midnat.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Alle filmstarter i dagens filmprogram bruges i beregningen.
        </p>
      )}

      <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-800">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Afrunding
        </p>
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={timingRuleForm.roundStartToNearestQuarter}
              onChange={(event) => setTimingRuleForm((current) => ({
                ...current,
                roundStartToNearestQuarter: event.target.checked,
              }))}
              disabled={timingRuleSaving}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm">
              Afrund mødetid til nærmeste hele kvarter
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={timingRuleForm.roundEndToNearestQuarter}
              onChange={(event) => setTimingRuleForm((current) => ({
                ...current,
                roundEndToNearestQuarter: event.target.checked,
              }))}
              disabled={timingRuleSaving}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm">
              Afrund fyraften til nærmeste hele kvarter
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
