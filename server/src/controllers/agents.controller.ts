import type { Request, Response } from 'express';
import { agentConfigInputSchema, createAgentSchema } from '@voicelab/shared';
import * as agentsService from '../services/agents.js';

export async function list(_req: Request, res: Response) {
  res.json(await agentsService.listAgents());
}

export async function get(req: Request, res: Response) {
  res.json(await agentsService.getAgent(req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createAgentSchema.parse(req.body);
  res.status(201).json(await agentsService.createAgent(input));
}

export async function update(req: Request, res: Response) {
  res.json(await agentsService.updateAgentMeta(req.params.id, req.body));
}

export async function remove(req: Request, res: Response) {
  await agentsService.deleteAgent(req.params.id);
  res.status(204).end();
}

export async function saveConfig(req: Request, res: Response) {
  const input = agentConfigInputSchema.parse(req.body);
  res.status(201).json(await agentsService.saveAgentConfig(req.params.id, input));
}

export async function getActiveConfig(req: Request, res: Response) {
  res.json(await agentsService.getActiveConfigForAgent(req.params.id));
}
