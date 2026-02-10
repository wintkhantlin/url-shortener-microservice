import express from 'express';
import { Client } from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Database configuration
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Middleware to log headers (useful for checking Oathkeeper headers)
app.use((req, res, next) => {
  console.log('Headers:', req.headers);
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'URL Shortener API is running',
    user: req.headers['x-user-id'] ? `User ID: ${req.headers['x-user-id']}` : 'Anonymous'
  });
});

app.get('/health', async (req, res) => {
  try {
    if (client) { // Check if client is initialized
        // In a real app, you'd check connection status
        // simpler check for now since we connect at start
    }
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', error });
  }
});

const start = async () => {
  try {
    if (process.env.DATABASE_URL) {
      await client.connect();
      console.log('Connected to PostgreSQL');
    } else {
      console.warn('DATABASE_URL not set, skipping DB connection');
    }
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
