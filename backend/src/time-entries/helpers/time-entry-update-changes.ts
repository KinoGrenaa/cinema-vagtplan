type TimeEntryUpdateBase = {
  clockIn: Date;
  clockOut: Date | null;
  clockInNote: string | null;
  clockOutNote: string | null;
  adminNote?: string | null;
  status?: string;
};

type OwnTimeEntryUpdateChangesInput = {
  existingEntry: TimeEntryUpdateBase;
  newClockIn: Date;
  newClockOut: Date | null;
  newClockInNote: string | null;
  newClockOutNote: string | null;
};

type AdminTimeEntryUpdateData = {
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
};

type AdminTimeEntryUpdateChangesInput = {
  existingEntry: TimeEntryUpdateBase;
  nextClockIn: Date;
  nextClockOut: Date | null;
  data: AdminTimeEntryUpdateData;
};

function formatDateTime(value: Date | null) {
  return value ? value.toLocaleString('da-DK') : '-';
}

export function getOwnTimeEntryUpdateChanges({
  existingEntry,
  newClockIn,
  newClockOut,
  newClockInNote,
  newClockOutNote,
}: OwnTimeEntryUpdateChangesInput) {
  const changes: string[] = [];

  if (existingEntry.clockIn.getTime() !== newClockIn.getTime()) {
    changes.push(
      `Mødetid: ${formatDateTime(existingEntry.clockIn)} → ${formatDateTime(
        newClockIn,
      )}`,
    );
  }

  if (
    (existingEntry.clockOut?.getTime() ?? null) !==
    (newClockOut?.getTime() ?? null)
  ) {
    changes.push(
      `Fyraften: ${formatDateTime(existingEntry.clockOut)} → ${formatDateTime(
        newClockOut,
      )}`,
    );
  }

  if ((existingEntry.clockInNote ?? '') !== (newClockInNote ?? '')) {
    changes.push('Mødetidsnote ændret');
  }

  if ((existingEntry.clockOutNote ?? '') !== (newClockOutNote ?? '')) {
    changes.push('Fyraftensnote ændret');
  }

  if (existingEntry.status !== 'PENDING') {
    changes.push(`Status: ${existingEntry.status} → PENDING`);
  }

  return changes;
}

export function getAdminTimeEntryUpdateChanges({
  existingEntry,
  nextClockIn,
  nextClockOut,
  data,
}: AdminTimeEntryUpdateChangesInput) {
  const changes: string[] = [];

  if (existingEntry.clockIn.getTime() !== nextClockIn.getTime()) {
    changes.push(
      `Mødetid ændret fra ${formatDateTime(
        existingEntry.clockIn,
      )} til ${formatDateTime(nextClockIn)}`,
    );
  }

  if (
    (existingEntry.clockOut?.getTime() ?? null) !==
    (nextClockOut?.getTime() ?? null)
  ) {
    changes.push(
      `Fyraften ændret fra ${formatDateTime(
        existingEntry.clockOut,
      )} til ${formatDateTime(nextClockOut)}`,
    );
  }

  if (
    data.clockInNote !== undefined &&
    data.clockInNote !== existingEntry.clockInNote
  ) {
    changes.push(
      `Mødetidsnote ændret fra "${
        existingEntry.clockInNote ?? '-'
      }" til "${data.clockInNote ?? '-'}"`,
    );
  }

  if (
    data.clockOutNote !== undefined &&
    data.clockOutNote !== existingEntry.clockOutNote
  ) {
    changes.push(
      `Fyraftensnote ændret fra "${
        existingEntry.clockOutNote ?? '-'
      }" til "${data.clockOutNote ?? '-'}"`,
    );
  }

  if (data.adminNote !== undefined && data.adminNote !== existingEntry.adminNote) {
    changes.push(
      `Admin-note ændret fra "${existingEntry.adminNote ?? '-'}" til "${
        data.adminNote ?? '-'
      }"`,
    );
  }

  return changes;
}
