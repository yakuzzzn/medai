import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  user: process.env.DB_USER || 'medai_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'medai',
  password: process.env.DB_PASSWORD || 'medai_password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
  logger.info('New client connected to database');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const initDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  end: () => pool.end()
};

export default db; 