import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createError } from './errorHandler';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    next(createError('Validation failed', 422, 'VALIDATION_ERROR'));
    return;
  }

  next();
};

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      field: (error as any).path,
      message: error.msg,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (error as any).value
    }));

    res.status(422).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationErrors
    });
    return;
  }

  next();
};