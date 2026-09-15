import type {
  StaffingRequestTargetState,
} from "../../helpers/core/staffingRequestTarget";

type Props = {
  state: StaffingRequestTargetState;
  requestId: number | null;
  onClear: () => void;
};

function getNotice(
  state: StaffingRequestTargetState,
  requestId: number | null,
) {
  if (state === "missing") {
    return {
      title:
        "Bemandingsforesp\u00f8rgslen blev ikke fundet",
      description:
        `Foresp\u00f8rgsel #${requestId} er ikke tilg\u00e6ngelig i den aktive biograf.`,
      tone:
        "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100",
    };
  }

  return {
    title:
      "Linket til bemandingsforesp\u00f8rgslen er ugyldigt",
    description:
      "Foresp\u00f8rgsels-ID'et i adressen skal v\u00e6re et positivt heltal.",
    tone:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
  };
}

export default function StaffingRequestTargetNotice({
  state,
  requestId,
  onClear,
}: Props) {
  if (
    state === "idle" ||
    state === "loading" ||
    state === "found"
  ) {
    return null;
  }

  const notice = getNotice(
    state,
    requestId,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${notice.tone}`}
    >
      <div>
        <p className="font-bold">
          {notice.title}
        </p>
        <p className="mt-1 text-sm">
          {notice.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-current bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:bg-gray-950/60 dark:hover:bg-gray-950 dark:focus-visible:ring-offset-gray-950"
      >
        {"Fjern markering"}
      </button>
    </div>
  );
}
