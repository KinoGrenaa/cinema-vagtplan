import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  timingEndAnchorOptions,
  timingStartAnchorOptions,
} from "../helpers/jobFunctionTimingRuleFormHelpers";
import type { TimingRuleFormState } from "../helpers/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionWithWorkType } from "../helpers/jobFunctionPayrollHelpers";
import {
  formatDayPeriod,
  formatTimingAnchor,
  formatTimingOffset,
} from "../helpers/jobFunctionHelpers";
import type {
  DayPeriod,
  JobFunctionTimingAnchor,
  JobFunctionTimingRule,
} from "../helpers/jobFunctionTypes";

type JobFunctionTimingRuleModalProps = {
  dayPeriods: DayPeriod[];
  jobFunction: JobFunctionWithWorkType;
  timingRule: JobFunctionTimingRule | null;
  timingRuleForm: TimingRuleFormState;
  timingRuleLoading: boolean;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
  onArchive: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JobFunctionTimingRuleModal({
  dayPeriods,
  jobFunction,
  timingRule,
  timingRuleForm,
  timingRuleLoading,
  timingRuleSaving,
  setTimingRuleForm,
  onArchive,
  onClose,
  onSubmit,
}: JobFunctionTimingRuleModalProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
            Møde- og fyraftensregel
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
            {jobFunction.name}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Reglen bruges til at beregne mødetid og fyraften ud fra dagsperiode,
            filmprogram og tider uden filmprogram, når vagtplanlægning opretter
            vagter fra en forhåndsvisning.
          </p>
        </div>

        {timingRuleLoading && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Henter møde- og fyraftensregel...
          </div>
        )}

        {!timingRuleLoading && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
              <label className="block">
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Dagsperiode for reglen
                </span>
                <select
                  value={timingRuleForm.dayPeriodId}
                  onChange={(event) =>
                    setTimingRuleForm((current) => ({
                      ...current,
                      dayPeriodId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={timingRuleSaving}
                >
                  <option value="">Ingen dagsperiode</option>
                  {dayPeriods.map((dayPeriod) => (
                    <option key={dayPeriod.id} value={dayPeriod.id}>
                      {formatDayPeriod(dayPeriod)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Dagsperioden afgrænser, hvilke forestillinger start- og
                  slutreglen kigger på. Hvis der ikke ligger film i perioden,
                  bruges tiderne uden filmprogram.
                </p>
              </label>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Start / mødetid
                </h3>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Startregel
                    </span>
                    <select
                      value={timingRuleForm.startAnchor}
                      onChange={(event) =>
                        setTimingRuleForm((current) => ({
                          ...current,
                          startAnchor: event.target.value as JobFunctionTimingAnchor,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      disabled={timingRuleSaving}
                    >
                      {timingStartAnchorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {timingRuleForm.startAnchor === "FIXED_TIME" ? (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Fast starttidspunkt
                      </span>
                      <input
                        type="time"
                        value={timingRuleForm.startFixedMinute}
                        onChange={(event) =>
                          setTimingRuleForm((current) => ({
                            ...current,
                            startFixedMinute: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        disabled={timingRuleSaving}
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Forskydning i minutter
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={timingRuleForm.startOffsetMinutes}
                        onChange={(event) =>
                          setTimingRuleForm((current) => ({
                            ...current,
                            startOffsetMinutes: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        disabled={timingRuleSaving}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Negativt tal betyder før ankeret. Eksempel: -60 = 60 min
                        før.
                      </p>
                    </label>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Slut / fyraften
                </h3>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Slutregel
                    </span>
                    <select
                      value={timingRuleForm.endAnchor}
                      onChange={(event) =>
                        setTimingRuleForm((current) => ({
                          ...current,
                          endAnchor: event.target.value as JobFunctionTimingAnchor,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      disabled={timingRuleSaving}
                    >
                      {timingEndAnchorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {timingRuleForm.endAnchor === "FIXED_TIME" ? (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Fast sluttidspunkt
                      </span>
                      <input
                        type="time"
                        value={timingRuleForm.endFixedMinute}
                        onChange={(event) =>
                          setTimingRuleForm((current) => ({
                            ...current,
                            endFixedMinute: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        disabled={timingRuleSaving}
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Forskydning i minutter
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={timingRuleForm.endOffsetMinutes}
                        onChange={(event) =>
                          setTimingRuleForm((current) => ({
                            ...current,
                            endOffsetMinutes: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        disabled={timingRuleSaving}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Positivt tal betyder efter ankeret. Eksempel: 15 = 15
                        min efter.
                      </p>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Dage uden filmprogram
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Hvis der ikke er noget filmprogram i den valgte dagsperiode,
                    starter vagten
                  </span>
                  <input
                    type="time"
                    value={timingRuleForm.fallbackStartMinute}
                    onChange={(event) =>
                      setTimingRuleForm((current) => ({
                        ...current,
                        fallbackStartMinute: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={timingRuleSaving}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Hvis der ikke er noget filmprogram i den valgte dagsperiode,
                    slutter vagten
                  </span>
                  <input
                    type="time"
                    value={timingRuleForm.fallbackEndMinute}
                    onChange={(event) =>
                      setTimingRuleForm((current) => ({
                        ...current,
                        fallbackEndMinute: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={timingRuleSaving}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-100">
              <p className="font-semibold">Aktuel opsummering</p>
              <p className="mt-1">
                Start: {formatTimingAnchor(timingRuleForm.startAnchor)}
                {timingRuleForm.startAnchor === "FIXED_TIME"
                  ? timingRuleForm.startFixedMinute
                    ? ` · kl. ${timingRuleForm.startFixedMinute}`
                    : " · mangler tidspunkt"
                  : ` · ${formatTimingOffset(Number(timingRuleForm.startOffsetMinutes || 0))}`}
              </p>
              <p className="mt-1">
                Slut: {formatTimingAnchor(timingRuleForm.endAnchor)}
                {timingRuleForm.endAnchor === "FIXED_TIME"
                  ? timingRuleForm.endFixedMinute
                    ? ` · kl. ${timingRuleForm.endFixedMinute}`
                    : " · mangler tidspunkt"
                  : ` · ${formatTimingOffset(Number(timingRuleForm.endOffsetMinutes || 0))}`}
              </p>
              {timingRule?.isActive === false && (
                <p className="mt-2 font-semibold text-amber-800 dark:text-amber-100">
                  Reglen er arkiveret. Gem formularen for at aktivere den igen.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {timingRule?.isActive && (
                  <button
                    type="button"
                    onClick={onArchive}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
                    disabled={timingRuleSaving}
                  >
                    Arkivér regel
                  </button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  disabled={timingRuleSaving}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={timingRuleSaving}
                >
                  {timingRuleSaving ? "Gemmer..." : "Gem regel"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
