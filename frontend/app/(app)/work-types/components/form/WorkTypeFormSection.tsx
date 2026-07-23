import type { PayrollType } from "../../helpers/core/workTypeTypes";

type WorkTypeFormSectionProps = {
  name: string;
  color: string;
  payrollTypeId: string;
  payrollTypes: PayrollType[];
  disabled: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onPayrollTypeIdChange: (payrollTypeId: string) => void;
  onCreate: () => void;
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-600/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/20 dark:disabled:border-slate-800 dark:disabled:bg-slate-800/70 dark:disabled:text-slate-500";

export default function WorkTypeFormSection({
  name,
  color,
  payrollTypeId,
  payrollTypes,
  disabled,
  onNameChange,
  onColorChange,
  onPayrollTypeIdChange,
  onCreate,
}: WorkTypeFormSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors sm:p-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Opret vagttype</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Vælg navn, visningsfarve og eventuel lønart.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="text"
          aria-label="Navn på vagttype"
          placeholder="Navn"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className={fieldClass}
          disabled={disabled}
        />

        <label
          className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm shadow-sm transition-colors focus-within:ring-4 ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-500"
              : "border-slate-300 bg-white text-slate-950 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-blue-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus-within:border-blue-400 dark:focus-within:ring-blue-400/20"
          }`}
        >
          <span className="font-medium">Farve</span>
          <input
            type="color"
            aria-label="Farve på vagttype"
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            disabled={disabled}
            className="h-8 w-14 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
          />
        </label>

        <select
          aria-label="Lønart"
          value={payrollTypeId}
          onChange={(event) => onPayrollTypeIdChange(event.target.value)}
          className={fieldClass}
          disabled={disabled}
        >
          <option value="">Ingen lønart</option>
          {payrollTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({type.payrollCode})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onCreate}
          className={`min-h-12 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            disabled
              ? "cursor-not-allowed bg-slate-200 text-slate-500 shadow-none dark:bg-slate-800 dark:text-slate-500"
              : "bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400"
          }`}
          disabled={disabled}
        >
          Opret
        </button>
      </div>
    </section>
  );
}
