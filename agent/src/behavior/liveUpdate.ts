/**
 * Applies a partial config change to a running call, using only mechanisms the framework
 * actually exposes at runtime:
 *   - STT/LLM/TTS provider or setting changes -> Agent.updateOptions({ stt/llm/tts }) (a real,
 *     documented AgentSession primitive — see node_modules/@livekit/agents AgentUpdateOptions).
 *   - Turn detection / endpointing -> AgentSession.updateOptions({ turnHandling }).
 * Everything else (interruption tuning, preemptive generation, call-timer settings) has no live
 * mutation API in this AgentSession version, so it is intentionally left for the next session —
 * the RPC response reports exactly which fields were applied vs deferred so the dashboard never
 * claims a setting is active when it isn't (see packages/shared capability.ts + the user's
 * explicit "never claim active if not" requirement).
 */
import type { Agent, AgentSession } from '@livekit/agents';
import type { AgentConfigDto, AgentConfigInput } from '@voicelab/shared';
import { buildLlm } from '../providers/llm.js';
import { buildStt } from '../providers/stt.js';
import { buildTts } from '../providers/tts.js';
import type { AgentUserData } from '../types.js';

export interface LiveUpdateResult {
  appliedLive: string[];
  deferredToNextSession: string[];
}

export async function applyLiveConfigUpdate(
  session: AgentSession<AgentUserData>,
  agent: Agent<AgentUserData>,
  currentConfig: AgentConfigDto,
  partial: Partial<AgentConfigInput>,
): Promise<LiveUpdateResult> {
  const appliedLive: string[] = [];
  const deferredToNextSession: string[] = [];

  if (partial.voiceSettings) {
    const merged = { ...currentConfig.voiceSettings, ...partial.voiceSettings };
    await agent.updateOptions({ tts: buildTts(merged) });
    currentConfig.voiceSettings = merged;
    appliedLive.push('voiceSettings (tts provider/voice/speed/stability/normalization)');
    if (partial.voiceSettings.noiseCancellation != null || partial.voiceSettings.voiceIsolation != null) {
      deferredToNextSession.push('voiceSettings.noiseCancellation / voiceIsolation (set once at session.start)');
    }
    if (partial.voiceSettings.backgroundAudio) {
      deferredToNextSession.push('voiceSettings.backgroundAudio');
    }
  }

  if (partial.transcriptionSettings) {
    const merged = { ...currentConfig.transcriptionSettings, ...partial.transcriptionSettings };
    await agent.updateOptions({ stt: buildStt(merged) });
    currentConfig.transcriptionSettings = merged;
    appliedLive.push('transcriptionSettings (stt provider/model/language/vocabulary)');
  }

  if (partial.behaviorSettings) {
    const merged = { ...currentConfig.behaviorSettings, ...partial.behaviorSettings };
    if (partial.behaviorSettings.llmProvider || partial.behaviorSettings.llmModel || partial.behaviorSettings.llmTemperature != null) {
      await agent.updateOptions({ llm: buildLlm(merged) });
      appliedLive.push('behaviorSettings (llm provider/model/temperature)');
    }
    if (partial.behaviorSettings.turnDetection || partial.behaviorSettings.endpointing) {
      session.updateOptions({
        turnHandling: {
          turnDetection: merged.turnDetection,
          endpointing: {
            mode: merged.endpointing.mode,
            minDelay: merged.endpointing.minDelayMs,
            maxDelay: merged.endpointing.maxDelayMs,
          },
        },
      });
      appliedLive.push('behaviorSettings.turnDetection / endpointing');
    }
    if (partial.behaviorSettings.interruption || partial.behaviorSettings.preemptiveGeneration) {
      deferredToNextSession.push('behaviorSettings.interruption / preemptiveGeneration (no live mutation API)');
    }
    currentConfig.behaviorSettings = merged;
  }

  if (partial.callSettings) {
    deferredToNextSession.push('callSettings (timers are set once at session start)');
  }
  if (partial.tools) {
    deferredToNextSession.push('tools (tool set is fixed for the running Agent instance)');
  }

  return { appliedLive, deferredToNextSession };
}
