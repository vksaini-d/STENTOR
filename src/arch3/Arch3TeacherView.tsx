import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import {
  MicOff,
  Users,
  Loader2,
  LogOut,
  Subtitles,
  Router,
  QrCode,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudioLevel, useLocalMicTrack } from '../hooks/useAudioLevel';
import { AudioBars, AudioLevelMeter, AudioRing, StatusDot, StatusPill } from '../components/AudioVisuals';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ClassroomQrModal, ClassroomQrBadge } from '../components/ClassroomQrModal';

interface Arch3TeacherViewProps {
  token: string;
  wsUrl: string;
  roomName: string;
  onLeave: () => void;
}

export function Arch3TeacherView({ token, wsUrl, roomName, onLeave }: Arch3TeacherViewProps) {
  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={wsUrl}
      connect={true}
      onDisconnected={onLeave}
      className="h-full"
    >
      <Arch3TeacherDashboard roomName={roomName} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function Arch3TeacherDashboard({ roomName, onLeave }: { roomName: string; onLeave: () => void }) {
  const connectionState = useConnectionState();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const micTrack = useLocalMicTrack(room);
  const audioLevel = useAudioLevel(micTrack);

  const studentParticipants = participants.filter((p) => !p.isLocal);
  const studentCount = studentParticipants.length;
  const isConnected = connectionState === ConnectionState.Connected;
  const isLive = isConnected && isMicrophoneEnabled;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showRoster, setShowRoster] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Live Speech Captions
  const { transcript, isListening, isSupported, toggleListening } = useSpeechRecognition();

  // Session timer
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  const toggleMic = useCallback(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 safe-area-inset overflow-y-auto">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white active:scale-95 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>

        <div className="flex items-center gap-2">
          {/* Direct QR Code Trigger */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-brand/15 hover:bg-brand/25 text-brand border border-brand/30 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Show Student Join QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          {isLive && (
            <StatusPill variant="success">
              <StatusDot active />
              {formatTime(elapsedSeconds)}
            </StatusPill>
          )}

          <button
            onClick={() => setShowRoster(!showRoster)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-brand" />
            <span>{studentCount}</span>
            <span className="text-slate-400 font-normal">Attendance</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-3">
        {/* Room & Capacity Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Router className="w-3 h-3" />
            Arch 3 · High Capacity Router (30–100+)
          </div>
          <p className="text-3xl font-black text-brand tracking-[0.3em]">{roomName}</p>
        </div>

        {/* Classroom QR Badge */}
        <div className="w-full max-w-xs mb-5">
          <ClassroomQrBadge
            roomCode={roomName}
            arch="arch3"
            onOpenModal={() => setShowQrModal(true)}
          />
        </div>

        <ClassroomQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          roomCode={roomName}
          arch="arch3"
        />

        {/* Big Mic Button */}
        <div className="relative flex items-center justify-center mb-6">
          {isLive && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-brand ring-pulse" />
              <div className="absolute w-44 h-44 rounded-full bg-brand ring-pulse-delayed" />
            </>
          )}
          {isLive && <AudioRing level={audioLevel} />}

          <button
            onClick={toggleMic}
            disabled={!isConnected}
            className={cn(
              'relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300',
              'active:scale-95 focus:outline-none shadow-2xl',
              !isConnected
                ? 'bg-slate-800 text-slate-500 border-2 border-slate-700 cursor-not-allowed'
                : isLive
                  ? 'bg-gradient-to-b from-brand to-brand-dark text-white shadow-[0_0_60px_rgba(34,197,94,0.35)] border-2 border-emerald-300'
                  : 'bg-surface text-slate-300 border-2 border-slate-600 hover:border-slate-500 hover:text-white'
            )}
          >
            {connectionState === ConnectionState.Connecting ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : isLive ? (
              <AudioBars level={audioLevel} barCount={5} className="h-9" />
            ) : (
              <MicOff className="w-9 h-9" />
            )}

            <span className="text-[10px] font-bold tracking-[0.15em] uppercase mt-2.5 opacity-90">
              {connectionState === ConnectionState.Connecting
                ? 'CONNECTING'
                : isLive
                  ? 'ON AIR'
                  : 'MUTED'}
            </span>
          </button>
        </div>

        {/* Audio Level Meter */}
        <div className="w-3/5 max-w-xs mb-4">
          <AudioLevelMeter level={isLive ? audioLevel : 0} />
        </div>

        {/* ─── Live Speech Captions Card (idea_analysis.md) ─── */}
        <div className="w-full max-w-xs bg-surface/80 border border-slate-800 rounded-2xl p-3.5 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Subtitles className="w-3.5 h-3.5 text-sky-400" />
              Live Speech Captions
            </span>
            {isSupported && (
              <button
                onClick={toggleListening}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                  isListening
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                )}
              >
                {isListening ? '● Captions ON' : 'Turn ON'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded-xl min-h-[36px] italic leading-relaxed border border-slate-800/80">
            {transcript || (isListening ? 'Listening for speech…' : 'Tap Turn ON for real-time speech captions.')}
          </p>
        </div>

        {/* ─── Attendance Roster Modal / Drawer ─── */}
        {showRoster && (
          <div className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-2xl p-3.5 mb-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand" />
                Live Attendance Roster ({studentCount})
              </span>
              <button
                onClick={() => setShowRoster(false)}
                className="text-slate-500 hover:text-white text-[11px]"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {studentParticipants.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">No students joined yet.</p>
              ) : (
                studentParticipants.map((p, idx) => (
                  <div
                    key={p.sid || idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <span className="font-semibold text-slate-300">{p.identity}</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <StatusDot active /> Active
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Info & Router Telemetry ─── */}
      <footer className="px-5 pb-4 space-y-2 shrink-0">
        <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">WiFi Router Mode:</span>
            <span className="text-blue-400 font-bold">Dedicated LAN (OFDMA 5GHz)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">LiveKit SFU:</span>
            <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isConnected ? '● Connected' : '○ Standby'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Classroom Reach:</span>
            <span className="text-slate-300">30–100+ Phones simultaneously</span>
          </div>
        </div>

        <div className="bg-surface/80 rounded-xl p-2.5 border border-slate-800/80 flex items-center gap-2.5">
          <Router className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-[11px] text-slate-400 leading-snug">
            <span className="text-slate-200 font-semibold">Architecture 3:</span> Laptop connected to a classroom router handles high student density without airtime saturation.
          </p>
        </div>
      </footer>
    </div>
  );
}
