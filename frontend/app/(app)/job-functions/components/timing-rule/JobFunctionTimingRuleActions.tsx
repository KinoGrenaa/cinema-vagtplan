type JobFunctionTimingRuleActionsProps = {
  hasActiveTimingRule: boolean;
  timingRuleSaving: boolean;
  onArchive: () => void;
  onClose: () => void;
};

export default function JobFunctionTimingRuleActions({
  hasActiveTimingRule,
  timingRuleSaving,
  onArchive,
  onClose,
}: JobFunctionTimingRuleActionsProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {hasActiveTimingRule && (
          <button
            type="button"
            onClick={onArchive}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-gray-950 dark:text-red-200 dark:hover:bg-red-950 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900"
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
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          disabled={timingRuleSaving}
        >
          Annuller
        </button>
        <button
          type="submit"
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          disabled={timingRuleSaving}
        >
          {timingRuleSaving ? "Gemmer..." : "Gem regel"}
        </button>
      </div>
    </div>
  );
}
