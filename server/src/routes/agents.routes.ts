import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as controller from '../controllers/agents.controller.js';

export const agentsRouter = Router();

agentsRouter.get('/', asyncHandler(controller.list));
agentsRouter.post('/', asyncHandler(controller.create));
agentsRouter.get('/:id', asyncHandler(controller.get));
agentsRouter.put('/:id', asyncHandler(controller.update));
agentsRouter.delete('/:id', asyncHandler(controller.remove));
agentsRouter.get('/:id/config', asyncHandler(controller.getActiveConfig));
agentsRouter.put('/:id/config', asyncHandler(controller.saveConfig));
