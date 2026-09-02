/**
 * Provider catalogs.
 *
 * These describe what each provider plugin actually accepts. They are shared so the
 * dashboard never offers a voice/model/language a provider cannot serve.
 */

export const TTS_PROVIDERS = ['openai', 'elevenlabs', 'cartesia'] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];

export const STT_PROVIDERS = ['deepgram', 'openai'] as const;
export type SttProvider = (typeof STT_PROVIDERS)[number];

export const LLM_PROVIDERS = ['openai'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderCapabilities {
  /** Playback rate multiplier is honoured by the provider itself. */
  speed: boolean;
  /** ElevenLabs-style `stability` / `similarity_boost` voice settings. */
  stability: boolean;
  /** Provider-side text normalisation (numbers, dates, currency). */
  speechNormalization: boolean;
  /** Provider-side pronunciation dictionaries (vs. our custom text rewriting). */
  pronunciationDictionary: boolean;
  /** Provider applies output gain itself; otherwise VoiceLab sets it on the client track. */
  serverSideVolume?: boolean;
}

export interface TtsProviderInfo {
  id: TtsProvider;
  label: string;
  envKey: string;
  models: { id: string; label: string }[];
  voices: VoiceOption[];
  capabilities: ProviderCapabilities;
  /** Range accepted by the provider for `speed`. */
  speedRange: [number, number];
}

export const TTS_CATALOG: Record<TtsProvider, TtsProviderInfo> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4o-mini-tts', label: 'gpt-4o-mini-tts (steerable)' },
      { id: 'tts-1', label: 'tts-1 (low latency)' },
      { id: 'tts-1-hd', label: 'tts-1-hd (high quality)' },
    ],
    voices: [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
      { id: 'ash', name: 'Ash', description: 'Warm, grounded' },
      { id: 'ballad', name: 'Ballad', description: 'Soft, expressive' },
      { id: 'coral', name: 'Coral', description: 'Bright, friendly' },
      { id: 'echo', name: 'Echo', description: 'Calm, even' },
      { id: 'sage', name: 'Sage', description: 'Measured, clear' },
      { id: 'shimmer', name: 'Shimmer', description: 'Light, energetic' },
      { id: 'verse', name: 'Verse', description: 'Narrative' },
    ],
    capabilities: {
      speed: true,
      stability: false,
      speechNormalization: false,
      pronunciationDictionary: false,
    },
    speedRange: [0.25, 4.0],
  },
  elevenlabs: {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    envKey: 'ELEVEN_API_KEY',
    models: [
      { id: 'eleven_flash_v2_5', label: 'Flash v2.5 (~75ms, 32 languages)' },
      { id: 'eleven_turbo_v2_5', label: 'Turbo v2.5 (balanced)' },
      { id: 'eleven_multilingual_v2', label: 'Multilingual v2 (highest quality)' },
    ],
    voices: [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm narration' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong, confident' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft news reader' },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, young adult' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep narration' },
    ],
    capabilities: {
      speed: true,
      stability: true,
      speechNormalization: true,
      pronunciationDictionary: true,
    },
    speedRange: [0.7, 1.2],
  },
  cartesia: {
    id: 'cartesia',
    label: 'Cartesia',
    envKey: 'CARTESIA_API_KEY',
    models: [
      { id: 'sonic-3', label: 'Sonic 3 (latest, supports volume)' },
      { id: 'sonic-2', label: 'Sonic 2' },
      { id: 'sonic-turbo', label: 'Sonic Turbo (lowest latency)' },
    ],
    voices: [
      { id: '794f9389-aac1-45b6-b726-9d9369183238', name: 'Sarah', description: 'Warm, conversational' },
      { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man', description: 'Casual male' },
      { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'British Lady', description: 'RP English' },
      { id: '5619d38c-cf51-4d8e-9575-48f61a280413', name: 'Announcer', description: 'Broadcast' },
    ],
    capabilities: {
      speed: true,
      stability: false,
      speechNormalization: false,
      // Cartesia takes a server-side pronunciation dictionary *id*, not inline rules.
      pronunciationDictionary: true,
      // Cartesia is the only provider here that applies gain server-side (sonic-3).
      serverSideVolume: true,
    },
    speedRange: [-1, 1],
  },
};

export interface SttProviderInfo {
  id: SttProvider;
  label: string;
  envKey: string;
  /** Model used for each of the three transcription modes. */
  modes: { fast: string; accurate: string };
  models: { id: string; label: string }[];
  capabilities: {
    interimResults: boolean;
    /** Provider-side keyword boosting / keyterm prompting. */
    keywordBoost: boolean;
    /** Numeric boost value per keyword (vs. a plain keyterm list). */
    weightedKeywords: boolean;
    profanityFilter: boolean;
    /** Provider exposes an endpointing / silence threshold. */
    endpointing: boolean;
  };
}

export const STT_CATALOG: Record<SttProvider, SttProviderInfo> = {
  deepgram: {
    id: 'deepgram',
    label: 'Deepgram',
    envKey: 'DEEPGRAM_API_KEY',
    modes: { fast: 'nova-2-general', accurate: 'nova-3-general' },
    models: [
      { id: 'nova-3-general', label: 'Nova 3 — general (most accurate)' },
      { id: 'nova-3-medical', label: 'Nova 3 — medical' },
      { id: 'nova-2-general', label: 'Nova 2 — general (fastest)' },
      { id: 'nova-2-phonecall', label: 'Nova 2 — phone call' },
      { id: 'nova-2-meeting', label: 'Nova 2 — meeting' },
    ],
    capabilities: {
      interimResults: true,
      keywordBoost: true,
      weightedKeywords: true,
      profanityFilter: true,
      endpointing: true,
    },
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    modes: { fast: 'gpt-4o-mini-transcribe', accurate: 'gpt-4o-transcribe' },
    models: [
      { id: 'gpt-4o-transcribe', label: 'gpt-4o-transcribe (most accurate)' },
      { id: 'gpt-4o-mini-transcribe', label: 'gpt-4o-mini-transcribe (fastest)' },
      { id: 'whisper-1', label: 'whisper-1' },
    ],
    capabilities: {
      interimResults: true,
      // OpenAI has no keyword boost API; we fold vocabulary into the `prompt` field.
      keywordBoost: true,
      weightedKeywords: false,
      profanityFilter: false,
      endpointing: false,
    },
  },
};

export const LLM_MODELS = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini (fast, cheap)' },
  { id: 'gpt-4o', label: 'gpt-4o (balanced)' },
  { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { id: 'gpt-4.1', label: 'gpt-4.1' },
] as const;

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'it', label: 'Italian' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'nl', label: 'Dutch' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ja', label: 'Japanese' },
  { id: 'ko', label: 'Korean' },
  { id: 'zh', label: 'Chinese' },
  { id: 'multi', label: 'Multilingual (auto)' },
] as const;

/**
 * Ambience presets map onto `BuiltinAudioClip` values shipped inside `@livekit/agents`
 * (`node_modules/@livekit/agents/resources/*.ogg`). `custom` plays the file at
 * `voice.backgroundAudio.customAmbiencePath` instead.
 */
export const AMBIENCE_PRESETS = [
  { id: 'none', label: 'None' },
  { id: 'office-ambience', label: 'Open office (built-in)' },
  { id: 'hold-music', label: 'Hold music (built-in)' },
  { id: 'custom', label: 'Custom file…' },
] as const;
export type AmbiencePreset = (typeof AMBIENCE_PRESETS)[number]['id'];

/** Played automatically by `BackgroundAudioPlayer` while agent state is `thinking`. */
export const THINKING_SOUNDS = [
  { id: 'none', label: 'None' },
  { id: 'keyboard-typing', label: 'Keyboard typing (built-in)' },
  { id: 'keyboard-typing2', label: 'Keyboard typing 2 (built-in)' },
  { id: 'custom', label: 'Custom file…' },
] as const;
export type ThinkingSound = (typeof THINKING_SOUNDS)[number]['id'];

/** Server-side audio cleanup modes exposed by `@livekit/noise-cancellation-node`. */
export const NOISE_FILTER_MODES = [
  { id: 'off', label: 'Off', fn: null },
  { id: 'noise', label: 'Noise cancellation', fn: 'NoiseCancellation' },
  { id: 'voice-isolation', label: 'Voice isolation (BVC)', fn: 'BackgroundVoiceCancellation' },
  { id: 'telephony', label: 'Telephony voice isolation', fn: 'TelephonyBackgroundVoiceCancellation' },
] as const;
export type NoiseFilterMode = (typeof NOISE_FILTER_MODES)[number]['id'];
