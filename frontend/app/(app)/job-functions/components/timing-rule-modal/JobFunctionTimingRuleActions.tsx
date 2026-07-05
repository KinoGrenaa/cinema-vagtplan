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
  );
}
