import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT: number = parseInt(process.env.PORT || '5000', 10);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌍 Accepting connections on all interfaces`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// ── Prevent crashes from unhandled errors ──────────────────────────────────

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  // Don't exit — keep the server alive
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  // Don't exit — keep the server alive
});

// ── Graceful shutdown ──────────────────────────────────────────────────────

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received: closing server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;