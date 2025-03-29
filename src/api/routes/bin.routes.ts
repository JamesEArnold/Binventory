import { Router } from 'express';
import { createBinController } from '../controllers/bin.controller';

const router = Router();
const binController = createBinController();

// GET /api/bins
router.get('/', binController.list);

// POST /api/bins
router.post('/', binController.create);

// GET /api/bins/:id
router.get('/:id', binController.get);

// PUT /api/bins/:id
router.put('/:id', binController.update);

// DELETE /api/bins/:id
router.delete('/:id', binController.delete);

export default router; 