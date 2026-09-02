import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as controller from '../controllers/calls.controller.js';

export const callsRouter = Router();

callsRouter.get('/', asyncHandler(controller.list));
callsRouter.get('/:id', asyncHandler(controller.get));
// Internal ingestion endpoints, called by the agent process as a call progresses.
callsRouter.post('/transcripts', asyncHandler(controller.ingestTranscript));
callsRouter.post('/tool-calls', asyncHandler(controller.ingestToolCall));
