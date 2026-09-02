import type { Request, Response } from 'express';
import { appointmentInputSchema, orderLookupInputSchema, weatherInputSchema } from '@voicelab/shared';
import * as toolsService from '../services/tools.js';

export async function weather(req: Request, res: Response) {
  const input = weatherInputSchema.parse(req.body);
  res.json(await toolsService.getWeather(input));
}

export async function appointment(req: Request, res: Response) {
  const input = appointmentInputSchema.parse(req.body);
  res.status(201).json(await toolsService.bookAppointment(input));
}

export async function order(req: Request, res: Response) {
  const input = orderLookupInputSchema.parse(req.body);
  res.json(await toolsService.lookupOrder(input.orderId));
}
