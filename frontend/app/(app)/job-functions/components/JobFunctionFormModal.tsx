import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { JobFunctionFormState } from "../helpers/jobFunctionFormHelpers";
import type { PayrollTypeOption } from "../helpers/jobFunctionPayrollHelpers";

type JobFunctionFormModalProps = {
  form: JobFunctionFormState;
  isEditing: boolean;
  payrollTypes: PayrollTypeOption[];
  saving: boolean;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JobFunctionFormModal({
  form,
  isEditing,
  payrollTypes,
  saving,
  setForm,
  onClose,
  onSubmit,
}: JobFunctionFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Stamdata
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
              {isEditing ? "Redigér jobfunktion" : "Opret jobfunktion"}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Angiv navn, beskrivelse, farve og hvilken løntype vagter skal
              oprettes som.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            disabled={saving}
          >
            Luk
          </button>
        </div>

        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSubmit();
          }}
          className="space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Navn
            </span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              disabled={saving}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Beskrivelse
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              disabled={saving}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Sortering
              </span>
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
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={saving}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Farve
              </span>
              <div className="mt-1">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-800"
                  disabled={saving}
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Oprettes som
            </span>
            <select
              value={form.payrollTypeId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payrollTypeId: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              disabled={saving}
            >
              <option value="">Ingen løntype valgt endnu</option>
              {payrollTypes.map((payrollType) => (
                <option key={payrollType.id} value={payrollType.id}>
                  {payrollType.name}
                  {payrollType.payrollCode
                    ? ` · ${payrollType.payrollCode}`
                    : ""}
                </option>
              ))}
            </select>
            {payrollTypes.length === 0 && (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                Der er ingen aktive løntyper endnu. Opret en løntype under
                biografens lønopsætning, før jobfunktionen kan bruges til
                oprettelse af vagter.
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Valget bruges, når forhåndsvisninger oprettes som rigtige vagter.
              Systemet opretter den tekniske vagttype automatisk.
            </p>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
              disabled={saving}
            >
              Annuller
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving
                ? "Gemmer..."
                : isEditing
                  ? "Gem ændringer"
                  : "Opret jobfunktion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
