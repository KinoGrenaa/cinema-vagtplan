export function buildReadNotificationDeleteWhere(
  userId: number,
  cinemaId: number,
) {
  return {
    userId,
    cinemaId,
    isRead: true,
  };
}
