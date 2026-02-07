/**
 * Global Test Setup
 */

import pool from '../src/config/database';
import redis from '../src/config/redis';

beforeAll(async () => {
  // Ensure DB connection
});

afterAll(async () => {
  await pool.end();
  await redis.quit();
});
