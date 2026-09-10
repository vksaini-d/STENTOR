# 🎙️ ClassCast — Classroom Audio Streaming Prototype

Stream a teacher's voice to student phones over **local WiFi** — no internet needed.

## Two Architectures Included

| | Architecture 1 (WebSocket) | Architecture 2 (LiveKit) |
|---|---|---|
| **Complexity** | Minimal — no extra server | Needs LiveKit binary |
| **Quality** | Good (Opus via MediaRecorder) | Best (WebRTC SFU) |
| **Max Students** | ~20–30 | 100+ |
| **Latency** | 80–150ms | 25–40ms |
| **Use Case** | Quick demo, phone hotspot | Real classroom deployment |

---

## Prerequisites

1. **Node.js 20+** installed on your laptop
2. **A WiFi network** (phone hotspot or router — no internet needed)
3. **For Architecture 2 only:** [LiveKit Server binary](https://github.com/livekit/livekit/releases) for Windows

---

## Quick Start

### Step 1: Install dependencies
```bash
cd workspace/classcast
npm install
```

### Step 2: Start the ClassCast server
```bash
node server.js
```
This starts:
- **Token API** on port 3001 (for Arch 2)
- **WebSocket Audio Server** on port 3002 (for Arch 1)
- Prints your **local IP address** for phone connections

### Step 3: Start the web app
```bash
npm run dev
```
Frontend runs on port 3000 with `host: 0.0.0.0`.

### Step 4 (Arch 2 only): Start LiveKit
```bash
livekit-server.exe --dev --bind 0.0.0.0
```
> **Windows Firewall:** Allow access for both Public & Private networks when prompted.

---

## How to Test

### On your laptop
1. Open `http://localhost:3000`
2. Select **Architecture 1** or **Architecture 2**
3. Join as **Teacher** — grant mic permission, tap to broadcast

### On student phones
1. Connect to the **same WiFi** network as the laptop
2. Open Chrome → `http://<YOUR_IP>:3000` (IP shown in Terminal)
3. Select the same architecture
4. Join as **Student** — plug in earphones — hear the teacher

---

## Project Structure

```
classcast/
├── server.js                    # Unified server (token API + WebSocket)
├── src/
│   ├── App.tsx                  # Main entry — arch/role selection flow
│   ├── TeacherView.tsx          # Arch 2 teacher (LiveKit publish mic)
│   ├── StudentView.tsx          # Arch 2 student (LiveKit subscribe)
│   ├── arch1/
│   │   ├── WsAudioServer.ts     # WebSocket room/broadcast logic
│   │   ├── useWsAudio.ts        # React hook for WS audio capture/playback
│   │   ├── Arch1TeacherView.tsx  # Arch 1 teacher UI
│   │   └── Arch1StudentView.tsx  # Arch 1 student UI
│   ├── hooks/
│   │   └── useAudioLevel.ts     # Real-time audio level metering (AnalyserNode)
│   ├── components/
│   │   └── AudioVisuals.tsx     # Shared UI: AudioBars, AudioLevelMeter, AudioRing
│   └── lib/
│       └── utils.ts             # Tailwind class merge utility
├── index.html                   # Mobile-optimized HTML
└── vite.config.ts               # Vite + Tailwind v4
```

## Technical Notes

- **Audio Level Visualization** is driven by real Web Audio API `AnalyserNode` — not fake random bars
- **Opus codec** via WebRTC (Arch 2) or MediaRecorder (Arch 1) at ~32kbps
- **No internet** required — everything runs on local network
- **Mobile-first** design with proper viewport, tap highlight suppression, and PWA meta tags
