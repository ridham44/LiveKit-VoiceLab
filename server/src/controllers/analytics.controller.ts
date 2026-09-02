import type { Request, Response } from 'express';
import { getAgentAnalytics } from '../services/analytics.js';

export async function get(req: Request, res: Response) {
  res.json(await getAgentAnalytics(req.params.agentId));
}
