type AutomaticTimeRegistrationNoticeProps = {
  automaticClockIn?: boolean;
  automaticClockOut?: boolean;
  compact?: boolean;
};

export default function AutomaticTimeRegistrationNotice({
  automaticClockIn,
  automaticClockOut,
  compact = false,
}: AutomaticTimeRegistrationNoticeProps) {
  if (
    !automaticClockIn &&
    !automaticClockOut
  ) {
    return null;
  }

  let description =
    "Systemet har udfyldt denne tidsregistrering automatisk.";

  if (
    automaticClockIn &&
    automaticClockOut
  ) {
    description =
      "M\u00f8detid og fyraften er automatisk udfyldt ud fra biografens indstillinger.";
  } else if (automaticClockIn) {
    description =
      "M\u00f8detiden er automatisk udfyldt ud fra biografens indstillinger.";
  } else if (automaticClockOut) {
    description =
      "Fyraften er automatisk udfyldt ud fra biografens indstillinger.";
  }

  return (
    <div
      role="status"
      className={`rounded-xl border border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100 ${
        compact
          ? "px-3 py-2 text-xs"
          : "mt-4 p-3 text-sm"
      }`}
    >
      <span className="font-semibold">
        Automatisk udfyldt
      </span>
      <span className="ml-1">
        {description}
      </span>
    </div>
  );
}
