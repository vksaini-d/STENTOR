import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  WifiOff,
  UserX,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Speaker,
  ShieldAlert,
  Subtitles,
  Signal,
} from 'lucide-react';
import { useWsAudio } from './useWsAudio';
import { StatusDot, StatusPill } from '../components/AudioVisuals';
import { cn } from '../lib/utils';

interface Props {
  roomCode: string;
  studentName?: string;
  onLeave: () => void;
}

export function WsStudentView({ roomCode, studentName, onLeave }: Props) {
  const {
    isConnected,
    teacherActive,
    error,
    audioLevel,
    bytesProcessed,
    packetsCount,
    isAudioUnlocked,
    unlockAudio,
    volume,
    setVolume,
    playTestTone,
    outputMode,
    setOutputMode,
    liveCaption,
    getFrequencyData,
  } = useWsAudio({
    role: 'student',
    roomCode,
    userName: studentName || 'Student Listener',
  });

  const isReceiving = isConnected && teacherActive;
  const [bars, setBars] = useState<number[]>(() => Array(12).fill(0.08));

  useEffect(() => {
    if (!isReceiving || !isAudioUnlocked) {
      setBars(Array(12).fill(0.08));
      return;
    }

    let animationFrameId: number;

    const updateBars = () => {
      const data = getFrequencyData();
      if (data) {
        setBars(
          Array.from({ length: 12 }, (_, i) => {
            const val = data[i] || 0;
            return Math.max(0.08, val / 255);
          })
        );
      }
      animationFrameId = requestAnimationFrame(updateBars);
    };

    updateBars();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isReceiving, isAudioUnlocked, getFrequencyData]);

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
              Voice Relay
            </StatusPill>
          )}
          {isAudioUnlocked ? (
            <span className="text-[11px] glass-pill text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {outputMode === 'earphones' ? 'Earphones' : 'Speaker Cap'}
            </span>
          ) : (
            <span className="text-[11px] glass-pill text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Tap To Hear
            </span>
          )}
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-3">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[--color-signal] text-[10px] font-bold mb-1 glass-pill border-none">
            <Signal className="w-3 h-3" />
            Stentor Voice Relay
          </div>
          <p className="text-3xl font-black text-[--color-signal] tracking-[0.3em]">{roomCode}</p>
        </div>

        {/* Central Visualizer */}
        <div className="relative flex items-center justify-center mb-2">
          {isReceiving && isAudioUnlocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.15 + audioLevel * 0.25, scale: 1 + audioLevel * 0.2 }}
              className="absolute w-56 h-56 bg-[--color-signal] rounded-full blur-2xl transition-all duration-75"
            />
          )}

          <div className="relative z-10 w-40 h-40 flex items-center justify-center bg-[--color-surface] rounded-full border border-[--color-surface] shadow-2xl">
            {isReceiving ? (
              <div data-state={isAudioUnlocked ? "live" : "waiting"} className="flex items-end justify-center gap-[4px] h-20 px-4">
                {bars.map((val, i) => (
                  <div
                    key={i}
                    className="w-[5px] rounded-full transition-all duration-75 ease-out"
                    style={{
                      height: `${Math.max(6, val * 72)}px`,
                    }}
                  />
                ))}
              </div>
            ) : isConnected ? (
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 bg-amber-500/10 border-amber-500/30 text-amber-400">
                <UserX className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold ">Waiting</span>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 bg-[--color-surface] border-[--color-surface] text-[--color-text-secondary]">
                <WifiOff className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold ">Connecting</span>
              </div>
            )}
          </div>

          {/* ─── Tap To Listen Action (Pinned) ─── */}
          {!isAudioUnlocked && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-0 translate-y-1/2 z-20 w-48"
            >
              <button
                onClick={unlockAudio}
                className="w-full py-2.5 px-4 bg-[--color-signal] text-[--color-base] font-black text-sm rounded-full shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>TAP TO HEAR</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Space below visualizer for the pinned button to overlap or warning text */}
        {!isAudioUnlocked ? (
          <div className="mt-8 mb-2 w-full max-w-sm">
            <p className="text-[11px] text-amber-400/90 text-center font-medium">
              ⚠️ Mobile browsers require one tap to enable phone sound.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm mb-3 space-y-2 mt-2">
            {/* Live Speech Captions Display */}
            <div className="glass-card rounded-2xl p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                <Subtitles className="w-3.5 h-3.5" />
                <span>Live Lecture Captions</span>
              </div>
              <p className="text-xs text-[--color-text-primary] min-h-[28px] bg-[--color-base]/80 p-2 rounded-xl italic leading-relaxed border border-[--color-surface]/80">
                {liveCaption || 'Captions will appear here when the teacher speaks…'}
              </p>
            </div>

            {/* Output Mode & Volume */}
            <div className="glass-card rounded-2xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[--color-base]/80 rounded-xl border border-[--color-surface]">
                <button
                  onClick={() => setOutputMode('earphones')}
                  className={cn(
                    'py-1 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all',
                    outputMode === 'earphones'
                      ? 'bg-[--color-signal] text-[--color-base] font-bold shadow-md'
                      : 'text-[--color-text-secondary] hover:text-[--color-text-primary]'
                  )}
                >
                  <Headphones className="w-3 h-3" />
                  <span>Earphones</span>
                </button>

                <button
                  onClick={() => setOutputMode('speaker')}
                  className={cn(
                    'py-1 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all',
                    outputMode === 'speaker'
                      ? 'bg-amber-400 text-[--color-base] font-bold shadow-md'
                      : 'text-[--color-text-secondary] hover:text-[--color-text-primary]'
                  )}
                >
                  <Speaker className="w-3 h-3" />
                  <span>Speaker</span>
                </button>
              </div>

              {outputMode === 'speaker' && (
                <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Echo Protected (Capped at 75%)</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[--color-text-secondary] pt-0.5">
                <span className="font-semibold flex items-center gap-1">
                  {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-[--color-signal]" />}
                  Volume
                </span>
                <span className="font-mono text-[--color-signal] font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max={outputMode === 'speaker' ? '0.75' : '1.2'}
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[--color-signal] cursor-pointer h-1.5 bg-[--color-surface] rounded-lg"
              />

              <div className="flex justify-end pt-0.5">
                <button
                  onClick={playTestTone}
                  className="px-2 py-0.5 bg-[--color-surface] hover:bg-[--color-surface-raised] text-[--color-text-secondary] text-[10px] font-medium rounded-lg transition-colors flex items-center gap-1 border border-[--color-surface] active:scale-95"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Test Speaker Chime
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Text */}
        <div className="text-center space-y-1 mb-2">
          <AnimatePresence mode="wait">
            <motion.h2
              key={isReceiving ? 'r' : isConnected ? 'w' : 'c'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-base font-bold tracking-tight text-[--color-text-primary]"
            >
              {!isConnected
                ? 'Connecting to Stentor relay…'
                : isReceiving
                ? isAudioUnlocked
                  ? 'Streaming Live Audio'
                  : 'Teacher Speaking (Tap to Hear!)'
                : 'Connected: Waiting for Teacher'}
            </motion.h2>
          </AnimatePresence>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-sm mb-2">
            <Radio className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {/* ─── Bottom Info & Diagnostics ─── */}
      <footer className="px-5 pb-4 space-y-2 shrink-0 flex flex-col items-center">
        <div className="glass-footer rounded-full px-4 py-2 flex items-center justify-center gap-2 text-xs text-[--color-text-secondary] font-mono w-full max-w-sm mx-auto shadow-sm">
          <StatusDot active={isConnected} />
          <span>
            {isConnected ? 'Connected' : 'Disconnected'} · {packetsCount} pkts ({((bytesProcessed || 0) / 1024).toFixed(1)} KB)
          </span>
        </div>

        <div className="glass-card rounded-lg p-1.5 flex items-center justify-center gap-1.5 w-full max-w-sm mx-auto">
          <Headphones className="w-3 h-3 text-[--color-signal]" />
          <p className="text-[10px] text-[--color-text-secondary]">
            <strong className="text-[--color-text-primary]">Earphones:</strong> recommended for zero-echo.
          </p>
        </div>
      </footer>
    </div>
  );
}
