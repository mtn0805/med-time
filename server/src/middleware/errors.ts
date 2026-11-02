import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../services/errors.js';
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'יש לבדוק את הנתונים שהוזנו',
        details: error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
    });
    return;
  }
  if (error?.code === 11000) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'הרשומה כבר קיימת או שהתור נתפס. יש לרענן ולנסות שוב.',
      },
    });
    return;
  }
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError ||
    error instanceof SyntaxError
  ) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'הבקשה אינה תקינה' } });
    return;
  }
  if (error?.status === 413) {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'הבקשה גדולה מדי' } });
    return;
  }
  console.error('Unexpected server error:', error instanceof Error ? error.name : 'UnknownError');
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'אירעה שגיאה. נסו שוב מאוחר יותר.' } });
};
