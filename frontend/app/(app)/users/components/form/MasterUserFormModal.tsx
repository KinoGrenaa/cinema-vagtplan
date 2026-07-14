"use client";

export type MasterUserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

type MasterUserFormModalProps = {
  mode: "create" | "edit";
  form: MasterUserFormData;
  saving: boolean;
  onChange: (form: MasterUserFormData) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function MasterUserFormModal({
  mode,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: MasterUserFormModalProps) {
  const isCreate = mode === "create";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <h2 className="text-xl font-bold">
            {isCreate
              ? "Opret MASTER-bruger"
              : "Rediger MASTER-bruger"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            MASTER-brugere er globale og er ikke knyttet til
            en bestemt biograf.
          </p>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Fornavn
            </span>
            <input
              value={form.firstName}
              onChange={(event) =>
                onChange({
                  ...form,
                  firstName: event.target.value,
                })
              }
              autoComplete="off"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Efternavn
            </span>
            <input
              value={form.lastName}
              onChange={(event) =>
                onChange({
                  ...form,
                  lastName: event.target.value,
                })
              }
              autoComplete="off"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                onChange({
                  ...form,
                  email: event.target.value,
                })
              }
              autoComplete="off"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Telefon
            </span>
            <input
              value={form.phone}
              onChange={(event) =>
                onChange({
                  ...form,
                  phone: event.target.value,
                })
              }
              autoComplete="off"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              {isCreate
                ? "Adgangskode"
                : "Ny adgangskode (valgfri)"}
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                onChange({
                  ...form,
                  password: event.target.value,
                })
              }
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
              {isCreate
                ? "Adgangskoden skal være mindst 8 tegn."
                : "Lad feltet være tomt for at beholde den nuværende adgangskode."}
            </span>
          </label>

          <div className="rounded-xl bg-purple-50 p-4 text-sm text-purple-900 md:col-span-2 dark:bg-purple-950/30 dark:text-purple-100">
            Rollen er fastsat til <strong>MASTER</strong>.
            Brugeren får alle administrationsrettigheder og
            vælger aktiv biograf i MASTER-panelet.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-6 sm:flex-row sm:justify-end dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-purple-700 px-4 py-2 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Gemmer..."
              : isCreate
                ? "Opret MASTER"
                : "Gem ændringer"}
          </button>
        </div>
      </div>
    </div>
  );
}
