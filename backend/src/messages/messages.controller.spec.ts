import { BadRequestException } from '@nestjs/common';
import { MessagesController } from './messages.controller';

describe('MessagesController', () => {
  const service = {
    getUnreadCount: jest.fn(),
    findArchivedForUser: jest.fn(),
    findSentForUser: jest.fn(),
    findAllForUser: jest.fn(),
    create: jest.fn(),
    markAsRead: jest.fn(),
    archiveMessage: jest.fn(),
    unarchiveMessage: jest.fn(),
    recallMessage: jest.fn(),
  };
  const controller =
    new MessagesController(
      service as never,
    );
  const req = {
    user: {
      sub: 7,
      role: 'EMPLOYEE',
      cinemaId: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+8',
    ' 8',
    '8 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt besked-ID %p',
    (id) => {
      expect(() =>
        controller.markAsRead(
          req,
          id,
          '2',
        ),
      ).toThrow(BadRequestException);

      expect(
        service.markAsRead,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '2.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.getMessages(
          req,
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAllForUser,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender valideret beskedoprettelse', () => {
    const body = {
      subject: 'Information',
      content: 'Testbesked',
      recipientIds: [8],
    };

    controller.createMessage(
      req,
      body as never,
      '2',
    );

    expect(
      service.create,
    ).toHaveBeenCalledWith(
      req.user,
      body,
      2,
    );
  });

  it('videresender valideret læst-status', () => {
    controller.markAsRead(
      req,
      '8',
      '2',
    );

    expect(
      service.markAsRead,
    ).toHaveBeenCalledWith(
      8,
      req.user,
      2,
    );
  });

  it('bevarer udeladt biograf som udeladt', () => {
    controller.getUnreadCount(
      req,
      undefined,
    );

    expect(
      service.getUnreadCount,
    ).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });

  it('bruger samme grænser på arkivhandlinger', () => {
    controller.archiveMessage(
      req,
      '8',
      '2',
    );
    controller.unarchiveMessage(
      req,
      '8',
      '2',
    );
    controller.recallMessage(
      req,
      '8',
      '2',
    );

    expect(
      service.archiveMessage,
    ).toHaveBeenCalledWith(
      8,
      req.user,
      2,
    );
    expect(
      service.unarchiveMessage,
    ).toHaveBeenCalledWith(
      8,
      req.user,
      2,
    );
    expect(
      service.recallMessage,
    ).toHaveBeenCalledWith(
      8,
      req.user,
      2,
    );
  });
});
