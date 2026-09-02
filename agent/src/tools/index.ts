import type { ToolContextLike } from '@livekit/agents';
import type { ToolConfig } from '@voicelab/shared';
import { searchKnowledgeBaseTool } from '../knowledge/ragTool.js';
import type { AgentUserData } from '../types.js';
import { appointmentTool } from './appointment.js';
import { orderLookupTool } from './orderLookup.js';
import { weatherTool } from './weather.js';

export function buildTools(config: ToolConfig): ToolContextLike<AgentUserData> {
  return [
    ...(config.weather ? [weatherTool] : []),
    ...(config.appointmentBooking ? [appointmentTool] : []),
    ...(config.orderLookup ? [orderLookupTool] : []),
    searchKnowledgeBaseTool,
  ];
}
