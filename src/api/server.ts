import express from 'express';
import cors from 'cors';
import env from '../config/env';
import { ApiResponse } from '../types/api';
import binRoutes from './routes/bin.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/bins', binRoutes);

// Basic error handler
app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error(err.stack);
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined,
    },
  };
  res.status(500).json(response);
});

// Start server
const port = parseInt(env.PORT, 10);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; 