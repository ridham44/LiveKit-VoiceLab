/** STT provider factory. */
import { inference, type stt } from '@livekit/agents';
import { STT_CATALOG, type TranscriptionSettings } from '@voicelab/shared';

function resolveModel(settings: TranscriptionSettings): string {
  if (settings.mode === 'custom' && settings.customModel) return settings.customModel;
  const modes = STT_CATALOG[settings.sttProvider].modes;
  return settings.mode === 'fast' ? modes.fast : modes.accurate;
}

export function buildStt(settings: TranscriptionSettings): stt.STT {
  const model = resolveModel(settings);

  switch (settings.sttProvider) {
    case 'livekit':
      return new inference.STT({
        model: model as any,
        language: settings.language as any,
      });
    default: {
      const exhaustive: never = settings.sttProvider;
      throw new Error(`Unknown STT provider: ${exhaustive}`);
    }
  }
}
