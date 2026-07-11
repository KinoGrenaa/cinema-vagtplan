import type { PayrollType } from "../../helpers/workTypeTypes";

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
    <section className="rounded-2xl bg-white p-6 text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100">
      <h2 className="mb-4 text-2xl font-bold">Opret vagttype</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="text"
          placeholder="Navn"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={disabled}
        />

        <label className="flex items-center gap-3 rounded-xl border p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
          <span>Farve</span>
          <input
            type="color"
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            disabled={disabled}
          />
        </label>

        <select
          value={payrollTypeId}
          onChange={(event) => onPayrollTypeIdChange(event.target.value)}
          className="rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
          onClick={onCreate}
          className={`rounded-xl px-4 py-3 font-semibold text-white ${
            disabled ? "cursor-not-allowed bg-gray-400" : "bg-black hover:bg-gray-800"
          }`}
          disabled={disabled}
        >
          Opret
        </button>
      </div>
    </section>
  );
}
