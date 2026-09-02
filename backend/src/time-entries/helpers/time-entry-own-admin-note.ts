export function resolveOwnTimeEntryAdminNote(
  existingEntry: {
    status: string;
    adminNote?: string | null;
  },
) {
  if (
    existingEntry.status ===
    'NEEDS_CHANGES'
  ) {
    return null;
  }

  return existingEntry.adminNote ?? null;
}
