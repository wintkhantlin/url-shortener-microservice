import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import { redis } from './redis.js';
import pool from './db/index.js';
import { sValidator } from "@hono/standard-validator";
import { object, string } from "yup";
import { sendAnalyticsEvent } from './kafka.js';
import logger from './logger.js';

export const app = new Hono();
app.use('*', honoLogger());

const codeSchema = object({
  code: string().required().min(1).max(10),
});

// Health check
app.get('/health', async (c) => {
  try {
    await pool.query('SELECT 1');
    return c.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    return c.json({ status: 'error', database: 'disconnected' }, 500);
  }
});

app.get('/:code', sValidator("param", codeSchema), async (c) => {
  const code = c.req.param('code');
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  sendAnalyticsEvent({ code, ip, userAgent });

  try {
    const cachedTarget = await redis.get(`alias:${code}`);
    if (cachedTarget) {
      logger.info({ code, target: cachedTarget }, 'Cache hit');
      return c.redirect(cachedTarget);
    }

    logger.info({ code }, 'Cache miss, checking DB...');
    const { rows } = await pool.query(
      'SELECT target, expires_at FROM public.alias WHERE code = $1 LIMIT 1',
      [code]
    );

    const result = rows[0];

    if (result) {
      if (result.expires_at && new Date(result.expires_at) < new Date()) {
        logger.info({ code }, 'Alias has expired');
        return c.json({ error: 'Not found' }, 404);
      }

      const ttl = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL) : 3600;
      await redis.set(`alias:${code}`, result.target, 'EX', ttl);
      return c.redirect(result.target);
    }

    return c.json({ error: 'Not found' }, 404);
  } catch (error) {
    logger.error({ error, code }, 'Redirection error');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
