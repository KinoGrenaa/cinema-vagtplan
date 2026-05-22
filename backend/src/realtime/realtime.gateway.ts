import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinCinema')
  handleJoinCinema(
    @ConnectedSocket() client: Socket,
    @MessageBody() cinemaId: number,
  ) {
    const room = `cinema-${cinemaId}`;

    client.join(room);

    console.log(`Client ${client.id} joined realtime room ${room}`);

    return {
      joined: room,
    };
  }

  @SubscribeMessage('leaveCinema')
  handleLeaveCinema(
    @ConnectedSocket() client: Socket,
    @MessageBody() cinemaId: number,
  ) {
    const room = `cinema-${cinemaId}`;

    client.leave(room);

    console.log(`Client ${client.id} left realtime room ${room}`);

    return {
      left: room,
    };
  }

  notifyCinema(cinemaId: number, event: string, data: any) {
    this.server.to(`cinema-${cinemaId}`).emit(event, data);
  }

  notifyUser(userId: number, event: string, data: any) {
    this.server.to(`user-${userId}`).emit(event, data);
  }

  notifyAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
