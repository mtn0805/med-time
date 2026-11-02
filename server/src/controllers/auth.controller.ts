import type { Request, Response } from 'express';
import { config } from '../config/env.js';
import { userDto } from '../mappers/dto.js';
import { schemas } from '../middleware/validation.js';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private auth: AuthService) {}

  private cookie(res: Response, token: string) {
    res.cookie('medtime_session', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 3600000,
      path: '/',
    });
  }

  register = async (req: Request, res: Response) => {
    const user = await this.auth.createPatient(schemas.register.parse(req.body));
    this.cookie(res, this.auth.token(user));
    res.status(201).json({ data: userDto(user) });
  };

  login = async (req: Request, res: Response) => {
    const body = schemas.login.parse(req.body);
    const user = await this.auth.login(body.email, body.password, body.role);
    this.cookie(res, this.auth.token(user));
    res.json({ data: userDto(user) });
  };

  logout = async (_req: Request, res: Response) => {
    res.clearCookie('medtime_session', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.json({ data: { success: true } });
  };

  me = async (req: Request, res: Response) => {
    res.json({ data: req.user });
  };

  profile = async (req: Request, res: Response) => {
    res.json({
      data: await this.auth.updateProfile(req.user!.id, schemas.profile.parse(req.body)),
    });
  };
}
