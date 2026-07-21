import { BadRequestException } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

describe('MessagesController', () => {
  const actor = {
    sub: 7,
    role: 'EMPLOYEE',
    cinemaId: 3,
  };
  const request = {
    user: actor,
  };
  let service: {
    getUnreadCount: jest.Mock;
    findArchivedForUser: jest.Mock;
    findSentForUser: jest.Mock;
    findAllForUser: jest.Mock;
    create: jest.Mock;
    markAsRead: jest.Mock;
    archiveMessage: jest.Mock;
    unarchiveMessage: jest.Mock;
    recallMessage: jest.Mock;
  };
  let controller: MessagesController;

  beforeEach(() => {
    service = {
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
    controller = new MessagesController(
      service as unknown as MessagesService,
    );
  });

  it('forwards the validated active cinema to inbox reads', () => {
    controller.getMessages(request, '3');

    expect(service.findAllForUser).toHaveBeenCalledWith(actor, 3);
  });

  it('rejects an invalid optional cinema ID', () => {
    expect(() => controller.getMessages(request, 'invalid')).toThrow(
      BadRequestException,
    );
    expect(service.findAllForUser).not.toHaveBeenCalled();
  });

  it('forwards validated message and cinema IDs to status actions', () => {
    controller.markAsRead(request, '41', '3');

    expect(service.markAsRead).toHaveBeenCalledWith(41, actor, 3);
  });

  it.each(['0', '-1', '1.5', 'invalid'])(
    'rejects invalid message ID %s',
    (id) => {
      expect(() => controller.markAsRead(request, id, '3')).toThrow(
        BadRequestException,
      );
      expect(service.markAsRead).not.toHaveBeenCalled();
    },
  );

  it('passes no cinema when the optional query is absent', () => {
    controller.getUnreadCount(request);

    expect(service.getUnreadCount).toHaveBeenCalledWith(actor, undefined);
  });
});
