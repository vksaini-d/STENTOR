import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { Track, ConnectionState, RoomEvent } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, UserX, WifiOff, CheckCircle2, Loader2, Subtitles } from 'lucide-react';
import { useRemoteAudioFrequency, useRemoteAudioLevel } from '../hooks/useAudioLevel';
import { StatusDot, StatusPill } from '../components/AudioVisuals';

interface StudentViewProps {
  token: string;
  wsUrl: string;
  onLeave: () => void;
}

export function WebRtcStudentView({ token, wsUrl, onLeave }: StudentViewProps) {
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
      <WebRtcStudentDashboard onLeave={onLeave} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function WebRtcStudentDashboard({ onLeave }: { onLeave: () => void }) {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Microphone]);
  const room = useRoomContext();
  const audioLevel = useRemoteAudioLevel(room);
  const freqData = useRemoteAudioFrequency(room);

  const [hasStartedAudio, setHasStartedAudio] = useState(false);
  const [captions, setCaptions] = useState('');

  const teacherTrack = tracks.find((t) => t.participant.identity.startsWith('teacher'));
  const isTeacherPresent = !!teacherTrack;
  const isConnected = connectionState === ConnectionState.Connected;
  const isReceiving = isConnected && isTeacherPresent;

  // Live Captions handling
  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      try {
        const str = new TextDecoder().decode(payload);
        const data = JSON.parse(str);
        if (data.type === 'caption') {
          setCaptions(data.text);
        }
      } catch (e) {
        console.error('Failed to parse data message', e);
      }
    };
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

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

  const bars = Array.from({ length: 12 }, (_, i) => {
    const val = freqData && isReceiving && hasStartedAudio ? freqData[i] || 0 : 0;
    return Math.max(0.08, val / 255);
  });

  return (
    <div className="h-full flex flex-col bg-[--color-base] safe-area-inset overflow-y-auto">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <button
          onClick={onLeave}
          className="text-[--color-text-secondary] hover:text-[--color-text-primary] active:scale-95 transition-all text-sm font-medium"
        >
          ← Leave
        </button>

        <div className="flex items-center gap-2">
          {isReceiving && (
            <StatusPill variant="success" className="glass-pill border-none">
              <StatusDot active />
              Live Stream
            </StatusPill>
          )}
          {hasStartedAudio ? (
            <span className="text-[11px] glass-pill text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Speaker Ready
            </span>
          ) : (
            <span className="text-[11px] glass-pill text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Tap To Hear
            </span>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-4 min-h-[300px]">
        {/* Central Visual */}
        <div className="relative flex items-center justify-center mb-6 min-h-[200px]">
          {isReceiving && hasStartedAudio && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.12 + audioLevel * 0.2, scale: 1 + audioLevel * 0.15 }}
              className="absolute w-56 h-56 bg-[--color-signal] rounded-full blur-2xl"
            />
          )}

          <div className="relative z-10 w-44 h-44 flex items-center justify-center bg-[--color-surface] rounded-full border border-[--color-surface] shadow-2xl overflow-hidden">
            {connectionState === ConnectionState.Connecting ? (
              <Loader2 className="w-10 h-10 text-[--color-text-secondary] animate-spin" />
            ) : isReceiving ? (
              <div data-state={hasStartedAudio ? "live" : "waiting"} className="flex items-end justify-center gap-[4px] h-20 px-4">
                {bars.map((val, i) => (
                  <div
                    key={i}
                    className="w-[5px] bg-[--color-signal] rounded-full transition-all duration-75 ease-out"
                    style={{
                      height: `${Math.max(6, val * 72)}px`,
                    }}
                  />
                ))}
              </div>
            ) : isConnected ? (
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 bg-[--color-surface-raised] border-[--color-surface] text-amber-400">
                <UserX className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold">Waiting</span>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 bg-[--color-surface] border-[--color-surface] text-[--color-text-secondary]">
                <WifiOff className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold">Connecting</span>
              </div>
            )}
            
            {/* Tap To Listen Action Pinned over Visualizer */}
            {!hasStartedAudio && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-[--color-base]/60 backdrop-blur-sm"
              >
                <button
                  onClick={enableAudio}
                  className="w-36 h-36 bg-[--color-signal] text-[--color-base] font-black text-lg rounded-full active:scale-95 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-2xl border-[6px] border-white/20"
                >
                  <Volume2 className="w-8 h-8 animate-pulse" />
                  <span className="text-center leading-tight">TAP TO<br/>HEAR</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Live Speech Captions Display */}
        {hasStartedAudio && (
          <div className="w-full max-w-xs mb-4">
            <div className="glass-card rounded-2xl p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                <Subtitles className="w-3.5 h-3.5" />
                <span>Live Lecture Captions</span>
              </div>
              <p className="text-xs text-[--color-text-primary] min-h-[28px] bg-[--color-base]/80 p-2 rounded-xl italic leading-relaxed border border-[--color-surface]/80">
                {captions || 'Captions will appear here when the teacher speaks…'}
              </p>
            </div>
          </div>
        )}

        {/* Status Text */}
        <div className="text-center space-y-1">
          <AnimatePresence mode="wait">
            <motion.h2
              key={isReceiving ? 'receiving' : isConnected ? 'waiting' : 'connecting'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-lg font-bold tracking-tight text-[--color-text-primary]"
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
          <p className="text-xs text-[--color-text-secondary] max-w-[260px] mx-auto leading-relaxed mt-2">
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
      <footer className="px-5 pb-5 shrink-0 w-full max-w-sm mx-auto space-y-3">
        <div className="glass-footer flex justify-center items-center gap-2 text-[11px] font-bold text-[--color-text-secondary] py-2.5 rounded-xl border border-[--color-surface]">
          <span className={connectionState === ConnectionState.Connected ? 'text-emerald-400' : 'text-amber-400'}>● {connectionState}</span>
          <span className="text-[--color-surface-raised]">·</span>
          <span>Teacher: {isTeacherPresent ? 'Subscribed' : 'Waiting'}</span>
          <span className="text-[--color-surface-raised]">·</span>
          <span className={hasStartedAudio ? 'text-emerald-400' : 'text-amber-400'}>Audio: {hasStartedAudio ? '✓' : '✕'}</span>
        </div>
      </footer>
    </div>
  );
}
