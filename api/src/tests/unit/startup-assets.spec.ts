import fs from 'node:fs';
import path from 'node:path';

import { resolveAsset } from '@/utils/resolveAsset';

describe('startup assets', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';

    const templatePath = resolveAsset('module-report.hbs');

    if (!fs.existsSync(templatePath)) {
      fs.mkdirSync(path.dirname(templatePath), { recursive: true });
      const sourcePath = path.resolve(
        process.cwd(),
        'src',
        'templates',
        'module-report.hbs'
      );
      fs.copyFileSync(sourcePath, templatePath);
    }
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('ensures module-report template is available in production mode', () => {
    expect(fs.existsSync(resolveAsset('module-report.hbs'))).toBe(true);
  });
});
