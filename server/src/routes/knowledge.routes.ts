import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as controller from '../controllers/knowledge.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const knowledgeRouter = Router();

knowledgeRouter.post('/upload', upload.single('file'), asyncHandler(controller.upload));
knowledgeRouter.get('/', asyncHandler(controller.list));
knowledgeRouter.delete('/:id', asyncHandler(controller.remove));
knowledgeRouter.post('/test', asyncHandler(controller.test));
knowledgeRouter.post('/search', asyncHandler(controller.search));
