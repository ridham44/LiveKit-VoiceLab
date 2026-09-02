import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as controller from '../controllers/sessions.controller.js';

export const sessionsRouter = Router();

sessionsRouter.post('/token', asyncHandler(controller.createToken));
sessionsRouter.post('/start', asyncHandler(controller.startSession));
sessionsRouter.post('/end', asyncHandler(controller.endSession));
