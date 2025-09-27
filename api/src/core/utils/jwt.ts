import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'refresh';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

export const verifyAccessToken = (token: string) => jwt.verify(token, JWT_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
