import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, WifiOff, UserX, Radio, Volume2, VolumeX, Sparkles, CheckCircle2, Speaker, ShieldAlert } from 'lucide-react';
import { useWsAudio } from './useWsAudio';
import { StatusDot, StatusPill } from '../components/AudioVisuals';
import { cn } from '../lib/utils';

interface Props {
  roomCode: string;
  onLeave: () => void;
}

export function Arch1StudentView({ roomCode, onLeave }: Props) {
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
  } = useWsAudio({ role: 'student', roomCode });

  const isReceiving = isConnected && teacherActive;

  // Real waveform bars dynamically scaled by incoming PCM audioLevel
  const [bars, setBars] = useState<number[]>(() => Array(12).fill(0.08));

  useEffect(() => {
    if (!isReceiving) {
      setBars(Array(12).fill(0.08));
      return;
    }

    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          if (audioLevel < 0.01) {
            return 0.08;
          }
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
              Live Audio
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
        {/* Room Code */}
        <div className="text-center mb-3">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-0.5">Room</p>
          <p className="text-3xl font-black text-brand tracking-[0.3em]">{roomCode}</p>
        </div>

        {/* Central Visualizer */}
        <div className="relative flex items-center justify-center mb-5">
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

        {/* ─── Tap To Listen Action (Solves Mobile Autoplay Block) ─── */}
        {!isAudioUnlocked ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs mb-5"
          >
            <button
              onClick={unlockAudio}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-brand to-emerald-400 hover:from-emerald-400 hover:to-brand text-slate-950 font-black text-base rounded-2xl shadow-[0_0_35px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2.5 border-2 border-emerald-300"
            >
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span>TAP TO UNMUTE & LISTEN</span>
            </button>
            <p className="text-[11px] text-amber-400/90 text-center mt-2 font-medium">
              ⚠️ Mobile browsers require one tap to enable phone sound.
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-xs mb-4 space-y-2.5">
            {/* Output Mode Switch (Earphones vs Speaker - Nightmare #3 solution) */}
            <div className="bg-surface/80 rounded-2xl p-3 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Listening Device</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {outputMode === 'earphones' ? 'Zero Echo' : 'Echo Protected'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
                <button
                  onClick={() => setOutputMode('earphones')}
                  className={cn(
                    'py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all',
                    outputMode === 'earphones'
                      ? 'bg-brand text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Earphones</span>
                </button>

                <button
                  onClick={() => setOutputMode('speaker')}
                  className={cn(
                    'py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all',
                    outputMode === 'speaker'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Speaker className="w-3.5 h-3.5" />
                  <span>Phone Speaker</span>
                </button>
              </div>

              {outputMode === 'speaker' && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Echo Warning:</strong> If you are near the teacher, open speakers will echo into the teacher's mic. Earphones are strongly recommended!
                  </p>
                </div>
              )}

              {/* Volume Slider & Test Button */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    {volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-brand" />
                    )}
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
              </div>

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
        <div className="text-center space-y-1 mb-3">
          <AnimatePresence mode="wait">
            <motion.h2
              key={isReceiving ? 'r' : isConnected ? 'w' : 'c'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-base font-bold tracking-tight text-white"
            >
              {!isConnected
                ? 'Connecting to WiFi Server…'
                : isReceiving
                  ? isAudioUnlocked
                    ? 'Streaming Live Speech'
                    : 'Teacher is Speaking (Tap to Unmute!)'
                  : 'Waiting for Teacher to Speak'}
            </motion.h2>
          </AnimatePresence>
          <p className="text-[11px] text-slate-400 max-w-[260px] mx-auto leading-relaxed">
            {!isConnected
              ? 'Connecting to classroom network.'
              : isReceiving
                ? isAudioUnlocked
                  ? 'Raw PCM voice stream active. Low latency, zero echo.'
                  : 'Incoming audio detected! Tap the green button above to hear.'
                : 'Connected to room. Waiting for teacher.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-xs mb-2">
            <Radio className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {/* ─── Bottom Info & Diagnostics ─── */}
      <footer className="px-5 pb-4 space-y-2 shrink-0">
        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">WebSocket:</span>
            <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Audio Mode:</span>
            <span className="text-slate-300 capitalize">{outputMode} (Jitter Buffer Synced)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Packets Rcvd:</span>
            <span className="text-sky-400 font-bold">
              {packetsCount} ({((bytesProcessed || 0) / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-2.5 border border-slate-800/80 flex items-center gap-2.5">
          <Headphones className="w-4 h-4 text-brand shrink-0" />
          <div className="text-left text-[11px] text-slate-400">
            <span className="font-semibold text-slate-200">Rule #1 from Nightmare Analysis:</span>
            <span className="block text-slate-400">Earphones eliminate 100% of room echo in same-room testing.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
