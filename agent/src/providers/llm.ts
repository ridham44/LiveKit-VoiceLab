import * as openai from '@livekit/agents-plugin-openai';
import type { llm } from '@livekit/agents';
import type { BehaviorSettings } from '@voicelab/shared';
import { openAiCompatible } from '../config.js';

export function buildLlm(settings: BehaviorSettings): llm.LLM {
  switch (settings.llmProvider) {
    case 'openrouter':
      return new openai.LLM({
        apiKey: openAiCompatible.apiKey,
        baseURL: openAiCompatible.baseURL,
        model: settings.llmModel,
        temperature: settings.llmTemperature,
      });
    default: {
      const exhaustive: never = settings.llmProvider;
      throw new Error(`Unknown LLM provider: ${exhaustive}`);
    }
  }
}
