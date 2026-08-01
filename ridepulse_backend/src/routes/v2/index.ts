import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    version: 'v2',
    status: 'EXPERIMENTAL',
    message: 'Future-ready API v2 Router namespace active.'
  });
});

export default router;
