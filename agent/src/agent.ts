/**
 * Agent worker entrypoint. Registers with LiveKit using explicit dispatch (agentName set below),
 * so it only receives jobs the server explicitly dispatches via
 * AgentDispatchClient.createDispatch (see server/src/services/livekit.ts) — never automatically
 * for every room.
 */
import { fileURLToPath } from 'node:url';
import { AutoSubscribe, cli, defineAgent, ServerOptions, type JobContext } from '@livekit/agents';
import { LK_RPC, agentConfigInputSchema, type AgentConfigDto } from '@voicelab/shared';
import { applyLiveConfigUpdate } from './behavior/liveUpdate.js';
import { env } from './config.js';
import { runVoiceLabSession } from './session.js';

interface DispatchMetadata {
  callId: string;
  agentId: string;
  configId: string;
}

async function fetchAgentConfig(agentId: string): Promise<AgentConfigDto> {
  const res = await fetch(`${env.SERVER_URL}/api/agents/${agentId}/config`);
  if (!res.ok) throw new Error(`Failed to fetch config for agent ${agentId}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<AgentConfigDto>;
}

async function reportCallEnded(callId: string, reason: string) {
  try {
    await fetch(`${env.SERVER_URL}/api/sessions/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId, reason }),
    });
  } catch (err) {
    console.error('[agent] failed to report call end:', err);
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log(`[agent] Job received for room ${ctx.room.name}`);
    const metadata = JSON.parse(ctx.job.metadata || '{}') as Partial<DispatchMetadata>;
    if (!metadata.callId || !metadata.agentId) {
      throw new Error('Agent job dispatched without callId/agentId metadata — was it created via POST /api/sessions/start?');
    }
    const { callId, agentId } = metadata as DispatchMetadata;
    console.log(`[agent] Dispatch metadata: callId=${callId}, agentId=${agentId}`);

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    console.log(`[agent] Connected to room ${ctx.room.name}. Waiting for participant...`);
    await ctx.waitForParticipant();
    console.log(`[agent] Participant joined. Starting session...`);

    const config = await fetchAgentConfig(agentId);

    const { session, agent } = await runVoiceLabSession({ room: ctx.room, callId, agentId, config });

    // Live config updates (◆ Custom bridge over ✓ Native LiveKit RPC — see capability.ts
    // 'voice.ttsProvider' etc.). The dashboard calls this via room.localParticipant.performRpc.
    ctx.room.localParticipant?.registerRpcMethod(LK_RPC.updateConfig, async (data) => {
      try {
        const partial = agentConfigInputSchema.partial().parse(JSON.parse(data.payload));
        const result = await applyLiveConfigUpdate(session, agent, config, partial);
        return JSON.stringify({ ok: true, ...result });
      } catch (err) {
        return JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });

    ctx.room.localParticipant?.registerRpcMethod(LK_RPC.sayText, async (data) => {
      try {
        const { text } = JSON.parse(data.payload) as { text: string };
        session.say(text, { allowInterruptions: true });
        return JSON.stringify({ ok: true });
      } catch (err) {
        return JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });

    ctx.addShutdownCallback(async () => {
      await reportCallEnded(callId, 'USER_DISCONNECTED');
    });
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(
    new ServerOptions({
      agent: fileURLToPath(import.meta.url),
      agentName: env.LIVEKIT_AGENT_NAME,
      wsURL: env.LIVEKIT_URL,
      apiKey: env.LIVEKIT_API_KEY,
      apiSecret: env.LIVEKIT_API_SECRET,
    }),
  );
}
