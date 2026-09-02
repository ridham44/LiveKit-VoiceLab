/**
 * TTS provider factory — the one place a VoiceSettings object turns into a real
 * @livekit/agents-plugin-* TTS instance. Both the initial AgentSession build (session.ts) and
 * the live `voicelab.updateConfig` RPC handler (agent.ts) call this same function, so a provider
 * switch works identically whether it happens at session start or mid-call via
 * `Agent.updateOptions({ tts })`.
 */
import * as openai from '@livekit/agents-plugin-openai';
import type { tts } from '@livekit/agents';
import type { VoiceSettings } from '@voicelab/shared';
import { openAiCompatible } from '../config.js';

export function buildTts(settings: VoiceSettings): tts.TTS {
  switch (settings.ttsProvider) {
    case 'openrouter':
      return new openai.TTS({
        apiKey: openAiCompatible.apiKey,
        baseURL: openAiCompatible.baseURL,
        model: settings.ttsModel,
        voice: settings.voiceId as never,
        speed: settings.speed,
      });
    default: {
      const exhaustive: never = settings.ttsProvider;
      throw new Error(`Unknown TTS provider: ${exhaustive}`);
    }
  }
}
