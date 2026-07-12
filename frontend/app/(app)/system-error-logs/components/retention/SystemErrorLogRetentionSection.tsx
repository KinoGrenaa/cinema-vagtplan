import { formatDateTime } from "../../helpers/core/systemErrorLogHelpers";
import type { SystemErrorLogRetentionSummary } from "../../types";

type SystemErrorLogRetentionSectionProps = {
  retentionSummary: SystemErrorLogRetentionSummary | null;
  loading: boolean;
  cleaning: boolean;
  onRefresh: () => void;
  onCleanup: () => void;
};

export default function SystemErrorLogRetentionSection({
  retentionSummary,
  loading,
  cleaning,
  onRefresh,
  onCleanup,
}: SystemErrorLogRetentionSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
            Opbevaring
          </p>
          <h2 className="mt-1 text-xl font-bold">Opbevaring af systemfejl</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Viser den aktuelle opbevaringspolitik og hvor mange logposter der
            ville være kandidater til oprydning. Denne visning sletter ikke
            logposter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || cleaning}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            {loading ? "Opdaterer..." : "Opdater opbevaring"}
          </button>

          <button
            type="button"
            onClick={onCleanup}
            disabled={
              loading ||
              cleaning ||
              !retentionSummary ||
              retentionSummary.summary.eligibleForCleanupCount <= 0
            }
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
          >
            {cleaning ? "Rydder..." : "Ryd gamle logposter"}
          </button>
        </div>
      </div>

      {loading && !retentionSummary ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Indlæser opbevaringsoversigt...
        </p>
      ) : !retentionSummary ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Opbevaringsoversigt kunne ikke hentes endnu.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Kan ryddes nu
              </p>
              <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-300">
                {retentionSummary.summary.eligibleForCleanupCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Beholdes
              </p>
              <p className="mt-1 text-3xl font-bold">
                {retentionSummary.summary.keepCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                I alt
              </p>
              <p className="mt-1 text-3xl font-bold">
                {retentionSummary.summary.totalCount}
              </p>
            </div>
          </div>

          <div className="grid gap-4 text-sm text-gray-600 dark:text-gray-400 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Politik
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {retentionSummary.policy.description.map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Vurdering
              </h3>
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Vurderet:
                </span>{" "}
                {formatDateTime(retentionSummary.policy.evaluatedAt)}
              </p>
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Eldste log:
                </span>{" "}
                {formatDateTime(retentionSummary.summary.oldestCreatedAt)}
              </p>
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Nyeste log:
                </span>{" "}
                {formatDateTime(retentionSummary.summary.newestCreatedAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-3 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
              Aktive kandidater:{" "}
              {retentionSummary.summary.activeEligibleCount}
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
              Afsluttede kandidater:{" "}
              {retentionSummary.summary.resolvedEligibleCount}
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
              Kritiske kandidater:{" "}
              {retentionSummary.summary.criticalEligibleCount}
            </div>
          </div>

          {retentionSummary.summary.eligibleForCleanupCount > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Oprydning sletter kun de logposter, der er ældre end den viste
              opbevaringspolitik. Handlingen kan ikke fortrydes.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
