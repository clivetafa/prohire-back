import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';

const app = express();

// ======================
// CORS Configuration
// ======================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  /\.vercel\.app$/,   // all Vercel preview + production deployments
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked: ${origin}`);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

// ======================
// Other Middleware
// ======================
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
// 404 Handler
// ======================
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

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