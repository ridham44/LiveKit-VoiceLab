/** Provider catalogue for LiveKit VoiceLab */

export const TTS_PROVIDERS = ['livekit'] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];
export const STT_PROVIDERS = ['livekit'] as const;
export type SttProvider = (typeof STT_PROVIDERS)[number];
export const LLM_PROVIDERS = ['livekit', 'openrouter'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export interface VoiceOption { id: string; name: string; description?: string }
export interface ProviderCapabilities { speed: boolean; stability: boolean; speechNormalization: boolean; pronunciationDictionary: boolean; serverSideVolume?: boolean }
export interface TtsProviderInfo { id: TtsProvider; label: string; envKey: string; models: { id: string; label: string }[]; voices: VoiceOption[]; capabilities: ProviderCapabilities; speedRange: [number, number] }

export const TTS_CATALOG: Record<TtsProvider, TtsProviderInfo> = {
  livekit: {
    id: 'livekit', label: 'LiveKit Cloud', envKey: 'LIVEKIT_API_KEY',
    models: [
      { id: 'openai/tts-1', label: 'OpenAI TTS-1' },
      { id: 'elevenlabs/eleven_turbo_v2_5', label: 'ElevenLabs Turbo v2.5' },
      { id: 'cartesia/sonic', label: 'Cartesia Sonic' }
    ],
    voices: [
      { id: 'alloy', name: 'Alloy', description: 'OpenAI - Neutral, balanced' }, 
      { id: 'nova', name: 'Nova', description: 'OpenAI - Warm, expressive' }, 
      { id: 'shimmer', name: 'Shimmer', description: 'OpenAI - Light, clear' },
      { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'ElevenLabs - Conversational' },
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'ElevenLabs - Narrative' }
    ],
    capabilities: { speed: true, stability: false, speechNormalization: false, pronunciationDictionary: false }, speedRange: [0.25, 4],
  }
};

export interface SttProviderInfo { id: SttProvider; label: string; envKey: string; modes: { fast: string; accurate: string }; models: { id: string; label: string }[]; capabilities: { interimResults: boolean; keywordBoost: boolean; weightedKeywords: boolean; profanityFilter: boolean; endpointing: boolean } }
export const STT_CATALOG: Record<SttProvider, SttProviderInfo> = {
  livekit: {
    id: 'livekit', label: 'LiveKit Cloud', envKey: 'LIVEKIT_API_KEY',
    modes: { fast: 'deepgram/nova-3', accurate: 'openai/whisper-1' },
    models: [{ id: 'deepgram/nova-3', label: 'Deepgram Nova 3 (fastest)' }, { id: 'openai/whisper-1', label: 'OpenAI Whisper-1 (most accurate)' }],
    capabilities: { interimResults: true, keywordBoost: true, weightedKeywords: false, profanityFilter: false, endpointing: false },
  }
};

export const LLM_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'gpt-4o-mini (fast, cheap)' },
  { id: 'openai/gpt-4o', label: 'gpt-4o (balanced)' },
  { id: 'google/gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
] as const;

export const LANGUAGES = [{ id: 'en', label: 'English' }, { id: 'en-US', label: 'English (US)' }, { id: 'en-GB', label: 'English (UK)' }, { id: 'es', label: 'Spanish' }, { id: 'fr', label: 'French' }, { id: 'de', label: 'German' }, { id: 'it', label: 'Italian' }, { id: 'pt', label: 'Portuguese' }, { id: 'nl', label: 'Dutch' }, { id: 'hi', label: 'Hindi' }, { id: 'ja', label: 'Japanese' }, { id: 'ko', label: 'Korean' }, { id: 'zh', label: 'Chinese' }, { id: 'multi', label: 'Multilingual (auto)' }] as const;
export const AMBIENCE_PRESETS = [{ id: 'none', label: 'None' }, { id: 'office-ambience', label: 'Open office (built-in)' }, { id: 'hold-music', label: 'Hold music (built-in)' }, { id: 'custom', label: 'Custom file...' }] as const;
export type AmbiencePreset = (typeof AMBIENCE_PRESETS)[number]['id'];
export const THINKING_SOUNDS = [{ id: 'none', label: 'None' }, { id: 'keyboard-typing', label: 'Keyboard typing (built-in)' }, { id: 'keyboard-typing2', label: 'Keyboard typing 2 (built-in)' }, { id: 'custom', label: 'Custom file...' }] as const;
export type ThinkingSound = (typeof THINKING_SOUNDS)[number]['id'];
export const NOISE_FILTER_MODES = [{ id: 'off', label: 'Off', fn: null }, { id: 'noise', label: 'Noise cancellation', fn: 'NoiseCancellation' }, { id: 'voice-isolation', label: 'Voice isolation', fn: 'BackgroundVoiceCancellation' }, { id: 'telephony', label: 'Telephony voice isolation', fn: 'TelephonyBackgroundVoiceCancellation' }] as const;
export type NoiseFilterMode = (typeof NOISE_FILTER_MODES)[number]['id'];
