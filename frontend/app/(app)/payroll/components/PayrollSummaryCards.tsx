import { formatHours } from "../utils";

type PayrollSummaryCardsProps = {
  adjustmentCount: number;
  eveningHours: number;
  nightHours: number;
  overtimeHours: number;
  pendingCount: number;
  totalHours: number;
  voidedCount: number;
  weekendHours: number;
};

export default function PayrollSummaryCards({
  adjustmentCount,
  eveningHours,
  nightHours,
  overtimeHours,
  pendingCount,
  totalHours,
  voidedCount,
  weekendHours,
}: PayrollSummaryCardsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Godkendte timer
        </div>
        <div className="mt-2 text-2xl font-bold">
          {formatHours(totalHours)}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Tæller med i løngrundlaget.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Afventer
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
          {pendingCount}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Skal håndteres før eksport.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Afviste/annullerede
        </div>
        <div className="mt-2 text-2xl font-bold">{voidedCount}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Indgår ikke i løn.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Efterreguleringer
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
          {adjustmentCount}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Medtages separat i lønkørslen.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Tillæg og belastning
        </div>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-3">
            <span>Overtid</span>
            <span className="font-semibold">{formatHours(overtimeHours)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Weekend</span>
            <span className="font-semibold">{formatHours(weekendHours)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Aften</span>
            <span className="font-semibold">{formatHours(eveningHours)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Nat</span>
            <span className="font-semibold">{formatHours(nightHours)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
