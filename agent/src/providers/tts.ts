/** TTS provider factory */
import { inference, type tts } from '@livekit/agents';
import type { VoiceSettings } from '@voicelab/shared';

export function buildTts(settings: VoiceSettings): tts.TTS {
  switch (settings.ttsProvider) {
    case 'livekit':
      return new inference.TTS({
        model: settings.ttsModel as any,
        voice: settings.voiceId as any,
        modelOptions: { speed: settings.speed }
      });
    default: {
      const exhaustive: never = settings.ttsProvider;
      throw new Error(`Unknown TTS provider: ${exhaustive}`);
    }
  }
}
