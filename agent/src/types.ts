import type { Room } from '@livekit/rtc-node';

/** Passed as `AgentSession({ userData })`. Every tool and RPC handler gets this via
 * `ctx.userData` / closure, so it always knows which Call row and which live LiveKit room it's
 * reporting against. */
export interface AgentUserData {
  callId: string;
  agentId: string;
  configId: string;
  room: Room;
}
