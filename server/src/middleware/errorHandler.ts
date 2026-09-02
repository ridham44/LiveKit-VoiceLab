import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@voicelab/shared';
import { NotFoundError } from '../services/agents.js';
import { ToolExecutionError } from '../services/tools.js';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    const body: ApiErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() } };
    res.status(400).json(body);
    return;
  }
  if (err instanceof NotFoundError) {
    const body: ApiErrorResponse = { error: { code: 'NOT_FOUND', message: err.message } };
    res.status(404).json(body);
    return;
  }
  if (err instanceof ToolExecutionError) {
    const body: ApiErrorResponse = { error: { code: 'TOOL_EXECUTION_ERROR', message: err.message } };
    res.status(422).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const body: ApiErrorResponse = { error: { code: 'INTERNAL_ERROR', message } };
  res.status(500).json(body);
}
