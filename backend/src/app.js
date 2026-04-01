import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import systemsRouter from './routes/systems.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/systems', systemsRouter);

export default app;
