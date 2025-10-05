import fs from 'node:fs';
import path from 'node:path';

import { resolveAsset } from '@/utils/resolveAsset';

describe('startup assets', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalTemplateEnv = process.env.MODULE_REPORT_TEMPLATE;

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
    process.env.MODULE_REPORT_TEMPLATE = originalTemplateEnv;
  });

  it('ensures module-report template is available in production mode', () => {
    expect(fs.existsSync(resolveAsset('module-report.hbs'))).toBe(true);
  });

  it('falls back to bundled template when env path is invalid', () => {
    process.env.MODULE_REPORT_TEMPLATE =
      'file:///nonexistent/path/module-report.hbs';

    const resolved = resolveAsset('module-report.hbs');
    const expected = path.resolve(
      process.cwd(),
      'src',
      'templates',
      'module-report.hbs'
    );

    expect(resolved).toBe(expected);
  });
});
