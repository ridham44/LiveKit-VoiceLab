import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import * as callsController from '../controllers/calls.controller.js';

export const analyticsRouter = Router();

analyticsRouter.get('/:agentId', asyncHandler(analyticsController.get));
// The agent posts live/batched metric events here as a call progresses.
analyticsRouter.post('/events', asyncHandler(callsController.ingestAnalyticsEvents));
