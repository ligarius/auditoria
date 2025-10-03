import { prisma } from '../../core/config/db.js';
import { comparePassword } from '../../core/utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../../core/utils/jwt.js';
import { HttpError } from '../../core/errors/http-error.js';

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new HttpError(401, 'Credenciales inválidas');
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Credenciales inválidas');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user
    };
  },

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload)
    };
  }
};
