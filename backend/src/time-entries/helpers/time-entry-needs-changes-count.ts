export async function countNeedsChangesTimeEntries(
  prisma: any,
  params: {
    userId: number;
    cinemaId: number;
  },
) {
  return prisma.timeEntry.count({
    where: {
      userId: params.userId,
      cinemaId: params.cinemaId,
      status: 'NEEDS_CHANGES',
    },
  });
}
