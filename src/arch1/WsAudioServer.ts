import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

interface ClientState {
  ws: WebSocket;
  role: 'teacher' | 'student' | null;
  room: string | null;
}

export class WsAudioServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientState> = new Map();
  private rooms: Map<string, Set<WebSocket>> = new Map();

  constructor(serverOrPort: http.Server | number) {
    if (typeof serverOrPort === 'number') {
      this.wss = new WebSocketServer({ port: serverOrPort });
    } else {
      this.wss = new WebSocketServer({ server: serverOrPort });
    }

    this.wss.on('connection', (ws) => {
      this.clients.set(ws, { ws, role: null, room: null });

      ws.on('message', (message, isBinary) => {
        const client = this.clients.get(ws);
        if (!client) return;

        if (isBinary) {
          if (client.role === 'teacher' && client.room) {
            this.broadcastAudio(client.room, message as Buffer, ws);
          }
        } else {
          try {
            const data = JSON.parse(message.toString());
            this.handleMessage(ws, client, data);
          } catch (e) {
            console.error('Failed to parse message', e);
          }
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
      });
    });
    
    console.log('WebSocket Audio Server started.');
  }

  private handleMessage(ws: WebSocket, client: ClientState, data: any) {
    if (data.type === 'join') {
      const { role, room } = data;
      if (role && room) {
        if (client.room) {
          this.leaveRoom(ws, client.room);
        }

        client.role = role;
        client.room = room;
        this.joinRoom(ws, room);

        if (role === 'teacher') {
          this.broadcastToRoom(room, { type: 'teacher-status', active: true });
        }
      }
    } else if (data.type === 'teacher-status' && client.role === 'teacher') {
      this.broadcastToRoom(client.room!, { type: 'teacher-status', active: data.active });
    }
  }

  private joinRoom(ws: WebSocket, room: string) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
    this.broadcastParticipantCount(room);
  }

  private leaveRoom(ws: WebSocket, room: string) {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      } else {
        this.broadcastParticipantCount(room);
      }
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      if (client.room) {
        this.leaveRoom(ws, client.room);
        if (client.role === 'teacher') {
          this.broadcastToRoom(client.room, { type: 'teacher-status', active: false });
        }
      }
      this.clients.delete(ws);
    }
  }

  private broadcastToRoom(room: string, message: any, exclude?: WebSocket) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    const messageStr = JSON.stringify(message);
    for (const clientWs of roomClients) {
      if (clientWs !== exclude && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(messageStr);
      }
    }
  }

  private broadcastAudio(room: string, audioData: Buffer, sender: WebSocket) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    for (const clientWs of roomClients) {
      if (clientWs !== sender && clientWs.readyState === WebSocket.OPEN) {
        const state = this.clients.get(clientWs);
        if (state?.role === 'student') {
          clientWs.send(audioData, { binary: true });
        }
      }
    }
  }

  private broadcastParticipantCount(room: string) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;
    this.broadcastToRoom(room, { type: 'participants', count: roomClients.size });
  }
}
