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
  "rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-gray-100 dark:focus:ring-gray-100/10 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <h2 className="mb-4 text-2xl font-bold">
        Opret vagttype
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="text"
          placeholder="Navn"
          value={name}
          onChange={(event) =>
            onNameChange(event.target.value)
          }
          className={fieldClass}
          disabled={disabled}
        />

        <label className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white p-3 text-gray-900 transition focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus-within:border-gray-100 dark:focus-within:ring-gray-100/10">
          <span>Farve</span>
          <input
            type="color"
            value={color}
            onChange={(event) =>
              onColorChange(event.target.value)
            }
            disabled={disabled}
            className="h-9 w-14 cursor-pointer rounded-md border border-gray-300 bg-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600"
          />
        </label>

        <select
          value={payrollTypeId}
          onChange={(event) =>
            onPayrollTypeIdChange(
              event.target.value,
            )
          }
          className={fieldClass}
          disabled={disabled}
        >
          <option value="">Ingen lønart</option>
          {payrollTypes.map((type) => (
            <option
              key={type.id}
              value={type.id}
            >
              {type.name} ({type.payrollCode})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onCreate}
          className={`rounded-xl px-4 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
            disabled
              ? "cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
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
