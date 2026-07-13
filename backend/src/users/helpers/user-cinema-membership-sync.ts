type UserCinemaMembershipClient = {
  userCinemaMembership: {
    upsert: (args: any) => Promise<unknown>;
    updateMany: (args: any) => Promise<unknown>;
  };
};

type SyncPrimaryCinemaMembershipInput = {
  userId: number;
  cinemaId: number | null;
  isActive: boolean;
};

export async function syncPrimaryUserCinemaMembership(
  prisma: UserCinemaMembershipClient,
  {
    userId,
    cinemaId,
    isActive,
  }: SyncPrimaryCinemaMembershipInput,
) {
  if (!cinemaId) {
    await prisma.userCinemaMembership.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return;
  }

  await prisma.userCinemaMembership.upsert({
    where: {
      userId_cinemaId: {
        userId,
        cinemaId,
      },
    },
    create: {
      userId,
      cinemaId,
      isActive,
    },
    update: {
      isActive,
    },
  });
}
