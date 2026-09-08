export const MESSAGE_DELETION_RETENTION_DAYS = 60;

const MESSAGE_DELETION_RETENTION_MS =
  MESSAGE_DELETION_RETENTION_DAYS *
  24 *
  60 *
  60 *
  1000;

export function getMessageDeletionCutoff(
  now: Date = new Date(),
) {
  return new Date(
    now.getTime() -
      MESSAGE_DELETION_RETENTION_MS,
  );
}

export function isMessageDeletionExpired(
  deletedAt: Date | null | undefined,
  now: Date = new Date(),
) {
  if (!deletedAt) return false;

  return (
    deletedAt.getTime() <=
    getMessageDeletionCutoff(
      now,
    ).getTime()
  );
}
