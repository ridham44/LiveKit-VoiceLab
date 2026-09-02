/**
 * LiveKit token issuance and agent dispatch. The API secret never leaves this process — the
 * client only ever receives a short-lived signed JWT (see routes/sessions.ts).
 */
import { AccessToken, AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const httpUrl = env.LIVEKIT_URL.replace(/^ws/, 'http');

export const roomService = new RoomServiceClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
export const agentDispatchClient = new AgentDispatchClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

export function newRoomName(): string {
  return `voicelab-${randomUUID().slice(0, 8)}`;
}

export async function mintParticipantToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}): Promise<string> {
  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: params.participantIdentity,
    name: params.participantName,
    ttl: '1h',
  });
  at.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

/** Explicit dispatch: the worker registers with `agentName` (see agent/src/agent.ts), so jobs
 * only reach it via this call or a token's roomConfig — never automatically for every room. */
export async function dispatchAgent(roomName: string, metadata: Record<string, unknown>) {
  return agentDispatchClient.createDispatch(roomName, env.LIVEKIT_AGENT_NAME, {
    metadata: JSON.stringify(metadata),
  });
}

export async function deleteRoom(roomName: string): Promise<void> {
  try {
    await roomService.deleteRoom(roomName);
  } catch {
    // Room may already be gone (e.g. everyone disconnected and emptyTimeout fired) — not an error.
  }
}
