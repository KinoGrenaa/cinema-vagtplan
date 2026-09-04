"use client";

import PayrollAdjustmentHistoryPanel, {
  type PayrollAdjustmentHistoryItem,
} from "../../time-entries/PayrollAdjustmentHistoryPanel";
import BaseModal from "../BaseModal";

type TimeEntryStatus = string;
type TimeEntryRevisionAction =
  string;

export type TimeEntryRevision = {
  id: number;
  action:
    TimeEntryRevisionAction;
  reason?: string | null;
  createdAt: string;
  previousStatus?:
    TimeEntryStatus | null;
  newStatus?:
    TimeEntryStatus | null;
  previousClockIn?:
    string | null;
  newClockIn?: string | null;
  previousClockOut?:
    string | null;
  newClockOut?: string | null;
  previousNote?:
    string | null;
  newNote?: string | null;
  previousClockInNote?:
    string | null;
  newClockInNote?:
    string | null;
  previousClockOutNote?:
    string | null;
  newClockOutNote?:
    string | null;
  previousAdminNote?:
    string | null;
  newAdminNote?:
    string | null;
  changedByUser?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  revisions:
    TimeEntryRevision[];
  currentStatus?:
    TimeEntryStatus | null;
  payrollAdjustments?:
    PayrollAdjustmentHistoryItem[];
};

const timeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Copenhagen",
    },
  );

const dateTimeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Copenhagen",
    },
  );

function formatTime(
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return timeFormatter.format(date);
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return dateTimeFormatter.format(
    date,
  );
}

function formatUser(
  user?:
    TimeEntryRevision[
      "changedByUser"
    ],
) {
  if (!user) {
    return "System";
  }

  const name = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return name ||
    user.email ||
    "System";
}

function statusLabel(
  status?:
    TimeEntryStatus | null,
) {
  switch (status) {
    case "PENDING":
      return "Afventer";
    case "APPROVED":
      return "Godkendt";
    case "NEEDS_CHANGES":
      return "Skal rettes";
    case "VOIDED":
      return "Afvist";
    default:
      return "-";
  }
}

function actionTitle(
  action:
    TimeEntryRevisionAction,
) {
  switch (action) {
    case "CREATED":
      return "Registrering oprettet";
    case "AUTO_CREATED":
      return "Automatisk tidsregistrering";
    case "AUTO_CLOCK_OUT":
      return "Fyraften automatisk udfyldt";
    case "CLOCK_OUT":
      return "Fyraften registreret";
    case "UPDATED":
      return "Registrering rettet";
    case "APPROVED":
      return "Registrering godkendt";
    case "UNAPPROVED":
      return "Godkendelse fjernet";
    case "NEEDS_CHANGES":
    case "SENT_BACK":
      return "Sendt retur til rettelse";
    case "VOIDED":
      return "Registrering afvist";
    default:
      return "Historik";
  }
}

function actorLabel(
  action:
    TimeEntryRevisionAction,
) {
  switch (action) {
    case "CREATED":
    case "AUTO_CREATED":
      return "Oprettet af";
    case "AUTO_CLOCK_OUT":
      return "Udfyldt af";
    case "CLOCK_OUT":
      return "Registreret af";
    case "UPDATED":
      return "Rettet af";
    case "APPROVED":
      return "Godkendt af";
    case "UNAPPROVED":
      return "Godkendelse fjernet af";
    case "NEEDS_CHANGES":
    case "SENT_BACK":
      return "Sendt retur af";
    case "VOIDED":
      return "Afvist af";
    default:
      return "Ændret af";
  }
}

function valueChanged(
  previousValue?:
    string | null,
  newValue?: string | null,
) {
  return (
    (previousValue || "") !==
    (newValue || "")
  );
}

function normalizeHistoryNote(
  value?: string | null,
) {
  return value?.trim() || "";
}

function buildDerivedClockNote(
  clockInNote?: string | null,
  clockOutNote?: string | null,
) {
  const meetingNote =
    normalizeHistoryNote(
      clockInNote,
    );
  const finishNote =
    normalizeHistoryNote(
      clockOutNote,
    );

  return [
    meetingNote || null,
    finishNote
      ? `Fyraften: ${finishNote}`
      : null,
  ]
    .filter(
      (note): note is string =>
        Boolean(note),
    )
    .join("\n\n");
}

function isDerivedClockNoteChange(
  revision:
    TimeEntryRevision,
) {
  const specificNoteChanged =
    valueChanged(
      revision.previousClockInNote,
      revision.newClockInNote,
    ) ||
    valueChanged(
      revision.previousClockOutNote,
      revision.newClockOutNote,
    );

  if (!specificNoteChanged) {
    return false;
  }

  return (
    normalizeHistoryNote(
      revision.previousNote,
    ) ===
      buildDerivedClockNote(
        revision.previousClockInNote,
        revision.previousClockOutNote,
      ) &&
    normalizeHistoryNote(
      revision.newNote,
    ) ===
      buildDerivedClockNote(
        revision.newClockInNote,
        revision.newClockOutNote,
      )
  );
}

function realMessage(
  revision:
    TimeEntryRevision,
) {
  const message =
    (
      revision.newAdminNote ||
      revision.reason ||
      ""
    ).trim();

  if (!message) {
    return null;
  }

  if (
    revision.action ===
      "UPDATED"
  ) {
    if (
      revision.previousStatus ===
        "NEEDS_CHANGES" &&
      revision.newStatus ===
        "PENDING"
    ) {
      return null;
    }

    return {
      title:
        "Note om rettelsen",
      text: message,
      variant: "warning" as const,
    };
  }

  if (
    revision.action ===
      "NEEDS_CHANGES" ||
    revision.action ===
      "SENT_BACK"
  ) {
    return {
      title: `Besked fra ${formatUser(
        revision.changedByUser,
      )}`,
      text: message,
      variant: "warning" as const,
    };
  }

  if (
    revision.action ===
    "VOIDED"
  ) {
    return {
      title:
        "Årsag til afvisning",
      text: message,
      variant: "danger" as const,
    };
  }

  return null;
}

function revisionStartsExpanded(
  action:
    TimeEntryRevisionAction,
) {
  return (
    action === "NEEDS_CHANGES" ||
    action === "SENT_BACK" ||
    action === "VOIDED"
  );
}

function ChangeRow({
  label,
  previousValue,
  newValue,
}: {
  label: string;
  previousValue: string;
  newValue: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
      <p className="font-semibold text-gray-600 dark:text-gray-300">
        {label}
      </p>
      <p className="mt-1 text-gray-950 dark:text-white">
        {previousValue} →{" "}
        {newValue}
      </p>
    </div>
  );
}

export default function TimeEntryHistoryModal({
  isOpen,
  onClose,
  revisions,
  currentStatus,
  payrollAdjustments,
}: Props) {
  const sortedRevisions = [
    ...revisions,
  ].sort(
    (first, second) =>
      new Date(
        first.createdAt,
      ).getTime() -
      new Date(
        second.createdAt,
      ).getTime(),
  );
  const createdRevision =
    sortedRevisions.find(
      (revision) =>
        revision.action ===
          "CREATED" ||
        revision.action ===
          "AUTO_CREATED",
    );
  const latestRevision =
    sortedRevisions[
      sortedRevisions.length - 1
    ];

  return (
    <BaseModal
      open={isOpen}
      title="Historik"
      onClose={onClose}
      width="xl"
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Oprettet af
            </p>
            <p className="mt-1 font-medium text-gray-950 dark:text-white">
              {createdRevision
                ? formatUser(
                    createdRevision.changedByUser,
                  )
                : "-"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {createdRevision
                ? formatDateTime(
                    createdRevision.createdAt,
                  )
                : "-"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Senest ændret
            </p>
            <p className="mt-1 font-medium text-gray-950 dark:text-white">
              {latestRevision
                ? formatUser(
                    latestRevision.changedByUser,
                  )
                : "-"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {latestRevision
                ? formatDateTime(
                    latestRevision.createdAt,
                  )
                : "-"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Aktuel status
            </p>
            <p className="mt-1 font-medium text-gray-950 dark:text-white">
              {statusLabel(
                currentStatus ||
                  latestRevision?.newStatus,
              )}
            </p>
          </div>
        </div>

        <PayrollAdjustmentHistoryPanel
          items={
            payrollAdjustments
          }
          expanded
        />

        <section
          aria-labelledby="time-entry-revision-history-heading"
        >
          <h3
            id="time-entry-revision-history-heading"
            className="text-lg font-bold text-gray-950 dark:text-white"
          >
            Registreringshistorik
          </h3>

          {sortedRevisions.length ===
          0 ? (
            <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Ingen historik fundet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedRevisions.map(
                (revision) => {
                  const isCreated =
                    revision.action ===
                      "CREATED" ||
                    revision.action ===
                      "AUTO_CREATED";
                  const message =
                    realMessage(
                      revision,
                    );
                  const startsExpanded =
                    revisionStartsExpanded(
                      revision.action,
                    );

                  return (
                    <details
                      key={
                        revision.id
                      }
                      open={
                        startsExpanded
                      }
                      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 outline-none transition hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/20 dark:hover:bg-gray-800/60 dark:focus-visible:ring-blue-400/25 [&::-webkit-details-marker]:hidden sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-gray-950 dark:text-white">
                            {actionTitle(
                              revision.action,
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {actorLabel(
                              revision.action,
                            )}
                            :{" "}
                            {formatUser(
                              revision.changedByUser,
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 sm:ml-4">
                          <time className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {formatDateTime(
                              revision.createdAt,
                            )}
                          </time>

                          <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            <span className="group-open:hidden">
                              Vis detaljer
                            </span>
                            <span className="hidden group-open:inline">
                              Skjul detaljer
                            </span>
                            <span
                              aria-hidden="true"
                              className="text-sm transition-transform group-open:rotate-180"
                            >
                              ▾
                            </span>
                          </span>
                        </div>
                      </summary>

                      <div className="border-t border-gray-200 px-4 pb-4 dark:border-gray-700">
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {isCreated ? (
                            <>
                              <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                                <p className="font-semibold text-gray-600 dark:text-gray-300">
                                  Arbejdstid
                                </p>
                                <p className="mt-1 text-gray-950 dark:text-white">
                                  {formatTime(
                                    revision.newClockIn,
                                  )}{" "}
                                  –{" "}
                                  {formatTime(
                                    revision.newClockOut,
                                  )}
                                </p>
                              </div>
                              {revision.newNote &&
                                revision.newNote.trim() && (
                                  <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                                    <p className="font-semibold text-gray-600 dark:text-gray-300">
                                      Note / begrundelse
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-gray-950 dark:text-white">
                                      {revision.newNote}
                                    </p>
                                  </div>
                                )}
                            </>
                          ) : (
                            <>
                              {revision.previousStatus !==
                                revision.newStatus && (
                                <ChangeRow
                                  label="Status"
                                  previousValue={statusLabel(
                                    revision.previousStatus,
                                  )}
                                  newValue={statusLabel(
                                    revision.newStatus,
                                  )}
                                />
                              )}

                              {valueChanged(
                                revision.previousClockIn,
                                revision.newClockIn,
                              ) && (
                                <ChangeRow
                                  label="Mødetid"
                                  previousValue={formatTime(
                                    revision.previousClockIn,
                                  )}
                                  newValue={formatTime(
                                    revision.newClockIn,
                                  )}
                                />
                              )}

                              {valueChanged(
                                revision.previousClockOut,
                                revision.newClockOut,
                              ) && (
                                <ChangeRow
                                  label="Fyraften"
                                  previousValue={formatTime(
                                    revision.previousClockOut,
                                  )}
                                  newValue={formatTime(
                                    revision.newClockOut,
                                  )}
                                />
                              )}

                              {valueChanged(
                                revision.previousNote,
                                revision.newNote,
                              ) &&
                                !isDerivedClockNoteChange(
                                  revision,
                                ) && (
                                <ChangeRow
                                  label="Note / begrundelse"
                                  previousValue={
                                    revision.previousNote ||
                                    "-"
                                  }
                                  newValue={
                                    revision.newNote ||
                                    "-"
                                  }
                                />
                              )}
                              {valueChanged(
                                revision.previousClockInNote,
                                revision.newClockInNote,
                              ) && (
                                <ChangeRow
                                  label="Note ved mødetid"
                                  previousValue={
                                    revision.previousClockInNote ||
                                    "-"
                                  }
                                  newValue={
                                    revision.newClockInNote ||
                                    "-"
                                  }
                                />
                              )}

                              {valueChanged(
                                revision.previousClockOutNote,
                                revision.newClockOutNote,
                              ) && (
                                <ChangeRow
                                  label="Note ved fyraften"
                                  previousValue={
                                    revision.previousClockOutNote ||
                                    "-"
                                  }
                                  newValue={
                                    revision.newClockOutNote ||
                                    "-"
                                  }
                                />
                              )}
                            </>
                          )}
                        </div>

                        {message && (
                          <div
                            className={`mt-4 rounded-lg border p-3 text-sm ${
                              message.variant ===
                              "danger"
                                ? "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100"
                                : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
                            }`}
                          >
                            <p className="font-semibold">
                              {message.title}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">
                              {message.text}
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </BaseModal>
  );
}
