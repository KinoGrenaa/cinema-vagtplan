import type { TimeEntry } from "../../types";

type TimeApprovalEntryNotesProps = {
  entry: TimeEntry;
};

export default function TimeApprovalEntryNotes({
  entry,
}: TimeApprovalEntryNotesProps) {
  const hasEmployeeNote = Boolean(
    entry.clockInNote || entry.clockOutNote || entry.note,
  );

  return (
    <>
      {hasEmployeeNote && (
        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
          {!entry.shift &&
          (entry.note ||
            (entry.clockInNote &&
              entry.clockInNote === entry.clockOutNote)) ? (
            <div>
              <span className="font-semibold">Note:</span>{" "}
              {entry.note || entry.clockInNote}
            </div>
          ) : (
            <>
              {entry.clockInNote && (
                <div>
                  <span className="font-semibold">Mødetidsnote:</span>{" "}
                  {entry.clockInNote}
                </div>
              )}
              {entry.clockOutNote && (
                <div>
                  <span className="font-semibold">Fyraftensnote:</span>{" "}
                  {entry.clockOutNote}
                </div>
              )}
            </>
          )}
          {!entry.clockInNote && !entry.clockOutNote && entry.note && (
            <div>
              <span className="font-semibold">Medarbejder note:</span>{" "}
              {entry.note}
            </div>
          )}
        </div>
      )}
      {entry.adminNote && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/40">
          <span className="font-semibold">Admin note:</span> {entry.adminNote}
        </div>
      )}
    </>
  );
}
