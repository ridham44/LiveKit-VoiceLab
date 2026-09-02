/**
 * Custom Agent subclass. `onUserTurnCompleted` is a real framework hook — the runtime awaits it
 * (and measures it, see EOUMetrics.onUserTurnCompletedDelayMs) before generating the next reply —
 * so overriding it is a legitimate extension point, not a hack. Used here for:
 *   - Wait Before Speaking (◆ Custom): a configured delay before any reply is generated.
 *   - Dynamic Response (◆ Custom): a small rule engine that appends a steering instruction for
 *     the upcoming reply based on the user's just-completed turn.
 */
import { Agent, type ChatContext, type ChatMessage } from '@livekit/agents';
import type { BehaviorSettings } from '@voicelab/shared';
import type { AgentUserData } from '../types.js';

const FRUSTRATION_KEYWORDS = ['frustrated', 'angry', 'annoyed', 'ridiculous', 'terrible', 'unacceptable'];
const URGENT_KEYWORDS = ['urgent', 'emergency', 'asap', 'immediately', 'right now'];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class VoiceLabAgent extends Agent<AgentUserData> {
  private readonly baseInstructions: string;

  constructor(
    options: ConstructorParameters<typeof Agent<AgentUserData>>[0],
    private behavior: BehaviorSettings,
    private callSettings: { waitBeforeSpeakingMs: number },
  ) {
    super(options);
    this.baseInstructions = typeof options.instructions === 'string' ? options.instructions : '';
  }

  override async onUserTurnCompleted(chatCtx: ChatContext, newMessage: ChatMessage): Promise<void> {
    if (this.callSettings.waitBeforeSpeakingMs > 0) {
      await sleep(this.callSettings.waitBeforeSpeakingMs);
    }

    if (this.behavior.dynamicResponse.enabled) {
      const text = (newMessage.textContent ?? '').toLowerCase();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const matched = this.behavior.dynamicResponse.rules.find((rule) => {
        switch (rule.when) {
          case 'short_question':
            return wordCount > 0 && wordCount <= 6 && text.includes('?');
          case 'long_input':
            return wordCount > 40;
          case 'frustration_detected':
            return FRUSTRATION_KEYWORDS.some((kw) => text.includes(kw));
          case 'contains_urgent_keyword':
            return URGENT_KEYWORDS.some((kw) => text.includes(kw));
          default:
            return false;
        }
      });
      if (matched) {
        const steering: Record<string, string> = {
          answer_concisely: 'The user asked a short question — answer in one short sentence.',
          ask_clarifying_question: "The user's input was long or ambiguous — ask one clarifying question before answering fully.",
          escalate_tone: 'The user seems frustrated — acknowledge it briefly, stay calm and empathetic, and prioritize resolving their issue.',
          speak_urgently: 'The user indicated urgency — respond quickly and directly, skip pleasantries.',
        };
        const instruction = steering[matched.then];
        if (instruction) {
          await this.updateInstructions(`${this.baseInstructions}\n\n[Dynamic response rule active for this turn only: ${instruction}]`);
        }
      } else {
        await this.updateInstructions(this.baseInstructions);
      }
    }

    return super.onUserTurnCompleted(chatCtx, newMessage);
  }
}
