/** Provider catalogue for the OpenRouter-only development setup. */

export const TTS_PROVIDERS = ['openrouter'] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];
export const STT_PROVIDERS = ['openrouter'] as const;
export type SttProvider = (typeof STT_PROVIDERS)[number];
export const LLM_PROVIDERS = ['openrouter'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export interface VoiceOption { id: string; name: string; description?: string }
export interface ProviderCapabilities { speed: boolean; stability: boolean; speechNormalization: boolean; pronunciationDictionary: boolean; serverSideVolume?: boolean }
export interface TtsProviderInfo { id: TtsProvider; label: string; envKey: string; models: { id: string; label: string }[]; voices: VoiceOption[]; capabilities: ProviderCapabilities; speedRange: [number, number] }

export const TTS_CATALOG: Record<TtsProvider, TtsProviderInfo> = {
  openrouter: {
    id: 'openrouter', label: 'OpenRouter', envKey: 'OPENROUTER_API_KEY',
    models: [
      { id: 'openai/gpt-4o-mini-tts-2025-12-15', label: 'OpenAI gpt-4o-mini-tts' },
      { id: 'elevenlabs/eleven-turbo-v2', label: 'ElevenLabs Turbo v2' },
    ],
    voices: [{ id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' }, { id: 'nova', name: 'Nova', description: 'Warm, expressive' }, { id: 'shimmer', name: 'Shimmer', description: 'Light, clear' }],
    capabilities: { speed: true, stability: false, speechNormalization: false, pronunciationDictionary: false }, speedRange: [0.25, 4],
  },
};

export interface SttProviderInfo { id: SttProvider; label: string; envKey: string; modes: { fast: string; accurate: string }; models: { id: string; label: string }[]; capabilities: { interimResults: boolean; keywordBoost: boolean; weightedKeywords: boolean; profanityFilter: boolean; endpointing: boolean } }
export const STT_CATALOG: Record<SttProvider, SttProviderInfo> = {
  openrouter: {
    id: 'openrouter', label: 'OpenRouter', envKey: 'OPENROUTER_API_KEY',
    modes: { fast: 'openai/gpt-4o-mini-transcribe', accurate: 'openai/gpt-4o-transcribe' },
    models: [{ id: 'openai/gpt-4o-transcribe', label: 'gpt-4o-transcribe (most accurate)' }, { id: 'openai/gpt-4o-mini-transcribe', label: 'gpt-4o-mini-transcribe (fastest)' }, { id: 'openai/whisper-1', label: 'Whisper-1' }],
    capabilities: { interimResults: true, keywordBoost: true, weightedKeywords: false, profanityFilter: false, endpointing: false },
  },
};

export const LLM_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'gpt-4o-mini (fast, cheap)' },
  { id: 'openai/gpt-4o', label: 'gpt-4o (balanced)' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
] as const;

export const LANGUAGES = [{ id: 'en', label: 'English' }, { id: 'en-US', label: 'English (US)' }, { id: 'en-GB', label: 'English (UK)' }, { id: 'es', label: 'Spanish' }, { id: 'fr', label: 'French' }, { id: 'de', label: 'German' }, { id: 'it', label: 'Italian' }, { id: 'pt', label: 'Portuguese' }, { id: 'nl', label: 'Dutch' }, { id: 'hi', label: 'Hindi' }, { id: 'ja', label: 'Japanese' }, { id: 'ko', label: 'Korean' }, { id: 'zh', label: 'Chinese' }, { id: 'multi', label: 'Multilingual (auto)' }] as const;
export const AMBIENCE_PRESETS = [{ id: 'none', label: 'None' }, { id: 'office-ambience', label: 'Open office (built-in)' }, { id: 'hold-music', label: 'Hold music (built-in)' }, { id: 'custom', label: 'Custom file…' }] as const;
export type AmbiencePreset = (typeof AMBIENCE_PRESETS)[number]['id'];
export const THINKING_SOUNDS = [{ id: 'none', label: 'None' }, { id: 'keyboard-typing', label: 'Keyboard typing (built-in)' }, { id: 'keyboard-typing2', label: 'Keyboard typing 2 (built-in)' }, { id: 'custom', label: 'Custom file…' }] as const;
export type ThinkingSound = (typeof THINKING_SOUNDS)[number]['id'];
export const NOISE_FILTER_MODES = [{ id: 'off', label: 'Off', fn: null }, { id: 'noise', label: 'Noise cancellation', fn: 'NoiseCancellation' }, { id: 'voice-isolation', label: 'Voice isolation', fn: 'BackgroundVoiceCancellation' }, { id: 'telephony', label: 'Telephony voice isolation', fn: 'TelephonyBackgroundVoiceCancellation' }] as const;
export type NoiseFilterMode = (typeof NOISE_FILTER_MODES)[number]['id'];
