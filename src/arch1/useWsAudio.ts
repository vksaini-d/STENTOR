import { useState, useEffect, useRef, useCallback } from 'react';

const TRANSMIT_SAMPLE_RATE = 16000;

export type NoiseGateMode = 'off' | 'normal' | 'aggressive';
export type AudioOutputMode = 'earphones' | 'speaker';

export interface Participant {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  joinTime: number;
}

function downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer] || 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWAV(samples: Int16Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function useWsAudio({
  role,
  roomCode,
  userName,
}: {
  role: 'teacher' | 'student';
  roomCode: string;
  userName?: string;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [roster, setRoster] = useState<Participant[]>([]);
  const [teacherActive, setTeacherActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [bytesProcessed, setBytesProcessed] = useState(0);
  const [packetsCount, setPacketsCount] = useState(0);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [volume, setVolumeState] = useState(0.85);

  // Anti-Echo & Feedback controls
  const [noiseGateMode, setNoiseGateMode] = useState<NoiseGateMode>('normal');
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [outputMode, setOutputModeState] = useState<AudioOutputMode>('earphones');
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isPttPressed, setIsPttPressed] = useState(false);

  // Captions
  const [liveCaption, setLiveCaption] = useState<string>('');

  // Lecture Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedDurationSec, setRecordedDurationSec] = useState(0);
  const recordedChunks = useRef<Int16Array[]>([]);
  const recordingTimer = useRef<number | null>(null);

  const ws = useRef<WebSocket | null>(null);

  // Teacher capture & DSP refs
  const micStream = useRef<MediaStream | null>(null);
  const captureCtx = useRef<AudioContext | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const isBroadcastingRef = useRef(false);
  const gateHoldCounter = useRef(0);
  const gateGainRef = useRef(0.0); // Continuous envelope follower (0.0 to 1.0)
  const sentSilenceFrameRef = useRef(false);

  const noiseGateModeRef = useRef<NoiseGateMode>('normal');
  const isPushToTalkRef = useRef(false);
  const isPttPressedRef = useRef(false);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    noiseGateModeRef.current = noiseGateMode;
  }, [noiseGateMode]);

  useEffect(() => {
    isPushToTalkRef.current = isPushToTalk;
  }, [isPushToTalk]);

  useEffect(() => {
    isPttPressedRef.current = isPttPressed;
  }, [isPttPressed]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Student playback refs
  const playbackCtx = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const speakerDampFilter = useRef<BiquadFilterNode | null>(null);
  const nextPlayTime = useRef<number>(0);
  const outputModeRef = useRef<AudioOutputMode>('earphones');

  useEffect(() => {
    outputModeRef.current = outputMode;
    if (playbackCtx.current && speakerDampFilter.current) {
      if (outputMode === 'speaker') {
        speakerDampFilter.current.frequency.setValueAtTime(4500, playbackCtx.current.currentTime);
      } else {
        speakerDampFilter.current.frequency.setValueAtTime(12000, playbackCtx.current.currentTime);
      }
    }
  }, [outputMode]);

  // Play a pleasant chime tone to confirm phone speaker is working
  const playTestTone = useCallback(() => {
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!playbackCtx.current) {
        playbackCtx.current = new AudioCtxClass();
      }
      const ctx = playbackCtx.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.error('Failed to play test tone:', e);
    }
  }, []);

  // Unlock audio via direct user gesture
  const unlockAudio = useCallback(async () => {
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!playbackCtx.current) {
        playbackCtx.current = new AudioCtxClass();
      }
      if (playbackCtx.current.state === 'suspended') {
        await playbackCtx.current.resume();
      }

      if (!masterGain.current) {
        masterGain.current = playbackCtx.current.createGain();
        masterGain.current.gain.value = volume;

        speakerDampFilter.current = playbackCtx.current.createBiquadFilter();
        speakerDampFilter.current.type = 'lowpass';
        speakerDampFilter.current.frequency.value =
          outputModeRef.current === 'speaker' ? 4500 : 12000;

        speakerDampFilter.current.connect(masterGain.current);
        masterGain.current.connect(playbackCtx.current.destination);
      }

      setIsAudioUnlocked(true);
      playTestTone();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Audio unlock failed';
      setError(`Audio unlock failed: ${msg}`);
      return false;
    }
  }, [playTestTone, volume]);

  const setVolume = useCallback((v: number) => {
    const effectiveVolume = outputModeRef.current === 'speaker' ? Math.min(v, 0.75) : v;
    setVolumeState(effectiveVolume);
    if (masterGain.current && playbackCtx.current) {
      masterGain.current.gain.setValueAtTime(effectiveVolume, playbackCtx.current.currentTime);
    }
  }, []);

  const setOutputMode = useCallback(
    (mode: AudioOutputMode) => {
      setOutputModeState(mode);
      if (mode === 'speaker' && volume > 0.75) {
        setVolume(0.7);
      }
    },
    [volume, setVolume]
  );

  // Send live speech captions to room
  const sendCaption = useCallback((text: string, isFinal: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'caption',
          text,
          isFinal,
        })
      );
    }
    setLiveCaption(text);
  }, []);

  // Lecture Recording controls
  const startRecording = useCallback(() => {
    recordedChunks.current = [];
    setRecordedDurationSec(0);
    setIsRecording(true);
    isRecordingRef.current = true;

    if (recordingTimer.current) clearInterval(recordingTimer.current);
    recordingTimer.current = window.setInterval(() => {
      setRecordedDurationSec((s) => s + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback((): Blob | null => {
    setIsRecording(false);
    isRecordingRef.current = false;
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    if (recordedChunks.current.length === 0) return null;

    let totalLength = 0;
    for (const chunk of recordedChunks.current) {
      totalLength += chunk.length;
    }
    const combined = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of recordedChunks.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return encodeWAV(combined, TRANSMIT_SAMPLE_RATE);
  }, []);

  const downloadRecording = useCallback(() => {
    const blob = stopRecording();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClassCast-Lecture-${roomCode}-${new Date().toISOString().substring(0, 10)}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stopRecording, roomCode]);

  // Handle incoming PCM audio chunks on student with Smooth De-Clicking
  const handleIncomingPcm = useCallback(
    (arrayBuffer: ArrayBuffer) => {
      setBytesProcessed((prev) => prev + arrayBuffer.byteLength);
      setPacketsCount((prev) => prev + 1);

      const int16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(int16.length);
      let sumSquares = 0;

      for (let i = 0; i < int16.length; i++) {
        const s = int16[i] / (int16[i] < 0 ? 32768.0 : 32767.0);
        float32[i] = s;
        sumSquares += s * s;
      }

      // Soft cosine crossfade at buffer boundaries (De-Clicker: stops pop/click artifacts)
      const rampLen = Math.min(24, float32.length);
      for (let i = 0; i < rampLen; i++) {
        const factor = 0.5 * (1 - Math.cos((Math.PI * i) / rampLen));
        float32[i] *= factor;
        float32[float32.length - 1 - i] *= factor;
      }

      const rms = Math.sqrt(sumSquares / int16.length);
      setAudioLevel(Math.min(1, rms * 5));

      if (!playbackCtx.current || playbackCtx.current.state !== 'running') {
        return;
      }

      try {
        const ctx = playbackCtx.current;
        const audioBuffer = ctx.createBuffer(1, float32.length, TRANSMIT_SAMPLE_RATE);
        audioBuffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        if (!speakerDampFilter.current || !masterGain.current) {
          masterGain.current = ctx.createGain();
          masterGain.current.gain.value = volume;

          speakerDampFilter.current = ctx.createBiquadFilter();
          speakerDampFilter.current.type = 'lowpass';
          speakerDampFilter.current.frequency.value =
            outputModeRef.current === 'speaker' ? 4500 : 12000;

          speakerDampFilter.current.connect(masterGain.current);
          masterGain.current.connect(ctx.destination);
        }

        source.connect(speakerDampFilter.current);

        const now = ctx.currentTime;
        // Jitter buffer with smooth 55ms lead time (prevents buffer underrun crackles)
        if (nextPlayTime.current < now || nextPlayTime.current > now + 0.45) {
          nextPlayTime.current = now + 0.055;
        }

        source.start(nextPlayTime.current);
        nextPlayTime.current += audioBuffer.duration;
      } catch (e) {
        console.error('Error playing PCM audio frame:', e);
      }
    },
    [volume]
  );

  // Connect WebSocket with Clean Disconnect Guard
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxRetries = 5;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/arch1-ws`;
        ws.current = new WebSocket(wsUrl);
        ws.current.binaryType = 'arraybuffer';

        ws.current.onopen = () => {
          setIsConnected(true);
          setError(null);
          reconnectAttempts = 0;

          ws.current?.send(
            JSON.stringify({
              type: 'join',
              role,
              room: roomCode,
              name: userName || (role === 'teacher' ? 'Professor' : 'Student'),
            })
          );
        };

        ws.current.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            if (role === 'student') {
              handleIncomingPcm(event.data);
            }
          } else if (typeof event.data === 'string') {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'participants') {
                setParticipantCount(data.count);
              } else if (data.type === 'roster') {
                setParticipantCount(data.count);
                if (Array.isArray(data.participants)) {
                  setRoster(data.participants);
                }
              } else if (data.type === 'teacher-status') {
                setTeacherActive(data.active);
              } else if (data.type === 'caption') {
                setLiveCaption(data.text);
              }
            } catch (e) {
              console.error('Failed to parse WS message', e);
            }
          }
        };

        ws.current.onclose = () => {
          setIsConnected(false);
          setIsBroadcasting(false);
          isBroadcastingRef.current = false;
          if (!isCleanedUp && reconnectAttempts < maxRetries) {
            reconnectAttempts++;
            setTimeout(connect, Math.min(1000 * Math.pow(2, reconnectAttempts), 8000));
          } else if (!isCleanedUp) {
            setError('Connection to classroom server lost. Please refresh.');
          }
        };

        ws.current.onerror = () => {
          setError('WebSocket network error.');
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setError(msg);
      }
    };

    connect();

    return () => {
      isCleanedUp = true;
      if (ws.current) {
        // Prevent Chrome warning: don't call close while CONNECTING
        if (ws.current.readyState === WebSocket.CONNECTING) {
          const s = ws.current;
          s.onopen = () => s.close();
        } else if (ws.current.readyState === WebSocket.OPEN) {
          ws.current.close();
        }
      }
    };
  }, [role, roomCode, userName, handleIncomingPcm]);

  // Teacher Start Microphone with Analog-Style Soft Envelope Fade (No Digital Pops)
  const startMic = useCallback(async () => {
    if (role !== 'teacher') return;

    if (!window.isSecureContext) {
      setError('Microphone access blocked! You MUST use HTTPS or localhost.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      micStream.current = stream;

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const actx = new AudioCtxClass();
      captureCtx.current = actx;

      const sourceNode = actx.createMediaStreamSource(stream);

      const highpassFilter = actx.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 130;

      const lowpassFilter = actx.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 5500;

      const compressor = actx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, actx.currentTime);
      compressor.knee.setValueAtTime(10, actx.currentTime);
      compressor.ratio.setValueAtTime(4, actx.currentTime);
      compressor.attack.setValueAtTime(0.005, actx.currentTime);
      compressor.release.setValueAtTime(0.2, actx.currentTime);

      const processor = actx.createScriptProcessor(2048, 1, 1);
      scriptProcessor.current = processor;

      sourceNode.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(compressor);
      compressor.connect(processor);

      const muteGain = actx.createGain();
      muteGain.gain.value = 0;
      processor.connect(muteGain);
      muteGain.connect(actx.destination);

      gateGainRef.current = 0.0;
      sentSilenceFrameRef.current = false;

      processor.onaudioprocess = (e) => {
        if (!isBroadcastingRef.current) return;

        if (isPushToTalkRef.current && !isPttPressedRef.current) {
          setIsGateOpen(false);
          setAudioLevel(0);
          return;
        }

        const inputChannel = e.inputBuffer.getChannelData(0);

        let sumSquares = 0;
        for (let i = 0; i < inputChannel.length; i++) {
          sumSquares += inputChannel[i] * inputChannel[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannel.length);
        setAudioLevel(Math.min(1, rms * 5));

        const currentMode = noiseGateModeRef.current;
        const gateThreshold =
          currentMode === 'aggressive' ? 0.025 : currentMode === 'normal' ? 0.010 : 0.001;

        const isVoiceActive = rms >= gateThreshold;

        if (isVoiceActive) {
          gateHoldCounter.current = 8; // Hold open for ~320ms to prevent choppy words
          setIsGateOpen(true);
        } else if (gateHoldCounter.current > 0) {
          gateHoldCounter.current--;
          setIsGateOpen(true);
        } else {
          setIsGateOpen(false);
        }

        const targetGain =
          currentMode === 'off' || isVoiceActive || gateHoldCounter.current > 0 ? 1.0 : 0.0;

        // If completely faded out to silence and silence frame was already sent, sleep
        if (targetGain === 0.0 && gateGainRef.current < 0.001 && sentSilenceFrameRef.current) {
          return;
        }

        const downsampled = downsample(inputChannel, actx.sampleRate, TRANSMIT_SAMPLE_RATE);
        const int16 = new Int16Array(downsampled.length);

        // Smooth sample-by-sample exponential envelope follower (Soft Fade-In / Soft Fade-Out)
        // Completely eliminates DC step pops, clicks, and distortion when speaker stops!
        let g = gateGainRef.current;
        for (let i = 0; i < downsampled.length; i++) {
          const alpha = targetGain > g ? 0.05 : 0.012; // Fast 15ms attack, gentle 35ms analog decay
          g += (targetGain - g) * alpha;
          const s = downsampled[i] * g;
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
        }
        gateGainRef.current = g;

        if (g < 0.002 && targetGain === 0.0) {
          sentSilenceFrameRef.current = true;
        } else {
          sentSilenceFrameRef.current = false;
        }

        // Record into memory if recording is active
        if (isRecordingRef.current) {
          recordedChunks.current.push(new Int16Array(int16));
        }

        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(int16.buffer);
          setBytesProcessed((prev) => prev + int16.buffer.byteLength);
          setPacketsCount((prev) => prev + 1);
        }
      };

      isBroadcastingRef.current = true;
      setIsBroadcasting(true);

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'teacher-status', active: true }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(msg);
    }
  }, [role]);

  // Teacher Stop Microphone
  const stopMic = useCallback(() => {
    isBroadcastingRef.current = false;
    setIsBroadcasting(false);
    setIsGateOpen(false);
    setAudioLevel(0);
    gateGainRef.current = 0.0;
    sentSilenceFrameRef.current = false;

    if (scriptProcessor.current) {
      scriptProcessor.current.disconnect();
      scriptProcessor.current = null;
    }
    if (captureCtx.current) {
      captureCtx.current.close().catch(() => {});
      captureCtx.current = null;
    }
    if (micStream.current) {
      micStream.current.getTracks().forEach((t) => t.stop());
      micStream.current = null;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'teacher-status', active: false }));
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMic();
      if (playbackCtx.current) {
        playbackCtx.current.close().catch(() => {});
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [stopMic]);

  return {
    isConnected,
    isBroadcasting,
    participantCount,
    roster,
    teacherActive,
    error,
    startMic,
    stopMic,
    audioLevel,
    bytesProcessed,
    packetsCount,
    isAudioUnlocked,
    unlockAudio,
    volume,
    setVolume,
    playTestTone,
    // Anti-Echo & Noise Gate
    noiseGateMode,
    setNoiseGateMode,
    isGateOpen,
    outputMode,
    setOutputMode,
    isPushToTalk,
    setIsPushToTalk,
    isPttPressed,
    setIsPttPressed,
    // Live Captions
    liveCaption,
    sendCaption,
    // Lecture Recording
    isRecording,
    recordedDurationSec,
    startRecording,
    stopRecording,
    downloadRecording,
  };
}
