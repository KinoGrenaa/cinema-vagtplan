type TimeEntryRevisionSnapshotSource = {
  status: string;
  clockIn: Date;
  clockOut: Date | null;
  note: string | null;
  adminNote: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
};

export function createTimeEntryRevisionSnapshot(
  entry: TimeEntryRevisionSnapshotSource,
) {
  return {
    status: entry.status,
    clockIn: entry.clockIn,
    clockOut: entry.clockOut,
    note: entry.note,
    adminNote: entry.adminNote,
  };
}

export function createDetailedTimeEntryRevisionSnapshot(
  entry: TimeEntryRevisionSnapshotSource,
) {
  return {
    status: entry.status,
    clockIn: entry.clockIn,
    clockOut: entry.clockOut,
    note: entry.note,
    clockInNote: entry.clockInNote ?? null,
    clockOutNote: entry.clockOutNote ?? null,
    adminNote: entry.adminNote,
  };
}
