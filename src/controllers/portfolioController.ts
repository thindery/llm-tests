/**
 * Portfolio Controller
 * Handles portfolio and holding operations
 */

import { Request, Response, NextFunction } from 'express';
import portfolioService from '../services/portfolioService';
import { CreatePortfolioRequest, AddHoldingRequest } from '../models/types';

// Mock user ID for now (will come from auth middleware)
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * List user portfolios
 * GET /api/portfolios
 */
export async function listPortfolios(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || MOCK_USER_ID;
    const portfolios = await portfolioService.getUserPortfolios(userId);
    res.json(portfolios);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a portfolio
 * POST /api/portfolios
 */
export async function createPortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || MOCK_USER_ID;
    const data: CreatePortfolioRequest = req.body;
    
    if (!data.name) {
      return res.status(400).json({ error: 'Portfolio name is required' });
    }
    
    const portfolio = await portfolioService.createPortfolio(userId, data);
    res.status(201).json(portfolio);
  } catch (error) {
    next(error);
  }
}

/**
 * Get portfolio details and performance
 * GET /api/portfolios/:id/performance
 */
export async function getPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || MOCK_USER_ID;
    const { id } = req.params;
    
    const summary = await portfolioService.getPortfolioSummary(id, userId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

/**
 * Add holding to portfolio
 * POST /api/portfolios/:id/holdings
 */
export async function addHolding(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || MOCK_USER_ID;
    const { id } = req.params;
    const data: AddHoldingRequest = req.body;
    
    if (!data.stockId || !data.shares || !data.entryPrice || !data.entryDate) {
      return res.status(400).json({ error: 'stockId, shares, entryPrice, and entryDate are required' });
    }
    
    const holding = await portfolioService.addHolding(id, userId, data);
    res.status(201).json(holding);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove holding
 * DELETE /api/portfolios/:id/holdings/:holdingId
 */
export async function removeHolding(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || MOCK_USER_ID;
    const { id, holdingId } = req.params;
    
    const success = await portfolioService.removeHolding(holdingId, id, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Holding not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export default {
  listPortfolios,
  createPortfolio,
  getPerformance,
  addHolding,
  removeHolding
};
