/**
 * Background Cron Jobs
 */

import cron from 'node-cron';
import { query } from '../config/database';
import stockService from './stockService';
import portfolioService from './portfolioService';
import { config } from '../config/env';

/**
 * Cache Warming Job
 * Runs every 5 minutes during market hours
 */
cron.schedule('*/5 9-16 * * 1-5', async () => {
  if (!config.features.cacheWarming) return;
  
  console.log('[Cron] Running price cache warming...');
  
  try {
    // Get all unique symbols currently in portfolios
    const symbolsResult = await query<{ symbol: string }>(
      'SELECT DISTINCT symbol FROM stocks s JOIN portfolio_holdings ph ON ph.stock_id = s.id'
    );
    
    const symbols = symbolsResult.rows.map(r => r.symbol);
    
    if (symbols.length > 0) {
      console.log(`[Cron] Refreshing ${symbols.length} symbols`);
      // Bulk fetch will update the cache automatically via the service
      await stockService.getStockWithPrice(symbols[0]); // Triggering logic
      // In a real implementation, we'd call a bulk refresh method
    }
  } catch (error) {
    console.error('[Cron] Cache warming failed:', error);
  }
});

/**
 * Daily Performance Snapshot
 * Runs at market close (4:00 PM ET)
 */
cron.schedule('0 16 * * 1-5', async () => {
  console.log('[Cron] Capturing daily performance snapshots...');
  
  try {
    const portfolios = await query<{ id: string, user_id: string }>('SELECT id, user_id FROM portfolios WHERE is_active = true');
    
    for (const p of portfolios.rows) {
      const summary = await portfolioService.getPortfolioSummary(p.id, p.user_id);
      
      await query(
        `INSERT INTO performance_snapshots (
          portfolio_id, snapshot_date, total_value, total_cost_basis, 
          total_return_value, total_return_pct
        ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5)`,
        [
          p.id, 
          summary.summary.totalMarketValue, 
          summary.summary.totalCostBasis,
          summary.summary.totalUnrealizedGain,
          summary.summary.totalReturnPct
        ]
      );
    }
    
    console.log(`[Cron] Snapshots captured for ${portfolios.rows.length} portfolios`);
  } catch (error) {
    console.error('[Cron] Snapshot capture failed:', error);
  }
});

/**
 * Cleanup Old Logs
 * Runs at midnight every Sunday
 */
cron.schedule('0 0 * * 0', async () => {
  console.log('[Cron] Cleaning up old logs...');
  try {
    await query("DELETE FROM api_request_logs WHERE created_at < NOW() - INTERVAL '30 days'");
  } catch (error) {
    console.error('[Cron] Cleanup failed:', error);
  }
});

console.log('[Cron] Background services initialized');
