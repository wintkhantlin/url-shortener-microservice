import { Hono } from "hono/tiny";
import { logger } from "hono/logger";
import db from "./db";
import { getAllAliases } from "./query";

const app = new Hono();

app.use(logger())

app.get('/health', async (c) => {
    try {
        await db.execute('SELECT 1');
        return c.text('OK');
    } catch (error) {
        return c.text('Database connection error', 500);
    }
});

app.get('/', async (c) => {
    try {
        return c.json(await getAllAliases());
    } catch (error) {
        return c.text('Error fetching aliases', 500);
    }
});

export default app;
