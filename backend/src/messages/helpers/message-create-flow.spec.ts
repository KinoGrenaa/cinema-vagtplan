import { ForbiddenException } from '@nestjs/common';
import { createMessage } from './message-create-flow';

function createPrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  };
}

function createRealtimeMock() {
  return {
    notifyCinema: jest.fn(),
  };
}

describe('createMessage', () => {
  it('rejects whitespace-only subjects before database access', async () => {
    const prisma = createPrismaMock();

    await expect(
      createMessage(prisma as never, createRealtimeMock() as never, {
        subject: '   ',
        body: 'Indhold',
        receiverId: 9,
        isBroadcast: false,
        cinemaId: 2,
        senderId: 4,
        senderRole: 'EMPLOYEE',
      }),
    ).rejects.toThrow('Emne skal udfyldes.');

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only bodies before database access', async () => {
    const prisma = createPrismaMock();

    await expect(
      createMessage(prisma as never, createRealtimeMock() as never, {
        subject: 'Vagtbytte',
        body: '\n\t ',
        receiverId: 9,
        isBroadcast: false,
        cinemaId: 2,
        senderId: 4,
        senderRole: 'EMPLOYEE',
      }),
    ).rejects.toThrow('Besked skal udfyldes.');

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('trims message text before storing it', async () => {
    const prisma = createPrismaMock();
    const realtime = createRealtimeMock();
    const created = {
      id: 15,
      cinemaId: 2,
      subject: 'Vagtbytte',
      body: 'Kan du tage min vagt?',
    };
    prisma.user.findFirst.mockResolvedValue({ id: 9 });
    prisma.message.create.mockResolvedValue(created);

    await expect(
      createMessage(prisma as never, realtime as never, {
        subject: '  Vagtbytte  ',
        body: '  Kan du tage min vagt?\n',
        receiverId: 9,
        isBroadcast: false,
        cinemaId: 2,
        senderId: 4,
        senderRole: 'EMPLOYEE',
      }),
    ).resolves.toBe(created);

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: 'Vagtbytte',
          body: 'Kan du tage min vagt?',
          receiverId: 9,
        }),
      }),
    );
    expect(realtime.notifyCinema).toHaveBeenCalledWith(
      2,
      'messagesUpdated',
      created,
    );
  });

  it('blocks broadcasts without role or explicit permission', async () => {
    await expect(
      createMessage(
        createPrismaMock() as never,
        createRealtimeMock() as never,
        {
          subject: 'Information',
          body: 'Til alle medarbejdere',
          isBroadcast: true,
          cinemaId: 2,
          senderId: 4,
          senderRole: 'EMPLOYEE',
          senderCanSendBroadcastMessages: false,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects direct messages without a receiver', async () => {
    await expect(
      createMessage(
        createPrismaMock() as never,
        createRealtimeMock() as never,
        {
          subject: 'Spørgsmål',
          body: 'Har du tid?',
          isBroadcast: false,
          cinemaId: 2,
          senderId: 4,
          senderRole: 'EMPLOYEE',
        },
      ),
    ).rejects.toThrow('Vælg en modtager eller send til alle.');
  });
});
