import { Hono } from 'hono';
import { redis } from './redis.js';
import pool from './db/index.js';
import { sValidator } from "@hono/standard-validator";
import { object, string } from "yup";
import { sendAnalyticsEvent } from './kafka.js';

export const app = new Hono();

const codeSchema = object({
  code: string().required().min(1).max(10),
});

// Health check
app.get('/health', async (c) => {
  try {
    await pool.query('SELECT 1');
    return c.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({ status: 'error', database: 'disconnected' }, 500);
  }
});

// Redirect endpoint
app.get('/:code', sValidator("param", codeSchema), async (c) => {
  const code = c.req.param('code');
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  sendAnalyticsEvent({ code, ip, userAgent });

  try {
    const cachedTarget = await redis.get(`alias:${code}`);
    if (cachedTarget) {
      console.log(`Cache hit for ${code}: ${cachedTarget}`);
      return c.redirect(cachedTarget);
    }

    console.log(`Cache miss for ${code}, checking read-only replica...`);
    const { rows } = await pool.query(
      'SELECT target, expires_at FROM public.alias WHERE code = $1 LIMIT 1',
      [code]
    );

    const result = rows[0];

    if (result) {
      if (result.expires_at && new Date(result.expires_at) < new Date()) {
        console.log(`Alias ${code} has expired`);
        return c.json({ error: 'Not found' }, 404);
      }

      await redis.set(`alias:${code}`, result.target, 'EX', 3600);
      return c.redirect(result.target);
    }

    // 4. Not found
    return c.json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('Redirection error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
