import { ForbiddenException } from '@nestjs/common';
import {
  markMessageAsRead,
  unarchiveMessageForUser,
} from './message-status-flow';

function createPrismaMock(message: Record<string, unknown>) {
  return {
    message: {
      findUnique: jest.fn().mockResolvedValue(message),
      update: jest.fn(),
    },
  };
}

function createRealtimeMock() {
  return {
    notifyCinema: jest.fn(),
  };
}

describe('message status access', () => {
  it('does not let the sender mark a direct message as read', async () => {
    const prisma = createPrismaMock({
      id: 10,
      cinemaId: 3,
      senderId: 7,
      receiverId: 8,
      isBroadcast: false,
    });

    await expect(
      markMessageAsRead(
        prisma as never,
        createRealtimeMock() as never,
        10,
        7,
        3,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.message.update).not.toHaveBeenCalled();
  });

  it('lets the direct receiver mark the message as read', async () => {
    const updated = {
      id: 10,
      cinemaId: 3,
      senderId: 7,
      receiverId: 8,
      isBroadcast: false,
      isRead: true,
    };
    const prisma = createPrismaMock(updated);
    prisma.message.update.mockResolvedValue(updated);
    const realtime = createRealtimeMock();

    await expect(
      markMessageAsRead(
        prisma as never,
        realtime as never,
        10,
        8,
        3,
      ),
    ).resolves.toBe(updated);

    expect(prisma.message.update).toHaveBeenCalled();
    expect(realtime.notifyCinema).toHaveBeenCalledWith(
      3,
      'messagesUpdated',
      updated,
    );
  });

  it('does not let a broadcast recipient unarchive the global message', async () => {
    const prisma = createPrismaMock({
      id: 11,
      cinemaId: 3,
      senderId: 7,
      receiverId: null,
      isBroadcast: true,
      archivedAt: new Date(),
    });

    await expect(
      unarchiveMessageForUser(
        prisma as never,
        createRealtimeMock() as never,
        11,
        8,
        3,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.message.update).not.toHaveBeenCalled();
  });

  it('lets the sender unarchive a broadcast message', async () => {
    const updated = {
      id: 11,
      cinemaId: 3,
      senderId: 7,
      receiverId: null,
      isBroadcast: true,
      archivedAt: null,
    };
    const prisma = createPrismaMock(updated);
    prisma.message.update.mockResolvedValue(updated);

    await expect(
      unarchiveMessageForUser(
        prisma as never,
        createRealtimeMock() as never,
        11,
        7,
        3,
      ),
    ).resolves.toBe(updated);
  });
});
