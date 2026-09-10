import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Loader2,
  Signal,
  Wifi,
  Server,
  ArrowLeft,
  AlertCircle,
  Router,
  Terminal,
  User,
} from 'lucide-react';
import { TeacherView } from './TeacherView';
import { StudentView } from './StudentView';
import { Arch1TeacherView } from './arch1/Arch1TeacherView';
import { Arch1StudentView } from './arch1/Arch1StudentView';
import { Arch3TeacherView } from './arch3/Arch3TeacherView';
import { Arch3StudentView } from './arch3/Arch3StudentView';
import { Arch4TeacherView } from './arch4/Arch4TeacherView';
import { Arch4StudentView } from './arch4/Arch4StudentView';
import { InstallPrompt } from './components/InstallPrompt';
import { cn } from './lib/utils';

type Architecture = 'arch1' | 'arch2' | 'arch3' | 'arch4' | null;
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
      const urlArch = params.get('arch') as Architecture;
      const urlRole = params.get('role') as Role;
      const urlRoom = params.get('room');
      const urlName = params.get('name');

      if (urlArch && ['arch1', 'arch2', 'arch3', 'arch4'].includes(urlArch)) {
        const roomName = urlRoom ? decodeURIComponent(urlRoom) : 'CLASS-01';
        const studentName = urlName ? decodeURIComponent(urlName) : '';

        if (urlRole === 'student') {
          if (urlArch === 'arch1' || urlArch === 'arch4') {
            // Direct instantaneous join for Arch 1 & Arch 4 WebSocket
            setState({
              arch: urlArch,
              role: 'student',
              token: null,
              roomName,
              studentName,
            });
          } else if (urlArch === 'arch2' || urlArch === 'arch3') {
            // Auto-fetch LiveKit token for Arch 2 & Arch 3 WebRTC SFU
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
                  arch: urlArch,
                  role: 'student',
                  token,
                  roomName,
                  studentName,
                });
              })
              .catch((err) => {
                setError(`Auto-join failed: ${err.message}`);
                setState({
                  arch: urlArch,
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
            arch: urlArch,
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

      // Architectures 1 and 4 use custom WebSocket PCM directly
      if (state.arch === 'arch1' || state.arch === 'arch4') {
        setState((s) => ({ ...s, role }));
        return;
      }

      // Architectures 2 and 3 use LiveKit WebRTC SFU (fetch token from server)
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
          `Could not connect to LiveKit token server.\n${msg}\n\n👉 For zero-setup local testing without LiveKit binary, use Architecture 1 or Architecture 4!`
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

    // Arch 1: Phone Hotspot Lite
    if (state.arch === 'arch1') {
      sessionContent = state.role === 'teacher' ? (
        <Arch1TeacherView roomCode={state.roomName} onLeave={handleLeave} />
      ) : (
        <Arch1StudentView roomCode={state.roomName} onLeave={handleLeave} />
      );
    }

    // Arch 2: Laptop Hotspot + LiveKit
    else if (state.arch === 'arch2' && state.token) {
      sessionContent = state.role === 'teacher' ? (
        <TeacherView token={state.token} wsUrl={wsUrl} roomName={state.roomName} onLeave={handleLeave} />
      ) : (
        <StudentView token={state.token} wsUrl={wsUrl} roomName={state.roomName} onLeave={handleLeave} />
      );
    }

    // Arch 3: Dedicated WiFi Router + LiveKit (High Capacity)
    else if (state.arch === 'arch3' && state.token) {
      sessionContent = state.role === 'teacher' ? (
        <Arch3TeacherView token={state.token} wsUrl={wsUrl} roomName={state.roomName} onLeave={handleLeave} />
      ) : (
        <Arch3StudentView token={state.token} wsUrl={wsUrl} roomName={state.roomName} onLeave={handleLeave} />
      );
    }

    // Arch 4: Laptop Custom WebSocket PCM (Zero Dependencies, Recording)
    else if (state.arch === 'arch4') {
      sessionContent = state.role === 'teacher' ? (
        <Arch4TeacherView roomCode={state.roomName} onLeave={handleLeave} />
      ) : (
        <Arch4StudentView
          roomCode={state.roomName}
          studentName={state.studentName}
          onLeave={handleLeave}
        />
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
    <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center font-sans p-4">
      <InstallPrompt />
      <AnimatePresence mode="wait">
        {!state.arch ? (
          /* ─── Step 1: Pick Architecture ─── */
          <motion.div key="arch-select" {...pageTransition} className="w-full max-w-md px-4 py-6 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center p-3 bg-brand/15 rounded-2xl">
                <Signal className="w-6 h-6 text-brand" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">ClassCast Studio</h1>
              <p className="text-slate-400 text-xs leading-relaxed">
                Stream teacher voice to student phones over local WiFi.
                <br />
                <span className="text-brand font-medium">Host:</span>{' '}
                <span className="font-mono text-slate-300">{window.location.host}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold px-1">
                Select Architecture
              </p>

              {/* Arch 1: Phone Hotspot Lite */}
              <button
                onClick={() => selectArch('arch1')}
                className="w-full flex items-center p-3.5 bg-surface rounded-2xl border border-slate-800 transition-all duration-200 group hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] active:scale-[0.98]"
              >
                <div className="p-2.5 bg-emerald-500/10 rounded-xl mr-3 group-hover:bg-emerald-500/20 transition-colors">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-xs font-bold text-white">Arch 1 · Phone Hotspot Lite</h3>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                      5–10 PHONES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Zero hardware needed. Teacher phone hosts hotspot, students connect directly.
                  </p>
                </div>
              </button>

              {/* Arch 2: Laptop Hotspot + LiveKit */}
              <button
                onClick={() => selectArch('arch2')}
                className="w-full flex items-center p-3.5 bg-surface rounded-2xl border border-slate-800 transition-all duration-200 group hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-[0.98]"
              >
                <div className="p-2.5 bg-blue-500/10 rounded-xl mr-3 group-hover:bg-blue-500/20 transition-colors">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-xs font-bold text-white">Arch 2 · Laptop Hotspot (LiveKit)</h3>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                      10–15 PHONES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Windows Mobile Hotspot (<code className="text-slate-300">192.168.137.1</code>) + LiveKit SFU.
                  </p>
                </div>
              </button>

              {/* Arch 3: Dedicated WiFi Router + LiveKit (High Capacity) */}
              <button
                onClick={() => selectArch('arch3')}
                className="w-full flex items-center p-3.5 bg-surface rounded-2xl border border-slate-800 transition-all duration-200 group hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] active:scale-[0.98]"
              >
                <div className="p-2.5 bg-cyan-500/10 rounded-xl mr-3 group-hover:bg-cyan-500/20 transition-colors">
                  <Router className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-xs font-bold text-white">Arch 3 · Dedicated WiFi Router</h3>
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                      30–100+ PHONES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    ₹1000 router LAN + LiveKit SFU. Full classroom roster & live captions.
                  </p>
                </div>
              </button>

              {/* Arch 4: Laptop Custom WebSocket PCM */}
              <button
                onClick={() => selectArch('arch4')}
                className="w-full flex items-center p-3.5 bg-surface rounded-2xl border border-slate-800 transition-all duration-200 group hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] active:scale-[0.98]"
              >
                <div className="p-2.5 bg-purple-500/10 rounded-xl mr-3 group-hover:bg-purple-500/20 transition-colors">
                  <Terminal className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-xs font-bold text-white">Arch 4 · Custom WebSocket PCM</h3>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                      ZERO-LIVEKIT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Pure Node.js + Web Audio API. Built-in Lecture Recording (.wav download) & Anti-Echo VAD.
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        ) : !state.role ? (
          /* ─── Step 2: Pick Role & Student Name ─── */
          <motion.div key="role-select" {...pageTransition} className="w-full max-w-md px-4 py-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-slate-400 hover:text-white transition-colors active:scale-95">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold">Select Role & Info</h2>
                <p className="text-xs text-brand font-medium">
                  {state.arch === 'arch1'
                    ? 'Arch 1 · Phone Hotspot Lite'
                    : state.arch === 'arch2'
                      ? 'Arch 2 · Laptop Hotspot (LiveKit)'
                      : state.arch === 'arch3'
                        ? 'Arch 3 · Router LiveKit (30–100+)'
                        : 'Arch 4 · Custom WebSocket PCM'}
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
            <div className="space-y-3 bg-surface/90 p-3.5 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Classroom Code</label>
                <input
                  type="text"
                  value={state.roomName}
                  onChange={(e) => setState((s) => ({ ...s, roomName: e.target.value.toUpperCase() }))}
                  placeholder="CLASS-01"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold tracking-wider text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-brand" />
                  Your Name (For Attendance Roster)
                </label>
                <input
                  type="text"
                  value={state.studentName}
                  onChange={(e) => setState((s) => ({ ...s, studentName: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => joinAsRole('teacher')}
                disabled={isConnecting}
                className={cn(
                  'w-full flex items-center p-3.5 bg-surface rounded-2xl border border-slate-800 transition-all duration-200 group hover:border-brand/40 active:scale-[0.98]',
                  isConnecting && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="p-2.5 bg-slate-800 rounded-xl mr-3 group-hover:bg-brand/15 transition-colors">
                  <GraduationCap className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white mb-0.5">Teacher (Broadcaster)</h3>
                  <p className="text-[11px] text-slate-400">Broadcast voice to the classroom</p>
                </div>
              </button>

              <button
                onClick={() => joinAsRole('student')}
                disabled={isConnecting}
                className={cn(
                  'w-full flex items-center p-3.5 bg-surface rounded-2xl border border-slate-800 transition-all duration-200 group hover:border-blue-500/40 active:scale-[0.98]',
                  isConnecting && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="p-2.5 bg-slate-800 rounded-xl mr-3 group-hover:bg-blue-500/15 transition-colors">
                  <BookOpen className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white mb-0.5">Student (Listener)</h3>
                  <p className="text-[11px] text-slate-400">Listen with earphones or phone speaker</p>
                </div>
              </button>
            </div>

            {isConnecting && (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs pt-1">
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                <span>Connecting to classroom session…</span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
