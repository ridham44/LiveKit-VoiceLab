/**
 * The full, validated shape of an agent configuration. This is the single source of truth used
 * by:
 *   - client: the Voice Settings / Transcription / Behavior / Call Settings forms
 *   - server: validates POST /api/agents(/:id) bodies before writing AgentConfig.* JSON columns
 *   - agent: parses the config it receives (job metadata at dispatch, or a live RPC update) and
 *     feeds it into the provider factories in agent/src/providers/*
 *
 * Keep this file provider-agnostic in shape; provider-specific legality (e.g. "does this model
 * support stability?") lives in catalog.ts and is enforced by the client disabling controls, not
 * by this schema rejecting values.
 */
import { z } from 'zod';
import { LLM_PROVIDERS, STT_PROVIDERS, TTS_PROVIDERS } from './catalog.js';

export const sttModeSchema = z.enum(['fast', 'accurate', 'custom']);
export type SttMode = z.infer<typeof sttModeSchema>;

export const voiceSettingsSchema = z.object({
  ttsProvider: z.enum(TTS_PROVIDERS),
  ttsModel: z.string().min(1),
  voiceId: z.string().min(1),
  speed: z.number().min(-1).max(4),
  volume: z.number().min(0).max(2).default(1),
  stability: z.number().min(0).max(1).nullable().default(null),
  speechNormalization: z.boolean().default(false),
  noiseCancellation: z.boolean().default(true),
  voiceIsolation: z.boolean().default(false),
  backgroundAudio: z.object({
    enabled: z.boolean().default(false),
    ambience: z.string().default('none'),
    ambienceVolume: z.number().min(0).max(1).default(0.3),
    thinkingSound: z.string().default('none'),
    thinkingVolume: z.number().min(0).max(1).default(0.4),
    customAmbienceUrl: z.string().url().optional(),
  }),
  dynamicSpeed: z.object({
    enabled: z.boolean().default(false),
    urgentMultiplier: z.number().min(0.5).max(2).default(1.25),
    complexMultiplier: z.number().min(0.5).max(2).default(0.85),
  }),
});
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

export const transcriptionSettingsSchema = z.object({
  sttProvider: z.enum(STT_PROVIDERS),
  mode: sttModeSchema.default('accurate'),
  customModel: z.string().optional(),
  language: z.string().default('en'),
  vocabulary: z.array(z.string()).default([]),
  boostedKeywords: z
    .array(z.object({ term: z.string().min(1), boost: z.number().min(0).max(5).default(1) }))
    .default([]),
  pronunciationDictionary: z
    .array(z.object({ grapheme: z.string().min(1), phoneme: z.string().min(1) }))
    .default([]),
  profanityFilter: z.boolean().default(false),
  diarization: z.boolean().default(false),
});
export type TranscriptionSettings = z.infer<typeof transcriptionSettingsSchema>;

export const behaviorSettingsSchema = z.object({
  llmProvider: z.enum(LLM_PROVIDERS),
  llmModel: z.string().min(1),
  llmTemperature: z.number().min(0).max(2).default(0.8),
  turnDetection: z.enum(['vad', 'stt', 'realtime_llm']).default('vad'),
  endpointing: z.object({
    mode: z.enum(['fixed', 'dynamic']).default('fixed'),
    minDelayMs: z.number().min(0).max(5000).default(500),
    maxDelayMs: z.number().min(100).max(15000).default(3000),
  }),
  preemptiveGeneration: z.object({
    enabled: z.boolean().default(true),
    preemptiveTts: z.boolean().default(false),
  }),
  interruption: z.object({
    enabled: z.boolean().default(true),
    minDurationMs: z.number().min(0).max(5000).default(500),
    minWords: z.number().int().min(0).max(20).default(0),
    falseInterruptionTimeoutMs: z.number().min(0).max(10000).default(2000),
  }),
  dynamicResponse: z.object({
    enabled: z.boolean().default(false),
    rules: z
      .array(
        z.object({
          id: z.string(),
          when: z.enum(['short_question', 'long_input', 'frustration_detected', 'contains_urgent_keyword']),
          then: z.enum(['answer_concisely', 'ask_clarifying_question', 'escalate_tone', 'speak_urgently']),
        }),
      )
      .default([]),
  }),
  backchanneling: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['low', 'medium', 'high']).default('medium'),
    words: z.array(z.string()).default(['mm-hmm', 'okay', 'right', 'got it']),
  }),
  holdPhrases: z
    .array(z.object({ phrase: z.string().min(1), silenceMs: z.number().min(0).max(30000).default(3000) }))
    .default([
      { phrase: 'one moment', silenceMs: 3000 },
      { phrase: 'please hold', silenceMs: 5000 },
      { phrase: 'let me check that', silenceMs: 4000 },
    ]),
});
export type BehaviorSettings = z.infer<typeof behaviorSettingsSchema>;

export const callSettingsSchema = z.object({
  maxDurationSec: z.number().min(0).max(3600).default(600),
  idleDetection: z.object({
    enabled: z.boolean().default(true),
    awayTimeoutSec: z.number().min(1).max(120).default(15),
    reminderIntervalSec: z.number().min(1).max(120).default(10),
    reminderMaxCount: z.number().int().min(0).max(10).default(2),
    endCallAfterSilenceSec: z.number().min(0).max(600).default(60),
  }),
  waitBeforeSpeakingMs: z.number().min(0).max(5000).default(0),
});
export type CallSettings = z.infer<typeof callSettingsSchema>;

export const toolConfigSchema = z.object({
  weather: z.boolean().default(true),
  appointmentBooking: z.boolean().default(true),
  orderLookup: z.boolean().default(true),
});
export type ToolConfig = z.infer<typeof toolConfigSchema>;

export const agentConfigInputSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  voiceSettings: voiceSettingsSchema,
  transcriptionSettings: transcriptionSettingsSchema,
  behaviorSettings: behaviorSettingsSchema,
  callSettings: callSettingsSchema,
  tools: toolConfigSchema,
});
export type AgentConfigInput = z.infer<typeof agentConfigInputSchema>;

export function defaultAgentConfig(): AgentConfigInput {
  return agentConfigInputSchema.parse({
    voiceSettings: {
      ttsProvider: 'livekit',
      ttsModel: 'openai/tts-1',
      voiceId: 'alloy',
      speed: 1,
      volume: 1,
      stability: null,
      speechNormalization: false,
      noiseCancellation: true,
      voiceIsolation: false,
      backgroundAudio: { enabled: false, ambience: 'none', ambienceVolume: 0.3, thinkingSound: 'none', thinkingVolume: 0.4 },
      dynamicSpeed: { enabled: false, urgentMultiplier: 1.25, complexMultiplier: 0.85 },
    },
    transcriptionSettings: {
      sttProvider: 'livekit',
      mode: 'accurate',
      language: 'en',
      vocabulary: [],
      boostedKeywords: [],
      pronunciationDictionary: [],
      profanityFilter: false,
      diarization: false,
    },
    behaviorSettings: {
      llmProvider: 'livekit',
      llmModel: 'openai/gpt-4o-mini',
      llmTemperature: 0.8,
      turnDetection: 'vad',
      endpointing: { mode: 'fixed', minDelayMs: 500, maxDelayMs: 3000 },
      preemptiveGeneration: { enabled: true, preemptiveTts: false },
      interruption: { enabled: true, minDurationMs: 500, minWords: 0, falseInterruptionTimeoutMs: 2000 },
      dynamicResponse: { enabled: false, rules: [] },
      backchanneling: { enabled: false, frequency: 'medium', words: ['mm-hmm', 'okay', 'right', 'got it'] },
      holdPhrases: [
        { phrase: 'one moment', silenceMs: 3000 },
        { phrase: 'please hold', silenceMs: 5000 },
        { phrase: 'let me check that', silenceMs: 4000 },
      ],
    },
    callSettings: {
      maxDurationSec: 600,
      idleDetection: { enabled: true, awayTimeoutSec: 15, reminderIntervalSec: 10, reminderMaxCount: 2, endCallAfterSilenceSec: 60 },
      waitBeforeSpeakingMs: 0,
    },
    tools: { weather: true, appointmentBooking: true, orderLookup: true },
  });
}
