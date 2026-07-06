type ShiftPlanningScheduleDateLink = {
  dateKey: string;
  label: string;
};

type ShiftPlanningScheduleDateLinksProps = {
  dates: ShiftPlanningScheduleDateLink[];
};

export function ShiftPlanningScheduleDateLinks({
  dates,
}: ShiftPlanningScheduleDateLinksProps) {
  if (dates.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Berørte datoer i vagtplanen
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {dates.map((date) => (
          <a
            key={date.dateKey}
            href={`/schedule?date=${date.dateKey}`}
            className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
          >
            {date.label}
          </a>
        ))}
      </div>
    </div>
  );
}
