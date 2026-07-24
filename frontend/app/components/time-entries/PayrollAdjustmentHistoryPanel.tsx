"use client";

export type PayrollAdjustmentHistoryItem = {
  id: number;
  type: string;
  status:
    | "PENDING"
    | "INCLUDED"
    | string;
  minutesDelta: number;
  exportedMinutes: number;
  adjustedMinutes: number;
  previousMinutes?:
    number | null;
  newMinutes?: number | null;
  reason: string;
  createdAt: string;
  includedAt?:
    string | null;
  originalPayrollPeriod?: {
    id: number;
    startDate: string;
    endDate: string;
  } | null;
  settlementPayrollPeriod?: {
    id: number;
    startDate: string;
    endDate: string;
  } | null;
  createdByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type Props = {
  items?:
    PayrollAdjustmentHistoryItem[];
  expanded?: boolean;
};

const dateFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Europe/Copenhagen",
    },
  );

const dateTimeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Copenhagen",
    },
  );

function formatSignedMinutes(
  minutesValue: number,
) {
  const sign =
    minutesValue >= 0
      ? "+"
      : "-";
  const absoluteMinutes =
    Math.abs(
      Math.round(minutesValue),
    );
  const hours =
    Math.floor(
      absoluteMinutes / 60,
    );
  const minutes =
    absoluteMinutes % 60;

  return `${sign}${String(
    hours,
  ).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}`;
}

function formatMinutes(
  minutesValue: number,
) {
  const absoluteMinutes =
    Math.abs(
      Math.round(minutesValue),
    );
  const hours =
    Math.floor(
      absoluteMinutes / 60,
    );
  const minutes =
    absoluteMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

function formatReason(
  reason: string,
) {
  switch (reason) {
    case "EDIT_AFTER_EXPORT":
      return "Rettet efter løneksport";
    case "APPROVAL_AFTER_EXPORT":
      return "Godkendt efter løneksport";
    case "UNAPPROVAL_AFTER_EXPORT":
      return "Godkendelse fjernet efter løneksport";
    case "VOID_AFTER_EXPORT":
      return "Afvist efter løneksport";
    case "MANUAL_ENTRY_IN_EXPORTED_PERIOD":
      return "Oprettet i eksporteret lønperiode";
    default:
      return "Efterregulering";
  }
}

function formatPeriod(
  period:
    | PayrollAdjustmentHistoryItem[
        "originalPayrollPeriod"
      ]
    | PayrollAdjustmentHistoryItem[
        "settlementPayrollPeriod"
      ],
) {
  if (!period) {
    return null;
  }

  return `${dateFormatter.format(
    new Date(period.startDate),
  )} – ${dateFormatter.format(
    new Date(period.endDate),
  )}`;
}

function formatActor(
  actor:
    PayrollAdjustmentHistoryItem[
      "createdByUser"
    ],
) {
  if (!actor) {
    return "System";
  }

  const name =
    `${actor.firstName} ${actor.lastName}`.trim();

  return name ||
    actor.email ||
    "System";
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const included =
    status === "INCLUDED";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
        included
          ? "bg-green-200 text-green-950 dark:bg-green-800 dark:text-green-50"
          : "bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50"
      }`}
    >
      {included
        ? "Inkluderet"
        : "Ventende"}
    </span>
  );
}

function HistoryItems({
  items,
}: {
  items:
    PayrollAdjustmentHistoryItem[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const originalPeriod =
          formatPeriod(
            item.originalPayrollPeriod,
          );
        const settlementPeriod =
          formatPeriod(
            item.settlementPayrollPeriod,
          );

        return (
          <article
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={
                      item.status
                    }
                  />
                  <p className="font-semibold text-gray-950 dark:text-white">
                    {formatReason(
                      item.reason,
                    )}
                  </p>
                </div>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Oprettet af{" "}
                  {formatActor(
                    item.createdByUser,
                  )}{" "}
                  ·{" "}
                  {dateTimeFormatter.format(
                    new Date(
                      item.createdAt,
                    ),
                  )}
                </p>
              </div>

              <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {formatSignedMinutes(
                  item.minutesDelta,
                )}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-gray-600 dark:text-gray-300">
                  Timer før og efter
                </dt>
                <dd className="mt-1 text-gray-950 dark:text-white">
                  {formatMinutes(
                    item.exportedMinutes,
                  )}{" "}
                  →{" "}
                  {formatMinutes(
                    item.adjustedMinutes,
                  )}
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-gray-600 dark:text-gray-300">
                  Oprindelig lønperiode
                </dt>
                <dd className="mt-1 text-gray-950 dark:text-white">
                  {originalPeriod ??
                    "-"}
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-gray-600 dark:text-gray-300">
                  Afregningsperiode
                </dt>
                <dd className="mt-1 text-gray-950 dark:text-white">
                  {settlementPeriod ??
                    "Afventer næste åbne lønperiode"}
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-gray-600 dark:text-gray-300">
                  Statusdato
                </dt>
                <dd className="mt-1 text-gray-950 dark:text-white">
                  {item.includedAt
                    ? `Inkluderet ${dateTimeFormatter.format(
                        new Date(
                          item.includedAt,
                        ),
                      )}`
                    : "Afventer inkludering"}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export default function PayrollAdjustmentHistoryPanel({
  items,
  expanded = false,
}: Props) {
  if (!items?.length) {
    return null;
  }

  const pendingCount =
    items.filter(
      (item) =>
        item.status ===
        "PENDING",
    ).length;
  const includedCount =
    items.filter(
      (item) =>
        item.status ===
        "INCLUDED",
    ).length;
  const totalMinutes =
    items.reduce(
      (sum, item) =>
        sum +
        item.minutesDelta,
      0,
    );

  if (expanded) {
    return (
      <section
        aria-labelledby="payroll-adjustment-history-heading"
        className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3
              id="payroll-adjustment-history-heading"
              className="font-bold text-gray-950 dark:text-white"
            >
              Efterreguleringshistorik
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Alle ventende og
              inkluderede ændringer
              efter løneksport.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-200 px-2.5 py-1 text-amber-950 dark:bg-amber-800 dark:text-amber-50">
                {pendingCount} ventende
              </span>
            )}
            {includedCount > 0 && (
              <span className="rounded-full bg-green-200 px-2.5 py-1 text-green-950 dark:bg-green-800 dark:text-green-50">
                {includedCount} inkluderet
              </span>
            )}
            <span className="rounded-full bg-blue-200 px-2.5 py-1 text-blue-950 dark:bg-blue-800 dark:text-blue-50">
              {formatSignedMinutes(
                totalMinutes,
              )}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <HistoryItems
            items={items}
          />
        </div>
      </section>
    );
  }

  return (
    <details className="group rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/20">
      <summary className="flex cursor-pointer list-none flex-col gap-2 rounded-xl p-4 transition hover:bg-blue-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset dark:hover:bg-blue-950/40 dark:focus-visible:ring-blue-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-gray-950 dark:text-white">
            Efterreguleringshistorik
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {items.length} ændring
            {items.length === 1
              ? ""
              : "er"}{" "}
            efter løneksport
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-200 px-2.5 py-1 text-amber-950 dark:bg-amber-800 dark:text-amber-50">
              {pendingCount} ventende
            </span>
          )}
          {includedCount > 0 && (
            <span className="rounded-full bg-green-200 px-2.5 py-1 text-green-950 dark:bg-green-800 dark:text-green-50">
              {includedCount} inkluderet
            </span>
          )}
          <span className="rounded-full bg-blue-200 px-2.5 py-1 text-blue-950 dark:bg-blue-800 dark:text-blue-50">
            {formatSignedMinutes(
              totalMinutes,
            )}
          </span>
        </div>
      </summary>

      <div className="border-t border-blue-200 p-4 dark:border-blue-900">
        <HistoryItems
          items={items}
        />
      </div>
    </details>
  );
}
