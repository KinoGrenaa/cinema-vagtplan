"use client";

import BaseModal from "../../modals/BaseModal";

type TimeEntryStatus = string;
type TimeEntryRevisionAction = string;

export type TimeEntryRevision = {
  id: number;
  action: TimeEntryRevisionAction;
  reason?: string | null;
  createdAt: string;

  previousStatus?: TimeEntryStatus | null;
  newStatus?: TimeEntryStatus | null;

  previousClockIn?: string | null;
  newClockIn?: string | null;

  previousClockOut?: string | null;
  newClockOut?: string | null;

  previousClockInNote?: string | null;
  newClockInNote?: string | null;

  previousClockOutNote?: string | null;
  newClockOutNote?: string | null;

  previousAdminNote?: string | null;
  newAdminNote?: string | null;

  changedByUser?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

type TimeEntryHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  revisions: TimeEntryRevision[];
  currentStatus?: TimeEntryStatus | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${pad(date.getDate())}.${pad(
    date.getMonth() + 1,
  )}.${date.getFullYear()} kl. ${formatTime(value)}`;
}

function formatUser(user?: TimeEntryRevision["changedByUser"]) {
  if (!user) return "System";

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email || "System";
}

function statusLabel(status?: TimeEntryStatus | null) {
  switch (status) {
    case "PENDING":
      return "Afventer";
    case "APPROVED":
      return "Godkendt";
    case "NEEDS_CHANGES":
      return "Kræver handling";
    case "VOIDED":
      return "Annulleret";
    default:
      return "-";
  }
}

function actionTitle(action: TimeEntryRevisionAction) {
  switch (action) {
    case "CREATED":
      return "Registrering oprettet";
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
      return "Registrering annulleret";
    default:
      return "Historik";
  }
}

function actorLabel(action: TimeEntryRevisionAction) {
  switch (action) {
    case "CREATED":
      return "Oprettet af";
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
      return "Annulleret af";
    default:
      return "Ændret af";
  }
}

function valueChanged(previousValue?: string | null, newValue?: string | null) {
  return (previousValue || "") !== (newValue || "");
}

function realMessage(revision: TimeEntryRevision) {
  const message = (revision.newAdminNote || revision.reason || "").trim();

  if (!message) return null;

  if (revision.action === "NEEDS_CHANGES" || revision.action === "SENT_BACK") {
    return {
      title: "Besked fra godkender",
      text: message,
      variant: "warning" as const,
    };
  }

  if (revision.action === "VOIDED") {
    return {
      title: "Årsag til annullering",
      text: message,
      variant: "danger" as const,
    };
  }

  return null;
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
      <div className="font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </div>
      <div className="mt-1 text-gray-700 dark:text-gray-300">
        {previousValue} → {newValue}
      </div>
    </div>
  );
}

export default function TimeEntryHistoryModal({
  isOpen,
  onClose,
  revisions,
  currentStatus,
}: TimeEntryHistoryModalProps) {
  const sortedRevisions = [...revisions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const createdRevision = sortedRevisions.find(
    (revision) => revision.action === "CREATED",
  );

  const latestRevision = sortedRevisions[sortedRevisions.length - 1];

  return (
    <BaseModal open={isOpen} onClose={onClose} title="Historik">
      <div className="-mr-2 max-h-[70vh] overflow-y-auto rounded-b-xl pr-2">
        <div className="space-y-4 pb-1">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Oprettet af
                </div>
                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {createdRevision
                    ? formatUser(createdRevision.changedByUser)
                    : "-"}
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  {createdRevision
                    ? formatDateTime(createdRevision.createdAt)
                    : "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Senest ændret
                </div>
                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {latestRevision
                    ? formatUser(latestRevision.changedByUser)
                    : "-"}
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  {latestRevision
                    ? formatDateTime(latestRevision.createdAt)
                    : "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Aktuel status
                </div>
                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {statusLabel(currentStatus || latestRevision?.newStatus)}
                </div>
              </div>
            </div>
          </div>

          {sortedRevisions.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Ingen historik fundet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRevisions.map((revision) => {
                const isCreated = revision.action === "CREATED";
                const message = realMessage(revision);

                return (
                  <div
                    key={revision.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {actionTitle(revision.action)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {actorLabel(revision.action)}:{" "}
                          {formatUser(revision.changedByUser)}
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(revision.createdAt)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {isCreated ? (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            Arbejdstid
                          </div>
                          <div className="mt-1 text-gray-700 dark:text-gray-300">
                            {formatTime(revision.newClockIn)} -{" "}
                            {formatTime(revision.newClockOut)}
                          </div>
                        </div>
                      ) : (
                        <>
                          {revision.previousStatus !== revision.newStatus && (
                            <ChangeRow
                              label="Status"
                              previousValue={statusLabel(
                                revision.previousStatus,
                              )}
                              newValue={statusLabel(revision.newStatus)}
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
                              newValue={formatTime(revision.newClockIn)}
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
                              newValue={formatTime(revision.newClockOut)}
                            />
                          )}

                          {valueChanged(
                            revision.previousClockInNote,
                            revision.newClockInNote,
                          ) && (
                            <ChangeRow
                              label="Mødetidsnote"
                              previousValue={
                                revision.previousClockInNote || "-"
                              }
                              newValue={revision.newClockInNote || "-"}
                            />
                          )}

                          {valueChanged(
                            revision.previousClockOutNote,
                            revision.newClockOutNote,
                          ) && (
                            <ChangeRow
                              label="Fyraftensnote"
                              previousValue={
                                revision.previousClockOutNote || "-"
                              }
                              newValue={revision.newClockOutNote || "-"}
                            />
                          )}
                        </>
                      )}

                      {message && (
                        <div
                          className={
                            message.variant === "danger"
                              ? "rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100"
                              : "rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100"
                          }
                        >
                          <div className="font-semibold">{message.title}</div>
                          <div className="mt-1">{message.text}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
