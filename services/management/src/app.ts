import { Hono } from "hono/tiny";
import { logger } from "hono/logger";
import db from "./db";
import { getAliasesByUserId, getAliasByCode } from "./query";
import { sValidator } from "@hono/standard-validator";
import { object, string, date, boolean } from "yup";
import { createAlias, updateAlias, deleteAlias } from "./command";

const app = new Hono();

app.use(logger());

const createSchema = object({
    target: string().url().required().max(2048),
    metadata: object().optional(),
    expires_at: date().optional(),
    is_active: boolean().default(true),
});

const updateSchema = object({
    target: string().url().optional().max(2048),
    metadata: object().optional(),
    expires_at: date().optional(),
    is_active: boolean().optional(),
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
    const { "x-user-id": user_id } = c.req.valid("header");
    try {
        const aliases = await getAliasesByUserId(user_id);
        return c.json(aliases);
    } catch (error) {
        return c.text('Error fetching aliases', 500);
    }
});

app.get('/aliases/:code', sValidator("header", userHeaderSchema), async (c) => {
    const { "x-user-id": user_id } = c.req.valid("header");
    const code = c.req.param('code');
    
    try {
        const alias = await getAliasByCode(code);
        if (!alias || alias.user_id !== user_id) {
            return c.json({ error: 'Alias not found' }, 404);
        }
        return c.json(alias);
    } catch (error) {
        return c.text('Error fetching alias', 500);
    }
});

app.post('/aliases', 
    sValidator("header", userHeaderSchema), 
    sValidator("json", createSchema), 
    async (c) => {
        const { "x-user-id": user_id } = c.req.valid("header");
        const body = c.req.valid("json");

        // Manual check for expiry to avoid the static Date bug
        if (body.expires_at && new Date(body.expires_at) < new Date()) {
            return c.json({ error: "expires_at must be in the future" }, 400);
        }

        try {
            const result = await createAlias({
                ...body,
                user_id,
                expires_at: body.expires_at ? new Date(body.expires_at) : undefined,
            });
            return c.json(result, 201);
        } catch (error: any) {
            return c.json({ error: error.message || 'Error creating alias' }, 500);
        }
    }
);

app.patch('/aliases/:code', 
    sValidator("header", userHeaderSchema), 
    sValidator("json", updateSchema), 
    async (c) => {
        const { "x-user-id": user_id } = c.req.valid("header");
        const body = c.req.valid("json");
        const code = c.req.param('code');

        try {
            // Check existence and ownership
            const alias = await getAliasByCode(code);
            if (!alias || alias.user_id !== user_id) {
                return c.json({ error: 'Alias not found' }, 404);
            }

            const result = await updateAlias(code, user_id, {
                ...body,
                expires_at: body.expires_at ? new Date(body.expires_at) : undefined,
            });

            return c.json(result);
        } catch (error: any) {
            return c.json({ error: error.message || 'Error updating alias' }, 500);
        }
    }
);

app.delete('/aliases/:code', sValidator("header", userHeaderSchema), async (c) => {
    const { "x-user-id": user_id } = c.req.valid("header");
    const code = c.req.param('code');

    try {
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