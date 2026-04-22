import { Router } from 'express';

const router = Router();
const started = Date.now();

router.get('/', (_req, res) => {
  res.json({
    ok:        true,
    uptime:    Math.floor((Date.now() - started) / 1000),
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV ?? 'development',
  });
});

export default router;
