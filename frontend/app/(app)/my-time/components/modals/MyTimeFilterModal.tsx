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
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vælg hvilke tidsregistreringer du vil se i den valgte lønperiode.
        </p>

        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.approved}
              onChange={(event) =>
                onStatusFilterChange("approved", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block font-medium">Godkendte</span>

              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Timer der tæller med i løngrundlaget.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.pending}
              onChange={(event) =>
                onStatusFilterChange("pending", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block font-medium">Afventer godkendelse</span>

              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Timer der endnu ikke er godkendt.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.needsChanges}
              onChange={(event) =>
                onStatusFilterChange("needsChanges", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block font-medium">Skal rettes</span>

              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Registreringer som administrationen har sendt retur til
                rettelse.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <input
              type="checkbox"
              checked={draftStatusFilters.voided}
              onChange={(event) =>
                onStatusFilterChange("voided", event.target.checked)
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block font-medium">Afviste/annullerede</span>

              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Registreringer der ikke indgår i løngrundlaget. Systemet skelner
                ikke separat mellem afvist og annulleret endnu.
              </span>
            </span>
          </label>
        </div>
      </div>
    </FilterModal>
  );
}
