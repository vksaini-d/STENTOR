import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, WifiOff, Loader2, UserX, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRemoteAudioLevel } from './hooks/useAudioLevel';
import { AudioLevelMeter, StatusDot, StatusPill } from './components/AudioVisuals';

interface StudentViewProps {
  token: string;
  wsUrl: string;
  roomName: string;
  onLeave: () => void;
}

export function StudentView({ token, wsUrl, roomName, onLeave }: StudentViewProps) {
  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={wsUrl}
      connect={true}
      onDisconnected={onLeave}
      className="h-full"
    >
      <StudentDashboard roomName={roomName} onLeave={onLeave} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function StudentDashboard({ roomName, onLeave }: { roomName: string; onLeave: () => void }) {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Microphone]);
  const room = useRoomContext();
  const audioLevel = useRemoteAudioLevel(room);

  const [hasStartedAudio, setHasStartedAudio] = useState(false);

  const teacherTrack = tracks.find((t) => t.participant.identity.startsWith('teacher'));
  const isTeacherPresent = !!teacherTrack;
  const isConnected = connectionState === ConnectionState.Connected;
  const isReceiving = isConnected && isTeacherPresent;

  // Unmute / unlock audio playback on mobile browsers
  const enableAudio = useCallback(async () => {
    try {
      if (room) {
        await room.startAudio();
      }
      setHasStartedAudio(true);

      // Play short chime tone to verify speaker
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.error('Failed to start LiveKit audio:', e);
    }
  }, [room]);

  // Smooth waveform bars for visualizer
  const [smoothBars, setSmoothBars] = useState<number[]>(() => Array(12).fill(0.08));

  useEffect(() => {
    if (!isReceiving) {
      setSmoothBars(Array(12).fill(0.08));
      return;
    }

    const interval = setInterval(() => {
      setSmoothBars((prev) =>
        prev.map((_, i) => {
          if (audioLevel < 0.01) return 0.08;
          const base = audioLevel;
          const jitter = (Math.sin(Date.now() / 90 + i * 1.3) * 0.5 + 0.5) * 0.35;
          return Math.min(1, Math.max(0.08, base * 0.8 + jitter * base));
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [isReceiving, audioLevel]);

  return (
    <div className="h-full flex flex-col bg-slate-900 safe-area-inset overflow-y-auto">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <button
          onClick={onLeave}
          className="text-slate-400 hover:text-white active:scale-95 transition-all text-sm font-medium"
        >
          ← Leave
        </button>

        <div className="flex items-center gap-2">
          {isReceiving && (
            <StatusPill variant="success">
              <StatusDot active />
              Live Stream
            </StatusPill>
          )}
          {hasStartedAudio ? (
            <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Speaker Ready
            </span>
          ) : (
            <span className="text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
              Tap To Hear
            </span>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        {/* Central Visual */}
        <div className="relative flex items-center justify-center mb-6">
          {isReceiving && hasStartedAudio && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.12 + audioLevel * 0.2, scale: 1 + audioLevel * 0.15 }}
              className="absolute w-56 h-56 bg-brand rounded-full blur-2xl"
            />
          )}

          <div className="relative z-10 w-44 h-44 flex items-center justify-center bg-surface rounded-full border border-slate-800 shadow-2xl">
            {connectionState === ConnectionState.Connecting ? (
              <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
            ) : isReceiving ? (
              <div className="flex items-end justify-center gap-[4px] h-20 px-4">
                {smoothBars.map((barVal, i) => (
                  <div
                    key={i}
                    className="w-[5px] rounded-full transition-all duration-75 ease-out"
                    style={{
                      height: `${Math.max(6, barVal * 72)}px`,
                      backgroundColor: hasStartedAudio
                        ? `rgba(34, 197, 94, ${0.4 + barVal * 0.6})`
                        : `rgba(245, 158, 11, ${0.4 + barVal * 0.6})`,
                    }}
                  />
                ))}
              </div>
            ) : isConnected ? (
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 bg-amber-500/10 border-amber-500/30 text-amber-400">
                <UserX className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Waiting</span>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 bg-slate-800 border-slate-700 text-slate-500">
                <WifiOff className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Connecting</span>
              </div>
            )}
          </div>
        </div>

        {/* Audio Level Meter */}
        <AnimatePresence>
          {isReceiving && (
            <motion.div
              initial={{ opacity: 0, width: '50%' }}
              animate={{ opacity: 1, width: '50%' }}
              exit={{ opacity: 0 }}
              className="max-w-[200px] mb-4"
            >
              <AudioLevelMeter level={audioLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Tap To Listen Action for LiveKit Mobile Autoplay ─── */}
        {!hasStartedAudio ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs mb-6"
          >
            <button
              onClick={enableAudio}
              className="w-full py-4 px-6 bg-gradient-to-r from-brand to-emerald-400 hover:from-emerald-400 hover:to-brand text-slate-950 font-black text-base rounded-2xl shadow-[0_0_35px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-emerald-300"
            >
              <Volume2 className="w-6 h-6 animate-pulse" />
              <span>TAP TO UNMUTE & LISTEN</span>
            </button>
            <p className="text-[11px] text-amber-400/90 text-center mt-2 font-medium">
              ⚠️ Mobile browsers require one tap to enable phone sound.
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-xs mb-4 flex justify-center">
            <button
              onClick={enableAudio}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Test Speaker Chime
            </button>
          </div>
        )}

        {/* Status Text */}
        <div className="text-center space-y-1 mb-4">
          <AnimatePresence mode="wait">
            <motion.h2
              key={isReceiving ? 'receiving' : isConnected ? 'waiting' : 'connecting'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-lg font-bold tracking-tight text-white"
            >
              {!isConnected
                ? 'Connecting to LiveKit…'
                : isReceiving
                  ? hasStartedAudio
                    ? 'Listening to Class'
                    : 'Teacher is Speaking (Tap to Unmute!)'
                  : 'Waiting for Teacher to Broadcast'}
            </motion.h2>
          </AnimatePresence>
          <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">
            {!isConnected
              ? 'Connecting to classroom media server.'
              : isReceiving
                ? hasStartedAudio
                  ? 'WebRTC audio stream active. Use earphones for optimal clarity.'
                  : 'Audio is broadcasting! Tap the button above to start playback.'
                : 'Connected to room. Teacher has not unmuted microphone yet.'}
          </p>
        </div>
      </main>

      {/* ─── Bottom Info Card & Diagnostics ─── */}
      <footer className="px-5 pb-5 space-y-2.5 shrink-0">
        <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1.5 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">LiveKit Connection:</span>
            <span
              className={
                connectionState === ConnectionState.Connected
                  ? 'text-emerald-400 font-bold'
                  : 'text-amber-400'
              }
            >
              ● {connectionState}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Teacher Track:</span>
            <span className={isTeacherPresent ? 'text-brand font-bold' : 'text-slate-500'}>
              {isTeacherPresent ? '● Subscribed' : '○ Not publishing'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Audio Playback:</span>
            <span className={hasStartedAudio ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {hasStartedAudio ? '✓ Unlocked' : '✕ Blocked (Tap green button)'}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-3 border border-slate-800/80 flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-lg shrink-0">
            <Headphones className="w-4 h-4 text-brand" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Room: {roomName}</p>
            <p className="text-[11px] text-slate-500">Plug in earphones to avoid speaker squeal/echo.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
