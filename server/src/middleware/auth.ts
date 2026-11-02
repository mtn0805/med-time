import type { RequestHandler } from 'express';
import type { Role, User } from '@medtime/shared';
import { AuthService } from '../services/auth.service.js';
import { assert } from '../services/errors.js';
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
export function authenticate(auth: AuthService): RequestHandler {
  return async (req, _res, next) => {
    try {
      req.user = await auth.authenticate(req.cookies?.medtime_session);
      next();
    } catch (e) {
      next(e);
    }
  };
}
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    try {
      assert(req.user, 401, 'UNAUTHENTICATED', 'יש להתחבר למערכת');
      assert(roles.includes(req.user.role), 403, 'FORBIDDEN', 'אין הרשאה לפעולה');
      next();
    } catch (e) {
      next(e);
    }
  };
}
