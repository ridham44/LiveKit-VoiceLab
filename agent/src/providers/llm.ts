import * as openai from '@livekit/agents-plugin-openai';
import { inference, type llm } from '@livekit/agents';
import type { BehaviorSettings } from '@voicelab/shared';
import { openAiCompatible } from '../config.js';

export function buildLlm(settings: BehaviorSettings): llm.LLM {
  switch (settings.llmProvider) {
    case 'openrouter':
      if (!openAiCompatible.apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set but openrouter LLM is selected.');
      }
      return new openai.LLM({
        apiKey: openAiCompatible.apiKey,
        baseURL: openAiCompatible.baseURL,
        model: settings.llmModel,
        temperature: settings.llmTemperature,
      });
    case 'livekit':
      return new inference.LLM({
        model: settings.llmModel as any,
        modelOptions: { temperature: settings.llmTemperature }
      });
    default: {
      const exhaustive: never = settings.llmProvider;
      throw new Error(`Unknown LLM provider: ${exhaustive}`);
    }
  }
}
