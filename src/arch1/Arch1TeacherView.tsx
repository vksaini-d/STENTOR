import { useEffect, useCallback, useState } from 'react';
import { MicOff, Users, AlertCircle, LogOut, Shield, ShieldCheck, ShieldAlert, Hand, QrCode } from 'lucide-react';
import { useWsAudio, type NoiseGateMode } from './useWsAudio';
import { AudioBars, AudioLevelMeter, AudioRing, StatusDot, StatusPill } from '../components/AudioVisuals';
import { ClassroomQrModal, ClassroomQrBadge } from '../components/ClassroomQrModal';
import { cn } from '../lib/utils';

interface Props {
  roomCode: string;
  onLeave: () => void;
}

export function Arch1TeacherView({ roomCode, onLeave }: Props) {
  const {
    isConnected,
    isBroadcasting,
    participantCount,
    error,
    startMic,
    stopMic,
    audioLevel,
    bytesProcessed,
    packetsCount,
    noiseGateMode,
    setNoiseGateMode,
    isGateOpen,
    isPushToTalk,
    setIsPushToTalk,
    setIsPttPressed,
  } = useWsAudio({ role: 'teacher', roomCode });

  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    return () => {
      stopMic();
    };
  }, [stopMic]);

  const toggleBroadcast = useCallback(() => {
    if (isBroadcasting) {
      stopMic();
    } else {
      startMic();
    }
  }, [isBroadcasting, startMic, stopMic]);

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

          {isBroadcasting && (
            <StatusPill variant="success">
              <StatusDot active />
              Live
            </StatusPill>
          )}

          {/* Noise Gate / Echo Shield Status Indicator */}
          {isBroadcasting && (
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border transition-all',
                isGateOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              )}
            >
              {isGateOpen ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {isGateOpen ? 'Voice Active' : 'Echo Shielded'}
            </span>
          )}

          <StatusPill>
            <Users className="w-3.5 h-3.5 text-brand" />
            <span className="font-bold">{participantCount}</span>
          </StatusPill>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-3">
        {/* Room Code */}
        <div className="text-center mb-3">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-0.5">Room Code</p>
          <p className="text-3xl font-black text-brand tracking-[0.3em]">{roomCode}</p>
        </div>

        {/* Classroom QR Badge */}
        <div className="w-full max-w-xs mb-5">
          <ClassroomQrBadge
            roomCode={roomCode}
            arch="arch1"
            onOpenModal={() => setShowQrModal(true)}
          />
        </div>

        <ClassroomQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          roomCode={roomCode}
          arch="arch1"
        />

        {/* Mic / PTT Button */}
        <div className="relative flex items-center justify-center mb-6">
          {isBroadcasting && !isPushToTalk && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-brand ring-pulse" />
              <div className="absolute w-44 h-44 rounded-full bg-brand ring-pulse-delayed" />
            </>
          )}
          {isBroadcasting && <AudioRing level={audioLevel} />}

          <button
            onClick={isPushToTalk ? undefined : toggleBroadcast}
            onPointerDown={isPushToTalk ? () => setIsPttPressed(true) : undefined}
            onPointerUp={isPushToTalk ? () => setIsPttPressed(false) : undefined}
            onPointerLeave={isPushToTalk ? () => setIsPttPressed(false) : undefined}
            disabled={!isConnected}
            className={cn(
              'relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 select-none touch-none',
              'active:scale-95 focus:outline-none shadow-2xl',
              !isConnected
                ? 'bg-slate-800 text-slate-500 border-2 border-slate-700 cursor-not-allowed'
                : isBroadcasting
                  ? isGateOpen
                    ? 'bg-gradient-to-b from-brand to-emerald-600 text-white shadow-[0_0_50px_rgba(34,197,94,0.4)] border-2 border-emerald-300'
                    : 'bg-gradient-to-b from-slate-700 to-slate-800 text-slate-300 border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-surface text-slate-300 border-2 border-slate-600 hover:border-slate-500 hover:text-white'
            )}
          >
            {isBroadcasting ? (
              <AudioBars level={audioLevel} barCount={5} className="h-9" />
            ) : (
              <MicOff className="w-9 h-9" />
            )}
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase mt-2.5 opacity-90">
              {isBroadcasting
                ? isPushToTalk
                  ? 'HOLD TO SPEAK'
                  : isGateOpen
                    ? 'STREAMING'
                    : 'MIC QUIET'
                : isConnected
                  ? 'START BROADCAST'
                  : 'CONNECTING…'}
            </span>
          </button>
        </div>

        {/* Audio Level Meter */}
        <div className="w-3/5 max-w-xs mb-4">
          <AudioLevelMeter level={isBroadcasting ? audioLevel : 0} />
        </div>

        {/* ─── Anti-Echo & Feedback Shield Controls (Nightmare #3 & #12 Solutions) ─── */}
        <div className="w-full max-w-xs bg-surface/90 border border-slate-800 rounded-2xl p-3.5 mb-3 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Echo Shield (VAD Gate)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {noiseGateMode === 'aggressive' ? 'High' : noiseGateMode === 'normal' ? 'Normal' : 'Off'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            {(['normal', 'aggressive', 'off'] as NoiseGateMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setNoiseGateMode(mode)}
                className={cn(
                  'py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all capitalize',
                  noiseGateMode === mode
                    ? 'bg-brand text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                {mode === 'normal' ? 'Normal' : mode === 'aggressive' ? 'High (Noisy)' : 'Off'}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            Mutes mic automatically during pauses so student phone speakers in the room cannot cause an echo loop.
          </p>

          {/* Push to Talk Toggle */}
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <Hand className="w-3.5 h-3.5 text-amber-400" />
              <span>Push-to-Talk (Demo Mode)</span>
            </label>
            <input
              type="checkbox"
              checked={isPushToTalk}
              onChange={(e) => setIsPushToTalk(e.target.checked)}
              className="accent-brand cursor-pointer w-4 h-4"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-xs mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {/* ─── Bottom Info & Diagnostics ─── */}
      <footer className="px-5 pb-4 space-y-2 shrink-0">
        <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1.5 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Audio Filter:</span>
            <span className="text-emerald-400 font-bold">130Hz-5.5kHz Bandpass (Anti-Squeal)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Echo Gate:</span>
            <span className={isGateOpen ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isGateOpen ? '● Open (Voice passing)' : '🛡️ Closed (Echo blocked)'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Packets Sent:</span>
            <span className="text-sky-400 font-bold">
              {packetsCount} ({((bytesProcessed || 0) / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>

        <div className="bg-surface/80 rounded-xl p-2.5 border border-slate-800/80 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-slate-400 leading-snug">
            <span className="text-slate-200 font-semibold">Testing in the same room?</span> Earphones on the student phone completely eliminate acoustic echo.
          </p>
        </div>
      </footer>
    </div>
  );
}
