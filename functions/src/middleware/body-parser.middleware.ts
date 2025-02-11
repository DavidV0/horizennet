import express, { Request, Response, NextFunction } from 'express';

export const bodyParserMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl.includes('/webhook')) {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
}; 