import type { Dispatch, SetStateAction } from "react";
import type { FormState } from "../../helpers/core/dayPeriodFormHelpers";

type DayPeriodFormModalProps = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  isEditing: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

const inputClassName =
  "w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-950 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

export default function DayPeriodFormModal({
  form,
  setForm,
  isEditing,
  saving,
  onClose,
  onSubmit,
}: DayPeriodFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-period-form-title"
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-950 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              Stamdata
            </p>
            <h2 id="day-period-form-title" className="mt-1 text-2xl font-bold">
              {isEditing ? "Redigér dagsperiode" : "Opret dagsperiode"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Brug tider som kl. 08:00-17:30 eller kl. 16:00-23:59.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            disabled={saving}
          >
            Luk
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
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
              className={inputClassName}
              disabled={saving}
              autoFocus
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
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
                className={`${inputClassName} dark:[color-scheme:dark]`}
                disabled={saving}
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
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
                className={`${inputClassName} dark:[color-scheme:dark]`}
                disabled={saving}
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
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
                className={inputClassName}
                disabled={saving}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
              disabled={saving}
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-white/90 dark:bg-blue-500 dark:hover:bg-blue-400 dark:active:bg-blue-300 dark:disabled:bg-blue-900 dark:disabled:text-blue-300 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
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
