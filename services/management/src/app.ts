import { Hono } from "hono/tiny";
import { logger } from "hono/logger";
import db from "./db";
import { getAliasesByUserId, getAliasByCode } from "./query";
import { sValidator } from "@hono/standard-validator";
import { object, string, date } from "yup";
import { createAlias, updateAlias, deleteAlias } from "./command";

const app = new Hono();

app.use(logger())

const createSchema = object({
    target: string().url().required().max(2048),
    metadata: object().optional(),
    expires_at: date().min(new Date()).optional(),
});

const updateSchema = object({
    target: string().url().optional().max(2048),
    metadata: object().optional(),
    expires_at: date().min(new Date()).optional(),
});

const userHeaderSchema = object({
    "x-user-id": string().required()
});

app.get('/health', async (c) => {
    try {
        await db.execute('SELECT 1');
        return c.text('OK');
    } catch (error) {
        return c.text('Database connection error', 500);
    }
});

app.get('/aliases', sValidator("header", userHeaderSchema), async (c) => {
    try {
        const user_id = c.req.header("x-user-id")!;
        const aliases = await getAliasesByUserId(user_id);
        return c.json(aliases);
    } catch (error) {
        return c.text('Error fetching aliases', 500);
    }
});

app.get('/aliases/:code', sValidator("header", userHeaderSchema), async (c) => {
    try {
        const code = c.req.param('code');
        const user_id = c.req.header("x-user-id")!;
        const alias = await getAliasByCode(code);
        
        if (!alias || alias.user_id !== user_id) {
            return c.json({ error: 'Alias not found' }, 404);
        }
        
        return c.json(alias);
    } catch (error) {
        return c.text('Error fetching alias', 500);
    }
});

app.get('/resolve/:code', async (c) => {
    try {
        const code = c.req.param('code');
        const alias = await getAliasByCode(code);
        
        if (!alias) {
            return c.json({ error: 'Alias not found' }, 404);
        }

        if (alias.expires_at && new Date(alias.expires_at) < new Date()) {
            return c.json({ error: 'Alias has expired' }, 410); // 410 Gone
        }
        
        return c.json({ target: alias.target });
    } catch (error) {
        return c.text('Error resolving alias', 500);
    }
});

app.post('/aliases', sValidator("json", createSchema), sValidator("header", userHeaderSchema), async (c) => {
    try {
        const req = await c.req.json();
        const user_id = c.req.header("x-user-id")!;

        const result = await createAlias({
            target: req.target,
            user_id: user_id,
            metadata: req.metadata,
            expires_at: req.expires_at ? new Date(req.expires_at) : undefined,
        });

        return c.json(result, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Error creating alias' }, 500);
    }
});

// Update an alias
app.patch('/aliases/:code', sValidator("json", updateSchema), sValidator("header", userHeaderSchema), async (c) => {
    try {
        const code = c.req.param('code');
        const user_id = c.req.header("x-user-id")!;
        const req = await c.req.json();

        // Check if alias exists and belongs to user
        const alias = await getAliasByCode(code);
        if (!alias || alias.user_id !== user_id) {
            return c.json({ error: 'Alias not found' }, 404);
        }

        const result = await updateAlias(code, user_id, {
            target: req.target,
            metadata: req.metadata,
            expires_at: req.expires_at ? new Date(req.expires_at) : undefined,
        });

        if (!result) {
            return c.json({ error: 'Alias not found or authorization failed' }, 404);
        }

        return c.json(result);
    } catch (error: any) {
        return c.json({ error: error.message || 'Error updating alias' }, 500);
    }
});

// Delete an alias
app.delete('/aliases/:code', sValidator("header", userHeaderSchema), async (c) => {
    try {
        const code = c.req.param('code');
        const user_id = c.req.header("x-user-id")!;

        const success = await deleteAlias(code, user_id);
        
        if (!success) {
             return c.json({ error: 'Alias not found or authorization failed' }, 404);
        }

        return c.json({ message: 'Alias deleted' });
    } catch (error) {
        return c.json({ error: 'Error deleting alias' }, 500);
    }
});

export default app;
