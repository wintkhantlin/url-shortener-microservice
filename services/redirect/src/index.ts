import { serve } from '@hono/node-server';
import { app } from './app.js';
import { connectProducer } from './kafka.js';

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

connectProducer().catch(err => {
  console.error('Failed to connect Kafka producer:', err);
});

console.log(`Redirect service is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
