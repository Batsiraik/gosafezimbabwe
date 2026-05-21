import jwt from 'jsonwebtoken';

export function getUserJwtSecret(): string {
  return process.env.JWT_SECRET || 'your-secret-key-change-in-production';
}

export function verifyUserJwt(token: string): { userId: string; phone: string } {
  return jwt.verify(token, getUserJwtSecret()) as { userId: string; phone: string };
}

export function isJwtAuthError(error: unknown): boolean {
  const name = (error as { name?: string })?.name;
  return (
    name === 'JsonWebTokenError' ||
    name === 'TokenExpiredError' ||
    name === 'NotBeforeError'
  );
}
