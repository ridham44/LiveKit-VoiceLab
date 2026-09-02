/**
 * TTS provider factory — the one place a VoiceSettings object turns into a real
 * @livekit/agents-plugin-* TTS instance. Both the initial AgentSession build (session.ts) and
 * the live `voicelab.updateConfig` RPC handler (agent.ts) call this same function, so a provider
 * switch works identically whether it happens at session start or mid-call via
 * `Agent.updateOptions({ tts })`.
 */
import * as cartesia from '@livekit/agents-plugin-cartesia';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as openai from '@livekit/agents-plugin-openai';
import type { tts } from '@livekit/agents';
import type { VoiceSettings } from '@voicelab/shared';
import { env } from '../config.js';

export function buildTts(settings: VoiceSettings): tts.TTS {
  switch (settings.ttsProvider) {
    case 'openai':
      return new openai.TTS({
        apiKey: env.OPENAI_API_KEY,
        model: settings.ttsModel,
        voice: settings.voiceId as never,
        speed: settings.speed,
      });
    case 'elevenlabs':
      return new elevenlabs.TTS({
        apiKey: env.ELEVEN_API_KEY,
        voiceId: settings.voiceId,
        model: settings.ttsModel,
        voiceSettings:
          settings.stability != null
            ? { stability: settings.stability, similarity_boost: 0.75, speed: settings.speed }
            : undefined,
        applyTextNormalization: settings.speechNormalization ? 'on' : 'off',
      });
    case 'cartesia':
      return new cartesia.TTS({
        apiKey: env.CARTESIA_API_KEY,
        model: settings.ttsModel,
        voice: settings.voiceId,
        speed: settings.speed,
        // sonic-3 is the only Cartesia model that honours volume server-side; see
        // packages/shared/src/catalog.ts capabilities.serverSideVolume.
        volume: settings.ttsModel === 'sonic-3' ? settings.volume : undefined,
      });
    default: {
      const exhaustive: never = settings.ttsProvider;
      throw new Error(`Unknown TTS provider: ${exhaustive}`);
    }
  }
}
