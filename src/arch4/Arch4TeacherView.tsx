import { useState, useEffect, useCallback } from 'react';
import {
  MicOff,
  Users,
  AlertCircle,
  LogOut,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Hand,
  Disc,
  Download,
  Subtitles,
  Terminal,
  QrCode,
} from 'lucide-react';
import { useWsAudio, type NoiseGateMode } from '../arch1/useWsAudio';
import { AudioBars, AudioLevelMeter, AudioRing, StatusDot, StatusPill } from '../components/AudioVisuals';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ClassroomQrModal, ClassroomQrBadge } from '../components/ClassroomQrModal';
import { cn } from '../lib/utils';

interface Props {
  roomCode: string;
  onLeave: () => void;
}

export function Arch4TeacherView({ roomCode, onLeave }: Props) {
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
              Live PCM
            </StatusPill>
          )}

          {/* Noise Gate Status */}
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

          <button
            onClick={() => setShowRoster(!showRoster)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-brand" />
            <span>{participantCount}</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-3">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Terminal className="w-3 h-3" />
            Arch 4 · Custom WebSocket PCM (Zero-LiveKit)
          </div>
          <p className="text-3xl font-black text-brand tracking-[0.3em]">{roomCode}</p>
        </div>

        {/* Classroom QR Badge */}
        <div className="w-full max-w-xs mb-5">
          <ClassroomQrBadge
            roomCode={roomCode}
            arch="arch4"
            onOpenModal={() => setShowQrModal(true)}
          />
        </div>

        <ClassroomQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          roomCode={roomCode}
          arch="arch4"
        />

        {/* Mic / PTT Button */}
        <div className="relative flex items-center justify-center mb-5">
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
                    : 'bg-gradient-to-b from-slate-700 to-slate-800 text-slate-300 border-2 border-amber-500/50'
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
        <div className="w-3/5 max-w-xs mb-3">
          <AudioLevelMeter level={isBroadcasting ? audioLevel : 0} />
        </div>

        {/* ─── Lecture Recording Card (idea_analysis.md) ─── */}
        <div className="w-full max-w-xs bg-surface/90 border border-slate-800 rounded-2xl p-3 mb-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Disc className={cn('w-3.5 h-3.5', isRecording ? 'text-red-400 animate-spin' : 'text-slate-400')} />
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
                className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Stop & Download .WAV
              </button>
            )}
          </div>
        </div>

        {/* ─── Live Speech Captions Card (idea_analysis.md) ─── */}
        <div className="w-full max-w-xs bg-surface/90 border border-slate-800 rounded-2xl p-3 mb-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
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
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                )}
              >
                {isListening ? '● ON' : 'Turn ON'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded-xl min-h-[32px] italic leading-snug border border-slate-800/80">
            {transcript || (isListening ? 'Speaking will transcribe live for students…' : 'Tap Turn ON to broadcast captions.')}
          </p>
        </div>

        {/* ─── Echo Shield (Noise Gate) Controls ─── */}
        <div className="w-full max-w-xs bg-surface/90 border border-slate-800 rounded-2xl p-3 mb-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Echo Shield (VAD Squelch)
            </span>
            <span className="text-[10px] text-slate-400 font-mono capitalize">{noiseGateMode}</span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-900/80 rounded-xl border border-slate-800">
            {(['normal', 'aggressive', 'off'] as NoiseGateMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setNoiseGateMode(mode)}
                className={cn(
                  'py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all capitalize',
                  noiseGateMode === mode
                    ? 'bg-brand text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                {mode === 'normal' ? 'Normal' : mode === 'aggressive' ? 'High' : 'Off'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <Hand className="w-3 h-3 text-amber-400" />
              <span>Push-to-Talk Mode</span>
            </label>
            <input
              type="checkbox"
              checked={isPushToTalk}
              onChange={(e) => setIsPushToTalk(e.target.checked)}
              className="accent-brand cursor-pointer w-4 h-4"
            />
          </div>
        </div>

        {/* ─── Attendance Roster Modal ─── */}
        {showRoster && (
          <div className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-2xl p-3.5 mb-2 shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand" />
                Attendance Roster ({participantCount})
              </span>
              <button onClick={() => setShowRoster(false)} className="text-slate-500 hover:text-white text-[11px]">
                ✕ Close
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {roster.length === 0 ? (
                <p className="text-xs text-slate-500 py-1 text-center">No students connected yet.</p>
              ) : (
                roster.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <span className="font-medium text-slate-300">{p.name}</span>
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
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-xs mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {/* ─── Bottom Info ─── */}
      <footer className="px-5 pb-4 space-y-1.5 shrink-0">
        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Audio Transport:</span>
            <span className="text-purple-400 font-bold">16kHz Linear PCM over WebSocket (TCP)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Packets Sent:</span>
            <span className="text-sky-400 font-bold">
              {packetsCount} ({((bytesProcessed || 0) / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>

        <div className="bg-surface/80 rounded-xl p-2 border border-slate-800/80 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-tight">
            <span className="text-slate-200 font-semibold">Zero-Dependency:</span> Runs on Node.js alone without LiveKit server binaries.
          </p>
        </div>
      </footer>
    </div>
  );
}
