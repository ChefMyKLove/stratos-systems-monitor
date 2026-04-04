import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import systemsRouter from './routes/systems.js';

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (
      !origin ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https:\/\/chefmyklove\.github\.io$/.test(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)*chefmyklove\.com$/.test(origin) ||
      origin === config.corsOrigin
    ) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/systems', systemsRouter);

export default app;
