import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot =
  typeof __dirname !== 'undefined'
    ? resolve(__dirname, '..', '..')
    : process.cwd();
const distTemplatesDir = resolve(projectRoot, 'dist', 'templates');
const srcTemplatesDir = resolve(projectRoot, 'src', 'templates');

export function resolveModuleReportTemplate(): string {
  const fromEnv = process.env.MODULE_REPORT_TEMPLATE;
  if (fromEnv && fromEnv.trim()) {
    try {
      let candidate: string;
      if (fromEnv.startsWith('file://')) {
        candidate = fileURLToPath(fromEnv);
      } else if (isAbsolute(fromEnv)) {
        candidate = fromEnv;
      } else {
        candidate = resolve(process.cwd(), fromEnv);
      }

      if (existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // fallback
    }
  }

  const prodRoot = '/usr/src/dist';
  const prodCandidate = resolve(prodRoot, 'templates', 'module-report.hbs');
  if (existsSync(prodCandidate)) return prodCandidate;

  const distCandidate = resolve(distTemplatesDir, 'module-report.hbs');
  if (existsSync(distCandidate)) return distCandidate;

  return resolve(srcTemplatesDir, 'module-report.hbs');
}

export const resolveAsset = (relPath: string): string => {
  if (relPath === 'module-report.hbs') {
    return resolveModuleReportTemplate();
  }

  const distPath = resolve(distTemplatesDir, relPath);

  if (process.env.NODE_ENV === 'production') {
    return distPath;
  }

  if (existsSync(distPath)) {
    return distPath;
  }

  return resolve(srcTemplatesDir, relPath);
};
