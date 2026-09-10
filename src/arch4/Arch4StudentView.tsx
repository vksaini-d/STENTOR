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
  Terminal,
} from 'lucide-react';
import { useWsAudio } from '../arch1/useWsAudio';
import { StatusDot, StatusPill } from '../components/AudioVisuals';
import { cn } from '../lib/utils';

interface Props {
  roomCode: string;
  studentName?: string;
  onLeave: () => void;
}

export function Arch4StudentView({ roomCode, studentName, onLeave }: Props) {
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
  } = useWsAudio({
    role: 'student',
    roomCode,
    userName: studentName || 'Student Listener',
  });

  const isReceiving = isConnected && teacherActive;
  const [bars, setBars] = useState<number[]>(() => Array(12).fill(0.08));

  useEffect(() => {
    if (!isReceiving) {
      setBars(Array(12).fill(0.08));
      return;
    }

    const interval = setInterval(() => {
      setBars((prev) =>
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
              Custom PCM
            </StatusPill>
          )}
          {isAudioUnlocked ? (
            <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {outputMode === 'earphones' ? 'Earphones' : 'Speaker Cap'}
            </span>
          ) : (
            <span className="text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
              Tap To Hear
            </span>
          )}
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-3">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Terminal className="w-3 h-3" />
            Arch 4 · Custom WebSocket
          </div>
          <p className="text-3xl font-black text-brand tracking-[0.3em]">{roomCode}</p>
        </div>

        {/* Central Visualizer */}
        <div className="relative flex items-center justify-center mb-4">
          {isReceiving && isAudioUnlocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.15 + audioLevel * 0.25, scale: 1 + audioLevel * 0.2 }}
              className="absolute w-56 h-56 bg-brand rounded-full blur-2xl transition-all duration-75"
            />
          )}

          <div className="relative z-10 w-40 h-40 flex items-center justify-center bg-surface rounded-full border border-slate-800 shadow-2xl">
            {isReceiving ? (
              <div className="flex items-end justify-center gap-[4px] h-20 px-4">
                {bars.map((val, i) => (
                  <div
                    key={i}
                    className="w-[5px] rounded-full transition-all duration-75 ease-out"
                    style={{
                      height: `${Math.max(6, val * 72)}px`,
                      backgroundColor: isAudioUnlocked
                        ? `rgba(34, 197, 94, ${0.4 + val * 0.6})`
                        : `rgba(245, 158, 11, ${0.4 + val * 0.6})`,
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

        {/* ─── Tap To Listen Action ─── */}
        {!isAudioUnlocked ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs mb-4"
          >
            <button
              onClick={unlockAudio}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-brand to-emerald-400 hover:from-emerald-400 hover:to-brand text-slate-950 font-black text-base rounded-2xl shadow-[0_0_35px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2.5 border-2 border-emerald-300"
            >
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span>TAP TO UNMUTE & LISTEN</span>
            </button>
            <p className="text-[11px] text-amber-400/90 text-center mt-1.5 font-medium">
              ⚠️ Mobile browsers require one tap to enable phone sound.
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-xs mb-3 space-y-2">
            {/* Live Speech Captions Display (idea_analysis.md) */}
            <div className="bg-surface/90 rounded-2xl p-2.5 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                <Subtitles className="w-3.5 h-3.5" />
                <span>Live Lecture Captions</span>
              </div>
              <p className="text-xs text-slate-200 min-h-[28px] bg-slate-900/80 p-2 rounded-xl italic leading-relaxed border border-slate-800/80">
                {liveCaption || 'Captions will appear here when the teacher speaks…'}
              </p>
            </div>

            {/* Output Mode & Volume */}
            <div className="bg-surface/80 rounded-2xl p-3 border border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <button
                  onClick={() => setOutputMode('earphones')}
                  className={cn(
                    'py-1 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all',
                    outputMode === 'earphones'
                      ? 'bg-brand text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
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
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
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

              <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
                <span className="font-semibold flex items-center gap-1">
                  {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-brand" />}
                  Volume
                </span>
                <span className="font-mono text-brand font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max={outputMode === 'speaker' ? '0.75' : '1.2'}
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-brand cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <div className="flex justify-end pt-0.5">
                <button
                  onClick={playTestTone}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-lg transition-colors flex items-center gap-1 border border-slate-700 active:scale-95"
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
              className="text-base font-bold tracking-tight text-white"
            >
              {!isConnected
                ? 'Connecting to Custom WebSocket…'
                : isReceiving
                  ? isAudioUnlocked
                    ? 'Streaming Live Audio'
                    : 'Teacher Speaking (Tap to Hear!)'
                  : 'Connected · Waiting for Teacher'}
            </motion.h2>
          </AnimatePresence>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-xs mb-2">
            <Radio className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {/* ─── Bottom Info & Diagnostics ─── */}
      <footer className="px-5 pb-4 space-y-1.5 shrink-0">
        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Connection:</span>
            <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isConnected ? '● Connected (Custom Node.js WS)' : '○ Disconnected'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Packets Rcvd:</span>
            <span className="text-sky-400 font-bold">
              {packetsCount} ({((bytesProcessed || 0) / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-2 border border-slate-800/80 flex items-center gap-2">
          <Headphones className="w-3.5 h-3.5 text-brand shrink-0" />
          <p className="text-[10px] text-slate-400">
            <strong className="text-slate-200">Earphones:</strong> Recommended for zero-echo listening.
          </p>
        </div>
      </footer>
    </div>
  );
}
