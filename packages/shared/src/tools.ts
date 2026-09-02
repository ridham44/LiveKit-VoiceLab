/**
 * Shapes for the three example Actions/Tools (weather, appointment booking, order lookup).
 *
 * Zod schemas here are the *same* schemas passed as `parameters` to `tool()` in
 * agent/src/tools/*.ts (so the LLM's function-calling schema, the server's request validation,
 * and the client's live tool-call renderer never drift from each other) as well as the shape
 * broadcast over LK_TOPICS.toolCalls for the Live Test panel / Actions tab.
 */
import { z } from 'zod';

export const weatherInputSchema = z.object({ city: z.string().min(1).max(100) });
export type WeatherInput = z.infer<typeof weatherInputSchema>;
export interface WeatherOutput {
  city: string;
  temperatureC: number;
  temperatureF: number;
  conditions: string;
  windKph: number;
}

export const appointmentInputSchema = z.object({
  customer: z.string().min(1).max(200),
  date: z.string().min(1), // YYYY-MM-DD
  time: z.string().min(1), // HH:mm
  service: z.string().min(1).max(200),
});
export type AppointmentInput = z.infer<typeof appointmentInputSchema>;
export interface AppointmentOutput {
  confirmationId: string;
  customer: string;
  date: string;
  time: string;
  service: string;
  status: 'confirmed';
}

export const orderLookupInputSchema = z.object({ orderId: z.string().min(1).max(50) });
export type OrderLookupInput = z.infer<typeof orderLookupInputSchema>;
export interface OrderLookupOutput {
  orderId: string;
  status: string;
  items: { name: string; quantity: number }[];
  total: number;
  estimatedDelivery: string | null;
}

export const TOOL_NAMES = ['get_weather', 'book_appointment', 'lookup_order'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type ToolCallStage = 'requested' | 'executing' | 'succeeded' | 'failed';

/** Broadcast on LK_TOPICS.toolCalls at each stage so the UI can render the full pipeline live:
 * user request -> agent decides tool -> tool name -> arguments -> execution -> result -> reply. */
export interface ToolCallEvent {
  callId: string;
  toolCallId: string;
  toolName: ToolName;
  stage: ToolCallStage;
  args?: unknown;
  result?: unknown;
  error?: string;
  latencyMs?: number;
  createdAt: string;
}
