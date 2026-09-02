import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as controller from '../controllers/tools.controller.js';

export const toolsRouter = Router();

toolsRouter.post('/weather', asyncHandler(controller.weather));
toolsRouter.post('/appointment', asyncHandler(controller.appointment));
toolsRouter.post('/order', asyncHandler(controller.order));
