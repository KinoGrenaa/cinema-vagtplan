import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let server: {
    emit: jest.Mock;
    to: jest.Mock;
  };
  let roomEmitter: {
    emit: jest.Mock;
  };

  beforeEach(() => {
    roomEmitter = {
      emit: jest.fn(),
    };
    server = {
      emit: jest.fn(),
      to: jest
        .fn()
        .mockReturnValue(roomEmitter),
    };

    gateway = new RealtimeGateway(
      {
        verify: jest.fn(),
      } as never,
      {} as never,
    );
    gateway.server = server as never;
  });

  it('emits a valid global event and preserves falsey payloads', () => {
    gateway.notifyAll(
      'schedule:updated',
      false,
    );

    expect(server.emit).toHaveBeenCalledWith(
      'schedule:updated',
      false,
    );
  });

  it('uses an empty object only when payload is omitted', () => {
    gateway.notifyAll('schedule.updated');

    expect(server.emit).toHaveBeenCalledWith(
      'schedule.updated',
      {},
    );
  });

  it('emits a cinema-scoped event', () => {
    gateway.notifyCinema(
      3,
      'shiftsUpdated',
      {
        id: 8,
      },
    );

    expect(server.to).toHaveBeenCalledWith(
      'cinema-3',
    );
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      'shiftsUpdated',
      {
        id: 8,
      },
    );
  });

  it('emits a user-scoped event', () => {
    gateway.notifyUser(
      7,
      'notificationsUpdated',
      {
        unread: 2,
      },
    );

    expect(server.to).toHaveBeenCalledWith(
      'user-7',
    );
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      'notificationsUpdated',
      {
        unread: 2,
      },
    );
  });

  it('preserves all staffing convenience methods', () => {
    gateway.notifyStaffingRequestsUpdated(3);
    gateway.notifyStaffingRequestAccepted(3, 8);
    gateway.notifyStaffingRequestRejected(3, 9);
    gateway.notifyStaffingRequestCancelled(3, 10);

    expect(roomEmitter.emit).toHaveBeenCalledTimes(
      4,
    );
    expect(roomEmitter.emit).toHaveBeenNthCalledWith(
      1,
      'staffingRequestsUpdated',
      {
        cinemaId: 3,
      },
    );
    expect(roomEmitter.emit).toHaveBeenNthCalledWith(
      2,
      'staffingRequestAccepted',
      {
        cinemaId: 3,
        requestId: 8,
      },
    );
  });

  it.each([
    '',
    ' event',
    'event ',
    'event name',
    '1event',
    'event/path',
    'disconnect',
    'connect',
    'x'.repeat(101),
  ])('rejects invalid event name %p', (event) => {
    expect(() =>
      gateway.notifyAll(event, {}),
    ).toThrow(TypeError);
    expect(server.emit).not.toHaveBeenCalled();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid cinema ID %p', (cinemaId) => {
    expect(() =>
      gateway.notifyCinema(
        cinemaId,
        'shiftsUpdated',
        {},
      ),
    ).toThrow(TypeError);
    expect(server.to).not.toHaveBeenCalled();
  });

  it('does not log socket identifiers on disconnect', () => {
    expect(() =>
      gateway.handleDisconnect({
        id: 'socket-1',
      } as never),
    ).not.toThrow();
  });
});
