import { serve } from '@hono/node-server'
import app from './app'

const port = process.env.PORT ? parseInt(process.env.PORT) : 8001;

serve({
    fetch: app.fetch,
    port,
})