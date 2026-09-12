import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import os from 'os';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static React frontend if dist directory exists (for standalone mobile hosting)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const PORT_HTTP = process.env.PORT || 3001;
const PORT_WS = 3002;
const API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

process.on('SIGTERM', () => {
  process.exit(0);
});

// ─────────────────────────────────────────────
//  Utility: Detect and prioritize Hotspot & Router LAN IPs
// ─────────────────────────────────────────────
function getAllNetworkIps() {
  const interfaces = os.networkInterfaces();
  const found = [];

  for (const name in interfaces) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Exclude virtual adapters like VirtualBox (192.168.56.x)
        if (iface.address.startsWith('192.168.56.')) continue;

        let label = 'LAN / WiFi';
        let type = 'lan';
        if (iface.address.startsWith('192.168.137.')) {
          label = '🔥 Windows Hotspot';
          type = 'hotspot';
        } else if (iface.address.startsWith('192.168.0.') || iface.address.startsWith('192.168.1.')) {
          label = '📡 Dedicated WiFi Router';
          type = 'router';
        } else if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless')) {
          label = 'Wi-Fi Network';
          type = 'wifi';
        } else if (name.toLowerCase().includes('ethernet')) {
          label = 'USB Tethering / Ethernet';
          type = 'ethernet';
        }

        found.push({
          name,
          address: iface.address,
          label,
          type,
          isHotspot: iface.address.startsWith('192.168.137.'),
          isRouter: iface.address.startsWith('192.168.0.') || iface.address.startsWith('192.168.1.'),
        });
      }
    }
  }

  // Sort: Hotspot first, Router second, others after
  found.sort((a, b) => {
    if (a.isHotspot) return -1;
    if (b.isHotspot) return 1;
    if (a.isRouter) return -1;
    if (b.isRouter) return 1;
    return 0;
  });
  return found;
}

// ─────────────────────────────────────────────
//  Network Info Endpoint (For Router / Hotspot Discovery)
// ─────────────────────────────────────────────
app.get('/api/network-info', (req, res) => {
  res.json({
    ips: getAllNetworkIps(),
    serverTime: Date.now(),
    livekitPort: 7880,
    wsPort: PORT_WS,
  });
});

// ─────────────────────────────────────────────
//  Architecture 2 & 3: LiveKit Token Endpoint
// ─────────────────────────────────────────────
app.post('/api/token', async (req, res) => {
  try {
    const { identity, room, isTeacher } = req.body;
    if (!identity || !room) {
      return res.status(400).json({ error: 'Missing identity or room' });
    }

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      name: identity,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: isTeacher === true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ─────────────────────────────────────────────
//  Architecture 1 & 4: WebSocket Audio + Roster + Captions
// ─────────────────────────────────────────────
const clients = new Map();
const rooms = new Map();

function getRoomRoster(room) {
  const roomClients = rooms.get(room);
  if (!roomClients) return [];
  const roster = [];
  for (const ws of roomClients) {
    const c = clients.get(ws);
    if (c) {
      roster.push({
        id: c.id,
        name: c.name || (c.role === 'teacher' ? 'Teacher' : 'Student'),
        role: c.role,
        joinTime: c.joinTime,
      });
    }
  }
  return roster;
}

function broadcastToRoom(room, message, excludeWs) {
  const roomClients = rooms.get(room);
  if (!roomClients) return;
  const str = typeof message === 'string' ? message : JSON.stringify(message);
  for (const ws of roomClients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  }
}

function broadcastAudio(room, data, senderWs) {
  const roomClients = rooms.get(room);
  if (!roomClients) return;
  for (const ws of roomClients) {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      const client = clients.get(ws);
      if (client?.role === 'student') {
        ws.send(data, { binary: true });
      }
    }
  }
}

function updateRosterAndCount(room) {
  const roster = getRoomRoster(room);
  broadcastToRoom(room, {
    type: 'roster',
    count: roster.length,
    participants: roster,
  });
}

function leaveRoom(ws, room) {
  const roomClients = rooms.get(room);
  if (roomClients) {
    roomClients.delete(ws);
    if (roomClients.size === 0) {
      rooms.delete(room);
    } else {
      updateRosterAndCount(room);
    }
  }
}

const wss = new WebSocketServer({ port: PORT_WS, host: '0.0.0.0' });

wss.on('connection', (ws) => {
  const clientId = `client-${Math.random().toString(36).substring(2, 9)}`;
  clients.set(ws, { id: clientId, role: null, room: null, name: null, joinTime: Date.now() });

  ws.on('message', (message, isBinary) => {
    const client = clients.get(ws);
    if (!client) return;

    if (isBinary) {
      // Audio PCM binary data from teacher -> broadcast to students
      if (client.role === 'teacher' && client.room) {
        broadcastAudio(client.room, message, ws);
      }
    } else {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'join' && data.role && data.room) {
          if (client.room) {
            leaveRoom(ws, client.room);
          }
          client.role = data.role;
          client.room = data.room;
          client.name = data.name || (data.role === 'teacher' ? 'Prof. Broadcaster' : `Student #${rosterCount(data.room) + 1}`);
          client.joinTime = Date.now();

          if (!rooms.has(data.room)) {
            rooms.set(data.room, new Set());
          }
          rooms.get(data.room).add(ws);
          updateRosterAndCount(data.room);

          if (data.role === 'teacher') {
            broadcastToRoom(data.room, { type: 'teacher-status', active: true }, ws);
          }
        } else if (data.type === 'teacher-status' && client.role === 'teacher' && client.room) {
          broadcastToRoom(client.room, { type: 'teacher-status', active: data.active }, ws);
        } else if (data.type === 'caption' && client.role === 'teacher' && client.room) {
          // Forward real-time speech-to-text live caption to all students
          broadcastToRoom(client.room, {
            type: 'caption',
            text: data.text,
            isFinal: data.isFinal,
            timestamp: Date.now(),
          }, ws);
        }
      } catch (e) {
        // Ignore malformed JSON
      }
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      if (client.room) {
        if (client.role === 'teacher') {
          broadcastToRoom(client.room, { type: 'teacher-status', active: false }, ws);
        }
        leaveRoom(ws, client.room);
      }
      clients.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err.message);
  });
});

function rosterCount(room) {
  return rooms.get(room)?.size || 0;
}

// SPA Fallback: Any unknown non-API route returns index.html if dist exists
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/arch1-ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─────────────────────────────────────────────
//  Start HTTP Server & Print Instructions
// ─────────────────────────────────────────────
const ips = getAllNetworkIps();
const primaryIp = ips[0]?.address || '127.0.0.1';

const httpServer = http.createServer(app);

// Also attach upgrade handler to the HTTP server for single-port mobile deployments
httpServer.on('upgrade', (request, socket, head) => {
  try {
    const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (parsedUrl.pathname === '/arch1-ws' || parsedUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch {
    socket.destroy();
  }
});

httpServer.listen(PORT_HTTP, '0.0.0.0', () => {
  console.log('\n=============================================================');
  console.log('       🎙️  Stentor Server         ');
  console.log('=============================================================');
  console.log(`\n🚀 HTTP + Static Server listening on port: ${PORT_HTTP}`);
  console.log(`📡 WebSocket Audio Server listening on port: ${PORT_WS} (and /arch1-ws on ${PORT_HTTP})`);


  console.log('\n📱 CONNECT PHONES TO ANY OF THESE ADDRESSES:');
  for (const item of ips) {
    const prefix = item.isHotspot ? '👉 [HOTSPOT]' : item.isRouter ? '📡 [ROUTER] ' : '   [OTHER]  ';
    console.log(`${prefix} http://${item.address}:${PORT_HTTP}  or  https://${item.address}:3000   (${item.label})`);
  }
  console.log('\n📋 AVAILABLE ARCHITECTURES:');
  console.log('  1. Stentor Voice Relay (WebSocket)');
  console.log('  2. Stentor High-Fidelity (WebRTC)');
  console.log('=============================================================\n');
});
