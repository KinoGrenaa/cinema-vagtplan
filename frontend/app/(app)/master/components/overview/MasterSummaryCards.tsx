import type { Cinema } from "../../helpers/core/masterTypes";

type MasterSummaryCardsProps = {
  cinemas: Cinema[];
  selectedCinema: Cinema | null;
};

export default function MasterSummaryCards({
  cinemas,
  selectedCinema,
}: MasterSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Biografer
        </div>
        <div className="mt-2 text-3xl font-bold">{cinemas.length}</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Valgt biograf
        </div>
        <div className="mt-2 text-xl font-bold">
          {selectedCinema ? selectedCinema.name : "Ingen valgt"}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Valget gemmes lokalt i denne browser.
        </p>
      </div>
    </div>
  );
}
