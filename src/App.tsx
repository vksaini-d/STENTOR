import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Loader2,
  Signal,
  Server,
  ArrowLeft,
  AlertCircle,
  User,
} from 'lucide-react';
import { WebRtcTeacherView } from './webrtc/WebRtcTeacherView';
import { WebRtcStudentView } from './webrtc/WebRtcStudentView';
import { WsTeacherView } from './ws/WsTeacherView';
import { WsStudentView } from './ws/WsStudentView';
import { InstallPrompt } from './components/InstallPrompt';
import { cn } from './lib/utils';

type Architecture = 'arch1' | 'arch2' | null;
type Role = 'teacher' | 'student' | null;

interface SessionState {
  arch: Architecture;
  role: Role;
  token: string | null;
  roomName: string;
  studentName: string;
}

const INITIAL_STATE: SessionState = {
  arch: null,
  role: null,
  token: null,
  roomName: 'CLASS-01',
  studentName: '',
};

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: 'easeInOut' as const },
};

export default function App() {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/livekit`;
  const tokenUrl = `/api/token`;

  // ─── Auto-Join from QR Code URL Query Params ───
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlArch = params.get('arch');
      const urlRole = params.get('role') as Role;
      const urlRoom = params.get('room');
      const urlName = params.get('name');

      if (urlArch && ['arch1', 'arch2', 'arch3', 'arch4'].includes(urlArch)) {
        const roomName = urlRoom ? decodeURIComponent(urlRoom) : 'CLASS-01';
        const studentName = urlName ? decodeURIComponent(urlName) : '';

        // Map old arches
        const mappedArch = (urlArch === 'arch3' ? 'arch2' : urlArch === 'arch4' ? 'arch1' : urlArch) as Architecture;

        if (urlRole === 'student') {
          if (mappedArch === 'arch1') {
            // Direct instantaneous join for Arch 1 WebSocket
            setState({
              arch: mappedArch,
              role: 'student',
              token: null,
              roomName,
              studentName,
            });
          } else if (mappedArch === 'arch2') {
            // Auto-fetch LiveKit token for Arch 2
            setIsConnecting(true);
            const studentIdentifier = studentName.trim()
              ? studentName.trim().replace(/\s+/g, '-')
              : `student-${Math.floor(Math.random() * 10000)}`;

            fetch('/api/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identity: studentIdentifier,
                room: roomName,
                isTeacher: false,
              }),
            })
              .then(async (res) => {
                if (!res.ok) throw new Error(await res.text());
                return res.json();
              })
              .then(({ token }) => {
                setState({
                  arch: mappedArch,
                  role: 'student',
                  token,
                  roomName,
                  studentName,
                });
              })
              .catch((err) => {
                setError(`Auto-join failed: ${err.message}`);
                setState({
                  arch: mappedArch,
                  role: null,
                  token: null,
                  roomName,
                  studentName,
                });
              })
              .finally(() => {
                setIsConnecting(false);
              });
          }
        } else {
          // Pre-populate architecture
          setState((s) => ({
            ...s,
            arch: mappedArch,
            roomName,
            studentName,
          }));
        }
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  const selectArch = useCallback((arch: Architecture) => {
    setState((s) => ({ ...s, arch }));
    setError(null);
  }, []);

  const joinAsRole = useCallback(
    async (role: 'teacher' | 'student') => {
      setError(null);

      // Check secure context for Microphone (Teacher)
      if (role === 'teacher' && !window.isSecureContext) {
        setError(
          'Microphone access blocked by browser!\nYou must connect using HTTPS:\nhttps://' +
            window.location.host
        );
        return;
      }

      // Architecture 1 uses custom WebSocket PCM directly
      if (state.arch === 'arch1') {
        setState((s) => ({ ...s, role }));
        return;
      }

      // Architecture 2 uses LiveKit WebRTC SFU (fetch token from server)
      setIsConnecting(true);
      try {
        const studentIdentifier = state.studentName.trim()
          ? state.studentName.trim().replace(/\s+/g, '-')
          : `student-${Math.floor(Math.random() * 10000)}`;

        const identity = role === 'teacher' ? 'teacher-1' : studentIdentifier;

        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity,
            room: state.roomName,
            isTeacher: role === 'teacher',
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Server error: ${res.status} ${body}`);
        }

        const { token } = await res.json();
        setState((s) => ({ ...s, role, token }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setError(
          `Could not connect to LiveKit token server.\n${msg}\n\n👉 For zero-setup local testing without LiveKit binary, use Stentor Voice Relay mode!`
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [state.arch, state.roomName, state.studentName, tokenUrl]
  );

  const handleLeave = useCallback(() => {
    setState(INITIAL_STATE);
    setError(null);
  }, []);

  const goBack = useCallback(() => {
    if (state.role) {
      setState((s) => ({ ...s, role: null, token: null }));
    } else if (state.arch) {
      setState((s) => ({ ...s, arch: null }));
    }
    setError(null);
  }, [state.arch, state.role]);

  // ─── RENDER ACTIVE SESSION ───
  if (state.role && state.arch) {
    let sessionContent = null;

    // Arch 1: Voice Relay
    if (state.arch === 'arch1') {
      sessionContent = state.role === 'teacher' ? (
        <WsTeacherView roomCode={state.roomName} onLeave={handleLeave} />
      ) : (
        <WsStudentView roomCode={state.roomName} studentName={state.studentName} onLeave={handleLeave} />
      );
    }

    // Arch 2: High-Fidelity
    else if (state.arch === 'arch2' && state.token) {
      sessionContent = state.role === 'teacher' ? (
        <WebRtcTeacherView token={state.token} wsUrl={wsUrl} roomName={state.roomName} onLeave={handleLeave} />
      ) : (
        <WebRtcStudentView token={state.token} wsUrl={wsUrl} onLeave={handleLeave} />
      );
    }

    if (sessionContent) {
      return (
        <>
          <InstallPrompt />
          {sessionContent}
        </>
      );
    }
  }

  // ─── SETUP SCREENS ───
  return (
    <div className="min-h-screen bg-[--color-base] text-[--color-text-primary] flex items-center justify-center font-sans p-4">
      <InstallPrompt />
      <AnimatePresence mode="wait">
        {!state.arch ? (
          /* ─── Step 1: Pick Architecture ─── */
          <motion.div key="arch-select" {...pageTransition} className="w-full max-w-md px-4 py-6 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center p-3 glass-pill rounded-2xl">
                <Signal className="w-6 h-6 text-[--color-signal]" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Stentor</h1>
              <p className="text-[--color-text-secondary] text-xs leading-relaxed">
                The voice of fifty — heard by all.
                <br />
                <span className="text-[--color-signal] font-medium">Host:</span>{' '}
                <span className="font-mono text-[--color-text-secondary]">{window.location.host}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] text-[--color-text-secondary] font-semibold px-1">
                Select Architecture
              </p>

              {/* Arch 1: Stentor Voice Relay */}
              <button
                onClick={() => selectArch('arch1')}
                className="w-full flex items-center p-3.5 glass-card rounded-2xl transition-all duration-200 group hover:border-[rgba(29,204,224,0.25)] hover:shadow-[0_0_20px_rgba(29,204,224,0.1)] active:scale-[0.98]"
              >
                <div className="p-2.5 glass-pill rounded-xl mr-3 group-hover:bg-[--color-signal]/20 transition-colors border-none">
                  <Signal className="w-5 h-5 text-[--color-signal]" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <h3 className="text-xs font-bold text-[--color-text-primary]">Stentor Voice Relay</h3>
                    <span className="text-[9px] bg-[--color-signal]/20 text-[--color-signal] border border-[--color-signal]/30 px-1.5 py-0.5 rounded font-bold">
                      ANY WIFI
                    </span>
                  </div>
                  <p className="text-[11px] text-[--color-text-secondary] leading-tight">
                    Zero-dependency PCM. Works on phone hotspot, laptop hotspot, or dedicated router.
                  </p>
                </div>
              </button>

              {/* Arch 2: Stentor High-Fidelity */}
              <button
                onClick={() => selectArch('arch2')}
                className="w-full flex items-center p-3.5 glass-card rounded-2xl transition-all duration-200 group hover:border-[rgba(29,204,224,0.25)] hover:shadow-[0_0_20px_rgba(29,204,224,0.1)] active:scale-[0.98]"
              >
                <div className="p-2.5 glass-pill rounded-xl mr-3 group-hover:bg-[--color-signal]/20 transition-colors border-none">
                  <Server className="w-5 h-5 text-[--color-signal]" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <h3 className="text-xs font-bold text-[--color-text-primary]">Stentor High-Fidelity</h3>
                  </div>
                  <p className="text-[11px] text-[--color-text-secondary] leading-tight">
                    LiveKit WebRTC, requires LiveKit binary. Laptop Hotspot: ~15 phones. Dedicated Router: 100+ phones.
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        ) : !state.role ? (
          /* ─── Step 2: Pick Role & Student Name ─── */
          <motion.div key="role-select" {...pageTransition} className="w-full max-w-md px-4 py-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors active:scale-95">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold">Select Role & Info</h2>
                <p className="text-xs text-[--color-signal] font-medium">
                  {state.arch === 'arch1'
                    ? 'Stentor Voice Relay'
                    : 'Stentor High-Fidelity'}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs whitespace-pre-line leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Room Code & Student Name Input */}
            <div className="space-y-3 glass-card p-3.5 rounded-2xl">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[--color-text-secondary]">Classroom Code</label>
                <input
                  type="text"
                  value={state.roomName}
                  onChange={(e) => setState((s) => ({ ...s, roomName: e.target.value.toUpperCase() }))}
                  placeholder="CLASS-01"
                  className="w-full px-3 py-2 glass-footer border-none rounded-xl text-xs font-mono font-bold text-[--color-text-primary] focus:outline-none focus:ring-1 focus:ring-[--color-signal]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[--color-text-secondary] flex items-center gap-1">
                  <User className="w-3 h-3 text-[--color-signal]" />
                  Your Name (For Attendance Roster)
                </label>
                <input
                  type="text"
                  value={state.studentName}
                  onChange={(e) => setState((s) => ({ ...s, studentName: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 glass-footer border-none rounded-xl text-xs text-[--color-text-primary] focus:outline-none focus:ring-1 focus:ring-[--color-signal]"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => joinAsRole('teacher')}
                disabled={isConnecting}
                className={cn(
                  'w-full flex items-center p-3.5 glass-card rounded-2xl transition-all duration-200 group hover:border-[rgba(29,204,224,0.25)] hover:shadow-[0_0_20px_rgba(29,204,224,0.1)] active:scale-[0.98]',
                  isConnecting && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="p-2.5 glass-pill rounded-xl mr-3 group-hover:bg-[--color-signal]/15 transition-colors border-none">
                  <GraduationCap className="w-5 h-5 text-[--color-text-secondary] group-hover:text-[--color-signal] transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-[--color-text-primary] mb-0.5">Teacher (Broadcaster)</h3>
                  <p className="text-[11px] text-[--color-text-secondary]">Broadcast voice to the classroom</p>
                </div>
              </button>

              <button
                onClick={() => joinAsRole('student')}
                disabled={isConnecting}
                className={cn(
                  'w-full flex items-center p-3.5 glass-card rounded-2xl transition-all duration-200 group hover:border-[rgba(29,204,224,0.25)] hover:shadow-[0_0_20px_rgba(29,204,224,0.1)] active:scale-[0.98]',
                  isConnecting && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="p-2.5 glass-pill rounded-xl mr-3 group-hover:bg-[--color-signal]/15 transition-colors border-none">
                  <BookOpen className="w-5 h-5 text-[--color-text-secondary] group-hover:text-[--color-signal] transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-[--color-text-primary] mb-0.5">Student (Listener)</h3>
                  <p className="text-[11px] text-[--color-text-secondary]">Listen with earphones or phone speaker</p>
                </div>
              </button>
            </div>

            {isConnecting && (
              <div className="flex items-center justify-center gap-2 text-[--color-text-secondary] text-xs pt-1">
                <Loader2 className="w-4 h-4 animate-spin text-[--color-signal]" />
                <span>Connecting to classroom session…</span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
