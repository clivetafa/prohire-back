import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';

const app = express();

// ======================
// Middleware
// ======================

// Enable CORS FIRST
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-frontend.vercel.app"
    ],
    credentials: true,
  })
);

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(morgan('dev'));

// ======================
// Health Check
// ======================

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running 🚀',
  });
});

// ======================
// Routes
// ======================

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// ======================
// Global Error Handler
// ======================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🔥 Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
