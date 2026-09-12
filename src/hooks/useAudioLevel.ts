import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';

/**
 * Hook that creates an AnalyserNode on a given audio MediaStream or MediaStreamTrack
 * and returns a normalized audio level (0–1) updated via requestAnimationFrame.
 *
 * This is used to drive the real-time audio level meter visualizations
 * (the bouncing bars, the pulsing mic ring, etc.)
 */
export function useAudioLevel(track: MediaStreamTrack | null | undefined): number {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!track) {
      setLevel(0);
      return;
    }

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      const stream = new MediaStream([track]);
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      // Do NOT connect analyser to destination — we only read data, not play it here

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataRef.current = dataArray;

      function tick() {
        if (!analyserRef.current || !dataRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataRef.current as Uint8Array<ArrayBuffer>);

        // Compute RMS of the waveform to get a proper amplitude value
        let sumSquares = 0;
        for (let i = 0; i < dataRef.current.length; i++) {
          const normalized = (dataRef.current[i] - 128) / 128; // center around 0
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataRef.current.length);
        // Scale up: RMS for speech is typically 0.01–0.3, map to 0–1
        const scaled = Math.min(1, rms * 4);
        setLevel(scaled);

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(rafRef.current);
        source.disconnect();
        analyser.disconnect();
        ctx.close().catch(() => {});
        analyserRef.current = null;
        sourceRef.current = null;
        ctxRef.current = null;
        dataRef.current = null;
        setLevel(0);
      };
    } catch {
      setLevel(0);
    }
  }, [track]);

  return level;
}

/**
 * Hook that monitors incoming remote audio tracks in a LiveKit room
 * and returns the audio level of the first remote audio track (teacher's mic).
 */
export function useRemoteAudioLevel(room: Room | undefined): number {
  const [remoteTrack, setRemoteTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!room) return;

    function handleTrackSubscribed(
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) {
      if (track.kind === Track.Kind.Audio) {
        const mediaTrack = track.mediaStreamTrack;
        if (mediaTrack) {
          setRemoteTrack(mediaTrack);
        }
      }
    }

    function handleTrackUnsubscribed(track: RemoteTrack) {
      if (track.kind === Track.Kind.Audio) {
        setRemoteTrack(null);
      }
    }

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // Check if there's already a subscribed remote audio track
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.track.kind === Track.Kind.Audio && pub.isSubscribed) {
          const mediaTrack = pub.track.mediaStreamTrack;
          if (mediaTrack) {
            setRemoteTrack(mediaTrack);
          }
        }
      });
    });

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room]);

  return useAudioLevel(remoteTrack);
}

/**
 * Hook that returns real-time FFT frequency data from a track.
 * Used for the EQ bars visualizer.
 */
export function useAudioFrequency(track: MediaStreamTrack | null | undefined): Uint8Array | null {
  const [data, setData] = useState<Uint8Array | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!track) {
      setData(null);
      return;
    }
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Small FFT for ~32 bins
      analyser.smoothingTimeConstant = 0.8;

      const stream = new MediaStream([track]);
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataRef.current = dataArray;

      function tick() {
        if (!analyserRef.current || !dataRef.current) return;
        analyserRef.current.getByteFrequencyData(dataRef.current as unknown as Uint8Array<ArrayBuffer>);
        setData(new Uint8Array(dataRef.current)); // Need new array reference to trigger render
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(rafRef.current);
        source.disconnect();
        analyser.disconnect();
        ctx.close().catch(() => {});
      };
    } catch {
      setData(null);
    }
  }, [track]);

  return data;
}

/**
 * Returns FFT data for the first remote audio track.
 */
export function useRemoteAudioFrequency(room: Room | undefined): Uint8Array | null {
  const [remoteTrack, setRemoteTrack] = useState<MediaStreamTrack | null>(null);
  useEffect(() => {
    if (!room) return;
    function update() {
      let found = false;
      room!.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Audio && pub.isSubscribed) {
            if (pub.track.mediaStreamTrack) {
              setRemoteTrack(pub.track.mediaStreamTrack);
              found = true;
            }
          }
        });
      });
      if (!found) setRemoteTrack(null);
    }
    room.on(RoomEvent.TrackSubscribed, update);
    room.on(RoomEvent.TrackUnsubscribed, update);
    update();
    return () => {
      room.off(RoomEvent.TrackSubscribed, update);
      room.off(RoomEvent.TrackUnsubscribed, update);
    };
  }, [room]);
  return useAudioFrequency(remoteTrack);
}

/**
 * Returns the local microphone MediaStreamTrack from the room's local participant.
 */
export function useLocalMicTrack(room: Room | undefined): MediaStreamTrack | null {
  const [micTrack, setMicTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!room) return;

    function update() {
      const localPub = room!.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (localPub?.track?.mediaStreamTrack) {
        setMicTrack(localPub.track.mediaStreamTrack);
      } else {
        setMicTrack(null);
      }
    }

    room.on(RoomEvent.LocalTrackPublished, update);
    room.on(RoomEvent.LocalTrackUnpublished, update);
    room.on(RoomEvent.TrackMuted, update);
    room.on(RoomEvent.TrackUnmuted, update);

    // Initial check
    update();

    return () => {
      room.off(RoomEvent.LocalTrackPublished, update);
      room.off(RoomEvent.LocalTrackUnpublished, update);
      room.off(RoomEvent.TrackMuted, update);
      room.off(RoomEvent.TrackUnmuted, update);
    };
  }, [room]);

  return micTrack;
}
