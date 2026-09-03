/**
 * Builds and starts the AgentSession for one call: providers, native turn-handling options,
 * noise cancellation / voice isolation, background audio, tools, analytics, transcript capture,
 * and the custom call-settings timers (max duration / idle detection — see capability.ts for
 * which of these are native LiveKit vs custom).
 */
import {
  AgentSession,
  AgentSessionEventTypes,
  BackgroundAudioPlayer,
  BuiltinAudioClip,
  inference,
} from '@livekit/agents';
import type { Room } from '@livekit/rtc-node';
import { BackgroundVoiceCancellation, NoiseCancellation } from '@livekit/noise-cancellation-node';
import type { AgentConfigDto } from '@voicelab/shared';
import { env } from './config.js';
import { attachAnalyticsCollector } from './analytics/collector.js';
import { VoiceLabAgent } from './behavior/voicelabAgent.js';
import { buildLlm } from './providers/llm.js';
import { buildStt } from './providers/stt.js';
import { buildTts } from './providers/tts.js';
import { buildTools } from './tools/index.js';
import type { AgentUserData } from './types.js';

const DEFAULT_INSTRUCTIONS = `You are a helpful, friendly voice assistant built to demonstrate LiveKit Voice AI capabilities.
Keep responses concise and conversational, since they will be spoken aloud. For every factual
question about a document, product, company, or other knowledge-base content, call
search_knowledge_base before answering. Answer only from the retrieved document excerpts; if no
relevant excerpt is found, say that the uploaded documents do not contain the answer. Use the
other tools only when relevant.`;

function ambienceSource(id: string): string | BuiltinAudioClip | undefined {
  switch (id) {
    case 'office-ambience':
      return BuiltinAudioClip.OFFICE_AMBIENCE;
    case 'hold-music':
      return BuiltinAudioClip.HOLD_MUSIC;
    default:
      return undefined;
  }
}

function thinkingSource(id: string): string | BuiltinAudioClip | undefined {
  switch (id) {
    case 'keyboard-typing':
      return BuiltinAudioClip.KEYBOARD_TYPING;
    case 'keyboard-typing2':
      return BuiltinAudioClip.KEYBOARD_TYPING2;
    default:
      return undefined;
  }
}

async function reportCallEnded(callId: string, reason: string) {
  try {
    await fetch(`${env.SERVER_URL}/api/sessions/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId, reason }),
    });
  } catch (err) {
    console.error('[session] failed to report call end:', err);
  }
}

export async function runVoiceLabSession(params: { room: Room; callId: string; agentId: string; config: AgentConfigDto }) {
  const { room, callId, agentId, config } = params;
  const userData: AgentUserData = { callId, agentId, configId: config.id, room };

  const session = new AgentSession<AgentUserData>({
    userData,
    stt: buildStt(config.transcriptionSettings),
    llm: buildLlm(config.behaviorSettings),
    tts: buildTts(config.voiceSettings),
    vad: config.behaviorSettings.turnDetection === 'vad' ? new inference.VAD({ model: 'silero' }) : undefined,
    turnHandling: {
      turnDetection: config.behaviorSettings.turnDetection,
      endpointing: {
        mode: config.behaviorSettings.endpointing.mode,
        minDelay: config.behaviorSettings.endpointing.minDelayMs,
        maxDelay: config.behaviorSettings.endpointing.maxDelayMs,
      },
      interruption: {
        enabled: config.behaviorSettings.interruption.enabled,
        minDuration: config.behaviorSettings.interruption.minDurationMs,
        minWords: config.behaviorSettings.interruption.minWords,
        falseInterruptionTimeout: config.behaviorSettings.interruption.falseInterruptionTimeoutMs,
      },
      preemptiveGeneration: {
        enabled: config.behaviorSettings.preemptiveGeneration.enabled,
        preemptiveTts: config.behaviorSettings.preemptiveGeneration.preemptiveTts,
      },
    },
    userAwayTimeout: config.callSettings.idleDetection.enabled ? config.callSettings.idleDetection.awayTimeoutSec : null,
  });

  attachAnalyticsCollector(session, userData);
  // Agent state (listening/thinking/speaking) and both sides' live transcripts are ✓ Native
  // LiveKit: AgentSession publishes agent state as participant attributes and transcripts via
  // the standard text-stream protocol automatically (RoomOutputOptions defaults). The client
  // reads both with @livekit/components-react's useVoiceAssistant()/useTranscriptions() —
  // nothing to hand-roll here.

  session.on(AgentSessionEventTypes.UserInputTranscribed, (ev) => {
    fetch(`${env.SERVER_URL}/api/calls/transcripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId,
        role: 'USER',
        text: ev.transcript,
        isFinal: ev.isFinal,
        language: ev.language,
        timestampMs: ev.createdAt,
      }),
    }).catch((err) => console.error('[session] failed to post transcript:', err));
  });

  session.on(AgentSessionEventTypes.ConversationItemAdded, (ev) => {
    if (ev.item.type !== 'message' || ev.item.role !== 'assistant') return;
    fetch(`${env.SERVER_URL}/api/calls/transcripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId,
        role: 'AGENT',
        text: ev.item.textContent ?? '',
        isFinal: true,
        timestampMs: ev.createdAt,
      }),
    }).catch((err) => console.error('[session] failed to post transcript:', err));
  });

  // Idle reminders — layered on top of the native `user_state_changed` -> 'away' signal (see
  // capability.ts 'call.idleReminder' / 'call.endAfterSilence').
  let reminderCount = 0;
  let idleTimer: NodeJS.Timeout | undefined;
  let escalationTimer: NodeJS.Timeout | undefined;
  const idleCfg = config.callSettings.idleDetection;

  function clearIdleTimers() {
    if (idleTimer) clearInterval(idleTimer);
    if (escalationTimer) clearTimeout(escalationTimer);
  }

  if (idleCfg.enabled) {
    session.on(AgentSessionEventTypes.UserStateChanged, (ev) => {
      if (ev.newState === 'away') {
        reminderCount = 0;
        idleTimer = setInterval(() => {
          if (reminderCount >= idleCfg.reminderMaxCount) {
            clearIdleTimers();
            return;
          }
          reminderCount += 1;
          session.say("Are you still there? I'm here whenever you're ready.", { allowInterruptions: true });
        }, idleCfg.reminderIntervalSec * 1000);

        if (idleCfg.endCallAfterSilenceSec > 0) {
          escalationTimer = setTimeout(() => {
            clearIdleTimers();
            void session.close();
            void reportCallEnded(callId, 'SILENCE_TIMEOUT');
          }, idleCfg.endCallAfterSilenceSec * 1000);
        }
      } else {
        clearIdleTimers();
      }
    });
  }

  // Maximum call duration (◆ Custom — see capability.ts 'call.maxDuration').
  let maxDurationTimer: NodeJS.Timeout | undefined;
  if (config.callSettings.maxDurationSec > 0) {
    maxDurationTimer = setTimeout(() => {
      void session.close();
      void reportCallEnded(callId, 'MAX_DURATION_REACHED');
    }, config.callSettings.maxDurationSec * 1000);
  }

  session.on(AgentSessionEventTypes.Close, () => {
    clearIdleTimers();
    if (maxDurationTimer) clearTimeout(maxDurationTimer);
  });

  const agent = new VoiceLabAgent(
    { instructions: DEFAULT_INSTRUCTIONS, tools: buildTools(config.tools) },
    config.behaviorSettings,
    { waitBeforeSpeakingMs: config.callSettings.waitBeforeSpeakingMs },
  );

  let backgroundAudio: BackgroundAudioPlayer | undefined;
  const bg = config.voiceSettings.backgroundAudio;
  if (bg.enabled) {
    const ambient = ambienceSource(bg.ambience);
    const thinking = thinkingSource(bg.thinkingSound);
    backgroundAudio = new BackgroundAudioPlayer({
      ambientSound: ambient ? { source: ambient, volume: bg.ambienceVolume } : undefined,
      thinkingSound: thinking ? { source: thinking, volume: bg.thinkingVolume } : undefined,
    });
  }

  await session.start({
    agent,
    room,
    inputOptions: {
      noiseCancellation: config.voiceSettings.voiceIsolation
        ? BackgroundVoiceCancellation()
        : config.voiceSettings.noiseCancellation
          ? NoiseCancellation()
          : undefined,
    },
  });

  if (backgroundAudio) {
    await backgroundAudio.start({ room, agentSession: session });
  }

  console.log(`[session] Session started for call ${callId}`);
  session.generateReply({ instructions: 'Start the call by saying exactly: "How can I help you?"' });

  return { session, agent, backgroundAudio };
}
