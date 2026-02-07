/**
 * Routes Configuration
 */

import { Router } from 'express';
import stockController from '../controllers/stockController';
import portfolioController from '../controllers/portfolioController';

const router = Router();

// --- Stock Routes ---
router.post('/stocks/search', stockController.search);
router.get('/stocks/:symbol/price', stockController.getPrice);
router.get('/stocks/:symbol/history', stockController.getHistory);
router.get('/stocks/:symbol/performance', stockController.getPerformance);

// --- Portfolio Routes ---
router.get('/portfolios', portfolioController.listPortfolios);
router.post('/portfolios', portfolioController.createPortfolio);
router.get('/portfolios/:id/performance', portfolioController.getPerformance);
router.post('/portfolios/:id/holdings', portfolioController.addHolding);
router.delete('/portfolios/:id/holdings/:holdingId', portfolioController.removeHolding);

// --- Health Check ---
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

export default router;
