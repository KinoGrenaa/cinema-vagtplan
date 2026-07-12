import type {
  Dispatch,
  SetStateAction,
} from "react";

import type { FormState } from "../../helpers/core/dayPeriodFormHelpers";

type DayPeriodFormModalProps = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  isEditing: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function DayPeriodFormModal({
  form,
  setForm,
  isEditing,
  saving,
  onClose,
  onSubmit,
}: DayPeriodFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Stamdata
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {isEditing ? "Redigér dagsperiode" : "Opret dagsperiode"}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Brug tider som kl. 08:00-17:30 eller kl. 16:00-23:59.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            disabled={saving}
          >
            Luk
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Navn</span>
            <input
              type="text"
              placeholder="Fx A Vagt Weekend"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              disabled={saving}
              autoFocus
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>Start</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark]"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>Slut</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark]"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>Sortering</span>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={saving}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
              disabled={saving}
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {saving
                ? "Gemmer..."
                : isEditing
                  ? "Gem ændringer"
                  : "Opret dagsperiode"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
