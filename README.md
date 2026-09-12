# 🎙️ Stentor — The Voice of Fifty

Stream a teacher's voice to student phones over **local WiFi** — no internet needed.

## Architectures Included

| | Stentor Voice Relay (Arch 1) | LiveKit SFU (Arch 2/3) |
|---|---|---|
| **Complexity** | Minimal — no extra server | Needs LiveKit binary |
| **Quality** | Excellent (Custom PCM WebSocket) | Best (WebRTC SFU) |
| **Max Students** | ~20–30 | 100+ |
| **Latency** | ~100ms | 25–40ms |
| **Use Case** | Quick demo, phone hotspot | Real classroom deployment |

---

## Prerequisites

1. **Node.js 20+** installed on your laptop
2. **A WiFi network** (phone hotspot or router — no internet needed)
3. **mkcert** (for trusted local HTTPS certs)
4. **For Arch 2/3 only:** [LiveKit Server binary](https://github.com/livekit/livekit/releases) for Windows

---

## Quick Start

### Step 1: Install dependencies & create certificates
```bash
npm install
mkdir .cert
mkcert -install
mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem localhost 127.0.0.1 192.168.137.1
```

### Step 2: Start the Stentor server
```bash
node server.js
```
This starts:
- **Token API** on port 3001
- **WebSocket Audio Server** on port 3002
- Prints your **local IP address** for phone connections

### Step 3: Start the web app
```bash
npm run dev
```
Frontend runs on port 3000 (HTTPS enabled).

### Step 4 (LiveKit only): Start LiveKit
```bash
livekit-server.exe --dev --bind 0.0.0.0
```

---

## How to Test

### On your laptop
1. Open `https://localhost:3000`
2. Select **Stentor Voice Relay**
3. Join as **Teacher** — grant mic permission, tap to broadcast

### On student phones
1. Connect to the **same WiFi** network as the laptop
2. Scan the Teacher's QR code or open Chrome → `https://<YOUR_IP>:3000`
3. Join as **Student** — plug in earphones — hear the teacher

---

## Technical Notes

- **Real-Time FFT Visualizer**: Driven by `AnalyserNode` frequency data
- **Custom DSP**: Real-time noise gating, anti-echo cancellation, and dynamic compression
- **No internet** required — everything runs on local network
- **PWA Ready**: Supports installation as a native-like app on Android/iOS
