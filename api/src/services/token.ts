import crypto from 'node:crypto';

export const tokenService = {
  generate(size = 24) {
    if (size <= 0) {
      throw new Error('Token size must be positive');
    }
    return crypto.randomBytes(size).toString('base64url');
  }
};
