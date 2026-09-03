/**
 * Owns the LiveKit Room instance and the full connect/disconnect lifecycle: fetch a token,
 * connect, publish the microphone, start the agent session on the server, and clean up every
 * listener/track on disconnect. Everything else (transcripts, agent state, tool events) is read
 * from this same `room` via @livekit/components-react hooks, which is why it's exposed here
 * rather than duplicated.
 */
import { useCallback, useRef, useState } from 'react';
import { Room, RoomEvent, ConnectionState, TrackEvent } from 'livekit-client';
import { toast } from 'sonner';
import { api, ApiError } from '@/services/api';

export type CallPhase = 'idle' | 'connecting' | 'connected' | 'error';

export function useVoiceLabRoom(agentId: string | undefined) {
  const roomRef = useRef<Room | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const connect = useCallback(async () => {
    if (!agentId) {
      toast.error('Select an agent before connecting.');
      return;
    }
    if (roomRef.current) return; // already connecting/connected

    setPhase('connecting');
    setError(null);

    const newRoom = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = newRoom;
    setRoom(newRoom);

    newRoom.on(RoomEvent.Disconnected, () => {
      setPhase('idle');
      setCallId(null);
      roomRef.current = null;
      setRoom(null);
    });
    newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === ConnectionState.Connected) {
        console.log('[CLIENT] LiveKit connected');
        toast.success('Connected to LiveKit room');
      }
    });

    newRoom.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === 'microphone') console.log('[CLIENT] Microphone track published');
    });

    newRoom.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      if (track.kind === 'audio') {
        console.log(`[CLIENT] Remote audio track subscribed (participant: ${participant.identity})`);
        
        // Listen to when audio starts playing
        track.on(TrackEvent.AudioPlaybackStarted, () => {
          console.log('[CLIENT] Remote audio playback started');
        });
        track.on(TrackEvent.AudioPlaybackFailed, (err) => {
          console.error('[CLIENT] Remote audio playback failed (autoplay restricted?)', err);
        });
      }
    });

    newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.identity.startsWith('agent-')) {
        console.error('[CLIENT] Agent disconnected unexpectedly');
        setError('Agent disconnected unexpectedly. Check agent logs.');
        setPhase('error');
        void newRoom.disconnect();
      }
    });

    try {
      const { token, url, roomName } = await api.sessions.token(agentId, 'tester');
      await newRoom.connect(url, token);

      try {
        await newRoom.localParticipant.setMicrophoneEnabled(true);
        setMicPermission('granted');
      } catch {
        setMicPermission('denied');
        console.error('[CLIENT] Microphone permission denied');
        toast.error('Microphone permission denied — the agent will not hear you.');
      }

      const { callId: newCallId } = await api.sessions.start(agentId, roomName);
      setCallId(newCallId);
      setPhase('connected');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setPhase('error');
      toast.error(message);
      await newRoom.disconnect();
      roomRef.current = null;
      setRoom(null);
    }
  }, [agentId]);

  const disconnect = useCallback(
    async (reason: string = 'MANUAL') => {
      const current = roomRef.current;
      if (!current) return;
      if (callId) {
        await api.sessions.end(callId, reason).catch(() => undefined);
      }
      await current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setPhase('idle');
      setCallId(null);
    },
    [callId],
  );

  return { room, phase, error, callId, micPermission, connect, disconnect };
}
