import type { Dispatch, SetStateAction } from "react";

type PayrollTypeCreateFormProps = {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  payrollCode: string;
  setPayrollCode: Dispatch<SetStateAction<string>>;
  exportCode: string;
  setExportCode: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  color: string;
  setColor: Dispatch<SetStateAction<string>>;
  isDefault: boolean;
  setIsDefault: Dispatch<SetStateAction<boolean>>;
  saving: boolean;
  message: string;
  onCreate: () => void;
};

export function PayrollTypeCreateForm({
  name,
  setName,
  payrollCode,
  setPayrollCode,
  exportCode,
  setExportCode,
  description,
  setDescription,
  color,
  setColor,
  isDefault,
  setIsDefault,
  saving,
  message,
  onCreate,
}: PayrollTypeCreateFormProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-bold">Opret lønart</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <input
          type="text"
          placeholder="Navn"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-xl border p-3"
        />

        <input
          type="text"
          placeholder="Lønkode"
          value={payrollCode}
          onChange={(event) => setPayrollCode(event.target.value)}
          className="rounded-xl border p-3"
        />

        <input
          type="text"
          placeholder="Eksportkode"
          value={exportCode}
          onChange={(event) => setExportCode(event.target.value)}
          className="rounded-xl border p-3"
        />

        <input
          type="text"
          placeholder="Beskrivelse"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded-xl border p-3"
        />

        <label className="flex items-center gap-3 rounded-xl border p-3">
          <span className="text-sm font-medium">Farve</span>
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-10 w-16"
          />
        </label>

        <label className="flex items-center gap-3 rounded-xl border p-3">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
          />
          <span>Standard lønart</span>
        </label>
      </div>

      <button
        onClick={onCreate}
        disabled={saving || !name || !payrollCode}
        className="mt-6 rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? "Gemmer..." : "Opret lønart"}
      </button>

      {message && (
        <div className="mt-4 rounded-xl bg-gray-100 p-4 text-sm">
          {message}
        </div>
      )}
    </section>
  );
}
