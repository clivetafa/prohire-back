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
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://prohire-navy.vercel.app",
    "https://prohire.vercel.app",
    /\.vercel\.app$/  // Allows all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS requests
app.options('*', cors(corsOptions));

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


// Add this right after your other routes, before the 404 handler
app.get('/api/debug/routes', (req, res) => {
  const routes: any[] = [];
  
  // Function to extract routes from Express app
  const extractRoutes = (stack: any[], basePath = '') => {
    stack.forEach((layer) => {
      if (layer.route) {
        // Direct routes
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push({
          path: basePath + layer.route.path,
          methods
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Router middleware
        const routerPath = basePath + (layer.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param') || '');
        extractRoutes(layer.handle.stack, routerPath);
      }
    });
  };

  extractRoutes(app._router.stack);
  
  res.json({
    success: true,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

// ======================
// 404 Handler
// ======================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ======================
// Global Error Handler
// ======================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🔥 Error:', err);

  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
// Force redeploy - $(Get-Date)
