import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { getAllowedCorsOrigins } from '../common/cors-origins';
import { PrismaService } from '../prisma/prisma.service';
import {
  canJoinRealtimeCinema,
  findActiveRealtimeUser,
  RealtimeSocketUser,
} from './realtime-cinema-access';

type RealtimeJwtPayload = {
  sub?: number | string;
  role?: string;
  cinemaId?: number | string | null;
};

const RESERVED_SOCKET_EVENTS = new Set([
  'connect',
  'connect_error',
  'disconnect',
  'disconnecting',
  'newListener',
  'removeListener',
]);

function getSocketToken(client: Socket) {
  const authToken = client.handshake.auth?.token;

  if (
    typeof authToken === 'string' &&
    authToken.trim()
  ) {
    return authToken.trim();
  }

  const authorizationHeader =
    client.handshake.headers.authorization;

  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token] =
    authorizationHeader.split(' ');

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token?.trim()
  ) {
    return null;
  }

  return token.trim();
}

function parsePositiveSafeInteger(
  value: unknown,
) {
  if (
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    return null;
  }

  if (
    typeof value === 'string' &&
    !/^[0-9]+$/.test(value)
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (
    !Number.isSafeInteger(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function requirePositiveSafeInteger(
  value: unknown,
  message: string,
) {
  const numericValue =
    parsePositiveSafeInteger(value);

  if (!numericValue) {
    throw new TypeError(message);
  }

  return numericValue;
}

function normalizeRealtimeEventName(
  value: unknown,
) {
  if (typeof value !== 'string') {
    throw new TypeError(
      'Realtime-event skal være tekst',
    );
  }

  if (
    value !== value.trim() ||
    !/^[A-Za-z][A-Za-z0-9:._-]{0,99}$/.test(
      value,
    ) ||
    RESERVED_SOCKET_EVENTS.has(value)
  ) {
    throw new TypeError(
      'Realtime-event er ugyldigt',
    );
  }

  return value;
}

function getAuthenticatedUser(client: Socket) {
  return (
    client.data as {
      user?: RealtimeSocketUser;
    }
  ).user ?? null;
}

@WebSocketGateway({
  cors: {
    origin: getAllowedCorsOrigins(
      process.env,
      [
        'REALTIME_CORS_ORIGIN',
        'FRONTEND_ORIGIN',
        'BACKEND_CORS_ORIGIN',
        'CORS_ORIGIN',
      ],
    ),
    credentials: true,
  },
})
export class RealtimeGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = getSocketToken(client);
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      console.warn(
        'Rejected unauthenticated realtime client',
      );
      client.disconnect(true);
      return;
    }

    try {
      const payload =
        this.jwtService.verify<RealtimeJwtPayload>(
          token,
          {
            secret: jwtSecret,
          },
        );
      const userId = parsePositiveSafeInteger(
        payload.sub,
      );

      if (!userId) {
        console.warn(
          'Rejected realtime client with invalid token',
        );
        client.disconnect(true);
        return;
      }

      const activeUser =
        await findActiveRealtimeUser(
          this.prisma,
          userId,
        );

      if (!activeUser) {
        console.warn(
          'Rejected inactive realtime user',
        );
        client.disconnect(true);
        return;
      }

      client.data.user = {
        id: activeUser.id,
        role: activeUser.role,
        cinemaId:
          parsePositiveSafeInteger(
            payload.cinemaId,
          ),
      } satisfies RealtimeSocketUser;
    } catch {
      console.warn(
        'Rejected realtime client with invalid token',
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // Der er ingen forbindelsestilstand at rydde op.
  }

  @SubscribeMessage('joinCinema')
  async handleJoinCinema(
    @ConnectedSocket() client: Socket,
    @MessageBody() cinemaId: number,
  ) {
    const user = getAuthenticatedUser(client);
    const numericCinemaId =
      parsePositiveSafeInteger(cinemaId);

    if (!user || !numericCinemaId) {
      return {
        joined: null,
      };
    }

    const canJoin =
      await canJoinRealtimeCinema(
        this.prisma,
        user,
        numericCinemaId,
      );

    if (!canJoin) {
      console.warn(
        'Rejected realtime cinema room join',
      );
      return {
        joined: null,
      };
    }

    const room = `cinema-${numericCinemaId}`;
    await client.join(room);

    return {
      joined: room,
    };
  }

  @SubscribeMessage('leaveCinema')
  async handleLeaveCinema(
    @ConnectedSocket() client: Socket,
    @MessageBody() cinemaId: number,
  ) {
    const user = getAuthenticatedUser(client);
    const numericCinemaId =
      parsePositiveSafeInteger(cinemaId);

    if (!user || !numericCinemaId) {
      return {
        left: null,
      };
    }

    const room = `cinema-${numericCinemaId}`;
    await client.leave(room);

    return {
      left: room,
    };
  }

  @SubscribeMessage('joinUser')
  async handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: number,
  ) {
    const user = getAuthenticatedUser(client);
    const numericUserId =
      parsePositiveSafeInteger(userId);

    if (
      !user ||
      !numericUserId ||
      user.id !== numericUserId
    ) {
      return {
        joined: null,
      };
    }

    const room = `user-${numericUserId}`;
    await client.join(room);

    return {
      joined: room,
    };
  }

  @SubscribeMessage('leaveUser')
  async handleLeaveUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: number,
  ) {
    const user = getAuthenticatedUser(client);
    const numericUserId =
      parsePositiveSafeInteger(userId);

    if (
      !user ||
      !numericUserId ||
      user.id !== numericUserId
    ) {
      return {
        left: null,
      };
    }

    const room = `user-${numericUserId}`;
    await client.leave(room);

    return {
      left: room,
    };
  }

  notifyCinema(
    cinemaId: number,
    event: string,
    data: unknown,
  ) {
    const validCinemaId =
      requirePositiveSafeInteger(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      );
    const validEvent =
      normalizeRealtimeEventName(event);

    this.server
      .to(`cinema-${validCinemaId}`)
      .emit(validEvent, data ?? {});
  }

  notifyUser(
    userId: number,
    event: string,
    data: unknown,
  ) {
    const validUserId =
      requirePositiveSafeInteger(
        userId,
        'Bruger skal være et gyldigt ID',
      );
    const validEvent =
      normalizeRealtimeEventName(event);

    this.server
      .to(`user-${validUserId}`)
      .emit(validEvent, data ?? {});
  }

  notifyAll(event: string, data?: unknown) {
    this.server.emit(
      normalizeRealtimeEventName(event),
      data ?? {},
    );
  }

  notifyStaffingRequestsUpdated(
    cinemaId: number,
  ) {
    this.notifyCinema(
      cinemaId,
      'staffingRequestsUpdated',
      {
        cinemaId,
      },
    );
  }

  notifyStaffingRequestAccepted(
    cinemaId: number,
    requestId: number,
  ) {
    this.notifyCinema(
      cinemaId,
      'staffingRequestAccepted',
      {
        cinemaId,
        requestId:
          requirePositiveSafeInteger(
            requestId,
            'Bemandingsforespørgsel skal være et gyldigt ID',
          ),
      },
    );
  }

  notifyStaffingRequestRejected(
    cinemaId: number,
    requestId: number,
  ) {
    this.notifyCinema(
      cinemaId,
      'staffingRequestRejected',
      {
        cinemaId,
        requestId:
          requirePositiveSafeInteger(
            requestId,
            'Bemandingsforespørgsel skal være et gyldigt ID',
          ),
      },
    );
  }

  notifyStaffingRequestCancelled(
    cinemaId: number,
    requestId: number,
  ) {
    this.notifyCinema(
      cinemaId,
      'staffingRequestCancelled',
      {
        cinemaId,
        requestId:
          requirePositiveSafeInteger(
            requestId,
            'Bemandingsforespørgsel skal være et gyldigt ID',
          ),
      },
    );
  }
}
