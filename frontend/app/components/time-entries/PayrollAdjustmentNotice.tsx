export type PayrollAdjustmentNoticeItem = {
  id: number;
  minutesDelta: number;
  reason?: string | null;
  createdAt?: string;
};

type PayrollAdjustmentNoticeProps = {
  adjustments?: PayrollAdjustmentNoticeItem[];
  audience: "manager" | "employee";
};

function formatSignedMinutesAsTime(
  minutesValue: number,
) {
  const sign = minutesValue >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(
    Math.round(minutesValue),
  );
  const hours = Math.floor(
    absoluteMinutes / 60,
  );
  const minutes = absoluteMinutes % 60;

  return `${sign}${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(2, "0")}`;
}

function formatAdjustmentReason(
  reason?: string | null,
) {
  switch (reason) {
    case "EDIT_AFTER_EXPORT":
      return "Rettet efter løneksport";
    case "APPROVAL_AFTER_EXPORT":
      return "Godkendt efter løneksport";
    case "UNAPPROVAL_AFTER_EXPORT":
      return "Godkendelse fjernet efter løneksport";
    case "VOID_AFTER_EXPORT":
      return "Annulleret efter løneksport";
    case "MANUAL_ENTRY_IN_EXPORTED_PERIOD":
      return "Oprettet i en eksporteret lønperiode";
    default:
      return "Ændret efter løneksport";
  }
}

export default function PayrollAdjustmentNotice({
  adjustments,
  audience,
}: PayrollAdjustmentNoticeProps) {
  if (!adjustments?.length) {
    return null;
  }

  const totalMinutes = adjustments.reduce(
    (sum, adjustment) =>
      sum + adjustment.minutesDelta,
    0,
  );
  const reasons = Array.from(
    new Set(
      adjustments.map((adjustment) =>
        formatAdjustmentReason(
          adjustment.reason,
        ),
      ),
    ),
  );

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">
          Efterregulering fra eksporteret
          lønperiode
        </div>
        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
          {formatSignedMinutesAsTime(
            totalMinutes,
          )}
        </span>
      </div>

      <p className="mt-2 leading-relaxed">
        {audience === "manager"
          ? "Denne registrering er allerede ændret efter en løneksport. Timeforskellen føres som efterregulering, og nye ændringer kan kræve en ekstra bekræftelse."
          : "Denne registrering er ændret efter en løneksport. Timeforskellen bliver medtaget som efterregulering i en kommende lønkørsel."}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-medium dark:border-amber-800 dark:bg-gray-950/40"
          >
            {reason}
          </span>
        ))}
        {adjustments.length > 1 && (
          <span className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-medium dark:border-amber-800 dark:bg-gray-950/40">
            {adjustments.length} efterreguleringer
          </span>
        )}
      </div>
    </div>
  );
}
