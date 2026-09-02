/**
 * STT provider factory. Fast/Accurate/Custom (TranscriptionSettings.mode) select a provider
 * model via the catalog rather than being a LiveKit primitive — see
 * packages/shared/src/catalog.ts STT_CATALOG[provider].modes and capability.ts 'stt.mode'.
 */
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as openai from '@livekit/agents-plugin-openai';
import type { stt } from '@livekit/agents';
import { STT_CATALOG, type TranscriptionSettings } from '@voicelab/shared';
import { env, openAiCompatible } from '../config.js';

function resolveModel(settings: TranscriptionSettings): string {
  if (settings.mode === 'custom' && settings.customModel) return settings.customModel;
  const modes = STT_CATALOG[settings.sttProvider].modes;
  return settings.mode === 'fast' ? modes.fast : modes.accurate;
}

export function buildStt(settings: TranscriptionSettings): stt.STT {
  const model = resolveModel(settings);

  switch (settings.sttProvider) {
    case 'deepgram':
      return new deepgram.STT({
        apiKey: env.DEEPGRAM_API_KEY,
        model,
        language: settings.language,
        interimResults: true,
        profanityFilter: settings.profanityFilter,
        diarize: settings.diarization,
        keywords: settings.boostedKeywords.map((k) => [k.term, k.boost] as [string, number]),
        keyterm: settings.vocabulary,
      });
    case 'openai':
      return new openai.STT({
        apiKey: openAiCompatible.apiKey,
        baseURL: openAiCompatible.baseURL,
        model,
        language: settings.language,
        // No native keyword-boost API on OpenAI transcription models — best-effort fallback:
        // fold the vocabulary/boosted terms into the transcription prompt (see capability.ts
        // 'stt.boostedKeywords').
        prompt: [...settings.vocabulary, ...settings.boostedKeywords.map((k) => k.term)].join(', ') || undefined,
        keywords: settings.vocabulary,
      });
    default: {
      const exhaustive: never = settings.sttProvider;
      throw new Error(`Unknown STT provider: ${exhaustive}`);
    }
  }
}
