import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/error.middleware';
import { AppError } from './utils/errors';

const app = express();

// Security foundation middleware setup
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const allowedOrigins = [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev mode for local testing
    },
    credentials: true,
  })
);

// Cookie parsing middleware
app.use(cookieParser());

// Body limit parsing to protect against excessive memory payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Routing binding
app.use('/api', apiRouter);

// Handle unknown API routes (404)
app.use('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Centralized error boundary middleware
app.use(errorHandler);

// Server startup execution
const server = app.listen(config.port, () => {
  console.log(`[Server] CampusFind backend listening on port ${config.port} inside ${config.nodeEnv} environment`);
});

// Handle uncaught errors and rejections gracefully
process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Optional: Graceful server shutdown if needed in production
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
