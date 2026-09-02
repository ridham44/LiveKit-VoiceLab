import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { sessionEndSchema, sessionStartSchema, tokenRequestSchema, type TokenResponse, type SessionStartResponse } from '@voicelab/shared';
import { env } from '../config/env.js';
import * as agentsService from '../services/agents.js';
import * as callsService from '../services/calls.js';
import { deleteRoom, dispatchAgent, mintParticipantToken, newRoomName } from '../services/livekit.js';

export async function createToken(req: Request, res: Response) {
  const input = tokenRequestSchema.parse(req.body);
  await agentsService.getAgent(input.agentId); // 404s if the agent doesn't exist
  const roomName = newRoomName();
  const participantIdentity = `${input.participantName}-${randomUUID().slice(0, 6)}`;
  const agentIdentity = env.LIVEKIT_AGENT_NAME;

  const token = await mintParticipantToken({ roomName, participantIdentity, participantName: input.participantName });

  const body: TokenResponse = { token, url: env.LIVEKIT_URL, roomName, participantIdentity, agentIdentity };
  res.json(body);
}

export async function startSession(req: Request, res: Response) {
  const input = sessionStartSchema.parse(req.body);
  const agent = await agentsService.getAgent(input.agentId);
  const activeConfig = await agentsService.getActiveConfigForAgent(input.agentId);

  const call = await callsService.startCall({
    agentId: input.agentId,
    configId: activeConfig.id,
    roomName: input.roomName,
    sttProvider: activeConfig.transcriptionSettings.sttProvider,
    llmProvider: activeConfig.behaviorSettings.llmProvider,
    ttsProvider: activeConfig.voiceSettings.ttsProvider,
  });

  const dispatch = await dispatchAgent(input.roomName, {
    callId: call.id,
    agentId: agent.id,
    configId: activeConfig.id,
  });

  const body: SessionStartResponse = { callId: call.id, roomName: input.roomName, dispatchId: dispatch.id };
  res.status(201).json(body);
}

export async function endSession(req: Request, res: Response) {
  const input = sessionEndSchema.parse(req.body);
  const call = await callsService.endCall(input.callId, input.reason);
  await deleteRoom(call.roomName);
  res.json({ ok: true });
}
