import type {
  TimeApprovalEntryFocusState,
} from "../../helpers/core/timeApprovalEntryTarget";

type Props = {
  state:
    TimeApprovalEntryFocusState;
  entryId: number | null;
  onClear: () => void;
};

function getNoticeContent(
  state:
    TimeApprovalEntryFocusState,
  entryId: number | null,
) {
  if (state === "loading") {
    return {
      title:
        "Finder tidsregistreringen",
      description:
        "Registreringen fra lønoversigten bliver hentet.",
      tone:
        "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
  }

  if (state === "found") {
    return {
      title:
        "Tidsregistreringen er fremhævet",
      description:
        `Registrering #${entryId} vises uanset de normale filtre. Medarbejdergruppen og detaljerne er foldet ud.`,
      tone:
        "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
  }

  if (state === "missing") {
    return {
      title:
        "Tidsregistreringen blev ikke fundet",
      description:
        `Registrering #${entryId} findes ikke i den aktive biograf. Den kan være fjernet eller tilhøre en anden biograf.`,
      tone:
        "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100",
    };
  }

  return {
    title:
      "Linket til tidsregistreringen er ugyldigt",
    description:
      "Registrerings-ID’et i adressen skal være et positivt heltal.",
    tone:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
  };
}

export default function TimeApprovalEntryFocusNotice({
  state,
  entryId,
  onClear,
}: Props) {
  if (state === "idle") {
    return null;
  }

  const content =
    getNoticeContent(
      state,
      entryId,
    );

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${content.tone}`}
    >
      <div>
        <p className="font-bold">
          {content.title}
        </p>
        <p className="mt-1 text-sm">
          {content.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-current bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus-visible:ring-offset-gray-950"
      >
        Fjern markering
      </button>
    </div>
  );
}
