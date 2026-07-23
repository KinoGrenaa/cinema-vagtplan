import FilterModal from "@/app/components/modals/FilterModal";

import type { MyTimeStatusFilters } from "../../helpers/core/myTimeStatus";

type MyTimeFilterModalProps = {
  open: boolean;
  activeFilterCount: number;
  draftStatusFilters: MyTimeStatusFilters;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  onStatusFilterChange: (
    key: keyof MyTimeStatusFilters,
    checked: boolean,
  ) => void;
};

const checkboxClass =
  "mt-0.5 h-4 w-4 shrink-0 accent-blue-600 dark:accent-blue-500";

const statusOptions: Array<{
  key: keyof MyTimeStatusFilters;
  label: string;
  description: string;
}> = [
  {
    key: "approved",
    label: "Godkendte",
    description: "Timer der tæller med i løngrundlaget.",
  },
  {
    key: "pending",
    label: "Afventer godkendelse",
    description: "Timer der endnu ikke er godkendt.",
  },
  {
    key: "needsChanges",
    label: "Skal rettes",
    description:
      "Registreringer som administrationen har sendt retur til rettelse.",
  },
  {
    key: "voided",
    label: "Afviste/annullerede",
    description:
      "Registreringer der ikke indgår i løngrundlaget. Systemet skelner ikke separat mellem afvist og annulleret endnu.",
  },
];

export default function MyTimeFilterModal({
  open,
  activeFilterCount,
  draftStatusFilters,
  onApply,
  onReset,
  onClose,
  onStatusFilterChange,
}: MyTimeFilterModalProps) {
  return (
    <FilterModal
      open={open}
      title="Filtrer mine timer"
      activeFilterCount={activeFilterCount}
      applyText="Vis timer"
      resetText="Nulstil filter"
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <div className="space-y-5 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Vælg hvilke tidsregistreringer du vil se i den valgte lønperiode.
        </p>

        <div className="space-y-3">
          {statusOptions.map((option) => {
            const checked = draftStatusFilters[option.key];

            return (
              <label
                key={option.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900 ${
                  checked
                    ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                    : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    onStatusFilterChange(option.key, event.target.checked)
                  }
                  className={checkboxClass}
                />
                <span>
                  <span className="block font-medium text-gray-950 dark:text-white">
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-600 dark:text-gray-400">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </FilterModal>
  );
}
