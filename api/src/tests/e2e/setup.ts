export default async function setup() {
  process.env.JWT_SECRET = 'test';
  process.env.JWT_REFRESH_SECRET = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/auditoria';
}
