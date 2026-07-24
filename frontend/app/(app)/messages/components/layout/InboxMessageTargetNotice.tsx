import type {
  InboxMessageTargetState,
} from "../../helpers/core/inboxMessageTarget";

type Props = {
  state:
    InboxMessageTargetState;
  messageId: number | null;
  onClear: () => void;
};

function getNotice(
  state: InboxMessageTargetState,
  messageId: number | null,
) {
  if (state === "loading") {
    return {
      title: "Finder beskeden",
      description:
        "Beskeden fra notifikationen bliver hentet.",
      tone:
        "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
  }

  if (state === "found") {
    return {
      title: "Beskeden er åbnet",
      description:
        `Besked #${messageId} er fremhævet og markeret som læst.`,
      tone:
        "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
  }

  if (state === "missing") {
    return {
      title: "Beskeden blev ikke fundet",
      description:
        `Besked #${messageId} findes ikke i indbakken. Den kan være arkiveret, slettet eller tilhøre en anden biograf.`,
      tone:
        "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100",
    };
  }

  return {
    title: "Linket til beskeden er ugyldigt",
    description:
      "Besked-ID’et i adressen skal være et positivt heltal.",
    tone:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
  };
}

export default function InboxMessageTargetNotice({
  state,
  messageId,
  onClear,
}: Props) {
  if (state === "idle") {
    return null;
  }

  const notice =
    getNotice(
      state,
      messageId,
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
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-current bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:bg-slate-950/60 dark:hover:bg-slate-950 dark:focus-visible:ring-offset-slate-950"
      >
        Fjern markering
      </button>
    </div>
  );
}
