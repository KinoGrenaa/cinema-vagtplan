import {
  formatDateTime,
} from "../../helpers/core/systemErrorLogHelpers";
import type {
  SystemErrorLogRetentionSummary,
} from "../../types";

type SystemErrorLogRetentionSectionProps = {
  retentionSummary:
    | SystemErrorLogRetentionSummary
    | null;
  loading: boolean;
  cleaning: boolean;
  onRefresh: () => void;
  onCleanup: () => void;
};

const secondaryButtonClass =
  "rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

export default function SystemErrorLogRetentionSection({
  retentionSummary,
  loading,
  cleaning,
  onRefresh,
  onCleanup,
}: SystemErrorLogRetentionSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
            Opbevaring
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
            Opbevaring af systemfejl
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Viser den aktuelle
            opbevaringspolitik og hvor
            mange logposter der ville
            være kandidater til
            oprydning. Denne visning
            sletter ikke logposter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || cleaning}
            className={secondaryButtonClass}
          >
            {loading
              ? "Opdaterer..."
              : "Opdater opbevaring"}
          </button>

          <button
            type="button"
            onClick={onCleanup}
            disabled={
              loading ||
              cleaning ||
              !retentionSummary ||
              retentionSummary.summary
                .eligibleForCleanupCount <=
                0
            }
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-red-950 dark:disabled:text-red-400"
          >
            {cleaning
              ? "Rydder..."
              : "Ryd gamle logposter"}
          </button>
        </div>
      </div>

      {loading && !retentionSummary ? (
        <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-200">
          Indlæser
          opbevaringsoversigt...
        </p>
      ) : !retentionSummary ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Opbevaringsoversigt kunne ikke
          hentes endnu.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Kan ryddes nu
              </p>

              <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-300">
                {
                  retentionSummary.summary
                    .eligibleForCleanupCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Beholdes
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
                {
                  retentionSummary.summary
                    .keepCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                I alt
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
                {
                  retentionSummary.summary
                    .totalCount
                }
              </p>
            </div>
          </div>

          <div className="grid gap-4 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-gray-950 dark:text-white">
                Politik
              </h3>

              <ul className="mt-2 list-disc space-y-1 pl-5">
                {retentionSummary.policy.description.map(
                  (description) => (
                    <li key={description}>
                      {description}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-950 dark:text-white">
                Vurdering
              </h3>

              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Vurderet:
                </span>{" "}
                {formatDateTime(
                  retentionSummary.policy
                    .evaluatedAt,
                )}
              </p>

              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Ældste log:
                </span>{" "}
                {formatDateTime(
                  retentionSummary.summary
                    .oldestCreatedAt,
                )}
              </p>

              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Nyeste log:
                </span>{" "}
                {formatDateTime(
                  retentionSummary.summary
                    .newestCreatedAt,
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
              Aktive kandidater:{" "}
              {
                retentionSummary.summary
                  .activeEligibleCount
              }
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
              Afsluttede kandidater:{" "}
              {
                retentionSummary.summary
                  .resolvedEligibleCount
              }
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
              Kritiske kandidater:{" "}
              {
                retentionSummary.summary
                  .criticalEligibleCount
              }
            </div>
          </div>

          {retentionSummary.summary
            .eligibleForCleanupCount >
            0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Oprydning sletter kun de
              logposter, der er ældre
              end den viste
              opbevaringspolitik.
              Handlingen kan ikke
              fortrydes.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
