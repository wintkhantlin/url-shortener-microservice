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

const warningTemplate = (target: string) => {
  const safeTarget = target.replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Security Check</title>

<style>
:root {
  --bg: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --accent: #f59e0b;
  --danger: #ef4444;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b0f19;
    --text: #f8fafc;
    --muted: #94a3b8;
    --accent: #f59e0b;
    --danger: #ef4444;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.main {
  max-width: 720px;
  width: 100%;
}

h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 12px;
}

p {
  color: var(--muted);
  font-size: 0.95rem;
  margin-bottom: 20px;
}

.url {
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  padding: 10px 12px;
  border-left: 3px solid var(--accent);
  background: rgba(245,158,11,0.06);
  word-break: break-all;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

a {
  text-decoration: none;
  font-size: 0.95rem;
  padding: 10px 16px;
  border-radius: 6px;
  transition: 0.15s;
}

.back {
  background: var(--text);
  color: var(--bg);
}

.trust {
  border: 1px solid rgba(148,163,184,0.3);
  color: var(--text);
}

a:hover {
  opacity: 0.85;
}
</style>
</head>

<body>
  <div class="main">
    <h1>Security warning</h1>
    <p>This link looks suspicious and may be impersonating a legitimate site.</p>
    <div class="url">${safeTarget}</div>

    <div class="actions">
      <a href="javascript:history.back()" class="back">Go back</a>
      <a href="${safeTarget}" class="trust" rel="noopener noreferrer">Proceed anyway</a>
    </div>
  </div>
</body>
</html>
`
}


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
  const referer = c.req.header('referer') || '';

  sendAnalyticsEvent({ code, ip, userAgent, referer });

  try {
    const cachedData = await redis.get(`alias:${code}`);
    if (cachedData) {
      logger.info({ code }, 'Cache hit');
      try {
        // Try to parse as JSON (new format)
        const data = JSON.parse(cachedData);
        // Handle case where it might be a simple string that is valid JSON (edge case, but URL shouldn't be)
        if (typeof data === 'object' && data.target) {
          if (data.should_warn) {
            return c.html(warningTemplate(data.target));
          }
          return c.redirect(data.target);
        }
        // Fallback if parsing works but structure is weird (shouldn't happen with our set logic)
        return c.redirect(cachedData);
      } catch (e) {
        // Not JSON, assume old string format
        return c.redirect(cachedData);
      }
    }

    logger.info({ code }, 'Cache miss, checking DB...');
    const { rows } = await pool.query(
      'SELECT target, expires_at, should_warn, is_active FROM public.alias WHERE code = $1 LIMIT 1',
      [code]
    );

    const result = rows[0];

    if (result) {
      if (result.expires_at && new Date(result.expires_at) < new Date()) {
        logger.info({ code }, 'Alias has expired');
        return c.json({ error: 'Not found' }, 404);
      }

      if (result.is_active === false) {
        logger.info({ code }, 'Alias is inactive');
        return c.json({ error: 'Not found' }, 404);
      }

      const ttl = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL) : 3600;

      // Store as JSON to include metadata
      const cacheValue = JSON.stringify({
        target: result.target,
        should_warn: result.should_warn
      });

      await redis.set(`alias:${code}`, cacheValue, 'EX', ttl);

      if (result.should_warn) {
        return c.html(warningTemplate(result.target));
      }
      return c.redirect(result.target);
    }

    return c.json({ error: 'Not found' }, 404);
  } catch (error) {
    logger.error({ error, code }, 'Redirection error');
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
