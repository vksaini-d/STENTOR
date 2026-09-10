import { useCallback, useEffect, useState } from 'react';
import {
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MicOff, Users, Wifi, WifiOff, Loader2, LogOut, QrCode } from 'lucide-react';
import { cn } from './lib/utils';
import { useAudioLevel, useLocalMicTrack } from './hooks/useAudioLevel';
import { AudioBars, AudioLevelMeter, AudioRing, StatusDot, StatusPill } from './components/AudioVisuals';
import { ClassroomQrModal, ClassroomQrBadge } from './components/ClassroomQrModal';

interface TeacherViewProps {
  token: string;
  wsUrl: string;
  roomName: string;
  onLeave: () => void;
}

export function TeacherView({ token, wsUrl, roomName, onLeave }: TeacherViewProps) {
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
      <TeacherDashboard roomName={roomName} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function TeacherDashboard({ roomName, onLeave }: { roomName: string; onLeave: () => void }) {
  const connectionState = useConnectionState();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const micTrack = useLocalMicTrack(room);
  const audioLevel = useAudioLevel(micTrack);

  const studentCount = participants.filter((p) => !p.isLocal).length;
  const isConnected = connectionState === ConnectionState.Connected;
  const isLive = isConnected && isMicrophoneEnabled;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showQrModal, setShowQrModal] = useState(false);

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
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 safe-area-inset overflow-y-auto">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white active:scale-95 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          End
        </button>

        <div className="flex items-center gap-2.5">
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
          <StatusPill>
            <Users className="w-3.5 h-3.5" />
            <span className="font-bold">{studentCount}</span>
            <span className="text-slate-500 hidden sm:inline">listening</span>
          </StatusPill>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Classroom QR Badge */}
        <div className="w-full max-w-xs mb-5">
          <ClassroomQrBadge
            roomCode={roomName}
            arch="arch2"
            onOpenModal={() => setShowQrModal(true)}
          />
        </div>

        <ClassroomQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          roomCode={roomName}
          arch="arch2"
        />

        {/* Mic Button Area */}
        <div className="relative flex items-center justify-center mb-10">
          {/* Live broadcasting rings — CSS animation, not JS-driven */}
          {isLive && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-brand ring-pulse" />
              <div className="absolute w-44 h-44 rounded-full bg-brand ring-pulse-delayed" />
            </>
          )}

          {/* Audio-reactive ring — driven by actual mic level */}
          {isLive && <AudioRing level={audioLevel} />}

          {/* The Mic Button */}
          <button
            onClick={toggleMic}
            disabled={!isConnected}
            className={cn(
              "relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-300",
              "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
              !isConnected
                ? "bg-slate-800 text-slate-500 border-2 border-slate-700 cursor-not-allowed"
                : isLive
                  ? "bg-gradient-to-b from-brand to-brand-dark text-white shadow-[0_0_60px_rgba(34,197,94,0.35)]"
                  : "bg-surface text-slate-300 border-2 border-slate-600 hover:border-slate-500 hover:bg-surface-raised"
            )}
          >
            {connectionState === ConnectionState.Connecting ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : isLive ? (
              <AudioBars level={audioLevel} barCount={5} className="h-10" />
            ) : (
              <MicOff className="w-10 h-10" />
            )}

            <span className="text-[11px] font-bold tracking-[0.15em] uppercase mt-3 opacity-80">
              {connectionState === ConnectionState.Connecting
                ? 'Connecting'
                : isLive
                  ? 'On Air'
                  : 'Muted'}
            </span>
          </button>
        </div>

        {/* Audio Level Meter — only visible when live */}
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, y: 8, width: '60%' }}
              animate={{ opacity: 1, y: 0, width: '60%' }}
              exit={{ opacity: 0, y: 8 }}
              className="max-w-xs mb-8"
            >
              <AudioLevelMeter level={audioLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Text */}
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight">
            {!isConnected
              ? 'Setting up…'
              : isLive
                ? 'Broadcasting'
                : 'Tap to go live'}
          </h2>
          <p className="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed">
            {!isConnected
              ? 'Connecting to the local network.'
              : isLive
                ? `${studentCount} student${studentCount !== 1 ? 's' : ''} can hear you right now.`
                : 'Your microphone is muted. Tap the button to start.'}
          </p>
        </div>
      </main>

      {/* ─── Bottom Info Card ─── */}
      <footer className="px-5 pb-5">
        <div className="bg-surface rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center gap-3 mb-3">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-brand shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Local Network · Room {roomName}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Audio streams directly over WiFi. No internet needed. Students connect to the same network and open this page.
          </p>
        </div>
      </footer>
    </div>
  );
}
