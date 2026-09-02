/**
 * Capability labeling — the UI must never claim LiveKit provides something a provider or
 * VoiceLab's own application logic actually provides.
 *
 * - `native`   — implemented by the LiveKit Agents framework / LiveKit server itself.
 * - `provider` — implemented by the selected STT/TTS/LLM provider; support varies by provider
 *                and sometimes by model. VoiceLab passes the setting through when the active
 *                provider declares it in its catalog entry (see `catalog.ts`), and disables the
 *                control otherwise.
 * - `custom`   — not a LiveKit or provider primitive; implemented in VoiceLab's own agent or
 *                server code (timers, prompt engineering, RPC bridges, SQL, etc). Always works
 *                the same regardless of provider, because it doesn't depend on one.
 */
export type CapabilityLevel = 'native' | 'provider' | 'custom';

export interface CapabilityInfo {
  level: CapabilityLevel;
  /** One sentence: what mechanism actually implements this. Shown as tooltip copy in the UI. */
  mechanism: string;
}

export const CAPABILITY_BADGE: Record<CapabilityLevel, { label: string; symbol: string }> = {
  native: { label: 'Native LiveKit', symbol: '✓' },
  provider: { label: 'Provider-dependent', symbol: '⚠' },
  custom: { label: 'Custom', symbol: '◆' },
};

/**
 * One entry per control in the dashboard. Keyed by a stable dotted path so both the client
 * (badges/tooltips) and the README capability matrix are generated from the same source.
 */
export const CAPABILITIES: Record<string, CapabilityInfo> = {
  // ---- Voice settings ----
  'voice.ttsProvider': {
    level: 'custom',
    mechanism: 'VoiceLab provider factory constructs the matching @livekit/agents-plugin-* TTS and swaps it into the running Agent via Agent.updateOptions({ tts }).',
  },
  'voice.voiceId': {
    level: 'provider',
    mechanism: "Voice catalogs and IDs are provider-specific; passed as the TTS plugin's voice/voiceId option.",
  },
  'voice.speed': {
    level: 'provider',
    mechanism: 'Passed as the TTS plugin speed option (OpenAI, ElevenLabs, Cartesia all expose one, with different ranges/semantics).',
  },
  'voice.volume': {
    level: 'custom',
    mechanism: 'No LiveKit or TTS-provider volume primitive exists for agent output. VoiceLab applies gain by scaling PCM samples in a custom AudioOutput wrapper (agent/src/audio/volume.ts), except on Cartesia sonic-3 which accepts a provider volume parameter directly.',
  },
  'voice.stability': {
    level: 'provider',
    mechanism: 'ElevenLabs voice_settings.stability / similarity_boost. Not exposed by OpenAI or Cartesia — control is disabled for those providers.',
  },
  'voice.speechNormalization': {
    level: 'provider',
    mechanism: 'ElevenLabs apply_text_normalization. Not exposed by OpenAI or Cartesia TTS.',
  },
  'voice.noiseCancellation': {
    level: 'native',
    mechanism: 'LiveKit Cloud enhanced noise cancellation via @livekit/noise-cancellation-node, attached as RoomInputOptions.noiseCancellation on the participant audio track.',
  },
  'voice.voiceIsolation': {
    level: 'native',
    mechanism: 'LiveKit BackgroundVoiceCancellation() filter from @livekit/noise-cancellation-node — same mechanism as noise cancellation, tuned to isolate the primary speaker.',
  },
  'voice.backgroundAudio': {
    level: 'native',
    mechanism: "LiveKit Agents' BackgroundAudioPlayer publishes a real mixed audio track into the room. Built-in ambience clips ship with @livekit/agents; environment presets beyond those are VoiceLab-supplied audio files, not native LiveKit assets.",
  },
  'voice.dynamicSpeed': {
    level: 'custom',
    mechanism: "Agent classifies each reply (normal/urgent/complex) with a small rule set and overrides the TTS speed for that turn via Agent.updateOptions before generating it — see agent/src/behavior/dynamicSpeed.ts.",
  },

  // ---- Transcription & speech ----
  'stt.provider': {
    level: 'custom',
    mechanism: 'VoiceLab provider factory constructs the matching STT plugin and swaps it via Agent.updateOptions({ stt }).',
  },
  'stt.mode': {
    level: 'custom',
    mechanism: 'Fast/Accurate/Custom are VoiceLab presets that select a provider model + endpointing combination (e.g. Deepgram nova-2 vs nova-3). LiveKit has no such modes itself.',
  },
  'stt.language': {
    level: 'provider',
    mechanism: 'Passed as the STT plugin language option.',
  },
  'stt.vocabulary': {
    level: 'provider',
    mechanism: "Deepgram keyterms / OpenAI transcription prompt. Passed via AgentSession's keytermsOptions where the plugin supports term lists, otherwise folded into the STT prompt field.",
  },
  'stt.boostedKeywords': {
    level: 'provider',
    mechanism: 'Deepgram supports weighted [keyword, boost] pairs natively. OpenAI has no boost API; VoiceLab folds the keyword list into the transcription prompt as a best-effort fallback (weaker, documented as such).',
  },
  'stt.pronunciationDictionary': {
    level: 'custom',
    mechanism: 'ElevenLabs supports a real pronunciation-dictionary API on the TTS side; on the STT side no provider used here exposes one, so VoiceLab stores mappings and rewrites agent output text before TTS (agent/src/audio/pronunciation.ts) as an application-level substitute.',
  },
  'stt.interimTranscripts': {
    level: 'native',
    mechanism: "AgentSession's user_input_transcribed event fires with isFinal:false for interim results whenever the STT plugin streams them.",
  },
  'stt.timestamps': {
    level: 'native',
    mechanism: 'Every AgentEvent carries createdAt from the framework; stored verbatim on TranscriptEntry.timestampMs.',
  },
  'stt.speakerDiarization': {
    level: 'provider',
    mechanism: 'Deepgram diarize option. Not exposed by OpenAI transcription models — control is disabled for those.',
  },

  // ---- Agent behavior ----
  'behavior.turnDetection': {
    level: 'native',
    mechanism: "AgentSession turnHandling.turnDetection ('vad' | 'stt' | 'realtime_llm') and the bundled LiveKit inference turn detector model.",
  },
  'behavior.endpointing': {
    level: 'native',
    mechanism: 'AgentSession turnHandling.endpointing (minDelay/maxDelay/mode) — a first-class LiveKit Agents turn-taking primitive.',
  },
  'behavior.preemptiveGeneration': {
    level: 'native',
    mechanism: 'AgentSession turnHandling.preemptiveGeneration — the framework starts LLM inference before the turn is confirmed complete.',
  },
  'behavior.interruption': {
    level: 'native',
    mechanism: 'AgentSession turnHandling.interruption (enabled/mode/minDuration/minWords/falseInterruptionTimeout) — native LiveKit Agents interruption handling.',
  },
  'behavior.llmTemperature': {
    level: 'provider',
    mechanism: "Passed as the LLM plugin's temperature option; support and effective range vary by model.",
  },
  'behavior.dynamicResponse': {
    level: 'custom',
    mechanism: "Agent inspects chat context/detected intent in Agent.onUserTurnCompleted and adjusts instructions/toolChoice/TTS delivery per configured rules before generating the reply.",
  },
  'behavior.backchanneling': {
    level: 'custom',
    mechanism: "Agent logic listens for short user utterances during its own turn (via the adaptive interruption detector's backchannel classification) and, on the configured frequency, plays a short filler phrase without interrupting the main response.",
  },
  'behavior.holdPhrases': {
    level: 'custom',
    mechanism: 'Agent scans its own generated reply text for configured hold phrases and, when matched, applies a configured silence/stay-quiet window before continuing — plain application logic over the LLM output stream.',
  },

  // ---- Call settings ----
  'call.maxDuration': {
    level: 'custom',
    mechanism: 'JobContext-level timer that calls session.close() (a real AgentSession API) with terminationReason "MAX_DURATION_REACHED" once elapsed.',
  },
  'call.idleDetection': {
    level: 'native',
    mechanism: "AgentSession userAwayTimeout flips UserState to 'away' natively via the user_state_changed event when both sides are silent.",
  },
  'call.idleReminder': {
    level: 'custom',
    mechanism: "Agent logic listens for the native 'away' UserState and calls session.say() with a configured reminder phrase, up to a configured attempt count.",
  },
  'call.endAfterSilence': {
    level: 'custom',
    mechanism: 'Agent logic escalates from idle reminders to session.close() after a configured total silence duration.',
  },
  'call.waitBeforeSpeaking': {
    level: 'custom',
    mechanism: "Agent.onUserTurnCompleted (a real, metrics-instrumented framework hook awaited before reply generation) is overridden to await a configured delay.",
  },

  // ---- Knowledge base ----
  'knowledge.upload': { level: 'custom', mechanism: 'VoiceLab REST API + S3-compatible object storage.' },
  'knowledge.rag': {
    level: 'custom',
    mechanism: 'Application RAG: pgvector cosine-similarity search over OpenAI embeddings, retrieved chunks injected into the LLM chat context for that turn.',
  },

  // ---- Tools ----
  'tools.functionCalling': {
    level: 'native',
    mechanism: "LiveKit Agents' tool() helper and ToolContext — the LLM plugin's native function/tool-calling support, orchestrated by AgentSession.",
  },

  // ---- Analytics ----
  'analytics.latency': {
    level: 'native',
    mechanism: 'Computed from AgentSession metrics_collected events (STTMetrics, LLMMetrics.ttftMs, TTSMetrics.ttfbMs) and EOUMetrics — all first-class framework measurements.',
  },
  'analytics.interruptions': {
    level: 'native',
    mechanism: "InterruptionMetrics.numInterruptions and the agent_false_interruption event — both emitted by LiveKit Agents' adaptive interruption detector.",
  },
};

export function getCapability(key: string): CapabilityInfo {
  const info = CAPABILITIES[key];
  if (!info) {
    throw new Error(`Unknown capability key: ${key}. Add it to CAPABILITIES in packages/shared/src/capability.ts.`);
  }
  return info;
}
