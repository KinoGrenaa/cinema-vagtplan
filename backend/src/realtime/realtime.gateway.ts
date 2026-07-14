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

const realtimeCorsOrigins = (
  process.env.REALTIME_CORS_ORIGIN ||
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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

function parsePositiveNumber(
  value: number | string | null | undefined,
) {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
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
    origin: realtimeCorsOrigins,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
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
        `Rejected unauthenticated realtime client: ${client.id}`,
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
      const userId = parsePositiveNumber(payload.sub);

      if (!userId) {
        console.warn(
          `Rejected realtime client with invalid token: ${client.id}`,
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
          `Rejected inactive realtime user: ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      client.data.user = {
        id: activeUser.id,
        role: activeUser.role,
        cinemaId: parsePositiveNumber(
          payload.cinemaId,
        ),
      } satisfies RealtimeSocketUser;

      console.log(`Client connected: ${client.id}`);
    } catch {
      console.warn(
        `Rejected realtime client with invalid token: ${client.id}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinCinema')
  async handleJoinCinema(
    @ConnectedSocket() client: Socket,
    @MessageBody() cinemaId: number,
  ) {
    const user = getAuthenticatedUser(client);
    const numericCinemaId =
      parsePositiveNumber(cinemaId);

    if (!user || !numericCinemaId) {
      return {
        joined: null,
      };
    }

    const canJoin = await canJoinRealtimeCinema(
      this.prisma,
      user,
      numericCinemaId,
    );

    if (!canJoin) {
      console.warn(
        `Rejected realtime cinema room join for client ${client.id}: cinema-${numericCinemaId}`,
      );
      return {
        joined: null,
      };
    }

    const room = `cinema-${numericCinemaId}`;
    await client.join(room);

    console.log(
      `Client ${client.id} joined realtime room ${room}`,
    );

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
      parsePositiveNumber(cinemaId);

    if (!user || !numericCinemaId) {
      return {
        left: null,
      };
    }

    const room = `cinema-${numericCinemaId}`;
    await client.leave(room);

    console.log(
      `Client ${client.id} left realtime room ${room}`,
    );

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
    const numericUserId = parsePositiveNumber(userId);

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

    console.log(
      `Client ${client.id} joined realtime room ${room}`,
    );

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
    const numericUserId = parsePositiveNumber(userId);

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

    console.log(
      `Client ${client.id} left realtime room ${room}`,
    );

    return {
      left: room,
    };
  }

  notifyCinema(
    cinemaId: number,
    event: string,
    data: any,
  ) {
    this.server
      .to(`cinema-${cinemaId}`)
      .emit(event, data);
  }

  notifyUser(
    userId: number,
    event: string,
    data: any,
  ) {
    this.server
      .to(`user-${userId}`)
      .emit(event, data);
  }

  notifyAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  notifyStaffingRequestsUpdated(cinemaId: number) {
    this.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestsUpdated', {
        cinemaId,
      });
  }

  notifyStaffingRequestAccepted(
    cinemaId: number,
    requestId: number,
  ) {
    this.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestAccepted', {
        cinemaId,
        requestId,
      });
  }

  notifyStaffingRequestRejected(
    cinemaId: number,
    requestId: number,
  ) {
    this.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestRejected', {
        cinemaId,
        requestId,
      });
  }

  notifyStaffingRequestCancelled(
    cinemaId: number,
    requestId: number,
  ) {
    this.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestCancelled', {
        cinemaId,
        requestId,
      });
  }
}
