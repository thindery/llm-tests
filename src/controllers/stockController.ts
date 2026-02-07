/**
 * Stock Controller
 * Handles incoming requests for stock-related data
 */

import { Request, Response, NextFunction } from 'express';
import stockService from '../services/stockService';
import { HistoricalDataQuery } from '../models/types';

/**
 * Search stocks
 * POST /api/stocks/search
 */
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, limit } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await stockService.searchStocks(query, limit || 10);
    res.json(results);
  } catch (error) {
    next(error);
  }
}

/**
 * Get real-time stock price
 * GET /api/stocks/:symbol/price
 */
export async function getPrice(req: Request, res: Response, next: NextFunction) {
  try {
    const { symbol } = req.params;
    const stock = await stockService.getStockWithPrice(symbol);
    
    if (!stock) {
      return res.status(404).json({ error: `Stock with symbol ${symbol} not found` });
    }
    
    res.json(stock);
  } catch (error) {
    next(error);
  }
}

/**
 * Get stock history (custom timeframe)
 * GET /api/stocks/:symbol/history
 */
export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { symbol } = req.params;
    const { from, to, interval, period } = req.query;
    
    const queryOptions: HistoricalDataQuery = {
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      interval: interval as any,
      period: period as string
    };
    
    const history = await stockService.getHistoricalData(symbol, queryOptions);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

/**
 * Get flexible timeframe performance (90m, 4h, etc.)
 * GET /api/stocks/:symbol/performance
 */
export async function getPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const { symbol } = req.params;
    const { timeframe } = req.query;
    
    if (!timeframe || typeof timeframe !== 'string') {
      return res.status(400).json({ error: 'Timeframe is required (e.g., 90m, 4h, 1d)' });
    }
    
    const performance = await stockService.getTimeframePerformance(symbol, timeframe);
    res.json(performance);
  } catch (error) {
    next(error);
  }
}

export default {
  search,
  getPrice,
  getHistory,
  getPerformance
};
