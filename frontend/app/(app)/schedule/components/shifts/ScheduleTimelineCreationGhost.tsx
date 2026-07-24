import {
  getScheduleTimelinePreviewStatus,
  type ScheduleTimelineCreationPreview,
} from "../../helpers/derived/scheduleTimelineCreationPreview";

type Props = {
  label: string;
  timeLabel: string;
  color?: string | null;
  preview:
    ScheduleTimelineCreationPreview;
};

function toTranslucentColor(
  value?: string | null,
) {
  if (
    value &&
    /^#[0-9a-f]{6}$/i.test(value)
  ) {
    return `${value}38`;
  }

  if (
    value &&
    /^#[0-9a-f]{3}$/i.test(value)
  ) {
    const red = value[1];
    const green = value[2];
    const blue = value[3];

    return (
      `#${red}${red}` +
      `${green}${green}` +
      `${blue}${blue}38`
    );
  }

  return "rgba(37, 99, 235, 0.22)";
}

function getStatusClasses(
  preview:
    ScheduleTimelineCreationPreview,
) {
  if (
    preview.conflictLevel ===
    "same-work-type"
  ) {
    return "border-red-300 bg-red-100 text-red-950 dark:border-red-700 dark:bg-red-950/80 dark:text-red-100";
  }

  if (
    preview.conflictLevel ===
    "overlap"
  ) {
    return "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100";
  }

  return "border-green-300 bg-green-100 text-green-950 dark:border-green-700 dark:bg-green-950/80 dark:text-green-100";
}

export default function ScheduleTimelineCreationGhost({
  label,
  timeLabel,
  color,
  preview,
}: Props) {
  const status =
    getScheduleTimelinePreviewStatus(
      preview,
    );
  const borderColor =
    color || "#2563eb";

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-20 h-16 min-w-9 overflow-visible rounded-xl border-2 border-dashed shadow-lg backdrop-blur-[1px]"
        style={{
          left:
            `${preview.leftPercent}%`,
          width:
            `${Math.max(
              preview.widthPercent,
              1.5,
            )}%`,
          top: 0,
          borderColor,
          backgroundColor:
            toTranslucentColor(
              color,
            ),
        }}
      >
        <div className="absolute inset-0 rounded-[10px] bg-white/35 dark:bg-gray-950/20" />

        <div className="relative flex h-full min-w-max flex-col justify-center px-3 py-1 text-xs font-bold text-gray-950 dark:text-white">
          <span>
            {label}
          </span>
          <span className="font-semibold">
            {timeLabel}
          </span>
        </div>

        <div
          className={`absolute left-0 top-full mt-2 min-w-max rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-lg ${getStatusClasses(
            preview,
          )}`}
        >
          {status}
          {preview.crossesMidnight
            ? " · Slutter næste dag"
            : ""}
        </div>
      </div>

      <span
        className="sr-only"
        aria-live="polite"
      >
        {label}, {timeLabel}.{" "}
        {status}.
        {preview.crossesMidnight
          ? " Vagten slutter næste dag."
          : ""}
      </span>
    </>
  );
}
