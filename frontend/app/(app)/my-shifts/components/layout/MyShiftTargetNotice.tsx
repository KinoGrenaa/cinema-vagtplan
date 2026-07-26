import type {
  MyShiftTargetState,
} from "../../helpers/core/myShiftTarget";

type Props = {
  state:
    MyShiftTargetState;
  shiftId: number | null;
  onClear: () => void;
};

function getNotice(
  state: MyShiftTargetState,
  shiftId: number | null,
) {
  if (state === "loading") {
    return {
      title: "Finder vagten",
      description:
        "Vagten fra push-notifikationen bliver hentet.",
      tone:
        "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
  }

  if (state === "found") {
    return {
      title: "Vagten er fremhævet",
      description:
        `Vagt #${shiftId} vises i den korrekte måned og er scrolllet ind i visningen.`,
      tone:
        "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
  }

  if (state === "missing") {
    return {
      title: "Vagten blev ikke fundet",
      description:
        `Vagt #${shiftId} er ikke længere tildelt dig i den aktive biograf. Den kan være flyttet eller slettet.`,
      tone:
        "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100",
    };
  }

  return {
    title: "Linket til vagten er ugyldigt",
    description:
      "Vagt-ID’et i adressen skal være et positivt heltal.",
    tone:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
  };
}

export default function MyShiftTargetNotice({
  state,
  shiftId,
  onClear,
}: Props) {
  if (state === "idle") {
    return null;
  }

  const notice =
    getNotice(
      state,
      shiftId,
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
        Fjern markering
      </button>
    </div>
  );
}
