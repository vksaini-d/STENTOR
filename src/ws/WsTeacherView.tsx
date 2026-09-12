import { useState, useEffect, useCallback } from 'react';
import {
  MicOff,
  Users,
  AlertCircle,
  LogOut,
  Shield,
  ShieldCheck,
  Hand,
  Disc,
  Download,
  Subtitles,
  Signal,
  QrCode,
} from 'lucide-react';
import { useWsAudio, type NoiseGateMode } from './useWsAudio';
import { AudioBars, AudioLevelMeter, AudioRing, StatusDot, StatusPill } from '../components/AudioVisuals';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ClassroomQrModal } from '../components/ClassroomQrModal';
import { cn } from '../lib/utils';

interface Props {
  roomCode: string;
  onLeave: () => void;
}

export function WsTeacherView({ roomCode, onLeave }: Props) {
  const {
    isConnected,
    isBroadcasting,
    participantCount,
    roster,
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
    isRecording,
    recordedDurationSec,
    startRecording,
    downloadRecording,
    sendCaption,
  } = useWsAudio({ role: 'teacher', roomCode, userName: 'Professor (Host)' });

  const [showRoster, setShowRoster] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Live Speech Recognition & Broadcast
  const { transcript, isListening, isSupported, toggleListening } = useSpeechRecognition({
    onTranscript: (text, isFinal) => {
      sendCaption(text, isFinal);
    },
  });

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

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="h-full flex flex-col bg-[--color-base] safe-area-inset overflow-y-auto">
      {/* ─── Top Bar ─── */}
      <header className="flex flex-col gap-2 px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 text-[--color-text-secondary] hover:text-[--color-text-primary] active:scale-95 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            End Session
          </button>
          
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[--color-signal]/15 hover:bg-[--color-signal]/25 text-[--color-signal] border border-[--color-signal]/30 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Show Student Join QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {isBroadcasting && (
            <StatusPill variant="success" className="glass-pill border-none">
              <StatusDot active />
              Live PCM
            </StatusPill>
          )}

          {isBroadcasting && (
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all glass-pill',
                isGateOpen
                  ? 'text-emerald-300 animate-pulse'
                  : 'text-amber-300'
              )}
            >
              {isGateOpen ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {isGateOpen ? 'Voice Active' : 'Echo Shielded'}
            </span>
          )}

          <button
            onClick={() => setShowRoster(!showRoster)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer glass-pill"
          >
            <Users className="w-3.5 h-3.5 text-[--color-signal]" />
            <span>{participantCount}</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-3">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[--color-signal] text-[10px] font-bold mb-1 glass-pill border-none">
            <Signal className="w-3 h-3" />
            Stentor Voice Relay
          </div>
          <p className="text-2xl font-black text-[--color-signal] tracking-[0.15em]">{roomCode}</p>
        </div>

        {/* Classroom QR Badge */}
        

        <ClassroomQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          roomCode={roomCode}
          arch="arch1"
        />

        {/* Mic / PTT Button */}
        <div className="relative flex items-center justify-center mb-5">
          {isBroadcasting && !isPushToTalk && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-[--color-signal] ring-pulse" />
              <div className="absolute w-44 h-44 rounded-full bg-[--color-signal] ring-pulse-delayed" />
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
                ? 'bg-[--color-surface] text-[--color-text-secondary] border-2 border-[--color-surface] cursor-not-allowed'
                : isBroadcasting
                ? isGateOpen
                  ? 'bg-[--color-signal] text-[--color-base] border-2 border-[--color-signal] shadow-[0_0_50px_var(--color-signal)]'
                  : 'bg-gradient-to-b from-slate-700 to-slate-800 text-[--color-text-secondary] border-2 border-amber-500/50'
                : 'bg-[--color-surface] text-[--color-text-secondary] border-2 border-slate-600 hover:border-slate-500 hover:text-[--color-text-primary]'
            )}
          >
            {isBroadcasting ? (
              <AudioBars level={audioLevel} barCount={5} className="h-9" />
            ) : (
              <MicOff className="w-9 h-9" />
            )}
            <span className="text-[10px] font-bold tracking-[0.12em] mt-2.5 opacity-90">
              {isBroadcasting
                ? isPushToTalk
                  ? 'HOLD TO TALK'
                  : isGateOpen
                  ? 'STREAMING'
                  : 'MIC QUIET'
                : isConnected
                ? 'START MIC'
                : 'CONNECTING…'}
            </span>
          </button>
        </div>

        {/* Audio Level Meter */}
        <div className="w-3/5 max-w-sm mb-3">
          <AudioLevelMeter level={isBroadcasting ? audioLevel : 0} />
        </div>

        {/* ─── Lecture Recording Card (idea_analysis.md) ─── */}
        <div className="w-full max-w-sm text-[10px] font-bold text-[--color-text-secondary] uppercase tracking-widest mb-1 mt-2 text-left px-1">Controls</div>
        <div className="w-full max-w-sm glass-card rounded-2xl p-3 mb-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[--color-text-primary] flex items-center gap-1.5">
              <Disc className={cn('w-3.5 h-3.5', isRecording ? 'text-red-400 animate-spin' : 'text-[--color-text-secondary]')} />
              Lecture Audio Recording
            </span>
            {isRecording && (
              <span className="font-mono text-xs font-bold text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                {formatSec(recordedDurationSec)}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!isBroadcasting}
                className={cn(
                  'flex-1 py-1.5 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
                  !isBroadcasting && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Disc className="w-3.5 h-3.5" />
                Record Lecture
              </button>
            ) : (
              <button
                onClick={downloadRecording}
                className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-[#0D1D1F] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Stop & Download .WAV
              </button>
            )}
          </div>
        </div>

        {/* ─── Live Speech Captions Card (idea_analysis.md) ─── */}
        <div className="w-full max-w-sm glass-card rounded-2xl p-3 mb-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[--color-text-primary] flex items-center gap-1.5">
              <Subtitles className="w-3.5 h-3.5 text-sky-400" />
              Live Captions (Broadcasted)
            </span>
            {isSupported && (
              <button
                onClick={toggleListening}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                  isListening
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[--color-surface] text-[--color-text-secondary] border-[--color-surface] hover:text-[--color-text-primary]'
                )}
              >
                {isListening ? '● ON' : 'Turn ON'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-[--color-text-secondary] bg-[--color-base]/90 p-2 rounded-xl min-h-[32px] italic leading-snug border border-[--color-surface]/80">
            {transcript || (isListening ? 'Speaking will transcribe live for students…' : 'Tap Turn ON to broadcast captions.')}
          </p>
        </div>

        {/* ─── Echo Shield (Noise Gate) Controls ─── */}
        <div className="w-full max-w-sm glass-card rounded-2xl p-3 mb-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[--color-text-primary] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Echo Shield (VAD Squelch)
            </span>
            <span className="text-[10px] text-[--color-text-secondary] font-mono capitalize">{noiseGateMode}</span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-0.5 bg-[--color-base]/80 rounded-xl border border-[--color-surface]">
            {(['normal', 'aggressive', 'off'] as NoiseGateMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setNoiseGateMode(mode)}
                className={cn(
                  'py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all capitalize',
                  noiseGateMode === mode
                    ? 'bg-[--color-signal] text-[#0D1D1F] font-bold shadow-md glass-btn border-none'
                    : 'glass-btn bg-[--color-surface] text-[--color-text-primary] border border-[--color-surface-raised] hover:bg-[--color-surface-raised]'
                )}
              >
                {mode === 'normal' ? 'Normal' : mode === 'aggressive' ? 'High' : 'Off'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[--color-surface]">
            <label className="flex items-center gap-1.5 text-xs text-[--color-text-secondary] cursor-pointer">
              <Hand className="w-3 h-3 text-amber-400" />
              <span>Push-to-Talk Mode</span>
            </label>
            <input
              type="checkbox"
              checked={isPushToTalk}
              onChange={(e) => setIsPushToTalk(e.target.checked)}
              className="accent-[--color-signal] cursor-pointer w-4 h-4"
            />
          </div>
        </div>

        {/* ─── Attendance Roster Modal ─── */}
        {showRoster && (
          <div className="w-full max-w-sm glass-popup rounded-2xl p-3.5 mb-2 shadow-2xl space-y-2 absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-xs font-bold text-[--color-text-primary]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[--color-signal]" />
                Attendance Roster ({participantCount})
              </span>
              <button onClick={() => setShowRoster(false)} className="text-[--color-text-secondary] hover:text-[--color-text-primary] text-[11px]">
                ✕ Close
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {roster.length === 0 ? (
                <p className="text-xs text-[--color-text-secondary] py-1 text-center">No students connected yet.</p>
              ) : (
                roster.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg glass-footer text-xs mb-1"
                  >
                    <span className="font-medium text-[--color-text-secondary]">{p.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {p.role === 'teacher' ? 'Host' : 'Student'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-sm mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {/* ─── Bottom Info ─── */}
      <footer className="px-5 pb-4 shrink-0 w-full max-w-sm mx-auto">
        <div className="glass-footer flex justify-center items-center gap-2 text-[10px] font-bold text-[--color-text-secondary] py-2">
          <span>PCM 16kHz</span>
          <span>·</span>
          <span>{packetsCount} pkts</span>
          <span>·</span>
          <span>{((bytesProcessed || 0) / 1024).toFixed(1)} KB</span>
        </div>
      </footer>
    </div>
  );
}
